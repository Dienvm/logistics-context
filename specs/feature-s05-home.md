---
title: Build the home page from database data
type: feature
status: draft
owner_repo: both
roadmap: S-05
priority: must-have
blocked_by_questions: [Q-01, Q-02, Q-03, Q-04, Q-05, Q-06, Q-07, Q-11, Q-12, Q-22, Q-23, Q-25, Q-26]
updated: 2026-10-22
---

## Feature: Build the home page from database data

### Problem Statement

`/` and `/en/` still show the F-03 placeholder (`home.title` plus `home.underConstruction`). The home page is where paid and organic traffic first lands, and it is the main route into the route pages and the Zalo CTA (AGENTS.md §1).

Roadmap S-05 (`docs/context/10-roadmap.md`) asks for the home page per `03-information-architecture.md` "Home". *Accept:* H1 present; route bento from DB; no carousel above the fold; LCP image ≤ 150 KB.

The shell (S-01) and the contact tracker (S-02) are done, so the page can now be composed from real data.

### Proposed Solution

A visitor opening `/` (VI) or `/en/` (EN) sees eight sections in the order from `03` "Home". Each section is server-rendered, and any fact that isn't published yet is hidden:

1. **Hero.**
   - Contents:
     - the H1 promise and a short sub-line (no numbers);
     - a route picker: native links to the route pages, no JS;
     - the Zalo and Gọi CTAs through `/go/[channel]` with `placement=hero`;
     - one real photo through `next/image` with `priority`.
   - There is no carousel, and the LCP element is never animated.
2. **Route bento.**
   - One card per active route, built from `routes` and `route_rates`.
   - Each card shows the flag, name, "Từ X đ/kg" and "Y–Z ngày", or "Liên hệ" when the price is hidden.
   - The first route by `sort` is the featured card and spans 2 columns from 768 px.
3. **Why us.** Four reasons, rewritten neutrally with no numbers or guarantees.
4. **Process.** Four steps, rewritten neutrally.
5. **Proof.** Real team/warehouse photos, plus testimonials that have consent.
6. **New-customer offer band.** Shown only when the offer is active and verified.
7. **Latest guides.** The three newest published posts, shown only when any exist.
8. **Offices.** One card per office (name, address, hours) with a "Xem bản đồ" link to Google Maps. There is no map image or iframe.

Fact rules:

- **Production:** unverified prices, transit times, offices, hours, reasons, process and offer are not rendered.
- **Preview** (`PREVIEW_UNVERIFIED=1` under `next dev` / a Vercel preview): they render with the "chưa xác nhận" badge.
- **Empty sections:** a section left with nothing to show renders nothing, including its heading.

### Acceptance Criteria

**Page and SEO**
- [ ] Given `/` or `/en/`, when the page renders, then it has exactly one `<h1>`.
  - The H1 is `page_translations.h1` of the `home` page in that locale when that translation is `published`. Otherwise it is `messages` `home.hero.title`.
  - The placeholder text (`home.underConstruction`) is gone from both `messages` files.
- [ ] `generateMetadata`:
  - title and description come from `page_translations.seo_title` / `seo_description` when the translation is published, else from `metadata.homeTitle` / `homeDescription`;
  - canonical is `/` (VI) and `/en/` (EN);
  - `alternates.languages` is built as today (`languageAlternates("/")`);
  - the site-wide `robots: { index: false }` from the root layout stays until L-01.
- [ ] The home page emits JSON-LD through `modules/seo` `JsonLd`:
  - `WebSite` with `name`, `url` and `inLanguage`;
  - `Organization` with `name` (brand) and `url`. `legalName`/`taxID` are added only when `site_settings.company` is verified (Q-01); `contactPoint` only when `contact` is verified (Q-06); `sameAs` only when `social` is verified. No `logo` until Q-11;
  - one `LocalBusiness` per office only when `offices` is verified (Q-02), with `openingHours` only when `hours` is verified (Q-03).
  - In preview mode the JSON-LD still omits unverified fields: preview badges are for humans, never for structured data.
  - The output validates in the Schema.org validator with 0 errors.
- [ ] No breadcrumbs on home (AGENTS.md rule 4).
- [ ] There is no carousel, slider or auto-rotating element anywhere on the page. No `<iframe>` (no Google Maps embed).

