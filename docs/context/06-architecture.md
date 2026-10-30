# 06 — Architecture

## High-level

```
Browser ──► Cloudflare (proxy, CDN for /_next/static + /_next/image, WAF; ADR 0010) ──► Caddy ──► proxy.ts (Node runtime)
              ├─ 410 for dead WordPress paths, ?page_id / ?p= legacy IDs
              ├─ attribution cookie (utm_*, click IDs) on first landing
              ├─ next-intl locale routing (VI root, /en/*)
              └─ clerkMiddleware → protects /admin/* and /api/admin/*
           ──► App Router (React 19.2 Server Components, Cache Components)
              ├─ modules/*/infrastructure/queries  ("use cache" + cacheTag) ──► Drizzle ──► Supabase Postgres
              ├─ modules/*/actions.ts  (Server Actions, Zod, requireRole) ──► application ──► Drizzle / Storage
              └─ app/go/[channel]/route.ts, app/api/* (route handlers)
           ──► Client islands: calculator, lead form, mobile bar, consent, admin screens
              ├─ Zustand (UI state)
              └─ TanStack Query (admin data grids / async client reads via route handlers or actions)
Supabase Storage (media, og, private) ◄── server uploads (service role) · public CDN reads
Clerk ◄── staff sign-in (admin/editor/sales)
GTM (ads lane, Consent Mode v2) + server-side conversions (Meta CAPI, TikTok Events API, Google Ads)
Cloudflare Web Analytics (traffic lane, cookieless beacon after analytics consent) — ADR 0010 (replaces PostHog, removed in S-13b)
```

