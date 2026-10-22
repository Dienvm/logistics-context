---
title: Build the route pages from database data
type: feature
status: in_implementation
owner_repo: both
roadmap: S-04
branch: feat/s04-route-pages
implementation_pr: https://github.com/Dienvm/43logistics.vn/pull/17
priority: must-have
blocked_by_questions: [Q-02, Q-03, Q-04, Q-05, Q-08, Q-09, Q-10, Q-25]
updated: 2026-10-22
---

## Feature: Build the route pages from database data

### Problem Statement

The route pages are the paid- and organic-traffic landing pages: "gửi hàng đi Singapore / Hàn Quốc / …" and "gửi hàng Singapore về Việt Nam" (AGENTS.md §1, goal 2). Today every route URL 404s:

- `app/[locale]/(site)/[...rest]/page.tsx` calls `notFound()`;
- the 8 route pages are seeded as `draft`;
- the new home page (S-05b) links each route card and picker chip to a route page;
- 15 rows of `data/redirect-map.csv` target route URLs and report `PENDING` (404) in `pnpm check:redirects`.

Roadmap S-04 (`docs/context/10-roadmap.md`) asks for one template with the `03` sections, metadata, JSON-LD (`Service`/`Offer`, `BreadcrumbList`, `FAQPage`) and an OG image. *Accept:* 7 outbound + SG→VN render from DB; unverified routes show "Liên hệ" instead of prices; Lighthouse mobile ≥ 90/100/95.

### Owner decisions (in session, 2026-10-22)

- **Order: S-03 first.** The price engine (`specs/feature-s03-price-engine.md`) is implemented before S-04, and S-04 includes the mini calculator built on its client API.
- **Publishing:** the owner confirms the route pages for publication in **VI and EN**: 7 outbound + SG→VN. Publication is recorded in `data/owner-confirmations.json` (new `pages` list) and applied by `pnpm db:confirm`, like the facts in S-05b. The seed still never publishes anything.
- **Sections without data are hidden** (rule 1): goods rules, FAQ, compensation summary (Q-09), carriers (Q-08), route testimonials, and the inbound warehouse/services blocks (Q-02, Q-05). Nothing is invented to fill them.
- Codex review is skipped for this spec.

### Proposed Solution

A visitor opening `/gui-hang-di-singapore/` (or `/en/shipping-to-singapore/`) sees one server-rendered template, in this order (`03` "Outbound route page", in the S-05b visual system):

1. **Hero:**
   - breadcrumb `Trang chủ › {route name}`, plus a middle hub crumb only when the hub page is published;
   - H1 "Gửi hàng đi {country}" (published `page_translations.h1`, else a messages pattern);
   - the destination photo (or flag fallback);
   - fact chips: from-price, transit days, flight schedule and methods;
   - Zalo + "Gọi {hotline}" CTAs that carry `route={key}`.
2. **Mini calculator** (client island): weight (kg) plus optional L×W×H, method fixed to the route's methods (a select only when there are several). The result is computed by the S-03 engine from rates embedded as props. It shows chargeable weight, band, total and the Zalo CTA, or "Liên hệ" with the engine's reason.
3. **Rate table** from `route_rates`:
   - weight band, price per kg or flat price, "Liên hệ" for contact bands;
   - "Cập nhật {date}" from the newest band's `updated_at`;
   - a table at ≥ 768 px, stacked cards below.
4. **How the price is calculated:** actual vs volumetric weight with the route's own divisor, and the rounding step only when the route has one. Text comes from messages with the numbers interpolated from `routes`.
5. **Process:** the four approved home steps (Q-27), reused.
6. **Goods rules:** allowed / restricted / prohibited from `goods_rules` (route + global), approved rows only. Hidden while empty.
7. **Methods:** the route's `methods` as labelled chips. Carriers are hidden (Q-08).
8. **Compensation:** a link to `/chinh-sach-den-bu/` only. The summary is hidden (Q-09).
9. **FAQ:** published `faqs` for the route, as native `<details>` plus `FAQPage` JSON-LD. Hidden while empty.
10. **Testimonials:** consented, published rows for the route. Hidden while empty.
11. **Related routes:** the other active routes as cards (same direction first). Related guides appear when posts with this `route_id` are published.
12. **Closing CTA band** with the offices (the S-05b band, generalised).

