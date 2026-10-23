---
title: Compose proxy.ts for gone, legacy, attribution and admin
type: feature
status: implemented
branch: feat/f-06-proxy-composition
implementation_pr: https://github.com/Dienvm/43logistics.vn/pull/7
implementation_commit: 297f784511bf927058de22fad29d6a8fe09ee168
implemented_date: 2026-10-21
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

A visitor following an old link lands on the new page in one redirect, and a crawler hitting a retired WordPress path gets "410 Gone". A visitor arriving from an ad keeps their attribution only if they already accepted ads cookies; otherwise nothing is stored. Staff URLs under `/admin` don't exist until real authentication is in place. Every public URL normalises to its canonical form (lowercase locale prefix, trailing slash) in at most one hop, even when combined with a legacy redirect.

### Acceptance Criteria

**Composition and order** (`proxy.ts`, Node runtime)

- [ ] Given a request, then `proxy.ts` decides with **one** pure planner call (`planRequest(input) → Plan`) and then acts. In precedence order:
  1. **410** for gone paths;
  2. **admin deny** (404) for `/admin…` and `/api/admin…`;
  3. **pass-through** for `/api/*`, `/go/*` and files with an extension (other than the legacy `.php` paths in step 1 and `/index.php` in step 4);
  4. **one redirect** combining legacy-ID resolution, locale-prefix canonicalisation and the trailing slash, computed together so the result is the final URL;
  5. the **next-intl middleware**, with **attribution capture** only when its response isn't a redirect.

  `proxy.ts` holds no matching logic: it calls the planner and builds `NextResponse`s.
- [ ] Given the matcher config, then it covers every path the branches need, and excludes only `/_next/*`, `/_vercel/*` and static files by path segment:
  - include `/wp-login.php`, `/xmlrpc.php`, `/index.php`, `/wp-admin/:path*`, `/wp-json/:path*`, `/portfolio/:path*`, `/admin/:path*` and `/api/admin/:path*`, dotted or not;
  - a separate check (the matcher test in the plan) confirms `/admin/file.csv`, `/api/admin/x`, `/portfolio/a.b/` and `/index.php` reach the proxy, while `/_next/static/x.js` and `/favicon.ico` don't.

**Gone paths (410)**

- [ ] Given `GET` or `HEAD` on any of these, then the response is **410** with an empty body and `cache-control: public, max-age=3600`, and sets no cookie:
  - `/tieu-de/`, `/tieu-de`;
  - any `/portfolio/*`, including `/portfolio/portfolio-1/`;
  - `/wp-admin/`, `/wp-admin/options.php`;
  - `/wp-login.php`, `/xmlrpc.php`;
  - `/wp-json/wp/v2/users`.
- [ ] Given `/wp-content/uploads/2023/12/a.webp`, then it is **not** 410: F-07 rewrites those paths to Storage. In F-06 it falls through unchanged (404 today).
- [ ] Given the 410 list, then it lives in one pure module (`modules/seo/domain/gone-paths.ts`) as patterns derived from `05` and the CSV's 8 `410` rows. `isGonePath(pathname)` is pure and case-insensitive.

**Legacy WordPress IDs (301)**

