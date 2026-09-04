import type { OnchainRiskReport, RiskFlag } from './types';

export type RiskFacts = {
  mintAuthority?: string | null;
  freezeAuthority?: string | null;
  top10TokenAccountPct: number | null;
  metadataMutable: boolean | null;
  authorityAddress: string | null;
  creatorAddress: string | null;
  creatorVerified: boolean | null;
  authorityAssetCount: number | null;
  liquidityLockStatus: 'verified' | 'not-verified' | 'unavailable';
};

type Evidence = OnchainRiskReport['evidence'][number];

function riskLevel(score: number): OnchainRiskReport['riskLevel'] {
  if (score >= 85) return 'lower';
  if (score >= 65) return 'moderate';
  if (score >= 40) return 'elevated';
  return 'critical';
}

function flagFromEvidence(evidence: Evidence): RiskFlag {
  return {
    label: evidence.label,
    level: evidence.status === 'pass' ? 'low' : evidence.status === 'danger' ? 'high' : 'medium',
    detail: evidence.summary,
  };
}

export function buildRiskReport(mint: string, checkedAt: string, facts: RiskFacts, cached: boolean): OnchainRiskReport {
  let score = 100;
  const evidence: Evidence[] = [];

  if (facts.mintAuthority === undefined) {
    evidence.push({ id: 'mint-authority', label: 'Mint authority unknown', status: 'unknown', summary: 'The mint authority field could not be confirmed. Unknown does not mean revoked.', source: 'Helius RPC' });
  } else if (facts.mintAuthority) {
    score -= 30;
    evidence.push({ id: 'mint-authority', label: 'Mint authority active', status: 'danger', summary: 'The current authority can create additional token supply. This is a capability, not proof it will be used.', source: 'Helius RPC' });
  } else {
    evidence.push({ id: 'mint-authority', label: 'Mint authority revoked', status: 'pass', summary: 'The mint account reports no active authority that can create more supply.', source: 'Helius RPC' });
  }

  if (facts.freezeAuthority === undefined) {
    evidence.push({ id: 'freeze-authority', label: 'Freeze authority unknown', status: 'unknown', summary: 'The freeze authority field could not be confirmed. Unknown does not mean revoked.', source: 'Helius RPC' });
  } else if (facts.freezeAuthority) {
    score -= 30;
    evidence.push({ id: 'freeze-authority', label: 'Freeze authority active', status: 'danger', summary: 'The current authority may be able to freeze token accounts. This is a capability, not proof it will be used.', source: 'Helius RPC' });
  } else {
    evidence.push({ id: 'freeze-authority', label: 'Freeze authority revoked', status: 'pass', summary: 'The mint account reports no active authority that can freeze token accounts.', source: 'Helius RPC' });
  }

  const concentration = facts.top10TokenAccountPct;
  if (concentration === null) {
    score -= 10;
    evidence.push({ id: 'concentration', label: 'Concentration unavailable', status: 'unknown', summary: 'Supply data was insufficient for this calculation. Token accounts may include pools, exchanges, or treasury accounts.', source: 'Helius RPC' });
  } else if (concentration > 80) {
    score -= 25;
    evidence.push({ id: 'concentration', label: `Top accounts ${concentration.toFixed(1)}%`, status: 'danger', summary: 'The ten largest token accounts contain most of the supply. This is not the same as the ten largest people because pool and program accounts may be included.', source: 'Helius RPC' });
  } else if (concentration > 60) {
    score -= 15;
    evidence.push({ id: 'concentration', label: `Top accounts ${concentration.toFixed(1)}%`, status: 'warning', summary: 'Supply is concentrated across the ten largest token accounts. Pool, exchange, and program accounts may be included.', source: 'Helius RPC' });
  } else {
    evidence.push({ id: 'concentration', label: `Top accounts ${concentration.toFixed(1)}%`, status: 'pass', summary: 'The ten largest token accounts hold less than 60% of supply. This alone does not prove broad human ownership.', source: 'Helius RPC' });
  }

  if (facts.metadataMutable === true) {
    score -= 5;
    evidence.push({ id: 'metadata', label: 'Metadata mutable', status: 'warning', summary: 'The update authority may still change token name, image, links, or other metadata.', source: 'Helius DAS' });
  } else if (facts.metadataMutable === false) {
    evidence.push({ id: 'metadata', label: 'Metadata immutable', status: 'pass', summary: 'Helius reports that the indexed token metadata can no longer be changed.', source: 'Helius DAS' });
  } else {
    evidence.push({ id: 'metadata', label: 'Metadata status unknown', status: 'unknown', summary: 'Helius did not return a definitive metadata mutability value.', source: 'Helius DAS' });
  }

  if (facts.creatorAddress) {
    if (facts.creatorVerified === true) {
      evidence.push({ id: 'creator', label: 'Creator metadata verified', status: 'pass', summary: 'The indexed metadata contains a verified creator address. Verification confirms the metadata link, not the creator’s trustworthiness.', source: 'Helius DAS' });
    } else {
      score -= 5;
      evidence.push({ id: 'creator', label: 'Creator metadata unverified', status: 'warning', summary: 'A creator address is listed, but Helius does not report it as verified. This is not proof of malicious behavior.', source: 'Helius DAS' });
    }
  } else {
    evidence.push({ id: 'creator', label: 'Creator identity unavailable', status: 'unknown', summary: 'No creator address is exposed in the indexed token metadata, so creator history cannot be attributed reliably.', source: 'Helius DAS' });
  }

  if (facts.authorityAddress && facts.authorityAssetCount !== null) {
    evidence.push({ id: 'authority-footprint', label: `${facts.authorityAssetCount} controlled asset${facts.authorityAssetCount === 1 ? '' : 's'}`, status: 'pass', summary: 'Helius found this many indexed assets controlled by the current metadata authority. A count is context only and does not establish reputation.', source: 'Helius DAS' });
  } else {
    evidence.push({ id: 'authority-footprint', label: 'Authority footprint unavailable', status: 'unknown', summary: 'No reliable authority footprint could be calculated from the indexed asset record.', source: 'Helius DAS' });
  }

  if (facts.liquidityLockStatus === 'verified') {
    evidence.push({ id: 'liquidity-lock', label: 'Liquidity lock evidence found', status: 'pass', summary: 'A supported provider returned verifiable lock or LP-burn evidence. Confirm the lock terms and expiry independently.', source: 'Market provider' });
  } else if (facts.liquidityLockStatus === 'not-verified') {
    score -= 10;
    evidence.push({ id: 'liquidity-lock', label: 'Liquidity lock not verified', status: 'warning', summary: 'The provider was able to check but did not return verifiable lock or LP-burn evidence.', source: 'Market provider' });
  } else {
    evidence.push({ id: 'liquidity-lock', label: 'Liquidity lock unavailable', status: 'unknown', summary: 'The current provider response does not expose verifiable lock or LP-burn evidence. MemeRadar does not guess this status.', source: 'Market provider' });
  }

  const checksCompleted = evidence.filter((item) => item.status !== 'unknown').length;
  const checksTotal = evidence.length;
  const confidence: OnchainRiskReport['confidence'] = checksCompleted >= 6 ? 'high' : checksCompleted >= 4 ? 'medium' : 'low';
  const confidenceReason = `${checksCompleted} of ${checksTotal} evidence checks returned a definite observation. Unknown checks do not count as passed.`;
  const riskScore = Math.max(0, score);

  return {
    mint,
    checkedAt,
    riskScore,
    riskLevel: riskLevel(riskScore),
    confidence,
    confidenceReason,
    checksCompleted,
    checksTotal,
    top10TokenAccountPct: concentration,
    authorityAddress: facts.authorityAddress,
    creatorAddress: facts.creatorAddress,
    creatorVerified: facts.creatorVerified,
    authorityAssetCount: facts.authorityAssetCount,
    liquidityLockStatus: facts.liquidityLockStatus,
    evidence,
    flags: evidence.map(flagFromEvidence),
    cached,
  };
}
