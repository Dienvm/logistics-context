---
title: Multi-site — one database and one admin for 43logistics.vn, avlogistics.vn and gtlogistic.vn
status: draft
owner_repo: both
roadmap: []
updated: 2026-10-30
---

# Multi-site — one database and one admin for 43logistics.vn, avlogistics.vn and gtlogistic.vn

## Problem

43 Logistics, AV Logistics and GT Logistic are separate legal entities run as one group. What is actually recorded:

- **Confirmed for AV (2026-10-30):**
  - company facts from its business registration (0402317649, 20 Tú Quỳ, Hòa Khánh);
  - phone and Zalo 0905 985 963;
  - 20 Tú Quỳ is also the receiving warehouse;
  - the same routes and retail rate cards as 43 ("giống").
- **Owner intent (2026-10-30):** AV and GT should use the **same Supabase and Clerk**, because "sử dụng chung thông tin, ngay cả trang admin, cũng sẽ tương tự".
- **Not confirmed:** GT's domain, facts and price equivalence (Q-37); whether staff and goods rules are shared across the entities (Q-36); the legal basis for sharing customer data (Q-33).

The app is single-site today, so pointing a second site at the 43 database breaks in five places:

1. **Per-brand facts collide.**
   - `site_settings.key` is the primary key, so an AV site would show 43's legal name, tax code, phone, Zalo and offices.
   - `pages`/`page_translations` (`pages.key` unique, `page_tr_locale_slug_uq`), `menu_items` (`menu_items_menu_key_uq`), `posts`/`categories` (`post_tr_locale_slug_uq`, `cat_tr_locale_slug_uq`) and `testimonials` hold copy that names the brand. Their unique keys forbid a second site's `/gioi-thieu/`.
2. **Customer data mixes.** `leads`, `lead_events` and `contact_events` do not record which site, and therefore which company, a contact came from. The Zalo OA token is stored once (`oauth_tokens.provider` is the primary key).
3. **Admin saves don't reach other processes.** Admin actions call `updateTag` only in the process that saved (`06-architecture.md` "Rendering & caching", ADR 0006). Another site's process misses the immediate invalidation:
   - rate reads still refresh within `cacheLife('hours')`;
   - settings, menus, pages, FAQs, goods rules, posts, testimonials and media (`cacheLife('max')`) stay stale until a restart or deploy.
