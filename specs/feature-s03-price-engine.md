---
title: Add the pure price engine for quotes
type: feature
status: approved
owner_repo: both
roadmap: S-03
priority: must-have
blocked_by_questions: [Q-04, Q-25]
updated: 2026-10-22
---

## Feature: Add the pure price engine for quotes

### Problem Statement

Roadmap S-03 (`docs/context/10-roadmap.md`): the route page mini calculator (S-04), the calculator page `/tinh-cuoc/` (S-07), the `calculate_quote` event (`05-seo-and-tracking.md`) and the L-01 price evidence all need one rule set that turns "route + weight + dimensions" into a chargeable weight and an estimate. Today the app only has the S-01 from-price rule (`modules/pricing/domain/from-price.ts`), which answers "từ X đ/kg" and nothing else.

The legacy rate data (`43logistics.vn/data/seed/routes.legacy.json`, all `is_verified = false`) is inconsistent: gaps between bands (SG 1–5 / 6–20 kg), overlapping edges (SG 21–100 / 100+, TH 5–10 / 10–30, MY 100+ / 300+), US flat point bands (0.5, 1, 5 … 20 kg) with no price between the points, and a rounding step on US only. Without explicit rules a calculator either invents prices or shows wrong ones (golden rules 1–2). This spec fixes those rules (owner decisions 2026-10-22, below) and builds them as pure, typed, framework-free functions (ADR 0004 Decision 3, ADR 0005).

### Proposed Solution

A visitor who enters a route, method, actual weight and optional L×W×H gets either:

- a **price**: chargeable weight, which band matched, flat or per-kg mode, and an integer VND total; or
- **"Liên hệ"** with a machine-readable reason (`unverified`, `not_public`, `no_band`, `contact_band`, `ambiguous_band`, `out_of_range`); or
- an **invalid-input** result naming the field.

The engine never guesses: anything the rate data doesn't cover exactly is "Liên hệ".

#### Pricing rules (owner decisions 2026-10-22)

1. **Units.** All weight math is in integer grams (no float drift). Actual weight input (kg) is rounded **up** to the gram, whatever its number of decimals (1.0004 kg → 1.001 kg); the kg → g conversion is exact (scaled integers or string parsing, never `kg * 1000` alone). Dimensions are centimetres.
2. **Volumetric weight** = L × W × H / `routes.volumetric_divisor` kg, rounded **up** to the gram. Only computed when all three dimensions are given.
3. **Chargeable weight** = max(actual, volumetric).
3a. **Supported range** (input validation, not a business fact): 0 < actual ≤ 100.000 kg; each dimension 0 < d ≤ 10.000 cm; the **chargeable** weight (after volumetric and rounding) ≤ 100.000 kg. Anything else returns `invalid` naming the field (`actualWeight` or `dimensions`).
4. **Rounding.** If `routes.weight_rounding_kg` is set, the chargeable weight is rounded **up** to the next multiple of that step (US 0.5 kg: 1.3 → 1.5, 1.0 → 1.0, 1.01 → 1.5). If it is null, **no rounding** is applied (gram precision). No default step is assumed (Q-25).
5. **Eligibility (engine applies it).** The result is "Liên hệ" when the route is not verified (`is_verified = false`, unless the caller passes the preview flag that `PREVIEW_UNVERIFIED=1` sets) or `prices_public = false`. Only bands of the requested `method` whose validity window contains `today` (Asia/Ho_Chi_Minh, `YYYY-MM-DD`, both bounds inclusive, the S-01 rule) take part. The engine matches `route_rates.method` only and does not consult `routes.methods` (the seed lists `air_economy`/`air_express`/`sea` for US and TH while every seed band is `air`; reconciling them is data work under Q-04).
6. **Band coverage.** A band covers `[weight_min_kg, weight_max_kg]`, both inclusive; `weight_max_kg = null` is open-ended.
7. **Overlaps.** When several bands cover the weight, the band with the **highest `weight_min_kg` wins** (SG 100 kg → the 100+ band). If two or more covering bands share that highest minimum, the result is "Liên hệ" (`ambiguous_band`), independent of row order (the schema has no unique constraint on `(route_id, method, weight_min_kg)`).
8. **Gaps, below the lowest band, above the highest closed band** → "Liên hệ" (`no_band`). Examples: SG 5.3 kg, SG 0.5 kg, TH 3 kg, US 1.5 kg with the seed's point bands.
9. **Band modes.**
   - `contact_for_price = true` → "Liên hệ" (`contact_band`), even when an open-ended per-kg band starts lower (MY 300 kg).
   - only `flat_price_vnd` set → the total is that fixed amount for the shipment, not per kg.
   - only `price_per_kg_vnd` set → total = price per kg × chargeable grams / 1000, rounded **half up** to the đồng, computed with `bigint` so no intermediate loses precision. A total above `Number.MAX_SAFE_INTEGER` returns "Liên hệ" (`out_of_range`).
   - both set → "Liên hệ" (`ambiguous_band`, a data error).
