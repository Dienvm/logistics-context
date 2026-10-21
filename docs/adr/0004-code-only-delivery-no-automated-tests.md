# ADR 0004 — Code-only delivery: no automated tests in the initial build phase; open questions don't block code

- Status: Accepted (2026-10-21) · Amended by ADR 0006 (2026-10-21): JS budget = framework baseline + ≤ 50 KB gz app JS
- Amends: ADR 0002 §4 (accessibility checked with axe in Playwright) and the Vitest + Playwright test harness assumed by ADR 0002 / `AGENTS.md` §3; ADR 0003 (spec → implement workflow: test-first `/implement`, test plans in `/feature-bug`, regression tests in `/fix-implement`)
- Owner repo: both
- Context: The owner wants the new site built quickly, as code only (proposal `docs/proposals/nextjs-rebuild-quynam-pattern.md` §7; owner instruction 2026-10-21: "bỏ qua unit test và end to end test, không triển khai test trong giai đoạn này"). The existing rules required Vitest unit tests, Playwright e2e tests, axe in Playwright, test-first implementation and regression tests for every fix. Separately, 22 owner questions in `11-open-questions.md` are open. The owner will answer them later and doesn't want them to stop development.

## Decisions

1. **No automated test suites in the initial build phase.** No Vitest, no Playwright, no `tests/` folder, no `test` / `test:e2e` scripts, and no test jobs in CI. "Initial build phase" means roadmap Phases 0–5 (F-*, S-*, A-*, C-*, T-*, L-*) up to and including go-live (L-02). Reintroducing tests later needs a new ADR.
   - The exemption is defined **by purpose**. It removes test suites that exercise app behaviour. It does **not** remove security and quality scripts that check the repo or a running build:
     - gitleaks secret scanning (F-00);
     - `i18n:check` VI/EN key parity (F-03, `08-i18n.md`);
     - `check:redirects` (F-07);
     - Biome and `tsc`.
2. **The verification floor for every app PR:**
   - `pnpm lint` (Biome) + `pnpm typecheck` + `pnpm build` must pass. Before F-01 these are `lint` = `biome lint .` and `type-check`; they become `biome check .` and `typecheck` in F-01.
   - From F-03: `pnpm i18n:check`. From F-07: `pnpm check:redirects` against the candidate build on **every** app PR (routing, locale or proxy changes can break redirects without touching the CSV). Record status, destination and one-hop results.
   - gitleaks in pre-commit and CI (F-00).
   - Manual checks recorded in the PR description:
     - 360 / 768 / 1280 px;
     - a keyboard pass and reduced motion;
     - a manual **axe DevTools** (browser extension) scan at 360 and 1280 px with zero serious/critical issues (this replaces axe-in-Playwright);
     - the Rich Results Test or a schema validator for new page types;
     - i18n: missing-translation behaviour, the language switch landing on the equivalent page, and locale-specific validation messages, when the change has UI strings.
   - **Performance evidence** (rule 8) for changed public pages, measured on mobile with consent rejected:
     - recorded LCP, CLS and INP (Lighthouse + a manual interaction, or the Web Vitals extension);
     - the initial first-party JS transfer total (gz), framework included.
     - A budget failure blocks the PR. Since F-08 (owner decision 2026-10-21), CI **blocks automatically on the JS budget** (`data/perf-budget.json`) and only **reports** LCP/CLS/TBT and the scores. The recorded per-PR measurements stay the binding evidence for those.
   - **Consent matrix** (rule 14, `05-seo-and-tracking.md` "Consent"). It is run in S-13 and repeated whenever a change touches consent, tracking, `proxy.ts` or lead processing. It covers:
     - initial state (no GTM/PostHog/ad requests, no `43l_attr`);
     - accept all, and selective grants (analytics only / ads only);
     - withdrawal (tags stop, `43l_attr` deleted);
     - reload and navigation keep the choice;
     - cookies and storage per state;
     - server-side conversions sent only with ads consent, and queued events dropped when consent is denied or withdrawn.
