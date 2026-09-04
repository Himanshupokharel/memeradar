'use client';

import { useEffect, useState } from 'react';
import type { BacktestReport, OutcomeReport } from '@/lib/types';
import { MetricCard } from './MetricCard';
import { ScoreBadge, TokenLogo, formatMoney } from './TokenPrimitives';

const horizons = [
  { minutes: 15, label: '15m' },
  { minutes: 60, label: '1h' },
  { minutes: 360, label: '6h' },
  { minutes: 1440, label: '24h' },
];

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function percentTone(value: number | null | undefined) {
  if (value === null || value === undefined) return 'neutral';
  return value >= 0 ? 'positive' : 'negative';
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function horizonLabel(minutes: number) {
  return horizons.find((item) => item.minutes === minutes)?.label || `${minutes}m`;
}

function points(value: number | null) {
  if (value === null) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)} pts`;
}

export function BacktestingContent() {
  const [horizon, setHorizon] = useState(60);
  const [report, setReport] = useState<BacktestReport | null>(null);
  const [outcomes, setOutcomes] = useState<OutcomeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/backtest?minutes=${horizon}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Backtesting history is unavailable.');
        return response.json() as Promise<BacktestReport>;
      })
      .then(setReport)
      .catch((reason: unknown) => {
        if ((reason as Error).name !== 'AbortError') setError('MemeRadar could not load the saved history. The live market screens are still available.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [horizon]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/outcomes', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<OutcomeReport> : null)
      .then((data) => { if (data) setOutcomes(data); })
      .catch(() => { /* Backtesting remains usable while labels reconnect. */ });
    return () => controller.abort();
  }, []);

  function changeHorizon(minutes: number) {
    if (minutes === horizon) return;
    setLoading(true);
    setError('');
    setHorizon(minutes);
  }

  return <>
    <section className="backtest-control panel">
      <div>
        <span className="panel-kicker">OUTCOME WINDOW</span>
        <strong>How long after the first observation?</strong>
        <p>Choose a window. MemeRadar compares the first saved price with the first valid snapshot at that time.</p>
      </div>
      <div className="horizon-tabs" aria-label="Backtest time window">
        {horizons.map((item) => <button className={horizon === item.minutes ? 'active' : ''} type="button" key={item.minutes} onClick={() => changeHorizon(item.minutes)}>{item.label}</button>)}
      </div>
    </section>

    {error && <div className="backtest-message backtest-error" role="alert"><strong>History connection needs attention</strong><span>{error}</span></div>}
    {loading && <div className="backtest-message"><span className="live-dot" /><strong>Calculating completed {horizonLabel(horizon)} observations…</strong></div>}

    {!loading && report && <>
      {outcomes && <section className="panel outcome-panel">
        <div className="panel-head"><div><span className="panel-kicker">OUTCOME LABELING ENGINE · V0.1</span><h2>Structured truth from saved snapshots</h2></div><span className="result-count">{outcomes.overview.labeled.toLocaleString()} TOKENS LABELED</span></div>
        <div className="outcome-milestones">
          <div><span>Reached 2×</span><strong>{outcomes.overview.reached2x}</strong></div>
          <div><span>Reached 5×</span><strong>{outcomes.overview.reached5x}</strong></div>
          <div><span>Reached 10×</span><strong>{outcomes.overview.reached10x}</strong></div>
          <div><span>Rug heuristic</span><strong className="negative">{outcomes.overview.rugged}</strong></div>
        </div>
        <div className="checkpoint-strip"><span>LIFECYCLE CHECKPOINTS</span><b>1h <i>{outcomes.overview.completed1h}</i></b><b>6h <i>{outcomes.overview.completed6h}</i></b><b>24h <i>{outcomes.overview.completed24h}</i></b><b>7d <i>{outcomes.overview.completed7d}</i></b></div>
        <p className="table-note">Each label preserves discovery value, peak value, maximum upside, maximum drawdown, milestone times, and lifecycle status. “Dead” and “rugged” are transparent data heuristics, not legal or factual accusations.</p>
      </section>}

      <div className="metric-grid metric-grid-compact">
        <MetricCard label="First observations" value={report.overview.tracked.toLocaleString()} note={`${report.overview.snapshotCount.toLocaleString()} saved snapshots`} />
        <MetricCard label="Completed samples" value={report.overview.eligible.toLocaleString()} note={`${report.overview.collecting} still collecting ${horizonLabel(horizon)} data`} tone={report.overview.eligible >= 10 ? 'up' : 'warn'} />
        <MetricCard label={`Median ${horizonLabel(horizon)} change`} value={formatPercent(report.overview.medianChangePct)} note="Middle completed observation" tone={(report.overview.medianChangePct || 0) >= 0 ? 'up' : 'warn'} />
        <MetricCard label="Reached +20% peak" value={formatPercent(report.overview.peak20Rate)} note={`At any point within ${horizonLabel(horizon)}`} />
      </div>

      {report.overview.eligible < 10 && <div className="backtest-readiness"><span>COLLECTING EVIDENCE</span><p><strong>{report.overview.eligible} completed samples</strong> is too small for a reliable conclusion. The 24/7 worker will make this report more useful as history grows.</p></div>}

      <section className="panel calibration-panel">
        <div className="panel-head"><div><span className="panel-kicker">AUTOMATIC CALIBRATION CHECK</span><h2>Do high scores separate from the baseline?</h2></div><span className={`calibration-state calibration-${report.calibration.readiness}`}>{report.calibration.readiness}</span></div>
        <div className="calibration-grid">
          <div><span>70+ completed</span><strong>{report.calibration.highScoreEligible}<small> / {report.calibration.sampleTarget} target</small></strong></div>
          <div><span>Below 60 completed</span><strong>{report.calibration.baselineEligible}<small> / {report.calibration.sampleTarget} target</small></strong></div>
          <div><span>Median-peak difference</span><strong className={percentTone(report.calibration.medianPeakUpliftPct)}>{formatPercent(report.calibration.medianPeakUpliftPct)}</strong></div>
          <div><span>+20% hit-rate difference</span><strong className={percentTone(report.calibration.peak20UpliftPoints)}>{points(report.calibration.peak20UpliftPoints)}</strong></div>
        </div>
        <div className="calibration-summary">
          <div><i style={{ width: `${Math.min(100, (Math.min(report.calibration.highScoreEligible, report.calibration.baselineEligible) / report.calibration.sampleTarget) * 100)}%` }} /></div>
          {report.calibration.readiness === 'collecting' && <p><strong>Not enough comparable samples yet.</strong> Keep the current score unchanged while the worker collects at least 30 completed 70+ and below-60 observations for this window.</p>}
          {report.calibration.readiness === 'early' && <p><strong>Early comparison only.</strong> The direction is visible, but MemeRadar will not call it established until both groups reach {report.calibration.sampleTarget} completed observations.</p>}
          {report.calibration.readiness === 'established' && <p><strong>Sample target reached.</strong> Review whether both uplift measures remain positive across several days before changing score weights.</p>}
        </div>
        <p className="table-note">The 100-sample target is a product-readiness guardrail, not statistical proof. Median end change for 70+ scores is currently {formatPercent(report.calibration.highScoreMedianChangePct)}; peaks do not represent a guaranteed sellable return.</p>
      </section>

      <section className="panel backtest-bands">
        <div className="panel-head"><div><span className="panel-kicker">SCORE COMPARISON</span><h2>What happened by first MemeRadar score?</h2></div><span className="result-count">{horizonLabel(horizon)} WINDOW</span></div>
        <div className="band-head"><span>First score</span><span>Completed</span><span>Median change</span><span>Median peak</span><span>Reached +20%</span></div>
        {report.bands.map((band) => <div className="band-row" key={band.label}>
          <strong>{band.label}</strong>
          <span>{band.eligible}<small> of {band.tracked}</small></span>
          <b className={percentTone(band.medianChangePct)}>{formatPercent(band.medianChangePct)}</b>
          <b className={percentTone(band.medianPeakPct)}>{formatPercent(band.medianPeakPct)}</b>
          <b>{formatPercent(band.peak20Rate)}</b>
        </div>)}
        <p className="table-note">A higher score band is useful only if enough completed samples repeatedly outperform lower bands. Small groups should be treated as “collecting,” not proof.</p>
      </section>

      <section className="panel backtest-signals">
        <div className="panel-head"><div><span className="panel-kicker">FIRST OBSERVATIONS</span><h2>Recent signal outcomes</h2></div><span className="result-count">{report.signals.length} SHOWN</span></div>
        <div className="table-wrap"><table><thead><tr><th>Token</th><th>First score</th><th>First observed</th><th>Entry market cap</th><th>{horizonLabel(horizon)} change</th><th>Peak in window</th><th>Data status</th></tr></thead>
          <tbody>{report.signals.map((signal) => <tr key={signal.mint}>
            <td><a className="token-cell" href={`/token/${signal.mint}`}><TokenLogo symbol={signal.symbol} color="#55e6a5" imageUrl={signal.imageUrl} /><span><b>{signal.symbol}</b><small>{signal.name}</small></span></a></td>
            <td><ScoreBadge score={signal.entryScore} /></td>
            <td>{shortDate(signal.entryAt)}</td>
            <td>{formatMoney(signal.entryMarketCap)}</td>
            <td className={percentTone(signal.horizonChangePct)}>{formatPercent(signal.horizonChangePct)}</td>
            <td className={percentTone(signal.peakChangePct)}>{formatPercent(signal.peakChangePct)}</td>
            <td>{signal.eligible ? <span className="data-status data-complete">COMPLETED</span> : <span className="data-status">COLLECTING</span>}</td>
          </tr>)}</tbody>
        </table></div>
        {report.signals.length === 0 && <div className="empty-state"><strong>No first observations yet</strong><span>The background worker is saving data. This report will fill automatically.</span></div>}
      </section>

      <section className="backtest-method panel">
        <div><span className="panel-kicker">READ THIS FIRST</span><h2>What this report does—and does not—mean</h2><p>Each token enters once, at its first saved MemeRadar snapshot. Completed rows use the first snapshot close to the chosen time window and the highest saved price inside that window.</p></div>
        <ul>
          <li><strong>Historical, not predictive.</strong> Past observations do not guarantee future outcomes.</li>
          <li><strong>Discovery bias exists.</strong> MemeRadar can only measure tokens its data source found.</li>
          <li><strong>Trading friction is excluded.</strong> Fees, slippage, taxes, failed swaps, and actual tradability are not modeled.</li>
          <li><strong>Provider gaps matter.</strong> Missing or delayed DEX data can change the measured outcome.</li>
        </ul>
      </section>
    </>}
  </>;
}
