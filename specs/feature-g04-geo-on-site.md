---
title: Make public pages quotable and discoverable by AI assistants
type: feature
status: draft
owner_repo: app
roadmap: G-04
priority: must-have
blocked_by_questions: [Q-01, Q-11, Q-23, Q-31]
updated: 2026-10-30
---

## Feature: Make public pages quotable and discoverable by AI assistants

### Problem Statement

ADR 0011 makes GEO part of the SEO lane: AI assistants (ChatGPT search, Google AI Overviews / AI Mode / Gemini, Perplexity, Copilot, Claude) must be able to find 43logistics.vn, tell what the company is, and quote correct, dated facts. The 2026-10-30 audit (`docs/proposals/geo-ai-assistant-visibility.md`) found:

- the `Organization` node exists only on home, without a logo and with Facebook as the only `sameAs`;
- route pages have no `WebPage` node and no page-level `dateModified`;
- there is no short, quotable summary under the route `<h1>`;
- `/hang-cam-gui/` has no per-country summary or `ItemList`, and route pages don't link to their country's section;
- there is no Bing verification and no IndexNow ping, so Bing (used in part by ChatGPT search and Copilot) learns about changes only from the sitemap;
- there is no `/llms.txt`.

Roadmap row G-04 (`docs/context/10-roadmap.md`, Phase 5b).

### Proposed Solution

For visitors and crawlers:

1. **Every public page** describes the same company entity: one `Organization` node with a stable `@id`, the logo, and verified profile links, aliases, topics, legal data and founding year when the owner has confirmed them in `/admin/settings/`.
2. **Route pages** open with a 2–3 sentence summary paragraph under the `<h1>`: from-price, transit, methods, origin places and the update date, generated from the active rate cards. Route pages also gain a `WebPage` node whose `dateModified` reflects the latest change to the page, its cards or its FAQs.
3. **`/hang-cam-gui/`** shows one generated summary sentence per country and emits an `ItemList`. Each route page links to its country's section.
4. **Search engines are told about changes:** a Bing verification meta tag, and an IndexNow ping when staff publish, change, unpublish or delete public content. Both are switched off until their env vars are set.
5. **`/llms.txt`** lists the indexable pages, with their canonical URLs and descriptions, in VI and EN.

For staff: the existing Company and Social forms in `/admin/settings/` gain fields for aliases, topics, founding year and extra profile URLs, gated by the existing per-key "verified" checkbox.

### Acceptance Criteria

**Entity graph (ADR 0011 Decision 3)**

