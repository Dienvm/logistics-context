---
title: Show the retail price list as per-route rate cards
type: feature
status: draft
owner_repo: both
roadmap: A-02b
priority: must-have
blocked_by_questions: [Q-04, Q-05, Q-08, Q-09, Q-25]
updated: 2026-10-26
---

## Feature: Show the retail price list as per-route rate cards

### Problem Statement

Sales sent the full retail price list (`data/TỔNG HỢP GIÁ BÁN LẺ.xlsx`, 27 tabs), transcribed and analysed in `data/retail-price-list.md`.

The site cannot show it today. One route has several prices that depend on:

- the **origin** (Đà Nẵng·Huế·Quảng Bình·Quảng Trị / Hà Nội / TP.HCM);
- the **method** (air, sea, road, hand-carry);
- the **service or cargo class** (dry, frozen, express, economy, regular, mixed);
- the **destination zone** (7 EU zones, California or not);
- the **currency** (VND, SGD, USD, KRW).

Each price also comes with its own transit time, schedule, rounding step, minimum weight, domestic delivery fee, item surcharges and insurance/claims rules.

The schema has none of these dimensions. `route_rates` is VND-only bands per `(route, method)`.

The live prices are the 2026-10-22 legacy values and differ sharply from the retail list. For example, Singapore 21–100 kg shows 68.000 đ/kg while the list says 94.000 (HCM) or 125.000 (HN/ĐN). Thailand is listed as air but is actually a road service.

Eight destinations and directions are missing: Philippines, Canada, UK, Australia, EU, and Taiwan, Korea and Japan → VN.

Roadmap: **A-02b** (new row, Phase 2, after A-02). This spec is part 1 of 2: data, import, public display and calculator. Part 2 (`feature-a02b-rate-cards-admin.md`) adds full admin editing of cards, columns, surcharges and policies.

### Owner decisions (2026-10-25/26, recorded in `data/retail-price-list.md` §F)

1. **Publish scope:** every route in the workbook **except Indonesia** (tab "CHƯA DÙNG").
2. **Values:** taken **as in the Excel**, including the 31 open checklist items in §E1. Wrong values are corrected later in the admin. Hidden Excel rows, columns and cells are not part of the retail list.
3. **Currency:** foreign-currency prices stay in their currency (SGD, USD, KRW). No conversion.
4. **Surcharges and policies:** full item-surcharge tables and insurance/claims/delivery rules are shown per route. The EU text written for partners ("quý đối tác") is rewritten for retail customers.
5. **Pages:** one page per country per direction (current URL logic).
6. **Layout:** inside a page, method/service tabs plus origin chips.
7. **Chargeable weight:** max(actual, L × W × H cm / divisor), with divisor 5000 except Korea → VN (4500).

### Proposed Solution

**Rate card ("bảng giá dịch vụ").** A route has one or more rate cards. A card is one combination of method × service × origin (outbound) or destination (inbound). Each card has:

- a currency;
- its weight bands (`route_rates`);
- optional **price columns** (EU zones, California / outside California, cargo classes such as "Quần áo, thực phẩm" / "Mỹ phẩm", or hand-carry item types);
- its own transit days, schedule text, rounding step, volumetric divisor and minimum chargeable weight;
- its own policy sections (delivery, how the price is calculated, insurance, claims, rules);
- links to one or more **surcharge lists** (item → price text → note).

**Visitor view.** The route page's price section ("Bảng giá") has:

- a row of **service tabs**, for example "Bay · hàng khô", "Bay · đông lạnh", "Tàu", "Xe", "Xách tay", "Bay nhanh", "Bay chậm";
- inside a tab, **place chips**. Outbound chips are labelled "Gửi từ" (e.g. "Đà Nẵng, Huế, Quảng Bình, Quảng Trị" · "Hà Nội" · "TP.HCM"). Inbound chips are labelled "Nhận tại" (e.g. "Miền Bắc" · "Miền Nam");
- for the selected card:
  - the band table (columns become table columns; on mobile a column picker);
  - a facts line (transit, schedule, rounding, minimum);
  - "Phụ thu theo mặt hàng" and "Phí khác" (collapsible);
  - "Bảo hiểm & khiếu nại" (collapsible).