The **inbound** page (`/gui-hang-tu-singapore-ve-viet-nam/`) uses the same template:

- `prices_public = false` and an unverified route show "Liên hệ";
- the rate table and calculator are replaced by the CTA;
- inbound-only blocks stay hidden until their facts exist (Q-02, Q-05).

**Fact rules (unchanged from S-01/S-05):**

- Unverified or non-public prices and days never reach HTML, RSC or the calculator props in production. They are badged in preview.
- `transit_note` and `flight_schedule` are Vietnamese-only DB text: they render on VI pages only. EN pages show nothing in their place (no VI fallback on EN).

### Acceptance Criteria

**Routing and publication**
- [ ] Given a published route page translation, when `/{vi-slug}/` or `/en/{en-slug}/` is requested, then the template renders with HTTP 200.
  - These are the 8 pages: `gui-hang-di-{singapore,malaysia,han-quoc,dai-loan,nhat-ban,thai-lan,my}` and `gui-hang-tu-singapore-ve-viet-nam`, and their EN slugs from `03` "Route registry".
  - A draft page, an unknown slug, a non-route page slug, or an inactive route returns the localized 404.
- [ ] `generateStaticParams` returns the published route pages per locale. The pages are statically generated with `"use cache"` queries tagged `pageTag(key)` + `routeTag(key)` + `MENU_TAG`, so an A-02/A-03 edit invalidates them.
- [ ] `data/owner-confirmations.json` gains a `pages` list (the 8 `route-*` keys, both locales). `pnpm db:confirm` sets `pages.status` and the listed `page_translations.status` to `published` in the same transaction, and fails with nothing changed if a key is missing. Re-running it is idempotent.
- [ ] `pnpm check:redirects` against the candidate build reports the 15 route-target rows as **PASS**, in one hop; overall 0 FAIL.

**SEO**
- [ ] Each route page has exactly one `<h1>`.
- [ ] `generateMetadata`:
  - title/description from the published `seo_title`/`seo_description`, else the `05` patterns ("Gửi hàng đi {Nước} từ {min}đ/kg – {days} ngày"). `{min}` and `{days}` are included only when that fact is shown under the fact rule; otherwise the pattern drops that clause;
  - canonical is the page's own localized URL;
  - `alternates.languages` lists `vi`, `en` and `x-default` only when both translations are published.
- [ ] Breadcrumbs (`modules/seo` `Breadcrumbs` + `BreadcrumbList` JSON-LD) on every route page.
- [ ] JSON-LD:
  - a `Service` { serviceType, provider → the Organization `@id`, areaServed `Country` };
  - its `offers`: an `Offer` with `UnitPriceSpecification` (price, VND, unitCode KGM), present only when the from-price is shown (verified + public + eligible). Never in preview from unverified data;
  - `FAQPage` only when FAQ rows render;
  - validates with 0 errors.
- [ ] OG image `app/[locale]/(site)/[slug]/opengraph-image.tsx` (`next/og`, 1200×630):
  - shows the flag, "Gửi hàng đi {Nước}" and the logo;
  - "từ {min}đ/kg" only under the same rule as the `Offer`;
  - the page's `og:image` points to it.

**Facts and sections**
- [ ] With the default seed **plus** `db:confirm` (7 outbound routes verified, SG→VN not):
  - each outbound page shows its from-price, days, schedule (VI only), methods and the full rate table;
  - SG→VN shows "Liên hệ" with no rate table and no calculator.
- [ ] With every route unverified (fixture), no outbound page's HTML or RSC contains any seeded price (raw or formatted) or day range. The rate table and calculator are replaced by "Liên hệ" plus CTAs. In `dev:local` the same values show with the "chưa xác nhận" badge.
- [ ] Rate table:
  - bands sorted by method then `weight_min_kg`;
  - open-ended bands read "Trên {min} kg";
  - flat bands show the flat total, per-kg bands "{price}/kg", contact bands "Liên hệ";
  - `valid_to` in the past hides that band;
  - one `<table>` with `<caption>` at ≥ 768 px and a list of cards below, from the same data (no duplicated logic).
