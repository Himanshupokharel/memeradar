// Supabase Edge Runtime types and request authentication.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from 'jsr:@supabase/server@^1';

type DiscoveryItem = { chainId?: string; tokenAddress?: string; icon?: string | null };
type Pair = {
  url?: string; pairAddress?: string; pairCreatedAt?: number | null;
  baseToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string | null; marketCap?: number | null; fdv?: number | null;
  liquidity?: { usd?: number } | null; volume?: Record<string, number>;
  priceChange?: Record<string, number> | null;
  txns?: Record<string, { buys?: number; sells?: number }>;
  info?: { imageUrl?: string | null } | null;
};

type WorkerToken = {
  id: string; name: string; symbol: string; imageUrl?: string; externalUrl?: string; pairAddress?: string;
  price: number; marketCap: number; liquidity: number; volume5m: number; volume1h: number;
  buyers5m: number; sellers5m: number; buyPressure: number; ageMinutes: number; score: number;
  scoreBreakdown: { momentum: number; liquidity: number; participation: number; safety: number };
};

type StoredRule = {
  id: string; name: string; enabled: boolean;
  conditions: { score?: number; liquidity?: number; maxAge?: number } | null;
  last_triggered_at: string | null; match_count: number;
};

const DEX = 'https://api.dexscreener.com';
const supabaseUrl = Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'MemeRadar-Background/1.0' } });
  if (!response.ok) throw new Error(`Market provider returned ${response.status}`);
  return response.json() as Promise<T>;
}

async function rest<T>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T> {
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase function environment is incomplete');
  const { prefer, headers, ...options } = init;
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
      ...headers,
    },
  });
  if (!response.ok) throw new Error(`Storage request failed (${response.status})`);
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function normalize(pair: Pair, imageUrl?: string): WorkerToken | undefined {
  const id = pair.baseToken?.address;
  const symbol = pair.baseToken?.symbol;
  if (!id || !symbol || !pair.pairCreatedAt) return;
  const liquidity = number(pair.liquidity?.usd);
  const marketCap = number(pair.marketCap ?? pair.fdv);
  const volume5m = number(pair.volume?.m5);
  const volume1h = number(pair.volume?.h1);
  const change5m = number(pair.priceChange?.m5);
  const buyers5m = number(pair.txns?.m5?.buys);
  const sellers5m = number(pair.txns?.m5?.sells);
  const trades = buyers5m + sellers5m;
  const buyPressure = trades ? Math.round((buyers5m / trades) * 100) : 50;
  const ageMinutes = Math.max(1, Math.floor((Date.now() - pair.pairCreatedAt) / 60_000));
  const momentum = clamp(45 + change5m * 1.3 + Math.log10(volume5m + 1) * 6);
  const liquidityScore = clamp(18 + Math.log10(liquidity + 1) * 13);
  const participation = clamp(28 + Math.log10(trades + 1) * 19 + (buyPressure - 50) * 0.35);
  const depthRatio = marketCap ? liquidity / marketCap : 0;
  const safety = clamp(32 + Math.min(30, ageMinutes / 12) + Math.min(28, depthRatio * 150) - (liquidity < 10_000 ? 20 : 0));
  const scoreBreakdown = {
    momentum: Math.round(momentum), liquidity: Math.round(liquidityScore),
    participation: Math.round(participation), safety: Math.round(safety),
  };
  const score = Math.round(scoreBreakdown.momentum * .3 + scoreBreakdown.liquidity * .25 + scoreBreakdown.participation * .25 + scoreBreakdown.safety * .2);
  return {
    id, name: pair.baseToken?.name || symbol, symbol: symbol.slice(0, 20), imageUrl: imageUrl || pair.info?.imageUrl || undefined,
    externalUrl: pair.url, pairAddress: pair.pairAddress, price: number(pair.priceUsd), marketCap, liquidity,
    volume5m, volume1h, buyers5m, sellers5m, buyPressure, ageMinutes, score, scoreBreakdown,
  };
}

async function collectTokens() {
  const [profiles, boosts] = await Promise.all([
    getJson<DiscoveryItem[]>(`${DEX}/token-profiles/latest/v1`),
    getJson<DiscoveryItem[]>(`${DEX}/token-boosts/latest/v1`),
  ]);
  const discovery = [...profiles, ...boosts].filter((item) => item.chainId === 'solana' && item.tokenAddress);
  const addresses = [...new Set(discovery.map((item) => item.tokenAddress as string))].slice(0, 30);
  if (!addresses.length) throw new Error('No Solana candidates were returned');
  const images = new Map(discovery.filter((item) => item.icon?.startsWith('https://')).map((item) => [item.tokenAddress as string, item.icon as string]));
  const pairs = await getJson<Pair[]>(`${DEX}/tokens/v1/solana/${addresses.join(',')}`);
  const best = new Map<string, Pair>();
  for (const pair of pairs) {
    const address = pair.baseToken?.address;
    if (!address) continue;
    const existing = best.get(address);
    if (!existing || number(pair.liquidity?.usd) > number(existing.liquidity?.usd)) best.set(address, pair);
  }
  return [...best.values()].map((pair) => normalize(pair, pair.baseToken?.address ? images.get(pair.baseToken.address) : undefined)).filter((token): token is WorkerToken => Boolean(token));
}

