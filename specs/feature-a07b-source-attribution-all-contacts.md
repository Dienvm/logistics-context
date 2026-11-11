---
title: Attribute every contact and visit to its entry source
type: feature
status: draft
owner_repo: both
roadmap: A-07b
priority: must-have
blocked_by_questions: [Q-17]
updated: 2026-11-11
---

## Feature: Attribute every contact and visit to its entry source

### Problem Statement

The owner wants to know which acquisition source (Google search, Google Ads, AI assistants, Facebook, Zalo, TikTok, referrals…) produces the visitors who **contact** 43 Logistics, so sales strategy and ad spend follow the sources that actually work (owner, 2026-11-11). AGENTS.md §1 goal 1 (contacts) and goal 2 (ranking, GEO, paid traffic) both depend on it.

A-07 (`/admin/analytics/`) already counts every `/go/[channel]` click and every quote request by channel, route and source, and G-05's AI group is built (43logistics.vn PR #80). But almost every row is "Không rõ nguồn", for two reasons in the code:

1. `extractAttribution()` (`modules/tracking/domain/attribution.ts`) returns `null` unless the landing URL carries a utm or click-ID parameter. A visit from google.com, chatgpt.com (without utm), zalo or facebook organic is never captured, even with consent.
2. `43l_attr` is written and read only when `43l_consent` grants ads (`attribution-cookie.ts:87-101`, `record-contact-event.ts:80-81`, `submit-lead.ts:86,100-102`). Most visitors don't grant it.

Three further gaps: there is no count of **visits** per source, so no conversion rate; most customers chat on Zalo after a click, so the inbox has no record a salesperson can tag with "how they found us" or mark won; and the quote form doesn't ask how the visitor heard of the company.

Roadmap: **A-07b Source attribution for every contact** (new row, owner 2026-11-11), which also takes over G-05's classifier scope (G-05 keeps only the prompt panel).

### Owner decisions (2026-11-11)

| # | Decision |
| --- | --- |
| D1 | **Cookieless capture.** The entry source (external referrer host, `utm_source`/`utm_medium`/`utm_campaign`, landing path) is held **in page memory only**, with no cookie, `localStorage`, `sessionStorage` or third-party request. It is sent to our own server only inside a request the visitor makes anyway (the `/go` click, the quote form submit). Click IDs (`gclid`, `gbraid`, `wbraid`, `fbclid`, `ttclid`) stay ads-consent-gated in `43l_attr`, as today. A reload keeps it (`document.referrer` survives a reload); a new tab or a typed URL loses it. |
| D2 | **Server-side visit counts.** The server counts entry page views per day × site × source key × landing path in an aggregate table. No IP, user agent, cookie or row per visitor is stored. Excluded: bots, prefetch and RSC requests, `/admin`, `/api`, `/go`, static files, redirects and 410s. |
| D3 | **Self-reported source** on the quote form: one optional question, "Bạn biết 43 Logistics qua đâu?". |
| D4 | **Sales-tagged source** in the A-06 inbox: sales can set the source the customer named, per lead. |
| D5 | **Staff-created leads.** Sales can create a lead in the inbox for a customer who chatted or called directly. Fields: channel, self-reported source, route, name/phone, note. The lead goes through the normal status workflow up to "Chốt đơn". |
| D6 | **Report.** Compact source groups with per-host drill-down, a source × channel matrix, a landing-page view and CSV export of the view on screen. |
| D7 | **Site scope.** The work lands in `projects/43logistics.vn/` (the `site` column is already on `leads`/`contact_events`). AV/GT receive it when their forks are ported (ADR 0012). The report filters by site. |
| D8 | **Bot filter:** document requests only, no prefetch, no bots, no admin (D2). AI crawlers stay in the Caddy crawler log (G-04). |

### Proposed Solution

#### 1. Entry-source capture (client, tiny)

- New client-safe module file `modules/tracking/application/entry-source.ts`, exported from `modules/tracking/client.ts`. On first evaluation in the browser it reads `document.referrer` and `location` **once** and keeps the result in a module-level constant:
  - `ref`: the referrer **hostname** when it is http(s) and not one of the site's own hosts (from `NEXT_PUBLIC_SITE_URL`'s host, the `www.` form included); otherwise absent.
  - `us`, `um`, `uc`: `utm_source`, `utm_medium`, `utm_campaign` from the landing URL (trimmed, ≤ 150 bytes each via the existing `fitToBudget`). `utm_term`/`utm_content` are not sent.
  - `lp`: the landing pathname (≤ 150 bytes).
  - `cap`: `1`, which marks that capture ran. A row with `cap` and no `ref`/`us` is "direct"; a row without `cap` is "unknown" (old client, JS failed, link opened from outside).