**Hero**
- [ ] Given the hero:
  - the H1 and sub-line come from `messages` (`home.hero.*`) or the published `page_translations`, with no number, price, time, "24/7" or count in them;
  - the Zalo and Gọi CTAs are `ContactLink` with `placement="hero"`;
  - `hero` is added to `CONTACT_PLACEMENTS` (`modules/contact/constants.ts`), so `/go` stores `placement = hero`.
- [ ] The route picker is a server-rendered list of links (no client JS) to each active outbound route that has a page link from `content` `getRouteLinks(locale)`.
  - Links to unpublished route pages use `prefetch={false}`, as in the S-01 mega menu.
  - A "Tính cước" link appears only when the calculator page (`CALCULATOR_PAGE_KEY`) is published.
- [ ] The hero image:
  - is one real legacy photo (`SEE_5157`, already used on the old home page, `data/media-inventory.csv`);
  - is pre-optimised into `public/` and rendered with `next/image` (`priority`, `sizes`, AVIF/WebP via the Next optimiser, explicit `width`/`height`);
  - has VI/EN `alt` text from `messages`;
  - transfers ≤ 150 KB at a 1280 px viewport (the LCP image);
  - is not rendered with text in it (rule 3).
- [ ] `public/hero.png`, an unreferenced 349 KB template leftover, is removed.

**Route bento**
- [ ] Given the active routes from `routes` `listNavRoutes(locale)`, the bento shows one card per active route in `sort` order: outbound first, then inbound.
  - Each card has the flag (`shared/ui/flags`), the route name, and the price/days lines decided by the same rule as the mega menu:
    - the price shows only when visibility is not `hidden`, `prices_public` is true and `getFromPrices()` has a value;
    - otherwise the card shows "Liên hệ";
    - days show only when visible and `transit_days_min` is set.
  - The card links to the route page when `getRouteLinks` has one. Unpublished pages use `prefetch={false}`. A route with no page renders as a non-link card.
- [ ] The route card markup is extracted from `modules/pricing/ui/route-cards.tsx`, so the mega menu and the bento share one card (no duplicated visibility logic). The mega menu renders exactly as before.
- [ ] Given `PREVIEW_UNVERIFIED` is off on a production build with the default seed (all routes unverified), every card shows "Liên hệ" and no days, and the HTML/RSC payload contains no seeded price or day value. Under `dev:local` the same cards show the seeded values with the "chưa xác nhận" badge.

