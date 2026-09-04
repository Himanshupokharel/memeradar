import { AppShell } from '@/components/AppShell';
import { BacktestingContent } from '@/components/BacktestingContent';
import { LivePageHeader } from '@/components/LivePageHeader';

export default function BacktestingPage() {
  return <AppShell active="backtesting">
    <LivePageHeader eyebrow="HISTORICAL VALIDATION" liveLabel="24/7 HISTORY CONNECTED" title="Backtesting" description="Measure what happened after MemeRadar first observed a token—using saved market data, not promises." />
    <BacktestingContent />
    <p className="disclaimer">Historical observations are informational only. They do not predict future performance or account for trading costs.</p>
  </AppShell>;
}
