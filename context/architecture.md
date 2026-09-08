# Architecture Context

This describes the **target end-state architecture** for the full
platform in `project-overview.md`, not only what exists today.
`progress-tracker.md` is the source of truth for what's actually
built vs. remaining — this file defines the structure everything
should grow into, so each new phase (Signal Engine, Position
Guardian, Wallet Intelligence, ...) slots in without a rewrite.

## Stack

| Layer            | Technology                                                        | Role |
| ----------------- | ------------------------------------------------------------------ | ---- |
| Runtime/Framework | `vinext` (Vite) on Cloudflare Workers, using Next.js `app/` conventions | Serves UI and API routes as one edge-deployed Worker. `next.config.ts` is present for tooling compatibility but the real dev/build/runtime path is `vinext` + `@cloudflare/vite-plugin`, not the Next.js CLI. |
| UI                | React 19, hand-authored global CSS (`app/globals.css`)             | Tailwind v4 is installed but not used for utility classes — see `ui-context.md`. |
| Language          | TypeScript                                                          | `lib/types.ts` is the shared contract between UI, API routes, and (duplicated) edge function logic. |
| Primary datastore | Supabase (Postgres + PostgREST), accessed only from server code via the service-role key | System of record for tokens, snapshots, risk checks, alert rules/events, discovery candidates, ingestion runs, outcome labels. |
| Background compute | Supabase Edge Functions (Deno) on Supabase Cron, 1×/minute        | Durable discovery + scoring + snapshotting + alert evaluation that runs whether or not a browser tab is open. |
| Market data       | DexScreener public REST API (no key)                                | Pricing, liquidity, volume, five discovery channels. |
| On-chain data     | Helius RPC + DAS API                                                | Mint/freeze authority, holder concentration, metadata, asset-by-authority lookups. |
| Delivery          | Telegram Bot API (from the edge function)                          | Alert delivery independent of the browser. |
| Execution         | Jupiter Terminal embed + Wallet Standard                            | Non-custodial swap execution; MemeRadar never holds keys, and never constructs, simulates, or submits a transaction itself — see the execution delegation boundary below. |
| Planned: unbounded intelligence data | Not yet chosen — see Storage Model            | Wallet-level transaction history, AI Assistant context, paper-trading fills. Do not default this into the core Postgres tables without a decision (see Open Questions in `progress-tracker.md`). |

## System Boundaries

- **`app/`** — routes and API handlers only. Owns request/response
  shaping and input validation; never contains scoring, risk, or
  signal logic directly (that lives in `lib/`).
- **`components/`** — presentation and client-side polling
  orchestration (`LiveMarketProvider`). Never talks to Supabase or
  Helius directly — always through `/api/*`.
- **`lib/providers/`** — the market-data abstraction boundary
  (`TokenProvider` interface). Every consumer of live token data —
  today's UI, and eventually the Signal Engine — goes through this
  contract instead of calling DexScreener/Helius inline.
- **`lib/scoring.ts`, `lib/risk-model.ts`, `lib/percentiles.ts`,
  `lib/advanced-momentum.ts`** — pure, side-effect-free decision
  logic. This is the boundary the Buy/Sell Signal Engine, Thesis
  Engine, and Position Guardian extend, not replace: a signal is a
  new pure function that reads the same stored snapshot history,
  not a new data path.
- **`lib/server/`** — the only application code allowed to read
  secret environment variables (`HELIUS_API_KEY`,
  `SUPABASE_SECRET_KEY`). Nothing under `components/` or `app/` (as
  client-rendered code) may do this.
- **`supabase/functions/`** — the durable-execution boundary.
  Anything that must keep running with zero open browser tabs
  (discovery, snapshotting, alerting, and eventually Position
  Guardian monitoring and paper-trading fills) belongs here.
- **`supabase/*.sql`** — schema plus DB-side aggregation
  (`backtest.sql`, `outcome-labeling.sql`, `percentile-ranking.sql`).
  This is the boundary for anything that needs to scan large
  historical ranges cheaply, rather than pulling rows into an edge
  function to compute.

