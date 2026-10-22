---
title: Protect /admin with Clerk staff auth and roles
type: feature
status: draft
owner_repo: both
roadmap: F-05
priority: must-have
blocked_by_questions: []
updated: 2026-10-22
---

## Feature: Protect /admin with Clerk staff auth and roles

### Problem Statement

Every admin screen (A-01…), every admin Server Action and the lead inbox need a signed-in staff member with a known role (`AGENTS.md` rule 7, ADR 0001). Today:

- `@clerk/nextjs` and `svix` are not installed (removed in F-01);
- `proxy.ts` answers every `/admin…` and `/api/admin…` request with a 404 (`deny`, the F-06 seam: `modules/seo/application/request-plan.ts:40`, `proxy.ts` `case "deny"`);
- `modules/auth/` holds only the `profiles` table; there is no `requireRole()`, no webhook and no `app/admin`;
- `app/[locale]/layout.tsx` is the only root layout, so a non-localized `/admin` has nowhere to mount.

ADR 0006 also requires F-05 to prove that Clerk works with `cacheComponents: true` and to record the result (its verification table row "F-05 | pending").

Roadmap F-05: "Clerk for `/admin` only, roles in `publicMetadata`, session claim `role`, `requireRole()`, Clerk webhook → `profiles`." *Accept:* Clerk works with `cacheComponents: true` (build + a request to `/admin`), recorded in ADR 0006; unauthenticated `/admin` → sign-in; `editor` cannot open leads; public pages ship no Clerk JS.

### Proposed Solution

- Staff open `/admin/`. Without a session they land on `/admin/sign-in/`, an embedded Clerk `<SignIn>` (no sign-up; staff are invited from the Clerk dashboard).
- After sign-in, `/admin/` shows who they are (name, email, role). `/admin/leads/` is an empty stub that only `admin` and `sales` can open; it exists to prove the role gate until A-01/A-0x build the real screens.
- A signed-in user with **no role** (or a role outside `admin|editor|sales`) sees a 403 page on every admin page; nothing is granted by default.
- Clerk `user.created` / `user.updated` / `user.deleted` webhooks mirror staff into `profiles`. Deleted users are soft-deleted (`deleted_at`) so leads, posts and goods keep their history.
- Public pages are untouched: no `ClerkProvider`, no Clerk JS, and Clerk's middleware never runs on a public request.

### Acceptance Criteria

**Install and config**

