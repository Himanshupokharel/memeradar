import { NextResponse } from 'next/server';
import { buildRiskReport, type RiskFacts } from '@/lib/risk-model';
import { inspectMint, isHeliusConfigured } from '@/lib/server/helius';
import { isSupabaseConfigured, supabaseRest } from '@/lib/server/supabase';
import type { OnchainRiskReport } from '@/lib/types';

export const dynamic = 'force-dynamic';
const MINT_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

type RiskRow = {
  mint_address: string;
  checked_at: string;
  mint_authority: string | null;
  mint_authority_revoked: boolean;
  freeze_authority: string | null;
  freeze_authority_revoked: boolean;
  metadata_mutable: boolean | null;
  top_10_holder_pct: number | string | null;
  risk_score: number;
  raw_data: { riskVersion?: string; facts?: RiskFacts } | null;
};

function reportFromRow(row: RiskRow): OnchainRiskReport {
  const savedFacts = row.raw_data?.facts;
  const facts: RiskFacts = savedFacts || {
    mintAuthority: row.mint_authority_revoked ? null : row.mint_authority || undefined,
    freezeAuthority: row.freeze_authority_revoked ? null : row.freeze_authority || undefined,
    top10TokenAccountPct: row.top_10_holder_pct === null ? null : Number(row.top_10_holder_pct),
    metadataMutable: row.metadata_mutable,
    authorityAddress: null,
    creatorAddress: null,
    creatorVerified: null,
    authorityAssetCount: null,
    liquidityLockStatus: 'unavailable',
  };
  return buildRiskReport(row.mint_address, row.checked_at, facts, true);
}

export async function GET(request: Request) {
  const mint = new URL(request.url).searchParams.get('mint') || '';
  if (!MINT_PATTERN.test(mint)) return NextResponse.json({ error: 'Invalid mint address' }, { status: 400 });
  if (!isHeliusConfigured()) return NextResponse.json({ configured: false, error: 'helius_not_configured' }, { status: 503 });
  try {
    if (isSupabaseConfigured()) {
      const cached = await supabaseRest<RiskRow[]>(`token_risk_checks?mint_address=eq.${encodeURIComponent(mint)}&select=*&limit=1`);
      if (cached[0]?.raw_data?.riskVersion === 'risk-v1' && Date.now() - new Date(cached[0].checked_at).getTime() < 10 * 60_000) {
        return NextResponse.json({ configured: true, report: reportFromRow(cached[0]) });
      }
    }
    const report = await inspectMint(mint);
    if (isSupabaseConfigured()) {
      await supabaseRest('tokens?on_conflict=mint_address', {
        method: 'POST', prefer: 'resolution=ignore-duplicates,return=minimal',
        body: JSON.stringify({ mint_address: mint, symbol: 'UNKNOWN', name: 'Unknown token', source: 'helius' }),
      });
      await supabaseRest('token_risk_checks?on_conflict=mint_address', {
        method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: JSON.stringify({
          mint_address: mint,
          checked_at: report.checkedAt,
          mint_authority: report.authorities.mint ?? null,
          mint_authority_revoked: report.authorities.mint === null,
          freeze_authority: report.authorities.freeze ?? null,
          freeze_authority_revoked: report.authorities.freeze === null,
          metadata_mutable: report.metadataMutable,
          top_10_holder_pct: report.top10TokenAccountPct,
          risk_score: report.riskScore,
          status: 'complete',
          raw_data: report.rawData,
        }),
      });
    }
    const publicReport: OnchainRiskReport = {
      mint: report.mint,
      checkedAt: report.checkedAt,
      riskScore: report.riskScore,
      riskLevel: report.riskLevel,
      confidence: report.confidence,
      confidenceReason: report.confidenceReason,
      checksCompleted: report.checksCompleted,
      checksTotal: report.checksTotal,
      top10TokenAccountPct: report.top10TokenAccountPct,
      authorityAddress: report.authorityAddress,
      creatorAddress: report.creatorAddress,
      creatorVerified: report.creatorVerified,
      authorityAssetCount: report.authorityAssetCount,
      liquidityLockStatus: report.liquidityLockStatus,
      evidence: report.evidence,
      flags: report.flags,
      cached: report.cached,
    };
    return NextResponse.json({ configured: true, report: publicReport });
  } catch (error) {
    console.error('Helius risk check failed:', error);
    return NextResponse.json({ configured: true, error: 'risk_check_failed' }, { status: 502 });
  }
}