- App Router soft navigations don't re-evaluate the module, so the value survives in-site navigation. The module is imported by the global consent island (always mounted), so it evaluates on the landing page, not later on a page that happens to render a contact link.
- `ContactLink` (`modules/contact/ui/contact-link.tsx`) appends these as query parameters to the `/go` href at click time, next to `eid` (`goHref()` + `GO_PARAMS` in `modules/contact/constants.ts`). The lead form (`modules/leads/ui/lead-form.tsx`) sends them as hidden inputs.
- Budget: the capture is ≤ 1 KB gz of app JS on every route (ADR 0006).

#### 2. Server recording

- `handleGoRequest` / `recordContactEvent` and `submitLead` parse the entry params with one shared Zod schema (`entrySourceSchema`, `modules/tracking`):
  - hostnames match `^[a-z0-9.-]{1,150}$` after lowercasing;
  - utm values pass `fitToBudget`;
  - `lp` starts with `/`;
  - an invalid value is dropped on its own, and the click or lead is still recorded.
- **Precedence per row:** when ads consent is granted and `43l_attr` decodes, the cookie's attribution is used, exactly as today. Otherwise the session params fill `referrer`, `utm_source`, `utm_medium`, `utm_campaign` and `landing_path`. Click-ID columns are never filled from session params.
- New columns on `contact_events` and `leads`:
  - `attribution_basis` (enum `cookie | session | none`): which path filled the row.
  - `in_app` (enum `zalo | facebook | messenger | instagram | tiktok | line`, nullable): derived server-side from the request user agent by a new pure `inAppBrowser(userAgent)` in `modules/tracking/domain/in-app-browser.ts`, next to `bot.ts`.

#### 3. Source key and groups

- `deriveTrafficSource` and its SQL twin `trafficSourceKeySql` (`modules/tracking/domain/traffic-source.ts`, `infrastructure/traffic-source-sql.ts`) gain two keys. The new order:
  1. click ID → `click:{network}`
  2. AI host or AI `utm_source` → `ai:{assistant}`
  3. `utm_source` → `utm:{value}`
  4. referrer host → `ref:{host}`
  5. `in_app` → `app:{name}`
  6. `attribution_basis = 'session'` with nothing above → `direct`
  7. otherwise → `unknown`
- The `direct` key returns with a new meaning: capture ran and there was no external referrer. A-07 retired the old meaning ("no data"). An old `?source=direct` URL now selects the new `direct` rows.
- A new pure `sourceGroup(key)` in `modules/tracking/domain/source-group.ts` maps a key to one of these groups:

  | Group | Label |
  | --- | --- |
  | `google_ads` | Google Ads |
  | `google_search` | Google tìm kiếm |
  | `ai` | Trợ lý AI |
  | `facebook` | Facebook |
  | `zalo` | Zalo |
  | `tiktok` | TikTok |
  | `youtube` | YouTube |
  | `other_search` | Bing / Cốc Cốc / khác |
  | `other_site` | Trang khác |
  | `campaign` | Chiến dịch khác (utm) |
  | `direct` | Gõ trực tiếp / dấu trang |
  | `unknown` | Không rõ nguồn |

  It also has a SQL twin. Hosts and utm values match by suffix (`google.*` search hosts, `l.facebook.com`, `m.facebook.com`, `zalo.me`, `chat.zalo.me`, `youtube.com`, `bing.com`, `coccoc.com`). The host lists are constants in `modules/tracking/constants.ts`, with a short comment on each.

#### 4. Visit counts

- New table `site_visits`: `site`, `day` (date in Asia/Ho_Chi_Minh), `source_key` (text, the same key as above), `landing_path`, `locale`, `count` (int).
  - Primary key: `(site, day, source_key, landing_path)`. RLS on, no policies.
  - Rows are upserted with `count = count + 1`. Nothing per visitor is stored.
- **Where it is counted:** in `proxy.ts`, only on the next-intl pass-through branch of `planRequest`, for an **entry request**, defined as all of the following:
  - `GET`;
  - `Sec-Fetch-Dest: document`, or no Sec-Fetch headers and an `Accept` that includes `text/html`;
  - no `Next-Router-Prefetch`, `RSC`, `Purpose: prefetch` or `Sec-Purpose: prefetch` header;
  - not a bot user agent (`isBotUserAgent`);
  - the `Referer` is absent or external, so internal navigation with a full page load is not counted.
