---
title: Add the About, Contact, policy and 404 pages
type: feature
status: draft
owner_repo: both
roadmap: S-09
priority: must-have
blocked_by_questions: [Q-01, Q-02, Q-08, Q-09, Q-11, Q-17, Q-23, Q-24, Q-29]
updated: 2026-10-23
---

## Feature: Add the About, Contact, policy and 404 pages

### Problem Statement

Roadmap S-09 (`docs/context/10-roadmap.md`): "templates; policy pages render markdown with TOC and 'Cập nhật' date. *Accept:* footer has no `#` links."

The site chrome links to six pages that don't render yet: About, Contact and four policies (shipping terms, claims, privacy, terms). The rows exist in `pages` (seeded with slug and title, `draft`), but `[slug]/page.tsx` only knows the route, hub and calculator types, so these links 404. The 404 page itself is a bare message with a home link.

The privacy policy also gates the S-08 lead form: production keeps the form off while `PRIVACY_POLICY_VERSION` is a `draft-` value. S-09 builds the pages the policy will live on. The policy text itself is content work (C-03), blocked by Q-17 (retention) and Q-01 (legal name).

Trust is the site's third goal (AGENTS.md §1): real contacts, offices, legal info and policies.

### Proposed Solution

**Templates (rendered by the existing `[slug]` page, dispatched by `pages.type`):**
- **Policy** (`policy-shipping-terms`, `policy-claims`, `policy-privacy`, `policy-terms`):
  - H1;
  - a "Cập nhật {date}" line from the policy's own effective date;
  - a table of contents built from the markdown headings;
  - the markdown body.
- **About** (`about`): H1, markdown sections, and the company details block (legal info only when verified, Q-01).
- **Contact** (`contact`):
  - H1 and a short intro;
  - big channel buttons (Zalo, Gọi, WhatsApp, Messenger), each through `/go/[channel]`;
  - the S-08 `LeadSection`;
  - offices with hours;
  - a static map per office.
- **404:** the existing message, plus the route cards and the Zalo/call CTAs.

**Content and publishing:**
- About and the policies stay `draft` (404) until C-03 writes the content and the owner confirms it through `db:confirm`. S-09 ships no policy or About text.
- Contact is published in S-09: `contact` is added to `data/owner-confirmations.json` pages. Its intro is UI copy in `messages/*`; everything else comes from verified `site_settings`.

**Navigation:** footer, desktop header and the mobile menu render only links to pages published in the current locale. No `#` hrefs, and no links that 404.

**Static map:**
- The server fetches a Google Static Maps image for each verified office (key server-only), caches it, and serves it from the site's own route.
- The visitor's browser never calls Google, so there is no third-party request before consent (rule 14) and the key never reaches HTML.
- Without the key (Q-29), each office shows only a "Xem bản đồ" link to Google Maps (new tab).

**S-08 gate:** unchanged. `PRIVACY_POLICY_VERSION` stays a constant; the change that publishes the real privacy policy (C-03) also sets the real version.

### Acceptance Criteria

**Routing and publishing**

- [ ] **Info pages render.** Given a page of type `about`, `contact` or `policy` with a `published` translation in the locale, when its URL is requested (`/gioi-thieu/`, `/lien-he/`, `/chinh-sach-bao-mat/`… and the `/en/…` slugs from 03 Sitemap), then `[slug]/page.tsx` renders its template with status 200. A `draft` page, or a locale without a published translation, returns the localized 404 (no VI fallback).
- [ ] **Static params.** Given the build, then `generateStaticParams` lists the published info pages next to the route, hub and calculator pages, so they prerender.
- [ ] **Contact published.** Given the default seed plus `db:confirm`, then `contact` is published in VI and EN. `about` and the four policies stay `draft`.

**Policy template**

- [ ] **Policy block.** Given `page_translations.blocks`, then a policy page reads exactly one `policy` block:
  - `effectiveDate`: an ISO date;
  - `markdown`: at most 40 000 characters.

  The block is validated with a Zod schema in `modules/content/application/info-blocks.ts`, which also defines `richText` (`markdown`). An invalid block is dropped and logged by page key and type only, as `parseRouteBlocks` does. A policy page whose `policy` block is missing or invalid renders the 404.
