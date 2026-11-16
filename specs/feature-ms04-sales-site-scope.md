---
title: Limit sales staff to their assigned companies' leads
type: feature
status: approved
owner_repo: app
roadmap: MS-04
priority: must-have
blocked_by_questions: [Q-43]
updated: 2026-11-16
---

## Feature: Limit sales staff to their assigned companies' leads

### Problem Statement

Today every `admin` and `sales` user of the shared admin (43logistics.vn/admin) reads and edits the leads of all three companies (43l, av, gt). The Website column is display only (MS-04 partial, 2026-10-30), and the analytics `?site=` switcher is free for every user.

The owner now requires that a telesale of one company can't read another company's customer data (owner, 2026-11-16; ADR 0014 Decision 6, amending ADR 0012). The same scope will gate the Chatwoot inbox later (IN-01), so it has to exist in the website admin first.

This spec delivers the `sales` part of MS-04's "site-scoped roles" bullet. The `editor` scope and the target-site switcher stay open under Q-36.

### Proposed Solution

**Who sees what**
- An `admin` keeps seeing every site.
- A `sales` user carries a list of companies in their Clerk account, `publicMetadata.sites`, e.g. `["av"]` or `["43l","gt"]`. In the leads inbox, a lead detail, a CSV export, the new-lead badge and the analytics report, they see and change only leads, contact clicks and visits of those sites.
- A lead of another site behaves as if it doesn't exist (404).

**Rollout without lock-out**
- One server env switch decides what a **missing** claim means:
  - **lenient** (default): missing means all sites, as today, and a warning is logged with the user ID only;
  - **strict**: missing or empty means no lead access.
- The admin sets `sites` on every sales user (Clerk dashboard runbook; Q-43 gives the list), and the mirror is reconciled (AC-11b).
- Then the switch is flipped to strict. That needs no new build, but it does need a container **recreate**: `docker compose --env-file .deploy.env up -d --force-recreate app`. A plain restart keeps the old env (`deploy/README.md`).

### Acceptance Criteria

**Claim and scope**
- [ ] **AC-01** Given the Clerk session token template includes `"sites": "{{user.public_metadata.sites}}"`, when `getStaff()` runs, then `Staff` carries `sites`, validated by Zod against the three site codes:
  - a valid non-empty list → that list;
  - missing → `undefined`;
  - anything else (not an array, unknown code, empty) → `"invalid"`.
- [ ] **AC-02** `staffSiteScope(staff)` returns `"all"` for `admin`. For `sales` it returns:
  - the claim list when it is valid;
  - `"all"` for a missing claim in lenient mode, logging `auth: sales user <userId> has no sites claim` once per request;
  - `[]` for a missing claim in strict mode;
  - `[]` for an `"invalid"` claim in **both** modes (fail closed), logging the user ID only.

  Strict mode is `STAFF_SITE_SCOPE=strict` in server env. Any other value or unset is lenient.

**Leads inbox (A-06)**
- [ ] **AC-03** Given a `sales` user with scope `["av"]`, when they open `/admin/leads/`, then:
  - the list, the total count and the pagination include only `site = 'av'` leads;
  - the source and owner filter options are derived only from in-scope data;
  - the Website filter (new, see AC-09) offers only `av`.
- [ ] **AC-04** Given the same user, when they open `/admin/leads/{id}/` for a `43l` or `gt` lead, then the response is a 404 and no lead field, event or note is rendered.
  - `findAdminLead(id, scope)` and `listLeadEvents(leadId, scope)` both carry the site predicate.
  - The timeline query never runs for an out-of-scope ID; a direct call with an out-of-scope `leadId` returns no rows.
