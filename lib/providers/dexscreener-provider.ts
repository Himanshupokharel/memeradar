import { calculateMemeRadarScore } from '../scoring';
import type { RiskFlag, Token, TokenSnapshot } from '../types';
import { mockTokenProvider } from './mock-provider';
import type { TokenProvider } from './token-provider';

const API = 'https://api.dexscreener.com';
const SNAPSHOT_CACHE_MS = 3_000;
const DISCOVERY_CACHE_MS = 3_000;
let memoryCache: { expires: number; snapshot: TokenSnapshot } | undefined;
let discoveryCache: { expires: number; addresses: string[]; images: Map<string, string> } | undefined;

type DiscoveryItem = { chainId?: string; tokenAddress?: string; icon?: string | null };
type Pair = {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string | null;
  txns?: Record<string, { buys?: number; sells?: number }>;
  volume?: Record<string, number>;
  priceChange?: Record<string, number> | null;
  liquidity?: { usd?: number } | null;
  fdv?: number | null;
  marketCap?: number | null;
  pairCreatedAt?: number | null;
  info?: { imageUrl?: string | null } | null;
};

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const safeNumber = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'MemeRadar/1.0' },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`DEX Screener returned ${response.status}`);
  return response.json() as Promise<T>;
}

function makeSparkline(address: string, change: number, activity: number) {
  let seed = [...address].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const start = 50 - change * 0.45;
  return Array.from({ length: 14 }, (_, index) => {
    seed = (seed * 9301 + 49297) % 233280;
    const noise = (seed / 233280 - 0.5) * Math.min(18, 4 + Math.log10(activity + 1) * 3);
    return clamp(start + (change * index) / 13 + noise, 2, 98);
  });
}

function marketRisks(liquidity: number, marketCap: number, ageMinutes: number): RiskFlag[] {
  const flags: RiskFlag[] = [];
  flags.push(liquidity >= 50_000
    ? { label: 'Liquidity healthy', level: 'low', detail: 'Current pool liquidity is above $50K.' }
    : liquidity >= 15_000
      ? { label: 'Liquidity moderate', level: 'medium', detail: 'Price impact may rise for larger swaps.' }
      : { label: 'Thin liquidity', level: 'high', detail: 'Small trades may move the price sharply.' });
  flags.push(ageMinutes < 30
    ? { label: 'Very new pair', level: 'high', detail: 'This pair has less than 30 minutes of market history.' }
    : ageMinutes < 180
      ? { label: 'Fresh pair', level: 'medium', detail: 'This pair has less than three hours of market history.' }
      : { label: 'Established pair', level: 'low', detail: 'This pair has more than three hours of market history.' });
  const ratio = marketCap > 0 ? liquidity / marketCap : 0;
  flags.push(ratio >= 0.12
    ? { label: 'Depth ratio healthy', level: 'low', detail: 'Liquidity is meaningful relative to market value.' }
    : { label: 'Depth ratio low', level: ratio < 0.05 ? 'high' : 'medium', detail: 'Liquidity is limited relative to market value.' });
  flags.push({ label: 'On-chain checks pending', level: 'medium', detail: 'Mint authority and holder checks require the planned Helius integration.' });
  return flags;
}

