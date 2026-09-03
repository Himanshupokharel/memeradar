export type ScoreInputs = {
  momentum: number;
  liquidity: number;
  participation: number;
  safety: number;
};

/**
 * A deliberately understandable V1 score. Each input is 0–100.
 * Keep this pure so it can be tested separately from the data providers.
 */
export function calculateMemeRadarScore(input: ScoreInputs) {
  const weighted = input.momentum * 0.3 + input.liquidity * 0.25 + input.participation * 0.25 + input.safety * 0.2;
  return Math.round(Math.max(0, Math.min(100, weighted)));
}
