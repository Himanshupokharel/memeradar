import { AppShell } from '@/components/AppShell';
import { MetricCard } from '@/components/MetricCard';
import { PageHeader } from '@/components/PageHeader';
import { TokenTable } from '@/components/TokenTable';
import { tokenProvider } from '@/lib/providers/mock-provider';

export default async function NewTokensPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [tokens, params] = await Promise.all([tokenProvider.getTokens(), searchParams]);
  const newest = [...tokens].sort((a, b) => a.ageMinutes - b.ageMinutes);
  return <AppShell active="new">
    <PageHeader eyebrow="DISCOVERY FEED" title="New tokens" description="Fresh Solana pairs, organized so you can investigate activity and obvious risks quickly." action={{ label: '◎ Set a new-token alert', href: '/alerts' }} />
    <div className="metric-grid metric-grid-compact"><MetricCard label="Added in 15m" value="31" note="9 passed baseline checks" tone="up" /><MetricCard label="Median liquidity" value="$27K" note="Across new pairs" /><MetricCard label="Active mint risk" value="22%" note="Treat with extra caution" tone="warn" /><MetricCard label="Buyer-heavy" value="46" note="Buy pressure above 60%" /></div>
    <div className="context-strip"><span>NEWEST FIRST</span><p>“New” means recently detected—not vetted or recommended. Use liquidity and risk flags before opening a token.</p></div>
    <TokenTable data={newest} kicker="REAL-TIME DISCOVERY" title="Recently detected pairs" initialQuery={params.q ?? ''} />
    <p className="disclaimer">Data shown is realistic mock data for product testing. No token listed here is a recommendation.</p>
  </AppShell>;
}
