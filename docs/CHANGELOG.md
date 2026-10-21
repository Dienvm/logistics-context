# Changelog

Cross-repo digest of implemented specs (context workspace + `43logistics.vn` app). Added by `/mark-implemented`; newest first.

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
