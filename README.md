# MemeRadar V2

MemeRadar is a dark, responsive research dashboard for exploring early Solana token activity. It combines fast DEX Screener market data, Helius on-chain checks, and Supabase history and alert storage. If a live market request fails, the app clearly switches to realistic fallback data instead of breaking.

The MemeRadar score is an informational signal. It is not financial advice, a return prediction, or an instruction to buy or sell. This project deliberately contains no auto-trading.

## What is already built

- Dashboard with live market summaries, source status, a signal feed, and a clear score explanation
- New Tokens screen with search, score, liquidity, age, and sorting filters
- Pre-Trending screen with a transparent qualification path
- Token Detail pages with saved price history, score breakdowns, market risks, and cached Helius checks
- Persistent Alerts screen where you can create, pause, and delete rules saved in Supabase
- Alert Inbox with unread counts, automatic refresh, token links, and read controls
- Responsive layouts for desktop, tablet, and mobile
- Live price, liquidity, volume, transaction, price-change, valuation, and pair-age data from DEX Screener
- Hybrid discovery: five DEX Screener channels plus authenticated Helius `CREATE_POOL` events for verified Raydium and Pump AMM programs
- Candidate discovery refreshed every 15 seconds, with market metrics rotating every 3 seconds while the app is visible
- Token artwork from the same DEX Screener records, with a generated letter fallback when no artwork is supplied
- Minute-by-minute market snapshots saved by a 24/7 Supabase background worker
- Alert matching against each saved minute snapshot, with match counts and a 15-minute repeat guard
- Helius checks for mint authority, freeze authority, metadata mutability, and top token-account concentration
- Backtesting screen with 15-minute, 1-hour, 6-hour, and 24-hour historical outcome windows
- Score-band comparisons, completed-sample counts, median changes, and peak observations
- Permanent outcome labels with 2×–100× milestones, drawdown, lifecycle heuristics, and 1h/6h/24h/7d checkpoints
- Adaptive follow-up recording: newest tokens every minute, then lower-frequency checks as each token ages
- Non-custodial buy/sell workspace powered by Jupiter, with Wallet Standard connection and approval inside the user’s wallet

## Run it on your computer

You need **Node.js 22.13 or newer**. Node.js is the program that runs the development tools; you do not need to understand its internals yet.

1. Open Terminal on your Mac.
2. Go to this project:

   ```bash
   cd ~/Documents/MemeRadar
   ```

3. Install the project’s packages (first time only):

   ```bash
   npm install
   ```

4. Start the local app:

   ```bash
   npm run dev
   ```

