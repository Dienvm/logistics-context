# ADR 0006 — Next 16 runtime: Cache Components on, and the JS budget split

- Status: Accepted (2026-10-21)
- Amends:
  - ADR 0002 §2 (Cache Components "enabled only after a recorded compatibility check") and §7 (the 120 KB budget sentence);
  - ADR 0001's compatibility timing;
  - `AGENTS.md` rule 8 (JS budget).

  The budget figures in ADR 0004 and ADR 0005 are amended to match.
- Owner repo: both
- Context: F-01 upgrades the app to **Next.js 16.4.2 / React 19.3.1** (app commit `0bd48c2`).
  - **Cache Components.** ADR 0002 §2 and the F-01 roadmap row allowed `cacheComponents: true` only after Clerk and next-intl were checked against it, but neither library is installed yet (they arrive in F-05 and F-03). Documentation research on 2026-10-21, for the then-current releases on npm:
    - **`@clerk/nextjs` 7.9.18:** `auth()` is request-time data. Rendering it opts the route into dynamic rendering, and Clerk recommends wrapping auth-dependent components in `<Suspense>` (Clerk "rendering modes"). Next's authentication-with-Cache-Components guide says the same: stream authenticated UI behind `<Suspense>`. No statement of incompatibility was found, and no version-specific `cacheComponents` note either.
    - **`next-intl` 4.14.9:** no `cacheComponents` page or note was found in the searched docs and articles. The architecture plan (`06`) already passes `locale` explicitly into cached functions and uses `setRequestLocale`, which avoids request APIs inside caches.
    - Neither finding is runtime evidence. The checks in Decision 1 at F-03/F-05 are the real gate. Next 16.4 warns unless `partialPrefetching` is set, and says new Cache Components projects should enable it.
  - **JS budget.** `AGENTS.md` rule 8 capped first-party JS at **< 120 KB gz on the initial route render, framework included**. On the F-01 build of the empty `noindex` placeholder, the initial JS is **134.3 KiB**, all framework: React DOM ≈ 70 KiB, the Next router runtime ≈ 48 KiB, plus small runtime chunks.
    - That figure uses the measurement method in Decision 3. The `noModule` polyfill chunk (≈ 38 KiB gz) isn't counted, because modern browsers don't download it.
    - The same page on Next 15.3 / React 19.1 (F-00) measured 100.6 KiB the same way.
    - **Configuration can't recover the gap.** Four variants were compared with one consistent, *different* method: the sum of the gzip body sizes of every script the HTML references, `noModule` chunk included. Results: Turbopack with `partialPrefetching` on 171 KiB, off 171 KiB; webpack 169 KiB; webpack without `cacheComponents` 168 KiB. The `noModule` chunk is the same file in every variant, so the ≈ 3 KiB spread also holds under the browser-transfer method. The old budget would be breached before any app code exists.

## Decisions

1. **Cache Components is enabled in F-01:** `cacheComponents: true` and `partialPrefetching: true` in `next.config.ts`, the latter as Next 16.4 recommends for new projects. The compatibility gate of ADR 0002 §2 moves to the tasks that install the libraries. Each records versions, expected and observed results in the table below:
   - **F-03 (next-intl):**
     - build passes;
     - direct loads of a VI page (`/`) and its EN equivalent (`/en/…`) render the right `lang`, messages, canonical and reciprocal hreflang;
     - client navigation VI → EN → VI with a warm cache shows no locale mixing;
     - two browser sessions with different locales never see each other's content.
   - **F-05 (Clerk):**
     - build passes;
     - `/admin` unauthenticated → sign-in;
     - authenticated `editor` → the admin renders with their identity;
     - authenticated user without the needed role → 403/redirect;
     - two sessions as different users never see each other's data, and public pages ship no Clerk JS.
   - **Fallback if a check fails:** keep `cacheComponents: true` and isolate the incompatible part, e.g. request-time Clerk calls inside `<Suspense>` or dynamic `/admin` segments, or the locale passed explicitly instead of read from request APIs. Only if isolation is impossible may a new ADR set it to `false`, and cached-query code then follows that ADR.
2. **JS budget, replacing the single 120 KB cap in rule 8:**
   - **Framework baseline:** the initial JS of an empty route on the current Next/React versions. **Today 134.3 KiB** (Next 16.4.2 / React 19.3.1, app commit `0bd48c2`). Every PR that changes `next`, `react` or `react-dom` re-measures it with the fixture in Decision 3 and updates this ADR and `AGENTS.md` rule 8.
   - **App budget:** each public route may add **at most 50 KiB** of initial JS on top of the baseline. A route over it blocks its PR. The 50 KiB covers the islands the IA plans per route, with margin:
     - consent banner + store ≈ 5–8 KiB;
     - mobile action bar ≈ 2–4 KiB;
     - quote calculator ≈ 15–25 KiB;
     - lead form with Turnstile loader ≈ 8–12 KiB;
     - mega-menu interactivity ≈ 3–6 KiB.

     `motion`, TanStack Query or a second form library would not fit without justification, which is intended.
   - **Experience targets stay the primary gate:** LCP < 2.5 s, INP < 200 ms, CLS < 0.1 on mobile/4G. Third-party tags loaded after consent are reported separately and kept deferred.
