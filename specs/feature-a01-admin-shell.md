---
title: Build the role-aware admin shell with sidebar and UserButton
type: feature
status: in_implementation
branch: feat/a01-admin-shell
implementation_pr: https://github.com/Dienvm/43logistics.vn/pull/39
owner_repo: both
roadmap: A-01
priority: must-have
blocked_by_questions: []
updated: 2026-10-24
---

## Feature: Build the role-aware admin shell with sidebar and UserButton

### Problem Statement

F-05 put `/admin` behind Clerk and roles, but staff land on a bare identity list (`modules/auth/ui/admin-page.tsx`: "A-01 replaces it with the real shell"). Every Phase 2 screen (A-02…A-09) needs the same frame: navigation that shows only what the signed-in role may open, an account menu, and the TanStack Query provider the admin data screens use (`docs/context/06-architecture.md` folder tree and state table, `.claude/rules/state-patterns.md`).

Roadmap A-01: "`/admin` layout with Clerk `<UserButton>`, nav by role, React Query provider." The row has no *Accept* text; this spec defines it.

Today only one role gate exists in code (`LEADS_ROLES` on `/admin/leads/`). The rest of the permission matrix (06-architecture "Permissions") lives only in prose, so each A-0x task would re-decide it. A-01 makes it one typed map that both the menu and the page guards read.

### Proposed Solution

- After sign-in, staff see a left **sidebar** (shadcn Sidebar; a Sheet on mobile) with the sections their role may open, grouped, plus a header with the current section title and Clerk's **`<UserButton>`** (account, password, sign-out → `/admin/sign-in/`).
- `/admin/` becomes a **welcome page**: "Xin chào, {name}", the role, and one shortcut card per section the role may open. The identity table goes away (the UserButton menu shows the account).
- Every section has a real, role-guarded route now. Sections not built yet show a "Sắp có" (coming soon) page naming the roadmap task; A-02…A-09 replace the page body later without touching the guard or the menu.
- Permissions (owner decision 2026-10-24, "as documented"):

| Section | Path | Roadmap | admin | editor | sales |
| --- | --- | --- | --- | --- | --- |
| Tổng quan | `/admin/` | A-01 | ✓ | ✓ | ✓ |
| Yêu cầu báo giá | `/admin/leads/` | A-06 | ✓ | — | ✓ |
| Thống kê liên hệ | `/admin/analytics/` | A-07 | ✓ | — | ✓ |
| Tuyến & bảng giá | `/admin/routes/` | A-02 | ✓ | ✓ | — |
| Trang | `/admin/pages/` | A-03 | ✓ | ✓ | — |
| Bài viết | `/admin/posts/` | A-03 | ✓ | ✓ | — |
| Thư viện ảnh | `/admin/media/` | A-04 | ✓ | ✓ | — |
| Câu hỏi thường gặp | `/admin/faqs/` | A-05 | ✓ | ✓ | — |
| Quy định hàng hoá | `/admin/goods-rules/` | A-05 | ✓ | ✓ | — |
| Đánh giá khách hàng | `/admin/testimonials/` | A-05 | ✓ | ✓ | — |
| Chuyển hướng | `/admin/redirects/` | A-08 | ✓ | — | — |
| Cài đặt | `/admin/settings/` | A-09 | ✓ | — | — |

Menu groups: **Tổng quan**; **Kinh doanh** (leads, analytics); **Nội dung** (routes, pages, posts, media, faqs, goods-rules, testimonials); **Hệ thống** (redirects, settings). A group with no visible item is not rendered.

### Acceptance Criteria

**Permission map (single source of truth)**

- [ ] Given `modules/auth`, then one typed map `ADMIN_SECTIONS` (key → `{ path, roles, group, roadmap }`) holds the table above, keyed by a `AdminSectionKey` union. `LEADS_ROLES` is derived from it (or removed and its users switched), so no second copy of a role list exists.
- [ ] Given `modules/auth`, then `requireSection(key)` = `requireRole(ADMIN_SECTIONS[key].roles)` and `visibleSections(role)` returns the sections a role may open, in table order. Both are pure over the map (no Clerk call in `visibleSections`).
- [ ] Given each section page under `app/admin/`, then its first call is `await requireSection("<key>")` (rule 7); no page passes a literal role array.

