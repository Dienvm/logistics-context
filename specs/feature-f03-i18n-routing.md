---
title: Add next-intl locale routing with VI root and /en
type: feature
status: draft
owner_repo: both
roadmap: F-03
priority: must-have
blocked_by_questions: []
updated: 2026-10-21
---

## Feature: Add next-intl locale routing with VI root and /en

### Problem Statement

The site must serve Vietnamese at the root and English under `/en/`, and be built so more locales can be added (`AGENTS.md` §1, `08-i18n.md`). Today the app has a single `app/layout.tsx` hard-coded to `lang="vi"`, a placeholder page with inline Vietnamese text (a temporary exception "until next-intl lands in F-03"), no `messages/` and no locale routing. Every public page from S-01 on depends on this layer: localized routes, `generateMetadata` with hreflang (rule 4), UI strings in `messages/*` (§9), and `pnpm i18n:check` in every PR.

F-03 is also the **Cache Components compatibility gate for next-intl** (ADR 0006 Decision 1). Two facts found while preparing this spec change the documented plan:

- `next-intl` 4.14.9 (current) labels `setRequestLocale` **legacy** and recommends `next/root-params`, which Next ≥ 16.3 ships by default. `08-i18n.md` and `06-architecture.md` still prescribe `setRequestLocale`. Owner decision (2026-10-21): use `next/root-params`.
- `localePrefix: 'as-needed'` serves the default locale at the root through the next-intl middleware, so F-03 must add a **minimal `proxy.ts`** (next-intl only). F-06 later composes the 410 rules, legacy IDs, attribution and Clerk around it.

Roadmap row: `docs/context/10-roadmap.md` F-03. *Accept:* next-intl works with `cacheComponents: true` (build + a request through a localized page), result recorded in ADR 0006; `/` renders `lang="vi"`, `/en/` renders `lang="en"`; no auto redirect; parity check in CI.

### Proposed Solution

A visitor opening `/` gets the Vietnamese placeholder with `<html lang="vi">`. `/en/` gets the English placeholder with `lang="en"`. A small "Tiếng Việt / English" link pair switches between them without a full reload. The visitor's browser language and any earlier visit never redirect them, and no cookie is set. Each page declares its canonical URL and reciprocal hreflang. CI fails a PR whose `vi.json` and `en.json` disagree, and also runs the other app checks.

### Acceptance Criteria

**Dependencies and configuration**

- [ ] Given `package.json`, then `next-intl` is on the current 4.x (4.14.9 or later at implementation time), with no other new runtime dependency.
- [ ] Given `next.config.ts`, then it wraps the config with `createNextIntlPlugin('./shared/i18n/request.ts')` and keeps `cacheComponents: true`, `partialPrefetching: true` and `trailingSlash: true` unchanged.
- [ ] Given `shared/i18n/routing.ts`, then `defineRouting` sets:
  - `locales: ['vi', 'en']`, `defaultLocale: 'vi'`, `localePrefix: 'as-needed'`;
  - `localeDetection: false`, `localeCookie: false`;
  - `alternateLinks: false`, because hreflang comes only from `generateMetadata` (published pairs only, `05`);
  - no `pathnames` yet (see Scope).

  `Locale` is exported as a type derived from `routing.locales`, never a bare `string` (`type-definitions.md`).
- [ ] Given `shared/i18n/request.ts`, then `getRequestConfig` resolves the locale from an explicit `locale` argument, else `rootParams.locale()` (`next/root-params`), validates it with `hasLocale`, falls back to `defaultLocale`, and loads `messages/<locale>.json`. `setRequestLocale` is not called anywhere in the app. **Permitted fallback:** if `next/root-params` fails under `cacheComponents`, the ADR 0006 fallback (pass `locale` from `params` explicitly) is allowed, and `setRequestLocale` only after that also fails. Either needs the same gate evidence (every Cache Components gate AC passes) plus the failure output and reason recorded in ADR 0006 and the PR.
- [ ] Given `shared/i18n/navigation.ts`, then it exports `Link`, `redirect`, `usePathname`, `useRouter` and `getPathname` from `createNavigation(routing)`. App code uses these for locale-aware links.

