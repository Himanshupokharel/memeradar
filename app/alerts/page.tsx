import { AlertsManager } from '@/components/AlertsManager';
import { AppShell } from '@/components/AppShell';
import { LivePageHeader } from '@/components/LivePageHeader';

export default function AlertsPage() {
  return <AppShell active="alerts">
    <LivePageHeader eyebrow="SIGNAL AUTOMATION" liveLabel="LIVE MARKET CONNECTED" title="Alerts" description="Build simple rules that surface tokens when several market conditions become true together." />
    <div className="alert-notice"><span>i</span><p><strong>V1 alert behavior</strong> The rule builder works, but rules currently last only for this browser session and do not send background notifications. Supabase and a scheduled worker are the next requirement.</p></div>
    <AlertsManager />
    <p className="disclaimer">Alerts help you notice conditions; they do not execute trades or recommend buying.</p>
  </AppShell>;
}
