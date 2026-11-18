---
title: Stop AV and GT pages duplicating 43 in search
type: feature
status: approved
owner_repo: both
roadmap: G-07
priority: must-have
blocked_by_questions: [Q-03, Q-22]
codex_review: 2026-11-17, 12 findings, all applied after debate
updated: 2026-11-17
---

## Feature: Stop AV and GT pages duplicating 43 in search

### Problem Statement

Search Console shows pages that are not indexed on all three sites (owner, 2026-11-17). On 2026-11-17 the audit fetched every sitemap URL: 80 on 43, 78 on AV and 78 on GT. All are technically indexable. Each returns 200, has a self canonical, is not `noindex`, has one `<h1>` and has more than 250 words. Every URL variant (http, www, no trailing slash, `?page_id`) redirects in one hop. So the remaining "not indexed" causes are content, not markup.

The audit compared the `<main>` text of every AV page with the same path on 43. It used 8-word shingles, a Jaccard score, and brand names normalised. 49 of 74 shared paths score ≥ 0.50:

| AV page group | Score against 43 |
| --- | --- |
| Policy pages | 0.82–0.99 |
| VI route pages | 0.51–0.87 |
| Every EN page | 0.46–0.98 |
| Blog posts | < 0.30 (already rewritten) |

G-06 made only the head of each page unique: `<h1>`, title, description and intro. The body is still shared, including the FAQs, the notes and the goods lists. GT is cloned from the same rows. **Hypothesis (not yet proven):** Google indexes 43's copy and leaves AV and GT under "Crawled – currently not indexed" or "Duplicate, Google chose different canonical". The URL-level Search Console report was not available to the audit. The owner's screenshots of the "Why pages aren't indexed" table go into the PR when received, and AC-17's measurement makes the overlap reproducible. The GEO panel of 2026-11-11 shows the same gap: ChatGPT named AV or GT only on brand prompts and on none of the regional prompts (Huế, Quảng Trị, Quảng Bình, dry and frozen goods).

Roadmap row: G-07 in `docs/context/10-roadmap.md`. This follows G-06 (`specs/feature-g06-per-site-route-seo.md`), which put FAQs and body copy out of its own scope.

### Owner decisions (2026-11-17)

1. **English on AV and GT.** Keep the pages reachable, set them `noindex`, and remove them from the sitemap, hreflang, `/llms.txt` and IndexNow. 43 keeps its English pages indexed.
2. **Warehouses.** The six receiving warehouses are shared by 43, AV and GT: Đà Nẵng, TP.HCM, Hà Nội, Huế, Quảng Bình and Quảng Trị (Cửa Việt). AV and GT present them as the group's receiving points, not as their own branches. This is consistent with G-06 AC-05.
3. **GT nationwide.** GT may say it receives goods nationwide. Customers in other provinces send by domestic courier to the nearest warehouse.
4. **Frozen goods.** AV and GT accept frozen goods exactly where an approved goods rule allows it. Today that is Singapore, Malaysia and Thailand. Naming frozen goods on another route needs an approved rule first.
5. **Pickup section.** A "Nơi nhận hàng" section is generated from the site's verified warehouses, with a short lead sentence for each site.
6. **FAQs.** Each site has its own route FAQs, and a site shows only its own.
7. **Routes.** All active routes on AV and GT get the new content.

### Proposed Solution

**Visitors**
- On avlogistics.vn and gtlogistics.vn, the English pages still open and the language switcher still reaches them, but search engines are told not to index them. Search engines and AI assistants are pointed only at the Vietnamese pages.
- An AV or GT outbound route page gains a "Nơi nhận hàng" section. It has a lead sentence written for that site and lists the group's verified warehouses with their addresses. The page also shows FAQs written for that site: regions, dry and frozen goods, and how to send from another province. Price and transit questions keep coming from the rate cards.
- 43's pages do not change.

**Staff**
- In `/admin`, the FAQ list of a site holds that site's route FAQs, and a FAQ created there belongs to that site.
- The owner reviews the AV and GT FAQ and pickup copy in a dry run before it is written.

### Acceptance Criteria

**A. English indexing per site**

- [ ] **AC-01** Given `NEXT_PUBLIC_SITE` is `av` or `gt`, when any `/en/…` page renders, then:
  - its robots meta is `noindex, follow`;
  - its canonical is its own URL;
  - it emits no `<link rel="alternate" hreflang>`.

  This covers the home, hubs, route pages, info and policy pages, the calculator, the goods page, the blog index and blog posts.
