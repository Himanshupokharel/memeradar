-- MemeRadar Outcome Labeling Engine V0.1.
-- Derived labels are rebuilt from immutable minute snapshots and updated whenever
-- a new positive-price snapshot arrives. They are evidence, not predictions.

create table if not exists public.token_outcomes (
  mint_address text primary key references public.tokens(mint_address) on delete cascade,
  first_observed_at timestamptz not null,
  latest_observed_at timestamptz not null,
  last_evaluated_at timestamptz not null default now(),
  observation_minutes numeric not null default 0,
  snapshot_count bigint not null default 0,
  discovery_price_usd numeric not null,
  discovery_market_cap_usd numeric,
  discovery_liquidity_usd numeric,
  latest_price_usd numeric,
  latest_market_cap_usd numeric,
  latest_liquidity_usd numeric,
  peak_price_usd numeric,
  peak_market_cap_usd numeric,
  trough_price_usd numeric,
  minimum_liquidity_usd numeric,
  maximum_upside_pct numeric,
  maximum_drawdown_pct numeric,
  reached_2x boolean not null default false,
  reached_5x boolean not null default false,
  reached_10x boolean not null default false,
  reached_25x boolean not null default false,
  reached_50x boolean not null default false,
  reached_100x boolean not null default false,
  time_to_2x_minutes numeric,
  time_to_5x_minutes numeric,
  time_to_10x_minutes numeric,
  time_to_25x_minutes numeric,
  time_to_50x_minutes numeric,
  time_to_100x_minutes numeric,
  price_1h_usd numeric,
  price_6h_usd numeric,
  price_24h_usd numeric,
  price_7d_usd numeric,
  completed_1h boolean not null default false,
  completed_6h boolean not null default false,
  completed_24h boolean not null default false,
  completed_7d boolean not null default false,
  lifecycle_status text not null default 'collecting'
    check (lifecycle_status in ('collecting', 'active', 'dead', 'rugged')),
  label_version text not null default 'outcome-v0.1'
);

create index if not exists token_outcomes_first_seen_idx on public.token_outcomes (first_observed_at desc);
create index if not exists token_outcomes_status_idx on public.token_outcomes (lifecycle_status, latest_observed_at desc);
alter table public.token_outcomes enable row level security;

