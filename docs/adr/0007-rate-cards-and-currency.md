# ADR 0007 — Rate cards and currencies

- Status: Accepted (2026-10-26)
- Amends: ADR 0001 (Decision 6, prices in `routes` + `route_rates`), `AGENTS.md` rule 2, `docs/context/07-data-model.md` ("Pricing rules").
- Owner repo: both
- Roadmap: A-02b (`specs/feature-a02b-rate-cards-public.md` part 1, `specs/feature-a02b-rate-cards-admin.md` part 2)

## Context

Sales sent the full retail price list (`data/TỔNG HỢP GIÁ BÁN LẺ.xlsx`, 27 tabs, transcribed in `data/retail-price-list.md`). One route has several prices, by origin, method (air, sea, road, hand-carry), service or cargo class (dry, frozen, express, economy…), destination zone (7 EU zones, California or not) and currency (VND, SGD, USD, KRW). Each comes with its own transit, schedule, rounding, minimums, item surcharges and insurance/claims rules.

The schema had none of these dimensions: `route_rates` was VND-only bands per `(route, method)`, and transit, divisor and rounding were route facts. The owner decided on 2026-10-25/26 (price list §F):

- publish every route in the list except Indonesia, with the Excel values as written (rule-1 record: `owner-confirmations.json` → `rateCards`), open items in Q-30;
- keep foreign-currency prices in SGD, USD and KRW, with no conversion;
- publish the full item-surcharge tables and insurance/claims rules per route, including the sales' "hàng fake" rows verbatim, after being told of the legal and trust risk;
- one page per country per direction, with service tabs and place chips inside it.

## Decisions

1. **Rate card.** A route has one or more `rate_cards`: one combination of method × service (`tab_key`) × place (origin outbound, destination inbound). A card carries its currency, transit, schedule (translated), rounding step, volumetric divisor, acceptance minimum (`min_weight_kg`), billing minimum (`min_chargeable_kg`), ordered policy sections (jsonb per locale) and links to the route's surcharge lists. Optional `rate_card_columns` split prices by zone, cargo class or item type, each `quotable` or `contact`.
2. **Bands belong to cards.** `route_rates` loses `route_id` and `method`, gains `rate_card_id` and `column_id` (a composite FK keeps a column on its own card) and stores `price_per_kg_minor` / `flat_price_minor`. Bands keep the sale's literal, inclusive edges ("Trên X kg" = X.001) and wording (`route_rate_translations`). A weight in a gap is "Liên hệ".
3. **Money is minor units of the card's currency.** VND and KRW have no minor unit; USD and SGD have cents. The exponents are code (`modules/pricing/domain/money.ts`), not data. Nothing is ever converted: a quote, a "Từ X" price and a JSON-LD `Offer` are each in one currency.
4. **Route summaries are derived on read.** Hero and menu transit, the method list and "Từ X/kg" come from the active cards with a band valid today (the "Từ" currency is the first such card's, in sort order). The old `routes` facts (`methods`, `transit_*`, `transit_note`, `flight_schedule`, `volumetric_divisor`, `weight_rounding_kg`) stay one release unread and are dropped in part 2.
5. **Surcharges are informational.** `surcharge_lists` / `surcharge_items` hold item, price and note as text per locale. The calculator never adds them; it quotes the card's freight only.
6. **One import, guarded.** `pnpm db:import-rate-cards` replaces a route's cards from `data/seed/rate-cards.json` only with `--replace`, after a backup, skipping admin-edited routes unless `--force`; the seed keeps legacy bands as `legacy-{method}` cards until a route is imported.

## Consequences

- Golden rule 2 now names `rate_cards`, `route_rates` and the surcharge lists as the single source of prices (`AGENTS.md`).
- The engine quotes one card at a time; the calculator and the route page share a card selection. `calculate_quote` sends `currency` and `estimate_amount`, and `estimate_vnd` only for VND quotes (`05`).
- The admin band editor (A-02) groups bands by card and column and edits prices in the card's currency; card, column, surcharge and policy editing is part 2.
- **Risk accepted by the owner:** the "hàng fake" surcharge rows are published verbatim (owner decision 2026-10-26). They can be deactivated per item once part 2 ships the surcharge editor. The SG → VN partner warehouse address and contact name stay unpublished (rule 14), and carrier names stay hidden until Q-08.
- Prices that look wrong in the source (Q-30) are published as written and corrected in the admin; gaps between bands show "Liên hệ".
