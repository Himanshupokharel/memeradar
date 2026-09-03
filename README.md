# MemeRadar V1

MemeRadar is a dark, responsive research dashboard for exploring early Solana token activity. It now connects to DEX Screener for live Solana market candidates without requiring an API key. If that service is temporarily unavailable, the app clearly switches to realistic fallback data instead of breaking.

The MemeRadar score is an informational signal. It is not financial advice, a return prediction, or an instruction to buy or sell. This project deliberately contains no auto-trading.

## What is already built

- Dashboard with live market summaries, source status, a signal feed, and a clear score explanation
- New Tokens screen with search, score, liquidity, age, and sorting filters
- Pre-Trending screen with a transparent qualification path
- Token Detail pages with metrics, activity, score breakdowns, and risk flags
- Alerts screen where you can create, switch, and delete rules during the current browser session
- Responsive layouts for desktop, tablet, and mobile
- Live price, liquidity, volume, transaction, price-change, valuation, and pair-age data from DEX Screener
- A 30-second server cache that reduces external requests
- A provider boundary and fallback mode ready for Helius and Supabase

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

## A beginner’s map of the folders

```text
MemeRadar/
├── app/                         The screens and global visual styling
│   ├── page.tsx                 Dashboard (/)
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
│   └── providers/               DEX Screener, fallback, and provider contract
├── public/                      Files the browser can load directly
└── .env.example                 Names of future secret settings (no real keys)
```

### Why this structure matters

The interface reads one consistent `Token` shape. `dexscreener-provider.ts` discovers current Solana candidates, fetches their market pairs, translates the response into that shape, and calculates a comparative MemeRadar score. If a request fails, `mock-provider.ts` supplies fallback tokens. The screens do not need to know which provider produced the shape.

```text
DEX Screener → normalize + score ──┐
                                   ├→ Token shape → every screen
API unavailable → mock fallback ───┘
                         ↓ next
              Helius + Supabase history
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

The app now receives pair discovery, prices, liquidity, volume, transactions, price changes, valuation, and pair age from DEX Screener. Read `lib/providers/dexscreener-provider.ts` from top to bottom. Notice that outside responses are normalized inside the provider rather than inside a visual component.

The “New Tokens” screen currently means the newest pairs in MemeRadar’s candidate feed. Candidate discovery combines DEX Screener’s latest token profiles and active boosts; it is not a complete feed of every new Solana pool. This limitation is shown in the interface.

### Step 4 — Add Helius checks

Learn:

- Environment variables (safe places for API keys)
- Solana mint accounts, token holders, and parsed transactions
- Caching and rate limits

Helius should enrich a token with on-chain checks. It complements market data; it does not replace it.

### Step 5 — Save history and alerts with Supabase

Learn:

- Tables, rows, and basic SQL
- Database migrations
- Authentication and access rules
- Scheduled background jobs

Store token snapshots and alert rules in Supabase. Historical snapshots let you test whether early signals were useful instead of judging the score by anecdotes.

## Lowest-cost development path

1. Use the current public DEX Screener connection and 30-second cache while validating the product.
2. Keep fallback data so provider downtime never creates a blank dashboard.
3. Start with Helius’s available entry tier and monitor usage.
4. Use Supabase’s entry tier once data history and background alerts are genuinely needed.
5. Pay for higher limits only after real users repeatedly hit a measured limit.

Pricing and API limits can change, so check each provider’s current official documentation before choosing a plan.

## How the score works in V1

`lib/scoring.ts` combines four 0–100 inputs:

- Momentum: 30%
- Liquidity: 25%
- Participation: 25%
- Safety: 20%

This is intentionally understandable. Momentum, liquidity, and participation now use live DEX Screener fields. Safety currently uses only pair age, liquidity depth, and the liquidity-to-valuation ratio. Mint authority and holder concentration remain marked “pending” until Helius is added. The score should be backtested against stored historical snapshots before anyone treats it as useful evidence.

The small momentum bars are an illustrative shape derived from the current five-minute price change and trade intensity. DEX Screener’s current pair response does not supply tick-by-tick history through the endpoints used here, so the interface labels this honestly.

## Useful commands

```bash
npm run dev      # run the local app while editing
npm run build    # verify that a production version can be created
npm run lint     # check common code-quality problems
```

## Recommended next milestone

Add Helius for mint authority, freeze authority, holder concentration, and wallet-activity checks. Then add Supabase snapshots so scores can be backtested and alert rules can run while the user is offline. Non-custodial Jupiter swaps and wallet signing should come only after those research and reliability layers are stable.
