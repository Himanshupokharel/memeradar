import { NextResponse } from 'next/server';
import { isSupabaseConfigured, supabaseRest } from '@/lib/server/supabase';
import type { Token } from '@/lib/types';

export const dynamic = 'force-dynamic';

const MINT_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

type StoredRule = {
  id: string;
  name: string;
  enabled: boolean;
  conditions: { score?: number; liquidity?: number; maxAge?: number } | null;
  last_triggered_at: string | null;
  match_count: number;
};

function cleanTokens(value: unknown): Token[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 30).filter((token): token is Token => {
    if (!token || typeof token !== 'object') return false;
    const candidate = token as Partial<Token>;
    return typeof candidate.id === 'string' && MINT_PATTERN.test(candidate.id)
      && typeof candidate.name === 'string' && typeof candidate.symbol === 'string'
      && candidate.source === 'dexscreener';
  });
}

async function evaluateAlerts(tokens: Token[]) {
  const rules = await supabaseRest<StoredRule[]>('alert_rules?owner_scope=eq.private-site-owner&enabled=eq.true&select=id,name,enabled,conditions,last_triggered_at,match_count');
  const now = Date.now();
  for (const rule of rules) {
    const conditions = rule.conditions || {};
    const match = tokens.find((token) => token.score >= Number(conditions.score || 0)
      && token.liquidity >= Number(conditions.liquidity || 0)
      && token.ageMinutes <= Number(conditions.maxAge || Number.MAX_SAFE_INTEGER));
    const lastTriggered = rule.last_triggered_at ? new Date(rule.last_triggered_at).getTime() : 0;
    if (!match || now - lastTriggered < 15 * 60_000) continue;
    await supabaseRest('alert_events', {
      method: 'POST',
      prefer: 'return=minimal',
      body: JSON.stringify({
        rule_id: rule.id,
        mint_address: match.id,
        title: `${rule.name}: ${match.symbol} matched`,
        message: `Score ${match.score}, liquidity $${Math.round(match.liquidity).toLocaleString()}, age ${match.ageMinutes}m.`,
        payload: { score: match.score, liquidity: match.liquidity, ageMinutes: match.ageMinutes },
      }),
    });
    await supabaseRest(`alert_rules?id=eq.${encodeURIComponent(rule.id)}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify({ last_triggered_at: new Date(now).toISOString(), match_count: Number(rule.match_count || 0) + 1 }),
    });
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ stored: false, reason: 'storage_not_configured' }, { status: 503 });
  try {
    const body = await request.json() as { tokens?: unknown };
    const tokens = cleanTokens(body.tokens);
    if (!tokens.length) return NextResponse.json({ stored: false, reason: 'no_live_tokens' }, { status: 400 });
    const now = new Date();
    const capturedAt = new Date(Math.floor(now.getTime() / 60_000) * 60_000).toISOString();

    await supabaseRest('tokens?on_conflict=mint_address', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: JSON.stringify(tokens.map((token) => ({
        mint_address: token.id,
        symbol: token.symbol.slice(0, 20),
        name: token.name.slice(0, 120),
        image_url: token.imageUrl || null,
        dex_url: token.externalUrl || null,
        pair_address: token.pairAddress || null,
        source: 'dexscreener',
        last_seen_at: now.toISOString(),
      }))),
    });
    await supabaseRest('token_snapshots?on_conflict=mint_address,captured_at', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: JSON.stringify(tokens.map((token) => ({
        mint_address: token.id,
        captured_at: capturedAt,
        price_usd: token.price,
        market_cap_usd: token.marketCap,
        liquidity_usd: token.liquidity,
        volume_5m_usd: token.volume5m,
        volume_1h_usd: token.volume1h,
        buys_5m: token.buyers5m,
        sells_5m: token.sellers5m,
        buy_pressure: token.buyPressure,
        pair_age_minutes: token.ageMinutes,
        memeradar_score: token.score,
        momentum_score: token.scoreBreakdown.momentum,
        liquidity_score: token.scoreBreakdown.liquidity,
        participation_score: token.scoreBreakdown.participation,
        safety_score: token.scoreBreakdown.safety,
        percentile_rank: token.relativeRank?.overall ?? null,
        percentile_cohort: token.relativeRank?.cohort ?? null,
        percentile_sample_size: token.relativeRank?.sampleSize ?? null,
        source: 'dexscreener',
      }))),
    });
    await evaluateAlerts(tokens);
    await supabaseRest('ingestion_runs', {
      method: 'POST', prefer: 'return=minimal', body: JSON.stringify({
        provider: 'browser-dexscreener', started_at: now.toISOString(), finished_at: new Date().toISOString(),
        status: 'succeeded', tokens_discovered: tokens.length, snapshots_saved: tokens.length,
      }),
    });
    return NextResponse.json({ stored: true, capturedAt, count: tokens.length });
  } catch (error) {
    console.error('Snapshot storage failed:', error);
    return NextResponse.json({ stored: false, reason: 'storage_failed' }, { status: 502 });
  }
}
