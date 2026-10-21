# 09 — Migration from WordPress

## Inputs available

| Input | Where | Notes |
| --- | --- | --- |
| Database dump (MariaDB 10.11, 2026-10-18) | Kept by the owner (NOT in this repo — contains user hashes and leads) | Active prefix `wpiw_`; ignore `wp_*` tables |
| Legacy page copy | `docs/context/legacy-copy/*.md` | Extracted from `post_content`; verbatim, unverified |
| Media list | `data/media-inventory.csv` | 330 rows; `action = migrate` for 175 used files |
| Redirect map | `data/redirect-map.csv` | 63 rows |
| Seed data | `data/seed/routes.legacy.json`, `data/seed/site-settings.legacy.json` | Prices/transit from 2023–2025 pages, `is_verified: false` |
| Design tokens | `data/design-tokens.json` | `current` + `proposed` |
| Uploads folder | Ask hosting for a zip of `wp-content/uploads` | Needed for original images (live site can also be fetched over HTTPS) |
| Public REST API | `https://43logistics.vn/wp-json/wp/v2/` (public at analysis time) | For cross-checking only; will be 410 after launch |

Security: never commit the SQL dump, `wp-config.php`, or exported leads. The old leads (12 rows) can be imported into `leads` only if the business wants them; they contain personal data.

## Mapping WordPress → new model

| WordPress | New |
| --- | --- |
| Page 580 (front page) | `pages(key='home')` |
| Pages 705, 834, 836, 837, 3596, 851, 838 | `routes` (sg, my, kr, tw, jp, th, us) + `pages(type=route_outbound)` + translations |
| Page 866 | `routes(sg-vn)` + `pages(type=route_inbound)` |
| Page 666 `/dich-vu/` | `pages(key='hub-outbound')` (rewritten) |
| Page 857 + landing 858 `/nhap-hang/` | `pages(key='hub-inbound')` (new content) |
| Pages 651, 674 | `about`, `contact` (rewritten) |
| Pages 832, 855, 867, 868 | Dropped (410 / 301 per CSV) |
| Posts 3587, 3570 | `posts` (+ VI translations, slugs unchanged under `/kinh-nghiem/`) |
| Post 694 | Merged into 3587 content, 301 |
| Elementor `price-list` widgets | `route_rates` rows |
| Elementor `toggle`/`accordion` (FAQ) | `faqs` |
| Elementor `testimonial`/`reviews` (real names only; drop "John Doe") | `testimonials` with `consent_at = null` (hidden until consent) |
| Rank Math `rank_math_title/description/focus_keyword` | `seo_title`, `seo_description`; focus keyword into an admin-only note |
| Attachments (`_wp_attached_file`, `_wp_attachment_image_alt`) | `media` + `media_translations` |
| Menu "Company" (15 items) | Replaced by the new IA (`03-information-architecture.md`) |
| `site_settings` (contacts, hours, offices) | From `01-business.md` after confirmation |
| Users | Not migrated — staff are invited in Clerk |

## Steps

1. **Freeze** WordPress edits; keep the DB dump + uploads zip in secure storage.
2. **Seed** structure: `pnpm db:migrate && pnpm db:seed` (routes, rates unverified, settings placeholders, pages for the IA, menus).
3. **Import script** `scripts/import-wordpress.ts` (optional, idempotent, keyed by `legacy_wp_id`):
   - read from a local MySQL/MariaDB restore of the dump (or from the SQLite conversion used in the analysis);
   - parse `_elementor_data` JSON for price lists, FAQs, testimonials; parse `post_content` HTML → markdown blocks for blog posts;
   - write rows as `draft` — nothing auto-publishes.
4. **Media:** for each `media-inventory.csv` row with `action = migrate`: download, convert (sharp → WebP + AVIF, max 2560 px), upload to `media/uploads/YYYY/MM/<original-name>.webp`, keep `legacy_url`; generate alt VI/EN (human-reviewed). Banners/tiles with baked-in text are **not** migrated — they are redesigned.
5. **Rewrite content** using `legacy-copy/*.md` as raw material: fix facts with the owner, unique copy per route (Taiwan ≠ Japan), remove competitor link, fix typos, add EN.
6. **Redirects:** load `data/redirect-map.csv` into `next.config.ts` `redirects()` + `proxy.ts` (410, legacy IDs) and the `redirects` table.
7. **Staging QA** (all must pass):
   - `pnpm check:redirects` against staging: every CSV row returns its status, single hop, correct `Location`;
   - crawl staging (Screaming Frog): no 404, one H1 per page, canonical self, hreflang reciprocal, JSON-LD valid;
   - Lighthouse mobile on home, 2 route pages, 1 LP;
   - GTM preview: all dataLayer events; Meta/TikTok test events received with matching `event_id`;
   - lead form → row in `leads` + sales notification.
8. **Go-live:** switch DNS to the new host (same domain — no Change of Address needed), keep `https://43logistics.vn` canonical, submit `/sitemap.xml` in Search Console, request indexing for P0 pages.
9. **Post-launch (4 weeks):** daily Search Console coverage/404 review, `redirects.hits` review, fix any missing mapping; keep WordPress backup offline for 3 months, then delete hosting.

## Media inventory columns (`data/media-inventory.csv`)

`id` (WP attachment ID) · `url` (old public URL) · `mime` · `width` · `height` · `filesize_kb` · `alt` (old alt, mostly empty) · `title` · `used_on` (pages that reference it; `[header]`/`[footer]` = global) · `action` (`migrate` | `skip`).

Key assets: logo `2023/10/Thiet-ke-chua-co-ten-8.png` (300×300 PNG — request a vector original), favicon `2024/01/cropped-z5039520950134_….jpg`, real photos `SEE_5122/5123/5124/5157/5184`, 2025 blog photos, customer chat screenshots `2023/11/z49051069*.jpg` (consent + blur).
