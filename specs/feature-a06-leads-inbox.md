---
title: Work quote requests from an admin leads inbox
type: feature
status: approved
owner_repo: both
roadmap: A-06
priority: must-have
blocked_by_questions: [Q-17, Q-28]
updated: 2026-10-28
---

## Feature: Work quote requests from an admin leads inbox

### Problem Statement

Quote requests from the always-on form (S-08, S-08b) are saved in `leads`, but sales see them only in the database and, once activated (Q-28), in the email/Zalo alerts (roadmap Phase 2 note). Nobody can tell which requests were answered, who owns a customer, what was said, or which campaign brought a won customer. Turning visitors into contacts is the site's first goal (AGENTS.md §1); without an inbox the contacts it collects aren't worked.

Roadmap: **A-06 Leads inbox** (sales). *Accept:* `editor` gets 403.

### Proposed Solution

`/admin/leads/` becomes the sales inbox (sections `leads`: `admin`, `sales`; `ADMIN_SECTIONS`, A-01):

- **List** (server-rendered, like the other admin sections; owner decision 2026-10-28, no TanStack Table): newest first, 50 per page, columns received at, name, phone, route, weight, status, owner, source. Filters live in the URL (`?status=&route=&source=&from=&to=&owner=&page=`), so a filtered view can be shared and reloaded. Default view hides `spam`.
- **Detail** `/admin/leads/{id}/`: the customer's data, the request (route, weight, dimensions, goods type, message, estimate), attribution (UTM, click IDs, landing path, referrer, consent), quick "Gọi" (`tel:`) and "Zalo" (`zalo.me/{phone}`) links for the staff member (AC-12: an internal exception to rule 12, which tracks visitor contacts), and a **timeline** of status changes, assignments and notes, each with who and when.
- **Actions** on the detail page: change status, assign an owner (admin or sales staff), add a note.
- **CSV export** of the current filtered list (admin and sales), logged.
- **Sidebar badge:** the number of `new` leads next to "Yêu cầu báo giá", for roles that see the section.

### Acceptance Criteria

