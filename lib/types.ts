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
  discovery?: {
    candidatePool: number;
    refreshedAt: string;
    coverageSeconds: number;
    channels: {
      profiles: number;
      community: number;
      ads: number;
      latestBoosts: number;
      topBoosts: number;
      helius: number;
    };
  };
};

export type AlertRule = {
  id: string;
  name: string;
  score: number;
  liquidity: number;
  maxAge: number;
  enabled: boolean;
  matches: number;
  lastTriggeredAt?: string;
};

export type HistoricalPoint = {
  capturedAt: string;
  price: number;
  marketCap: number;
  liquidity: number;
  volume5m: number;
  score: number;
};

export type OnchainRiskReport = {
  mint: string;
  checkedAt: string;
  riskScore: number;
  top10TokenAccountPct: number | null;
  flags: RiskFlag[];
  cached: boolean;
};

export type AlertWorkerStatus = {
  active: boolean;
  lastRunAt?: string;
  lastStatus?: string;
};

export type AlertEvent = {
  id: string;
  ruleId: string;
  ruleName: string;
  mint?: string;
  symbol: string;
  tokenName: string;
  imageUrl?: string;
  title: string;
  message: string;
  score: number;
  liquidity: number;
  ageMinutes: number;
  triggeredAt: string;
  readAt?: string;
};

export type BacktestSignal = {
  mint: string;
  symbol: string;
  name: string;
  imageUrl?: string;
  entryAt: string;
  entryPrice: number;
  entryScore: number;
  entryMarketCap: number;
  entryLiquidity: number;
  outcomeAt?: string;
  outcomePrice?: number;
  horizonChangePct?: number;
  peakChangePct?: number;
  observationMinutes: number;
  snapshotCount: number;
  eligible: boolean;
};

export type BacktestBand = {
  label: string;
  tracked: number;
  eligible: number;
  medianChangePct: number | null;
  medianPeakPct: number | null;
  peak20Rate: number | null;
};

export type OutcomeLabel = {
  mint: string;
  firstObservedAt: string;
  latestObservedAt: string;
  observationMinutes: number;
  snapshotCount: number;
  discoveryPrice: number;
  discoveryMarketCap: number;
  discoveryLiquidity: number;
  latestPrice: number;
  latestMarketCap: number;
  latestLiquidity: number;
  peakPrice: number;
  peakMarketCap: number;
  maximumUpsidePct: number;
  maximumDrawdownPct: number;
  reachedMultiples: number[];
  timeTo2xMinutes?: number;
  timeTo5xMinutes?: number;
  timeTo10xMinutes?: number;
  completedCheckpoints: Array<'1h' | '6h' | '24h' | '7d'>;
  lifecycleStatus: 'collecting' | 'active' | 'dead' | 'rugged';
  labelVersion: string;
};

export type OutcomeReport = {
  generatedAt: string;
  overview: {
    labeled: number;
    reached2x: number;
    reached5x: number;
    reached10x: number;
    dead: number;
    rugged: number;
    completed1h: number;
    completed6h: number;
    completed24h: number;
    completed7d: number;
    medianMaximumUpsidePct: number | null;
    medianMaximumDrawdownPct: number | null;
  };
  labels: OutcomeLabel[];
};

export type BacktestReport = {
  horizonMinutes: number;
  generatedAt: string;
  overview: {
    tracked: number;
    eligible: number;
    collecting: number;
    snapshotCount: number;
    medianChangePct: number | null;
    medianPeakPct: number | null;
    peak20Rate: number | null;
    oldestEntryAt?: string;
  };
  calibration: {
    readiness: 'collecting' | 'early' | 'established';
    highScoreEligible: number;
    baselineEligible: number;
    sampleTarget: number;
    highScoreMedianChangePct: number | null;
    highScoreMedianPeakPct: number | null;
    highScorePeak20Rate: number | null;
    medianPeakUpliftPct: number | null;
    peak20UpliftPoints: number | null;
  };
  bands: BacktestBand[];
  signals: BacktestSignal[];
};
