import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { TokenDetailContent } from '@/components/TokenDetailContent';

export const metadata: Metadata = {
  title: 'Live token detail · MemeRadar',
  description: 'Review live market activity, liquidity, participation, score breakdowns, and available risk flags.',
  openGraph: {
    title: 'Live token detail · MemeRadar',
    description: 'Live Solana market signals with transparent scoring and risk context.',
    images: [],
  },
  twitter: {
    card: 'summary',
    title: 'Live token detail · MemeRadar',
    description: 'Live Solana market signals with transparent scoring and risk context.',
    images: [],
  },
};

export default async function TokenDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <AppShell active=""><TokenDetailContent slug={slug} /></AppShell>;
}