Every card is in the server HTML. A small client island only switches which card is visible.

**Calculator.** The route mini calculator and `/tinh-cuoc/`:

- choose the card (tab + chip) and the column when the card has columns;
- take weight and optional L × W × H (cm);
- quote in the card's currency.

The hero, mega menu and hub show "Từ X đ/kg" from the lowest VND per-kg price among the route's cards.

### Acceptance Criteria

**Data model and import**

- [ ] **AC-01** Given migration `0009`, when it runs on the current DB:
  - it creates the enum `currency_code` (`VND`, `USD`, `SGD`, `KRW`);
  - it adds `road` and `hand_carry` to `shipping_method`;
  - it creates the tables `rate_cards`, `rate_card_translations`, `rate_card_columns`, `surcharge_lists`, `surcharge_list_translations`, `surcharge_items` and `rate_card_surcharge_lists`, all with RLS on and no policies;
  - it changes `route_rates` as follows:
    - add `rate_card_id` (FK, cascade) and `column_id` (nullable FK);
    - rename `price_per_kg_vnd` → `price_per_kg_minor` and `flat_price_vnd` → `flat_price_minor`. Minor units of the card currency: đồng, cents, won;
    - add nullable `weight_label` and `price_label`, per locale (VI/EN);
  - it backfills one card per existing `(route, method)` and points every existing band at it before `rate_card_id` becomes NOT NULL.
  - `pnpm db:migrate` succeeds on a copy of the current data, and the public pages render the same prices as before the import.
- [ ] **AC-02** Given `43logistics.vn/data/seed/rate-cards.json` (built from `data/retail-price-list.md`), when `pnpm db:import-rate-cards --replace` runs:
  - for every route in the file, it replaces that route's cards, bands, columns and surcharge-list links in one transaction;
  - it prints a per-route summary: cards, bands and lists, old → new;
  - it never touches routes that are not in the file;
  - without `--replace`, it only prints the summary (dry run).
  - The card inventory in the "Card inventory" section below is fully present after the run.
- [ ] **AC-03** Given the JSON file, when it is validated (Zod, in the import script), it fails with a readable message if:
  - a band's price kind is ambiguous (both per-kg and flat);
  - bands overlap inside the same card and column;
  - a column key is unknown;
  - a currency is missing;
  - a VI or EN label is missing.
- [ ] **AC-04** Given the imported data, then:
  - every price in the inventory equals the Excel value, including the §E1 items as written (owner decision 2);
  - hidden Excel cells are absent: the Korea frozen Đà Nẵng promo, Taiwan dry weight bands, Japan schedule, Indonesia.
  - A reviewer checks this with a script that prints every card as a table next to `data/retail-price-list.md`.

**Public route pages**

- [ ] **AC-05** Given the active routes, the URLs below return 200 in VI and EN, each with exactly one H1, metadata, canonical, reciprocal hreflang, `BreadcrumbList` JSON-LD and a Zalo CTA.

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

  - Indonesia has no route row.
  - `my-vn` and `th-vn` stay inactive.
- [ ] **AC-06** Given a route with several cards (e.g. `/gui-hang-di-han-quoc/`), when the page loads, then:
  - the price section shows service tabs and place chips;
  - the first card is selected;
  - choosing a tab or chip shows only that card's table, facts, surcharges and policies;
  - with JavaScript disabled, every card is visible stacked with its tab and chip as a heading;
  - the tab list and chips are keyboard-operable (arrow keys in the tab list, Radix semantics kept);
  - each chip is ≥ 44 px.