- [ ] Given `data/legacy-wp-ids.json`, then it maps every WordPress ID that `09-migration.md` lists, to its new VI path or to `gone` (410), with each row traceable:

  | ID | Legacy URL | New path | Source |
  | --- | --- | --- | --- |
  | 580 | `/` | `/` | `09`; legacy-copy `home.md` |
  | 705 | `/dich-vu/gui-hang-di-singapore/` | `/gui-hang-di-singapore/` | `routes.legacy.json` `sg.legacy`; CSV row 5 |
  | 834 | `/dich-vu/gui-hang-di-malaysia/` | `/gui-hang-di-malaysia/` | `routes.legacy.json` `my` |
  | 836 | `/dich-vu/gui-hang-di-han-quoc/` | `/gui-hang-di-han-quoc/` | `routes.legacy.json` `kr` |
  | 837 | `/dich-vu/gui-hang-di-dai-loan/` | `/gui-hang-di-dai-loan/` | `routes.legacy.json` `tw` |
  | 3596 | `/gui-hang-di-nhat-ban-2-chieu/` | `/gui-hang-di-nhat-ban/` | `routes.legacy.json` `jp`; CSV row 9 |
  | 851 | `/gui-hang-di-thai-lan/` | `/gui-hang-di-thai-lan/` | `routes.legacy.json` `th` |
  | 838 | `/gui-hang-di-my/` | `/gui-hang-di-my/` | `routes.legacy.json` `us` |
  | 866 | `/van-chuyen-hang-singapore/` | `/gui-hang-tu-singapore-ve-viet-nam/` | `routes.legacy.json` `sg-vn`; CSV row 15 |
  | 867 | `/van-chuyen-hang-malaysia/` | `/nhap-hang/` | `routes.legacy.json` `my-vn`; CSV row 16 |
  | 868 | `/van-chuyen-hang-thai-lan/` | `/nhap-hang/` | `routes.legacy.json` `th-vn`; CSV row 17 |
  | 666 | `/dich-vu/` | `/dich-vu/` | `09`; CSV row 4 |
  | 857, 858 | `/nhap-hang/` | `/nhap-hang/` | `09`; CSV row 14 |
  | 651 | `/gioi-thieu/` | `/gioi-thieu/` | `09`; CSV row 18 |
  | 674 | `/lien-he/` | `/lien-he/` | `09`; CSV row 19 |
  | 832 | `/tieu-de/` | **gone (410)** | dump `post_name` (2026-10-21); CSV row 21 |
  | 855 | `/tu-van-kinh-nghiem/` | `/kinh-nghiem/` | dump `post_name` (2026-10-21); CSV row 20 |
  | 3587 | `/top-5-luu-y-gui-hang-sang-singapore/` | `/kinh-nghiem/top-5-luu-y-gui-hang-sang-singapore/` | legacy-copy header; CSV row 22 |
  | 3570 | `/mon-hang-khong-duoc-gui-sang-han-quoc/` | `/kinh-nghiem/mon-hang-khong-duoc-gui-sang-han-quoc/` | legacy-copy header; CSV row 23 |
  | 694 | `/van-chuyen-hang-di-singapore-phuong-thuc-va-loi-ich/` | `/kinh-nghiem/top-5-luu-y-gui-hang-sang-singapore/` | legacy-copy header; CSV row 24 |

  The file is validated with Zod at load: integer string keys, and values that are either an absolute path with a trailing slash or `"gone"`.
- [ ] Given a legacy request on `/`, `/index.php`, `/vi`, `/vi/` or `/VI/` with a `page_id` or `p` parameter, then the ID is resolved as follows:
  - **ID precedence:** the first `page_id` value; if none, the first `p` value.
  - **Mapped ID:** a **single 301** to its new path. All `page_id` and `p` params are removed; other params are kept in order. Example: `/?page_id=705&utm_source=x` → `/gui-hang-di-singapore/?utm_source=x`, and `/vi?page_id=705` → `/gui-hang-di-singapore/` in one hop.
  - **ID mapped to `gone`:** **410**.
  - **Unknown, empty or non-numeric ID:** a **single 301 to `/`** with `page_id`/`p` removed and other params kept (owner decision 1). Examples: `/?page_id=`, `/vi/?page_id=abc`, `/?p=12345`.
- [ ] Given `/en/?page_id=705`, then it is not a legacy URL (WordPress had no `/en/`), so the param is ignored and the page renders normally.
- [ ] Given the resolver, then `resolveLegacyId(params, map) → { location } | { gone: true } | null` is pure, in `modules/seo/domain/legacy-ids.ts`, with the map injected as an argument.

**Admin deny (until F-05)**

