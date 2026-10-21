---
title: Build the site layout shell from database data
type: feature
status: approved
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

- [ ] Given the module entry points, then cached queries exist, each with `"use cache"` + `cacheTag`, taking `locale` as an argument (`06`, F-03), and importing `server-only`. Tags follow `naming-conventions.md` (`entity:{id}`) and `06` (Caching), so the A-02 editor's `updateTag('route:{key}')` + `revalidateTag('menu','max')` refreshes the shell:
  - `routes`: `listNavRoutes(locale)` gives active routes (direction, key, country code, name, transit days, `isVerified`, `pricesPublic`); tags `menu` (the list, so activation changes refresh it) plus `route:{key}` for each returned route; `cacheLife('max')`;
  - `pricing`: `getFromPrices()` gives the per-route minimum `price_per_kg_vnd` over **eligible** bands; tags `menu` plus `route:{key}` per route; `cacheLife('hours')`, so a validity boundary takes effect within an hour without an edit. A band is eligible when:
    - `contact_for_price = false` **and** `price_per_kg_vnd is not null` (flat-only bands never produce a "từ … /kg");
    - `valid_from` is null or ≤ today, **and** `valid_to` is null or ≥ today (both inclusive, `date` columns), with "today" taken in `Asia/Ho_Chi_Minh` inside the cached function;
    - a route with no eligible band has no from-price (→ "Liên hệ").

    The eligibility rule is a pure function in `modules/pricing/domain/from-price.ts` (worked examples below).
  - `settings`: `getSiteSettings(keys)` gives values plus `isVerified`, tag `settings`, `cacheLife('max')`;
  - `content`: `getMenu(menu, locale)` gives the menu tree with labels and resolved hrefs (page slug per locale, route page, or external URL), tag `menu`, `cacheLife('max')`.

  Each lives in `modules/<m>/infrastructure/queries.ts` behind `modules/<m>/index.ts`. DB rows are mapped to minimal domain types before reaching UI (`security-patterns.md`). The UI never imports `@/db`. Tag builders (`routeTag(key)`, `MENU_TAG`, `SETTINGS_TAG`) live in each owning module's `constants.ts`.

  `fromPrice` worked examples (today = 2026-10-21, VN time):

  | Bands | Result |
  | --- | --- |
  | 95.000/kg (no dates), 85.000/kg (`valid_to` 2026-10-20) | 95.000 (the expired band is ignored) |
  | 90.000/kg (`valid_from` 2026-11-01), 95.000/kg | 95.000 (the future band is ignored) |
  | 85.000/kg (`valid_to` 2026-10-21) | 85.000 (`valid_to` is inclusive) |
  | flat 250.000 only | none → "Liên hệ" |
  | `contact_for_price` only | none → "Liên hệ" |
- [ ] Given `DATABASE_URL` is unset when a query runs, then it fails loudly with a clear message; there's no silent empty layout.

**Fact visibility** (rule 1, owner decision 1)

- [ ] Given a pure function `factVisibility({ isVerified, env })` in `shared/lib/fact-visibility.ts`, then:
  - **verified** → shown;
  - **unverified** → hidden, **unless** preview mode is on, which happens only when `PREVIEW_UNVERIFIED=1` **and** (`NODE_ENV=development` or `VERCEL_ENV=preview`). In that case the value is shown with a "chưa xác nhận" / "unverified" badge.
  - `NODE_ENV=production` without `VERCEL_ENV=preview` **always** hides, whatever the flag.

  It's a generic gate (a boolean plus the environment, no entity knowledge), so it lives in `shared/lib`. Each owning module applies it to its own data (`pricing` to cards, `contact` to contact lines). `PREVIEW_UNVERIFIED` is server-only, added to `env.server.ts` and `.env.example`.
- [ ] Given a hidden value, then it is **removed on the server before serialisation**: it never appears in the HTML, in the RSC payload (initial or navigation/prefetch), in props passed to client islands, or in hrefs, `aria-label`s, `title`s or JSON-LD. Server components decide visibility and pass client islands only the already-filtered display strings; cached queries may hold raw values, but only server code reads them.
- [ ] Given the shell is prerendered at **build** time (Cache Components), then visibility is resolved from the build environment as well as the runtime one:
  - checked with `PREVIEW_UNVERIFIED=1` set for **both** `pnpm build` and `pnpm start` (production `NODE_ENV`, no `VERCEL_ENV`) → nothing unverified in HTML or RSC;
  - preview and production are **separate builds**: a preview deployment is never promoted to production without a rebuild in the production environment (noted in `06` with the env table).
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
  - the language switcher (replacing the F-03 placeholder, see below);
  - a primary **Chat Zalo** button → `/go/zalo/?from=<path>`, and a secondary **Gọi** icon button → `/go/call/?from=<path>`.

  All chrome strings come from `messages/{vi,en}.json`. Menu labels come from the DB.
