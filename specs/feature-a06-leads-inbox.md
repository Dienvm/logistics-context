---
title: Work quote requests from an admin leads inbox
type: feature
status: draft
owner_repo: both
roadmap: A-06
priority: must-have
blocked_by_questions: [Q-17]
updated: 2026-10-28
---

## Feature: Work quote requests from an admin leads inbox

### Problem Statement

Quote requests from the always-on form (S-08, S-08b) are saved in `leads`, but sales see them only in the database and in the email/Zalo alerts (roadmap Phase 2 note). Nobody can tell which requests were answered, who owns a customer, what was said, or which campaign brought a won customer. Turning visitors into contacts is the site's first goal (AGENTS.md §1); without an inbox the contacts it collects aren't worked.

Roadmap: **A-06 Leads inbox** (sales). *Accept:* `editor` gets 403.

### Proposed Solution

`/admin/leads/` becomes the sales inbox (sections `leads`: `admin`, `sales`; `ADMIN_SECTIONS`, A-01):

- **List** (server-rendered, like the other admin sections; owner decision 2026-10-28, no TanStack Table): newest first, 50 per page, columns received at, name, phone, route, weight, status, owner, source. Filters live in the URL (`?status=&route=&source=&from=&to=&owner=&page=`), so a filtered view can be shared and reloaded. Default view hides `spam`.
- **Detail** `/admin/leads/{id}/`: the customer's data, the request (route, weight, dimensions, goods type, message, estimate), attribution (UTM, click IDs, landing path, referrer, consent), quick "Gọi" (`tel:`) and "Zalo" (`zalo.me/{phone}`) links for the staff member, and a **timeline** of status changes, assignments and notes, each with who and when.
- **Actions** on the detail page: change status, assign an owner (admin or sales staff), add a note.
- **CSV export** of the current filtered list (admin and sales), logged.
- **Sidebar badge:** the number of `new` leads next to "Yêu cầu báo giá", for roles that see the section.

### Acceptance Criteria

- [ ] **AC-01 Access.** Given a signed-in `editor`, when they open `/admin/leads/`, `/admin/leads/{id}/`, the CSV export, or POST any lead action, then they get 403 and nothing is read or written. `admin` and `sales` get the pages; no session → `/admin/sign-in/`.
- [ ] **AC-02 List.** Given leads exist, when `/admin/leads/` opens, then it shows the newest 50 non-spam leads with received at (Asia/Ho_Chi_Minh), name (or "—"), phone, route name (or "—"), weight, status badge, owner name (or "Chưa giao") and source (the first of `utm_source`, click-ID platform, referrer host, "Trực tiếp"); pagination shows the total and moves by 50.
- [ ] **AC-03 Filters.** Given the filter form, when staff pick status (any of the 6, or "Tất cả" including spam), route, source (`utm_source` value or click-ID platform), date range (inclusive, Vietnam days), owner ("Của tôi", "Chưa giao", a staff member), then the URL carries the filters, the list and the total match them, and an invalid parameter is ignored (Zod) instead of erroring.
- [ ] **AC-04 Detail.** Given a lead id, when `/admin/leads/{id}/` opens, then it shows every stored field except `ip_hash` and `user_agent`, the consent time and policy version, and the timeline newest first. An unknown or malformed id → 404.
- [ ] **AC-05 Status.** Given the detail page, when staff set a status (`new`, `contacted`, `quoted`, `won`, `lost`, `spam`; any transition allowed), then `leads.status` and `updated_at` change and a timeline entry records old → new status, who and when. Saving the same status writes nothing.
- [ ] **AC-06 Assign.** Given the owner select (staff whose `profiles.role` is `admin` or `sales`, not deleted, plus "Chưa giao"), when staff save an owner, then `leads.assigned_to` changes and a timeline entry records it; an id that isn't such a profile is refused (`fieldErrors.assignedTo`).
- [ ] **AC-07 Notes.** Given the note box, when staff add a note (1–2000 characters, trimmed), then a timeline entry stores it with author and time; notes are append-only (no edit or delete). The existing `leads.notes` column is shown read-only as "Ghi chú cũ" when not empty and is no longer written.
- [ ] **AC-08 CSV.** Given a filtered list, when staff click "Xuất CSV", then they download `leads-{YYYY-MM-DD}.csv` (UTF-8 with BOM, so Excel shows Vietnamese) with every lead matching the filters (all pages, max 10 000 rows; more → the export is refused with a message), columns: received at, name, phone, email, route, weight, dimensions, goods type, message, estimate, status, owner, locale, source path, landing path, referrer, UTM ×5, gclid, gbraid, wbraid, fbclid, ttclid, ads consent, consent at. No `ip_hash`, no `user_agent`. A cell starting with `=`, `+`, `-`, `@`, tab or CR is prefixed with `'` (formula injection). Each export writes a log row (who, when, filters, row count).
- [ ] **AC-09 Badge.** Given `new` leads exist, when an `admin` or `sales` user sees the admin sidebar, then "Yêu cầu báo giá" shows their count (hidden at 0); an `editor` sees no badge and no count is queried for them.
- [ ] **AC-10 Freshness.** Given a lead was submitted or changed, when staff reload the list, detail or badge, then they see it: admin lead reads are uncached and filtered in SQL.
- [ ] **AC-11 No deletes.** Given any role, there is no way to delete a lead (Q-17 retention is open); `spam` is how a lead leaves the default view.

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
- TanStack Table or client-side sorting (roadmap row amended: server-rendered list);
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
| context | docs | `docs/context/07-data-model.md` (new tables), `docs/context/06-architecture.md` (A-06 permissions line), `docs/context/10-roadmap.md` (A-06 row: server-rendered list) |