- [ ] **AC-07** Given a card with price columns, the band table shows one price column per column with the column label, plus its description (e.g. EU zone countries). This covers:
  - EU: 7 zones;
  - US economy: California / outside California;
  - MY sea: clothes and food / cosmetics.

  Below 768 px, a column picker shows one column at a time as cards.
- [ ] **AC-08** Given a card with a single open-ended band and several columns (SG → VN air, KR → VN hand-carry, JP → VN hand-carry), the table is transposed: one row per column (item → price).
- [ ] **AC-09** Given a band with a `weight_label` or `price_label` for the page locale, that label is shown instead of the numeric text. This covers "1–2 kg", "Dưới 5 kg", "Trên 45 kg", "MIN 600.000", "Check giá trị hàng…".

  Otherwise:
  - the numbers are formatted per locale;
  - VND uses `Intl.NumberFormat('vi-VN')` + " đ";
  - foreign currency uses `Intl.NumberFormat(locale, { style: 'currency', currency })`;
  - flat bands read "… /đơn" or "… total";
  - per-kg bands read "… /kg";
  - contact bands read "Liên hệ".
- [ ] **AC-10** Given a card's facts, the facts line shows only the fields that are set: transit, schedule, rounding step, minimum chargeable weight, divisor. Unset fields render nothing (rule 1).

  Examples:
  - Japan has no schedule (hidden row);
  - Philippines, UK, Canada and US economy have no transit.
- [ ] **AC-11** Given a card linked to surcharge lists:
  - each list renders as a titled table (item · price · note) with its footnote, inside a collapsible "Phụ thu theo mặt hàng" or "Phí khác";
  - the Singapore customs list appears on both Singapore air cards;
  - the EU "đầu Hà Nội" and "đầu SGN" lists appear on the EU card.
- [ ] **AC-12** Given a card's policy sections, they render in a collapsible "Bảo hiểm & khiếu nại" with the section titles. The EU sections are the retail rewrite: second person, no "quý đối tác", no carrier names unless Q-08 allows them. The partner's warehouse address and contact name from the SG → VN image are not published.
- [ ] **AC-13** Given the hero, the mega menu and the outbound/inbound hub cards, then "Từ X đ/kg" uses the lowest eligible VND per-kg band over the route's active cards.
  - A route with no VND per-kg band shows the lowest per-kg price in its first card's currency (e.g. "Từ 7 US$/kg"), or nothing if none.
  - Transit in the hero and menu comes from `routes.transit_days_*`. The import sets these to the fastest card's values.
- [ ] **AC-14** Given JSON-LD on a route page:
  - `Offer` / `UnitPriceSpecification` is emitted only for the VND from-price (unchanged rule, `05-seo-and-tracking.md`);
  - no `Offer` uses a hard-coded currency other than the band's;
  - a route whose from-price is foreign-currency emits `priceCurrency` with that ISO code.

**Calculator and price engine**

- [ ] **AC-15** Given the engine (`modules/pricing/domain/quote.ts`):
  - a quote takes `cardId` (+ `columnId` when the card has columns), weight and optional dimensions;
  - bands are filtered by card and column instead of method;
  - chargeable weight = max(actual, ⌈L × W × H / card divisor⌉), rounded up to the card's rounding step, then raised to the card's `min_chargeable_kg` when set;
  - the result carries the card currency.
  - `pnpm price:examples` prints these cases and they match by hand:
    - KR dry ĐN 7,3 kg + 50 × 40 × 30 cm → 12 kg × 79.000 = 948.000 đ;
    - EU zone 3 2,3 kg → 2,5 kg flat 1.423.208 đ;
    - TH road 30 kg → minimum 50 kg × 65.000 = 3.250.000 đ;
    - SG → VN air hàng thường 1,2 kg → minimum 3 kg × 12 US$ = 36,00 US$;
    - KR → VN air Miền Nam 10 kg, 60 × 50 × 40 cm → /4500 → 26,67 → 27 kg × 12.200 ₩ = 329.400 ₩;
    - US express 3,2 kg → 4 kg flat 3.086.300 đ.