Hosting (ADR 0008): a **Hostinger VPS** in Jakarta (Ubuntu 26.04 LTS, 2 vCPU, 8 GB RAM, weekly backups), not Vercel. Docker Compose runs two services: `app`, the Next 16 `output: 'standalone'` server as **one process** on the internal network, and `caddy`, the only public listener, which terminates TLS (automatic Let's Encrypt), answers the `http://` and `www` → `https://43logistics.vn` 301s and reverse-proxies to `app` (`deploy/Caddyfile`). `.github/workflows/deploy.yml` builds the image for a `main` commit once `verify` and `security` passed for that SHA and it is still main's head (`DATABASE_URL` as a BuildKit secret mount, `NEXT_PUBLIC_*` as build args from the GitHub `production` environment), pushes it to GHCR (SHA + `latest` tags) and runs `deploy/deploy-remote.sh` over SSH: health check, image-digest check, probes (`/`, `/gui-hang-di-singapore/`; HTTPS once Caddy holds a certificate), and an automatic restore of the last entry in `known-good.log` on failure. Manual rollback is `workflow_dispatch` with a known-good SHA. Runtime secrets are in `/opt/43logistics/.env` (template `deploy/env.template`), never in the image. Nothing is built on the VPS. There is **no staging or preview environment**. Runbook: `43logistics.vn/deploy/README.md` (bootstrap, secrets, migrations, cutover, rollback). Still open (Q-15): VPS administrator. **Edge (ADR 0010, L-00b):** Cloudflare Free proxies the apex, `www` and `quanly` (nameservers moved to Cloudflare; the domain stays registered at Tenten). SSL Full (strict) with Caddy's Let's Encrypt certificates; host redirects stay in Caddy (Cloudflare "Always Use HTTPS" off, one hop); only static assets and `/_next/image` are edge-cached, never HTML; Rocket Loader, Email Obfuscation and Auto Minify off. The VPS firewall accepts 80/443 only from Cloudflare's ranges (`DOCKER-USER`), replacing the per-source-IP limits; Caddy trusts those ranges and reads the client from `CF-Connecting-IP`, so `ip-hash.ts` still reads the first `x-forwarded-for` hop. Supabase region close to Vietnam (Singapore, `ap-southeast-1`).

## Folder structure

Two repos (ADR 0003). The app repo uses the **root-level layout** inherited from the template (ADR 0002): no `src/`, and `@/*` → app root. Entries marked *(today)* exist in the template now; everything else is planned and is created by the roadmap task that needs it.

```
logistics-context/                 # context workspace (this repo)
├── AGENTS.md · CLAUDE.md
├── docs/{context,adr,proposals}/
├── specs/ · lessons/
├── data/                          # canonical until F-01 moves it into the app (ADR 0002 §11)
└── 43logistics.vn/                # app repo (submodule) ↓

43logistics.vn/
├── app/                                      # thin routing layer only (ADR 0005); today: placeholder page.tsx + layout.tsx
│   ├── [locale]/
│   │   ├── (site)/                           # public site layout (header, footer, mobile bar)
│   │   │   ├── page.tsx                      # home
│   │   │   ├── [slug]/page.tsx               # resolves page by (locale, slug): route, hub, about, contact, policy…
│   │   │   ├── kinh-nghiem/…  /  guides/…    # blog (localized pathnames via next-intl)
│   │   │   └── lp/[campaign]/page.tsx        # ads landing (own minimal layout)
│   │   └── layout.tsx                        # <html lang>, fonts, NextIntlClientProvider
│   ├── admin/                                # Clerk-protected CMS (not localized); ClerkProvider + QueryClientProvider live here only
│   ├── go/[channel]/route.ts                 # contact click tracker → modules/contact
│   ├── api/…                                 # webhooks (Clerk), revalidate, admin JSON for React Query
│   ├── sitemap.ts · robots.ts · global-error.tsx · not-found.tsx
│   ├── globals.css                           # (today: Tailwind v3 `@tailwind` directives) imports theme.css from F-02
│   └── theme.css                             # generated by `pnpm tokens` — do not edit
├── modules/<name>/                           # one per business capability (ADR 0005; list in .claude/rules/module-structure.md)
│   ├── domain/                               # pure TS: types, rules, calculations
│   ├── application/                          # use cases + client-safe Zod schemas
│   ├── infrastructure/                       # server-only except schema.ts (Drizzle, loaded by drizzle-kit): repositories, cached queries, external APIs
│   ├── ui/                                   # components (server default, client islands), ui/hooks, ui/stores
│   ├── actions.ts · constants.ts             # "use server" entry points · cache tags, event names
│   └── index.ts · client.ts                  # public server API · public client-safe API
├── shared/
│   ├── ui/                                   # shadcn/ui primitives (today: components/ui — moved in F-01, re-initialised in F-02)
│   ├── lib/ · config/env.ts · hooks/ · i18n/ · types/   # today: lib/utils.ts, hooks/ + lib/hooks/, types/ — moved in F-01
├── db/
│   ├── client.ts                             # `server-only` drizzle client (today: db/db.ts)
│   ├── schema.ts                             # re-exports modules/*/infrastructure/schema.ts (today: db/schema/index.ts, empty)
│   └── migrations/                           # (today) drizzle-kit output
├── messages/{vi,en}.json                     # UI strings (next-intl)
├── data/                                     # redirect-map.csv, design-tokens.json, seed/* (moved here in F-01)
├── scripts/                                  # seed.ts, import-wordpress.ts, build-tokens.ts, check-redirects.ts
├── (no tests/ in the initial build phase, ADR 0004)
├── proxy.ts                                  # added in F-01/F-06 (the template middleware.ts was removed in F-00)
└── next.config.ts · drizzle.config.ts · biome.json · components.json
```

Dynamic `[slug]` resolution: one catch route looks up `page_translations` by `(locale, slug)` and renders the template for `pages.type` (`route_outbound`, `route_inbound`, `hub`, `about`, `contact`, `policy`, `generic`). `generateStaticParams` returns all published slugs per locale.

## Rendering & caching (Next 16 Cache Components)

`next.config.ts`:

```ts
const nextConfig: NextConfig = {
  cacheComponents: true,
  trailingSlash: true,
  reactCompiler: true,            // optional; measure build time
  // As built (A-04): the host comes from NEXT_PUBLIC_SUPABASE_URL; unset → no pattern.
  images: { remotePatterns: [{ protocol: 'https', hostname: '<project>.supabase.co', pathname: '/storage/v1/object/public/**' }], formats: ['image/avif', 'image/webp'] },
  // proxy.ts buffers bodies: raised above the 10 MB default for the 15 MB media upload (A-04).
  experimental: { proxyClientMaxBodySize: '16mb' },
  async redirects() { return loadRedirectsFromCsv('data/redirect-map.csv') },
  // No /wp-content/uploads rewrite: those URLs answer 410 in proxy.ts (owner 2026-10-28, A-04).
}
```

| Data | Pattern |
| --- | --- |
| Page content, routes, rates, FAQs, menus, settings | Query functions marked `"use cache"`, `cacheLife('max')`, `cacheTag('page:{id}')`, `cacheTag('route:{key}')`, `cacheTag('settings')`, `cacheTag('menu')` |
| Admin edit (Server Action) | Write via Drizzle → `updateTag(tag)` (read-your-writes in the admin) and `revalidateTag(tag, 'max')` where SWR is fine |
| Lead form / contact events | Not cached; Server Action / route handler |
| Request-specific bits (attribution cookie, consent) | Read inside a `<Suspense>` boundary or on the client; never inside a cached function |

A-02 rate and route edits call `updateTag(routeTag(key))` **and** `updateTag(MENU_TAG)` after the transaction commits (not `revalidateTag('menu','max')`), so the mega menu and from-prices are fresh on the first request after a save. Validity windows still roll over within the rate reads' `cacheLife('hours')`. Tag invalidation is per server process. That is correct because ADR 0008 runs exactly one app process (default cache handler, no cluster, no replicas). Scaling out needs a shared cache handler and a new ADR.

Note: in Next 16 `revalidateTag` takes a second `cacheLife` argument; `updateTag` and `refresh` exist only in Server Actions. `params`, `searchParams`, `cookies()`, `headers()` are async.

Site shell (S-01, as built): `app/[locale]/(site)/layout.tsx` composes the header, footer and mobile action bar from module slots (`content` frame and menus, `pricing` route cards, `contact` CTAs and contact blocks), so `content` never imports `pricing` or `contact`. Its queries are tagged as A-02 expects:

- `getMenu` / `getRouteHrefs` / `findPageHref` (`content`) and `listNavRoutes` (`routes`): `menu` plus `route:{key}` per route, `cacheLife('max')`;
- `getFromPrices` (`pricing`): `menu` plus `route:{key}`, `cacheLife('hours')`, so a `valid_from`/`valid_to` boundary applies within an hour with no edit ("today" is Asia/Ho_Chi_Minh, taken inside the cached function);
- `getSiteSettings` (`settings`): `settings`, `cacheLife('max')`.

`MENU_TAG` is defined in `modules/routes/constants.ts`, the lowest of the three modules that use it. Client islands that need the current path (contact links' `?from=`, the language switch) read `window.location.pathname` / the page's `hreflang` links after hydration and re-read them when `<head>` changes (every client navigation rewrites it). They don't use `usePathname`: it ships `next/navigation` (~8 KiB gz), suspends on routes with unknown params under Cache Components, and under the proxy's locale rewrite its server value (`/vi/…`) differs from the browser's (`/…`). The mobile drawer's Sheet is loaded on first open (`next/dynamic`), and its groups are native `<details>`, to keep the shell within the JS budget (S-01 measured +42.4 KiB over the 134.3 KiB baseline locally).

**Unverified facts and preview mode (rule 1, S-01).** `shared/lib/fact-visibility.ts` returns `shown` (verified), `badged` (unverified, preview mode) or `hidden`. Preview mode needs `PREVIEW_UNVERIFIED=1` **and** `next dev`; every `next build` always hides (ADR 0008: no staging or preview host). Each module applies the gate on the server (`pricing` to card prices and transit days, `contact` to phones, offices, hours, social, legal name), so a hidden value never reaches HTML, RSC payloads or island props. The shell is prerendered at **build**, so visibility follows the build environment: the CI image is a production build, and badged facts exist only in `pnpm dev` / `pnpm dev:local`.

i18n with Cache Components: pass `locale` explicitly into cached query functions (it becomes part of the cache key). Layouts, pages and `shared/i18n/request.ts` read the locale from `next/root-params`, not `setRequestLocale` (see `08`). Verified in F-03 and recorded in ADR 0006 (compatibility record).

## `proxy.ts` composition (order matters)

**As built (F-06, F-05):** `proxy.ts` calls one pure planner, `planRequest` (`modules/seo/application/request-plan.ts`), and acts on its decision:
1. 410 for gone paths;
2. admin paths (`isAdminPath`, `shared/lib/admin-path.ts`):
   - **admin** (canonical: the raw path is `/admin…` or `/api/admin…`, lowercase, no locale prefix, no `%` or `//`): handed to Clerk `clerkMiddleware`, built lazily on the first admin request. `/admin/sign-in/…` passes unauthenticated; `/api/admin/*` without a session → 401; every other admin page → `auth.protect()` (307 to `/admin/sign-in/?redirect_url=…`). Every admin response gets `x-robots-tag: noindex`. A slash-less admin page (`/admin`) first gets one 308 to its slashed form;
   - **deny** (any variant: `/en/admin/`, `/vi/admin/`, `/ADMIN/`, `/%61dmin/`): 404 + `noindex`, never authenticated or redirected;
   - without both Clerk keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) the admin branch also answers the deny 404 (fail closed);
3. pass-through for `/api`, `/go` and files (incl. `/api/webhooks/clerk`);
4. **one** redirect combining legacy ID, locale prefix and trailing slash (`skipTrailingSlashRedirect: true`; 308 for slash-only fixes, 301 otherwise);
5. next-intl, then `43l_attr` on non-redirect responses only.

Clerk's middleware never runs on a public request: the planner decides first, so public responses carry no Clerk header, cookie or handshake. The matcher excludes `_next`, `_vercel` and dotted paths, and lists the legacy `.php`, `/portfolio`, `/admin` and `/api/admin` paths explicitly. `proxy.ts` imports only client-safe module entries (a depcruise rule) plus `@clerk/nextjs/server`, and reads the two Clerk keys from `process.env` directly (`env.server.ts` is `server-only`).

## Auth & roles (Clerk)

**As built (F-05):**
- Only staff sign in (Clerk sign-up mode "Restricted"; the admin creates each account in the Clerk dashboard with a **username + password**, no email needed). `/admin` is a second root layout (`app/admin/layout.tsx`, `lang="vi"`, `noindex`, `instant = false`) and the only place `ClerkProvider` mounts, so public pages ship no Clerk JS. Sign-in is an embedded `<SignIn>` at `/admin/sign-in/` (path routing, no sign-up link), in Vietnamese: `ClerkProvider` gets `@clerk/localizations` `viVN` (pinned to the version that shares the installed `@clerk/shared`) with staff wording ("Tên đăng nhập"), and `appearance.variables` from the site tokens. Sign-out is Clerk's `<SignOutButton>` (back to sign-in). The hosted Account Portal variant (app PR #26) was reverted by app PR #38 (owner, 2026-10-24) once the public routes had budget headroom: the Clerk client code under `/admin` re-splits the shared framework chunks (+0.8 KiB gz on public routes, no Clerk code in them). Identifiers are a Clerk dashboard setting (Username + Password on; email, phone and social off); without email, an admin resets passwords in the dashboard.
- Roles live in Clerk `publicMetadata.role ∈ { 'admin', 'editor', 'sales' }`. The session token is customised with `{"role": "{{user.public_metadata.role}}"}`; `modules/auth` validates the claim with Zod (`STAFF_ROLES`, mirrors the `staff_role` enum). A missing or unknown claim means **no role**: nothing is granted by default.
- `modules/auth` (server API): `getStaff()` → `{ userId, role | null } | null`; `requireRole(roles)` is the first call in every admin page, Server Action and `/api/admin/*` handler (rule 7): no Clerk keys → 404, no session → sign-in, no allowed role → `forbidden()` (403, `app/admin/forbidden.tsx`, needs `experimental.authInterrupts`). Access is decided by the session claim, **never** by `profiles`.
- Webhook `POST /api/webhooks/clerk`: svix verifies the raw body first (bad/missing signature → 400; no `CLERK_WEBHOOK_SIGNING_SECRET` → 503), then Zod. `user.created`/`user.updated` upsert `profiles` (username, primary email or null, display name = first + last, else username, else null, role or null; a username-only account is mirrored too); `user.deleted` soft-deletes (`deleted_at`), and a soft-deleted row is never revived by a late retry. Unknown events → 200; DB errors → 500 so svix retries. Payloads are never logged.
- Permissions: `admin` everything; `editor` content, translations, media, FAQs, routes/rates; `sales` leads and contact events (read, update status, notes). The source of truth is `ADMIN_SECTIONS` in `modules/auth/domain/admin-sections.ts` (A-01): the sidebar (`visibleSections(role)`), the welcome page and every section page guard (`requireSection(key)` = `requireRole(ADMIN_SECTIONS[key].roles)`) read it, so no page passes a literal role list. Field-level rules stay inside each section's actions. A-02 (`/admin/routes/`): `editor` and `admin` edit rate bands, transit days and `prices_public`; only `admin` changes `is_verified` and `is_active` (`updateRouteFactsAction` rejects an editor's request carrying those fields and writes nothing; the editor sees them read-only). A-03 (`/admin/pages/`): `editor` and `admin` both edit and publish page translations and `pages.status` (who/when recorded); slugs are read-only until A-08. A-03b (`/admin/posts/`, `/admin/posts/new/`, `/admin/posts/{id}/`, `/admin/posts/categories/`): `editor` and `admin` create, edit and publish posts and their translations, manage categories, and delete a post only while it was never published; a translation's slug is editable until its first publication. A-06 (`/admin/leads/`, `/admin/leads/{id}/`, `/admin/leads/export/`): `admin` and `sales` list, filter and open leads, change status and owner (an `admin`/`sales` profile or nobody), add append-only notes and export the filtered list as CSV (logged in `lead_exports` before any byte; no IP hash or user agent); `editor` gets 403 on all of it and the shell reads no new-lead count for them. Nobody can delete a lead (Q-17). A-07 (`/admin/analytics/`): `admin` and `sales` see weekly counts (Monday–Sunday, Vietnam time; 4/12/26/52 weeks) of contact clicks, non-spam quote requests and won leads by channel, route or source, aggregates only; `editor` gets 403 and no count is queried. A-05 (`/admin/faqs/`, `/admin/goods-rules/`, `/admin/testimonials/`, each with `new/` and `{id}/`): `editor` and `admin` create, edit and delete FAQs (one route or one page each), goods rules and testimonials; only `admin` approves or withdraws a goods rule (`saveGoodsRuleAction` refuses an editor's request carrying the approval field and writes nothing), and an editor's change to an approved rule's kind, route or text clears the approval; a testimonial publishes only with a consent day (`consent_at`). A-09 (`/admin/settings/`): `admin` only; one form per `site_settings` key, validated by a stricter write schema, keeping stored fields the form doesn't own; the admin ticks "Đã xác nhận" (`is_verified`) per key, and a save stamps `updated_by`.

  | Section | Path | Roadmap | admin | editor | sales |
  | --- | --- | --- | --- | --- | --- |
  | Tổng quan | `/admin/` | A-01 | ✓ | ✓ | ✓ |
  | Yêu cầu báo giá | `/admin/leads/` | A-06 | ✓ | — | ✓ |
  | Thống kê liên hệ | `/admin/analytics/` | A-07 | ✓ | — | ✓ |
  | Tuyến & bảng giá | `/admin/routes/` | A-02 | ✓ | ✓ | — |
  | Trang | `/admin/pages/` | A-03 | ✓ | ✓ | — |
  | Bài viết | `/admin/posts/` | A-03b | ✓ | ✓ | — |
  | Thư viện ảnh | `/admin/media/` | A-04 | ✓ | ✓ | — |
  | Câu hỏi thường gặp | `/admin/faqs/` | A-05 | ✓ | ✓ | — |
  | Quy định hàng hoá | `/admin/goods-rules/` | A-05 | ✓ | ✓ | — |
  | Đánh giá khách hàng | `/admin/testimonials/` | A-05 | ✓ | ✓ | — |
  | Chuyển hướng | `/admin/redirects/` | A-08 | ✓ | — | — |
  | Cài đặt | `/admin/settings/` | A-09 | ✓ | — | — |
