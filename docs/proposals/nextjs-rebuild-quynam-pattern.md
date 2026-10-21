---
title: Next.js rebuild following the quynam.vn structure, with better UX, motion, SEO and security (code-only delivery)
status: draft
owner_repo: both
roadmap: [F-01, F-04, F-08, S-01, S-03, S-04, S-05, S-06, S-07, S-09, S-10, S-11, S-12, S-13, A-02, A-03, C-01, C-02, C-05]
updated: 2026-10-21
---

# Next.js rebuild following the quynam.vn structure

## Problem

ADR 0001 already replaces WordPress with Next.js, and `03-information-architecture.md` already has a sitemap. What we don't have yet is a reference model for **what a mature Vietnamese parcel-forwarder site contains and in what order**. The owner has named **https://quynam.vn** (Quý Nam, about 250 posts and 21 pages, WordPress + Yoast) as that model. The rebuild should follow its sitemap, page templates and content format, and beat it on UI/UX, motion, SEO and security.

The owner has also asked for **code only: no unit tests and no e2e tests**. That contradicts `AGENTS.md` §9 (definition of done), `06-architecture.md` "Quality harness", roadmap F-01/F-08 and the `/implement` + `/feature-bug` skills. It has to be decided explicitly, not drift in silently. **Decided 2026-10-21 in ADR 0004.**

## What quynam.vn does (observed 2026-10-20, structure only)

| Area | quynam.vn | Notes |
| --- | --- | --- |
| Main nav | Trang chủ · Giới thiệu · Dịch vụ (13 countries) · Kinh nghiệm · Liên hệ · Tracking · Bảng giá | Flat menu; 13 route links in a dropdown |
| Route pages | `/gui-hang-di-{country}/` (same pattern as ours) | 13 in the menu: US, AU, CA, JP, SG, TW, CN, MY, TH, KR, UK, DE, FR |
| Long-tail service posts | About 200 posts in the `dich-vu` category: extra countries (BE, PL, NO…), goods × country ("gửi mỹ phẩm đi Nhật"), city × country ("gửi hàng đi Mỹ tại Đà Nẵng") | Their main SEO engine |
| Content hub | `/kinh-nghiem/`: glossary and how-to posts ("UPS là gì", "CIF là gì", "quy cách đóng gói", "gửi thuốc đi nước ngoài") | Each post links back to route pages |
| Price list | `/bang-gia-tuyen/`: one page, a country dropdown switches the rate table | Very useful to users |
| Calculator | `/tinh-gia-cuoc/`: iframe to `tracking.quynam.vn`. Inputs: from, to, goods type, kg, L×W×H. **Gated**: name, phone, email and address are required before it shows a price | Poor UX |
| Tracking | `/tracking/`: iframe; the customer must register and log in to track | Poor UX |
| Trust | Stats band (years, customers per year, tonnes per year, % positive), wall of about 20 chat screenshots, 12 press logos, founder-story About page, "tri ân khách hàng" page | |
| Policies | Complaints policy, privacy policy | |

**Home order:** banner image (text baked in, separate desktop and mobile PNGs, no H1) → 6 benefit cards → stats band → services grid → chat-screenshot wall → press logos → Google Maps iframe.

**Route page order (Singapore):** H1 with the starting price → TOC → "Bảng giá … {year}" rate tables with operational notes (cut-off time, small-parcel surcharge) → transit time + video → 5-step process → 6 "why us" cards → order-consolidation upsell (Shopee/Lazada) → accepted / refused goods → chat screenshots → goods photo gallery → FAQ (4) → press logos → consultant author box → related-routes grid. An animated "call" GIF button is repeated about 5 times.

**Weak points to beat:** text inside images, no JSON-LD, missing meta descriptions on several pages, iframe tools with lead gates and login walls, Maps and YouTube iframes loaded eagerly, GIF CTAs, 6 phone numbers, Vietnamese only.

## Proposed approach

Principle: **Quý Nam's structure, 43 Logistics' identity.** Quý Nam is a sister company (Q-21). The owner clarified on 2026-10-21 that it is a **reference for structure only**: sitemap, page types, number of pages, layout, section order and how features work. **43logistics.vn is our own brand and the only site we optimise.** Every fact, number, slogan, image, colour and claim on it comes from 43 Logistics' own sources. We never copy Quý Nam's wording, data, numbers or media.