- [ ] **AC-16** Given the route mini calculator and `/tinh-cuoc/`, then:
  - the visitor picks the route (full calculator), the service and place (the same tab and chip as the price section, synced on the route page), the column when needed, weight and optional L/W/H in cm;
  - the result shows actual, volumetric and chargeable weight and the price in the card currency;
  - the volumetric note reads "Cân nặng quy đổi = Dài × Rộng × Cao (cm) ÷ {divisor}";
  - a weight outside the bands or in a contact band shows "Liên hệ" plus the Zalo CTA.
- [ ] **AC-17** Given the S-03 visibility rules, unverified routes still show "Liên hệ" (unless `PREVIEW_UNVERIFIED`), and `prices_public = false` still hides prices. The import sets `prices_public = true` for `sg-vn` (owner decision 1).

**Admin (minimum to keep A-02 working)**

- [ ] **AC-18** Given `/admin/routes/[key]`, the existing band editor groups bands by rate card (card label, currency) and column. Staff can still create, edit and delete bands, now with:
  - the price in the card currency, with decimals for USD/SGD;
  - `weight_label` and `price_label` VI/EN.

  Saves still call `updateTag('route:{key}')` + `updateTag('menu')` and keep the A-02 rules: `requireSection('routes')`, `admin_edited_*`, overlap warnings, now per card and column.

  Creating or deleting cards, columns, surcharge lists and policies is part 2.

**Publishing, content and budget**

- [ ] **AC-19** Given `data/owner-confirmations.json`, then:
  - the new routes and pages are listed;
  - `pnpm db:confirm` verifies and publishes them;
  - `sg-vn` content is updated;
  - the sitemap lists every new published URL;
  - `data/menus.json` adds the new outbound routes to "Gửi hàng đi" and the new inbound routes to "Nhận hàng về VN";
  - `shared/ui/flags` has PH, CA, GB, AU and EU flags (SVG shapes, no text).
- [ ] **AC-20** Given the new route pages, each has a short drafted VI + EN intro and 3–5 FAQs written from the rate card facts only (owner rule "ship UI now", S-04b pattern).
  - Goods use the global prohibited-goods page; no per-country accepted lists (AGENTS.md §10).
  - The text uses only facts present in `data/retail-price-list.md`.
- [ ] **AC-21** Given `data/perf-budget.json`, then:
  - `/gui-hang-di-han-quoc/` and `/gui-hang-di-chau-au/` (the largest card set) are added;
  - `pnpm perf:report` passes the ADR 0006 budget (≤ 50 KB gz app JS over baseline) with consent rejected;
  - the tab/chip island and the calculator change are the only new client JS.
- [ ] **AC-22** Given `pnpm check:redirects`, every row of `data/redirect-map.csv` still resolves in one hop. No legacy URL maps to the new routes (none exist).

**Context updates (same change set)**

- [ ] **AC-23**
  - `docs/context/07-data-model.md` documents the new tables, columns and enums, and the rate-card rules.
  - `docs/context/03-information-architecture.md` updates the route registry (new routes, Thailand = road) and the price-section layout.
  - `docs/context/05-seo-and-tracking.md` states the Offer currency rule.
  - `AGENTS.md` rule 2 reads "`routes`, `rate_cards`, `route_rates` and surcharge lists".
  - `docs/context/11-open-questions.md`:
    - Q-04, Q-05 and Q-25 are updated;
    - a new Q lists the §E1 items still open and points at `data/retail-price-list.md`.
  - The roadmap row A-02b exists.
  - An ADR records the rate-card model, the minor-unit currency and the import script: `/adr rate-cards-and-currency`.

### Card inventory (the import must produce exactly this)

Abbreviations:

- **Places:** ĐN+ = "Đà Nẵng, Huế, Quảng Bình, Quảng Trị"; HN; HCM; VN = all origins.
- **Rounding:** 0,5 kg unless stated. **Divisor:** 5000 unless stated.
- **Values:** all values and texts are in `data/retail-price-list.md` (§A–C). The section number is given per card.

