import { buildRiskReport, type RiskFacts } from '@/lib/risk-model';
import type { OnchainRiskReport } from '@/lib/types';

type RpcResult<T> = { id: number; result?: T; error?: { message?: string } };

type MintInfo = {
  value?: {
    data?: { parsed?: { info?: { mintAuthority?: string | null; freezeAuthority?: string | null; supply?: string; decimals?: number } } };
  } | null;
};

type LargestAccounts = { value?: Array<{ amount?: string; uiAmount?: number | null }> };
type AssetResult = {
  mutable?: boolean;
  content?: { metadata?: { mutable?: boolean } };
  authorities?: Array<{ address?: string; scopes?: string[] }>;
  creators?: Array<{ address?: string; share?: number; verified?: boolean }>;
};
type AuthorityAssets = { total?: number; items?: unknown[] };

export function isHeliusConfigured() {
  return Boolean(process.env.HELIUS_API_KEY);
}

function holderPercentage(accounts: LargestAccounts | undefined, supply: string | undefined) {
  if (!accounts?.value?.length || !supply) return null;
  try {
    const total = BigInt(supply);
    if (total === BigInt(0)) return null;
    const topTen = accounts.value.slice(0, 10).reduce((sum, account) => sum + BigInt(account.amount || '0'), BigInt(0));
    return Number((topTen * BigInt(10_000)) / total) / 100;
  } catch {
    return null;
  }
}

async function authorityAssetCount(key: string, authorityAddress: string) {
  try {
    const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'getAssetsByAuthority',
        params: { authorityAddress, page: 1, limit: 1, options: { showGrandTotal: true } },
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const payload = await response.json() as RpcResult<AuthorityAssets>;
    return Number.isFinite(payload.result?.total) ? Number(payload.result?.total) : null;
  } catch {
    return null;
  }
}

export async function inspectMint(mint: string): Promise<OnchainRiskReport & {
  rawData: Record<string, unknown>;
  authorities: { mint: string | null | undefined; freeze: string | null | undefined };
  metadataMutable: boolean | null;
}> {
  const key = process.env.HELIUS_API_KEY;
  if (!key) throw new Error('Helius is not configured');
  const body = [
    { jsonrpc: '2.0', id: 1, method: 'getAccountInfo', params: [mint, { encoding: 'jsonParsed', commitment: 'confirmed' }] },
    { jsonrpc: '2.0', id: 2, method: 'getTokenLargestAccounts', params: [mint, { commitment: 'confirmed' }] },
    { jsonrpc: '2.0', id: 3, method: 'getAsset', params: { id: mint } },
  ];
  const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Helius request failed (${response.status})`);
  const results = await response.json() as RpcResult<unknown>[];
  const mintResult = results.find((result) => result.id === 1)?.result as MintInfo | undefined;
  if (!mintResult?.value) throw new Error('Helius could not read this mint account');
  const accountsResult = results.find((result) => result.id === 2)?.result as LargestAccounts | undefined;
  const assetResult = results.find((result) => result.id === 3)?.result as AssetResult | undefined;
  const info = mintResult.value.data?.parsed?.info;
  const hasMintAuthority = Boolean(info && Object.prototype.hasOwnProperty.call(info, 'mintAuthority'));
  const hasFreezeAuthority = Boolean(info && Object.prototype.hasOwnProperty.call(info, 'freezeAuthority'));
  const mintAuthority = hasMintAuthority ? info?.mintAuthority ?? null : undefined;
  const freezeAuthority = hasFreezeAuthority ? info?.freezeAuthority ?? null : undefined;
  const concentration = holderPercentage(accountsResult, info?.supply);
  const metadataMutable = typeof assetResult?.mutable === 'boolean'
    ? assetResult.mutable
    : typeof assetResult?.content?.metadata?.mutable === 'boolean'
      ? assetResult.content.metadata.mutable
      : null;
  const authorityAddress = assetResult?.authorities?.find((authority) => authority.address)?.address || null;
  const listedCreators = (assetResult?.creators || []).filter((creator) => creator.address);
  const creator = listedCreators.find((candidate) => candidate.verified) || listedCreators[0];
  const creatorAddress = creator?.address || null;
  const creatorVerified = creatorAddress ? creator?.verified === true : null;
  const associatedAssetCount = authorityAddress ? await authorityAssetCount(key, authorityAddress) : null;
  const facts: RiskFacts = {
    mintAuthority,
    freezeAuthority,
    top10TokenAccountPct: concentration,
    metadataMutable,
    authorityAddress,
    creatorAddress,
    creatorVerified,
    authorityAssetCount: associatedAssetCount,
    liquidityLockStatus: 'unavailable',
  };
  const checkedAt = new Date().toISOString();
  const report = buildRiskReport(mint, checkedAt, facts, false);

  return {
    ...report,
    rawData: {
      riskVersion: 'risk-v1',
      facts,
      largestTokenAccounts: accountsResult?.value?.slice(0, 10) || [],
      asset: assetResult || null,
    },
    authorities: { mint: mintAuthority, freeze: freezeAuthority },
    metadataMutable,
  };
}
