---
title: Edit route rates and route flags from the admin
type: feature
status: in_implementation
owner_repo: both
roadmap: A-02
priority: must-have
blocked_by_questions: [Q-04, Q-25]
updated: 2026-10-24
branch: feat/a02-routes-rates-editor
implementation_pr: https://github.com/Dienvm/43logistics.vn/pull/40
---

## Feature: Edit route rates and route flags from the admin

### Problem Statement

Prices and transit times have one source of truth, `routes` + `route_rates` (rule 2), and today only a developer can change them: by editing `data/seed/routes.legacy.json` and running `pnpm db:seed` (which only touches unverified routes) and `pnpm db:confirm`. The owner confirmed the published prices on 2026-10-22, but every later change (new band, promo with an end date, price rise) still needs a deploy-side script. A-01 left `/admin/routes/` as a guarded "Sắp có" page.

Roadmap A-02: "CRUD bands, validity dates, `is_verified` toggle (admin only), preview of public table; actions call `updateTag('route:{key}')` + `revalidateTag('menu','max')`. *Accept:* editing a price shows on the public route page, mega menu and calculator after save (checked manually)."

Two existing behaviours would silently undo admin edits and must change with this task:

- `pnpm db:seed` deletes and re-inserts every band of an **unverified** route and refreshes its facts (`scripts/seed/write-routes.ts:33–75`).
- `pnpm db:confirm` sets `routes.is_verified = true` for every key in `data/owner-confirmations.json` (`scripts/confirm-facts.ts:47–52`), so an admin's "un-verify" would be reverted.

### Proposed Solution

Staff with the `admin` or `editor` role (A-01 permission map, `ADMIN_SECTIONS.routes`) get:

- **`/admin/routes/`**: a list of every route (active and inactive, outbound and inbound) with its VI name, key, direction, badges (Đã xác minh / Chưa xác minh, Ẩn giá, Ngừng hoạt động), band count and "Sửa lần cuối {date} · {name}".
- **`/admin/routes/{key}/`**: one route's editor:
  - **Route facts form**: transit days min/max and `prices_public` (admin + editor); `is_verified` and `is_active` (admin only; an editor sees them read-only).
  - **Bands table**, grouped by method, sorted by minimum weight: weight range, price ("{price}/kg", "{price} trọn gói" or "Liên hệ"), promo label, validity window with a status badge (Đang áp dụng / Chưa đến hạn / Hết hạn), notes. "Thêm mức giá" and "Sửa" open a dialog form; "Xoá" opens a confirmation dialog.
  - **Warnings** under the table, from the same domain rules the public engine uses: weights no band covers today (the site shows "Liên hệ" there), overlapping bands ("từ {kg} kg áp dụng mức có cân nặng tối thiểu cao hơn"), no band valid today.
  - **Preview**: the public VI rate table (`RateTable`) rendered with today's valid bands, ignoring `is_verified` / `prices_public` and labelled "Bản xem trước — {state}" (e.g. "khách đang thấy 'Liên hệ'" when the route is unverified or prices are hidden).
- Every save invalidates the route's caches, so the public route page, mega menu, home bento and calculator show the change on the next request.
- After a route is edited in the admin, `db:seed` and `db:confirm` leave it alone: the admin becomes its only source.

Decisions (owner, 2026-10-24): bands + route flags + transit days (names/pitches stay in A-03); an editor's price change on a verified route goes live immediately and records who/when; band overlap follows the engine (only an equal minimum is rejected, other overlaps warn); deleting a band is a hard delete with no history table; seed/confirm skip admin-edited routes via new columns.

### Acceptance Criteria

**Data model**