### 0. What comes from where

| Take from **quynam.vn** (structure) | Take from **43 Logistics** (identity and facts) |
| --- | --- |
| Sitemap shape and page types: home, route pages, combined price list, calculator, tracking, guides, about, contact, policies | Brand: name "43 Logistics", taglines "Vận chuyển hàng Quốc Tế" and "43 Logistics - Gửi hàng đi nước ngoài!" (`01-business.md`) |
| Number and kind of pages: about 13 route pages, a long-tail layer (goods × route, city × route), a glossary/how-to blog | Routes, prices, transit times, flight days, surcharges: `routes` / `route_rates` seeded from 43L's own legacy data (`data/seed/routes.legacy.json`), published only after 43L staff verify them (rule 1–2, Q-04) |
| Section order on home and route pages (§2) | Contacts, offices, hours: `01-business.md` / `site_settings` (Q-02, Q-03, Q-06) |
| Feature patterns: price list with a route switcher, calculator inputs (from, to, goods type, kg, L×W×H), tracking lookup, author box, customer-message wall, goods gallery | Colours, type, signature details: crimson `#AC0C2E`, hard offset shadow, 20 px card radius, Barlow Condensed display (`02-legacy-audit.md` "What to keep", `04-design-system.md`, `data/design-tokens.json`) |
| What *not* to do: their weak points in "What quynam.vn does" | Images: 43L's own photos (`SEE_5122…SEE_5184` office/team, 2025 blog photos; `data/media-inventory.csv`: 175 used files), logo from the old site (raster only, 300 × 300 PNG; vector pending Q-11), consented and blurred customer screenshots (Q-12) |
| | Trust numbers: **none exist yet**. The old site's only counters ("Outlet Office", "Happy Customer", "Local Courier") are theme demo widgets on the Lorem-ipsum About pages (`02-legacy-audit.md` #1), so they are not facts. The stats band stays hidden until 43L gives real numbers (Q-23) |
| | Process, goods rules, FAQ, policies: 43L's own legacy copy (`legacy-copy/*`), rewritten and confirmed (C-01, C-02, Q-09, Q-10) |

Rules that follow:

- No `source = 'quynam'` data enters the seed or the DB.
- No Quý Nam numbers, press logos or claims ("12+ năm", "10,000+ khách", "bảo hiểm 100%", "giá thấp nhất") appear on 43logistics.vn, attributed or not.
- No Quý Nam wording is copied, even reworded paragraph by paragraph. 43L copy is written from 43L's own facts.
- Any link between the two sites is decided in §5 "Off-page SEO", not by default.

### 1. Sitemap changes (amends `03-information-architecture.md`)

The existing sitemap stays. Quý Nam suggests these deltas:

| Change | VI URL | EN URL | Source of content | Gate |
| --- | --- | --- | --- | --- |
| **Add** a combined price list page | `/bang-gia/` | `/en/rates/` | `routes` + `route_rates` (rule 2), route switcher (tabs that work without JS) | Uses the shared price-eligibility rule below |
| **Promote** in the header nav: Bảng giá, Tính cước, Kinh nghiệm, Liên hệ | — | — | — | — |
| **Keep** `/tra-cuu/` as P2 | `/tra-cuu/` | `/en/tracking/` | Carrier API, or the sister company's tracking system if the owner approves it (Q-18, Q-24) | Q-18 / Q-24; never a login wall for a single lookup |
| **Add** a "service variant" page type: goods × route and city × route (long-tail SEO) | `/gui-{goods}-di-{country}/`, `/gui-hang-di-{country}-tai-{city}/` | EN only if there's demand | `pages` + blocks; prices are still read from the parent route | Published only when **all** hold: parent route confirmed; for goods variants, an operations-approved `goods_rules` entry for that goods type and country (Q-10); for city variants, confirmed pickup/service coverage in that city (Q-22); unique content (≥ 600 words, own FAQ). No programmatic thin pages |
| **Add** a customer-appreciation / proof page (optional) | `/khach-hang/` | `/en/customers/` | `testimonials` + consented screenshots | Q-12 |
| **More countries** (AU, CA, CN, UK, DE, FR, EU…) | `/gui-hang-di-{country}/` | `/en/shipping-to-{country}/` | New `routes` rows | Only those confirmed in Q-05/Q-22; the route registry is data, so no code change is needed |

