---
paths:
  - "43logistics.vn/**/use-*.ts"
  - "43logistics.vn/**/use-*.tsx"
  - "43logistics.vn/**/hooks/**/*.{ts,tsx}"
---

# Hook patterns

React state, effect and browser hooks exist only in client code. Server Components call functions instead. **Exception:** next-intl's server-compatible hooks (`useTranslations`, `useLocale`, `useFormatter`) work in non-async Server Components. Use `getTranslations`/`getLocale` in async ones. Don't add `"use client"` just to translate text.

## Where hooks live

| Hook | Location |
| --- | --- |
| Generic, no business meaning (`useMediaQuery`, `useScrollDirection`) | `shared/hooks/` |
| Business-specific (`useQuoteEstimate`, `useConsent`) | `modules/<m>/ui/hooks/` |

File `use-quote-estimate.ts` exports `useQuoteEstimate`. One hook per file.

## Rules

- **A hook wraps behaviour, not markup.** It returns data and callbacks; components render.
- **Keep the logic pure.** Put the calculation in `domain/` (e.g. `estimateQuote()`); the hook only wires state to it, so the logic stays testable later (ADR 0004 Decision 3).
- **No data fetching in public-site hooks.** Public pages get data from Server Components as props. TanStack Query hooks exist in admin, plus the single documented exception (`state-patterns.md`).
- **Effects are the last resort.** Derive values during render. Use `useEffect` only to sync with something outside React (scroll, `matchMedia`, `dataLayer`), and always return a cleanup.
- Stable dependencies: list every dependency. Don't silence the hooks lint rule; restructure instead.
- Event subscriptions use `useSyncExternalStore` (e.g. scroll position, media queries), which avoids tearing and SSR mismatches.
- **SSR-safe:** never touch `window`/`localStorage` during render; read them in effects or `useSyncExternalStore` with a server snapshot.
- **Reduced motion:** animation hooks check `useReducedMotion()` (`motion`) or `matchMedia("(prefers-reduced-motion: reduce)")`.
- **Tracking:** hooks never push to `dataLayer` or load analytics directly. Call the single fan-out in `modules/tracking` (rule 12), which checks consent.
- Return an object (`{ estimate, isValid }`) when there are more than 2 values; a tuple only for `[value, setValue]` pairs.
