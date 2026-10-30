# AGENTS.md — 43logistics.vn rebuild

> Canonical instructions for every AI agent in this workspace (Claude Code, Codex, Cursor, Copilot). `CLAUDE.md` imports this file.
> Read it first, recover project state (§6), then load only the context files the task needs (§5).

## 1. What we are building

A rebuild of **https://43logistics.vn**, the marketing + lead-generation site of **43 Logistics**. The company is an international parcel/cargo forwarder based in Đà Nẵng, with an office in TP.HCM. The old site is WordPress + Elementor, and it is being replaced, not upgraded.

The site exists to do three things, in this order:

1. **Turn visitors into contacts.** The channel priority is Zalo, then phone, then WhatsApp/Messenger, then the quote form. (The old web form produced only 12 leads in about 3 years; customers talk on Zalo.)
2. **Rank, get cited by AI assistants (GEO, ADR 0011) and convert paid traffic** for route keywords: "gửi hàng đi Singapore / Hàn Quốc / Nhật Bản / Đài Loan / Malaysia / Thái Lan / Mỹ" and "gửi hàng Singapore về Việt Nam".
3. **Look trustworthy** with real prices, real transit times, real photos, legal info and policies.

Languages: **Vietnamese (default, no URL prefix)** and **English (`/en/…`)**, built so more locales can be added.

**Sister sites (ADR 0012, 2026-10-30):** the same app also serves **avlogistics.vn** (AV Logistics) and later **gtlogistic.vn** (GT Logistic), separate legal entities in the same group:

- one Supabase database with a `site` dimension (`43l | av | gt`): routes, rate cards and goods rules are shared, and facts, pages, menus, posts and leads are per site;
- one admin at 43logistics.vn/admin with a target-site switcher;
- one build and one container per site.

Until MS-01…MS-07 land, the AV site exists only as the transitional fork `avlogistics.vn/app`. Per-site facts are confirmed per site (rule 1).

## 2. Workspace layout — two repos (ADR 0003)

| Path | What | Git |
| --- | --- | --- |
| `./` (this folder) | **Context workspace:** `AGENTS.md`, `CLAUDE.md`, `docs/`, `specs/`, `lessons/`, `data/`, `.claude/skills/` (`.agents/skills` is a symlink to it) | Git repo, branch `main`, remote `origin` = `github.com/Dienvm/logistics-context` |
| `43logistics.vn/` | **App repo:** all runtime code (Next.js). `github.com/Dienvm/43logistics.vn`, registered as a submodule | Own repo, branch `main` |
| `avlogistics.vn/` | AV Logistics owner assets (`logo.jpg`, `images/`, `info.txt`) and the **transitional** app fork `avlogistics.vn/app` (`github.com/Dienvm/avlogistics.vn`). Its brand and UI are ported into `43logistics.vn/` as the `av` site (MS-07), then it is retired (ADR 0012) | Not tracked by this repo; the fork has its own git |
| `wordpress-site/` | Legacy SQL dump + 1.4 GB full backup. **Read-only input** | Never committed (`.gitignore`). It contains password hashes and customer leads: grep it for specific facts only, and never copy rows into docs, prompts or either repo |
| `refer-docs/` | The original context-repo template these rules were adapted from | Reference only, not project guidance |

Ownership tag used in specs and proposals: `owner_repo: context | app | both`.

Artifact types (never mix them):

- `docs/context/` holds what we know. It is always current and edited in place.
- `docs/adr/` holds what we decided.
- `docs/proposals/` holds what we are still exploring.
- `specs/` holds what we committed to build (each spec is tied to a roadmap ID).
- `lessons/` holds what changes how we work.
- Runtime code exists only in `43logistics.vn/`.

## 3. Tech stack (ADR 0001 as amended by ADR 0002)

The **Target** column is what new code is written for. The **In the app today** column is the honest state of `43logistics.vn/` on 2026-10-21 (after F-03). If a task needs a target feature that isn't installed yet (`proxy.ts`, Cache Components, `updateTag`, `@theme`), do the closing task first. Don't hack around the gap or close it opportunistically inside an unrelated task.

