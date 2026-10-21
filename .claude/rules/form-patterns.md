---
paths:
  - "43logistics.vn/**/*form*.tsx"
  - "43logistics.vn/**/*-schema.ts"
  - "43logistics.vn/**/schemas.ts"
  - "43logistics.vn/modules/**/actions.ts"
---

# Form patterns

Forms post to Server Actions and share one Zod schema between client and server. Context: `06-architecture.md` "Server Actions pattern", `AGENTS.md` rules 10 and 14.

## The standard shape

```tsx
"use client";
export function LeadForm({ routes }: LeadFormProps) {
  const t = useTranslations("leadForm");
  const [state, formAction] = useActionState(submitLeadAction, null);
  return (
    <form action={formAction} noValidate>
      <Field name="phone" label={t("phone")} error={state?.fieldErrors?.phone} required />
      ...
      <ConsentCheckbox />            {/* required, links /chinh-sach-bao-mat/ */}
      <SubmitButton>{t("submit")}</SubmitButton>   {/* useFormStatus → pending */}
      <FormMessage state={state} />
    </form>
  );
}
```

- **One schema** in `modules/<m>/application/schemas.ts` (client-safe: no server imports). The client may use it for inline hints; the **server always re-validates**.
- **Progressive enhancement:** the form works without JS (native `<form action>`). JS adds inline validation and pending state.
- Errors come back as `ActionState.fieldErrors` and are shown next to each field with `aria-describedby`; the first invalid field gets focus.
- Messages are localised keys (`messages/{vi,en}.json`), never English literals or raw Zod messages.
- Use `react-hook-form` only for complex admin forms. Public forms use `useActionState`.

## Field rules

- Every input has a visible `<label>`; placeholders are examples, not labels.
- Use the right input type and attributes: `type="tel"` + `inputMode="tel"` + `autoComplete="tel"`; `inputMode="decimal"` for kg/cm.
- **Lead form:** route, weight, size, goods type, name, phone/Zalo, message. **Email optional.** Consent checkbox required.
- Normalise on the server (trim, VN phone to E.164) inside the schema with `.transform`.
- Never pre-fill or store more personal data than the form needs (rule 14).

## Submission safety

- Turnstile token + rate limit in public actions (see `security-patterns.md`).
- Disable the submit button while pending, so a double click doesn't submit twice; the action must also be idempotent where possible.
- On success, show the localised success state and the Zalo alternative. Don't redirect away from the context unless the spec says so.
