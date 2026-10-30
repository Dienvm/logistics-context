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
├── messages/       # vi.json, en.json (stay at the app root; shared/i18n holds routing, request config, navigation, locale helpers)
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
| `tracking` | consent, `dataLayer` fan-out, the consent-gated Cloudflare Web Analytics beacon (ADR 0010), server-side conversions, the shared traffic-source derivation (pure + SQL) |
| `auth` | `profiles`, `requireRole`, Clerk webhook |
| `analytics` | No tables: the A-07 contact report, composed from the `leads` and `contact` weekly counts |
| `indexnow` | No tables: IndexNow pings after admin saves and `/indexnow-key.txt` (G-04). Sits below `content`, `pricing`, `goods` and `routes`, whose actions call it: it reads their tables through `db/schema` (like `media`'s usage scan) and imports only `content/client` (indexability rule) and `seo/client` (origin check) |

Add a module only for a new business capability, and record it in this table in the same change.

## Inside a module

```
modules/pricing/
├── domain/          # pure TypeScript: types, rules, calculations. No React/Next/Drizzle/Zod/IO.
├── application/     # use cases + Zod input schemas (schemas must be client-safe)
├── infrastructure/  # server-only (except schema.ts): schema.ts (Drizzle tables), repositories, cached queries, external APIs
├── ui/              # components (server by default; client islands marked "use client")
├── actions.ts       # "use server" entry points: validate → use case → invalidate tags
├── constants.ts     # cache tags, event names, limits for this module
├── index.ts         # public SERVER API (starts with `import "server-only"`)
└── client.ts        # public CLIENT-SAFE API: client components, schemas, domain types
```

Create only the folders a module needs. A module with one query doesn't need `application/`.

## Allowed imports (the dependency rule)

Business logic stays in the centre: `domain` depends on nothing, and frameworks live at the edges.

| From ↓ may import → | own `domain` | own `application` | own `infrastructure` | own `ui` | other module | `shared/*` | `db/client` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `domain/` | ✅ | ❌ | ❌ | ❌ | `client.ts` types only (`import type`) | `shared/types`, `shared/i18n` types only | ❌ |
| `application/` | ✅ | ✅ | ✅ | ❌ | `index.ts` / `client.ts` | ✅ (no `shared/ui`) | ❌ |
| `infrastructure/` (non-schema) | ✅ | ❌ | ✅ | ❌ | `index.ts` | ✅ (no `shared/ui`) | ✅ |
| `infrastructure/schema.ts` | types only | ❌ | own schema files | ❌ | other modules' `infrastructure/schema.ts` (tables only, see below) | ❌ | ❌ |
| `ui/` server component | ✅ | ✅ | queries only | ✅ | `index.ts` / `client.ts` | ✅ | ❌ |
| `ui/` client component (`"use client"`) | ✅ | client-safe schemas only | ❌ | client components only | `client.ts` | ✅ | ❌ |
| `actions.ts` | ✅ | ✅ | ❌ (go through a use case) | ❌ | `index.ts` | ✅ | ❌ |
| `constants.ts` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

Every layer may import its own module's `constants.ts`.

- **`server-only`:** every `infrastructure/` file except `schema.ts`, every module `index.ts` and `db/client.ts` start with `import "server-only"`. Schema files are declarative tables with no secrets and must stay loadable by `drizzle-kit` in plain Node, where `server-only` throws.
- **Database relationships vs runtime dependencies.** Foreign keys follow the data, not the module graph. A schema file may import the **table objects** from another module's `infrastructure/schema.ts` (e.g. `pricing` → `routes` for `route_rates.route_id`, and `content` ↔ `routes` page/route links). That is the only allowed deep import. Drizzle `relations()` are composed in one place, `db/schema.ts`, so schema files never import each other in a cycle.
- **Runtime cycles are forbidden.** Allowed runtime direction for the initial modules:
  - `pricing` → `routes`;
  - `content` → `routes`, `goods` → `routes`;
  - `seo` → `routes`, `content`, `settings`, `goods`;
  - `content`, `pricing`, `goods`, `routes` (actions) → `indexnow` → `content/client`, `seo/client` (pure entries only);
  - `leads` → `routes`, `tracking`, `content` (the privacy policy version, A-03); `contact` → `settings`, `tracking`.
  - `auth` is used by any admin action.

  If two modules need each other at runtime, move the shared part to the lower module or `shared/`.
- **Pragmatic clean architecture:** no DI container and no interface per repository. Add a small port (a function type the use case receives) only when a second implementation or an external system needs swapping (e.g. tracking provider, notifications channel Q-14).

## Cross-module imports

- Outside the schema exception, import another module only through its entry point: `@/modules/routes` (server) or `@/modules/routes/client` (client). Never deep-import `@/modules/routes/infrastructure/...` or use relative paths that climb into another module (`../../routes/...`).
- Never re-export server code from `client.ts`, and never import `index.ts` from a client file. A barrel that mixes both would pull server code into the client bundle.
- `shared/` never imports from `modules/`.

## `app/` stays thin

A page does at most: read `params`, call module entry points, compose module UI, export `generateMetadata` (via `modules/seo`). If a page needs a loop, a calculation or a query, that code belongs in a module.