- [ ] Mini calculator:
  - computes with the S-03 client API (`modules/pricing/client.ts`), so the results equal `pnpm price:examples` for the S-03 worked examples (US 1.3 kg → 1.5 kg; SG 5 kg / 6 kg band edge; SG volumetric 2 kg at 40×30×30 → 7.2 kg; KR 150 kg → "Liên hệ");
  - it receives only rates the page already shows (no unverified bands in production props);
  - inputs are labelled, and errors are announced (`aria-live`).
- [ ] Contact CTAs go through `/go/[channel]` with `route={key}` (`contact_events.route_id` set), with placements:
  - `hero` for the hero;
  - `rate_table` under the rate table;
  - `calculator` in the calculator result;
  - `cta_band` for the closing band.

  `rate_table` and `calculator` are added to `CONTACT_PLACEMENTS`.
- [ ] Hidden-when-empty sections (goods, FAQ, testimonials, related guides, inbound blocks) render nothing, heading included, with the default seed.
- [ ] Every new string exists in `messages/vi.json` and `messages/en.json` (`pnpm i18n:check`).

**Budget and checks**
- [ ] The calculator is the only new client island. `/gui-hang-di-singapore/` and `/en/shipping-to-singapore/` are added to `data/perf-budget.json` and stay within the ADR 0006 budget (≤ 50 KiB app JS over the 134.3 KiB baseline). The delta vs the home page is recorded.
- [ ] Lighthouse mobile on `/gui-hang-di-singapore/` and `/en/shipping-to-singapore/` (production build, consent rejected), median of 3:
  - Performance ≥ 90, Accessibility ≥ 95;
  - SEO 100 except the site-wide `is-crawlable` (`noindex` until L-01, S-01 precedent);
  - LCP, CLS and TBT recorded.
- [ ] axe 0 serious/critical at 360 / 768 / 1280 on one outbound and the inbound page, VI and EN; no horizontal overflow; keyboard reaches every CTA, calculator input and FAQ toggle with a visible focus ring; reduced motion respected.
- [ ] `pnpm lint && pnpm typecheck && pnpm check:boundaries && pnpm tokens:check && pnpm i18n:check && pnpm build` pass.

**Context**
- [ ] `03` route page "as built" notes (hidden sections and their Q-IDs, VI-only notes), the `05` placements (`rate_table`, `calculator`), and the `AGENTS.md` §7 `db:confirm` description (now also pages).

### Scope

**In scope:**
- one template for outbound + inbound;
- the route page query and route detail query;
- rates query + RateTable;
- the pricing-rules section;
- the mini calculator island on the S-03 API;
- route JSON-LD + metadata + breadcrumbs + OG image;
- related routes;
- page publication via `db:confirm`;
- new contact placements;
- messages;
- perf-budget entries.

