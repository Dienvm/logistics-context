---
paths:
  - "43logistics.vn/**/*.{ts,tsx}"
---

# Module structure (feature modules + clean architecture)

Decision: ADR 0005. The app is organised by **business module**, and each module is layered. `app/` is a thin routing layer.

## Top level

```
43logistics.vn/
├── app/            # Next.js routes only: page.tsx, layout.tsx, route.ts, metadata. No business logic.
├── modules/<name>/ # one folder per business capability (list below)
├── shared/         # code with no business meaning: ui (shadcn), lib, config, hooks, i18n, types
├── db/             # client.ts (server-only), schema.ts (re-exports module schemas), migrations/
├── messages/       # vi.json, en.json
├── data/ scripts/  # build/runtime inputs and one-off scripts
└── proxy.ts        # after F-01
```

## Modules

| Module | Owns (tables / features) |
| --- | --- |
| `routes` | `routes`, `route_translations`: the shipping-lane registry. Not Next.js routes |
| `pricing` | `route_rates`, price engine (chargeable weight, bands), eligibility rule, RateTable, QuoteCalculator |
| `content` | `pages`, `posts`, `categories`, `faqs`, `menu_items`, `testimonials` + translations, block renderers |
| `goods` | `goods_rules` + translations, prohibited-goods page |
| `leads` | `leads`, lead form, sales notification |
| `contact` | `contact_events`, `/go/[channel]`, channel URL builders |
| `media` | `media` + translations, Supabase Storage uploads |
| `settings` | `site_settings`: company, offices, hours, offers |
| `seo` | metadata builder, JSON-LD builders, sitemap, `redirects` + the CSV loader |
| `tracking` | consent, `dataLayer` fan-out, PostHog, server-side conversions |
| `auth` | `profiles`, `requireRole`, Clerk webhook |

Add a module only for a new business capability, and record it in this table in the same change.

## Inside a module

```
modules/pricing/
├── domain/          # pure TypeScript: types, rules, calculations. No React/Next/Drizzle/Zod/IO.
├── application/     # use cases + Zod input schemas (schemas must be client-safe)
├── infrastructure/  # server-only: schema.ts (Drizzle tables), repositories, cached queries, external APIs
├── ui/              # components (server by default; client islands marked "use client")
├── actions.ts       # "use server" entry points: validate → use case → invalidate tags
├── constants.ts     # cache tags, event names, limits for this module
├── index.ts         # public SERVER API (starts with `import "server-only"`)
└── client.ts        # public CLIENT-SAFE API: client components, schemas, domain types
```

Create only the folders a module needs. A module with one query doesn't need `application/`.

## Dependency rule (arrows point inward only)

```
app/ ──► modules/*/index.ts | client.ts ──► ui ──► application ──► domain
                                                    infrastructure ──► domain
```

- `domain/` imports nothing outside itself except `shared/types`.
- `application/` may call `infrastructure/` and `domain/`, never `ui/` or Next APIs (except `after()` for side effects).
- `infrastructure/` is the only layer that touches `db/`, Supabase, Clerk server SDK and external APIs. Every file starts with `import "server-only"`.
- `ui/` server components read data through the module's own queries; client components receive data as props or call actions.
- **Pragmatic clean architecture:** don't add interfaces, ports or DI containers until a second implementation exists. Plain functions with typed inputs and outputs are enough.

## Cross-module imports

- Import another module only through its entry point: `@/modules/routes` (server) or `@/modules/routes/client` (client). Never deep-import `@/modules/routes/infrastructure/...`.
- No cycles. If two modules need each other, the shared part belongs to the lower module (e.g. `routes` → `pricing`, never back), or to `shared/` if it has no business meaning.
- `shared/` never imports from `modules/`.

## `app/` stays thin

A page does at most: read `params`, call module entry points, compose module UI, export `generateMetadata` (via `modules/seo`). If a page needs a loop, a calculation or a query, that code belongs in a module.
