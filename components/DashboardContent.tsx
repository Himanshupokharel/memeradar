'use client';

import { MetricCard } from './MetricCard';
import { LivePageHeader } from './LivePageHeader';
import { TokenTable } from './TokenTable';
import { formatAge, ScoreBadge, TokenLogo } from './TokenPrimitives';
import { useLiveMarket } from './LiveMarketProvider';

export function DashboardContent() {
  const { snapshot, status } = useLiveMarket();
  const byScore = [...snapshot.tokens].sort((a, b) => b.score - a.score);
  const trending = byScore.filter((token) => token.score >= 55).slice(0, 6);
  const leader = byScore[0];
  const totalVolume = snapshot.tokens.reduce((sum, token) => sum + token.volume5m, 0);
  const recent = [...snapshot.tokens].sort((a, b) => a.ageMinutes - b.ageMinutes).slice(0, 3);
  const isLive = status === 'live';
  return <>
    <LivePageHeader eyebrow="SOLANA SIGNAL DESK" liveLabel="DEX SCREENER CONNECTED" title="Market overview" description="Live market candidates worth a closer look, ranked by transparent activity, liquidity, participation, and available risk signals." action={{ label: '＋ Create alert', href: '/alerts' }} />
    <div className={`provider-banner ${isLive ? 'provider-live' : 'provider-fallback'}`}><span>{isLive ? '● LIVE' : status === 'connecting' ? '● CONNECTING' : '● FALLBACK'}</span><p><strong>{isLive ? 'Discovery and market metrics refresh every 3 seconds; history saves once per minute.' : status === 'connecting' ? 'Opening a direct connection to DEX Screener…' : 'DEX Screener is temporarily unavailable; automatic retries are continuing.'}</strong> {snapshot.notice}</p></div>
    <div className="metric-grid"><MetricCard label="Live candidates" value={String(snapshot.tokens.length)} note="Latest Solana discovery set" tone="up" /><MetricCard label="Created under 1h" value={String(snapshot.tokens.filter((token) => token.ageMinutes <= 60).length)} note="Extremely new; use caution" tone="warn" /><MetricCard label="Signal shortlist" value={String(trending.length)} note="Derived score of 55 or higher" tone="up" /><MetricCard label="Combined 5m volume" value={`$${Math.round(totalVolume / 1000).toLocaleString()}K`} note="Current candidate set" /></div>
    <div className="dashboard-grid"><TokenTable data={trending} title="Live signal shortlist" kicker="DEX SCREENER MARKET DATA" compact mode="trending" /><section className="panel signal-feed"><div className="panel-head"><div><span className="panel-kicker">NEWLY OBSERVED</span><h2>Fresh candidates</h2></div><a href="/new-tokens" className="text-button">All tokens →</a></div><div className="signal-list">{recent.map((token) => <a href={`/token/${token.id}`} key={token.id}><TokenLogo symbol={token.symbol} color={token.color} imageUrl={token.imageUrl} /><div><strong>{token.symbol}</strong><p>{formatAge(token.ageMinutes)} old · {token.buyPressure}% buy pressure</p></div><time>{token.score} score</time></a>)}</div></section></div>
    <div className="insight-grid"><section className="panel radar-card"><div><span className="panel-kicker">CURRENT COVERAGE</span><h2>Live signals, 24/7 history, and on-chain checks.</h2><p>Helius pushes verified Raydium and Pump AMM pool events into the discovery queue, while DEX Screener supplies fast market activity and artwork. A Supabase worker saves minute snapshots and checks alerts around the clock. Helius also checks mint authority, freeze authority, metadata mutability, and top token-account concentration on each detail screen.</p>{leader && <a className="secondary-button" href={`/token/${leader.id}`}>Inspect a live score →</a>}</div><div className="radar-visual"><i /><i /><i /><span>{leader?.score ?? '—'}<small>TOP SCORE</small></span></div></section>{leader && <section className="panel leader-card"><div className="panel-head"><div><span className="panel-kicker">TOP LIVE SIGNAL</span><h2>Highest score in this set</h2></div></div><a href={`/token/${leader.id}`} className="leader-token"><TokenLogo symbol={leader.symbol} color={leader.color} imageUrl={leader.imageUrl} large /><div><strong>{leader.symbol}</strong><small>{leader.name} · {formatAge(leader.ageMinutes)} old</small></div><ScoreBadge score={leader.score} large /></a><p><span>Why it stands out</span> This comparative score uses current activity and liquidity. It is not a recommendation or a return forecast.</p></section>}</div>
    <p className="disclaimer">Live data is supplied by DEX Screener and may be delayed or incomplete. MemeRadar scores are informational signals—not financial advice or return predictions.</p>
  </>;
}
