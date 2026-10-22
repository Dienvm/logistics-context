---
title: Build the outbound and inbound hub pages
type: feature
status: approved
owner_repo: both
roadmap: S-06
priority: must-have
blocked_by_questions: [Q-04, Q-05, Q-25]
updated: 2026-10-22
---

## Feature: Build the outbound and inbound hub pages

### Problem Statement

`/dich-vu/` (`/en/services/`) and `/nhap-hang/` (`/en/ship-to-vietnam/`) 404 today, yet several things point at them:
- the header items "Gửi hàng đi" and "Nhận hàng về VN";
- the mega menu's "Xem tất cả tuyến gửi hàng";
- four rows of `data/redirect-map.csv`.

Roadmap S-06 asks for the two hubs with comparison tables (`03` "Hubs": comparison table of all routes in that direction, intro, FAQ, CTA).

### Owner decisions (in session, 2026-10-22)

- **Layout:** follow quynam.vn's `/dich-vu/` service list (structure only), styled like the S-05b home page.
- **Prices up front:** "push the cost per route".
- **Publishing:** both hubs in VI and EN via owner confirmation (`data/owner-confirmations.json` `pages` + `pnpm db:confirm`).
- **Intro copy:** neutral copy, approved with this request.
- **Process:** phase 1, so UI first: no Codex, no Lighthouse or browser runs in the implementation PR.

### Proposed Solution

A visitor opening a hub sees:

1. **Hero:**
   - breadcrumb `Trang chủ › {hub}`;
   - H1 "Gửi hàng đi nước ngoài" / "Nhận hàng về Việt Nam" (DB `h1` once an editor sets one, else messages);
   - a short intro;
   - Zalo + "Gọi {hotline}" CTAs (`placement=hero`).
2. **Route cards:** one per active route in that direction, in sort order, using the S-05b photo tile but larger:
   - destination photo (flag fallback);
   - flag + name;
   - the from-price as the headline ("Từ 57.000 đ/kg");
   - transit days and methods;
   - a "Xem bảng giá" link to the route page.

   Prices and days follow the S-01 fact rule (hidden, "Liên hệ", or badged in preview).
3. **Comparison table:** route, from-price, days, methods and link for every route in that direction (`<table>` from 768 px, cards below), same fact rule.
4. **FAQ:** published `faqs` with `page_id` = the hub. Hidden while there are none.
5. **Closing band** with the offices (S-05b).

The route page breadcrumb gains the hub crumb (`Trang chủ › Gửi hàng đi nước ngoài › Singapore`) when the hub is published (deferred in S-04).

### Acceptance Criteria

- [ ] `/dich-vu/`, `/en/services/`, `/nhap-hang/` and `/en/ship-to-vietnam/` render with 200 once the hubs are confirmed.
  - A draft hub is a 404.
  - Route pages keep working on the same `[slug]` segment.
- [ ] `data/owner-confirmations.json` `pages` gains `hub-outbound` and `hub-inbound`; `pnpm db:confirm` publishes them with their translations.
- [ ] One `<h1>`.
- [ ] `generateMetadata`:
  - DB SEO fields, else the `05` hub patterns ("Gửi hàng đi nước ngoài – bảng giá các tuyến" / "International Shipping from Vietnam – Rates by Country", plus an inbound equivalent);
  - canonical self;
  - hreflang only when both locales are published.
- [ ] Breadcrumbs + `BreadcrumbList`, and an `ItemList` JSON-LD of the route pages listed (name + URL).
- [ ] The cards and the table show only active routes of the hub's direction that have a route page. Prices and days are hidden or "Liên hệ" for unverified routes in production; nothing hidden reaches HTML or RSC.
- [ ] Route pages show the hub crumb when the hub for their direction is published.
- [ ] Every new string is in VI and EN; `pnpm i18n:check` passes. No new client JS.
- [ ] `pnpm lint`, `typecheck`, `check:boundaries`, `build` pass. CI `verify` (with `check:redirects` and `perf:report`) passes.

### Scope

**In scope:**
- the hub template on the existing `[slug]` route;
- hub query and resolver;
- route cards and comparison table;
- metadata, JSON-LD and breadcrumbs;
- the hub crumb on route pages;
- owner confirmation entries;
- messages.

**Out of scope:**
- route page content from the legacy pages (S-04b, next spec);
- a separate price-list page (`/bang-gia/`);
- FAQ copy (none seeded);
- admin editing (A-03).

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | page | `app/[locale]/(site)/[slug]/page.tsx` (dispatch route page / hub / 404; static params incl. hub slugs) |
| app | module content | `modules/content/constants.ts` (hub keys → direction), `domain/hub-page.ts`, `infrastructure/route-page-queries.ts` (hub records, hub FAQs), `application/load-hub-page.ts`, `ui/hub/*`, `index.ts` |
| app | module pricing | `ui/hub-route-cards.tsx`, `ui/hub-compare-table.tsx`, `index.ts` |
| app | module seo | `domain/hub-json-ld.ts`, `application/hub-metadata.ts`, `ui/hub-json-ld.tsx`, `index.ts` |
| app | data / messages | `data/owner-confirmations.json`, `messages/{vi,en}.json` (`hubPage.*`) |
| context | doc | `docs/context/03-information-architecture.md` (hubs as built) |

### Golden-rule checks

- **1–2:** prices and days come only from `route_rates`/`routes` via the S-01 rule; the copy has no numbers.
- **4:** one H1, metadata, JSON-LD, breadcrumbs, Zalo CTA.
- **8:** server only, `StaticImage`.
- **12:** CTAs through `/go`.
- **13:** the four hub redirect rows resolve.

### Dependencies & Risks

- **Depends on:** S-01, S-04 (`[slug]` segment, route tiles, `db:confirm` pages), S-05b.
- **Blocked by questions:**
  - Q-04 / Q-25: prices "Liên hệ" where unverified;
  - Q-05: the inbound hub lists only SG→VN (`my-vn`/`th-vn` stay inactive).
- **Risk:** `[slug]` now serves two page types; the dispatch must 404 anything that is neither.

### Manual Verification Plan

Deferred to the verification step (owner, phase 1). It will cover:
- the four hub URLs, both locales;
- a hub set back to draft → 404;
- an unverified route shows "Liên hệ" with no price in HTML/RSC;
- the route page breadcrumb has the hub crumb;
- axe at 360/1280;
- Lighthouse.

**Validation commands now:** `lint`, `typecheck`, `check:boundaries`, `build` (local DB after `db:seed && db:confirm`), `i18n:check`. CI runs `check:redirects` and `perf:report`.

### Related

- Roadmap S-06; `03` "Hubs"; `05` metadata patterns and JSON-LD (Hubs: `ItemList` + `BreadcrumbList`).
- Specs: `feature-s04-route-page-template.md`, `feature-s05b-home-redesign.md`.
- Next: `feature-s04b-route-page-content.md`.
