---
title: Show the retail price list as per-route rate cards
type: feature
status: in_implementation
owner_repo: both
roadmap: A-02b
priority: must-have
blocked_by_questions: [Q-04, Q-05, Q-08, Q-09, Q-25, Q-30]
branch: feat/a02b-rate-cards-public
implementation_pr: https://github.com/Dienvm/43logistics.vn/pull/45
updated: 2026-10-26
---

## Feature: Show the retail price list as per-route rate cards

### Problem Statement

Sales sent the full retail price list (`data/TỔNG HỢP GIÁ BÁN LẺ.xlsx`, 27 tabs). It is transcribed and analysed in `data/retail-price-list.md`.

One route has several prices, depending on:

- **origin** (Đà Nẵng·Huế·Quảng Bình·Quảng Trị / Hà Nội / TP.HCM / Huế);
- **method** (air, sea, road, hand-carry);
- **service or cargo class** (dry, frozen, express, economy, regular, mixed);
- **destination zone** (7 EU zones, California or not);
- **currency** (VND, SGD, USD, KRW).

Each price also comes with its own transit, schedule, rounding, minimum weight, domestic delivery fee, item surcharges and insurance/claims rules.

The schema has none of these dimensions: `route_rates` is VND-only bands per `(route, method)`.

The live prices are the 2026-10-22 legacy values and differ sharply from the list:

- Singapore 21–100 kg is 68.000 đ/kg live, against 94.000 (HCM) and 125.000 (HN/ĐN) in the list.
- Thailand is listed as air but is a road service.

Eight destinations and directions are missing: Philippines, Canada, UK, Australia, EU, and Taiwan, Korea and Japan → VN.

Roadmap: **A-02b** (Phase 2, after A-02). This is part 1 of 2: data, import, public display, calculator, and the minimum A-02 admin adaptation. Part 2 (`feature-a02b-rate-cards-admin.md`) adds full admin editing.

### Owner decisions (recorded in `data/retail-price-list.md` §F)

1. **Scope:** publish every route in the workbook **except Indonesia** ("CHƯA DÙNG").
2. **Values:** use the Excel values as written. The owner gave this instruction on 2026-10-26: "triển khai theo giá gửi trong file excel, các giá trị này có thể tuỳ chỉnh tại trang admin nên có thể cập nhật sau".
   - The open checklist items (§E1, 30 after the 2026-10-26 answers) are imported literally and become **Q-29**.
   - The import records the confirmation in `data/owner-confirmations.json` (`rateCards`, `confirmedAt: 2026-10-26`, source `data/retail-price-list.md`). This is the rule-1 record.
   - Hidden Excel rows, columns and cells are not part of the list.
3. **Currency:** foreign-currency prices stay in SGD, USD or KRW, with no conversion.
4. **Surcharges and policies:** full item-surcharge tables and insurance/claims/delivery rules per route.
   - The EU text written for partners is rewritten for retail customers.
   - Sales item names are published **verbatim**, including "hàng fake" rows. The owner decided this on 2026-10-26 after being told of the legal and trust risk.
5. **Tab names are authoritative** for method (SEA = sea, AIR = air) and cargo type. Origin comes from the source wording: the US economy image says "Huế – USA", so its origin is **Huế only** (owner 2026-10-26).
6. **Pages:** one page per country per direction (current URL logic). Inside a page there are service tabs and place chips.
7. **Chargeable weight:** max(actual, L × W × H cm / divisor), kept at gram precision, then rounded up to the card step. The divisor is 5000, except Korea → VN (4500, air and sea).

### Proposed Solution

**Rate card ("bảng giá dịch vụ").** A route has one or more rate cards. A card is one combination of method × service × place, where place is the origin for outbound routes and the destination for inbound routes. A card has:

- a currency;
- weight bands (`route_rates`);
- optional **price columns**: EU zones, California / outside California, cargo classes, hand-carry item types;
- its own facts: transit, schedule, rounding step, divisor, acceptance minimum, billing minimum;
- ordered **policy sections**;
- links to **surcharge lists** (item → price text → note).

Route summaries are **derived on read** from the active cards: hero transit, methods and "Từ X". They are no longer stored facts.

**Visitor view.** The price section ("Bảng giá") has:

- **service tabs**, for example "Bay · hàng khô", "Bay · đông lạnh", "Tàu", "Xe", "Xách tay", "Bay nhanh", "Bay chậm";
- **place chips** inside a tab: "Gửi từ" for outbound, "Nhận tại" for inbound;
- for the selected card: the band table, the facts line, "Phụ thu theo mặt hàng", "Phí khác" and "Bảo hiểm & khiếu nại" (collapsible).

Every card is in the server HTML. A small client island only toggles visibility.

**Calculator.** The route mini calculator and `/tinh-cuoc/` pick the card (tab + chip), the column if any, the weight and optional L × W × H (cm). They quote in the card currency.

### Schema (migration `0009`)

**Enums**

- `currency_code` (`VND`, `USD`, `SGD`, `KRW`), with minor-unit exponents VND 0, KRW 0, USD 2, SGD 2. The exponents live in code (`modules/pricing/domain/money.ts`), not in the DB.
- `shipping_method` gains `road` and `hand_carry`.
- `policy_kind` (`delivery`, `pricing`, `insurance`, `claims`, `rules`, `service`).
- `surcharge_list_kind` (`item`, `fee`).
- `quote_mode` (`quotable`, `contact`).

