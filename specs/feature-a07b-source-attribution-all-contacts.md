---
title: Attribute every contact and visit to its entry source
type: feature
status: in_implementation
owner_repo: both
roadmap: A-07b
branch: feat/a07b-source-attribution
implementation_pr: https://github.com/Dienvm/43logistics.vn/pull/90
priority: must-have
blocked_by_questions: [Q-17, Q-39]
updated: 2026-11-11
---

## Feature: Attribute every contact and visit to its entry source

### Problem Statement

The owner wants to know which acquisition source (Google search, Google Ads, AI assistants, Facebook, Zalo, TikTok, referrals…) produces the visitors who **contact** 43 Logistics, so sales strategy and ad spend follow the sources that actually work (owner, 2026-11-11). AGENTS.md §1 goal 1 (contacts) and goal 2 (ranking, GEO, paid traffic) both depend on it.

A-07 (`/admin/analytics/`) already counts every `/go/[channel]` click and every quote request by channel, route and source, and G-05's AI group is built (43logistics.vn PR #80). But almost every row is "Không rõ nguồn", for two reasons in the code:

1. `extractAttribution()` (`modules/tracking/domain/attribution.ts`) returns `null` unless the landing URL carries a utm or click-ID parameter. A visit from google.com, chatgpt.com (without utm), zalo or facebook organic is never captured, even with consent.
2. `43l_attr` is written and read only when `43l_consent` grants ads (`attribution-cookie.ts:87-101`, `record-contact-event.ts:80-81`, `submit-lead.ts:86,100-102`). The share of visitors who grant ads consent is not measured; the assumption, consistent with a report that is mostly "Không rõ nguồn", is that it is small.

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
  - `cn`: `google`, `facebook` or `tiktok` when the landing URL carried a click-ID parameter (`gclid`/`gbraid`/`wbraid`, `fbclid`, `ttclid`). Only the **network name** is sent, never the click-ID value. This keeps a paid entry recognisable as paid without consent.
  - `cap`: `1`, which marks that capture ran. A row with `cap` and no `ref`/`us` is "direct"; a row without `cap` is "unknown" (old client, JS failed, link opened from outside).
- App Router soft navigations don't re-evaluate the module, so the value survives in-site navigation. The module is imported by the global consent island (always mounted), so it evaluates on the landing page, not later on a page that happens to render a contact link.
- `ContactLink` (`modules/contact/ui/contact-link.tsx`) adds these as query parameters to the `/go` href (`goHref()` + `GO_PARAMS` in `modules/contact/constants.ts`). They go in the hydrated href and in **every** existing href synchronisation path (`syncHref` on `onPointerDown`, `onFocus`, `onKeyDown`, and `onClick`), so a middle-click, context-menu "open in new tab", long-press or keyboard activation carries them. Minting `eid` and the dataLayer push stay as they are. The lead form (`modules/leads/ui/lead-form.tsx`) sends them as hidden inputs.
- Budget: the capture is ≤ 1 KB gz of app JS on every route (ADR 0006).

#### 2. Server recording

- `handleGoRequest` / `recordContactEvent` and `submitLead` parse the entry params with one shared Zod schema, `entrySourceSchema` in `modules/tracking/application/entry-source-schema.ts` (Zod is not allowed in `domain/`, ADR 0005 `domain-pure`). The pure normalisers it calls (`normaliseEntrySource`, host and path rules) live in `modules/tracking/domain/entry-source.ts`. The schema applies these rules:
  - hostnames match `^[a-z0-9.-]{1,150}$` after lowercasing;
  - utm values pass `fitToBudget`;
  - `lp` starts with `/`, is ≤ 150 bytes and has no query or fragment;
  - `cn` is one of `google`, `facebook`, `tiktok`;
  - an invalid value is dropped on its own, and the click or lead is still recorded.
- **Precedence per row:** when ads consent is granted and `43l_attr` decodes, the cookie's attribution is used, exactly as today. Otherwise the session params fill `referrer`, `utm_source`, `utm_medium`, `utm_campaign` and `landing_path`. Click-ID columns are never filled from session params.
- New columns on `contact_events` and `leads`:
  - `attribution_basis` (enum `cookie | session | none`): which path filled the row.
  - `in_app` (enum `zalo | facebook | messenger | instagram | tiktok | line`, nullable): derived server-side from the request user agent by a new pure `inAppBrowser(userAgent)` in `modules/tracking/domain/in-app-browser.ts`, next to `bot.ts`.
  - `entry_source_key` (text, not null, default `'unknown'`): the key of **this visit's entry**, computed only from the session params (`ref`, `us`, `cn`, `cap`) and `in_app`, by the same function that keys `site_visits` (§4). It never reads `43l_attr`. Visits and contacts are therefore classified from the same population, and the rate in §7 divides like by like. The cookie-precedence key (`deriveTrafficSource`, below) stays the basis of the existing `source` view and the A-06 filter.
- **Two keys, two purposes.** For example, a returning visitor whose `43l_attr` holds a past Google Ads campaign and who now arrives by a typed URL gets `click:google` as the `source` key (last campaign) and `direct` as `entry_source_key` (this visit). With ads consent rejected, an entry with `?gclid=x&utm_source=google` gets `utm:google` as the `source` key and `click:google` as `entry_source_key` (from `cn`), matching its `site_visits` row.

#### 3. Source key and groups

