# Code Standards

## General

- Keep decision logic (scoring, risk, momentum, percentiles, future
  signal/thesis logic) in small, pure, side-effect-free functions —
  see `lib/scoring.ts` and `lib/risk-model.ts`. If it doesn't need
  `fetch`, `Date.now()`, or a database call, it shouldn't have one.
- Fix root causes, not workarounds. If a fallback path is added
  (e.g. `mockTokenProvider`), it must be a fully real, labeled
  fallback — never a silent stub that hides a broken dependency.
- Every automated claim (score, risk level, percentile, confidence)
  must expose its own uncertainty rather than presenting a guess as
  fact. Follow the existing pattern of explicit `'unknown'` states
  in `risk-model.ts` and `'collecting'` states in
  `advanced-momentum.ts` / backtesting — never default an unknown to
  a passing or neutral value.
- Don't mix unrelated concerns in one route or component. API routes
  validate → fetch/mutate → respond; they don't also compute
  scoring or risk logic inline (that's imported from `lib/`).

## TypeScript

- No `any`. Model external/unknown data with narrow local types
  (see the `Pair`, `RpcResult<T>`, `AssetResult` shapes in
  `dexscreener-provider.ts` and `helius.ts`) and convert at the
  boundary with guarded helpers (`safeNumber`, `clamp`) rather than
  trusting the shape.
- Validate unknown external input (DexScreener/Helius responses,
  request bodies, query params) before using it — never pass raw
  external JSON straight into a database write or a score
  calculation.
- Favor discriminated unions and literal string types (`'pass' |
  'warning' | 'danger' | 'unknown'`) over booleans or free-form
  strings for any state that the UI branches on.

## Framework (vinext / App Router conventions)

- `'use client'` only on components that need browser interactivity
  or hooks (state, effects, polling) — see `LiveMarketProvider.tsx`.
  Everything else stays a server component by default.
- Use plain `<a>` tags for navigation, not `next/link`. The hosted
  vinext runtime currently needs a native page load for navigation
  (see the comment in `AppShell.tsx`) — using `next/link` here will
  silently break routing in production even though it works in dev.
  Keep the `eslint-disable-next-line @next/next/no-html-link-for-pages`
  comment wherever this applies.
- API routes declare `export const dynamic = 'force-dynamic'` when
  they must not be statically cached (anything touching Supabase or
  Helius with live state) — this is the existing convention across
  every route in `app/api/*`.
- Route handlers return one response shape per route: a `configured`
  boolean when a dependency (Supabase/Helius) may be absent, plus
  either the payload or a short machine-readable `error` code — never
  a raw thrown error or stack trace in the response body.

## Styling

- Use the CSS custom properties defined in `app/globals.css`
  (`--bg`, `--panel`, `--line`, `--text`, `--green`, `--cyan`,
  `--red`, `--amber`, ...) — no hardcoded hex values in new CSS.
- This project does **not** use Tailwind utility classes in JSX,
  despite Tailwind being installed. Styling is hand-authored global
  CSS with semantic, component-scoped class names (`.metric-card`,
  `.token-cell`, `.risk-evidence`). Follow this existing convention
  for new UI rather than introducing a second styling system —
  see `ui-context.md` for the full component/layout vocabulary.
- Reuse the existing "stat grid" pattern (hairline-divided grid of
  labeled stat blocks — see `.advanced-momentum-grid`,
  `.relative-rank-grid`, `.outcome-milestones`,
  `.risk-summary-grid`) for any new panel that shows several related
  numbers together, instead of inventing a new layout.

## API Routes

- Check `isSupabaseConfigured()` / `isHeliusConfigured()` first and
  return `503` with a `configured: false` (or `error:
  'storage_not_configured'` / `'helius_not_configured'`) body before
  doing any other work.
- Validate all path/query/body input against a strict pattern before
  it touches a query (`MINT_PATTERN`, `UUID_PATTERN`) — this is the
  only guard against malformed input reaching a hand-built PostgREST
  filter string (see the invariant in `architecture.md`).
- Wrap the handler body in try/catch, `console.error` the real
  error server-side, and return a short machine-readable error code
  to the client (`'alert_create_failed'`, `'risk_check_failed'`) —
  never leak the raw error message or stack trace in the response.
- Enforce ownership scope (`owner_scope`) on every read, write, and
  delete against `alert_rules` / `alert_events`, even while the
  product is single-owner — this is what the future multi-user auth
  layer replaces, not adds from scratch.

## Data and Storage

- Every write to Supabase uses `on_conflict` + `prefer:
  'resolution=merge-duplicates'` (or `ignore-duplicates` where
  appropriate) so retries and duplicate deliveries are idempotent —
  never assume a write happens exactly once.
- `token_snapshots` and other append-only history tables are never
  updated or deleted from application code — only inserted into.
  Corrections happen via a new row or a new `labelVersion`, per the
  immutability invariant in `architecture.md`.
- Cache tables (`token_risk_checks`) always carry their own
  freshness check (`checked_at`, a version tag) at the call site —
  never assume a cached row is still valid without checking its age.

## File Organization

- `app/` — routes, pages, and API handlers.
- `components/` — presentation and client-only orchestration
  (`'use client'` components).
- `lib/` — pure logic, types, and the provider abstraction. No
  secrets, no React.
- `lib/server/` — server-only code that reads secret environment
  variables and talks to Supabase/Helius directly.
- `lib/providers/` — the `TokenProvider` contract and its
  implementations (live, mock).
- `supabase/` — SQL schema/migrations and Edge Functions (Deno
  runtime, cannot import from `lib/`).
