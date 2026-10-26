# 03 — Information architecture

## URL strategy

- Vietnamese is the default locale at the **root, no prefix**; English under **`/en/`** (next-intl `localePrefix: 'as-needed'`). This keeps 7 indexed Vietnamese URLs unchanged.
- Trailing slash **on** (`trailingSlash: true`) to match the old site and avoid a redirect hop.
- Slugs: lowercase, no diacritics, keyword-first, hyphenated. Each locale has its own slug (stored in `page_translations.slug`).
- Outbound routes: `/gui-hang-di-{country}/` ↔ `/en/shipping-to-{country}/`.
- Inbound routes: `/gui-hang-tu-{country}-ve-viet-nam/` ↔ `/en/{country}-to-vietnam-shipping/`.
- Blog: `/kinh-nghiem/{slug}/` ↔ `/en/guides/{slug}/`.
- Ads landing pages: `/lp/{campaign}/` ↔ `/en/lp/{campaign}/` — `noindex, follow`.
- Old → new mapping: `43logistics.vn/data/redirect-map.csv` (63 rows: 46 × 301, 9 × 200, 8 × 410).

## Sitemap

```
/                                   Trang chủ                     | /en/
├── /dich-vu/                       Hub: Gửi hàng đi nước ngoài   | /en/services/
│   ├── /gui-hang-di-singapore/                                    | /en/shipping-to-singapore/
│   ├── /gui-hang-di-malaysia/                                     | /en/shipping-to-malaysia/
│   ├── /gui-hang-di-han-quoc/                                     | /en/shipping-to-korea/
│   ├── /gui-hang-di-dai-loan/                                     | /en/shipping-to-taiwan/
│   ├── /gui-hang-di-nhat-ban/                                     | /en/shipping-to-japan/
│   ├── /gui-hang-di-thai-lan/                                     | /en/shipping-to-thailand/
│   ├── /gui-hang-di-my/                                           | /en/shipping-to-usa/
│   ├── /gui-hang-di-philippines/                                  | /en/shipping-to-philippines/   (A-02b)
│   ├── /gui-hang-di-canada/                                       | /en/shipping-to-canada/        (A-02b)
│   ├── /gui-hang-di-anh/                                          | /en/shipping-to-uk/            (A-02b)
│   ├── /gui-hang-di-uc/                                           | /en/shipping-to-australia/     (A-02b)
│   └── /gui-hang-di-chau-au/                                      | /en/shipping-to-europe/        (A-02b)
├── /nhap-hang/                     Hub: Nhận hàng về Việt Nam    | /en/ship-to-vietnam/
│   ├── /gui-hang-tu-singapore-ve-viet-nam/                        | /en/singapore-to-vietnam-shipping/
│   ├── /gui-hang-tu-dai-loan-ve-viet-nam/                         | /en/taiwan-to-vietnam-shipping/  (A-02b)
│   ├── /gui-hang-tu-han-quoc-ve-viet-nam/                         | /en/korea-to-vietnam-shipping/   (A-02b)
│   ├── /gui-hang-tu-nhat-ban-ve-viet-nam/                         | /en/japan-to-vietnam-shipping/   (A-02b)
│   ├── /gui-hang-tu-malaysia-ve-viet-nam/   (only if confirmed)
│   └── /gui-hang-tu-thai-lan-ve-viet-nam/   (only if confirmed)
├── /tinh-cuoc/                     Shipping calculator           | /en/shipping-calculator/
├── /hang-cam-gui/                  Prohibited & restricted goods | /en/prohibited-items/
├── /kinh-nghiem/                   Blog list (+ /kinh-nghiem/{slug}/) | /en/guides/
├── /gioi-thieu/                    About                         | /en/about/
├── /lien-he/                       Contact                       | /en/contact/
├── /quy-dinh-gui-nhan-hang/        Shipping terms                | /en/shipping-terms/
├── /chinh-sach-den-bu/             Claims & compensation         | /en/claims-policy/
├── /chinh-sach-bao-mat/            Privacy policy                | /en/privacy-policy/
├── /dieu-khoan-dich-vu/            Terms of service              | /en/terms/
├── /lp/{campaign}/                 Ads landing pages (noindex)   | /en/lp/{campaign}/
├── /tra-cuu/                       Tracking (P2, only if a data source exists) | /en/tracking/
└── /go/{channel}                   Contact click tracker (302, not a page)
```

## Route registry (seed for `routes` table)