**`rate_cards`**

| Column | Type / rule |
|---|---|
| `id` | uuid PK |
| `route_id` | FK, cascade |
| `key` | text, unique per route; stable slug such as `air-dry-dn` |
| `method` | `shipping_method` |
| `tab_key` | text; groups cards into a tab, e.g. `air-dry` |
| `currency` | not null |
| `transit_days_min`, `transit_days_max` | smallint, nullable |
| `weight_rounding_kg` | numeric, nullable; null = no rounding |
| `volumetric_divisor` | int, not null, default 5000 |
| `min_weight_kg` | numeric, nullable; acceptance minimum, below it → contact |
| `min_chargeable_kg` | numeric, nullable; billing minimum, below it → charged at it |
| `is_active` | boolean |
| `sort` | int |
| `admin_edited_at`, `admin_edited_by` | as on `routes` |
| timestamps | |

**`rate_card_translations`**: `(card_id, locale)` PK, `tab_label`, `place_label`, `transit_note`, `schedule`, `policies` (jsonb, Zod-validated). `policies` is an array of `{ kind, title, items: string[] }` in display order.

**`rate_card_columns`**

| Column | Type / rule |
|---|---|
| `id` | uuid PK |
| `card_id` | FK, cascade |
| `key` | unique per card |
| `quote_mode` | `quote_mode` |
| `is_active` | boolean |
| `sort` | int |

Unique `(id, card_id)` exists for the composite FK below. Its translations live in `rate_card_column_translations (column_id, locale) → label, description`.

**`surcharge_lists`**: `id`, `route_id` FK cascade, `key` (unique per route), `kind`, `sort`. Translations live in `surcharge_list_translations (list_id, locale) → title, footnote`.

**`surcharge_items`**: `id`, `list_id` FK cascade, `is_active`, `sort`, plus per-locale `surcharge_item_translations (item_id, locale) → item, price, note`. The price is free text and informational only.

**`rate_card_surcharge_lists`**: `(card_id, list_id)` PK, both FK cascade, plus `sort`. A server-side check enforces that the list and the card share the same route.

**`route_rates` changes**

- Add `rate_card_id` (not null after backfill, FK cascade).
- Add `column_id` (nullable), with composite FK `(column_id, rate_card_id)` → `rate_card_columns (id, card_id)`. A column must belong to the band's card.
- Rename `price_per_kg_vnd` → `price_per_kg_minor` and `flat_price_vnd` → `flat_price_minor`. Values are minor units of the card currency.
- Add `weight_label` and `price_label` translations in `route_rate_translations (rate_id, locale) → weight_label, price_label`.
- **Drop `route_rates.route_id` and `route_rates.method`.** Both come from the card. The `route_rates_route_idx` index becomes `(rate_card_id, column_id, weight_min_kg)`.

**`routes` changes**

- Keep `transit_days_*`, `transit_note`, `flight_schedule`, `methods`, `volumetric_divisor` and `weight_rounding_kg` columns for one release, but stop reading them.
- The migration comment marks them deprecated. Part 2 drops them.

**Wiring:** `db/schema.ts` re-exports the new tables, and Drizzle relations are declared in the module schema files.

**Backfill (in `0009`):**

1. One card per existing `(route, method)`, with key `legacy-{method}`, the route's divisor and rounding, and currency VND.
2. Card translations take the route name as the place label and the method label as the tab label.
3. Every existing band is pointed at its card.
4. Then the NOT NULL constraint and the drops are applied.

### Acceptance Criteria

**Data model and import**

- [ ] **AC-01** Given migration `0009` on a copy of the current data, when `pnpm db:migrate` runs:
  - the schema above exists, with RLS on every new table and no policies;
  - every pre-existing band belongs to a `legacy-*` card;
  - the public pages render **the same prices** as before the migration (pre-import parity).

  Given an empty DB, `pnpm db:migrate && pnpm db:seed` succeeds, and a second `db:seed` changes nothing. The seed writer creates `legacy-*` cards for `routes.legacy.json` rates.
- [ ] **AC-02** Given `43logistics.vn/data/seed/rate-cards.json`, `pnpm db:import-rate-cards` behaves as follows:
  - **No flag (dry run):** prints, per route in the file, a **per-band diff** (card · column · weight → old → new), plus card, column, list and policy counts. Writes nothing.
  - **`--replace`:**
    1. writes a JSON backup of every row it will delete to `43logistics.vn/.backups/rate-cards-{timestamp}.json` (gitignored);
    2. replaces the listed routes' cards, bands, columns, lists, policies and the targeted content (AC-20) in one transaction;
    3. **skips** any route with `admin_edited_at` set (A-02 or later) and prints "skipped (admin-edited)".
  - **`--replace --force`:** also replaces admin-edited routes, after the backup.
  - **Always:** never touches routes absent from the file, and a second `--replace` run changes nothing.
- [ ] **AC-03** Given the JSON file, the import fails before writing, with a readable path and message, when:
  - a band has both a per-kg and a flat price;
  - two bands in the same card and column overlap;
  - a column key is unknown;
  - a currency is missing;
  - a VI or EN label is missing;
  - a `quote_mode: quotable` column has a band with only a `price_label`.
