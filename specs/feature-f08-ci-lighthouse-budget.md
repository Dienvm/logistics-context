---
title: Add Lighthouse report and JS budget gate to CI
type: feature
status: implemented
branch: feat/f-08-ci-lighthouse-budget
implementation_pr: https://github.com/Dienvm/43logistics.vn/pull/9
implementation_commit: 6a6fd96deb7eeff16862e57f6c53622b641385cc
implemented_date: 2026-10-21
owner_repo: both
roadmap: F-08
priority: must-have
blocked_by_questions: []
updated: 2026-10-21
---

## Feature: Add Lighthouse report and JS budget gate to CI

### Problem Statement

`AGENTS.md` rule 8 and ADR 0006 cap every public route at the **framework baseline (134.3 KiB) + ≤ 50 KiB** of app JS, and set LCP < 2.5 s, CLS < 0.1 and INP < 200 ms as experience gates. Today those numbers exist only in hand-run Lighthouse evidence pasted into PR bodies. Nothing stops a PR that silently adds client JS.

Roadmap row `docs/context/10-roadmap.md` F-08. The job list (lint, typecheck, build, gitleaks, i18n:check, check:redirects) already runs in the `verify` and `security` workflows (F-03, F-07). What's missing is **Lighthouse CI as a report**, with the framework baseline + ≤ 50 KB gz app JS per ADR 0006. Per-PR evidence stays binding, and there are no unit or e2e jobs (ADR 0004).

Owner decisions (2026-10-21):
1. **Only the JS budget blocks** a PR, because it's deterministic. LCP, CLS, performance and accessibility are reported as 3-run medians but don't block: shared runners are noisy, and local runs already showed 2.0–3.1 s. The manual per-PR Lighthouse evidence stays binding.
2. The report goes to the **GitHub Actions job summary plus a JSON artifact**, with no extra permissions.

### Proposed Solution

Every PR gets a Lighthouse table in its CI run: for each public route, the median LCP, CLS, TBT, performance and accessibility, plus the route's script total and app JS delta over the baseline. If a route's app JS goes over budget, the PR fails with a message naming the route and the overage. The raw Lighthouse reports can be downloaded from the run.

### Acceptance Criteria

**Routes and budget as data**

- [ ] Given `data/perf-budget.json`, then it holds:
  - the **framework baseline** (`baselineKiB: 134.3`, with the Next/React versions and the ADR 0006 measurement it comes from);
  - `appBudgetKiB: 50`;
  - the list of **public routes** to measure: `/` and `/en/` today; later S-tasks add theirs in the same change that creates the route.

  It's validated with Zod at load: positive finite numbers, and paths starting with `/` and ending with `/`. A malformed file exits 1 naming the field. `AGENTS.md` rule 8 and ADR 0006 name this file as the CI copy of the baseline, and a Next/React upgrade PR updates both.

**Measurement** (`scripts/perf-report.ts`; ADR 0004: a script, not a test suite)

- [ ] Given a running production build (`--base`, default `http://localhost:3100`), then for each route, **sequentially**, the script:
  1. confirms the route returns **HTTP 200** at its intended final URL (no redirect). Otherwise the route FAILs without running Lighthouse; Lighthouse's own document-status handling stays on, so an error page is never measured;
  2. runs **Lighthouse 12.8.2** (pinned dev dependency) **3 times**, with the mobile preset, a fresh profile each run (cold cache) and **no consent cookie**. The metric follows ADR 0006 Decision 3: the sum of `transferSize` over **requested** `Script` entries in `network-requests` (bytes / 1024 = KiB). `noModule` chunks aren't requested, so they're excluded by construction and never subtracted.
- [ ] Given each run's report, then it is **valid** only if all of these are present and finite: LCP, CLS, TBT, the performance and accessibility scores, and at least one `Script` request. Anything missing, null, NaN or a runtime error makes that run invalid. A route needs **3 valid runs**, or it FAILs.
  - Medians are computed numerically from **unrounded** values, and only the displayed numbers are rounded.
  - **Gate:** the median script KiB − `baselineKiB` must be **≤ `appBudgetKiB`**; equality passes.
- [ ] Given the 3 runs of a route, then their **sets of script URLs** (with query strings stripped) must be identical. If they differ, the route is **UNSTABLE**, which counts as a FAIL. Its per-run lists are kept for investigation, because the gate must never rest on a median that hides a different request set.
- [ ] Given the results, then the script writes:
  - a markdown table to `$GITHUB_STEP_SUMMARY` when set, otherwise to stdout. Columns: route, LCP, CLS, TBT, Perf, A11y, Script KiB, Δ vs baseline, status (PASS / FAIL / UNSTABLE). It also records the Chrome version, the Lighthouse version and the effective settings (form factor, throttling);
  - per run, the Lighthouse JSON and the script URL + size list, into a **non-hidden** output directory (`--out`, default `lighthouse-report/`, git-ignored), **written incrementally as each run finishes**;
  - `perf-summary.json` (per run and medians), **always** written, including after a failure or timeout, so the job summary and the artifact exist on failing runs.