**Routing (`proxy.ts`, minimal)**

- [ ] Given `proxy.ts` at the app root, then it exports the next-intl middleware for `routing` and nothing else. Its matcher excludes `_next`, `_vercel`, `api`, `go` and paths with a dot. A comment points to `06` for the F-06 composition.
- [ ] Given a production build (`pnpm build && pnpm start`):
  - `/` → **200**, `<html lang="vi">`, Vietnamese placeholder text;
  - `/en/` → **200**, `<html lang="en">`, English placeholder text;
  - `/vi/` and `/vi` → reach `/` in **at most one** redirect;
  - `/en` → reaches `/en/` in **one** redirect;
  - `/en?utm_source=x` → reaches `/en/?utm_source=x` with the query string preserved;
  - for each, the redirect count, final URL and final status are recorded from the full chain (`curl -sL -w '%{num_redirects} %{url_effective} %{http_code}'`), not from the first response only.
- [ ] Given an **unknown path under a locale** (`/khong-co/`, `/en/khong-co/`, and `/fr/`, which `as-needed` treats as a Vietnamese path), then the response is **404** with the localized not-found page: `lang`, one `<h1>` and text in that locale (`vi` for `/khong-co/` and `/fr/`).
- [ ] Given a request that reaches `[locale]` with an **invalid root parameter** (a path the matcher excludes, e.g. `/missing.txt`), then the response is **404** from `app/global-not-found.tsx` (enabled with `experimental.globalNotFound`, per the bundled Next docs for dynamic root layouts):
  - `<html lang="vi">`, Vietnamese text from `messages/vi.json`;
  - it imports `globals.css` and the fonts itself, because it bypasses the layout;
  - it has a link home.
- [ ] Given a request to `/` with `Accept-Language: en-US,en;q=0.9`, then the response is **200 Vietnamese**, with no redirect (no auto redirect).
- [ ] Given any request above, then the response has **no `Set-Cookie`** header and **no `Link` hreflang header**.
- [ ] Given the **consent matrix** (AGENTS §9; triggered by `proxy.ts`), reduced to what exists before S-13, then on initial load of `/` and `/en/`, switcher navigation in both directions and a reload:
  - **0** requests to any third-party or analytics host;
  - **0** cookies (`document.cookie` and CDP `Network.getCookies`);
  - **0** `localStorage` / `sessionStorage` keys.

  The accept, selective and withdraw rows are recorded as "n/a until S-13 (no consent UI or tags exist)".

**Layouts, pages and messages**

- [ ] Given the app tree, then `app/[locale]/layout.tsx` is the **root layout**. `app/layout.tsx` is deleted, because `rootParams.locale()` needs the locale segment in the root layout. The new layout:
  - renders `<html lang={locale}>` with the existing `next/font` variables and `globals.css`;
  - calls `notFound()` for a locale that `hasLocale` rejects;
  - exports `generateStaticParams` returning both locales;
  - keeps the F-00 metadata defaults (`metadataBase` from `NEXT_PUBLIC_SITE_URL`, `robots: noindex, nofollow`).
- [ ] Given `app/[locale]/page.tsx` (the placeholder), then it contains no hard-coded UI strings. The `<h1>` and the line under it come from `messages/{vi,en}.json` (`home.*`). The brand name is a message value, not a literal in TSX.
- [ ] Given `generateMetadata` on the placeholder, then the rendered `<head>` has:
  - a title from `metadata.*` messages;
  - a canonical with trailing slash (`/` or `/en/`);
  - `alternates.languages` with `vi` → `/`, `en` → `/en/` and `x-default` → `/`;
  - the `noindex, nofollow` robots tag still present.

  With `NEXT_PUBLIC_SITE_URL` set, every URL is absolute, and the pairs are reciprocal across both pages.
- [ ] Given unknown paths under a valid locale, then a catch-all `app/[locale]/[...rest]/page.tsx` calls `notFound()`, and `app/[locale]/not-found.tsx` renders a localized 404 (one `<h1>`, a link home, strings from `messages/*`).
- [ ] Given the dev gallery, then it lives at `app/[locale]/dev/tokens/`: `/dev/tokens/` → 200 in `pnpm dev` (checked first), 404 in production (unchanged behaviour). Its gallery text may stay literal (dev-only, never served publicly).

