# Changelog

Cross-repo digest of implemented specs (context workspace + `43logistics.vn` app). Added by `/mark-implemented`; newest first.

## 2026-10-22 — Create the Supabase schema, migrations and seed

- Spec: [specs/feature-f04-database-schema-seed.md](../specs/feature-f04-database-schema-seed.md) · Roadmap: F-04
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/6 (2f5109c); context: https://github.com/Dienvm/logistics-context/pull/13, https://github.com/Dienvm/logistics-context/pull/14, https://github.com/Dienvm/logistics-context/pull/25
- Owner: both
- Summary: all 25 tables from `07` as Drizzle module schemas with RLS on and no policies, one baseline migration, and an idempotent `pnpm db:seed` that loads legacy data unverified and as drafts.
  - Verified on the owner's Supabase project in `ap-southeast-1`: `anon`/`authenticated` read 0 rows and can't insert; the app's transaction-pooler connection reads all 10 routes.

## 2026-10-21 — Add Lighthouse report and JS budget gate to CI

- Spec: [specs/feature-f08-ci-lighthouse-budget.md](../specs/feature-f08-ci-lighthouse-budget.md) · Roadmap: F-08
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/9 (6a6fd96); context: https://github.com/Dienvm/logistics-context/pull/19, https://github.com/Dienvm/logistics-context/pull/20
- Owner: both
- Summary: the `verify` workflow now runs `pnpm perf:report`, with 3 cold Lighthouse mobile runs per route in `data/perf-budget.json` and consent rejected.
  - It fails the PR when the median app JS exceeds the 134.3 KiB baseline + 50 KiB (ADR 0006); LCP/CLS/TBT and scores are reported only.
  - The job summary shows the table and the `lighthouse-report` artifact uploads on every run.
  - Today: +13.9 KiB on `/` and `/en/`. An oversize canary (+110.6 KiB) failed the gate as expected.

## 2026-10-21 — Generate legacy redirects from the CSV and check them

- Spec: [specs/feature-f07-legacy-redirects-check.md](../specs/feature-f07-legacy-redirects-check.md) · Roadmap: F-07
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/8 (0822424); context: https://github.com/Dienvm/logistics-context/pull/17, https://github.com/Dienvm/logistics-context/pull/18
- Owner: both
- Summary: `next.config.ts` `redirects()` is generated from `redirect-map.csv` (80 rules, 301, both slash forms, validated at build), and `?attachment_id=` → `/` is added to the proxy.
  - `pnpm check:redirects` runs in CI on every PR: 0 FAIL, with 103 redirects pending only on unbuilt destination pages.
  - `--strict` at L-01 and the host run at L-02; uploads and attachment slugs belong to A-04.

## 2026-10-21 — Compose proxy.ts for gone, legacy, attribution and admin

- Spec: [specs/feature-f06-proxy-composition.md](../specs/feature-f06-proxy-composition.md) · Roadmap: F-06
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/7 (297f784); context: https://github.com/Dienvm/logistics-context/pull/15, https://github.com/Dienvm/logistics-context/pull/16
- Owner: both
- Summary: `proxy.ts` runs one pure planner:
  - 410 for retired WordPress paths;
  - `/admin` 404 until F-05;
  - one redirect combining the legacy `?page_id`/`?p` (21 sourced IDs), the locale prefix and the trailing slash, which fixes F-03's `/vi` two-hop;
  - then next-intl, with `43l_attr` set only under the new `43l_consent` contract (HttpOnly, hostname-only referrer, byte-capped).

## 2026-10-21 — Add next-intl locale routing with VI root and /en

- Spec: [specs/feature-f03-i18n-routing.md](../specs/feature-f03-i18n-routing.md) · Roadmap: F-03
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/5 (6d1c60e); context: https://github.com/Dienvm/logistics-context/pull/11, https://github.com/Dienvm/logistics-context/pull/12
- Owner: both
- Summary: next-intl 4.14 with VI at `/` and EN at `/en/`. The locale comes from `next/root-params` (the ADR 0006 Cache Components gate passed; both locales are static). There's no locale cookie or detection, and a minimal `proxy.ts`. It adds `pnpm i18n:check` (keys + ICU arguments) and a `verify` CI workflow. Known limits: `/vi` takes 2 hops (F-06), and 404 bodies render after hydration (S-10).

## 2026-10-21 — Generate the token theme and move to Tailwind v4

- Spec: [specs/feature-f02-tokens-and-theme.md](../specs/feature-f02-tokens-and-theme.md) · Roadmap: F-02
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/3 (3f2218f) + Codex-review follow-up https://github.com/Dienvm/43logistics.vn/pull/4 (137560b); context: https://github.com/Dienvm/logistics-context/pull/9
- Owner: both
- Summary: Tailwind 4.3 with a generated `@theme static` (`pnpm tokens` / `tokens:check`), next/font Be Vietnam Pro + Barlow Condensed, 16 token-styled shadcn v4 primitives (44 px targets, full focus ring, transform/opacity motion, reduced motion), dev-only `/dev/tokens/` gallery; `motion` deferred.

## 2026-10-21 — Upgrade to Next 16 and adopt the module layout

- Spec: [specs/feature-f01-upgrade-and-harness.md](../specs/feature-f01-upgrade-and-harness.md) · Roadmap: F-01
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/2 (f4f38d6); context: https://github.com/Dienvm/logistics-context/pull/7
- Owner: both
- Summary: Next 16.4.2/React 19.3.1 with Cache Components; Biome 2, Zod 4 and Node ≥ 22; the ADR 0005 layout enforced by dependency-cruiser; typed env; build inputs moved into the app's `data/`; ADR 0006 (JS budget = framework baseline 134.3 KiB + ≤ 50 KiB app JS).

## 2026-10-21 — Untrack secrets and strip the demo template

- Spec: [specs/feature-f00-security-template-cleanup.md](../specs/feature-f00-security-template-cleanup.md) · Roadmap: F-00
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/1 (afff9ab)
- Owner: app
- Summary: the template's tracked `.env` and demo code (Clerk and PostHog on public pages, todo/auth/marketing routes, Stripe env) are gone; gitleaks runs in CI and pre-commit, and the site is a private `noindex` placeholder.
