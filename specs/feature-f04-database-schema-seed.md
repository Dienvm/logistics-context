---
title: Create the Supabase schema, migrations and seed
type: feature
status: draft
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
- [ ] Given the schema import graph, then there is **no cycle** between module schema files (`pnpm check:boundaries` passes and reports no cycle). To keep the graph acyclic, the page↔route link is owned by `content`: **`pages.route_id → routes.id`** replaces `07`'s `routes.page_id`, matching the runtime direction `content → routes`. `07` is updated accordingly.
- [ ] Given `site_settings`, then it has `is_verified boolean not null default false` (owner decision 3), and `07` documents it. The settings query (a later task) publishes only verified keys.
- [ ] Given every table, then RLS is enabled (Drizzle's current RLS API for the installed version, e.g. `pgTable.withRLS` or `.enableRLS()`, checked in the installed docs and types). No policies are created for `anon` or `authenticated`.
- [ ] Given schema files, then they import no `server-only` and no env, so `drizzle-kit` and the seed load them in plain Node (`module-structure.md`).

**Client guard**

- [ ] Given `db/client.ts`, then it starts with `import "server-only"` (kept) and creates a pooler connection (`prepare: false`) only on first use. A temporary client component importing `@/db/client` makes `pnpm build` **fail** with the `server-only` error (recorded, then the probe is removed).

**Seed (`pnpm db:seed`, `tsx scripts/seed.ts`)**

- [ ] Given `pnpm db:seed`, then it reads `data/seed/routes.legacy.json`, `data/seed/site-settings.legacy.json` and the new `data/seed/pages.json` + `data/seed/menus.json`, validates every file with **Zod** before writing (a malformed file aborts with the file and path of the problem, and writes nothing), and runs in **one transaction**. It connects with `DATABASE_URL_DIRECT` (falling back to `DATABASE_URL`) through its own `postgres` client, never `@/db/client`, because that file is `server-only`.
- [ ] Given a fresh migrated database, then after the seed:
  - **routes:** `routes` = **10** rows (**8** `is_active = true`; `my-vn` and `th-vn` inactive), **all `is_verified = false`**; `route_translations` = 20 (VI + EN per route); `route_rates` = the number of rate bands in the JSON, each satisfying `route_rates_price_ck`;
  - **settings:** `site_settings` = one row per legacy key (`company`, `contact`, `offices`, `hours`, `social`, `tracking`, `offers`, `pricingRules`), **all `is_verified = false`**;
  - **pages:** one row per IA page from `03`'s sitemap, all `status = 'draft'`, with VI + EN `page_translations` (slugs as listed in `03`; `''` for home). Route pages are linked to their route through `pages.route_id`. The P2 `/tra-cuu/` and `/lp/*` aren't seeded;
  - **menus:** `menu_items` for `header`, `footer-services` and `footer-policies` with VI + EN labels, pointing at pages or routes (no external URLs).
- [ ] Given the seed runs a **second time**, then every row count is unchanged and no duplicate keys appear (idempotent upserts by natural key: `routes.key`, `pages.key`, `site_settings.key`, `(menu, key)` for menu items, `(route, method, weight_min_kg)` for rates). Editor changes to `is_verified`, `status` and translations are preserved on re-run (the seed doesn't overwrite them). Rates for a route are replaced only while that route is still `is_verified = false`.
- [ ] Given the seeded data, then no value was invented: every route, rate and setting value comes from the legacy JSON, and page and menu labels come from `03`. `data/seed/pages.json` and `menus.json` hold structure and labels only, with no prices, phones or addresses.

**Database security (Supabase)**

- [ ] Given the cloud project, then a SQL check lists **every table in `public` with `relrowsecurity = true`** and zero policies (`pg_policies` empty for `public`). `SET ROLE anon; SELECT count(*) FROM routes;` and the same as `authenticated` return 0 rows, while the server role sees 10.
- [ ] Given `.env.example`, then `DATABASE_URL` (transaction pooler) and `DATABASE_URL_DIRECT` (session/direct, for migrations and the seed) are documented with the expected Supabase hosts and ports, with no values. `06-architecture.md`'s env table matches. No secret is committed or printed.

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

1. Confirm by name only that `DATABASE_URL` and `DATABASE_URL_DIRECT` are set in `.env` (no values printed). Then run `pnpm install --frozen-lockfile`, `lint`, `typecheck`, `check:boundaries` and `build`.
2. Run `pnpm db:generate`: one baseline migration. Run it again: no changes. Grep the migrations: no `todos` or `membership`.
3. Run `pnpm db:migrate` on the empty project, then, with SQL through `psql "$DATABASE_URL_DIRECT"` (values never echoed):
   - list `public` tables with `relrowsecurity`: all true;
   - `select count(*) from pg_policies where schemaname='public'` → 0;
   - check the `todos` table and `membership` type → absent.
4. Run `pnpm db:seed` and record row counts per table:
   - `routes` 10 (8 active, 0 verified), `route_translations` 20, `route_rates` = the JSON band count;
   - `site_settings` 8 (0 verified);
   - `pages` / `page_translations` / `menu_items` / `menu_item_translations` as expected.
5. Edit one row (`update pages set status='published' where key='about'`), run `pnpm db:seed` again, and check that the counts are unchanged and the edit survived. Then revert the edit.
6. Run `SET ROLE anon; select count(*) from routes;` → 0, and the same as `authenticated` → 0. Reset to the server role → 10.
7. Corrupt a copy of `routes.legacy.json` (e.g. remove a `key`) and point the seed at it (env or CLI flag). It must exit 1 naming the file and path, and the row counts must be unchanged.
8. Add a temporary client component importing `@/db/client`: `pnpm build` fails with the `server-only` error. Remove it, and the build passes.

**Validation commands:** `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build` (the `verify` CI workflow runs the same, without DB access). The consent matrix doesn't apply (no consent, tracking, proxy or lead *processing* change; the tables only). No automated tests (ADR 0004).

### Implementation Hints

- Read the installed Drizzle docs and types first:
  - `node_modules/drizzle-orm` RLS (`pgTable.withRLS` vs `.enableRLS()`), `pgEnum`, `check`;
  - the `drizzle-kit` 0.31 config shape (`dialect`, `schema` glob or `db/schema.ts`, `casing`).
- `07`'s draft says "not compiled": fix types as needed, but keep column names and semantics.
- Enums used by several modules (`locale_code`, `content_status`, `shipping_method`, `contact_channel`, `staff_role`…) go in `db/enums.ts`. Module schema files import only enums, other modules' tables (in the allowed direction) and `drizzle-orm`.
- The seed is a thin CLI (`scripts/seed.ts`) plus pure mappers (JSON → insert rows). Keep the mappers framework-free so they can be tested later (ADR 0004). Use `onConflictDoUpdate` with an explicit `set` that omits editor-owned fields (`is_verified`, `status`, `published_at`).
- `site-settings.legacy.json` has a `$comment` key and `pricingRules`, which isn't in `07`'s key table: seed it and add it to `07` (shape: `volumetricFormula`, `paymentNote`).
- Supabase:
  - `DATABASE_URL` is the transaction pooler `aws-0-ap-southeast-1.pooler.supabase.com:6543`;
  - `DATABASE_URL_DIRECT` is the session pooler (`:5432`) or `db.<ref>.supabase.co:5432` (IPv6 only on newer projects; the session pooler works over IPv4).
- Lessons from F-01 to F-03:
  - review dependencies that installers add;
  - pnpm 11 `allowBuilds` for any new native dependency;
  - in zsh, never name a shell variable `path`.

### Related

- Roadmap: `docs/context/10-roadmap.md` F-04 (next: F-05 Auth uses `profiles`; S-01+ read routes, rates, settings, menus).
- Context: `07-data-model.md` (schema, RLS, seed), `03-information-architecture.md` (sitemap, route registry, navigation), `06-architecture.md` (DB access, env), `01-business.md` (fact statuses), `11-open-questions.md` (Q-01–Q-07).
- ADRs: 0005 (module layout), 0004 (no test suites), 0002 (stack), 0006 (Cache Components, for the later cached queries).
- Specs: `feature-f01-upgrade-and-harness.md` (`db/client.ts`, env), `feature-f03-i18n-routing.md` (`Locale` type, matching `locale_code`).