- [ ] **AC-04** Given the imported data, `pnpm price:cards` (new, read-only) prints **all 38 cards** as tables (columns, bands with labels, facts, linked lists, policy titles).
  - A reviewer compares them with `data/retail-price-list.md`: values equal the Excel as written (owner decision 2).
  - Hidden content is absent: the Korea frozen ĐN promo, Taiwan dry weight bands, the Japan schedule, Indonesia.
  - The PR records the comparison per card (✓ / note).

**Band and weight rules (engine)**

- [ ] **AC-05** **Literal edges.** Bands keep the sale's numeric edges, inclusive on both ends, and the sale's wording is stored as `weight_label`. Examples:

  | Sale label | Stored edges |
  |---|---|
  | "3–10 kg" | 3–10 |
  | "Trên 100 kg" | min 100 (exclusive): stored as 100.001, label "Trên 100 kg" |
  | "Dưới 5 kg" | 0–4.999 |

  A chargeable weight that falls between two bands (e.g. SG 2,5 kg between "1–2" and "3–10") returns **contact** (`no_band`), the Q-25 fallback. Each such gap is listed under Q-29.

  When bands overlap, as in Malaysia "2–6" and "6–10", the existing rule applies: the highest min wins. So 6 kg → "6–10".
- [ ] **AC-06** **Weight pipeline**, in integer grams, with no intermediate whole-kg rounding:
  1. volumetric = L × W × H / divisor;
  2. chargeable = max(actual, volumetric);
  3. round up to the card's `weight_rounding_kg` if set;
  4. if below `min_weight_kg`, return contact (`below_minimum`);
  5. otherwise, raise to `min_chargeable_kg` if set;
  6. pick the band.

  Rounding is set **only** where the source states it, or where a card's flat per-step table implies it (0,5 kg steps for EU, UK, US economy and Canada; 1 kg for US express and Japan). This is recorded per card in the inventory.
- [ ] **AC-07** **Quote modes.**
  - A `contact` column (per-item, per-set or conditional prices such as "Check giá trị hàng…", "600.000/bộ", "800k/sp") always quotes "Liên hệ" and shows its `price_label` in the table.
  - A `quotable` column uses per-kg or flat bands.
  - No quantity input.
- [ ] **AC-08** `pnpm price:examples` prints these cases, and each matches by hand:

  | Case | Expected |
  |---|---|
  | KR dry ĐN+, 7,3 kg + 50 × 40 × 30 cm | vol 12 kg → 12 kg × 79.000 = **948.000 đ** |
  | SG air HCM, 1 kg + 41 × 25 × 10 cm | vol 2,05 → 2,5 kg → **contact** (gap between "1–2" and "3–10") |
  | MY air HN/ĐN, 1 kg + 41 × 25 × 10 cm | 2,05 → 2,5 kg → "2–6" × 163.000 = **407.500 đ** |
  | EU zone 3, 2,3 kg | 2,5 kg, flat **1.423.208 đ** |
  | TH road, 30 kg | billing minimum 50 kg × 65.000 = **3.250.000 đ** |
  | SG → VN air, hàng thường, 1,2 kg | billing minimum 3 kg × 12 US$ = **36,00 US$** |
  | KR → VN air, Miền Nam, 10 kg, 60 × 50 × 40 cm | /4500 = 26,667 → 27 kg × 12.200 ₩ = **329.400 ₩** |
  | KR → VN sea, 10 kg | billing minimum 20 kg × 5.300 ₩ = **106.000 ₩** |
  | US express, 3,2 kg | 4 kg, flat **3.086.300 đ** |
  | KR → VN hand-carry "Hồ sơ, giấy tờ" | **contact** (contact column) |

**Public route pages**

- [ ] **AC-09** Given the active routes, the URLs below return 200 in VI and EN, each with exactly one H1, metadata, canonical, reciprocal hreflang, `BreadcrumbList` + `Service` JSON-LD and a Zalo CTA.

  Updated routes:
  - sg, my, kr, tw, jp, th, us, sg-vn

  New routes:

  | Key | VI | EN |
  |---|---|---|
  | `ph` | `/gui-hang-di-philippines/` | `/en/shipping-to-philippines/` |
  | `ca` | `/gui-hang-di-canada/` | `/en/shipping-to-canada/` |
  | `gb` | `/gui-hang-di-anh/` | `/en/shipping-to-uk/` |
  | `au` | `/gui-hang-di-uc/` | `/en/shipping-to-australia/` |
  | `eu` | `/gui-hang-di-chau-au/` | `/en/shipping-to-europe/` |
  | `tw-vn` | `/gui-hang-tu-dai-loan-ve-viet-nam/` | `/en/taiwan-to-vietnam-shipping/` |
  | `kr-vn` | `/gui-hang-tu-han-quoc-ve-viet-nam/` | `/en/korea-to-vietnam-shipping/` |
  | `jp-vn` | `/gui-hang-tu-nhat-ban-ve-viet-nam/` | `/en/japan-to-vietnam-shipping/` |

  Indonesia has no route row. `my-vn` and `th-vn` stay inactive.
