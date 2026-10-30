---
title: Make public pages quotable and discoverable by AI assistants
type: feature
status: approved
owner_repo: both
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
- [ ] **AC-09** Given a route with visible facts and live cards, when the page renders, then a `<p>` directly after the `<h1>` (inside the hero, before the hero facts) reads, with ICU messages in both locales:
  - VI: "Gửi hàng đi Singapore: đường bay từ {giá}/kg, đường biển từ {giá}/kg; thời gian {min}–{max} ngày; nhận hàng tại {nơi nhận}. Bảng giá cập nhật {ngày}. Nhắn Zalo để được báo giá theo cân nặng thực tế."
  - EN: "Shipping to Singapore: air from {price}/kg, sea from {price}/kg; {min}–{max} days; drop-off at {places}. Rates updated {date}. Message us on Zalo for a quote for your exact weight."
  The values come from these sources:
  - **Per-method from-price:** a new pure `getMethodFromPrices(cards, today)` next to `getRouteSummary` (`modules/pricing/domain/route-summary.ts`). It returns the lowest live from-price of each method, in **that card's currency**, formatted by the existing `formatPricePerKg`. A price is never shown under a method it doesn't belong to.
  - **Transit:** `shownTransit`.
  - **Origin places:** the distinct `placeLabel` values of the live cards in the page locale (owner-confirmed rate-card data, A-02b).
  - **Date:** `RoutePricing.updatedAt`.
  - **Order guidance:** chrome copy in `messages/*`. It is plain text with no link; the hero Zalo CTA stays the tracked link (rule 12).
  Inbound routes use the inbound wording ("Gửi hàng từ {nước} về Việt Nam: …" / "Shipping from {country} to Vietnam: …").
- [ ] **AC-10** Given a fact is hidden (route unverified, prices not public, no live card for a method, a method whose from-price is "Liên hệ"), when the page renders, then only that clause is dropped and the sentence stays grammatical. With a single visible method, the sentence names just that one. When every price, transit and place clause is hidden, the paragraph is not rendered (the order-guidance sentence never renders alone). The paragraph contains no link and no number that isn't in the rate cards (rule 2). Preview mode (`PREVIEW_UNVERIFIED=1`) shows the same clauses the route body shows, with the existing badge rule.
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
- [ ] **AC-16** Given a stored `company` or `social` value saved before this change (without the new fields), when it is read, then it parses and the new fields count as empty. The read-side schemas in `modules/settings/infrastructure/setting-values.ts` gain the new optional fields (they strip unknown keys today), so a value saved in the admin survives the save → read → JSON-LD round trip. No migration; `pnpm db:seed` behaviour is unchanged.

**Discovery (Decision 5)**

- [ ] **AC-17** Given `BING_SITE_VERIFICATION` is set, when any public page renders, then `<meta name="msvalidate.01" content="…">` is present. Unset → absent.
- [ ] **AC-18** Given `INDEXNOW_KEY` is set (8–128 characters, `[A-Za-z0-9-]`), when `GET /indexnow-key.txt` is requested, then it answers `200 text/plain` with exactly the key, in one hop (no redirect). Unset → `404`.
- [ ] **AC-19** **Gate:** a ping is sent only when all three hold:
  - `INDEXNOW_KEY` is set (it is set only in the VPS production env, `deploy/env.template`);
  - `NODE_ENV === "production"`;
  - `isIndexableSite(NEXT_PUBLIC_SITE_URL)`.

  When a successful admin action changes public content, exactly one `POST` goes to `INDEXNOW_ENDPOINT` (default `https://api.indexnow.org/indexnow`; overridable only for local verification), from `after()`, with `{host, key, keyLocation, urlList}`.

  **Eligibility:** the set of submittable URLs is the `sitemap.ts` eligibility: page and translation published, not `noindex`, active route for route pages, no `landing` pages, posts published per locale, home always. For each change, compute the eligible canonical URLs of the affected pages **before** and **after** the write, then submit their union. That covers newly eligible URLs, changed URLs that stay eligible, and URLs that just lost eligibility (unpublish, delete, `noindex` set, route deactivated), so engines recrawl them.

  Affected pages per change:

  | Change | Affected pages (each in every locale) |
  | --- | --- |
  | Page translation saved; page status changed | that page |
  | Post created, saved, status changed or deleted | that post + the blog index |
  | FAQ saved, retargeted or deleted | its old target page and its new target page |
  | Rate card, column, band, policy or surcharge link saved, deleted or moved; route facts or active flag updated | the route page + the hub that lists it + home + calculator |
  | Goods rule saved or deleted | the goods page + the route page |

  A save that leaves every affected URL ineligible both before and after (draft-only) submits nothing. The list is deduplicated, made absolute and capped at 100.
