-- MemeRadar snapshot immutability guard.
--
-- token_snapshots is the append-only source of truth that
-- token_outcomes, percentile ranks, momentum, backtesting, and the
-- future Signal Ledger are all computed from. Required directly by
-- project-overview.md: Goal 5 ("build a transparent historical
-- record showing how MemeRadar signals actually performed"),
-- Success Criteria #2 ("every tracked token develops a historical
-- record showing exactly what was knowable at each point in time"),
-- and the Signal Ledger's rule that "signals cannot be retroactively
-- changed to make historical performance look better." None of that
-- can be true if the underlying snapshots can be silently rewritten.
--
-- This was previously enforced only by application convention
-- (nothing ever sent an UPDATE/DELETE). It is now enforced by
-- Postgres itself.
--
-- Not a blanket "reject all writes" trigger: both ingestion paths
-- (app/api/snapshots/route.ts, the memeradar-alert-worker edge
-- function) upsert via `on_conflict=mint_address,captured_at` with
-- `resolution=merge-duplicates`, which is a real UPDATE when the
-- browser and the cron worker both write the same minute bucket.
-- That same-cycle correction is legitimate and must keep working.
-- What must never happen is rewriting a bucket that has already
-- settled into history. The grace window below is what separates
-- the two: it is generous relative to the ~1-minute write cadence
-- and any reasonable retry delay, while making it structurally
-- impossible to alter yesterday's — or even ten minutes ago's —
-- recorded evidence.

create or replace function public.reject_memeradar_snapshot_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  grace_window interval := interval '10 minutes';
  target_captured_at timestamptz := coalesce(old.captured_at, new.captured_at);
begin
  if tg_op = 'DELETE' then
    raise exception 'token_snapshots is append-only: DELETE is never permitted (mint_address=%, captured_at=%)',
      old.mint_address, old.captured_at
      using errcode = 'restrict_violation';
  end if;

  -- tg_op = 'UPDATE': allow only the same-cycle upsert correction.
  if target_captured_at < now() - grace_window then
    raise exception 'token_snapshots is append-only: UPDATE rejected on a settled snapshot older than % (mint_address=%, captured_at=%)',
      grace_window, old.mint_address, old.captured_at
      using errcode = 'restrict_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists reject_memeradar_snapshot_mutation on public.token_snapshots;
create trigger reject_memeradar_snapshot_mutation
before update or delete on public.token_snapshots
for each row
execute function public.reject_memeradar_snapshot_mutation();

comment on function public.reject_memeradar_snapshot_mutation() is
  'Blocks DELETE unconditionally and UPDATE on any token_snapshots row older than a 10-minute grace window, so append-only history is enforced by Postgres rather than application convention. The grace window exists solely to permit the legitimate same-cycle merge-duplicates upsert used by both ingestion paths.';

revoke all on function public.reject_memeradar_snapshot_mutation() from public, anon, authenticated;
