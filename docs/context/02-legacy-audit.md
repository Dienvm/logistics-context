# 02 — Legacy site audit (what to fix, what to keep)

> Summary of the analysis of the old WordPress site (DB dump 2026-10-18). Full human-readable report: "Phân tích migration website 43logistics.vn" (Claude Docs). This file is the agent-friendly digest.

## Platform snapshot

- WordPress (db_version 61833), table prefix `wpiw_` (a stale second install uses `wp_` — ignore), theme GeneratePress, Elementor + Elementor Pro (Theme Builder header/footer/single template), Classic Editor.
- Plugins active: Rank Math SEO **and** All in One SEO (conflict), Elementor Pro Form, Contact Form 7 (unused), gvt-contact-ads (floating Zalo/Messenger/WhatsApp/Hotline), Insert Headers and Footers (GTM `GTM-WF967MKT`), Easy Table of Contents, WP External Links, Really Simple SSL, Backup Migration, Better Search Replace.
- Leftovers in DB: Kallyas, Avada/Fusion, CargoHub, Twenty Twenty-Three, Revolution Slider, WoodMart, LiteSpeed Cache options.
- Content: 17 published pages, 3 posts, 330 attachments (~125 MB, 175 actually used), 1 user (`admin`), 0 comments, 12 form submissions (2023: 2, 2024: 6, 2025: 1, 2026: 3).

## Problems the rebuild must not repeat

| # | Problem on old site | Rule for new site |
| --- | --- | --- |
| 1 | `/gioi-thieu/`, `/dich-vu/`, `/tieu-de/` show template Lorem ipsum; 5 menu pages empty | No placeholder content in production; empty sections are hidden, not shipped |
| 2 | Prices/transit times contradict across pages (e.g. Korea 75.000 vs 68.000 đ/kg; Home "3-5 ngày" vs page "2-4 ngày") | Single source of truth in DB (`routes`, `route_rates`) |
| 3 | Taiwan and Japan pages are clones (1,294 words, same 21 headings) linking to competitor `3a.net.vn` | Unique copy per route; no competitor links |
| 4 | Text baked into PNG banners (1–2 MB each) | Text in HTML; images optimised (AVIF/WebP) |
| 5 | 10 font families, ~50 ad-hoc colours, 4 near-identical CTA reds failing AA | Token-only styling (`04-design-system.md`) |
| 6 | No H1 on home, contact, Malaysia, Taiwan, SG→VN; Korea H1 generic | Exactly one descriptive H1 per page |
| 7 | ~58 `#` links in content + 9 in footer (policies missing) | No dead links; policy pages exist (privacy, terms, claims, shipping rules, prohibited goods) |
| 8 | Quote form: email field required with placeholder "Quốc gia"; English labels; success message in English | Form asks route, weight, size, goods type, name, phone/Zalo; email optional; localized messages |
| 9 | WhatsApp link without country code; menu "Trang chủ" uses `http://`; logo link missing `https://` | Contact URLs built from `site_settings` helpers; absolute https |
| 10 | Two SEO plugins; meta descriptions auto-cut mid-sentence; Lorem descriptions | Hand-written SEO fields per locale, length-checked in admin |
| 11 | Schema hours (09–17) ≠ site hours; pages typed as `Article` | Correct JSON-LD per page type from DB |
| 12 | 309/330 images without alt | Alt text required (VI + EN) on upload |
| 13 | Google Maps iframe, carousels, multiple fonts on every page | Static map image + link; no above-the-fold carousel |
| 14 | No conversion tracking for Zalo/phone clicks | `/go/[channel]` tracking + dataLayer + server-side conversions |
| 15 | Username `admin` exposed via `/author/admin/`; public `/wp-json/` | No author archives; staff auth via Clerk |

## What to keep (brand recognition + proven content)

- Crimson **`#AC0C2E`** as the brand colour (used 125× — headings, footer, borders).
- Signature **hard offset shadow** `0 5px 0 1px #AC0C2E` on cards (41×) → evolved into token `shadow.brand-offset`.
- Card radius **20px** (86×).
- Condensed bold display headings (Barlow Condensed) — keep for display only.
- Real photos `SEE_5122…SEE_5184` (office/team), 2025 blog photos, customer chat screenshots (with consent + blur).
- Route page structure that works: reasons → price table → how prices are calculated (DIM /5000) → process → allowed/prohibited goods → carriers → FAQ → testimonials → quote CTA.
- The new-customer 10% offer block (if still valid).
- 2025 Singapore blog post (TOC, FAQ, internal links) as the model for blog articles.

## Legacy SEO data worth preserving

| Old URL | Rank Math focus keyword | Note |
| --- | --- | --- |
| `/` | gui hang di nuoc ngoai | SEO title "43 Logistics - Giải pháp gửi hàng đi nước ngoài tối ưu nhất" |
| `/dich-vu/gui-hang-di-singapore/` | gui hang di singapore | |
| `/dich-vu/gui-hang-di-malaysia/` | gui hang di Malaysia | |
| `/dich-vu/gui-hang-di-han-quoc/` | gui hang di han quoc | |
| `/dich-vu/gui-hang-di-dai-loan/` | Gui hang di Dai Loan | |
| `/gui-hang-di-thai-lan/` | gui hang di Thai Lan | |
| `/gui-hang-di-my/` | gui hang di my | |
| `/lien-he/` | lien he gui hang | |
| `/top-5-luu-y-gui-hang-sang-singapore/` | Gửi hàng sang Singapore | |
| `/mon-hang-khong-duoc-gui-sang-han-quoc/` | hàn quốc | |

Search Console data was not available — `NEEDS CONFIRMATION` which URLs actually rank before finalising slugs.
