---
title: Build the site layout shell from database data
type: feature
status: draft
owner_repo: both
roadmap: S-01
priority: must-have
blocked_by_questions: [Q-01, Q-02, Q-03, Q-04, Q-05, Q-06, Q-11]
updated: 2026-10-21
---

## Feature: Build the site layout shell from database data

### Problem Statement

Every public page needs the same shell before any page content makes sense (`03` Navigation, `04` Components):
- a **header** with a routes mega menu ("Gửi hàng đi": 7 country cards, each "từ {min price}/kg · {min}–{max} ngày" from the DB), "Nhận hàng về VN", "Tính cước", "Kinh nghiệm" and "Về chúng tôi", plus the language switch and a primary **Chat Zalo** button;
- a **mobile action bar** (Zalo · Gọi · Tính cước) replacing the old floating buttons;
- a **footer** (company, services, policies, contact, social);
- **breadcrumbs** with `BreadcrumbList` JSON-LD.

The site's first goal is turning visitors into contacts, Zalo first (`AGENTS.md` §1), and this shell carries those CTAs on every page.

Roadmap row `docs/context/10-roadmap.md` S-01. *Accept:* 360/768/1280 screenshots; keyboard nav of the mega menu; no CLS from the sticky bar.

Owner decisions (2026-10-21):
1. **Dev preview mode.** Production never shows unverified data (rule 1). Local dev and preview deploys can opt in to show the legacy seed values with a visible "chưa xác nhận" badge, so the owner can review the real layout.
2. **Text wordmark** "43 Logistics" until a vector logo exists (Q-11).
3. **CI builds against a Postgres service** seeded by `db:migrate` + `db:seed`. Locally, `pnpm db:local` starts the same Docker database.
4. Contact buttons **link to `/go/[channel]` now**. They 404 until **S-02**, which comes next.

### Proposed Solution

A visitor on any page sees the 43 Logistics header. On desktop, "Gửi hàng đi" opens a panel of route cards with flag, country, "from" price and transit days. On mobile, a menu button opens a drawer, and a slim bar pinned to the bottom offers Zalo, call and the calculator; it slides away while scrolling down and comes back on scroll up. The footer lists services, policies, contact channels and offices. Unconfirmed numbers never reach production: there, cards say "Liên hệ" and unconfirmed contact lines are left out. In local or preview review mode they appear with a "chưa xác nhận" badge.

### Acceptance Criteria

**Data access** (server-only module queries, rule 5)

- [ ] Given the module entry points, then cached queries exist, each with `"use cache"` + `cacheTag`, taking `locale` as an argument (`06`, F-03), and importing `server-only`:
  - `routes`: `listNavRoutes(locale)` gives active routes (direction, key, country code, name, transit days, `isVerified`, `pricesPublic`), tag `routes`;
  - `pricing`: `getFromPrices()` gives the per-route minimum `price_per_kg_vnd` over bands with `contact_for_price = false`, tag `rates`;
  - `settings`: `getSiteSettings(keys)` gives values plus `isVerified`, tag `settings`;
  - `content`: `getMenu(menu, locale)` gives the menu tree with labels and resolved hrefs (page slug per locale, route page, or external URL), tag `menu`.

  Each lives in `modules/<m>/infrastructure/queries.ts` behind `modules/<m>/index.ts`. DB rows are mapped to minimal domain types before reaching UI (`security-patterns.md`). The UI never imports `@/db`.
- [ ] Given `DATABASE_URL` is unset when a query runs, then it fails loudly with a clear message; there's no silent empty layout.

**Fact visibility** (rule 1, owner decision 1)