| Layer | Target | In the app today | Closed by |
| --- | --- | --- | --- |
| Framework | **Next.js 16** (App Router, Turbopack), `proxy.ts`, `cacheComponents: true`, async `params`/`searchParams`/`cookies()`/`headers()` | `next ^16.4.2` (Turbopack), `next.config.ts` with `cacheComponents`, `partialPrefetching`, `trailingSlash` (ADR 0006); `proxy.ts` composed (F-06): 410s, legacy `?page_id`, one-hop locale/slash normalisation (`skipTrailingSlashRedirect`), canonical `/admin` → Clerk `clerkMiddleware` (F-05), admin variants 404, consent-gated `43l_attr`, then next-intl | done (F-01, F-03, F-05, F-06) |
| UI runtime | **React 19.2+**: Server Components by default, `"use client"` only for interactivity | `react ^19.3.1` | done (F-01) |
| Components | **shadcn/ui** (Radix) in `shared/ui` (ADR 0005), restyled only via tokens | 16 core shadcn v4 primitives (Radix via `radix-ui`) in `shared/ui`, restyled via token variables (44 px targets, full-strength focus ring, transform/opacity motion); `sonner` for toasts | done (F-02) |
| Styling | **Tailwind CSS v4**, `@theme` generated into `app/theme.css` from `43logistics.vn/data/design-tokens.json` | `tailwindcss ^4.3.3` via `@tailwindcss/postcss`, `tw-animate-css`, `@tailwindcss/typography`; `app/theme.css` (`@theme static`) generated by `pnpm tokens`, drift guarded by `pnpm tokens:check`; shadcn bridge in `app/globals.css` | done (F-02) |
| Motion | CSS first. **`motion`** (Framer Motion) only inside client islands via `LazyMotion` + `m` | CSS only (`tw-animate-css` + token durations/easings, reduced-motion block); `motion` not installed | deferred: the first island that needs it adds it with a JS-budget measurement (owner decision, F-02) |
| Mutations | **Server Actions** + Zod, returning `ActionState<T>` (`shared/types/action-state.ts`, extended with `fieldErrors`) | `ActionState<T>` with `fieldErrors` in `shared/types/action-state.ts`; first action `submitLeadAction` (`modules/leads/actions.ts`, S-08), passed to its client island as a prop | done (F-01) |
| Database | **Supabase Postgres via Drizzle, server only** (`db/client.ts` with `server-only`) | `drizzle-orm ^0.45.4` / `drizzle-kit ^0.31.11`; all 25 `07` tables in `modules/*/infrastructure/schema.ts` (RLS on, no policies), migrations `0000` baseline … `0011` (`0001` S-02 attribution columns; `0002`–`0003` S-08/F-05; `0004` S-08b `oauth_tokens`; `0005` F-05 `profiles.username` + nullable email; `0000`–`0005` applied on Supabase, `0004`–`0005` on 2026-10-24; `0006` A-02 `routes.admin_edited_*`/`verified_*` + `route_rates.updated_by`; `0007` A-03 `pages.admin_edited_*` + `page_translations.updated_by` + the hub/calculator/goods/blog H1 data step; `0006`–`0007` applied on Supabase 2026-10-24 (owner go-ahead); `0008` A-03b post edit columns; `0009` A-02b rate cards (`rate_cards`, columns, surcharge lists, translations; `route_rates` → `rate_card_id`/`column_id`/`*_minor`, legacy-card backfill; deprecated `routes` facts kept unread); `0010` rate-card delivery fee (`rate_cards.local_delivery_*`); `0011` A-02b part 2 drops the deprecated `routes` card facts; `0008`–`0011` applied on Supabase (`0011` on 2026-10-28 after the PR #55 deploy; 38 imported cards, 18 routes / 16 active); `0012` A-06 `lead_events` + `lead_exports` (additive; applied on Supabase 2026-10-28); `0013` A-09 `site_settings.updated_by` (additive; the seed skips admin-saved keys; **apply before deploying A-05/A-09**); `0014` MS-01 `site_code` enum + `site` columns, `(id, site)` uniques, composite foreign keys and site-inclusive unique indexes **beside** the old keys (ADR 0012 expand step; hand-ordered, `SET LOCAL` lock/statement timeouts; rehearsed on `db:local`; **applied on Supabase 2026-10-30** after a backup); `0015` MS-03 per-site primary keys `(site, key)` / `(site, source_path)` and the old single-column uniques dropped (**applied on Supabase 2026-10-30**, after deploying app `bf63150`); avlogistics.vn content cloned with `pnpm db:clone-site av` (2026-10-30), `pnpm db:seed` (unverified legacy data, draft pages/menus); `db/client.ts` `server-only`. **Supabase project connected (2026-10-22):** migrated and seeded (25/25 tables RLS on, 0 policies, 10 routes / 8 active, re-seed idempotent) in `ap-southeast-1` (Singapore); S-06/S-04b content seeded and confirmed there 2026-10-22 (hubs and route pages published, 75 goods rules approved, 10 FAQs published); `pnpm build` passes against it | done (F-04) |
| Files | **Supabase Storage** buckets `media` (public), `og` (public), `private` (signed URLs) | A-04: `modules/media` (Storage REST via `fetch`, server-only service key read at runtime; `sharp 0.35.5` direct dep), `/admin/media/` library + detail, `POST`/`GET /api/admin/media` (upload, picker search), `MediaPicker` in the post cover / page OG / `image` block editors, `images.remotePatterns` from `NEXT_PUBLIC_SUPABASE_URL`, `proxyClientMaxBodySize: 16mb`; `/wp-content/uploads/*` → 410 (owner 2026-10-28); `pnpm storage:setup` creates the buckets (owner activation step: set the key and run it once) | A-04 |
| Auth | **Clerk, staff only** (admin/editor/sales). `ClerkProvider` only in `/admin`; no public sign-up | `@clerk/nextjs ^7.9.19` + `@clerk/localizations 4.24.0` (F-05): `ClerkProvider` (Vietnamese, `viVN`) only in the `app/admin` root layout; embedded `<SignIn>` at `/admin/sign-in/` for username + password accounts the admin creates (sign-up Restricted); `clerkMiddleware` only for canonical admin paths; `requireRole()` reads the session claim `role`; webhook → `profiles`. Public routes carry no Clerk code (+0.8 KiB gz framework re-split, ADR 0006). Dev instance keys set locally; production keys at L-02 | done (F-05) |
| Traffic analytics | **Cloudflare Web Analytics** (ADR 0010, replaces PostHog): cookieless beacon added manually, loaded only after analytics consent; page views, sources, Core Web Vitals RUM; no custom events | S-13b: `modules/tracking` appends the beacon once after analytics consent from `NEXT_PUBLIC_CF_BEACON_TOKEN` (off until Q-32), reloads into the denied state when a loaded vendor's consent is withdrawn (any tab); `posthog-js`, `/ingest` and the PostHog env removed | S-13b (activation Q-32) |
| Ads & conversions | **GTM** (Consent Mode v2, basic) carrying only the ad platforms confirmed in Q-13, plus their server-side APIs | Consent banner + Consent Mode v2 basic loader (S-13): GTM loads only after ads consent from `NEXT_PUBLIC_GTM_ID` (a **new** container; legacy `GTM-WF967MKT` retired, owner 2026-10-24); no ad platform tags yet | done (S-13), T-01 + Q-13 |
| Client state | **Zustand** for UI state only (mobile nav, calculator inputs, consent, banners) | — (S-01's mobile nav needed none: Radix Sheet + native `<details>`; S-07's calculator keeps its inputs in a `useReducer` to stay inside the ADR 0006 JS budget, owner decision 2026-10-22) | consent (S-13) uses a ~60-line `useSyncExternalStore` store instead of Zustand (one island, ADR 0006 budget); Zustand still waits for a real cross-island need |
| Client server-state | **TanStack Query**, only in admin screens (and the calculator if it ever needs live data) | `@tanstack/react-query ^5.104.5` (A-01): one `QueryClient` per admin shell (`shared/lib/query-provider.tsx`, `staleTime` 30 s) inside `app/admin/(shell)/layout.tsx`; no Devtools; public routes ship none | done (A-01) |
| i18n | **next-intl**, `localePrefix: 'as-needed'`, VI default | `next-intl ^4.14.9` via `shared/i18n` (no locale cookie, no detection); `app/[locale]` root layout, locale from `next/root-params`; `messages/{vi,en}.json` + `pnpm i18n:check` (keys + ICU arguments) in the `verify` CI workflow | done (F-03) |
| Validation | **Zod**, schemas shared by Server Actions and forms | `zod ^4.6.7`; env via `shared/config/env.server.ts` / `env.public.ts` | done (F-01) |
| Lint/format | **Biome 2** (`biome check`, `next`/`react` domains) + `tsc --noEmit`; narrow ESLint only for Next rules Biome lacks | Biome 2.5 (`biome check`, `next`/`react` domains); no ESLint fallback (rules Biome lacks were assessed as unnecessary for this App Router app, see 43logistics.vn PR #2; ADR 0002 §4) + `tsc --noEmit` + dependency-cruiser `check:boundaries` (ADR 0005) | done (F-01) |
| Tests | **None in the initial build phase** (ADR 0004): verification = lint + typecheck + build + `check:redirects` + manual checks (§9). Code stays testable (pure functions) | none | — (ADR 0004) |
| Package manager | **pnpm**, Node ≥ 22 | pnpm 11 (`pnpm-lock.yaml`, `pnpm-workspace.yaml` `allowBuilds`), `engines.node >=22`; husky pre-commit uses pnpm + `biome check --staged` + gitleaks | done (F-00, F-01) |
| Hosting | Hostinger VPS (ADR 0008): Docker Compose with `app` (Next `output: 'standalone'`, one process) + Caddy (TLS, reverse proxy); image built in CI → GHCR → SSH pull; no staging (preview mode only under `next dev`). **Cloudflare Free proxy in front of Caddy** (ADR 0010): nameservers only (registrar stays Tenten), Full (strict), redirects stay in Caddy, HTML never edge-cached, origin firewalled to Cloudflare ranges, client IP from `CF-Connecting-IP` via `trusted_proxies`. Supabase in `ap-southeast-1` | `Dockerfile` (standalone, non-root, Node 22, pnpm 11.28.8), `compose.yaml`, `deploy/{Caddyfile,deploy-remote.sh,bootstrap-host.sh,env.template,README.md}`, `.github/workflows/deploy.yml` (L-00); `VERCEL_ENV` removed. VPS provisioned (Jakarta, Ubuntu 26.04, 2 vCPU / 8 GB); bootstrap, secrets, first deploy and DNS cutover are owner runbook steps; L-00b code (feat/l00b-cloudflare-edge): Caddy `trusted_proxies` (generated from `deploy/cloudflare-ips.txt` by `deploy/refresh-cloudflare-ips.sh`, `--check` in `verify`) + `client_ip_headers CF-Connecting-IP`, XFF set to `{client_ip}`; `harden-host.sh --origin=public|cloudflare`; runbook `deploy/README.md` §7. Owner cutover pending (DNS still at Tenten, origin open with per-source-IP limits) | L-00 (owner steps), L-00b (Cloudflare edge), then L-02 (Search Console, monitoring; VPS admin still open, Q-15); multi-site (ADR 0012): one Caddy, services `app` (43) and `app-av` (compose profile `av`, `.env.av` overrides, image tag `av-<sha>`), one build per site from the same SHA. **2026-10-30: GitHub Actions blocked by billing, so `bf63150` was built on the VPS (`~/build/vps-build.sh`) and rolled with `deploy-remote.sh` (43) / `compose --profile av up -d app-av` (AV); see `manual-deploys.log`.** avlogistics.vn DNS (A records to the VPS) pending with the owner |

AI tooling: Cursor, Claude Code and Codex read this file; an agent that opens only the app finds `43logistics.vn/AGENTS.md`. **V0** output is a draft: give it only tokens and non-sensitive copy, review any dependency it adds, replace its placeholder or fabricated copy with `messages/*` keys or DB data, map colours, radii and spacing to tokens, and land it through a normal spec/PR. **Perplexity** research is never a source for business facts (rule 1).

## 4. Golden rules

1. **Never invent business facts.** Prices, transit times, addresses, phone numbers, hours, legal name, stats and testimonials come only from the database or `docs/context/01-business.md`. Only values whose status there is **Confirmed** (or `is_verified = true` in the DB) may be published; legacy values are seed data, not facts. If something is unknown, render nothing or a clearly marked placeholder, and add it to `docs/context/11-open-questions.md`.
2. **Prices and transit times have exactly one source of truth**: the tables `rate_cards`, `route_rates` and the surcharge lists (`surcharge_lists`, `surcharge_items`; A-02b, ADR 0007). The price section, the calculator, the mega-menu "từ X/kg", JSON-LD `Offer` and OG images all read from there; route summaries (transit, methods, "Từ X") are derived from the active cards. Never hard-code a price in a component or in copy. The rate tables are shared by every site (ADR 0012); facts that differ per company (legal name, contacts, offices) live in per-site `site_settings`.
3. **No text inside images.** Headlines, prices and country names are HTML (for SEO, translation and responsiveness). The only exception is OG images generated by `next/og` from DB data (`05-seo-and-tracking.md`).
4. **Every public page must have**:
   - exactly one `<h1>`;
   - `generateMetadata` (title, description, canonical, `alternates.languages`);
   - JSON-LD for its page type;
   - breadcrumbs (except home);
   - a visible primary CTA (Zalo).
5. **Server first.** Fetch data in Server Components via each module's cached queries (`modules/*/infrastructure`, `"use cache"` + `cacheTag`). Mutate via Server Actions in `modules/*/actions.ts`, then call `updateTag()`/`revalidateTag(tag, 'max')`.
6. **Drizzle only on the server.** Never import `@/db` from a Client Component (`db/client.ts` imports `server-only`). Never expose `SUPABASE_SERVICE_ROLE_KEY` or `DATABASE_URL` to the client.
7. **Authorization is explicit.** Every admin Server Action and route handler calls `requireRole([...])` (Clerk `auth()` + role claim). RLS is enabled on all tables as defense in depth (deny-by-default for `anon`/`authenticated`).
8. **Performance budget (mobile, 4G)**: LCP < 2.5 s, INP < 200 ms, CLS < 0.1 at p75 of **field data** (Search Console CWV / CrUX, from L-02; ADR 0009) are the binding experience gate; Lighthouse lab performance/LCP are recorded per PR, not blocking. JS: **framework baseline + ≤ 50 KB gz of first-party app JS per route** (ADR 0006; third-party scripts such as the Maps embed are reported separately, amendment 2026-10-24).
   - The baseline is the initial JS of the empty placeholder on the current Next/React versions: **134.3 KB gz** (Next 16.4.2 / React 19.3.1). Every Next/React upgrade re-measures it.
   - Measure with Lighthouse mobile on the production build, consent **rejected**, `noModule` chunks excluded; record baseline, route total and app delta. Report third-party tags loaded after consent separately, and keep them deferred.
   - No carousel above the fold.
   - No Google Maps iframe in the global layout.
   - `next/image` everywhere.
   - No Clerk, TanStack Query or `motion` on public pages unless a measured island needs it.
9. **Motion**: animate only `transform`/`opacity`, never the LCP element. Everything respects `prefers-reduced-motion` (CSS + `useReducedMotion`).
10. **Accessibility**: WCAG 2.2 AA.
    - Use only token colours (contrast is pre-checked).
    - Label every input and keep a visible focus ring.
    - Tap targets ≥ 44 px.
    - shadcn/Radix primitives keep their ARIA behaviour; don't strip it when restyling.
11. **Vietnamese typography**:
    - Body line-height ≥ 1.6.
    - No `uppercase` on buttons or menus (uppercase with diacritics hurts legibility).
    - Load fonts with `subsets: ['latin', 'vietnamese']`.
12. **Track every contact.** Zalo/phone/WhatsApp/Messenger links go through `/go/[channel]`, which logs `contact_events` and then returns a 302. Also push the matching event (once, from `modules/tracking`) to `dataLayer`; the GTM lane picks it up after ads consent (Cloudflare Web Analytics takes no custom events, ADR 0010). Exception: staff-side "Gọi"/"Zalo" links in the admin leads inbox (A-06) go straight to `tel:`/`zalo.me` with no event, because rule 12 counts visitor contacts and no customer identifier may reach analytics.
13. **Keep old URLs alive.** Every URL in `43logistics.vn/data/redirect-map.csv` must resolve as specified (200 / 301 / 410), in one hop.
14. **Personal data (Personal Data Protection Law 91/2025/QH15, in force 01/01/2026, and Decree 13/2023 as applicable)**:
    - Forms have a consent checkbox and a privacy policy link.
    - No analytics or ad tags, cookies or requests before consent (Consent Mode basic). `43l_attr` holds ad click IDs, so it needs consent too.
    - No raw IP stored (hash only).
    - Customer screenshots are used only with consent and with personal data blurred.
15. **Secrets never enter git or prompts.** `.env*` stays untracked (only `.env.example` is committed). Don't print `.env` values, the WordPress dump or lead data into chat, docs or commits.

## 5. Context map (load on demand)

| When the task is about… | Read |
| --- | --- |
| Company facts, contacts, audience, voice | `docs/context/01-business.md` |
| What was wrong with the old site / what to keep | `docs/context/02-legacy-audit.md` |
| Sitemap, URLs, navigation, page contents | `docs/context/03-information-architecture.md` |
| Colours, fonts, spacing, components, motion | `docs/context/04-design-system.md` + `43logistics.vn/data/design-tokens.json` |
| Metadata, JSON-LD, sitemap, robots, hreflang, tracking, consent, ads LPs | `docs/context/05-seo-and-tracking.md` |
| Folder structure, rendering/caching, proxy, auth, state, env | `docs/context/06-architecture.md` |
| Tables, Drizzle schema, RLS, storage | `docs/context/07-data-model.md` |
| Locales, slugs, translation workflow | `docs/context/08-i18n.md` |
| Importing WordPress content, media, redirects | `docs/context/09-migration.md` + `43logistics.vn/data/redirect-map.csv` + `data/media-inventory.csv` + `43logistics.vn/data/seed/*` |
| What to build next, acceptance criteria | `docs/context/10-roadmap.md` |
| Unknowns that block content | `docs/context/11-open-questions.md` |
| VI ↔ EN terminology | `docs/context/12-glossary.md` |
| Original page text (raw material, unverified) | `docs/context/legacy-copy/*.md` |
| Why the stack / workflow is what it is | `docs/adr/*.md` |
| Work in flight | `specs/INDEX.md`, `docs/proposals/`, `lessons/INDEX.md` |

## 6. Workflow (Claude- and Codex-compatible)

### Recover state before acting

At the start of any project task, or when asked for status or "what next", read:

- `docs/context/10-roadmap.md`: the first unchecked task whose dependencies are done.
- `specs/INDEX.md` and `lessons/INDEX.md` (tables only).
- `docs/context/11-open-questions.md`, when the task touches content or facts.
- `git status --short` at the root and `git -C 43logistics.vn status --short` in the app.

Then name the next concrete action, its blockers and its owning repo. If the state makes the next step clear, do it. Don't answer "there is no task".

### Operating sequence

1. **Precedence:** system/developer instructions, then the user's explicit instructions in this session, then this file, then skill instructions, then ADRs and `docs/context/*`, then specs and lessons, then local code patterns. If a user instruction would break a golden rule (§4), such as publishing an unconfirmed fact or committing a secret, say so before acting.
2. **Classify the intent:** question, status, planning, proposal, decision, spec, implementation, review, fix or doc change.
3. **Use the matching skill:** if a skill is named or clearly matches, read its `SKILL.md` and follow its steps in order. Don't skip a step because the next one feels more urgent.
4. **Inspect the real files** (docs, app code, `package.json`) instead of relying on memory.
5. **Respect existing changes:** check `git status` before edits, treat existing changes as the user's, and never revert them unasked.
6. **Ask only when blocked** by credentials, destructive actions or a genuinely risky ambiguity. A missing owner fact is **not** a blocker for code (ADR 0004): render nothing or a marked placeholder (rule 1), build owner-dependent integrations switched off, and end the task with an "Outstanding owner questions" list of Q-IDs. Activation and launch still need the answers (ADR 0004 Decision 5).
7. **Carry the work through:** unless the user asked only to discuss, review or plan, finish the edit, verification and a concise summary.
8. **Verify narrowly:** run the narrowest meaningful check (`pnpm typecheck`, `pnpm lint`, `pnpm build`, a manual browser check, a doc grep; no test suites per ADR 0004). If you didn't verify, say why.

### Lifecycle

```
roadmap task (10-roadmap.md)
  └─ /feature-bug  → specs/<type>-<slug>.md (draft → approved by the user)
       └─ /implement → app branch + PR (in_implementation)
            └─ /code-review → /fix-implement (as needed) → /lesson (if a follow-up exists)
                 └─ /mark-implemented <spec> <merged PR> → implemented + roadmap [x]

open idea → /proposal (docs/proposals, draft) → /doc-review → /adr (decision) → /supersede (old doc)
repo health → /context-audit · /doc-review --audit
```

### Skills (`.claude/skills/*/SKILL.md`, shared with Codex via `.agents/skills`)

| Skill | Use when |
| --- | --- |
| `/proposal <title>` | Exploring an option that isn't decided yet |
| `/doc-review <file>` / `--audit` | Reviewing one doc / scanning the doc set for risks |
| `/adr <title>` | Recording a settled decision (context + decision + consequences) |
| `/supersede <old> <new>` | Retiring a proposal or ADR |
| `/context-audit` | Checking that the docs, data, skills and app agree with each other |
| `/feature-bug [feature\|bug] <title>` | Turning a roadmap task or bug into an implementation spec |
| `/implement <spec>` | Implementing an approved spec in `43logistics.vn/` |
| `/code-review <spec\|path\|staged>` | Reviewing code against its spec and the golden rules |
| `/fix-implement <spec>` | Fixing code that doesn't meet its spec |
| `/mark-implemented <spec> <pr>` | The only way to set `status: implemented` |
| `/lesson <slug>` | Recording a learning that has a concrete follow-up |

### Running skills (applies to every `SKILL.md`)

- **Root first:** run every skill from the context root. Resolve it before Step 1 and `cd` there: `ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null); [ -n "$ROOT" ] || ROOT=$(git rev-parse --show-toplevel); cd "$ROOT"`. Then check `test -f AGENTS.md -a -d .claude/skills`. Context documents are never created inside `43logistics.vn/`.
- **State recovery:** do the §6 state recovery before the skill's own context budget. A skill's "read only…" limits apply on top of it.
- **Placeholders:** every `<placeholder>` in a skill's commands must be substituted with a validated value and passed as a quoted variable. Example: `SLUG='consent-banner'; OUT="/tmp/43l-codex-proposal-$SLUG-r1.md"`. Never run a command that still contains `<` or `>`.
- **Long runs:** Claude Code uses the Bash tool's background mode (`run_in_background`) and waits for the completion notification. Codex, and any other agent without background tasks, runs the same command synchronously.
- **Codex review step (only `/feature-bug`, `/implement`, `/proposal`, `/code-review`):** these four skills end with Codex review → Claude verify → Codex debate (at most 2 rounds), as ADR 0003 §6 requires (amended 2026-10-21). A missing CLI, a non-zero exit, or a missing or stale output file is reported, never silently skipped. Every other skill, and every plain question or prompt, is handled by Claude alone with no Codex pass (owner decision 2026-10-21: the review loop was too slow for low-risk steps).

### Second opinion from Codex

Those four skills run Codex non-interactively and read-only:

```bash
codex exec -s read-only --skip-git-repo-check -C "$PWD" -o /tmp/43l-codex-<topic>.md "<prompt>"
```

Check availability first with `command -v codex`; if it's missing, skip the step and say so. Present Codex's critique to the user and apply only the points they accept.

### Git

- App repo: branch from `main` (`feat/<roadmap-id>-<slug>`, `fix/<slug>`) and use Conventional Commits (`feat(route-page): …`). Open PRs with `gh`. Never push to `main` directly.
- Stage explicit paths. Never `git add .` / `-A`, because they can pick up `.env*` and dumps.
- Commit or push only when the user asks or a skill they invoked says to.

## 7. Commands (run inside `43logistics.vn/`, or with `pnpm -C 43logistics.vn <script>`)

| Command | Status | Purpose |
| --- | --- | --- |
| `pnpm dev` | exists | `next dev` (Turbopack) |
| `pnpm build && pnpm start` | exists | Production build |
| `pnpm lint` | exists (`biome check .`) | Lint + format + import order (Biome 2) |
| `pnpm lint:fix` / `pnpm format:write` | exists | Biome autofix (`biome check --write`) / format |
| `pnpm typecheck` | exists | `next typegen` + `tsc --noEmit` (generated route and root-param types) |
| `pnpm check:boundaries` | exists | dependency-cruiser module rules (ADR 0005) |
| `pnpm db:generate` / `pnpm db:migrate` | exists | drizzle-kit (migrations in `db/migrations/`); requires `DATABASE_URL_DIRECT` |
| `pnpm tokens` / `pnpm tokens:check` | exists | Build `app/theme.css` from `43logistics.vn/data/design-tokens.json` / exit 1 if it is out of date |
| `pnpm i18n:check` | exists | Every `messages/*.json` matches `vi.json` in keys and ICU arguments |
| `pnpm db:seed` | exists | `tsx scripts/seed.ts`: idempotent, one transaction; routes, rates, settings (unverified), IA pages and menus (draft; info-page blocks parsed strictly, S-09); requires `DATABASE_URL_DIRECT` |
| `pnpm db:confirm` | exists (S-05b) | `tsx scripts/confirm-facts.ts`: marks the routes and `site_settings` keys listed in `43logistics.vn/data/owner-confirmations.json` verified and publishes its `pages` with every translation (S-04), refusing a `policy` page without exactly one valid `policy` block (S-09), and publishes the blog posts listed under `posts` by VI slug (S-11) — the owner's record; the seed never verifies or publishes; also runs in the `verify` CI workflow; requires `DATABASE_URL_DIRECT` |
| `pnpm price:examples` | exists (S-03, A-02b) | `tsx --conditions=react-server scripts/price-examples.ts`: prints the A-02b AC-08 worked examples through the price engine on the cards of `data/seed/rate-cards.json`, plus the row mapper's malformed-value check, for a reviewer to compare by hand with the spec table (no assertions, no database; ADR 0004) |
| `pnpm db:import-rate-cards` | exists (A-02b) | `tsx scripts/import-rate-cards.ts`: loads `data/seed/rate-cards.json` (the owner-confirmed retail price list). No flag = dry run (per-band diff and counts, nothing written); `--replace` backs up what it deletes to `.backups/rate-cards-{timestamp}.json` (gitignored) and replaces the listed routes' cards, bands, columns, surcharge lists, policies and targeted copy in one transaction, skipping admin-edited routes; `--replace --force` replaces those too. Never touches routes absent from the file; a second run changes nothing; requires `DATABASE_URL_DIRECT` |
| `pnpm price:cards` | exists (A-02b) | `tsx scripts/print-rate-cards.ts`: prints every stored rate card read-only (facts, columns, bands with labels, linked lists, policy titles) for comparison with `data/retail-price-list.md`; requires `DATABASE_URL_DIRECT` |
| `pnpm perf:report` | exists | Lighthouse 3-run medians per route in `43logistics.vn/data/perf-budget.json`; exits 1 when app JS > baseline + 50 KiB (ADR 0006), unstable, or unmeasurable; CI job summary + `lighthouse-report` artifact |
| `pnpm storage:setup` | exists (A-04) | `tsx scripts/storage-setup.ts`: creates the Supabase Storage buckets `media` (public, 15 MB, WebP), `og` (public, JPEG) and `private`, or aligns their settings; a second run changes nothing; never deletes a bucket or object; requires `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` |
| `pnpm db:local` / `pnpm dev:local` | exists (S-01) | Throwaway Docker Postgres 17 on `localhost:54329` (roles, migrate, seed; never writes `.env`) / `next dev` against it with `PREVIEW_UNVERIFIED=1` (unverified facts badged) |
| `pnpm check:redirects` | exists | Verify every row of `43logistics.vn/data/redirect-map.csv` against a running server (`--strict` at L-01, `--host-checks` at L-02); runs in the `verify` CI workflow |

Keep this table true. When a task adds or renames a script, update its row in the same change.

## 8. Conventions (app repo)

- TypeScript `strict`, no `any`. The path alias `@/` maps to the **app root** (no `src/`).
- Folders:
  - `app/`: thin routing layer (pages, layouts, route handlers, metadata) — no business logic.
  - `modules/<name>/{domain,application,infrastructure,ui}` + `actions.ts`, `constants.ts`, `index.ts` (server API), `client.ts` (client-safe API): one module per business capability (ADR 0005, `.claude/rules/module-structure.md`).
  - `shared/{ui,lib,config,hooks,i18n,types}`: no business meaning; `ui` holds shadcn primitives with no data fetching.
  - `db/{client.ts,schema.ts,migrations/}`
  - `messages/`, `data/`, `scripts/` (no `tests/` in the initial build phase, ADR 0004)
- File names are `kebab-case.tsx`, components `PascalCase`, one component per file. Server Actions end with `Action` (`submitLeadAction`).
- UI chrome copy lives in `messages/{vi,en}.json`; page content lives in the database.
- Dates are stored in UTC and displayed in `Asia/Ho_Chi_Minh`. Money is stored as integer VND (`bigint`) and formatted with `Intl.NumberFormat('vi-VN')`, e.g. `75.000 đ`.
- Don't add the template's `<ai_context>` comment headers to new files; delete them from files you rewrite.
- Commit style: Conventional Commits.

### Detailed coding rules

`.claude/rules/*.md` hold the detailed patterns behind §8. Claude Code loads them automatically; other agents read the matching file before editing code. They refine this file and never override it.

| File | Covers |
| --- | --- |
| `module-structure.md` | Feature modules and layers, the dependency rule (ADR 0005) |
| `code-style.md` | Size limits and clean-code rules |
| `api-patterns.md` | Cached queries, Server Actions, route handlers, DB |
| `component-patterns.md` | Server vs client, composition, tokens, motion, a11y |
| `form-patterns.md` | Forms (`useActionState` + Zod) |
| `conditional-form-patterns.md` | Fields that depend on other fields |
| `hook-patterns.md` | Client hooks |
| `state-patterns.md` | State: Zustand, TanStack Query |
| `type-definitions.md` | Types and their sources of truth |
| `naming-conventions.md` | Names for files, functions, tags, keys |
| `seo-patterns.md` | Per-page SEO, 43logistics.vn only |
| `security-patterns.md` | Secrets, boundaries, validation, auth, abuse |
| `verification-patterns.md` | Checks without test suites (ADR 0004) |
| `ui-terminology.md` | Copy rules + glossary use |
| `git-workflow.md` | Accounts, branches, commits, PRs |

## 9. Definition of done (every app PR)

- [ ] `pnpm lint && pnpm typecheck && pnpm build` pass, plus `pnpm i18n:check` (from F-03), `pnpm check:redirects` (from F-07, every PR) and gitleaks; no new console errors. No automated test suites in this phase (ADR 0004).
- [ ] Manual verification plan from the spec done and recorded in the PR, incl. an axe DevTools scan at 360 and 1280 px with zero serious/critical issues.
- [ ] PR ends with "Outstanding owner questions" (Q-IDs the change depends on), or "none".
- [ ] Works at 360 px, 768 px and 1280 px; keyboard-navigable; reduced-motion checked.
- [ ] New public page: metadata + canonical + hreflang + JSON-LD validated (Rich Results Test or a schema validator).
- [ ] No hard-coded business facts; strings in `messages/*` for both VI and EN.
- [ ] Lighthouse mobile on the changed page, consent rejected: 100 SEO and ≥ 95 accessibility (binding); performance, LCP, CLS and TBT recorded and compared with `main` (target ≥ 90; a clear regression, ≥ 3 points or ≥ 0.3 s LCP, is explained in the PR; ADR 0009); the app JS delta over the framework baseline (≤ 50 KB gz, ADR 0006). A JS budget miss blocks the PR.
  - CI (F-08) **enforces the JS budget** for every route in `43logistics.vn/data/perf-budget.json` whenever Lighthouse runs; add new public routes there. To stay inside GitHub's free 2,000 CI minutes (owner, 2026-10-28: no paid minutes), Lighthouse runs only on a manual dispatch or on a PR labelled `lighthouse`: **every PR that changes a public page carries the label**; admin-only PRs don't.
  - CI also **reports** LCP/CLS/TBT and the scores, which don't block; the manual measurement above stays the binding evidence for them.
- [ ] Consent matrix (ADR 0004) re-run when the change touches consent, tracking, `proxy.ts` or lead processing.
- [ ] Context updated in the same change set if a decision or fact changed:
  - roadmap checkbox via `/mark-implemented`;
  - an ADR in `docs/adr/` for stack or architecture changes;
  - the §3 table when a gap closes.

## 10. Do not

- Do not copy text from `legacy-copy/` into production without rewriting and fact-checking it.
- Do not link to competitor domains (the old site linked to `3a.net.vn`).
- Do not claim "24/7", "hàng nghìn khách hàng", insurance terms or delivery guarantees unless `01-business.md` confirms them.
- Do not list goods as "accepted" (medicine, cosmetics without labels, food) without per-country rules in the database approved by operations.
- Do not add analytics/tag systems beyond the two lanes in ADR 0002 as amended by ADR 0010 (GTM for ads, Cloudflare Web Analytics for traffic) without a new ADR and an update to `05-seo-and-tracking.md`.
- Do not add runtime code, package manifests or app CI to the context workspace. Do not add context docs to the app repo.
- Do not follow `refer-docs/`: it describes a different project (Foresent robot) and is kept only as the template these rules came from.
