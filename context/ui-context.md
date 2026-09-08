# UI Context

## Theme

Dark only, no light mode. The design language is a dense trading
terminal / research console — near-black backgrounds, layered panel
surfaces with subtle gradients, hairline borders, and a single
saturated green as the "live / positive / primary" accent against an
otherwise muted, low-saturation palette. Numeric and code-like values
are set in monospace throughout to reinforce a data-instrument feel;
prose and labels use a humanist sans.

## Colors

Defined as CSS custom properties in `app/globals.css`. All new UI
must use these tokens — no hardcoded hex values.

| Role                     | CSS Variable  | Value     |
| ------------------------ | ------------- | --------- |
| Page background          | `--bg`        | `#070a0f` |
| Panel surface            | `--panel`     | `#0d131b` |
| Panel surface (alt)      | `--panel-2`   | `#111923` |
| Border                   | `--line`      | `#1d2733` |
| Border (soft/inner)      | `--line-soft` | `#17202a` |
| Muted text               | `--muted`     | `#748196` |
| Primary text             | `--text`      | `#e9eff5` |
| Primary accent (live/positive) | `--green` | `#55e6a5` |
| Accent, dark fill        | `--green-dark`| `#143329` |
| Secondary accent (info)  | `--cyan`      | `#61d9ec` |
| Negative / danger        | `--red`       | `#ff6f7d` |
| Warning / caution        | `--amber`     | `#f4ca69` |

The Jupiter swap plugin is themed to match via its own
`--jupiter-plugin-*` variables (primary, background, primaryText,
warning, interactive, module), kept in sync with the tokens above —
update both together if the palette changes.

Status colors are consistent everywhere they appear (risk levels,
momentum states, outcome states, calibration states, alert dots):
green = healthy/positive/live, amber = caution/collecting/unknown,
red = danger/negative, cyan = neutral/secondary-live. Don't introduce
a new hue for a new status type — map it onto this existing scale.

## Typography

| Role                              | Font                                             | Notes |
| ---------------------------------- | ------------------------------------------------- | ----- |
| UI text, headings, body copy       | `Inter, ui-sans-serif, -apple-system, ...` (system stack, no variable defined) | Set globally on `body` in `app/globals.css`. |
| Numeric values, data cells, code-like labels | `ui-monospace, SFMono-Regular, Menlo, monospace` | Used for scores, prices, table cells, badges, eyebrows/kickers. |

No font-loading step exists yet (no `next/font`, no Google Fonts
import) — `Inter` currently falls back to whatever the OS provides
if the actual Inter font isn't installed. If brand-accurate
typography matters, this is an open gap, not a deliberate choice.

Small uppercase monospace labels with wide letter-spacing (`.eyebrow`,
`.panel-kicker`, `.nav-label`) are the standard way to label a
section or panel — prefer this over a bold heading for secondary
context.

## Border Radius

| Context                          | Typical value        |
| --------------------------------- | --------------------- |
| Inline controls, small UI, chips  | `5px`–`7px`            |
| Cards / panels                    | `9px`–`12px`           |
| Status pills / badges (risk level, momentum state, outcome state) | `999px` (fully rounded) |

## Component Library

None. Tailwind v4 is installed (via `@tailwindcss/postcss`) but is
**not** used for utility classes in JSX — all styling is hand-authored
global CSS in `app/globals.css`, organized by feature area with
semantic, component-scoped class names (e.g. `.metric-card`,
`.token-cell`, `.risk-evidence`, `.backtest-bands`). New UI should
extend this file following the same naming convention rather than
introducing Tailwind utilities or a component library (shadcn/ui,
etc.) — mixing two styling systems would fragment the current
consistent look. See `code-standards.md` for the enforcement rule.

## Layout Patterns

- **App shell:** fixed 220px sidebar + fluid workspace
  (`.app-shell` = CSS grid). Sidebar collapses to an icon-only
  ~76px rail under 940px, then becomes a fixed bottom tab bar under
  640px (`AppShell.tsx` + the matching media queries in
  `globals.css`).
- **Sticky chrome:** both the sidebar and the topbar are `position:
  sticky` with a translucent, blurred background (`backdrop-filter:
  blur(...)`) so content scrolls under them.
- **Panels:** bordered cards with a subtle diagonal gradient
  background (`.panel`, `linear-gradient(145deg, ...)`), a
  `.panel-head` row (kicker + title + actions), and content below.
  This is the default container for any grouped content — dashboards
  are built almost entirely out of panels.
- **Stat grid (canonical repeated pattern):** a CSS grid of equal
  columns, 1px hairline gaps filled with `var(--line)` so each cell
  reads as divided from its neighbors, used for any "several related
  numbers side by side" panel — see `.advanced-momentum-grid`,
  `.relative-rank-grid`, `.outcome-milestones`,
  `.risk-summary-grid`, `.calibration-grid`. Reuse this for new
  metric panels (e.g. a future Thesis Engine or Position Guardian
  panel) instead of a bespoke layout.
- **Dense data tables:** monospace cells, sticky-scroll wrapper
  (`.table-wrap`), hover row highlight, minimum widths that force
  horizontal scroll on narrow viewports rather than wrapping.
- **Status badges/pills:** consistent shape (`border-radius: 999px`
  or small `border-radius` chip) + color mapped to the shared status
  scale — used for risk level, momentum state, outcome status,
  calibration readiness, delivery status.

## Icons

No icon library (no lucide-react, no icon font). Navigation icons
are plain Unicode glyph characters set directly in JSX (`⌁ ✦ ↗ ⌬ ◎`
in `AppShell.tsx`'s `navigation` array). Status indicators are small
styled `<i>`/`<span>` elements rendered as colored dots or bars
(`.live-dot`, `.signal-dot`, `.risk i`), not icon glyphs. Keep this
convention — the visual language reads as terminal-native rather
than icon-illustrated; introducing an icon library would be a
visible, deliberate departure, not a drop-in addition.