| key | Direction | Country (ISO) | VI slug | EN slug | VI name | EN name | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `sg` | outbound | SG | gui-hang-di-singapore | shipping-to-singapore | Singapore | Singapore | P0 |
| `my` | outbound | MY | gui-hang-di-malaysia | shipping-to-malaysia | Malaysia | Malaysia | P0 |
| `kr` | outbound | KR | gui-hang-di-han-quoc | shipping-to-korea | Hàn Quốc | South Korea | P0 |
| `tw` | outbound | TW | gui-hang-di-dai-loan | shipping-to-taiwan | Đài Loan | Taiwan | P0 |
| `jp` | outbound | JP | gui-hang-di-nhat-ban | shipping-to-japan | Nhật Bản | Japan | P0 |
| `th` | outbound | TH | gui-hang-di-thai-lan | shipping-to-thailand | Thái Lan | Thailand | P0 (road from TP.HCM since A-02b, not air) |
| `us` | outbound | US | gui-hang-di-my | shipping-to-usa | Mỹ | United States | P0 |
| `sg-vn` | inbound | SG | gui-hang-tu-singapore-ve-viet-nam | singapore-to-vietnam-shipping | Singapore → Việt Nam | Singapore → Vietnam | P0 |
| `ph` | outbound | PH | gui-hang-di-philippines | shipping-to-philippines | Philippines | Philippines | A-02b |
| `ca` | outbound | CA | gui-hang-di-canada | shipping-to-canada | Canada | Canada | A-02b |
| `gb` | outbound | GB | gui-hang-di-anh | shipping-to-uk | Anh | United Kingdom | A-02b |
| `au` | outbound | AU | gui-hang-di-uc | shipping-to-australia | Úc | Australia | A-02b |
| `eu` | outbound | EU (the EU flag; zones list the countries) | gui-hang-di-chau-au | shipping-to-europe | Châu Âu | Europe | A-02b |
| `tw-vn` | inbound | TW | gui-hang-tu-dai-loan-ve-viet-nam | taiwan-to-vietnam-shipping | Đài Loan → Việt Nam | Taiwan → Vietnam | A-02b |
| `kr-vn` | inbound | KR | gui-hang-tu-han-quoc-ve-viet-nam | korea-to-vietnam-shipping | Hàn Quốc → Việt Nam | Korea → Vietnam | A-02b |
| `jp-vn` | inbound | JP | gui-hang-tu-nhat-ban-ve-viet-nam | japan-to-vietnam-shipping | Nhật Bản → Việt Nam | Japan → Vietnam | A-02b |
| `my-vn` | inbound | MY | gui-hang-tu-malaysia-ve-viet-nam | malaysia-to-vietnam-shipping | Malaysia → Việt Nam | Malaysia → Vietnam | P2, `NEEDS CONFIRMATION` |
| `th-vn` | inbound | TH | gui-hang-tu-thai-lan-ve-viet-nam | thailand-to-vietnam-shipping | Thái Lan → Việt Nam | Thailand → Vietnam | P2, `NEEDS CONFIRMATION` |

## Navigation

**Desktop header:** logo · **Gửi hàng đi** (mega menu: 7 country cards, each "từ {min price}/kg · {min}-{max} ngày", all from DB) · **Nhận hàng về VN** · **Tính cước** · **Kinh nghiệm** · **Về chúng tôi** (Giới thiệu, Liên hệ, Chính sách) · language switch VI/EN · primary button **Chat Zalo** · secondary icon button **Gọi**.

**Mobile:** compact header (logo, language, menu) + **sticky bottom action bar**: Zalo · Gọi · Tính cước. Replaces the old 4 floating round buttons.

**Footer:** company (legal name, MST when confirmed) · services (routes) · policies (5) · contact (offices, hours, channels) · social · © {current year}.

**Breadcrumbs:** on every page below home; also emitted as `BreadcrumbList` JSON-LD.

**Published links only (S-09):** header, mobile menu and footer render an item only when its target is published in the current locale: `pages.status = 'published'` **and** that locale's translation is `published` (external URLs count as published). One predicate (`isPagePublished` in `modules/content`) is shared by `getMenu` and the page loaders, so a menu link and its page always agree. Items to draft pages disappear (About, policies and the blog until they publish), a group with no remaining children is not rendered, and no menu link is `#` or a 404.

## Page specifications

### Home `/`