3. **Testable-by-design code.** Price logic (S-03), URL/slug, metadata and JSON-LD builders, the redirect loader and Zod schemas stay pure, typed functions with no framework imports. That way tests can be added later without refactoring.
4. **Specs carry a "Manual verification plan" instead of a "Test / Fixture plan".** It names the concrete steps, URLs and expected results a reviewer follows to confirm each acceptance criterion. Acceptance criteria are written as observable behaviour, not as "unit tests for …" or "(e2e)". The implementer runs the plan and records the results. The reviewer (`/code-review`) checks that the evidence is there. The owner is the final reviewer in L-01.
5. **Open questions don't block code.** There are three gates:
   - **Code complete (never blocked by an owner question).** When a task needs an owner fact that isn't confirmed, it still ships. It shows nothing, or a clearly marked placeholder (`AGENTS.md` rule 1 is unchanged: no invented facts), behind data flags (`is_verified`, `approved_at`, empty settings). Integrations that need owner decisions are built switched off. The task's PR and final report end with an **"Outstanding owner questions"** list of the Q-IDs it depends on. The owner fills those in later through `11-open-questions.md` / the admin.
   - **Feature activation.** A switched-off integration or flag is turned on only once its questions are answered, e.g.:
     - ad tags / conversions: Q-13, Q-20;
     - PostHog: Q-20;
     - lead notifications: Q-14;
     - tracking page: Q-18, Q-24(c).
   - **Launch (L-01/L-02).** Requires answers behind every published fact (prices, addresses, hours, legal lines: Q-01…Q-04, Q-06) and the operational and privacy decisions:
     - hosting/DNS (Q-15);
     - data retention (Q-17);
     - vendor/transfer assessment (Q-20).
     - Credentials and security blockers (e.g. F-00 key rotation) still stop work immediately, as `AGENTS.md` §6 says.

## Alternatives considered

- **Keep the full harness** (Vitest + Playwright + axe in CI), as in ADR 0002. Rejected by the owner: they prefer faster initial delivery.
- **Tests only for the price engine** (about 20 Vitest cases for S-03). Offered in the proposal as a middle ground, because a wrong price is the most damaging bug on this site. The owner chose no tests at all in this phase. The pure-function rule (Decision 3) keeps this cheap to add later.
- **Keep e2e only for redirects and `/go/[channel]`.** Rejected for the same reason. Redirects stay covered by the `check:redirects` script.
- **Block tasks until owner questions are answered.** Rejected: most code (layout, price engine, DB, admin) doesn't depend on the answers. The data flags and the activation/launch gates (Decision 5) already prevent unconfirmed facts from going live.

## Consequences

- **Delivery speed is an expectation, not a measured gain.** Skipping test setup and test writing should shorten the initial build. In exchange, manual verification becomes a **recurring** cost:
  - every PR and every fix repeats its checks;
  - regressions are found later and take longer to diagnose.
  - **Review trigger:** revisit this ADR before L-01, or earlier if two regressions reach `main` in the same area.
- **Regression risk is higher.** Price calculation, consent gating, `/go/[channel]` logging and the lead form are not checked automatically. Mitigations: the manual verification plan and consent matrix (Decision 2), Codex review in `/code-review`, and full manual QA in L-01 (`09-migration.md` step 7).
- **Prices need two separate pieces of launch evidence.**
  1. **Inputs:** every published rate is approved by staff in the admin (`is_verified`, A-02).
  2. **Calculation:** the S-03 worked examples (incl. US 1.3 kg → 1.5 kg, the SG 5/6 kg band edge, volumetric > actual, open-ended and contact-for-price bands) are worked out by hand for each route and match the calculator and rate tables.
  - `is_verified` alone doesn't prove the calculation is right.
- **Performance budget unchanged** (`AGENTS.md` rule 8). F-08 Lighthouse CI gates the app-JS budget per listed route and reports the experience metrics; the recorded per-PR evidence (Decision 2) stays binding for LCP/CLS/INP and the scores.
- **Accessibility:** WCAG 2.2 AA (rule 10) is still required. Checking it is manual (axe DevTools + keyboard), so it depends on reviewer discipline.
- **SEO:** the automated "SEO checks in CI" (1 H1, canonical, reciprocal hreflang, JSON-LD parses) become manual checks per page type. `check:redirects` runs on every PR from F-07.
- **i18n:** `i18n:check` stays in CI. Translation behaviour (fallbacks, the language switch, localized errors) is checked by hand.
- **Consent/PDP law:** no change to the rules. Verification is the consent matrix in Decision 2.
- **Cost/ops:** no new tools. CI (F-08) is lint + typecheck + build + gitleaks + `i18n:check` + `check:redirects` + the Lighthouse JS-budget gate with its report. The recurring cost is people's time: the implementer runs the plan, Codex/Claude reviews it, and the owner does L-01.
- **Process:** `AGENTS.md` §3/§6/§7/§8/§9, `06-architecture.md` "Quality harness", `10-roadmap.md` acceptance criteria and the `/implement`, `/feature-bug`, `/fix-implement`, `/code-review`, `/lesson` and `/mark-implemented` skills are updated in the same change set. `specs/` is empty, so no existing spec needs rewriting.
- Follow-up roadmap IDs: F-00, F-01, F-03, F-06, F-07, F-08, S-02, S-03, S-07, S-08, S-10, S-13, A-02, L-01.
