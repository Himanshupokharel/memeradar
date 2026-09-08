# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

Phase 1 — Data & Risk Foundation (Risk V1): **complete.**
Phase 2 — Risk Intelligence v2 (deep forensics): **not started, next up.**
Phase 3 — Signal Engine V0.1: **blocked on Phase 2.**

(Phases follow `project-overview.md`'s CURRENT DEVELOPMENT SCOPE →
AFTER PROOF OF EDGE → real-money testing progression.)

## Current Goal

Build Risk Intelligence v2 — funding-source wallet clustering,
single-block sniper detection, liquidity lock/LP-burn verification,
and OHLCV blow-off-top chart heuristics — **before** the Buy/Sell
Signal Engine V0.1, not after or in parallel. Reason (decided
2026-09-06): a Buy Signal's stated bar (Thesis Engine) includes risk
level and confidence as inputs; shipping V0.1 against the current
shallow Risk V1 and upgrading risk quality afterward would silently
change the risk basis under already-issued signals with no version
marker, which the immutability invariant (`architecture.md` #4)
doesn't currently protect against on the risk-input side.

## Completed

**Discovery**
- Hybrid discovery: 5 DexScreener channels (profiles, community
  takeovers, ads, latest boosts, top boosts) + authenticated Helius
  `CREATE_POOL` webhook for verified Raydium/Pump AMM programs.
- Candidate pool refresh every 15s; 30-address market-data rotation
  every 3s while a tab is visible.

**Scoring V1**
- 4-factor score (momentum 30% / liquidity 25% / participation 25% /
  safety 20%) — `lib/scoring.ts`, pure and unit-testable.

**Risk V1**
- Evidence-based on-chain risk report: mint/freeze authority,
  holder concentration, metadata mutability, creator identity,
  authority asset footprint. Explicit `unknown` states that never
  count as a pass. 10-minute cache.

**Storage & background execution**
- Full Supabase schema (tokens, snapshots, risk checks, alert
  rules/events, ingestion runs, discovery candidates).
- Minute-by-minute snapshots via a Supabase Cron edge function that
  runs independent of any open browser tab, with a 40s duplicate-run
  guard.
- **Verified actually live in production 2026-09-08** (not just
  present in code): the Supabase project itself was never
  initialized before this date — all 6 SQL files plus
  `memeradar-alert-worker` were deployed and a `pg_cron` +
  `pg_net` schedule confirmed firing every minute with real
  `ingestion_runs` rows (`status='succeeded'`, ~65–67 tokens/run).
  See Session Notes for deployment gotchas hit along the way.

**Alerts**
- Persistent, user-created alert rules (score/liquidity/age
  conditions), in-app inbox with unread counts, 15-minute per-rule
  repeat guard, Telegram delivery from the background worker.

**Backtesting V1**
- 15m/1h/6h/24h outcome windows, score-band (70+ vs. <60) comparison,
  calibration guardrails (30 samples for an "early" read, 100 for
  "established").

**Outcome labeling**
- Permanent, immutable outcome records per token: discovery/latest/
  peak/trough, max upside/drawdown, 2×–100× milestones, 1h/6h/24h/7d
  checkpoints, adaptive follow-up cadence (denser near launch).

**Percentile ranking**
- Age-cohort-relative P1–P99 rank (overall + per-component), with a
  fallback to the full live cohort when fewer than 5 same-age peers
  exist.

**Advanced Momentum (experimental)**
- Price acceleration / volume expansion / participation expansion /
  liquidity change from saved observations, with a confidence
  percentage. Displayed beside the score, not yet feeding it.

**Data integrity**
- `token_snapshots` append-only guarantee is now enforced by
  Postgres (`supabase/snapshot-immutability.sql`) — a trigger blocks
  DELETE unconditionally and UPDATE outside a 10-minute grace window
  that exists only to permit the legitimate same-cycle
  `merge-duplicates` upsert. Directly required by
  `project-overview.md` Goal 5 / Success Criteria #2 / the Signal
  Ledger's immutability rule — previously only an application
  convention, not an enforced guarantee.

**Trade workspace**
- Non-custodial buy/sell via embedded Jupiter Terminal + Wallet
  Standard, token locked to reduce address mistakes, risk summary
  surfaced inline. No trading fee, no custody, no auto-trading.

## In Progress

- None actively in code. `context/*.md` were template-only until
  this session; they are now populated (this update).

## Next Up

0. **Housekeeping (low priority, whenever convenient):**
   - Rotate the Supabase secret key — it was exposed in this
     session's debugging (a misfired browser action, and a
     hand-transcription error) and should be replaced before this
     project has anything real riding on it. Deferred by choice, not
     forgotten.
   - Delete the unused `clever-processor` Edge Function (an
     auto-named mis-deploy from before `memeradar-alert-worker` was
     deployed under its correct name).