- [ ] **AC-02** Given the same sites, when a VI page renders, then:
  - its indexability is the existing rule unchanged (production-origin gate, `page_translations.noindex`, landing-page and draft rules) AND the indexed-locale rule; an eligible VI page keeps `index, follow` and its self canonical;
  - it emits no `hreflang` alternates, so no `en` and no `x-default`.
  - **Negative cases:**
    - a VI translation with `noindex = true` stays `noindex` and out of the sitemap;
    - a build with a non-production `NEXT_PUBLIC_SITE_URL` stays `noindex` everywhere.
- [ ] **AC-03** On AV and GT:
  - `/sitemap.xml` lists only VI URLs and no `xhtml:link` alternates;
  - `/llms.txt` has no `## English` section and no `/en/` URL;
  - the IndexNow eligible paths (`modules/indexnow/infrastructure/eligible-paths.ts`) contain no `/en/` path;
  - `/en/guides/rss.xml` returns 404.
- [ ] **AC-04** On AV and GT, the language switcher on a page with a published EN translation still links to that page's EN equivalent, not only to the EN home. The EN page's switcher links back to its VI equivalent.
- [ ] **AC-05** On 43, compare the rendered sitemap, `/llms.txt`, robots meta and hreflang of `/`, `/gui-hang-di-singapore/`, `/en/shipping-to-singapore/` and one blog post before and after the change: they are byte-identical, except timestamps.
- [ ] **AC-06** The indexed locales are one build-time per-site constant in `shared/config/site.ts`, following the `INDEXES_BLOG_POSTS` pattern: `43l` is `["vi","en"]`, `av` and `gt` are `["vi"]`. Every surface in AC-01 to AC-03 reads it. No database `noindex` flag is written for this.

**B. "Nơi nhận hàng" section**

- [ ] **AC-07** A new optional route block type `pickup` with a `text` field (lead sentence) is accepted by `route-blocks.ts`. It can be edited in the admin route page editor like the other blocks, and at most one is allowed per page.
- [ ] **AC-08** Given an outbound route page whose translation has a `pickup` block, when it renders, then a section with an `<h2>` ("Nơi nhận hàng" in VI, "Where we receive goods" in EN, from `messages/*`) shows:
  - the lead text;
  - a list of every office in that site's `offices` setting, each with its display name and street address. The setting must be verified (`site_settings.is_verified`), which applies to the setting as a whole. Owner decision 2 makes all six offices shared receiving warehouses, so no per-office `isWarehouse` filter is used. The settings parser strips that field, and it stays unchanged.
- [ ] **AC-09** Given the `offices` setting unverified, missing, or an empty list, the section is not rendered, even when the block exists (rule 1). Inbound routes (`… về Việt Nam`) never render it.
- [ ] **AC-10** The section adds no client JavaScript and no new JSON-LD node. The `LocalBusiness` nodes stay limited by `ownOfficeKeys`, as in G-06.

**C. Per-site route FAQs**

- [ ] **AC-11** `listRouteFaqs` (`modules/content/infrastructure/route-page-queries.ts`) returns only FAQs whose `site` is the current site. On 43 the result is unchanged, because every existing route FAQ has `site = '43l'`. Check this before the change with `select site, count(*) from faqs where route_id is not null group by site`, and record the result in the PR.
- [ ] **AC-12** Each container's own `/admin` (avlogistics.vn/admin, gtlogistics.vn/admin, 43logistics.vn/admin; `currentSite` is fixed per build, as settings writes already are) handles site ownership as follows:
  - **Writes:** a FAQ created there is stored with `site = currentSite` on the `faqs` row and on every `faq_translations` row, and in the same transaction.
  - **Lookups:** the page and route target lookups in `faq-writes.ts` resolve within the current site.
  - **Other sites' ids:** an id belonging to another site is rejected on read, update and delete, and nothing is written.
  - **List:** the admin FAQ list stays filtered by site.
  - **Rollback:** a failed translation write rolls back the parent row.
- [ ] **AC-13** `mergeRouteFaqs` (`modules/content/domain/route-faq.ts`) is unchanged on every site:
  - derived FAQs come first;
  - a derived FAQ whose id is in `DERIVED_IDS_COVERED_BY_WRITTEN` is dropped when the route has written FAQs;
  - the site's written FAQs follow.

  The only change is that "written FAQs" now means the current site's own. The `FAQPage` JSON-LD lists exactly the visible questions.

