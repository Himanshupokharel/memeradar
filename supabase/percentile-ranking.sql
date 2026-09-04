-- Persist the relative rank that was visible when each snapshot was saved.
-- P80 means the token ranked above about 80% of its comparison cohort;
-- it is not an 80% probability of a positive outcome.

alter table public.token_snapshots
  add column if not exists percentile_rank smallint,
  add column if not exists percentile_cohort text,
  add column if not exists percentile_sample_size smallint;

alter table public.token_snapshots
  drop constraint if exists token_snapshots_percentile_rank_check,
  add constraint token_snapshots_percentile_rank_check
    check (percentile_rank is null or percentile_rank between 1 and 99),
  drop constraint if exists token_snapshots_percentile_sample_size_check,
  add constraint token_snapshots_percentile_sample_size_check
    check (percentile_sample_size is null or percentile_sample_size > 0),
  drop constraint if exists token_snapshots_percentile_cohort_check,
  add constraint token_snapshots_percentile_cohort_check
    check (percentile_cohort is null or percentile_cohort in ('under-30m', '30m-3h', '3h-plus', 'all-ages'));

create index if not exists token_snapshots_percentile_time_idx
  on public.token_snapshots (percentile_rank desc, captured_at desc)
  where percentile_rank is not null;

comment on column public.token_snapshots.percentile_rank is 'Relative rank within a similar-age live candidate cohort at capture time; not a probability.';
