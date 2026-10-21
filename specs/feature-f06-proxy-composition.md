---
title: Compose proxy.ts for gone, legacy, attribution and admin
type: feature
status: draft
owner_repo: both
roadmap: F-06
priority: must-have
blocked_by_questions: [Q-13]
updated: 2026-10-21
---

## Feature: Compose proxy.ts for gone, legacy, attribution and admin

### Problem Statement

F-03 created `proxy.ts` with only the next-intl middleware. Four request-level behaviours still have to happen before a page renders (`05` "Redirects & legacy URLs" / "Tracking plan", `06` "`proxy.ts` composition"):

- **Retired WordPress URLs** (`/tieu-de/`, `/portfolio/*`, `/wp-admin/*`, `/wp-login.php`, `/xmlrpc.php`, `/wp-json/*`) must answer **410**. Today they 404, which keeps them in Google's crawl queue and exposes a WordPress fingerprint.
- **Old query links** `/?page_id={id}` and `/?p={id}`, used in shares, bookmarks and old ads, must 301 in one hop to the new page (rule 13).
- **Ad click IDs and UTM parameters** must be kept in the first-party cookie `43l_attr` (90 days), but **only when ads consent is already granted** (rule 14; `05`: `43l_attr` is not functional).
- **`/admin`** must never be reachable unprotected. Clerk arrives in F-05.

Also, F-03 left one known defect: Next's trailing-slash redirect runs **before** the proxy, so `/vi` takes two hops (`/vi` → `/vi/` → `/`). The same will hit slash-less legacy URLs in F-07.

Roadmap row `docs/context/10-roadmap.md` F-06. *Accept:*
- matchers are pure functions;
- `/tieu-de/` → 410;
- `/?page_id=705` → 301 `/gui-hang-di-singapore/`;
- `?utm_source=x` sets `43l_attr` only when the ads-consent cookie is granted, and sets nothing without it.

The roadmap's "pure functions in `lib/`" predates ADR 0005: here the pure functions live in module `domain/` layers.

Owner decisions (2026-10-21):
1. A WordPress ID that isn't in the map → **301 to `/`**, with `page_id`/`p` removed.
2. `/admin` → **404 until F-05**, which then swaps the branch for Clerk's `auth.protect()`.

### Proposed Solution

A visitor following an old link lands on the new page in one redirect, and a crawler hitting a retired WordPress path gets "410 Gone". A visitor arriving from an ad keeps their attribution only if they already accepted ads cookies; otherwise nothing is stored. Staff URLs under `/admin` don't exist until real authentication is in place. Every public URL normalises to its trailing-slash form in at most one hop, even when combined with a locale or legacy redirect.

### Acceptance Criteria

**Composition and order** (`proxy.ts`, Node runtime)

- [ ] Given a request, then `proxy.ts` applies, in this order, and stops at the first that answers:
  1. **410** for gone paths;
  2. **legacy ID redirect** on `/` with `page_id` or `p`;
  3. **admin deny** (404) for `/admin(/…)` and `/api/admin(/…)`;
  4. **pass-through** for `/api/*`, `/go/*`, `/_next/*`, `/_vercel/*` and files with an extension other than the legacy WordPress ones;
  5. **trailing-slash and locale normalisation** in one hop;
  6. the **next-intl middleware**, with **attribution capture** applied to its response.

  `proxy.ts` itself holds no matching logic: it calls pure functions and builds `NextResponse`s.
- [ ] Given the matcher config, then it includes the explicit legacy file paths (`/wp-login.php`, `/xmlrpc.php`, `/wp-admin/:path*`, `/wp-json/:path*`, `/wp-content/:path*` excluded from 410, see below), because the dot-exclusion would otherwise skip `.php` paths (`06` note). Static assets and `/_next` stay excluded.

**Gone paths (410)**

- [ ] Given `GET` or `HEAD` on `/tieu-de/` or `/tieu-de`, `/portfolio/portfolio-1/` (any `/portfolio/*`), `/wp-admin/`, `/wp-admin/options.php`, `/wp-login.php`, `/xmlrpc.php`, `/wp-json/wp/v2/users`, then the response is **410** with an empty body and `cache-control: public, max-age=3600`, and sets no cookie.
- [ ] Given `/wp-content/uploads/2023/12/a.webp`, then it is **not** 410: F-07 rewrites those paths to Storage. In F-06 it falls through unchanged (404 today).
- [ ] Given the 410 list, then it lives in one pure module (`modules/seo/domain/gone-paths.ts`) as patterns derived from `05` and the CSV's 8 `410` rows. `isGonePath(pathname)` is a pure function.

**Legacy WordPress IDs (301)**

