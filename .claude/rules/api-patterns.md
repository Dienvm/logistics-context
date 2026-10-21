---
paths:
  - "43logistics.vn/modules/**/infrastructure/**/*.ts"
  - "43logistics.vn/modules/**/application/**/*.ts"
  - "43logistics.vn/modules/**/actions.ts"
  - "43logistics.vn/app/**/route.ts"
  - "43logistics.vn/db/**/*.ts"
---

# Server and API patterns

Reads are cached queries, writes are Server Actions, and HTTP endpoints are route handlers only when something outside the app calls them. Context: `docs/context/06-architecture.md`, `AGENTS.md` rules 5–7.

## Reads: cached queries (`infrastructure/queries.ts`)

```ts
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { routeTag } from "../constants";

export async function getRouteRates({ routeKey, locale }: { routeKey: string; locale: Locale }) {
  "use cache";
  cacheLife("max");
  cacheTag(routeTag(routeKey));
  return db.query.routeRates.findMany({ where: ..., orderBy: ... });
}
```

- These patterns (`"use cache"`, `cacheLife`, `cacheTag`, `updateTag`) need Next 16 with Cache Components, which arrives in **F-01**. **F-01 comes first:** don't implement module queries or actions before it, and don't write a fallback with older APIs (`AGENTS.md` §3: close the stack gap first). If F-01's compatibility check disables `cacheComponents`, follow the fallback recorded in that ADR.
- Pass `locale` explicitly; it becomes part of the cache key. Never read `cookies()`/`headers()` inside a cached function.
- Return plain serialisable data (domain types), not Drizzle row objects with methods.
- Select only the columns the caller needs.
- Tags come from the module's `constants.ts` (`routeTag(key)`, `SETTINGS_TAG`), never inline strings.

## Writes: Server Actions (`actions.ts`)

```ts
"use server";
export async function updateRateAction(_prev: ActionState<Rate> | null, formData: FormData): Promise<ActionState<Rate>> {
  await requireRole(["admin", "editor"]);                       // admin actions: first line
  const parsed = rateInputSchema.safeParse(formInput(formData));  // drops $ACTION_* and security fields
  if (!parsed.success) return invalid(parsed.error);           // → fieldErrors
  const rate = await updateRate(parsed.data);                   // application use case
  updateTag(routeTag(rate.routeKey));
  return ok(rate);
}
```

- An action is thin: authorise → validate (Zod) → call **one** use case → invalidate tags → return `ActionState<T>`.
- **Input policy (one rule everywhere):**
  - `formInput(formData)` from `shared/lib/form-input.ts` builds the business object and drops framework fields (`$ACTION_*`) and security fields (`cf-turnstile-response`, read separately).
  - Business schemas use Zod's default **strip** mode: unknown keys are removed and never reach the DB. Don't use `.passthrough()`.
  - `.strict()` is only for JSON route handlers and webhooks, where the full payload shape is known.
- Return `ActionState<T>` (`shared/types/action-state.ts`); never throw validation errors to the client. Unexpected errors are logged server-side and returned as a generic, localised message.
- Side effects that don't affect the response (conversions, notifications) go in `after()`.
- The public lead-form action adds Turnstile + rate limiting; see `security-patterns.md`.

## Route handlers (`app/**/route.ts`)

Use them only for:

- `/go/[channel]`: log + 302;
- webhooks (Clerk/svix);
- `/api/admin/*` JSON for TanStack Query;
- `sitemap.ts` / `robots.ts`.

The handler parses input with Zod, calls the module entry point, and returns `Response`/`NextResponse` with explicit status codes. No business logic in the handler file.

## Database

- One client: `db/client.ts` (`server-only`, postgres.js, `prepare: false` for the pooler). Only `infrastructure/` imports it.
- Each module defines its tables in `infrastructure/schema.ts`; `db/schema.ts` re-exports them for drizzle-kit and relations.
- Multi-table writes use `db.transaction`. Money is `bigint` VND; times are `timestamptz` UTC.
- Migrations: `pnpm db:generate` → review the SQL → `pnpm db:migrate`. Never edit an applied migration.
