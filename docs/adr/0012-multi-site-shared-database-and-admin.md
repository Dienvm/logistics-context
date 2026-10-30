# ADR 0012 — Multi-site: one database, one admin and one codebase for 43logistics.vn, avlogistics.vn and gtlogistic.vn

- Status: Accepted (2026-10-30)
- Amends:
  - ADR 0003 Decision 1: one app repo serves every site; no per-brand app forks.
  - ADR 0006: tag invalidation is per process plus an HMAC fan-out to the other sites' processes.
  - ADR 0008 Decision 1: one Caddy in front of one app service per site.
  - ADR 0008 Decision 2: one build per site from the same SHA.
  - ADR 0008 Decision 4: cross-process invalidation by fan-out while each site runs exactly one process.
- Owner repo: both
- Roadmap: MS-01 … MS-09 (new)
- Source: `docs/proposals/multi-site-shared-database-admin.md` (Codex-reviewed 2026-10-30, all 13 review points applied by the owner)
- Context:
  - 43 Logistics, AV Logistics and GT Logistic are separate legal entities run as one group. On 2026-10-30 the owner forked the app for AV (`Dienvm/avlogistics.vn`, from app `9f03153`) with an AV rebrand and a redesigned public UI.
  - The owner confirmed that AV uses the same routes and retail rate cards as 43 ("giống"). The owner then asked that AV and GT share 43's Supabase and Clerk, because "sử dụng chung thông tin, ngay cả trang admin, cũng sẽ tương tự". That reverses the "separate Supabase/Clerk for AV" choice made earlier the same day.
  - The app is single-site:
    - `site_settings.key` is the primary key; pages, menus, posts and categories have site-less unique slugs/keys;
    - leads and contact events don't record their site;
    - `oauth_tokens.provider` holds one Zalo OA token;
    - admin saves invalidate only the saving process (ADR 0006, ADR 0008 Decision 4);
    - `NEXT_PUBLIC_*` values and the site shell are fixed at build time;
    - Clerk production is bound to 43logistics.vn.
  - Two forks on one schema would drift on the first migration.

## Decisions

1. **One Supabase database for all sites, with a `site` dimension** (`site` enum `43l | av | gt`).
   - **Site-owned tables** carry `site NOT NULL DEFAULT '43l'` with site-inclusive uniqueness: `site_settings` (primary key `(site, key)`), `pages` and translations, `menu_items` and translations, `posts`/`categories` and translations, `post_categories`, page-bound `faqs`, `testimonials`, `redirects`, `leads`, `lead_events`, `contact_events`.
   - Composite foreign keys `(parent_id, site)` keep every parent and child on the same site.
   - **Shared tables** stay site-less: `routes`, every rate-card/rate/surcharge table (one price source, rule 2), `goods_rules`, route-bound `faqs`, `media`, `profiles`.
   - **`oauth_tokens`** is keyed by `(provider, account)`, and each site names its OA account.
2. **Migrations are expand → compatible app → constraint switch → contract, never one step.**
   - New columns and composite indexes are added beside the old ones, with every existing row `43l`.
   - An app that writes `site` and upserts on the new keys is deployed.
   - Then the primary key and unique switch happens, after a backup (rollback re-adds the old constraints while only `43l` rows exist).
   - Only then are `av`/`gt` rows seeded.
   - Each step is rehearsed on `pnpm db:local`.
3. **One codebase, one build and one container per site.**
   - The deploy builds one image per site from the same SHA, with that site's `NEXT_PUBLIC_*` build args and a prerender of that site's data.
   - The server env `SITE` names the **deployment site**. Public queries take the site as an argument, so it is part of every `"use cache"` key.
   - **Per-site presentation:** a token set per site (`app/theme.<site>.css`), brand assets under `public/brands/<site>/`, and home-page skins. The AV fork's redesign is ported as the `av` skin and its primitives are shared. `Dienvm/avlogistics.vn` is retired after the port (a separate step).
4. **One admin, only on 43logistics.vn, with an explicit target site.**
   - The `av`/`gt` builds ship no Clerk keys, so `/admin` answers the existing fail-closed 404 there.
   - The admin validates a target site on every read, write, ID lookup and export of site-owned data.
   - `requireRole` gains a site scope (Q-36).
   - Leads and analytics get a site column and filter.
   - One Clerk instance serves all staff.
