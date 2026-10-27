---
title: Edit rate cards, surcharges and policies from the admin
type: feature
status: in_implementation
branch: feat/a02b-rate-cards-admin
implementation_pr: https://github.com/Dienvm/43logistics.vn/pull/55
owner_repo: both
roadmap: A-02b
priority: must-have
blocked_by_questions: [Q-04, Q-25]
updated: 2026-10-26
---

## Feature: Edit rate cards, surcharges and policies from the admin

### Problem Statement

Part 1 (`feature-a02b-rate-cards-public.md`) imports the sales retail list as rate cards and shows them publicly. The owner decided (2026-10-26) to publish the Excel values as written and **correct them later in the admin**: 30 open checklist items in `data/retail-price-list.md` §E1 (Q-29), plus future price changes.

After part 1, the admin can edit bands only. It cannot edit:

- card facts (transit, schedule, rounding, minimum weight, divisor, currency, labels);
- price columns (EU zones, cargo classes, item types);
- surcharge lists and items;
- per-card policy sections;
- which cards exist and in which order.

Fixing a sales error therefore still needs a developer, which defeats rule 2's "admin edits prices" promise.

Roadmap: **A-02b**, part 2 of 2.

### Proposed Solution

`/admin/routes/[key]` gains a **"Bảng giá dịch vụ"** area. It lists the route's cards in tab/chip order, each with:

- **Card form:**
  - tab label and place label (VI/EN);
  - method, currency, transit min/max + note, schedule;
  - rounding step, volumetric divisor, acceptance minimum kg, billing minimum kg;
  - active flag, sort.
- **Columns:** add, rename (VI/EN label + description), reorder, deactivate.
- **Bands** (the part-1 editor, now inside its card): per column when columns exist.
- **Policy sections:** an ordered list of sections. Each has a kind (`delivery`, `pricing`, `insurance`, `claims`, `rules`, `service`), a title and bullet items (VI/EN), plus "Copy to other cards of this route".
- **Surcharge lists linked:** checkboxes over the route's lists.

A separate **"Phụ thu"** area manages the route's surcharge lists:

- title and footnote (VI/EN), kind (`item` = "Phụ thu theo mặt hàng" / `fee` = "Phí khác");
- items (item · price text · note, VI/EN), with reorder and the active flag.

Every save invalidates `route:{key}` + `menu` and shows the public preview of the card.

### Acceptance Criteria

- [ ] **AC-01** Given an `admin` or `editor` (`requireSection('routes')`), when they create a card on `/admin/routes/kr`, it appears last in its tab with no bands. Then:
  - the public page shows it only after it has at least one band and is active;
  - deleting a card asks for confirmation and removes its bands and columns (cascade);
  - `sales` gets 403.
- [ ] **AC-02** Given the card form, the Zod validation rules are:
  - **labels:** VI required; EN required before the route can be published (warning, not a block, while the route is unpublished);
  - **transit:** min ≤ max, both 0–90;
  - **rounding step:** one of 0,1 / 0,5 / 1 kg or empty;
  - **divisor:** an integer 1000–10000;
  - **minimums:** each ≥ 0, acceptance ≤ billing when both are set;
  - **currency:** one of the enum values.
  - The currency **cannot be changed while the card has bands** (minor-unit exponents differ: 100.000 đ would read as 1.000,00 US$). The form shows "Xoá các khung giá trước khi đổi tiền tệ".
- [ ] **AC-03** Given the columns editor:
  - adding a column to a card that has bands asks whether to copy the bands' edges into the new column with "Liên hệ" prices;
  - deactivating a column hides it publicly and keeps its bands.
- [ ] **AC-04** Given the policy editor, the sections render publicly in the saved order under "Bảo hiểm & khiếu nại" (part 1, AC-12). "Copy to other cards" overwrites the chosen cards' section of the same kind after a confirmation.
- [ ] **AC-05** Given the surcharge editor:
  - items accept free text for the price (e.g. "120K/chai + 500K an ninh") because they are informational (not in the calculator);
  - an item with `is_active = false` is hidden publicly; this is how the owner hides a row (e.g. "hàng fake" rows, which part 1 publishes verbatim);
  - lists can be linked to several cards.