- [ ] **AC-01 Access.** Given a signed-in `editor`, when they open `/admin/leads/`, `/admin/leads/{id}/`, the CSV export, or POST any lead action, then they get 403 and nothing is read or written. `admin` and `sales` get the pages; no session → `/admin/sign-in/`.
- [ ] **AC-02 List.** Given leads exist, when `/admin/leads/` opens, then it shows the newest 50 non-spam leads with received at (Asia/Ho_Chi_Minh), name (or "—"), phone, route name (or "—"), weight, status badge, owner name (or "Chưa giao") and source from one pure `deriveLeadSource()`: a click ID wins (`gclid`/`gbraid`/`wbraid` → Google, `fbclid` → Facebook, `ttclid` → TikTok, in that order), else `utm_source` (lowercased), else the referrer host, else "Trực tiếp"; pagination shows the total and moves by 50.
- [ ] **AC-03 Filters.** Given the filter form, when staff pick status (any of the 6, or "Tất cả" including spam), route, source (namespaced values from `deriveLeadSource()`: `click:google`, `click:facebook`, `click:tiktok`, `utm:{value}`, `ref:{host}`, `direct`; one SQL predicate per value, shared by the list, its total and the CSV), date range (inclusive, Vietnam days), owner ("Của tôi", "Chưa giao", a staff member), then the URL carries the filters, the list and the total match them, and an invalid parameter is ignored (Zod) instead of erroring.
- [ ] **AC-04 Detail.** Given a lead id, when `/admin/leads/{id}/` opens, then it shows every stored field except `ip_hash` and `user_agent`, the consent time and policy version, and the timeline newest first. An unknown or malformed id → 404.
- [ ] **AC-05 Status.** Given the detail page, when staff set a status (`new`, `contacted`, `quoted`, `won`, `lost`, `spam`; any transition allowed), then `leads.status` and `updated_at` change and a timeline entry records old → new status, who and when. The lead row is locked (`SELECT … FOR UPDATE`) for the transaction and the old value is read under the lock, so two concurrent saves record two correct transitions in order. Saving the same status answers "unchanged" and writes nothing; an unknown lead → notFound, nothing written.
- [ ] **AC-06 Assign.** Given the owner select (staff whose `profiles.role` is `admin` or `sales`, not deleted, plus "Chưa giao"), when staff save an owner, then `leads.assigned_to` changes and a timeline entry records old → new owner (same lock rule as AC-05; same owner → unchanged, no entry); an id that isn't such a profile is refused (`fieldErrors.assignedTo`).
- [ ] **AC-07 Notes.** Given the note box, when staff add a note (1–2000 characters, trimmed), then a timeline entry stores it with author and time; notes are append-only (no edit or delete). The existing `leads.notes` column is shown read-only as "Ghi chú cũ" when not empty and is no longer written.
- [ ] **AC-08 CSV.** Given a filtered list, when staff click "Xuất CSV", then they download `leads-{YYYY-MM-DD}.csv` (UTF-8 with BOM, so Excel shows Vietnamese; `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment`, `Cache-Control: private, no-store`) with every lead matching the filters (all pages, max 10 000 rows; more → the export is refused with a message), columns: received at, name, phone, email, route, weight, dimensions, goods type, message, estimate, status, owner, locale, source path, landing path, referrer, UTM ×5, gclid, gbraid, wbraid, fbclid, ttclid, ads consent, consent at. No `ip_hash`, no `user_agent`. Every field follows RFC 4180 (quoted when it holds a comma, quote, CR or LF; quotes doubled), so row and column boundaries survive. A cell starting with `=`, `+`, `-`, `@`, tab or CR is prefixed with `'` (formula injection); phones are therefore written as `'+84…`, which spreadsheets show as the literal `+84…`. The export log row (who, when, filters, row count, outcome) is written before any byte is returned: if it fails, the response is a 500 with no lead data; an over-limit request is refused and logged with outcome `refused`. Exports include attribution identifiers (UTM, click IDs) and exclude `ip_hash` and `user_agent`.
- [ ] **AC-09 Badge.** Given `new` leads exist, when an `admin` or `sales` user sees the admin sidebar, then "Yêu cầu báo giá" shows their count (hidden at 0); an `editor` sees no badge and no count is queried for them.
- [ ] **AC-10 Freshness.** Given a lead was submitted or changed, when staff reload the list, detail or badge, then they see it: admin lead reads are uncached and filtered in SQL.
- [ ] **AC-11 No deletes.** Given any role, there is no way to delete a lead (Q-17 retention is open); `spam` is how a lead leaves the default view.
- [ ] **AC-12 Staff contact links.** Given a lead with a phone, when staff use "Gọi" or "Zalo" on the detail page, then the links go straight to `tel:{E.164}` and `https://zalo.me/{phone digits}` (no `/go/[channel]`), and no `contact_events` row, `dataLayer` push or PostHog event is created: rule 12 tracks visitor contacts, not staff calling customers, and no customer identifier reaches analytics.

### Scope

**In scope:**
- list with URL filters and pagination, detail page with timeline;
- status, owner and note actions; CSV export with an export log;
- sidebar badge for `new`;
- migration: `lead_events` (timeline) and `lead_exports` (export log), RLS on, no policies;
- VI admin strings (EN parity in `messages/en.json`, as the other admin sections).

