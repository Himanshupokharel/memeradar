type SupabaseOptions = RequestInit & { prefer?: string };

function configuration() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url: url?.replace(/\/$/, ''), secret };
}

export function isSupabaseConfigured() {
  const { url, secret } = configuration();
  return Boolean(url && secret);
}

export async function supabaseRest<T>(path: string, options: SupabaseOptions = {}): Promise<T> {
  const { url, secret } = configuration();
  if (!url || !secret) throw new Error('Supabase is not configured');

  const { prefer, headers, ...requestOptions } = options;
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...requestOptions,
    headers: {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
      ...headers,
    },
    signal: options.signal || AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    const requestId = response.headers.get('x-request-id');
    throw new Error(`Supabase request failed (${response.status}${requestId ? `, ${requestId}` : ''})`);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