| Route | Card (tab · chip) | Method | Cur. | Columns | Notes (§ in price list) |
|---|---|---|---|---|---|
| sg | Bay · TP.HCM | air | VND | — | A1.1; lists: SG tab list (HCM) + C1 customs |
| sg | Bay · Hà Nội, Đà Nẵng | air | VND | — | A1.2; lists: SG tab list (HN) + C1 (with the HN 700K note) |
| sg | Tàu · Việt Nam | sea | SGD | — | A1.3; bands start 21 kg; fees: 10 SGD/đơn for 21–100 kg, CBM oversize |
| my | Bay · Hà Nội, Đà Nẵng | air | VND | — | A2.1 |
| my | Bay · TP.HCM | air | VND | — | A2.2; schedule includes cut-off |
| my | Tàu · TP.HCM | sea | VND | Quần áo, thực phẩm / Mỹ phẩm | A2.3; min 50 kg; CBM fees in USD as fee text |
| kr | Bay · hàng khô · ĐN+ / HN bay chậm / HN bay nhanh / HCM | air | VND | — | A3.1, 4 cards |
| kr | Bay · đông lạnh · ĐN+ / HN / HCM | air | VND | — | A3.2, 3 cards; fee: cấp đông 130.000/kiện; no promo (hidden) |
| tw | Bay · hàng khô · ĐN+ / HCM / HN | air | VND | — | A4.1, 3 cards, one open band each (93.000 / 100.000 / 110.000) |
| tw | Bay · đông lạnh · ĐN+ / HN / HCM | air | VND | — | A4.2, 3 cards; per-origin policy text |
| jp | Bay · Việt Nam | air | VND | — | A5; rounding 1 kg; no schedule |
| ph | Bay · Hà Nội, TP.HCM | air | VND | — | A6 |
| th | Xe · TP.HCM | road | VND | — | A7; min 50 kg; route methods become `{road}` |
| us | Bay nhanh · Việt Nam | air_express | VND | — | A8.1; rounding 1 kg; import-tax fee text |
| us | Bay chậm · Việt Nam | air_economy | VND | California / Ngoài California | A8.2 |
| ca | Bay · Việt Nam | air | VND | — | A9; province groups in policy text |
| gb | Bay · TP.HCM | air | VND | — | A10 |
| au | Bay · TP.HCM | air | VND | — | A11 |
| eu | Bay · Việt Nam | air | VND | Zone 1–7 (+ countries) | A12; zone 7 1,0–10,0 kg = contact; lists C2 + C3 + oversize fees |
| sg-vn | Bay · Về kho Việt Nam | air | USD | Hàng thường / Mỹ phẩm, TPCN / Nước hoa giá rẻ | B1.1; min 3 kg; "giá trị cao: Liên hệ" note |
| sg-vn | Tàu · hàng thường · TP.HCM | sea | USD | — | B1.2 |
| sg-vn | Tàu · hàng tạp · Về TP.HCM / Về Hà Nội | sea | USD | — | B1.3, 2 cards; min 20 kg |
| tw-vn | Bay · Việt Nam | air | VND | — | B2 |
| kr-vn | Bay · Miền Bắc / Miền Nam | air | KRW | — | B3.1, 2 cards; min 3 kg; divisor 4500 |
| kr-vn | Tàu · Bắc và Nam | sea | KRW | — | B3.1; min 20 kg; transit 2–3 tuần |
| kr-vn | Xách tay · Việt Nam | hand_carry | VND | 12 item types | B3.2; text prices as `price_label` |
| jp-vn | Xách tay · Về kho Hà Nội | hand_carry | VND | 3 item types | B4 |