- The source key is derived with the same pure functions from the `Referer` host, the URL's `utm_*`, the user agent's `in_app`, and the basis `session`. Click IDs in the URL map to `click:{network}`; this counting stores no click-ID value.
- The write runs after the response through `event.waitUntil` (`NextFetchEvent`) via a new server-only entry `modules/tracking/visits.ts` (`recordVisit`).
  - The ADR (Dependencies) authorizes this one `proxy.ts` → server-only import and the matching `check:boundaries` rule exception.
  - A DB error is swallowed with one fixed log message (no values, rule 14). It never changes the response.
- A full reload sends the same external `Referer` again and is counted again. This over-count is accepted and documented in the report note.

#### 5. Self-reported and sales-tagged source

- Shared enum `reported_source`, defined once in `db/enums.ts` and `modules/leads/constants.ts`:

  | Value | Label |
  | --- | --- |
  | `google` | Google |
  | `ai` | ChatGPT / trợ lý AI |
  | `facebook` | Facebook |
  | `zalo` | Zalo |
  | `tiktok` | TikTok |
  | `youtube` | YouTube |
  | `referral` | Người quen giới thiệu |
  | `returning` | Khách cũ |
  | `other` | Khác |

  VI/EN labels go in `messages/*`.
- **Quote form:** an optional native `<select name="heardFrom">` labelled "Bạn biết 43 Logistics qua đâu?" (EN "How did you hear about us?"), with an empty first option. Stored in `leads.self_reported_source`.
- **Inbox detail** (`app/admin/(shell)/leads/[id]/`): `admin`/`sales` can set or clear `leads.sales_source` through `setLeadSourceAction`. Each change appends a `lead_events` row of a new kind `source`, with `from_source`/`to_source` text columns. The list and the CSV gain a "Nguồn khách nói" column, which shows `sales_source` if set, else `self_reported_source`.

#### 6. Staff-created leads

- New column `leads.origin` (enum `web_form | staff`, default `web_form`) and `leads.contact_channel` (enum `zalo | call | whatsapp | messenger | walk_in | other`, nullable; required when `origin = 'staff'`).
- A "Thêm khách" button on `/admin/leads/` (`admin`, `sales`) opens `/admin/leads/new/`. Its form has:
  - channel (required);
  - customer's source (`sales_source`, required);
  - route (optional);
  - name (required);
  - phone (optional; Zalo-only customers may have none);
  - note (optional).
- `createStaffLeadAction` (Zod, `requireRole(['admin','sales'])`) inserts the lead:
  - `origin = 'staff'`, `status = 'contacted'`, `assigned_to` = the creator;
  - `attribution_basis = 'none'`, `site` = the target site;
  - `consent_at` null and no IP hash or user agent.