### Execution delegation boundary (evaluated against `guide.md`, 2026-09-06)

`context/guide.md` is a blueprint for a *different* business — a
non-custodial HFT brokerage (BullX/Photon-style) that constructs and
submits transactions itself, monetized on swap-fee volume, competing
on execution latency (SWQoS staked connections, Jito MEV bundles,
bare-metal colocation, Yellowstone gRPC streaming). That
infrastructure is **explicitly out of scope** here: MemeRadar
delegates 100% of transaction construction, signing, and submission
to the embedded Jupiter Terminal widget. MemeRadar's own code never
touches a transaction payload. Unless a future decision changes that
delegation model (i.e. MemeRadar builds its own swap-execution UI
instead of embedding Jupiter's), none of SWQoS/Jito/bare-metal/gRPC
belong in this architecture — see Invariant 9.

What `guide.md` *did* validate and contribute: its risk-forensics
techniques (funding-source clustering across top holders to detect
bundled/insider supply, same-block sniper detection, LP lock/burn
verification, OHLCV blow-off-top pattern detection) are concrete
implementations of exactly what `project-overview.md`'s Risk
Intelligence, Wallet Intelligence, and Organic Momentum sections
already call for, and go further than the current Risk V1 evidence
set (`lib/risk-model.ts` covers mint/freeze authority, top-10
token-account concentration, metadata, and creator identity — not
funding-source clustering or sniper-block detection yet). These
belong on the Risk Intelligence roadmap as the concrete next
evidence checks to add, extending the same webhook/streaming pattern
already used for Helius `CREATE_POOL` events rather than adopting
Yellowstone gRPC + ClickHouse, which is sized for tick-level HFT
charting this product doesn't do.

### Known boundary violation (tracked debt)

The pair-normalization and scoring formula currently exists **twice**
— once in `lib/providers/dexscreener-provider.ts` (browser) and once
inline in `supabase/functions/memeradar-alert-worker` (Deno can't
import `lib/`). They have already drifted slightly (symbol
truncation length differs). Target state: either (a) extract the
shared pure functions into a small runtime-agnostic module vendored
into both, or (b) move scoring server-side only and have the browser
render pre-scored data from an API route — option (b) also resolves
the "browser polls DexScreener directly" scaling limitation in the
same move, so it's the preferred direction once the Signal Engine
needs this logic in a third place.

## Storage Model

- Supabase Postgres is the single system of record, now and in the
  target design, for all structured signal/outcome/journal data.
- `token_snapshots` is the append-only time-series backbone. Every
  derived table or computation — percentiles, momentum, outcome
  labels, and future backtesting/walk-forward/paper-trading results
  — is computed from it, never from a second source of truth.
  Enforced by Postgres, not just convention: a `BEFORE UPDATE OR
  DELETE` trigger (`supabase/snapshot-immutability.sql`) blocks
  DELETE unconditionally and UPDATE on any row older than a 10-minute
  grace window — the window exists only to permit the legitimate
  same-cycle `merge-duplicates` upsert both ingestion paths use when
  the browser and the cron worker write the same minute bucket.
  Required directly by `project-overview.md` (Goal 5, Success
  Criteria #2, and the Signal Ledger's immutability rule) — none of
  those claims can be true if the snapshots underneath can be
  silently rewritten.
- Cache tables (`token_risk_checks`) are rebuildable caches of an
  external source, not sources of truth themselves.
- Derived measurement tables (`token_outcomes`, and the percentile/
  momentum fields on `token_snapshots`) are legitimately mutated in
  place as more data arrives — they represent current best knowledge
  about a token's trajectory, not a record of a decision made at a
  point in time. `token_outcomes` is rebuilt by a trigger on every
  qualifying snapshot write. This is distinct from decision/signal
  records, which must never be mutated once written — see Invariant
  4.
- `alert_rules.user_id uuid` already exists, nullable and unused.
  This is the seam multi-user auth threads through later — do not
  repurpose this column for anything else.
- Anything that grows per-wallet × per-token rather than per-token
  (wallet transaction history for Wallet Intelligence/Smart Money,
  AI Assistant conversation context, paper-trading fill logs) needs
  a storage decision before those features ship — it should not
  silently land in the same tables as core token/snapshot data. This
  is an open question, not yet decided (see `progress-tracker.md`).

## Auth and Access Model

- **Today:** single owner. Every `/api/*` route filters by the
  hardcoded string `owner_scope = 'private-site-owner'`; there is no
  session, token, or per-request identity check anywhere. This is
  intentional, not an oversight — the product explicitly excludes
  public launch before trading edge is validated
  (`project-overview.md`, OUT OF SCOPE FOR NOW).
- **Target state (post proof-of-edge, multi-user):** every `/api/*`
  route authenticates a real principal before touching
  `owner_scope`; `alert_rules.user_id` becomes `NOT NULL`; Row Level
  Security (already enabled on every table, currently policy-less
  because the service-role key bypasses it) gets real per-user
  policies instead of relying on the server secret alone.
- Wallet connection (Jupiter/Wallet Standard) is and remains a
  **separate, non-authenticating** concern: it authorizes one
  transaction at a time and never establishes account identity.
  "Wallet connected" is never treated as "user authenticated."

## Invariants

1. Secrets (`HELIUS_API_KEY`, `SUPABASE_SECRET_KEY` /
   `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`) are read only
   inside `lib/server/*.ts` and `supabase/functions/*` — never in
   `components/` or anything shipped to the browser.
2. Background discovery, scoring, and alerting must keep working
   with zero browser tabs open. The edge worker is the source of
   truth for anything durable; browser polling is a UI convenience,
   never the only path that produces a stored fact.
2b. `token_snapshots` immutability is enforced at the database level
   (see Storage Model), not left to application discipline — this is
   the actual foundation Invariant 4's signal-integrity guarantee
   rests on, and doc wording alone cannot substitute for it.
3. Any signal, score, or engine (Buy/Sell Signal, Thesis Engine,
   Position Guardian, Market Regime) is computed from stored
   historical snapshots, never derived only from the live in-memory
   feed — so every decision is reproducible and backtestable after
   the fact.
4. **Decision/signal records are append-only and immutable once
   written** ("signals cannot be retroactively changed to make
   historical performance look better" — `project-overview.md`).
   This applies to what MemeRadar *told a user* — the future Signal
   Ledger, and `alert_events`' substantive fields (title, message,
   payload, triggered_at — only `read_at` is ever patched after
   insert). It does **not** apply to derived measurement tables like
   `token_outcomes`, which is correctly rewritten in place
   (`on conflict ... do update`, refreshed by a trigger on every new
   snapshot) because a token's outcome legitimately isn't final until
   more time has passed — see Storage Model. Note:
   `token_outcomes.label_version` is currently a static tag for the
   labeling *algorithm* version, not a per-change version — don't
   confuse it with the immutable versioning the future Signal Ledger
   needs.
5. MemeRadar never custodies funds or private keys, at any phase.
   Execution is always wallet-signed and non-custodial.
6. No feature reads from DexScreener or Helius directly except
   through `lib/providers/*` (browser) or the edge function's own
   fetch layer (server) — never an inline `fetch()` scattered
   through a UI component.
7. Pure decision logic (scoring, risk, momentum, percentiles, and
   future signal/thesis logic) stays free of I/O, so the same
   function produces the same signal whether it's running against
   historical snapshots in a backtest or the live feed in
   production.
8. No API route or background job mutates a Supabase table without
   validating its input shape first (mint address pattern, UUID
   pattern, numeric clamping) — every write path assembles raw
   PostgREST filter strings, so boundary validation is the only
   thing preventing malformed or hostile input from reaching the
   database.
9. MemeRadar never constructs, simulates, or submits a transaction
   on a user's behalf — execution is always delegated to a
   third-party non-custodial widget (currently Jupiter Terminal).
   Low-latency execution infrastructure (SWQoS, Jito bundles,
   bare-metal colocation, custom compute-budget simulation) is
   therefore out of this architecture's scope unless that delegation
   model changes (see "Execution delegation boundary" above).