Band edges keep the sale's wording as `weight_label`. The numeric edges are made contiguous for the engine: each band starts one rounding step after the previous band's max. For example, "3–10 kg" after "1–2 kg" is stored as 2,5–10 with label "3–10 kg". Such interpretations are listed in the new open question.

### Scope

**In scope:**
- migration, Drizzle schema and enums;
- the `rate-cards.json` seed file and the import script;
- engine changes (card/column filter, minimum chargeable weight, currency) and `price:examples`;
- the route-page price section (tabs, chips, tables, facts, surcharges, policies);
- calculator changes;
- from-price, hero, menu and hub changes, and JSON-LD currency;
- 8 new route rows with pages, menus, flags, drafted copy and FAQs; owner confirmations;
- adapting the A-02 band editor to cards;
- context docs, ADR, roadmap row.

**Out of scope:**
- the part-2 admin: creating, deleting and reordering cards; editing columns, card facts, surcharge lists and policy sections;
- currency conversion;
- surcharges and insurance in the calculator total (they stay informational, `07` pricing rules);
- Indonesia;
- `my-vn` and `th-vn`;
- OG images;
- answering the §E1 checklist (the owner fixes values later in the admin);
- automated tests (ADR 0004).

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | db | `db/enums.ts`, `db/migrations/0009_*.sql`, `db/schema.ts` |
| app | pricing infra | `modules/pricing/infrastructure/schema.ts` (+ new rate-card/surcharge tables), `route-rates.ts`, `queries.ts`, `quote-mappers.ts`, `admin-rate-queries.ts`, `rate-band-writes.ts` |
| app | pricing domain | `modules/pricing/domain/quote.ts`, `weight.ts`, `from-price.ts`, `band-rules.ts`, `band-warnings.ts`, `admin-rate-band.ts`, new `rate-card.ts`, `money.ts` |
| app | pricing ui | `modules/pricing/ui/rate-table.tsx`, `rate-rows.tsx`, `rate-band-text.ts`, `route-pricing.ts`, `pricing-rules.tsx`, `route-calculator.tsx`, `calculator/*`, `quote-output.tsx`, `route-card*.tsx`, `hub-*.tsx`, new `rate-card-section.tsx` (server) + `rate-card-switcher.tsx` (client), `surcharge-list.tsx`, `card-policies.tsx`; `ui/admin/*` |
| app | pricing app | `modules/pricing/application/schemas.ts`, `save-rate-band.ts`, `delete-rate-band.ts`, `actions.ts` |
| app | routes | `modules/routes/infrastructure/schema.ts`, `queries.ts`, `domain/route-detail.ts` |
| app | seo | `modules/seo/domain/route-json-ld.ts` |
| app | content | `modules/content/ui/route/route-page.tsx` (price slot), `scripts/seed/route-content-schema.ts` |
| app | shared | `shared/lib/format.ts` (`formatMoney`), `shared/ui/flags/flag-shapes.tsx` |
| app | seed/scripts | `data/seed/rate-cards.json` (new), `routes.legacy.json`, `pages.json`, `menus.json`, `route-content.json`, `data/owner-confirmations.json`, `scripts/import-rate-cards.ts` (new), `scripts/seed/*`, `scripts/price-examples*`, `package.json` (`db:import-rate-cards`), `data/perf-budget.json` |
| app | i18n | `messages/vi.json`, `messages/en.json` (price-section, calculator, method labels `road`, `hand_carry`) |
| context | docs | `docs/context/07-data-model.md`, `03-information-architecture.md`, `05-seo-and-tracking.md`, `11-open-questions.md`, `10-roadmap.md`, `AGENTS.md` §3/§4 rule 2/§7, `docs/adr/0007-rate-cards-and-currency.md` |

### Golden-rule checks