### Golden-rule checks

- **Rule 6:** lead reads/writes only in `modules/leads/infrastructure` (server-only); client islands get plain props.
- **Rule 7:** `requireSection("leads")` first in every page, action and the CSV route handler.
- **Rule 14 / PII:** phone, email, name and message only for `admin`/`sales`; `ip_hash` and `user_agent` never rendered or exported; no lead data in logs (log ids and error names only); exports are logged.
- **Rule 15:** no lead rows in docs, commits or PR text; verification uses test leads.
- **Rule 10:** labelled filters and fields, keyboard-usable, 44 px targets.
- **Module rule:** `auth` must not import `leads` (cycle); the app shell layout composes the count and passes it to `AdminShell`.

### Dependencies & Risks

- Depends on: F-05, A-01 (shell, sections), S-08/S-08b (leads saved). No stack gap.
- Blocked by questions: **Q-17** (retention): no delete or anonymise in this task; the timeline and export log are kept like the leads.
- Risk: a CSV holds personal data outside the system. Mitigated by role gate, export log and no technical identifiers; the privacy policy (A-03) covers staff use.
- Risk: owner list from the `profiles` mirror can be stale (access still comes from the session claim); an assigned profile later deleted shows "—".

### Manual Verification Plan

- **Seed:** 5+ test leads submitted through `/tinh-cuoc/#bao-gia` (or inserted in the Docker DB) with different routes, one with `?utm_source=facebook&fbclid=x`, one with `?gclid=y`; one marked spam. Note: local dev shares the production Supabase (owner, 2026-10-28) — use the Docker DB (`pnpm db:local`, `pnpm dev:local`) or clearly marked test leads that are set to `spam` afterwards.
- **Steps:**
  1. As `editor`: `/admin/leads/`, `/admin/leads/{id}/`, `/admin/leads/export/` → 403; POST a status action → 403, row unchanged.
  2. As `sales`: list shows the newest 50 non-spam leads with the columns of AC-02; the badge equals the count of `new`.
  3. Filter status `new` + route `sg` + "Của tôi": URL updates, count matches a SQL count; reload keeps the filter; `?status=bogus` is ignored.
  4. Open a lead: all fields of AC-04, no IP hash or user agent; set status `contacted` → timeline entry "Mới → Đã liên hệ · {name} · {time}", badge drops by 1.
  5. Assign to another sales account → entry; filter "Chưa giao" no longer lists it.
  6. Add a note → entry with author; reload shows it; no edit/delete control.
  7. Export the filtered list → CSV opens in Excel with Vietnamese intact, rows = filtered count, no `ip_hash`/`user_agent`; a test lead whose message starts with `=1+1` shows as text; `lead_exports` has the row.
  8. Unknown id `/admin/leads/00000000-0000-0000-0000-000000000000/` → 404.
  9. Keyboard pass over filters, pagination and the detail actions; axe at 1280 px: no serious/critical.
- **Validation commands:** `lint`, `typecheck`, `check:boundaries`, `build`, `i18n:check`, `check:redirects`; `db:generate` for `0012`. Per the phase-2 admin rule: static checks + logic review; no Lighthouse/SEO on admin. No consent-matrix re-run (no public lead flow change).

### Implementation Hints

- Follow the A-02/A-03 admin patterns: uncached reads after `requireSection`, `export const instant = false` on the pages, `useActionForm` dialogs/forms, translated `ActionState` (`runCardEdit`-style runner), `lastEditText`/`listStaffNames` for names.
- Status/assign/note write the `leads` update and the `lead_events` row in one transaction; `revalidate` isn't needed (uncached), but `router.refresh()` via the action result keeps the page current.
- CSV through a route handler (`GET`, `requireSection`, `Content-Disposition: attachment`), built by a pure `domain/csv.ts` (escaping, BOM) from the same filter schema as the list.
- Lessons: s08 lead-form lesson (specs miss files a new prop/enum threads through; run `lint:fix` on changed files only).

### Related

- Roadmap A-06; Phase 2 note "A-06 (leads inbox)".
- `specs/feature-s08-lead-form.md`; S-08b (PR #29).
- `docs/context/06-architecture.md` Permissions; `docs/context/07-data-model.md` leads; `docs/context/05-seo-and-tracking.md` attribution fields.
- ADR 0004 (no tests), ADR 0005 (modules), ADR 0009 (perf gates; admin N/A).
