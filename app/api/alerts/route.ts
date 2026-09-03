import { NextResponse } from 'next/server';
import { isSupabaseConfigured, supabaseRest } from '@/lib/server/supabase';
import type { AlertRule, AlertWorkerStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';
const SCOPE = 'private-site-owner';

type RuleRow = {
  id: string; name: string; enabled: boolean;
  conditions: { score?: number; liquidity?: number; maxAge?: number } | null;
  match_count: number; last_triggered_at: string | null;
};

type IngestionRow = { finished_at: string | null; status: string };

function toRule(row: RuleRow): AlertRule {
  return {
    id: row.id,
    name: row.name,
    score: Number(row.conditions?.score || 0),
    liquidity: Number(row.conditions?.liquidity || 0),
    maxAge: Number(row.conditions?.maxAge || 0),
    enabled: row.enabled,
    matches: Number(row.match_count || 0),
    lastTriggeredAt: row.last_triggered_at || undefined,
  };
}

function unavailable() {
  return NextResponse.json({ configured: false, error: 'storage_not_configured' }, { status: 503 });
}

export async function GET() {
  if (!isSupabaseConfigured()) return unavailable();
  try {
    const [rows, runs] = await Promise.all([
      supabaseRest<RuleRow[]>(`alert_rules?owner_scope=eq.${SCOPE}&select=id,name,enabled,conditions,match_count,last_triggered_at&order=created_at.desc`),
      supabaseRest<IngestionRow[]>('ingestion_runs?provider=eq.supabase-cron-dexscreener&select=finished_at,status&order=finished_at.desc&limit=1'),
    ]);
    const latest = runs[0];
    const worker: AlertWorkerStatus = {
      active: Boolean(latest?.finished_at && latest.status === 'succeeded' && Date.now() - new Date(latest.finished_at).getTime() < 3 * 60_000),
      lastRunAt: latest?.finished_at || undefined,
      lastStatus: latest?.status,
    };
    return NextResponse.json({ configured: true, rules: rows.map(toRule), worker });
  } catch (error) {
    console.error('Alert rule lookup failed:', error);
    return NextResponse.json({ configured: true, error: 'alerts_unavailable' }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return unavailable();
  try {
    const body = await request.json() as Partial<AlertRule>;
    const name = String(body.name || 'Untitled rule').trim().slice(0, 100);
    const conditions = {
      score: Math.max(0, Math.min(100, Number(body.score || 0))),
      liquidity: Math.max(0, Number(body.liquidity || 0)),
      maxAge: Math.max(1, Number(body.maxAge || 60)),
    };
    const rows = await supabaseRest<RuleRow[]>('alert_rules', {
      method: 'POST', prefer: 'return=representation', body: JSON.stringify({
        name, enabled: true, conditions, delivery_channels: ['in_app'], owner_scope: SCOPE,
      }),
    });
    return NextResponse.json({ rule: toRule(rows[0]) }, { status: 201 });
  } catch (error) {
    console.error('Alert rule creation failed:', error);
    return NextResponse.json({ error: 'alert_create_failed' }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured()) return unavailable();
  try {
    const body = await request.json() as { id?: string; enabled?: boolean };
    if (!body.id || typeof body.enabled !== 'boolean') return NextResponse.json({ error: 'Invalid alert update' }, { status: 400 });
    const rows = await supabaseRest<RuleRow[]>(`alert_rules?id=eq.${encodeURIComponent(body.id)}&owner_scope=eq.${SCOPE}`, {
      method: 'PATCH', prefer: 'return=representation', body: JSON.stringify({ enabled: body.enabled, updated_at: new Date().toISOString() }),
    });
    if (!rows[0]) return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    return NextResponse.json({ rule: toRule(rows[0]) });
  } catch (error) {
    console.error('Alert rule update failed:', error);
    return NextResponse.json({ error: 'alert_update_failed' }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) return unavailable();
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!id) return NextResponse.json({ error: 'Missing alert id' }, { status: 400 });
  try {
    await supabaseRest(`alert_rules?id=eq.${encodeURIComponent(id)}&owner_scope=eq.${SCOPE}`, { method: 'DELETE', prefer: 'return=minimal' });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Alert rule deletion failed:', error);
    return NextResponse.json({ error: 'alert_delete_failed' }, { status: 502 });
  }
}