- [ ] **AC-10** Given a route with several cards (e.g. `/gui-hang-di-han-quoc/`), when the page loads:
  - service tabs and place chips show, and the first card (sort order) is selected;
  - choosing a tab or chip shows only that card's table, facts, surcharges and policies;
  - with JS disabled, every card is visible, stacked, with its tab and place as a heading;
  - tabs and chips are keyboard-operable (Radix Tabs and radio-group semantics), each ≥ 44 px, with no `uppercase`;
  - a card that has no active band is not shown.
- [ ] **AC-11** Given a card with active price columns (EU 7 zones, US economy CA / outside CA, MY sea 2 cargo classes):
  - the table shows one price column per column, with its label and description (e.g. the EU zone countries);
  - below 768 px, a column picker shows one column at a time.

  Given a card with **one** band and several columns (SG → VN air, KR → VN hand-carry, JP → VN hand-carry), the table is transposed: one row per column (item → price).
- [ ] **AC-12** Price and weight text:
  - `weight_label` / `price_label` for the page locale are shown when set. Otherwise numbers are formatted per locale.
  - Money uses `formatMoney(minor, currency, locale)`:
    - VND: VI "75.000 đ", EN "75,000 VND" (existing `formatVnd` output);
    - USD and SGD: 2 decimals via `Intl.NumberFormat(locale, { style: 'currency', currency })`;
    - KRW: 0 decimals.
  - Flat bands read "/đơn" or "total", per-kg bands read "/kg", contact reads "Liên hệ".
- [ ] **AC-13** The facts line shows only the fields that are set (rule 1): transit, schedule, rounding, acceptance minimum, billing minimum, divisor. Examples of empty fields:
  - Japan: no schedule;
  - Philippines, UK, Canada and US economy: no transit;
  - SG sea: no transit (E1-05).
- [ ] **AC-14** Surcharges:
  - each linked list renders as a titled table (item · price · note) with its footnote, inside "Phụ thu theo mặt hàng" (`item`) or "Phí khác" (`fee`), collapsible;
  - the SG customs list (C1) is on both SG air cards;
  - the EU "đầu Hà Nội" (C2) and "đầu SGN" (C3) lists are on the EU card;
  - items render verbatim, "hàng fake" rows included (owner decision 4).
- [ ] **AC-15** Policies:
  - the policy sections render in "Bảo hiểm & khiếu nại" with their titles, in order;
  - the EU sections are the retail rewrite (second person, no "quý đối tác"), with no carrier names (DHL, DPD) until Q-08 allows them;
  - the SG → VN partner warehouse address and contact name are not published.
- [ ] **AC-16** Route summaries are derived on read from active cards with at least one active band:
  - **Hero and menu transit:** the min of `transit_days_min` and the max of `transit_days_max`; nothing if none.
  - **Methods:** the set of card methods.
  - **"Từ X/kg"** (hero, mega menu, hubs): take the currency of the first card (sort order) that has an eligible per-kg band, using the existing validity rule. Then show the lowest eligible per-kg band in that currency over all active cards and quotable columns. Otherwise nothing. The import sorts each route's VND cards first, except inbound routes whose main service is priced in a foreign currency (sg-vn, kr-vn).

  Expected results:

  | Route | "Từ" |
  |---|---|
  | Singapore | 94.000 đ |
  | Korea | 72.000 đ |
  | Malaysia | 26.000 đ |
  | SG → VN | 7,00 US$ |
  | KR → VN | 4.500 ₩ |
  | JP → VN | 210.000 đ |
- [ ] **AC-17** JSON-LD uses one Offer policy:
  - a route page emits `Service` + `Offer` / `UnitPriceSpecification` for its "Từ" price, in that price's currency (ISO code);
  - `price` is the major-unit decimal string ("7.00", "94000");
  - the existing visibility gates apply (shown, verified, public);
  - no Offer is emitted when there is no "Từ" price;
  - `areaServed`: the EU route lists the zone countries; others keep the country.
- [ ] **AC-18** S-03 visibility is unchanged:
  - unverified routes show "Liên hệ" unless `PREVIEW_UNVERIFIED`;
  - `prices_public = false` hides prices;
  - the import sets `prices_public = true` for `sg-vn`, and `db:confirm` verifies the routes listed under `rateCards`.

**Calculator and tracking**

- [ ] **AC-19** The route mini calculator and `/tinh-cuoc/`:
  - offer every active card of the route, using the same tab and chip as the price section (synced on the route page), plus a column select when the card has active columns;
  - take weight and optional L/W/H in cm;
  - show actual, volumetric and chargeable weight and the price in the card currency, with the note "Cân nặng quy đổi = Dài × Rộng × Cao (cm) ÷ {divisor}";
  - show "Liên hệ" plus the Zalo CTA for contact outcomes.

  The full calculator lists all 16 active routes.
- [ ] **AC-20** Tracking: the calculate-quote event (`use-calculate-quote-event.ts`):
  - sends `estimate_vnd` only when the currency is VND;
  - always sends `currency` and `estimate_amount` (major units);
  - is still deduplicated;
  - is still sent only after consent.

  `05-seo-and-tracking.md` and the tracking types are updated, and the consent matrix (ADR 0004) is re-run and recorded.