**Out of scope:**
- deleting or anonymising leads, retention jobs (Q-17);
- offline conversion upload of `won` leads by `gclid` (T-02) and server-side conversions (T-01);
- contact-event analytics (A-07);
- editing the customer's submitted data;
- notifications changes (S-08b owns email/Zalo alerts);
- TanStack Table or client-side sorting: the owner chose a server-rendered list (2026-10-28). This spec's context deliverable changes the A-06 roadmap row from "DataTable (TanStack Query + Table), filters (…)" to "server-rendered list with URL filters (status, route, source, date, owner) and pagination, detail timeline, status/owner/note actions, logged CSV export, sidebar badge".
- automated tests (ADR 0004).

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | admin pages | `app/admin/(shell)/leads/page.tsx` (replaces `ComingSoon`), `app/admin/(shell)/leads/[id]/page.tsx`, `app/admin/(shell)/leads/export/route.ts` (CSV route handler) |
| app | admin shell | `app/admin/(shell)/layout.tsx` (passes the badge count), `modules/auth/ui/admin-shell.tsx` / sidebar (renders an optional per-section badge) |
| app | leads module | `modules/leads/infrastructure/schema.ts` (`leadEvents`, `leadExports`), `infrastructure/admin-lead-queries.ts`, `infrastructure/admin-lead-writes.ts`, `application/admin-lead-schemas.ts`, use cases (`set-lead-status`, `assign-lead`, `add-lead-note`, `export-leads`), `domain/lead-source.ts`, `domain/csv.ts`, `lead-actions.ts` or `actions.ts`, `ui/admin/*`, `index.ts` |
| app | auth | `modules/auth` `listStaffNames` (exists) + a list of assignable staff (`profiles.role in (admin, sales)`) |
| app | db | `db/migrations/0012_*.sql`, `db/relations.ts` |
| app | i18n | `messages/vi.json`, `messages/en.json` (`admin.leads.*`) |
| context | docs | `docs/context/07-data-model.md` (new tables), `docs/context/06-architecture.md` (A-06 permissions line), `docs/context/10-roadmap.md` (A-06 row wording, see Out of scope), `AGENTS.md` rule 12 (staff-side contact link exception, AC-12) |

### Golden-rule checks

- **Rule 6:** lead reads/writes only in `modules/leads/infrastructure` (server-only); client islands get plain props.
- **Rule 7:** `requireSection("leads")` first in every page, action and the CSV route handler.
- **Rule 12:** staff-side `tel:`/Zalo links on the detail page are an explicit exception (AC-12): no `/go`, no events.
- **Rule 14 / PII:** phone, email, name and message only for `admin`/`sales`; `ip_hash` and `user_agent` never rendered or exported; no lead data in logs (log ids and error names only); exports are logged before data leaves; no tracking or conversion call from any inbox action.
- **Rule 15:** no lead rows in docs, commits or PR text; verification uses test leads.
- **Rule 10:** labelled filters and fields, keyboard-usable, 44 px targets.
- **Module rule:** `auth` must not import `leads` (cycle); the app shell layout composes the count and passes it to `AdminShell`.

### Dependencies & Risks

- Depends on: F-05, A-01 (shell, sections), S-08/S-08b (leads saved). No stack gap.
- Open questions (not blockers, ADR 0004): **Q-17** retention is a policy/launch question: this task adds no delete or anonymise, and the timeline and export log are kept like the leads. **Q-28**: email/Zalo alerts stay as S-08b built them, active only once Q-28 is answered.
- Risk: a CSV holds personal data outside the system. Mitigated by the role gate, the export log written first, `no-store` caching, and leaving out IP hashes and user agents (attribution identifiers stay, sales need them); the privacy policy (A-03) covers staff use.
- Risk: owner list from the `profiles` mirror can be stale (access still comes from the session claim); an assigned profile later deleted shows "—".

### Manual Verification Plan

- **Seed (Docker DB, `pnpm db:local` + `pnpm dev:local`; local dev otherwise shares the production Supabase, owner 2026-10-28):** a SQL fixture script in the PR (not committed data) that inserts, with fixed values:
  - 51 non-spam leads for pagination, across `sg`, `kr`, `us`, one with no route;
  - attribution set directly in the columns (the public form stores it only with ads consent and the `43l_attr` cookie): one `utm_source=newsletter` + `gclid`, one `fbclid` only, one `utm_source=Facebook`, one referrer-only (`https://zalo.me/…`), one with none;
  - `created_at` at 23:59:59 and 00:00:00 Asia/Ho_Chi_Minh on two adjacent days;
  - messages `=1+1`, `+SUM(A1)`, `-2`, `@x`, a leading tab, a leading CR, `a, "b"`, a two-line text, Vietnamese with diacritics;
  - one `spam` lead; a second script variant with 10 001 leads for the export cap.