**Why us, Process, Offer**
- [ ] "Why us" (4 items) and "Process" (4 steps) copy lives in `messages/{vi,en}.json` (`home.reasons.*`, `home.process.*`).
  - It is rewritten from `01-business.md` themes (air/sea, speed, clear pricing, simple paperwork; process from `01:62`) with no numbers, durations, prices or guarantees.
  - Until the owner approves it (Q-26), both sections are gated by `factVisibility({ isVerified: false })`: hidden in production, badged in preview.
  - The gate lives in one constant (e.g. `HOME_COPY_APPROVED = false` in the module's `constants.ts`), so approving the copy is a one-line change.
- [ ] The offer band renders only when `site_settings.offers.newCustomer.active` is true and the setting is visible under the fact-visibility rule.
  - Its text is `offers.newCustomer.text`.
  - With the default seed (`active: false`), it renders nothing in every mode (Q-07).

**Proof, Guides, Offices**
- [ ] Proof photos (legacy `SEE_5122` / `SEE_5124` / `SEE_5184`, team/warehouse) are pre-optimised in `public/` and rendered lazily with `next/image` and VI/EN `alt`.
  - Testimonials render only rows with `status = 'published'` and `consent_at IS NOT NULL`, through a new `content` query. No seeded rows means no testimonial cards.
  - If both photos and testimonials are absent, the section renders nothing.
- [ ] Latest guides lists up to 3 `posts` with `status = 'published'` in the locale, newest `published_at` first, through a new cached `content` query.
  - With zero published posts (the default seed), the section renders nothing.
- [ ] Offices: one card per `site_settings.offices` entry, under the fact-visibility rule (hidden in production while unverified, Q-02).
  - Each card has the name, the address lines, the hours (only when `hours` is visible, Q-03) and a "Xem bản đồ" link.
  - The link is `https://www.google.com/maps/search/?api=1&query=<encoded address>`, built from the address, with `rel="noopener"`. No coordinates are invented.

**Shared quality**
- [ ] Every new string exists in `messages/vi.json` and `messages/en.json`; `pnpm i18n:check` passes.
- [ ] Sections use the `04` tokens:
  - alternating `bg` / `bg-subtle`;
  - cards with a 2 px border and `shadow-brand-offset`;
  - the H1 in `display-xl`, the only uppercase element;
  - no uppercase buttons or menus (rule 11);
  - 44 px tap targets and a visible focus ring.
- [ ] Motion: at most a CSS hero entrance on non-LCP elements (transform/opacity, token `slower`). It is disabled under `prefers-reduced-motion`. `motion` is not installed.
- [ ] Reads are cached module queries (`"use cache"` + `cacheTag`): existing `menu`/`settings`/pricing tags, plus new `page:home` and `posts`/`testimonials` tags in `content` `constants.ts`. `app/[locale]/(site)/page.tsx` stays thin: `getPageLocale()`, module calls, composition.

**Budget and checks**
- [ ] `/` and `/en/` stay within the ADR 0006 JS budget (`pnpm perf:report` in CI), with no new client island; record the delta vs `main`.
- [ ] Lighthouse mobile on `/` and `/en/` (production build, consent rejected) gives Performance ≥ 90, SEO 100 and Accessibility ≥ 95, with LCP < 2.5 s and CLS < 0.1 recorded. A budget or score miss blocks the PR.
- [ ] `pnpm lint && pnpm typecheck && pnpm check:boundaries && pnpm tokens:check && pnpm i18n:check && pnpm build` pass, and `pnpm check:redirects` reports 0 FAIL.

**Context**
- [ ] `docs/context/11-open-questions.md` gains:
  - **Q-25:** may the legacy photos `SEE_5122/5124/5157/5184` be used, and are they current? If not, send replacements;
  - **Q-26:** approve the rewritten "Why us" and "Process" copy.

### Scope

**In scope:**
- the home page for `/` and `/en/` with the eight sections above;
- the shared route card extracted for the mega menu and the bento;
- home JSON-LD builders (`WebSite`, `Organization`, `LocalBusiness`) as pure functions in `modules/seo/domain`;
- new `content` queries: home page translation, latest posts, consented testimonials;
- the `hero` placement;
- optimised legacy photos in `public/`;
- removal of `public/hero.png`;
- `messages` keys;
- Q-25 and Q-26 in `11-open-questions.md`.

**Out of scope:**
- the price engine and calculator (S-03, S-07): the picker only links;
- route page templates (S-04): route links 404 until S-04 publishes them;
- generic `buildMetadata`, the layout-wide `WebSite`/`Organization`, `sitemap.ts` and `robots.ts` (S-10);
- the blog list and article routes (S-11), so guide links resolve only after S-11;
- the page blocks renderer and admin editing (A-03);
- media library and Storage (A-04);
- testimonial admin (A-05);
- the stats band, partner logos and trust strip (Q-23, Q-08; not in `03` Home);
- the consent banner, GTM, PostHog and the `select_route` event (S-13);
- the Q-07 offer copy;
- removing site-wide `noindex` (L-01).

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | page | `app/[locale]/(site)/page.tsx` (rewrite: thin composition + `generateMetadata`) |
| app | module UI | `modules/content/ui/home/*` (new: `home-hero.tsx`, `route-picker.tsx`, `home-reasons.tsx`, `home-process.tsx`, `home-proof.tsx`, `offer-band.tsx`, `latest-guides.tsx`, `office-cards.tsx`, `home-page.tsx`) |
| app | module | `modules/content/infrastructure/queries.ts` (home translation, latest posts, consented testimonials), `modules/content/constants.ts` (tags, `HOME_COPY_APPROVED`), `modules/content/index.ts` |
| app | module UI | `modules/pricing/ui/route-cards.tsx` (extract card), `modules/pricing/ui/route-card.tsx` and `route-bento.tsx` (new), `modules/pricing/index.ts` (append exports; S-03 also appends) |
| app | module | `modules/seo/domain/home-json-ld.ts` (new, pure), `modules/seo/index.ts` |
| app | module | `modules/contact/constants.ts` (`hero` placement) |
| app | assets | `public/images/home/*` (new optimised photos), `public/hero.png` (delete) |
| app | messages | `messages/vi.json`, `messages/en.json` (`home.*`) |
| context | doc | `docs/context/11-open-questions.md` (Q-25, Q-26), `docs/context/05-seo-and-tracking.md` (`hero` placement, home JSON-LD fields gated by verification) |

### Golden-rule checks

- **1–2. Facts:**
  - Prices and days come only from `route_rates`/`routes` via the existing from-price rule.
  - Offices, hours, company, contact and the offer come from `site_settings` under fact visibility.
  - Reasons and process are gated until Q-26.
  - There are no stats, counts, "24/7", insurance or delivery promises (AGENTS.md §10).
- **3. No text in images:** the photos carry no headline. The H1, prices and country names are HTML.
- **4. Page requirements:** one H1, `generateMetadata` with canonical + hreflang, JSON-LD, no breadcrumbs (home), and a Zalo CTA in the hero.
- **6. Server-only DB:** every query is in `infrastructure/`. The page adds no client islands beyond the existing `ContactLink`.
- **8. Performance:**
  - `next/image` everywhere;
  - the LCP image ≤ 150 KB with `priority`;
  - no carousel and no Maps iframe;
  - no new client JS.
- **9. Motion:** transform/opacity only, never on the LCP image or H1, reduced motion respected.
- **10–11. Accessibility and typography:**
  - labelled links;
  - `alt` from `messages`;
  - 44 px targets and token colours;
  - body line-height ≥ 1.6, no uppercase buttons.
- **12. Contact tracking:** hero CTAs go through `/go/[channel]` with `placement=hero`.
- **14. Personal data:** testimonials only with `consent_at`; no customer screenshots in this task.

### Dependencies & Risks

**Depends on:**
- S-01 (shell, `RouteCards`, fact visibility, `dev:local`);
- S-02 (`/go`, `ContactLink` placement);
- F-04 (tables, seed).
- Stack gaps that stay open: S-10 SEO infra (this spec adds only the home JSON-LD builders), A-04 Storage (photos are static `public/` assets until then), S-13 (no consent/tracking fan-out).

**Parallel work:** S-03 (price engine) is in flight in another worktree.
- It owns the new pure files in `modules/pricing/domain/` and may add `modules/pricing/client.ts`.
- S-05 adds no price logic and no files in `modules/pricing/domain/`, and keeps the existing `getFromPrice`.
- Both branches append to `modules/pricing/index.ts`, so expect a trivial merge.

**Blocked by questions (placeholders, ADR 0004):**
- **Q-04 / Q-05 / Q-22**, prices and active routes unverified: cards show "Liên hệ" in production.
- **Q-02 / Q-03**, offices and hours: the Offices section and `LocalBusiness` are hidden in production.
- **Q-01 / Q-06 / Q-11**, legal name, contact and logo: the `Organization` JSON-LD carries only brand and URL.
- **Q-06**, contact: hero CTAs 404 in production until it is verified (S-02 behaviour). This is on the L-01 checklist.
- **Q-07**, offer: the band is hidden.
- **Q-12**, testimonial consent: no testimonial cards.
- **Q-23**, stats: no stats band.
- **Q-25** (new), photos: the legacy photos are used. They were already public on the old site, and the owner can confirm or replace them.
- **Q-26** (new), reasons and process copy: hidden in production until approved.

**Risks:**
- With the default seed, production home is thin: hero, a bento of "Liên hệ" cards, and proof photos. That is intended until the owner answers. Review the page under `dev:local` as well.
- The legacy photo must come from the public site URL in `data/media-inventory.csv` or the local backup, read-only. Copy only that one file. Never copy other backup content (AGENTS.md §2).
- The 150 KB LCP bound depends on the optimiser's AVIF quality and `sizes`. Measure the transferred bytes, not the source file.
- Route and guide links 404 until S-04 and S-11. Unpublished route pages are not prefetched, and guides are hidden while no posts are published.

### Manual Verification Plan

**Seed needs:** the default seed (all routes, settings and pages unverified or draft; no posts or testimonials). Run against:
- `pnpm dev:local` (preview on);
- a production build: `pnpm build && pnpm start -p 3100`, with `DATABASE_URL` pointing at the local DB and the preview flag unset.

Stop servers by port (`lsof -ti tcp:3100 | xargs kill`). Never use `pkill -f next-server`: the S-03 session runs a server on 3200.

**Steps:**
1. **Production build, `/` and `/en/`:**
   - exactly one `<h1>` (`document.querySelectorAll('h1').length === 1`);
   - no `home.underConstruction` text;
   - every bento card shows "Liên hệ" and no days;
   - `curl -s localhost:3100/ | grep -E '[0-9]{2,3}\.[0-9]{3} đ'` finds no seeded price in the HTML;
   - Offices, Why us, Process, Offer, Guides and Testimonials are absent (not even headings);
   - the hero, the route picker and the proof photos are present.
2. **`dev:local`:** cards show the seeded "Từ X đ/kg" and days with the "chưa xác nhận" badge. Offices, Why us and Process show with badges. The offer stays hidden (`active: false`).
3. **Temporary local DB edits, then revert:**
   - `routes.is_verified = true` for `sg`: its card shows the price on the production build after restart;
   - publish one `posts` row (VI): Guides shows 1 card on `/` but not on `/en/`;
   - insert one `testimonials` row without `consent_at`: not shown. With `consent_at` and published: shown.
4. **JSON-LD:**
   - copy the `application/ld+json` blocks from `/` (production): `WebSite` and `Organization` (brand + URL only), no `LocalBusiness`;
   - with `offices` + `hours` verified locally: two `LocalBusiness` objects with `openingHours`;
   - validate both states in the Schema.org validator with 0 errors;
   - in `dev:local` the JSON-LD still has no unverified fields.
5. **Hero CTA:** click Zalo in the hero (preview). The `contact_events` row has `placement = 'hero'`, and the `dataLayer` push has `placement: "hero"`.
6. **Route picker and mega menu:**
   - the route picker has no client JS: `view-source` shows plain `<a>`, and with JS disabled the links work;
   - the mega menu renders the same cards as on `main`: compare 1280 px screenshots of the open menu.
7. **LCP image:** DevTools Network at 1280 px shows the transferred hero image ≤ 150 KB (AVIF/WebP) and `fetchpriority=high`. The Lighthouse LCP element is the hero image or the H1.
8. **Viewports:** 360 / 768 / 1280 px, VI and EN:
   - no horizontal scroll;
   - the featured bento card spans 2 columns from 768 px;
   - keyboard Tab reaches the hero CTAs, picker links and cards with a visible focus ring;
   - with `prefers-reduced-motion: reduce` nothing animates.
9. **axe:** scan at 360 and 1280 px on `/` and `/en/`: 0 serious/critical issues.
10. **Lighthouse** (mobile, production build, no consent cookie): Performance ≥ 90, SEO 100, Accessibility ≥ 95. Record LCP, CLS and TBT, plus the `perf:report` JS delta vs `main`.

**Validation commands:** `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build`, `check:redirects` (0 FAIL) and `perf:report`. No automated tests (ADR 0004).

### Implementation Hints

- Reuse the S-01 visibility pattern: `factVisibility` + `FactValue`, decided on the server, so hidden values never reach the HTML/RSC payload.
- Extract the route card's markup and props into `route-card.tsx`, and keep `NavigationMenuLink` only in the mega-menu wrapper (`asChild` around the shared card, or the card rendering its own `Link`).
- Optimise the photos once, offline (e.g. `sharp` CLI or `squoosh`, around 1600 px wide WebP) into `public/images/home/`. The Next optimiser then serves AVIF/WebP per `sizes`. Use static imports for intrinsic dimensions, which avoid CLS.
- The JSON-LD builders are pure functions taking typed settings plus the visibility decisions. Keep `@context` in one place, and render through `JsonLd`.
- The page must not render its own `<main>`: the `(site)` layout already does.
- No lessons are flagged (the lessons index is empty).

### Related

- Roadmap: `docs/context/10-roadmap.md` S-05.
- Docs:
  - `docs/context/03-information-architecture.md` "Home";
  - `04-design-system.md` (RouteBento, RouteCard, CtaBand, ProofGallery, motion);
  - `05-seo-and-tracking.md` (JSON-LD per page type, performance);
  - `07-data-model.md` (`page_translations`, `posts`, `testimonials`, `site_settings`);
  - `01-business.md`;
  - `11-open-questions.md`.
- ADRs: 0004 (placeholders, manual verification), 0005 (modules), 0006 (Cache Components, JS budget).
- Proposal: `docs/proposals/nextjs-rebuild-quynam-pattern.md` (draft; it proposes a 10-section home with stats/rate preview/message wall). Not adopted here; `03` stays the spec.
- Specs:
  - `specs/feature-s01-site-layout-shell.md` (shell, `RouteCards`, fact visibility);
  - `specs/feature-s02-contact-tracker.md` (placements, `/go`).
- Follow-ups: S-04 (route pages), S-07 (calculator), S-10 (generic metadata, layout JSON-LD), S-11 (guides), A-03 (blocks), A-04 (media), A-05 (testimonials), L-01 (CTAs/noindex).
