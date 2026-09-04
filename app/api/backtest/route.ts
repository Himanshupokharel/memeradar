import { NextResponse } from 'next/server';
import { isSupabaseConfigured, supabaseRest } from '@/lib/server/supabase';
import type { BacktestBand, BacktestReport, BacktestSignal } from '@/lib/types';

export const dynamic = 'force-dynamic';

const HORIZONS = new Set([15, 60, 360, 1440]);

type BacktestRow = {
  mint_address: string;
  symbol: string | null;
  name: string | null;
  image_url: string | null;
  entry_at: string;
  entry_price: number | string;
  entry_score: number | string | null;
  entry_market_cap: number | string | null;
  entry_liquidity: number | string | null;
  outcome_at: string | null;
  outcome_price: number | string | null;
  peak_price: number | string | null;
  observation_minutes: number | string | null;
  snapshot_count: number | string | null;
};

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function round(value: number | null) {
  return value === null ? null : Math.round(value * 10) / 10;
}

function summarizeBand(label: string, rows: BacktestSignal[]): BacktestBand {
  const eligible = rows.filter((row) => row.eligible);
  const changes = eligible.flatMap((row) => row.horizonChangePct === undefined ? [] : [row.horizonChangePct]);
  const peaks = eligible.flatMap((row) => row.peakChangePct === undefined ? [] : [row.peakChangePct]);
  return {
    label,
    tracked: rows.length,
    eligible: eligible.length,
    medianChangePct: round(median(changes)),
    medianPeakPct: round(median(peaks)),
    peak20Rate: peaks.length ? round((peaks.filter((value) => value >= 20).length / peaks.length) * 100) : null,
  };
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: 'history_not_configured' }, { status: 503 });

  const requested = Number(new URL(request.url).searchParams.get('minutes') || 60);
  const horizonMinutes = HORIZONS.has(requested) ? requested : 60;

  try {
    const rows = await supabaseRest<BacktestRow[]>('rpc/get_memeradar_backtest', {
      method: 'POST',
      body: JSON.stringify({ horizon_minutes: horizonMinutes }),
    });
    const outcomeGraceMinutes = Math.max(5, Math.round(horizonMinutes * 0.1));
    const signals: BacktestSignal[] = rows.map((row) => {
      const entryPrice = Number(row.entry_price || 0);
      const outcomePrice = Number(row.outcome_price || 0);
      const peakPrice = Number(row.peak_price || 0);
      const actualOutcomeMinutes = row.outcome_at
        ? (new Date(row.outcome_at).getTime() - new Date(row.entry_at).getTime()) / 60_000
        : Number.POSITIVE_INFINITY;
      const eligible = entryPrice > 0 && outcomePrice > 0 && actualOutcomeMinutes <= horizonMinutes + outcomeGraceMinutes;
      return {
        mint: row.mint_address,
        symbol: row.symbol || 'UNKNOWN',
        name: row.name || 'Unknown token',
        imageUrl: row.image_url || undefined,
        entryAt: row.entry_at,
        entryPrice,
        entryScore: Number(row.entry_score || 0),
        entryMarketCap: Number(row.entry_market_cap || 0),
        entryLiquidity: Number(row.entry_liquidity || 0),
        outcomeAt: eligible ? row.outcome_at || undefined : undefined,
        outcomePrice: eligible ? outcomePrice : undefined,
        horizonChangePct: eligible ? ((outcomePrice - entryPrice) / entryPrice) * 100 : undefined,
        peakChangePct: eligible && peakPrice > 0 ? ((peakPrice - entryPrice) / entryPrice) * 100 : undefined,
        observationMinutes: Number(row.observation_minutes || 0),
        snapshotCount: Number(row.snapshot_count || 0),
        eligible,
      };
    });

    const completed = signals.filter((row) => row.eligible);
    const changes = completed.flatMap((row) => row.horizonChangePct === undefined ? [] : [row.horizonChangePct]);
    const peaks = completed.flatMap((row) => row.peakChangePct === undefined ? [] : [row.peakChangePct]);
    const highScore = summarizeBand('70+', signals.filter((row) => row.entryScore >= 70));
    const baseline = summarizeBand('Below 60', signals.filter((row) => row.entryScore < 60));
    const sampleTarget = 100;
    const comparableSamples = Math.min(highScore.eligible, baseline.eligible);
    const report: BacktestReport = {
      horizonMinutes,
      generatedAt: new Date().toISOString(),
      overview: {
        tracked: signals.length,
        eligible: completed.length,
        collecting: signals.length - completed.length,
        snapshotCount: signals.reduce((sum, row) => sum + row.snapshotCount, 0),
        medianChangePct: round(median(changes)),
        medianPeakPct: round(median(peaks)),
        peak20Rate: peaks.length ? round((peaks.filter((value) => value >= 20).length / peaks.length) * 100) : null,
        oldestEntryAt: signals.at(-1)?.entryAt,
      },
      calibration: {
        readiness: comparableSamples >= sampleTarget ? 'established' : comparableSamples >= 30 ? 'early' : 'collecting',
        highScoreEligible: highScore.eligible,
        baselineEligible: baseline.eligible,
        sampleTarget,
        highScoreMedianChangePct: highScore.medianChangePct,
        highScoreMedianPeakPct: highScore.medianPeakPct,
        highScorePeak20Rate: highScore.peak20Rate,
        medianPeakUpliftPct: highScore.medianPeakPct === null || baseline.medianPeakPct === null
          ? null : round(highScore.medianPeakPct - baseline.medianPeakPct),
        peak20UpliftPoints: highScore.peak20Rate === null || baseline.peak20Rate === null
          ? null : round(highScore.peak20Rate - baseline.peak20Rate),
      },
      bands: [
        summarizeBand('80–100', signals.filter((row) => row.entryScore >= 80)),
        summarizeBand('70–79', signals.filter((row) => row.entryScore >= 70 && row.entryScore < 80)),
        summarizeBand('60–69', signals.filter((row) => row.entryScore >= 60 && row.entryScore < 70)),
        summarizeBand('Below 60', signals.filter((row) => row.entryScore < 60)),
      ],
      signals: signals.slice(0, 200),
    };
    return NextResponse.json(report, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Backtest report failed:', error);
    return NextResponse.json({ error: 'backtest_unavailable' }, { status: 502 });
  }
}