**Language switcher (minimal, placeholder only)**

- [ ] Given the placeholder page, then it shows a two-link switcher ("Tiếng Việt" / "English", from messages):
  - built with the next-intl `Link` from `shared/i18n/navigation.ts`. **Permitted fallback:** if that `Link` breaks prerendering, use `next/link` with hrefs from `getPathname`, with the prerender error recorded in the PR; the client-navigation gate AC must still pass;
  - each link has `hrefLang` and `lang`, and the current locale's link has `aria-current="page"`;
  - each link has a ≥ 44 × 44 px hit area and a visible focus ring;
  - names, not flags.

  It lives in `shared/i18n/ui/locale-switcher.tsx` (no business meaning; S-01 replaces it with the header switcher, which links to the equivalent translation).

**Key parity (`pnpm i18n:check`)**

- [ ] Given `scripts/check-i18n.ts` and the `i18n:check` script (`tsx`), when both files have the same nested key set and the same ICU argument names per key, then it prints a summary and exits 0.
- [ ] Given a key present in only one file, or a key whose ICU arguments differ (e.g. `{min}` in VI, missing in EN), then it lists each problem with its dotted key path and file, and exits **1**. It covers every `messages/*.json`, comparing each locale against `vi.json` so that adding a locale needs no script change. Verified by a temporary edit in each direction, then reverted.

**CI**

- [ ] Given `.github/workflows/verify.yml` in the app repo, then on every `pull_request` and on `push` to `main` it runs, on Node 22 with pnpm 11 and `--frozen-lockfile`: `lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check` and `build`. It needs no secrets: blank env is valid, because every variable is optional until its task. The existing gitleaks workflow is unchanged.
- [ ] Given the F-03 PR, then the `verify` workflow runs on it and passes, and a run where `i18n:check` fails is recorded: a throwaway commit on a scratch branch, deleted afterwards, or the local failing output if CI can't be exercised.

**Cache Components gate (ADR 0006 Decision 1, F-03 row)**

- [ ] Given `pnpm build`, then it passes, and the route table shows `/[locale]` prerendered for `vi` and `en` (static or partially prerendered, recorded as printed), with no "uncached data accessed outside `<Suspense>`" error.
- [ ] Given direct loads of `/` and `/en/`, then each renders the right `lang`, messages, canonical and reciprocal hreflang.
- [ ] Given client navigation VI → EN → VI through the switcher (warm cache), then each step shows only that locale's `lang`, strings and switcher state (no locale mixing). The DOM `lang` and the visible text are checked after each step.
- [ ] Given two isolated browser contexts, one on `/` and one on `/en/`, loaded alternately three times, then neither ever shows the other locale's content.
- [ ] Given these results, then ADR 0006's Decision 1 F-03 row records versions (next, next-intl), expected vs observed results, and the `next/root-params` choice. `08-i18n.md` and `06-architecture.md` replace `setRequestLocale` with the root-params pattern, and document `localeCookie: false`, `alternateLinks: false` and the minimal `proxy.ts`.

**Budget and accessibility**

- [ ] Given Lighthouse 12.8.2 mobile on the production build for `/` and `/en/` (no consent cookie), 3 runs each, then the medians meet the rule 8 gates:
  - **LCP < 2.5 s and CLS < 0.1**;
  - accessibility ≥ 95, performance ≥ 90;
  - app JS delta over the 134.3 KiB baseline ≤ 50 KiB, with the switcher's cost noted;
  - SEO is recorded but not gated, since the placeholder is deliberately `noindex`.

  `main` is measured the same way before the change. If `main` already misses the LCP gate (F-02 measured medians of 2.47 s and 2.85 s, driven by 13 preloaded font files), F-03 brings it under the gate by trimming font preloads or weights in `app/[locale]/layout.tsx`, with before/after medians in the PR. That keeps the fonts' `latin` + `vietnamese` subsets and the weights the type styles use.
