import type { RelativeRank, Token } from './types';

function ageCohort(ageMinutes: number): RelativeRank['cohort'] {
  if (ageMinutes < 30) return 'under-30m';
  if (ageMinutes < 180) return '30m-3h';
  return '3h-plus';
}

function percentile<T>(items: T[], current: T, value: (item: T) => number) {
  const currentValue = value(current);
  const below = items.filter((item) => value(item) < currentValue).length;
  const equal = items.filter((item) => value(item) === currentValue).length;
  return Math.max(1, Math.min(99, Math.round(((below + equal * 0.5) / items.length) * 100)));
}

export function applyPercentileRanks(tokens: Token[]) {
  if (!tokens.length) return tokens;
  return tokens.map((token) => {
    const requestedCohort = ageCohort(token.ageMinutes);
    const similarAge = tokens.filter((candidate) => ageCohort(candidate.ageMinutes) === requestedCohort);
    const cohort = similarAge.length >= 5 ? similarAge : tokens;
    const cohortName: RelativeRank['cohort'] = similarAge.length >= 5 ? requestedCohort : 'all-ages';
    const momentumValue = (candidate: Token) => candidate.advancedMomentum?.confidence && candidate.advancedMomentum.confidence >= 34
      ? candidate.advancedMomentum.score : candidate.scoreBreakdown.momentum;
    const relativeRank: RelativeRank = {
      overall: percentile(cohort, token, (candidate) => candidate.score),
      momentum: percentile(cohort, token, momentumValue),
      liquidity: percentile(cohort, token, (candidate) => candidate.liquidity),
      participation: percentile(cohort, token, (candidate) => candidate.scoreBreakdown.participation),
      safety: percentile(cohort, token, (candidate) => candidate.scoreBreakdown.safety),
      cohort: cohortName,
      sampleSize: cohort.length,
    };
    return { ...token, relativeRank };
  });
}

export function cohortLabel(cohort: RelativeRank['cohort']) {
  if (cohort === 'under-30m') return 'under 30m';
  if (cohort === '30m-3h') return '30m–3h';
  if (cohort === '3h-plus') return '3h+';
  return 'all ages';
}