- [ ] Given the shell is static, then the current path comes from a small client island, not from request APIs:
  - **Contact links** (`modules/contact/ui/contact-link.tsx`, `"use client"`, `usePathname`): the server HTML has `/go/{channel}/`; after hydration, and after every client navigation, the href is `/go/{channel}/?from={encodeURIComponent(pathname)}`.
  - **Language switcher** (`shared/i18n/ui/locale-switcher.tsx`, now a client island): links to the **equivalent translation** (`08` Language switcher) by reading the page's own `<link rel="alternate" hreflang="{target}">` (every page emits it through `generateMetadata`, rule 4), re-read after each navigation. With no alternate for the target locale, it links to that locale's home. Server HTML falls back to the target locale's home. It keeps `next/link` + `localizedPath`, `lang`/`hrefLang` and `aria-current`.
- [ ] Given the keyboard on desktop:
  - Tab and Shift+Tab reach every header item in order;
  - Enter, Space or ↓ opens the mega menu, the arrow keys move between cards, Tab leaves the panel to the next top-level item, Esc closes it and returns focus to the trigger;
  - focus is always visible.

  This uses the Radix NavigationMenu primitive from `shared/ui`, with ARIA kept: each card and the hub link are `NavigationMenu.Link asChild` around `next/link` (that's what gives arrow-key movement). "Gửi hàng đi" is a disclosure **trigger** (button); the hub is a separate link inside the panel, never the trigger itself.
- [ ] Given < 1024 px, then the header is compact (wordmark, language, menu button), and from **768 px up it also keeps the Chat Zalo button**, so a primary Zalo CTA is visible at every width (below 768 px the action bar carries it). The menu button opens a **drawer** (`shared/ui` Sheet) with the same menu tree, and the route list is an accordion inside it:
  - the Sheet has a localised `SheetTitle` (visually hidden if needed) and a localised close label. `shared/ui/sheet.tsx` gets a `closeLabel` prop in place of the hard-coded "Close";
  - focus is trapped while it's open; Esc or close returns focus to the menu button;
  - the accordion works by keyboard (Enter/Space toggles, Tab moves through its links);
  - following a link closes the drawer;
  - if the viewport grows to ≥ 1024 px while it's open, the drawer closes and focus isn't lost (it lands on `body` or the header, never on a hidden element).
- [ ] A visually hidden-until-focused **skip link** ("Bỏ qua đến nội dung") is the first focusable element and targets `<main id="main">`.

**Mobile action bar**

- [ ] Given < 768 px, then a fixed bottom bar shows **Zalo · Gọi · Tính cước**:
  - Zalo → `/go/zalo/…`, Gọi → `/go/call/…`, Tính cước → the calculator page;
  - targets ≥ 44 × 44 px; it respects `env(safe-area-inset-bottom)`;
  - it hides on scroll down and shows on scroll up, by `transform` only (rule 9; instant under reduced motion);
  - it **shows whenever focus enters it** (`focusin`) and never hides while focus is inside it, so no focusable link is ever off-screen.
- [ ] The page reserves the bar's **full** height, safe area included (`padding-bottom: calc(<bar height> + env(safe-area-inset-bottom))` on `<body>` < 768 px, after all content, footer included), from the first paint. So:
  - the bar causes **no layout shift**: Lighthouse CLS 0 on `/` at 360 px, and no `layout-shift` entries attributed to the bar in a CDP trace while scrolling;
  - the end of the footer stays readable and clickable above the bar, at 200 % zoom and in landscape too.

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

- [ ] Given the layouts, then:
  - `app/[locale]/layout.tsx` keeps only `<html>`/`<body>`, fonts, next-intl and metadata defaults;
  - a route group `app/[locale]/(site)/layout.tsx` renders header, `<main id="main">`, footer and the action bar. The existing pages (`page.tsx`, `[...rest]`, `dev/*`) and the localised `not-found.tsx` move into `(site)`, so 404s show the shell. Later `/lp/*` pages get a sibling group with their own minimal layout (wordmark + Zalo, `03` Ads landing page), not this shell;
  - the layout **composes** the shell through module entry points and passes server-rendered slots, so no new runtime module edge is needed (`module-structure.md`): `content` (header/footer frame, menus; → `routes` allowed) receives `routeCards` from `pricing` (→ `routes` allowed), and `contactCta`/`contactDetails` from `contact` (→ `settings` allowed). `content` never imports `pricing`, `settings` or `contact`;
  - there's exactly one `<main>` per page: pages and `not-found` drop their own `<main>` and render inside the shell's. The F-03 placeholder home keeps its H1;
  - `/` and `/en/` keep their F-03 metadata and stay fully static (○ in the build) or partially prerendered (recorded; the hourly `getFromPrices` lifetime may show as ISR).
- [ ] Given `pnpm db:local`, then it starts (or reuses) a Docker `postgres:17-alpine` on `localhost:54329`, creates the `anon`/`authenticated` roles, and runs `db:migrate` + `db:seed` using a local URL passed by the script. It **never writes `.env`**.
  - `pnpm dev:local` runs `next dev` with that local `DATABASE_URL` and `PREVIEW_UNVERIFIED=1`.
  - Both scripts are documented in `README.md` and `AGENTS.md` §7.
- [ ] Given the `verify` workflow, then it adds a `postgres:17-alpine` service and:
  - sets throwaway job-level credentials (`POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`, not secrets), maps the port, and has a `pg_isready` health check (`--health-cmd`, interval and retries), so later steps start only when the database is ready;
  - sets **both** `DATABASE_URL_DIRECT` (needed by `drizzle.config.ts` and `scripts/seed.ts`, which have no fallback) and `DATABASE_URL` (app runtime) to the service URL;
  - runs `db:migrate` + `db:seed`, then `build`, `check:redirects` and `perf:report`, with the service kept up for the server-based checks. Creating `anon`/`authenticated` roles isn't needed for the current migration (it only enables RLS);
  - all existing checks still pass.
- [ ] `pnpm i18n:check` passes with the new keys (`header.*`, `actionBar.*`, `footer.*`, `breadcrumbs.*`, `routeCard.*`, `badge.unverified`).

**Quality gates**

- [ ] Given the production build, then on `/` and `/en/`:
  - Lighthouse mobile: performance ≥ 90 (median), accessibility ≥ 95, CLS < 0.1 (target 0), LCP < 2.5 s;
  - Lighthouse SEO: recorded. The only allowed failing audit is `is-crawlable`, caused by the site-wide placeholder `noindex` in `app/[locale]/layout.tsx` (F-03, removed at L-01). Every other SEO audit passes (title, description, `hreflang`, canonical, link text, tap targets);
  - INP < 200 ms: a Lighthouse navigation run can't measure INP. Record TBT from it, plus the interaction latency from a DevTools Performance trace (4× CPU throttle, 360 and 1280 px) of opening and closing the mega menu, opening the drawer and expanding its accordion, and scrolling the action bar;
  - app JS delta ≤ 50 KiB (`perf:report` gates it). Also record any chunk that loads only when the menu or drawer opens (Network panel), even though layout islands are expected to ship in the initial chunks;
  - gitleaks: the pre-commit hook and the CI job pass;
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
| app | module ui | `modules/content/ui/{site-header,mega-menu,mobile-nav,site-footer}.tsx` (frame + menus, slots for cards and contact), `modules/pricing/ui/route-cards.tsx` (server: routes + from-prices + visibility), `modules/contact/ui/{mobile-action-bar,contact-link,contact-details}.tsx` (`contact-link` and the bar are client islands; `contact-details` is the server footer block incl. company lines), `modules/seo/ui/{breadcrumbs,json-ld}.tsx` |
| app | module constants | `modules/{routes,pricing,settings,content,contact}/constants.ts` (tag builders, channel keys) |
| app | shared | `shared/lib/fact-visibility.ts`, `shared/lib/format.ts` (VND/kg, days), `shared/ui/*` (existing primitives), `shared/ui/sheet.tsx` (`closeLabel` prop), `shared/config/env.server.ts` (`PREVIEW_UNVERIFIED`) |
| app | app layer | `app/[locale]/layout.tsx` (html/body/intl only), `app/[locale]/(site)/layout.tsx` (new shell), and moved into `(site)`: `page.tsx`, `[...rest]/page.tsx`, `not-found.tsx` (their own `<main>` removed), `dev/tokens/*` (breadcrumbs demo) |
| app | i18n | `messages/vi.json`, `messages/en.json`, `shared/i18n/ui/locale-switcher.tsx` (rewritten as a client island using `hreflang` alternates) |
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
2. **Preview on** (`pnpm dev:local`): screenshots at 360/768/1280 of the header, the open mega menu (1280), the open drawer (360), the action bar (360) and the footer, for VI and EN. Badges are visible on prices, days and contact lines. At 768 and 1023 px with the drawer closed, the header's Chat Zalo button is visible.
3. **Production** (`PREVIEW_UNVERIFIED=1 pnpm build && PREVIEW_UNVERIFIED=1 pnpm start`, the flag set for **both**): for `/`, `/en/` and a 404 URL, fetch the HTML, the RSC payload (`curl -H 'RSC: 1'`) and a prefetch response (`?_rsc=…` from the Network panel), and grep them for every seeded phone, Zalo/WhatsApp/Messenger ID, email, address, hours string, price and transit-day value → **none present**. Cards show "Liên hệ". Contact lines are omitted.
4. Verify `kr` in the DB and revalidate its tags (`route:kr`, `menu`) or rebuild → the `kr` card shows "từ … đ/kg" and its days without a badge. Then, still verified, set its cheapest band's `valid_to` to yesterday → the card falls back to the next eligible band or "Liên hệ"; set it to a future `valid_from` → same; make the only band flat-only → "Liên hệ". Revert everything.
5. **Keyboard:**
   - mega menu: Tab to the trigger, Enter, arrows across the cards and the hub link, Tab out of the panel to the next item, Shift+Tab back, Esc → focus back on the trigger;
   - drawer: open, Tab is trapped inside, the accordion opens with Enter/Space, a link click closes the drawer, Esc → focus back on the menu button; widen the window to ≥ 1024 px while it's open → it closes and focus isn't on a hidden element;
   - action bar (360 px): scroll down until it hides, then Tab to it → it shows again and stays while focused;
   - language switcher: on `/dev/tokens/` and on a 404, the other-locale link targets that page's `hreflang` alternate (or the locale home when there isn't one), and it updates after a client navigation;
   - contact links: after hydration, `href` carries `?from=` with the current path, and it updates after a client navigation;
   - skip link first.
