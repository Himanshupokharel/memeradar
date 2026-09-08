# AI Workflow Rules

> First draft, inferred from this project's existing patterns
> (README's delivery cadence, project-overview.md's scope
> discipline) rather than dictated directly. Revise anything here
> that doesn't match how you actually want AI-assisted work to
> proceed on this repo.

## Development Workflow

- Read the context files in the order CLAUDE.md specifies —
  `project-overview.md` → `architecture.md` → `ui-context.md` →
  `code-standards.md` → `ai-workflow-rules.md` →
  `progress-tracker.md` — before any implementation work or
  architectural decision.
- Build one phase of `project-overview.md`'s roadmap at a time, in
  the order it lists them (CURRENT DEVELOPMENT SCOPE, then AFTER
  PROOF OF EDGE, then real-money testing). Don't start a later-phase
  feature (Wallet Intelligence, Smart Money, AI Research Engine,
  direct non-custodial execution) while an earlier one is
  incomplete.
- Treat `project-overview.md`'s OUT OF SCOPE FOR NOW list as a hard
  boundary, not a suggestion. If a request would build toward one of
  those items (custodial wallets, paid subscriptions, multi-chain,
  a public launch before trading edge is validated), say so
  explicitly rather than quietly implementing a piece of it.

## Scoping Rules

- A feature is "done" only when it satisfies the specific Success
  Criteria in `project-overview.md` it supports — e.g. a Buy Signal
  isn't complete without a timestamp, entry conditions, confidence,
  and explicit invalidation conditions, since that's the Thesis
  Engine's stated minimum bar.
- New scoring/signal logic is added as a pure function (the
  `lib/scoring.ts` / `lib/risk-model.ts` pattern), so it runs
  identically in live scoring, backtesting, and paper trading.
  Never write a signal rule that only works against the live
  in-memory feed.
- Any new signal or decision output is persisted immutably before
  it's shown to a user (the Signal Ledger invariant in
  `architecture.md`). A UI-only "signal" that disappears on refresh
  isn't acceptable even for an early version.
- When a request is ambiguous against the vision in
  `project-overview.md` (which phase it belongs to, whether it
  belongs in scope at all), ask rather than guessing — the scope
  boundaries in that document are deliberate, not incidental.

## Delivery Approach

- Ship narrow, complete vertical slices — the README's "Step N —
  complete" pattern — rather than partial cross-cutting features.
  Risk V1 shipped evidence + confidence + caching together, not
  evidence first and confidence in a later pass; new work should
  follow the same shape.
- Every new automated or statistical claim (score, risk level,
  percentile, signal, confidence) states its own uncertainty rather
  than presenting a guess as fact — follow the existing `'unknown'`
  / `'collecting'` state pattern instead of defaulting to a neutral
  or passing value when data is missing.
- Update `context/progress-tracker.md` after every meaningful
  change: what moved from Next Up to Completed, any new Open
  Question, any Architecture Decision made along the way.
- If an implementation choice changes the target structure, storage
  model, or an invariant documented in `architecture.md`, update
  that file in the same change — don't let the docs drift from the
  code the way they had before this file existed.
