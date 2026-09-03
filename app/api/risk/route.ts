import { NextResponse } from 'next/server';
import { inspectMint, isHeliusConfigured } from '@/lib/server/helius';
import { isSupabaseConfigured, supabaseRest } from '@/lib/server/supabase';
import type { OnchainRiskReport, RiskFlag } from '@/lib/types';

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
};

function reportFromRow(row: RiskRow): OnchainRiskReport {
  const concentration = row.top_10_holder_pct === null ? null : Number(row.top_10_holder_pct);
  const flags: RiskFlag[] = [
    row.mint_authority_revoked
      ? { label: 'Mint authority revoked', level: 'low', detail: 'The mint account reports no active mint authority.' }
      : { label: 'Mint authority active', level: 'high', detail: 'An authority can still create additional token supply.' },
    row.freeze_authority_revoked
      ? { label: 'Freeze authority revoked', level: 'low', detail: 'The mint account reports no active freeze authority.' }
      : { label: 'Freeze authority active', level: 'high', detail: 'An authority may be able to freeze token accounts.' },
    concentration === null
      ? { label: 'Concentration unavailable', level: 'medium', detail: 'Helius did not return enough supply data to calculate this check.' }
      : { label: `Top accounts ${concentration.toFixed(1)}%`, level: concentration > 80 ? 'high' : concentration > 60 ? 'medium' : 'low', detail: 'Share held by the ten largest token accounts; exchange and pool accounts may be included.' },
    row.metadata_mutable === true
      ? { label: 'Metadata mutable', level: 'medium', detail: 'The token metadata may still be changed by its update authority.' }
      : row.metadata_mutable === false
        ? { label: 'Metadata immutable', level: 'low', detail: 'Helius reports that the token metadata is immutable.' }
        : { label: 'Metadata status unknown', level: 'medium', detail: 'Helius did not return a definitive metadata mutability value.' },
  ];
  return { mint: row.mint_address, checkedAt: row.checked_at, riskScore: row.risk_score, top10TokenAccountPct: concentration, flags, cached: true };
}

export async function GET(request: Request) {
  const mint = new URL(request.url).searchParams.get('mint') || '';
  if (!MINT_PATTERN.test(mint)) return NextResponse.json({ error: 'Invalid mint address' }, { status: 400 });
  if (!isHeliusConfigured()) return NextResponse.json({ configured: false, error: 'helius_not_configured' }, { status: 503 });
  try {
    if (isSupabaseConfigured()) {
      const cached = await supabaseRest<RiskRow[]>(`token_risk_checks?mint_address=eq.${encodeURIComponent(mint)}&select=*&limit=1`);
      if (cached[0] && Date.now() - new Date(cached[0].checked_at).getTime() < 10 * 60_000) {
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
          mint_authority: report.authorities.mint,
          mint_authority_revoked: !report.authorities.mint,
          freeze_authority: report.authorities.freeze,
          freeze_authority_revoked: !report.authorities.freeze,
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
      top10TokenAccountPct: report.top10TokenAccountPct,
      flags: report.flags,
      cached: report.cached,
    };
    return NextResponse.json({ configured: true, report: publicReport });
  } catch (error) {
    console.error('Helius risk check failed:', error);
    return NextResponse.json({ configured: true, error: 'risk_check_failed' }, { status: 502 });
  }
}
