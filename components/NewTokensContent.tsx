'use client';

import { MetricCard } from './MetricCard';
import { LivePageHeader } from './LivePageHeader';
import { TokenTable } from './TokenTable';
import { useLiveMarket } from './LiveMarketProvider';

export function NewTokensContent({ query }: { query: string }) {
  const { snapshot, status } = useLiveMarket();
  const newest = [...snapshot.tokens].sort((a, b) => a.ageMinutes - b.ageMinutes);
  const liquidity = newest.map((token) => token.liquidity).sort((a, b) => a - b);
  const medianLiquidity = liquidity.length ? liquidity[Math.floor(liquidity.length / 2)] : 0;
  return <>
    <LivePageHeader eyebrow="DISCOVERY FEED" liveLabel="LIVE CANDIDATES" title="New tokens" description="Recently created Solana pairs from the current discovery set, organized by activity and market risk." action={{ label: '◎ Set a new-token alert', href: '/alerts' }} />
    <div className="metric-grid metric-grid-compact"><MetricCard label="Current candidates" value={String(newest.length)} note="Latest discovery snapshot" tone="up" /><MetricCard label="Median liquidity" value={`$${Math.round(medianLiquidity / 1000)}K`} note="Across this candidate set" /><MetricCard label="Under 30 minutes" value={String(newest.filter((token) => token.ageMinutes < 30).length)} note="Highest uncertainty" tone="warn" /><MetricCard label="Buyer-heavy" value={String(newest.filter((token) => token.buyPressure >= 60).length)} note="Buy pressure of 60%+" /></div>
    <div className="context-strip"><span>{status === 'live' ? 'LIVE · 3S DISCOVERY' : status === 'connecting' ? 'CONNECTING' : 'FALLBACK · RETRYING'}</span><p>Discovery combines recently published profiles and actively boosted Solana tokens. It is a candidate feed—not every newly created pair and not a vetted list.</p></div>
    <TokenTable data={newest} kicker="REAL-TIME DISCOVERY" title="Recently detected pairs" initialQuery={query} mode="newest" />
    <p className="disclaimer">Market data is supplied by DEX Screener when available. No token listed here is a recommendation.</p>
  </>;
}