- [ ] Given `data/legacy-wp-ids.json`, then it maps every known ID to its new VI path, sourced from `09-migration.md`, `routes.legacy.json` `legacy.wpId` and `redirect-map.csv`:

  | ID | New path |
  | --- | --- |
  | 580 | `/` |
  | 705 | `/gui-hang-di-singapore/` |
  | 834 | `/gui-hang-di-malaysia/` |
  | 836 | `/gui-hang-di-han-quoc/` |
  | 837 | `/gui-hang-di-dai-loan/` |
  | 3596 | `/gui-hang-di-nhat-ban/` |
  | 851 | `/gui-hang-di-thai-lan/` |
  | 838 | `/gui-hang-di-my/` |
  | 866 | `/gui-hang-tu-singapore-ve-viet-nam/` |
  | 867, 868 | `/nhap-hang/` (CSV rows 16–17) |
  | 666 | `/dich-vu/` |
  | 857, 858 | `/nhap-hang/` |
  | 651 | `/gioi-thieu/` |
  | 674 | `/lien-he/` |
  | 3587, 694 | `/kinh-nghiem/top-5-luu-y-gui-hang-sang-singapore/` |
  | 3570 | `/kinh-nghiem/mon-hang-khong-duoc-gui-sang-han-quoc/` |

  It's validated with Zod at load: integer string keys, absolute paths with a trailing slash.
- [ ] Given `/?page_id=705`, then the response is **301** with `Location: /gui-hang-di-singapore/` in **one hop**. `/?p=3570` gives the same treatment.
  - Other query parameters are preserved (`/?page_id=705&utm_source=x` → `/gui-hang-di-singapore/?utm_source=x`); `page_id` and `p` are removed.
  - `/index.php?page_id=705` gets the same treatment.
- [ ] Given `/?page_id=12345` (unknown) or a non-numeric ID, then **301 to `/`** with `page_id`/`p` removed and other params kept (owner decision 1).
- [ ] Given `/en/?page_id=705`, then it isn't a legacy URL (WordPress had no `/en/`), so it passes to next-intl unchanged. Given `/?page_id=` combined with `/vi`, the result is still one hop.
- [ ] Given `resolveLegacyRedirect(url)`, then it's a pure function in `modules/seo/domain/legacy-ids.ts` returning `{ location } | null`, with the ID map injected as an argument.

**Admin deny (until F-05)**

- [ ] Given `/admin`, `/admin/`, `/admin/leads/` or `/api/admin/x`, then the response is **404** (an empty-body `NextResponse`, not the localized page) with `x-robots-tag: noindex`. A one-line comment names F-05 as the task that replaces it with `auth.protect()`. `isAdminPath()` is pure and shared, so F-05 reuses it.

**Trailing slash and locale in one hop**

- [ ] Given `next.config.ts`, then it sets `skipTrailingSlashRedirect: true` (bundled Next docs) and keeps `trailingSlash: true`, so `proxy.ts` owns normalisation. Given these requests, then each reaches its final URL in **≤ 1 redirect** (status 308 for slash-only fixes, 301 when a prefix or legacy rule also applies):
  - `/vi` → `/`, `/vi/` → `/`;
  - `/vi/abc` → `/abc/`;
  - `/en` → `/en/`;
  - `/gioi-thieu` → `/gioi-thieu/`;
  - `/en/about` → `/en/about/`;
  - `/khong-co` → `/khong-co/` (then 404).

  Query strings are preserved. Paths with a file extension, `/api/*` and `/go/*` are never slash-redirected. `/` and `/en/` answer 200 with no redirect.
- [ ] Given client navigation between `/` and `/en/` (the F-03 switcher), then it still works without a full reload, and the RSC requests (`?_rsc=`) aren't redirected. This is checked over CDP as in F-03.
- [ ] Given `normalizePath(pathname)`, then it's a pure function in `shared/i18n/normalize-path.ts` (locale + slash, no business meaning), returning the canonical path or `null` when already canonical.

**Attribution (`43l_attr`, consent-gated)**

