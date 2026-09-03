import { NextResponse } from 'next/server';
import { isSupabaseConfigured, supabaseRest } from '@/lib/server/supabase';
import type { HistoricalPoint } from '@/lib/types';

export const dynamic = 'force-dynamic';
const MINT_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

type SnapshotRow = {
  captured_at: string;
  price_usd: number | string | null;
  market_cap_usd: number | string | null;
  liquidity_usd: number | string | null;
  volume_5m_usd: number | string | null;
  memeradar_score: number | null;
};

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ points: [], configured: false }, { status: 503 });
  const mint = new URL(request.url).searchParams.get('mint') || '';
  if (!MINT_PATTERN.test(mint)) return NextResponse.json({ error: 'Invalid mint address' }, { status: 400 });
  try {
    const rows = await supabaseRest<SnapshotRow[]>(`token_snapshots?mint_address=eq.${encodeURIComponent(mint)}&select=captured_at,price_usd,market_cap_usd,liquidity_usd,volume_5m_usd,memeradar_score&order=captured_at.desc&limit=120`);
    const points: HistoricalPoint[] = rows.reverse().map((row) => ({
      capturedAt: row.captured_at,
      price: Number(row.price_usd || 0),
      marketCap: Number(row.market_cap_usd || 0),
      liquidity: Number(row.liquidity_usd || 0),
      volume5m: Number(row.volume_5m_usd || 0),
      score: Number(row.memeradar_score || 0),
    }));
    return NextResponse.json({ points, configured: true });
  } catch (error) {
    console.error('History lookup failed:', error);
    return NextResponse.json({ points: [], configured: true, error: 'history_unavailable' }, { status: 502 });
  }
}