- [ ] Given `/admin`, `/admin/`, `/ADMIN/`, `/admin/leads/`, `/admin/export.csv`, `/api/admin/x` or `/en/admin/`, then the response is **404** (an empty-body `NextResponse`, not the localized page) with `x-robots-tag: noindex`, on GET and HEAD.
  - `isAdminPath(pathname)` is pure and case-insensitive, in `shared/lib/admin-path.ts`, so F-05 reuses it with Clerk.
  - A comment names F-05 as the task that replaces this branch with `auth.protect()`.

**Locale prefix and trailing slash in one hop**

- [ ] Given `next.config.ts`, then it sets `skipTrailingSlashRedirect: true` (bundled Next docs) and keeps `trailingSlash: true`, so `proxy.ts` owns normalisation.
- [ ] Given these requests, then each reaches its final URL in **≤ 1 redirect**, with the status, `Location` and final status recorded for each:
  - `/vi`, `/vi/`, `/VI`, `/Vi/` → `/`;
  - `/vi/abc` → `/abc/` (final 404);
  - `/en` → `/en/`, `/EN` → `/en/`, `/En/about` → `/en/about/`;
  - `/gioi-thieu` → `/gioi-thieu/`;
  - `/en/about` → `/en/about/`;
  - `/khong-co` → `/khong-co/` (final 404);
  - `/%65n/` (encoded `en`) is treated as `/en/`, matching what next-intl decodes.

  Slash-only fixes return **308**; anything involving a prefix or legacy change returns **301**. Query strings are preserved. Paths with a file extension, `/api/*` and `/go/*` are never slash-redirected. `/` and `/en/` answer 200 with no redirect.
- [ ] Given `normalizePath(pathname)`, then it's a pure function in `shared/i18n/normalize-path.ts` (locale prefixes compared case-insensitively against `routing.locales`, like next-intl's matcher). It returns the canonical path, or `null` when the path is already canonical.
- [ ] Given client navigation between `/` and `/en/` (the F-03 switcher) and prefetches, then:
  - the switcher still navigates without a full reload (`window` marker);
  - no `_rsc` request is redirected (checked in a **real browser** network log, because Next strips internal Flight headers from the proxy request, so no header-based bypass is relied on).

**Consent cookie contract (written by S-13, read here)**

- [ ] Given `modules/tracking/domain/consent.ts`, then it defines `43l_consent`:
  - **value:** `v1.<ads>.<analytics>.<at>`, where `ads`/`analytics` are `0` or `1` and `at` is integer unix seconds, ≥ 1767225600 (2026-01-01, when Law 91/2025 took effect) and ≤ now + 300 s;
  - **attributes S-13 must use:** `Path=/`, host-only (no `Domain`), `SameSite=Lax`, `Secure` in production, `Max-Age=15552000` (180 days), not HttpOnly (the banner script writes it).
- [ ] Given `parseConsent(raw, nowSeconds)`, then it returns `{ ads, analytics, at }` or `null`. It **never throws**: a wrong version, field count, digit, timestamp or extra characters all give `null`, which means **not granted**. `05` and `07` (the `consent_at` source) are updated to name this cookie and its attributes.

**Attribution (`43l_attr`, consent-gated)**

- [ ] Given a page request that next-intl serves without redirecting, carrying any of `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid`, `gbraid`, `wbraid`, `fbclid` or `ttclid`, **and** a `43l_consent` that parses with `ads = 1`, then the response sets `43l_attr`:
  - **attributes:** `Path=/`, `HttpOnly`, `SameSite=Lax`, `Secure` in production, `Max-Age=7776000` (90 days);
  - **value:** base64url JSON, validated by a Zod schema in `modules/tracking/application/attribution-schema.ts`, holding only those keys plus:
    - `landing_path`: the pathname only, no query or fragment;
    - `referrer_host`: the parsed HTTP(S) hostname only, from internal or external referrers. Credentials, port, path, query and fragment are dropped; a missing, malformed or non-HTTP(S) referrer is omitted;
    - `first_seen_at`: ISO time.
  - **size:** every value is cut to ≤ 150 UTF-8 bytes on a character boundary. If the encoded cookie still exceeds **3,072 bytes**, no cookie is set (fail-closed) and this is logged without values.
