# 01 — Business context

> Source: WordPress database dump of 43logistics.vn (2026-10-18) + live site review. Values in "quotes" are verbatim from the old site.
> Anything marked `NEEDS CONFIRMATION` must be confirmed by the business owner before it is published (tracked in `11-open-questions.md`).

## Company

| Field | Value | Status |
| --- | --- | --- |
| Brand name | "43 Logistics" | Confirmed |
| Alternate name (schema) | "43Logistics.vn" | From Rank Math config |
| Tagline (WP) | "Vận chuyển hàng Quốc Tế" | Confirmed |
| Header tagline | "43 Logistics - Gửi hàng đi nước ngoài!" | Confirmed |
| Legal company name | — | `NEEDS CONFIRMATION` |
| Tax code (MST) / business licence | — | `NEEDS CONFIRMATION` |
| Founded | — | `NEEDS CONFIRMATION` (site first published Oct 2023) |
| Trust numbers (years, customers, shipments) | None on the old site. The only counters ("Outlet Office", "Happy Customer", "Local Courier") are theme demo widgets on the Lorem-ipsum About pages, so they are not facts | `NEEDS CONFIRMATION` (Q-23) |
| Domain | `https://43logistics.vn` (https, non-www) | Confirmed |
| Sister company | Quý Nam (`https://quynam.vn`), same HCMC address "34 Nguyễn Trọng Lội, P4, Tân Bình". **Reference for site structure only** (sitemap, page types, page count, layout, feature patterns). Its facts, prices, numbers, slogans, images and wording are **not** a source for 43logistics.vn; 43L publishes only its own facts | Confirmed by owner 2026-10-21 (Q-21, clarified the same day) |

## Locations

| Location | Address as shown on old site | Notes |
| --- | --- | --- |
| Đà Nẵng (head office / warehouse) | "24 Bình Hòa 6, Khuê Trung, Cẩm Lệ" · schema: "24 Bình Hoà 6, Phường Khuê Trung", "Quận Cẩm Lệ", "Đà Nẵng", postal code "50700" | Ward/district names may have changed after the 01/07/2025 administrative reform — `NEEDS CONFIRMATION` Address **Confirmed as shown** by the owner, 2026-10-22 (ward names after the reform still open, Q-02). |
| TP. Hồ Chí Minh | "34 Nguyễn Trọng Lội, Phường 4, Tân Bình" (contact page: "34 Nguyễn Trọng Lội, P4, Tân Bình") | Same reform caveat Address **Confirmed as shown** by the owner, 2026-10-22 (ward names after the reform still open, Q-02). |
| Hà Nội | Route pages claim "kho ở Hà Nội – TP.HCM – Đà Nẵng" but no address anywhere | `NEEDS CONFIRMATION` — do not show until confirmed |
| Overseas | Singapore → VN page mentions "kho Singapore" (receive, sort, repack) | Address `NEEDS CONFIRMATION` |

## Contact channels

| Channel | Value | Notes |
| --- | --- | --- |
| Hotline / Zalo | "0979 222 357" · E.164 `+84979222357` | Primary. `tel:+84979222357`, `https://zalo.me/0979222357` **Confirmed** by the owner, 2026-10-22 (S-05b; `43logistics.vn/data/owner-confirmations.json`). |
| WhatsApp | `https://wa.me/84979222357` | Old site used `wa.me/0979222357` (broken, missing country code) **Confirmed** by the owner, 2026-10-22 (S-05b; `43logistics.vn/data/owner-confirmations.json`). |
| Messenger | `https://m.me/43logistics` | **Confirmed** by the owner, 2026-10-22 (S-05b; `43logistics.vn/data/owner-confirmations.json`). |
| Facebook | `https://www.facebook.com/43logistics` | Only social profile found **Confirmed** by the owner, 2026-10-22 (S-05b; `43logistics.vn/data/owner-confirmations.json`). |
| Second number | "0827 575 567" (blog: "Call/Zalo/ Whatsapp") | `NEEDS CONFIRMATION` — still in use? Owner decision 2026-10-22: not published (one primary number, Q-06). |
| Email | "43logistics.danang@gmail.com" | Recommend a domain mailbox; old form sent from `email@43logistics.vn` (may not exist → deliverability risk) **Confirmed** by the owner, 2026-10-22 (S-05b; `43logistics.vn/data/owner-confirmations.json`). |
| Opening hours | Header: "T2 - T7: 08:00 - 18:00" · Contact page: "Từ thứ 2 -> Sáng thứ 7" · schema: 09:00–17:00 · route pages: "CSKH 24/7" | **Contradictory** — `NEEDS CONFIRMATION`; store one value in `site_settings` Owner decision 2026-10-22: **T2–T7 08:00–18:00** (the header value) is Confirmed; 24/7 stays unconfirmed (Q-03). |

## Services (as described on the old site)

Outbound (Việt Nam → nước ngoài), air + sea, door-to-door, free packing and weighing at the warehouse, customs handled by 43 Logistics, partners/carriers mentioned: DHL, UPS, FedEx, CJ Logistics, EMS.

