/* eslint-disable @next/next/no-img-element */
'use client';

import type { RiskFlag } from '@/lib/types';

export function formatMoney(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value.toLocaleString()}`;
}

export function formatAge(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${Math.floor(minutes / 1440)}d`;
}

export function ScoreBadge({ score, large = false }: { score: number; large?: boolean }) {
  const tone = score >= 80 ? 'high' : score >= 65 ? 'mid' : score >= 50 ? 'watch' : 'low';
  return <span className={`score score-${tone} ${large ? 'score-large' : ''}`}>{score}</span>;
}

export function TokenLogo({ symbol, color, imageUrl, large = false }: { symbol: string; color: string; imageUrl?: string; large?: boolean }) {
  return <span className={`token-logo ${large ? 'token-logo-large' : ''}`} style={{ backgroundColor: color }} aria-label={`${symbol} token artwork`}><b>{symbol.slice(0, 1)}</b>{imageUrl && <img src={imageUrl} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}</span>;
}

export function Sparkline({ values, tone = 'green', large = false }: { values: number[]; tone?: 'green' | 'red'; large?: boolean }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return (
    <div className={`sparkline ${large ? 'sparkline-large' : ''} sparkline-${tone}`} aria-label="Momentum shape derived from the current snapshot">
      {values.map((value, index) => {
        const height = 18 + ((value - min) / Math.max(1, max - min)) * 82;
        return <i key={`${value}-${index}`} style={{ height: `${height}%` }} />;
      })}
    </div>
  );
}

export function PressureBar({ value }: { value: number }) {
  return <div className="pressure"><span><i style={{ width: `${value}%` }} /></span><b>{value}%</b></div>;
}

export function RiskFlags({ risks, compact = false }: { risks: RiskFlag[]; compact?: boolean }) {
  return (
    <div className={compact ? 'risk-flags risk-flags-compact' : 'risk-flags'}>
      {risks.map((risk) => <span className={`risk risk-${risk.level}`} title={risk.detail} key={risk.label}><i />{risk.label}</span>)}
    </div>
  );
}
