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
│   └── /gui-hang-di-my/                                           | /en/shipping-to-usa/
├── /nhap-hang/                     Hub: Nhận hàng về Việt Nam    | /en/ship-to-vietnam/
│   ├── /gui-hang-tu-singapore-ve-viet-nam/                        | /en/singapore-to-vietnam-shipping/
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
| `th` | outbound | TH | gui-hang-di-thai-lan | shipping-to-thailand | Thái Lan | Thailand | P0 |
| `us` | outbound | US | gui-hang-di-my | shipping-to-usa | Mỹ | United States | P0 |
| `sg-vn` | inbound | SG | gui-hang-tu-singapore-ve-viet-nam | singapore-to-vietnam-shipping | Singapore → Việt Nam | Singapore → Vietnam | P0 |
| `my-vn` | inbound | MY | gui-hang-tu-malaysia-ve-viet-nam | malaysia-to-vietnam-shipping | Malaysia → Việt Nam | Malaysia → Vietnam | P2, `NEEDS CONFIRMATION` |
| `th-vn` | inbound | TH | gui-hang-tu-thai-lan-ve-viet-nam | thailand-to-vietnam-shipping | Thái Lan → Việt Nam | Thailand → Vietnam | P2, `NEEDS CONFIRMATION` |

## Navigation

**Desktop header:** logo · **Gửi hàng đi** (mega menu: 7 country cards, each "từ {min price}/kg · {min}-{max} ngày", all from DB) · **Nhận hàng về VN** · **Tính cước** · **Kinh nghiệm** · **Về chúng tôi** (Giới thiệu, Liên hệ, Chính sách) · language switch VI/EN · primary button **Chat Zalo** · secondary icon button **Gọi**.

**Mobile:** compact header (logo, language, menu) + **sticky bottom action bar**: Zalo · Gọi · Tính cước. Replaces the old 4 floating round buttons.

**Footer:** company (legal name, MST when confirmed) · services (routes) · policies (5) · contact (offices, hours, channels) · social · © {current year}.

**Breadcrumbs:** on every page below home; also emitted as `BreadcrumbList` JSON-LD.

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

- The hero route picker links to the route pages; it becomes "route picker → calculator" in **S-07**.
- Offices have a Google Maps search link built from the address and no static map image (an image needs **A-04** media).
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

### Inbound route page (SG → VN)

Same template (S-04: prices "liên hệ", no rate table or calculator while `prices_public = false` or unverified; the inbound blocks below stay hidden until Q-02/Q-05 are answered) with inbound-specific blocks: overseas warehouse address + how to send to it, repack/consolidation, delivery to HN/HCM, permit/checkout/order services ("checkout, order, làm permit" on old page — `NEEDS CONFIRMATION`), declared value + insurance rules. Prices may be "liên hệ" if the business keeps them private.

### Hubs `/dich-vu/`, `/nhap-hang/`

Comparison table of all routes in that direction (from-price, days, methods, link) + short intro + FAQ + CTA.

### Calculator `/tinh-cuoc/`

Inputs: route, actual weight (kg), dimensions L×W×H (cm), goods type. Output: chargeable weight, band, estimated price, transit days, caveats. Actions: "Gửi kết quả qua Zalo" (prefilled), "Nhận báo giá chính xác" (lead form prefilled). Pure client computation from rates embedded at build time; logs `calculate_quote` event.

### Prohibited goods `/hang-cam-gui/`

Filter by country; three groups (cấm / hạn chế – cần khai báo / nhận gửi). Content must be approved by operations.

### Contact `/lien-he/`

Big channel buttons (Zalo, Gọi, WhatsApp, Messenger) · quote form · offices with hours · static map.

### About `/gioi-thieu/`

Real story, team & warehouse photos, carriers/partners, legal info, numbers only if real.

### Blog

List with filters by route; article layout with TOC, author, dates, CTA box, related route link. `BlogPosting` JSON-LD.

### Ads landing page `/lp/{campaign}/`

Variant of a route page: no full nav (logo + Zalo button), hero matching the ad (H1 + price), proof, rate summary, FAQ (3), single CTA Zalo + secondary call; `noindex`.

### Policy pages

Long-form prose, last-updated date, table of contents. Privacy policy must cover Decree 13/2023 (purposes, retention, rights, contact).

### 404

Search-free: route cards + Zalo CTA.