- [ ] Given a pure function `factVisibility({ isVerified, env })` (`shared/lib/fact-visibility.ts` or the owning module's domain), then:
  - **verified** → shown;
  - **unverified** → hidden, **unless** preview mode is on, which happens only when `PREVIEW_UNVERIFIED=1` **and** (`NODE_ENV=development` or `VERCEL_ENV=preview`). In that case the value is shown with a "chưa xác nhận" / "unverified" badge.
  - `NODE_ENV=production` without `VERCEL_ENV=preview` **always** hides, whatever the flag. This is checked with `pnpm build && pnpm start` plus the flag: nothing unverified is visible.

  `PREVIEW_UNVERIFIED` is server-only, added to `env.server.ts` and `.env.example`.
- [ ] Given this rule, then it applies to:
  - **route card prices** (hidden → "Liên hệ"): shown only when the route is verified, `pricesPublic` and a from-price exists;
  - **transit days**: shown only when the route is verified;
  - every **site-settings** value used in the shell (phone, Zalo, WhatsApp, Messenger, email, offices, hours, social): its key must be verified, otherwise that line is omitted.
  - The `/go/*` CTA links stay visible either way: S-02 resolves the channel from settings at click time.

**Header**

- [ ] Given any page at ≥ 1024 px, then the header shows:
  - the wordmark (an HTML text link to `/` or `/en/`, never an image, rule 3);
  - the `header` menu from the DB;
  - "Gửi hàng đi" as a **mega menu** of the 7 outbound route cards (flag SVG, name, from-price or "Liên hệ", days), plus a link to the hub;
  - the language switcher (moved from the F-03 placeholder);
  - a primary **Chat Zalo** button → `/go/zalo/?from=<path>`, and a secondary **Gọi** icon button → `/go/call/?from=<path>`.

  All chrome strings come from `messages/{vi,en}.json`. Menu labels come from the DB.
- [ ] Given the keyboard on desktop:
  - Tab reaches every header item in order;
  - Enter, Space or ↓ opens the mega menu, the arrow keys move between cards, Esc closes it and returns focus to the trigger;
  - focus is always visible.

  This uses the Radix NavigationMenu primitive from `shared/ui`, with ARIA kept.
- [ ] Given < 1024 px, then the header is compact (wordmark, language, menu button). The menu button opens a **drawer** (`shared/ui` Sheet) with the same menu tree, and the route list is an accordion inside it. Focus is trapped while it's open, and Esc or close returns focus.
- [ ] A visually hidden-until-focused **skip link** ("Bỏ qua đến nội dung") is the first focusable element and targets `<main id="main">`.

**Mobile action bar**

- [ ] Given < 768 px, then a fixed bottom bar shows **Zalo · Gọi · Tính cước**:
  - Zalo → `/go/zalo/…`, Gọi → `/go/call/…`, Tính cước → the calculator page;
  - targets ≥ 44 × 44 px; it respects `env(safe-area-inset-bottom)`;
  - it hides on scroll down and shows on scroll up, by `transform` only (rule 9; instant under reduced motion).
- [ ] The page reserves the bar's height (bottom padding on `<body>` / `main` < 768 px) from the first paint, so the bar causes **no layout shift**: Lighthouse CLS 0 on `/` at 360 px, and no `layout-shift` entries attributed to the bar in a CDP trace while scrolling.

**Footer**

- [ ] Given any page, then the footer shows:
  - **company**: brand name; legal name and tax code only when verified (Q-01, otherwise omitted);
  - **services**: the `footer-services` menu;
  - **policies**: the `footer-policies` menu;
  - **contact**: phone, Zalo, email, offices and hours, each only under the fact-visibility rule (Q-02, Q-03, Q-06);
  - **social**: Facebook, if verified;
  - **© {year} 43 Logistics**.

  The year comes from a cached function (`cacheLife("days")`), because a bare `new Date()` isn't allowed in a Cache Components prerender. Contact links use `/go/[channel]`; the email uses `mailto:`.

**Breadcrumbs**

- [ ] Given `modules/seo/ui/breadcrumbs.tsx`, then it renders an accessible trail (`nav aria-label`, the current page `aria-current="page"`, ≥ 44 px targets) and the matching `BreadcrumbList` JSON-LD through an escaping `JsonLd` component (`security-patterns.md`).
  - It isn't rendered on the home page (rule 4).
  - It's demonstrated on the dev gallery (`/dev/tokens/`, dev-only) until S-04 uses it on route pages.
  - The JSON-LD validates in the Schema.org validator (recorded).

**Pages, i18n and data dev loop**

- [ ] Given `app/[locale]/layout.tsx`, then it renders header, `<main id="main">`, footer and the action bar around every page. The F-03 placeholder home keeps its H1 inside `<main>`. `/` and `/en/` keep their F-03 metadata and stay fully static (○ in the build) or partially prerendered (recorded).
- [ ] Given `pnpm db:local`, then it starts (or reuses) a Docker `postgres:17-alpine` on `localhost:54329`, creates the `anon`/`authenticated` roles, and runs `db:migrate` + `db:seed` using a local URL passed by the script. It **never writes `.env`**.
  - `pnpm dev:local` runs `next dev` with that local `DATABASE_URL` and `PREVIEW_UNVERIFIED=1`.
  - Both scripts are documented in `README.md` and `AGENTS.md` §7.
- [ ] Given the `verify` workflow, then it adds a `postgres:17-alpine` service, runs `db:migrate` + `db:seed` against it, and passes the service `DATABASE_URL` to `build`, `check:redirects` and `perf:report` (no secrets; a throwaway CI database). All existing checks still pass.
- [ ] `pnpm i18n:check` passes with the new keys (`header.*`, `actionBar.*`, `footer.*`, `breadcrumbs.*`, `routeCard.*`, `badge.unverified`).

**Quality gates**

- [ ] Given the production build, then on `/` and `/en/`:
  - Lighthouse mobile: performance ≥ 90 (median), accessibility ≥ 95, CLS < 0.1 (target 0), LCP < 2.5 s;
  - app JS delta ≤ 50 KiB (`perf:report` gates it);
  - axe-core 0 serious/critical at 360, 768 and 1280 px, desktop mega menu open and mobile drawer open included;
  - screenshots at **360 / 768 / 1280** px (header, open mega menu at 1280, open drawer at 360, footer, action bar), attached to the PR (roadmap *Accept*).

### Scope

**In scope:**
- Module queries (`routes`, `pricing`, `settings`, `content` menus) and fact visibility with preview mode.
- Header + mega menu + drawer, mobile action bar, footer, breadcrumbs + JSON-LD component, skip link.
- Layout wiring, messages.
- `pnpm db:local` / `dev:local`, and CI Postgres.
- Docs: `04` (component notes), `06` (preview mode, env), `AGENTS.md` §7.

**Out of scope:**
- The `/go/[channel]` handler and `contact_events` (S-02).
- Route pages, the hubs and the real home (S-04, S-05): menu links to draft pages 404 until then.
- Consent banner and tracking (S-13).
- The logo SVG (Q-11).
- Search; the "View in English?" banner.
- Admin editing of menus or settings (A-tasks).
- Price-engine logic beyond "minimum per-kg band" (S-03).

### Affected Areas

| Repo | Layer | File / Path |
|------|-------|-------------|
| app | module infrastructure | `modules/{routes,pricing,settings,content}/infrastructure/queries.ts` (new), `modules/{routes,pricing,settings,content}/index.ts` (new server entries) |
| app | module domain | `modules/routes/domain/nav-route.ts`, `modules/pricing/domain/from-price.ts`, `modules/settings/domain/*` (types, mapping) |
| app | module ui | `modules/content/ui/{site-header,mega-menu,mobile-nav,site-footer}.tsx`, `modules/contact/ui/{mobile-action-bar,contact-button}.tsx` (client island for the bar), `modules/seo/ui/{breadcrumbs,json-ld}.tsx` |
| app | shared | `shared/lib/fact-visibility.ts`, `shared/lib/format.ts` (VND/kg, days), `shared/ui/*` (existing primitives), `shared/config/env.server.ts` (`PREVIEW_UNVERIFIED`) |
| app | app layer | `app/[locale]/layout.tsx`, `app/[locale]/page.tsx` (inside `<main>`), `app/[locale]/dev/tokens/*` (breadcrumbs demo) |
| app | i18n | `messages/vi.json`, `messages/en.json`, `shared/i18n/ui/locale-switcher.tsx` (moved into the header) |
| app | scripts / CI | `scripts/db-local.sh` (new), `package.json` (`db:local`, `dev:local`; flags dep if added), `.github/workflows/verify.yml` (Postgres service, migrate + seed) |
| app | config | `.env.example` (`PREVIEW_UNVERIFIED`), `data/perf-budget.json` (routes unchanged) |
| context | docs | `docs/context/04-design-system.md`, `docs/context/06-architecture.md` (preview mode, env table), `AGENTS.md` §7 (via `/mark-implemented`) |

### Golden-rule checks

- **Rules 1–2 (facts/prices):** prices come only from `route_rates` via `pricing`; unverified data is hidden in production, and shown with a badge only in preview.
- **Rule 3:** the wordmark is HTML text; flags are SVG; there's no text in images.
- **Rule 5:** cached queries (`"use cache"` + `cacheTag`); locale is an argument.
- **Rule 6:** queries are server-only; no DB in client islands (they get plain props).
- **Rule 8:** client JS only for the mega menu, drawer and action bar; the delta is gated by `perf:report`. No `motion`, TanStack or Clerk.
- **Rule 9:** the action bar moves by `transform` only; reduced motion is respected.
- **Rules 10–11:** keyboard and focus, 44 px targets, skip link, no uppercase menus or buttons, token colours.
- **Rule 12:** every contact CTA goes through `/go/[channel]` (S-02 completes it).
- **Rule 15:** the CI database is throwaway, and the local URL is passed to processes, never written to `.env`.

### Dependencies & Risks

- **Depends on:**
  - F-04 (schema + seed; **code merged, Supabase cloud verification pending**, while local and CI use Docker/service Postgres);
  - F-03 (i18n), F-02 (tokens, primitives), F-06 (proxy), F-08 (`perf:report`).
- **Next:** S-02 (the `/go` handler) makes the CTAs work.
- **Blocked by questions** (placeholders): Q-01 legal name and tax code (omitted), Q-02/Q-03 offices and hours (omitted unless verified), Q-04/Q-05 prices and active routes ("Liên hệ"; the inactive routes aren't listed), Q-06 phones (omitted unless verified), Q-11 logo (wordmark).
- **Risks:**
  - **Build-time DB under Cache Components:** a DB outage at build fails CI loudly, which is intended. Preview and production need the Supabase URL (F-04 owner action).
  - **JS budget:** NavigationMenu + Sheet + the action bar may add 10–25 KiB; measured by `perf:report`.
  - **A flag dependency** (e.g. `country-flag-icons`) needs a review for size and licence. Alternatively, a few inline SVG flags for the 8 countries.

### Manual Verification Plan

**Scenario:** given `pnpm db:local` and `pnpm dev:local` (preview on), when `/` and `/en/` are opened at 360/768/1280 px, then the header, mega menu, drawer, action bar and footer render with the seed data and "chưa xác nhận" badges. Given `pnpm build && pnpm start` without the flag, then no unverified value is visible anywhere.

**Seed needs:** the default F-04 seed (all unverified). For one check, mark one route verified: `update routes set is_verified=true where key='kr'`. Then revert.

**Steps:**

1. Run `pnpm lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build` (against the local DB), `check:redirects` and `perf:report`.
2. **Preview on** (`pnpm dev:local`): screenshots at 360/768/1280 of the header, the open mega menu (1280), the open drawer (360), the action bar (360) and the footer, for VI and EN. Badges are visible on prices, days and contact lines.
3. **Production** (`pnpm build && PREVIEW_UNVERIFIED=1 pnpm start`): grep the HTML of `/` and `/en/` for every seeded phone, address and price string → **none present**. Cards show "Liên hệ". Contact lines are omitted.
4. Verify `kr` in the DB, rebuild (or revalidate the `routes`/`rates` tags) → the `kr` card shows "từ … đ/kg" and its days without a badge. Revert.
5. **Keyboard:**
   - mega menu: Tab to the trigger, Enter, arrows across the cards, Esc → focus back;
   - drawer: open, Tab is trapped inside, Esc → focus back;
   - skip link first.
6. **CLS:** Lighthouse mobile on `/` (3 runs via `perf:report`) gives CLS 0. A CDP performance trace while scrolling down and up at 360 px shows no `layout-shift` entry from the bar.
7. **Reduced motion:** with `prefers-reduced-motion: reduce`, the bar toggles without a transition.
8. **axe-core** at 360/768/1280, with the mega menu and drawer open → 0 serious/critical.
9. **Breadcrumbs:** on `/dev/tokens/`, the trail is visible, and its JSON-LD passes the Schema.org validator.
10. **CI:** the `verify` run on the PR shows the Postgres service, migrate + seed, build, `check:redirects` and `perf:report` all green.

**Validation commands:** `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build`, `check:redirects`, `perf:report`. The consent matrix doesn't apply (no consent or tracking change; the `/go` links are plain links). No automated tests (ADR 0004).

### Implementation Hints

- Follow `.claude/rules/component-patterns.md`: server components by default; client islands only for the NavigationMenu wrapper, the Sheet trigger and the action bar's scroll behaviour. Pass them plain serialisable props (labels, hrefs, display strings), never DB rows.
- From-price formatting: `Intl.NumberFormat('vi-VN')` + " đ/kg" in VI, and "VND/kg" in EN (`08` Formatting).
- `cacheTag` names per `naming-conventions.md` (`routes`, `rates`, `settings`, `menu`). Later admin actions invalidate them.
- Flags: prefer a few inline SVGs (8 countries) in `shared/ui/flags/` over a large package, unless the package is tree-shakeable per flag (check bundle impact).
- Lessons from earlier tasks:
  - next-intl `Link` with an explicit `locale` breaks client navigation; use `next/link` + `localizedPath`;
  - `new Date()` in a prerender errors under Cache Components;
  - kill stale `next-server` processes before measuring;
  - Lighthouse locally needs care (x64 Node + Rosetta inflates timing; bytes are reliable).

### Related

- Roadmap: `docs/context/10-roadmap.md` S-01 (next: S-02 `/go`, S-04 route pages, S-05 home).
- Context:
  - `03-information-architecture.md` (Navigation, Sitemap);
  - `04-design-system.md` (Header, MobileActionBar, Footer, Breadcrumbs, Motion);
  - `05-seo-and-tracking.md` (BreadcrumbList, `/go`);
  - `07-data-model.md` (routes, route_rates, site_settings, menu_items);
  - `08-i18n.md` (formatting).
- Specs: F-02 (primitives), F-03 (switcher, `localizedPath`), F-04 (schema, seed, `is_verified`), F-08 (`perf:report`).
