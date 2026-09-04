'use client';

import { useEffect, useMemo, useState } from 'react';
import { tokenProvider } from '@/lib/providers/dexscreener-provider';
import type { AdvancedMomentum, HistoricalPoint, OnchainRiskReport, OutcomeLabel, Token } from '@/lib/types';
import { MetricCard } from './MetricCard';
import { formatAge, formatMoney, PercentileBadge, PressureBar, RiskFlags, RiskLevelBadge, ScoreBadge, Sparkline, TokenLogo } from './TokenPrimitives';
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
  const [outcome, setOutcome] = useState<OutcomeLabel>();
  const [directMomentum, setDirectMomentum] = useState<AdvancedMomentum>();
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
    void fetch(`/api/momentum?mints=${encodeURIComponent(mint)}`, { cache: 'no-store' })
      .then(async (response): Promise<{ signals: Record<string, AdvancedMomentum> }> => response.ok
        ? response.json() as Promise<{ signals: Record<string, AdvancedMomentum> }>
        : { signals: {} })
      .then((data) => { if (active) setDirectMomentum(data.signals[mint]); })
      .catch(() => { /* The live market view remains usable without the historical signal. */ });
    return () => { active = false; };
  }, [mint]);

  useEffect(() => {
    if (!mint) return;
    let active = true;
    void fetch(`/api/outcomes?mint=${encodeURIComponent(mint)}`, { cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() as Promise<{ label: OutcomeLabel | null }> : { label: null })
      .then((data) => { if (active && data.label) setOutcome(data.label); })
      .catch(() => { /* Outcome labels are supplementary to live research. */ });
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
  const chartValues = historicalSparkline.length ? historicalSparkline : token.sparkline;
  const historyLabel = historyState === 'ready' && history.length >= 2 ? `${history.length} SAVED POINTS` : historyState === 'unavailable' ? 'HISTORY UNAVAILABLE' : 'COLLECTING HISTORY';
  const momentum = token.advancedMomentum || directMomentum;

  return <>
    <a className="back-link" href="/pre-trending">← Back to signals</a>
    <section className="token-hero">
      <div className="token-identity"><TokenLogo symbol={token.symbol} color={token.color} imageUrl={token.imageUrl} large /><div><span className="eyebrow">TOKEN DETAIL · {live ? 'LIVE MARKET DATA' : 'FALLBACK DATA'}</span><h1>{token.name} <b>{token.symbol}</b></h1><p>{token.contract} <button title="Copy is coming in a later update">Copy</button></p></div></div>
      <div className="price-block"><span>Price</span><strong>${price}</strong><small className={token.priceChange5m >= 0 ? 'up' : 'down'}>{token.priceChange5m >= 0 ? '↗' : '↘'} {Math.abs(token.priceChange5m).toFixed(2)}% in 5m</small></div>
      <div className="hero-score"><span>MEMERADAR SCORE</span><ScoreBadge score={token.score} large /><small>{token.relativeRank ? `P${token.relativeRank.overall} among similar-age peers` : 'Informational signal'}</small></div>
    </section>
    <div className="metric-grid detail-metrics"><MetricCard label="Market cap / FDV" value={formatMoney(token.marketCap)} note="Provider-reported valuation" /><MetricCard label="Liquidity" value={formatMoney(token.liquidity)} note={token.marketCap ? `${((token.liquidity / token.marketCap) * 100).toFixed(1)}% of valuation` : 'Valuation ratio unavailable'} /><MetricCard label="5m volume" value={formatMoney(token.volume5m)} note={`${formatMoney(token.volume1h)} in 1 hour`} tone="up" /><MetricCard label="Pair age" value={formatAge(token.ageMinutes)} note={riskState === 'ready' ? `Safety evidence ${riskReport?.riskScore}/100 · ${riskReport?.confidence} confidence` : riskState === 'loading' ? 'Checking on-chain evidence…' : 'On-chain check unavailable'} /></div>
    {token.relativeRank && <section className="panel relative-rank-panel"><div className="panel-head"><div><span className="panel-kicker">RELATIVE STRENGTH · CURRENT COHORT</span><h2>How this token compares with similar-age candidates</h2></div><PercentileBadge rank={token.relativeRank} detailed /></div><div className="relative-rank-grid">{([['Momentum', token.relativeRank.momentum], ['Liquidity', token.relativeRank.liquidity], ['Participation', token.relativeRank.participation], ['Safety', token.relativeRank.safety]] as const).map(([label, value]) => <div key={label}><span>{label}</span><div><i style={{ width: `${value}%` }} /></div><strong>P{value}</strong></div>)}</div><p className="table-note">P80 means the current value ranks above approximately 80% of this live comparison cohort. It is not an 80% success probability.</p></section>}
    <div className="detail-grid"><section className="panel chart-card"><div className="panel-head"><div><span className="panel-kicker">MARKET ACTIVITY</span><h2>{historicalSparkline.length ? 'Saved price history' : 'Current 5-minute momentum'}</h2></div><span className="result-count">{historyLabel}</span></div><div className="chart-readout"><div><span>BUY PRESSURE</span><PressureBar value={token.buyPressure} /></div><div><span>TRADES</span><strong>{token.buyers5m + token.sellers5m}</strong><small>{token.buyers5m} buys · {token.sellers5m} sells</small></div></div><Sparkline values={chartValues} tone={token.priceChange5m >= 0 ? 'green' : 'red'} large /><p className="chart-note">{historicalSparkline.length ? `Actual minute snapshots from ${new Date(history[0].capturedAt).toLocaleTimeString()} to ${new Date(history.at(-1)?.capturedAt || '').toLocaleTimeString()}.` : 'MemeRadar is collecting minute snapshots. Until two points exist, this shape is derived from current five-minute market activity.'}</p></section><section className="panel breakdown-card"><div className="panel-head"><div><span className="panel-kicker">TRANSPARENT SCORE</span><h2>Why {token.score}?</h2></div></div><div className="breakdown-list">{Object.entries(token.scoreBreakdown).map(([label, value]) => <div key={label}><span>{label}</span><div><i style={{ width: `${value}%` }} /></div><b>{value}</b></div>)}</div><p>Signals are weighted and normalized from 0–100. High activity cannot fully offset severe safety risks.</p></section></div>
    {momentum && <section className="panel advanced-momentum-panel"><div className="panel-head"><div><span className="panel-kicker">ADVANCED MOMENTUM · EXPERIMENTAL V0.1</span><h2>Movement across saved observations</h2></div><span className={`momentum-state momentum-${momentum.status}`}>{momentum.status} · {momentum.score}</span></div><div className="advanced-momentum-grid"><div><span>Price acceleration</span><strong className={momentum.priceAccelerationPct >= 0 ? 'positive' : 'negative'}>{momentum.priceAccelerationPct >= 0 ? '+' : ''}{momentum.priceAccelerationPct.toFixed(1)}%</strong><small>Recent velocity vs earlier velocity</small></div><div><span>Volume expansion</span><strong>{momentum.volumeExpansion.toFixed(2)}×</strong><small>Latest 5m volume vs recent average</small></div><div><span>Participation growth</span><strong>{momentum.participationExpansion.toFixed(2)}×</strong><small>Latest trades vs recent average</small></div><div><span>Liquidity change</span><strong className={momentum.liquidityChangePct >= 0 ? 'positive' : 'negative'}>{momentum.liquidityChangePct >= 0 ? '+' : ''}{momentum.liquidityChangePct.toFixed(1)}%</strong><small>Across {momentum.observationMinutes} recorded minutes</small></div></div><p className="table-note">Confidence: {momentum.confidence}%. This experimental signal is shown separately until outcome labels establish whether it improves the main MemeRadar score.</p></section>}
    {outcome && <section className="panel token-outcome-panel"><div className="panel-head"><div><span className="panel-kicker">RECORDED OUTCOME · {outcome.labelVersion.toUpperCase()}</span><h2>What happened after discovery?</h2></div><span className={`outcome-status outcome-${outcome.lifecycleStatus}`}>{outcome.lifecycleStatus}</span></div><div className="token-outcome-grid"><div><span>Discovery market cap</span><strong>{formatMoney(outcome.discoveryMarketCap)}</strong></div><div><span>Peak market cap</span><strong>{formatMoney(outcome.peakMarketCap)}</strong></div><div><span>Maximum upside</span><strong className="positive">+{outcome.maximumUpsidePct.toFixed(1)}%</strong></div><div><span>Maximum drawdown</span><strong className="negative">-{outcome.maximumDrawdownPct.toFixed(1)}%</strong></div></div><div className="outcome-ledger"><span>{outcome.snapshotCount.toLocaleString()} snapshots · {formatAge(outcome.observationMinutes)} observed</span><div>{[2, 5, 10, 25, 50, 100].map((multiple) => <b className={outcome.reachedMultiples.includes(multiple) ? 'reached' : ''} key={multiple}>{multiple}×</b>)}</div></div><p className="table-note">Milestones use saved provider prices. They do not prove that the full position could have been sold at the peak.</p></section>}
    <section className="panel risk-panel" id="risk-checks">
      <div className="panel-head"><div><span className="panel-kicker">RISK V1 · HELIUS + MARKET EVIDENCE</span><h2>What the app could verify</h2></div>{riskReport ? <RiskLevelBadge level={riskReport.riskLevel} confidence={riskReport.confidence} /> : <span className={`result-count risk-state-${riskState}`}>{riskState === 'loading' ? 'CHECKING SOLANA…' : 'HELIUS UNAVAILABLE'}</span>}</div>
      {riskState === 'loading' && <p className="risk-loading">Reading authority controls, supply concentration, metadata, and available identity evidence…</p>}
      {riskState === 'unavailable' && <p className="risk-loading risk-error">Market checks remain visible. The app will retry the on-chain checks when this page is opened again.</p>}
      {riskReport && <>
        <div className="risk-summary-grid">
          <div><span>Safety evidence</span><strong>{riskReport.riskScore}<small>/100</small></strong><p>Higher means fewer observed warnings in the checks that completed.</p></div>
          <div><span>Evidence coverage</span><strong>{riskReport.checksCompleted}<small>/{riskReport.checksTotal}</small></strong><p>{riskReport.confidenceReason}</p></div>
          <div><span>Last checked</span><strong className="risk-checked-time">{new Date(riskReport.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong><p>{riskReport.cached ? 'Loaded from the recent private cache.' : 'Read from Solana and Helius now.'}</p></div>
        </div>
        <div className="risk-evidence-grid">{riskReport.evidence.map((item) => <article className={`risk-evidence risk-evidence-${item.status}`} key={item.id}><div><i /><span>{item.source}</span></div><strong>{item.label}</strong><p>{item.summary}</p></article>)}</div>
        <p className="risk-caveat">Unknown does not mean unsafe, and a passed check does not make a token safe. The score only summarizes the evidence shown above.</p>
      </>}
      <div className="market-risk-section"><div><span className="panel-kicker">LIVE MARKET CONDITIONS</span><h3>Pool and age checks</h3></div><div className="risk-grid">{marketRisks.map((risk, index) => <article key={`${risk.label}-${index}`}><RiskFlags risks={[risk]} /><p>{risk.detail}</p></article>)}</div></div>
    </section>
    <div className="detail-footer"><p><strong>What should I do with this?</strong> Use the score to decide what deserves deeper research. Verify the contract, pool liquidity, ownership distribution, and creator history independently.</p><div className="detail-actions">{token.externalUrl && <a className="secondary-button" href={token.externalUrl} target="_blank" rel="noreferrer">View on DEX Screener ↗</a>}<a className="secondary-button" href="/alerts">Create a similar rule</a>{live && <><a className="primary-button" href={`/trade/${token.id}?side=buy`}>Buy</a><a className="sell-button" href={`/trade/${token.id}?side=sell`}>Sell</a></>}</div></div>
    <p className="disclaimer">Market figures come from DEX Screener. Helius checks are informational on-chain observations, not guarantees. Any swap requires approval inside the user’s wallet and is routed by Jupiter. MemeRadar does not forecast returns or auto-trade.</p>
  </>;
}