**Out of scope:**
- the S-03 engine itself (implemented first, its own spec);
- `/tinh-cuoc/` and its Zustand store (S-07);
- hubs `/dich-vu/`, `/nhap-hang/` (S-06);
- `sitemap.ts`/`robots.ts` and the generic `buildMetadata` refactor (S-10, though S-04 may add a route-specific builder);
- writing FAQ, goods-rule, compensation, carrier or inbound-service copy (owner content: Q-08, Q-09, Q-10, Q-02, Q-05);
- the `select_route`/`calculate_quote` events (S-13);
- admin editing (A-02/A-03);
- removing `noindex` (L-01);
- applying `db:confirm` to Supabase (an owner-approved operation, run separately).

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | page | `app/[locale]/(site)/[slug]/page.tsx` (new: thin composition, `generateStaticParams`, `generateMetadata`); `app/[locale]/(site)/[slug]/opengraph-image.tsx` (new) |
| app | module content | `modules/content/infrastructure/route-page-queries.ts` (new: page by locale + slug, alternates, related guides), `modules/content/ui/route/*` (new sections), `modules/content/ui/home/home-cta-band.tsx` + `home-process.tsx` (generalise for reuse), `modules/content/index.ts` |
| app | module routes | `modules/routes/infrastructure/queries.ts` (route detail: methods, transit, schedule, note, divisor, rounding), `modules/routes/domain/*` |
| app | module pricing | `modules/pricing/infrastructure/queries.ts` (rates by route, eligibility-filtered), `modules/pricing/ui/rate-table.tsx`, `pricing-rules.tsx`, `mini-calculator.tsx` (client island), `modules/pricing/client.ts` + `index.ts` |
| app | module seo | `modules/seo/domain/route-json-ld.ts` (new, pure), `modules/seo/application/route-metadata.ts` (new), `modules/seo/index.ts` |
| app | module contact | `modules/contact/constants.ts` (`rate_table`, `calculator`), `modules/contact/ui/contact-ctas.tsx` (route key, placements) |
| app | module goods | `modules/goods/infrastructure/queries.ts` + `modules/goods/ui/goods-rules.tsx` (new, approved rows only) |
| app | data/scripts | `data/owner-confirmations.json` (`pages`), `scripts/confirm-facts.ts`, `data/perf-budget.json` |
| app | messages | `messages/vi.json`, `messages/en.json` (`routePage.*`, `rateTable.*`, `calculator.*`) |
| context | doc | `docs/context/03-information-architecture.md`, `docs/context/05-seo-and-tracking.md`, `AGENTS.md` §7 |

### Golden-rule checks

- **1–2. Facts:** prices only from `route_rates` via the S-01 eligibility rule and the S-03 engine; days, schedule, methods, divisor and rounding only from `routes`. Nothing is hard-coded in copy; message patterns interpolate DB values.
- **3. No text in images:** the OG image is the `next/og` exception, built from DB data.
- **4. Page requirements:** one H1, metadata with canonical and publication-aware hreflang, JSON-LD, breadcrumbs, a Zalo CTA.
- **5–6. Server first:** server queries only. The island receives plain serialisable props (bands already filtered).
- **8. Performance:** one island, budget measured; `StaticImage` (no `<Image>` client chunk); no carousel; no Maps iframe.
- **9–11. Motion, a11y, typography:** S-05b motion utilities only; labelled inputs; 44 px targets; no uppercase buttons.
- **12. Tracking:** every CTA through `/go/[channel]` with `route` and a placement.
- **13. Redirects:** the 15 route rows resolve in one hop.

### Dependencies & Risks

- **Depends on:** S-03 implemented and merged first (`modules/pricing/client.ts`, `quote`, mappers), plus S-01, S-02 and S-05b (visual system, `StaticImage`, `ContactCtas`, owner confirmations).
- **Blocked by questions (placeholders, ADR 0004):**
  - Q-04: VAT/insurance notes hidden, the rate table shows bands only;
  - Q-25: S-03 rounding/edges, so gaps show "Liên hệ";
  - Q-08: carriers hidden;
  - Q-09: the compensation summary is hidden and only the policy link shows;
  - Q-10: goods rules hidden until approved rows exist;
  - Q-02/Q-05: inbound warehouse/services blocks hidden;
  - Q-03: no "24/7".
- **Risks:**
  - `[slug]` vs `[...rest]` precedence: one-segment route URLs must hit `[slug]`, everything else keeps the localized 404.
  - Static generation must not prerender draft pages.
  - Calculator JS: the S-03 engine plus a small form must fit the budget next to the S-01 islands. Measure early.
  - The text LCP issue seen on home (font wait) may repeat on route H1s; reuse the S-05b font trim.
  - `db:confirm` now publishes pages: the script must stay keyed and reviewable, never "publish all".

### Manual Verification Plan

**Seed:** `pnpm db:local`, then `DATABASE_URL_DIRECT=$(scripts/db-local.sh --url) pnpm db:confirm`. This gives 7 verified outbound routes and the 8 pages published in VI/EN. Run on a production build (`pnpm build && pnpm start -p 3100`, rebuilt after every fixture change) and in `dev:local`.

