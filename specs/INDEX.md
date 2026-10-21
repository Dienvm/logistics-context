# Specs index

Implementation commitments for the 43logistics.vn app. Created by `/feature-bug`, and each spec is tied to a roadmap ID in `docs/context/10-roadmap.md`.

Status moves `draft → approved → in_implementation → implemented`. Only `/mark-implemented` sets `implemented`.

In the initial build phase specs carry a **Manual Verification Plan** instead of a Test / Fixture plan, and list unconfirmed owner facts in `blocked_by_questions` as placeholders, not blockers (ADR 0004).

| Date | Type | File | Title | Roadmap | Owner | Status |
|------|------|------|-------|---------|-------|--------|
| 2026-10-21 | feature | [feature-f06-proxy-composition.md](feature-f06-proxy-composition.md) | Compose proxy.ts for gone, legacy, attribution and admin | F-06 | both | draft |
| 2026-10-21 | feature | [feature-f04-database-schema-seed.md](feature-f04-database-schema-seed.md) | Create the Supabase schema, migrations and seed | F-04 | both | in_implementation |
| 2026-10-21 | feature | [feature-f03-i18n-routing.md](feature-f03-i18n-routing.md) | Add next-intl locale routing with VI root and /en | F-03 | both | implemented |
| 2026-10-21 | feature | [feature-f02-tokens-and-theme.md](feature-f02-tokens-and-theme.md) | Generate the token theme and move to Tailwind v4 | F-02 | both | implemented |
| 2026-10-21 | feature | [feature-f01-upgrade-and-harness.md](feature-f01-upgrade-and-harness.md) | Upgrade to Next 16 and adopt the module layout | F-01 | both | implemented |
| 2026-10-21 | feature | [feature-f00-security-template-cleanup.md](feature-f00-security-template-cleanup.md) | Untrack secrets and strip the demo template | F-00 | app | implemented |
