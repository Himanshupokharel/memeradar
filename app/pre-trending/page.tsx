import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { TokenTable } from '@/components/TokenTable';
import { tokenProvider } from '@/lib/providers/mock-provider';

export default async function PreTrendingPage() {
  const tokens = await tokenProvider.getTokens();
  const trending = tokens.filter((token) => token.score >= 65);
  return <AppShell active="trending">
    <PageHeader eyebrow="SIGNAL SHORTLIST" title="Pre-trending" description="Tokens showing several promising market signals before wider momentum is established." action={{ label: '＋ Alert me to new signals', href: '/alerts' }} />
    <section className="signal-explainer"><div className="explainer-copy"><span className="panel-kicker">QUALIFICATION PATH</span><h2>How a token reaches this list</h2><p>A score is a compact research starting point. It does not predict price direction.</p></div><div className="signal-steps"><div><b>01</b><span>Activity</span><small>Volume accelerates</small></div><i>→</i><div><b>02</b><span>Participation</span><small>Buyers broaden</small></div><i>→</i><div><b>03</b><span>Liquidity</span><small>Depth is usable</small></div><i>→</i><div><b>04</b><span>Safety</span><small>Risks are labeled</small></div></div></section>
    <TokenTable data={trending} kicker="CURRENT SHORTLIST" title="Qualified signals" />
    <p className="disclaimer">Pre-trending is an informational classification based on mock metrics—not a promise of future performance.</p>
  </AppShell>;
}