- [ ] Given the same request without `43l_consent`, with `ads = 0`, or with any value `parseConsent` rejects, then **no `Set-Cookie`**, and the response is otherwise identical (no redirect, no param stripping).
- [ ] Given an existing `43l_attr` that decodes and validates, and a new landing with attribution params (consent granted), then the cookie is replaced (last-touch) while keeping the old `first_seen_at`. If the old cookie is malformed (bad base64, JSON, schema or size), it's ignored, never throws, and a fresh cookie is written. A request without attribution params doesn't touch the cookie.
- [ ] Given the attribution functions, then they are pure domain functions in `modules/tracking/domain/attribution.ts`:
  - `extractAttribution(url, referrer, now)`;
  - `mergeAttribution(previous, next)`;
  - `fitToBudget(value)`.

  Encoding and decoding with Zod validation live in the application layer. `proxy.ts` only reads the cookies and sets the result.
- [ ] Given any redirect or 410 response (legacy 301, normalisation 301/308, a next-intl redirect, 410, admin 404), then it **never** sets `43l_attr`. Redirects preserve non-legacy query params, so attribution survives to the final URL, where the cookie is set if consent is granted.

**Boundaries**

- [ ] Given `proxy.ts`, then it imports only these:
  - `@/modules/seo/client` and `@/modules/tracking/client` (pure domain plus client-safe Zod schemas, with no `server-only`);
  - `@/shared/i18n/*` and `@/shared/lib/admin-path`;
  - `next/server` and `next-intl/middleware`.

  It never imports a DB, env or `index.ts` module.
- [ ] Given `check:boundaries`, then its inputs now include `proxy.ts`, and a rule forbids `proxy.ts` from importing `modules/*/index.ts`, `modules/*/infrastructure/*` and `db/`. The command passes. The domain files import no framework code, Zod included.

### Scope

**In scope:**
- The `proxy.ts` composition and matcher config, `planRequest`, and `skipTrailingSlashRedirect` plus normalisation.
- The 410 rules, the legacy ID map (`data/legacy-wp-ids.json`) and its resolver.
- The admin deny helper.
- The `43l_consent` contract and parser.
- `43l_attr` extraction, merge, budget, encoding and setting.
- `client.ts` entries for `seo` and `tracking`, and the depcruise update.
- Doc updates: `05`, `06`, `07`, the F-07 roadmap note, and the root `AGENTS.md` §3 Framework row (via `/mark-implemented`).

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
| app | planner | `shared/i18n/normalize-path.ts`, `shared/lib/admin-path.ts` (new); planner in `modules/seo/application/request-plan.ts` (new; composes gone, legacy, admin and normalise) |
| app | module domain | `modules/seo/domain/gone-paths.ts`, `modules/seo/domain/legacy-ids.ts`, `modules/tracking/domain/consent.ts`, `modules/tracking/domain/attribution.ts` (new) |
| app | module application | `modules/seo/application/legacy-ids-schema.ts`, `modules/tracking/application/attribution-schema.ts` (Zod, client-safe; new) |
| app | module entry | `modules/seo/client.ts`, `modules/tracking/client.ts`; `modules/tracking/constants.ts` (cookie names, max-ages, param list, byte budget) |
| app | data | `data/legacy-wp-ids.json` (new) |
| app | config | `.dependency-cruiser.cjs` and `package.json` `check:boundaries` (include `proxy.ts`) |
| app | docs | `AGENTS.md`, `README.md` (proxy order) |
| context | docs | `docs/context/05-seo-and-tracking.md` (consent cookie contract, `43l_attr` format), `06-architecture.md` (actual composition), `07-data-model.md` (`consent_at` source), `10-roadmap.md` (F-07 note: config redirects run before the proxy) |
| context | lifecycle | `AGENTS.md` §3 Framework row (`proxy.ts` composed), via `/mark-implemented` |