**Existing content, admin, publishing, budget**

- [ ] **AC-21** Conflicting copy is updated. The implementer lists, in the PR, every block and FAQ on the 8 existing routes that states a price, threshold, transit, schedule, method or rule now contradicted by the cards. Examples:
  - Taiwan "miễn phí giao trên 5 kg" (now 3 kg);
  - Korea "không tính phụ thu riêng lẻ";
  - Thailand "bay nhanh/bay chậm".

  The import's targeted content step then updates exactly those items, by block type and item index or FAQ key, in VI and EN. Unrelated editorial changes stay. A price in copy is replaced by a reference to the price section (rule 2).
- [ ] **AC-22** On `/admin/routes/[key]`:
  - the A-02 band editor groups bands by card (tab + place label, currency) and column;
  - staff can create, edit and delete bands, with the price in the card currency (decimals for USD and SGD), the `weight_label` / `price_label` per locale, and the column;
  - saves keep `requireSection('routes')`, set `routes.admin_edited_*` **and** `rate_cards.admin_edited_*`, call `updateTag(routeTag(key))` + `updateTag(MENU_TAG)`, and run the overlap warnings per card and column;
  - the route-facts form keeps only the flags (`is_active`, `is_verified`, `prices_public`, sort); transit and methods are derived (AC-16).
- [ ] **AC-23** Publishing:
  - `data/owner-confirmations.json` gains `rateCards` (routes + date + source) and the new routes and pages; `pnpm db:confirm` verifies and publishes them;
  - `data/seed/menus.json` adds the new outbound routes to "Gửi hàng đi" and the new inbound routes to "Nhận hàng về VN";
  - `shared/ui/flags` adds PH, CA, GB, AU and EU (SVG shapes, no text);
  - the sitemap lists every new published URL.
- [ ] **AC-24** The 8 new pages each have a drafted VI + EN intro and 3–5 FAQs.
  - They use only facts in `data/retail-price-list.md`.
  - Prices are not repeated in the text; it links to the price section.
  - Goods use the global prohibited-goods page.
- [ ] **AC-25** Budget:
  - `data/perf-budget.json` adds every new route page (VI + EN) and `/gui-hang-di-han-quoc/`;
  - `pnpm perf:report` passes the ADR 0006 JS budget with consent rejected;
  - the PR records Lighthouse mobile scores and LCP/CLS/INP for `/gui-hang-di-han-quoc/` and `/gui-hang-di-chau-au/` (DoD); any measurement not run is listed as outstanding.
- [ ] **AC-26** `pnpm check:redirects` passes; no legacy URL maps to the new routes.

**Context updates (same change set)**

- [ ] **AC-27**
  - `07-data-model.md`: schema, rules, deprecated route columns.
  - `03-information-architecture.md`: route registry (new routes, Thailand = road) and price-section layout.
  - `05-seo-and-tracking.md`: the Offer currency rule and the quote-event params.
  - `AGENTS.md`: rule 2 reads "`rate_cards`, `route_rates` and surcharge lists"; the §7 command rows for `db:import-rate-cards` and `price:cards`.
  - `11-open-questions.md`: Q-04, Q-05 and Q-25 updated; **Q-29** lists the open §E1 items and the band gaps found in AC-05.
  - `data/retail-price-list.md` §F records the 2026-10-26 decisions.
  - Roadmap A-02b.
  - `/adr rate-cards-and-currency`.

### Card inventory (the import must produce exactly this)

**Places:** ĐN+ = "Đà Nẵng, Huế, Quảng Bình, Quảng Trị". Values and texts are in `data/retail-price-list.md` (§A–C).

**Rules column:** R = rounding step, D = divisor, Amin = acceptance minimum, Bmin = billing minimum. An empty R means no rounding.

