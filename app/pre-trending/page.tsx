import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { TokenTable } from '@/components/TokenTable';
import { tokenProvider } from '@/lib/providers/dexscreener-provider';

export const dynamic = 'force-dynamic';

export default async function PreTrendingPage() {
  const snapshot = await tokenProvider.getSnapshot();
  const trending = snapshot.tokens.filter((token) => token.score >= 55).sort((a, b) => b.score - a.score);
  const live = snapshot.source === 'dexscreener';
  return <AppShell active="trending" source={snapshot.source} updatedAt={snapshot.updatedAt}>
    <PageHeader eyebrow="SIGNAL SHORTLIST" feedLabel={live ? 'LIVE MARKET INPUTS' : 'FALLBACK DATA'} title="Pre-trending" description="Candidates showing stronger comparative activity, liquidity, and participation in the current live discovery set." action={{ label: '＋ Alert me to new signals', href: '/alerts' }} />
    <section className="signal-explainer"><div className="explainer-copy"><span className="panel-kicker">QUALIFICATION PATH</span><h2>How a token reaches this list</h2><p>A score is a compact research starting point. It does not predict price direction.</p></div><div className="signal-steps"><div><b>01</b><span>Activity</span><small>Volume accelerates</small></div><i>→</i><div><b>02</b><span>Participation</span><small>Buyers broaden</small></div><i>→</i><div><b>03</b><span>Liquidity</span><small>Depth is usable</small></div><i>→</i><div><b>04</b><span>Safety</span><small>Risks are labeled</small></div></div></section>
    <TokenTable data={trending} kicker="CURRENT SHORTLIST" title="Qualified signals" />
    <p className="disclaimer">Pre-trending is a MemeRadar classification—not DEX Screener’s ranking and not a promise of future performance.</p>
  </AppShell>;
}