**Shared price-eligibility rule (all price surfaces).** This covers the H1 "từ X/kg", mega menu, route bento, rate preview, `/bang-gia/`, calculator, JSON-LD `Offer` and OG images. One server helper (`server/queries` + `lib/format`) decides, per route and method:

- A rate is **eligible** only if the route has `is_verified = true` and `prices_public = true`, the band has `contact_for_price = false`, and today is inside the band's validity dates.
- The "from" price is the lowest eligible per-kg band. Flat-price bands (e.g. US 0.5–20 kg) are shown as "từ {price}/{weight}" rather than per kg.
- With no eligible rate, the surface shows "Liên hệ" (tables, calculator) or omits the price (H1, menu, `Offer`).
- No component formats a price on its own.

Header (desktop): logo · **Gửi hàng đi** (mega menu of route cards, "từ X đ/kg · Y–Z ngày" from the DB) · Nhận hàng về VN · **Bảng giá** · Tính cước · Kinh nghiệm · Về chúng tôi · VI/EN · **Chat Zalo** button. Mobile keeps the sticky bottom bar (Zalo · Gọi · Tính cước) instead of floating GIFs.

### 2. Page templates following Quý Nam's order (amends `03` page specs)

**Home** (one H1, unlike Quý Nam):

1. Hero: HTML H1 over a real photo, a route picker that returns an instant estimate, Zalo + Gọi buttons. The LCP element is the static photo or H1, never animated.
2. Six benefit cards. Only claims confirmed in `01-business.md` (Q-03, Q-09); unconfirmed cards are hidden, not softened.
3. Stats band. **Hidden** until real numbers are confirmed (Q-23).
4. Route bento grid (DB).
5. Process steps. Hidden until the owner confirms the process. The 4 steps in `01-business.md` are legacy copy, not a Confirmed fact (closed in C-01).
6. Rate preview: 3 featured routes + a link to `/bang-gia/`.
7. Customer message wall (Q-12, blurred) + goods photo gallery.
8. Partners / press strip (Q-08, Q-23), hidden if unconfirmed.
9. Latest guides (3).
10. Offices + hours (static map image linking to Google Maps) + final CTA band.

**Outbound route page.** Quý Nam's order merged with the existing 03 spec:

