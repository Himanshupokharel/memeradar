import type { OnchainRiskReport, RiskFlag } from '@/lib/types';

type RpcResult<T> = { id: number; result?: T; error?: { message?: string } };

type MintInfo = {
  value?: {
    data?: { parsed?: { info?: { mintAuthority?: string | null; freezeAuthority?: string | null; supply?: string; decimals?: number } } };
  } | null;
};

type LargestAccounts = { value?: Array<{ amount?: string; uiAmount?: number | null }> };
type AssetResult = { mutable?: boolean; content?: { metadata?: { mutable?: boolean } } };

export function isHeliusConfigured() {
  return Boolean(process.env.HELIUS_API_KEY);
}

function holderPercentage(accounts: LargestAccounts | undefined, supply: string | undefined) {
  if (!accounts?.value?.length || !supply) return null;
  try {
    const total = BigInt(supply);
    if (total === 0n) return null;
    const topTen = accounts.value.slice(0, 10).reduce((sum, account) => sum + BigInt(account.amount || '0'), 0n);
    return Number((topTen * 10_000n) / total) / 100;
  } catch {
    return null;
  }
}

export async function inspectMint(mint: string): Promise<OnchainRiskReport & { rawData: Record<string, unknown>; authorities: { mint: string | null; freeze: string | null }; metadataMutable: boolean | null }> {
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
  const mintAuthority = info?.mintAuthority ?? null;
  const freezeAuthority = info?.freezeAuthority ?? null;
  const concentration = holderPercentage(accountsResult, info?.supply);
  const metadataMutable = typeof assetResult?.mutable === 'boolean'
    ? assetResult.mutable
    : typeof assetResult?.content?.metadata?.mutable === 'boolean'
      ? assetResult.content.metadata.mutable
      : null;

  let riskScore = 100;
  const flags: RiskFlag[] = [];
  if (mintAuthority) {
    riskScore -= 30;
    flags.push({ label: 'Mint authority active', level: 'high', detail: 'An authority can still create additional token supply.' });
  } else {
    flags.push({ label: 'Mint authority revoked', level: 'low', detail: 'The mint account reports no active mint authority.' });
  }
  if (freezeAuthority) {
    riskScore -= 30;
    flags.push({ label: 'Freeze authority active', level: 'high', detail: 'An authority may be able to freeze token accounts.' });
  } else {
    flags.push({ label: 'Freeze authority revoked', level: 'low', detail: 'The mint account reports no active freeze authority.' });
  }
  if (concentration === null) {
    riskScore -= 10;
    flags.push({ label: 'Concentration unavailable', level: 'medium', detail: 'Helius did not return enough supply data to calculate this check.' });
  } else if (concentration > 80) {
    riskScore -= 25;
    flags.push({ label: `Top accounts ${concentration.toFixed(1)}%`, level: 'high', detail: 'The ten largest token accounts contain most of the supply; exchange and pool accounts may be included.' });
  } else if (concentration > 60) {
    riskScore -= 15;
    flags.push({ label: `Top accounts ${concentration.toFixed(1)}%`, level: 'medium', detail: 'Supply is concentrated across the ten largest token accounts; this is not the same as ten holder wallets.' });
  } else {
    flags.push({ label: `Top accounts ${concentration.toFixed(1)}%`, level: 'low', detail: 'Concentration across the ten largest token accounts is below 60%; exchange and pool accounts may be included.' });
  }
  if (metadataMutable === true) {
    riskScore -= 5;
    flags.push({ label: 'Metadata mutable', level: 'medium', detail: 'The token metadata may still be changed by its update authority.' });
  } else if (metadataMutable === false) {
    flags.push({ label: 'Metadata immutable', level: 'low', detail: 'Helius reports that the token metadata is immutable.' });
  } else {
    flags.push({ label: 'Metadata status unknown', level: 'medium', detail: 'Helius did not return a definitive metadata mutability value.' });
  }

  return {
    mint,
    checkedAt: new Date().toISOString(),
    riskScore: Math.max(0, riskScore),
    top10TokenAccountPct: concentration,
    flags,
    cached: false,
    rawData: { largestTokenAccounts: accountsResult?.value?.slice(0, 10) || [], asset: assetResult || null },
    authorities: { mint: mintAuthority, freeze: freezeAuthority },
    metadataMutable,
  };
}