| # | Route | Card (tab · place) | Method | Cur. | Columns (mode) | Rules | Source and notes |
|---|---|---|---|---|---|---|---|
| 1 | sg | Bay · TP.HCM | air | VND | — | R 0,5 · D 5000 | A1.1; lists: SG tab list (HCM), C1 |
| 2 | sg | Bay · Hà Nội, Đà Nẵng | air | VND | — | R 0,5 · D 5000 | A1.2; lists: SG tab list (HN), C1 |
| 3 | sg | Tàu · Việt Nam | sea | SGD | — | R 0,5 · D 5000 | A1.3; bands from 21 kg (below = gap); fee list: 10 SGD/đơn (21–100 kg), CBM oversize |
| 4 | my | Bay · Hà Nội, Đà Nẵng | air | VND | — | R 0,5 · D 5000 | A2.1 |
| 5 | my | Bay · TP.HCM | air | VND | — | R 0,5 · D 5000 | A2.2; schedule includes cut-off |
| 6 | my | Tàu · TP.HCM | sea | VND | Quần áo, thực phẩm / Mỹ phẩm (quotable) | R 0,5 · D 5000 · Bmin 50 | A2.3; fee list: CBM (USD text), Sarawak/Sabah |
| 7–10 | kr | Bay · hàng khô · ĐN+ / HN bay chậm / HN bay nhanh / HCM | air | VND | — | R 0,5 · D 5000 | A3.1; bands from 3 kg (below = gap) |
| 11–13 | kr | Bay · đông lạnh · ĐN+ / HN / HCM | air | VND | — | R 0,5 · D 5000 | A3.2; fee: cấp đông 130.000/kiện; no promo (hidden) |
| 14–16 | tw | Bay · hàng khô · ĐN+ / HCM / HN | air | VND | — | R 0,5 · D 5000 | A4.1; one open band each (93.000 / 100.000 / 110.000) |
| 17–19 | tw | Bay · đông lạnh · ĐN+ / HN / HCM | air | VND | — | R 0,5 · D 5000 | A4.2; per-origin policies |
| 20 | jp | Bay · Việt Nam | air | VND | — | R 1 · D 5000 | A5; per-parcel note; no schedule |
| 21 | ph | Bay · Hà Nội, TP.HCM | air | VND | — | R 0,5 · D 5000 | A6 |
| 22 | th | Xe · TP.HCM | road | VND | — | D 5000 · Bmin 50 | A7; no stated rounding |
| 23 | us | Bay nhanh · Việt Nam | air_express | VND | — | R 1 · D 5000 | A8.1; import-tax fee list |
| 24 | us | Bay chậm · Huế | air_economy | VND | California / Ngoài California (quotable) | R 0,5 (implied) · D 5000 | A8.2; origin Huế only |
| 25 | ca | Bay · Việt Nam | air | VND | — | R 0,5 · D 5000 | A9; province groups in policy text |
| 26 | gb | Bay · TP.HCM | air | VND | — | R 0,5 (implied) · D 5000 | A10 |
| 27 | au | Bay · TP.HCM | air | VND | — | R 0,5 · D 5000 | A11 |
| 28 | eu | Bay · Việt Nam | air | VND | Zone 1–7 + countries (quotable) | R 0,5 (implied) · D 5000 | A12; zone 7 1,0–10,0 kg = contact bands; lists C2, C3, oversize fees |
| 29 | sg-vn | Bay · Về kho Việt Nam | air | USD | Hàng thường / Mỹ phẩm, TPCN / Nước hoa giá rẻ (quotable); Hàng giá trị cao (contact) | R 0,5 · D 5000 · Bmin 3 | B1.1 |
| 30 | sg-vn | Tàu · hàng thường · TP.HCM | sea | USD | — | D 5000 | B1.2; no partner address |
| 31–32 | sg-vn | Tàu · hàng tạp · Về TP.HCM / Về Hà Nội | sea | USD | — | R 0,5 · D 5000 · Bmin 20 | B1.3 |
| 33 | tw-vn | Bay · Việt Nam | air | VND | — | R 0,5 · D 5000 | B2; bands from 3 kg |
| 34–35 | kr-vn | Bay · Miền Bắc / Miền Nam | air | KRW | — | R 0,5 · D 4500 · Amin 3 | B3.1 |
| 36 | kr-vn | Tàu · Bắc và Nam | sea | KRW | — | R 0,5 · D 4500 · Bmin 20 | B3.1; transit 2–3 weeks as text |
| 37 | kr-vn | Xách tay · Việt Nam | hand_carry | VND | 4 per-kg items (quotable); 8 per-item/set/check items (contact) | — | B3.2 |
| 38 | jp-vn | Xách tay · Về kho Hà Nội | hand_carry | VND | 3 item types (quotable) | — | B4 |

### Scope

**In scope:**
- migration `0009`, schema, relations and backfill;
- the seed writer update;
- `rate-cards.json` and the import script (dry run, diff, backup, skip, force);
- `price:cards`;
- the engine pipeline, quote modes and currency; `price:examples`;
- the route-page price section, calculator and tracking params;
- derived summaries, JSON-LD and `formatMoney`;
- 8 new routes with pages, menus, flags, drafted copy and FAQs;
- the targeted update of conflicting copy;
- owner confirmations;
- the A-02 band editor adapted to cards;
- context docs and the ADR.

