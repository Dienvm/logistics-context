# ADR 0001 — Initial architecture for the 43logistics.vn rebuild

- Status: Accepted (2026-10-20) · Amended by ADR 0002 (2026-10-20): folder layout, linter, analytics lanes, Clerk scope · Amended by ADR 0006 (2026-10-21): Cache Components enabled in F-01; next-intl/Clerk compatibility verified in F-03/F-05 · Amended by ADR 0008 (2026-10-26): hosting is a Hostinger VPS (Docker Compose + Caddy, images built in CI), not Vercel · Amended 2026-10-28 (A-04, owner): decision 4, legacy media URLs are not kept
- Context: replace a WordPress + Elementor site with a fast, bilingual, measurable lead-generation site. See `docs/context/02-legacy-audit.md`.

## Decisions

1. **Next.js 16 App Router + React 19.2**, Cache Components enabled, `proxy.ts` for request interception (middleware.ts is deprecated in Next 16).
2. **Supabase Postgres accessed only through Drizzle on the server.** No supabase-js data access from the browser. RLS enabled on all tables with deny-by-default for `anon`/`authenticated` as defense in depth.
3. **Clerk for staff authentication only** (admin/editor/sales); the public site has no accounts and ships no Clerk JS. Roles live in Clerk `publicMetadata` and a `role` session claim.
4. **Supabase Storage** for media. ~~Legacy `/wp-content/uploads/*` URLs are rewritten (200) to the storage bucket with the same paths.~~ **Amended 2026-10-28 (owner, A-04):** WordPress is no longer used and its media URLs are not kept: `/wp-content/uploads/*` answers 410 (`proxy.ts`), attachment-slug URLs fall to the ordinary 404, and `?attachment_id=` keeps its 301 to `/` (F-06). New uploads live under `media/YYYY/MM/{id}-{slug}.webp` (spec `specs/feature-a04-media-library.md`).
5. **Vietnamese at the root, English under `/en/`** (next-intl, `as-needed`, no locale auto-detection) to keep existing Vietnamese URLs.
6. **Prices and transit times are data** (`routes`, `route_rates`) — single source of truth for UI, calculator and JSON-LD.
7. **Server Actions for all mutations**; Zustand only for UI state; TanStack Query only in admin/interactive client views.
8. **Contact clicks are first-class conversions** via `/go/[channel]` + dataLayer + server-side conversion APIs.

## Consequences

- Authorization must be enforced in every Server Action/route handler (`requireRole`) because the DB connection bypasses RLS.
- Content editing needs a custom admin (`/admin`) — no third-party CMS in v1.
- next-intl + Cache Components compatibility must be verified against the installed versions during F-01/F-03.
