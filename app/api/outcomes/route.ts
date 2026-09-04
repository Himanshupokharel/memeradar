import { NextResponse } from 'next/server';
import { isSupabaseConfigured, supabaseRest } from '@/lib/server/supabase';
import type { OutcomeLabel, OutcomeReport } from '@/lib/types';

export const dynamic = 'force-dynamic';
const MINT_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

type OutcomeRow = {
  mint_address: string;
  first_observed_at: string;
  latest_observed_at: string;
  observation_minutes: number | string;
  snapshot_count: number | string;
  discovery_price_usd: number | string;
  discovery_market_cap_usd: number | string | null;
  discovery_liquidity_usd: number | string | null;
  latest_price_usd: number | string | null;
  latest_market_cap_usd: number | string | null;
  latest_liquidity_usd: number | string | null;
  peak_price_usd: number | string | null;
  peak_market_cap_usd: number | string | null;
  maximum_upside_pct: number | string | null;
  maximum_drawdown_pct: number | string | null;
  reached_2x: boolean;
  reached_5x: boolean;
  reached_10x: boolean;
  reached_25x: boolean;
  reached_50x: boolean;
  reached_100x: boolean;
  time_to_2x_minutes: number | string | null;
  time_to_5x_minutes: number | string | null;
  time_to_10x_minutes: number | string | null;
  completed_1h: boolean;
  completed_6h: boolean;
  completed_24h: boolean;
  completed_7d: boolean;
  lifecycle_status: OutcomeLabel['lifecycleStatus'];
  label_version: string;
};

type OutcomeSummaryRow = {
  labeled: number | string;
  reached_2x: number | string;
  reached_5x: number | string;
  reached_10x: number | string;
  dead: number | string;
  rugged: number | string;
  completed_1h: number | string;
  completed_6h: number | string;
  completed_24h: number | string;
  completed_7d: number | string;
  median_maximum_upside_pct: number | string | null;
  median_maximum_drawdown_pct: number | string | null;
};

const fields = 'mint_address,first_observed_at,latest_observed_at,observation_minutes,snapshot_count,discovery_price_usd,discovery_market_cap_usd,discovery_liquidity_usd,latest_price_usd,latest_market_cap_usd,latest_liquidity_usd,peak_price_usd,peak_market_cap_usd,maximum_upside_pct,maximum_drawdown_pct,reached_2x,reached_5x,reached_10x,reached_25x,reached_50x,reached_100x,time_to_2x_minutes,time_to_5x_minutes,time_to_10x_minutes,completed_1h,completed_6h,completed_24h,completed_7d,lifecycle_status,label_version';
const number = (value: number | string | null) => Number(value || 0);

function optionalNumber(value: number | string | null) {
  return value === null ? undefined : Number(value);
}

function toLabel(row: OutcomeRow): OutcomeLabel {
  const reachedMultiples = [2, 5, 10, 25, 50, 100].filter((multiple) => row[`reached_${multiple}x` as keyof OutcomeRow] === true);
  const completedCheckpoints = ([['1h', row.completed_1h], ['6h', row.completed_6h], ['24h', row.completed_24h], ['7d', row.completed_7d]] as const)
    .filter(([, completed]) => completed)
    .map(([label]) => label);
  return {
    mint: row.mint_address,
    firstObservedAt: row.first_observed_at,
    latestObservedAt: row.latest_observed_at,
    observationMinutes: number(row.observation_minutes),
    snapshotCount: number(row.snapshot_count),
    discoveryPrice: number(row.discovery_price_usd),
    discoveryMarketCap: number(row.discovery_market_cap_usd),
    discoveryLiquidity: number(row.discovery_liquidity_usd),
    latestPrice: number(row.latest_price_usd),
    latestMarketCap: number(row.latest_market_cap_usd),
    latestLiquidity: number(row.latest_liquidity_usd),
    peakPrice: number(row.peak_price_usd),
    peakMarketCap: number(row.peak_market_cap_usd),
    maximumUpsidePct: number(row.maximum_upside_pct),
    maximumDrawdownPct: number(row.maximum_drawdown_pct),
    reachedMultiples,
    timeTo2xMinutes: optionalNumber(row.time_to_2x_minutes),
    timeTo5xMinutes: optionalNumber(row.time_to_5x_minutes),
    timeTo10xMinutes: optionalNumber(row.time_to_10x_minutes),
    completedCheckpoints,
    lifecycleStatus: row.lifecycle_status,
    labelVersion: row.label_version,
  };
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: 'outcomes_not_configured' }, { status: 503 });
  const mint = new URL(request.url).searchParams.get('mint');
  if (mint && !MINT_PATTERN.test(mint)) return NextResponse.json({ error: 'invalid_mint' }, { status: 400 });
  try {
    if (mint) {
      const rows = await supabaseRest<OutcomeRow[]>(`token_outcomes?mint_address=eq.${encodeURIComponent(mint)}&select=${fields}&limit=1`);
      return NextResponse.json({ label: rows[0] ? toLabel(rows[0]) : null }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const [rows, summaries] = await Promise.all([
      supabaseRest<OutcomeRow[]>(`token_outcomes?select=${fields}&order=first_observed_at.desc&limit=100`),
      supabaseRest<OutcomeSummaryRow[]>('rpc/get_memeradar_outcome_summary', { method: 'POST', body: '{}' }),
    ]);
    const labels = rows.map(toLabel);
    const summary = summaries[0];
    const report: OutcomeReport = {
      generatedAt: new Date().toISOString(),
      overview: {
        labeled: number(summary?.labeled || 0),
        reached2x: number(summary?.reached_2x || 0),
        reached5x: number(summary?.reached_5x || 0),
        reached10x: number(summary?.reached_10x || 0),
        dead: number(summary?.dead || 0),
        rugged: number(summary?.rugged || 0),
        completed1h: number(summary?.completed_1h || 0),
        completed6h: number(summary?.completed_6h || 0),
        completed24h: number(summary?.completed_24h || 0),
        completed7d: number(summary?.completed_7d || 0),
        medianMaximumUpsidePct: optionalNumber(summary?.median_maximum_upside_pct ?? null) ?? null,
        medianMaximumDrawdownPct: optionalNumber(summary?.median_maximum_drawdown_pct ?? null) ?? null,
      },
      labels,
    };
    return NextResponse.json(report, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Outcome label lookup failed:', error);
    return NextResponse.json({ error: 'outcomes_unavailable' }, { status: 502 });
  }
}
