'use client';

import { MetricCard } from './MetricCard';
import { LivePageHeader } from './LivePageHeader';
import { TokenTable } from './TokenTable';
import { useLiveMarket } from './LiveMarketProvider';

export function NewTokensContent({ query }: { query: string }) {
  const { snapshot, status } = useLiveMarket();
  const discovery = snapshot.discovery;
  const newest = [...snapshot.tokens].sort((a, b) => a.ageMinutes - b.ageMinutes);
  const liquidity = newest.map((token) => token.liquidity).sort((a, b) => a - b);
  const medianLiquidity = liquidity.length ? liquidity[Math.floor(liquidity.length / 2)] : 0;
  return <>
    <LivePageHeader eyebrow="DISCOVERY FEED" liveLabel="LIVE CANDIDATES" title="New tokens" description="Recently created Solana pairs from the current discovery set, organized by activity and market risk." action={{ label: '◎ Set a new-token alert', href: '/alerts' }} />
    <div className="metric-grid metric-grid-compact"><MetricCard label="Loaded candidates" value={String(newest.length)} note={discovery ? `${discovery.candidatePool} in current discovery pool` : 'Latest discovery snapshot'} tone="up" /><MetricCard label="Median liquidity" value={`$${Math.round(medianLiquidity / 1000)}K`} note="Across loaded candidates" /><MetricCard label="Under 30 minutes" value={String(newest.filter((token) => token.ageMinutes < 30).length)} note="Highest uncertainty" tone="warn" /><MetricCard label="Buyer-heavy" value={String(newest.filter((token) => token.buyPressure >= 60).length)} note="Buy pressure of 60%+" /></div>
    <div className="context-strip"><span>{status === 'live' ? 'LIVE · 3S MARKET ROTATION' : status === 'connecting' ? 'CONNECTING' : 'FALLBACK · RETRYING'}</span><p>Discovery combines five DEX Screener channels with Helius pool events. Market metrics rotate through the complete candidate pool every {discovery?.coverageSeconds || 3} seconds.</p></div>
    {discovery && <section className="discovery-health panel">
      <div><span className="panel-kicker">DISCOVERY COVERAGE</span><strong>{discovery.candidatePool} unique Solana candidates</strong><small>Duplicates across channels are counted once in the pool.</small></div>
      <div className="discovery-channels">
        <span><b>{discovery.channels.profiles}</b> New profiles</span>
        <span><b>{discovery.channels.community}</b> Takeovers</span>
        <span><b>{discovery.channels.ads}</b> Ads</span>
        <span><b>{discovery.channels.latestBoosts}</b> Latest boosts</span>
        <span><b>{discovery.channels.topBoosts}</b> Top boosts</span>
        <span><b>{discovery.channels.helius}</b> On-chain pools</span>
      </div>
    </section>}
    <TokenTable data={newest} kicker="REAL-TIME DISCOVERY" title="Recently detected pairs" initialQuery={query} mode="newest" />
    <p className="disclaimer">Pool discovery is supplied by Helius and DEX Screener; market metrics are supplied by DEX Screener when available. No token listed here is a recommendation.</p>
  </>;
}
