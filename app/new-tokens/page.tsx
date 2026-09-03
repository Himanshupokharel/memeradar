import { AppShell } from '@/components/AppShell';
import { NewTokensContent } from '@/components/NewTokensContent';

export default async function NewTokensPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  return <AppShell active="new"><NewTokensContent query={params.q ?? ''} /></AppShell>;
}