- **Steps (agent: database + logic; owner: browser):**
  1. As `editor`: `/admin/leads/`, `/admin/leads/{id}/`, `/admin/leads/export/` → 403; POST status, assign and note actions → 403; the lead row and `lead_events` unchanged.
  2. As `sales`: page 1 lists 50 leads, page 2 lists 1, total 51; spam hidden; "Tất cả" shows 52. Badge = SQL count of `new`; set every `new` lead to another status → badge hidden; as `editor` no badge and no count query (server log or code path).
  3. Filters: `status=new&route=sg&owner=me` → URL updates, list and total match a SQL count; source `click:google` lists the newsletter+gclid lead and `utm:newsletter` does not; `utm:facebook` matches the `Facebook` lead; `ref:zalo.me` and `direct` match their leads; date `from=to=` the first day includes 23:59:59 and excludes 00:00:00; `?status=bogus&page=-1` is ignored.
  4. Detail: every AC-04 field, no IP hash or user agent; unknown id `…/00000000-0000-0000-0000-000000000000/` → 404; malformed id → 404.
  5. Status: `new` → `contacted` → entry "Mới → Đã liên hệ · {name} · {time}", badge −1; save `contacted` again → "unchanged", no entry. Two tabs on the same lead set `quoted` and `won` in turn → two entries in order (`contacted → quoted`, `quoted → won`), final `won`.
  6. Assign another sales account → entry; filter "Chưa giao" no longer lists it; posting a non-staff id → `fieldErrors.assignedTo`, nothing written.
  7. Note: 2 000 characters saves; 2 001 and blank are refused; the entry shows author and time; no edit/delete control; an old `leads.notes` value shows read-only.
  8. CSV: export the 51-lead view → 51 rows, headers per AC-08, `Cache-Control: private, no-store`; open in Excel/Numbers: Vietnamese intact, each dangerous message shows literally, `a, "b"` and the two-line message stay in one cell, phones read `+84…`; `lead_exports` row with outcome `ok`. With the 10 001 fixture → refused, `refused` log row, no file. Make the log insert fail (e.g. revoke insert on `lead_exports` in Docker) → 500, no lead data.
  9. "Gọi"/"Zalo" open `tel:+84…` / `zalo.me/84…`; no `contact_events` row, no `dataLayer`/PostHog request (Network panel).
  10. Consent matrix (ADR 0004 Decision 2), lead row: inbox actions and exports send no conversion, tracking or notification; a public lead submission still behaves as before (the matrix rows for the form).
  11. **Owner, browser** (phase-2 admin rule: the agent runs no browser): 360/768/1280 px, keyboard pass over filters, pagination and actions, reduced motion, axe at 360 and 1280 px with no serious/critical issues.
- **Validation commands:** `lint`, `typecheck`, `check:boundaries`, `build`, `i18n:check`, `check:redirects`; `db:generate` for `0012`. No Lighthouse/SEO on admin pages (ADR 0009, phase-2 admin rule).

### Implementation Hints

- Follow the A-02/A-03 admin patterns: uncached reads after `requireSection`, `export const instant = false` on the pages, `useActionForm` dialogs/forms, translated `ActionState` (`runCardEdit`-style runner), `lastEditText`/`listStaffNames` for names.
- Status/assign/note write the `leads` update and the `lead_events` row in one transaction; `revalidate` isn't needed (uncached), but `router.refresh()` via the action result keeps the page current.
- CSV through a route handler (`GET`, `requireSection`, headers per AC-08), built by a pure `domain/csv.ts` (RFC 4180 quoting, formula prefix, BOM) from the same filter schema and SQL predicates as the list; `deriveLeadSource()` and its SQL twin live side by side so display and filter can't drift.
- Lessons: s08 lead-form lesson (specs miss files a new prop/enum threads through; run `lint:fix` on changed files only).

### Related

- Roadmap A-06; Phase 2 note "A-06 (leads inbox)".
- `specs/feature-s08-lead-form.md`; S-08b (PR #29).
- `docs/context/06-architecture.md` Permissions; `docs/context/07-data-model.md` leads; `docs/context/05-seo-and-tracking.md` attribution fields.
- ADR 0004 (no tests), ADR 0005 (modules), ADR 0009 (perf gates; admin N/A).
