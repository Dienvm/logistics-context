---
title: Replace PostHog with consent-gated Cloudflare Web Analytics
type: feature
status: approved
owner_repo: both
roadmap: S-13b
priority: must-have
blocked_by_questions: [Q-32]
updated: 2026-10-30
---

## Feature: Replace PostHog with consent-gated Cloudflare Web Analytics

### Problem Statement

ADR 0010 (2026-10-30) drops PostHog: the owner doesn't want it, and it never went live because Q-20 stayed open. S-13 (43logistics.vn PRs #36, #37) still ships the PostHog code path: `posthog-js` behind a dynamic import, `/ingest` rewrites, a PostHog sink in the event bus, two env vars, CI/Docker build args and banner copy that names PostHog. The owner needs page views, traffic sources and real-user Core Web Vitals (ADR 0009 supplementary field source). Cloudflare Web Analytics gives those without cookies or visitor identification. Roadmap row: `docs/context/10-roadmap.md` **S-13b Analytics swap**.

### Proposed Solution

- A visitor who accepts "Phân tích" / "Analytics" in the cookie banner loads the Cloudflare Web Analytics beacon; page views (including client-side navigations) and Core Web Vitals then appear in the owner's Cloudflare dashboard.
- A visitor who hasn't chosen, or rejects analytics, sends nothing to Cloudflare Insights. Withdrawing analytics after the beacon ran reloads the page into the denied state, as GTM already does.
- The banner copy names Cloudflare Web Analytics instead of PostHog. Every PostHog trace leaves the app, its config and its deploy pipeline.
- Contact and lead events keep going to `dataLayer` (GTM lane) only. The beacon takes no custom events.

### Acceptance Criteria

**Removal**

- [ ] **AC-01 No PostHog left.** Given the app repo after the change, when `git grep -i -e posthog -e '/ingest'` runs (excluding `pnpm-lock.yaml` history), then it finds nothing. `posthog-js` is gone from `package.json` and `pnpm-lock.yaml`. `NEXT_PUBLIC_POSTHOG_KEY`/`_HOST` are gone from `shared/config/env.public.ts`, `.env.example`, `deploy/env.template`, `deploy/README.md`, `Dockerfile` and `.github/workflows/deploy.yml`.
- [ ] **AC-02 `/ingest` is an ordinary path.** Given the change, when `/ingest/x` is requested, then `next.config.ts` has no `/ingest` rewrite and `modules/seo/application/request-plan.ts` no longer passes `ingest` through, so the request takes the normal locale/slash path and ends in the localized 404 (no proxying to any third party).
- [ ] **AC-03 Event bus without a sink.** Given `modules/tracking/application/event-bus.ts`, then `pushEvent` writes only to `window.dataLayer`; `setAnalyticsSink` and the sink type are removed. Every existing caller (`trackContactClick` and the other `pushEvent` users) keeps its payload unchanged.

**Beacon**

- [ ] **AC-04 Config.** `shared/config/env.public.ts` adds `NEXT_PUBLIC_CF_BEACON_TOKEN` (optional; blank = unset), with the name in `.env.example`, `deploy/env.template`, the `deploy/README.md` variables table, a `Dockerfile` `ARG` and the `deploy.yml` build args (`vars.NEXT_PUBLIC_CF_BEACON_TOKEN`). The beacon URL `https://static.cloudflareinsights.com/beacon.min.js` is a constant in `modules/tracking/constants.ts`.
- [ ] **AC-05 Off without a token.** Given `NEXT_PUBLIC_CF_BEACON_TOKEN` is unset, when a visitor accepts all, then no request goes to `static.cloudflareinsights.com` or `cloudflareinsights.com`, and nothing errors in the console.
- [ ] **AC-06 Nothing before consent.** Given a token and a fresh browser (no `43l_consent`), when any public page loads and the visitor navigates client-side, then there is no request to `*.cloudflareinsights.com` nor to `/cdn-cgi/rum` on any origin (the collection path Cloudflare uses on proxied zones), no beacon script in the HTML or DOM, and no new cookie.
- [ ] **AC-07 Load after analytics consent.** Given a token, when the visitor accepts analytics (Accept all, or Customize with "Phân tích" on), then exactly one `<script defer src=".../beacon.min.js" data-cf-beacon='{"token":"…","spa":true}'>` is appended to `<head>` (built with `JSON.stringify`, never string concatenation), and the beacon sends its page-view request. A stored grant on a later visit loads it on hydration. Repeated `applyConsent` calls never add a second script.
- [ ] **AC-08 Ads-only choice.** Given a token, when the visitor saves ads on and analytics off, then GTM behaves as today and no Cloudflare Insights request is sent.
- [ ] **AC-09 Withdrawal reloads, in every tab.** A loaded vendor can't be unloaded, so one rule applies to both: whenever the effective choice turns a category off while its vendor is resident in this page (beacon + analytics, GTM + ads), the page reloads into the denied state, once even if both turn off. "Effective choice" covers every path that changes it: the banner's Save in this tab, another tab's save arriving through `consentStore.watch()` (BroadcastChannel, focus, visibility), and a stored consent that has become invalid or expired. In the saving tab the reload still waits for `syncAttribution()`. After the reload no collection request is sent (AC-06 hosts).
- [ ] **AC-10 Client navigations counted.** Given analytics consent and the beacon loaded, when the visitor follows two internal links, then one collection request per navigation is sent (three page views in total). Full-load-only tracking does not meet this AC; if Cloudflare's SPA tracking does not fire, the cause is fixed or the spec is amended with the owner before merge.
- [ ] **AC-16 Activation (owner, Q-32).** With a real site token in the production build and Cloudflare's automatic beacon injection confirmed **off** for the zone, a consented visit to `/`, `/gui-hang-di-singapore/` and `/en/` shows those page views in the Cloudflare Web Analytics dashboard within its reporting delay, and a fresh, unconsented visit to the same URLs shows no beacon script in the served HTML and no collection request. Pending (not a merge blocker, ADR 0004) until the owner supplies the token; recorded in the PR and closed at `/mark-implemented` or L-01.

