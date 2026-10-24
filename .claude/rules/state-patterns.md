---
paths:
  - "43logistics.vn/**/*store*.ts"
  - "43logistics.vn/**/stores/**/*.ts"
  - "43logistics.vn/**/*query*.ts"
  - "43logistics.vn/**/*queries*.ts"
  - "43logistics.vn/app/admin/**/*.tsx"
  - "43logistics.vn/**/*-provider.tsx"
---

# State patterns (Zustand + TanStack Query; no Redux)

Pick the smallest tool that fits. Context: `06-architecture.md` "State management rules", `AGENTS.md` §3.

| Need | Use |
| --- | --- |
| Data to render a public page | Server Component + cached query (no client state at all) |
| Form submission | Server Action + `useActionState` |
| Filters/pagination visible in the URL | `searchParams` (shareable, SEO-safe) |
| Local UI state of one component | `useState` / `useReducer` |
| UI state shared by distant components (mobile nav, calculator inputs, consent, dismissed banners) | **Zustand** |
| Async server data in admin screens | **TanStack Query** (admin; see the one exception below) |

## Zustand

- One small store per concern, in `modules/<m>/ui/stores/` (or `shared/stores/` if generic): `use-consent-store.ts` → `useConsentStore`.
- State + actions in one typed object; **never put server data in Zustand** (no copies of routes, rates or leads).
- Read with selectors (`useConsentStore((s) => s.analytics)`), never the whole store, to avoid re-renders.
- `persist` only for consent and dismissed banners; version the persisted shape, and never persist personal data.
- SSR-safe: hydrate persisted state on the client only; render a neutral state on the server (no hydration mismatch, no CLS).

## TanStack Query (admin, plus one exception)

- `QueryClientProvider` (`shared/lib/query-provider.tsx`) lives in `app/admin/(shell)/layout.tsx`, not the admin root layout: one `QueryClient` per mounted shell, so sign-in, 403 and 404 carry no TanStack Query (A-01).
- **Only exception** (`AGENTS.md` §3, `06-architecture.md`): the calculator island, **if** it ever needs live data instead of build-time rates. That needs a spec, and its JS cost is measured against the 50 KB gz app budget (ADR 0006). No other public page ships TanStack Query.
- Query keys come from a factory per module: `leadKeys.list(filters)`, `leadKeys.detail(id)`. No inline arrays.
- Fetchers call `/api/admin/*` route handlers, which call `requireRole`.
- Mutations go through Server Actions; on success, `invalidateQueries` with the module's key factory.
- Set sensible `staleTime` (admin lists: 30 s) instead of refetching on every focus.