- [ ] **AC-06** Given any save, the actions follow the A-02 pattern: guard → Zod parse → use case in a transaction → `updateTag(routeTag(key))` + `updateTag(MENU_TAG)`. They set `routes.admin_edited_*` and `rate_cards.admin_edited_*`. The import's skip and `--force` rules from part 1 (AC-02) apply unchanged.
- [ ] **AC-06b** Mutation matrix. Each edit shows on the listed public surfaces after save; the PR records ✓ per row.

  | Edit | Route page | Calculator | Hero / menu / hub "Từ" | JSON-LD |
  |---|---|---|---|---|
  | Band price | ✓ | ✓ | ✓ | ✓ |
  | Card transit / schedule / rounding / minimums / divisor | ✓ facts line | ✓ | ✓ transit | — |
  | Card active flag / sort / labels | ✓ tabs, chips | ✓ options | ✓ | ✓ |
  | Column rename / reorder / deactivate | ✓ | ✓ options | ✓ if per-kg | — |
  | Surcharge item edit / deactivate | ✓ | — | — | — |
  | Policy section edit / copy | ✓ | — | — | — |
- [ ] **AC-06c** Part 2 drops the deprecated `routes` columns (`transit_days_*`, `transit_note`, `flight_schedule`, `methods`, `volumetric_divisor`, `weight_rounding_kg`) in a migration after confirming no reader remains (`grep`).
- [ ] **AC-07** Given a route page preview in the admin, it renders the public `RateCardSection` for the edited card with visibility forced to shown (A-02 preview pattern).
- [ ] **AC-08** Given `/admin/routes`, the list shows per route the number of active cards, the currencies used, and the last edit date and editor.

### Scope

**In scope:**
- card CRUD and reorder;
- columns CRUD;
- policy sections editor with copy;
- surcharge lists and items CRUD and linking;
- import/seed skip rules;
- admin list summary.

**Out of scope:**
- creating routes (pages, slugs and menus stay seed + `db:confirm`, A-08);
- bulk Excel re-import from the admin;
- price history/audit beyond `admin_edited_*` and `updated_by`;
- currency conversion;
- automated tests (ADR 0004).

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | admin pages | `app/admin/(shell)/routes/[key]/page.tsx`, `app/admin/(shell)/routes/page.tsx` |
| app | pricing | `modules/pricing/actions.ts`, `application/*` (card, column, policy, surcharge use cases + Zod schemas), `infrastructure/rate-card-writes.ts`, `surcharge-writes.ts`, `admin-rate-queries.ts`, `ui/admin/*` (card form, columns, policies, surcharges) |
| app | scripts | `scripts/import-rate-cards.ts`, `scripts/seed/write-routes.ts` (skip rules) |
| app | i18n | `messages/vi.json`, `messages/en.json` (admin strings, VI only for admin if that is the A-02 convention) |
| context | docs | `docs/context/07-data-model.md` (admin rules), `docs/context/06-architecture.md` if the admin pattern changes |

### Golden-rule checks

- **Rule 2:** the admin is the only editor of prices after the import. No price lives in code.
- **Rule 5:** `updateTag` after every mutation.
- **Rule 7:** `requireSection('routes')` on every action; `isActive` of a route stays admin-only (A-02).
- **Rule 10:** labelled inputs, error text tied to fields, 44 px targets, keyboard-reorderable lists (buttons, not drag-only).

### Dependencies & Risks

- Depends on: part 1 merged (schema `0009`, import).
- Risk: editors and admins have the same rights on prices (A-02 decision). Note it; no change.
- Risk: the policy "copy to other cards" overwrites text. Mitigated by the confirmation dialog.

### Manual Verification Plan

- **Seed:** part-1 local DB after the import.
- **Steps:**
  1. On `/admin/routes/tw`, change the dry ĐN+ card price 93.000 → 95.000 and save. `/gui-hang-di-dai-loan/` and the mega menu show 95.000 after reload.
  2. Add a column "Hàng giá trị cao" to `sg-vn` air, copy the edges, then set 15 US$. The public transposed table shows the row.
  3. Create a card "Tàu · TP.HCM" on `ph` with one band and activate it. A new tab appears publicly. Delete it and the tab is gone.
  4. Edit the EU "Bảo hiểm" section, copy it to no other card, and save; the public text is updated.
  5. Deactivate the SGN surcharge item "Fake thương hiệu (quần áo)", which part 1 imports active (owner decision: verbatim). It is hidden publicly; reactivate it and it shows again.
  6. Run `pnpm db:import-rate-cards --replace` again: `tw` is reported as skipped (admin-edited).
  7. Log in as `sales` and POST a card action: 403.
  8. axe at 1280 on the admin route page: zero serious or critical issues. Keyboard pass through the card form and reorder buttons.
- **Validation commands:** `lint`, `typecheck`, `check:boundaries`, `build`, `i18n:check`, `check:redirects`. Per the owner's admin rule: static checks + logic review, no Lighthouse on admin.

### Related

- `specs/feature-a02b-rate-cards-public.md` (part 1)
- `specs/feature-a02-routes-rates-editor.md`
- `data/retail-price-list.md` §E1, §F