- [ ] **AC-05** Given the same user, when they post any lead action (`setLeadStatusAction`, `assignLeadAction`, `addLeadNoteAction`, `setLeadSourceAction`) with the ID of an out-of-scope lead, then:
  - the action returns the existing not-found result;
  - nothing is written: no `leads` update, no `lead_events` row.

  The check runs inside the same transaction, right after `lockLead`. It **returns** the use case's existing `{ kind: "notFound" }` result, which `runLeadEdit()` maps. It does not throw, because `lead-action-runner.ts` turns thrown errors into generic failures.
- [ ] **AC-06** Given the same user, when they open `/admin/leads/new/`, then the site choice offers only their scope (pre-selected when it has one entry). A posted `site` outside their scope is rejected with a field error and nothing is inserted.
  - **Existing gate stays.** Staff-created leads and source edits are still behind `NEXT_PUBLIC_SESSION_ATTRIBUTION` (`lead-actions.ts`, Q-39). With the flag off, they keep returning 404 / not found as today, and this spec only adds the scope checks inside them.
  - **Verification** of the enabled path is by logic review unless an isolated setup with the flag on is available.
- [ ] **AC-07** Given the same user, when they download `/admin/leads/export/`, then:
  - the CSV contains only in-scope rows;
  - the `lead_exports` row records the scope used (`site_scope`: the list, or null for `"all"`) before any byte is sent.
- [ ] **AC-08** Given the same user, when any admin page renders the shell, then the new-lead badge counts only in-scope `new` leads.
- [ ] **AC-09** A Website filter (`?site=`) is added to the A-06 filters for every user with more than one site in scope (admin: all three). A value outside the scope is ignored, i.e. treated as no filter within scope, and never widens the scope.

**Assignment**
- [ ] **AC-10** Given a lead of site `av`, when the owner picker renders or `assignLeadAction` runs, then the only assignable people are:
  - `admin` profiles;
  - `sales` profiles whose mirrored `profiles.sites` includes `av`.

  Assigning anyone else returns the existing "not assignable" result and writes nothing. For a `sales` profile, by its mirrored `profiles.sites`:
  - `null` (claim missing): assignable to any site in lenient mode, never in strict mode;
  - `[]` (claim invalid or empty): **never** assignable, in either mode.
- [ ] **AC-11** Given an admin edits a user's `publicMetadata.sites` in Clerk, when the `user.updated` webhook arrives, then `profiles.sites` mirrors it:
  - the valid list → that list;
  - missing → `null`;
  - invalid or empty → `[]`, which keeps the distinction AC-10 needs.

  The mirror is used only for assignee lists and checks, never for the caller's own access (06 "Auth & roles").
- [ ] **AC-11b Reconciliation before strict.** After the build with the new webhook is deployed, the admin re-saves `publicMetadata.sites` on every `sales` user in Clerk, which fires `user.updated`. Then a read-only SQL check on Supabase (`select username, role, sites from profiles where role = 'sales' and deleted_at is null`) shows a non-null list for each of them. Strict mode is switched on only after this check is clean.

**Analytics (A-07)**
- [ ] **AC-12** Given a `sales` user with scope `["av"]`, when they open `/admin/analytics/` or its CSV export with any `?site=` value, then:
  - every count (contact clicks, leads, won/reported leads, entry sources, visits) covers only `av`;
  - the site navigation shows only "all (= my sites)" and the sites in scope;
  - `?site=43l` is treated as "all within scope".
- [ ] **AC-13** Given an `admin`, when they use the leads inbox, export, badge and analytics, then behaviour is unchanged from today, plus the new Website filter in A-06.

**Empty scope**
- [ ] **AC-14** Given a `sales` user whose scope resolves to `[]`, when they open the leads inbox or analytics, then:
  - they see an empty state with the message key `admin.leads.noSiteScope` (VI and EN): "Tài khoản chưa được gán công ty. Liên hệ quản trị viên.";
  - the badge shows nothing;
  - every lead detail is a 404;
  - no lead or count query returns rows.