- `deriveTrafficSource` and its SQL twin `trafficSourceKeySql` (`modules/tracking/domain/traffic-source.ts`, `infrastructure/traffic-source-sql.ts`) keep their **current order** and gain two final steps:
  1. click ID → `click:{network}` (for `entry_source_key`: the `cn` network);
  2. `utm_source` → `ai:{assistant}` when it names an AI assistant, else `utm:{value}` (unchanged);
  3. referrer host → `ai:{assistant}` when it is an AI host, else `ref:{host}` (unchanged);
  4. **new:** `in_app` → `app:{name}`;
  5. **new:** basis `session` (or `cap` present) with nothing above → `direct`;
  6. otherwise → `unknown`.

  A row with `utm_source=newsletter` and referrer `chatgpt.com` stays `utm:newsletter`, as today.
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

  It also has a SQL twin (`infrastructure/source-group-sql.ts`). **Host matching is exact**, never a substring: a host matches a listed domain `d` when it equals `d` or ends with `.d`. Google search is the one pattern rule: `^(www\.)?google\.(com|com\.vn|vn|[a-z]{2}|com\.[a-z]{2}|co\.[a-z]{2})$`. So `google.com.evil.io` and `notgoogle.com` are `other_site`. The lists (`facebook.com`, `fb.com`, `instagram.com` → facebook; `zalo.me` → zalo; `tiktok.com` → tiktok; `youtube.com`, `youtu.be` → youtube; `bing.com`, `coccoc.com`, `duckduckgo.com`, `search.yahoo.com` → other_search) are constants in `modules/tracking/constants.ts`, each with a short comment. `utm_source` values map to a group by exact value in the same lists, for example `google` with `utm_medium` in `cpc|ppc|paid` → `google_ads` and otherwise `campaign`.

#### 4. Visit counts

- New table `site_visits`: `site`, `day` (date in Asia/Ho_Chi_Minh), `source_key` (text, computed exactly as `entry_source_key`), `landing_path`, `locale`, `count` (int).
  - Primary key: `(site, day, source_key, landing_path)`. RLS on, no policies.
  - Rows are upserted with `count = count + 1`. Nothing per visitor is stored.
- **Bounded cardinality.** The key inputs come from the visitor, so they are capped:
  - `source_key` ≤ 150 bytes; `utm:` values keep only `[a-z0-9._-]` after lowercasing, else `utm:other`.
  - `landing_path` is the pathname after the proxy's normalisation, ≤ 150 bytes. A path that is not a page the planner passes to next-intl never reaches the counter (§ entry request). A path with more than 4 segments, or not matching `^/[a-z0-9/-]*$`, is stored as `(other)`.
  - At most **2,000 rows per site per day**. Once a site's day holds 2,000 rows, a new (source_key, landing_path) pair is counted in `('overflow', '(other)')`. Existing pairs keep incrementing. This is checked in the same upsert statement.
- **Where it is counted:** in `proxy.ts`, only on the next-intl pass-through branch of `planRequest`, for an **entry request**, defined as all of the following:
  - `GET`;
  - `Sec-Fetch-Dest: document`, or no Sec-Fetch headers and an `Accept` that includes `text/html`;
  - no `Next-Router-Prefetch`, `RSC`, `Purpose: prefetch` or `Sec-Purpose: prefetch` header;
  - not a bot user agent (`isBotUserAgent`);
  - the `Referer` is absent or external, so internal navigation with a full page load is not counted.
- The source key is derived by the same pure function as `entry_source_key`: from the `Referer` host, the URL's `utm_source`, click-ID **presence** (→ the network name, as `cn`), and the user agent's `in_app`. No click-ID value is stored.
- The write runs after the response through `event.waitUntil` (`NextFetchEvent`) via a new server-only entry `modules/tracking/visits.ts` (`recordVisit`).
  - The ADR (Dependencies) authorizes this one `proxy.ts` → server-only import and the matching `check:boundaries` rule exception.
  - The write is **bounded**: one statement in a transaction with `SET LOCAL statement_timeout = '2s'` and `SET LOCAL lock_timeout = '500ms'`, and an application-side `Promise.race` timeout of 3 s, so a stalled database cannot pile up pending writes. At most 20 visit writes are in flight per process; beyond that, a visit is dropped and not queued.
  - A DB error or timeout is swallowed with one fixed log message (no values, rule 14). It never changes the response.
  - The installed Next 16 Turbopack **standalone** build must show `waitUntil` running the write in `proxy.ts` (Node.js runtime). This is evidence in the PR, not an assumption.
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
- **Inbox detail** (`app/admin/(shell)/leads/[id]/`): `admin`/`sales` can set or clear `leads.sales_source` through `setLeadSourceAction`. Each change appends a `lead_events` row of a new kind `source`, with `from_source`/`to_source` text columns. The update and the event insert run in **one transaction**, with the lead row locked (`FOR UPDATE`). The event's `site` is the locked lead's `site`, never the admin's current site, which satisfies the `(lead_id, site)` composite foreign key. An AV lead edited from the 43 admin therefore gets an `av` event. The list and the CSV gain a "Nguồn khách nói" column, which shows `sales_source` if set, else `self_reported_source`.

#### 6. Staff-created leads