async function saveAndEvaluate(tokens: WorkerToken[]) {
  const startedAt = new Date();
  const capturedAt = new Date(Math.floor(startedAt.getTime() / 60_000) * 60_000).toISOString();
  await rest('tokens?on_conflict=mint_address', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
    body: JSON.stringify(tokens.map((token) => ({
      mint_address: token.id, symbol: token.symbol, name: token.name.slice(0, 120), image_url: token.imageUrl || null,
      dex_url: token.externalUrl || null, pair_address: token.pairAddress || null, source: 'dexscreener', last_seen_at: startedAt.toISOString(),
    }))),
  });
  await rest('token_snapshots?on_conflict=mint_address,captured_at', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
    body: JSON.stringify(tokens.map((token) => ({
      mint_address: token.id, captured_at: capturedAt, price_usd: token.price, market_cap_usd: token.marketCap,
      liquidity_usd: token.liquidity, volume_5m_usd: token.volume5m, volume_1h_usd: token.volume1h,
      buys_5m: token.buyers5m, sells_5m: token.sellers5m, buy_pressure: token.buyPressure,
      pair_age_minutes: token.ageMinutes, memeradar_score: token.score, momentum_score: token.scoreBreakdown.momentum,
      liquidity_score: token.scoreBreakdown.liquidity, participation_score: token.scoreBreakdown.participation,
      safety_score: token.scoreBreakdown.safety, source: 'dexscreener',
    }))),
  });

  const rules = await rest<StoredRule[]>('alert_rules?owner_scope=eq.private-site-owner&enabled=eq.true&select=id,name,conditions,last_triggered_at,match_count,enabled');
  let matches = 0;
  for (const rule of rules) {
    const conditions = rule.conditions || {};
    const match = tokens.find((token) => token.score >= number(conditions.score)
      && token.liquidity >= number(conditions.liquidity)
      && token.ageMinutes <= number(conditions.maxAge || Number.MAX_SAFE_INTEGER));
    const lastTriggered = rule.last_triggered_at ? new Date(rule.last_triggered_at).getTime() : 0;
    if (!match || startedAt.getTime() - lastTriggered < 15 * 60_000) continue;
    await rest('alert_events', {
      method: 'POST', prefer: 'return=minimal', body: JSON.stringify({
        rule_id: rule.id, mint_address: match.id, title: `${rule.name}: ${match.symbol} matched`,
        message: `Score ${match.score}, liquidity $${Math.round(match.liquidity).toLocaleString()}, age ${match.ageMinutes}m.`,
        payload: { score: match.score, liquidity: match.liquidity, ageMinutes: match.ageMinutes, source: 'background_worker' },
      }),
    });
    await rest(`alert_rules?id=eq.${encodeURIComponent(rule.id)}`, {
      method: 'PATCH', prefer: 'return=minimal',
      body: JSON.stringify({ last_triggered_at: startedAt.toISOString(), match_count: number(rule.match_count) + 1 }),
    });
    matches++;
  }
  await rest('ingestion_runs', {
    method: 'POST', prefer: 'return=minimal', body: JSON.stringify({
      provider: 'supabase-cron-dexscreener', started_at: startedAt.toISOString(), finished_at: new Date().toISOString(),
      status: 'succeeded', tokens_discovered: tokens.length, snapshots_saved: tokens.length,
    }),
  });
  return { capturedAt, tokens: tokens.length, matches };
}

const worker = {
  fetch: withSupabase({ auth: ['publishable', 'secret'] }, async (request) => {
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    try {
      const recent = await rest<Array<{ finished_at: string | null; status: string }>>(
        'ingestion_runs?provider=eq.supabase-cron-dexscreener&select=finished_at,status&order=finished_at.desc&limit=1',
      );
      const lastRunAt = recent[0]?.finished_at ? new Date(recent[0].finished_at).getTime() : 0;
      if (recent[0]?.status === 'succeeded' && Date.now() - lastRunAt < 40_000) {
        return Response.json({ ok: true, skipped: true, reason: 'recent_scan_exists' });
      }
      const tokens = await collectTokens();
      const result = await saveAndEvaluate(tokens);
      return Response.json({ ok: true, ...result });
    } catch (error) {
      console.error('MemeRadar background scan failed', error);
      try {
        await rest('ingestion_runs', {
          method: 'POST', prefer: 'return=minimal', body: JSON.stringify({
            provider: 'supabase-cron-dexscreener', status: 'failed', started_at: new Date().toISOString(),
            finished_at: new Date().toISOString(), error_message: error instanceof Error ? error.message.slice(0, 300) : 'Unknown error',
          }),
        });
      } catch { /* The original failure is more useful. */ }
      return Response.json({ ok: false, error: 'Background scan failed' }, { status: 500 });
    }
  }),
};

export default worker;