- [ ] **Markdown rendering.** Given the markdown, then it renders through `react-markdown` in a Server Component (0 bytes of client JS):
  - Raw HTML is not rendered: no `rehype-raw`, and no `dangerouslySetInnerHTML`.
  - Headings `#` in content are demoted, so the page keeps exactly one `<h1>` (the page H1): markdown `#`/`##` → `<h2>`, `###` → `<h3>`, deeper → `<h4>`.
  - Links: same-site paths render as `next/link`; external links open in a new tab with `rel="noopener nofollow"`. Images in markdown are not rendered.
  - Typography uses the token prose styles (`@tailwindcss/typography`, body line-height ≥ 1.6, no uppercase).
- [ ] **Table of contents.** Given the policy's `<h2>`/`<h3>` headings, then a `<nav aria-label>` TOC lists them in order, each linking to the heading's id. Ids come from a pure function in `modules/content/domain/heading-id.ts`:
  - Vietnamese diacritics removed, lowercase, hyphenated;
  - duplicates suffixed `-2`, `-3`;
  - an empty result falls back to `muc-{n}`.

  With fewer than 2 headings, no TOC renders.
- [ ] **"Cập nhật" date.** Given `effectiveDate`, then the page shows "Cập nhật: {d/M/yyyy}" (VI) / "Updated: {d MMM yyyy}" (EN), formatted in `Asia/Ho_Chi_Minh` via `shared/lib/format`, in a `<time dateTime>` element. The date doesn't change when other fields of the page are edited.

**About template**

- [ ] **About.** Given a published `about` page, then it renders:
  - the H1;
  - its `richText` blocks in order (same renderer and heading rules);
  - the existing `CompanyDetails` block, which shows legal name, tax code and licence only when `company` is verified (Q-01), and nothing otherwise.

  No numbers, carriers or photos are rendered unless they come from verified data (Q-08, Q-23); S-09 adds no such fields.

**Contact template**

- [ ] **Channel buttons.** Given `/lien-he/`, then four large buttons appear in channel order (Zalo, Gọi, WhatsApp, Messenger), each a `ContactLink` with the new placement `contact_page`, rendered only when its `site_settings` value is verified. Without JS they still work (plain `/go/{channel}/` links).
- [ ] **Lead form.** Given `/lien-he/`, then the S-08 `LeadSection` renders below the buttons:
  - with all active routes and the goods options;
  - with the privacy link resolved from the `policy-privacy` page record;
  - with `contactLinks` placement `lead_form`.

  It keeps S-08's behaviour: off without configuration, and off in production while the policy version is a draft. The section id stays `bao-gia`. No "Nhận báo giá chính xác" button exists on this page.
- [ ] **Offices and hours.** Given verified `offices` and `hours`, then each office shows its localized name, address and the hours. Unverified values follow the S-01 rule: hidden in production, badged in preview.
- [ ] **Static map (on).** Given `GOOGLE_MAPS_STATIC_KEY` is set and an office is verified, then:
  - the office shows an image from the site's own route `/api/maps/{officeKey}`, rendered with `next/image` (explicit width/height, `sizes`, lazy);
  - its `alt` is the localized "Bản đồ văn phòng {name}" / "Map of the {name} office";
  - the route handler fetches Google Static Maps server-side with the key, using the office's address as center and marker;
  - the image is cached with `"use cache"` + `cacheLife("max")` + `cacheTag(SETTINGS_TAG)`, so an office edit refreshes it;
  - the response carries `Cache-Control: public, max-age=86400, stale-while-revalidate=604800` and `Content-Type: image/png`.