### Golden-rule checks

- **Rule 13 (old URLs):** 410 and legacy IDs in one hop; locale plus slash plus legacy in ≤ 1 hop.
- **Rule 14 (consent/PII):**
  - `43l_attr` is set only with `ads = 1` in a strictly parsed `43l_consent`;
  - it's HttpOnly;
  - the referrer is reduced to its hostname, and `landing_path` to the pathname;
  - the size is bounded;
  - no cookie on any redirect or 410;
  - no IP is touched.
- **Rule 7 (authorization):** `/admin` and `/api/admin` are unreachable until Clerk protection exists (deny-by-default).
- **Rule 8 (budget):** server-side only, with no client JS change. The ADR 0006 gates are re-measured.
- **Security patterns:** external inputs (cookies, the ID map) are Zod-validated at the boundary (the application layer), and parsing never throws on hostile input.

### Dependencies & Risks

- **Depends on:**
  - F-03 (the next-intl proxy and `/vi` deviation);
  - F-04 (**code merged, Supabase cloud verification pending**; F-06 uses no DB).
  - F-05 later replaces the admin branch.
- **Blocked by questions:** **Q-13** (which ad platforms): the click-ID list follows `05` (Google, Meta, TikTok); unused IDs are simply stored. No placeholder is needed.
- **Risks:**
  - **`skipTrailingSlashRedirect` affects client navigation** (bundled docs). Every internal link already ends with `/`; verify in a real browser.
  - **F-07 interplay:** config `redirects()` run **before** the proxy, so a slash-less legacy URL must match a CSV rule that accepts both forms, or F-07 must generate both. Recorded in the F-07 roadmap row.
  - **next-intl redirect after ours:** the planner's output must be what next-intl accepts, otherwise next-intl adds a hop. Covered by the hop-count ACs and the case-insensitive prefix handling.
  - **Cookie hardening:** truncation, the byte budget and base64url encoding; never reflected into HTML.

### Manual Verification Plan

**Scenario:** given `pnpm build && pnpm start -p 3100`, when each URL below is requested, then status, `Location`, hop count, final status and headers match the ACs.

**Seed needs:** none (no DB).

**Steps:**

1. Run `pnpm lint`, `typecheck`, `check:boundaries` (now including `proxy.ts`), `tokens:check`, `i18n:check` and `build`.
2. **Pure-function table:** a throwaway `tsx` script (not committed, ADR 0004) prints input → output for every AC case:
   - `isGonePath`, `isAdminPath`, `normalizePath`, `resolveLegacyId`, `planRequest`;
   - `parseConsent`, including a future timestamp, `v2`, extra fields and non-digits;
   - `extractAttribution` / `mergeAttribution` / `fitToBudget` and encode/decode, including every field at maximum length with Vietnamese text and emoji (encoded size recorded), malformed base64 and JSON, and extra keys.

   Record it in the PR.
3. **Matcher coverage:** run `unstable_doesMiddlewareMatch` from `next/experimental/testing/server` (or the bundled-docs equivalent) on the include and exclude lists in the matcher AC, and record each true/false.
4. **HTTP matrix** for every URL in the ACs:
   - the 410 list, `wp-content`;
   - legacy IDs: mapped, gone (832), unknown, empty, non-numeric, `page_id` + `p`, repeated params, `/vi?page_id=705`, `/index.php?page_id=705`, `/en/?page_id=705`;
   - the admin paths;
   - the locale and slash list, including uppercase and encoded prefixes.

   For each, record the chain with `curl -s -o /dev/null -L -w '%{num_redirects} %{url_effective} %{http_code}'`, the **GET** headers with `curl -s -D - -o /dev/null` (status, `Location`, `cache-control`, `x-robots-tag`, `Set-Cookie`), and **HEAD** separately with `curl -sI`.
