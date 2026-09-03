import { AlertsManager } from '@/components/AlertsManager';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';

export default function AlertsPage() {
  return <AppShell active="alerts">
    <PageHeader eyebrow="SIGNAL AUTOMATION" title="Alerts" description="Build simple rules that surface tokens when several conditions become true together." />
    <div className="alert-notice"><span>i</span><p><strong>V1 demo behavior</strong> Rules are fully interactive but only live for this browser session. Later, Supabase will save them and a scheduled worker will send notifications.</p></div>
    <AlertsManager />
    <p className="disclaimer">Alerts help you notice conditions; they do not execute trades or recommend buying.</p>
  </AppShell>;
}