**Out of scope (part 2 or later):**
- creating, deleting and reordering cards; editing columns, card facts, surcharge lists and items, and policies in the admin;
- dropping the deprecated `routes` columns;
- currency conversion;
- surcharges and insurance in the calculator total;
- Indonesia; `my-vn`, `th-vn`;
- OG images;
- answering Q-29;
- automated tests (ADR 0004).

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | db | `db/enums.ts`, `db/migrations/0009_*.sql` (+ meta), `db/schema.ts` |
| app | pricing infra | `modules/pricing/infrastructure/schema.ts` (+ rate-card, column, surcharge tables and relations), `route-rates.ts`, `queries.ts`, `quote-mappers.ts`, `admin-rate-queries.ts`, `rate-band-writes.ts`, new `rate-card-queries.ts` |
| app | pricing domain | `quote.ts`, `weight.ts`, `from-price.ts`, `band-rules.ts`, `band-warnings.ts`, `admin-rate-band.ts`, new `rate-card.ts`, `money.ts`, `route-summary.ts` |
| app | pricing app | `application/schemas.ts`, `save-rate-band.ts`, `delete-rate-band.ts`, `actions.ts` |
| app | pricing ui | `rate-table.tsx`, `rate-rows.tsx`, `rate-band-text.ts`, `route-pricing.ts`, `pricing-rules.tsx`, `route-calculator.tsx`, `calculator/*`, `quote-output.tsx`, `quote-input.ts`, `calculator-url.ts`, `hooks/*`, `route-card*.tsx`, `route-hero.tsx`, `route-price-chip.tsx`, `hub-*.tsx`, new `rate-card-section.tsx`, `rate-card-switcher.tsx` (client), `surcharge-list.tsx`, `card-policies.tsx`; `ui/admin/*` |
| app | routes | `modules/routes/infrastructure/schema.ts`, `queries.ts`, `admin-queries.ts`, `admin-writes.ts`, `domain/route-detail.ts`, `domain/admin-route.ts`, `domain/nav-route.ts`, `actions.ts`, `ui/admin/*` |
| app | tracking | `modules/tracking/*` (event types), `modules/pricing/ui/hooks/use-calculate-quote-event.ts` |
| app | seo | `modules/seo/domain/route-json-ld.ts` |
| app | content | `modules/content/ui/route/route-page.tsx` (price slot), `scripts/seed/route-content-schema.ts` |
| app | shared | `shared/lib/format.ts` (`formatMoney`), `shared/ui/flags/flag-shapes.tsx` |
| app | seed/scripts | `data/seed/rate-cards.json` (new), `routes.legacy.json`, `pages.json`, `menus.json`, `route-content.json`, `data/owner-confirmations.json`, `scripts/import-rate-cards.ts` (new), `scripts/print-rate-cards.ts` (new), `scripts/seed/*`, `scripts/confirm-facts.ts`, `scripts/price-examples*`, `package.json`, `.gitignore` (`.backups/`), `data/perf-budget.json` |
| app | i18n | `messages/vi.json`, `messages/en.json` |
| context | docs | `docs/context/07-data-model.md`, `03-information-architecture.md`, `05-seo-and-tracking.md`, `11-open-questions.md`, `10-roadmap.md`, `AGENTS.md`, `data/retail-price-list.md`, `docs/adr/0007-rate-cards-and-currency.md` |

### Golden-rule checks

- **Rules 1–2:** values come only from the owner-confirmed import (decision 2, `owner-confirmations.json` `rateCards`). There are no prices in copy, components or messages; conflicting copy is replaced (AC-21). Rule 2's wording is widened (AC-27).
- **Rule 3:** flags are SVG shapes.
- **Rule 4:** H1, metadata, canonical, hreflang, JSON-LD, breadcrumbs and a Zalo CTA on every new page.
- **Rule 6:** queries and scripts are server-only; the island gets plain data.
- **Rule 7:** `requireSection('routes')` (A-02 pattern).
- **Rule 8:** one small island; all cards are server-rendered; the budget is measured (AC-25).
- **Rule 10:**
  - Radix Tabs and radio-group semantics, visible focus, 44 px targets;
  - `<th scope>`;
  - Accordion/Collapsible.
- **Rule 11:** no `uppercase`.
- **Rule 12:** "Liên hệ" CTAs go through `/go/zalo`.
- **Rule 14:**
  - the partner address and contact name stay unpublished;
  - the quote event remains consent-gated (AC-20).
- **§10, accepted-goods lists:** none per country. The verbatim "hàng fake" rows are an explicit owner decision (2026-10-26), recorded in §F and in the ADR.

### Dependencies & Risks

- **Depends on:**
  - A-02 (merged, awaiting `/mark-implemented`);
  - S-03, S-04, S-07, S-13 (tracking);
  - F-04;
  - the owner go-ahead to run `0009` and the import on Supabase.

  There is no production deployment yet (L-02), so the rename ships with all writers in one PR.
- **Questions:**
  - **Q-29** (new): §E1 items and band gaps. Values are imported literally; gaps give "Liên hệ".
  - **Q-25:** rounding is per card from the source.
  - **Q-04, Q-05:** updated.
  - **Q-08:** carrier names stay hidden.
  - **Q-09:** answered per card.
- **Risks:**
  - **R1, counterfeit goods.** The "hàng fake" rows are published verbatim (owner decision). Recorded in §F and in the ADR; the admin can deactivate items (part 2).
  - **R2, rename churn.** About 25 files plus tracking (lesson `s08-lead-form`). The Affected Areas list is the checklist; `tsc` catches the rest.
  - **R3, page size.** The EU table (7 × 43) is below the fold and uses the mobile column picker. Check LCP.
  - **R4, destructive import.** Diff, backup, admin-edit skip and `--force` (AC-02).
  - **R5, EN volume.** About 150 surcharge items plus policy lines. The implementer drafts EN; `12-glossary.md` governs terms.

### Manual Verification Plan

