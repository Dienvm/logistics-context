---
title: Count contacts and leads per week by channel, route, source
type: feature
status: approved
owner_repo: both
roadmap: A-07
priority: must-have
blocked_by_questions: []
updated: 2026-10-28
---

## Feature: Count contacts and leads per week by channel, route, source

### Problem Statement

Turning visitors into contacts is the site's first goal (AGENTS.md §1), and paid route traffic is the second. Every contact click is logged in `contact_events` (rule 12, S-02) and every quote request in `leads` (S-08, A-06), but nobody can see which channel, route or campaign produces contacts and won customers week by week without querying the database. The owner needs that to judge ads spend and CTAs.

Roadmap: **A-07 Contact analytics**: counts of `contact_events` + leads by channel/route/source per week.

A-06 shipped a defect that A-07 reuses and fixes here (owner decision 2026-10-28): `leads.referrer` and `contact_events.referrer` store a **bare host** (`attributionColumns` maps `43l_attr.referrer_host`; `modules/tracking/domain/attribution.ts` `referrerHost()`), but `deriveLeadSource()` and its SQL twin (`modules/leads/domain/lead-source.ts`, `infrastructure/admin-lead-filters.ts`) only match `scheme://host`, so a referrer-attributed lead shows "Trực tiếp". Rows without any attribution are also mislabelled "Trực tiếp": `43l_attr` exists only after a landing URL with utm/click parameters and is stored only with ads consent, so "no data" is not "direct".

### Proposed Solution

`/admin/analytics/` ("Thống kê liên hệ", sections `analytics`: `admin`, `sales`; `ADMIN_SECTIONS`, A-01) replaces `ComingSoon` with a server-rendered report (owner 2026-10-28: tables with CSS bars, no chart library, no CSV):

- **Period:** the last N weeks, N ∈ {4, 12, 26, 52} via `?weeks=` (default 12). A week runs Monday 00:00 to Sunday 24:00 Asia/Ho_Chi_Minh; the current week is included and marked "đang chạy".
- **View** via `?view=channel|route|source` (default `channel`), shown as links styled as tabs.
- **Metrics:** "Lượt bấm liên hệ" = `contact_events` rows; "Yêu cầu báo giá" = `leads` with `status <> 'spam'`; "Chốt đơn" = `leads` with `status = 'won'`, counted in the week the lead was **received** (not when it was won); "Tổng liên hệ" = clicks + quote requests.
- **Per view, two tables:**
  1. **Summary** over the period, one row per group: clicks, quote requests, won, total, with a CSS bar proportional to the total; sorted by total descending (ties: label).
  2. **Weekly**, one row per group, one column per week (newest first), cell = total (clicks + quote requests) for that group and week; empty weeks show 0. The table scrolls horizontally inside its container on narrow screens. Weekly cells deliberately show only the total, a narrowing of the roadmap wording "counts of `contact_events` + leads … per week" for readability; the split per metric is in the summary table.
- **Groups:**
  - `channel`: `zalo`, `call`, `whatsapp`, `messenger` (clicks only) and "Form báo giá" (quote requests and won only; clicks 0).
  - `route`: each route's VI name (inactive routes included), plus "Không theo tuyến" for `route_id is null`.
  - `source`: one shared source derivation for both tables (below).
- **Shared source derivation** (replaces A-06's lead-only one): a click ID wins (`gclid`/`gbraid`/`wbraid` → Google, `fbclid` → Facebook, `ttclid` → TikTok), else `utm_source` (`btrim`, lowercased), else the referrer host (a bare host, or the host of a `scheme://` URL; lowercased), else **`unknown`** ("Không rõ nguồn"). Filter keys become `click:{network}`, `utm:{value}`, `ref:{host}`, `unknown` (A-06's `direct` key is retired; an old `?source=direct` URL is ignored like any invalid parameter). The pure function and its SQL twin live together in one place and are used by the A-06 list, filter and CSV and by A-07.
- A short note under the source view explains that "Không rõ nguồn" means no attribution was stored with the click or request: the visitor never arrived through a link with campaign parameters or a click ID, or did not accept advertising cookies. Attribution is last-touch and kept in `43l_attr`, so a returning visitor's later clicks carry the source of their earlier campaign visit.

### Acceptance Criteria

