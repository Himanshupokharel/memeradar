import { NextResponse } from 'next/server';
import { isSupabaseConfigured, supabaseRest } from '@/lib/server/supabase';

export const dynamic = 'force-dynamic';

type CandidateRow = {
  mint_address: string;
  source: string;
  last_detected_at: string;
  processed_at: string | null;
};

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false, candidates: [] }, { status: 503 });
  }

  try {
    const since = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
    const rows = await supabaseRest<CandidateRow[]>(
      `discovery_candidates?last_detected_at=gte.${encodeURIComponent(since)}&select=mint_address,source,last_detected_at,processed_at&order=last_detected_at.desc&limit=60`,
    );
    return NextResponse.json({
      configured: true,
      candidates: rows.map((row) => ({
        mintAddress: row.mint_address,
        source: row.source,
        detectedAt: row.last_detected_at,
        enriched: Boolean(row.processed_at),
      })),
    });
  } catch (error) {
    console.error('On-chain candidate lookup failed:', error);
    return NextResponse.json({ configured: true, candidates: [], error: 'discovery_unavailable' }, { status: 502 });
  }
}