- `leads.consent_at` becomes nullable, with the check constraint `origin = 'staff' OR consent_at IS NOT NULL`. The legal basis (handling a customer's own enquiry, PDP Law 91/2025) is recorded in the ADR.
- Staff leads are excluded from the "Yêu cầu báo giá" (form) metric. They count in their own metric.

#### 7. Report (`/admin/analytics/`)

- **Filters:** `?site=all|43l|av|gt` (default `all`), next to the existing `?weeks=` (4/12/26/52) and `?view=`.
- **Views**, `?view=`:

  | Value | Content |
  | --- | --- |
  | `group` (new default) | Summary by source group. Each row expands, through a `<details>` element (no JS), to its source keys ("Từ chatgpt.com", "utm: newsletter"…). |
  | `matrix` | Source group × channel, with columns `zalo`, `call`, `whatsapp`, `messenger`, Form, Sale tạo, Tổng. |
  | `landing` | Landing path, top 50 by total. Contacts are attributed by `landing_path`; visits by `site_visits.landing_path`. |
  | `reported` | `coalesce(sales_source, self_reported_source)` across leads, with an "Chưa khai" row. |
  | `channel`, `route`, `source` | Kept as they are. |

- **Metrics** in the `group`, `source` and `landing` summaries:

  | Metric | Definition |
  | --- | --- |
  | Lượt vào | `sum(site_visits.count)` |
  | Lượt bấm liên hệ | Clicks, as today |
  | Yêu cầu báo giá | Form leads, non-spam |
  | Khách sale tạo | Staff leads |
  | Chốt đơn | Won leads, form and staff together |
  | Tổng liên hệ | Clicks + form leads + staff leads |
  | Tỉ lệ liên hệ | Tổng liên hệ ÷ Lượt vào, one decimal; "—" when Lượt vào is 0 |

- **Staff leads** have no measured source, so their placement in each view is fixed:

  | View | How a staff lead counts |
  | --- | --- |
  | `group`, `matrix` (rows) | By `sales_source` mapped to a group: `google` → `google_search`, `ai` → `ai`, `facebook`/`zalo`/`tiktok`/`youtube` → the same-named group. `referral`, `returning` and `other` get three extra group rows: "Giới thiệu", "Khách cũ", "Khác (sale ghi)". |
  | `matrix` (columns), `channel` | By `contact_channel`, in the "Sale tạo" metric. |
  | `reported` | By `sales_source`. |
  | `source`, `landing` | Not counted (no measured source). |
- **CSV:** `GET /admin/analytics/export/?{same params}` (`requireRole(['admin','sales'])`) returns the current view's summary as CSV (UTF-8 BOM, the A-06 `domain/csv.ts` helper). Aggregates only, so it isn't logged in `lead_exports`.
- The note under the report explains the following:
  - session capture is lost on a new tab;
  - a reload counts as a new visit;
  - Google AI Overviews look like Google search;
  - Gemini and many apps send no referrer;
  - so the self-reported view is the cross-check.

### Acceptance Criteria

**Capture and recording**

- [ ] **AC-01 Session capture.** Given a fresh page load of `/gui-hang-di-singapore/?utm_source=chatgpt.com` with referrer `https://chatgpt.com/`, consent rejected, when the visitor soft-navigates to `/tinh-cuoc/` and clicks the Zalo CTA, then the `/go/zalo/` request carries `ref=chatgpt.com&us=chatgpt.com&lp=/gui-hang-di-singapore/&cap=1`. The new `contact_events` row has:
  - `referrer = 'chatgpt.com'`, `utm_source = 'chatgpt.com'`, `landing_path = '/gui-hang-di-singapore/'`;
  - `attribution_basis = 'session'`, every click-ID column null, `ads_consent = false`;
  - in the report, source `ai:chatgpt`, group "Trợ lý AI".
- [ ] **AC-02 No storage, no third party.** Given consent rejected or not yet chosen, when a visitor lands from google.com and browses three pages, then DevTools → Application shows no new cookie, `localStorage` or `sessionStorage` key. The Network panel shows no request to a host other than the site's own (apart from what ADR 0004's matrix already allows). The consent matrix (ADR 0004) re-run passes unchanged for GTM, Cloudflare and `43l_attr`.
- [ ] **AC-03 Cookie precedence.** Given ads consent granted and a landing with `?gclid=x&utm_source=google`, when the visitor clicks WhatsApp, then the row has `attribution_basis = 'cookie'`, `gclid = 'x'` and source `click:google`, as today. Given ads consent **rejected** and the same landing, then `gclid` is null, `utm_source = 'google'` and the basis is `session`.
- [ ] **AC-04 Own host and direct.** Given a landing with no referrer (typed URL), when the visitor submits the quote form, then the lead has `attribution_basis = 'session'`, `referrer` null and source `direct` ("Gõ trực tiếp / dấu trang"). Given a `/go/zalo/` request with no entry params (old cached page, link opened from outside), then the basis is `none` and the source is `unknown`. Given a referrer of `https://43logistics.vn/...` or `https://www.43logistics.vn/...`, then `ref` is not sent.
- [ ] **AC-05 Invalid params.** Given `/go/call/?ref=<script>&us=` followed by 400 bytes, then the redirect is still a 302, the row is inserted, `referrer` is null and `utm_source` is cut to ≤ 150 bytes. No error reaches the visitor.
- [ ] **AC-06 In-app browser.** Given a user agent containing `Zalo` (Zalo in-app) and no referrer, then the row's `in_app = 'zalo'` and the source is `app:zalo`, group Zalo. `FBAN`/`FBAV` → `facebook`, `Instagram` → `instagram`, `musical_ly`/`TikTok` → `tiktok`, `Line/` → `line`. A desktop Chrome user agent → null.
- [ ] **AC-07 Classifier parity.** For each row in the spec's table below, the TS `deriveTrafficSource` + `sourceGroup` and the SQL twins give the same key and group, in both `leads` and `contact_events`. The reviewer runs one SQL `SELECT` on `db:local` with literal rows and compares it by hand (ADR 0004).

  | Row | Key | Group |
  | --- | --- | --- |
  | `{gclid, ref:google.com}` | `click:google` | `google_ads` |
  | `{ref:www.google.com.vn}` | `ref:www.google.com.vn` | `google_search` |
  | `{us:chatgpt.com}` | `ai:chatgpt` | `ai` |
  | `{ref:l.facebook.com}` | `ref:l.facebook.com` | `facebook` |
  | `{in_app:zalo}` | `app:zalo` | `zalo` |
  | `{ref:coccoc.com}` | `ref:coccoc.com` | `other_search` |
  | `{us:newsletter}` | `utm:newsletter` | `campaign` |
  | `{ref:vnexpress.net}` | `ref:vnexpress.net` | `other_site` |
  | `{basis:session}` | `direct` | `direct` |
  | `{}` | `unknown` | `unknown` |