5. **Attribution matrix** on `/?utm_source=x&gclid=abc` with a synthetic `43l_consent` (the S-13 banner doesn't exist yet):
   - none, `v1.0.1.<now>`, `garbage`, a future `at` and `v2.1.1.<now>` → no `Set-Cookie`;
   - `v1.1.0.<now>` → `43l_attr` set. Decode it and check the keys, `HttpOnly`, `SameSite=Lax`, `Max-Age=7776000`, `Path=/`, and `Secure` absent locally (production only, noted);
   - referrer `https://evil.example/path?email=a@b.c#x` → only `referrer_host=evil.example`;
   - an older valid `43l_attr` → `first_seen_at` kept; an older malformed one → replaced, with no error;
   - every param at 500 chars → cookie ≤ 3,072 bytes, or none (fail-closed), as computed in step 2;
   - consent with no params → no `Set-Cookie`;
   - `/?page_id=705&utm_source=x` with consent → 301 with no cookie, then the final URL sets it;
   - `/EN?utm_source=x` with consent → redirect with no cookie, then the final URL sets it.
6. **Browser (CDP), production build:**
   - client navigation VI → EN → VI with the switcher: no reload (window marker), and no redirected `_rsc` request in the network log;
   - the F-03 reduced consent matrix (no consent cookie): 0 cookies and 0 storage after load, navigation and reload.
7. **Budget** (ADR 0006): Lighthouse 12.8.2 mobile, 3 runs on `/`. Record the LCP/CLS medians, INP (switcher click, 4× CPU, as in F-03), and baseline 134.3 / route total / app delta (expected unchanged from F-03's 148.2 KiB).

**Validation commands:** `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build`. Consent matrix: the reduced version above with synthetic consent cookies, because the change touches `proxy.ts` and consent; the banner's accept and withdraw flows stay n/a until S-13. No automated tests (ADR 0004).

### Implementation Hints

- Read the bundled Next docs:
  - `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` (matcher, `unstable_doesMiddlewareMatch`, the Flight-header note);
  - `05-config/01-next-config-js/skipTrailingSlashRedirect.md`.
- Compose with next-intl: `const intl = createMiddleware(routing)`.
  - The planner answers 410, 404 or a redirect first.
  - Otherwise: `const res = intl(req); if (isRedirect(res)) return res; return withAttribution(req, res)`, where `isRedirect` = status 300–399 or a `location` header.
- `client.ts` entries must not import `server-only`. Proxy code runs in the Node runtime, but not as a React Server Component, so a `server-only` import throws there.
- Byte budget: `new TextEncoder().encode(s)` for byte length. Cut on code-point boundaries: iterate `for (const ch of s)`, accumulating bytes.
- Lessons from F-03:
  - next-intl's `as-needed` mode emits `/vi/…` for explicit-locale links, so keep links unprefixed;
  - zsh: never name a shell variable `path`;
  - verify hop counts with `curl -L -w '%{num_redirects}'`.

### Related

- Roadmap: `docs/context/10-roadmap.md` F-06 (F-05 replaces the admin branch; F-07 builds the CSV redirects on top; S-13 writes `43l_consent`).
- Context:
  - `05-seo-and-tracking.md` (Redirects & legacy URLs, Tracking plan, Consent);
  - `06-architecture.md` (`proxy.ts` composition);
  - `09-migration.md` (WP ID mapping);
  - `43logistics.vn/data/redirect-map.csv` (rows 4–5, 9, 14–24, 45–49, 60, 62–63);
  - `docs/context/legacy-copy/*` headers (WP IDs 580, 694, 3570, 3587, 3596).
- ADRs: 0005 (module layers, entry points), 0004 (manual verification), 0006 (budget).
- Specs: `feature-f03-i18n-routing.md` (`/vi` two-hop deviation, switcher), `feature-f04-database-schema-seed.md` (`contact_events`/`leads` attribution columns).
