---
paths:
  - "43logistics.vn/**/*form*.tsx"
  - "43logistics.vn/**/*calculator*.tsx"
  - "43logistics.vn/**/schemas.ts"
  - "43logistics.vn/**/*-schema.ts"
---

# Conditional form patterns

Some fields depend on others. Examples:

- calculator: dimensions are optional, but if one is given, all three are required;
- inbound routes ask for the overseas pickup city;
- `contact_for_price` routes hide the estimate;
- admin rate editor: flat price vs per-kg band.

## Model the condition in the schema, not in the JSX

Use a discriminated union or `superRefine`, so client and server agree:

```ts
export const rateInputSchema = z.discriminatedUnion("pricing", [
  z.object({ pricing: z.literal("per_kg"), pricePerKg: vndSchema, ...band }),
  z.object({ pricing: z.literal("flat"), flatPrice: vndSchema, ...band }),
]);

export const dimensionsSchema = z
  .object({ lengthCm: cm.optional(), widthCm: cm.optional(), heightCm: cm.optional() })
  .superRefine((d, ctx) => {
    const given = [d.lengthCm, d.widthCm, d.heightCm].filter((v) => v !== undefined).length;
    if (given > 0 && given < 3) ctx.addIssue({ code: "custom", message: "dimensions.allOrNone" });
  });
```

## UI rules

- Derive visibility from one source: the controlling field's value (`watch`/state) or server data (route direction, `contact_for_price`). Don't keep separate `showX` booleans.
- **Hide, then drop.** When a section hides, clear its values (or exclude them before submit), so stale hidden data never reaches the server.
- Hidden means not rendered (or `hidden` + `inert`), never just visually hidden, so screen readers and tab order skip it.
- When a field appears because of a user action, move focus only if the user expects it. Announce the change with an `aria-live="polite"` region where it matters (e.g. the estimate replaced by "Liên hệ").
- Conditions driven by **business data** (which routes are inbound, which have public prices) come from the DB via props, never hard-coded lists of route keys.
- **Inactive-branch fields are stripped, not rejected.** Each union member uses Zod's default strip mode, so fields of the other branch are dropped on the server even if the client forgot to clear them. This is the same input policy as `api-patterns.md`; don't make union members `.strict()`.

## Keep components small

Split each conditional branch into its own component (`FlatPriceFields`, `PerKgFields`) and choose between them with a small `switch` on the discriminant. Don't use one component with nested ternaries.
