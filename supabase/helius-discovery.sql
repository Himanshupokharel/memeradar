-- On-chain pool candidates pushed to MemeRadar by Helius.
-- Safe to run more than once.

create table if not exists public.discovery_candidates (
  mint_address text primary key,
  source text not null,
  source_program text,
  latest_signature text,
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists discovery_candidates_detected_idx
  on public.discovery_candidates (last_detected_at desc);

create index if not exists discovery_candidates_pending_idx
  on public.discovery_candidates (processed_at, last_detected_at desc);

alter table public.discovery_candidates enable row level security;

-- Only server-side code uses this table. Do not add a public browser policy.