| # | Check | Expected |
|---|-------|----------|
| 1 | `curl -I` all 16 URLs (8 VI + 8 EN) | 200; a draft page (set `route-sg` VI back to draft) → 404; `/gui-hang-di-khong-co/` → 404; `/lien-he/` (not a route page) unaffected |
| 2 | `/gui-hang-di-singapore/` at 1280 | one H1, from-price 57.000 đ/kg, 1–2 ngày, "Thứ 3-5-7 hàng tuần", rate table with 4 bands and "Cập nhật …"; EN page has no VI note or schedule |
| 3 | Calculator: SG 5 kg; SG 6 kg; SG 2 kg + 40×30×30; US 1.3 kg; US 0.8 kg; KR 150 kg | 750.000 đ; 528.000 đ; 7,2 kg → 633.600 đ; chargeable 1,5 kg → "Liên hệ" (`no_band`, S-03 rule 8); 1,0 kg → 1.227.963 đ (flat); "Liên hệ" (`contact_band`) |
| 4 | Fixture: `update routes set is_verified=false` (rebuild) | no seeded price or day in HTML/RSC (grep raw and formatted); "Liên hệ" + CTAs; JSON-LD has no `Offer`; `dev:local` shows badged values |
| 5 | SG→VN page | "Liên hệ", no table, no calculator, inbound blocks absent |
| 6 | JSON-LD (Schema.org validator) on SG and SG→VN | `Service` (+ `Offer` on SG only), `BreadcrumbList`; 0 errors |
| 7 | hreflang | both published → vi/en/x-default reciprocal; set the EN translation to draft → none on VI, EN 404 |
| 8 | `/go` links | hero/rate table/calculator/band CTAs carry `route=sg` and their placement; one click → `contact_events` row with `route_id` and `placement` |
| 9 | OG image `/gui-hang-di-singapore/opengraph-image` | 1200×630 PNG with flag, title, "từ 57.000đ/kg"; with the route unverified, no price |
| 10 | `pnpm check:redirects --base http://localhost:3100` | the 15 route rows PASS, 0 FAIL |
| 11 | axe at 360/768/1280, keyboard, reduced motion, overflow | 0 serious/critical; focus rings; no overflow |
| 12 | `pnpm perf:report` with the two route URLs added + Lighthouse 3 runs | within the JS budget; Performance ≥ 90, Accessibility ≥ 95 (median) |

**Validation commands:** `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build`, `check:redirects`, `perf:report`. No automated tests (ADR 0004).

### Implementation Hints

- **Routing:** `app/[locale]/(site)/[slug]/page.tsx` resolves `page_translations (locale, slug)` → page with `route_id`. Anything else calls `notFound()`. Keep `[...rest]` for deeper paths.
- **Reuse:**
  - `getRouteCardEntries` / the S-01 visibility rule for hero facts;
  - `RouteTilePhoto` and `ROUTE_PHOTOS` for the hero photo;
  - `ContactCtas` (add `routeKey`);
  - `HomeCtaBand` / `OfficeList` → a shared closing band;
  - `HomeSection`, `SectionHeading`, the S-05b motion utilities.
- **Pass to the island only what it needs:** route key, method list, divisor, rounding step, and the eligible bands as numbers. Never the whole row. The S-03 mappers turn `numeric` strings into grams/VND on the server.
- **Lessons:** `[[scripted-edits-after-biome]]` (assert replacements); the PR #14 lesson: push review fixes before merging.

### Related

- Roadmap S-04; `03` "Outbound route page", "Inbound route page", "Route registry"; `05` metadata patterns, JSON-LD, OG.
- `07` routes / route_rates / goods_rules / faqs / testimonials.
- Specs: `feature-s03-price-engine.md` (dependency), `feature-s05-home.md`, `feature-s05b-home-redesign.md`, `feature-s01-site-layout-shell.md`, `feature-s02-contact-tracker.md`.
- ADRs 0004, 0005, 0006.
- Proposal `nextjs-rebuild-quynam-pattern.md` §2 (route page order, not adopted wholesale).