- [ ] **AC-01** Given any public page (VI or EN: home, route, hub, calculator, goods, blog index and post, about, contact, policy), when its HTML is fetched, then it contains exactly one `Organization` node, with `@id` `https://43logistics.vn/#organization`, `name`, `url` and `logo`. The logo is the absolute URL of `public/images/brand/logo-256.webp`. The page also contains exactly one `WebSite` node with `@id` `https://43logistics.vn/#website` and `publisher` → the Organization `@id`.
- [ ] **AC-02** Given the home page and blog posts, when their JSON-LD is read, then they no longer build their own `Organization` or `WebSite` node. `LocalBusiness` nodes stay on home, about and contact. `BlogPosting` `author` and `publisher` reference `{"@id": "https://43logistics.vn/#organization"}`.
- [ ] **AC-03** Given `company` is **not** verified, when any page renders, then the Organization has no `legalName`, `taxID`, `alternateName`, `knowsAbout` or `foundingDate`.
- [ ] **AC-04** Given `company` is verified, when a page renders, then each of these properties appears only when its own value is non-empty: `legalName`, `taxID`, `alternateName` (`company.alternateNames`), `knowsAbout` (the page locale's list in `company.knowsAbout`), and `foundingDate` (`company.foundingYear`, as `"YYYY"`).
- [ ] **AC-05** Given `social` is verified, when a page renders, then `sameAs` lists every non-empty URL among `facebook`, `zaloOa`, `googleBusiness`, `youtube` and `tiktok`, in that order. Given `social` is not verified, then there is no `sameAs`.
- [ ] **AC-06** `contactPoint` keeps today's rule: only when `contact` is verified.
- [ ] **AC-07** `areaServed` on the Organization lists the countries of the active, published routes (deduplicated, as `Country` nodes).

**Route pages (Decisions 3–4)**

- [ ] **AC-08** Given a published route page, when its JSON-LD is read, then its graph contains a `WebPage` node with:
  - `@id` `{canonical}#webpage`, `url`, `name` (the `<h1>` text) and `inLanguage`;
  - `isPartOf` → `#website` and `mainEntity` → `{canonical}#service`;
  - `dateModified` = the latest of the page translation's `updated_at`, `RoutePricing.updatedAt` and the `updated_at` of its published FAQs, as an ISO 8601 string. When none of the three exists, `dateModified` is omitted.
  `Service` never carries `dateModified`.
- [ ] **AC-09** Given a route with a shown from-price, shown transit and live cards, when the page renders, then a `<p>` directly after the `<h1>` (inside the hero, before the hero facts) reads, with ICU messages in both locales:
  - VI: "Gửi hàng đi Singapore từ {giá}/kg, thời gian {min}–{max} ngày, bằng {phương thức}, nhận hàng tại {nơi nhận}. Bảng giá cập nhật {ngày}."
  - EN: "Ship to Singapore from {price}/kg in {min}–{max} days by {methods}, with drop-off at {places}. Rates updated {date}."
  Values come from `getRoutePricing` (`shownFromPrice`, `shownTransit`, `summary.methods`, `updatedAt`) and the distinct `placeLabel` values of the live cards in the page locale. Inbound routes use the inbound wording ("Gửi hàng từ {nước} về Việt Nam…" / "Ship from {country} to Vietnam…").
- [ ] **AC-10** Given one of those facts is hidden (unverified, no live card, "Liên hệ"), when the page renders, then only that clause is dropped and the sentence stays grammatical. Given price, transit and methods are all hidden, then the paragraph is not rendered. The paragraph contains no link and no number that isn't in the rate cards (rule 2).
- [ ] **AC-11** Given the summary paragraph, when the page is checked at 360/768/1280 px, then the `<h1>` is still the LCP candidate and the paragraph adds no client JS.

**Prohibited goods (Decision 4)**

- [ ] **AC-12** Given `/hang-cam-gui/` (and `/en/prohibited-items/`), when it renders, then each country section (`#hang-{routeKey}`, unchanged) starts with one generated sentence built from its approved `goods_rules`. VI example: "Singapore: {n} nhóm hàng cấm gửi, {m} nhóm hạn chế, {k} nhóm gửi được, ví dụ cấm: {a}, {b}, {c}." Rules:
  - counts are per `kind` (`prohibited`, `restricted`, `allowed`);
  - examples are up to 3 prohibited item names in display order;
  - zero-count clauses are dropped;
  - a country with no approved rules has no sentence.
- [ ] **AC-13** Given the same page, when its JSON-LD is read, then it contains, besides `BreadcrumbList`, a `WebPage` and an `ItemList`. The `ItemList` has one `ListItem` per country section, with `name` = country and `url` = `{canonical}#hang-{routeKey}`.
- [ ] **AC-14** Given a route page whose route has approved goods rules, when the goods section renders, then it ends with a link "Xem đầy đủ hàng cấm và hạn chế gửi đi {nước}" / "See all prohibited and restricted items for {country}" to the localized goods page `#hang-{routeKey}`. Without approved rules, there is no link.

**Admin settings (Decision 3)**

- [ ] **AC-15** Given an admin opens Company in `/admin/settings/`, then it has three new fields:
  - "Tên gọi khác" (alternate names, up to 5, each 2–60 characters);
  - "Năm thành lập" (an integer from 1990 to the current year, optional);
  - "Lĩnh vực chuyên môn" (topics, VI and EN lists, up to 8 each, each 2–60 characters).
  Social gains `zaloOa`, `googleBusiness`, `youtube` and `tiktok`: optional `https` URLs. The write schemas reject out-of-range values with `fieldErrors`, and the existing per-key verified checkbox gates them.
- [ ] **AC-16** Given a stored `company` or `social` value saved before this change (without the new fields), when it is read, then it parses and the new fields count as empty. No migration; `pnpm db:seed` behaviour is unchanged.

**Discovery (Decision 5)**

- [ ] **AC-17** Given `BING_SITE_VERIFICATION` is set, when any public page renders, then `<meta name="msvalidate.01" content="…">` is present. Unset → absent.
- [ ] **AC-18** Given `INDEXNOW_KEY` is set (8–128 characters, `[A-Za-z0-9-]`), when `GET /indexnow-key.txt` is requested, then it answers `200 text/plain` with exactly the key, in one hop (no redirect). Unset → `404`.
- [ ] **AC-19** Given `INDEXNOW_KEY` is set **and** the origin is the production origin (`isIndexableSite()`), when a successful admin action changes public content, then exactly one `POST https://api.indexnow.org/indexnow` is sent from `after()` with `{host, key, keyLocation, urlList}`. The `urlList` per change is:

  | Change | URLs submitted |
  | --- | --- |
  | Page translation saved, or page status changed (publish, unpublish) | that page's canonical URL in the affected locale |
  | Post created, saved, published, unpublished or deleted | the post URL in each affected locale + the blog index in the same locale |
  | FAQ saved or deleted | the canonical URL(s) of its target page |
  | Rate card, column, band, policy or surcharge link saved, deleted or moved; route facts updated | the route page (VI + EN) + the hub that lists it + home + calculator (VI + EN each) |
  | Goods rule saved or deleted | `/hang-cam-gui/` + `/en/prohibited-items/` + the route page (VI + EN) |

  Only URLs that are public **now** are submitted, plus the removed URL on unpublish or delete. Draft-only saves submit nothing. The list is deduplicated, made absolute and capped at 100.
- [ ] **AC-20** Given IndexNow is unset, or the origin is not production (local, `next dev`, preview), when an admin action runs, then no request is sent. Given the IndexNow request fails or exceeds 5 s, then the error is logged once (no URL list, no key in the log), there is no retry, and the action's `ActionState` and timing are unchanged.

**llms.txt (Decision 5)**

- [ ] **AC-21** Given the production origin, when `GET /llms.txt` is requested, then it answers `200 text/plain; charset=utf-8` in one hop with:
  - a `# 43 Logistics` title and a one-line description (chrome copy in `messages/*`, no facts);
  - sections for routes, hubs, guides and policies (VI), then the same under `## English`;
  - one line per page in `listSitemapPages()`: `- [title](canonical URL): seo_description`.
  A locale's line appears only when that translation is published and not `noindex`; the description is omitted when empty.
- [ ] **AC-22** Given a non-production origin, when `/llms.txt` is requested, then it answers `404`.

**Crawl policy (Decision 2)**

- [ ] **AC-23** `robots.txt` output is unchanged. No user agent is disallowed beyond today's private paths. `robots.ts` gains a comment that it is the only source of crawl rules (ADR 0011). The Cloudflare check belongs to L-00b.

**Quality**

- [ ] **AC-24** Every changed page type validates with zero errors in the Schema.org validator (and the Rich Results Test for route pages once public). No property is emitted from an unverified value, and preview mode (`PREVIEW_UNVERIFIED=1`) never changes JSON-LD.
- [ ] **AC-25** `pnpm lint`, `typecheck`, `check:boundaries`, `i18n:check`, `build` and `check:redirects` pass. The app-JS delta of route, goods and home is unchanged (± 0.5 KB gz) against `main`. Lighthouse mobile SEO is 100 and accessibility ≥ 95 on a route page and `/hang-cam-gui/`.

### Scope

**In scope:**

- Sitewide `Organization` + `WebSite` graph; home and blog dedup; route `WebPage` with aggregated `dateModified`.
- Route summary paragraph (VI + EN messages).
- Goods page per-country sentence + `ItemList` + `WebPage`; route → goods deep link.
- Company and Social settings fields (schemas, admin form fields, readers).
- Bing verification meta, IndexNow key route + submitter wired into the admin actions listed in AC-19.
- `/llms.txt`.
- `.env.example`, `06-architecture.md` env table, `05-seo-and-tracking.md` "AI assistants (GEO)" (mark the items as built).

**Out of scope:**

- Cloudflare dashboard settings and the robots-through-edge check (L-00b).
- The "AI assistant" source group and the prompt panel (G-05).
- Writing or publishing FAQs, route copy or the About page (C-02, C-03, C-05).
- Off-site profiles (G-01–G-03).
- Pinging on settings changes. Sitewide entity changes reach crawlers through normal recrawl; submitting every URL on a settings save is avoided.
- OG images (`next/og`), hub/home summary paragraphs, `FAQPage` changes, a vector logo (Q-11), and any DB migration.

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | seo domain | `modules/seo/domain/organization-json-ld.ts` (new: `buildOrganization`, `buildWebSite`), `home-json-ld.ts` (drop org/website), `blog-posting-json-ld.ts` (org by `@id`), `route-json-ld.ts` (+ `WebPage`, `dateModified`), `web-page-json-ld.ts` (optional `@id`), `goods-json-ld.ts` (new: `ItemList`) |
| app | seo ui | `modules/seo/ui/site-json-ld.tsx` (new), `verified-business.ts` (new fields), `route-json-ld.tsx`, `home-json-ld.tsx`, `blog-json-ld.tsx`, `goods-json-ld.tsx` (new) |
| app | seo application | `modules/seo/application/site-metadata.ts` (`verification.other["msvalidate.01"]`), `indexnow.ts` (new: `submitIndexNow`, eligibility + URL building), `llms-txt.ts` (new), `crawl-files.ts` (comment) |
| app | seo domain | `modules/seo/domain/indexnow-payload.ts`, `llms-txt.ts` (new, pure builders) |
| app | layout | `app/[locale]/(site)/layout.tsx` (render `SiteJsonLd` once) |
| app | route handlers | `app/indexnow-key.txt/route.ts`, `app/llms.txt/route.ts` (new; outside `[locale]`, dotted paths bypass `proxy.ts`) |
| app | pricing ui | `modules/pricing/ui/route-hero.tsx` (summary slot), `modules/pricing/ui/route-summary-text.tsx` (new), `modules/pricing/domain/route-summary-sentence.ts` (new, pure clause selection) |
| app | content infra | `modules/content/infrastructure/route-page-queries.ts` (`listRoutePageRecords` + `updatedAt`, `listRouteFaqs` + `updatedAt`) |
| app | goods | `modules/goods/domain/goods-summary.ts` (new, pure counts/examples), `modules/goods/ui/goods-catalog.tsx` (sentence), `modules/goods/ui/goods-rules.tsx` or `modules/content/ui/route/route-goods-section.tsx` (deep link), `app/[locale]/(site)/[slug]/goods-view.tsx` (JSON-LD) |
| app | settings | `modules/settings/domain/settings.ts` (types), `modules/settings/application/setting-write-schemas.ts` (fields, limits), the Company/Social admin form components under `modules/settings/ui/admin/` |
| app | actions (IndexNow hook) | `modules/content/actions.ts` (`finish`), `modules/content/post-action-runner.ts`, `modules/content/faq-actions.ts`, `modules/pricing/card-action-runner.ts`, `modules/pricing/actions.ts` (`invalidateRoute`), `modules/pricing/surcharge-actions.ts`, `modules/routes/actions.ts`, `modules/goods/actions.ts` |
| app | config | `shared/config/env.server.ts` (`BING_SITE_VERIFICATION`, `INDEXNOW_KEY` via `optionalEnv`), `.env.example` |
| app | messages | `messages/vi.json`, `messages/en.json` (`routeSummary.*`, `goodsSummary.*`, `goods.seeAll`, `llms.*`, admin field labels) |
| context | docs | `docs/context/05-seo-and-tracking.md`, `docs/context/06-architecture.md` (env table), `docs/context/07-data-model.md` (`site_settings` value shapes) |

### Golden-rule checks

- **Rules 1–2 (facts):** every entity property is gated by its key's `is_verified`. The summary and goods sentences read only rate cards and approved goods rules. Hidden facts drop their clause and are never replaced with a number.
- **Rule 4:** one `<h1>` unchanged; JSON-LD per page type extended; metadata only gains the verification tag.
- **Rule 6:** IndexNow and llms.txt run server-side; the key is a server env var (it is public by design once served at `/indexnow-key.txt`, but it never ships in client JS).
- **Rule 7:** admin actions keep `requireRole` first; the IndexNow call runs only after a successful write.
- **Rule 8:** no client islands; JSON-LD is about 1–2 KB HTML per page (estimate); the JS delta is recorded (AC-25).
- **Rule 10:** the summary paragraph and the deep link use token colours, the link has a visible focus ring and a ≥ 44 px target.
- **Rule 11:** body line-height ≥ 1.6, no uppercase.
- **Rule 13:** new root paths (`/llms.txt`, `/indexnow-key.txt`) don't collide with `redirect-map.csv`; `check:redirects` stays 0 FAIL.
- **Rule 14:** no new cookies or client requests; IndexNow sends only public URLs; logs never include lead or user data.
- **Rule 15:** `.env.example` gets the names only.

### Dependencies & Risks

- **Depends on:** S-04 (route template, `RouteJsonLd`), S-10 (sitemap, robots, `isIndexableSite`), S-12 (goods catalog), A-02b (rate cards, `RoutePricing.updatedAt`), A-05/A-09 (FAQ targets, settings forms and per-key verification), ADR 0011. No stack gap from AGENTS.md §3.
- **Blocked by questions (placeholders, ADR 0004):**
  - Q-01: `legalName`/`taxID` are omitted until `company` is verified with values.
  - Q-11: the raster logo is used meanwhile.
  - Q-23: no `foundingDate`.
  - Q-31: no aliases, topics or extra profiles until confirmed; the Bing account/env stays unset. The code ships with these switched off.
- **Risks:**
  - Moving `Organization` into the site layout must not duplicate nodes on home (AC-02).
  - A page that renders both `SiteJsonLd` and a page graph must keep the `@id` references consistent.
  - The IndexNow hook touches about 10 action runners. Put the URL resolution in one place (`modules/seo` `submitIndexNow` taking typed change events) so each runner adds one line. Watch the `seo` → `content`/`routes`/`settings` dependency direction: actions in `content`/`pricing`/`goods` must not import `seo` if that creates a cycle. If `seo` already depends on `content`, expose the submitter through `shared/` or a small port passed by the action runner. Decide in implementation and record it in the PR.
  - `RoutePricing.updatedAt` reflects cards and rates, not surcharge-list edits. That is accepted; the visible "Cập nhật" date already uses it.

### Manual Verification Plan

- **Seed needs:** the production Supabase data (local dev = production DB, see memory). Use the SG and KR routes (verified, live cards) and one inbound route. For AC-04/05, save test values with "verified" ticked in `/admin/settings/` locally, observe, then **restore the original values and verified state** (these are live writes).
- **Steps:**
  1. `pnpm -C 43logistics.vn build && pnpm -C 43logistics.vn start -p 3100`.
  2. For `/`, `/en/`, `/gui-hang-di-singapore/`, `/en/shipping-to-singapore/`, `/gui-hang-tu-singapore-ve-viet-nam/`, `/hang-cam-gui/`, `/kinh-nghiem/top-5-luu-y-gui-hang-sang-singapore/`, `/gioi-thieu/`, `/chinh-sach-bao-mat/`:
     - extract every `application/ld+json` block (a `curl` + script);
     - confirm one `Organization` and one `WebSite` with the fixed `@id`s (AC-01/02);
     - on route pages, check `WebPage` and `dateModified` (AC-08);
     - on the goods page, check `ItemList` URLs match the section ids (AC-13).
  3. Paste each page's JSON-LD into validator.schema.org: 0 errors (AC-24).
  4. With `company`/`social` unverified, confirm the absent properties (AC-03/05). Tick verified with test aliases and URLs, reload after the `updateTag`, confirm the presence and order (AC-04/05), then restore.
  5. Route summary:
     - read the paragraph on SG (VI/EN), KR and the inbound route against the rate-card section values (AC-09);
     - on a route showing "Liên hệ" (e.g. an unverified or gap route), confirm the dropped clauses (AC-10).
     - 360/768/1280 px screenshots; keyboard tab to the goods deep link; axe at 360 and 1280: 0 serious/critical.
  6. Goods page: compare each sentence's counts with the visible lists for SG, KR and US (AC-12); click a route-page deep link and land on the right section (AC-14).
  7. Admin: enter an invalid founding year (1800), a 61-character alias and an `http://` URL, and confirm the `fieldErrors` (AC-15). An old stored value still loads (AC-16).
  8. Env:
     - with `BING_SITE_VERIFICATION=test123`, confirm the meta tag (AC-17);
     - with `INDEXNOW_KEY=…`, `curl -i /indexnow-key.txt` → 200 body = key; unset → 404 (AC-18).
  9. IndexNow locally (non-production origin):
     - save a FAQ and confirm no outbound request (AC-20; log line or a temporary debug env);
     - verify the URL list for each change type by calling the pure payload builder with the AC-19 table cases (a `tsx` one-off printed to the console, like `pnpm price:examples`);
     - record the outputs in the PR.
  10. `curl -i http://localhost:3100/llms.txt` with `NEXT_PUBLIC_SITE_URL` = production origin → 200 with the sections; with a local origin → 404 (AC-21/22). Confirm no draft or `noindex` page appears.
  11. `curl /robots.txt` is unchanged against `main` (AC-23).
  12. Lighthouse mobile (consent rejected) on `/gui-hang-di-singapore/` and `/hang-cam-gui/`: SEO 100, a11y ≥ 95, JS delta against `main` (AC-25). Add the `lighthouse` label to the PR.
- **Validation commands:** `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `i18n:check`, `build`, `check:redirects`. No automated tests (ADR 0004). The consent matrix is not needed (no consent, tracking, proxy or lead changes).

### Implementation Hints

- `getVerifiedBusiness` (`modules/seo/ui/verified-business.ts:32`) already centralises the verified reads. Extend it rather than reading settings in new places.
- `nonEmpty()` (`modules/seo/domain/local-business.ts:38`) drops null and empty properties; reuse it for the Organization builder.
- `listRouteFaqs` and `listRoutePageRecords` are `"use cache"` with tags. Adding `updatedAt` to their selects keeps the same tags, so admin edits still invalidate them.
- `after()` is already used in `modules/leads/actions.ts:91`; follow that pattern. Use `AbortSignal.timeout(5000)`.
- Dotted root paths skip `proxy.ts` (matcher in `proxy.ts:117`), and `trailingSlash: true` doesn't redirect files with an extension. Confirm both with `curl -i` (one hop, AC-18/21).
- Lesson `s08-lead-form` (lessons/INDEX.md): list every file a new field threads through (settings type → write schema → form → reader → JSON-LD) in the PR, and run `lint:fix` only on touched files.
- Message ICU: build the summary from optional clause keys (`routeSummary.price`, `.transit`, `.methods`, `.places`, `.updated`) joined in a pure function, not one giant select, so a dropped clause never leaves stray punctuation.

### Related

- Roadmap: G-04 (`docs/context/10-roadmap.md` Phase 5b); G-05 (measurement), L-00b (edge check), C-02 (FAQ content).
- ADR 0011 (decisions 2–5), ADR 0004, ADR 0006, ADR 0010.
- `docs/proposals/geo-ai-assistant-visibility.md` (audit, superseded by ADR 0011).
- `docs/context/05-seo-and-tracking.md` "AI assistants (GEO, ADR 0011)", "Structured data".
- Specs: `feature-s04-route-page-template.md` (JSON-LD rules), `feature-a05-a09-admin-lists-settings.md` (settings forms, verification), `feature-s10`-era sitemap (no spec; PR #33), `feature-a02b-rate-cards-public.md` (`updatedAt`, summaries).
- Lessons: `s08-lead-form`.
