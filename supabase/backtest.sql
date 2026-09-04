-- MemeRadar V2 backtesting query.
-- One token enters the report at its first saved positive-price snapshot.
-- The result is historical evidence, not a return prediction.
create or replace function public.get_memeradar_backtest(horizon_minutes integer default 60)
returns table (
  mint_address text,
  symbol text,
  name text,
  image_url text,
  entry_at timestamptz,
  entry_price numeric,
  entry_score integer,
  entry_market_cap numeric,
  entry_liquidity numeric,
  entry_pair_age_minutes integer,
  outcome_at timestamptz,
  outcome_price numeric,
  peak_price numeric,
  observation_minutes numeric,
  snapshot_count bigint
)
language sql
security definer
set search_path = public
as $$
  with settings as (
    select greatest(1, least(coalesce(horizon_minutes, 60), 1440))::integer as horizon
  ),
  first_observations as (
    select distinct on (s.mint_address)
      s.mint_address,
      s.captured_at,
      s.price_usd,
      s.memeradar_score,
      s.market_cap_usd,
      s.liquidity_usd,
      s.pair_age_minutes
    from public.token_snapshots s
    where s.price_usd > 0
    order by s.mint_address, s.captured_at asc
  )
  select
    f.mint_address,
    t.symbol,
    t.name,
    t.image_url,
    f.captured_at as entry_at,
    f.price_usd as entry_price,
    f.memeradar_score as entry_score,
    f.market_cap_usd as entry_market_cap,
    f.liquidity_usd as entry_liquidity,
    f.pair_age_minutes as entry_pair_age_minutes,
    outcome.captured_at as outcome_at,
    outcome.price_usd as outcome_price,
    peak.peak_price,
    extract(epoch from (latest.latest_at - f.captured_at)) / 60.0 as observation_minutes,
    latest.snapshot_count
  from first_observations f
  cross join settings cfg
  join public.tokens t on t.mint_address = f.mint_address
  left join lateral (
    select s.captured_at, s.price_usd
    from public.token_snapshots s
    where s.mint_address = f.mint_address
      and s.price_usd > 0
      and s.captured_at >= f.captured_at + make_interval(mins => cfg.horizon)
      and s.captured_at <= f.captured_at + make_interval(mins => cfg.horizon + greatest(5, cfg.horizon / 10))
    order by s.captured_at asc
    limit 1
  ) outcome on true
  left join lateral (
    select max(s.price_usd) as peak_price
    from public.token_snapshots s
    where s.mint_address = f.mint_address
      and s.price_usd > 0
      and s.captured_at >= f.captured_at
      and s.captured_at <= f.captured_at + make_interval(mins => cfg.horizon)
  ) peak on true
  left join lateral (
    select max(s.captured_at) as latest_at, count(*) as snapshot_count
    from public.token_snapshots s
    where s.mint_address = f.mint_address
  ) latest on true
  order by f.captured_at desc
  limit 1000;
$$;

comment on function public.get_memeradar_backtest(integer) is 'First-observation historical outcome report for MemeRadar.';
revoke all on function public.get_memeradar_backtest(integer) from public;
revoke all on function public.get_memeradar_backtest(integer) from anon;
revoke all on function public.get_memeradar_backtest(integer) from authenticated;
grant execute on function public.get_memeradar_backtest(integer) to service_role;