- [ ] Given a new migration (`pnpm db:generate`, reviewed SQL), then `routes` gains `admin_edited_at timestamptz null`, `admin_edited_by text null`, `verified_at timestamptz null`, `verified_by text null`, and `route_rates` gains `updated_by text null`. The `*_by` columns hold the Clerk user ID as plain `text` with no foreign key (a staff user whose `profiles` mirror row is missing must still be able to save); the UI resolves names through `profiles` and shows "—" when none is found. Existing rows keep `null`. RLS stays on with no policies. `07-data-model.md` documents the columns.
- [ ] Given any successful admin write to a route or its bands, then the same transaction sets `routes.admin_edited_at = now()` and `admin_edited_by = <staff userId>`; a band write also sets `route_rates.updated_by` on that band.
- [ ] Given an admin changes `is_verified` to `true`, then `verified_at = now()` and `verified_by = <userId>`; changing it to `false` sets both to `null`.

**Seed and confirm**

- [ ] Given a route with `admin_edited_at` not null, when `pnpm db:seed` runs, then neither its `routes` row nor any of its `route_rates` rows is changed (in addition to the existing verified-route rule). The seed's summary prints the skipped keys.
- [ ] Given a route with `admin_edited_at` not null, when `pnpm db:confirm` runs, then its `is_verified` is not changed and the script prints "skipped (edited in admin): {key}". For routes it still verifies, it sets `verified_at = coalesce(verified_at, now())` and leaves `verified_by` null.

**Authorization (rule 7)**

- [ ] Given `/admin/routes/` and `/admin/routes/{key}/`, then each page's first call is `await requireSection("routes")` (admin, editor); `sales` gets 403. An unknown `{key}` → `notFound()` (admin 404).
- [ ] Given every Server Action in this task, then its first call is `requireSection("routes")`, before parsing input. The actions that change `is_verified` or `is_active` additionally require `admin` (`requireRole(["admin"])` or a field check after `requireSection`): an editor submitting those fields, even by a crafted request, gets an `ActionState` error and nothing is written.
- [ ] Given an editor, then the `is_verified` and `is_active` controls render read-only (no form control posts them); hiding is not the only guard (previous AC).

**Band editing**