- [ ] Given the switcher click (`/` → `/en/`) on a throttled mobile profile (CDP: 4× CPU slowdown), then **INP < 200 ms**. It is measured with the `event` PerformanceObserver (`durationThreshold: 16`) or the Web Vitals library, as the max interaction duration over 3 clicks, and recorded with the method.
- [ ] Given axe-core at 360 and 1280 px on `/`, `/en/` and the 404 page, then there are 0 serious/critical issues. A keyboard pass reaches both switcher links with a visible ring.

### Scope

**In scope:**

- `next-intl` install and configuration: routing, request config, navigation.
- The minimal `proxy.ts` (next-intl only).
- The `[locale]` root layout, placeholder page, 404 and catch-all; moving `/dev/tokens/` under `[locale]`.
- `messages/{vi,en}.json` with the `metadata`, `home`, `localeSwitcher` and `notFound` namespaces.
- `pnpm i18n:check` and the `verify` CI workflow.
- The ADR 0006 gate record, plus updates to `08`, `06` and `.claude/rules/module-structure.md` (the `shared/i18n` folder).

**Out of scope:**

- Localized `pathnames` (`/kinh-nghiem` ↔ `/guides` …). They're added by the task that creates each page, so routing never lists routes that don't exist.
- The `[slug]` DB route, translation tables, `generateStaticParams` from published translations, and the "Create EN draft" workflow (F-04, C-06; Q-16).
- The real header/footer, mega-menu and production language switcher with equivalent-entity lookup (S-01). The "View in English?" banner.
- 410 rules, legacy `?page_id` redirects, the attribution cookie and Clerk in `proxy.ts` (F-06, F-05).
- `buildMetadata` / JSON-LD builders in `modules/seo` (S-10). F-03 uses plain `generateMetadata` on the placeholder.
- Money, date and phone formatting helpers (`08` Formatting), which come with the first page that shows them.
- Removing `noindex` (launch).

### Affected Areas

| Repo | Layer | File / Path |
|------|-------|-------------|
| app | config | `package.json` (`next-intl`, `i18n:check`), `pnpm-lock.yaml`, `next.config.ts` |
| app | routing | `proxy.ts` (new, minimal); `app/global-not-found.tsx` (new) + `experimental.globalNotFound` in `next.config.ts` |
| app | shared | `shared/i18n/routing.ts`, `shared/i18n/request.ts`, `shared/i18n/navigation.ts`, `shared/i18n/ui/locale-switcher.tsx` (new) |
| app | app layer | `app/layout.tsx` (deleted) → `app/[locale]/layout.tsx`; `app/page.tsx` → `app/[locale]/page.tsx`; `app/[locale]/not-found.tsx`, `app/[locale]/[...rest]/page.tsx` (new); `app/dev/tokens/**` → `app/[locale]/dev/tokens/**` |
| app | messages | `messages/vi.json`, `messages/en.json` (new) |
| app | scripts | `scripts/check-i18n.ts` (new) |
| app | CI | `.github/workflows/verify.yml` (new) |
| app | docs | `AGENTS.md` (stack + commands lines), `README.md` (scripts) |
| app | lint config | `.dependency-cruiser.cjs` / `biome.json` only if the new folders need entries |
| context | docs | `docs/context/08-i18n.md`, `docs/context/06-architecture.md`, `docs/adr/0006-*.md` (gate row), `.claude/rules/module-structure.md` |
| context | docs | `docs/context/10-roadmap.md` (F-06 row wording: composes around the F-03 proxy) |
| context | lifecycle | `AGENTS.md` §3 i18n and Framework rows, §7 `i18n:check` row (via `/mark-implemented`) |

### Golden-rule checks

