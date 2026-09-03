import { AppShell } from '@/components/AppShell';
import { MetricCard } from '@/components/MetricCard';
import { PageHeader } from '@/components/PageHeader';
import { TokenTable } from '@/components/TokenTable';
import { tokenProvider } from '@/lib/providers/dexscreener-provider';

export const dynamic = 'force-dynamic';

export default async function NewTokensPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [snapshot, params] = await Promise.all([tokenProvider.getSnapshot(), searchParams]);
  const newest = [...snapshot.tokens].sort((a, b) => a.ageMinutes - b.ageMinutes);
  const liquidity = newest.map((token) => token.liquidity).sort((a, b) => a - b);
  const medianLiquidity = liquidity.length ? liquidity[Math.floor(liquidity.length / 2)] : 0;
  const live = snapshot.source === 'dexscreener';
  return <AppShell active="new" source={snapshot.source} updatedAt={snapshot.updatedAt}>
    <PageHeader eyebrow="DISCOVERY FEED" feedLabel={live ? 'LIVE CANDIDATES' : 'FALLBACK DATA'} title="New tokens" description="Recently created Solana pairs from the current discovery set, organized by activity and market risk." action={{ label: '◎ Set a new-token alert', href: '/alerts' }} />
    <div className="metric-grid metric-grid-compact"><MetricCard label="Current candidates" value={String(newest.length)} note="Latest discovery snapshot" tone="up" /><MetricCard label="Median liquidity" value={`$${Math.round(medianLiquidity / 1000)}K`} note="Across this candidate set" /><MetricCard label="Under 30 minutes" value={String(newest.filter((token) => token.ageMinutes < 30).length)} note="Highest uncertainty" tone="warn" /><MetricCard label="Buyer-heavy" value={String(newest.filter((token) => token.buyPressure >= 60).length)} note="Buy pressure of 60%+" /></div>
    <div className="context-strip"><span>{live ? 'LIVE · NEWEST FIRST' : 'FALLBACK · NEWEST FIRST'}</span><p>Discovery currently combines recently published profiles and actively boosted Solana tokens. It is a candidate feed—not every newly created pair and not a vetted list.</p></div>
    <TokenTable data={newest} kicker="REAL-TIME DISCOVERY" title="Recently detected pairs" initialQuery={params.q ?? ''} />
    <p className="disclaimer">Market data is supplied by DEX Screener when available. No token listed here is a recommendation.</p>
  </AppShell>;
}
