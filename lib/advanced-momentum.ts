import type { AdvancedMomentum } from './types';

export type MomentumPoint = {
  capturedAt: string;
  price: number;
  liquidity: number;
  volume5m: number;
  buys5m: number;
  sells5m: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const changePct = (from: number, to: number) => from > 0 ? ((to - from) / from) * 100 : 0;
const ratio = (from: number, to: number) => from > 0 ? to / from : to > 0 ? 2 : 1;

export function calculateAdvancedMomentum(input: MomentumPoint[]): AdvancedMomentum {
  const points = input
    .filter((point) => point.price > 0 && Number.isFinite(new Date(point.capturedAt).getTime()))
    .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
  if (points.length < 3) return { status: 'collecting', score: 50, confidence: 0, observationMinutes: 0, priceAccelerationPct: 0, volumeExpansion: 1, participationExpansion: 1, liquidityChangePct: 0, sparkline: points.map((point) => point.price) };

  const first = points[0];
  const latest = points.at(-1) as MomentumPoint;
  const middle = points[Math.floor((points.length - 1) / 2)];
  const firstAt = new Date(first.capturedAt).getTime();
  const middleAt = new Date(middle.capturedAt).getTime();
  const latestAt = new Date(latest.capturedAt).getTime();
  const previousMinutes = Math.max(1, (middleAt - firstAt) / 60_000);
  const recentMinutes = Math.max(1, (latestAt - middleAt) / 60_000);
  const observationMinutes = Math.max(0, (latestAt - firstAt) / 60_000);
  const previousVelocity = changePct(first.price, middle.price) / previousMinutes;
  const recentVelocity = changePct(middle.price, latest.price) / recentMinutes;
  const priceAccelerationPct = clamp((recentVelocity - previousVelocity) * 5, -100, 100);

  const comparison = points.slice(Math.max(0, points.length - 6), -1);
  const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const volumeExpansion = clamp(ratio(average(comparison.map((point) => point.volume5m)), latest.volume5m), 0, 10);
  const participationExpansion = clamp(ratio(average(comparison.map((point) => point.buys5m + point.sells5m)), latest.buys5m + latest.sells5m), 0, 10);
  const liquidityChangePct = clamp(changePct(first.liquidity, latest.liquidity), -100, 200);
  const confidence = clamp(Math.min(points.length / 6, observationMinutes / 15), 0, 1);
  const rawScore = 50
    + priceAccelerationPct * 0.8
    + Math.log2(Math.max(0.25, volumeExpansion)) * 12
    + Math.log2(Math.max(0.25, participationExpansion)) * 10
    + liquidityChangePct * 0.4;
  const score = Math.round(clamp(50 + (rawScore - 50) * confidence, 0, 100));
  const status = confidence < 0.34 ? 'collecting' : score >= 62 ? 'accelerating' : score <= 38 ? 'cooling' : 'steady';
  return {
    status, score, confidence: Math.round(confidence * 100), observationMinutes: Math.round(observationMinutes),
    priceAccelerationPct: Math.round(priceAccelerationPct * 10) / 10,
    volumeExpansion: Math.round(volumeExpansion * 100) / 100,
    participationExpansion: Math.round(participationExpansion * 100) / 100,
    liquidityChangePct: Math.round(liquidityChangePct * 10) / 10,
    sparkline: points.slice(-14).map((point) => point.price),
  };
}
