---
title: Create the Supabase schema, migrations and seed
type: feature
status: approved
owner_repo: both
roadmap: F-04
priority: must-have
blocked_by_questions: [Q-01, Q-02, Q-03, Q-04, Q-05, Q-06, Q-07]
updated: 2026-10-21
---

## Feature: Create the Supabase schema, migrations and seed

### Problem Statement

Every content and conversion feature reads from the database: rate tables, the calculator, the mega menu, route pages, leads, contact events and settings (`AGENTS.md` rules 1–2 and 5). Today the app has only a stub:

- `db/client.ts` is already `server-only`, with a lazy `getDb()`;
- `db/schema.ts` is an empty re-export;
- `drizzle-orm 0.33` / `drizzle-kit 0.24`;
- one leftover template migration (`db/migrations/0000_nostalgic_mauler.sql`, which creates the template's `profiles` (membership) and `todos` tables).

There's no Supabase project yet, and no seed.

Roadmap row `docs/context/10-roadmap.md` F-04. *Accept:*
- `pnpm db:migrate && pnpm db:seed` on a fresh DB creates all tables with RLS enabled and 10 routes (8 active);
- `db/client.ts` cannot be imported from client code (`server-only`);
- the template todo/profile tables are dropped;
- Drizzle and drizzle-kit are upgraded to current.

Owner decisions (2026-10-21):

1. Verify against a **real Supabase cloud project** in Singapore, created by the owner before implementation.
2. Seed **routes, rates, settings, plus the IA pages and menus** from `03`.
3. `site_settings` gets an **`is_verified` flag**, so legacy contact facts can be stored without being published (rule 1).

### Proposed Solution

Staff and later tasks get a database that matches `07-data-model.md`:

- every table split by module (ADR 0005), with RLS deny-all for Supabase's public roles;
- one clean baseline migration;
- an idempotent `pnpm db:seed` that loads the 10 legacy routes with their rates and translations (all unverified), the legacy site settings (all unverified), and the IA's page and menu skeleton (all `draft`).

Nothing is published by the seed. Public pages keep showing placeholders until operations verify the facts and editors publish the pages.

### Acceptance Criteria

**Upgrade and baseline**

- [ ] Given `package.json`, then `drizzle-orm` and `drizzle-kit` are on the current releases at implementation time (0.45.x / 0.31.x or later, checked with `npm view`), and `postgres` is current 3.x. There are no Supabase client SDKs (the app talks to Postgres through Drizzle only, rule 6).
- [ ] Given `db/migrations/`, then the template migration and its `meta/` snapshot are deleted, and **one baseline migration** is generated from the new schema with `pnpm db:generate`. No migration contains `todos` or the `membership` enum.
  - No deployed database existed, so there is no data to migrate.
  - Regenerating with no schema change produces no new migration (`drizzle-kit generate` reports nothing to do).

**Schema (from `07`, split per module, ADR 0005)**

- [ ] Given the module schema files, then every table and enum in `07` exists with the columns, types, defaults, indexes, unique constraints, FKs and the `route_rates_price_ck` check given there, split as:
  - `routes` (`routes`, `route_translations`);
  - `pricing` (`route_rates`);
  - `content` (`pages`, `page_translations`, `posts`, `post_translations`, `categories`, `category_translations`, `post_categories`, `faqs`, `faq_translations`, `testimonials`, `testimonial_translations`, `menu_items`, `menu_item_translations`);
  - `goods` (`goods_rules`, `goods_rule_translations`);
  - `leads` (`leads`), `contact` (`contact_events`), `media` (`media`, `media_translations`);
  - `settings` (`site_settings`), `seo` (`redirects`), `auth` (`profiles`, the staff version from `07`, not the template's).

  Each lives in `modules/<module>/infrastructure/schema.ts`. Shared enums live in `db/enums.ts`. `db/schema.ts` re-exports everything and composes `relations()` in one place.
- [ ] Given the module schema files, then their **import graph is acyclic** (`pnpm check:boundaries` passes and reports no cycle). Under `module-structure.md`'s schema exception, a schema file may import other modules' tables. The runtime-direction rules apply only to non-schema code.
  - The planned schema graph:
    - `auth`, `media`, `settings`, `seo` and `routes` import nothing but `db/enums.ts`;
    - `pricing` → `routes`;
    - `goods` → `routes`, `auth`;
    - `content` → `routes`, `media`, `auth`;
    - `leads` → `routes`, `auth`;
    - `contact` → `routes`.
  - The one cycle `07` would create (`routes.page_id` ↔ `faqs/pages` → `routes`) is removed by making `content` own the link: **`pages.route_id → routes.id`** replaces `routes.page_id`. `07` is updated accordingly.
- [ ] Given `menu_items`, then it has `key text not null` with **`unique(menu, key)`** (a stable seed and editor key such as `header.outbound`). `07` is updated. A duplicate `(menu, key)` insert is rejected by the database.
- [ ] Given `site_settings`, then it has `is_verified boolean not null default false` (owner decision 3), and `07` documents it. The settings query (a later task) publishes only verified keys.
- [ ] Given every table, then RLS is enabled (Drizzle's current RLS API for the installed version, e.g. `pgTable.withRLS` or `.enableRLS()`, checked in the installed docs and types). No policies are created for `anon` or `authenticated`.
- [ ] Given schema files, then they import no `server-only` and no env, so `drizzle-kit` and the seed load them in plain Node (`module-structure.md`).

**Client guard**

- [ ] Given `db/client.ts`, then it starts with `import "server-only"` (kept) and creates a pooler connection (`prepare: false`) only on first use. A temporary client component importing `@/db/client` makes `pnpm build` **fail** with the `server-only` error (recorded, then the probe is removed).

**Seed (`pnpm db:seed`, `tsx scripts/seed.ts`)**

- [ ] Given `pnpm db:seed`, then it reads `data/seed/routes.legacy.json`, `data/seed/site-settings.legacy.json` and the new `data/seed/pages.json` + `data/seed/menus.json`. It reads them from `SEED_DATA_DIR` when that env var is set, otherwise from `data/seed/`.
  - It validates every file with **Zod**, including cross-file references (`routeKey`, `pageKey`), before writing. A malformed file exits 1 naming the file and path, and writes nothing.
  - It runs everything in **one transaction**. If any write fails, everything rolls back, and it exits 1.
  - It connects with **`DATABASE_URL_DIRECT` only** (session pooler or direct; it exits 1 with a clear message if unset) through its own `postgres` client, never `@/db/client`, because that file is `server-only`.
- [ ] Given `drizzle.config.ts`, then `db:generate`/`db:migrate` **require `DATABASE_URL_DIRECT`** (the `DATABASE_URL` fallback is removed, because migrations can't run through the transaction pooler).
- [ ] Given a fresh migrated database, then after the seed:
  - **routes:** `routes` = **10** rows (**8** `is_active = true`; `my-vn` and `th-vn` inactive), **all `is_verified = false`**; `route_translations` = 20 (VI + EN per route); `route_rates` = the number of rate bands in the JSON, each satisfying `route_rates_price_ck`;
  - **settings:** `site_settings` = one row per legacy key (`company`, `contact`, `offices`, `hours`, `social`, `tracking`, `offers`, `pricingRules`), **all `is_verified = false`**;
  - **pages:** exactly the **20 pages** of the manifest below, all `status = 'draft'`, with **40** `page_translations` (VI + EN). Route pages are linked through `pages.route_id`;
  - **menus:** exactly the menu items of the manifest below, with VI + EN labels (no external URLs).

  **Page manifest** (`data/seed/pages.json`; slugs from `03`, titles = the `03` sitemap names, EN from `12-glossary.md`; `title` and `h1` are both seeded with the name, and editors rewrite them):

  | key | type | route | VI slug | EN slug |
  | --- | --- | --- | --- | --- |
  | `home` | home | — | `''` | `''` |
  | `hub-outbound` | hub | — | `dich-vu` | `services` |
  | `route-sg`, `route-my`, `route-kr`, `route-tw`, `route-jp`, `route-th`, `route-us` | route_outbound | sg … us | `gui-hang-di-<country>` | `shipping-to-<country>` (as in `03`) |
  | `hub-inbound` | hub | — | `nhap-hang` | `ship-to-vietnam` |
  | `route-sg-vn`, `route-my-vn`, `route-th-vn` | route_inbound | sg-vn, my-vn, th-vn | `gui-hang-tu-<country>-ve-viet-nam` | `<country>-to-vietnam-shipping` (the two unconfirmed routes stay draft and inactive, Q-05) |
  | `calculator` | calculator | — | `tinh-cuoc` | `shipping-calculator` |
  | `goods` | goods | — | `hang-cam-gui` | `prohibited-items` |
  | `blog` | hub | — | `kinh-nghiem` | `guides` |
  | `about` | about | — | `gioi-thieu` | `about` |
  | `contact` | contact | — | `lien-he` | `contact` |
  | `policy-shipping-terms`, `policy-claims`, `policy-privacy`, `policy-terms` | policy | — | `quy-dinh-gui-nhan-hang`, `chinh-sach-den-bu`, `chinh-sach-bao-mat`, `dieu-khoan-dich-vu` | `shipping-terms`, `claims-policy`, `privacy-policy`, `terms` |

  Not seeded: blog posts (C-tasks), `/lp/*` (campaign-specific), `/tra-cuu/` (P2, Q-18), `/go/*` (a route handler, not a page). `03`'s footer mentions "policies (5)" but lists four policy URLs. The seed creates the four listed; a fifth is added only if the owner names it.

  **Menu manifest** (`data/seed/menus.json`; labels from `03` Navigation, EN from `12-glossary.md`):
  - `header`:
    - `header.outbound` "Gửi hàng đi" / "International shipping" → `hub-outbound`, with 7 children `header.outbound.<sg…us>` → the routes;
    - `header.inbound` "Nhận hàng về VN" / "Shipping to Vietnam" → `hub-inbound`;
    - `header.calculator` "Tính cước" / "Shipping calculator" → `calculator`;
    - `header.blog` "Kinh nghiệm" / "Shipping guides" → `blog`;
    - `header.company` "Về chúng tôi" / "About us", with children `about`, `contact` and a policies link → `policy-shipping-terms`.

    **15 items.**
  - `footer-services`: the 7 outbound routes plus `sg-vn`. **8 items.**
  - `footer-policies`: the 4 policy pages. **4 items.**

  **Total: 27 `menu_items`, 54 `menu_item_translations`.**
- [ ] Given the seed runs a **second time**, then every row count is unchanged and no duplicate keys appear. **Column ownership on re-run:**

  | Table | New row | Existing row |
  | --- | --- | --- |
  | `routes` (by `key`) | insert | facts updated **only `where is_verified = false`**; a verified route is not touched at all |
  | `route_rates` | inserted with their route | an unverified route's bands are **replaced** (delete + insert in the transaction); a verified route's bands are not touched. No upsert key is needed |
  | `site_settings` (by `key`) | insert | `value` updated **only `where is_verified = false`** |
  | `route_translations`, `page_translations`, `menu_item_translations` | insert | **never updated** (`on conflict do nothing`) |
  | `pages` (by `key`), `menu_items` (by `menu, key`) | insert | **never updated** (`status`, sort, links stay editor-owned) |
- [ ] Given the seeded data, then no value was invented: every route, rate and setting value comes from the legacy JSON, and page and menu labels come from `03`. `data/seed/pages.json` and `menus.json` hold structure and labels only, with no prices, phones or addresses.

**Database security (Supabase)**

- [ ] Given the cloud project, then a SQL check lists **every table in `public` with `relrowsecurity = true`**, and `pg_policies` has 0 rows for `public`. Then:
  - `set role anon; select count(*) from routes;` returns the value **0**, and the same as `authenticated` returns **0**. If Supabase has revoked table privileges instead, "permission denied" is equally acceptable; record which one;
  - `insert into routes …` as `anon` fails (RLS violation or permission denied), and the row count is unchanged;
  - the app's connection (`DATABASE_URL`, transaction pooler, `prepare: false`) runs `select current_user, count(*) from routes` and returns **10**. `current_user` (expected `postgres`, the table owner, which bypasses RLS; authorization lives in server code per rule 7) is recorded.
- [ ] Given `.env.example`, then `DATABASE_URL` (transaction pooler, port 6543, app runtime) and `DATABASE_URL_DIRECT` (session pooler 5432 or direct, required by migrations and the seed) are documented in comments. The hosts are whatever the Supabase dashboard's "Connect" panel shows for the project; no host is hard-coded, and no values are filled in. `06-architecture.md`'s env table matches. No secret is committed or printed.

**Template cleanup**

- [ ] Given the fresh database after `db:migrate`, then no `todos` table and no `membership` type exist. Given the repo, then no reference to `todos` or `membership` remains (`rg` → none outside `node_modules`).

### Scope

**In scope:**

- The Drizzle upgrade, module schema files, `db/enums.ts`, `db/schema.ts` relations, the baseline migration.
- `scripts/seed.ts` with Zod validation, plus `data/seed/pages.json` and `menus.json`.
- `pnpm db:seed`, the `drizzle.config.ts` check.
- The `site_settings.is_verified` and `pages.route_id` changes, and the `07`/`06` doc updates.
- Verification on the owner's Supabase cloud project.

**Out of scope:**

- Queries, cached reads (`"use cache"` + `cacheTag`) and any UI that reads the data (S-01+).
- Admin CRUD and `requireRole` (F-05, A-01).
- Storage buckets and media upload (A-04).
- Importing WordPress posts, media or redirects (C-tasks, F-07). The `redirects` table is created empty.
- Clerk webhook → `profiles` (F-05).
- Supabase Data API settings beyond RLS (optional: disable the API for `public` in the dashboard; recorded as a recommendation).
- A lead-retention job (Q-17).
- Seeding FAQs, testimonials, goods rules or posts (no approved content: Q-09, Q-10, Q-12).

### Affected Areas

| Repo | Layer | File / Path |
|------|-------|-------------|
| app | config | `package.json` (drizzle-orm, drizzle-kit, postgres, `db:seed`), `pnpm-lock.yaml`, `drizzle.config.ts` |
| app | db | `db/enums.ts` (new), `db/schema.ts`, `db/client.ts` (check only), `db/migrations/*` (template removed, baseline generated) |
| app | module infrastructure | `modules/{routes,pricing,content,goods,leads,contact,media,settings,seo,auth}/infrastructure/schema.ts` (new) |
| app | scripts | `scripts/seed.ts` (new), `scripts/seed/*` (Zod schemas and upsert helpers, if the file would exceed 200 lines) |
| app | data | `data/seed/pages.json`, `data/seed/menus.json` (new); `routes.legacy.json`, `site-settings.legacy.json` (read only) |
| app | config/docs | `.env.example` (comments), `AGENTS.md`, `README.md` (commands), `.dependency-cruiser.cjs` (only if schema rules need it) |
| context | docs | `docs/context/07-data-model.md` (`pages.route_id`, `site_settings.is_verified`, module split, RLS API note), `06-architecture.md` (env table) |
| context | lifecycle | `AGENTS.md` §3 Database row and §7 `db:seed` row (via `/mark-implemented`) |

### Golden-rule checks

- **Rules 1–2 (facts):**
  - every seeded route, rate and setting is `is_verified = false`, and every page is `draft`;
  - prices live only in `route_rates`;
  - the seed adds no values beyond the legacy JSON and the `03` labels.
- **Rule 6 (server-only DB):** `db/client.ts` keeps `server-only`, and the client-import build failure is recorded. Secrets stay in `.env` and are read through `shared/config/env.server.ts` (the app) or `process.env` in CLI scripts (drizzle-kit, the seed).
- **Rule 7 (RLS):** enabled on every table, with no anon/authenticated policies (deny-all), checked with SQL on the cloud project.
- **Rule 14 (PII):** `leads` and `contact_events` keep `ip_hash` only, with no raw-IP column, as in `07`.
- **Rule 15 (secrets):** `.env*` is never committed or printed. Connection strings are verified by name only.

### Dependencies & Risks

- **Depends on:** F-01 (Node 22, env helpers) and F-03 (done). This closes the `AGENTS.md` §3 Database row and adds the §7 `db:seed` command.
- **Owner action (needed before verification):**
  - create the Supabase project in **Singapore (`ap-southeast-1`)**;
  - put the **transaction pooler** URL in `43logistics.vn/.env` as `DATABASE_URL`, and the **session pooler or direct** URL as `DATABASE_URL_DIRECT`.

  Code can be written before that, but no DB acceptance criterion is checked until then.
- **Blocked by questions:** Q-01–Q-07, whose legacy facts are seeded **unverified**. Placeholder behaviour: later queries publish nothing unverified (route pages show "Liên hệ"). Nothing in F-04 renders data.
- **Risks:**
  - **Drizzle 0.33 → 0.45 API drift:** RLS API, `check()`, array defaults, `$onUpdate`. Read the installed types and docs, and run `db:generate` early.
  - **Supabase poolers:** the transaction pooler (6543) doesn't support prepared statements (`prepare: false`). Migrations need the session or direct connection.
  - **FK cycles across modules:** resolved by `pages.route_id`. Any other cross-module reference must follow the runtime direction in `module-structure.md`.
  - **Idempotent seed vs editor changes:** upserts must not reset verified or published rows. This is verified by editing a row, re-running, and checking it's preserved.

### Manual Verification Plan

**Scenario:** given the owner's empty Supabase project, when `pnpm db:migrate && pnpm db:seed` runs twice, then the tables, RLS and row counts match the ACs, and editor changes survive the second run.

**Seed needs:** the default legacy seed plus the new pages/menus JSON.

**Steps:**

1. Confirm by name only that `DATABASE_URL` and `DATABASE_URL_DIRECT` are set in `.env` (no values printed). Unset `DATABASE_URL_DIRECT` in a subshell: `db:migrate` and `db:seed` exit with a clear message. Then run `pnpm install --frozen-lockfile`, `lint`, `typecheck`, `check:boundaries` and `build`.
2. Run `pnpm db:generate`: one baseline migration. Run it again: no changes. Grep the migrations: no `todos` or `membership`.
3. Run `pnpm db:migrate` on the empty project, then, with SQL through `psql "$DATABASE_URL_DIRECT"` (values never echoed):
   - list `public` tables with `relrowsecurity`: all true;
   - `select count(*) from pg_policies where schemaname='public'` → 0;
   - check the `todos` table and `membership` type → absent.
4. Run `pnpm db:seed` and record row counts per table:
   - `routes` 10 (8 active, 0 verified), `route_translations` 20, `route_rates` = the JSON band count;
   - `site_settings` 8 (0 verified);
   - `pages` / `page_translations` / `menu_items` / `menu_item_translations` as expected.
5. Ownership check. Make four edits:
   - `update routes set transit_days_max = 99, is_verified = true where key = 'kr'`;
   - `update route_translations set name = 'X' where locale = 'en' and route_id = (sg)`;
   - `update site_settings set value = '{"x":1}', is_verified = true where key = 'social'`;
   - `update pages set status = 'published' where key = 'about'`.

   Run `pnpm db:seed` again. All four edits must survive, `kr`'s rate bands must be unchanged (compare `id`s), the unverified `sg`'s bands are re-created, and every count is unchanged. Revert the edits.
6. Run the security AC's SQL (anon/authenticated counts, anon insert) and the runtime-pooler query (`current_user`, count 10). Record each result.
7. Failure handling, both cases with `SEED_DATA_DIR` pointing at a temp copy of `data/seed/`:
   - **validation:** remove a route `key` → exit 1, naming the file and path, with nothing written;
   - **rollback:** add a page whose slug duplicates an existing one. Cross-file validation doesn't check slugs, so it violates `page_tr_locale_slug_uq` at write time, after routes and settings are written. The run must exit 1, and a before/after snapshot (row counts plus `md5` of `routes`, `route_rates` and `site_settings` contents) must be identical.
8. Add a temporary client component importing `@/db/client`: `pnpm build` fails with the `server-only` error. Remove it, and the build passes.

**Validation commands:** `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build` (the `verify` CI workflow runs the same, without DB access). The consent matrix doesn't apply (no consent, tracking, proxy or lead *processing* change; the tables only). No automated tests (ADR 0004).

### Implementation Hints

- Read the installed Drizzle docs and types first:
  - `node_modules/drizzle-orm` RLS (`pgTable.withRLS` vs `.enableRLS()`), `pgEnum`, `check`;
  - the `drizzle-kit` 0.31 config shape (`dialect`, `schema` glob or `db/schema.ts`, `casing`).
- `07`'s draft says "not compiled": fix types as needed, but keep column names and semantics.
- Enums used by several modules (`locale_code`, `content_status`, `shipping_method`, `contact_channel`, `staff_role`…) go in `db/enums.ts`. Module schema files import only enums, other modules' tables (in the allowed direction) and `drizzle-orm`.
- The seed is a thin CLI (`scripts/seed.ts`) plus pure mappers (JSON → insert rows). Keep the mappers framework-free so they can be tested later (ADR 0004). Implement the ownership table with `onConflictDoUpdate({ target, set, setWhere: is_verified = false })` for routes and settings, and `onConflictDoNothing()` for translations, pages and menu items. Rate replacement: delete plus insert, only for unverified routes.
- `site-settings.legacy.json` has a `$comment` key and `pricingRules`, which isn't in `07`'s key table: seed it and add it to `07` (shape: `volumetricFormula`, `paymentNote`).
- Supabase:
  - `DATABASE_URL` is the transaction pooler (port 6543), and `DATABASE_URL_DIRECT` is the session pooler (port 5432) or the direct host (IPv6 only on newer projects; the session pooler works over IPv4);
  - copy both strings from the dashboard "Connect" panel, because the pooler host differs per project.
- Lessons from F-01 to F-03:
  - review dependencies that installers add;
  - pnpm 11 `allowBuilds` for any new native dependency;
  - in zsh, never name a shell variable `path`.

### Related

- Roadmap: `docs/context/10-roadmap.md` F-04 (next: F-05 Auth uses `profiles`; S-01+ read routes, rates, settings, menus).
- Context: `07-data-model.md` (schema, RLS, seed), `03-information-architecture.md` (sitemap, route registry, navigation), `06-architecture.md` (DB access, env), `01-business.md` (fact statuses), `11-open-questions.md` (Q-01–Q-07).
- ADRs: 0005 (module layout), 0004 (no test suites), 0002 (stack), 0006 (Cache Components, for the later cached queries).
- Specs: `feature-f01-upgrade-and-harness.md` (`db/client.ts`, env), `feature-f03-i18n-routing.md` (`Locale` type, matching `locale_code`).