- [ ] **AC-20** When any gate condition fails (no key, `next dev`, a local `pnpm start` without the key, a non-production `NEXT_PUBLIC_SITE_URL`), an admin action sends no request. When the IndexNow request fails (non-2xx, network error) or exceeds 5 s (`AbortSignal.timeout(5000)`), the error is logged once with status or reason only (no URL list, no key). There is no retry, and the action returns its `ActionState` before the submission settles (it runs in `after()`).

**llms.txt (Decision 5)**

- [ ] **AC-21** Given the production origin, when `GET /llms.txt` is requested, then it answers `200 text/plain; charset=utf-8` in one hop with:
  - a `# 43 Logistics` title and a one-line description (chrome copy in `messages/*`, no facts);
  - VI sections, then the same sections under `## English`;
  - every URL of the sitemap appearing exactly once, as `- [title](canonical URL): description`.

  The lines come from a new enriched query, `listDiscoveryPages(locale)` in `modules/content`. It applies the **same eligibility as `listSitemapPages`** (including the home exception: home is always listed, with the messages title and description) and adds the page type, the title (`seo_title`, else `<h1>`) and `seo_description`. When the description is empty, the line ends after the URL.

  Section by page type:

  | Section | Page types |
  | --- | --- |
  | "Trang chính" / "Main pages" | home, about, contact |
  | "Tuyến gửi hàng" / "Shipping routes" | route pages |
  | "Bảng giá & công cụ" / "Rates & tools" | hubs, calculator, goods page |
  | "Hướng dẫn" / "Guides" | blog index, posts |
  | "Chính sách" / "Policies" | policy pages |

  A page type outside the table goes to "Trang chính" / "Main pages".
- [ ] **AC-22** Given a non-production origin, when `/llms.txt` is requested, then it answers `404`.

**Crawl policy (Decision 2)**

- [ ] **AC-23** `robots.txt` output is unchanged. No user agent is disallowed beyond today's private paths. `robots.ts` gains a comment that it is the only source of crawl rules (ADR 0011). The Cloudflare check belongs to L-00b.

**Quality**

- [ ] **AC-24** Every changed page type validates with zero errors in the Schema.org validator (and the Rich Results Test for route pages once public). No property is emitted from an unverified value, and preview mode (`PREVIEW_UNVERIFIED=1`) never changes JSON-LD.
- [ ] **AC-25** `pnpm lint`, `typecheck`, `check:boundaries`, `i18n:check`, `build` and `check:redirects` pass. The app-JS delta of `/`, `/gui-hang-di-singapore/` and `/hang-cam-gui/` is unchanged (± 0.5 KB gz) against `main`. Lighthouse mobile SEO is 100 and accessibility ≥ 95 on those three pages.

### Scope

**In scope:**

- Sitewide `Organization` + `WebSite` graph; home and blog dedup; route `WebPage` with aggregated `dateModified`.
- Route summary paragraph (VI + EN messages).
- Goods page per-country sentence + `ItemList` + `WebPage`; route → goods deep link.
- Company and Social settings fields (schemas, admin form fields, readers).
- Bing verification meta, IndexNow key route + submitter wired into the admin actions listed in AC-19.
- `/llms.txt`.
- App: `.env.example`, `deploy/env.template` (`INDEXNOW_KEY`, `BING_SITE_VERIFICATION`; `INDEXNOW_ENDPOINT` is not set in production).
- Context repo (same change set, separate PR): `05-seo-and-tracking.md` "AI assistants (GEO)" (mark the items as built), `06-architecture.md` env table, `07-data-model.md` (`site_settings` `company`/`social` value shapes).

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
| app | seo application | `modules/seo/application/site-metadata.ts` (`verification.other["msvalidate.01"]`), `indexnow.ts` (new: `submitIndexNow`, gate + before/after eligibility + URL building), `llms-txt.ts` (new), `crawl-files.ts` (comment) |
| app | content | `modules/content/application/list-discovery-pages.ts` + `infrastructure/sitemap-queries.ts` (new enriched query: type, title, description, with the sitemap eligibility); a per-page eligibility lookup that IndexNow uses before and after a write |
| app | pricing domain | `modules/pricing/domain/route-summary.ts` (`getMethodFromPrices`) |
| app | seo domain | `modules/seo/domain/indexnow-payload.ts`, `llms-txt.ts` (new, pure builders) |
| app | layout | `app/[locale]/(site)/layout.tsx` (render `SiteJsonLd` once) |
| app | route handlers | `app/indexnow-key.txt/route.ts`, `app/llms.txt/route.ts` (new; outside `[locale]`, dotted paths bypass `proxy.ts`) |
| app | pricing ui | `modules/pricing/ui/route-hero.tsx` (summary slot), `modules/pricing/ui/route-summary-text.tsx` (new), `modules/pricing/domain/route-summary-sentence.ts` (new, pure clause selection) |
| app | content infra | `modules/content/infrastructure/route-page-queries.ts` (`listRoutePageRecords` + `updatedAt`, `listRouteFaqs` + `updatedAt`) |
| app | goods | `modules/goods/domain/goods-summary.ts` (new, pure counts/examples), `modules/goods/ui/goods-catalog.tsx` (sentence), `modules/goods/ui/goods-rules.tsx` or `modules/content/ui/route/route-goods-section.tsx` (deep link), `app/[locale]/(site)/[slug]/goods-view.tsx` (JSON-LD) |
| app | settings | `modules/settings/domain/settings.ts` (types), `modules/settings/application/setting-write-schemas.ts` (fields, limits), `modules/settings/infrastructure/setting-values.ts` (read-side schemas: add the optional fields), `modules/settings/ui/admin/setting-form.tsx` / `flat-setting-form.tsx` / `setting-input.tsx` (Company and Social fields) |
| app | actions (IndexNow hook) | `modules/content/actions.ts` (`finish`), `modules/content/post-action-runner.ts`, `modules/content/faq-actions.ts`, `modules/pricing/card-action-runner.ts`, `modules/pricing/actions.ts` (`invalidateRoute`), `modules/pricing/surcharge-actions.ts`, `modules/routes/actions.ts`, `modules/goods/actions.ts` |
| app | config | `shared/config/env.server.ts` (`BING_SITE_VERIFICATION`, `INDEXNOW_KEY`, `INDEXNOW_ENDPOINT` via `optionalEnv`), `.env.example`, `deploy/env.template` |
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

