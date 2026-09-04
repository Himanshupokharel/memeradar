import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { TradeContent } from '@/components/TradeContent';

export const metadata: Metadata = {
  title: 'Wallet-confirmed swap · MemeRadar',
  description: 'Review and approve a non-custodial Solana token swap through Jupiter.',
  openGraph: { title: 'Wallet-confirmed swap · MemeRadar', description: 'Non-custodial Solana swaps with wallet approval.', images: [] },
  twitter: { card: 'summary', title: 'Wallet-confirmed swap · MemeRadar', description: 'Non-custodial Solana swaps with wallet approval.', images: [] },
};

export default async function TradePage({ params, searchParams }: { params: Promise<{ mint: string }>; searchParams: Promise<{ side?: string }> }) {
  const [{ mint }, query] = await Promise.all([params, searchParams]);
  return <AppShell active=""><TradeContent mint={mint} side={query.side === 'sell' ? 'sell' : 'buy'} /></AppShell>;
}
