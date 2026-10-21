# ADR 0002 — Build on the existing app template; reconcile the stack

- Status: Accepted (2026-10-20) · Amended by ADR 0004 (2026-10-21): no Vitest/Playwright/axe-in-Playwright in the initial build phase · Amended by ADR 0005 (2026-10-21): feature modules replace `server/*` and `components/ui` → `shared/ui`
- Amends: ADR 0001 (decisions 1, 3 and the "no second analytics system" rule in `AGENTS.md`)
- Context: ADR 0001 and the first context pack were written as if the app would be scaffolded from scratch (`src/`, ESLint, Tailwind v4, GTM only). The app repo `43logistics.vn/` already exists. It was started from McKay Wrigley's Takeoff template: Next.js ^15.3, Tailwind v3, shadcn/ui, framer-motion, Biome, Clerk, Drizzle 0.33 and PostHog, with root-level folders (`app/`, `components/`, `db/`, `actions/`, `lib/`) and a todo/profile demo. The owner's intended stack is "Next.js 15+, Tailwind CSS, shadcn/ui, Framer Motion, PostgreSQL/Supabase/Drizzle/Server Actions, Clerk, PostHog", built with Cursor, V0 and Perplexity. The docs and the code disagreed on folder layout, linting, analytics, animation and versions.

## Decisions

1. **Keep the template repo and upgrade it in place.** Don't re-scaffold. F-00/F-01 remove the demo code (todos, profiles membership, Stripe env, public sign-up, the `/todo` route).
2. **Next.js 16** is the target ("15+" is satisfied). Next 15 is still in maintenance LTS, so this is a choice, not a forced move. It is the cheapest now, while the app is an almost-empty template, and it gives `proxy.ts`, Cache Components and `updateTag` for the caching model in `06`. The upgrade happens in F-01, after F-00 security work. Cache Components is enabled only after a recorded compatibility check with the installed Clerk and next-intl versions; if that fails, the tag-based caching is implemented with the non-Cache-Components APIs and `06` is amended.
3. **Root-level layout, no `src/`.** The `@/*` alias maps to the app root, which matches `tsconfig.json` and `components.json`. Server code lives in `server/{queries,actions,services}`, the DB in `db/{client.ts,schema/,migrations/}`, and the proxy in `proxy.ts` at the root.
4. **Biome is the primary linter/formatter** (upgraded to Biome 2 with the `next` and `react` domains). It replaces the unused Prettier config. F-01 compares Biome's rules with `@next/eslint-plugin-next` and the React hooks rules. If a needed rule is missing, a narrowly scoped ESLint config runs only those plugins. `pnpm lint` = `biome check` (plus that ESLint pass if added), and `pnpm typecheck` = `tsc --noEmit` (renamed from `type-check`). Accessibility is checked with axe in Playwright, not by lint.
5. **shadcn/ui is the primitive layer** (`components/ui`). It is re-initialised for Tailwind v4 (`tw-animate-css` replaces `tailwindcss-animate`) and restyled only through the tokens from `data/design-tokens.json`. Components that no task needs are deleted, not kept "just in case".
6. **Tailwind v4** with `@theme` generated into `app/theme.css` by `pnpm tokens`. `tailwind.config.ts` is removed.
7. **Motion: CSS first, `motion` (Framer Motion) only in client islands.** Use the `motion` package (`motion/react`, the renamed framer-motion) with `LazyMotion` + `m` components. It is never imported by a Server Component, never animates the LCP element, and is not loaded on route pages unless an island there needs it (JS budget 120 KB gz).
8. **Analytics has two lanes:**
   - **Start small:** at launch, PostHog plus only the ad platform(s) confirmed in Q-13. GTM is the delivery mechanism for those ad tags, not an analytics product of its own.
   - **PostHog** is the product-analytics lane: funnels, route-page behaviour, calculator use. It loads only after analytics consent, is proxied through `/ingest` (Next rewrites) and uses `person_profiles: 'identified_only'`. Public visitors are never identified. Session replay stays off until Q-20 is answered.
   - **GTM** is the advertising lane: Google Ads, Meta and TikTok pixels with Consent Mode v2. Server-side conversion APIs (Meta CAPI, TikTok Events API) stay as in `05-seo-and-tracking.md`.
   - **Shared events:** the `dataLayer` event names in `05` are the canonical event vocabulary, and PostHog captures the same names.
   - GA4 is optional and must not duplicate PostHog funnels (Q-13).
9. **Clerk is staff-only.** `ClerkProvider` mounts only in the `/admin` layout and sign-up is disabled (staff are invited). The template's global provider, `/signup` and the profile-on-every-request call are removed.
10. **Server Action result type:** keep the template's `ActionState<T>` (`isSuccess` discriminant) and extend the failure branch with optional `fieldErrors` for form validation. Don't introduce a second result shape.
11. **Runtime data moves into the app repo.** A standalone app build (e.g. Vercel) cannot read the parent folder. The build/seed inputs `redirect-map.csv`, `design-tokens.json` and `seed/*.json` move to `43logistics.vn/data/` in F-01; `media-inventory.csv` moves with C-04. Seed facts keep `is_verified = false` and are never published unverified. Until then the context copy at `./data/` is canonical. After the move the context copy is deleted and the docs point to the app path.

## Alternatives considered

- **Move to `src/`:** possible without re-scaffolding, but it churns every import, `components.json` and `tsconfig` for no functional gain. Rejected.
- **Stay on Next 15:** avoids an upgrade, but `middleware.ts` is deprecated in 16 and the caching model in the docs (Cache Components, `updateTag`) would need a full rewrite. Rejected.
- **ESLint flat config as the primary linter (per ADR 0001):** ESLint is still supported through its CLI, but Biome is already configured and fast, so running two full linters isn't justified. ESLint is kept only as a fallback for Next-specific rules that Biome lacks.
- **GTM-only analytics (per ADR 0001):** drops PostHog, which the owner explicitly wants. **PostHog-only** loses the ad-platform pixels needed for Phase 4. Both rejected in favour of two lanes.

## Consequences

- F-00 (security + template cleanup) and F-01 (upgrade) block all other tasks. Docs describe the target. AGENTS.md §3 lists the current gap so that agents don't write code against APIs that aren't installed yet.
- Two analytics systems mean two consent integrations and two cookie entries in the privacy policy. Each event is defined once (`lib/tracking/events.ts`) and fanned out to `dataLayer` + PostHog.
- PostHog Cloud stores data outside Vietnam, so cross-border transfer obligations under Law 91/2025/QH15 and Decree 13 apply (Q-20). Consent uses Consent Mode **basic**: no ad or analytics tag loads before consent.
- Template conventions that conflict with the rules (the `<ai_context>` file headers, `npm` in the husky hook, `git add .` in pre-commit) are removed in F-00/F-01. Don't copy them into new files.
