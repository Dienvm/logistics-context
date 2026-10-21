---
title: Add Lighthouse report and JS budget gate to CI
type: feature
status: draft
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

  It's validated with Zod at load: positive numbers, paths starting with `/` and ending with `/`. `AGENTS.md` rule 8 and ADR 0006 name this file as the CI copy of the baseline, and a Next/React upgrade PR updates both.

**Measurement** (`scripts/perf-report.ts`; ADR 0004: a script, not a test suite)

- [ ] Given a running production build (`--base`, default `http://localhost:3100`), then for every route the script runs **Lighthouse 12.8.2**, pinned, with the mobile preset, a cold profile and no consent cookie, **3 times**.
  - It records per run: LCP, CLS, TBT, performance and accessibility scores, and the **sum of `transferSize` of `Script` requests** in `network-requests` (KiB = bytes / 1024; the ADR 0006 Decision 3 method).
  - It reports the **median** of each metric and the **app JS delta** = median script KiB − `baselineKiB`.
- [ ] Given the results, then the script writes:
  - a markdown table to `$GITHUB_STEP_SUMMARY` when that variable is set, otherwise to stdout. Columns: route, LCP, CLS, TBT, Perf, A11y, Script KiB, Δ vs baseline, budget status;
  - every Lighthouse JSON plus a `perf-summary.json` (per run and median) to an output directory (`--out`, default `.lighthouse/`), which is git-ignored.
- [ ] **Budget gate:** if any route's median app JS delta is over `appBudgetKiB`, the script prints `FAIL <route>: +X KiB > 50 KiB budget` and **exits 1**; otherwise it exits 0. LCP/CLS/TBT/perf/a11y never affect the exit code (owner decision 1).
- [ ] If Lighthouse fails for a route (crash, `NO_FCP`, timeout of 120 s per run) or the server is unreachable, then that route is **FAIL** with the error, and the exit is 1. A missing measurement never passes silently.

**CI**

- [ ] Given `.github/workflows/verify.yml`, then after the `check:redirects` step it adds a **Lighthouse** step that:
  - runs on the same built app on port 3100, reusing the started server or a fresh `pnpm start` with the same readiness rule;
  - uses the runner's Chrome, or `browser-actions/setup-chrome` pinned to a version, recorded;
  - runs `pnpm perf:report --base http://localhost:3100 --out .lighthouse`;
  - uploads `.lighthouse/` with `actions/upload-artifact` (pinned major) as `lighthouse-report`, with `if: always()` so failing runs keep their evidence.

  The workflow keeps `permissions: contents: read`: no PR comment, no write permissions (owner decision 2).
- [ ] Given a PR, then the `verify` run's **job summary** shows the table. A deliberately oversized client import on a scratch branch makes the step fail with the route and the overage. This is recorded in the PR, and the scratch branch is deleted.

**Docs**

- [ ] Given the change, then:
  - `AGENTS.md` §7 lists `pnpm perf:report`, and §9 says the CI JS-budget gate blocks while experience metrics stay manual evidence;
  - ADR 0006 Consequences note that F-08 enforces the app budget in CI from `data/perf-budget.json`;
  - `06-architecture.md` (Testing & quality) mentions the CI report.

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
| app | config | `package.json` (`perf:report`; `lighthouse` pinned 12.8.2 as a dev dependency), `.gitignore` (`.lighthouse/`), `pnpm-workspace.yaml` (only if Lighthouse needs `allowBuilds`) |
| app | CI | `.github/workflows/verify.yml` (Lighthouse step, artifact) |
| app | docs | `AGENTS.md`, `README.md` |
| context | docs | `AGENTS.md` §7/§9 rows (via `/mark-implemented`), `docs/adr/0006-*.md` (Consequences note), `docs/context/06-architecture.md` (Testing & quality) |

### Golden-rule checks

- **Rule 8 (budget):** app JS ≤ baseline + 50 KiB per listed route, enforced in CI. The experience metrics are reported, and the manual evidence stays binding.
- **Rule 14 (consent):** measured with no consent cookie (ADR 0006 method).
- **Rule 15 (secrets):** no tokens; read-only workflow permissions.

### Dependencies & Risks

- **Depends on:** F-03 (the `verify` workflow), F-07 (the CI server lifecycle, reused), and ADR 0006 (the baseline and method).
- **Blocked by questions:** none.
- **Risks:**
  - **Chrome on runners:** if the runner image's Chrome changes, scores drift. The Chrome version is recorded in the summary, and only the JS size gates.
  - **Script transfer size includes headers** (about 0.3 KiB per request, accepted in ADR 0006). A Next upgrade changes the baseline, so the upgrade PR must update `perf-budget.json` (ADR 0006 reconsideration trigger).
  - **CI time:** 3 runs × 2 routes add about 2–3 minutes. More routes later scale it; revisit (e.g. 1 run per route for the gate) if it exceeds 10 minutes.

### Manual Verification Plan

**Scenario:** given the PR, when `verify` runs, then the job summary shows the table for `/` and `/en/` and the artifact exists. Given a scratch branch with an oversized import, when `verify` runs, then the Lighthouse step fails, naming the route and the overage.

**Seed needs:** none.

**Steps:**

1. Run `pnpm lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build` and `check:redirects`.
2. **Local run:** `pnpm start -p 3100`, then `pnpm perf:report` with the arm64 Node used for Lighthouse here (`.claude/rules/verification-patterns.md`). Expected: the table prints; Script ≈ 148.1 KiB, Δ ≈ +13.8 KiB for both routes; exit 0; the `.lighthouse/` files exist.
3. **Gate, locally:** a temporary `"use client"` island importing a large library (or `data/perf-budget.json` with `appBudgetKiB: 5`) → exit 1 with `FAIL / …`. Revert.
4. **Failure handling:** a route that doesn't exist in `perf-budget.json` (e.g. `/khong-co/`, which 404s but paints) is still measured. With the server stopped → every route FAILs, exit 1.
5. **CI:**
   - the PR's `verify` run shows the summary table and the `lighthouse-report` artifact (link recorded);
   - a scratch branch with the oversized import gives a failing run (link recorded), and the branch is deleted.
6. Record the CI runtime added by the step.

**Validation commands:** `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build`, `check:redirects`, `perf:report`. No consent change; no automated tests (ADR 0004).

### Implementation Hints

- Run Lighthouse through its Node API (`lighthouse` package + `chrome-launcher`) or the CLI with `--output=json --quiet --chrome-flags="--headless=new"`; pin the package version.
- In CI, Node is x64 on an x64 runner, so the local arm64 caveat doesn't apply there.
- `GITHUB_STEP_SUMMARY` is a file path: append the markdown.
- Reuse the F-07 step's server, or factor a small `scripts/ci/start-server.sh` with the readiness logic, if both steps need it.

### Related

- Roadmap: `docs/context/10-roadmap.md` F-08.
- ADRs: 0006 (budget split, measurement method), 0004 (scripts, not test suites).
- Rules: `.claude/rules/verification-patterns.md`.
- Specs: `feature-f03-i18n-routing.md` (`verify` workflow), `feature-f07-legacy-redirects-check.md` (CI server lifecycle).