10. **Out of the engine.** No VAT, insurance, fuel or other surcharges, no minimum charge, no promos or discounts (Q-04, Q-07, Q-09). The result carries no transit time (S-04/S-07 read that from `routes`).

### Acceptance Criteria

- [ ] Given the domain files, when `pnpm check:boundaries` runs, then the new `modules/pricing/domain/*` files import nothing outside the module's own domain and `shared/types` (no `next`, `react`, `zod`, `drizzle-orm`, `db/`), and the `domain-pure` rule passes.
- [ ] Given `modules/pricing/client.ts`, when it is imported, then it exposes the quote function, its input/result types and the weight helpers, and contains no `server-only` import and no import of `infrastructure/` or `@/db`.
- [ ] Given route rows and `route_rates` rows as Drizzle returns them (`numeric` columns as strings), when the infrastructure mapper converts them, then the domain receives numbers in grams/VND, and a malformed numeric value fails loudly instead of becoming `NaN`.
- [ ] Given the worked examples below, when `pnpm price:examples` runs, then it prints one line per row (inputs, chargeable weight, result kind, reason or total) and the reviewer confirms by hand that each line matches the table. The script makes no assertions, prints no PASS/FAIL and exits 0 unless it crashes (ADR 0004 Decision 1: no test suite by purpose).
- [ ] US rounding: given the US seed route (step 0.5 kg), actual 1.3 kg → chargeable 1.5 kg; actual 1.0 kg → 1.0 kg (no float drift); 0.8 kg → 1.0 kg → flat 1.227.963 đ.
- [ ] SG band edge: 5 kg → per-kg 150.000 × 5 = 750.000 đ; 6 kg → 88.000 × 6 = 528.000 đ; 5.3 kg → "Liên hệ" (`no_band`).
- [ ] Volumetric > actual: SG actual 2 kg, 40 × 30 × 30 cm, divisor 5000 → volumetric 7.2 kg → chargeable 7.2 kg → 88.000 × 7,2 = 633.600 đ.
- [ ] Open-ended and overlapping bands: SG 100 kg → 57.000 × 100 = 5.700.000 đ (higher min wins); SG 150 kg → 8.550.000 đ.
- [ ] Contact-for-price: KR 150 kg → "Liên hệ" (`contact_band`); MY 300 kg → "Liên hệ" (`contact_band`, higher min wins over the 52.000/kg 100+ band).
- [ ] Eligibility: an unverified route returns "Liên hệ" (`unverified`) unless the preview flag is set; `prices_public = false` returns `not_public`; a band whose `valid_to` is before `today` is ignored; a method with no bands (seed TH `sea`) returns `no_band`.
- [ ] Overlap tie: two covering bands with the same highest minimum return "Liên hệ" (`ambiguous_band`) in either row order.
- [ ] Invalid input: actual weight ≤ 0, non-finite or above 100.000 kg; only some of L/W/H given, any ≤ 0 or above 10.000 cm; or a chargeable weight above 100.000 kg returns `invalid` naming the field; no exception escapes.
- [ ] The roadmap's "checked manually in the calculator" is **not** satisfied by S-03: S-03's evidence is the printed worked examples. S-04 (mini calculator) and S-07 (`/tinh-cuoc/`) must each re-run these worked examples through their UI as part of their own verification plans, and L-01 repeats them per route (ADR 0004 line 68). The roadmap S-03 row says so.
- [ ] No business fact is hard-coded: the divisor, rounding step and prices come only from the route and band arguments (golden rule 2); the worked-example script reads its fixtures from `data/seed/routes.legacy.json`, plus inline synthetic rows only for cases the seed can't express (validity windows, both prices set, overlap ties, `prices_public = false`, a malformed numeric string), each marked as synthetic.