- **Rules 1–2:** prices, transit and surcharges come only from DB rows imported from the sales file. Rule 2's table list is widened (AC-23). No price in copy, components or `messages`. The drafted intros and FAQs reference no numbers (they link to the price section).
- **Rule 3:** flags are SVG shapes; no text in images.
- **Rule 4:** every new page has 1 H1, `generateMetadata`, canonical + hreflang, JSON-LD, breadcrumbs and a Zalo CTA.
- **Rule 6:** queries and the import are server-only; the client island receives plain serialisable card data.
- **Rule 7:** admin actions keep `requireSection('routes')` (A-02 pattern).
- **Rule 8:** one small client island. All cards are server-rendered; the switcher toggles `hidden`. Budget measured (AC-21).
- **Rule 10:**
  - tabs and chips use Radix Tabs or radio-group semantics, with visible focus and 44 px targets;
  - tables have `<th scope>`;
  - collapsibles use shadcn Accordion/Collapsible.
- **Rule 11:** no `uppercase` on tabs and chips.
- **Rule 12:** "Liên hệ" CTAs go through `/go/zalo`.
- **Rule 14:** the partner warehouse address and contact name are not published.
- **§10:** no "accepted goods" lists per country. Sales item names that mention counterfeit goods ("hàng fake") are published only after the owner answers the new open question (see Risks); until then those surcharge rows and hand-carry columns are imported with `is_active = false`.

### Dependencies & Risks

- **Depends on:**
  - A-02 (merged, awaiting `/mark-implemented`);
  - S-03, S-04, S-07 (done);
  - F-04 (Supabase access for `db:migrate` + import);
  - the owner go-ahead to run migration `0009` and the import on Supabase (as for `0006`–`0007`).
- **Blocked by questions** (non-blocking per ADR 0004; placeholders as stated):
  - **Q-04 / Q-25:** rounding, band edges and VAT. Values are imported as written; edges follow the contiguous rule. A new Q-ID lists the 31 §E1 items.
  - **Q-05:** the active-route set is answered by the workbook (owner decision 1); update the row.
  - **Q-08:** carrier names (DHL, DPD) are hidden until answered.
  - **Q-09:** the per-card policies partly answer it. The `/chinh-sach-den-bu/` page stays as is.
- **Risks:**
  - **R1, counterfeit goods.** The sales list prices "hàng fake" (hand-carry JP → VN, MY surcharges, SG customs list, EU SGN list). Publishing prices for counterfeit goods is a legal and trust risk. Default: imported inactive, so not shown; the owner decides.
  - **R2, rename churn.** The `price_per_kg_vnd` → `price_per_kg_minor` rename touches about 25 files (lesson `s08-lead-form`: list every file a new field threads through). The Affected Areas list is the checklist.
  - **R3, page weight.** The EU card has 7 zones × 43 rows. The server HTML grows, and the mobile column picker keeps the DOM readable. Check LCP is unaffected (the price section is below the fold).
  - **R4, destructive import.** The import replaces admin edits made since A-02 for the listed routes. Run the dry run first and record the summary in the PR.
  - **R5, translation volume.** About 150 surcharge items and policy lines need EN. The implementer drafts EN from the VI text; the glossary (`12-glossary.md`) governs terms.

### Manual Verification Plan

