# MemeRadar V2

MemeRadar is a dark, responsive research dashboard for exploring early Solana token activity. It combines fast DEX Screener market data, Helius on-chain checks, and Supabase history and alert storage. If a live market request fails, the app clearly switches to realistic fallback data instead of breaking.

The MemeRadar score is an informational signal. It is not financial advice, a return prediction, or an instruction to buy or sell. This project deliberately contains no auto-trading.

## What is already built

- Dashboard with live market summaries, source status, a signal feed, and a clear score explanation
- New Tokens screen with search, score, liquidity, age, and sorting filters
- Pre-Trending screen with a transparent qualification path
- Token Detail pages with saved price history, score breakdowns, market risks, and cached Helius checks
- Persistent Alerts screen where you can create, pause, and delete rules saved in Supabase
- Responsive layouts for desktop, tablet, and mobile
- Live price, liquidity, volume, transaction, price-change, valuation, and pair-age data from DEX Screener
- Automatic 3-second refresh for token discovery and market metrics while the app is visible
- Token artwork from the same DEX Screener records, with a generated letter fallback when no artwork is supplied
- Minute-by-minute market snapshots saved in Supabase while the live dashboard is open
- Alert matching against each saved minute snapshot, with match counts and a 15-minute repeat guard
- Helius checks for mint authority, freeze authority, metadata mutability, and top token-account concentration

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
│   └── token/[slug]/page.tsx    Any Token Detail page
├── components/                  Reusable interface pieces
│   ├── AppShell.tsx             Sidebar, top bar, and page frame
│   ├── TokenTable.tsx           Searchable/filterable token table
│   ├── TokenPrimitives.tsx      Scores, money, age, risks, pressure, charts
│   └── AlertsManager.tsx        Interactive alert-rule builder
├── lib/
│   ├── mock-data.ts             Fallback token and sample alert data
│   ├── types.ts                 The exact shape data must have
│   ├── scoring.ts               Understandable score formula
│   ├── providers/               DEX Screener, fallback, and provider contract
│   └── server/                  Helius and Supabase connections (server only)
├── supabase/schema.sql          Rebuildable database structure
├── public/                      Files the browser can load directly
└── .env.example                 Names of future secret settings (no real keys)
```

### Why this structure matters

The interface reads one consistent `Token` shape. In the current owner-only release, `LiveMarketProvider.tsx` asks DEX Screener directly from the browser every three seconds. It sends one snapshot per minute to MemeRadar’s private server endpoint, which saves it in Supabase and evaluates saved alert rules. A Token Detail page asks another private endpoint for a cached Helius risk report. Real secret keys never enter browser code.

```text
DEX Screener → normalize + score → every screen
       │                    │
       │ every minute       └→ Helius risk endpoint → cached check
       ▼
Supabase snapshots → real chart history + persistent alert matching

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

The app now receives pair discovery, prices, liquidity, volume, transactions, price changes, valuation, pair age, and available token artwork from DEX Screener. Read `lib/providers/dexscreener-provider.ts` from top to bottom. Notice that outside responses are normalized inside the provider rather than inside a visual component. `components/LiveMarketProvider.tsx` refreshes candidates and market metrics directly in the browser every three seconds while the tab is visible; `components/AutoRefresh.tsx` only displays that connection state.

This aggressive polling is suitable for the current owner-only release and remains under the documented limits for one active user. Before sharing the site with many concurrent users, move polling into a shared scheduled cache so visitor count does not multiply requests.

The “New Tokens” screen currently means the newest pairs in MemeRadar’s candidate feed. Candidate discovery combines DEX Screener’s latest token profiles and active boosts; it is not a complete feed of every new Solana pool. This limitation is shown in the interface.

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

### Step 6 — Add true background alert delivery (later)

Learn scheduled jobs and notification delivery. V2 evaluates rules whenever a live browser has MemeRadar open. A later scheduled worker can continue evaluation when every browser is closed and can deliver email or phone notifications.

## Lowest-cost development path

1. Use the current public DEX Screener connection and 3-second live refresh while validating the private product.
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

This is intentionally understandable. Momentum, liquidity, participation, and the score’s safety component use live DEX Screener fields. Helius risk checks appear separately so users can distinguish market-derived scoring from on-chain facts. The score should be backtested against stored historical snapshots before anyone treats it as useful evidence.

The small momentum bars are an illustrative shape derived from the current five-minute price change and trade intensity. DEX Screener’s current pair response does not supply tick-by-tick history through the endpoints used here, so the interface labels this honestly.

## Useful commands

```bash
npm run dev      # run the local app while editing
npm run build    # verify that a production version can be created
npm run lint     # check common code-quality problems
```

## Recommended next milestone

Add an authenticated scheduled worker for alerts that must run while the dashboard is closed, then build a backtesting report from the saved snapshots. Non-custodial swaps and wallet signing should come only after those research and reliability layers are stable; MemeRadar should never hold a user’s seed phrase or private key.