#### Worked examples (`pnpm price:examples`)

Seed values are **unverified legacy data** (Q-04), used here only to exercise the rules. Today = 2026-10-22, method `air`, divisor 5000, preview flag on unless noted.

| # | Route | Input | Chargeable | Expected |
|---|-------|-------|-----------|----------|
| 1 | US | 1.3 kg | 1.5 kg | Liên hệ `no_band` (seed has points at 1 and 5 kg only) |
| 2 | US | 1.0 kg | 1.0 kg | flat 1.227.963 đ |
| 3 | US | 0.8 kg | 1.0 kg | flat 1.227.963 đ |
| 4 | US | 21.2 kg | 21.5 kg | 220.000 × 21,5 = 4.730.000 đ |
| 5 | US | 20.2 kg | 20.5 kg | Liên hệ `no_band` |
| 6 | SG | 5 kg | 5 kg | 750.000 đ |
| 7 | SG | 6 kg | 6 kg | 528.000 đ |
| 8 | SG | 5.3 kg | 5.3 kg | Liên hệ `no_band` |
| 9 | SG | 2 kg, 40×30×30 cm | 7.2 kg | 633.600 đ |
| 10 | SG | 1 kg, 33×27×19 cm | 3.386 kg (16 929 cm³ / 5000, up to the gram) | 150.000 × 3,386 = 507.900 đ |
| 11 | SG | 100 kg | 100 kg | 5.700.000 đ |
| 12 | SG | 150 kg | 150 kg | 8.550.000 đ |
| 13 | SG | 0.5 kg | 0.5 kg | Liên hệ `no_band` |
| 14 | KR | 150 kg | 150 kg | Liên hệ `contact_band` |
| 15 | MY | 300 kg | 300 kg | Liên hệ `contact_band` |
| 16 | SG | 5 kg, preview **off** | — | Liên hệ `unverified` |
| 17 | TH | 10 kg, method `sea` | 10 kg | Liên hệ `no_band` |
| 18 | SYN-A | 10 kg; bands A `[1, ∞)` 100.000/kg `valid_to` 2026-10-21, B `[0.5, ∞)` 120.000/kg no dates | 10 kg | A expired → B: 1.200.000 đ |
| 19 | SYN-B | 10 kg; one band `[1, ∞)` with `flat_price_vnd` 500.000 **and** `price_per_kg_vnd` 100.000 | 10 kg | Liên hệ `ambiguous_band` |
| 20 | SG, `prices_public = false` (synthetic copy) | 5 kg, preview on | — | Liên hệ `not_public` |
| 21 | SG | 0 kg / 2 kg + only L = 40, W = 30 | — | `invalid` (`actualWeight` / `dimensions`) |
| 22 | SYN-A | same as 18 but A `valid_to` **2026-10-22** (today, inclusive) | 10 kg | A applies: 1.000.000 đ |
| 23 | SYN-A | same as 18 but A has `valid_from` **2026-10-23** and no `valid_to` | 10 kg | A not yet valid → B: 1.200.000 đ |
| 24 | SYN-C | 10 kg; bands `[1, ∞)` 100.000/kg and `[1, ∞)` 110.000/kg, run in both row orders | 10 kg | Liên hệ `ambiguous_band` both times |
| 25 | SG | 8 kg, 20×20×20 cm (volumetric 1.6 kg) | 8 kg (actual > volumetric) | 88.000 × 8 = 704.000 đ |
| 26 | SG | 1.0004 kg | 1.001 kg (up to the gram) | 150.000 × 1,001 = 150.150 đ |
| 27 | SG | 100.000,001 kg / 1 kg + 1.000×1.000×1.000 cm (volumetric 200.000 kg) | — | `invalid` (`actualWeight` / `dimensions`) |
| 28 | mapper | a `route_rates` row with `weight_min_kg = "abc"` | — | the mapper throws an error naming `weight_min_kg`; the script prints the message and continues |

