---
paths:
  - "43logistics.vn/**/*.{ts,tsx,json}"
---

# Naming conventions

| Thing | Convention | Example |
| --- | --- | --- |
| Files and folders | `kebab-case` | `rate-table.tsx`, `use-quote-estimate.ts` |
| Module folders | singular or plural noun as in `module-structure.md` | `pricing`, `leads`, `routes` |
| React components | `PascalCase`, same name as the file | `RateTable` in `rate-table.tsx` |
| Hooks | `useX` in `use-x.ts` | `useConsent` |
| Server Actions | verb + noun + `Action` | `submitLeadAction`, `updateRateAction` |
| Use cases (`application/`) | verb + noun | `quoteShipment`, `createLead` |
| Queries (`infrastructure/`) | `get…` / `list…` / `find…` (find may return `null`) | `getRouteBySlug`, `listActiveRoutes` |
| Pure domain functions | verb describing the result | `getChargeableWeight`, `pickRateBand` |
| Booleans | `is` / `has` / `can` / `should` | `isVerified`, `hasPublicPrices` |
| Zod schemas | noun + `Schema` | `leadInputSchema` |
| Types | `PascalCase`, no `I`/`T` prefix | `Route`, `QuoteResult`, `LeadFormProps` |
| Constants | `SCREAMING_SNAKE` for primitives, `camelCase` for builders | `MAX_WEIGHT_KG`, `routeTag(key)` |
| Cache tags | `entity:{id}` | `route:sg`, `page:123`, `settings`, `menu` |
| Tracking events | `snake_case` verbs from `05-seo-and-tracking.md` | `contact_click`, `calculate_quote`, `generate_lead` |
| DB tables / columns | `snake_case`, plural tables | `route_rates.weight_min_kg` |
| Message keys | `namespace.camelCase`, namespace = component or page | `leadForm.submit`, `rateTable.updatedAt` |
| URL slugs | lowercase, no diacritics, keyword-first | `/gui-hang-di-singapore/` |

- Name by **business meaning** in English in code (`route`, `rate`, `lead`), and use the Vietnamese terms only in copy (`ui-terminology.md`).
- Avoid vague names: `data`, `info`, `item`, `handle`, `utils2`, `helpers`. Say what it is.
- `routes` is the shipping-lane module. Use "page"/"URL" for Next.js routes in names to avoid confusion.