**Data**
- [ ] **AC-15** Migration `0019_staff_site_scope` is additive:
  - `profiles.sites site_code[]` nullable;
  - `lead_exports.site_scope site_code[]` nullable.

  It is applied on Supabase **before** the build that reads them is deployed (local dev uses the production database).

### Scope

**In scope:**
- **Types and claim:**
  - a shared `SiteCode` type and `SITE_CODES` constant (three values);
  - the `sites` claim parser and `staffSiteScope()`;
  - the strict/lenient env switch.
- **Leads (A-06):** scoping of list, count, export, detail, events, every write action, staff-created leads, source edits, filter options, owner picker and badge.
- **Analytics (A-07):** scoping of page, CSV, contact clicks, leads, visits and reports.
- **Data:** the `profiles.sites` mirror via the Clerk webhook; the `lead_exports.site_scope` column; migration 0019.
- **Copy:** messages for the empty-scope state and the Website filter label (VI and EN).
- **Runbook:**
  - Clerk session-token template update (dev and production instances);
  - setting `publicMetadata.sites`;
  - flipping `STAFF_SITE_SCOPE=strict`;
  - revoking immediately by ending sessions.

  Lives in `deploy/README.md` admin section, and in `docs/context/06-architecture.md` through `/mark-implemented`.

**Out of scope:**
- **Editor scope and content:** `editor` site scope, the MS-04 target-site switcher for pages, settings and menus, and goods-rule approval (Q-36).
- **Admin UI for users:** a users screen in the admin to set `sites`. The Clerk dashboard is used.
- **Chatwoot:** accounts and memberships (IN-01).
- **The GT and AV repos:**
  - GT's admin is not served, since GT's env has no Clerk keys and the admin is 43's only (ADR 0012, ADR 0014). The GT repo's auth and leads files are not changed here.
  - If GT ever serves an admin, this spec must be ported first.
  - The `app-av` service is built from this same repo, so it gets the code but serves no admin either.
- **Changing what `admin` sees.**

### MS-04 coverage

MS-04 **stays open** after this spec.

| MS-04 roadmap bullet | This spec |
|----------------------|-----------|
| A switcher for the site-owned sections | Deferred (Q-36, editor/content) |
| Target-site validation on every read, write, ID lookup and export | Covered **for leads and analytics**: AC-03–AC-09, AC-12. Content sections are deferred. |
| Site-scoped roles (Q-36) | Covered for `sales` (AC-01, AC-02, AC-10, AC-11, AC-11b, AC-14). `editor` is deferred. |
| Site column and filter in leads and analytics | Column already exists (2026-10-30). Filter covered by AC-09 and AC-12. |
| Leads and consent records store the site and its privacy-policy version | Already satisfied for leads: `leads.site` from `currentSite` (`modules/leads/infrastructure/leads.ts`), and `leads.consent_policy_version` (07 "Privacy policy version"). No change. |

### Affected Areas