**Routing and layouts**

- [ ] Given the shell, then it lives in a route group layout `app/admin/(shell)/layout.tsx` that wraps every section page and **not** `/admin/sign-in/` or the 403 page. URLs are unchanged (`/admin/`, `/admin/leads/`…; route groups add no segment).
- [ ] Given the shell layout, when it renders, then it calls `requireRole(STAFF_ROLES)` first (no session → sign-in; no role → 403 via `app/admin/forbidden.tsx`, which renders **without** the sidebar), then builds the menu from `visibleSections(staff.role)`. The layout passes only plain data (keys, labels, paths, active state) to client components.
- [ ] Given a signed-in `editor`, when they open `/admin/leads/`, `/admin/analytics/`, `/admin/redirects/` or `/admin/settings/` by URL, then they get the 403 page, and none of those links is in their sidebar.
- [ ] Given a signed-in `sales`, when they open any content or system section by URL, then 403; their sidebar shows only Tổng quan, Yêu cầu báo giá, Thống kê liên hệ.
- [ ] Given `admin`, then every section opens and the sidebar shows all four groups.
- [ ] Given a signed-in user without a role, then `/admin/` and every section return the 403 page (unchanged from F-05).
- [ ] Given an unknown path under `/admin/` (e.g. `/admin/xyz/`, `/admin/xyz/deeper/`), then it is matched by a catch-all `app/admin/[...rest]/page.tsx` (outside `(shell)`) that calls `notFound()`, so `app/admin/not-found.tsx` renders inside the admin root layout: HTTP 404, `noindex`, no public header/footer, no sidebar (F-05 risk "two root layouts"; a nested `not-found.tsx` alone doesn't catch unmatched URLs). Unknown admin paths still pass the proxy's auth first: no session → sign-in, like any admin path.

**Shell UI**

- [ ] Given `shared/ui`, then shadcn `sidebar`, `dropdown-menu`, `avatar`, `tooltip` (and the `collapsible` it may need) are added with `shadcn add` and restyled via tokens only (ADR 0005, 04-design-system "Admin primitives… added by A-01 onwards"); 44 px targets, visible focus ring, no `uppercase`.
- [ ] Given the sidebar and Sheet, then they animate only `transform`/`opacity` (rule 9): shadcn's `width`/`left`/`right` transitions are removed or replaced (collapse may switch width instantly), and with `prefers-reduced-motion: reduce` no transition runs.
- [ ] Given the sidebar, then the current section is marked (`aria-current="page"` + a token style) based on the pathname, including nested paths (e.g. `/admin/posts/123/` marks Bài viết).
- [ ] Given ≥ 1024 px, then the sidebar is visible and can collapse to icons (state kept in the shadcn `sidebar_state` cookie, no Zustand); given < 1024 px, then a header button opens it as a Sheet that closes on navigation. shadcn's defaults (768 px `useIsMobile`, `md:` classes) are changed to the 1024 px `lg` breakpoint in both the hook and the sidebar classes; 768, 1023 and 1024 px behave as stated, including a resize with the Sheet open.
- [ ] Given the header, then it shows the current section title and Clerk `<UserButton>`; sign-out from it lands on `/admin/sign-in/` (`afterSignOutUrl` on `ClerkProvider`). The header has no `<h1>`; each page keeps exactly one `<h1>` (the section title).
- [ ] Given `/admin/`, then it shows "Xin chào, {displayName}" (`displayNameOf` already falls back to the username; when both are null, a translated neutral "Xin chào"; never an invented name), the role label, and one shortcut card per section from `visibleSections(role)` except Tổng quan. No numbers or business data.
- [ ] Given a not-yet-built section, then its page renders the shared `ComingSoon` body: `<h1>` = section title, a one-line "Sắp có" note with the roadmap ID. `/admin/leads/` keeps its stub text via the same component.
- [ ] All new copy is in `messages/vi.json` and `messages/en.json` under `admin.nav.*`, `admin.home.*`, `admin.comingSoon.*` (`pnpm i18n:check` passes); the admin renders VI.

**Providers and dependencies**

- [ ] Given `package.json`, then `@tanstack/react-query` (current major) is added; no Devtools, no `@tanstack/react-table` (A-06), no Zustand, no `motion`.
- [ ] Given the shell layout, then a client `QueryProvider` creates one `QueryClient` per mounted shell (`useState(() => new QueryClient(...))`, `staleTime` 30 s per state-patterns.md), kept across section navigation and discarded when the shell unmounts (sign-out, 403, leaving `/admin`); it wraps the shell children. Nothing uses it yet; A-06 is the first consumer.
- [ ] Given no Clerk keys, then `/admin…` still answers 404 + `noindex` from the proxy and the build passes (F-05 fail-closed unchanged); the shell never renders `<UserButton>` outside `ClerkProvider`.

**Boundaries and budget**

- [ ] `pnpm check:boundaries` passes: client components import only `@/modules/auth/client` (the section map and `visibleSections` are client-safe; `requireSection` stays in the server `index.ts`).
- [ ] `/admin` is outside the ADR 0006 public budget (it applies to public routes only); public routes must not regress: the initial scripts of `/` and `/en/` contain no TanStack Query, Clerk or sidebar code, and their gzip total grows ≤ 1 KiB versus `main` (local curl + gzip sum on the production build, as in app PR #38).

**Context docs**

- [ ] `06-architecture.md` "Permissions" points at `ADMIN_SECTIONS` as the source and lists the matrix above; `AGENTS.md` §3 "Client server-state" row is updated by `/mark-implemented`; ADR 0006 gets one sentence that `/admin` is outside the public JS budget.

### Scope

**In scope:**

- Section map, `requireSection`, `visibleSections` in `modules/auth`.
- `(shell)` route-group layout, sidebar, header with `<UserButton>`, mobile Sheet, welcome page, `ComingSoon` pages for every unbuilt section, admin 404.
- shadcn primitives listed above; `@tanstack/react-query` + provider.
- `admin.*` messages (VI + EN parity).

**Out of scope:**

- Any real section content (A-02…A-09), data tables, `/api/admin/*` handlers, `@tanstack/react-table`.
- Dashboard numbers (A-07).
- English admin UI / locale switch (admin is VI only).
- Editing roles or users from the admin (done in the Clerk dashboard).
- Field-level permissions (e.g. only `admin` toggles `is_verified`): A-02 enforces those inside its actions.

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | deps | `package.json`, `pnpm-lock.yaml` (`@tanstack/react-query`; shadcn add may pull Radix parts already in `radix-ui`) |
| app | auth domain | `modules/auth/domain/admin-sections.ts` (new: map, `AdminSectionKey`, `visibleSections`), `modules/auth/domain/staff.ts` (role type reused) |
| app | auth application | `modules/auth/application/require-role.ts` (`requireSection`) |
| app | auth API | `modules/auth/constants.ts` (`LEADS_ROLES` derived or removed), `modules/auth/index.ts`, `modules/auth/client.ts` (export map + `visibleSections` + types) |
| app | auth UI | `modules/auth/ui/admin-shell.tsx` (server frame), `admin-sidebar.tsx` (client: active state), `admin-header.tsx` (client: `<UserButton>`, Sheet trigger), `coming-soon.tsx`, `admin-page.tsx` (kept as the page body frame or merged), `sign-out-button.tsx` (stays for the 403 page) |
| app | provider | `shared/lib/query-provider.tsx` (client) or `modules/auth/ui/query-provider.tsx`; decide by ADR 0005 (no business meaning → `shared`) |
| app | admin routes | `app/admin/layout.tsx` (`afterSignOutUrl`), `app/admin/(shell)/layout.tsx` (new), move `app/admin/page.tsx` and `app/admin/leads/page.tsx` into `(shell)/`, new `(shell)/{analytics,routes,pages,posts,media,faqs,goods-rules,testimonials,redirects,settings}/page.tsx`, `app/admin/not-found.tsx` + `app/admin/[...rest]/page.tsx` (new, catch-all → `notFound()`), `app/admin/forbidden.tsx` (unchanged, outside the shell) |
| app | ui primitives | `shared/ui/{sidebar,dropdown-menu,avatar,tooltip,collapsible}.tsx` (new, via `shadcn add`), `shared/hooks/use-mobile.ts` if the sidebar needs it |
| app | i18n | `messages/vi.json`, `messages/en.json` (`admin.nav.*`, `admin.home.*`, `admin.comingSoon.*`; drop unused `admin.identity.*` if the identity table goes) |
| context | rules | `.claude/rules/state-patterns.md` (`QueryClientProvider` lives in `app/admin/(shell)/layout.tsx`, not the admin root layout) |
| context | docs | `docs/context/06-architecture.md` (Permissions), `docs/adr/0006-…md` (admin outside the public budget, one sentence), `AGENTS.md` §3 via `/mark-implemented` |

### Golden-rule checks

- **Rule 7 (authorization):** every section page calls `requireSection` first; the shell layout calls `requireRole(STAFF_ROLES)`; hiding a menu item is never the only guard. RLS unchanged.
- **Rule 8 (JS budget):** TanStack Query, Clerk UI and the sidebar load only under `/admin`; public routes checked for no regression (see AC).
- **Rule 10 (a11y):** sidebar is a `<nav>` with an accessible name, `aria-current` on the active link, Sheet keeps Radix focus trap, 44 px targets, focus ring.
- **Rule 11 (VI typography):** no `uppercase` on menu labels or group headings.
- **Rule 1 (facts):** the welcome page shows only the signed-in user's own name/role; no business numbers.
- Not public pages: rule 4 SEO set doesn't apply; everything stays `noindex`.

### Dependencies & Risks

- **Depends on:** F-05 (done: Clerk, `requireRole`, `/admin` root layout). No stack gap blocks it; this task closes the "Client server-state (TanStack Query)" gap in `AGENTS.md` §3.
- **Blocked by questions:** none.
- **Risk — framework re-split:** new client code under `/admin` may re-split shared framework chunks again (as in F-05: +0.8 KiB on public routes). Measure `/` and `/en/` before/after; if over 1 KiB, keep the sidebar/provider code behind one client entry or report to the owner before merging.
- **Risk — `forbidden()` from a layout:** the `(shell)` layout's 403 must resolve to `app/admin/forbidden.tsx` above the group. Check `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/forbidden.md` and file-conventions for which boundary catches a layout-thrown `forbidden()`.
- **Risk — pathname in a server layout:** layouts don't receive the pathname; the active state is computed in the client sidebar with `usePathname()`, normalised for the trailing slash.
- **Risk — Cache Components:** the shell layout reads `auth()`; keep `instant = false` on the admin root, and never read auth inside `"use cache"`.

### Manual Verification Plan

Owner instruction 2026-10-24 (Phase 2 admin): no CI wait, no SEO/Lighthouse, no Chrome runs by the agent. Evidence = static checks + a written code walk-through of each AC path; the owner may click through afterwards.

- **Scenario:** given three Clerk dev users (`admin`, `editor`, `sales`) and one without a role, when each opens `/admin/` and every section URL, then the menu and the 403s match the permission table.
- **Seed needs:** default seed; the Clerk dev users above (owner).
- **Code walk-through (agent, recorded in the PR):**
  1. For each of the 12 rows: the page file's first call is `requireSection("<key>")`, and `ADMIN_SECTIONS[<key>].roles` equals the table row.
  2. `visibleSections("editor")`, `("sales")`, `("admin")` evaluated by a one-off `tsx` call (printed, not committed) match the menus above; groups with no items are dropped.
  3. `(shell)/layout.tsx` calls `requireRole(STAFF_ROLES)` before any rendering; sign-in and 403 are outside `(shell)`.
  4. Client components import nothing from `@/modules/auth` (server) or `@clerk/nextjs/server`.
- **Runtime ACs are "pending owner verification"** until the owner runs the checklist below; static inspection doesn't count as their completion. The PR lists each one with that label.
- **Owner checklist (Clerk dev instance, `pnpm build && pnpm start`, then each user in a private window):**

  | # | User | Action | Expected |
  | --- | --- | --- | --- |
  | 1 | none | open `/admin/routes/` | 307 to `/admin/sign-in/?redirect_url=…` |
  | 2 | `admin` | open `/admin/` | "Xin chào, {name}", role "Quản trị viên", 11 shortcut cards; sidebar shows 4 groups |
  | 3 | `admin` | click every sidebar item | each opens its page, the item is highlighted, the header shows the title |
  | 4 | `editor` | sidebar | Tổng quan + Nội dung (7 items) only |
  | 5 | `editor` | type `/admin/leads/`, `/admin/analytics/`, `/admin/redirects/`, `/admin/settings/` | 403 page without sidebar, "Đăng xuất" button |
  | 6 | `sales` | sidebar | Tổng quan, Yêu cầu báo giá, Thống kê liên hệ only |
  | 7 | `sales` | type `/admin/routes/`, `/admin/settings/` | 403 page |
  | 8 | no role | open `/admin/` | 403 page |
  | 9 | `admin` | open `/admin/xyz/` and `/admin/xyz/deeper/` | admin 404 page (no public header/footer, no sidebar) |
  | 10 | `admin` | window 1280 px: collapse, reload | stays collapsed (cookie) |
  | 11 | `admin` | window 1023 px and 360 px: menu button, Tab/Enter/Esc | Sheet opens, focus trapped, Esc closes, a link click closes it |
  | 12 | `admin` | OS "reduce motion" on, toggle sidebar and Sheet | no animation |
  | 13 | `admin` | `<UserButton>` → Đăng xuất | lands on `/admin/sign-in/` |
- **Validation commands:** `pnpm -C 43logistics.vn lint` (scoped `biome check --write <files>` for fixes), `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build`; public JS curl+gzip sum on `/` and `/en/` vs `main`. No automated tests (ADR 0004). No consent-matrix re-run (proxy and tracking untouched).

### Implementation Hints

- Read first: `node_modules/next/dist/docs/` (route groups, `forbidden`, `not-found` with multiple root layouts), the shadcn sidebar docs for the installed shadcn CLI version, `@tanstack/react-query` v5 SSR/App Router provider pattern.
- Keep the map in `domain/` (pure, client-safe) and export it from `client.ts`; `requireSection` in `application/` (server-only). The `AdminSectionKey` union should drive the messages keys (`admin.nav.<key>`), so a missing translation is a type error or an `i18n:check` failure.
- Lesson `2026-10-23-s08-lead-form`: list every file a new prop/enum passes through (map → sidebar props → messages); use scoped `biome check --write <files>`, then `git status`.
- shadcn's sidebar ships its own `useIsMobile` hook and cookie name: keep the cookie, but move the hook and the sidebar's `md:` classes to the 1024 px `lg` breakpoint, replace its width/left/right transitions (rule 9), and map colours, radius and spacing to tokens like the F-02 primitives.
- Don't add Zustand: the sidebar's open/collapsed state is the shadcn context + cookie.

### Related

- Roadmap: `docs/context/10-roadmap.md` A-01 (and A-02…A-09, the sections it links)
- `docs/context/06-architecture.md` (admin folder tree, Auth & roles, Permissions, state table)
- `docs/context/04-design-system.md` (admin primitives)
- ADR 0001 §7 (TanStack Query admin only), ADR 0002 §9 (`ClerkProvider` only in `/admin`), ADR 0005 (modules), ADR 0006 (public JS budget)
- `specs/feature-f05-clerk-staff-auth.md` (auth gate, two-root-layout risk)
- `.claude/rules/state-patterns.md`, `component-patterns.md`, `module-structure.md`
- `lessons/2026-10-23-s08-lead-form.md`