- **Seed:** a local DB (`pnpm db:local`) migrated to `0009`, seeded, imported (`pnpm db:import-rate-cards --replace`) and confirmed (`pnpm db:confirm`).
- **Steps:**
  1. `pnpm -C 43logistics.vn db:import-rate-cards` (dry run): the summary lists 16 active routes and the card counts from the inventory. Then run with `--replace`.
  2. Run the card print script (AC-04) and compare 5 cards by hand with `data/retail-price-list.md`: kr dry ĐN+, eu zone 3, us economy, sg-vn sea mixed HN, kr-vn hand-carry.
  3. `pnpm price:examples`: the six AC-15 cases match.
  4. Open `/gui-hang-di-han-quoc/` at 360, 768 and 1280 px:
     - the tabs "Bay · hàng khô" and "Bay · đông lạnh" are present;
     - the chips for ĐN+, HN chậm, HN nhanh and HCM are present;
     - switching changes the table, facts, surcharges and policies;
     - the keyboard works (Tab, arrows, Enter);
     - with JS disabled, all 7 cards are stacked.
  5. Open `/gui-hang-di-chau-au/`:
     - 7 zone columns at 1280 px; the column picker at 360 px;
     - zone 7 at 1,0–10,0 kg shows "Liên hệ";
     - the C2 and C3 lists render;
     - no "quý đối tác", no DHL/DPD.
  6. Open `/gui-hang-tu-singapore-ve-viet-nam/`: USD prices are formatted "12,00 US$" (VI) and "$12.00" (EN); the air card table is transposed; there is no partner address.
  7. Mini calculator on `/gui-hang-di-thai-lan/`: 30 kg → 3.250.000 đ (minimum 50 kg). On `/tinh-cuoc/`: route Hàn Quốc → VN, Bay, Miền Nam, 10 kg + 60 × 50 × 40 → 329.400 ₩.
  8. Hero, mega menu and hubs: Singapore shows "Từ 94.000 đ/kg"; Korea shows "Từ 72.000 đ/kg"; SG → VN shows "Từ 7 US$/kg".
  9. Admin `/admin/routes/kr`: the bands are grouped by card. Edit the ĐN+ dry ≥ 3 kg price and save; the public page and the menu update.
  10. Every new URL in VI and EN: 1 H1, canonical, hreflang reciprocal, JSON-LD valid (schema validator).
  11. axe DevTools at 360 and 1280 on `/gui-hang-di-han-quoc/` and `/gui-hang-di-chau-au/`: zero serious or critical issues.
  12. Reduced motion: the switcher has no animation, or only opacity.
- **Validation commands:** `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `build`, `i18n:check`, `check:redirects`, `perf:report`. Consent matrix: not touched. No automated tests (ADR 0004).

### Implementation Hints

- Keep `"use cache"` + `cacheTag(routeTag(key))` for one query, `getRouteRateCards(key, locale)`, that returns cards → columns → bands → lists → items. `menu` keeps the from-price query.
- The switcher island gets only `{cardId, tabKey, tabLabel, chipLabel}[]`. Panels are server children with `data-card-id` and toggled by `hidden`. Use shadcn `Tabs` for the service row (`forceMount` on content, or plain buttons with `aria-controls`) and a radio-group for chips.
- `formatMoney(minor, currency, locale)` in `shared/lib/format.ts`:
  - VND keeps "x đ" (VI) and "x VND" (EN);
  - others use `Intl` currency with 2 decimals (KRW 0).
  - `formatVnd` stays as a wrapper.
- Build `rate-cards.json` with a context-side helper: read the xlsx cells for EU and the bands, plus the hand transcriptions in `data/retail-price-list.md` for the image tabs. Commit only the JSON to the app.
- `route-content-schema.ts`: the key regex already allows 2-letter keys (`eu`, `gb`). Check that new keys pass.
- `messages`: method labels for `road` ("Xe" / "Road") and `hand_carry` ("Xách tay" / "Hand-carry"). Price-section strings: "Gửi từ", "Nhận tại", "Phụ thu theo mặt hàng", "Phí khác", "Bảo hiểm & khiếu nại", "Tối thiểu {kg} kg", "Làm tròn {step} kg".
- The A-02 lesson about Biome: run `lint:fix` only on changed files.

### Related

- `data/retail-price-list.md` (source, §E1 checklist, §F decisions)
- `docs/context/10-roadmap.md` A-02, A-02b, S-03, S-04, S-07
- `specs/feature-a02-routes-rates-editor.md`, `feature-s03-price-engine.md`, `feature-s04-route-page-template.md`, `feature-s04b-route-page-content.md`, `feature-s07-calculator*.md`
- `specs/feature-a02b-rate-cards-admin.md` (part 2)
- ADR 0001 (Decision 6), 0004, 0005, 0006; `lessons/2026-10-23-s08-lead-form.md`