- [ ] Given `package.json`, then `@clerk/nextjs` (current major at install time) and `svix` are dependencies; their licence and maintenance are checked; no unrelated package is added. `pnpm-workspace.yaml` `allowBuilds` changes only if an install script is really needed.
- [ ] Given `shared/config/env.server.ts` / `env.public.ts`, then `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `NEXT_PUBLIC_CLERK_SIGN_IN_URL` stay `optionalEnv` (the build and the public site must work without them, e.g. in CI), and the admin code fails closed when they are unset: `/admin…` returns 404 with `x-robots-tag: noindex` (the F-06 behaviour), and the webhook returns 503. No `NEXT_PUBLIC_CLERK_SIGN_UP_URL` exists. `.env.example` documents `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/admin/sign-in` as the expected value.

**Proxy**

- [ ] Given `proxy.ts`, when the planner returns the admin kind for a **canonical** path (`/admin`, `/admin/…`, `/api/admin/…`, lowercase, no locale prefix), then the request is handed to Clerk's `clerkMiddleware`, which:
  - lets `/admin/sign-in/…` through unauthenticated;
  - for every other admin path, calls `auth.protect()`: an unauthenticated page request redirects to `/admin/sign-in/` (with the return URL), an unauthenticated `/api/admin/*` request gets 401/404 (no redirect);
  - adds `x-robots-tag: noindex` to every admin response.
- [ ] Given a **non-canonical** admin variant (`/en/admin/`, `/vi/admin/`, `/ADMIN/`, `/%61dmin/`), then it still returns 404 + `noindex` as in F-06; it is never redirected or authenticated.
- [ ] Given any public request (`/`, `/en/`, a route page, `/go/*`, `/api/webhooks/clerk`), then Clerk's middleware does **not** run (the planner decides before Clerk is called): no Clerk cookie, header, handshake redirect or network call. The F-06 order (410 → legacy/locale/slash redirect → pass-through → next-intl) and its consent-gated `43l_attr` are unchanged.
- [ ] `modules/seo` `planRequest` stays a pure function; its admin branch is split into "admin (canonical)" and "deny (variant)". `pnpm check:boundaries` passes (proxy imports only client-safe module entries plus `@clerk/nextjs/server`).

**Admin shell and roles**

- [ ] Given `app/admin/layout.tsx`, then it is a second root layout (own `<html lang="vi">`, fonts with `subsets: ['latin','vietnamese']`, `globals.css`) with `ClerkProvider` mounted **only** here, `robots: { index: false, follow: false }` metadata, and no public header/footer/tracking.
- [ ] Given `/admin/sign-in/[[...sign-in]]`, then Clerk `<SignIn>` renders with routing `path`, sign-up links hidden, and a visible focus ring; it is reachable without a session.
- [ ] Given `modules/auth`, then it exposes (server-only `index.ts`):
  - `getStaff()`: reads Clerk `auth()` and `sessionClaims.role`; returns `{ userId, role } | null`, with `role` validated by Zod against `staff_role` (anything else → no role);
  - `requireRole(roles)`: no session → redirect to sign-in; session without an allowed role → `forbidden()` (403); otherwise returns the staff identity. It is the first call in every admin page, layout-protected page, admin Server Action and `/api/admin/*` handler (rule 7).
- [ ] Given a signed-in `editor`, when they open `/admin/`, then it shows their display name, email and role; when they open `/admin/leads/`, then they get the 403 page. Given `admin` or `sales`, then `/admin/leads/` renders the stub.
- [ ] Given a signed-in user with no `role` claim, then `/admin/` and `/admin/leads/` both return the 403 page.
- [ ] Given `app/admin/forbidden.tsx`, then the 403 page has one `<h1>`, a sign-out button and no data.
- [ ] Admin UI strings live in `messages/vi.json` / `en.json` under `admin.*` (parity for `pnpm i18n:check`); the admin renders VI.

**Webhook → profiles**

- [ ] Given `app/api/webhooks/clerk/route.ts`, when a request arrives, then the raw body is verified with svix (`CLERK_WEBHOOK_SIGNING_SECRET`) **before** parsing; a bad or missing signature → 400 and nothing is written. The payload is parsed with Zod (`.strict()` on our envelope; only the fields we use are read).
- [ ] `user.created` / `user.updated` → upsert `profiles` by `clerk_user_id`: primary email, display name (first + last, else username, else null), `role` from `public_metadata.role` (null when absent or invalid), `deleted_at = null`.
- [ ] `user.deleted` → set `deleted_at = now()`; the row and its FKs stay.
- [ ] Unknown event types → 200 and ignored. Replaying the same event is idempotent. Handler errors → 500 so Clerk/svix retries. Nothing from the payload is logged.
- [ ] Migration (`pnpm db:generate`): `profiles.role` becomes nullable without a default, and `profiles.deleted_at timestamptz` is added. RLS stays on with no policies. `07-data-model.md` is updated in the same change set.
- [ ] `requireRole` reads the **session claim**, never `profiles`, so a stale or missing mirror can't grant access.

**Cache Components and budget (ADR 0006)**

- [ ] Given `cacheComponents: true`, then `pnpm build` passes; auth reads (`auth()`, `currentUser()`) happen only in request-time code under `<Suspense>` or in dynamic admin segments, never inside `"use cache"`. Two different staff sessions in two browsers never see each other's identity.
- [ ] The ADR 0006 verification table F-05 row is filled in (Clerk version, expected, observed, date). If something fails, the fix isolates the Clerk part; `cacheComponents` stays `true` (only a new ADR may change it).
- [ ] Given the production build, then `/` and `/en/` load no Clerk JS (no `clerk` chunk or `clerk.*` request in the network panel, no `__clerk` cookie), and `pnpm perf:report` keeps both routes within the budget with an app delta no larger than before F-05.

**Context docs**

- [ ] `AGENTS.md` §3 Auth row and the Framework row's "Clerk in `proxy.ts` F-05" note are updated by `/mark-implemented`; `06-architecture.md` auth/proxy sections describe the as-built planner (admin vs deny, Clerk only on canonical admin paths); `07-data-model.md` shows the `profiles` change; the F-06 spec's planner path drift (`domain/` → `application/`) is fixed.

### Scope

**In scope:**

- Clerk install, proxy integration, `/admin` root layout, sign-in page, `/admin/` identity page, `/admin/leads/` stub, 403 page.
- `modules/auth`: `getStaff`, `requireRole`, staff types, the webhook use case and its repository.
- Clerk webhook route with svix; `profiles` migration (nullable role, `deleted_at`).
- ADR 0006 F-05 row; doc updates listed above.

**Out of scope:**

- The real admin UI: navigation by role, `<UserButton>` header, TanStack Query provider (A-01), lead inbox (A-0x), any CMS screen.
- Inviting staff, assigning roles and other Clerk dashboard operations (owner steps below).
- Clerk ↔ Supabase third-party auth (not needed: the DB is server-only).
- A CSP (none exists yet; when one is added, Clerk's domains are allowed only for `/admin`).
- Locale support in the admin (VI only).

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | deps | `package.json`, `pnpm-lock.yaml` (`@clerk/nextjs`, `svix`) |
| app | proxy | `proxy.ts`; `modules/seo/application/request-plan.ts`; `shared/lib/admin-path.ts` (canonical vs variant) |
| app | auth module | `modules/auth/{domain/staff.ts,application/require-role.ts,application/sync-profile.ts,infrastructure/profiles-repository.ts,infrastructure/schema.ts,index.ts}` |
| app | admin routes | `app/admin/layout.tsx`, `app/admin/page.tsx`, `app/admin/leads/page.tsx`, `app/admin/sign-in/[[...sign-in]]/page.tsx`, `app/admin/forbidden.tsx` |
| app | webhook | `app/api/webhooks/clerk/route.ts` |
| app | config | `next.config.ts` (`experimental.authInterrupts` if `forbidden()` needs it in the installed Next), `shared/config/env.*.ts`, `.env.example` |
| app | db | `db/migrations/*` (generated), `db/relations.ts` if touched |
| app | i18n | `messages/vi.json`, `messages/en.json` (`admin.*`) |
| context | docs | `docs/adr/0006-…md` (F-05 row), `docs/context/06-architecture.md`, `docs/context/07-data-model.md`, `specs/feature-f06-proxy-composition.md` (path drift) |

### Golden-rule checks

- **Rule 6 (server-only DB):** the webhook repository is in `modules/auth/infrastructure` with `server-only`; no DB row reaches a client component (the identity page passes plain strings).
- **Rule 7 (authorization):** `requireRole` first in every admin page/action/handler; RLS stays deny-all; the role comes from the session claim.
- **Rule 8 (JS budget):** no Clerk JS on public routes; `ClerkProvider` only in `app/admin/layout.tsx`; Clerk middleware only for canonical admin paths.
- **Rule 10 (a11y):** sign-in, identity and 403 pages are keyboard-usable with a visible focus ring and 44 px targets.
- **Rule 14 (personal data):** only email, display name and role are stored for staff; webhook payloads are never logged.
- **Rule 15 (secrets):** keys only via `env.server.ts` / `env.public.ts`; nothing printed.
- **Security patterns:** svix verification before parsing; Zod on the webhook; no open redirect (the sign-in return URL is Clerk's own same-origin handling).
- Not public pages, so the per-page SEO set (rule 4) doesn't apply; admin pages are `noindex`.

### Dependencies & Risks

- **Depends on:** F-01 (Next 16, `proxy.ts`), F-04 (`profiles`, Supabase connected), F-06 (planner + deny seam). All done.
- **Blocked by questions:** none. Owner-side Clerk setup is listed under Manual Verification.
- **Risk — Cache Components:** Clerk's `auth()` is request-time data. If the build fails with "uncached data outside `<Suspense>`", wrap the auth-dependent parts in `<Suspense>` or keep the admin segments dynamic (ADR 0006 fallback). Never read auth inside `"use cache"`.
- **Risk — two root layouts:** navigating between `/admin` and the public site is a full page load (expected). `not-found` handling for `/admin/*` must use the admin root layout.
- **Risk — proxy composition:** `clerkMiddleware` returns a handler; calling it only for the admin plan keeps public requests Clerk-free but must pass the `NextFetchEvent` through. Check the installed `@clerk/nextjs` docs for the exact signature.
- **Risk — `forbidden()`:** in Next 16 it may still need `experimental.authInterrupts`; check `node_modules/next/dist/docs/` first. If it isn't usable, render the 403 page with status 403 from `requireRole`'s caller instead.
- **Risk — role claim missing:** if the owner hasn't customised the session token, every user has no role and gets 403 (fail closed). The verification plan checks it first.

### Manual Verification Plan

**Owner prerequisites (Clerk dashboard, done once):**

1. Sign-up mode = **Restricted** (invite only); social/email sign-in as the owner prefers.
2. **Sessions → Customize session token:** `{ "role": "{{user.public_metadata.role}}" }`.
3. Users: one `admin`, one `editor`, one `sales`, one with no role (`publicMetadata` `{ "role": "editor" }`, etc.).
4. **Webhooks:** endpoint `https://<preview or tunnel host>/api/webhooks/clerk` with `user.created`, `user.updated`, `user.deleted`; its `whsec_…` in `.env` as `CLERK_WEBHOOK_SIGNING_SECRET`. Locally use a tunnel (ngrok/cloudflared) to `localhost:3000`.

**Scenario:** given the four users and `pnpm build && pnpm start` with the Clerk keys set, when each opens `/admin/` and `/admin/leads/`, then access matches the role table, and the public pages stay Clerk-free.

**Seed needs:** default F-04 seed; the four Clerk users above.

**Steps:**

1. Private window, no session: `/admin/` → 307 to `/admin/sign-in/…`; `/admin/leads/` → same; `curl -i /api/admin/x` → 401/404, no redirect; every admin response has `x-robots-tag: noindex`.
2. `/en/admin/`, `/vi/admin/`, `/ADMIN/`, `/%61dmin/` → 404 + `noindex` (curl).
3. Sign in as `editor`: `/admin/` shows name, email, `editor`; `/admin/leads/` → 403 page.
4. Sign in as `sales`, then `admin`: `/admin/leads/` renders the stub.
5. Sign in as the no-role user: `/admin/` and `/admin/leads/` → 403.
6. Two browsers (editor + admin) open `/admin/` at the same time and reload several times: each sees only its own identity.
7. Public pages, consent rejected, DevTools Network on `/`, `/en/`, a route page: no request to `clerk.*`, no Clerk chunk, no `__clerk*`/`__session` cookie. `curl -I /` shows no Clerk headers.
8. Webhook: create a user in Clerk → `profiles` row appears; change their name and role → row updates; delete them → `deleted_at` set, row kept. "Resend" an event from the Clerk dashboard → no duplicate. `curl -X POST` with a forged body → 400 and no write.
9. Unset the Clerk keys and rebuild: `pnpm build` passes, `/admin/` → 404 + `noindex`, the webhook → 503, public pages unchanged.
10. Keyboard only: sign-in form, sign-out button on the 403 page, focus visible; axe DevTools on `/admin/sign-in/`, `/admin/` and the 403 page at 360 and 1280 px: 0 serious/critical.
11. Record the ADR 0006 F-05 row (version, observed results, date).

**Validation commands:** `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build`, `check:redirects` (0 FAIL), `perf:report`. Consent matrix re-run (ADR 0004) because `proxy.ts` changes: `43l_attr` still set only with ads consent. No automated tests (ADR 0004).

### Implementation Hints

- Read the installed docs first: `node_modules/@clerk/nextjs` (README/types for `clerkMiddleware`, `auth.protect`, `<SignIn>` `path` routing) and `node_modules/next/dist/docs/` (`proxy`, `forbidden`, `authInterrupts`, multiple root layouts, Cache Components + `<Suspense>`).
- Proxy shape: keep `planRequest` pure; in `proxy.ts`, build `const clerk = clerkMiddleware(async (auth, req) => { … })` once at module scope and call `clerk(req, event)` only in the admin branch. Public branches never touch it.
- Fail closed without keys: if `publicEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` or `serverEnv.CLERK_SECRET_KEY` is missing, the admin branch returns the F-06 404 (and `app/admin` pages call `notFound()`), so CI builds and previews without keys behave like today.
- `requireRole` belongs to `modules/auth/application`; the Zod parse of the claim to `domain`. Admin pages: `const staff = await requireRole(["admin","sales"])` as the first line, inside a `<Suspense>` boundary if Cache Components requires it.
- Webhook: `await req.text()` → `new Webhook(secret).verify(body, headers)` → Zod → `modules/auth` use case → repository upsert (`onConflictDoUpdate` on `clerk_user_id`). Keep the handler thin (api-patterns.md).
- Display name: never invent one; null when Clerk has no name or username.
- Don't add `motion`, TanStack Query or Zustand here.

### Related

- Roadmap: `docs/context/10-roadmap.md` F-05 (and A-01 next)
- `docs/context/06-architecture.md` (Auth & roles, proxy composition, env)
- `docs/context/07-data-model.md` (`profiles`, `staff_role`, Security)
- ADR 0001 (Clerk staff-only), ADR 0002 §9 (`ClerkProvider` only in `/admin`), ADR 0005 (`auth` module), ADR 0006 (Cache Components checks, JS budget)
- `specs/feature-f06-proxy-composition.md` (the `/admin` deny seam), `specs/feature-f04-database-schema-seed.md` (`profiles`)
- `.claude/rules/security-patterns.md`, `api-patterns.md`, `module-structure.md`