5. **Cross-site invalidation by fan-out.**
   - After `updateTag` in the saving process, the action posts the affected tags inside `after()` to every other site service's `POST /api/revalidate`. Site-owned tags carry the site.
   - The post goes over the internal Docker network, is HMAC-signed with `REVALIDATE_SECRET`, is limited to the inventoried tag shapes (`menu`, `settings`, `page`, `route`, `goods`, `faqs`, `posts`, `testimonials`, `media`), gets one retry and logs failures.
   - The receiver calls `revalidateTag(tag, 'max')`. The first request after it may still be served stale; the next one is fresh. A failed post leaves the tag stale until a deploy or the rate reads' `cacheLife('hours')`, and the admin shows that the site was not refreshed.
   - Caddy never proxies `/api/revalidate`.
   - If any site ever runs more than one process, a shared cache handler replaces the fan-out (new ADR).
6. **Shared VPS.**
   - One Compose project: Caddy plus `app-43l`, `app-av`, `app-gt`.
   - Each service has its own `.env`: the shared `DATABASE_URL`; its own `SITE`, `IP_HASH_SALT`, notification recipients and OA account; per-site Cloudflare zones with L-00b settings.
   - Health checks, digest checks, `known-good.log` and rollback (L-00) run per service.
   - Capacity (CPU, RAM, pooler connections, rolling-deploy peak next to `quanly`) is measured before MS-06.
7. **Per-site SEO.**
   - Canonical, hreflang (published translations only), sitemap, robots, `llms.txt`, RSS and the `Organization` JSON-LD (no cross-brand `sameAs`) come from each site's URL and rows.
   - Each site has its own redirect map and legacy-ID map (43 keeps the WordPress map; AV and GT start empty), a `check:redirects` run, slug locks and an IndexNow key/host.
8. **Launch gates for AV (and GT):**
   - Q-33 (controller and shared processing) and Q-36 (staff scope) are answered and enforced.
   - Each lead and consent record stores its site and that site's privacy-policy version, and the consent matrix (ADR 0004) passes per site.
   - Duplicate route copy is unique, or `noindex`/canonical to 43 (Q-34).
   - The skin passes the ADR 0006 route-JS budget, axe at 360/1280 px, token contrast and the rules 8–10 motion review. ADR 0009 field data is reported per domain after launch.

## Alternatives considered

- **Separate Supabase and Clerk per site:** works with today's code, but prices, rules and FAQs are maintained once per site and staff use one admin per site. It invites price drift, a practical rule-2 risk. Reversed by the owner.
- **Shared database with forked app repos:** every migration must land in lock-step everywhere, and a lagging fork breaks on the schema. Rejected: the schema needs one owner.
- **Shared database without a `site` column, brand facts from env/config:** page copy, menus, posts and leads stay mixed. Rejected.
- **A Postgres schema per site:** strong isolation, but several Drizzle models and migration targets, plus cross-schema joins for route pages. More moving parts than a column.
- **Clerk satellite domains (an admin per domain):** a paid Clerk feature, and unnecessary with one admin.
- **A single image for all sites with runtime configuration:** `NEXT_PUBLIC_*` inlining and the build-time prerender make this a redesign of its own. Not chosen.

## Consequences

- **Easier:**
  - one rate, rule or FAQ edit serves every site;
  - one admin and one Clerk instance;
  - GT becomes a seed plus a token set and assets, not a fork;
  - potentially one Supabase plan instead of three (limits re-checked for three sites' load).
- **Harder:**
  - every query on a site-owned table needs the site argument;
  - every admin action needs target-site validation and fan-out;
  - three builds per SHA (about three times the CI build minutes, within the owner's free-minutes rule; Lighthouse stays label-gated);
  - a bad migration hits every site at once, hence Decision 2;
  - one VPS carries three apps.
- **Risk to the live 43 site:** MS-01/MS-03 touch production indexes and a primary key. Mitigated by defaults, compatible-app-first ordering, backup and local rehearsal.
- **Personal data (rule 14, PDP Law 91/2025, Decree 13/2023):** three entities' leads share a processor and possibly staff. Decision 8 makes the legal answers and the per-site consent evidence launch gates, not follow-ups. Each site's privacy policy names its own controller and keeps the cross-border disclosure (Supabase Singapore, VPS Jakarta).
- **Unchanged:** golden rules 1–15 apply per site; prices still come only from the rate tables (rule 2, now shared); facts are confirmed per site in `owner-confirmations.json`.
- **Follow-ups:**

  | ID | Task |
  | --- | --- |
  | MS-01 | Expand migration |
  | MS-02 | Site-aware queries, cache keys and seed |
  | MS-03 | Constraint switch |
  | MS-04 | Admin target site, site-scoped roles, lead and analytics filters |
  | MS-05 | Revalidate fan-out |
  | MS-06 | Build matrix and multi-service deploy |
  | MS-07 | Port the AV skin |
  | MS-08 | AV launch |
  | MS-09 | GT |

  Each MS task gets a spec through `/feature-bug`. Open questions: Q-33…Q-37.