- **Seed:** `pnpm db:local` → migrate `0009` → seed → check pre-import parity (AC-01) → `db:import-rate-cards` (dry run, then `--replace`) → `db:confirm`.
- **Steps:**
  1. **Parity before import:** `/gui-hang-di-singapore/` shows the same legacy prices as on `main`.
  2. **Dry run:** the diff lists the 16 routes, with the SG band 21–100 changing 68.000 → 94.000 (HCM card). After `--replace`, a second `--replace` reports no changes. Edit a band in the admin, then run `--replace`: the route is skipped. Run `--replace --force`: it is replaced, and the backup file exists.
  3. **`pnpm price:cards`:** compare all 38 cards with `data/retail-price-list.md` and record ✓ per card in the PR.
  4. **`pnpm price:examples`:** the ten AC-08 cases match.
  5. **`/gui-hang-di-han-quoc/`** at 360, 768 and 1280 px:
     - tabs "Bay · hàng khô" and "Bay · đông lạnh";
     - chips ĐN+, HN bay chậm, HN bay nhanh, HCM;
     - switching changes the table, facts, surcharges and policies;
     - keyboard: Tab, arrows, Space/Enter;
     - JS off: all 7 cards stacked;
     - reduced motion: no animation, or opacity only.
  6. **`/gui-hang-di-chau-au/`:**
     - 7 zone columns at 1280 px, the column picker at 360 px;
     - zone 7 1,0–10,0 kg shows "Liên hệ";
     - C2 and C3 render;
     - no "quý đối tác", no DHL/DPD.
  7. **`/gui-hang-tu-singapore-ve-viet-nam/`:**
     - "12,00 US$" (VI) and "$12.00" (EN);
     - the air card is transposed, with "Hàng giá trị cao: Liên hệ";
     - no partner address.
  8. **`/gui-hang-di-my/`:** two tabs; the economy chip reads "Huế"; the CA / outside CA columns render.
  9. **Calculator completeness:** for each of the 16 routes on `/tinh-cuoc/`, the card options equal the price-section tabs and chips, and the column options equal the active columns.
  10. **UI quote, once per mode:**
      - per-kg (KR dry ĐN+ 7,3 kg + dims → 948.000 đ);
      - flat step (EU zone 3 2,3 kg);
      - billing minimum (TH 30 kg);
      - foreign currency (KR → VN Miền Nam);
      - gap → contact (SG HCM 2,5 kg);
      - contact column (KR → VN hand-carry "Hồ sơ").
  11. **Hero, menu, hubs:** the "Từ" values in AC-16.
  12. **Tracking:** with consent accepted, one KR → VN quote sends `currency: KRW`, `estimate_amount`, no `estimate_vnd`; a VND quote sends all three. Consent rejected: nothing is sent. Record the consent matrix.
  13. **Admin `/admin/routes/kr`:** bands grouped by card. Edit the ĐN+ dry ≥ 3 kg price; the public page and the menu "Từ" update after save.
  14. **New URLs (VI + EN):** 1 H1, canonical, reciprocal hreflang, JSON-LD valid (schema validator; Offer currency matches).
  15. **Conflicting copy:** the PR lists the items found and updated (AC-21); Taiwan no longer says "trên 5 kg".
  16. **axe DevTools** at 360 and 1280 px on `/gui-hang-di-han-quoc/`, `/gui-hang-di-chau-au/` and `/tinh-cuoc/`: zero serious or critical issues.
  17. **Lighthouse mobile** (consent rejected) on `/gui-hang-di-han-quoc/` and `/gui-hang-di-chau-au/`: record the scores and vitals (AC-25).
- **Validation commands:** `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `build`, `i18n:check`, `check:redirects`, `perf:report`. No automated tests (ADR 0004).

### Implementation Hints

- One cached query, `getRouteRateCards(key, locale)` (`"use cache"` + `cacheTag(routeTag(key))`), returns cards → columns → bands → lists → items → policies. The from-price and summary query stays tagged `menu`.
- The switcher island receives `{cardKey, tabKey, tabLabel, placeLabel}[]`. Panels are server children with `data-card-key`, toggled with `hidden`. Use shadcn `Tabs` for the tab row and a radio-group for the chips, synced with the mini calculator through a tiny shared store (the ADR 0006 budget allows `useSyncExternalStore`, as consent does).
- `formatVnd` stays as a wrapper over `formatMoney`.
- Build `rate-cards.json` with a context-side helper:
  - EU and the cell tabs are read from the xlsx;
  - the image tabs come from the transcriptions in `data/retail-price-list.md`;
  - commit only the JSON to the app.
- `route-content-schema.ts`: the 2-letter keys (`eu`, `gb`) already pass; check the `-vn` keys.
- `messages`:
  - method labels `road` ("Xe" / "Road") and `hand_carry` ("Xách tay" / "Hand-carry");
  - price-section strings "Gửi từ", "Nhận tại", "Phụ thu theo mặt hàng", "Phí khác", "Bảo hiểm & khiếu nại", "Tối thiểu {kg} kg", "Tính tối thiểu {kg} kg", "Làm tròn {step} kg".
- Run `lint:fix` only on changed files (lesson `s08-lead-form`).

### Related

- `data/retail-price-list.md` (source, §E1, §F)
- `docs/context/10-roadmap.md` A-02, A-02b, S-03, S-04, S-07, S-13
- `specs/feature-a02-routes-rates-editor.md`, `feature-s03-price-engine.md`, `feature-s04-route-page-template.md`, `feature-s04b-route-page-content.md`
- `specs/feature-a02b-rate-cards-admin.md` (part 2)
- ADR 0001 (Decision 6), 0004, 0005, 0006; `lessons/2026-10-23-s08-lead-form.md`
- Codex review record: `/tmp/43l-codex-feature-bug-a02b-rate-cards-r1.md`, `-verdicts.md`, `-r2.md` (2026-10-26)