- [ ] Given the ads-consent contract, then `modules/tracking/domain/consent.ts` defines it and **S-13's banner must write it**. Cookie `43l_consent`, value `v1.<ads 0|1>.<analytics 0|1>.<unix seconds>` (e.g. `v1.1.0.1792000000`). `parseConsent(value)` returns `{ ads, analytics, at } | null`, and anything malformed or of another version → `null` (treated as **not granted**). `05` and `07` (`consent_at` source) are updated to name this cookie.
- [ ] Given a page request with any of `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid`, `gbraid`, `wbraid`, `fbclid` or `ttclid`, **and** `43l_consent` with `ads = 1`, then the response sets `43l_attr`:
  - `Path=/`, `Max-Age=7776000` (90 days), `SameSite=Lax`, `Secure` in production, **not** `HttpOnly` (S-02's `/go` handler and the lead action read it server-side; the client never needs it, but `HttpOnly` would also be acceptable; recorded).
  - The value is base64url JSON with only those keys, plus `landing_path`, `referrer` (same-origin or host only; the full referrer is never stored) and `first_seen_at` (ISO).
  - Each value is truncated to 200 chars, and the encoded cookie stays ≤ 3 KB.
- [ ] Given the same request **without** `43l_consent`, with `ads = 0`, or with a malformed value, then **no `Set-Cookie`** at all, and the response is otherwise identical (no redirect, no param stripping).
- [ ] Given an existing `43l_attr` and a new landing with params (consent granted), then the cookie is **replaced** (last-touch), `first_seen_at` is kept from the old cookie when it's still valid, and a request without attribution params doesn't touch the cookie.
- [ ] Given attribution, then `extractAttribution(url, referrer, now)`, `mergeAttribution(previous, next)` and `encode`/`decode` are pure functions in `modules/tracking/domain/attribution.ts`, and `proxy.ts` only reads the cookies and sets the result.
- [ ] Given the redirect responses (410, legacy 301, slash 308), then they never set `43l_attr`. The legacy and slash redirects preserve the query string, so the attribution params survive to the final URL, where the cookie is set (if consented).

**Boundaries**

- [ ] Given `proxy.ts`, then it imports only `@/modules/seo/client`, `@/modules/tracking/client`, `@/shared/i18n/*`, `next/server` and `next-intl/middleware`. No `server-only` modules and no DB. `pnpm check:boundaries` passes. The domain files import no framework code.

### Scope

**In scope:**
- The `proxy.ts` composition and matcher config.
- `skipTrailingSlashRedirect` plus proxy normalisation.
- The 410 rules, the legacy ID map (`data/legacy-wp-ids.json`) and its resolver.
- The admin deny.
- The `43l_consent` contract parser.
- `43l_attr` extraction, merge, encoding and setting.
- `client.ts` entries for `seo` and `tracking`.
- Doc updates in `05`, `06`, `07` and the F-07 roadmap note.

**Out of scope:**
- The CSV `redirects()` and `check:redirects` (F-07). F-06 adds only the query-ID and 410 rules the CSV marks as `proxy.ts` work.
- `/wp-content/uploads/*` rewrites (F-07).
- The consent banner, Zustand store, GTM and PostHog (S-13).
- Reading `43l_attr` in `/go` and leads (S-02, S-08).
- Clerk (F-05).
- The `redirects` DB table at runtime (later, cached).
- `http://`/`www.` normalisation (host/CDN, L-02).

### Affected Areas

| Repo | Layer | File / Path |
|------|-------|-------------|
| app | routing | `proxy.ts`, `next.config.ts` (`skipTrailingSlashRedirect`) |
| app | module domain | `modules/seo/domain/gone-paths.ts`, `modules/seo/domain/legacy-ids.ts`, `modules/tracking/domain/consent.ts`, `modules/tracking/domain/attribution.ts` (new) |
| app | module entry | `modules/seo/client.ts`, `modules/tracking/client.ts` (new, client-safe pure exports) |
| app | module constants | `modules/tracking/constants.ts` (cookie names, max-age, param list) |
| app | shared | `shared/i18n/normalize-path.ts` (new); `shared/i18n/routing.ts` (unchanged unless needed) |
| app | data | `data/legacy-wp-ids.json` (new) |
| app | docs | `AGENTS.md`, `README.md` (proxy order) |
| context | docs | `docs/context/05-seo-and-tracking.md` (consent cookie contract, `43l_attr` format), `06-architecture.md` (actual composition), `07-data-model.md` (`consent_at` source), `10-roadmap.md` (F-07 note: slash handled by proxy) |

### Golden-rule checks

- **Rule 13 (old URLs):** 410 and legacy IDs in one hop; trailing slash plus locale in ≤ 1 hop.
- **Rule 14 (consent/PII):**
  - `43l_attr` is set only with `ads = 1` in `43l_consent`, and a malformed cookie counts as not granted;
  - no cookie on redirects or 410s;
  - the referrer is reduced to its host;
  - no IP is touched.
- **Rule 7 (authorization):** `/admin` is unreachable until Clerk protection exists (deny-by-default).
- **Rule 8 (budget):** server-only logic with no client JS change. Check that the route JS delta stays unchanged.
- **Rule 15 (secrets):** none involved.

### Dependencies & Risks

- **Depends on:** F-03 (the next-intl proxy and `/vi` deviation) and F-04 (merged; no DB use here). F-05 later replaces the admin branch.
- **Blocked by questions:** **Q-13** (which ad platforms): the click-ID list follows `05` (Google, Meta, TikTok); unused IDs are simply stored. No placeholder is needed.
- **Risks:**
  - **`skipTrailingSlashRedirect` affects client navigation** (bundled docs). Every internal link already ends with `/`; verify the F-03 switcher and RSC prefetches aren't redirected.
  - **F-07 interplay:** config `redirects()` run **before** the proxy, so a slash-less legacy URL such as `/dich-vu/gui-hang-di-singapore` must match a CSV rule that accepts both forms, or F-07 must generate both. F-06 records this in the F-07 roadmap row; it isn't solved here.
  - **next-intl after the proxy's own redirect:** the normalised URL must be the one next-intl would accept, otherwise next-intl adds a second hop (e.g. its own `/vi/` → `/`). Covered by the hop-count ACs.
  - **Cookie size and injection:** values are truncated and base64url-encoded, never reflected into HTML.

### Manual Verification Plan

**Scenario:** given `pnpm build && pnpm start -p 3100`, when each URL below is requested, then status, `Location`, hop count and `Set-Cookie` match the ACs.

**Seed needs:** none (no DB).

**Steps:**

1. Run `pnpm lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check` and `build`.
2. **Pure-function table:** a throwaway `tsx` script (not committed, ADR 0004) prints the input → output for `isGonePath`, `resolveLegacyRedirect`, `normalizePath`, `parseConsent` and `extract`/`merge`/`encode`/`decode` attribution over every case in these ACs. Record it in the PR.
3. **HTTP matrix:** for each URL in the ACs (410 list, `wp-content`, legacy IDs including unknown and non-numeric ones, `/index.php?page_id`, `/en/?page_id`, the admin paths, the slash/locale list), run `curl -s -o /dev/null -L -w '%{num_redirects} %{url_effective} %{http_code}'` and `curl -sI`. Record the hops, final URL, status, first `Location`, `cache-control`, `x-robots-tag` and `Set-Cookie`.
4. **Attribution matrix** on `/?utm_source=x&gclid=abc`:
   - no cookie → no `Set-Cookie`;
   - `43l_consent=v1.0.1.1792000000` → none;
   - `43l_consent=garbage` → none;
   - `43l_consent=v1.1.0.1792000000` → `43l_attr` set: decode it and check the keys, `Max-Age`, `SameSite` and the referrer host only;
   - repeat with an older `43l_attr` → `first_seen_at` kept, params replaced;
   - a plain `/` with consent and no params → no `Set-Cookie`;
   - `/?page_id=705&utm_source=x` with consent → 301 without the cookie, then the final URL sets it.
5. **Browser (CDP), production build:**
   - client navigation VI → EN → VI with the switcher: no full reload (window marker), no redirected `_rsc` requests in the network log;
   - the F-03 reduced consent matrix (no consent cookie): 0 cookies and 0 storage after load, navigation and reload.
6. Lighthouse on `/` once: Script `transferSize` unchanged from F-03 (148.2 KiB ± 0.5).

**Validation commands:** `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build`. Consent matrix: the reduced version above, because the change touches `proxy.ts` and consent; accept and withdraw stay n/a until S-13. No automated tests (ADR 0004).

### Implementation Hints

- Read the bundled Next docs: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`, `05-config/01-next-config-js/skipTrailingSlashRedirect.md` and the matcher syntax.
- Compose with next-intl: `const intl = createMiddleware(routing)`. The custom branches return early, and the last branch is `const res = intl(req); return withAttribution(req, res)`.
- `client.ts` entries must not import `server-only`. Proxy code runs in the Node runtime, but not as a React Server Component, so a `server-only` import throws there.
- Cookie reading: `req.cookies.get('43l_consent')?.value`. Setting: `res.cookies.set(name, value, options)`. The `Secure` flag follows `process.env.NODE_ENV === 'production'`.
- Lessons from F-03:
  - next-intl's `as-needed` mode emits `/vi/…` for explicit-locale links, so keep links unprefixed;
  - zsh: never name a shell variable `path`;
  - verify hop counts with `curl -L -w '%{num_redirects}'`, not with the first response.

### Related

- Roadmap: `docs/context/10-roadmap.md` F-06 (F-05 replaces the admin branch; F-07 builds the CSV redirects on top; S-13 writes `43l_consent`).
- Context:
  - `05-seo-and-tracking.md` (Redirects & legacy URLs, Tracking plan, Consent);
  - `06-architecture.md` (`proxy.ts` composition);
  - `09-migration.md` (WP ID mapping);
  - `43logistics.vn/data/redirect-map.csv` (rows 21, 45–49, 60, 62–63).
- ADRs: 0005 (module layers, entry points), 0004 (manual verification), 0006 (budget).
- Specs: `feature-f03-i18n-routing.md` (`/vi` two-hop deviation, switcher), `feature-f04-database-schema-seed.md` (`contact_events`/`leads` attribution columns).
