import { NextResponse } from 'next/server';
import { isSupabaseConfigured, supabaseRest } from '@/lib/server/supabase';
import type { AlertEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';
const SCOPE = 'private-site-owner';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type EventRow = {
  id: string;
  rule_id: string;
  mint_address: string | null;
  title: string;
  message: string;
  payload: { score?: number; liquidity?: number; ageMinutes?: number } | null;
  triggered_at: string;
  read_at: string | null;
};
type RuleRow = { id: string; name: string };
type TokenRow = { mint_address: string; symbol: string; name: string; image_url: string | null };

async function ownerRuleIds() {
  return supabaseRest<RuleRow[]>(`alert_rules?owner_scope=eq.${SCOPE}&select=id,name`);
}

function inList(values: string[]) {
  return `(${values.map(encodeURIComponent).join(',')})`;
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: 'storage_not_configured' }, { status: 503 });
  try {
    const rules = await ownerRuleIds();
    if (!rules.length) return NextResponse.json({ events: [], unreadCount: 0, configured: true });
    const ruleNames = new Map(rules.map((rule) => [rule.id, rule.name]));
    const ruleFilter = inList(rules.map((rule) => rule.id));
    const summaryOnly = new URL(request.url).searchParams.get('summary') === 'true';
    const unreadRows = await supabaseRest<Array<{ id: string }>>(`alert_events?rule_id=in.${ruleFilter}&read_at=is.null&select=id&limit=1000`);
    if (summaryOnly) return NextResponse.json({ unreadCount: unreadRows.length, configured: true });

    const rows = await supabaseRest<EventRow[]>(`alert_events?rule_id=in.${ruleFilter}&select=id,rule_id,mint_address,title,message,payload,triggered_at,read_at&order=triggered_at.desc&limit=100`);
    const mints = [...new Set(rows.flatMap((row) => row.mint_address ? [row.mint_address] : []))];
    const tokens = mints.length
      ? await supabaseRest<TokenRow[]>(`tokens?mint_address=in.${inList(mints)}&select=mint_address,symbol,name,image_url`)
      : [];
    const tokenByMint = new Map(tokens.map((token) => [token.mint_address, token]));
    const events: AlertEvent[] = rows.map((row) => {
      const token = row.mint_address ? tokenByMint.get(row.mint_address) : undefined;
      return {
        id: row.id,
        ruleId: row.rule_id,
        ruleName: ruleNames.get(row.rule_id) || 'Saved alert',
        mint: row.mint_address || undefined,
        symbol: token?.symbol || 'TOKEN',
        tokenName: token?.name || 'Unknown token',
        imageUrl: token?.image_url || undefined,
        title: row.title,
        message: row.message,
        score: Number(row.payload?.score || 0),
        liquidity: Number(row.payload?.liquidity || 0),
        ageMinutes: Number(row.payload?.ageMinutes || 0),
        triggeredAt: row.triggered_at,
        readAt: row.read_at || undefined,
      };
    });
    return NextResponse.json({ events, unreadCount: unreadRows.length, configured: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Alert event lookup failed:', error);
    return NextResponse.json({ error: 'alert_events_unavailable' }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: 'storage_not_configured' }, { status: 503 });
  try {
    const body = await request.json() as { id?: string; all?: boolean; read?: boolean };
    if (typeof body.read !== 'boolean' || (!body.all && (!body.id || !UUID_PATTERN.test(body.id)))) {
      return NextResponse.json({ error: 'Invalid alert event update' }, { status: 400 });
    }
    const rules = await ownerRuleIds();
    if (!rules.length) return NextResponse.json({ updated: true });
    const filters = [`rule_id=in.${inList(rules.map((rule) => rule.id))}`];
    if (!body.all && body.id) filters.push(`id=eq.${encodeURIComponent(body.id)}`);
    if (body.all && body.read) filters.push('read_at=is.null');
    await supabaseRest(`alert_events?${filters.join('&')}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify({ read_at: body.read ? new Date().toISOString() : null }),
    });
    return NextResponse.json({ updated: true });
  } catch (error) {
    console.error('Alert event update failed:', error);
    return NextResponse.json({ error: 'alert_event_update_failed' }, { status: 502 });
  }
}
