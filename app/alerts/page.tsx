import { AlertsManager } from '@/components/AlertsManager';
import { AppShell } from '@/components/AppShell';
import { LivePageHeader } from '@/components/LivePageHeader';

export default function AlertsPage() {
  return <AppShell active="alerts">
    <LivePageHeader eyebrow="SIGNAL AUTOMATION" liveLabel="LIVE MARKET CONNECTED" title="Alerts" description="Build simple rules that surface tokens when several market conditions become true together." />
    <div className="alert-notice"><span>i</span><p><strong>24/7 persistent alert rules</strong> Rules are saved in Supabase and evaluated against fresh market snapshots every minute—even when the dashboard is closed. Phone and email delivery are a later upgrade.</p></div>
    <AlertsManager />
    <p className="disclaimer">Alerts help you notice conditions; they do not execute trades or recommend buying.</p>
  </AppShell>;
}
