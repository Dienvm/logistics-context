# Specs index

Implementation commitments for the 43logistics.vn app. Created by `/feature-bug`, and each spec is tied to a roadmap ID in `docs/context/10-roadmap.md`.

Status moves `draft → approved → in_implementation → implemented`. Only `/mark-implemented` sets `implemented`.

In the initial build phase specs carry a **Manual Verification Plan** instead of a Test / Fixture plan, and list unconfirmed owner facts in `blocked_by_questions` as placeholders, not blockers (ADR 0004).

| Date | Type | File | Title | Roadmap | Owner | Status |
|------|------|------|-------|---------|-------|--------|
| 2026-10-24 | feature | [feature-a03-pages-and-translations.md](feature-a03-pages-and-translations.md) | Edit pages and their translations from the admin | A-03 | both | in_implementation |
| 2026-10-24 | feature | [feature-a02-routes-rates-editor.md](feature-a02-routes-rates-editor.md) | Edit route rates and route flags from the admin | A-02 | both | in_implementation |
| 2026-10-23 | feature | [feature-s09-about-contact-policies-404.md](feature-s09-about-contact-policies-404.md) | Add the About, Contact, policy and 404 pages | S-09 | both | in_implementation |
| 2026-10-23 | feature | [feature-s08-lead-form.md](feature-s08-lead-form.md) | Add the quote request form to the calculator page | S-08 | both | implemented |
| 2026-10-22 | feature | [feature-s07-calculator-page.md](feature-s07-calculator-page.md) | Build the shipping calculator page | S-07 | both | implemented |
| 2026-10-22 | feature | [feature-s04b-route-page-content.md](feature-s04b-route-page-content.md) | Fill the route pages with the owner's content | S-04b | both | implemented |
| 2026-10-22 | feature | [feature-s06-hubs.md](feature-s06-hubs.md) | Build the outbound and inbound hub pages | S-06 | both | implemented |
| 2026-10-22 | feature | [feature-s04-route-page-template.md](feature-s04-route-page-template.md) | Build the route pages from database data | S-04 | both | implemented |
| 2026-10-22 | feature | [feature-s05b-home-redesign.md](feature-s05b-home-redesign.md) | Redesign the home page with confirmed owner facts and motion | S-05b | both | implemented |
| 2026-10-22 | feature | [feature-s05-home.md](feature-s05-home.md) | Build the home page from database data | S-05 | both | implemented |
| 2026-10-22 | feature | [feature-s03-price-engine.md](feature-s03-price-engine.md) | Add the pure price engine for quotes | S-03 | both | implemented |
| 2026-10-22 | feature | [feature-s02-contact-tracker.md](feature-s02-contact-tracker.md) | Log contact clicks and redirect via /go/[channel] | S-02 | both | implemented |
| 2026-10-24 | feature | [feature-a01-admin-shell.md](feature-a01-admin-shell.md) | Build the role-aware admin shell with sidebar and UserButton | A-01 | both | in_implementation |
| 2026-10-22 | feature | [feature-f05-clerk-staff-auth.md](feature-f05-clerk-staff-auth.md) | Protect /admin with Clerk staff auth and roles | F-05 | both | implemented |
| 2026-10-21 | feature | [feature-s01-site-layout-shell.md](feature-s01-site-layout-shell.md) | Build the site layout shell from database data | S-01 | both | implemented |
| 2026-10-21 | feature | [feature-f08-ci-lighthouse-budget.md](feature-f08-ci-lighthouse-budget.md) | Add Lighthouse report and JS budget gate to CI | F-08 | both | implemented |
| 2026-10-21 | feature | [feature-f07-legacy-redirects-check.md](feature-f07-legacy-redirects-check.md) | Generate legacy redirects from the CSV and check them | F-07 | both | implemented |
| 2026-10-21 | feature | [feature-f06-proxy-composition.md](feature-f06-proxy-composition.md) | Compose proxy.ts for gone, legacy, attribution and admin | F-06 | both | implemented |
| 2026-10-21 | feature | [feature-f04-database-schema-seed.md](feature-f04-database-schema-seed.md) | Create the Supabase schema, migrations and seed | F-04 | both | implemented |
| 2026-10-21 | feature | [feature-f03-i18n-routing.md](feature-f03-i18n-routing.md) | Add next-intl locale routing with VI root and /en | F-03 | both | implemented |
| 2026-10-21 | feature | [feature-f02-tokens-and-theme.md](feature-f02-tokens-and-theme.md) | Generate the token theme and move to Tailwind v4 | F-02 | both | implemented |
| 2026-10-21 | feature | [feature-f01-upgrade-and-harness.md](feature-f01-upgrade-and-harness.md) | Upgrade to Next 16 and adopt the module layout | F-01 | both | implemented |
| 2026-10-21 | feature | [feature-f00-security-template-cleanup.md](feature-f00-security-template-cleanup.md) | Untrack secrets and strip the demo template | F-00 | app | implemented |