- [ ] **AC-01 Access.** Given a signed-in `editor`, when they open `/admin/analytics/` (with any parameters), then they get 403 and no count is queried. `admin` and `sales` get the page; no session → `/admin/sign-in/`.
- [ ] **AC-02 Period.** Given `?weeks=` ∈ {4, 12, 26, 52} (default 12; any other value → 12), when the page opens, then it covers exactly that many Monday-start weeks in Asia/Ho_Chi_Minh ending with the current week; an event at Sunday 23:59:59 +07 counts in that week and one at Monday 00:00:00 +07 in the next.
- [ ] **AC-03 Channel view.** Given at least one click or lead in the period, when `view=channel` (default; an invalid `view` → `channel`), then the summary shows one row per channel `zalo`, `call`, `whatsapp`, `messenger` with its `contact_events` count, and a "Form báo giá" row with non-spam leads and won leads; all five rows appear, a channel with none shows 0; the clicks column sums to the `contact_events` rows in the period and the quote-request column to the non-spam leads in the period.
- [ ] **AC-04 Route view.** Given `view=route`, then each route that has at least one click or lead in the period is a row (VI name, else key), plus "Không theo tuyến" for rows without a route when there are any; per-row clicks, quote requests and won match SQL counts grouped by `route_id`.
- [ ] **AC-05 Source view.** Given `view=source`, then rows are the source keys present in the period, labelled "Google Ads", "Facebook Ads", "TikTok Ads", "utm: {value}", "Từ {host}", "Không rõ nguồn", with the counts per source; the explanatory note is shown.
- [ ] **AC-06 Shared source derivation.** Given attribution `{gclid, utm_source=newsletter}` → `click:google`; `{fbclid}` → `click:facebook`; `{utm_source=" Facebook "}` → `utm:facebook`; `{utm_campaign=x, referrer="zalo.me"}` → `ref:zalo.me`; `{referrer="https://Zalo.me/abc"}` → `ref:zalo.me`; nothing → `unknown`. The pure function and the SQL expression give the same key for each of these rows in both `leads` and `contact_events`.
- [ ] **AC-07 A-06 follows.** Given the A-06 inbox, when a lead has only a bare-host referrer, then the list, the detail page and the `source` filter options show and match `ref:{host}` ("Từ {host}"), and the CSV export gains a "Nguồn" column (after "Phụ trách", same label as the list) and includes the lead under `?source=ref:{host}`; a lead without attribution shows "Không rõ nguồn" and matches `source=unknown`; `?source=direct` is ignored.
- [ ] **AC-08 Weekly table.** Given the period, then the weekly table has one column per week (newest first, header = the Monday's date, current week marked "đang chạy"), one row per summary group, and each cell equals clicks + quote requests of that group in that week; each row's cells sum to its summary total.
- [ ] **AC-09 Bars and text.** Each summary row's bar width is its total ÷ the largest total in the table (0 → no bar), drawn with token colours; the number is always shown as text next to it and the bar is `aria-hidden`.
- [ ] **AC-10 Freshness and privacy.** Counts are computed in SQL per request (no `"use cache"`); the page shows only aggregates (no name, phone, email, message, IP hash, user agent or click ID values); spam leads are excluded before anything else, so they never count, never create a route or source row and never make a period non-empty.
- [ ] **AC-11 Empty period.** Given no clicks and no non-spam leads in the period (a spam-only period included), then every view shows one empty-state sentence instead of the two tables.

### Scope

**In scope:**
- `/admin/analytics/` report: period and view in the URL, summary + weekly tables, CSS bars, empty state, source note;
- one shared source derivation (pure + SQL) for `leads` and `contact_events`, the `direct` → `unknown` rename and the bare-host referrer fix, applied to A-06 (list, detail, filter, CSV);
- VI admin strings with EN parity (`admin.analytics.*`, updated `admin.leads.sources.*`);
- context: `06-architecture.md` permissions line for A-07; `05-seo-and-tracking.md` a sentence on how sources are derived for reporting; the `analytics` row in `.claude/rules/module-structure.md`.

**Out of scope:**
- CSV export of the report (owner 2026-10-28: later);
- a placement breakdown (`contact_events.placement`) and per-locale breakdowns;
- PostHog, GA4 or ad-platform data, spend, cost per contact; T-01/T-02 conversions;
- chart libraries or client-side charts; date pickers beyond the week presets;
- any change to how `/go/[channel]` or the lead form record events, or to `43l_attr`;
- new migrations (no schema change);
- automated tests (ADR 0004).

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | admin page | `app/admin/(shell)/analytics/page.tsx` (replaces `ComingSoon`; `requireSection("analytics")`, `instant = false`) |
| app | source derivation | `modules/tracking/domain/traffic-source.ts` (pure, moved from `modules/leads/domain/lead-source.ts`) + its SQL twin builder taking a table's attribution columns (e.g. `modules/tracking/infrastructure/traffic-source-sql.ts`), exported via `modules/tracking/index.ts` / `client.ts` |
| app | leads module | `modules/leads/infrastructure/admin-lead-filters.ts`, `admin-lead-queries.ts`, `application/admin-lead-schemas.ts`, `application/export-leads.ts` + `lead-export-route.ts` (new "Nguồn" CSV column), `ui/admin/lead-source-label.ts`, `constants.ts` (`LEAD_CSV_COLUMNS`); weekly lead counts by dimension (`infrastructure/lead-stats.ts`), exported from `index.ts` |
| app | contact module | weekly click counts by dimension (`modules/contact/infrastructure/contact-stats.ts`), exported from `modules/contact/index.ts` |
| app | analytics UI | a new `modules/analytics/` (`domain/` week buckets and merge of the two count sets, `ui/admin/*`, `index.ts`) composing the leads and contact entry points |
| app | routes | `listAdminRoutes()` (exists) for route names |
| app | i18n | `messages/vi.json`, `messages/en.json` (`admin.analytics.*`, `admin.leads.sources.*`) |
| context | docs | `docs/context/06-architecture.md` (A-07 permissions line), `docs/context/05-seo-and-tracking.md` (reporting source derivation), `.claude/rules/module-structure.md` (module table: `analytics` = reporting composition, no tables; ADR 0005 Decision 1) |

### Golden-rule checks

- **Rule 6:** counts only in module `infrastructure/` (server-only); the page passes plain numbers to server components; no client island needed.
- **Rule 7:** `requireSection("analytics")` first; no Server Action or route handler is added.
- **Rule 14:** aggregates only; no lead or click PII rendered; no new tracking from the report.
- **Rule 10:** tables with captions and header cells, bars `aria-hidden` with visible numbers, tab links ≥ 44 px with `aria-current="page"`, token colours.
- **Module rule (ADR 0005):** `analytics` imports `leads`, `contact`, `routes` only through their `index.ts`; `tracking` owns the shared source derivation and imports no business module.

### Dependencies & Risks

- Depends on: S-02 (`contact_events`, `/go`), S-08/S-08b (`leads`), A-01 (shell, `analytics` section), A-06 (inbox, source derivation). No stack gap. No new migration; A-06's `0012` (`lead_events`, `lead_exports`) was applied on Supabase 2026-10-28 and `pnpm db:local` applies it to the Docker DB.
- Open questions: none block the report. Q-13/Q-20 (ad platforms, PostHog) don't change these counts.
- Risk: most rows will be "Không rõ nguồn" (attribution needs campaign parameters and ads consent); the note says so, so the report isn't read as "no ads work".
- Risk: renaming `direct` → `unknown` changes A-06 URLs; old links lose only the source filter (ignored, AC-07).
- Risk: date bucketing in SQL vs JS must use the same time zone: buckets come from SQL `date_trunc('week', created_at at time zone 'Asia/Ho_Chi_Minh')`, and the week list is generated from the same Monday in Vietnam time.

### Manual Verification Plan

- **Seed (Docker DB, `pnpm db:local` + `pnpm dev:local`; local dev otherwise writes to the shared production Supabase, owner 2026-10-28):** a SQL fixture in the PR (not committed data). Timestamps are relative to **M** = Monday 00:00 Asia/Ho_Chi_Minh of the current week (computed in the script, `date_trunc('week', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh'`), so the fixture never drifts.

  | Row | Table | Channel / status | Route | Time | Attribution | Expected key |
  |---|---|---|---|---|---|---|
  | C1 | contact_events | zalo | sg | M+1d 10:00 | gclid, utm_source=newsletter | click:google |
  | C2 | contact_events | zalo | sg | M+1d 11:00 | fbclid | click:facebook |
  | C3 | contact_events | zalo | — | M+1d 12:00 | none | unknown |
  | C4 | contact_events | call | kr | M 00:00:00 | utm_source=" Facebook " | utm:facebook |
  | C5 | contact_events | call | — | M+2d | utm_campaign=x, referrer=zalo.me | ref:zalo.me |
  | C6 | contact_events | whatsapp | sg | M+2d | referrer=https://Zalo.me/abc | ref:zalo.me |
  | C7 | contact_events | zalo | sg | M − 1 s (Sunday 23:59:59) | none | unknown |
  | C8 | contact_events | call | sg | M − 12 weeks + 1d | none | unknown |
  | L1 | leads | new | sg | M+1d | gclid | click:google |
  | L2 | leads | won | sg | M+2d | utm_source=newsletter | utm:newsletter |
  | L3 | leads | contacted | — | M+3d | referrer=zalo.me | ref:zalo.me |
  | L4 | leads | quoted | kr | M − 5d | none | unknown |
  | L5 | leads | spam | sg | M+1d | fbclid | (excluded) |

  A second script empties both tables and inserts only one `spam` lead (spam-only period).

- **Expected (`weeks=12`; C8 falls outside, inside `weeks=26`):**
  - Channel summary (clicks / quotes / won / total): zalo 4/–/–/4 · call 2/–/–/2 · whatsapp 1/–/–/1 · messenger 0/–/–/0 · Form báo giá –/4/1/4. Weekly: current week zalo 3, call 2, whatsapp 1, messenger 0, form 3; last week zalo 1, form 1; all other weeks 0.
  - Route summary: sg 4/2/1/6 · Không theo tuyến 2/1/0/3 · kr 1/1/0/2.
  - Source summary: ref:zalo.me 2/1/0/3 · unknown 2/1/0/3 · click:google 1/1/0/2 · click:facebook 1/0/0/1 · utm:facebook 1/0/0/1 · utm:newsletter 0/1/1/1 (L5's fbclid adds nothing).
  - `weeks=26`: call 3, sg clicks 5, unknown clicks 3.
- **Steps (agent: database + logic; owner: browser):**
  1. As `editor`: `/admin/analytics/` and `/admin/analytics/?view=source&weeks=52` → 403; no stats query runs (code path).
  2. As `sales`, `/admin/analytics/`: the channel tables match the expected values; C4 counts in the current week and C7 in the last week (AC-02 edges).
  3. `?weeks=26` adds C8; `?weeks=7` behaves as 12; `?view=bogus` as `channel`.
  4. `?view=route` and `?view=source` match the expected summaries; the source note is visible.
  5. Weekly tables: 12 columns newest first, current week marked "đang chạy", each row's cells sum to its summary total.
  6. A-06: L3 shows "Từ zalo.me" in the list and detail and appears under `/admin/leads/?source=ref:zalo.me`; L4 shows "Không rõ nguồn" under `?source=unknown`; `?source=direct` shows the unfiltered list; the CSV of `?source=ref:zalo.me` has one row with "Nguồn" = "Từ zalo.me".
  7. Spam-only script → every view shows the empty-state sentence.
  8. Returning visitor (`pnpm dev:local`, accept ads cookies): open `/?utm_source=test`, then `/` without parameters, click a Zalo CTA → the new `contact_events` row is `utm:test`, not `unknown`.
  9. Tracking guard: the diff leaves `modules/tracking/application/attribution-columns.ts`, `modules/contact/application/record-contact-event.ts` and `modules/leads/application/submit-lead.ts` unchanged, and none of them imports the new source derivation; re-run the consent-matrix rows for `/go/[channel]` and the lead form (ADR 0004 Decision 2).
  10. **Owner, browser** (phase-2 admin rule): 360/768/1280 px (weekly table scrolls inside its container, no page scroll), keyboard over the view tabs and period links, axe at 360 and 1280 px with no serious/critical issues.
- **Validation commands:** `lint`, `typecheck`, `check:boundaries`, `build`, `i18n:check`, `check:redirects`. No Lighthouse/SEO on admin pages (ADR 0009, phase-2 admin rule).

### Implementation Hints

- Follow the A-06 admin pattern: `instant = false`, uncached reads after `requireSection`, URL params parsed by a Zod schema with `.catch()` defaults.
- One SQL per table per view: `select <group key>, date_trunc('week', created_at at time zone 'Asia/Ho_Chi_Minh') as week, count(*) … group by 1, 2`, plus `count(*) filter (where status = 'won')` for leads; merge in a pure `analytics/domain` function that also fills empty weeks with 0. The week list comes from one pure function given "now" and N.
- The SQL twin builder takes the table's columns (`{ gclid, gbraid, wbraid, fbclid, ttclid, utmSource, referrer }`) so `leads` and `contact_events` share one expression; referrer host = `coalesce(substring(referrer from '^[A-Za-z][A-Za-z0-9+.-]*://([^/?#:@]+)'), referrer)`, `btrim`, lowercased; the pure twin does the same.
- A-06 lesson: specs miss files a renamed enum/key threads through. `direct` appears in `lead-source.ts`, `admin-lead-schemas.ts` (`parseLeadSourceKey`), `lead-source-label.ts`, `messages/*` (`admin.leads.sources.direct`); grep for `"direct"` and `sources.direct` before finishing. Run `lint:fix` on changed files only (s08 lesson).

### Related

- Roadmap A-07; AGENTS.md §1, rules 12 and 14.
- `specs/feature-a06-leads-inbox.md` (AC-02/AC-03 source derivation, superseded in detail by AC-06/AC-07 here); `specs/feature-s02-*` / `docs/context/05-seo-and-tracking.md` "Attribution" and `/go/[channel]`.
- `docs/context/06-architecture.md` Permissions; `docs/context/07-data-model.md` `contact_events`, `leads`.
- ADR 0004 (no tests), ADR 0005 (modules), ADR 0009 (admin N/A for Lighthouse).
- Lessons: `lessons/2026-10-23-s08-lead-form.md`.