- **Depends on:** S-04 (route template, `RouteJsonLd`), S-10 (sitemap, robots, `isIndexableSite`), S-12 (goods catalog), A-02b (rate cards, `RoutePricing.updatedAt`), ADR 0011. No framework gap from AGENTS.md §3.
- **Prerequisite not yet closed:** A-05/A-09 (FAQ targets, settings forms, per-key verification) is `in_implementation` (`specs/INDEX.md`). G-04 branches from an app `main` that contains the merged A-05/A-09 code. The deploy needs migration `0013` (`site_settings.updated_by`) applied on Supabase first (AGENTS.md §3). The PR records both as evidence: the A-05/A-09 merge commit and the date 0013 was applied. G-04 adds no migration.
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

**Data and safety.** Local dev normally points at the production Supabase. Any check that **writes** settings, verification state, FAQs, rate cards or goods rules runs against `pnpm db:local` (throwaway Postgres 17 on `localhost:54329`, migrated and seeded, never touching `.env`), with `DATABASE_URL` pointed at it for that shell only. Checks against production data are **read-only**. Synthetic aliases or URLs are never saved to the production DB.

**Builds.**
- **A:** `pnpm -C 43logistics.vn build && pnpm -C 43logistics.vn start -p 3100` against the production DB. Read-only checks.
- **B:** the same against `db:local`, with `NODE_ENV=production`, `NEXT_PUBLIC_SITE_URL=https://43logistics.vn`, `INDEXNOW_KEY=localtestkey123`, `INDEXNOW_ENDPOINT=http://127.0.0.1:4599/indexnow`, and `BING_SITE_VERIFICATION=test123`. A mock server (a 20-line `node` script in the scratchpad) logs each request body with a timestamp. It answers `200`, a `500`, or a reply after a 6 s delay, depending on a mode file.

**1. JSON-LD matrix (A, read-only; AC-01/02/07/08/13/24).** For each URL below, extract every `application/ld+json` block with `curl` + a script and record:
- the count of `Organization` (= 1) and `WebSite` (= 1) nodes, and their `@id`s;
- the page-type nodes;
- 0 errors in validator.schema.org.

| Page type | VI | EN |
| --- | --- | --- |
| Home | `/` | `/en/` |
| Route outbound | `/gui-hang-di-singapore/`, `/gui-hang-di-han-quoc/` | `/en/shipping-to-singapore/` |
| Route inbound | `/gui-hang-tu-singapore-ve-viet-nam/` | `/en/singapore-to-vietnam-shipping/` |
| Hubs | `/dich-vu/`, `/nhap-hang/` | `/en/services/` |
| Calculator | `/tinh-cuoc/` | `/en/shipping-calculator/` |
| Goods | `/hang-cam-gui/` | `/en/prohibited-items/` |
| Blog | `/kinh-nghiem/`, `/kinh-nghiem/top-5-luu-y-gui-hang-sang-singapore/` | `/en/guides/` |
| Info | `/gioi-thieu/`, `/lien-he/`, `/chinh-sach-bao-mat/` | `/en/contact/` |

