---
paths:
  - "43logistics.vn/**/*.{ts,tsx,mjs,json,yml,yaml}"
  - "43logistics.vn/.env.example"
  - "43logistics.vn/.husky/*"
---

# Security patterns

Context: `AGENTS.md` rules 6–7 and 14–15, `06-architecture.md`, proposal §6.

## Secrets and config

- Never read, print or commit `.env*` (only `.env.example` with names). Never paste secret values into code, logs, PRs or chat.
- Read environment variables only through `shared/config/env.server.ts` (server-only) and `shared/config/env.public.ts` (explicit `process.env.NEXT_PUBLIC_*` references). Blank values count as unset. Only `NEXT_PUBLIC_*` may reach the client, and only if they are truly public.
- New variables: add the name to `.env.example` and to the `06-architecture.md` env table in the same change.

## Server-only boundaries

- `db/client.ts`, every `modules/*/infrastructure/*` file except `schema.ts` (it must load in plain Node for drizzle-kit), and every module `index.ts` start with `import "server-only"`.
- Client files import only `@/modules/<m>/client` and `shared/*`.
- Never pass DB rows, internal IDs you don't need, or secrets to client components. Map rows to minimal props.

## Input and output

- Validate **every** external input with Zod at the boundary: Server Actions, route handlers, webhooks, `searchParams`, cookies. Follow the input policy in `api-patterns.md`: unknown form keys are stripped, never stored; JSON handlers and webhooks use `.strict()`.
- Drizzle query builders only; no string-built SQL. If `sql\`\`` is unavoidable, use parameters, never interpolation of user input.
- Never render user or DB HTML with `dangerouslySetInnerHTML`. CMS rich text renders through a sanitised block renderer. JSON-LD uses the `JsonLd` component, which escapes `</script>`.
- **No open redirects.** `/go/[channel]` builds the target only from `site_settings` + an allowlist of channels; never redirect to a URL taken from the request.

## Authorization

- Every admin Server Action, admin page and `/api/admin/*` handler calls `requireRole([...])` first (rule 7). Hiding a button is not authorization.
- RLS stays enabled, deny-by-default; the app's server role does the authorised work.
- Webhooks verify signatures (svix for Clerk) before parsing the body.

## Abuse and privacy

- **Lead form** (public Server Action): Turnstile verified server-side when configured, otherwise a honeypot + minimum fill time (owner decision 2026-10-23, S-08b); rate limit keyed by IP hash (key: `IP_HASH_SALT`, else derived from `DATABASE_URL`), size limits on every field.
- **`/go/[channel]`** stays a plain link with a 302 (rule 12), with no challenge. Protect it with rate limiting per IP hash, and de-duplicate `contact_events` by `event_id` / short time window. The redirect never waits on the insert.
- Store a **keyed hash** of the IP (`IP_HASH_SALT`, else a key derived from `DATABASE_URL`), never the raw IP (rule 14).
- No analytics or ad requests, cookies or `43l_attr` before consent; check through `modules/tracking`.
- Collect the minimum personal data; never log lead payloads.

## Headers and dependencies

- Security headers in `next.config.ts` (after F-01): HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`, and a static allowlist CSP. No nonce CSP, which would break the static shells.
- Review every dependency a generator adds (shadcn CLI, codemods, V0) the same way. In F-02 the shadcn CLI added an unrelated npm package named `cn` and imported it; remove such packages and point imports at our own helpers.
- No new dependency without checking that it's maintained, its size (public pages), and its licence. Allow its install scripts in `pnpm-workspace.yaml` only if needed.
- gitleaks runs in CI and pre-commit. Never weaken `.gitleaksignore` beyond confirmed, rotated findings.