5. Open the address printed in Terminal, normally [http://localhost:3000](http://localhost:3000).

Stop the app by returning to Terminal and pressing `Control + C`.

### Connect the live services locally

Copy `.env.example` to a new file named `.env.local`, then fill in your own values. Do not paste secret keys into any file that will be committed to Git.

```text
HELIUS_API_KEY=your_existing_helius_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your_existing_supabase_server_secret
```

`SUPABASE_SECRET_KEY` and `HELIUS_API_KEY` are server-only. Never rename them with a `NEXT_PUBLIC_` prefix because that prefix is intended for values that may be sent to the browser. Production uses the hosting platform’s encrypted environment settings rather than a committed file.

## A beginner’s map of the folders

```text
MemeRadar/
├── app/                         The screens and global visual styling
│   ├── page.tsx                 Dashboard (/)
│   ├── api/                     Private server endpoints for history, risks, and alerts
│   ├── new-tokens/page.tsx      New Tokens (/new-tokens)
│   ├── pre-trending/page.tsx    Pre-Trending (/pre-trending)
│   ├── alerts/page.tsx          Alerts (/alerts)
│   ├── backtesting/page.tsx     Historical Backtesting (/backtesting)
│   ├── trade/[mint]/page.tsx    Wallet-confirmed Jupiter swap workspace
│   └── token/[slug]/page.tsx    Any Token Detail page
├── components/                  Reusable interface pieces
│   ├── AppShell.tsx             Sidebar, top bar, and page frame
│   ├── TokenTable.tsx           Searchable/filterable token table
│   ├── TokenPrimitives.tsx      Scores, money, age, risks, pressure, charts
│   ├── AlertsManager.tsx        Interactive alert-rule builder
│   └── AlertInbox.tsx           Saved matches and read/unread controls
├── lib/
│   ├── mock-data.ts             Fallback token and sample alert data
│   ├── types.ts                 The exact shape data must have
│   ├── scoring.ts               Understandable score formula
│   ├── providers/               DEX Screener, fallback, and provider contract
│   └── server/                  Helius and Supabase connections (server only)
├── supabase/schema.sql          Rebuildable database structure
├── supabase/helius-discovery.sql  Migration for on-chain candidates
├── supabase/outcome-labeling.sql  Permanent outcome labels and checkpoint logic
├── supabase/functions/          24/7 scanner and authenticated webhook receiver
├── public/                      Files the browser can load directly
└── .env.example                 Names of future secret settings (no real keys)
```

### Why this structure matters

The interface reads one consistent `Token` shape. In the current owner-only release, Helius pushes new Raydium and Pump AMM pool events into a private Supabase candidate queue. `LiveMarketProvider.tsx` combines that queue with five DEX Screener discovery channels every 15 seconds and rotates market updates through the result every three seconds. A Supabase Edge Function independently repeats the expanded discovery every minute, saves history, and evaluates alerts even when every browser is closed. A Token Detail page asks a private endpoint for a cached Helius risk report. Real secret keys never enter browser code.

```text
Helius CREATE_POOL webhook → private candidate queue ┐
DEX Screener discovery channels ─────────────────────┼→ 3-second market rotation → every screen
                                                     └→ 24/7 worker → history + alert matching
Token Detail page → Helius risk endpoint → cached on-chain check

If DEX Screener is unavailable → clearly labeled mock fallback
```

## What to learn, and when

You do not need to study everything before continuing. Learn only what the next phase requires.

### Step 1 — Change the interface

Learn these first:

- **HTML/React components:** a component is a reusable piece of a screen.
- **CSS:** controls colors, spacing, layout, and responsive behavior.
- **Props:** information passed into a component, such as a token’s score.

Good first exercises: change a heading in `app/page.tsx`, adjust the green color in `app/globals.css`, then add one fictional token in `lib/mock-data.ts`.

### Step 2 — Understand TypeScript data

Learn:

- Objects and arrays
- TypeScript types
- `map`, `filter`, and `sort`

Look at `lib/types.ts`, then compare it with one entry in `lib/mock-data.ts`. The type is the promise; the mock object fulfills that promise.

### Step 3 — Understand the DEX Screener connection (complete)

Learn:

- What an API is
- `fetch`, JSON, request limits, and error handling
- Server-side versus browser-side code

The app now receives pair discovery, prices, liquidity, volume, transactions, price changes, valuation, pair age, and available token artwork from DEX Screener. Read `lib/providers/dexscreener-provider.ts` from top to bottom. Notice that outside responses are normalized inside the provider rather than inside a visual component. Discovery combines latest profiles, community takeovers, ads, latest boosts, and top boosts. The browser refreshes that five-channel candidate pool every 15 seconds, then rotates 30-address market batches every three seconds so larger pools stay fresh without exceeding the documented limits. `components/AutoRefresh.tsx` displays that market-update state.

This aggressive polling is suitable for the current owner-only release and remains under the documented limits for one active user. Before sharing the site with many concurrent users, move polling into a shared scheduled cache so visitor count does not multiply requests.

The “New Tokens” screen means the newest pairs in MemeRadar’s hybrid candidate feed. The discovery coverage panel shows how many candidates each source contributed and how long one full market rotation takes. Helius adds near-real-time pool creation events for the verified Pump AMM, Raydium CPMM, Raydium CLMM, and legacy Raydium AMM v4 programs. DEX Screener then supplies usable market data and artwork as soon as it indexes each pair. This is broader and faster, but it is not a guarantee that every Solana venue or every pool will be indexed.

### Step 4 — Understand Helius checks (complete)

Learn:

- Environment variables (safe places for API keys)
- Solana mint accounts, token holders, and parsed transactions
- Caching and rate limits

Helius enriches each live token detail page with Solana mint-account checks. The result is cached for ten minutes to protect the free allowance. “Top accounts” means token accounts, not necessarily ten individual people; pool and exchange accounts may appear.

### Step 5 — Understand Supabase history and alerts (complete)

Learn:

- Tables, rows, and basic SQL
- Database migrations
- Authentication and access rules
- Scheduled background jobs

The app stores one snapshot per token per minute, persistent alert rules, matches, cached risk checks, and ingestion records. Historical snapshots let you test whether early signals were useful instead of judging the score by anecdotes.

### Step 6 — Add true background evaluation (complete)

Learn scheduled jobs and function logs. Supabase Cron invokes `memeradar-alert-worker` once per minute. The worker uses the same discovery and scoring logic as the interface, saves snapshots, evaluates enabled rules, and records every run. It has a 40-second duplicate guard and each alert rule has a 15-minute repeat guard.

### Step 7 — Understand backtesting (complete)

Learn:

- First observations, outcome windows, and completed samples
- Median versus average
- Sample size, selection bias, and missing data

The Backtesting screen gives every discovered token one entry point: its first positive-price snapshot saved by MemeRadar. It then measures the first available price near the selected outcome window and the peak saved price inside that window. Recent tokens remain labeled “collecting” until enough time has passed and a valid later snapshot exists.

This is a basic historical validation tool, not a trading simulation. It does not model fees, slippage, token taxes, failed transactions, or whether enough liquidity existed for a particular trade size. A score band with only a few completed samples is not reliable evidence.

The database function used by the report lives in `supabase/backtest.sql`. It is restricted to the private server connection, so browser visitors cannot call it directly.

### Step 8 — Use the Alert Inbox (complete)

Every rule match is now visible in MemeRadar with the matching token, score, liquidity, age, time, and a direct analysis link. The inbox refreshes every 15 seconds and the top-bar badge displays unread matches. Read state is stored in Supabase, so it follows the private account rather than one browser.

### Step 9 — Understand real-time pool discovery (complete)

Learn:

- A webhook is a secure message one service pushes to another when an event happens.
- A program address identifies the on-chain application that created the pool.
- Idempotency means the same delivery can safely arrive twice without creating duplicate records.

The Helius webhook listens only for `CREATE_POOL` on verified Raydium and Pump AMM program addresses. It sends an authentication header that the Supabase receiver checks before accepting data. Candidate mints are deduplicated in `discovery_candidates`, then enriched by DEX Screener. Helius notes that webhook configuration changes can take up to two minutes and each delivered event uses credits, so check the Helius usage screen occasionally.

### Step 10 — Connect Telegram delivery (complete)

The background worker sends new alert-rule matches to the private MemeRadar Alerts Telegram bot. `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are stored as encrypted Supabase Edge Function secrets, never in the source code or browser bundle. A complete rule → worker → Telegram delivery test was completed successfully. The 15-minute per-rule repeat guard still prevents noisy duplicate notifications. Email or phone delivery can be considered later.

### Step 11 — Understand wallet-confirmed swaps (complete)

Learn:

- A wallet connection shares a public address, not the seed phrase or private key.
- A quote estimates the output, route, price impact, and fees before approval.
- A signature is the wallet owner’s approval for one exact transaction.

Live token pages link to a dedicated buy/sell workspace. Jupiter provides the embedded wallet connection, route, quote, and swap execution. The selected token is locked on one side of the form to reduce address mistakes, but the user must still verify the mint and amounts. MemeRadar adds no trading fee, cannot approve a transaction, and cannot access wallet secrets. Every swap is optional and separate from the MemeRadar score.

### Step 12 — Build permanent outcome labels (complete)

Learn:

- A label records what happened after the first observation without claiming why it happened.
- A checkpoint compares tokens at consistent ages such as 1 hour, 6 hours, 24 hours, and 7 days.
- A lifecycle status is a rule-based heuristic, not a factual accusation about a project.

`supabase/outcome-labeling.sql` creates one durable outcome record per token. It stores discovery, latest, peak, and trough measurements; maximum upside and drawdown; 2× through 100× milestones; time to the first milestones; and fixed-age checkpoints. The database refreshes a token’s label whenever a new snapshot arrives.

The recorder now revisits tokens adaptively: every minute while they are under one hour old, every five minutes through six hours, every fifteen minutes through twenty-four hours, and hourly through seven days. Tokens already classified by the heuristic as dead or rugged are excluded from older follow-up cohorts. This keeps the most important early period detailed without wasting the free service allowance indefinitely.

### Step 13 — Calibrate the score with evidence (active)

The Backtesting screen now compares first observations across 15-minute, 1-hour, 6-hour, and 24-hour windows. It automatically groups scores of 70+ against the below-60 baseline, reports differences in median peak and +20% hit rate, and labels each window as collecting, early, or established. Both comparison groups need 30 completed observations before an early read and 100 each before the product calls the sample established. These are cautious product guardrails, not statistical proof or return predictions.

The next scoring upgrade is advanced momentum: acceleration across several observations, volume expansion, participation growth, and liquidity change. Those inputs should be added only after enough checkpoint labels exist to test whether they improve separation from the baseline.

## Lowest-cost development path

1. Use the current public DEX Screener connection, 15-second candidate discovery, and 3-second market rotation while validating the private product.
2. Keep fallback data so provider downtime never creates a blank dashboard.
3. Start with Helius’s available entry tier and monitor usage.
4. Use Supabase’s entry tier once data history and background alerts are genuinely needed.
5. Pay for higher limits only after real users repeatedly hit a measured limit.

Pricing and API limits can change, so check each provider’s current official documentation before choosing a plan.

## How the score works in V2

`lib/scoring.ts` combines four 0–100 inputs:

- Momentum: 30%
- Liquidity: 25%
- Participation: 25%
- Safety: 20%

This is intentionally understandable. Momentum, liquidity, participation, and the score’s safety component use live DEX Screener fields. Helius risk checks appear separately so users can distinguish market-derived scoring from on-chain facts. The new Backtesting screen begins that validation, but its results should still be treated cautiously until each score band has a much larger completed sample.

The small momentum bars are an illustrative shape derived from the current five-minute price change and trade intensity. DEX Screener’s current pair response does not supply tick-by-tick history through the endpoints used here, so the interface labels this honestly.

## Useful commands

```bash
npm run dev      # run the local app while editing
npm run build    # verify that a production version can be created
npm run lint     # check common code-quality problems
```

## Recommended next milestone

Let the 24/7 worker collect enough completed samples across the hybrid discovery set and watch Helius credit use. Telegram delivery is connected. Before sharing the product with other people, add a legal review, clearer regional eligibility language, privacy-preserving transaction analytics, and broader wallet/device testing. MemeRadar should never hold a user’s seed phrase or private key.