| Route | Old URL | Legacy price (VND) | Legacy transit | Other facts on page |
| --- | --- | --- | --- | --- |
| Singapore | `/dich-vu/gui-hang-di-singapore/` | 1-5kg 150.000đ/kg · 6-20kg 88.000đ/kg · 21-100kg 68.000đ/kg · Trên 100kg 57.000đ/kg (blog 11/2025 says air 85.000 VND/kg, sea ≈0,8 SGD/kg) | 1-2 ngày làm việc kể từ ngày bay; frozen 24h | "Lịch bay thứ 3-5-7 hàng tuần"; "Giá chưa bao gồm VAT, phí bảo hiểm hàng hóa nếu có"; free home delivery |
| Malaysia | `/dich-vu/gui-hang-di-malaysia/` | 1-50kg 68.000đ/kg · 51-100kg 58.000đ/kg · Trên 100kg 52.000đ/kg · Trên 300kg liên hệ | Air 2-4 ngày làm việc; frozen 1-2 ngày; sea 7-10 ngày; Sabah/Sarawak +1-2 ngày | |
| Hàn Quốc | `/dich-vu/gui-hang-di-han-quoc/` | Đồng giá 1-100kg 75.000đ/kg (blog 11/2025: 68.000 VND/kg) | 2-4 ngày làm việc | Tracking via CJ Logistics, EMS; free delivery in Korea > 5kg |
| Đài Loan | `/dich-vu/gui-hang-di-dai-loan/` | Đồng giá 1-100kg 95.000đ/kg | 2-4 ngày làm việc | Page copy duplicated with Japan page |
| Nhật Bản | `/gui-hang-di-nhat-ban-2-chieu/` | Đồng giá 1-100kg 95.000đ/kg | 2-4 ngày làm việc | "2 chiều" (two-way) in title — inbound JP→VN `NEEDS CONFIRMATION`; free delivery > 5kg |
| Thái Lan | `/gui-hang-di-thai-lan/` | 5-10kg 100.000 · 10-30kg 90.000 · 30-40kg 80.000 · 40-50kg 70.000 · 50-70kg 65.000 · 70-100kg 60.000 (đ/kg) · >100kg liên hệ | 2-3 ngày bay nhanh / 7-10 ngày bay chậm | "không có phụ thu cho từng loại"; delivery fee may apply |
| Mỹ | `/gui-hang-di-my/` | 0.5kg 1.146.215đ · 1kg 1.227.963đ · 5kg 2.123.931đ · 10kg 3.143.272đ · 12kg 3.595.778đ · 15kg 4.214.357đ · 17kg 4.596.289đ · 20kg 5.173.026đ · 21kg+ 220.000đ/kg | 8-12 ngày (bay chậm), 3-5 ngày (bay thẳng), 3-4 tuần (biển) | Weight rounded up to 0.5kg; prices for normal goods only |

Inbound (nước ngoài → Việt Nam): **Singapore → VN** (`/van-chuyen-hang-singapore/`) — air to HN/HCM, sea for big shipments, prices not public ("sẽ không được công khai"), insurance 10% → 100% compensation, otherwise "đền bù x3 lần phí vận chuyển". Malaysia → VN and Thailand → VN exist only as empty menu items — `NEEDS CONFIRMATION`.

Common rules shown on many pages:

- Volumetric weight: **(Dài × Rộng × Cao) cm / 5000 = kg** (the chargeable weight is the higher of actual and volumetric).
- New-customer offer: "Bạn là khách hàng mới? Nhận ngay 10% ưu đãi" — **Confirmed running** by the owner, 2026-10-22 (Q-07).
- Process (4 steps on home): 1 Tiếp nhận & tư vấn → 2 Nhận hàng tại kho, cân kiểm → 3 Đóng gói & thanh toán → 4 Thông quan, vận chuyển, giao hàng. "Người gửi chỉ thanh toán một lần duy nhất và người nhận chỉ nhận hàng!"

> **Owner confirmation, 2026-10-22 (S-05b):** the per-route prices and transit times in `43logistics.vn/data/seed/routes.legacy.json` for SG, MY, KR, TW, JP, TH and US are **Confirmed** as published on the live site, and `pnpm db:confirm` marks those routes verified. SG→VN stays "liên hệ". VAT/insurance/surcharge rules remain open (Q-04).
>
> All legacy prices date from Dec 2023 – Jan 2024 except the 2025 blog posts. Treat any price not listed in the confirmation above as unverified seed data (`43logistics.vn/data/seed/routes.legacy.json`, `is_verified = false`). The public site must show `updated_at` next to each rate table.

## Audience (confirmed for the rebuild)

1. **Senders in Vietnam shipping abroad** — families sending food/gifts to relatives, small online shops. Mobile-first, Zalo users, care about price per kg, days, what is allowed, and trust.
2. **Vietnamese living abroad** (Singapore, Korea, Japan, Taiwan, USA…) — receivers of parcels and senders back to Vietnam. Use Zalo plus WhatsApp/Messenger; sometimes read English.

Secondary (not designed for yet): businesses with regular freight, foreigners in Vietnam.

## Goals & KPIs

| Goal | KPI |
| --- | --- |
| More contacts from organic + ads | `contact_events` (Zalo/call/WhatsApp/Messenger) + `leads` per week, by route and by source |
| Measurable ads | Every lead/contact carries `utm_*` + click IDs; conversions sent to Google Ads, Meta, TikTok |
| Trust | Real photos, verified prices with date, legal info, policies, consented testimonials |
| Bilingual | VI + EN for home, 7 outbound routes, SG→VN, contact, about |
| Speed | LCP < 2.5 s mobile on route pages |

## Brand voice

- **Vietnamese (target):** like a knowledgeable friend in the trade — clear, concrete numbers (price, days, flight days), few adjectives, address the reader as "bạn" in marketing copy and "quý khách" in policies. Avoid superlatives without proof ("tối ưu nhất", "uy tín nhất").
- **English (target):** plain, neutral, short sentences; written for Vietnamese diaspora and foreign recipients — no idioms.
- **Old site voice (for reference):** salesy, many exclamation marks, ALL-CAPS headings, frequent typos.