**Copy**

- [ ] **AC-11 Banner copy.** `messages/vi.json` and `messages/en.json` `consent.analyticsText` name Cloudflare Web Analytics and say it uses no cookies, e.g. VI "Thống kê ẩn danh lượt xem trang và tốc độ tải, không dùng cookie (Cloudflare Web Analytics)." / EN "Anonymous page-view and loading-speed statistics, without cookies (Cloudflare Web Analytics)."; `consent.text` no longer says analytics uses cookies (VI "công cụ phân tích và cookie quảng cáo" / EN "analytics tools and advertising cookies"). `pnpm i18n:check` passes.
- [ ] **AC-12 Privacy policy seed.** `data/seed/info-pages/policy-privacy.vi.md` and `.en.md`, section "Cookie và nội dung bên thứ ba" / "Cookies and third-party content": analytics (Cloudflare Web Analytics, cookieless, only after consent) and advertising cookies are listed separately, and a separate bullet names Cloudflare as the provider of the website's network delivery and security, with data processed outside Vietnam (ADR 0010). Policy voice: "quý khách". The seed never overwrites the published page, so the PR lists two owner publication steps in `/admin` (each bumps the policy version, A-03), each with an observable completion condition:
  1. **Before the token is set:** publish the analytics bullet. Done when the live `/chinh-sach-bao-mat/` and its EN page show it, and only then is `NEXT_PUBLIC_CF_BEACON_TOKEN` set.
  2. **When L-00b activates the proxy:** publish the Cloudflare network/security bullet. Done when the live policy pages show it on the day the nameservers switch.

**Docs and comments**

- [ ] **AC-13 Comments and app AGENTS.md.** Comments that name PostHog (`vendors.ts`, `consent-banner.tsx`, `consent-manager.tsx`, `data-layer.ts`, `constants.ts`, `next.config.ts` CSP note) describe the beacon instead. `43logistics.vn/AGENTS.md` rule 3 reads "Cloudflare Web Analytics and GTM only after consent."
- [ ] **AC-14 Context (implementation change set).** A context `impl/s13b-analytics-swap` branch, opened with the app PR, rewrites the PostHog bullets of `05-seo-and-tracking.md` "S-13 as built" to describe the beacon and the reload rule (AC-09), and updates AGENTS.md §3 "Traffic analytics" *In the app today* to the installed state. *Closure, not this PR:* `/mark-implemented` sets that row's last column to `done (S-13b)` and ticks the roadmap after the app PR merges.

**Budget**

- [ ] **AC-15 JS budget.** `pnpm perf:report` (PR labelled `lighthouse`) passes on every route in `data/perf-budget.json` with consent rejected; the app JS delta does not grow versus `main`. The beacon is third-party, loaded after consent, and is not counted (ADR 0006 amendment).

### Scope

**In scope:**

- Removing every PostHog code path, dependency, env var, build arg and comment from the app.
- The consent-gated Cloudflare Web Analytics beacon in `modules/tracking`, its env var and deploy plumbing.
- Banner copy and the privacy-policy seed text.
- The context implementation docs of AC-14 (05 "S-13 as built", AGENTS.md §3 *In the app today*).

**Out of scope:**