1. **Risk Intelligence v2** (blocks the Signal Engine — see Current
   Goal): funding-source wallet clustering across top holders,
   single-block sniper detection, liquidity lock/LP-burn
   verification, OHLCV blow-off-top chart heuristics. Extends
   `lib/risk-model.ts`'s evidence list and the existing
   webhook/streaming pattern (Helius `CREATE_POOL`) rather than new
   infrastructure — see `architecture.md`, "Execution delegation
   boundary."
2. **Buy/Sell Signal Engine V0.1** (paper-only, separate from
   execution) — starts once Risk Intelligence v2 evidence is
   available to feed its risk/confidence inputs.
3. Alongside the Signal Engine: decide where the Signal Ledger sits,
   since a signal invariant requires every signal to be permanently
   recorded before it's shown to a user (see Open Questions below).

## Open Questions

- **Signal Ledger sequencing:** does the Signal Ledger need to be
  built *before* the Signal Engine, or can V0.1 ship with a minimal
  inline record that gets promoted to a full ledger later? The
  immutability invariant says a signal must be permanently recorded,
  but doesn't dictate build order.
- **Scoring duplication:** the normalize/score logic is duplicated
  between the browser provider and the Deno edge function (see
  `architecture.md`, "Known boundary violation"). Does this get
  resolved before the Signal Engine needs the same score in a third
  place, or after?
- **Proof-of-edge threshold:** `project-overview.md` says real-money
  testing only starts "after historical edge, live paper edge, and
  execution edge are validated," but doesn't define the numeric bar
  (sample size, win rate, expected value) that counts as validated.
- **Multi-user trigger:** auth work is explicitly deferred until
  trading edge is proven (see `architecture.md`, Auth and Access
  Model). What specific event or metric marks "proven" and starts
  that work?
- **Unbounded intelligence data storage:** Wallet Intelligence,
  Smart Money, and the AI Assistant will all generate data that
  grows per-wallet × per-token rather than per-token. No storage
  decision has been made yet (see `architecture.md`, Storage Model).
~~Monetization timing and model~~ — **resolved 2026-09-06:** not
  yet. Stay focused on proving the signal/outcome edge first; a
  swap-fee model (compatible with the existing Jupiter Terminal
  embed via `platformFeeBps`) remains a plausible later option but
  is deliberately not on the roadmap yet.

~~Regulatory / geofencing exposure~~ — **resolved 2026-09-06:** not
  currently relevant to MemeRadar's actual operating/target
  jurisdiction. No geofencing work needed now; revisit only if that
  changes.

## Architecture Decisions