Synthetic routes SYN-A/B/C: `is_verified = true`, `prices_public = true`, divisor 5000, `weight_rounding_kg = null`, method `air`. They exist only inside the script and are labelled "synthetic" in its output.

If the implementer finds a seed value that differs from this table, the seed file wins for the price and the table is corrected in the PR (the rule under test stays the same).

### Scope

**In scope:**

- Pure domain functions in **new** files under `43logistics.vn/modules/pricing/domain/`: weight conversion and rounding, volumetric and chargeable weight, band selection, quote.
- `43logistics.vn/modules/pricing/client.ts` (new): the client-safe API for S-04/S-07.
- An infrastructure mapper from `routes` / `route_rates` rows to the domain types (no new query, no cache tag).
- `43logistics.vn/scripts/price-examples.ts` + `package.json` script `price:examples` (prints results for manual comparison, no assertions; not a test suite, ADR 0004).
- Context: Q-25 in `11-open-questions.md` (added with this spec), the S-03 roadmap row wording (added with this spec), the pricing rules in `07-data-model.md` (route_rates section) and the `price:examples` row in `AGENTS.md` §7 (with the implementation).

**Out of scope:**

- Any UI: the mini calculator (S-04), `/tinh-cuoc/` and its Zustand store (S-07), the `calculate_quote` event (S-07/S-13).
- A query that loads rates for a route (S-04/S-07 add it with their cache tags).
- Changing `from-price.ts`, `ui/route-cards.tsx` or `infrastructure/queries.ts` (S-01 code; S-05 is editing the UI files in parallel).
- VAT, insurance, surcharges, minimum charge, promos (Q-04, Q-07, Q-09), currency conversion, per-goods-type pricing.
- Schema or migration changes; fixing the seed data (Q-04 replaces it).
- Unit tests (ADR 0004).

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | module domain (new) | `modules/pricing/domain/weight.ts` (grams, rounding, volumetric, chargeable) |
| app | module domain (new) | `modules/pricing/domain/quote.ts` (eligibility, band selection, quote result) |
| app | module client API (new) | `modules/pricing/client.ts` |
| app | module infrastructure (new) | `modules/pricing/infrastructure/quote-mappers.ts` |
| app | module server API | `modules/pricing/index.ts` (append exports only) |
| app | script (new) | `scripts/price-examples.ts`; `package.json` (`price:examples`) |
| context | doc | `docs/context/11-open-questions.md` (Q-25), `docs/context/07-data-model.md` (pricing rules), `AGENTS.md` §7 |

### Golden-rule checks

- **1–2 Facts and the single price source:** prices, divisor and rounding are inputs read from `routes`/`route_rates`; nothing in the domain or `client.ts` contains a price, divisor or step. Unverified routes are "Liên hệ" unless the preview flag is set.
- **6 Server-only DB:** `client.ts` and `domain/` never import `@/db` or `infrastructure/`; the mapper lives in `infrastructure/`.
- **8 JS budget:** no public page imports the engine in this task, so the app JS delta is 0. S-07 will measure it when the calculator island imports `client.ts`.
- **ADR 0005:** `domain-pure` dependency-cruiser rule; cross-module imports only through `client.ts`/`index.ts`.

### Dependencies & Risks

- Depends on: F-04 (`routes`/`route_rates` schema, done), S-01 (`Vnd`, validity rule, done). No open AGENTS.md §3 gap.
- Blocked by questions (placeholders, ADR 0004):
  - **Q-04** real rate tables, VAT/insurance/surcharges: the engine runs on unverified seed data and returns "Liên hệ" on public pages until routes are verified.
  - **Q-25** (new) rounding step per route, band edge semantics and minimum charge: the engine uses the rules above; when the owner answers, only the data (or a documented rule change) moves.
