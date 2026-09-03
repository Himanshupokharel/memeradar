import { AlertsManager } from '@/components/AlertsManager';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { tokenProvider } from '@/lib/providers/dexscreener-provider';

export const dynamic = 'force-dynamic';

export default async function AlertsPage() {
  const snapshot = await tokenProvider.getSnapshot();
  return <AppShell active="alerts" source={snapshot.source} updatedAt={snapshot.updatedAt}>
    <PageHeader eyebrow="SIGNAL AUTOMATION" feedLabel={snapshot.source === 'dexscreener' ? 'LIVE MARKET CONNECTED' : 'FALLBACK DATA'} title="Alerts" description="Build simple rules that surface tokens when several market conditions become true together." />
    <div className="alert-notice"><span>i</span><p><strong>V1 alert behavior</strong> The rule builder works, but rules currently last only for this browser session and do not send background notifications. Supabase and a scheduled worker are the next requirement.</p></div>
    <AlertsManager />
    <p className="disclaimer">Alerts help you notice conditions; they do not execute trades or recommend buying.</p>
  </AppShell>;
}
