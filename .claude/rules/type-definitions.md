---
paths:
  - "43logistics.vn/**/*.{ts,tsx}"
---

# Type definitions

TypeScript `strict`; one source of truth for every shape.

## Where types come from

| Shape | Source of truth | Derive with |
| --- | --- | --- |
| DB rows | Drizzle table in `modules/<m>/infrastructure/schema.ts` | `typeof table.$inferSelect` / `$inferInsert` (infrastructure only) |
| Input (forms, actions, route handlers) | Zod schema in `application/schemas.ts` | `z.infer<typeof schema>` |
| Business concepts (Route, Rate, Quote) | `modules/<m>/domain/types.ts` | hand-written, minimal, framework-free |
| Action results | `shared/types/action-state.ts` | `ActionState<T>` |

- **Never duplicate a shape by hand.** If a Zod schema exists, infer the type from it; don't write a parallel interface.
- **Domain types aren't DB rows.** Infrastructure maps rows to domain types, so UI and use cases don't depend on column names.

## Style

- `type` for unions, props and data; `interface` only when declaration merging is needed (rare).
- Discriminated unions for states and variants: `{ status: "verified"; prices: Rate[] } | { status: "contact" }`. Handle them with an exhaustive `switch` + `assertNever`.
- Literal unions from `as const` arrays (`export const CHANNELS = ["zalo","phone","whatsapp","messenger"] as const; type Channel = (typeof CHANNELS)[number]`), so runtime lists and types never drift.
- No `any`. Use `unknown` at boundaries + Zod parse. No `as` casts except `as const`, and none to silence an error.
- No non-null assertion (`!`) on data you didn't just check; narrow it instead.
- Export only types other files use; keep the rest file-local.
- `readonly` arrays/objects for props and domain data.

## Domain value types

- **Money:** integer VND (`bigint` in DB, `number` within safe range in TS), named `Vnd` (`type Vnd = number`), formatted only with `shared/lib/format` (`Intl.NumberFormat('vi-VN')`). Never floats for money.
- **Weight/size:** `kg` / `cm` as numbers with explicit names (`weightKg`, `lengthCm`).
- **Dates:** `Date` in UTC from the DB; format for `Asia/Ho_Chi_Minh` only at the UI edge.
- **Locale:** `type Locale = "vi" | "en"` from `shared/i18n`, never a bare `string`.
