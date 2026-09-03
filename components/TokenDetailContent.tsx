'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { tokenProvider } from '@/lib/providers/dexscreener-provider';
import type { Token } from '@/lib/types';
import { MetricCard } from './MetricCard';
import { formatAge, formatMoney, PressureBar, RiskFlags, ScoreBadge, Sparkline, TokenLogo } from './TokenPrimitives';
import { useLiveMarket } from './LiveMarketProvider';

export function TokenDetailContent({ slug }: { slug: string }) {
  const { snapshot, status } = useLiveMarket();
  const [directToken, setDirectToken] = useState<Token>();
  const discovered = snapshot.tokens.find((token) => token.id.toLowerCase() === slug.toLowerCase());
  const token = discovered || directToken;

  useEffect(() => {
    if (discovered || status === 'connecting') return;
    let active = true;
    void tokenProvider.getToken(slug).then((result) => { if (active) setDirectToken(result); });
    return () => { active = false; };
  }, [discovered, slug, status]);

  if (!token) return <div className="detail-loading"><span className="live-dot" /><strong>{status === 'connecting' ? 'Connecting to the live token feed…' : 'Looking up this token…'}</strong><p>The detail screen will appear as soon as the current pair arrives.</p><Link href="/new-tokens">← Back to New Tokens</Link></div>;

  const live = token.source === 'dexscreener';
  const price = token.price > 0 && token.price < 0.0001 ? token.price.toPrecision(4) : token.price.toFixed(6);
  return <>
    <Link className="back-link" href="/pre-trending">← Back to signals</Link>
    <section className="token-hero">
      <div className="token-identity"><TokenLogo symbol={token.symbol} color={token.color} imageUrl={token.imageUrl} large /><div><span className="eyebrow">TOKEN DETAIL · {live ? 'LIVE MARKET DATA' : 'FALLBACK DATA'}</span><h1>{token.name} <b>{token.symbol}</b></h1><p>{token.contract} <button title="Copy is simulated">Copy</button></p></div></div>
      <div className="price-block"><span>Price</span><strong>${price}</strong><small className={token.priceChange5m >= 0 ? 'up' : 'down'}>{token.priceChange5m >= 0 ? '↗' : '↘'} {Math.abs(token.priceChange5m).toFixed(2)}% in 5m</small></div>
      <div className="hero-score"><span>MEMERADAR SCORE</span><ScoreBadge score={token.score} large /><small>Informational signal</small></div>
    </section>
    <div className="metric-grid detail-metrics"><MetricCard label="Market cap / FDV" value={formatMoney(token.marketCap)} note="Provider-reported valuation" /><MetricCard label="Liquidity" value={formatMoney(token.liquidity)} note={token.marketCap ? `${((token.liquidity / token.marketCap) * 100).toFixed(1)}% of valuation` : 'Valuation ratio unavailable'} /><MetricCard label="5m volume" value={formatMoney(token.volume5m)} note={`${formatMoney(token.volume1h)} in 1 hour`} tone="up" /><MetricCard label="Pair age" value={formatAge(token.ageMinutes)} note="Holder count requires Helius" /></div>
    <div className="detail-grid"><section className="panel chart-card"><div className="panel-head"><div><span className="panel-kicker">MARKET ACTIVITY</span><h2>Current 5-minute momentum</h2></div><span className="result-count">3S LIVE SNAPSHOT</span></div><div className="chart-readout"><div><span>BUY PRESSURE</span><PressureBar value={token.buyPressure} /></div><div><span>TRADES</span><strong>{token.buyers5m + token.sellers5m}</strong><small>{token.buyers5m} buys · {token.sellers5m} sells</small></div></div><Sparkline values={token.sparkline} tone={token.priceChange5m >= 0 ? 'green' : 'red'} large /><p className="chart-note">Illustrative shape derived from current 5-minute change and trade intensity—not tick-level price history.</p></section><section className="panel breakdown-card"><div className="panel-head"><div><span className="panel-kicker">TRANSPARENT SCORE</span><h2>Why {token.score}?</h2></div></div><div className="breakdown-list">{Object.entries(token.scoreBreakdown).map(([label, value]) => <div key={label}><span>{label}</span><div><i style={{ width: `${value}%` }} /></div><b>{value}</b></div>)}</div><p>Signals are weighted and normalized from 0–100. High activity cannot fully offset severe safety risks.</p></section></div>
    <section className="panel risk-panel"><div className="panel-head"><div><span className="panel-kicker">DUE DILIGENCE</span><h2>Risk checks</h2></div><span className="result-count">{token.risks.length} CHECKS</span></div><div className="risk-grid">{token.risks.map((risk) => <article key={risk.label}><RiskFlags risks={[risk]} /><p>{risk.detail}</p></article>)}</div></section>
    <div className="detail-footer"><p><strong>What should I do with this?</strong> Use the score to decide what deserves deeper research. Verify the contract, liquidity lock, ownership distribution, and creator history independently.</p><div className="detail-actions">{token.externalUrl && <a className="secondary-button" href={token.externalUrl} target="_blank" rel="noreferrer">View on DEX Screener ↗</a>}<Link className="primary-button" href="/alerts">Create a similar rule</Link></div></div>
    <p className="disclaimer">Market figures come from DEX Screener when available. The score is MemeRadar’s derived informational signal and does not forecast returns.</p>
  </>;
}
