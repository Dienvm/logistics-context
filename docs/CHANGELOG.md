# Changelog

Cross-repo digest of implemented specs (context workspace + `43logistics.vn` app). Added by `/mark-implemented`; newest first.

## 2026-10-21 — Untrack secrets and strip the demo template

- Spec: [specs/feature-f00-security-template-cleanup.md](../specs/feature-f00-security-template-cleanup.md) · Roadmap: F-00
- Implementation PR: https://github.com/Dienvm/43logistics.vn/pull/1 (afff9ab)
- Owner: app
- Summary: the template's tracked `.env` and demo code (Clerk and PostHog on public pages, todo/auth/marketing routes, Stripe env) are gone; gitleaks runs in CI and pre-commit, and the site is a private `noindex` placeholder.
