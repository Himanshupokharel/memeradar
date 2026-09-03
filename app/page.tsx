import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { MetricCard } from '@/components/MetricCard';
import { PageHeader } from '@/components/PageHeader';
import { TokenTable } from '@/components/TokenTable';
import { ScoreBadge, TokenLogo } from '@/components/TokenPrimitives';
import { recentSignals } from '@/lib/mock-data';
import { tokenProvider } from '@/lib/providers/mock-provider';

export default async function DashboardPage() {
  const tokens = await tokenProvider.getTokens();
  const trending = tokens.filter((token) => token.score >= 65).slice(0, 5);
  const totalVolume = tokens.reduce((sum, token) => sum + token.volume5m, 0);
  return (
    <AppShell active="dashboard">
      <PageHeader eyebrow="SOLANA SIGNAL DESK" title="Market overview" description="Early activity worth a closer look, ranked by transparent market and risk signals." action={{ label: '＋ Create alert', href: '/alerts' }} />
      <div className="metric-grid">
        <MetricCard label="Tokens tracked" value="2,847" note="↗ 12.4% today" tone="up" />
        <MetricCard label="New in 1 hour" value="124" note="38 passed baseline checks" />
        <MetricCard label="Pre-trending" value={String(trending.length)} note="2 strong signals right now" tone="up" />
        <MetricCard label="5m volume" value={`$${Math.round(totalVolume / 1000)}K`} note="↗ 8.2% vs prior window" tone="up" />
      </div>
      <div className="dashboard-grid">
        <TokenTable data={trending} title="Pre-trending tokens" kicker="LIVE DISCOVERY" compact />
        <section className="panel signal-feed">
          <div className="panel-head"><div><span className="panel-kicker">SIGNAL FEED</span><h2>Latest changes</h2></div><Link href="/alerts" className="text-button">All alerts →</Link></div>
          <div className="signal-list">{recentSignals.map((signal) => <div key={`${signal.token}-${signal.time}`}><span className={`signal-dot signal-${signal.tone}`} /><div><strong>{signal.token}</strong><p>{signal.message}</p></div><time>{signal.time}</time></div>)}</div>
        </section>
      </div>
      <div className="insight-grid">
        <section className="panel radar-card"><div><span className="panel-kicker">HOW TO READ IT</span><h2>One score. Four ingredients.</h2><p>MemeRadar combines momentum, liquidity, buyer participation, and safety checks. Open any token to see exactly why it received its score.</p><Link className="secondary-button" href="/token/neon-cat">Explore a score breakdown →</Link></div><div className="radar-visual"><i /><i /><i /><span>86<small>MR SCORE</small></span></div></section>
        <section className="panel leader-card"><div className="panel-head"><div><span className="panel-kicker">TOP SIGNAL</span><h2>Highest score now</h2></div></div><Link href="/token/neon-cat" className="leader-token"><TokenLogo symbol="NEON" color="#55e6a5" large /><div><strong>NEON</strong><small>Neon Cat · 18m old</small></div><ScoreBadge score={86} large /></Link><p><span>Why it stands out</span> Fast volume growth, broad buyer participation, and healthy liquidity relative to its size.</p></section>
      </div>
      <p className="disclaimer">MemeRadar scores are informational signals, not financial advice or a prediction of returns. Always do your own research.</p>
    </AppShell>
  );
}
