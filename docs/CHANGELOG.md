# Changelog

Cross-repo digest of implemented specs (context workspace + `43logistics.vn` app). Added by `/mark-implemented`; newest first.

## 2026-10-28 — Edit rate cards, surcharges and policies from the admin

- Spec: [specs/feature-a02b-rate-cards-admin.md](../specs/feature-a02b-rate-cards-admin.md) · Roadmap: A-02b (part 2)
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/55 (e858ba1); context: https://github.com/Dienvm/logistics-context/pull/76
- Owner: both
- Summary: `/admin/routes/{key}/` edits everything the price-list import writes, so sales errors no longer need a developer.
  - Cards (create in a tab, facts, VI/EN copy, delivery fee, reorder in the tab or by tab, delete), price columns (add, rename, reorder, hide; copy band edges as "Liên hệ"), policy sections with "copy to other cards", surcharge lists and rows (free-text prices, hide a row), card ↔ list links, a per-card public preview; `/admin/routes/` shows active cards and currencies.
  - Every save locks the route, stamps route and card `admin_edited_*` and invalidates `route:{key}` + `menu`; the import skips edited routes, and `--force` now also restores hidden rows.
  - Migration `0011` drops the deprecated `routes` card facts (applied on Supabase 2026-10-28 after deploy). CI green on the merge commit (verify, Lighthouse shards, gitleaks, deploy); owner browser check passed.

## 2026-10-27 — Write and publish blog posts from the admin