- **Rule 1 (facts):** no business facts are added. The placeholder copy is UI chrome ("website under construction"), and the brand name moves to messages.
- **Rule 4 (public pages):** the placeholder stays `noindex` and has one `<h1>`, canonical and hreflang. JSON-LD, breadcrumbs and the Zalo CTA remain out of scope until S-01/S-05/S-10, as in F-00/F-02.
- **Rule 8 (budget):** the switcher may add next-intl client JS. The delta is measured and must stay ≤ 50 KiB. No Clerk, TanStack Query or `motion`.
- **Rule 10 (a11y):** the switcher has 44 px targets, a focus ring, `aria-current`, `lang`/`hrefLang`, and names, not flags.
- **Rule 11 (typography):** the fonts keep the `latin` + `vietnamese` subsets. No `uppercase` on the switcher.
- **Rule 13 (old URLs):** the matcher must not swallow legacy file paths that F-06 will handle. F-03 adds no redirects except next-intl's own prefix normalisation.
- **Rule 14 (privacy):** no cookie is set before consent (`localeCookie: false`), and there is no `Accept-Language` redirect.
- **Rule 15 (secrets):** CI runs without secrets, and no `.env*` is read or committed.

### Dependencies & Risks

- **Depends on:** F-01 (Next 16.4.2, Cache Components on) and F-02 (theme, fonts, `shared/ui`). Both are done.
- **Stack gaps:**
  - This task closes the `i18n` row of `AGENTS.md` §3 and the `pnpm i18n:check` row of §7.
  - It introduces `proxy.ts` with next-intl only, because `as-needed` routing can't work without it. This is the i18n task's own capability, not an opportunistic close (§3).
  - The §3 Framework row becomes "`proxy.ts` (next-intl only) F-03; composition F-06", and the F-06 roadmap row is reworded from creating `proxy.ts` to composing the 410 rules, legacy IDs, attribution and Clerk around the existing next-intl proxy. F-06 is not marked complete.
- **Blocked by questions:** none. Q-16 (MT provider) concerns the translation workflow, which is out of scope.
- **Risks:**
  - **Root layout move:** `app/layout.tsx` disappears, so every route must live under `[locale]`. A route that must stay outside (e.g. a future `/api` or `/go`) needs its own handling. Route handlers don't need layouts, and the matcher already excludes them.
  - **Root-params is new:**
    - If `rootParams.locale()` fails under `cacheComponents` (dynamic-API error, `undefined` locale), apply the ADR 0006 fallback: pass `locale` explicitly from `params`.
    - Record what happened. `setRequestLocale` is the last resort, and only with a recorded reason.
  - **next-intl `Link` under prerendering:** reported to cause prerender errors in some setups. The switcher AC defines the permitted fallback.
  - **`global-not-found` is experimental** in Next 16.4 (`experimental.globalNotFound`). If it misbehaves under `cacheComponents`, record it. The invalid-root-parameter AC may then be met by a matcher or proxy rule that returns the localized 404, with a reason in the PR.
  - **CI cost:** `build` adds a few minutes per PR. Caching the pnpm store keeps it reasonable.

### Manual Verification Plan

**Scenario:** given the production build, when `/`, `/en/`, `/vi/`, `/en`, `/fr/` and `/en/khong-co/` are requested and the switcher is used, then the status, `lang`, text, metadata and absence of cookies match the ACs.

**Seed needs:** none (no DB).

**Steps:**

1. Run `pnpm install --frozen-lockfile`, then `pnpm lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check` and `build`. Record the route table lines for `/[locale]`.
2. Make `i18n:check` fail:
   - delete `home.title` from `en.json` → exit 1, naming `home.title` / `en.json`;
   - add an extra key to `en.json` → exit 1;
   - change an ICU argument name in one locale → exit 1;
   - revert each edit → exit 0.
3. Run `NEXT_PUBLIC_SITE_URL=http://localhost:3100 pnpm build && pnpm start -p 3100` (port checked free first). Then:
   - for each URL in the routing ACs, run `curl -s -o /dev/null -L -w '%{num_redirects} %{url_effective} %{http_code}'` for the chain, and `curl -sI` for the first response's `Set-Cookie` (must be absent) and `Link` (must be absent);
   - `curl -s -H 'Accept-Language: en-US,en;q=0.9' http://localhost:3100/` → 200 VI;
   - for `/` and `/en/`: grep `<html lang=`, `<h1>`, canonical, the three `hreflang` links (absolute, trailing slash, reciprocal) and the robots meta.
4. Browser over CDP, production build:
   - **client navigation:** load `/`, click "English", assert URL `/en/`, `document.documentElement.lang === "en"` and EN text with no full reload (a `window` marker survives); click "Tiếng Việt", assert the same for VI; repeat once with the cache warm;
   - **two isolated contexts** (`/` and `/en/`) loaded alternately three times: each always shows its own locale;
   - **keyboard:** Tab reaches both switcher links with a visible ring; check their hit-area sizes.
