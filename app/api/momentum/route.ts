import { NextResponse } from 'next/server';
import { calculateAdvancedMomentum, type MomentumPoint } from '@/lib/advanced-momentum';
import { isSupabaseConfigured, supabaseRest } from '@/lib/server/supabase';
import type { AdvancedMomentum } from '@/lib/types';

export const dynamic = 'force-dynamic';
const MINT_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const MAX_MINTS = 60;
const QUERY_CHUNK = 20;

type SnapshotRow = {
  mint_address: string;
  captured_at: string;
  price_usd: number | string | null;
  liquidity_usd: number | string | null;
  volume_5m_usd: number | string | null;
  buys_5m: number | null;
  sells_5m: number | null;
};

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ signals: {}, configured: false }, { status: 503 });
  const raw = new URL(request.url).searchParams.get('mints') || '';
  const mints = [...new Set(raw.split(',').map((mint) => mint.trim()).filter(Boolean))].slice(0, MAX_MINTS);
  if (!mints.length || mints.some((mint) => !MINT_PATTERN.test(mint))) return NextResponse.json({ error: 'invalid_mints' }, { status: 400 });
  const since = new Date(Date.now() - 35 * 60_000).toISOString();
  try {
    const chunks = Array.from({ length: Math.ceil(mints.length / QUERY_CHUNK) }, (_, index) => mints.slice(index * QUERY_CHUNK, index * QUERY_CHUNK + QUERY_CHUNK));
    const rows = (await Promise.all(chunks.map((chunk) => supabaseRest<SnapshotRow[]>(
      `token_snapshots?mint_address=in.(${chunk.join(',')})&captured_at=gte.${encodeURIComponent(since)}&select=mint_address,captured_at,price_usd,liquidity_usd,volume_5m_usd,buys_5m,sells_5m&order=captured_at.asc&limit=1000`,
    )))).flat();
    const grouped = new Map<string, MomentumPoint[]>();
    for (const row of rows) {
      const points = grouped.get(row.mint_address) || [];
      points.push({ capturedAt: row.captured_at, price: Number(row.price_usd || 0), liquidity: Number(row.liquidity_usd || 0), volume5m: Number(row.volume_5m_usd || 0), buys5m: Number(row.buys_5m || 0), sells5m: Number(row.sells_5m || 0) });
      grouped.set(row.mint_address, points);
    }
    const signals: Record<string, AdvancedMomentum> = {};
    for (const mint of mints) signals[mint] = calculateAdvancedMomentum(grouped.get(mint) || []);
    return NextResponse.json({ signals, configured: true, generatedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Advanced momentum lookup failed:', error);
    return NextResponse.json({ signals: {}, configured: true, error: 'momentum_unavailable' }, { status: 502 });
  }
}