1. Breadcrumb · H1 "Gửi hàng đi {country}", with "– từ {min price}/kg" appended only when the price-eligibility rule allows · hero facts (transit days, flight days, cut-off time; confirmed values only) · Zalo (message prefilled with the route) + Gọi.
2. Sticky TOC (desktop) / collapsible TOC (mobile).
3. "Bảng giá gửi hàng đi {country} {year}" `RateTable` with "Cập nhật {date}" and operational notes (surcharges, cut-off). Notes are customer-facing on bilingual pages, so they are stored as **localised** text (a `route_rate_translations.notes` or structured fields with translated UI labels, settled in the F-04 spec), not the single `route_rates.notes` column, which stays internal.
4. Mini calculator (route preselected, no lead gate).
5. How the price is calculated (actual vs volumetric weight, rounding rules).
6. Transit time and methods (air/sea/express).
7. Process steps.
8. Why us: 4–6 cards, confirmed claims only.
9. Extra services, e.g. consolidating orders from VN marketplaces (only if confirmed, Q-22).
10. Accepted / restricted / refused goods (`goods_rules`, approved only).
11. Compensation summary + link to `/chinh-sach-den-bu/` (kept from the 03 template; the summary text waits on Q-09, the policy link is always present).
12. Proof: consented chat screenshots + real goods photos.
13. FAQ (5–8, `FAQPage` JSON-LD).
14. Author / consultant box (real staff only, with consent; E-E-A-T, i.e. Google's experience and trust signals).
15. Related routes + related guides.
16. Final CTA band.

Hubs, calculator, contact, about, blog, policies and LPs keep their 03 specs. The About page adopts Quý Nam's story-led format, with real photos and no invented history (Q-01, Q-23).

### 3. UI/UX improvements over Quý Nam

| Quý Nam | 43 Logistics |
| --- | --- |
| Banner PNGs with baked-in text, no H1 | HTML H1 + `next/image` AVIF/WebP photo, ≤ 150 KB LCP |
| Calculator gated by name/phone/email/address | Instant estimate computed on the client from embedded rates; then "Gửi kết quả qua Zalo" (prefilled) or "Nhận báo giá chính xác" (lead form prefilled) |
| Price list with a WordPress dropdown | Statically rendered `/bang-gia/` with a route switcher, sticky header row, mobile card layout, "updated" date |
| Tracking behind login | Single-field lookup, no account (P2, if a data source exists) |
| 5 animated GIF call buttons, 6 phone numbers | One primary channel (Zalo), sticky mobile action bar, context-aware prefilled messages, all through `/go/[channel]` |
| Screenshot wall of about 20 full-size images | Lazy, CSS scroll-snap strip below the fold, lightbox on tap, blurred PII |
| Eager Maps + YouTube iframes | Static map image. Videos: a plain link to YouTube by default. A click-to-load facade (`youtube-nocookie.com`) only after the S-13 spec covers its consent behaviour and the privacy policy discloses it (Q-20) |
| Vietnamese only | VI + EN (`/en/…`) |

### 4. Motion catalogue (within `04-design-system.md` rules)

All motion animates only `transform`/`opacity`, respects `prefers-reduced-motion`, never touches the LCP element, and is CSS-first. `motion` (`LazyMotion` + `m`) is allowed **only in the calculator island**, and only after a bundle measurement shows the route page stays under 120 KB gz with consent rejected (`AGENTS.md` rule 8). The mega menu, drawer and action bar use CSS + Radix only.

| Moment | Effect | Tech |
| --- | --- | --- |
| Hero entrance | Sub-line and CTAs fade/slide in after the H1 is painted | CSS `@starting-style` |
| Route cards | "Press-down" hover with an offset-shadow pseudo-element | CSS |
| Route hero | A small plane icon moves along a dashed flight-path SVG from VN to the country, once | Keyframes on `transform` only (`translate` + `rotate` steps precomputed from the path; no `offset-path`, no stroke animation). The dashed path is static. Disabled under reduced motion |
| Process steps | A progress line fills as the section scrolls into view | `animation-timeline: view()` with a static fallback |
| Rate table | Rows stagger in on first view | CSS, reduced-motion = none |
| Calculator result | "Stamp" pop + chargeable weight count-up | `motion` in the calculator island |
| Mega menu / drawer | 160–240 ms open/close | Radix + CSS |
| Mobile action bar | Hides on scroll down, shows on scroll up | Tiny hook, `transform` only |
| Testimonials | Scroll-snap with momentum; no autoplay | CSS |

View Transitions between route pages stay out of scope (04 already requires an ADR first).

### 5. SEO focus

- Everything in `05-seo-and-tracking.md` stays mandatory: `generateMetadata`, canonical + reciprocal hreflang, JSON-LD per page type (`Organization`/`LocalBusiness`, `Service` + `Offer` from DB prices, `BreadcrumbList`, `FAQPage`, `BlogPosting`), `sitemap.ts`/`robots.ts`, all 63 rows of `data/redirect-map.csv` resolving in one hop.
- **Topic clusters copied from Quý Nam's model:** route page (pillar) ↔ goods/city variants ↔ `kinh-nghiem` guides and glossary posts, with automatic "related" blocks driven by the route relationship, so internal links never depend on editors remembering them. `07-data-model.md` already has `posts.route_id` and `categories.route_id`. The variant→route link (e.g. `pages.route_id` + `pages.type`), block validation, editor support and the related-content query are new. They are assigned to F-04 (schema), A-03 (editor) and S-15 (queries/pages).
- **"Bảng giá {year}"** in the H2 and metadata, with the year and `updated_at` taken from data (never hard-coded).
- **Quality gate against thin pages:** variant pages need unique copy and their own FAQ, otherwise they stay `noindex` in draft.
- **43logistics.vn is the only site we optimise.** All on-page work (keywords, metadata, JSON-LD `Organization`/`LocalBusiness`, internal links) targets 43 Logistics. The keyword set:
  - the route keywords from `AGENTS.md` §1;
  - local intent where 43L really operates: "gửi hàng đi … tại Đà Nẵng", and TP.HCM once the office is confirmed (Q-02);
  - long-tail goods/route variants.
- **No duplicate content with quynam.vn.** All 43L copy is original (§0). Each site keeps its own canonical URLs; no cross-domain canonicals.
- Measured with Search Console after launch (Q-13), not guessed.

**Off-page SEO for 43logistics.vn** (new roadmap tasks, proposed G-01…G-03 in Phase 5–6; each only with confirmed facts):

1. **Local presence (G-01).**
   - Google Business Profile for the Đà Nẵng office, and TP.HCM if confirmed (Q-02). Category, hours, services and real photos, all from `site_settings`.
   - NAP (name, address, phone) identical everywhere: site footer, JSON-LD, GBP, Facebook, Zalo OA, directories.
   - Reviews collected only from real customers, with consent; never bought or gated.
2. **Citations and profiles (G-01).**
   - Vietnamese business directories and map apps (Google Maps, Apple Maps, Cốc Cốc map, local business listings).
   - The Facebook page `facebook.com/43logistics` and Zalo OA, both linking to the site.
   - Kept consistent with the `site_settings` values.
3. **Backlinks earned, not bought (G-02).**
   - **Linkable assets:** the calculator, the combined price list with its "updated" date, per-country prohibited-goods guides, and glossary posts. Other sites cite these.
   - **Diaspora and community outreach:** Vietnamese community sites, associations and groups in Singapore, Korea, Japan, Taiwan and the US (the audience in `01-business.md`), with useful guides rather than ads.
   - **Content partnerships:** guest articles on Vietnamese expat, study-abroad and e-commerce seller blogs; local Đà Nẵng business media.
   - **Partners:** carrier or partner listings only if Q-08 allows naming them.
   - **PR:** only real news (e.g. a new route); no fabricated press.
4. **What we don't do.**
   - Paid links, PBNs, link exchanges, link farms or mass directory/comment spam. They breach Google's spam policies and risk a manual action on the one site we're building.
   - Links from quynam.vn are limited to at most an editorial "sister company" mention on its About page, if Q-24 allows the relationship to be public. No sitewide footer links and no reciprocal link schemes.
5. **Monitoring (G-03).**
   - Search Console: Links report, queries per route, coverage.
   - A monthly backlink review (Search Console + one backlink tool, chosen at task time).
   - Disavow only if a real spam attack appears.
   - KPIs: impressions and clicks per route keyword, referring domains, GBP calls and direction requests, feeding the existing `contact_events` reporting (A-07).

### 6. Security focus

1. **F-00 stays first.** The app repo currently tracks `.env`; rotate the keys, untrack the file, and add gitleaks. Nothing else ships before it.
2. **HTTP headers** in `next.config.ts`: `Strict-Transport-Security` (preload), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geolocation off), `frame-ancestors 'none'`, and a **static allowlist CSP**. A nonce CSP would force dynamic rendering and break the Cache Components static shells (06); the exact CSP and the GTM/PostHog/Turnstile hosts are settled in the S-13 spec.
3. **Server Actions:** Zod on every input, Turnstile on the lead form, per-IP-hash rate limiting (implementation chosen in the S-08 spec, no new vendor without an ADR), and `requireRole()` + RLS deny-by-default for admin (rules 6, 7).
4. **`/go/[channel]`:** channel allowlist built from `site_settings` only, so it can never be an open redirect.
5. **No raw IP stored**, consent before any tag (rule 14), `server-only` DB client, Zod-validated `env.ts`, and `pnpm audit` + Dependabot on the app repo.
6. **No third-party iframes** for the calculator or tracking. If the sister company's system is used (Q-18/Q-24(c)), call its API server-side from a route handler and never expose its credentials.
7. Admin is Clerk-only, with no public sign-up, no author archives and no exposed user enumeration (`02-legacy-audit.md` #15).

### 7. Delivery mode: code only, no automated tests

As the owner asked, the build ships **without Vitest unit tests and without Playwright e2e tests**. **Decided in ADR 0004 (accepted 2026-10-21)**, which also makes open questions non-blocking. What remains as the verification floor, since none of these are test suites:

- `pnpm lint` + `pnpm typecheck` + `pnpm build` must pass on every PR. These are the **post-F-01** commands: today the app has `type-check`, and `lint` runs `biome lint .`, not `biome check .`.
- `pnpm check:redirects` (an F-07 script, not a test framework) is kept, because broken legacy URLs are the biggest SEO risk of the migration.
- Manual checks per PR: 360/768/1280 px, keyboard pass, reduced motion, one Lighthouse mobile run on the changed page, and the Rich Results Test for new page types.
- **Accessibility replacement for axe-in-Playwright:** a manual axe DevTools (browser extension) scan of each changed page at 360 px and 1280 px, with zero serious/critical issues recorded in the PR description.
- The price engine (S-03) stays a set of pure, typed functions so tests can be added later without refactoring.

Recorded as **ADR 0004 (accepted 2026-10-21), amending ADR 0002 §4** ("Accessibility is checked with axe in Playwright"). The same change set updated:

- `AGENTS.md`: §3 (Tests row), §7 (`test`, `test:e2e` rows), §9 (DoD).
- `06-architecture.md` "Quality harness": unit, e2e, axe and SEO-check bullets.
- Roadmap acceptance criteria that mention tests: F-01, F-06, F-08, S-02, S-03, S-07, S-08, S-10 and A-02 ("(e2e)").
- Skills: `/implement` (test-first Red/Green steps), `/feature-bug` (test-plan batch), `/fix-implement` (step 3 "add a regression test" and the Codex check for it) and `/code-review` (test-coverage check). Each gets a manual-verification path instead.

### Impact by repo

- **context:**
  - `03`: sitemap deltas, nav, home/route section order, variant page type, `/bang-gia/`, price-eligibility rule.
  - `04`: motion catalogue.
  - `05`: topic clusters, thin-page gate, `/bang-gia/` metadata, video embed handling.
  - `06`: security headers, quality harness.
  - `07`: variant→route link and page type, localised rate notes.
  - `10`: new tasks S-14 `/bang-gia/` and S-15 variant pages; test criteria removed.
  - `11`: Q-22…Q-24 (Q-21 answered).
  - `01`: sister-company row (added 2026-10-21; clarified as structure-only the same day).
  - `10`: new tasks S-14, S-15 and G-01…G-03 (off-page SEO).
  - `09`: a Quý Nam import step (source-tagged, unverified seed).
  - `AGENTS.md` §3/§7/§9, the four skills listed in §7, and ADR 0004.
- **app:** no new dependencies beyond the ADR 0002 stack. New code: the variant page type + route link (F-04/S-15), localised rate notes (F-04), the shared price-eligibility helper, the `/bang-gia/` route, security headers, and the components from `04` with the motion catalogue applied. `next.config.ts`, `proxy.ts` and `motion` (instead of `framer-motion`) exist only after F-01/F-02; today the app is on Next 15 with `next.config.mjs` and `framer-motion`.

## Alternatives considered

1. **Clone Quý Nam 1:1, or reuse its data, wording, claims and stats.** Rejected by the owner (2026-10-21): quynam.vn is a structure reference only. Copied text is duplicate content, and its numbers, prices and claims describe Quý Nam, not 43 Logistics (rule 1).
2. **Keep the 03 IA unchanged and ignore Quý Nam.** Rejected by the owner: it misses the price-list page, the long-tail content model and the proof sections that make Quý Nam effective.
3. **Programmatic country × goods × city pages generated from data.** Rejected for now: high risk of thin or duplicate pages that Google demotes; variants are created by hand behind a quality gate instead.
4. **Keep the full test harness (Vitest + Playwright) as `AGENTS.md` requires.** Not chosen, per the owner's instruction. A middle ground is **tests only for the S-03 price engine** (about 20 cases): money is the place where a silent bug costs real revenue and trust. Not chosen in ADR 0004.
5. **Embed a partner calculator or tracker by iframe (Quý Nam's approach).** Rejected: lead gates, no SEO value, CSP and third-party risk.

## Consequences

- **Performance budget:** unchanged. LCP < 2.5 s, INP < 200 ms, CLS < 0.1, and first-party JS < 120 KB gz measured on the initial route render with consent rejected (framework included). The motion catalogue is CSS-first, and `motion` is allowed only in the calculator island after a bundle measurement. The screenshot wall and goods gallery are lazy and below the fold, with reserved dimensions (CLS). Removing tests doesn't relax the budget; Lighthouse becomes a manual step instead of a CI gate.
- **SEO/redirects:** the new `/bang-gia/` and variant pages add indexable URLs; `redirect-map.csv` needs no change (`/bang-gia/` is new). The variant page type increases editorial load. quynam.vn competes for the same route keywords; we answer with original 43L content, local signals (GBP, NAP, Đà Nẵng intent) and earned links, never with shared or copied content.
- **Off-page effort:** G-01…G-03 are recurring work (outreach, reviews, monitoring) for the owner or a marketer, not one-off code.
- **Security:** headers and CSP add a small setup cost and need care with GTM (S-13). The F-00 key rotation is a blocking ops task for the owner.
- **Consent/PDP law:** proof sections depend on documented customer consent (Q-12). The author box needs staff consent. The consent architecture is unchanged unless a video facade is adopted: that adds a third-party request on click, so it belongs to the S-13 spec, the privacy-policy disclosures and the Q-20 vendor/transfer assessment. The default is a plain outbound link.
- **i18n:** `/bang-gia/` needs EN slugs. Route rate notes need localised storage. Variant pages may stay VI-only at first (08 workflow), provided unpublished EN equivalents are absent from pages, hreflang and the sitemap.
- **Quality risk of code-only delivery:** regressions in the price engine, redirects, consent gating and `/go/` tracking won't be caught automatically. They will rely on manual QA (L-01) and on `check:redirects`. The cost is lower speed of later refactors and a higher chance of shipping a wrong price, which is the most damaging failure for this site (rules 1–2).
- **Process cost:** done. ADR 0004 and the matching edits to the skills and context docs landed on 2026-10-21.
- **Cost:** no additional paid vendor is proposed. Still unknown:
  - API access and any cost of using `tracking.quynam.vn` (Q-18/Q-24(c)), likely low as it's a sister company;
  - extra traffic and media storage on existing vendors;
  - recurring editorial and translation effort for variant pages and guides (Q-16).

## Open questions

- **Q-21** (answered and clarified 2026-10-21): Quý Nam is a sister company. It is a reference for structure, layout, page count and implementation only; 43logistics.vn uses only 43 Logistics' own facts, numbers, slogans, images and colours.
- **Q-24** (narrowed 2026-10-21): (a) may 43logistics.vn say publicly that it is part of the Quý Nam group (About page, footer)? (b) may the site use the sister company's tracking system or calculator API (`tracking.quynam.vn`) for 43L shipments, if it is the real operational system?
- **Q-22** (new): which extra destinations and services does **43 Logistics itself** offer? Quý Nam's menu (AU, CA, CN, UK, DE, FR, other EU; order consolidation, frozen food, vacuum packing, home pickup) is only a checklist of what to ask, not a fact about 43L.
- **Q-23** (new): real trust numbers and coverage for 43 Logistics: years operating, shipments or customers per year, press mentions. Otherwise the stats band and press strip stay hidden.
- Existing questions this proposal depends on: Q-03 (hours / 24-7), Q-04 (prices), Q-05 (active routes), Q-08 (carriers/logos), Q-09 (compensation), Q-10 (goods rules, also gates goods variants), Q-12 (testimonial consent), Q-13 (Search Console access), Q-16 (translation effort), Q-18 (tracking data source), Q-20 (privacy assessment for any new embed or vendor).
- C-01 must also confirm the 4-step process before it is displayed.

## Related

- ADR 0001 (Next.js replaces WordPress), ADR 0002 (stack; this proposal would amend its test harness), ADR 0003 (workflow, skills).
- `docs/context/03-information-architecture.md`, `04-design-system.md`, `05-seo-and-tracking.md`, `06-architecture.md`, `10-roadmap.md`, `11-open-questions.md`.
- `AGENTS.md` §4 rules 1–3, 8–9, 12–14; §9 definition of done; §10 do-nots.
