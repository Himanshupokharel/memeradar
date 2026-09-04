// Receives authenticated Helius CREATE_POOL events and stores candidate mints.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

type HeliusEvent = {
  type?: unknown;
  source?: unknown;
  signature?: unknown;
  timestamp?: unknown;
  tokenTransfers?: unknown;
  accountData?: unknown;
  events?: unknown;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const webhookAuth = Deno.env.get('HELIUS_WEBHOOK_AUTH');
const MINT_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const QUOTE_MINTS = new Set([
  'So11111111111111111111111111111111111111112',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
]);

function collectNamedMints(value: unknown, output: Set<string>) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) collectNamedMints(item, output);
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if ((key === 'mint' || key === 'tokenMint') && typeof child === 'string' && MINT_PATTERN.test(child) && !QUOTE_MINTS.has(child)) {
      output.add(child);
    } else if (typeof child === 'object') {
      collectNamedMints(child, output);
    }
  }
}

async function storeCandidates(events: HeliusEvent[]) {
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase function environment is incomplete');
  const now = new Date().toISOString();
  const byMint = new Map<string, Record<string, unknown>>();

  for (const event of events) {
    if (event.type !== 'CREATE_POOL') continue;
    const mints = new Set<string>();
    collectNamedMints(event.tokenTransfers, mints);
    collectNamedMints(event.accountData, mints);
    collectNamedMints(event.events, mints);
    const detectedAt = typeof event.timestamp === 'number'
      ? new Date(event.timestamp * 1000).toISOString()
      : now;
    for (const mint of mints) {
      byMint.set(mint, {
        mint_address: mint,
        source: typeof event.source === 'string' ? `helius:${event.source.toLowerCase()}` : 'helius:create_pool',
        source_program: typeof event.source === 'string' ? event.source : null,
        latest_signature: typeof event.signature === 'string' ? event.signature : null,
        last_detected_at: detectedAt,
        metadata: { eventType: 'CREATE_POOL' },
      });
    }
  }

  if (!byMint.size) return 0;
  const response = await fetch(`${supabaseUrl}/rest/v1/discovery_candidates?on_conflict=mint_address`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify([...byMint.values()]),
  });
  if (!response.ok) throw new Error(`Candidate storage failed (${response.status})`);
  return byMint.size;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  if (!webhookAuth || request.headers.get('authorization') !== webhookAuth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const payload = await request.json();
    const events = Array.isArray(payload) ? payload as HeliusEvent[] : [payload as HeliusEvent];
    const candidates = await storeCandidates(events);
    return Response.json({ received: events.length, candidates });
  } catch (error) {
    console.error('Helius discovery delivery failed', error);
    return Response.json({ error: 'Delivery processing failed' }, { status: 500 });
  }
});