- [ ] Given the band dialog, then its fields are: method (only the route's `methods`), minimum kg, maximum kg (blank = open-ended), pricing mode `perKg | flat | contact` with one price field for `perKg`/`flat`, promo label, valid from, valid to (blank = open), notes. The schema is one client-safe Zod `z.discriminatedUnion("pricing", …)` in `modules/pricing/application/schemas.ts`, reused by the server action (conditional-form-patterns: inactive-branch fields are stripped, not rejected).
- [ ] Given invalid input, then the action returns `fieldErrors` with translated messages and writes nothing, for: min < 0; max < min; more than 2 decimals or > 999 999.99 kg; price not a positive integer VND or > 1 000 000 000; `valid_to` before `valid_from`; method not in the route's `methods`.
- [ ] Given a band whose method and minimum weight equal another band of the same route whose validity window overlaps it (null bounds = open), when it is saved, then the action rejects it with a `weightMinKg` field error ("Đã có mức giá bắt đầu từ {kg} kg trong cùng thời gian hiệu lực"): this is exactly the case the engine reports as `ambiguous_band`. The check runs in the use case inside the write transaction, not only in the form.
- [ ] Given other overlaps (e.g. SG `21–100` and `100–∞`, MY `100–∞` and `300–∞`), then they save, and the editor shows the overlap warning; the existing verified bands remain valid and re-savable unchanged.
- [ ] Given "Xoá" on a band, then a confirmation dialog names the band; confirming hard-deletes it; cancelling writes nothing.
- [ ] Given the database check `route_rates_price_ck`, then no code path can write a band with neither a price nor `contact_for_price`, nor one with both per-kg and flat prices (the schema maps the pricing mode to exactly one of the three).

**Route facts**

- [ ] Given the route facts form, then `transit_days_min`/`transit_days_max` accept blank or integers 0–365 with max ≥ min, and `prices_public` is a checkbox; editors and admins can save these.
- [ ] Given an admin, then `is_verified` and `is_active` are editable; the form says what each does on the public site (unverified → prices and transit times hidden or badged per `factVisibility`; inactive → the route leaves the menu, the calculator and listings).

**Cache invalidation and the roadmap Accept**

- [ ] Given every successful write (band create/update/delete, route facts save), then the Server Action calls `updateTag(routeTag(key))` and `updateTag(MENU_TAG)` after the transaction commits (both tags from `modules/routes` constants; `updateTag` = read-your-writes, Server Actions only). The spec deliberately uses `updateTag(MENU_TAG)` instead of the roadmap's `revalidateTag('menu','max')`, so the mega menu is fresh on the first request after the save. A failed write invalidates nothing.
- [ ] Given a verified route with public prices, when an admin changes a per-kg price and saves, then on the next request the new price shows on the route page rate table (`/{route-slug}/` and `/en/{route-slug}/`), the mega menu / home "từ {price}/kg" when the band is the minimum, and the calculator quote for a weight in that band. (Manual check by the owner, checklist row 5.)
- [ ] Given a band whose validity window starts or ends, then the public sites follow within the existing `cacheLife('hours')` of the rate reads (documented, not changed by this task); the admin badges use the same Asia/Ho_Chi_Minh `today`.

**Preview and warnings**

- [ ] Given the route editor, then the preview renders the public `RateTable` (VI) from the route's bands valid today, built by the same pure code the public `getRoutePricing` uses (no copy of the band-selection or from-price rules), with no `"use cache"` on the admin read, and shows which public state applies (shown / "Liên hệ" because unverified / hidden prices / inactive).
- [ ] Given the bands of a route, then the warnings are computed by a pure domain function in `modules/pricing/domain/` (inputs: bands, today; outputs: gaps from 0 to the largest finite max, overlaps, "no band valid today" per method), with no Next/React imports.

**UI, copy and boundaries**

- [ ] Given the new screens, then they use `shared/ui` primitives (table, dialog, input, select, checkbox, badge, button, label, textarea) restyled by tokens; date fields are native `<input type="date">` (no new date-picker dependency); 44 px targets, labels on every input, visible focus, errors linked with `aria-describedby`, submit disabled while pending (rule 10). No `motion`, no Zustand, no `react-hook-form`.
- [ ] Given money, then prices are entered as integer VND and displayed with `shared/lib/format` (`75.000 đ`); weights display with the VI decimal comma.
- [ ] All new copy lives in `messages/{vi,en}.json` under `admin.routes.*` and `admin.rates.*`; `pnpm i18n:check` passes; the admin renders VI.
- [ ] `pnpm check:boundaries` passes: admin reads are uncached functions in `modules/*/infrastructure` behind the modules' server `index.ts`; client components import only `@/modules/<m>/client` and `shared/*`; `routes` keeps no runtime import of `pricing` (allowed direction `pricing → routes`).
- [ ] Public routes do not regress: no admin code in the initial scripts of `/`, `/en/` and one route page; their gzip total grows ≤ 1 KiB versus `main` (same curl + gzip method as A-01).

**Context docs**

- [ ] `07-data-model.md` documents the new columns, corrects the Principles line (verification is per route, not per rate) and the Seed section (admin-edited routes are skipped); `06-architecture.md` Permissions lists the field rules (editor: bands, transit days, `prices_public`; admin only: `is_verified`, `is_active`) and the caching section records the `updateTag(MENU_TAG)` choice; `10-roadmap.md` A-02 links this spec.

### Scope

**In scope:**

- Migration (new columns), Drizzle schema updates, seed and confirm skip rules.
- `/admin/routes/` list and `/admin/routes/{key}/` editor; band create/update/delete; route facts (transit days, `prices_public`, `is_verified`, `is_active`).
- Server Actions with Zod, use cases with transactions, uncached admin reads, cache invalidation.
- Pure warnings function; preview through the public `RateTable`.
- `admin.routes.*` / `admin.rates.*` messages (VI + EN).

**Out of scope:**

- Creating or deleting routes; editing `key`, `direction`, `country_code`, `methods`, `volumetric_divisor`, `weight_rounding_kg`, `transit_note`, `flight_schedule`, `sort`.
- Route names, short pitches and route page content (A-03).
- Rate history / audit table, undo, bulk import or CSV upload, copying bands between routes.
- Concurrency control (last write wins; two staff editing the same band at once is not handled).
- VAT, surcharges, minimum charges and promos as engine rules (Q-04, Q-25); the engine is unchanged.
- OG images with the from-price (not built yet), `/api/admin/*` handlers and TanStack Query data fetching (Server Components + Server Actions are enough here; A-06 is the first TanStack Query screen).
- A shared cache handler for several app instances (L-02, VPS deployment ADR).

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | schema + migration | `modules/routes/infrastructure/schema.ts`, `modules/pricing/infrastructure/schema.ts` (new columns, no FK), `db/migrations/0006_*.sql + `meta/*` (generated) |
| app | seed / confirm | `scripts/seed/write-routes.ts` (skip `admin_edited_at` routes, print skipped keys), `scripts/confirm-facts.ts` (skip them; set `verified_at`) |
| app | routes module | `modules/routes/application/schemas.ts` (route facts schema), `modules/routes/application/update-route-facts.ts` (use case, transaction), `modules/routes/infrastructure/admin-queries.ts` (uncached: all routes incl. inactive, one route by key with edit metadata), `modules/routes/actions.ts` (`updateRouteFactsAction`), `modules/routes/index.ts`, `modules/routes/client.ts` (new: schema + types for client forms), `modules/routes/domain/*` (admin route types) |
| app | pricing module | `modules/pricing/application/schemas.ts` (band discriminated union), `modules/pricing/application/{save-rate-band,delete-rate-band}.ts` (use cases: transaction, equal-min check, stamp `admin_edited_*` via `modules/routes`), `modules/pricing/domain/band-warnings.ts` (pure), `modules/pricing/infrastructure/admin-rate-queries.ts` (uncached bands of one route with `updated_by`), `modules/pricing/actions.ts` (`saveRateBandAction`, `deleteRateBandAction`), `modules/pricing/ui/route-pricing.ts` (extract the pure part reused by the preview), `modules/pricing/index.ts`, `modules/pricing/client.ts` |
| app | admin UI | `modules/pricing/ui/admin/*` (route list table, route editor, bands table, band dialog form + `PerKgFields`/`FlatPriceFields`, delete dialog, warnings, preview), `modules/routes/ui/admin/route-facts-form.tsx` (client island) |
| app | admin routes | `app/admin/(shell)/routes/page.tsx` (list; replaces `ComingSoon`), `app/admin/(shell)/routes/[key]/page.tsx` (new) |
| app | auth | `modules/auth` unchanged except reuse of `requireSection` / `requireRole` / `StaffRole`, and a server function to resolve display names from `profiles` for "Sửa lần cuối" (exported from `index.ts`) |
| app | shared | `shared/types/action-state.ts`, `shared/lib/form-input.ts`, `shared/lib/format.ts` (reuse; extend `format` only if a kg formatter is missing) |
| app | i18n | `messages/vi.json`, `messages/en.json` (`admin.routes.*`, `admin.rates.*`) |
| context | docs | `docs/context/07-data-model.md` (columns, Principles line, Seed), `docs/context/06-architecture.md` (Permissions field rules, caching note), `docs/context/10-roadmap.md` (A-02 spec link), `specs/INDEX.md` |

### Golden-rule checks

- **Rules 1–2 (facts, single source):** prices and transit days are written only to `routes` / `route_rates`; no price appears in code or messages; the preview and warnings reuse the public domain code.
- **Rule 5 (server first):** reads in Server Components through module queries (uncached for the admin, because `requireRole` and `"use cache"` don't mix); writes in `actions.ts` → use case → `updateTag`.
- **Rule 6:** Drizzle only on the server; client islands receive plain props (no row objects, no internal IDs beyond the band `id` the forms post back).
- **Rule 7:** `requireSection("routes")` first in pages and actions; admin-only fields enforced in the action.
- **Rule 8:** admin JS stays under `/admin`; public routes checked for regression.
- **Rules 10–11:** labelled inputs, 44 px targets, focus ring, no `uppercase`.
- **Rule 15:** no secrets touched.
- Not public pages: rule 4 SEO set doesn't apply; everything stays `noindex`.

### Dependencies & Risks

- **Depends on:** A-01 (admin shell, `requireSection`, `ADMIN_SECTIONS.routes`, merged in app PR #39; `/mark-implemented` pending), F-04 (schema, seed, confirm), S-03 (price engine), S-04 (`RateTable`, `getRoutePricing`). No stack gap: `updateTag` is in Next 16.4 (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/updateTag.md`, Server Actions only).
- **Blocked by questions (non-blocking, ADR 0004):** Q-04 "who updates prices and how often" (the editor ships for `admin` + `editor`; the owner decides who gets which Clerk role); Q-25 band-edge meaning, rounding steps, minimum charge (the editor stores bands as entered and warns on gaps/overlaps; no new engine rule).
- **Risk — static pages:** route pages and the calculator are prerendered from `"use cache"` reads tagged `route:{key}` / `menu`; `updateTag` must expire them. Verify on the production build (`pnpm build && pnpm start`), not only `pnpm dev`.
- **Risk — several instances:** tag invalidation is per server process unless a shared cache handler exists. With one VPS process (Q-15) it is fine; note it for the L-02 deployment ADR.
- **Risk — numeric precision:** `weight_min_kg` / `weight_max_kg` are `numeric(8,2)` read as strings; the forms must parse decimals the way `parseDecimalNano` / `kgToGrams` do, and accept a VI decimal comma (`1,5`) as well as a dot.
- **Risk — seed/confirm regression:** the skip rule must not stop the seed from refreshing never-edited unverified routes.
- **Risk — names for "Sửa lần cuối":** `*_by` is a Clerk user ID without a foreign key (a missing `profiles` mirror row must not block a save); the admin read joins `profiles` for the display name and falls back to "—".

### Manual Verification Plan

Owner instruction 2026-10-24 (Phase 2 admin): no CI wait, no SEO/Lighthouse, no Chrome runs by the agent. Evidence = static checks + a written code walk-through + local database checks; the owner runs the browser checklist.

- **Scenario:** given a verified route with public prices, when an admin or editor changes a band's price in `/admin/routes/{key}/` and saves, then the route page, mega menu and calculator show the new price on the next request; an editor can't change `is_verified` / `is_active`; seed and confirm leave the edited route alone.
- **Seed needs:** default seed + `pnpm db:confirm` (SG, MY, KR, TW, JP, TH, US verified); Clerk dev users `admin`, `editor`, `sales` (owner).
- **Agent checks (recorded in the PR):**
  1. Migration SQL reviewed: only the five new nullable columns, no FK; applied to the local Docker database (`pnpm db:local`), not to Supabase without the owner's go-ahead.
  2. On the local database: set `admin_edited_at` on `sg` by SQL, run `pnpm db:seed` and `pnpm db:confirm`, and show with SQL that `sg`'s row and bands are unchanged while another unverified, never-edited route is still refreshed; confirm prints the skip line.
  3. Pure functions evaluated by a one-off `tsx` call (printed, not committed): the band schema on the invalid inputs listed in the ACs (each returns its field error) and on a VI-comma decimal; the warnings function on the current SG, MY, TH and US bands (expected: SG/TH shared-edge and MY nested overlaps warned, US gaps between point bands warned, no "no band today").
  4. Code walk-through: every page and action starts with `requireSection("routes")`; the admin-only fields are checked in the action; every write path calls `updateTag(routeTag(key))` and `updateTag(MENU_TAG)` after commit and none on failure; the equal-min check runs inside the transaction; client files import only `client.ts` / `shared/*`.
  5. Public JS: curl + gzip sum of `/`, `/en/` and `/gui-hang-di-singapore/` initial scripts vs `main` (≤ 1 KiB growth, no admin code).
- **Owner checklist (Clerk dev instance, `pnpm build && pnpm start`, private windows):**

  | # | User | Action | Expected |
  | --- | --- | --- | --- |
  | 1 | `sales` | open `/admin/routes/` and `/admin/routes/sg/` | 403 |
  | 2 | `editor` | open `/admin/routes/` | all routes listed with badges, band counts, last edit |
  | 3 | `editor` | `/admin/routes/sg/` | `is_verified` / `is_active` read-only; transit days and "Hiện giá" editable |
  | 4 | `editor` | add a band with max < min; with a minimum equal to an existing band | field errors, nothing saved |
  | 5 | `admin` | change the SG per-kg price of the cheapest band, save; open `/gui-hang-di-singapore/`, the mega menu and `/tinh-cuoc/` for 3 kg to SG | all three show the new price on first load; "Sửa lần cuối" shows the admin's name |
  | 6 | `admin` | set a band's "valid to" to yesterday | badge "Hết hạn"; preview drops it; public table drops it within the hour |
  | 7 | `admin` | untick "Đã xác minh" on a route, save | route page shows "Liên hệ" / badged facts per `factVisibility`; preview states it |
  | 8 | `admin` | delete a band, cancel, then confirm | cancel keeps it; confirm removes it and the public table updates |
  | 9 | `admin` | keyboard only: open the band dialog, Tab through, Esc | focus trapped, labels read, Esc closes without saving |
  | 10 | `admin` | 360 px and 1280 px | list and editor usable; dialog fits; no horizontal page scroll |

- **Runtime ACs are "pending owner verification"** until the owner runs the checklist; the PR lists each one with that label.
- **Validation commands:** `pnpm -C 43logistics.vn lint` (scoped `biome check --write <files>` for fixes), `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build`, `check:redirects` against the candidate build. No automated tests (ADR 0004). No consent-matrix re-run (proxy, tracking and leads untouched).

### Implementation Hints

- Pattern to copy: `modules/leads/actions.ts` (the only `"use server"` file today) + `.claude/rules/api-patterns.md` (thin action: guard → `safeParse(formInput(formData))` → use case → tags → `ActionState`) and `form-patterns.md` / `conditional-form-patterns.md` (`useActionState`, discriminated union, hide-then-drop, `PerKgFields` / `FlatPriceFields`).
- Preview: split `getRoutePricing` (`modules/pricing/ui/route-pricing.ts`) into the fact gate and a pure "bands valid today → `RoutePricing`" builder the admin preview calls with the gate bypassed; don't fork `RateTable`.
- Reuse `isFromPriceEligible`, `pickBand` semantics and `kgToGrams` / `parseDecimalNano` for the warnings and the equal-min check; band edges stay `[min, max]` inclusive and "highest min wins".
- `getRouteRateRows` filters all bands in JS by route key; the admin read should filter in SQL (`where route_id = …`).
- `updateTag` throws outside Server Actions: call it only in `actions.ts`, after the use case returns success.
- Write the stamp (`admin_edited_at/by`) in the same transaction as the band write; `routes` owns that update, so the pricing use case calls a `modules/routes` server function rather than updating `routes` itself.
- Lesson `2026-10-23-s08-lead-form`: list every file a new enum/prop threads through (schema → action → form → messages); scoped `biome check --write <files>`, then `git status`.
- shadcn has no form/switch/date-picker in `shared/ui`; checkboxes and native date inputs are enough. If a `switch` is added, use `shadcn add` and restyle via tokens (A-01 precedent: the CLI's `cn` package is removed).

### Related

- Roadmap: `docs/context/10-roadmap.md` A-02 (and A-03 for route names/content, L-02 for deployment)
- `docs/context/07-data-model.md` (routes, route_rates, Pricing rules, Seed), `06-architecture.md` (caching, Permissions, Server Actions), `03-information-architecture.md` (rate table, mega menu), `05-seo-and-tracking.md` (Offer JSON-LD from verified prices)
- `docs/context/11-open-questions.md` Q-04, Q-25, Q-15
- ADR 0004 (verification), ADR 0005 (modules), ADR 0006 (Cache Components, JS budget)
- `specs/feature-a01-admin-shell.md`, `specs/feature-s03-price-engine.md`, `specs/feature-s04-route-page-template.md`, `specs/feature-s07-calculator-page.md`
- `.claude/rules/api-patterns.md`, `form-patterns.md`, `conditional-form-patterns.md`, `state-patterns.md`
- `lessons/2026-10-23-s08-lead-form.md`