- [ ] **Exit code:** 1 if any route is FAIL or UNSTABLE, or if the run is aborted. LCP, CLS, TBT, perf and a11y never change the exit code (owner decision 1).
- [ ] **Time limits:** 60 s per Lighthouse run and a **9-minute overall deadline**. If the server is unreachable, the script fails fast at the first readiness check. On a timeout it kills Chrome, writes the summary and exits 1.

**CI**

- [ ] Given `.github/workflows/verify.yml`, then after `check:redirects` a separate **Lighthouse** step:
  - starts its **own** `pnpm start -p 3100`, with the same readiness rule as F-07 (`GET /` → 200 within 60 s) and an `EXIT` trap that stops the server. It doesn't reuse the F-07 step's server, whose trap has already stopped it;
  - uses the runner image's Google Chrome, recording its version in the summary;
  - runs `pnpm perf:report --base http://localhost:3100 --out lighthouse-report`;
  - uploads `lighthouse-report/` with `actions/upload-artifact@v4` as `lighthouse-report`, `if: always()`. The directory isn't hidden, so `include-hidden-files` isn't needed.

  The workflow keeps `permissions: contents: read`: no PR comment, no write permissions (owner decision 2).
- [ ] Given a PR, then the `verify` run's job summary shows the table and the artifact contains the reports (checked by downloading it). A scratch branch with an oversized client import that verifiably lands in a requested chunk on `/` makes the step fail, naming the route and the overage. Its artifact is downloaded and inspected too. Both run links are recorded, and the scratch branch is deleted.

**Docs** (in the same change, `AGENTS.md` §7 rule: commands are documented when added)

- [ ] Given the change, then:
  - `AGENTS.md` §7 lists `pnpm perf:report`, and §9 states the policy: the CI JS-budget gate blocks; experience metrics are reported in CI and stay binding as manual PR evidence;
  - the same policy is written in **ADR 0004** (Decision 2 / Consequences), **ADR 0006** (Consequences: F-08 enforces the app budget from `data/perf-budget.json`) and the **F-08 roadmap row**;
  - `06-architecture.md` (Testing & quality) mentions the CI report;
  - lifecycle status and the roadmap tick happen in `/mark-implemented` only.

### Scope

**In scope:**
- `data/perf-budget.json` and its schema, and `scripts/perf-report.ts` with small helpers under `scripts/perf/`.
- The `perf:report` package script.
- The CI step and artifact, and `.gitignore` for `.lighthouse/`.
- The doc updates.

**Out of scope:**
- PR comments (owner decision 2).
- Blocking on LCP/CLS/perf/a11y (owner decision 1).
- INP: Lighthouse navigation runs can't measure it (ADR 0006 Decision 3); it stays manual.
- Lighthouse on consent-granted runs (S-13).
- Lighthouse against preview deployments (L-02, Q-15).
- Lighthouse Server or LHCI storage.

### Affected Areas

| Repo | Layer | File / Path |
|------|-------|-------------|
| app | data | `data/perf-budget.json` (new) |
| app | scripts | `scripts/perf-report.ts` (new), `scripts/perf/*.ts` (schema, Lighthouse runner, summary) |
| app | config | `package.json` (`perf:report`; `lighthouse` pinned 12.8.2 as a dev dependency), `.gitignore` (`lighthouse-report/`), `pnpm-workspace.yaml` (only if Lighthouse needs `allowBuilds`) |
| app | CI | `.github/workflows/verify.yml` (Lighthouse step, artifact) |
| app | docs | `AGENTS.md`, `README.md` |
| context | docs | `AGENTS.md` §7/§9 (in this change), `docs/adr/0004-*.md` (Decision 2/Consequences), `docs/adr/0006-*.md` (Consequences), `docs/context/10-roadmap.md` (F-08 wording), `docs/context/06-architecture.md` (Testing & quality) |

### Golden-rule checks

- **Rule 8 (budget):** app JS ≤ baseline + 50 KiB per listed route, enforced in CI. The experience metrics are reported, and the manual evidence stays binding.
- **Rule 14 (consent):** measured with no consent cookie (ADR 0006 method).
- **Rule 15 (secrets):** no tokens; read-only workflow permissions.

### Dependencies & Risks