**2. Verified gating and round trip (B; AC-03–06/15/16).**
1. With `company` and `social` unverified: confirm `legalName`, `taxID`, `alternateName`, `knowsAbout`, `foundingDate` and `sameAs` are absent on `/` and one route page.
2. In `/admin/settings/`, enter synthetic values: alias `Test Alias`; `foundingYear` 2020; topics VI/EN; `zaloOa`, `googleBusiness` and `youtube` URLs. Tick verified and save.
3. Reload and confirm each property and the `sameAs` order. Untick verified and confirm they disappear.
4. Invalid input gets `fieldErrors`: year 1800, a 61-character alias, an `http://` URL, a sixth alias.
5. Restore a pre-change value by SQL in `db:local` (a `company` JSON without the new keys) and confirm it loads in the admin and the site.

**3. Preview invariance (B; AC-10/24).** Run `pnpm dev:local` (`PREVIEW_UNVERIFIED=1`) on an unverified route. The JSON-LD equals the build-B output for the same data (diff the extracted blocks). The summary paragraph follows the body's preview badge rule.

**4. `dateModified` cases (B; AC-08).** On one route page, set known timestamps by SQL in `db:local`: translation T1, rate card T2, FAQ T3. Expect `dateModified` = max for each case:

| T1 | T2 | T3 | Expected |
| --- | --- | --- | --- |
| 2026-10-01 | 2026-10-05 | 2026-10-03 | 2026-10-05 |
| 2026-10-09 | 2026-10-05 | 2026-10-03 | 2026-10-09 |
| 2026-10-01 | 2026-10-05 | 2026-10-12 | 2026-10-12 |
| 2026-10-01 | 2026-10-05 | no FAQ | 2026-10-05 |

Revalidate the tags (or restart) between cases.

**5. Route summary (A read-only + B; AC-09–11).**
1. On SG (VI/EN), KR and the SG → VN inbound route, compare every clause with the rate-card section: per-method prices with their currency, transit, places, date.
2. In `db:local`, make one method's card non-live and confirm its clause drops. Set the route unverified and confirm the paragraph disappears (or shows only the allowed clauses in preview).
3. Take 360/768/1280 px screenshots and confirm the `<h1>` is the LCP element in the Lighthouse trace.

**6. Goods (A; AC-12–14).** For SG, KR and US, compare the sentence counts and examples with the visible lists. From the SG and KR route pages, tab to the deep link, press Enter, and land on `#hang-sg` / `#hang-kr`. Run axe at 360 and 1280 px on a route page and on `/hang-cam-gui/`: 0 serious/critical issues.

**7. Discovery meta and key (B; AC-17/18).**
1. `curl -s / | grep msvalidate.01` returns `test123`.
2. `curl -i /indexnow-key.txt` returns `200`, with the body = the key and no redirect.
3. Restart without `INDEXNOW_KEY`: it returns `404`.

**8. IndexNow wiring (B with the mock; AC-19/20).** Record the request count, the `urlList` and the action response time (browser network panel) for each case:

| # | Action in `/admin` | Expected mock requests | Expected `urlList` |
| --- | --- | --- | --- |
| a | Save a published route page translation (VI) | 1 | that page VI |
| b | Unpublish a published page | 1 | its URL(s) (just lost eligibility) |
| c | Save a draft-only page | 0 | — |
| d | Set `noindex` on a published page | 1 | its URL |
| e | Retarget a FAQ from route SG to route KR | 1 | SG + KR route pages, VI + EN |
| f | Save a rate band on SG | 1 | SG VI/EN + its hub + home + calculator, VI/EN |
| g | Delete a published post | 1 | post URL(s) + blog index |
| h | Save a goods rule for KR | 1 | goods page VI/EN + KR VI/EN |
| i | Mock mode `500` + case a | 1 + one log line with the status only | — |
| j | Mock mode delay 6 s + case a | 1, aborted at 5 s, one timeout log line; the action response arrives before the mock responds | — |
| k | Restart under `next dev`, or without the key, + case a | 0 | — |

**9. llms.txt (A and B; AC-21/22).**
1. Build B (production origin): `curl -i /llms.txt` returns `200 text/plain`, with every section of the table.
2. The set of URLs in the file equals the set in `/sitemap.xml` (diff by a script).
3. Unpublish a page in `db:local` and confirm it leaves both files.
4. A build with `NEXT_PUBLIC_SITE_URL=http://localhost:3100` returns `404`.

**10. robots (A; AC-23).** `curl /robots.txt` is byte-identical to `main`.

**11. Performance (A; AC-25).** Run Lighthouse mobile with consent rejected on `/`, `/gui-hang-di-singapore/` and `/hang-cam-gui/`. Record SEO, a11y, performance, LCP, CLS and the app-JS delta against `main`. Add the `lighthouse` label to the PR.

**Validation commands:** `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `i18n:check`, `build`, `check:redirects`. There are no automated tests (ADR 0004). The consent matrix isn't needed: no consent, tracking, proxy or lead changes.

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