function normalize(pair: Pair, discoveryImage?: string): Token | undefined {
  const address = pair.baseToken?.address;
  const symbol = pair.baseToken?.symbol;
  if (!address || !symbol || !pair.pairCreatedAt) return undefined;
  const liquidity = safeNumber(pair.liquidity?.usd);
  const marketCap = safeNumber(pair.marketCap ?? pair.fdv);
  const volume5m = safeNumber(pair.volume?.m5);
  const volume1h = safeNumber(pair.volume?.h1);
  const change5m = safeNumber(pair.priceChange?.m5);
  const buys = safeNumber(pair.txns?.m5?.buys);
  const sells = safeNumber(pair.txns?.m5?.sells);
  const trades = buys + sells;
  const buyPressure = trades ? Math.round((buys / trades) * 100) : 50;
  const ageMinutes = Math.max(1, Math.floor((Date.now() - pair.pairCreatedAt) / 60_000));
  const momentum = clamp(45 + change5m * 1.3 + Math.log10(volume5m + 1) * 6);
  const liquidityScore = clamp(18 + Math.log10(liquidity + 1) * 13);
  const participation = clamp(28 + Math.log10(trades + 1) * 19 + (buyPressure - 50) * 0.35);
  const depthRatio = marketCap ? liquidity / marketCap : 0;
  const safety = clamp(32 + Math.min(30, ageMinutes / 12) + Math.min(28, depthRatio * 150) - (liquidity < 10_000 ? 20 : 0));
  const scoreBreakdown = { momentum: Math.round(momentum), liquidity: Math.round(liquidityScore), participation: Math.round(participation), safety: Math.round(safety) };
  return {
    id: address,
    name: pair.baseToken?.name || symbol,
    symbol: symbol.slice(0, 12),
    contract: `${address.slice(0, 4)}...${address.slice(-4)}`,
    color: `hsl(${[...address].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360} 72% 68%)`,
    score: calculateMemeRadarScore(scoreBreakdown),
    marketCap, liquidity, volume5m, volume1h, ageMinutes, buyPressure,
    buyers5m: buys, sellers5m: sells, price: safeNumber(pair.priceUsd), priceChange5m: change5m,
    holders: 0,
    sparkline: makeSparkline(address, change5m, trades),
    risks: marketRisks(liquidity, marketCap, ageMinutes), scoreBreakdown,
    source: 'dexscreener', externalUrl: pair.url, pairAddress: pair.pairAddress,
    imageUrl: discoveryImage || pair.info?.imageUrl || undefined,
  };
}

async function fetchLiveSnapshot(): Promise<TokenSnapshot> {
  if (memoryCache && memoryCache.expires > Date.now()) return memoryCache.snapshot;
  const { addresses, images } = await fetchDiscovery();
  const pairs = await getJson<Pair[]>(`/tokens/v1/solana/${addresses.join(',')}`);
  const bestByToken = new Map<string, Pair>();
  for (const pair of pairs) {
    const address = pair.baseToken?.address;
    if (!address) continue;
    const existing = bestByToken.get(address);
    if (!existing || safeNumber(pair.liquidity?.usd) > safeNumber(existing.liquidity?.usd)) bestByToken.set(address, pair);
  }
  const tokens = [...bestByToken.values()].map((pair) => normalize(pair, pair.baseToken?.address ? images.get(pair.baseToken.address) : undefined)).filter((token): token is Token => Boolean(token));
  if (!tokens.length) throw new Error('No usable Solana pairs returned');
  const snapshot: TokenSnapshot = { tokens, source: 'dexscreener', updatedAt: new Date().toISOString(), notice: 'Candidates and market metrics refresh every 3s.' };
  memoryCache = { expires: Date.now() + SNAPSHOT_CACHE_MS, snapshot };
  return snapshot;
}

async function fetchDiscovery() {
  if (discoveryCache && discoveryCache.expires > Date.now()) return discoveryCache;
  const [profiles, boosts] = await Promise.all([
    getJson<DiscoveryItem[]>('/token-profiles/latest/v1'),
    getJson<DiscoveryItem[]>('/token-boosts/latest/v1'),
  ]);
  const discovery = [...profiles, ...boosts].filter((item) => item.chainId === 'solana' && item.tokenAddress);
  const addresses = [...new Set(discovery
    .map((item) => item.tokenAddress as string))].slice(0, 30);
  if (!addresses.length) throw new Error('No live Solana candidates returned');
  const images = new Map(discovery.filter((item) => item.icon?.startsWith('https://')).map((item) => [item.tokenAddress as string, item.icon as string]));
  discoveryCache = { expires: Date.now() + DISCOVERY_CACHE_MS, addresses, images };
  return discoveryCache;
}

export const tokenProvider: TokenProvider = {
  async getSnapshot() {
    try {
      return await fetchLiveSnapshot();
    } catch (error) {
      console.error('Live market feed unavailable:', error);
      return mockTokenProvider.getSnapshot();
    }
  },
  async getTokens() {
    return (await this.getSnapshot()).tokens;
  },
  async getToken(id) {
    const fromSnapshot = (await this.getSnapshot()).tokens.find((token) => token.id === id || token.id.toLowerCase() === id.toLowerCase());
    if (fromSnapshot) return fromSnapshot;
    try {
      const pairs = await getJson<Pair[]>(`/token-pairs/v1/solana/${encodeURIComponent(id)}`);
      const best = [...pairs].sort((a, b) => safeNumber(b.liquidity?.usd) - safeNumber(a.liquidity?.usd))[0];
      return best ? normalize(best) : undefined;
    } catch {
      return undefined;
    }
  },
};