- Creating the Cloudflare Web Analytics site and token, setting the GitHub variable, deleting the old `NEXT_PUBLIC_POSTHOG_*` GitHub variables and any PostHog account (owner steps, listed in the PR).
- Moving the nameservers, proxying, Caddy/firewall changes (L-00b).
- Turning off Cloudflare's automatic beacon injection on the dashboard (owner; ADR 0010 requires it off). Its evidence is part of AC-16, and L-00b re-checks it after the proxy switch.
- Any first-party replacement for PostHog funnels or custom events.
- The `contact_events.analytics_consent` column: it stays (it records the visitor's choice, not a vendor).
- Publishing the updated privacy policy (owner, in admin).

### Affected Areas

| Repo | Layer | File / Path |
|------|-------|-------------|
| app | tracking application | `modules/tracking/application/vendors.ts` (drop `applyPostHog`; add `applyBeacon`, `isBeaconLoaded`), `application/event-bus.ts` (drop the sink), `application/data-layer.ts` (comment) |
| app | tracking constants | `modules/tracking/constants.ts` (drop `POSTHOG_INGEST_PATH`; add the beacon URL) |
| app | tracking ui | `modules/tracking/ui/consent-manager.tsx` (`beaconToken` instead of `posthogKey`), `ui/consent-banner.tsx` (reload when analytics is withdrawn after the beacon loaded; comment) |
| app | seo application | `modules/seo/application/request-plan.ts` (`PASS_THROUGH` without `ingest`) |
| app | config | `next.config.ts` (remove the PostHog rewrites and `posthogHost`; CSP comment), `shared/config/env.public.ts`, `.env.example`, `package.json` + `pnpm-lock.yaml` |
| app | deploy | `Dockerfile`, `.github/workflows/deploy.yml`, `deploy/env.template`, `deploy/README.md` |
| app | copy / seed | `messages/vi.json`, `messages/en.json` (`consent.text`, `consent.analyticsText`), `data/seed/info-pages/policy-privacy.vi.md`, `.en.md` |
| app | agent doc | `43logistics.vn/AGENTS.md` rule 3 |
| context | docs | `AGENTS.md` §3 row, `docs/context/05-seo-and-tracking.md` "S-13 as built" (at `/mark-implemented`) |

### Golden-rule checks

- **Rule 8 (JS budget):** code shrinks; the beacon is a deferred third-party script after consent, reported separately.
- **Rule 12 (track every contact):** `/go/[channel]` logging and the `dataLayer` push are unchanged; only the PostHog fan-out goes.
- **Rule 14 (consent):** no beacon request before analytics consent, none after rejection, reload on withdrawal; the beacon is cookieless, but it is still an analytics request, so it stays gated (ADR 0010 Decision 5).
- **Rule 15 (secrets):** the beacon token is public by design (`NEXT_PUBLIC_`); no secret is added.
- **§10:** analytics systems stay the two ADR 0010 lanes (GTM, Cloudflare Web Analytics).

### Dependencies & Risks

- Depends on: S-13 (done in code), ADR 0010. Independent of L-00b: the manual beacon works whether or not the zone is proxied.
- Blocked by questions: Q-32 (Cloudflare Web Analytics site token and dashboard access). Not a code blocker: unset → beacon off (AC-05); AC-16 waits for it. GTM rows of the consent matrix need `NEXT_PUBLIC_GTM_ID` (Q-13): without it they are recorded as pending.
- Risk: the beacon runs before the policy discloses it. Mitigation: AC-12 step 1 gates setting the token on the published analytics disclosure.
- Risk: SPA tracking doesn't fire on Next client navigations (AC-10). Cloudflare enables it by default (`spa: true` is explicit, harmless). A failure is fixed before merge or taken to the owner as a scope change; it is never shipped silently.
- Risk: removing `ingest` from `PASS_THROUGH` changes how `/ingest*` is planned; it must still be one hop and end in 404 (AC-02).

### Manual Verification Plan

- Seed needs: default seed is fine.
- **Builds:** `NEXT_PUBLIC_*` values are inlined at build, so use two production builds served with `pnpm start -p 3100`:
  - **A** — `NEXT_PUBLIC_CF_BEACON_TOKEN` unset (step 1);
  - **B** — token set to a dummy non-empty value (steps 2–9). Upstream rejects a dummy token; only whether requests are *sent* is checked here. Dashboard evidence is AC-16 with the real token.
  - `NEXT_PUBLIC_GTM_ID` as available locally; without it every GTM expectation is recorded "pending (Q-13)".
- **Instrumentation:** Chrome DevTools, Network with **Preserve log** on and the filter `cloudflareinsights|cdn-cgi/rum|googletagmanager`; Application → Cookies and Local Storage. Before each withdrawal, note the last request; after the reload, expect none.
- **Consent matrix** (fresh Chrome profile per row unless stated; ADR 0004 Decision 2):

  | # | Build | Action | Expected `43l_consent` | Expected requests |
  | --- | --- | --- | --- | --- |
  | 1 | A | Accept all on `/` | `v1.1.1.<ts>` | no Cloudflare request; no console error (AC-05) |
  | 2 | B | Open `/`, `/gui-hang-di-singapore/`, `/en/`; follow 2 internal links; no choice | absent | none, no beacon in DOM, no new cookie (AC-06) |
  | 3 | B | Reject on `/`, then navigate twice | `v1.0.0.<ts>` | none (AC-06) |
  | 4 | B | Customize: analytics on, ads off → Save | `v1.0.1.<ts>` | one `beacon.min.js` + collection; no GTM; no `43l_attr` (AC-07) |
  | 5 | B | Customize: ads on, analytics off → Save | `v1.1.0.<ts>` | GTM (or pending Q-13); no Cloudflare request (AC-08) |
  | 6 | B | Accept all; reload; follow 2 internal links | `v1.1.1.<ts>` | beacon once per page load (one script in `<head>`); one collection request per navigation (AC-07, AC-10) |
  | 7 | B | From row 4: "Cài đặt cookie" → analytics off → Save | `v1.0.0.<ts>` | one reload; no Cloudflare request after it (AC-09) |
  | 8 | B | From row 6: withdraw both | `v1.0.0.<ts>` | exactly one reload; nothing after it |
  | 9 | B | Two tabs on `/` with analytics granted and beacon loaded; withdraw analytics in tab 1; focus tab 2 | `v1.0.0.<ts>` | tab 2 reloads on the cross-tab message or focus; no request after it (AC-09) |
  | 10 | B | With analytics granted, edit `43l_consent` in DevTools to an invalid value (e.g. `v1.1.1.1`), then focus the tab | invalid | page reloads; banner shown; no Cloudflare request (AC-09) |

- **Other steps:**
  1. `/ingest/x` → localized 404, one hop (`curl -sI`), no upstream request (AC-02).
  2. Banner open at 360, 768 and 1280 px in VI and EN: new texts (AC-11), keyboard only (Tab to every control, Enter/Space, focus visible, focus moves into the banner on open), with `prefers-reduced-motion: reduce` emulated; axe DevTools at 360 and 1280 px, 0 serious/critical.
  3. `git grep -i -e posthog -e '/ingest'` in the app → empty (AC-01).
- **Activation (AC-16, owner with Q-32):** real token in the production build; Cloudflare dashboard → Web Analytics → the site's automatic setup / injection is off (screenshot in the PR); `curl -s https://43logistics.vn/ | grep -c cloudflareinsights` → 0; fresh unconsented browser → no request (matrix row 2 on production); consented visits to the three URLs → page views in the dashboard. Repeated by L-00b after the proxy switch.
- **Validation commands:** `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `i18n:check`, `build`; `check:redirects` against `next start`, 0 FAIL; `perf:report` via the `lighthouse` label (AC-15). No automated tests (ADR 0004).

### Implementation Hints

- Mirror the GTM pattern in `vendors.ts`: a module-level `beaconLoaded` flag, `applyBeacon(granted, token)` that appends the script once when granted, and `isBeaconLoaded()` for the banner. No generation counter is needed: there is no async import anymore.
- Put the reload rule in one place that sees every effective change (AC-09): e.g. `applyConsent` returns `"reload"` when a resident vendor's category is now denied, and the banner's consent effect reloads on it. The saving tab keeps awaiting `syncAttribution()` before reloading (save the choice, sync, then let the effect act, or reload from `save` and make the effect skip while a save is in flight). Expired or invalid consent reaches the effect as `null`, which counts as all denied.
- `VendorConfig` becomes `{ gtmId; beaconToken }`; `ConsentManager` passes `publicEnv.NEXT_PUBLIC_CF_BEACON_TOKEN ?? null`.
- Run `pnpm remove posthog-js` (not a hand edit of the lockfile).
- Lessons/memory: after `pnpm lint:fix`, re-check scripted string replacements (Biome reflows files).

### Related

- Roadmap: `docs/context/10-roadmap.md` S-13b (and S-13).
- ADRs: 0010 (decision), 0002 Decision 8 (amended), 0004 Decision 2 (consent matrix), 0006 (JS budget), 0009 (field data source).
- Context: `docs/context/05-seo-and-tracking.md` (Consent, Platforms, S-13 as built), `docs/context/06-architecture.md` env table.
- Specs: L-00b (to be written) for the Cloudflare edge; `specs/feature-l00-deployment-pipeline.md` for the deploy plumbing.