**Visits**

- [ ] **AC-08 Visit counted once per entry.** Given a document `GET /gui-hang-di-han-quoc/` with `Referer: https://www.google.com/` and a mobile Safari user agent, then `site_visits` gains or increments `(43l, today +07, 'ref:www.google.com', '/gui-hang-di-han-quoc/')` by exactly 1. A following soft navigation (RSC request) and a full-load internal link (internal Referer) add nothing.
- [ ] **AC-09 Visit exclusions.** No `site_visits` change for any of these:
  - a request with `Next-Router-Prefetch: 1` or `Sec-Purpose: prefetch`;
  - user agent `Googlebot/2.1` or `GPTBot/1.0`;
  - `/admin/…`, `/api/…`, `/go/…`, `/_next/…`, `/robots.txt`;
  - a legacy URL that 301s, or a retired path that returns 410;
  - a `HEAD` request.
- [ ] **AC-10 Visits never break pages.** Given the database unreachable, when a visitor opens a page, then the page renders normally and the server log has one fixed message with no request values. `site_visits` stores no IP, user agent, cookie or click-ID value (schema review).

**Self-report and staff leads**

- [ ] **AC-11 Form question.** Given `/tinh-cuoc/` (VI) and `/en/shipping-calculator/` (EN), then the form shows the optional labelled select with the 9 options in that locale, keyboard-operable with a visible focus ring. Submitting with "Người quen giới thiệu" stores `self_reported_source = 'referral'`. Submitting with no choice stores null. A tampered value (`heardFrom=x`) returns a field error.
- [ ] **AC-12 Sales tag.** Given a `sales` user on a lead detail page, when they set "Nguồn khách nói" to Facebook and later to TikTok, then `leads.sales_source = 'tiktok'`, two `lead_events` rows of kind `source` (`null→facebook`, `facebook→tiktok`) appear in the timeline, and the list and CSV show "TikTok". An `editor` gets 403 from the action.
- [ ] **AC-13 Staff lead.** Given a `sales` user, when they create a lead with channel Zalo, source "Khách cũ", name only and route Hàn Quốc, then the row has `origin = 'staff'`, `contact_channel = 'zalo'`, `status = 'contacted'`, `assigned_to` = them, `consent_at`/`ip_hash`/`user_agent` null and the target `site`. It appears in the inbox with an "Sale tạo" badge. Missing channel, source or name returns field errors. An `editor` gets 403 for both `/admin/leads/new/` and the action. The DB rejects a `web_form` row with null `consent_at` (check constraint).

**Report**

