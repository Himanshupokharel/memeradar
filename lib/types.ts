export type RiskLevel = 'low' | 'medium' | 'high';

export type RiskFlag = {
  label: string;
  level: RiskLevel;
  detail: string;
};

export type Token = {
  id: string;
  name: string;
  symbol: string;
  contract: string;
  color: string;
  score: number;
  marketCap: number;
  liquidity: number;
  volume5m: number;
  volume1h: number;
  ageMinutes: number;
  buyPressure: number;
  buyers5m: number;
  sellers5m: number;
  price: number;
  priceChange5m: number;
  holders: number;
  source?: 'dexscreener' | 'mock';
  externalUrl?: string;
  pairAddress?: string;
  imageUrl?: string;
  sparkline: number[];
  risks: RiskFlag[];
  scoreBreakdown: {
    momentum: number;
    liquidity: number;
    participation: number;
    safety: number;
  };
};

export type TokenSnapshot = {
  tokens: Token[];
  source: 'dexscreener' | 'mock';
  updatedAt: string;
  notice?: string;
};

export type AlertRule = {
  id: string;
  name: string;
  score: number;
  liquidity: number;
  maxAge: number;
  enabled: boolean;
  matches: number;
};