1. Hero: H1 promise (e.g. "Gửi hàng đi nước ngoài, nhận tận nhà"), sub-line with real facts, **route picker → calculator**, CTA Zalo + Gọi. Static image (real photo), no carousel.
2. Route bento grid: one card per active route (flag, name, "từ X đ/kg", "Y–Z ngày", badge e.g. "Đồng giá").
3. Why us (4): đa dạng hình thức (bay/biển), nhanh, cước rõ ràng, thủ tục đơn giản (đóng gói, cân kiểm, thông quan).
4. Process (4 steps) — see `01-business.md`.
5. Proof: real photos (team/warehouse) + consented testimonials + chat screenshots (blurred).
6. New-customer offer band (if confirmed).
7. Latest guides (3 posts).
8. Offices + hours (static map image → Google Maps link).

Built in S-05 and redesigned in S-05b (owner review 2026-10-22, old-site order + quynam.vn structure) as: hero (pill, H1 with the slogan "nhanh, rẻ, dễ dàng", sub-line, Zalo + "Gọi {hotline}", route picker; photo with floating service/price chips) → service strip (4 points) → rates bento (destination photos, featured first route, inbound wide) → why us (4 icon cards) → process timeline → new-customer offer band → real photos gallery + blurred customer chat wall (+ consented testimonials) → latest guides → dark closing band with CTAs and office cards. Stats, partners and FAQ wait for owner content (Q-23, Q-08, FAQ copy).

Deliberate deviations, each closed by its owning task:

- The hero route picker links to the route pages, plus a no-JS "Tính cước" form (route select) to `/tinh-cuoc/?route=<key>` (S-07).
- Each office card has a lazy, keyless Google Maps embed of its address and a "Xem bản đồ" link (new tab); owner decision 2026-10-23 (43logistics.vn PR #31). The same closing band and maps appear on the calculator, hubs, About and blog.
- Proof shows the old site's chat screenshots (consent confirmed, Q-12) as static, blurred images in `public/`; managing them moves to testimonial/media admin (**A-05**, **A-04**).
- Sections with nothing published (unverified facts, unapproved copy Q-27, unconfirmed photos Q-26, no posts, inactive offer Q-07) render nothing, heading included.

### Outbound route page (one template for 7 countries)

1. Breadcrumb · H1 "Gửi hàng đi {country}" · hero facts: from-price, transit days, flight schedule, methods · CTA Zalo (prefilled message with route) + Gọi.
2. Mini calculator (route preselected).
3. Rate table by weight band (`route_rates`), with "Cập nhật {date}", VAT/insurance notes; responsive (cards on mobile).
4. How the price is calculated: actual vs volumetric (L×W×H/5000), rounding rules (e.g. US rounds up to 0.5 kg), surcharges.
5. Process (route-specific steps if any).
6. Allowed / restricted / prohibited goods (from `goods_rules`, per country + global).
7. Methods & carriers (air/sea/express; carriers only if confirmed).
8. Compensation summary + link to `/chinh-sach-den-bu/`.
9. FAQ (from `faqs`) → `FAQPage` JSON-LD.
10. Testimonials for this route.
11. Related routes + related guides.
12. Final CTA band.

**As built (S-04):** one template, `app/[locale]/(site)/[slug]/page.tsx`. The H1 is "Gửi hàng đi {country}" until an editor writes one (the seed stores only the route name). The order follows the list above:
- the hero facts use the S-01 fact rule; flight schedule and transit note are Vietnamese-only DB text, shown on VI pages only;
- the mini calculator runs on the S-03 engine with only the shown bands;
- the rate table is a `<table>` from 768 px and cards below;
- pricing rules use the route's own divisor and rounding step;
- the process is the four approved home steps;
- the compensation section is the policy link only (Q-09); carriers are hidden (Q-08);
- goods (Q-10), FAQ, testimonials and related guides render only when approved/published rows exist.

Pages are published by the owner through `data/owner-confirmations.json` (`pages`) + `pnpm db:confirm`.

**S-04b (owner content):** quynam.vn's order:
- the H1 carries "– từ {price}" when the price is shown;
- rates with a "Lưu ý" box;
- calculator; pricing rules; methods with the DB transit line (VI);
- route-specific process; why us; tips; goods; the customer chat wall; FAQ; related routes.

Narrative content is `page_translations.blocks` (validated, VI + EN); goods and FAQs are `goods_rules`/`faqs` rows approved or published by `db:confirm` (`routeContent`).

**A-02b price section (rate cards, ADR 0007):** one page per country per direction; inside it the "Bảng giá" section has
- **service tabs** (`rate_cards.tab_key`: "Bay · hàng khô", "Bay · đông lạnh", "Tàu", "Xe", "Xách tay", "Bay nhanh", "Bay chậm") and **place chips** inside a tab ("Gửi từ" outbound, "Nhận tại" inbound), shown only when there is a choice;
- for the selected card: the band table (weight → price; item → price when the card has one band per column; weight × column with a column picker below 768 px for EU zones, US CA / outside CA, MY sea cargo classes), the facts line (only the set fields: transit, schedule, acceptance and billing minimums, rounding, divisor), then collapsible "Phụ thu theo mặt hàng", "Phí khác" and "Bảo hiểm & khiếu nại";
- every card in the server HTML: with JS off they stack, each under its "tab · place" heading; a small island only switches them and shares the selection with the mini calculator.

The hero's transit and methods and every "Từ X/kg" (hero, mega menu, hubs) are derived from the active cards (07 "Pricing rules"); the hero no longer shows a flight schedule (schedules are per card). The "methods" content block accepts `road` and `hand_carry` items.

### Inbound route page (SG → VN)

Same template (S-04: prices "liên hệ", no rate table or calculator while `prices_public = false` or unverified; the inbound blocks below stay hidden until Q-02/Q-05 are answered) with inbound-specific blocks: overseas warehouse address + how to send to it, repack/consolidation, delivery to HN/HCM, permit/checkout/order services ("checkout, order, làm permit" on old page — `NEEDS CONFIRMATION`), declared value + insurance rules. Prices may be "liên hệ" if the business keeps them private.

### Hubs `/dich-vu/`, `/nhap-hang/`

Comparison table of all routes in that direction (from-price, days, methods, link) + short intro + FAQ + CTA.

**As built (S-06):** on the shared `[slug]` segment, in quynam.vn's service-list structure with the S-05b look:
- hero (breadcrumbs, H1, intro, Zalo/Gọi);
- photo route cards with the from-price as the headline;
- the comparison table (`<table>` from 768 px, cards below; S-01 fact rule);
- FAQ from `faqs.page_id` when published;
- the closing band.

The inbound hub lists only active inbound routes (SG→VN; Q-05). Published by the owner via `db:confirm` (`pages`). Route pages show the hub crumb once their hub is published.

### Calculator `/tinh-cuoc/`

As built (S-07), on the `[slug]` dispatch (page key `calculator`, published via `db:confirm`):

- **Inputs:** route (grouped outbound/inbound, quotable routes only), the rate card (service and place, the same tabs and chips as the price section; on a route page the selection is shared with it), the price column when the card has columns (zone, goods type), actual weight (kg), optional L×W×H (cm) (A-02b). No goods type (no approved per-type pricing). `?route=<key>&kg=<n>` preselects them; an unknown or non-quotable key falls back to the first quotable route. Inputs live in a `useReducer` (in memory, no persist). The route pages and `/tinh-cuoc/` share one calculator island (`QuoteCalculator`), because every page prefetches the same client JS and a second island broke the ADR 0006 budget; Zustand was dropped for the same reason (owner decision, 2026-10-22).
- **Output:** actual, volumetric and chargeable weight with "Cân nặng quy đổi = Dài × Rộng × Cao (cm) ÷ {card divisor}", the band used, the estimated price in the card's currency (no conversion), verified transit days, caveats (not a final quote; VAT and surcharges excluded, Q-04/Q-25). "Liên hệ" results show the Zalo and call CTAs.
- **Actions:** "Gửi kết quả qua Zalo" copies a text summary (route, method, weights, estimate, page URL with parameters) and opens Zalo through `/go/zalo/` (`placement=calculator`) in a new tab, because `zalo.me` takes no prefilled text; if the clipboard is unavailable, the text is shown to copy by hand. "Gọi {hotline}". "Nhận báo giá chính xác" (priced results only, while the lead form is on) prefills route and weight and jumps to the "Nhận báo giá" section `#bao-gia` below the calculator (S-08).
- Routes without public prices are listed below as "Liên hệ" links to their route pages.
- Pure client computation from the bands the route pages show (embedded in the server render, no fetch); pushes `calculate_quote` to `dataLayer` once per settled result (500 ms debounce).
- Entry points: header item, mobile action bar, the home hero picker form, and the route-page mini calculator link (carries the route and typed weight).

### Prohibited goods `/hang-cam-gui/`

Filter by country; three groups (cấm / hạn chế – cần khai báo / nhận gửi). Content must be approved by operations.

S-12 as built (43logistics.vn PR #34): country chips jump to one section per route (anchors, no client JS); each section has the approved rules in Cấm gửi → Hạn chế → Được gửi groups (only non-empty groups, grid sized to them), a link to the route's rates, rules for every route first; an "ask first" box with the Zalo/call CTAs and the closing office band. Linked from the footer "Chính sách" menu. No rule is "Hạn chế" yet: operations can add them in A-05.

### Quote form section `#bao-gia` (calculator and contact pages)

S-08b (owner 2026-10-23): a dark panel with a 3-step infographic (send details → we get in touch → get your quote; HTML and icons, no text in images) and the Zalo/call links, beside a form card asking only name, phone/Zalo, weight (optional) and other shipping details (optional) + consent. The calculator's route travels as a hidden prefill. The form is always on when the database is; leads are saved and sent to sales by email and Zalo OA once those are configured (Q-28).

### Contact `/lien-he/`

Big channel buttons (Zalo, Gọi, WhatsApp, Messenger; each only when the `contact` setting is verified and holds that channel, placement `contact_page`) · quote form (S-09 reuses the S-08 `LeadSection` from `modules/leads`) · offices with hours · static map.

**Map (S-09, owner decision 2026-10-23):** each verified office shows a zoomable Google Maps embed of its address (keyless `https://www.google.com/maps?q={address}&output=embed`, `loading="lazy"`, titled "Bản đồ văn phòng {name}") plus a "Xem bản đồ" link to a Google Maps search (new tab). No API key or server-side map fetch. The iframe loads without consent until S-13 gates it (05 Consent). The email from the `contact` setting is listed under the channel buttons.

### About `/gioi-thieu/`

Real story, team & warehouse photos, carriers/partners, legal info, numbers only if real.

S-09 template: H1, the page's `richText` markdown blocks, and a legal block (legal name, tax code) rendered only when the `company` setting is verified (Q-01). Photos, carriers and numbers wait for verified data (Q-08, Q-23). Published 2026-10-23 with drafted copy (`43logistics.vn/data/seed/info-pages/about.{vi,en}.md`: who we are, services, process, commitments, contact) and the closing CTA band with offices; the real story and photos follow in A-03/A-04/C-03.

### Blog

List with filters by route; article layout with TOC, author, dates, CTA box, related route link. `BlogPosting` JSON-LD.

S-11 as built (owner 2026-10-23, 43logistics.vn PR #30): the index is a newest-first card grid (route chip, date, title, excerpt) with the closing CTA band; an article has breadcrumbs (Trang chủ → Kinh nghiệm → article), route chip, published/updated dates and reading time, a sticky TOC beside the body (≥ 1024 px), a dark CTA box, the related route's price tile and related posts (same route first). Launch content: the two legacy posts rewritten without prices or unconfirmed services (slugs from the redirect map) and two new guides (volumetric weight, packing), VI + EN. A-03b (owner 2026-10-24, `specs/feature-a03b-blog-post-editor.md`): each index card also shows its category chips (names from `category_translations` of that locale); above the grid a filter bar (client island) lists "Tất cả", the active routes used by a published post (in `routes.sort` order), then the categories used by one (in `categories.sort` order). One chip is active at a time (`aria-pressed`), the visible count is announced, and the filter has no URL (no `searchParams`, no new page); without JS every card shows and the bar is absent. An article shows "Bởi {name}" under the title only when the author's `display_name` differs from the username. Posts are written and published in `/admin/posts/`. Not yet: cover images (A-04).

### Ads landing page `/lp/{campaign}/`

Variant of a route page: no full nav (logo + Zalo button), hero matching the ad (H1 + price), proof, rate summary, FAQ (3), single CTA Zalo + secondary call; `noindex`.

### Policy pages

Long-form prose, last-updated date, table of contents. Privacy policy must cover Decree 13/2023 (purposes, retention, rights, contact).

S-09 template: one `policy` block per translation (07 Blocks). "Cập nhật: {d/M/yyyy}" comes from its `effectiveDate`; markdown headings are demoted (the page H1 stays the only `<h1>`) and get diacritic-free ids; the TOC lists the h2/h3 headings when there are at least 2. Raw HTML in markdown is shown as text, images are not rendered. The TOC is a sticky side column from 1024 px; a "questions?" box with the Zalo/call CTAs closes the page. All four policies were published 2026-10-23 with drafted copy (`data/seed/info-pages/policy-*.md`, effective date 2026-10-23) that states no compensation amounts, retention periods or legal name; those facts follow in A-03/C-03 (Q-01, Q-09, Q-17).

### 404

Search-free: route cards + Zalo CTA.

S-09: the message and home link, the Zalo/call CTAs (placement `not_found`) and the home route grid (verified prices only). Status 404, `noindex`. Draft info pages render it too.
