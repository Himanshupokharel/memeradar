'use client';

import { useEffect, useMemo, useState } from 'react';
import { tokenProvider } from '@/lib/providers/dexscreener-provider';
import type { HistoricalPoint, OnchainRiskReport, Token } from '@/lib/types';
import { MetricCard } from './MetricCard';
import { formatAge, formatMoney, PressureBar, RiskFlags, ScoreBadge, Sparkline, TokenLogo } from './TokenPrimitives';
import { useLiveMarket } from './LiveMarketProvider';

function normalizePrices(points: HistoricalPoint[]) {
  const values = points.map((point) => point.price);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 52);
  return values.map((value) => 8 + ((value - min) / (max - min)) * 84);
}

export function TokenDetailContent({ slug }: { slug: string }) {
  const { snapshot, status } = useLiveMarket();
  const [directToken, setDirectToken] = useState<Token>();
  const [riskReport, setRiskReport] = useState<OnchainRiskReport>();
  const [riskState, setRiskState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [history, setHistory] = useState<HistoricalPoint[]>([]);
  const [historyState, setHistoryState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const discovered = snapshot.tokens.find((token) => token.id.toLowerCase() === slug.toLowerCase());
  const token = discovered || directToken;
  const mint = token?.source === 'dexscreener' ? token.id : '';

  useEffect(() => {
    if (discovered || status === 'connecting') return;
    let active = true;
    void tokenProvider.getToken(slug).then((result) => { if (active) setDirectToken(result); });
    return () => { active = false; };
  }, [discovered, slug, status]);

  useEffect(() => {
    if (!mint) return;
    let active = true;
    void fetch(`/api/risk?mint=${encodeURIComponent(mint)}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Risk check unavailable');
        return response.json() as Promise<{ report: OnchainRiskReport }>;
      })
      .then((data) => { if (active) { setRiskReport(data.report); setRiskState('ready'); } })
      .catch(() => { if (active) setRiskState('unavailable'); });
    return () => { active = false; };
  }, [mint]);

  useEffect(() => {
    if (!mint) return;
    let active = true;
    let timer: number | undefined;
    async function loadHistory() {
      try {
        const response = await fetch(`/api/history?mint=${encodeURIComponent(mint)}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('History unavailable');
        const data = await response.json() as { points: HistoricalPoint[] };
        if (active) { setHistory(data.points); setHistoryState('ready'); }
      } catch {
        if (active) setHistoryState('unavailable');
      }
      if (active) timer = window.setTimeout(loadHistory, 60_000);
    }
    void loadHistory();
    return () => { active = false; if (timer) window.clearTimeout(timer); };
  }, [mint]);

  const historicalSparkline = useMemo(() => history.length >= 2 ? normalizePrices(history) : [], [history]);

  if (!token) return <div className="detail-loading"><span className="live-dot" /><strong>{status === 'connecting' ? 'Connecting to the live token feed…' : 'Looking up this token…'}</strong><p>The detail screen will appear as soon as the current pair arrives.</p><a href="/new-tokens">← Back to New Tokens</a></div>;

  const live = token.source === 'dexscreener';
  const price = token.price > 0 && token.price < 0.0001 ? token.price.toPrecision(4) : token.price.toFixed(6);
  const marketRisks = token.risks.filter((risk) => risk.label !== 'On-chain checks pending');
  const risks = riskReport ? [...riskReport.flags, ...marketRisks] : marketRisks;
  const chartValues = historicalSparkline.length ? historicalSparkline : token.sparkline;
  const historyLabel = historyState === 'ready' && history.length >= 2 ? `${history.length} SAVED POINTS` : historyState === 'unavailable' ? 'HISTORY UNAVAILABLE' : 'COLLECTING HISTORY';

  return <>
    <a className="back-link" href="/pre-trending">← Back to signals</a>
    <section className="token-hero">
      <div className="token-identity"><TokenLogo symbol={token.symbol} color={token.color} imageUrl={token.imageUrl} large /><div><span className="eyebrow">TOKEN DETAIL · {live ? 'LIVE MARKET DATA' : 'FALLBACK DATA'}</span><h1>{token.name} <b>{token.symbol}</b></h1><p>{token.contract} <button title="Copy is coming in a later update">Copy</button></p></div></div>
      <div className="price-block"><span>Price</span><strong>${price}</strong><small className={token.priceChange5m >= 0 ? 'up' : 'down'}>{token.priceChange5m >= 0 ? '↗' : '↘'} {Math.abs(token.priceChange5m).toFixed(2)}% in 5m</small></div>
      <div className="hero-score"><span>MEMERADAR SCORE</span><ScoreBadge score={token.score} large /><small>Informational signal</small></div>
    </section>
    <div className="metric-grid detail-metrics"><MetricCard label="Market cap / FDV" value={formatMoney(token.marketCap)} note="Provider-reported valuation" /><MetricCard label="Liquidity" value={formatMoney(token.liquidity)} note={token.marketCap ? `${((token.liquidity / token.marketCap) * 100).toFixed(1)}% of valuation` : 'Valuation ratio unavailable'} /><MetricCard label="5m volume" value={formatMoney(token.volume5m)} note={`${formatMoney(token.volume1h)} in 1 hour`} tone="up" /><MetricCard label="Pair age" value={formatAge(token.ageMinutes)} note={riskState === 'ready' ? `Helius safety ${riskReport?.riskScore}/100` : riskState === 'loading' ? 'Checking on-chain risk…' : 'Helius check unavailable'} /></div>
    <div className="detail-grid"><section className="panel chart-card"><div className="panel-head"><div><span className="panel-kicker">MARKET ACTIVITY</span><h2>{historicalSparkline.length ? 'Saved price history' : 'Current 5-minute momentum'}</h2></div><span className="result-count">{historyLabel}</span></div><div className="chart-readout"><div><span>BUY PRESSURE</span><PressureBar value={token.buyPressure} /></div><div><span>TRADES</span><strong>{token.buyers5m + token.sellers5m}</strong><small>{token.buyers5m} buys · {token.sellers5m} sells</small></div></div><Sparkline values={chartValues} tone={token.priceChange5m >= 0 ? 'green' : 'red'} large /><p className="chart-note">{historicalSparkline.length ? `Actual minute snapshots from ${new Date(history[0].capturedAt).toLocaleTimeString()} to ${new Date(history.at(-1)?.capturedAt || '').toLocaleTimeString()}.` : 'MemeRadar is collecting minute snapshots. Until two points exist, this shape is derived from current five-minute market activity.'}</p></section><section className="panel breakdown-card"><div className="panel-head"><div><span className="panel-kicker">TRANSPARENT SCORE</span><h2>Why {token.score}?</h2></div></div><div className="breakdown-list">{Object.entries(token.scoreBreakdown).map(([label, value]) => <div key={label}><span>{label}</span><div><i style={{ width: `${value}%` }} /></div><b>{value}</b></div>)}</div><p>Signals are weighted and normalized from 0–100. High activity cannot fully offset severe safety risks.</p></section></div>
    <section className="panel risk-panel"><div className="panel-head"><div><span className="panel-kicker">HELIUS + MARKET CHECKS</span><h2>Risk checks</h2></div><span className={`result-count risk-state-${riskState}`}>{riskState === 'ready' ? `ON-CHAIN ${riskReport?.riskScore}/100` : riskState === 'loading' ? 'CHECKING SOLANA…' : 'HELIUS UNAVAILABLE'}</span></div>{riskState === 'loading' && <p className="risk-loading">Reading the Solana mint account and largest token accounts…</p>}{riskState === 'unavailable' && <p className="risk-loading risk-error">Market checks remain visible. The app will retry Helius when this page is opened again.</p>}<div className="risk-grid">{risks.map((risk, index) => <article key={`${risk.label}-${index}`}><RiskFlags risks={[risk]} /><p>{risk.detail}</p></article>)}</div></section>
    <div className="detail-footer"><p><strong>What should I do with this?</strong> Use the score to decide what deserves deeper research. Verify the contract, pool liquidity, ownership distribution, and creator history independently.</p><div className="detail-actions">{token.externalUrl && <a className="secondary-button" href={token.externalUrl} target="_blank" rel="noreferrer">View on DEX Screener ↗</a>}<a className="primary-button" href="/alerts">Create a similar rule</a></div></div>
    <p className="disclaimer">Market figures come from DEX Screener. Helius checks are informational on-chain observations, not guarantees. MemeRadar does not forecast returns or execute trades.</p>
  </>;
}