**D. Loading the copy**

- [ ] **AC-14** `pnpm db:site-copy <site> --faqs` reads `data/seed/sites/<site>/copy-faqs.json`, with `av` in this repo and `gt` in `projects/gtlogistics.vn/`.
  - The file holds, per route key, 3–6 VI question and answer pairs and their EN translations, plus the `pickup` lead text in VI and EN.
  - Without `--apply`, it prints old and new values and writes nothing.
  - `--apply` backs up to `.backups/`, then inserts or updates that site's route FAQs (published) and the `pickup` block of that site's route translations. It never touches other sites' rows, other blocks, or `h1`/`seo_*` columns.
  - **Import identity:** the importer owns the whole route FAQ set of one site for each route key in the file.
    - A route's set is unchanged when its published FAQs for that site match the file in `sort`, question and answer for both locales.
    - Otherwise, after the backup, the set is replaced in one transaction: delete that site's route FAQs, then insert the file's FAQs with `sort` = file order and `created_at = updated_at`.
    - Questions removed from the file disappear, and changed wording replaces the row, so no duplicates are created.
  - **Staff edits:** a route is skipped when any of that site's FAQs for it has `updated_at > created_at`, meaning it was edited in the admin, or was not created by the importer. Pages with `admin_edited_at` are skipped for the `pickup` block. `--force` writes both. Every skip is listed.
  - **Skips must be resolved:** each skip gets a recorded disposition in the PR before acceptance, as in G-06 AC-09c: the current content already meets AC-15, or staff update it, or the owner approves `--force`.
  - A second `--apply` reports no change.
  - `43l` is rejected with a non-zero exit.
- [ ] **AC-15** The copy names only facts that are confirmed:
  - places from the site's verified warehouses (decision 2);
  - "nationwide" only on GT (decision 3);
  - "đồ khô" or "đồ đông lạnh" only on routes with an approved goods rule that allows it (decision 4);
  - no price, currency amount or transit time (rule 2);
  - no "24/7", insurance or delivery guarantee (§10).

  The dry-run output is reviewed by the owner before `--apply`, and that approval is recorded in the PR.
- [ ] **AC-16** The files cover every active outbound route on AV and on GT (16 each on 2026-11-17). Inbound routes get FAQs but no `pickup` block.

**E. Outcome**

- [ ] **AC-17** A new script `pnpm seo:similarity <originA> <originB>` (`scripts/similarity-report.ts`, app repo; added to AGENTS.md §7) measures every VI route path that is in both sites' sitemaps and prints one row per path. For each page it:
  1. fetches the page;
  2. takes the `<main>` element;
  3. removes `<script>`/`<style>` and tags;
  4. decodes HTML entities;
  5. replaces "43 Logistics", "AV Logistics" and "GT Logistics" (case-insensitive) with one token;
  6. lowercases the text with Unicode NFC;
  7. splits on non-letter/digit characters;
  8. builds the set of 8-word shingles;
  9. reports Jaccard |A∩B| / |A∪B| to two decimals.

  After apply and deploy, every pair (43–AV, 43–GT, AV–GT) scores < 0.45 on every row, and the PR records the three tables. **A row ≥ 0.45 fails acceptance.** The only exception is an owner-approved change to this AC, recorded in the spec with the route and the reason. A miss is never hidden with `noindex`.
- [ ] **AC-18** GT renders AC-01 to AC-17 from `projects/gtlogistics.vn/` (its own PR), with its own copy file.
- [ ] **AC-19** Context docs are updated in the same change set:
  - an ADR 0012 amendment:
    - Decision 7: per-site indexed locales;
    - Decision 1 and its consequences: route-bound FAQs become site-owned instead of shared, and existing route FAQs (all `43l`) stay 43's;
  - `07-data-model.md` (faqs ownership), and the MS-01 comment in `modules/content/infrastructure/schema/editorial.ts` corrected;
  - `05-seo-and-tracking.md` sister-site rules;
  - `01-business.md`: GT warehouses (shared, Confirmed 2026-11-17), GT nationwide receiving, and frozen goods for AV/GT per the approved rules, replacing the stale "Hours, warehouses NEEDS CONFIRMATION" line for warehouses only;
  - `11-open-questions.md` Q-22, with the owner's 2026-11-17 answer for AV/GT.

### Scope