- **Depends on:** F-03 (the `verify` workflow), F-07 (the CI server lifecycle, reused), and ADR 0006 (the baseline and method).
- **Blocked by questions:** none.
- **Risks:**
  - **Request-set variance:** deferred or lazy chunks can change which scripts load in a run. The UNSTABLE rule surfaces it instead of hiding it in a median.
  - **Chrome on runners:** the image's Chrome changes over time. The version is recorded, and only the JS size gates.
  - **Headers in `transferSize`:** about 0.3 KiB per request, accepted in ADR 0006. A Next/React upgrade changes the baseline, so the upgrade PR updates `perf-budget.json` (ADR 0006 reconsideration trigger).
  - **CI time:** an **estimated** 2–3 minutes for 3 runs × 2 routes, bounded by the 9-minute deadline. Changing the run count is a spec revision, not an implementation choice.

### Manual Verification Plan

**Scenario:** given the PR, when `verify` runs, then the job summary shows the table for `/` and `/en/` and the artifact exists. Given a scratch branch with an oversized import, when `verify` runs, then the Lighthouse step fails, naming the route and the overage, and its artifact still holds the reports.

**Seed needs:** none.

**Steps:**

1. Run `pnpm lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check` and `build`. Then start `pnpm start -p 3100` and run `pnpm check:redirects`.
2. **Local run:** `pnpm perf:report` with the arm64 Node used for Lighthouse here. Then:
   - check that the table prints and the summary + per-run files exist in `lighthouse-report/`;
   - **exact sum:** recompute one run's Script total by hand from its saved `network-requests` rows and match it to the reported figure; confirm the `noModule` chunk isn't among the requested rows;
   - **median:** a worked example from the three saved values;
   - recent totals for reference (illustrative, not constants): about 148.1 KiB / +13.8 on `/` (app PRs #6–#8 evidence).
3. **Gate boundaries,** using a temporary budget file:
   - `appBudgetKiB` set exactly to the measured delta → PASS (equality);
   - 0.1 below it → FAIL, exit 1;
   - a malformed file (negative budget, a route without a trailing slash) → exit 1 naming the field.
4. **Route errors:** temporarily add `/khong-co/` to the routes → that route FAILs (non-200) and Lighthouse isn't run on it. With the server stopped → a fast FAIL, exit 1, and the summary file is still written.
5. **Oversize:** add a temporary `"use client"` island that imports a sizeable module and renders something from it on `/` (so it can't be tree-shaken; confirm the chunk appears in a run's script list) → FAIL with the overage, exit 1. Revert.
6. **CI:**
   - the PR's `verify` run: summary table plus artifact (download it and list its contents), with the link recorded;
   - a scratch branch with the step-5 island: a failing run, its artifact downloaded and inspected, the link recorded, then the branch deleted;
   - record the time the step added.

**CI evidence (recorded 2026-10-21):**

- PR run: https://github.com/Dienvm/43logistics.vn/actions/runs/39610675215. The job summary shows the table; the `lighthouse-report` artifact (downloaded) holds `perf-summary.json` plus per-run and script-list files for `/` and `/en/`. Result: 148.2 KiB, +13.9 KiB, PASS. The step adds about 61 s.
- Oversize canary (draft app PR #10, branch `chore/f08-oversize-canary`, closed and deleted): https://github.com/Dienvm/43logistics.vn/actions/runs/39613254608. A `"use client"` island on `/` imports about 100 KiB gz of generated data, so every run requests 8 scripts instead of 7. The Lighthouse step fails with `/` and `/en/` both reporting `FAIL (+110.6 KiB > 50 KiB budget)`, exit 1. The artifact still uploads and was downloaded and inspected.

**Validation commands:** `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build`, `check:redirects`, `perf:report`. No consent change; no automated tests (ADR 0004).

### Implementation Hints

- Run Lighthouse through its Node API (`lighthouse` package + `chrome-launcher`) or the CLI with `--output=json --quiet --chrome-flags="--headless=new"`; pin the package version.
- In CI, Node is x64 on an x64 runner, so the local arm64 caveat doesn't apply there.
- `GITHUB_STEP_SUMMARY` is a file path: append the markdown.
- Both CI steps need the same server start and readiness logic: factor `scripts/ci/start-server.sh` (start, readiness, trap) and use it in both, instead of duplicating it.

### Related

- Roadmap: `docs/context/10-roadmap.md` F-08.
- ADRs: 0006 (budget split, measurement method), 0004 (scripts, not test suites).
- Rules: `.claude/rules/verification-patterns.md`.
- Specs: `feature-f03-i18n-routing.md` (`verify` workflow), `feature-f07-legacy-redirects-check.md` (CI server lifecycle).