- New column `leads.origin` (enum `web_form | staff`, default `web_form`) and `leads.contact_channel` (enum `zalo | call | whatsapp | messenger | walk_in | other`, nullable; required when `origin = 'staff'`).
- A "Thêm khách" button on `/admin/leads/` (`admin`, `sales`) opens `/admin/leads/new/`. Its form has:
  - channel (required);
  - customer's source (`sales_source`, required);
  - route (optional);
  - name (required);
  - phone (optional; Zalo-only customers may have none);
  - note (optional).
  - site (required select of `43l | av | gt`, defaulting to `currentSite`; the admin site switcher of ADR 0012 doesn't exist yet, so the form asks).
- `createStaffLeadAction` (Zod, `requireRole(['admin','sales'])`) validates `site` against the site enum on the server and inserts the lead:
  - `origin = 'staff'`, `status = 'contacted'`, `assigned_to` = the creator;
  - `attribution_basis = 'none'`, `entry_source_key = 'unknown'`;
  - `consent_at`, `consent_policy_version`, `phone`, `ip_hash` and `user_agent` may be null.
- **Schema changes for staff leads:** `leads.phone`, `leads.consent_at` and `leads.consent_policy_version` become nullable, with one check constraint: `origin = 'staff' OR (phone IS NOT NULL AND consent_at IS NOT NULL AND consent_policy_version IS NOT NULL)`. The public form's Zod schema still requires a phone, so web leads don't change.
- **Code that assumes non-null values** changes with it. This list is checked file by file in the PR:
  - `AdminLeadRow.phone` and `AdminLeadDetail.consentAt`/`consentPolicyVersion` become nullable (`modules/leads/infrastructure/admin-lead-queries.ts`, its types);
  - `mapDetail()` guards `consentAt?.toISOString()`;
  - `LeadContactLinks` renders call/Zalo links only when a phone exists, and otherwise shows "Không có SĐT";
  - the detail page shows "Sale ghi nhận yêu cầu của khách" in place of the consent block;
  - the CSV writes an empty cell for each null.
- The legal basis for staff-recorded enquiries is set by ADR 0013, and Q-39 tracks its legal review (Dependencies).
- Staff leads are excluded from the "Yêu cầu báo giá" (form) metric. They count in their own metric, "Khách sale tạo", and never in the website contact rate (§7).

#### 7. Report (`/admin/analytics/`)

- **Filters:** `?site=all|43l|av|gt` (default `all`), next to the existing `?weeks=` (4/12/26/52) and `?view=`.
- **Views**, `?view=`:

  | Value | Content |
  | --- | --- |
  | `group` (new default) | Summary by source group. Each row expands, through a `<details>` element (no JS), to its source keys ("Từ chatgpt.com", "utm: newsletter"…). |
  | `matrix` | Two blocks. **Web:** entry-source group (`entry_source_key`) × the columns Zalo, Gọi, WhatsApp, Messenger (clicks), Form báo giá, Tổng web. **Ngoài web (sale tạo):** reported source × `contact_channel` with the columns Zalo, Gọi, WhatsApp, Messenger, Đến trực tiếp, Khác, Tổng. Each block has its own totals, and a final line gives Tổng chung = web + ngoài web. |
  | `landing` | Landing path, top 50 by web total, then one "Các trang khác" row holding the rest, so the column totals still reconcile. Contacts are attributed by their session `landing_path`; visits by `site_visits.landing_path`. Web contacts only. |
  | `reported` | `coalesce(sales_source, self_reported_source)` across leads, with an "Chưa khai" row. |
  | `channel`, `route`, `source` | Kept as they are. |

- **Grouping key per view.** `group`, `landing` and the web block of `matrix` group by **`entry_source_key`** (this visit's entry, the same key as `site_visits`), so a rate divides like by like. `source` and the A-06 filter keep the cookie-precedence key (`deriveTrafficSource`). `reported` groups by `coalesce(sales_source, self_reported_source)`.
- **Metrics** in the `group` and `landing` summaries (web contacts):

  | Metric | Definition |
  | --- | --- |
  | Lượt vào | `sum(site_visits.count)` |
  | Lượt bấm liên hệ | Clicks, as today |
  | Yêu cầu báo giá | Form leads, non-spam |
  | Chốt đơn (web) | Won form leads |
  | Tổng liên hệ web | Clicks + form leads |
  | Tỉ lệ liên hệ | Tổng liên hệ web ÷ Lượt vào, as a percentage with one decimal; "—" when Lượt vào is 0 |

  The `source` view keeps A-07's metrics (clicks, quote requests, won, total).

- **Staff leads** have no measured source and no visit, so they never enter a web table or a rate. They appear in fixed places:

  | View | How a staff lead counts |
  | --- | --- |
  | `group` | A separate block, "Ngoài web (sale tạo)", under the web table: one row per reported source (Google, Trợ lý AI, Facebook, Zalo, TikTok, YouTube, Giới thiệu, Khách cũ, Khác), with Khách sale tạo and Chốt đơn columns, plus its own total. A last line gives Tổng chung (web + ngoài web) for contacts and won. |
  | `matrix` | The "Ngoài web" block (above). |
  | `channel` | A sixth row, "Sale tạo", split by `contact_channel` in its expandable detail. The four click rows and "Form báo giá" keep A-07's meaning. |
  | `reported` | By `sales_source`, next to form leads by `self_reported_source`. |
  | `source`, `landing`, `route` | `source` and `landing`: not counted. `route`: counted in a "Sale tạo" column. |
- **Additivity.** In `group`, every expanded key row sums to its group row, and the group rows sum to the web total. The web total plus the "Ngoài web" total equals Tổng chung. In `matrix`, each block's row and column totals reconcile with its own grand total.
- **CSV:** `GET /admin/analytics/export/?{same params}` (`requireRole(['admin','sales'])`) returns the current view's summary as CSV (UTF-8 BOM, the A-06 `domain/csv.ts` helper). Aggregates only, so it isn't logged in `lead_exports`.
- The note under the report explains the following:
  - session capture is lost on a new tab;
  - a reload counts as a new visit;
  - Google AI Overviews look like Google search;
  - Gemini and many apps send no referrer;
  - so the self-reported view is the cross-check;
  - "Lượt vào" counts entry page views, not unique visitors.

### Acceptance Criteria

**Capture and recording**

- [ ] **AC-01a Referrer-only AI entry.** Given a fresh page load of `/gui-hang-di-singapore/` with **no query string** and referrer `https://chatgpt.com/`, consent rejected, when the visitor soft-navigates to `/tinh-cuoc/` and clicks Zalo, then the `/go/zalo/` request carries `ref=chatgpt.com&lp=%2Fgui-hang-di-singapore%2F&cap=1` and no `us`. The row has `referrer = 'chatgpt.com'`, `utm_source` null, `attribution_basis = 'session'`, `entry_source_key = 'ai:chatgpt'`, and the `group` view counts it under "Trợ lý AI".
- [ ] **AC-01 Session capture.** Given a fresh page load of `/gui-hang-di-singapore/?utm_source=chatgpt.com` with referrer `https://chatgpt.com/`, consent rejected, when the visitor soft-navigates to `/tinh-cuoc/` and clicks the Zalo CTA, then the `/go/zalo/` request carries `ref=chatgpt.com&us=chatgpt.com&lp=/gui-hang-di-singapore/&cap=1`. The new `contact_events` row has:
  - `referrer = 'chatgpt.com'`, `utm_source = 'chatgpt.com'`, `landing_path = '/gui-hang-di-singapore/'`;
  - `attribution_basis = 'session'`, every click-ID column null, `ads_consent = false`;
  - `entry_source_key = 'ai:chatgpt'`; in the report, source `ai:chatgpt`, group "Trợ lý AI".
  - The same holds when the Zalo link is opened by middle-click, by context menu "Mở liên kết trong tab mới", and by keyboard (Tab to it, Enter).
- [ ] **AC-02 No storage, no third party.** Given consent rejected or not yet chosen, when a visitor lands from google.com and browses three pages, then DevTools → Application shows no cookie other than `43l_consent` (the strictly necessary consent record, written by the "Từ chối" choice itself), and no `localStorage` or `sessionStorage` key added by this change. The Network panel shows no request to a host other than the site's own (apart from what ADR 0004's matrix already allows). The consent matrix (ADR 0004) re-run passes unchanged for GTM, Cloudflare and `43l_attr`.
- [ ] **AC-03 Cookie precedence.** Given ads consent granted and a landing with `?gclid=x&utm_source=google`, when the visitor clicks WhatsApp, then the row has `attribution_basis = 'cookie'`, `gclid = 'x'` and source `click:google`, as today. Given ads consent **rejected** and the same landing, then the `/go` request carries `cn=google` and no click-ID value, the row has `gclid` null, `utm_source = 'google'`, basis `session`, source key `utm:google` and `entry_source_key = 'click:google'`, and that entry's `site_visits` row is keyed `click:google`. So the `group` view counts both under "Google Ads".
- [ ] **AC-03b Returning cookie visitor.** Given ads consent granted and a `43l_attr` from an earlier `?gclid=x` visit, when the visitor later arrives by typed URL and clicks Zalo, then the row has basis `cookie`, source key `click:google` and `entry_source_key = 'direct'`, and its visit was counted under `direct`. The `group` view counts the contact under "Gõ trực tiếp / dấu trang", and the `source` view counts it under "Google Ads".
- [ ] **AC-04 Own host and direct.** Given a landing with no referrer (typed URL), when the visitor submits the quote form, then the lead has `attribution_basis = 'session'`, `referrer` null and source `direct` ("Gõ trực tiếp / dấu trang"). Given a `/go/zalo/` request with no entry params (old cached page, link opened from outside), then the basis is `none` and the source is `unknown`. Given a referrer of `https://43logistics.vn/...` or `https://www.43logistics.vn/...`, then `ref` is not sent.
- [ ] **AC-05 Invalid params.** Given a `GET /go/call/?ref=%3Cscript%3E&us=` followed by 400 × `a`, `&cn=bing&lp=https://x.io/`, then the redirect is still a 302, `cn` and `lp` are dropped, the row is inserted, `referrer` is null and `utm_source` is cut to ≤ 150 bytes. No error reaches the visitor.
- [ ] **AC-06 In-app browser.** Given a user agent containing `Zalo` (Zalo in-app) and no referrer, then the row's `in_app = 'zalo'` and the source is `app:zalo`, group Zalo. `FBAN`/`FBAV` → `facebook`, `Instagram` → `instagram`, `musical_ly`/`TikTok` → `tiktok`, `Line/` → `line`. A desktop Chrome user agent → null.
- [ ] **AC-07 Classifier parity.** For each row in the spec's table below, the TS `deriveTrafficSource` + `sourceGroup` and the SQL twins give the same key and group, in both `leads` and `contact_events`. The reviewer runs one SQL `SELECT` over a `VALUES` list of these literal rows on `db:local`, prints the TS result for the same rows with `pnpm tsx`, and compares them by hand (ADR 0004).

  | Row | Key | Group |
  | --- | --- | --- |
  | `{gclid, ref:google.com}` | `click:google` | `google_ads` |
  | `{cn:google, basis:session}` (entry key) | `click:google` | `google_ads` |
  | `{us:newsletter, ref:chatgpt.com}` | `utm:newsletter` | `campaign` |
  | `{us:google, um:cpc}` | `utm:google` | `google_ads` |
  | `{ref:google.com.evil.io}` | `ref:google.com.evil.io` | `other_site` |
  | `{ref:notgoogle.com}` | `ref:notgoogle.com` | `other_site` |
  | `{ref:chatgpt.com, in_app:zalo}` | `ai:chatgpt` | `ai` |
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
- [ ] **AC-10 Visits never break pages.** Two separate cases:
  - **unreachable DB for visit writes only:** with `site_visits` locked by another session (`LOCK TABLE site_visits IN ACCESS EXCLUSIVE MODE` held in `psql`), 30 entry requests each return their page within the usual time; each visit write gives up within 3 s with one fixed log line; no more than 20 writes are pending at once (log count);
  - **stalled DB:** with `pg_sleep` simulated by the same lock held for 60 s, the server's memory and pending-write count stay flat.

  `site_visits` stores no IP, user agent, cookie or click-ID value (schema review).
- [ ] **AC-10b Cardinality cap.** Given 2,000 rows already in today's `43l` partition (inserted on `db:local` by one SQL statement), when entry requests arrive with `?utm_source=r1`, `?utm_source=r2`, …, then each is counted in `('overflow', '(other)')`, and an existing pair still increments. `?utm_source=` with 400 bytes is cut and kept within 150 bytes; `?utm_source=a%20b` becomes `utm:other`; `/a/b/c/d/e/f/` is stored as `(other)`.

**Self-report and staff leads**

- [ ] **AC-11 Form question.** Given `/tinh-cuoc/` (VI) and `/en/shipping-calculator/` (EN), then the form shows the optional labelled select with the 9 options in that locale, keyboard-operable with a visible focus ring. Submitting with "Người quen giới thiệu" stores `self_reported_source = 'referral'`. Submitting with no choice stores null. A tampered value (`heardFrom=x`) returns a field error.
- [ ] **AC-12 Sales tag.** Given a `sales` user on a lead detail page, when they set "Nguồn khách nói" to Facebook and later to TikTok, then `leads.sales_source = 'tiktok'`, two `lead_events` rows of kind `source` (`null→facebook`, `facebook→tiktok`) appear in the timeline, and the list and CSV show "TikTok". An `editor` gets 403 from the action.
- [ ] **AC-13 Staff lead.** Given a `sales` user, when they create a lead with site `av`, channel Zalo, source "Khách cũ", name only (no phone) and route Hàn Quốc, then:
  - the row has `origin = 'staff'`, `site = 'av'`, `contact_channel = 'zalo'`, `status = 'contacted'`, `assigned_to` = them, and `phone`/`consent_at`/`consent_policy_version`/`ip_hash`/`user_agent` null;
  - it appears in the inbox with a "Sale tạo" badge; its detail page opens without error and shows "Không có SĐT" with no call/Zalo link;
  - it can be moved through `quoted` → `won`, and every `lead_events` row it gets has `site = 'av'`;
  - the CSV export includes it with empty phone and consent cells.

  Missing channel, source, name or site returns field errors, and `site=xx` is rejected on the server. An `editor` gets 403 for both `/admin/leads/new/` and the action. The DB rejects a `web_form` row with a null `phone`, `consent_at` or `consent_policy_version` (check constraint).

**Report**

- [ ] **AC-14 Group view (fixture).** Given this fixture on `db:local` for `43l` in the current week (and nothing else):
  - `site_visits`: `ref:www.google.com` 200, `ai:chatgpt` 40, `direct` 60;
  - `contact_events`: 6 with `entry_source_key = 'ref:www.google.com'`, 3 with `'ai:chatgpt'`, 2 with `'app:zalo'`;
  - form leads: 2 `ref:www.google.com` (1 `won`), 1 `ai:chatgpt`, 1 `ref:www.google.com` with status `spam`;
  - staff leads: 2 with `sales_source = 'referral'` (1 `won`).

  When `view=group&weeks=4&site=43l` opens, then:

  | Group | Lượt vào | Bấm | Báo giá | Chốt (web) | Tổng web | Tỉ lệ |
  | --- | --- | --- | --- | --- | --- | --- |
  | Google tìm kiếm | 200 | 6 | 2 | 1 | 8 | 4,0% |
  | Trợ lý AI | 40 | 3 | 1 | 0 | 4 | 10,0% |
  | Zalo | 0 | 2 | 0 | 0 | 2 | — |
  | Gõ trực tiếp / dấu trang | 60 | 0 | 0 | 0 | 0 | 0,0% |

  - The web total is 300 visits and 14 contacts.
  - The "Ngoài web (sale tạo)" block shows Giới thiệu: 2 contacts, 1 won.
  - Tổng chung shows 16 contacts and 2 won.
  - The spam lead counts nowhere.
  - Expanding "Google tìm kiếm" shows one key row, "Từ www.google.com", with the same numbers.
- [ ] **AC-15 Matrix.** Given the AC-14 fixture (all clicks on Zalo) and `view=matrix`:
  - the web block's Zalo column reads Google tìm kiếm 6, Trợ lý AI 3, Zalo 2 (total 11), the Form column 2 / 1 / 0 (total 3), and Tổng web 14;
  - the "Ngoài web" block shows Giới thiệu × its `contact_channel` = 2;
  - Tổng chung reads 16.

  Each row total equals the same row's "Tổng web" in `group`, and each web column total equals the matching `channel` view row.
- [ ] **AC-16 Landing and reported views.** `view=landing` lists at most 50 landing paths sorted by web total, then a "Các trang khác" row; its columns sum to the same web totals as `group`. `view=reported` lists each reported-source value plus "Chưa khai", counting form and staff leads by `coalesce(sales_source, self_reported_source)`, with won per row.
- [ ] **AC-17 Site filter.** Given `?site=av`, then every number counts only rows with `site = 'av'`. `?site=all` counts all sites. An invalid value falls back to `all`.
- [ ] **AC-18 CSV.** Given any view and filters, when "Tải CSV" is clicked, then the file has the same rows and numbers as the summary on screen (UTF-8 BOM, VI headers) and no personal data. An `editor` gets 403.
- [ ] **AC-19 Existing A-07/A-06 behaviour kept.** `view=channel|route|source` and the A-06 source filter keep their A-07 meaning, extended by the `app:` and `direct` keys. Spam leads still never count. Staff leads appear in `channel` under their `contact_channel` ("Zalo (sale tạo)" counts in the Zalo row's staff column) and never in "Form báo giá".

**Privacy and budget**

- [ ] **AC-20 Privacy policy.** The VI and EN privacy policy seed (`data/seed/info-pages/policy-privacy.*.md`) gains a short paragraph covering four things:
  - the referring site's name and campaign tag are recorded with a contact click or quote request, with no cookie;
  - visits are counted per day without identifying anyone;
  - "how did you hear about us" is optional;
  - staff may record a customer's enquiry made by phone or Zalo.

  The `policy` block's `effectiveDate` changes with the copy. Leads take their `consent_policy_version` from the **published** privacy page (`getLeadPolicyVersion()` → `getPrivacyPolicyVersion()`, `modules/content`), so the seed file alone changes nothing on the live site. **Activation step:** the owner reviews the copy, and the 43 privacy page is published through the A-03 editor with the new `effectiveDate`. Verification: after publishing on `db:local`, a new web lead stores the new version. The capture (§1) and visit counting (§4) ship in the same deploy, but the PR states that the policy must be published before or with the deploy. AV/GT follow at their port.
- [ ] **AC-22 Activation flag (ADR 0013 Decision 8).** Given `NEXT_PUBLIC_SESSION_ATTRIBUTION` unset, a fresh visit from another origin that clicks Zalo and submits the form behaves as follows:
  - no `/go` URL or form post carries `ref`, `us`, `um`, `uc`, `lp`, `cn` or `cap`;
  - a hand-crafted `GET /go/zalo/?ref=chatgpt.com&cap=1` stores no session values (basis `none` without ads consent);
  - no `site_visits` row changes;
  - the form shows no "Bạn biết 43 Logistics qua đâu?" question;
  - `/admin/leads/` shows no "Thêm khách" button, `/admin/leads/new/` answers 404, and the source tag control is hidden.

  The new report views still render the data that exists. Given the flag set to `1`, every other AC holds.
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
- privacy-policy seed copy and the `effectiveDate` of its `policy` block (publication is an activation step, AC-20);
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
| app | tracking app | `modules/tracking/application/{entry-source,entry-source-schema,attribution-columns}.ts`, new `modules/tracking/visits.ts` (server-only entry), `modules/tracking/{client,index}.ts`, `ui/traffic-source-label.ts`, consent island import |
| app | proxy | `proxy.ts` (`withVisitCount` after `planRequest` pass-through, `event.waitUntil`), `modules/seo` planner if the branch flag lives there, `.dependency-cruiser.*` exception |
| app | contact | `modules/contact/constants.ts` (`GO_PARAMS`, `goHref`), `ui/contact-link.tsx`, `application/{handle-go-request,record-contact-event}.ts`, `infrastructure/{contact-events,contact-stats,schema}.ts` |
| app | leads | `modules/leads/application/{schemas,submit-lead,export-leads,lead-form-config}.ts`, new `application/{create-staff-lead,set-lead-source}.ts`, `actions.ts` (`setLeadSourceAction`, `createStaffLeadAction`), `infrastructure/{schema,leads,admin-lead-filters,admin-lead-queries,lead-stats}.ts`, `domain/csv.ts`, `ui/lead-form.tsx`, `ui/admin/*` (incl. `LeadContactLinks`, detail consent block, list badge), `constants.ts` (reported sources, contact channels) |
| app | admin pages | `app/admin/(shell)/leads/page.tsx`, `leads/[id]/page.tsx`, new `leads/new/page.tsx`, `analytics/page.tsx`, new `analytics/export/route.ts` |
| app | analytics | `modules/analytics/{constants.ts,application/{load-report,report-params}.ts,domain/report.ts,ui/admin/*}` |
| app | db | `db/enums.ts`, `db/migrations/0017_*.sql` (+ snapshot), `db/schema.ts` re-export |
| app | copy | `messages/{vi,en}.json`, `data/seed/info-pages/policy-privacy.{vi,en}.md` |
| app | config | `shared/config/env.public.ts` (`NEXT_PUBLIC_SESSION_ATTRIBUTION`), `.env.example`, `deploy/env.template` (unset by default; ADR 0013 Decision 8) |
| context | docs | `docs/context/05-seo-and-tracking.md`, `07-data-model.md`, `10-roadmap.md` (A-07b row, G-05 narrowed), `11-open-questions.md` (Q-17 note, new Q-39), new ADR 0013 |

### Golden-rule checks

- **Rule 1:** no business facts are added; the labels are UI copy in `messages/*`.
- **Rule 6:** `site_visits` and lead writes are server-only; the client module holds no DB import.
- **Rule 7:** `setLeadSourceAction`, `createStaffLeadAction`, `/admin/leads/new/` and `/admin/analytics/export/` call `requireRole(['admin','sales'])`.
- **Rule 8:** capture ≤ 1 KB gz; the report and its expandable rows use no client JS (`<details>`).
- **Rule 10:** the select is labelled, ≥ 44 px, with a visible focus ring; the report tables have headers and `aria-hidden` bars, as in A-07.
- **Rule 11:** no uppercase.
- **Rule 12:** every channel still goes through `/go`; the existing event fires unchanged.
- **Rule 14:** this spec changes the consent model. No cookie, no browser storage, no third-party request and no click ID without consent. Recorded: referrer **host**, utm source/medium/campaign, landing path, in-app class, daily aggregate counts. The raw IP is still only hashed (and staff leads store none). Cookieless does **not** by itself make the data non-personal: on a lead, the source sits next to a name and phone, and a contact row keeps the hashed IP and user agent. ADR 0013 therefore sets a basis per processing type (Dependencies). It must be accepted before implementation, and the published privacy policy changes with it (AC-20).
- **Rule 15:** the report and CSV show aggregates only.

### Dependencies & Risks

- **Depends on: ADR 0013 "Cookieless first-party source attribution"** (accepted 2026-11-12, `docs/adr/0013-cookieless-first-party-source-attribution.md`). It covers these points, and its Decision 8 adds the activation flag (AC-22):
  - amend ADR 0011 Decision 6 ("under-count accepted") and the F-06/05 rule that every attribution value needs ads consent; click IDs keep the gate;
  - distinguish four processing types and give each its legal basis under PDP Law 91/2025 (and Decree 13/2023 as applicable), its notice in the privacy policy, its minimisation and its safeguards:
    1. **aggregate visit counts** (`site_visits`: no identifier, bounded cardinality, small counts possible);
    2. **identifiable attribution** (referrer host, utm values, landing path and in-app class stored on a `leads` row with name/phone, or on a `contact_events` row with IP hash and user agent; utm and path values are capped and character-limited because they can carry personal data);
    3. **enquiry handling** (a staff-recorded lead for a customer who contacted us by phone or Zalo);
    4. **optional self-reported source** (form field and sales tag);
  - authorize the `proxy.ts` → `modules/tracking/visits` server-only import and the DB write after the response;
  - add the AC-02 checks to the ADR 0004 consent matrix.
- **Depends on:** A-06, A-07, G-05 classifier (all built); migration `0017` applied on Supabase **before** deploying the build (`deploy/deploy-from-mac.sh` migration stop).
- **Blocked by questions (non-blocking for code, ADR 0004):**
  - **Q-17 (retention):** a retention period for `site_visits` and for the new lead columns. Staff leads follow the lead retention once it is answered.
  - **Q-39 (new, legal review):** confirmation, from the owner's legal adviser, of the ADR 0013 basis for types 2 and 3 (consent exceptions under PDP Law 91/2025 and the notice wording). An owner approval of the ADR alone is not that evidence.
  - Code ships per ADR 0004; activation, meaning the deploy with the published policy, waits for Q-39.
- **Risk: proxy write load.** Each entry page view does one bounded upsert after the response (§4). Daily traffic is not measured (Q-32, Cloudflare not active), so the design doesn't rely on an estimate. The 20-in-flight cap, the 3 s timeout and the per-day row cap bound the cost at any volume; under a spike, visits are dropped, never queued. If proxy p95 time rises measurably, in-memory batching is the follow-up, not part of this spec.
- **Risk: under-count.** Gemini, many apps and `rel=noreferrer` links send no referrer and show as `direct`; Google AI Overviews show as Google search. The note and the self-reported view make this visible. It is accepted.
- **Risk: Referrer-Policy.** Most sites send `strict-origin-when-cross-origin`, so only the origin arrives. A host is all we store, so this is fine.
- **Risk: shared DB.** Local dev writes to production Supabase. Visits from `pnpm dev` would pollute counts, so `recordVisit` is a no-op unless `NODE_ENV === 'production'` and not `PREVIEW_UNVERIFIED`.
- **Lesson (2026-10-23 S-08):** a new field threads through schema, Zod, form, action, queries, labels, CSV and both classifiers, so the implementation lists every file in the PR. Run Biome only on touched files.

### Manual Verification Plan

- **Environment:**
  - `pnpm -C projects/43logistics.vn db:local` starts Postgres on `localhost:54329`, migrates through `0017` and seeds.
  - `db:local` only configures its own child commands, so run the server with the variables explicit: `DATABASE_URL=postgres://…@localhost:54329/… DATABASE_URL_DIRECT=… pnpm build && … pnpm start -p 3100`. Copy the values printed by `db:local`; never use the shared `.env` DB, which is production (memory: local dev = production Supabase).
  - The default seed is unverified/draft, so public CTAs and the form may be hidden. Before the browser steps, mark the SG and KR routes and the contact `site_settings` verified, and publish `/tinh-cuoc/` and the privacy page on `db:local` (one SQL script kept in the PR, not in `data/owner-confirmations.json`).
  - `BASE=http://localhost:3100`. Every `curl` below uses **GET** (`curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n'`), never `-I`, because `/go` doesn't log `HEAD`.
- **Steps:**
  1. **AC-01a/01/02.**
     - Serve a one-line HTML file on another origin (`python3 -m http.server 8081` with `<a href="http://localhost:3100/gui-hang-di-singapore/">x</a>`; and a second link with `?utm_source=chatgpt.com`).
     - A browser can't fake a chatgpt.com referrer, so the check has two halves:
       - **client half:** open the link from the `127.0.0.1:8081` page. The `/go` URL then carries `ref=127.0.0.1`, which proves `document.referrer` is captured and kept across the soft navigation;
       - **server half:** `curl "$BASE/go/zalo/?ref=chatgpt.com&lp=%2Fgui-hang-di-singapore%2F&cap=1"` gives `entry_source_key = 'ai:chatgpt'`, and adding `&us=chatgpt.com` gives the AC-01 row.
     - Fresh incognito, choose "Từ chối", soft-navigate to `/tinh-cuoc/`, then click Zalo, middle-click it, open it from the context menu, and Tab + Enter to it.
     - For each: the `/go` URL in Network carries the params, and `psql -c "select referrer, utm_source, landing_path, attribution_basis, entry_source_key, gclid from contact_events order by created_at desc limit 4"` shows the AC values.
     - Application tab: only `43l_consent`, no storage keys.
  2. **AC-03/03b.**
     - Accept ads, open `$BASE/gui-hang-di-singapore/?gclid=x&utm_source=google`, click WhatsApp → basis `cookie`, gclid `x`.
     - Fresh incognito, reject, same URL → `cn=google` in the `/go` URL, `gclid` null, `entry_source_key = 'click:google'`; `select * from site_visits where source_key='click:google'` → 1.
     - Same accepted profile, type `$BASE/` in the address bar, click Zalo → `entry_source_key = 'direct'`, source key `click:google`.
  3. **AC-04/05.**
     - Type the URL directly and submit the form → `direct`.
     - `curl "$BASE/go/call/?ref=%3Cscript%3E&us=$(printf 'a%.0s' {1..400})&cn=bing&lp=https://x.io/"` → `302`; the row has `referrer` null, `utm_source` 150 bytes, `landing_path` null.
     - `curl "$BASE/go/zalo/"` → basis `none`, `entry_source_key = 'unknown'`.
  4. **AC-06.** `curl -A 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Zalo iOS/24.10' "$BASE/go/zalo/?cap=1"` → `in_app = 'zalo'`, `entry_source_key = 'app:zalo'`. Repeat with `… [FBAN/FBIOS;FBAV/450.0]`, `… Instagram 300.0`, `… musical_ly_32.0`, `… Line/13.0`, and a desktop Chrome user agent → null.
  5. **AC-07.** Run the parity `SELECT` over a `VALUES` list of all 16 rows; run `pnpm tsx scripts/print-source-keys.ts` (a throwaway script, not committed) for the same rows; compare the two outputs line by line.
  6. **AC-08/09.**
     - `curl -H 'Sec-Fetch-Dest: document' -H 'Sec-Fetch-Mode: navigate' -e https://www.google.com/ -A 'Mozilla/5.0 (iPhone…) Safari/604.1' "$BASE/gui-hang-di-han-quoc/"` → `select count from site_visits where source_key='ref:www.google.com' and landing_path='/gui-hang-di-han-quoc/'` goes up by 1.
     - Each of these leaves it unchanged:
       - the same request plus `-H 'RSC: 1'`;
       - plus `-H 'Next-Router-Prefetch: 1'`;
       - plus `-H 'Sec-Purpose: prefetch'`;
       - `-A 'Mozilla/5.0 (compatible; Googlebot/2.1)'`, `-A 'GPTBot/1.0'`;
       - `-e "$BASE/"`;
       - `curl -I`;
       - `$BASE/admin/`, `$BASE/api/health`, `$BASE/go/zalo/`, `$BASE/robots.txt`;
       - the first 301 row and the first 410 row of `data/redirect-map.csv`.
  7. **AC-10/10b.**
     - In `psql`, `begin; lock table site_visits in access exclusive mode;` and keep it open. Fire 30 entry requests with `xargs -P 30`: each returns 200 in < 1 s more than the baseline; the log shows ≤ 30 identical fixed lines within ~3 s, and `ps`/logs show no growth past 20 pending writes.
     - Hold the lock 60 s with traffic running, then `rollback`, and confirm the server still serves.
     - For AC-10b, insert 2,000 synthetic rows for today with one `insert … select generate_series`, then send `?utm_source=r1`… and the length/space/path cases.
  8. **AC-11.** VI `$BASE/tinh-cuoc/` and EN `$BASE/en/shipping-calculator/` at 360/768/1280 px (CDP device metrics, rules note), keyboard only. Submit with "Người quen giới thiệu" and with no choice, and check `self_reported_source`. In DevTools, change an option's value to `x` and submit → field error.
  9. **AC-12/13.**
     - As `sales` (a local Clerk dev user; live keys won't render on localhost, memory note): tag a lead Facebook → TikTok, then check the timeline and the CSV.
     - Create the AC-13 staff lead (site AV, no phone), open its detail, move it to `won`, check `select site from lead_events where lead_id=…` and the CSV.
     - As `editor`: 403 on the tag action, `/admin/leads/new/` and the create action.
     - `psql`: `insert into leads (…, origin, phone) values (…, 'web_form', null)` → check-constraint error.
  10. **AC-14…19.** Load the AC-14 fixture with one SQL script on `db:local`, then open:
      - `$BASE/admin/analytics/?view=group&weeks=4&site=43l`, `?view=matrix…`, `?view=landing…`, `?view=reported…`, `?view=channel…`, `?view=source…`;
      - `?site=av` (all zero for the fixture) and `?site=xx` (same as `all`).

      Compare every cell with the AC tables, then download the CSV for each view and diff it against the screen.
  11. **AC-20.** Publish the edited privacy page on `db:local` with a new `effectiveDate`, submit a form lead, and check that `consent_policy_version` equals the new version.
  12. **AC-21.** `pnpm perf:report` (PR labelled `lighthouse`), and record the app JS delta.
  13. axe DevTools at 360 and 1280 px on `/tinh-cuoc/`, `/admin/analytics/`, `/admin/leads/new/` → zero serious/critical issues.
  14. Consent matrix (ADR 0004) re-run, with the AC-02 additions.
  15. Standalone evidence (§4): run the image locally (`docker compose up app` with the `db:local` URL) and repeat one AC-08 request → the count increments.
- **Validation commands:** `pnpm -C projects/43logistics.vn lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build`; `check:redirects` against `next start` (0 FAIL). No automated tests (ADR 0004).

### Implementation Hints

- Reuse `fitToBudget` and `referrerHost` (`modules/tracking/domain/attribution.ts`) for the server-side parsing. The pure normalisers live in `modules/tracking/domain/entry-source.ts`. The Zod `entrySourceSchema` lives in `modules/tracking/application/entry-source-schema.ts`, because `domain-pure` forbids Zod. The proxy uses only the pure functions. The `check:boundaries` exception for `proxy.ts` → `modules/tracking/visits.ts` names that one file, not the module's server entry.
- Keep the TS and SQL classifiers side by side, and change them in the same commit (ADR 0011 Decision 6 pattern, `traffic-source-sql.ts`).
- The day bucket is `(now() at time zone 'Asia/Ho_Chi_Minh')::date`, computed in SQL on insert, so server timezone never matters.
- `/go` ignores unknown params today. Add the new keys to `GO_PARAMS`, and put them in the server-rendered href after hydration and in `syncHref` (pointer-down, focus, key-down), not only in `onClick`. Middle-click and the context menu don't fire `onClick`.
- Staff leads reuse the A-06 detail page and actions. Only creation is new. Label the `origin` badge "Sale tạo" (glossary 12).
- Split the migration statements with `SET LOCAL lock_timeout`, as in `0014`, because `leads`/`contact_events` are live tables. All new columns are nullable or have defaults. `DROP NOT NULL` on `phone`/`consent_at`/`consent_policy_version` comes **after** the check constraint is added (`NOT VALID` + `VALIDATE`), so there is never a window without the guarantee.
- In the A-07 report code, add views as new `domain/report.ts` builders; keep `load-report.ts` one query per metric family.

### Related

- Roadmap: A-07b (new), A-06, A-07, G-05 (narrowed to the prompt panel), F-06, S-02, S-08.
- Specs: `specs/feature-a07-contact-analytics.md`, `specs/feature-a06-leads-inbox.md`, `specs/feature-s02-contact-tracker.md`, `specs/feature-s08-lead-form.md`, `specs/feature-f06-proxy-composition.md`, `specs/feature-g04-geo-on-site.md`.
- Docs: `docs/context/05-seo-and-tracking.md` §43l_attr (lines 145–155), contact tracker (157–175), consent (199–217), GEO (91–106); `docs/context/07-data-model.md` `leads`, `lead_events`, `contact_events`.
- ADRs: 0002 Decision 8, 0004 (consent matrix), 0006 (JS budget), 0010, 0011 Decision 6, 0012 Decision 4; new 0013.
- Lessons: `lessons/2026-10-23-s08-lead-form.md`.