- Session reads (`auth()`, `currentUser()`) happen only in request-time admin code, never inside `"use cache"` (ADR 0006).

## Database access (Drizzle + Supabase)

- Driver: `postgres` (postgres.js) with the Supabase **transaction pooler** connection string; `prepare: false` (required for transaction pooling).
- Single client module `db/client.ts` (`server-only` import guard; replaces the template's `db/db.ts`, which also loads `.env` via dotenv — remove that). Migrations via `drizzle-kit` using the **direct/session** connection string.
- The app connects with a server role, so **authorization lives in server code**. RLS is still enabled on every table with no `anon`/`authenticated` policies (deny-all) so the Supabase Data API cannot leak data. If client-side supabase-js is ever needed, use Clerk ↔ Supabase native third-party auth (Supabase dashboard → Auth → Third-party → Clerk) and add policies on `auth.jwt()->>'sub'` — the old Clerk "Supabase JWT template" is deprecated.
- Storage (A-04, as built): `modules/media/infrastructure/storage.ts` calls the Storage REST API with plain `fetch` (no SDK), `server-only`, with `SUPABASE_SERVICE_ROLE_KEY` read at runtime only (never a build arg). Uploads go through the route handler `POST /api/admin/media` (multipart, one file per request, `requireSection("media")`), not a Server Action, so the 1 MB action body limit of the public lead form stays as it is; `GET /api/admin/media?q=&page=` is the picker's search (TanStack Query). sharp (a direct dependency) sniffs the format (JPEG/PNG/WebP/AVIF; HEIC refused), auto-rotates, strips metadata and writes the WebP master (`media/YYYY/MM/{id}-{slug}.webp`, ≤ 2560 px) and the 1200×630 JPEG (`og/media/{id}.jpg`); the rows are inserted only after both objects exist. Public reads use the public bucket URL through `next/image` (`StaticImage` on public pages). `NEXT_PUBLIC_SUPABASE_URL` alone enables reads; without it Storage images are omitted; without the key, upload and delete are disabled. `pnpm storage:setup` creates the buckets. Admin: `/admin/media/` (library, 48 per page, diacritic-insensitive search in app code), `/admin/media/{id}/` (alt/caption, usage list, delete only when unused); `MediaPicker` in the post (cover), page translation (OG image) and block (`image`) editors. Delete locks the row `FOR UPDATE` and re-scans usage; every save writing an image reference locks it `FOR SHARE` (ascending id order), so a save and a delete never both succeed. Public caches carry `media:{id}` tags, refreshed by alt edits and deletes.

## Server Actions pattern

```ts
'use server'
// ActionState<T> lives in shared/types/action-state.ts (template type, extended per ADR 0002, moved per ADR 0005):
//   | { isSuccess: true; message: string; data: T }
//   | { isSuccess: false; message: string; data?: never; fieldErrors?: Record<string, string[]> }
export async function submitLeadAction(_prev: ActionState<{ leadId: string }> | null, formData: FormData): Promise<ActionState<{ leadId: string }>> {
  const parsed = leadSchema.safeParse(Object.fromEntries(formData))          // shared Zod schema
  if (!parsed.success) return { isSuccess: false, message: 'invalid', fieldErrors: parsed.error.flatten().fieldErrors }
  await verifyTurnstile(formData.get('cf-turnstile-response'))
  await rateLimit(`lead:${await clientKey()}`)                                 // e.g. Upstash or DB-based
  const attribution = await readAttributionCookie()
  const lead = await createLead({ ...parsed.data, ...attribution })
  after(() => sendConversions({ type: 'lead', lead }))                         // next/server `after`
  after(() => notifySales(lead))                                               // Zalo OA + email (Q-14); recipients Q-28
  return { isSuccess: true, message: 'ok', data: { leadId: lead.id } }
}
```

Client side: `useActionState(submitLeadAction, null)` + `useFormStatus`; optimistic UI not needed. Admin mutations follow the same shape plus `requireRole` and `updateTag`.

## State management rules

| Need | Use |
| --- | --- |
| Data for rendering public pages | Server Components + cached queries (no client fetching) |
| Form submission | Server Action + `useActionState` |
| Ephemeral UI state (menu open, calculator inputs, consent choice, dismissed banners) | **Zustand** stores in `modules/*/ui/stores/` (or `shared/stores/` if generic) (small, typed, `persist` only for consent/banner) |
| Client-side async data in admin (lead list with filters/pagination, media library, search) | **TanStack Query** calling route handlers in `/api/admin/*` or server functions; invalidate on mutation success |
| URL state (filters on blog/goods page) | `searchParams` (nuqs optional) |

Never mirror server data into Zustand. `QueryClientProvider` mounts only in `/admin` layout (and the calculator if it ever needs live rates).

## Environment variables

| Name | Scope | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | server/CI | Supabase transaction pooler (app runtime). Needed at **build** too: the site shell is prerendered from the DB (S-01). CI and `pnpm db:local` use a throwaway Postgres |
| `DATABASE_URL_DIRECT` | server/CI | Session pooler (5432) or direct connection; required by `pnpm db:migrate` and `pnpm db:seed` (no fallback to `DATABASE_URL`) |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Storage public URLs |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Storage uploads, admin ops |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET` | public/server | Staff auth |
| `NEXT_PUBLIC_SITE_URL` | public | `https://43logistics.vn` in production. **Indexing switch (S-10):** only a build with exactly this origin gets `index, follow` and a crawlable robots.txt; any other value or unset (local, staging, previews) is `noindex` with `Disallow: /`. Absolute URLs in canonical, hreflang, JSON-LD, sitemap and RSS come from it |
| `PREVIEW_UNVERIFIED` | server | `1` shows unverified seed facts with a "chưa xác nhận" badge, only under `next dev` (S-01, ADR 0008). Local development only; it has no effect in any build |
| `NEXT_PUBLIC_GTM_ID` | public | `GTM-WF967MKT` or new |
| `META_PIXEL_ID`, `META_CAPI_TOKEN` | server | Meta CAPI |
| `TIKTOK_PIXEL_ID`, `TIKTOK_EVENTS_TOKEN` | server | TikTok Events API |
| `GOOGLE_ADS_*` | server | Enhanced/offline conversions (later) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | public/server | Lead form bot protection (S-08). Optional since S-08b (owner 2026-10-23): with both keys the challenge runs; unset → honeypot + minimum fill time, the form stays on. Local checks can use Cloudflare's test keys |
| `IP_HASH_SALT` | server | HMAC key for `ip_hash` in leads/events. Unset → a key derived from `DATABASE_URL` (S-08b); set it in production so a DB password rotation doesn't reset rate-limit history |
| `ZALO_OA_APP_ID`, `ZALO_OA_APP_SECRET`, `ZALO_OA_REFRESH_TOKEN`, `ZALO_OA_RECIPIENT_IDS` | server | Lead alerts via Zalo OA (S-08b). The refresh token seeds a rotation the app stores in `oauth_tokens` (renewed under a row lock; refresh tokens are single-use). Recipients: Zalo user ids of staff who follow the OA (free consultation messages need recent interaction). Unset → no Zalo alert (Q-28) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `LEAD_NOTIFY_EMAILS` | server | Lead alerts by email (S-08b, nodemailer). Defaults to Gmail `smtp.gmail.com:465`; use a Google App password for the company Gmail. Unset user/password/recipients → no email (Q-28) |
| `NEXT_PUBLIC_CF_BEACON_TOKEN` | public | Cloudflare Web Analytics site token (ADR 0010, S-13b). Unset → no beacon. Replaces `NEXT_PUBLIC_POSTHOG_KEY`/`_HOST`, removed in S-13b |
| `BING_SITE_VERIFICATION` | server (build) | Bing Webmaster Tools `msvalidate.01` meta (G-04, ADR 0011). Read at build: in production a GitHub `production` variable passed as a Docker build arg. Unset → no tag (Q-31) |
| `INDEXNOW_KEY` | server | IndexNow key (G-04), 8–128 of `[A-Za-z0-9-]`, set only in the VPS runtime env. Served at `/indexnow-key.txt`; admin saves ping only with it, `NODE_ENV=production` and the production `NEXT_PUBLIC_SITE_URL`. Unset → no pings, key file 404 |
| `INDEXNOW_ENDPOINT` | server | IndexNow endpoint override for local verification against a mock only; never set in production (default `https://api.indexnow.org/indexnow`) |

Template leftovers to remove or rename in F-00/F-01: `STRIPE_*` and `NEXT_PUBLIC_STRIPE_*` (no payments); `NEXT_PUBLIC_CLERK_SIGN_UP_URL` (no public sign-up); `SUPABASE_URL` → `NEXT_PUBLIC_SUPABASE_URL`; `SUPABASE_BUCKET_RECEIPTS` (not in the data model).

Validate with a Zod `env.ts` at boot; never commit `.env*`.

## Quality harness

- **Lint/format:** Biome 2 (`biome check`, with the `next` and `react` rule domains enabled; ADR 0002). F-01 compares Biome's rules with `@next/eslint-plugin-next` + React hooks rules; if a needed rule is missing, add a narrowly scoped ESLint config for those plugins only (Biome keeps formatting). Accessibility is verified manually with axe DevTools (ADR 0004), not by lint alone. The template's `prettier.config.cjs` is deleted in F-01. Pre-commit runs Biome on staged files only (never `git add .`).
- **Types:** `tsc --noEmit` strict.
- **No automated tests in the initial build phase (ADR 0004).** No Vitest, Playwright or `tests/` folder. Keep the price engine, slug/URL, metadata and JSON-LD builders, redirect loader and Zod schemas as pure typed functions so tests can be added later.
- **Manual verification per PR** (spec's "Manual verification plan"): home → route → calculator → Zalo click (`/go/zalo` 302 + `contact_events` row), lead form happy/error paths, language switch keeps the equivalent page, admin rate edit → public page shows the new price; 360/768/1280 px, keyboard, reduced motion, axe DevTools scan.
- **SEO checks (manual per page type):** 1 `h1`, canonical, hreflang pairs reciprocal, JSON-LD valid (Rich Results Test); `check:redirects` (script, not a test suite) in the `verify` CI workflow against `next start` (no preview deploy, ADR 0008).
- **Scripts kept in CI (not test suites):** gitleaks, `i18n:check`, `check:redirects` (every PR from F-07), and `perf:report` (F-08).
  - `perf:report` runs Lighthouse with 3 mobile runs per route in `43logistics.vn/data/perf-budget.json`.
  - It **blocks** on the ADR 0006 app-JS budget, an unstable script request set, or a route that can't be measured.
  - It **reports** LCP/CLS/TBT and the scores in the job summary and the `lighthouse-report` artifact.
  - Both server-backed steps share `scripts/ci/with-server.sh` (readiness `GET /` = 200, cleanup on exit).
- **Consent matrix (manual):** initial / accept / selective / withdraw / reload, cookies and storage, server conversions gated; re-run when consent, tracking, `proxy.ts` or leads change (ADR 0004).
- **Performance:** Lighthouse mobile run manually on the changed page, with LCP/CLS/INP and initial JS (gz, consent rejected) recorded; a JS budget miss blocks the PR, lab performance/LCP are report-only and field Core Web Vitals (p75, from L-02) are the binding experience gate (ADR 0009); Lighthouse CI on `/`, one route page and `/lp/sample/` as a report in F-08, with budgets from `AGENTS.md`.
- **Next.js DevTools MCP** can be enabled for agent debugging (Next 16 feature).