4. **Clerk** production is bound to 43logistics.vn. A second admin would need satellite domains, a second instance, or one shared admin.
5. **The AV fork is a separate repo** (`Dienvm/avlogistics.vn`, forked from app `9f03153` on 2026-10-30; rebrand and redesigned public UI in its PR #1). Two codebases on one schema drift on the first migration.

## Proposed approach

**One database, one admin, one codebase; one build and one container per site.**

### 1. A `site` dimension in the data (app: schema, migrations, seed)

**Site-owned rows.**

- A `site` enum (`43l`, `av`, `gt`) in `db/enums.ts`.
- These tables get `site NOT NULL DEFAULT '43l'`, with uniqueness including it:
  - `site_settings`: `(site, key)`;
  - `pages`: `(site, key)`;
  - `page_translations`: `(site, locale, slug)`;
  - `menu_items`: `(site, menu, key)`;
  - `posts` and `categories`: slugs per `(site, locale)`;
  - `testimonials`, `redirects`, `leads`, `contact_events`.
- Rows that hang off a site-owned parent get the parent's `site` too. That covers translations, `lead_events`, `post_categories`, page-bound `faqs` (`faqs.page_id`) and menu items that target a page.
- Composite foreign keys `(parent_id, site) → parent(id, site)` make a cross-site link impossible at the database level, not only in code. Examples: an AV menu item pointing at a 43 page, an AV translation on a 43 page, an AV post in a 43 category.
- **FAQs are split by owner:** route-bound FAQs stay shared, and page-bound FAQs become site-owned.
- **`oauth_tokens`** is keyed by `(provider, account)`. Each site's notification settings name the OA account they use; refresh locking is per row.

**Shared rows.**

- `routes` (+ translations), `rate_cards` and every rate, column, surcharge and link table, `goods_rules`, route-bound `faqs`, `media`, `profiles`.
- Rule 2 stays one source of truth, now read by every site.
- Brand-naming route copy lives in the per-site route **pages**, never in shared rows.
- Sharing `goods_rules` assumes one operations approval for all entities (Q-36). Sharing `media` requires that a photo's usage permission covers every site that uses it, which is the rule-14 consent scope.

**Migration: expand, then contract, never one step.**

1. **Expand:** add the `site` columns (`NOT NULL`, default `43l`) and the new composite unique indexes **alongside** the old ones. Old code keeps working because every row is `43l` and old upserts still hit the old keys.
2. **Compatible app:** deploy an app that writes `site` explicitly and upserts on the new keys (`writeSettings` in `scripts/seed/write-routes.ts` today targets `site_settings.key`). It must still run against the expanded schema.
3. **Constraint switch:** make `(site, key)` the `site_settings` primary key and drop the old single-column uniques, after a backup. Rollback means re-adding the old constraints, which is valid while only `43l` rows exist.
4. **Contract:** only then insert `av` rows (seed with `--site av`), and later `gt`.

Each step is rehearsed on `pnpm db:local` first. Production builds prerender against the database (ADR 0008), so no build of a later step runs before its migration is applied.

**Seed and confirmation.**

- `db:seed --site <s>` and `db:confirm --site <s>`.
- Per-site files live under `data/seed/sites/<site>/` (settings, pages, menus, info pages, posts). Shared route and price seeds stay where they are.
- `owner-confirmations.json` gets a per-site section for settings, pages and posts. Route and rate-card confirmations stay shared, and are AV-confirmed only.

### 2. The deployment site and the admin target site (app)

- **Two different notions:**
  - the **deployment site** (`SITE`, server env validated in `shared/config/env.server.ts`) decides what a public container serves;
  - the **admin target site** is chosen explicitly in the admin and validated on every admin read, write, ID lookup and export.
- Public queries on site-owned tables take the site as an **argument**. It becomes part of every `"use cache"` key, so no cached value is ever shared between sites, even in a process that reads more than one site (the admin's).
- Admin queries and actions take the target site the same way. `requireRole` gains a site check, so an account limited to one company (Q-36) can neither read nor write another site's rows.
- **One build per site from one commit.** The deploy builds three images from the same SHA, each with that site's build args and a database prerender of that site.
  - `NEXT_PUBLIC_*` values are inlined at build (`Dockerfile` ARGs, `shared/config/env.public.ts`): `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_CF_BEACON_TOKEN`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
  - The site shell is prerendered at build from the database.
  - One shared image would therefore not change hosts, tracking or prerendered brand content.
  - The build matrix replaces the single build in `deploy.yml`.
- **Per-site presentation:**
  - token sets in `data/design-tokens.json`, emitted as `app/theme.<site>.css` and imported by the site's build;
  - brand assets under `public/brands/<site>/`;
  - home-page skins: the AV fork's redesign becomes the `av` skin, and its primitives (`Marquee`, `Odometer`, `RevealText`, `ParticleField`) are shared.
- **SEO per site:**
  - metadata, canonical, reciprocal hreflang (only published translations), `sitemap.ts`, `robots.ts`, `llms.txt` and RSS follow the site's URL and rows;
  - each site has its own `data/redirect-map*.csv` and legacy-ID map: 43 keeps its WordPress map, and AV and GT start empty. `check:redirects` runs per site with one hop;
  - slug locks are per site;
  - IndexNow uses a per-site key and host. An admin save submits the **target** site's URLs.
- **Admin only on 43logistics.vn.** The `av` and `gt` builds have no Clerk keys, so `proxy.ts` answers `/admin` with the existing fail-closed 404 (F-05), and their public pages carry no Clerk code (as today).
  - The admin gets a site switcher for site-owned sections: Trang, Bài viết, Đánh giá, Câu hỏi (page-bound), Cài đặt, Chuyển hướng.
  - Yêu cầu báo giá and Thống kê liên hệ get a site column and filter.
  - Shared sections (Tuyến & bảng giá, Quy định hàng hoá, route FAQs, Thư viện ảnh) are unchanged.
- **The AV fork is ported.** Its brand and UI commits move into `43logistics.vn` as the `av` site. Retiring `Dienvm/avlogistics.vn` is a separate lifecycle step after the port.

### 3. Cross-site cache invalidation (app)

- **Tag inventory** (every `cacheTag` in `modules/*` today): `menu`, `settings`, `page:{key}`, `route:{key}`, `goods`, `faqs`, `posts`, `testimonials`, `media:{id}`. Site-owned tags carry the site (`settings:{site}`, `page:{site}:{key}`, …); shared tags don't.
- **Fan-out:** after an admin write, the action does what it does today (`updateTag` locally), then `after()` posts the tags to every other site container's `POST /api/revalidate`.
  - The call goes over the internal Docker network, to service names `app-av` and `app-gt`.
  - The body is HMAC-signed with `REVALIDATE_SECRET` and limited to the inventory's tag shapes.
  - There is one retry and a logged failure.
  - Caddy never proxies `/api/revalidate`.
- **Freshness contract:**
  - The receiver calls `revalidateTag(tag, 'max')`, which is stale-while-revalidate: the **first** request after the call may still get the old page while the new one renders, and the request after that is fresh. That is the accepted staleness for every tag, prices included, because 43's own public pages work the same way today.
  - If a fan-out call fails after its retry, the tag stays stale until the next deploy, and the rate reads' `cacheLife('hours')` still applies. The admin save shows "đã lưu, site AV/GT chưa làm mới" so staff can trigger a resend.
- This **amends ADR 0008 Decision 4**, which calls for a shared cache handler when scaling beyond one process. The fan-out is chosen because each site is still one process. A shared handler stays the path if any site ever runs replicas.

### 4. Hosting on the shared VPS (app: deploy)

- One Compose project with one Caddy and services `app-43l`, `app-av`, `app-gt`. Each has its own `.env`:
  - the shared `DATABASE_URL`;
  - its own `SITE`;
  - its own `IP_HASH_SALT`;
  - its own notification recipients and OA account (Q-35).
- **Caddyfile:** one block per apex plus `www`, proxying to the matching service. `quanly.43logistics.vn` stays as built. Cloudflare, `trusted_proxies` and hardening (L-00b) apply per zone.
- **Deploy:** the same SHA builds three images. Each service keeps its own health check, digest check, `known-good.log` and rollback (L-00). A rollback must stay compatible with the current schema, which the expand/contract order above guarantees.
- **Capacity, to be measured before MS-06:**
  - the VPS is 2 vCPU / 8 GB and today runs `app` (3 GB limit), Caddy (512 MB) and the owner's `quanly` host app;
  - measure each app's resident memory and CPU under load, the Supabase pooler connections per process, and the peak during a rolling deploy (old and new container side by side);
  - the operator, monitoring and upgrade owner stay as in L-02 (Q-15).

### 5. Context workspace (context)

**An ADR** recording the decision, with explicit amendments:

| ADR | Amendment |
| --- | --- |
| ADR 0003 | One app repo serves every site; context docs gain per-site sections |
| ADR 0006 | Per-process tags plus HMAC fan-out |
| ADR 0008 | Several app services behind one Caddy; Decision 4 as above |

Those ADRs stay current otherwise.

**In-place updates:**

| File | Update |
| --- | --- |
| `AGENTS.md` | §1 (three sites), §3 (build matrix, `SITE`), §4 rule 2 (shared price source, per-site facts) |
| `01-business.md` | Per-site facts: the AV section with the 2026-10-30 confirmations |
| `03-information-architecture.md` | Per-site IA |
| `04-design-system.md` | Per-site token sets |
| `05-seo-and-tracking.md` | Per-site GTM, beacon, Search Console, redirects, duplicate content |
| `06-architecture.md` | Site arguments, admin target site, revalidate endpoint, build matrix |
| `07-data-model.md` | `site` column, composite keys, shared and owned tables |
| `08-i18n.md` | Per-site hreflang eligibility |
| `09-migration.md` | Per-site redirect inventories |
| `deploy/README.md` | Multi-service runbook |

Implemented specs stay as history; changed behaviour gets new specs.

**Roadmap rows, proposed:**

| ID | Task |
| --- | --- |
| MS-01 | Expand migration |
| MS-02 | Site-aware queries, cache keys and seed |
| MS-03 | Constraint switch |
| MS-04 | Admin target site, site-scoped roles, lead and analytics filters |
| MS-05 | Revalidate fan-out |
| MS-06 | Build matrix and multi-service deploy |
| MS-07 | Port the AV skin (with the checks below) |
| MS-08 | AV launch: DNS, privacy gate |
| MS-09 | GT, after Q-37 |

## Alternatives considered

1. **Separate Supabase and Clerk per site** (the owner's first choice on 2026-10-30, reversed the same day).
   - Works with today's code and the AV fork.
   - Prices, rules and FAQs are entered once per site, and staff use one admin per site. Drift between price lists becomes a practical rule-2 risk.
2. **Shared database, forked repos.**
   - Keeps the AV fork, but every migration must land in every repo in lock-step, and a fork that lags crashes on the new schema.
   - Rejected: the schema needs one owner.
3. **Shared database without a `site` column, AV facts from env/config.**
   - Page copy, menus, posts and leads stay mixed, and the brand name in database copy stays wrong.
   - Rejected.
4. **A Supabase schema per site** (`site_av.pages`, …), with shared route and price tables in `public`.
   - Strong isolation, but Drizzle models per schema, several migration targets and cross-schema joins for route pages.
5. **Clerk satellite domains**, so each site has its own `/admin`.
   - A paid Clerk feature (to be checked), and unnecessary with one admin.

## Consequences

- **Prices (rule 2):** one rate edit serves every site within the freshness contract above. GT inherits shared prices only after the owner confirms equivalence (Q-37).
- **Personal data (rule 14; PDP Law 91/2025, Decree 13/2023). Launch gates for AV, not later work:**
  - **Q-33 answered:** controller per site, and whether shared processing is disclosed or covered by a group agreement.
  - **Q-36 answered and enforced:** site-scoped roles if staff may see only their company's leads.
  - **Per-site consent evidence:** each lead and consent record stores the site and that site's privacy-policy version. The consent cookie is per domain already, and the consent matrix (ADR 0004) is re-run per site.
  - Per-site IP-hash salts.
  - Retention per site (Q-17), and the existing cross-border disclosure (Supabase in Singapore, VPS in Jakarta) in every site's privacy policy.
- **SEO and GEO:**
  - Near-identical route copy on three domains is duplicate content. Until the AV/GT copy is unique, their route pages carry `noindex` or a canonical to 43, as the owner decides (Q-34).
  - Cross-brand footer links are a separate choice from `sameAs`: separate legal entities are not the same entity, so `sameAs` between brands is not used.
- **Performance and accessibility:** each skin is measured on its own before adoption:
  - the ADR 0006 route JS per site, with Lighthouse mobile and consent rejected;
  - ADR 0009 field reporting per domain;
  - axe at 360 and 1280 px;
  - the contrast pairs of its token set;
  - a motion review against rules 8–10, including the AV hero's animated route marquee.

  The fork's particle island measured 1,160 B gz as a production chunk (2,113 B raw) on 2026-10-30. That is only a chunk size, not route JS or field data.
- **i18n:** VI/EN per site. Brand names come from `site_settings.company`, so `messages/*` needs no per-site overrides if copy keys stay brand-neutral.
- **Ops:**
  - one SHA builds three images, about three times the build minutes, which counts against the free CI budget (owner, 2026-10-28);
  - a bad migration affects every site, hence the expand/contract order and the local rehearsal.
- **Cost:** potentially avoids a second and third Supabase project and Clerk instance. Actual plan limits (database size, egress, storage, connections) are checked against three sites' load before relying on it.
- **Risk to the live 43 site:** MS-01 and MS-03 touch production indexes and a primary key. Mitigations: defaults, compatible app before the constraint switch, backup, rehearsal.
- **Lifecycle:** reverses the owner's 2026-10-30 "separate Supabase/Clerk for AV" choice (recorded in the AV PR #1 thread). No current proposal or ADR is superseded wholesale (see §5). The AV repo's retirement is a separate step after MS-07.

## Open questions

All are in `docs/context/11-open-questions.md`.

- **Q-33:** Who is the data controller for each site's leads? May staff of one company read another's? Is there a group processing agreement, or a disclosure in each privacy policy? **Launch gate for AV.**
- **Q-34:** Should AV/GT route copy be made unique, or `noindex`/canonical to 43 until it is? Are cross-brand footer links wanted?
- **Q-35:** Per-site lead notifications: which recipients and Zalo OA accounts (S-08b, Q-28)?
- **Q-36:** Staff scope: all sites, or one company each? Shared goods-rule approval across entities? **Launch gate for AV** if scoping is needed.
- **Q-37:** GT: domain `gtlogistic.vn`, company facts, brand assets, and whether its prices equal 43's.
- AV facts still open: hours; social, GTM and offer (owner: "cập nhật sau"); DNS (owner: "gửi sau"). These move into `01-business.md` once the ADR settles where per-site facts live.

## Related

- **Decided by ADR 0012** (`docs/adr/0012-multi-site-shared-database-and-admin.md`, 2026-10-30).
- ADR 0003 (repos), ADR 0004 (consent matrix), ADR 0005 (modules), ADR 0006 (Cache Components, per-process tags), ADR 0007 (rate cards), ADR 0008 (VPS, Decision 4), ADR 0009 (field Web Vitals), ADR 0010 (Cloudflare edge), ADR 0011 (GEO).
- `docs/context/06-architecture.md` "Rendering & caching", "Auth & roles"; `docs/context/07-data-model.md` "`site_settings` keys".
- `docs/proposals/nextjs-rebuild-quynam-pattern.md`: Quý Nam, a sister company with the same duplicate-content and cross-brand questions (Q-21, Q-24).
- The AV fork: `avlogistics.vn/app` (`github.com/Dienvm/avlogistics.vn`, PR #1).