- Spec: [specs/feature-a03b-blog-post-editor.md](../specs/feature-a03b-blog-post-editor.md) · Roadmap: A-03b
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/44 (ba83069)
- Owner: both
- Summary: post editor for fields and `richText` blocks, categories, "Tạo bản nháp EN" and a publish workflow under `/admin/posts/`; cover images stay with A-04.
  - CI on the merge commit: lint/typecheck/build/redirects passed, the Lighthouse gate hit its 9-minute deadline (fixed by sharding in PR #46); `main` is green since. Migration `0008` still has to be confirmed on Supabase.

## 2026-10-27 — Edit pages and their translations from the admin

- Spec: [specs/feature-a03-pages-and-translations.md](../specs/feature-a03-pages-and-translations.md) · Roadmap: A-03
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/41 (0e2476f)
- Owner: both
- Summary: form-based block editor per block type, SEO fields with counters, draft → review → published and "Create EN draft" under `/admin/pages/`; slug editing moved to A-08.
  - Codex fixes in PR #43 (d40ddcc, `verify` green); the merge commit's own run was cancelled by the next push.

## 2026-10-27 — Edit route rates and route flags from the admin

- Spec: [specs/feature-a02-routes-rates-editor.md](../specs/feature-a02-routes-rates-editor.md) · Roadmap: A-02
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/40 (5133141)
- Owner: both
- Summary: band CRUD, validity dates, the admin-only `is_verified` toggle and a public-table preview under `/admin/routes/`; saves call `updateTag` for the route and the menu.
  - Roadmap stays partial: the owner's browser check of the public refresh is open, and A-02b part 2 moves band editing onto rate cards. Lighthouse gate on the merge commit hit its deadline (fixed in PR #46).

## 2026-10-27 — Build the role-aware admin shell with sidebar and UserButton

- Spec: [specs/feature-a01-admin-shell.md](../specs/feature-a01-admin-shell.md) · Roadmap: A-01
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/39 (33a57b6)
- Owner: both
- Summary: `/admin` shell with role-filtered sidebar, Clerk `<UserButton>`, a per-shell TanStack Query provider and guarded `ComingSoon` pages for the later sections; public routes +13 B gz. CI green on the merge commit.

## 2026-10-27 — Add the About, Contact, policy and 404 pages

- Spec: [specs/feature-s09-about-contact-policies-404.md](../specs/feature-s09-about-contact-policies-404.md) · Roadmap: S-09
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/27 (c94ff3a)
- Owner: both
- Summary: policy template (TOC, "Cập nhật" date), About, Contact (channels, quote form, offices) and the localized 404; menus link only published pages, so the footer has no `#` links.
  - The merge commit failed the JS gate because the Maps iframe counted as app JS; ADR 0006 was amended 2026-10-24 to budget first-party JS only (PR #32), and `main` passes. Lighthouse/axe evidence deferred (phase 1).

## 2026-10-22 — Build the shipping calculator page

- Spec: [specs/feature-s07-calculator-page.md](../specs/feature-s07-calculator-page.md) · Roadmap: S-07
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/21 (b76a21a); context: https://github.com/Dienvm/logistics-context/pull/44, https://github.com/Dienvm/logistics-context/pull/45
- Owner: both
- Summary: `/tinh-cuoc/` and `/en/shipping-calculator/` estimate a shipment's chargeable weight and price on the S-03 engine with the bands the route pages show (embedded, no fetch).
  - "Gửi kết quả qua Zalo" copies a summary and opens Zalo via `/go/zalo/`; `calculate_quote` is pushed once per settled result; routes without public prices are listed as "Liên hệ".
  - Entry points: the home hero form (`?route=`) and the route-page calculator link (route + weight).
  - JS budget: one `QuoteCalculator` island serves route pages and the calculator page, with a `useReducer` instead of Zustand. CI: every route +49.1 KiB (budget 50).

## 2026-10-22 — Fill the route pages with the owner's content

- Spec: [specs/feature-s04b-route-page-content.md](../specs/feature-s04b-route-page-content.md) · Roadmap: S-04b
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/20 (f841929); context: https://github.com/Dienvm/logistics-context/pull/41, https://github.com/Dienvm/logistics-context/pull/42
- Owner: both
- Summary: the 8 route pages now carry the owner's live-site content (intro, "Lưu ý" notes, methods with the DB transit line, process, why us, tips) as validated `page_translations.blocks`, plus approved per-route goods rules (75) and published FAQs (10), in quynam.vn's order; the H1 carries "– từ {price}" when the price is shown.
  - Owner decisions a/d/f published (CSKH 24/7, goods per route, free delivery + price notes); defaults b/c/e (no insurance promises, no Hà Nội warehouse, no carriers); counterfeit/unlabelled goods and competitor links excluded.
  - Seed fills empty blocks only; `db:confirm` `routeContent` approves goods and publishes FAQs. Applied on Supabase 2026-10-22 (migration `0001`, seed, confirm).
  - CI: JS 181.2 KiB (+46.9, PASS); simulated LCP 3.37 s VI / 2.86 s EN (report-only). Phase 1: manual walk-through, axe, Lighthouse, FAQ JSON-LD validation deferred.

## 2026-10-22 — Build the outbound and inbound hub pages

- Spec: [specs/feature-s06-hubs.md](../specs/feature-s06-hubs.md) · Roadmap: S-06
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/19 (ce42ba6); context: https://github.com/Dienvm/logistics-context/pull/39, https://github.com/Dienvm/logistics-context/pull/40
- Owner: both
- Summary: `/dich-vu/`, `/en/services/`, `/nhap-hang/` and `/en/ship-to-vietnam/` render (they 404ed before): hero, route photo cards with from-price/days/methods, a comparison table (cards below 768 px), hub FAQ when published, closing band; `ItemList` + `BreadcrumbList` JSON-LD; route pages gain the hub crumb.
  - Published through `data/owner-confirmations.json` `pages` (on Supabase 2026-10-22). `check:redirects`: 60 PASS, 0 FAIL. JS 181.2 KiB (+46.9, PASS). Manual checks deferred (phase 1).

## 2026-10-22 — Build the route pages from database data

- Spec: [specs/feature-s04-route-page-template.md](../specs/feature-s04-route-page-template.md) · Roadmap: S-04 (partial)
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/17 (f3d6334); context: https://github.com/Dienvm/logistics-context/pull/38
- Owner: both
- Summary: the 7 outbound route pages and SG→VN now render from the database in VI and EN (they 404ed before). One template: hero facts under the fact rule, a mini calculator on the S-03 engine, rate table, pricing rules, process, related routes and the closing band; goods, FAQ, testimonials and guides appear once data exists. Metadata from the 05 patterns, publication-aware hreflang, `Service`/`Offer`/`FAQPage` JSON-LD.
  - Pages are published by the owner through `data/owner-confirmations.json` (`pages`) + `pnpm db:confirm`, which CI now also runs. `check:redirects`: 59 PASS (was 25), 0 FAIL.
  - Phase 1 (owner): Codex, manual Lighthouse/axe/fixture checks deferred; OG image deferred (needs a Vietnamese TTF/WOFF font). CI: JS 181.2 KiB (+46.9, PASS) on every route, home included, so ~4 KiB landed in a shared chunk (3.1 KiB headroom left).
  - Not yet on Supabase: run `pnpm db:confirm` there to publish the pages (migration `0001` also pending).

## 2026-10-22 — Add the pure price engine for quotes

- Spec: [specs/feature-s03-price-engine.md](../specs/feature-s03-price-engine.md) · Roadmap: S-03
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/16 (09ff34c); context: https://github.com/Dienvm/logistics-context/pull/37
- Owner: both
- Summary: a pure, framework-free price engine turns a route, its rate bands and a weight (plus optional L×W×H) into a price or a "Liên hệ" reason, behind `modules/pricing/client.ts` for the calculators.
  - Integer grams with exact decimal parsing; volumetric by the route's divisor; rounding only when the route has a step; highest-minimum band wins, ties and both-prices are `ambiguous_band`; per-kg totals in bigint, half up; no VAT/surcharges/minimum (Q-04, Q-25).
  - `pnpm price:examples` prints the spec's 28 worked examples through the real engine and row mapper; all matched by hand. No public page imported it in this task (route JS unchanged); S-04 added the calculator island.

## 2026-10-22 — Redesign the home page with confirmed owner facts and motion

- Spec: [specs/feature-s05b-home-redesign.md](../specs/feature-s05b-home-redesign.md) · Roadmap: S-05b
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/15 (caf3a0c); context: https://github.com/Dienvm/logistics-context/pull/34
- Owner: both
- Summary: owner review turned the thin S-05 home into a full page: logo + top bar, hero with the "nhanh, rẻ, dễ dàng" slogan and visible hotline, photo route bento with confirmed prices/days, why us, process timeline, 10% offer band, real photo gallery and blurred customer chats, dark closing band with offices. CSS-only motion; no new JS.
  - Owner-confirmed facts live in `43logistics.vn/data/owner-confirmations.json`, applied by `pnpm db:confirm` (the seed never verifies). **Not yet applied on Supabase** (with migration `0001`).
  - Mega menu moved to ≥ 1280 px (EN overflowed at 1024 px). Fonts trimmed to rendered weights.
  - Lighthouse mobile medians: Performance 90 / 90, Accessibility 100; simulated LCP ≈ 3.6 s (H1 waits for its web font) stays above the 2.5 s target, a follow-up. Route JS unchanged (177.2 KiB).
  - Also carried the S-05 Codex fixes (`90e4e32`) that missed PR #14.

## 2026-10-22 — Build the home page from database data

- Spec: [specs/feature-s05-home.md](../specs/feature-s05-home.md) · Roadmap: S-05
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/14 (e3216a0); context: https://github.com/Dienvm/logistics-context/pull/33
- Owner: both
- Summary: `/` and `/en/` replaced the placeholder with a DB-driven home: one H1 (published translation or messages), publication-aware hreflang, home JSON-LD from verified settings only, a route bento sharing the mega menu's card and visibility rule, gated copy and photos, offices, offer, guides and consented testimonials. Unverified facts never reach HTML or RSC.
  - Photos render via `next/image` `getImageProps()` (no ~6 KB client chunk). No carousel, no iframe; LCP image ≤ 150 KB.
  - Its Codex review fixes landed after the merge and shipped in S-05b.

## 2026-10-22 — Log contact clicks and redirect via /go/[channel]

- Spec: [specs/feature-s02-contact-tracker.md](../specs/feature-s02-contact-tracker.md) · Roadmap: S-02
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/13 (121de49); context: https://github.com/Dienvm/logistics-context/pull/30
- Owner: both
- Summary: the contact CTAs now work. `/go/[channel]` 302s to Zalo, `tel:`, WhatsApp or Messenger from `site_settings.contact` and logs one `contact_events` row per click in `after()`; the same `event_id` is pushed to `dataLayer`, ready for S-13 and T-01 dedupe.
  - Until Q-06 is verified, production `/go/*` returns 404 (no fallback number). Attribution is stored only with ads consent; IPs are HMAC-hashed with `IP_HASH_SALT`; bots and HEAD write no row. The conversion seam is a no-op (T-01 / Q-13).
  - App JS +0.5 KiB (+42.9 KiB over the baseline on `/`), within the 50 KiB budget; `package.json` `sideEffects` keeps zod out of the public bundle.
  - Migration `0001` is not yet applied on Supabase.

## 2026-10-22 — Build the site layout shell from database data

- Spec: [specs/feature-s01-site-layout-shell.md](../specs/feature-s01-site-layout-shell.md) · Roadmap: S-01
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/11 (de37a0d), follow-up https://github.com/Dienvm/43logistics.vn/pull/12 (ce4b973); context: https://github.com/Dienvm/logistics-context/pull/21, https://github.com/Dienvm/logistics-context/pull/23, https://github.com/Dienvm/logistics-context/pull/25
- Owner: both
- Summary: every public page now has the shell from DB data: header with the routes mega menu, mobile drawer, mobile action bar, footer from `site_settings`, and breadcrumbs with `BreadcrumbList` JSON-LD; contact links go through `/go/[channel]`.
  - Unverified seed facts stay hidden in production and show with a "chưa xác nhận" badge under `PREVIEW_UNVERIFIED=1` (dev or Vercel preview only); `pnpm db:local` / `dev:local` give a throwaway local DB.
  - App JS +42.4 KiB over the baseline on `/`, within the 50 KiB budget.

## 2026-10-22 — Create the Supabase schema, migrations and seed

- Spec: [specs/feature-f04-database-schema-seed.md](../specs/feature-f04-database-schema-seed.md) · Roadmap: F-04
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/6 (2f5109c); context: https://github.com/Dienvm/logistics-context/pull/13, https://github.com/Dienvm/logistics-context/pull/14, https://github.com/Dienvm/logistics-context/pull/25
- Owner: both
- Summary: all 25 tables from `07` as Drizzle module schemas with RLS on and no policies, one baseline migration, and an idempotent `pnpm db:seed` that loads legacy data unverified and as drafts.
  - Verified on the owner's Supabase project in `ap-southeast-1`: `anon`/`authenticated` read 0 rows and can't insert; the app's transaction-pooler connection reads all 10 routes.

## 2026-10-21 — Add Lighthouse report and JS budget gate to CI

- Spec: [specs/feature-f08-ci-lighthouse-budget.md](../specs/feature-f08-ci-lighthouse-budget.md) · Roadmap: F-08
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/9 (6a6fd96); context: https://github.com/Dienvm/logistics-context/pull/19, https://github.com/Dienvm/logistics-context/pull/20
- Owner: both
- Summary: the `verify` workflow now runs `pnpm perf:report`, with 3 cold Lighthouse mobile runs per route in `data/perf-budget.json` and consent rejected.
  - It fails the PR when the median app JS exceeds the 134.3 KiB baseline + 50 KiB (ADR 0006); LCP/CLS/TBT and scores are reported only.
  - The job summary shows the table and the `lighthouse-report` artifact uploads on every run.
  - Today: +13.9 KiB on `/` and `/en/`. An oversize canary (+110.6 KiB) failed the gate as expected.

## 2026-10-21 — Generate legacy redirects from the CSV and check them

- Spec: [specs/feature-f07-legacy-redirects-check.md](../specs/feature-f07-legacy-redirects-check.md) · Roadmap: F-07
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/8 (0822424); context: https://github.com/Dienvm/logistics-context/pull/17, https://github.com/Dienvm/logistics-context/pull/18
- Owner: both
- Summary: `next.config.ts` `redirects()` is generated from `redirect-map.csv` (80 rules, 301, both slash forms, validated at build), and `?attachment_id=` → `/` is added to the proxy.
  - `pnpm check:redirects` runs in CI on every PR: 0 FAIL, with 103 redirects pending only on unbuilt destination pages.
  - `--strict` at L-01 and the host run at L-02; uploads and attachment slugs belong to A-04.

## 2026-10-21 — Compose proxy.ts for gone, legacy, attribution and admin

- Spec: [specs/feature-f06-proxy-composition.md](../specs/feature-f06-proxy-composition.md) · Roadmap: F-06
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/7 (297f784); context: https://github.com/Dienvm/logistics-context/pull/15, https://github.com/Dienvm/logistics-context/pull/16
- Owner: both
- Summary: `proxy.ts` runs one pure planner:
  - 410 for retired WordPress paths;
  - `/admin` 404 until F-05;
  - one redirect combining the legacy `?page_id`/`?p` (21 sourced IDs), the locale prefix and the trailing slash, which fixes F-03's `/vi` two-hop;
  - then next-intl, with `43l_attr` set only under the new `43l_consent` contract (HttpOnly, hostname-only referrer, byte-capped).

## 2026-10-21 — Add next-intl locale routing with VI root and /en

- Spec: [specs/feature-f03-i18n-routing.md](../specs/feature-f03-i18n-routing.md) · Roadmap: F-03
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/5 (6d1c60e); context: https://github.com/Dienvm/logistics-context/pull/11, https://github.com/Dienvm/logistics-context/pull/12
- Owner: both
- Summary: next-intl 4.14 with VI at `/` and EN at `/en/`. The locale comes from `next/root-params` (the ADR 0006 Cache Components gate passed; both locales are static). There's no locale cookie or detection, and a minimal `proxy.ts`. It adds `pnpm i18n:check` (keys + ICU arguments) and a `verify` CI workflow. Known limits: `/vi` takes 2 hops (F-06), and 404 bodies render after hydration (S-10).

## 2026-10-21 — Generate the token theme and move to Tailwind v4

- Spec: [specs/feature-f02-tokens-and-theme.md](../specs/feature-f02-tokens-and-theme.md) · Roadmap: F-02
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/3 (3f2218f) + Codex-review follow-up https://github.com/Dienvm/43logistics.vn/pull/4 (137560b); context: https://github.com/Dienvm/logistics-context/pull/9
- Owner: both
- Summary: Tailwind 4.3 with a generated `@theme static` (`pnpm tokens` / `tokens:check`), next/font Be Vietnam Pro + Barlow Condensed, 16 token-styled shadcn v4 primitives (44 px targets, full focus ring, transform/opacity motion, reduced motion), dev-only `/dev/tokens/` gallery; `motion` deferred.

## 2026-10-21 — Upgrade to Next 16 and adopt the module layout

- Spec: [specs/feature-f01-upgrade-and-harness.md](../specs/feature-f01-upgrade-and-harness.md) · Roadmap: F-01
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/2 (f4f38d6); context: https://github.com/Dienvm/logistics-context/pull/7
- Owner: both
- Summary: Next 16.4.2/React 19.3.1 with Cache Components; Biome 2, Zod 4 and Node ≥ 22; the ADR 0005 layout enforced by dependency-cruiser; typed env; build inputs moved into the app's `data/`; ADR 0006 (JS budget = framework baseline 134.3 KiB + ≤ 50 KiB app JS).

## 2026-10-21 — Untrack secrets and strip the demo template

- Spec: [specs/feature-f00-security-template-cleanup.md](../specs/feature-f00-security-template-cleanup.md) · Roadmap: F-00
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/1 (afff9ab)
- Owner: app
- Summary: the template's tracked `.env` and demo code (Clerk and PostHog on public pages, todo/auth/marketing routes, Stripe env) are gone; gitleaks runs in CI and pre-commit, and the site is a private `noindex` placeholder.