create or replace function public.refresh_memeradar_token_outcomes(target_mint text default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_rows integer := 0;
begin
  with first_observations as (
    select distinct on (s.mint_address)
      s.mint_address,
      s.captured_at as entry_at,
      s.price_usd as entry_price,
      s.market_cap_usd as entry_market_cap,
      s.liquidity_usd as entry_liquidity
    from public.token_snapshots s
    where s.price_usd > 0
      and (target_mint is null or s.mint_address = target_mint)
    order by s.mint_address, s.captured_at asc
  ),
  measurements as (
    select
      f.*,
      a.latest_at,
      a.snapshot_count,
      a.latest_price,
      a.latest_market_cap,
      a.latest_liquidity,
      a.latest_volume_1h,
      a.peak_price,
      a.peak_market_cap,
      a.trough_price,
      a.minimum_liquidity,
      a.time_to_2x,
      a.time_to_5x,
      a.time_to_10x,
      a.time_to_25x,
      a.time_to_50x,
      a.time_to_100x,
      a.price_1h,
      a.price_6h,
      a.price_24h,
      a.price_7d,
      extract(epoch from (a.latest_at - f.entry_at)) / 60.0 as observed_minutes
    from first_observations f
    join lateral (
      select
        max(s.captured_at) as latest_at,
        count(*) as snapshot_count,
        (array_agg(s.price_usd order by s.captured_at desc))[1] as latest_price,
        (array_agg(s.market_cap_usd order by s.captured_at desc) filter (where s.market_cap_usd is not null))[1] as latest_market_cap,
        (array_agg(s.liquidity_usd order by s.captured_at desc) filter (where s.liquidity_usd is not null))[1] as latest_liquidity,
        (array_agg(s.volume_1h_usd order by s.captured_at desc) filter (where s.volume_1h_usd is not null))[1] as latest_volume_1h,
        max(s.price_usd) as peak_price,
        max(s.market_cap_usd) as peak_market_cap,
        min(s.price_usd) as trough_price,
        min(s.liquidity_usd) as minimum_liquidity,
        min(extract(epoch from (s.captured_at - f.entry_at)) / 60.0) filter (where s.price_usd >= f.entry_price * 2) as time_to_2x,
        min(extract(epoch from (s.captured_at - f.entry_at)) / 60.0) filter (where s.price_usd >= f.entry_price * 5) as time_to_5x,
        min(extract(epoch from (s.captured_at - f.entry_at)) / 60.0) filter (where s.price_usd >= f.entry_price * 10) as time_to_10x,
        min(extract(epoch from (s.captured_at - f.entry_at)) / 60.0) filter (where s.price_usd >= f.entry_price * 25) as time_to_25x,
        min(extract(epoch from (s.captured_at - f.entry_at)) / 60.0) filter (where s.price_usd >= f.entry_price * 50) as time_to_50x,
        min(extract(epoch from (s.captured_at - f.entry_at)) / 60.0) filter (where s.price_usd >= f.entry_price * 100) as time_to_100x,
        (array_agg(s.price_usd order by s.captured_at) filter (where s.captured_at between f.entry_at + interval '1 hour' and f.entry_at + interval '1 hour 10 minutes'))[1] as price_1h,
        (array_agg(s.price_usd order by s.captured_at) filter (where s.captured_at between f.entry_at + interval '6 hours' and f.entry_at + interval '6 hours 30 minutes'))[1] as price_6h,
        (array_agg(s.price_usd order by s.captured_at) filter (where s.captured_at between f.entry_at + interval '24 hours' and f.entry_at + interval '26 hours'))[1] as price_24h,
        (array_agg(s.price_usd order by s.captured_at) filter (where s.captured_at between f.entry_at + interval '7 days' and f.entry_at + interval '7 days 12 hours'))[1] as price_7d
      from public.token_snapshots s
      where s.mint_address = f.mint_address and s.price_usd > 0
    ) a on true
  )
  insert into public.token_outcomes (
    mint_address, first_observed_at, latest_observed_at, last_evaluated_at,
    observation_minutes, snapshot_count, discovery_price_usd,
    discovery_market_cap_usd, discovery_liquidity_usd, latest_price_usd,
    latest_market_cap_usd, latest_liquidity_usd, peak_price_usd,
    peak_market_cap_usd, trough_price_usd, minimum_liquidity_usd,
    maximum_upside_pct, maximum_drawdown_pct,
    reached_2x, reached_5x, reached_10x, reached_25x, reached_50x, reached_100x,
    time_to_2x_minutes, time_to_5x_minutes, time_to_10x_minutes,
    time_to_25x_minutes, time_to_50x_minutes, time_to_100x_minutes,
    price_1h_usd, price_6h_usd, price_24h_usd, price_7d_usd,
    completed_1h, completed_6h, completed_24h, completed_7d, lifecycle_status
  )
  select
    m.mint_address, m.entry_at, m.latest_at, now(),
    greatest(0, m.observed_minutes), m.snapshot_count, m.entry_price,
    m.entry_market_cap, m.entry_liquidity, m.latest_price,
    m.latest_market_cap, m.latest_liquidity, m.peak_price,
    m.peak_market_cap, m.trough_price, m.minimum_liquidity,
    greatest(0, ((m.peak_price / nullif(m.entry_price, 0)) - 1) * 100),
    greatest(0, (1 - (m.trough_price / nullif(m.entry_price, 0))) * 100),
    m.time_to_2x is not null, m.time_to_5x is not null, m.time_to_10x is not null,
    m.time_to_25x is not null, m.time_to_50x is not null, m.time_to_100x is not null,
    m.time_to_2x, m.time_to_5x, m.time_to_10x,
    m.time_to_25x, m.time_to_50x, m.time_to_100x,
    m.price_1h, m.price_6h, m.price_24h, m.price_7d,
    m.price_1h is not null, m.price_6h is not null, m.price_24h is not null, m.price_7d is not null,
    case
      when m.observed_minutes >= 15
        and coalesce(m.latest_price, m.entry_price) <= m.entry_price * 0.10
        and coalesce(m.latest_liquidity, 0) <= greatest(500, coalesce(m.entry_liquidity, 0) * 0.10)
        then 'rugged'
      when m.observed_minutes >= 1440
        and coalesce(m.latest_price, m.entry_price) <= m.entry_price * 0.20
        and (coalesce(m.latest_liquidity, 0) < 1000 or coalesce(m.latest_volume_1h, 0) < 10)
        then 'dead'
      when m.observed_minutes < 1440 then 'collecting'
      else 'active'
    end
  from measurements m
  on conflict (mint_address) do update set
    first_observed_at = excluded.first_observed_at,
    latest_observed_at = excluded.latest_observed_at,
    last_evaluated_at = excluded.last_evaluated_at,
    observation_minutes = excluded.observation_minutes,
    snapshot_count = excluded.snapshot_count,
    discovery_price_usd = excluded.discovery_price_usd,
    discovery_market_cap_usd = excluded.discovery_market_cap_usd,
    discovery_liquidity_usd = excluded.discovery_liquidity_usd,
    latest_price_usd = excluded.latest_price_usd,
    latest_market_cap_usd = excluded.latest_market_cap_usd,
    latest_liquidity_usd = excluded.latest_liquidity_usd,
    peak_price_usd = excluded.peak_price_usd,
    peak_market_cap_usd = excluded.peak_market_cap_usd,
    trough_price_usd = excluded.trough_price_usd,
    minimum_liquidity_usd = excluded.minimum_liquidity_usd,
    maximum_upside_pct = excluded.maximum_upside_pct,
    maximum_drawdown_pct = excluded.maximum_drawdown_pct,
    reached_2x = excluded.reached_2x,
    reached_5x = excluded.reached_5x,
    reached_10x = excluded.reached_10x,
    reached_25x = excluded.reached_25x,
    reached_50x = excluded.reached_50x,
    reached_100x = excluded.reached_100x,
    time_to_2x_minutes = excluded.time_to_2x_minutes,
    time_to_5x_minutes = excluded.time_to_5x_minutes,
    time_to_10x_minutes = excluded.time_to_10x_minutes,
    time_to_25x_minutes = excluded.time_to_25x_minutes,
    time_to_50x_minutes = excluded.time_to_50x_minutes,
    time_to_100x_minutes = excluded.time_to_100x_minutes,
    price_1h_usd = excluded.price_1h_usd,
    price_6h_usd = excluded.price_6h_usd,
    price_24h_usd = excluded.price_24h_usd,
    price_7d_usd = excluded.price_7d_usd,
    completed_1h = excluded.completed_1h,
    completed_6h = excluded.completed_6h,
    completed_24h = excluded.completed_24h,
    completed_7d = excluded.completed_7d,
    lifecycle_status = excluded.lifecycle_status,
    label_version = 'outcome-v0.1';

  get diagnostics changed_rows = row_count;
  return changed_rows;
end;
$$;

create or replace function public.label_memeradar_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_memeradar_token_outcomes(new.mint_address);
  return new;
end;
$$;

drop trigger if exists label_memeradar_snapshot_after_write on public.token_snapshots;
create trigger label_memeradar_snapshot_after_write
after insert or update of price_usd, market_cap_usd, liquidity_usd, volume_1h_usd
on public.token_snapshots
for each row
when (new.price_usd > 0)
execute function public.label_memeradar_snapshot();

comment on table public.token_outcomes is 'Versioned historical labels derived from MemeRadar snapshots.';
comment on function public.refresh_memeradar_token_outcomes(text) is 'Rebuild one token outcome, or all outcomes when target_mint is null.';
revoke all on public.token_outcomes from public, anon, authenticated;
revoke all on function public.refresh_memeradar_token_outcomes(text) from public, anon, authenticated;
grant all on public.token_outcomes to service_role;
grant execute on function public.refresh_memeradar_token_outcomes(text) to service_role;

-- Backfill every tracked token once. Future snapshots update their own token label.
select public.refresh_memeradar_token_outcomes(null);