- [ ] **Static map (off and errors).** Given the key is unset, or the office is unknown or unverified, then `/api/maps/{officeKey}` returns 404 and the page renders no image. A provider error or timeout (5 s) returns 502 and the page still renders. In every state each verified office shows a "Xem bản đồ" / "View map" link to `https://www.google.com/maps/search/?api=1&query={encoded address}` with `target="_blank" rel="noopener nofollow"`.
- [ ] **No third-party requests.** Given `/lien-he/` with consent rejected, then the browser sends no request to any Google domain (map images come from the site's origin).

**404**

- [ ] **404 content.** Given an unknown path under a valid locale, or any info page that is draft, then the localized 404 shows:
  - the H1 and the message;
  - the route cards (`RouteCards`, verified prices only, as on the home page);
  - the Zalo/call `ContactCtas` with the new placement `not_found`.

  The status stays 404 and the page has `noindex`.

**Navigation**

- [ ] **Published links only.** Given any page, then footer, desktop header and mobile menu render only items whose target page is published in the current locale (external URLs count as published). A group with no remaining children is not rendered. No rendered menu link has `href="#"` or points to a page that returns 404 (roadmap *Accept*).

**SEO and copy**

- [ ] **Metadata.** Given an info page, then `generateMetadata` returns:
  - title and description from `seo_title`/`seo_description`, falling back to `title`/`excerpt`;
  - the canonical URL;
  - `alternates.languages` for published pairs only;
  - `noindex` from the row.

  The builder is `modules/seo/application/info-page-metadata.ts`, the same way as the existing metadata builders.
- [ ] **JSON-LD.** Given an info page, then it emits (05 "Structured data"):
  - policy pages: `WebPage` (name, url, inLanguage, `dateModified` = `effectiveDate`) + `BreadcrumbList`;
  - Contact and About: `BreadcrumbList` + one `LocalBusiness` per office, only with `offices` verified, under the same verification rules as home (`buildHomeJsonLd`'s office builder, extracted and shared, not copied).
- [ ] **Breadcrumbs and CTA.** Every info page has breadcrumbs (Trang chủ → page) and a Zalo CTA (rule 4). Every info page has exactly one `<h1>`.
- [ ] **Bilingual copy.** All UI strings are in `messages/{vi,en}.json` under `infoPage.*`, `contactPage.*` and `notFound.*`. `pnpm i18n:check` passes.

**Budget, accessibility and docs**

- [ ] **JS budget.** Given CI `perf:report`, then `/lien-he/` and `/en/contact/` are added to `data/perf-budget.json`, and every listed route stays ≤ baseline + 50 KiB (ADR 0006). The info templates add no client island: `react-markdown` runs only on the server, and the only client code is the existing `ContactLink` and the S-08 loader. Today's headroom is about 0.4 KiB (S-08), so no shared chunk may grow; record each route's delta in the PR.
- [ ] **Accessibility.**
  - TOC links and channel buttons are ≥ 44 px targets with visible focus.
  - The map image has `alt`.
  - Headings keep their order (h1 → h2 → h3).
  - Pages work at 360/768/1280 px and with keyboard only.
- [ ] **Context docs updated in the same change set:**
  - 03 Contact: the map approach; Navigation: the published-only rule;
  - 05 Structured data: policy `WebPage` with `dateModified`; Contact/About `LocalBusiness`; and the map's no-third-party note;
  - 06 env table: `GOOGLE_MAPS_STATIC_KEY`;
  - 07 Blocks: the `policy` block (`effectiveDate`, `markdown`) and `richText`;
  - 11: new Q-29 (Google Maps Platform API key, billing account and key restrictions; until answered the map is off);
  - `.env.example`.

### Scope

**In scope:**
- the info-page loader and the `policy`/`richText` block schema in `modules/content`;
- the policy, About and Contact templates;
- the markdown renderer with heading ids and the TOC;
- the contact channel buttons;
- the static-map route handler and its cached fetch;
- the 404 content;
- the published-only menu rule;
- metadata and JSON-LD for info pages;
- messages VI/EN;
- the env schema;
- the `contact` page confirmation;
- `perf-budget.json`;
- the context doc updates above.

**Out of scope:**
- Policy and About text (C-03), legal name and tax code (Q-01), retention period (Q-17), compensation terms (Q-09).
- Changing `PRIVACY_POLICY_VERSION` (the C-03 change that publishes the privacy policy sets it).
- About photos, carrier logos, trust numbers and the Quý Nam group mention (Q-08, Q-11, Q-23, Q-24).
- `/hang-cam-gui/` (S-12), the blog (S-11), the sitemap and robots (S-10).
- An admin editor for these pages (A-03).
- Interactive maps or any map iframe.
- Activating the static map in production: needs Q-29 plus an ADR for the Google Maps Platform dependency.

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | content application | `modules/content/application/info-blocks.ts` (Zod `policy` + `richText`, `parseInfoBlocks`), `application/load-info-page.ts` (`loadInfoPage(locale, slug)`, `listInfoPageSlugs`) |
| app | content domain | `modules/content/domain/heading-id.ts` (pure id + TOC extraction), `domain/info-page.ts` (types) |
| app | content infrastructure | `modules/content/infrastructure/page-record-queries.ts` or a new `info-page-queries.ts` (published info pages by type, cached with `pageTag`), `infrastructure/queries.ts` (`getMenu`: published-only items, empty groups dropped) |
| app | content ui | `modules/content/ui/blocks/rich-text.tsx` (react-markdown, server), `ui/blocks/table-of-contents.tsx`, `ui/info/policy-page.tsx`, `ui/info/about-page.tsx`, `ui/info/contact-page.tsx` (slots), `ui/layout/site-footer.tsx`, `ui/layout/desktop-nav.tsx`, `ui/layout/mobile-nav-sheet.tsx`, `ui/layout/mobile-nav.tsx` (published-only; the `prefetch={isPublished ? … : false}` branches go away) |
| app | content entry points | `modules/content/index.ts` (exports), `constants.ts` (`INFO_PAGE_TYPES`, `CONTACT_PAGE_KEY`) |
| app | contact | `modules/contact/constants.ts` (placements `contact_page`, `not_found`), `ui/contact-ctas.tsx` (`Extract<ContactPlacement, …>` gains `not_found`), `ui/contact-link.tsx` (unchanged API), new `ui/contact-channel-buttons.tsx`, new `ui/office-map.tsx` (image + "Xem bản đồ" link), new `infrastructure/static-map.ts` (server-only fetch + cache), new `application/office-map-url.ts` (pure Maps search URL from an `Office`), `index.ts` exports |
| app | settings | `modules/settings/index.ts` (reuse `getSiteSettings`, `SETTINGS_TAG`; no change expected) |
| app | leads | `modules/leads/index.ts` (reuse `LeadSection`, `isLeadFormEnabled`; no change expected) |
| app | goods | `modules/goods/index.ts` (reuse `listLeadGoodsOptions`) |
| app | pricing | `modules/pricing/index.ts` (reuse `RouteCards`, `loadCalculator` for route keys) |
| app | seo | new `modules/seo/application/info-page-metadata.ts`, new `domain/web-page-json-ld.ts`, `domain/home-json-ld.ts` (extract the `LocalBusiness` office builder into `domain/local-business.ts`, used by home and info pages), new `ui/info-json-ld.tsx`, `index.ts` exports |
| app | pages | `app/[locale]/(site)/[slug]/page.tsx` (info branch in `generateStaticParams`, `generateMetadata`, `Page`), new `[slug]/info-view.tsx` (composition), `app/[locale]/(site)/not-found.tsx` (route cards + CTAs), new `app/api/maps/[office]/route.ts` (thin handler → contact entry point) |
| app | shared | `shared/config/env.server.ts` (`GOOGLE_MAPS_STATIC_KEY`), `shared/lib/format.ts` (date formatter if missing), `next.config.ts` (`images.localPatterns` for `/api/maps/**` if `next/image` needs it) |
| app | data | `data/owner-confirmations.json` (`pages` += `contact`), `data/perf-budget.json` (+ `/lien-he/`, `/en/contact/`) |
| app | deps | `package.json` + `pnpm-lock.yaml` (`react-markdown`, exact version ≥ 2 weeks old; review size and licence) |
| app | messages | `messages/vi.json`, `messages/en.json` (`infoPage.*`, `contactPage.*`, `notFound.*`) |
| app | env | `.env.example` (`GOOGLE_MAPS_STATIC_KEY`) |
| context | docs | `docs/context/03-information-architecture.md`, `05-seo-and-tracking.md`, `06-architecture.md`, `07-data-model.md`, `11-open-questions.md` (Q-29) |

### Golden-rule checks

- **Rules 1–2:** no facts in templates or copy:
  - offices, hours and channels come from verified `site_settings`;
  - legal info only when `company` is verified;
  - About/policy text comes only from published DB rows (C-03).
- **Rule 3:** the map image is a picture of a map, not text content; addresses stay HTML.
- **Rule 4:** each info page has one H1 (markdown headings are demoted), metadata with canonical and alternates, JSON-LD, breadcrumbs and a Zalo CTA. The 404 has one H1 and `noindex`.
- **Rules 6 and 15:**
  - `GOOGLE_MAPS_STATIC_KEY` is server-only, read through `env.server.ts`, never in HTML or client bundles;
  - DB access stays in `infrastructure/`.
- **Rule 8:** no new client island, `react-markdown` on the server only, `next/image` for the map, no Maps iframe.
- **Rules 10–11:** 44 px targets, focus, `alt`, heading order, prose line-height ≥ 1.6, no uppercase.
- **Rule 12:** every channel button and CTA goes through `/go/[channel]` with a placement (`contact_page`, `lead_form`, `not_found`).
- **Rule 14:** no request to Google from the visitor's browser (server-side map fetch); the lead form keeps its S-08 consent rules.
- **Security patterns:** no raw HTML from markdown; `/api/maps/{officeKey}` builds the provider URL only from verified settings and an allowlisted office key (no open proxy: no address, size or zoom comes from the request).
- **Module rule (ADR 0005):**
  - `content` composes nothing from pricing/contact/leads directly; `info-view.tsx` in `app/` passes them in as slots, like `calculator-view.tsx`;
  - `contact` → `settings` stays the only new runtime dependency direction, and it already exists.

### Dependencies & Risks

- **Depends on:** S-01 (layout, `ContactLink`, `CompanyDetails`, `ContactDetails`), S-05 (home JSON-LD office builder), S-07/S-08 (`LeadSection`, goods options), F-04 (`pages`, `site_settings`). No unclosed stack gap.
- **Blocked by questions** (ADR 0004 placeholders):
  - **Q-01:** legal info; `CompanyDetails` renders nothing until verified.
  - **Q-02:** Hà Nội/SG warehouses; only the verified DN/HCM offices render.
  - **Q-08, Q-11, Q-23, Q-24:** About trust content; not rendered.
  - **Q-09, Q-17:** policy text; the pages stay draft.
  - **Q-29 (new):** Maps API key and billing; the map is off and only the link shows.
- **Risks:**
  - **JS budget:** about 0.4 KiB headroom (S-08). Any shared-chunk growth fails CI. The info templates must stay server-only, and the menu change must not add client code to `mobile-nav-sheet.tsx`. If the 404 imports route cards that pull a client island, measure it.
  - **Menu change scope:** hiding unpublished links removes today's nav entries for About, policies and blog until they publish. That is the intended state, but it changes the header and footer of every page.
  - **Static map cost:** each cache miss is a paid API call. The cache plus the settings tag keeps it to one call per office per settings change; the route never forwards request parameters.
  - **`react-markdown` size on the server:** no client impact, but it adds dependencies; review the lockfile change (pnpm 11 `minimumReleaseAge` in CI).

### Manual Verification Plan

- **Seed needs:**
  - `pnpm db:local` + `db:confirm` against the local DB (contact published, everything else draft).
  - Local fixtures for the draft templates, local DB only, SQL in the PR:
    - publish `policy-privacy` VI with a `policy` block (`effectiveDate` 2026-11-01, markdown with 3 `##`, 1 `###`, one internal and one external link, one `# Heading`, one raw `<script>` line and one image);
    - publish `about` VI with two `richText` blocks;
    - leave EN draft.
  - For the map:
    - first without `GOOGLE_MAPS_STATIC_KEY`;
    - then with a test key if the owner provides one (Q-29). Otherwise the "on" state is checked by code review only, and the handler's 404 path by hand.
- **Steps:**
  1. **Contact (VI, 1280 and 360 px).** Open `/lien-he/`. Expect:
     - H1, intro, channel buttons in order (only verified channels);
     - the lead section `#bao-gia`;
     - offices with hours;
     - per office a "Xem bản đồ" link (new tab) and no map image (no key).

     In DevTools Network, no request to any Google domain.
  2. **Contact (EN).** Open `/en/contact/`. Expect English copy, the same sections, and the privacy link resolved from the page record.
  3. **Map route.** `curl -I /api/maps/da-nang` without the key: 404. `curl -I /api/maps/unknown`: 404. With a test key (if available): 200 `image/png` with the `Cache-Control` above; the second request doesn't call Google (server log).
  4. **Policy (fixture).** Open `/chinh-sach-bao-mat/`. Expect:
     - exactly one `<h1>` (`document.querySelectorAll('h1').length === 1`);
     - "Cập nhật: 1/11/2026" in a `<time>`;
     - a TOC with 4 entries whose links jump to ids without diacritics;
     - the `# Heading` rendered as `<h2>`;
     - the `<script>` line shown as text, not executed;
     - no image rendered;
     - the external link with `target="_blank" rel="noopener nofollow"`.

     `/en/privacy-policy/` → 404 (EN draft).
  5. **About (fixture).** Open `/gioi-thieu/`. Expect the H1, both sections, and no legal block (company unverified).
  6. **Draft pages.** Without fixtures, `/gioi-thieu/`, `/chinh-sach-den-bu/` and `/en/terms/` → localized 404 with the route cards and the Zalo/call CTAs, `noindex`.
  7. **Navigation.** On `/` at 1280 px and in the 360 px mobile menu: every menu link returns 200 (check with a quick script over the rendered `href`s, or by hand); no `href="#"`. After publishing a fixture, its link appears.
  8. **SEO.** View source on `/lien-he/` and the policy fixture: canonical, `hreflang` only for published pairs, JSON-LD (`WebPage` with `dateModified`; Contact `LocalBusiness` only for verified offices) valid in a schema validator.
  9. **Accessibility.** Keyboard through the Contact page and the TOC; axe DevTools at 360 and 1280 px: 0 serious or critical issues.
- **Validation commands:** `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build`, `check:redirects`; CI `perf:report` (JS budget gate). No automated tests (ADR 0004).
- **Process:** the owner's phase-1 rule (no Codex, Lighthouse or browser runs inside `/implement`) lets steps 1–9 be deferred from the implementation PR and recorded as pending; lint, typecheck, boundaries, build and CI perf still gate it.

### Implementation Hints

- **Dispatch:** add an info branch next to `loadRoutePage`/`loadHubPage`/`loadCalculatorPage` in `[slug]/page.tsx`. Keep `app/` thin: `info-view.tsx` composes the slots (channel buttons, `LeadSection`, offices, maps, `CompanyDetails`) like `calculator-view.tsx`.
- **Blocks:** follow `application/route-blocks.ts`. One schema for seed and read; each block parsed alone; drop and log invalid ones.
- **Heading ids:** compute in a pure function from the markdown AST, so the TOC and the rendered headings share them. Pass a `components` map to `react-markdown` (`h1`–`h6`, `a`, `img: () => null`). No `rehype-raw`.
- **Menus:** filter in the query (`getMenu`), not in each component, so footer, header and mobile stay consistent. `isPublished` already exists on `MenuItem`.
- **Map handler:** the route handler only parses `officeKey` and calls a contact entry point that returns `{ status, body }`. Store the cached image as a `Uint8Array`/base64 inside the `"use cache"` function. 5 s timeout via `AbortSignal.timeout`. Never forward query parameters to Google.
- **404 budget:** `RouteCards` is a server component; check it doesn't pull a client island into the 404 chunk.
- **Lessons:** `lessons/2026-10-23-s08-lead-form.md`: list every file a new prop or enum value passes through (done above for the placements), and format with a scoped `biome check --write <files>`, never a repo-wide `lint:fix`. S-08 budget fix: client code should get server-rendered nodes and actions as props instead of importing shared layout code.

### Related

- Roadmap: `docs/context/10-roadmap.md` S-09; C-03 (copy), S-10 (sitemap), S-12 (prohibited goods), A-03 (page editor)
- `docs/context/03-information-architecture.md` (Sitemap, Navigation, Contact, About, Policy pages, 404), `05-seo-and-tracking.md` (Structured data), `06-architecture.md`, `07-data-model.md` (Blocks)
- ADR 0004, 0005, 0006
- Specs: `feature-s08-lead-form.md` (`LeadSection`, privacy gate), `feature-s05b-home-redesign.md` (office JSON-LD), `feature-s01-site-layout-shell.md` (menus, fact visibility)
- Lessons: `lessons/2026-10-23-s08-lead-form.md`
- Open questions: Q-01, Q-02, Q-08, Q-09, Q-11, Q-17, Q-23, Q-24, Q-29 (new)