5. Run axe-core at 360 and 1280 px on `/`, `/en/` and `/en/khong-co/`: 0 serious/critical.
6. Run Lighthouse 12.8.2 mobile, 3 runs each, on `main` before the change and on `/` and `/en/` after it. Record medians (LCP, CLS, performance, accessibility) and the Script `transferSize` delta over 134.3 KiB. The LCP and CLS gates apply to the medians.
7. Check that `/dev/tokens/` returns 200 under `pnpm dev`, then 404 in production.
8. Measure INP for the switcher (4× CPU throttle, 3 clicks), run the reduced consent matrix (requests, cookies, storage after load, navigation and reload), and request `/missing.txt` → 404 global not-found, VI.
9. CI: the `verify` workflow is green on the PR. Record the failing-run evidence from the CI AC.
10. Fill in ADR 0006's F-03 gate row and update `08`/`06` with the observed results.

**Validation commands:** `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build`. No automated tests (ADR 0004).

### Implementation Hints

- Read the bundled Next docs first (`43logistics.vn/AGENTS.md`: "This is NOT the Next.js you know"): `node_modules/next/dist/docs/` for `root-params`, `proxy`, `not-found` / `global-not-found`, and Cache Components rules on `params`.
- Request config shape (next-intl 4 + root params):

  ```ts
  // shared/i18n/request.ts
  import { hasLocale } from "next-intl";
  import { getRequestConfig } from "next-intl/server";
  import { locale as rootLocale } from "next/root-params"; // getter named after the [locale] segment
  import { routing } from "./routing";

  export default getRequestConfig(async ({ locale }) => {
    const candidate = locale ?? (await rootLocale());
    const resolved = hasLocale(routing.locales, candidate) ? candidate : routing.defaultLocale;
    return { locale: resolved, messages: (await import(`../../messages/${resolved}.json`)).default };
  });
  ```

  The export shape is from `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/next-root-params.md`. Types are generated by `next dev`/`next build`/`next typegen`. `next/root-params` can't be used in Client Components, Server Actions or Route Handlers.
- `generateMetadata` gets the locale from `params` (async) and passes it explicitly: `getTranslations({ locale, namespace: "metadata" })`.
- Only add `NextIntlClientProvider` to the layout if a client component needs messages. The server-rendered switcher shouldn't need it, and adding it can ship the whole message file to the client: measure.
- `check-i18n.ts` is a pure function plus a thin CLI. Keep the diff logic (flatten keys, extract ICU argument names) pure and typed so it can be tested later (ADR 0004). It reads files from `messages/` with `node:fs`.
- `verify.yml`:
  - `pnpm/action-setup` + `actions/setup-node` with `node-version: 22` and `cache: pnpm`;
  - `permissions: contents: read`;
  - one job running the scripts in sequence, so the first failure is obvious.
- Lessons from F-02:
  - generators and installers can add stray dependencies; review the `package.json` diff;
  - Lighthouse needs the arm64 Node, and its LCP is noisy, so use medians;
  - kill stale `next-server` processes before measuring.

### Related

- Roadmap: `docs/context/10-roadmap.md` F-03 (next: F-04 Database, F-06 `proxy.ts` composition).
- Context: `docs/context/08-i18n.md`, `06-architecture.md` (i18n with Cache Components, `proxy.ts` composition), `05-seo-and-tracking.md` (hreflang and canonical).
- ADRs: 0006 (Cache Components gate, JS budget), 0005 (module layout: `shared/i18n`), 0004 (no test suites; manual verification), 0002 (stack).
- Specs: `feature-f01-upgrade-and-harness.md`, `feature-f02-tokens-and-theme.md` (fonts, placeholder, `/dev/tokens`).
- External: next-intl routing setup and configuration docs (`next-intl.dev/docs/routing/setup`, `/routing/configuration`, `/usage/configuration`). Their recommendation of `next/root-params` over `setRequestLocale` drove the owner decision.
