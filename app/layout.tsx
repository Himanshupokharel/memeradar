import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MemeRadar — Solana Signal Intelligence',
  description: 'Track early Solana token signals with transparent market and risk data.',
  openGraph: {
    title: 'MemeRadar',
    description: 'Solana signal intelligence for clearer early-stage research.',
    type: 'website',
    images: [{ url: '/og.png', width: 1729, height: 910, alt: 'MemeRadar — Solana signal intelligence' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MemeRadar',
    description: 'Solana signal intelligence for clearer early-stage research.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
