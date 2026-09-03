# MemeRadar V1

MemeRadar is a dark, responsive research dashboard for exploring early Solana token activity. V1 uses realistic mock data, so every screen and interaction works immediately without API keys or paid infrastructure.

The MemeRadar score is an informational signal. It is not financial advice, a return prediction, or an instruction to buy or sell. This project deliberately contains no auto-trading.

## What is already built

- Dashboard with market summaries, a signal feed, a pre-trending table, and a clear score explanation
- New Tokens screen with search, score, liquidity, age, and sorting filters
- Pre-Trending screen with a transparent qualification path
- Token Detail pages with metrics, activity, score breakdowns, and risk flags
- Alerts screen where you can create, switch, and delete rules during the current browser session
- Responsive layouts for desktop, tablet, and mobile
- A provider boundary that lets live services replace mock data without rebuilding the interface

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
│   ├── mock-data.ts             All fictional V1 token and alert data
│   ├── types.ts                 The exact shape data must have
│   ├── scoring.ts               Understandable score formula
│   └── providers/               The replaceable data-source layer
├── public/                      Files the browser can load directly
└── .env.example                 Names of future secret settings (no real keys)
```

### Why this structure matters

The interface reads one consistent `Token` shape. Today, `mock-provider.ts` returns local mock tokens. Later, a live provider will fetch DEX Screener and Helius data, translate it into that same shape, and return it. The table, filters, dashboards, and detail screen do not need to know where the data came from.

```text
Today:   mock-data → mock provider ─┐
                                   ├→ Token shape → every screen
Later:   DEX Screener + Helius ────┘
                         ↓
                  Supabase history
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

### Step 3 — Connect DEX Screener

Learn:

- What an API is
- `fetch`, JSON, request limits, and error handling
- Server-side versus browser-side code

DEX Screener can provide pair discovery, prices, liquidity, volume, transactions, and pair age. Normalize its response inside `lib/providers/`; never reshape data inside a visual component.

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

1. Keep using the included mock data while refining the product.
2. Add public DEX Screener endpoints with caching before buying a plan.
3. Start with Helius’s available entry tier and monitor usage.
4. Use Supabase’s entry tier once data history is genuinely needed.
5. Pay for higher limits only after real users repeatedly hit a measured limit.

Pricing and API limits can change, so check each provider’s current official documentation before choosing a plan.

## How the score works in V1

`lib/scoring.ts` combines four 0–100 inputs:

- Momentum: 30%
- Liquidity: 25%
- Participation: 25%
- Safety: 20%

This is intentionally understandable. Before using live data, define each input precisely and backtest it against stored historical snapshots. A score should remain explainable and should never be presented as certainty.

## Useful commands

```bash
npm run dev      # run the local app while editing
npm run build    # verify that a production version can be created
npm run lint     # check common code-quality problems
```

## Recommended next milestone

Keep V1 on mock data long enough to decide whether the screens answer the right questions. Then connect only DEX Screener, preserve raw responses for debugging, and show a visible “data delayed” state when the provider is unavailable. Add Helius and Supabase after that foundation is stable.
