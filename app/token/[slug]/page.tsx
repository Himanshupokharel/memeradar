import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { MetricCard } from '@/components/MetricCard';
import { formatAge, formatMoney, PressureBar, RiskFlags, ScoreBadge, Sparkline, TokenLogo } from '@/components/TokenPrimitives';
import { tokens } from '@/lib/mock-data';
import { tokenProvider } from '@/lib/providers/mock-provider';

export function generateStaticParams() {
  return tokens.map((token) => ({ slug: token.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const token = await tokenProvider.getToken((await params).slug);
  if (!token) return { title: 'Token not found · MemeRadar' };
  const title = `${token.symbol} signal details · MemeRadar`;
  const description = `Review ${token.name}'s MemeRadar score, liquidity, activity, participation, and risk flags.`;
  return { title, description, openGraph: { title, description, images: [] }, twitter: { card: 'summary', title, description, images: [] } };
}

export default async function TokenDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const token = await tokenProvider.getToken((await params).slug);
  if (!token) notFound();
  return <AppShell active="">
    <Link className="back-link" href="/pre-trending">← Back to signals</Link>
    <section className="token-hero">
      <div className="token-identity"><TokenLogo symbol={token.symbol} color={token.color} large /><div><span className="eyebrow">TOKEN DETAIL · MOCK DATA</span><h1>{token.name} <b>{token.symbol}</b></h1><p>{token.contract} <button title="Copy is simulated">Copy</button></p></div></div>
      <div className="price-block"><span>Price</span><strong>${token.price.toFixed(6)}</strong><small className={token.priceChange5m >= 0 ? 'up' : 'down'}>{token.priceChange5m >= 0 ? '↗' : '↘'} {Math.abs(token.priceChange5m)}% in 5m</small></div>
      <div className="hero-score"><span>MEMERADAR SCORE</span><ScoreBadge score={token.score} large /><small>Informational signal</small></div>
    </section>

    <div className="metric-grid detail-metrics"><MetricCard label="Market cap" value={formatMoney(token.marketCap)} note="Estimated circulating value" /><MetricCard label="Liquidity" value={formatMoney(token.liquidity)} note={`${((token.liquidity / token.marketCap) * 100).toFixed(1)}% of market cap`} /><MetricCard label="5m volume" value={formatMoney(token.volume5m)} note={`${formatMoney(token.volume1h)} in 1 hour`} tone="up" /><MetricCard label="Pair age" value={formatAge(token.ageMinutes)} note={`${token.holders.toLocaleString()} holders detected`} /></div>

    <div className="detail-grid">
      <section className="panel chart-card">
        <div className="panel-head"><div><span className="panel-kicker">MARKET ACTIVITY</span><h2>Recent momentum</h2></div><div className="time-tabs"><button className="active">5m</button><button>1h</button><button>6h</button></div></div>
        <div className="chart-readout"><div><span>BUY PRESSURE</span><PressureBar value={token.buyPressure} /></div><div><span>TRADES</span><strong>{token.buyers5m + token.sellers5m}</strong><small>{token.buyers5m} buys · {token.sellers5m} sells</small></div></div>
        <Sparkline values={token.sparkline} tone={token.priceChange5m >= 0 ? 'green' : 'red'} large />
        <div className="chart-axis"><span>5m ago</span><span>Now</span></div>
      </section>
      <section className="panel breakdown-card">
        <div className="panel-head"><div><span className="panel-kicker">TRANSPARENT SCORE</span><h2>Why {token.score}?</h2></div></div>
        <div className="breakdown-list">{Object.entries(token.scoreBreakdown).map(([label, value]) => <div key={label}><span>{label}</span><div><i style={{ width: `${value}%` }} /></div><b>{value}</b></div>)}</div>
        <p>Signals are weighted and normalized from 0–100. High activity cannot fully offset severe safety risks.</p>
      </section>
    </div>

    <section className="panel risk-panel"><div className="panel-head"><div><span className="panel-kicker">DUE DILIGENCE</span><h2>Risk checks</h2></div><span className="result-count">{token.risks.length} CHECKS</span></div><div className="risk-grid">{token.risks.map((risk) => <article key={risk.label}><RiskFlags risks={[risk]} /><p>{risk.detail}</p></article>)}</div></section>
    <div className="detail-footer"><p><strong>What should I do with this?</strong> Use the score to decide what deserves deeper research. Verify the contract, liquidity lock, ownership distribution, and creator history independently.</p><Link className="primary-button" href="/alerts">Create a rule for similar tokens</Link></div>
    <p className="disclaimer">This screen explains observed mock signals. It is not financial advice and does not forecast returns.</p>
  </AppShell>;
}