- Risk: the owner's real tables may use a different edge convention (e.g. `[min, next min)`); the rules are isolated in `quote.ts` so a change is local.
- Risk: the S-05 session edits `modules/pricing/ui/*` and `modules/pricing/index.ts` in parallel; this task only appends to `index.ts`, so expect a one-line rebase conflict at most.

### Manual Verification Plan

- Scenario: Given the seed rates, when `pnpm -C 43logistics.vn price:examples` runs, then it prints rows 1–28 and every printed result matches the Worked examples table when compared by hand.
- Seed needs: none. The script reads `data/seed/routes.legacy.json` and inline synthetic rows; it does not touch any database (the shared local Postgres is not used).
- Steps:
  1. Run `pnpm -C 43logistics.vn price:examples` and paste its output into the PR next to the table, marking each row as matching.
  2. Hand-check rows 4, 9, 10 and 26 with a calculator and note the arithmetic in the PR (L-01 evidence format).
  3. Confirm `client.ts` has no `server-only` / `@/db` / `infrastructure` import (`grep -nE "server-only|@/db|infrastructure" modules/pricing/client.ts` prints nothing), and that `pnpm check:boundaries` passes.
  4. Client-bundle probe (S-03 app worktree only, never committed): add a temporary `"use client"` component that calls `quote()` from `@/modules/pricing/client` with row 6's input and renders the total, import it into the existing `app/[locale]/(site)/page.tsx`, run `pnpm build && pnpm start -p 3200`, open `http://localhost:3200/` and confirm the probe shows 750.000 with no console error. Then remove only the probe changes (`git diff` shows nothing under `app/`).
  5. With the same production server on port 3200 (probe removed and rebuilt), run `pnpm check:redirects --base http://localhost:3200` and record 0 FAIL (PENDING/SKIPPED rows as named deferrals, F-07).
- Validation commands: `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `build`, `i18n:check`, `check:redirects` (step 5). No public UI change, so no axe scan or Lighthouse run; the committed JS delta is 0 (no public route imports the engine). No automated tests (ADR 0004).

### Implementation Hints

- Shape (not prescriptive): `quote(route, bands, input, { today, previewUnverified })` returning a discriminated union `{ kind: "price" | "contact" | "invalid", … }`. Keep each function under the `code-style.md` size limits.
- Convert kg → grams exactly (e.g. parse the decimal string into integer milligrams, then ceil to grams) so `1.0` stays 1000 g and `1.0004` becomes 1001 g. Compute per-kg totals as `bigint`: `(BigInt(price) * BigInt(grams) * 2n + 1000n) / 2000n` is half-up for positive values; convert back to `number` only after the safe-integer check.
- Reuse `Vnd` from `domain/from-price.ts` by import; don't edit that file. Name weights `weightKg`/`lengthCm`/`…G` per `type-definitions.md`.
- The seed JSON uses kg numbers; the DB returns `numeric` as strings (`scripts/seed/write-routes.ts:12`). The mapper and the script both go through the same kg → grams conversion.
- Lesson patterns to avoid: hard-coding 5000 or 0.5; float rounding (`1.0` → `1.5`); adding VAT or a minimum charge that no doc confirms.

### Related

- Roadmap: S-03 (consumed by S-04, S-07; evidence for L-01).
- `docs/context/01-business.md` (prices, volumetric formula, US rounding: all unverified), `docs/context/07-data-model.md` (`routes`, `route_rates`), `docs/context/03-information-architecture.md` (calculator inputs/outputs), `docs/context/12-glossary.md` (cân nặng tính cước).
- ADR 0004 (no tests, pure price logic, worked-example evidence), ADR 0005 (module layers, `client.ts`).
- `specs/feature-s01-site-layout-shell.md` (from-price rule, validity window). Partial overlap with `specs/feature-s05-home.md` (in flight): S-05 owns `modules/pricing/ui/*`; S-03 owns the new domain files.
