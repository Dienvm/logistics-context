---
paths:
  - "43logistics.vn/**/*.tsx"
---

# Component patterns

Server Components by default, small client islands, and tokens only. Context: `docs/context/04-design-system.md`, `AGENTS.md` rules 3–4 and 8–11.

## Server vs client

- **Default is a Server Component.** Add `"use client"` only when the component needs state, effects, browser APIs or event handlers.
- **Push `"use client"` to the leaves.** Keep the page and section shells server-rendered, and make only the interactive part a client island (e.g. `QuoteCalculatorForm`, not the whole route page).
- Pass server data to islands as **serialisable props**. Never import `@/modules/*/index.ts` (server API) or `db/` from a client file; use `@/modules/<m>/client`.
- Server Components may pass Server Actions to client components as props.
- No Clerk, TanStack Query or `motion` on public pages unless a measured island needs it (rule 8).

## Where components live

| Kind | Location |
| --- | --- |
| shadcn/Radix primitives (Button, Dialog…) | `shared/ui/` (no data fetching, no business words) |
| Business UI (RateTable, RouteCard, LeadForm) | `modules/<m>/ui/` |
| Site chrome (Header, Footer, MobileActionBar) | `modules/content/ui/layout/` |
| Page composition | `app/**/page.tsx` (thin, see `module-structure.md`) |

One component per file; the file name matches the component in kebab-case (`rate-table.tsx` → `RateTable`).

## Props and composition

- Type props with a named `type XProps = {...}` next to the component; no `React.FC`.
- Prefer composition (`children`, slots) over boolean prop explosions (`isLarge`, `isCompact`, `isRed`). Use variants via `cva` for visual options.
- Each component does one thing. If it fetches and renders and handles events, split it: a server wrapper fetches, and a presentational child renders.
- Lists: a stable `key` from data, never the array index for reorderable data.

## Styling, images, motion

- Tailwind classes using **design tokens only** (`bg-crimson-600`, `text-ink-900`, `rounded-lg`). No hex values or arbitrary values (`[#AC0C2E]`, `[13px]`). Tailwind v4 `@theme` arrives in F-02; until then use the existing config, and add no new ad-hoc colours.
- No text inside images (rule 3). `next/image` with `sizes`, and `priority` only on the LCP image.
- Motion: CSS first; animate `transform`/`opacity` only; never animate the LCP element; respect `prefers-reduced-motion` (CSS + `useReducedMotion` in `motion` islands).
- No carousel above the fold, no Maps iframe in the layout.

## Accessibility and Vietnamese typography

- Semantic HTML first (`button`, `nav`, `table`). Keep Radix ARIA when restyling.
- Visible focus ring, tap targets ≥ 44 px, labels on every input, colour pairs from the approved token table.
- Body line-height ≥ 1.6, no `uppercase` on buttons/menus, fonts with the `vietnamese` subset.
- All visible strings come from `messages/*` (`useTranslations`/`getTranslations`) or DB content, never literals (after F-03).