| Repo | Layer | File / Path |
|------|-------|-------------|
| app | shared config | `shared/config/site-codes.ts` (new: `SITE_CODES`, `SiteCode`); `db/enums.ts` `siteCode` built from `SITE_CODES` |
| app | auth domain | `modules/auth/domain/staff.ts` (`sites` on `Staff`/`AuthorizedStaff`), new `modules/auth/domain/site-scope.ts` (pure `resolveSiteScope(role, sites, strict)`) |
| app | auth application | `modules/auth/application/require-role.ts` (parse `sessionClaims?.sites`, `staffSiteScope()`), `application/sync-profile.ts` (`sitesOf(metadata)`, upsert `sites`) |
| app | auth infrastructure | `modules/auth/infrastructure/schema.ts` (`profiles.sites`), `profiles-repository.ts` (`ProfileMirror` + `sites`), `staff-names.ts` (`listAssignableStaff(roles, site?)`) |
| app | auth API | `modules/auth/index.ts` exports |
| app | config | `shared/config/env.server.ts` (`STAFF_SITE_SCOPE`), `.env.example` |
| app | leads filters | `modules/leads/infrastructure/admin-lead-filters.ts` (`LeadFilterContext.scope`, `inArray(leads.site, …)`, the `site` filter), `domain/admin-lead.ts` (`LeadFilters.site`), `admin-lead-schemas.ts` (`site` param, staff-lead `site` within scope), `application/admin-lead-context.ts` (`resolveLeadFilters` threads the scope) |
| app | leads queries | `modules/leads/infrastructure/admin-lead-queries.ts`: `findAdminLead(id, scope)`, `countNewLeads(scope)`, `listLeadSourceKeys(scope)`, `listLeadsForExport` |
| app | leads writes | `modules/leads/infrastructure/admin-lead-writes.ts` (`lockLead` returns site, the caller checks scope), `insertLeadExport` (`siteScope`) |
| app | leads use cases | `application/assign-lead.ts` (assignee covers the lead's site), `set-lead-status.ts`, `add-lead-note.ts`, `set-lead-source.ts`, `create-staff-lead.ts`, `export-leads.ts` |
| app | leads actions/routes | `modules/leads/lead-actions.ts`, `lead-action-runner.ts`, `lead-export-route.ts` (pass the scope from `requireSection`) |
| app | leads UI | `modules/leads/ui/admin/lead-filters.tsx` (Website filter), `new-staff-lead.tsx` (site options), `admin-lead-list.tsx`, `admin-lead-detail.tsx` (picker by site), empty-scope state |
| app | shell | `app/admin/(shell)/layout.tsx` (badge with scope) |
| app | lead pages | `app/admin/(shell)/leads/page.tsx`, `leads/[id]/page.tsx`, `leads/new/page.tsx`: keep the `requireSection` result and pass its scope down (they discard it today); `leads/export/route.ts` → `lead-export-route.ts` |
| app | analytics pages | `app/admin/(shell)/analytics/page.tsx`, `analytics/export/route.ts`; `modules/analytics/ui/admin/analytics-report.tsx`, `ui/admin/weekly-report.tsx`; `modules/analytics/application/weekly-tables.ts`. The scope reaches both the page branch and the CSV branch of every view |
| app | db helper | `db/site-condition.ts` (new, server-only): `siteCondition(column, scope)`. It lives in `db/` so `leads`, `contact` and `tracking` import it via `@/db/…` with no cross-module deep import (`check:boundaries`) |
| app | analytics | `modules/analytics/application/report-params.ts` (clamp `site` to scope), `load-report.ts`, `load-source-report.ts`, `view-tables.ts`, `export-report.ts`, `ui/admin/report-nav.tsx` (links in scope) |
| app | stats queries | `modules/leads/infrastructure/lead-stats.ts`, `modules/contact/infrastructure/contact-stats.ts`, `modules/tracking/infrastructure/visit-stats.ts` (`site: "all" \| SiteCode[]` via `inArray`) |
| app | DB | `db/migrations/0019_staff_site_scope.sql` + journal/snapshot; `modules/leads/infrastructure/schema.ts` (`lead_exports.site_scope`) |
| app | copy | `messages/vi.json`, `messages/en.json` (`admin.leads.noSiteScope`, `admin.leads.filters.site`, analytics equivalent) |
| app | runbook | `deploy/README.md` (Clerk token template, `sites`, strict switch, revoke) |
| context | docs (at `/mark-implemented`) | `docs/context/06-architecture.md` "Auth & roles", `07-data-model.md` profiles + lead_exports, `10-roadmap.md` MS-04 |

### Golden-rule checks

- **Rule 6:** all scope checks are server-side. `sites` never reaches a Client Component except as the list of allowed filter options.
- **Rule 7:** `requireSection` stays first. The scope is derived from the same session, and every query and write receives it explicitly; there is no default-to-all at the query layer, so a call site that forgets it fails typecheck.
- **Rule 14:** no customer data crosses companies for `sales`. The export log records the scope. No raw IP is touched.
- **Rule 15:** `STAFF_SITE_SCOPE` isn't a secret. Logs carry the user ID only, never the claim payload or lead data.
- **Rule 12** exception unchanged: staff call/Zalo links in A-06 stay direct.
- **No public-page change:** JS budget (rule 8), SEO and redirects are unaffected.

### Dependencies & Risks

- **Depends on:**
  - ADR 0014 (logistics-context PR #110);
  - F-05 Clerk roles;
  - A-06, A-07, A-07b (migration 0017) and migration 0018 already on `main`.
- **Owner/operator steps:**
  1. Update the Clerk session-token template (dev and production) **before** deploying. Without it the claim is always missing, so lenient mode keeps today's behaviour; harmless but unscoped.
  2. Set `publicMetadata.sites` for each sales user (Q-43 list).
  3. Reconcile `profiles.sites` (AC-11b).
  4. Set `STAFF_SITE_SCOPE=strict` and recreate `app` (`up -d --force-recreate app`, not `restart`).
  5. Verify that a test `sales` account with no `sites` now sees the empty-scope state.
- **Blocked by questions:** Q-43 (which telesale covers which company). Not a code blocker (ADR 0004): until answered, lenient mode keeps every sales user on all sites.
- **Risk: a missed call site leaks another site's lead.** Mitigation:
  - the scope is a **required** parameter on every admin lead and stats function, with no optional default;
  - the review greps every `from(leads)`, `from(contactEvents)` and `from(siteVisits)` in `modules/*/infrastructure` and checks each one takes the scope (lesson 2026-10-23 s08: threads through many files).
- **Risk: token size and refresh.** Clerk session claims are capped around 1.2 KB and the list is at most three codes. A changed `sites` applies at the next token refresh (about a minute); ending the user's sessions applies it immediately.
- **Risk: migration ordering.** Local dev uses the production database, so 0019 is applied before the build. It is additive, and the old build ignores the new columns.

### Manual Verification Plan

Admin-only change: static checks plus a logic review. No CI wait, Lighthouse or browser scripts (owner, phase-2 admin rule).

- **Validation commands:**
  - `pnpm -C projects/43logistics.vn lint`, `typecheck`, `check:boundaries`, `build`, `i18n:check`, `check:redirects`;
  - gitleaks in CI;
  - the consent matrix isn't needed (no consent, tracking or proxy change; lead processing changes only in admin reads).
- **Scope resolver table (logic review):** the reviewer reads `resolveSiteScope` and confirms each row by reasoning, then records the table in the PR. Optionally a throwaway `tsx` one-liner prints it; it is not committed.

| role | sites claim | strict | expected |
|------|-------------|--------|----------|
| admin | any | any | `"all"` |
| sales | `["av"]` | any | `["av"]` |
| sales | missing | off | `"all"` (+ warning) |
| sales | missing | on | `[]` |
| sales | `[]` / `["xx"]` / `"av"` | any | `[]` |
| editor | any | any | not used (no lead access) |

- **Isolation matrix (in the PR body).**
  - **How it is verified:** by documented logic review. For each row, the reviewer names the function and line where the scope or role check stops the request, and the expected result. Rows the production smoke executes are marked "executed". Rows also run end to end on `pnpm db:local` (only if Clerk dev keys are available; memory: local keys are live) are marked "e2e". Anything not executed stays "logic review only", never "verified".
  - **Who:** `sales` users with `["av"]`, with `["43l","gt"]` (multi-site), with a missing claim (lenient and strict) and with an invalid claim; one `admin`; one `editor`.
  - **Leads:**
    - list, count and pagination;
    - every filter option, including `?site=` with an in-scope value, an out-of-scope value and a garbage value;
    - detail and timeline of an out-of-scope ID;
    - each of `setLeadStatusAction`, `assignLeadAction`, `addLeadNoteAction` and `setLeadSourceAction` with an out-of-scope ID: no `leads` or `lead_events` change (counted before and after in the review of the transaction path);
    - `assignLeadAction` to an assignee who doesn't cover the lead's site;
    - `createStaffLeadAction` with an out-of-scope `site` (flag on and flag off);
    - the export and its `lead_exports.site_scope`;
    - the badge.
  - **Analytics:** `/admin/analytics/` and `/admin/analytics/export/?view=…` for **every** view (`ANALYTICS_VIEWS`), each with `?site=all`, an in-scope site and an out-of-scope site.
  - **Regressions:**
    - `admin` sees every site with no warning;
    - `editor` still gets 403 on leads and analytics, and no lead count is queried for them.
- **Call-site audit (in the PR body):** `rg -n "from\\((leads|leadEvents|contactEvents|siteVisits)\\)" modules` lists every hit with the scope argument that reaches it, or why it's public (public insert, `/go` logging).
- **Smoke test on production after deploy (owner or dev, one test account):**
  1. Create a Clerk user `test-sales-av` with role `sales`, `sites: ["av"]`.
  2. Signed in as that user:
     - `/admin/leads/` shows only avlogistics.vn rows;
     - a known 43 lead URL → 404;
     - the badge matches the av `new` count;
     - `/admin/analytics/?site=43l` shows av-only numbers;
     - the export CSV holds only av rows, and its `lead_exports.site_scope = {av}`.
  3. Set `sites: []`: the empty-scope message, no rows.
  4. Delete the test user. No test edits remain on live leads (memory: local = production DB).
- **Seed needs:** none. Production already holds leads of more than one site. If it doesn't, the reviewer checks the queries by reading them.

### Implementation Hints

- Put the pure logic in `modules/auth/domain/site-scope.ts` and keep `require-role.ts` thin. Return `AuthorizedStaff & { scope: SiteScope }` from `requireSection` so callers can't forget it, or add `requireSectionScope(key)`. Pick one and use it everywhere.
- `SiteScope = "all" | readonly SiteCode[]`. Write one helper, `siteCondition(column, scope)`: `undefined` for `"all"`, `sql\`false\`` for `[]`, `inArray(column, scope)` otherwise. Reuse it in leads, contact and visit stats.
- **Analytics:** today `"all" | SiteKey` becomes the requested site intersected with the scope. Compute it once in `report-params.ts` and pass the effective list down.
- `lockLead` already selects `site`. Check scope right after it and **return** `{ kind: "notFound" }` before any write. The runner maps returned results, and a throw would become a generic failure.
- `STAFF_LEAD_SITES` becomes `SITE_CODES`. Filter the options by scope in the page (server), and re-validate in the action.
- **Webhook:** copy `roleOf` into `sitesOf`. Keep the "soft-deleted row is never revived" rule.
- **Lesson 2026-10-23 (s08):** list every touched file in the PR, and run `biome check` on changed files only, not a repo-wide `lint:fix`.
- **Memory:** scripted edits after Biome reformatting, so assert the old string exists. Local dev = production Supabase, so apply migration 0019 there only after the owner's go-ahead and before the deploy.

### Related

- `docs/adr/0014-unified-customer-inbox-chatwoot.md` Decision 6
- `docs/adr/0012-multi-site-shared-database-and-admin.md` (amended)
- `docs/context/10-roadmap.md` MS-04
- `docs/context/06-architecture.md` "Auth & roles"
- `specs/feature-a06-leads-inbox.md`, `specs/feature-a07-contact-analytics.md`, `specs/feature-a07b-source-attribution-all-contacts.md`
- `specs/feature-in00-chatwoot-spike.md` (sibling)
- Q-33, Q-36, Q-43
- `lessons/2026-10-23-s08-lead-form.md`