3. **Measurement method** (extends ADR 0004 Decision 2):
   - **Tool and setup:**
     - Lighthouse **12.8.2** CLI, mobile preset, cold cache (Lighthouse's default fresh profile);
     - the arm64 Node noted in `.claude/rules/verification-patterns.md`;
     - against `pnpm build && pnpm start` (gzip as served by `next start`);
     - consent rejected (no consent cookie).
   - **Metric:** the sum of `transferSize` of the `Script` requests in the `network-requests` audit for the initial navigation, in **KiB** (bytes / 1024). It includes response headers (about 0.3 KiB per request), which is accepted as part of the method. `noModule` scripts aren't requested by the browser, so they aren't counted.
   - **Baseline fixture:** a temporary `app/baseline-probe/page.tsx` that renders only `<p>baseline</p>` under the root layout.
     - It must be routable: `_`-prefixed folders are private in Next.
     - It must paint, otherwise Lighthouse stops with `NO_FCP`.
     - Build it on the upgrade commit, assert HTTP 200, measure, then delete it.
     - The report JSON and the per-chunk breakdown go into the PR.
     - F-01 result: `/baseline-probe/` → 200, **134.3 KiB** in five chunks (70.7 + 49.2 + 6.2 + 4.2 + 3.9 KiB); the home placeholder measured the same 134.3 KiB, so its app delta is 0.
   - **Route delta:** the route's metric minus the current baseline.
   - **INP:** a navigation Lighthouse run doesn't measure INP (its performance score uses TBT). Pages with no interactive element record INP as *unmeasured*. Interactive pages record INP from the Chrome Performance panel or the Web Vitals extension, over the route's representative interactions (open menu, change calculator input, submit form), on a throttled mobile profile. After launch, field INP comes from real-user data (PostHog web vitals or CrUX once available).

## Alternatives considered

| Option | User performance | Effort | Upgrades | Outcome |
| --- | --- | --- | --- | --- |
| Keep 120 KB including the framework | strictest on paper | blocks every PR from day one (empty page is 134.3) | would force rejecting Next 16 | rejected: not achievable |
| One total cap, e.g. 170–185 KiB | same ceiling as the split today | simplest to state | an upgrade that grows the framework silently shrinks app headroom, or the cap must be renegotiated | offered, not chosen |
| **Split: baseline + 50 KiB app** | same ceiling today; app weight is always visible | one extra subtraction per PR | framework growth is surfaced and decided explicitly (see Consequences) | **chosen** |
| Return to Next 15 (100.6 baseline) | ≈ 34 KiB less JS | lose Cache Components, `updateTag`, `proxy.ts` that `06`, ADR 0005 and the rules rely on | a forced major upgrade later, in a busier phase | rejected by the owner |
| Disable `partialPrefetching` / Cache Components, or use webpack | no measurable saving (≈ 3 KiB) | — | — | rejected |
| Defer Cache Components to F-03/F-05 (ADR 0002's original gate) | none | low now. F-04 (DB) precedes the first cached queries, so little code would need rework, but every query written before the check would follow the non-cached pattern first | — | offered, not chosen: there is nothing to check until the libraries exist, and the F-03/F-05 gates above cover the risk |

## Consequences

- **Performance:**
  - The ceiling for a public route is now about 184 KiB of initial JS (134.3 + 50), up from 120.
  - Mobile experience is guarded by the unchanged LCP/INP/CLS gates. The F-01 placeholder scored Lighthouse performance 99, LCP 2.1 s, CLS 0, TBT 40 ms; INP is unmeasured there (no interactive element).
- **CI enforcement (F-08):** `pnpm perf:report` in the `verify` workflow measures every route in `43logistics.vn/data/perf-budget.json` with this ADR's method (3 cold mobile runs, consent rejected, requested `Script` `transferSize`). It fails the PR when the median app delta exceeds 50 KiB, when the script request set differs between runs, or when a route can't be measured. LCP/CLS/TBT and the scores are reported only. `perf-budget.json` is the CI copy of the baseline, and an upgrade PR updates it together with this ADR.
- **Reconsideration trigger:**
  - If a Next/React upgrade raises the baseline by **more than 10 KiB**, that PR needs an explicit owner decision (accept, defer the upgrade, or cut app budget), not just a number update.
  - If any route's LCP or INP target fails twice in a row, revisit the 50 KiB allowance.
- **Invariants that partial prefetching and Cache Components must keep**, and how they are checked:
  - **No tracking before consent.** Prefetch traffic is first-party (`/_next/*`, same-origin RSC/HTML) only; there are no requests to GTM, PostHog, ad domains or `/ingest`, and no analytics or `43l_attr` cookies before consent. Checked by the ADR 0004 consent matrix in S-13 and every tracking-related PR.
  - **No cache leakage across users or locales.** Request-specific data (cookies, auth, attribution) is never read inside `"use cache"` functions (`.claude/rules/api-patterns.md`). Checked in F-03/F-05 (Decision 1) and in `/code-review`.
  - **SEO.** Canonical and reciprocal hreflang stay correct per page type (S-10 manual SEO check), and legacy URLs redirect in one hop (`check:redirects` from F-07).
- **Ops and cost:**
  - Partial prefetching and Cache Components add same-origin prefetch requests and cached render work. That means more requests and edge bandwidth per session, and cache invalidation must be correct (`updateTag`/`revalidateTag` per `api-patterns.md`).
  - Hosting (Q-15) monitoring should watch request count and bandwidth after launch (L-02).
  - Maintaining the baseline costs one Lighthouse run and one doc edit per framework upgrade.
  - No new services.
- **Docs updated in the same change set:**
  - `AGENTS.md` rule 8 and §9;
  - `05-seo-and-tracking.md` budgets, and `06-architecture.md` (the next-intl verification note);
  - `04-design-system.md` motion rule;
  - `.claude/rules/state-patterns.md` and `api-patterns.md`;
  - the `/code-review` and `/feature-bug` skills;
  - the proposal;
  - roadmap F-01/F-03/F-05/F-08;
  - the spec `feature-f01-upgrade-and-harness.md`;
  - the app `AGENTS.md`;
  - ADR 0001/0002/0004/0005 status lines.

  Historical specs (F-00) keep their recorded 120 KB evidence unchanged.
- **Follow-up roadmap IDs:** F-03, F-05 (compatibility checks), F-08 (Lighthouse CI report with baseline + delta), S-13 (consent matrix with prefetching), L-02 (bandwidth monitoring), and every S-task (app delta per route).

## Compatibility record

| Task | Versions | Check | Expected | Observed | Date |
| --- | --- | --- | --- | --- | --- |
| F-01 | Next 16.4.2, React 19.3.1; no Clerk/next-intl | `pnpm build` + `pnpm dev` with `cacheComponents` + `partialPrefetching` | no errors or warnings | pass (0 warnings, 0 errors) | 2026-10-21 |
| F-03 | Next 16.4.2, React 19.3.1, next-intl 4.14.9; locale from `next/root-params` (no `setRequestLocale`) | Decision 1, F-03 list | all pass | **pass.** Build: `/vi` and `/en` prerendered fully static (○), no Cache Components errors. Direct loads: right `lang`, messages, canonical, reciprocal `vi`/`en`/`x-default`. Client navigation VI → EN → VI twice: no locale mixing, no reload. Two isolated contexts, three alternations: no mixing. Notes: next-intl `Link` with an explicit `locale` emits a prefixed `/vi/` href, whose prefetch redirect hard-reloads the router, so links use `next/link` + `getPathname`. Unknown `[locale]` values 404 from the pages, not the root layout (app PR F-03) | 2026-10-21 |
| F-05 | Next 16.4.2, React 19.3.1, @clerk/nextjs 7.9.19, svix 2.8.0; no Clerk client component (hosted sign-in, server-action sign-out), `app/admin` root layout (`instant = false`), `clerkMiddleware` called only for canonical admin paths | Decision 1, F-05 list | all pass | **partial.** Build passes with and without Clerk keys: admin pages dynamic (ƒ), public routes unchanged. Budget finding: any Clerk client component under `/admin` (`ClerkProvider` imports Clerk's server actions; `@clerk/react` too) re-split the framework chunks every public page loads (14 scripts vs 12, +1.8 KiB in CI, over budget), so the app ships no Clerk JS. Public `/`: 12 scripts, 217,321 B gz (main 217,398). `/admin/` unauthenticated → 307 to Clerk's hosted sign-in with `redirect_url` (+ `noindex`); `/api/admin/*` → 401; variants (`/en/admin/`, `/ADMIN/`, `/%61dmin/`) → 404. No Clerk header or cookie on public responses. **Pending (owner Clerk instance + staff users):** editor identity, no-role → 403, two concurrent sessions. Admin reads `auth()`/`currentUser()` only at request time, never inside `"use cache"` (app PR F-05) | 2026-10-23 |

Sources consulted: [Clerk rendering modes](https://clerk.com/docs/references/nextjs/rendering-modes), [Next.js authentication with Cache Components](https://nextjs.org/docs/app/guides/authentication-with-cache-components), [Lighthouse performance scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring), the Next 16.4.2 config warning text for `partialPrefetching`.
