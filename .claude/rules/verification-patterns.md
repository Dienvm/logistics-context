---
paths:
  - "43logistics.vn/**/*.{ts,tsx}"
  - "specs/**/*.md"
---

# Verification patterns (replaces testing-patterns: no test suites, ADR 0004)

The initial build phase has **no Vitest, Playwright or `tests/` folder**. Don't add them, even when a skill template mentions tests. Quality comes from small typed pure code plus recorded manual checks.

## Write code that is easy to verify (and to test later)

- Business logic lives in `modules/<m>/domain/` as pure functions with typed inputs and outputs, and no React/Next/Drizzle imports. Examples: price engine, slug/URL builders, metadata and JSON-LD builders, the redirect loader, eligibility rules.
- Each pure function has worked examples in its spec (input → expected output). Keep them in a doc comment above the function only if they clarify an edge case (e.g. `1.3 kg → 1.5 kg` for US rounding).
- Zod schemas are the validation contract; parse at every boundary.

## The verification floor for every app change

1. `pnpm -C 43logistics.vn lint`, then `type-check` (`typecheck` after F-01), then `build`. All must pass.
2. `pnpm i18n:check` (from F-03) and `pnpm check:redirects` (from F-07, on every PR).
3. The spec's **Manual Verification Plan**, with the observed result per AC (URL, viewport, what you saw).
4. UI changes:
   - 360 / 768 / 1280 px;
   - keyboard pass;
   - `prefers-reduced-motion`;
   - axe DevTools (or axe-core injected via CDP) at 360 and 1280 px with 0 serious/critical issues.
5. Changed public pages: Lighthouse mobile scores, LCP/CLS/INP and the initial first-party JS (gz) with consent rejected. A budget miss blocks the PR.
6. Consent, tracking, `proxy.ts` or lead changes: re-run the consent matrix (ADR 0004 Decision 2).
7. Record everything in the PR "Verification" section. Never claim a check you didn't run; write "not available — reason".

## Local tooling notes (this machine)

- Lighthouse needs the arm64 Node: `~/.nvm/versions/node/v20.19.4/bin/npx lighthouse …`.
- Headless Chrome can't go below about 500 px wide with `--window-size`. For a true 360 px viewport, use CDP `Emulation.setDeviceMetricsOverride`.
- Serve the production build for checks (`pnpm build && pnpm start -p 3100`), not `pnpm dev`.