- [ ] **AC-14 Group view.** Given `view=group` (the new default), then each present group is a row with the seven metrics from §7. The clicks column sums to the `contact_events` rows in the period and site, and the visits column to `sum(site_visits.count)`. Expanding a group lists its source keys with the same metrics, which sum to the group row. The rate shows "—" when visits are 0.
- [ ] **AC-15 Matrix.** Given `view=matrix`, then each cell equals the count for that group and channel. Row totals equal the group view's "Tổng liên hệ". Column totals equal the channel view's rows.
- [ ] **AC-16 Landing and reported views.** `view=landing` lists at most 50 landing paths sorted by total, with their visits and rate. `view=reported` lists each reported-source value plus "Chưa khai", counting form and staff leads by `coalesce(sales_source, self_reported_source)`, with won per row.
- [ ] **AC-17 Site filter.** Given `?site=av`, then every number counts only rows with `site = 'av'`. `?site=all` counts all sites. An invalid value falls back to `all`.
- [ ] **AC-18 CSV.** Given any view and filters, when "Tải CSV" is clicked, then the file has the same rows and numbers as the summary on screen (UTF-8 BOM, VI headers) and no personal data. An `editor` gets 403.
- [ ] **AC-19 Existing A-07/A-06 behaviour kept.** `view=channel|route|source` and the A-06 source filter keep their A-07 meaning, extended by the `app:` and `direct` keys. Spam leads still never count. Staff leads appear in `channel` under their `contact_channel` ("Zalo (sale tạo)" counts in the Zalo row's staff column) and never in "Form báo giá".

**Privacy and budget**

- [ ] **AC-20 Privacy policy.** The VI and EN privacy policy seed (`data/seed/info-pages/policy-privacy.*.md`) gains a short paragraph covering four things:
  - the referring site's name and campaign tag are recorded with a contact click or quote request, with no cookie;
  - visits are counted per day without identifying anyone;
  - "how did you hear about us" is optional;
  - staff may record a customer's enquiry made by phone or Zalo.

  `effectiveDate` and `PRIVACY_POLICY_VERSION` (`modules/leads/constants.ts`) change together. The published DB page for 43 is updated through the A-03 editor after owner review of the copy. AV/GT follow at their port.
- [ ] **AC-21 JS budget.** `pnpm perf:report` shows every route in `data/perf-budget.json` within baseline + 50 KB gz. The app JS delta added by this change is recorded in the PR (expected ≤ 1 KB gz on public routes).

### Scope

**In scope:**

- client entry-source capture and its params on `/go` and the lead form;
- `attribution_basis`, `in_app` and the `app:`/`direct` keys;
- source groups (TS + SQL);
- the `site_visits` table and proxy counting;
- `self_reported_source`, `sales_source`, `lead_events` kind `source`;
- staff-created leads;
- the report's new views, metrics, site filter and CSV;
- privacy-policy seed copy and version bump;
- migration `0017`;
- context docs: 05 (attribution, contact tracker, consent), 07 (tables), 10 (A-07b row, G-05 narrowed), AGENTS.md §3/§4 rule 14 wording if the ADR changes it.

**Out of scope:**

- AV and GT forks (ported later, D7);
- storing the entry source in any cookie or browser storage;
- reading click IDs without ads consent;
- per-visitor journeys, sessions or unique-visitor counts;
- multi-touch attribution;
- charts (CSS bars as in A-07);
- dataLayer/GTM changes (Q-13);
- Cloudflare Web Analytics (Q-32);
- the GEO prompt panel (G-05, `/geo-panel`);
- editing or deleting staff leads beyond the existing status/owner/note/source actions;
- importing past Zalo conversations;
- a retention job for `site_visits` (Q-17 decides).

### Affected Areas

| Repo | Layer | File / Path |
| --- | --- | --- |
| app | tracking domain | `modules/tracking/domain/{traffic-source,source-group,in-app-browser,entry-source}.ts`, `modules/tracking/constants.ts` |
| app | tracking SQL | `modules/tracking/infrastructure/{traffic-source-sql,source-group-sql}.ts`, new `infrastructure/{site-visits,schema}.ts` |
| app | tracking app | `modules/tracking/application/{entry-source,attribution-columns}.ts`, new `modules/tracking/visits.ts` (server-only entry), `modules/tracking/{client,index}.ts`, `ui/traffic-source-label.ts`, consent island import |
| app | proxy | `proxy.ts` (`withVisitCount` after `planRequest` pass-through, `event.waitUntil`), `modules/seo` planner if the branch flag lives there, `.dependency-cruiser.*` exception |
| app | contact | `modules/contact/constants.ts` (`GO_PARAMS`, `goHref`), `ui/contact-link.tsx`, `application/{handle-go-request,record-contact-event}.ts`, `infrastructure/{contact-events,contact-stats,schema}.ts` |
| app | leads | `modules/leads/application/{schemas,submit-lead,export-leads}.ts`, new `application/create-staff-lead.ts`, `actions.ts` (`setLeadSourceAction`, `createStaffLeadAction`), `infrastructure/{schema,leads,admin-lead-filters,admin-lead-queries,lead-stats}.ts`, `ui/lead-form.tsx`, `ui/admin/*`, `constants.ts` (`PRIVACY_POLICY_VERSION`, reported sources) |
| app | admin pages | `app/admin/(shell)/leads/page.tsx`, `leads/[id]/page.tsx`, new `leads/new/page.tsx`, `analytics/page.tsx`, new `analytics/export/route.ts` |
| app | analytics | `modules/analytics/{constants.ts,application/{load-report,report-params}.ts,domain/report.ts,ui/admin/*}` |
| app | db | `db/enums.ts`, `db/migrations/0017_*.sql` (+ snapshot), `db/schema.ts` re-export |
| app | copy | `messages/{vi,en}.json`, `data/seed/info-pages/policy-privacy.{vi,en}.md` |
| context | docs | `docs/context/05-seo-and-tracking.md`, `07-data-model.md`, `10-roadmap.md` (A-07b row, G-05 narrowed), `11-open-questions.md` (Q-17 note), new ADR 0013 |

### Golden-rule checks

- **Rule 1:** no business facts are added; the labels are UI copy in `messages/*`.
- **Rule 6:** `site_visits` and lead writes are server-only; the client module holds no DB import.
- **Rule 7:** `setLeadSourceAction`, `createStaffLeadAction`, `/admin/leads/new/` and `/admin/analytics/export/` call `requireRole(['admin','sales'])`.
- **Rule 8:** capture ≤ 1 KB gz; the report and its expandable rows use no client JS (`<details>`).
- **Rule 10:** the select is labelled, ≥ 44 px, with a visible focus ring; the report tables have headers and `aria-hidden` bars, as in A-07.
- **Rule 11:** no uppercase.
- **Rule 12:** every channel still goes through `/go`; the existing event fires unchanged.
- **Rule 14:** this spec changes the consent model. No cookie, no browser storage, no third-party request and no click ID without consent. Recorded: referrer **host**, utm source/medium/campaign, landing path, in-app class, daily aggregate counts. The raw IP is still only hashed (and staff leads store none). ADR 0013 must be accepted before implementation, and the privacy policy text and version change with it.
- **Rule 15:** the report and CSV show aggregates only.

### Dependencies & Risks

- **Depends on: ADR 0013 "Cookieless first-party source attribution"** (to be written with `/adr` before `/implement`). It must cover these points:
  - amend ADR 0011 Decision 6 ("under-count accepted") and the F-06/05 rule that every attribution value needs ads consent; click IDs keep the gate;
  - state the PDP Law 91/2025 position: non-identifying source data sent within the visitor's own request, aggregate visit counts, staff-recorded enquiries under the "handling the customer's request" basis;
  - authorize the `proxy.ts` → `modules/tracking/visits` server-only import and the DB write after the response;
  - add the AC-02 checks to the ADR 0004 consent matrix.
- **Depends on:** A-06, A-07, G-05 classifier (all built); migration `0017` applied on Supabase **before** deploying the build (`deploy/deploy-from-mac.sh` migration stop).
- **Blocked by questions (non-blocking for code, ADR 0004):** Q-17 (retention): `site_visits` holds no personal data; staff leads follow the lead retention when Q-17 is answered.
- **Risk: proxy write load.** Each entry page view does one upsert. Traffic is small (hundreds/day), so the risk is low. The row is keyed per day × path × key and written after the response. If p95 proxy time rises measurably, batching in memory is the follow-up, not part of this spec.
- **Risk: under-count.** Gemini, many apps and `rel=noreferrer` links send no referrer and show as `direct`; Google AI Overviews show as Google search. The note and the self-reported view make this visible. It is accepted.
- **Risk: Referrer-Policy.** Most sites send `strict-origin-when-cross-origin`, so only the origin arrives. A host is all we store, so this is fine.
- **Risk: shared DB.** Local dev writes to production Supabase. Visits from `pnpm dev` would pollute counts, so `recordVisit` is a no-op unless `NODE_ENV === 'production'` and not `PREVIEW_UNVERIFIED`.
- **Lesson (2026-10-23 S-08):** a new field threads through schema, Zod, form, action, queries, labels, CSV and both classifiers, so the implementation lists every file in the PR. Run Biome only on touched files.

### Manual Verification Plan

- **Seed needs:** `pnpm db:local` (migrations through 0017, default seed). Set `NODE_ENV=production` via `pnpm build && pnpm start` against `db:local` for the visit counts.
- **Steps:**
  1. **AC-01/02.** Fresh incognito, consent banner "Từ chối". Open `http://localhost:3000/gui-hang-di-singapore/?utm_source=chatgpt.com` from a page on another origin that links to it (or `curl -e` for the server half). Soft-navigate to `/tinh-cuoc/` and click Zalo. Check the `/go` URL in Network, then `select referrer, utm_source, landing_path, attribution_basis, gclid from contact_events order by created_at desc limit 1`. Check Application → no cookies or storage keys added.
  2. **AC-03.** Accept ads, land with `?gclid=x&utm_source=google`, click WhatsApp → basis `cookie`, gclid `x`. Repeat with ads rejected → gclid null, basis `session`.
  3. **AC-04/05.** Type the URL directly and submit the form → `direct`. `curl -I 'http://localhost:3000/go/call/?ref=%3Cscript%3E&us=…400 bytes…'` → 302, row with `referrer` null and `utm_source` ≤ 150 bytes. `curl -I http://localhost:3000/go/zalo/` → basis `none`.
  4. **AC-06.** `curl -A '… Zalo iOS …' -I /go/zalo/` → `in_app = 'zalo'`; repeat for each user agent in AC-06.
  5. **AC-07.** Run the parity `SELECT` with the ten literal rows; compare with `pnpm tsx` printing `deriveTrafficSource` + `sourceGroup` for the same rows.
  6. **AC-08/09/10.**
     - `curl -H 'Sec-Fetch-Dest: document' -e https://www.google.com/ /gui-hang-di-han-quoc/` → `site_visits` +1.
     - Repeat with `-H 'RSC: 1'`, `-H 'Next-Router-Prefetch: 1'`, `-A 'GPTBot/1.0'`, an internal `-e`, `-I`, a legacy 301 URL and a 410 path → no change.
     - Stop Postgres and reload a page → it renders, and one log line appears.
  7. **AC-11.** VI and EN form at 360/768/1280 px, keyboard only. Submit with and without a choice; tamper the select value in DevTools → field error.
  8. **AC-12/13.** As `sales`: tag a lead twice, check the timeline and the CSV. Create a staff lead; check the row and badge. As `editor`: 403 on all three. Try `insert … origin='web_form', consent_at=null` → constraint error.
  9. **AC-14…19.** With a few rows of each kind on `db:local`, compare each view's numbers with hand SQL counts. Check the sums (group ↔ keys, matrix ↔ group/channel), `?site=av`, CSV vs screen.
  10. **AC-20.** Read the new policy paragraph (VI/EN) and check the version constant changed.
  11. **AC-21.** `pnpm perf:report` (PR labelled `lighthouse`), and record the app JS delta.
  12. axe DevTools at 360 and 1280 px on `/tinh-cuoc/`, `/admin/analytics/`, `/admin/leads/new/` → zero serious/critical issues.
  13. Consent matrix (ADR 0004) re-run, including the AC-02 additions.
- **Validation commands:** `pnpm -C projects/43logistics.vn lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build`; `check:redirects` against `next start` (0 FAIL). No automated tests (ADR 0004).

### Implementation Hints

- Reuse `fitToBudget` and `referrerHost` (`modules/tracking/domain/attribution.ts`) for the server-side parsing. `entrySourceSchema` lives in `modules/tracking/domain` so the proxy (client-safe) and the actions share it.
- Keep the TS and SQL classifiers side by side, and change them in the same commit (ADR 0011 Decision 6 pattern, `traffic-source-sql.ts`).
- The day bucket is `(now() at time zone 'Asia/Ho_Chi_Minh')::date`, computed in SQL on insert, so server timezone never matters.
- `/go` ignores unknown params today. Add the new keys to `GO_PARAMS` and mint them in the same `onClick` that sets `eid`, so a middle-click or long-press still carries them (the href is set before navigation).
- Staff leads reuse the A-06 detail page and actions. Only creation is new. Label the `origin` badge "Sale tạo" (glossary 12).
- Split the migration statements with `SET LOCAL lock_timeout`, as in `0014`, because `leads`/`contact_events` are live tables. All new columns are nullable or have defaults; the check constraint uses `NOT VALID` + `VALIDATE`.
- In the A-07 report code, add views as new `domain/report.ts` builders; keep `load-report.ts` one query per metric family.

### Related

- Roadmap: A-07b (new), A-06, A-07, G-05 (narrowed to the prompt panel), F-06, S-02, S-08.
- Specs: `specs/feature-a07-contact-analytics.md`, `specs/feature-a06-leads-inbox.md`, `specs/feature-s02-contact-tracker.md`, `specs/feature-s08-lead-form.md`, `specs/feature-f06-proxy-composition.md`, `specs/feature-g04-geo-on-site.md`.
- Docs: `docs/context/05-seo-and-tracking.md` §43l_attr (lines 145–155), contact tracker (157–175), consent (199–217), GEO (91–106); `docs/context/07-data-model.md` `leads`, `lead_events`, `contact_events`.
- ADRs: 0002 Decision 8, 0004 (consent matrix), 0006 (JS budget), 0010, 0011 Decision 6, 0012 Decision 4; new 0013.
- Lessons: `lessons/2026-10-23-s08-lead-form.md`.
