'use client';

import { useEffect, useState } from 'react';
import type { BacktestReport } from '@/lib/types';
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

export function BacktestingContent() {
  const [horizon, setHorizon] = useState(60);
  const [report, setReport] = useState<BacktestReport | null>(null);
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
      <div className="metric-grid metric-grid-compact">
        <MetricCard label="First observations" value={report.overview.tracked.toLocaleString()} note={`${report.overview.snapshotCount.toLocaleString()} saved snapshots`} />
        <MetricCard label="Completed samples" value={report.overview.eligible.toLocaleString()} note={`${report.overview.collecting} still collecting ${horizonLabel(horizon)} data`} tone={report.overview.eligible >= 10 ? 'up' : 'warn'} />
        <MetricCard label={`Median ${horizonLabel(horizon)} change`} value={formatPercent(report.overview.medianChangePct)} note="Middle completed observation" tone={(report.overview.medianChangePct || 0) >= 0 ? 'up' : 'warn'} />
        <MetricCard label="Reached +20% peak" value={formatPercent(report.overview.peak20Rate)} note={`At any point within ${horizonLabel(horizon)}`} />
      </div>

      {report.overview.eligible < 10 && <div className="backtest-readiness"><span>COLLECTING EVIDENCE</span><p><strong>{report.overview.eligible} completed samples</strong> is too small for a reliable conclusion. The 24/7 worker will make this report more useful as history grows.</p></div>}

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