6. **CLS:** Lighthouse mobile on `/` (3 runs via `perf:report`) gives CLS 0. A CDP performance trace while scrolling down and up at 360 px shows no `layout-shift` entry from the bar. At 360 px, at 200 % zoom and in landscape, the last footer line is fully visible above the bar.
7. **Reduced motion:** with `prefers-reduced-motion: reduce`, the bar toggles without a transition, and the mega menu and drawer open without animation.
8. **INP and SEO:** record the Performance-trace interaction latencies (Quality gates) and the Lighthouse SEO audit list (only `is-crawlable` may fail).
9. **axe-core** at 360/768/1280, with the mega menu and drawer open → 0 serious/critical.
10. **Breadcrumbs:** on `/dev/tokens/`, the trail is visible, and its JSON-LD passes the Schema.org validator.
11. **CI:** the `verify` run on the PR shows the Postgres service, migrate + seed, build, `check:redirects` and `perf:report` all green.

**Validation commands:** `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build`, `check:redirects`, `perf:report`. The consent matrix doesn't apply (no consent or tracking change; the `/go` links are plain links). No automated tests (ADR 0004).

### Implementation Hints

- Follow `.claude/rules/component-patterns.md`: server components by default; client islands only for the NavigationMenu wrapper, the Sheet trigger and the action bar's scroll behaviour. Pass them plain serialisable props (labels, hrefs, display strings), never DB rows.
- From-price formatting: `Intl.NumberFormat('vi-VN')` + " đ/kg" in VI, and "VND/kg" in EN (`08` Formatting).
- `cacheTag` names per `naming-conventions.md` and `06`: `route:{key}`, `menu`, `settings`. A-02 invalidates `route:{key}` + `menu`, so every query feeding the cards carries both.
- Flags: prefer a few inline SVGs (8 countries) in `shared/ui/flags/` over a large package, unless the package is tree-shakeable per flag (check bundle impact).
- Lessons from earlier tasks:
  - next-intl `Link` with an explicit `locale` breaks client navigation; use `next/link` + `localizedPath`;
  - a bare `new Date()` in a prerender errors under Cache Components; inside a `"use cache"` function (footer year, from-price "today") it's allowed;
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
