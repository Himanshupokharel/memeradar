import type { AlertRule, Token } from './types';

export const tokens: Token[] = [
  {
    id: 'neon-cat', name: 'Neon Cat', symbol: 'NEON', contract: '9Rk2...mP4x', color: '#55e6a5', score: 86,
    marketCap: 428000, liquidity: 74000, volume5m: 118000, volume1h: 612000, ageMinutes: 18,
    buyPressure: 72, buyers5m: 184, sellers5m: 71, price: 0.000428, priceChange5m: 18.4, holders: 1248,
    sparkline: [16, 20, 18, 27, 25, 34, 31, 46, 42, 55, 61, 58, 72, 79],
    risks: [
      { label: 'Mint revoked', level: 'low', detail: 'No additional supply can be minted.' },
      { label: 'Liquidity healthy', level: 'low', detail: 'Liquidity is 17.3% of market cap.' },
      { label: 'Top holders 21%', level: 'medium', detail: 'Largest wallets hold a meaningful share.' },
    ],
    scoreBreakdown: { momentum: 93, liquidity: 81, participation: 88, safety: 75 },
  },
  {
    id: 'wif-protocol', name: 'Wif Protocol', symbol: 'WIFX', contract: '7PaL...Q2zt', color: '#bba7ff', score: 78,
    marketCap: 1200000, liquidity: 156000, volume5m: 89000, volume1h: 438000, ageMinutes: 42,
    buyPressure: 64, buyers5m: 138, sellers5m: 78, price: 0.00121, priceChange5m: 9.7, holders: 2631,
    sparkline: [24, 29, 34, 31, 39, 46, 51, 49, 58, 53, 62, 69, 67, 73],
    risks: [
      { label: 'Mint revoked', level: 'low', detail: 'No additional supply can be minted.' },
      { label: 'Liquidity moderate', level: 'medium', detail: 'Liquidity depth could amplify volatility.' },
      { label: 'Distribution healthy', level: 'low', detail: 'No single holder exceeds 7%.' },
    ],
    scoreBreakdown: { momentum: 82, liquidity: 77, participation: 79, safety: 72 },
  },
  {
    id: 'bloop', name: 'Bloop', symbol: 'BLOOP', contract: '4LmQ...8Kav', color: '#79deff', score: 72,
    marketCap: 214000, liquidity: 46000, volume5m: 61000, volume1h: 254000, ageMinutes: 67,
    buyPressure: 58, buyers5m: 92, sellers5m: 67, price: 0.000214, priceChange5m: 6.1, holders: 718,
    sparkline: [35, 28, 32, 40, 37, 44, 48, 42, 51, 55, 49, 60, 58, 64],
    risks: [
      { label: 'Mint revoked', level: 'low', detail: 'No additional supply can be minted.' },
      { label: 'Low liquidity', level: 'medium', detail: 'Large trades may move the price sharply.' },
      { label: 'Fresh pair', level: 'medium', detail: 'Less than two hours of trading history.' },
    ],
    scoreBreakdown: { momentum: 76, liquidity: 64, participation: 75, safety: 68 },
  },
  {
    id: 'turbo-frog', name: 'Turbo Frog', symbol: 'TURBO', contract: '2Fp8...vN5k', color: '#ffd36e', score: 64,
    marketCap: 692000, liquidity: 83000, volume5m: 44000, volume1h: 321000, ageMinutes: 126,
    buyPressure: 51, buyers5m: 81, sellers5m: 77, price: 0.000692, priceChange5m: 2.9, holders: 1882,
    sparkline: [42, 47, 43, 51, 56, 48, 53, 58, 55, 51, 59, 57, 61, 60],
    risks: [
      { label: 'Mint revoked', level: 'low', detail: 'No additional supply can be minted.' },
      { label: 'Balanced flow', level: 'low', detail: 'Buying and selling are nearly balanced.' },
      { label: 'Top holders 29%', level: 'high', detail: 'Concentrated ownership increases sell risk.' },
    ],
    scoreBreakdown: { momentum: 62, liquidity: 70, participation: 61, safety: 55 },
  },
  {
    id: 'pixel-pepe', name: 'Pixel Pepe', symbol: 'PXPE', contract: '5Nk3...L1ee', color: '#ff82b2', score: 58,
    marketCap: 98000, liquidity: 19000, volume5m: 27000, volume1h: 88000, ageMinutes: 9,
    buyPressure: 68, buyers5m: 49, sellers5m: 23, price: 0.000098, priceChange5m: 23.2, holders: 286,
    sparkline: [10, 17, 14, 28, 23, 39, 31, 52, 48, 68, 61, 75, 70, 88],
    risks: [
      { label: 'Mint active', level: 'high', detail: 'The creator may be able to increase supply.' },
      { label: 'Thin liquidity', level: 'high', detail: 'Liquidity is below $20K.' },
      { label: 'Very new pair', level: 'medium', detail: 'Only minutes of trading history exist.' },
    ],
    scoreBreakdown: { momentum: 89, liquidity: 38, participation: 59, safety: 29 },
  },
  {
    id: 'capy-club', name: 'Capy Club', symbol: 'CAPY', contract: '8Tx1...B7qo', color: '#ff9f69', score: 69,
    marketCap: 341000, liquidity: 58000, volume5m: 52000, volume1h: 196000, ageMinutes: 33,
    buyPressure: 61, buyers5m: 107, sellers5m: 69, price: 0.000341, priceChange5m: 7.4, holders: 894,
    sparkline: [22, 26, 31, 29, 38, 35, 44, 39, 52, 49, 58, 54, 63, 68],
    risks: [
      { label: 'Mint revoked', level: 'low', detail: 'No additional supply can be minted.' },
      { label: 'Liquidity moderate', level: 'medium', detail: 'Depth is acceptable for a small pair.' },
      { label: 'Distribution healthy', level: 'low', detail: 'Ownership is reasonably distributed.' },
    ],
    scoreBreakdown: { momentum: 72, liquidity: 67, participation: 71, safety: 64 },
  },
  {
    id: 'moon-memo', name: 'Moon Memo', symbol: 'MEMO', contract: '3Jd6...Xs9w', color: '#7b9cff', score: 53,
    marketCap: 176000, liquidity: 24000, volume5m: 18000, volume1h: 74000, ageMinutes: 54,
    buyPressure: 46, buyers5m: 34, sellers5m: 40, price: 0.000176, priceChange5m: -3.8, holders: 512,
    sparkline: [64, 62, 67, 60, 58, 61, 55, 52, 57, 50, 46, 49, 43, 40],
    risks: [
      { label: 'Mint revoked', level: 'low', detail: 'No additional supply can be minted.' },
      { label: 'Seller pressure', level: 'medium', detail: 'Sellers currently outnumber buyers.' },
      { label: 'Thin liquidity', level: 'high', detail: 'Liquidity depth is below the safer range.' },
    ],
    scoreBreakdown: { momentum: 44, liquidity: 48, participation: 56, safety: 63 },
  },
  {
    id: 'sol-snack', name: 'Sol Snack', symbol: 'SNAX', contract: '6Ve4...cW2r', color: '#f2ef9a', score: 47,
    marketCap: 73000, liquidity: 12000, volume5m: 9000, volume1h: 31000, ageMinutes: 6,
    buyPressure: 55, buyers5m: 21, sellers5m: 17, price: 0.000073, priceChange5m: 4.2, holders: 132,
    sparkline: [30, 32, 29, 36, 33, 40, 38, 44, 41, 46, 43, 49, 47, 51],
    risks: [
      { label: 'Mint active', level: 'high', detail: 'The creator may be able to increase supply.' },
      { label: 'Very thin liquidity', level: 'high', detail: 'A small trade could move price sharply.' },
      { label: 'Limited history', level: 'medium', detail: 'Too little history for a stable signal.' },
    ],
    scoreBreakdown: { momentum: 61, liquidity: 28, participation: 45, safety: 34 },
  },
];

export const initialAlertRules: AlertRule[] = [
  { id: 'rule-1', name: 'Strong early momentum', score: 78, liquidity: 50000, maxAge: 60, enabled: true, matches: 3 },
  { id: 'rule-2', name: 'Safer new launches', score: 68, liquidity: 75000, maxAge: 180, enabled: true, matches: 7 },
  { id: 'rule-3', name: 'Watchlist candidates', score: 60, liquidity: 30000, maxAge: 360, enabled: false, matches: 14 },
];

export const recentSignals = [
  { token: 'NEON', message: 'Score crossed 80', time: '2m ago', tone: 'green' },
  { token: 'CAPY', message: 'Buy pressure reached 60%', time: '6m ago', tone: 'cyan' },
  { token: 'PXPE', message: 'Risk flag: mint is active', time: '9m ago', tone: 'red' },
];
