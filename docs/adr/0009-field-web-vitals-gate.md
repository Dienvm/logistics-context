# ADR 0009 — Field Core Web Vitals are the binding performance gate

- Status: Accepted (2026-10-28)
- Amends: ADR 0006 (experience targets: how LCP/INP/CLS are judged; the JS budget is unchanged)
- Owner repo: both
- Context: The A-02b part 1 check ran Lighthouse mobile on production (`e858ba1`, consent not given, 3-run medians): `/gui-hang-di-han-quoc/` performance 85, LCP 3.82 s; `/gui-hang-di-chau-au/` 85, LCP 3.91 s (accessibility, SEO and best practices 100, CLS 0). CI's report-only rows for the same commit show LCP 3.1–4.6 s and performance 78–93 on every public route, home included. The rule "≥ 90 performance, LCP < 2.5 s" (AGENTS.md rule 8 and §9) therefore failed site-wide while the blocking JS budget passed everywhere (app delta +49.1 KiB). Experiments on a local production build (43logistics.vn PR #57, simulated mobile, medians) located the cause:
  - the LCP element is hero text; unthrottled it paints together with FCP (126 ms locally);
  - with **no web fonts at all**, the simulated LCP stays ~3.2 s (performance 92–93), because Lighthouse's Lantern model counts every request started before the LCP paint, chiefly the ~128 KiB gz Next 16 / React 19 framework JS (ADR 0006 baseline 134.3 KiB);
  - removing the font preloads (PR #57) gives performance 89 and LCP 3.56 s on route pages (89 / 3.64 s on home); preloading the `latin-ext` faces, unpreloading only the display font, or lazy-loading the route calculator island did not help.
  A lab LCP under 2.5 s is not reachable with the current framework without dropping the design fonts, and even then not on route pages.

## Decisions

1. **Field data is the binding experience gate.** LCP < 2.5 s, INP < 200 ms and CLS < 0.1 at the **75th percentile of real mobile users** (Search Console Core Web Vitals report / CrUX for the origin and the route pages; PostHog web vitals after consent where CrUX has too little traffic) decide whether performance is acceptable. The gate starts once L-02 has collected 28 days of data; a route group that fails it gets a fix task.
2. **The JS budget stays the blocking CI gate**, unchanged (ADR 0006: framework baseline + ≤ 50 KiB gz first-party app JS per route, `pnpm perf:report`).
3. **Lighthouse lab is recorded, not blocking, for performance.** Every PR that changes a public page records Lighthouse mobile performance, LCP, CLS and TBT (consent rejected) and compares them with `main`; a change that makes them clearly worse (≥ 3 points or ≥ 0.3 s LCP on the 3-run median) must explain why in the PR. Performance ≥ 90 stays the target, not the bar.
4. **Lab accessibility and SEO stay binding:** SEO 100 and accessibility ≥ 95 on the changed page, as before.
5. **Design fonts stay** (Be Vietnam Pro, Barlow Condensed via `next/font`), without preload (PR #57).

## Alternatives considered

- **Keep lab ≥ 90 / LCP < 2.5 s binding:** every public page already fails it, and the experiments show it can't be met by app changes alone; it would block all public work or invite waivers on every PR.
- **Drop or replace the web fonts:** reaches lab performance 92–93 but still not LCP < 2.5 s, and changes the design system (`04-design-system.md`); rejected by the owner.
- **Cut framework JS further** (lazy desktop navigation, fewer islands): worth doing as targeted perf tasks, but the measured gains are small (a lazy calculator island changed nothing) and the framework baseline remains.

## Consequences

- PRs are no longer blocked by lab performance or LCP; regressions are still visible (Decision 3) and the JS budget still blocks.
- Until L-02 collects field data there is no binding experience evidence; L-01's QA records the lab numbers per page type as the pre-launch reference.
- Search Console's CWV report and CrUX become a monitored launch signal (L-02), next to uptime.
- `AGENTS.md` rule 8 and §9, `06-architecture.md`, `05-seo-and-tracking.md`, `.claude/rules/verification-patterns.md` and the `/implement` and `/mark-implemented` checklists are updated to this wording.
- Follow-up roadmap IDs: L-02 (field CWV gate), and future perf tasks if a route group fails it.
