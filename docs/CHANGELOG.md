# Changelog

Cross-repo digest of implemented specs (context workspace + `43logistics.vn` app). Added by `/mark-implemented`; newest first.

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
