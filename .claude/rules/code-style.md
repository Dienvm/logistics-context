---
paths:
  - "43logistics.vn/**/*.{ts,tsx,js,mjs,css}"
---

# Code style: small, clean, boring

Applies to every file in the app. `AGENTS.md` §4 golden rules and §8 conventions win over anything here.

## Size limits (split before you exceed them)

| Unit | Limit | When over the limit |
| --- | --- | --- |
| File | ≤ 200 lines (components ≤ 150) | Split by responsibility: sub-components, a hook, a pure helper |
| Function / component body | ≤ 40 lines | Extract named steps; one level of abstraction per function |
| Parameters | ≤ 3 positional | Pass one typed object (`{ routeKey, weightKg, locale }`) |
| Nesting | ≤ 3 levels | Early returns and guard clauses |
| JSX depth in one component | ≤ 4 levels | Extract a child component |

## Clean-code rules

- **One responsibility per file and function.** If you need "and" to describe it, split it.
- **Name things after intent**, not mechanics: `getChargeableWeight`, not `calc2`. See `naming-conventions.md`.
- **No magic values.** Cache tags, event names, routes and limits live in one constants file per module. Business facts never appear in code (rule 1).
- **Pure first.** Put logic in pure functions (`domain/`) and keep framework code (React, Next, Drizzle) at the edges. See `module-structure.md`.
- **Early return** over `else` chains; no nested ternaries.
- **Immutable by default:** `const`, no parameter mutation, return new objects.
- **Fail loudly at the boundary, trust inside:** validate input once (Zod at the action/route boundary), then pass typed data.
- **No dead code:** no commented-out blocks, unused exports or "for later" helpers. Delete them; git remembers.
- **Comments explain *why***, never *what*. No `<ai_context>` headers, no banner comments.
- **No `any`**, no non-null `!` on data you didn't just check, no `as` casts to silence the compiler. See `type-definitions.md`.
- **DRY at 2, not at 1.** Extract shared code only when a second real use exists; don't build abstractions for one caller.
- **Async:** run independent awaits in parallel (`Promise.all`); never `await` inside a loop over independent items.

## Before you finish a change

- Re-read the diff: could any file or function be smaller?
- Lint, type-check and build pass (`verification-patterns.md`).
