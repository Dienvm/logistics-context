---
title: Differentiate route and home SEO per sister site
type: feature
status: draft
owner_repo: both
roadmap: G-06
priority: must-have
blocked_by_questions: [Q-01, Q-31]
updated: 2026-11-13
---

## Feature: Differentiate route and home SEO per sister site

### Problem Statement

Roadmap row G-06 (Phase 5b). Measured on 2026-11-13:

- The November prompt panel names a group site in 20 of 52 ChatGPT answers and in 0 of 52 Claude answers. None of the region prompts `P31`–`P52` (each owned by one site) names its owner.
- `/gui-hang-di-singapore/` on 43logistics.vn and avlogistics.vn shares 90% of its words. The `<h1>` is identical on the three sites, and the price-bearing `<title>` (`routePage.meta.titlePrice*`) differs only by the layout's brand suffix. Search engines cluster near-identical pages and show one of them, so the three companies cannot each appear for their own queries.
- No home `<title>` or meta description names Đà Nẵng or a destination, although every site's verified head office is in Đà Nẵng.
- The sitewide `Organization` node has no `address`. The AV and 43 seeds store the brand alias under the key `alternateName`, which the settings schema ignores, so AV emits no `alternateName` (GT's seed uses `alternateNames` and emits it).

### Owner decisions (2026-11-13)

1. New roadmap row G-06.
2. Each site's route pages lead with the regions that site owns in the prompt panel: 43 = Đà Nẵng (Cẩm Lệ) and Huế; AV = Huế, Quảng Trị, Quảng Bình (Taiwan, Korea, dry food); GT = Quảng Bình and Đà Nẵng (Korea, Taiwan).
3. The new `<h1>`, titles and descriptions live in the database per site (`page_translations`), loaded from each site's seed copy and editable in the admin.
4. Fix the alias key and publish the domain-style alias ("AVLogistics.vn") now; further aliases wait for Q-31.

### Proposed Solution

**A. Route pages (AV and GT).** Each AV and GT route page gets its own `<h1>`, `<title>` and meta description in both locales, and an intro that opens with that site's regions. The wording is region-led ("Gửi hàng đi Đài Loan từ Huế, Quảng Trị"), where 43 keeps its price-led pattern ("Gửi hàng đi Đài Loan – từ {price}"). AV and GT also differ from each other: a route that both own gets a different region emphasis on each site. Prices and transit times stay where they are today (the summary paragraph, the "Giá từ" tiles and the rate cards), all read from the rate tables.

**B. Home pages (43, AV, GT).** Each home page gets a `<title>` that names the brand and Đà Nẵng, and a meta description that names Đà Nẵng and that site's main destinations, in both locales.

**C. Organization node.** The sitewide `Organization` gains a `PostalAddress` for the site's Đà Nẵng head office when the site's `offices` setting is verified. The seeds use the key `alternateNames`, so AV emits `alternateName`; 43 stays silent until its `company` setting is verified (Q-01).

### Acceptance Criteria

Route pages:

- [ ] **AC-01** Given an AV or GT route page listed in that site's copy file, when it renders in `vi` or `en`, then its `<h1>` is the site's own text from `page_translations.h1`, and it differs from the `<h1>` of the same route on each other site.
- [ ] **AC-02** Given the same page, then its `<title>` comes from `page_translations.seo_title`, is ≤ 60 characters including the brand suffix, and differs from the same route's title on each other site by more than the brand name.
- [ ] **AC-03** Given the same page, then its meta description is 120–155 characters, names the site's brand and at least one region, and differs from the other sites' descriptions.
- [ ] **AC-04** No new `<h1>`, title, description or intro contains a price, a currency amount or a transit time (rule 2). The page still shows the from-price and transit from the rate tables in the summary paragraph and tiles.
- [ ] **AC-05** Every region or place named in the new copy is the city, province or display name of an office that is verified in that site's `offices` setting (rule 1). A goods type ("đồ khô", "đồ đông lạnh") is named only when that route has an approved goods rule that allows it (§10); otherwise the copy names regions only.
- [ ] **AC-06** For each of the 16 routes, the main-content text of the AV page and the GT page each share less than 90% of their words with the 43 page before the first rate card heading (the hero, summary and intro). The spec does not require the shared rate tables to differ.
- [ ] **AC-07** 43's route pages keep their current `<h1>` and `<title>` patterns. This spec changes no 43 route copy.

Copy loading:

- [ ] **AC-08** `pnpm db:site-copy <site>` without a flag prints, per route and locale, the old and new `h1`, `seoTitle`, `seoDescription` and intro, and writes nothing.
- [ ] **AC-09** `pnpm db:site-copy <site> --apply` writes those fields, keeps its backup in `.backups/`, and skips a translation whose page has `admin_edited_at` set, listing each skipped row. `--apply --force` writes those rows too. A second `--apply` reports no change.
- [ ] **AC-10** The command accepts `43l`, `av` and `gt` for the home entry (AC-11), and still refuses to write route copy for `43l`.

Home pages:

- [ ] **AC-11** Given each site's home page in `vi` and `en`, then `<title>` (absolute, ≤ 60 characters) contains the brand and "Đà Nẵng" / "Da Nang", and the meta description (120–155 characters) names Đà Nẵng and at least three destinations.
- [ ] **AC-12** Every destination named in a home description is an active route with a published page on that site on the day the copy is applied. The dry run fails when a named route key in the copy file's `routes` list for the home entry is inactive or unpublished.
- [ ] **AC-13** The three home titles differ from each other by more than the brand name. The home `<h1>` does not change.

Organization:

- [ ] **AC-14** Given a site whose `offices` setting is verified and whose head-office key resolves to an office, then `Organization.address` is a `PostalAddress` with the same `streetAddress`, `addressLocality` and `addressCountry` as that office's `LocalBusiness` node. No `postalCode` is emitted.
- [ ] **AC-15** Given `offices` unverified, or no office with the head-office key, then `Organization` has no `address` property.
- [ ] **AC-16** The 43 and AV seeds store the alias under `alternateNames`. After the AV value is saved, AV pages emit `alternateName: ["AVLogistics.vn"]`. 43 emits no `alternateName` while `company` is unverified.
- [ ] **AC-17** GT renders AC-01–AC-05, AC-11–AC-15 from `projects/gtlogistics.vn/` with its own copy file.

Quality:

- [ ] **AC-18** No client JavaScript is added (ADR 0006 delta recorded as 0). JSON-LD validates on the home page and one route page per site. Lighthouse SEO 100 and accessibility ≥ 95 on those pages.
- [ ] **AC-19** `docs/context/05-seo-and-tracking.md` and `03-information-architecture.md` describe the per-site title and `<h1>` rule and the `Organization.address` gate; the stale "AV route pages noindex" note on roadmap row MS-08 is corrected; `.claude/rules/seo-patterns.md` no longer says "43logistics.vn only" for these rules.

### Scope

**In scope:**

- Per-site `h1`, `seoTitle`, `seoDescription` and intro for the 16 AV and 16 GT route pages, `vi` and `en`.
- Home `seoTitle` and `seoDescription` for 43, AV and GT, `vi` and `en`.
- `db:site-copy`: new fields, the admin-edit guard, the home entry, `43l` for the home entry only.
- `Organization.address` and the alias seed key, in both app repos.
- The matching context doc updates.

**Out of scope:**

- Rewriting rate tables, notes, FAQs or blog posts; any 43 route copy.
- New pages (region landing pages, new guides).
- Catching GT's JSON-LD files up with 43's beyond what `Organization.address` needs.
- Further aliases, `knowsAbout`, `legalName` and `taxID` for 43 (Q-01, Q-31).
- Off-site work: Search Console, Google Business Profile, Bing Places, backlinks (G-01–G-03).
- Schema changes and migrations (none needed).

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | seed copy | `data/seed/sites/av/copy-routes.json` (add `h1`, `seoTitle`; rewrite `seoDescription`, intro) |
| app | seed copy | `data/seed/sites/av/` and a new `data/seed/sites/43l/` home entry (file name set in implementation) |
| app | script | `scripts/site-copy/apply.ts` (+ its loader/types), `package.json` script row unchanged |
| app | seed settings | `data/seed/site-settings.legacy.json`, `data/seed/sites/av/site-settings.json` (`alternateNames`) |
| app | seo domain | `modules/seo/domain/organization-json-ld.ts`, `modules/seo/domain/local-business.ts` (shared address builder) |
| app | seo ui | `modules/seo/ui/site-json-ld.tsx`, `modules/seo/ui/verified-business.ts` |
| app | config | `shared/config/site.ts` (head-office key per site, beside `OWN_OFFICE_KEYS`) |
| app (read only) | route page | `modules/seo/application/route-metadata.ts`, `modules/content/application/load-route-page.ts`, `app/[locale]/(site)/[slug]/route-view.tsx` — already prefer the DB `h1` / `seoTitle`; change only if AC-01/AC-02 fail |
| app (read only) | home | `modules/seo/application/home-metadata.ts` — already prefers the DB values |
| gt app | all of the above | the same paths in `projects/gtlogistics.vn/`, with `data/seed/sites/gt/copy-routes.json` |
| context | docs | `docs/context/05-seo-and-tracking.md`, `03-information-architecture.md`, `10-roadmap.md` (G-06 row, MS-08 note), `.claude/rules/seo-patterns.md`, `AGENTS.md` §7 (`db:site-copy` row) |

### Golden-rule checks

- **Rule 1:** regions come only from verified offices (AC-05); destinations only from active published routes (AC-12); no new unverified `Organization` property (AC-15, AC-16).
- **Rule 2:** no price or transit time in stored copy (AC-04).
- **Rule 3:** no text in images; OG images are unchanged.
- **Rule 4:** one `<h1>`, metadata, canonical, hreflang and JSON-LD stay on every changed page.
- **Rule 8:** server only, no JS added (AC-18).
- **Rule 11:** no uppercase; titles keep Vietnamese diacritics.
- **§10:** no goods listed as accepted without an approved rule (AC-05); no "24/7" or guarantee claims in the new copy.
- **ADR 0012:** no cross-brand `sameAs`; each site's copy is its own row set.

### Dependencies & Risks

- Depends on: G-04 (built: `SiteJsonLd`, `routeSummary`), MS-02/MS-03 (site-scoped rows), the 2026-11-02 AV/GT copy rewrite.
- Blocked by questions (placeholders, not blockers, ADR 0004):
  - Q-01: 43's `company` setting is unverified, so 43 emits no `alternateName` (AC-16).
  - Q-31: aliases beyond the domain-style one are not added.
- Risk: local dev and the scripts write to the production database. `db:site-copy --apply` runs only after the owner reviews the dry-run output; the backup file is kept.
- Risk: script writes do not clear the site caches. After `--apply`, post the signed page tags to `/api/revalidate` in each container.
- Risk: a title that changes can move rankings for a few weeks. 43's price-led titles are untouched to limit this.
- Risk: the admin-edit guard changes `db:site-copy` behaviour for rows staff already edited; the dry run lists them.
- Risk: two repos. Each change lands as parallel PRs (43logistics.vn and gtlogistics.vn); list every threaded file in both (lesson 2026-10-23).

### Manual Verification Plan

- Seed needs: the default data; no new seed beyond the copy files.
- Steps:
  1. `pnpm db:site-copy av` and `pnpm db:site-copy gt` (dry run): every route shows new `h1`, `seoTitle`, `seoDescription`, intro; counts match 16 routes × 2 locales; admin-edited rows are listed as skipped.
  2. Owner reviews the dry-run text. Then `--apply`, then a second `--apply` reports no change.
  3. Revalidate, then for `/gui-hang-di-dai-loan/`, `/gui-hang-di-han-quoc/`, `/gui-hang-di-singapore/` and `/en/shipping-to-singapore/` on each site: `curl` the page and compare `<h1>`, `<title>`, meta description across the three sites (AC-01–AC-03); check title length ≤ 60 and description 120–155.
  4. Grep the copy files for digits followed by `đ`, `SGD`, `USD`, `ngày`, `days` (AC-04), and compare each named place with the site's verified offices (AC-05).
  5. Word-overlap check (AC-06): extract `<main>` text up to the first rate card heading for the 16 routes on each site pair and record the ratio in the PR.
  6. Home pages, both locales, three sites: title and description content and length (AC-11, AC-13); the dry run fails with an inactive route key (AC-12, checked once by editing the file locally).
  7. JSON-LD: `Organization.address` equals the head-office `LocalBusiness` address on each site (AC-14); with `PREVIEW_UNVERIFIED` off and `offices` unverified locally (`db:local`), the property is absent (AC-15); AV shows `alternateName`, 43 does not (AC-16). Validate with a schema validator.
  8. Lighthouse mobile, consent rejected, on one home and one route page per site: SEO 100, accessibility ≥ 95, JS delta unchanged. axe at 360 and 1280 px.
- Validation commands (both app repos): `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm i18n:check`, `pnpm check:redirects`, `pnpm check:boundaries`. PRs carry the `lighthouse` label. No automated tests (ADR 0004).

### Implementation Hints

- Route `<title>` and `<h1>` already prefer the DB value: `route-metadata.ts` uses `page.copy.seoTitle` before the message templates, and `load-route-page.ts` uses the pattern `<h1>` only when the DB `h1` is empty or equals the route name. A site `h1` therefore also stops `route-view.tsx` from appending "– từ {price}", which is the intended region-led form.
- `scripts/site-copy/apply.ts` today writes `seoDescription`, `blocks`, `noindex: false` and `updatedBy: null`, never `h1` or `seoTitle`, and has no `adminEditedAt` check. Follow `db:import-rate-cards` for the skip / `--force` behaviour.
- Reuse the `PostalAddress` builder behind `toJsonLdOffice` (`verified-business.ts`) for `Organization.address`; do not build a second one.
- Region ownership from the panel (`data/geo-panel-runs/2026-11-chatgpt.csv`, `owner=`): AV `P33`, `P34`, `P48`–`P50`; GT `P32`, `P45`–`P47`; 43 `P31`, `P35`, `P36`, `P40`–`P44`, `P51`.
- Quảng Bình's office is stored with province "Quảng Trị" and shown as "Quảng Bình" (`01-business.md`); use the display name.
- Keep the home `<title>` absolute (no brand suffix added by the layout).

### Related

- Roadmap: `docs/context/10-roadmap.md` G-06; G-04, G-05, MS-08, MS-09.
- Specs: `feature-g04-geo-on-site.md` (Organization node, partial overlap), `feature-s04b-route-page-content.md`.
- ADRs: 0011 (Decision 3–4), 0012 (per-site SEO, duplicate copy), 0004, 0006.
- Docs: `docs/context/05-seo-and-tracking.md` (metadata rules, entity graph, sister sites), `03-information-architecture.md`, `01-business.md` (offices), `11-open-questions.md` Q-01, Q-31, Q-34.
- Lesson: `lessons/2026-10-23-s08-lead-form.md`.