**In scope:**
- A per-site indexed-locale constant and every surface that emits EN URLs or decides indexability (AC-01 to AC-06), in both app repos.
- A `pickup` route block: schema, admin editor, renderer.
- Site-scoped route FAQ reads and writes.
- The `--faqs` mode of `db:site-copy`.
- AV and GT copy files for all active routes.
- The docs listed in AC-19.

**Out of scope:**
- Rewriting the body copy of policy, terms and claims pages. Identical legal text is expected. Their EN indexing behaviour (AC-01 to AC-03) is in scope.
- The shared rate tables and goods lists. They are one source of truth (rule 2, ADR 0007).
- Rewriting blog post copy, which is already unique. Their EN indexing and the EN RSS (AC-01 to AC-03) are in scope.
- New pages or URLs, and redirects.
- Changing 43's content.
- Google Business Profile and `sameAs` data. That is admin data entry (`/admin/settings` `social.googleBusiness`, `zaloOa`; G-01).
- Schema migrations. `faqs.site`, `faq_translations.site` and the `blocks` jsonb already exist. Also out of scope: changes to the `offices` settings parser.
- Removing the EN pages. That is decision 1, rejected.

### Affected Areas

| Repo | Layer | File / Path (likely) |
| --- | --- | --- |
| app + GT | config | `shared/config/site.ts`: `INDEXED_LOCALES` (GT's file has drifted, so port it by hand) |
| app + GT | seo | `modules/seo/application/home-metadata.ts`, `page-alternates.ts`, `blog-metadata.ts`, `page-robots.ts`, `route-metadata.ts`, `hub-metadata.ts`, `info-page-metadata.ts`, `goods-metadata.ts`, `calculator-metadata.ts`, `site-metadata.ts` |
| app + GT | seo | `modules/seo/domain/sitemap-entries.ts` (hard-coded `LOCALES`), `modules/seo/application/llms-txt.ts` + `modules/seo/domain/llms-txt.ts` (EN block optional), `modules/seo/domain/organization-json-ld.ts` / `ui/site-json-ld.tsx` (`WebSite.inLanguage`) |
| app + GT | content | `modules/content/domain/sitemap.ts` (`toIndexablePage`, `toSitemapPage`), `modules/content/application/list-sitemap.ts`, `list-discovery-pages.ts` |
| app + GT | indexnow | `modules/indexnow/infrastructure/eligible-paths.ts` |
| app + GT | rss | `app/en/guides/rss.xml/route.ts` |
| app + GT | i18n | `shared/i18n/ui/locale-switcher.tsx`, `shared/i18n/alternates.ts` (AC-04: switcher target without hreflang) |
| app + GT | content | `modules/content/application/route-blocks.ts`, `modules/content/ui/admin/block-fields.tsx`, `editable-block.ts`, `modules/content/ui/route/route-content-sections.tsx` (+ new `pickup-section.tsx`), `app/[locale]/(site)/[slug]/route-view.tsx`, `load-route-page.ts` |
| app + GT | content | `modules/content/infrastructure/route-page-queries.ts` (`listRouteFaqs`), `faq-writes.ts`, `modules/content/domain/route-faq.ts` |
| app + GT | settings | `modules/settings` `getSiteSettings(["offices"])` (read only; parser unchanged) |
| app + GT | admin | `modules/content/infrastructure/admin-faq-queries.ts`, `faq-writes.ts` (parent and translation `site`, site-scoped target lookup), `modules/content/application/save-faq.ts` |
| app | scripts | `scripts/similarity-report.ts` + `package.json` `seo:similarity` |
| app + GT | messages | `messages/vi.json`, `messages/en.json` (`routePage.pickup.*`) |
| app + GT | scripts | `scripts/site-copy.ts` + new `scripts/site-copy/faqs.ts` |
| app | data | `data/seed/sites/av/copy-faqs.json` |
| GT | data | `projects/gtlogistics.vn/data/seed/sites/gt/copy-faqs.json` |
| context | docs | `docs/adr/0012-*.md` (amendment), `docs/context/05-seo-and-tracking.md`, `01-business.md`, `11-open-questions.md`, `10-roadmap.md` |

### Golden-rule checks

- **Rule 1.** Warehouses are listed only when `offices` is verified (AC-09). Copy names only confirmed facts (AC-15).
- **Rule 2.** No price or transit time in FAQ or pickup copy. Derived FAQs still read the rate cards (AC-13, AC-15).
- **Rule 4.**
  - Every page keeps one `<h1>`, metadata, canonical, JSON-LD, breadcrumbs and the Zalo CTA.
  - hreflang is dropped on AV/GT by decision, which is a documented exception (AC-19).
  - `FAQPage` matches the visible FAQs (AC-13).
- **Rule 7.** The admin FAQ and block edits keep `requireRole`.
- **Rule 8.** The pickup section and switcher change are server-rendered, with no added client JS beyond the existing switcher island. Record the delta.
- **Rule 10.** The section uses token colours, a semantic `<h2>` and `<ul>`, and passes axe at 360 and 1280.
- **Rule 13.** No URL changes.
- **§10.** Frozen goods are named only where an approved goods rule allows them. No "24/7" or guarantee claims.

### Dependencies & Risks

- **Depends on:** G-06 (per-site `page_translations`, `db:site-copy`) on both sites. MS-03 (`faqs.site`).
- **Blocked by questions** (placeholders, not blockers):
  - **Q-22:** the owner's 2026-11-17 answer covers AV/GT. Frozen goods follow the approved rules only.
  - **Q-03:** English support. EN pages stay reachable but `noindex`, so EN copy in `copy-faqs.json` may mirror VI.
- **Risk: hreflang removal on VI pages.**
  - Google may keep EN URLs it already knows for a while.
  - The `noindex` drops them over weeks.
  - Watch the Search Console "Excluded by 'noindex'" count rise, which is expected.
- **Risk: shared goods list.** It may keep some routes above the AC-17 threshold. AC-17 reports such routes instead of hiding them.
- **Risk: FAQ ownership on 43.** A route FAQ stored with `site` NULL or `av` would disappear from 43. AC-11 checks this first.
- **Risk: cache and deploy order.**
  - **Order:** deploy the site-filtered FAQ readers on all three containers **before** applying any AV/GT FAQ rows. Otherwise the old reader on 43 would show them.
  - **Revalidation:** script writes do not clear caches. After `--apply`, POST the signed tags `faqs`, `settings` and each affected `page:<key>` to `/api/revalidate` in each container, and assert HTTP 204. Then confirm that a second request shows fresh output.
  - **Local dev:** local dev writes to the production database, so the first `--apply` runs on `db:local`.
- **Risk: two repos drift.** GT's `site.ts` and `list-discovery-pages.ts` already differ from 43's. List every threaded file in both PRs (lesson `s08-lead-form`).

### Manual Verification Plan

- **Seed needs:**
  - **Local database:** `pnpm db:local`, then `pnpm db:clone-site av` against it.
    - Every script and build in steps 2–6 runs with both `DATABASE_URL` and `DATABASE_URL_DIRECT` explicitly set to `postgres://…@localhost:54329/…`, the URL `db:local` prints, never `.env`.
    - Then run `pnpm db:confirm` against the same local database, so pages are published and `offices` is verified.
  - **GT:** the same steps from `projects/gtlogistics.vn/` with `gt`.
  - **Production database:** read-only, for the AC-11 count only.
- **Steps:**
  1. **Before the change:** record the 43 outputs for AC-05 with `curl` of production. Record the `faqs` site count for AC-11.
  2. **Build per site** with the production origin, so the indexability gate is on:
     - `NEXT_PUBLIC_SITE=av NEXT_PUBLIC_SITE_URL=https://avlogistics.vn pnpm build && pnpm start -p 3100`;
     - the same for `43l` with `https://43logistics.vn`;
     - GT from its repo.
  3. **On each build, `curl` one URL per page family:**
     - home `/`, `/en/`;
     - hub `/dich-vu/`, `/en/services/`;
     - route `/gui-hang-di-singapore/`, `/en/shipping-to-singapore/`, `/gui-hang-tu-singapore-ve-viet-nam/`;
     - info and policy `/gioi-thieu/`, `/en/about/`, `/chinh-sach-bao-mat/`, `/en/privacy-policy/`;
     - calculator `/tinh-cuoc/`, `/en/shipping-calculator/`;
     - goods `/hang-cam-gui/`, `/en/prohibited-items/`;
     - blog `/kinh-nghiem/`, `/en/guides/`, the first post listed in each;
     - `/sitemap.xml`, `/llms.txt`, `/en/guides/rss.xml`.

     **Expected:**
     - AV/GT: every `/en/` page has `noindex, follow`, a self canonical and no hreflang; every VI page has `index, follow` and no hreflang; the sitemap and llms.txt contain no `/en/`; the RSS returns 404.
     - 43: identical to step 1 (AC-05).
     - Also set one VI translation `noindex` locally: it stays `noindex` and leaves the sitemap. A build with `NEXT_PUBLIC_SITE_URL=http://localhost:3100` is `noindex` everywhere (AC-02).
  4. **In a browser on the AV build:** the switcher on `/gui-hang-di-singapore/` goes to `/en/shipping-to-singapore/` and back (AC-04). Check at 360, 768 and 1280. Do a keyboard pass. Run axe at 360 and 1280 on the route page.
  5. **On `db:local` (AV, then GT from its repo):**
     - `db:site-copy av --faqs` dry run prints the diff and writes nothing;
     - `--apply` writes only AV FAQ rows and AV `pickup` blocks (row diff of `faqs` and `page_translations` for all sites);
     - a second `--apply` reports no change;
     - an admin-edited page is skipped, and `--force` writes it;
     - an FAQ edited after import (`updated_at > created_at`) skips its route; `--force` writes it;
     - after changing one question and removing another in the file, `--apply` replaces the set with no duplicates, and a second run reports no change;
     - a file with two `pickup` blocks for one page is rejected;
     - `43l` exits non-zero (AC-14).
  6. **On the AV build against `db:local`:**
     - `/gui-hang-di-singapore/` shows the pickup section with the verified warehouses;
     - with `offices` set unverified, and again with an empty list, the section disappears (AC-09);
     - `/gui-hang-tu-singapore-ve-viet-nam/` has no section;
     - the FAQ list is derived first, then AV's own, and `FAQPage` matches (AC-13);
     - 43's build shows its old FAQs (AC-11).
  7. **In the AV build's `/admin` against `db:local`:**
     - create a route FAQ and confirm `site = 'av'` on `faqs` and on both `faq_translations` rows;
     - open, update and delete an id belonging to `43l` by URL: each is rejected and nothing changes;
     - edit a `pickup` block, and confirm a second `pickup` block cannot be added (AC-07, AC-12).

     Repeat the FAQ check on the GT build.
  8. **Production:** deploy all three containers with the new readers first. Then the owner reviews both dry runs and approves (AC-15). Then `--apply` on production per site, then revalidate `faqs`, `settings` and each `page:<key>` (204 each), and confirm fresh output.
  9. **After apply:** `pnpm seo:similarity https://43logistics.vn https://avlogistics.vn`, the same for 43–GT and AV–GT (GT from the VPS if the office network blocks it). Record the three tables (AC-17). Grep the copy files for digits followed by `đ`, `SGD`, `USD`, `ngày`, `days`, `24/7` (AC-15).
- **Validation commands, both repos:** `pnpm lint`, `typecheck`, `check:boundaries`, `i18n:check`, `build`, `check:redirects`, plus `pnpm perf:report` on a route page (label `lighthouse`). No automated tests (ADR 0004).

### Implementation Hints

- Mirror `INDEXES_BLOG_POSTS` for `INDEXED_LOCALES`, and expose `indexesLocale(locale)`. The cheapest choke points are:
  - `toIndexablePage`/`toSitemapPage`, which feed the sitemap, llms.txt and IndexNow;
  - `pageAlternates` / `languageAlternates`, which feed hreflang;
  - `pageRobots`, which the home metadata does not call today, so add it there.
- The switcher reads hreflang links from the DOM. Without them it needs the EN path from page data, for example a `data-locale-href` the server renders. Keep it inside the existing island's budget.
- The `pickup` block follows the `tips`/`notes` pattern in `route-blocks.ts`. The renderer takes the warehouses as props from the page loader (`getSiteSettings(["offices"])`), not from the block.
- `db:site-copy --faqs` reuses the backup, admin-edited skip and idempotency helpers of `--seo` (G-06).
- Lesson `s08-lead-form`: don't run repo-wide `lint:fix`. List every threaded file in both PRs.

### Related

- Roadmap G-07, G-06, G-04, MS-08, MS-09
- `specs/feature-g06-per-site-route-seo.md` (AC-05 wording rule, AC-06 similarity method, `db:site-copy --seo`)
- ADR 0011 (GEO), ADR 0012 (sister sites, Decisions 7–8), ADR 0007 (rate cards)
- `docs/context/05-seo-and-tracking.md` (hreflang, sitemap, llms.txt, sister sites)
- Q-22, Q-03, Q-31, Q-34
- `data/geo-panel-runs/2026-11-*.csv` (regional prompt misses)
- 43logistics.vn PR #101 (llms.txt route descriptions)