- **2026-09-06 — `token_snapshots` immutability moved from
  convention to an enforced Postgres trigger, scoped to a grace
  window rather than a blanket write-block.** Auditing the codebase
  against `architecture.md` surfaced that Invariant 4's blanket
  "append-only and immutable" wording didn't match two different
  realities: `token_outcomes` is *correctly* mutated in place (a
  materialized view over immutable snapshots — doc was fixed, not
  code), while `token_snapshots` itself was only insert-only by
  convention with no DB enforcement (code was fixed, not doc).
  Evaluated against `project-overview.md` first (Goal 5, Success
  Criteria #2, the Signal Ledger's immutability rule) before
  implementing, so the fix is driven by the product's own stated
  requirement rather than an arbitrary hardening choice. The trigger
  is time-bounded (10-minute grace) rather than absolute because both
  ingestion paths rely on a genuine same-cycle `merge-duplicates`
  UPDATE — a blanket block would have broken production ingestion.
- **2026-09-06 — Risk Intelligence v2 sequenced before the Signal
  Engine, not after or in parallel.** A Buy Signal's stated bar
  depends on risk level/confidence as inputs, so shipping V0.1
  against shallow Risk V1 and upgrading risk quality afterward would
  silently change the basis of already-issued signals. Also updated
  `project-overview.md`'s Risk Intelligence bullets to name the
  specific techniques (funding-source clustering, sniper detection,
  LP-lock verification, blow-off-top heuristics) instead of leaving
  that detail only in `architecture.md`.
- **2026-09-06 — `context/guide.md` (external brokerage-infrastructure
  research) evaluated against `project-overview.md` as the priority
  baseline.** Verdict: its low-latency execution stack (SWQoS, Jito
  bundles, bare-metal colocation, Yellowstone gRPC + ClickHouse) is
  explicitly rejected from this architecture — it solves a problem
  MemeRadar doesn't have, since execution is fully delegated to the
  embedded Jupiter Terminal widget (see `architecture.md` Invariant
  9). Its risk-forensics techniques (funding-source wallet
  clustering, single-block sniper detection, LP lock/burn
  verification, OHLCV blow-off-top detection) are adopted as the
  concrete next evidence checks for the Risk Intelligence roadmap.
  Monetization and geofencing were raised and resolved (see Open
  Questions — both deferred, not needed now). Embedded wallets
  (Privy/Turnkey-style MPC) are kept as a real AFTER-PROOF-OF-EDGE
  candidate rather than ruled out — the external-wallet model stays
  the deliberate default until then.

- **2026-09-06 — `architecture.md` targets the end-state, not just
  current state.** Reason: avoid re-deriving structural decisions
  piecemeal as each new phase (Signal Engine, Position Guardian,
  Wallet Intelligence, ...) gets built. This file (the progress
  tracker) is the place that tracks what's actually done vs.
  remaining against that target.
- **2026-09-06 — No-auth-on-API-routes is an intentional, temporary
  invariant, not an oversight.** Multi-user auth is deferred until
  trading edge is proven, matching `project-overview.md`'s explicit
  scope boundary ("public launch before trading edge is validated"
  is out of scope now).
- **(Pre-existing, inferred from code) Client-side DexScreener
  polling is a known, accepted scaling limitation** for the current
  single-owner release. The Supabase Edge Function cron worker
  already built for alerting is the intended long-term source of
  truth once client-side polling needs to be retired — see
  `architecture.md`'s recommended resolution for the scoring
  duplication, which addresses both problems together.

## Session Notes

- This session filled in `architecture.md`, `code-standards.md`,
  `ui-context.md`, and this file from template state, using
  `README.md`, `project-overview.md`, and a direct read of the
  codebase (providers, API routes, Supabase schema/functions,
  `globals.css`) as sources — not invented from scratch.
- Removed the duplicate blank template `context/project-overview
  copy.md`.
- Created `context/ai-workflow-rules.md`, which CLAUDE.md referenced
  but which never existed. It's a first draft inferred from the
  project's existing delivery patterns (README's step-by-step
  "complete" cadence, evidence/uncertainty conventions) — flagged
  there as something to revise, not a settled decision.
- Next session should pick up at: scoping Risk Intelligence v2
  (funding-source clustering, sniper detection, LP-lock verification,
  blow-off-top heuristics) against the Open Questions above before
  writing any code. Buy/Sell Signal Engine V0.1 follows once that
  evidence is available, not before.
- **2026-09-08 — Supabase deployment gotchas (read before touching
  edge functions or cron again):**
  - This project has **two parallel Supabase key systems** that
    don't interoperate everywhere: legacy JWT (`anon`/`service_role`,
    the long `eyJ...` format) and the newer `sb_publishable_.../
    sb_secret_...` format. PostgREST/REST calls (what
    `lib/server/supabase.ts` uses) accept either. Edge functions
    using `withSupabase({ auth: ['publishable', 'secret'] })` (from
    `jsr:@supabase/server@^1`) accept **only** the new
    `sb_publishable_`/`sb_secret_` format — a valid legacy JWT is
    silently rejected with a 401 "no credential matched." `.env.local`
    currently holds the legacy JWT, which is fine for the app itself;
    don't assume it'll work for a new edge-function auth check.
  - `net.http_post` calls to an edge function need **both** the
    `apikey` and `Authorization: Bearer` headers set to a valid key —
    a request with only one correct and one placeholder/garbage
    value produces intermittent, non-deterministic 401s rather than
    a clean, consistent failure. If cron results flap between 200
    and 401 with no code change, check both headers before assuming
    anything else is wrong.
  - Deploying an Edge Function via the Supabase Dashboard's "Via
    Editor" flow pre-fills a random function name (e.g.
    `clever-processor`) — it's easy to deploy correct code under the
    wrong name and get silent 404s from anything that calls it by
    its intended name. Always check the name field before deploying.
  - No "Cron Jobs" UI was found under this project's Database
    section; scheduling was done directly via `pg_cron`/`pg_net` SQL
    (`cron.schedule(...)` calling `net.http_post(...)`) instead —
    reliable and worth defaulting to next time rather than hunting
    for a dashboard section that may not exist in this project's
    Supabase version.
