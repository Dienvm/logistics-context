# AGENTS.md — 43logistics.vn (rebuild)

> Root instructions for every AI coding agent working in this repo (Claude Code, Copilot, Cursor, Codex…).
> Read this file first, then load only the context files the current task needs (see "Context map").

## 1. What we are building

A rebuild of **https://43logistics.vn** — the marketing + lead-generation site of **43 Logistics**, an international parcel/cargo forwarder based in Đà Nẵng (office in TP.HCM). The old site is WordPress + Elementor; it is being replaced, not upgraded.

The site exists to do three things, in this order:

1. **Turn visitors into contacts** — Zalo first, then phone, WhatsApp/Messenger, then the quote form. (The old web form produced only 12 leads in ~3 years; customers talk on Zalo.)
2. **Rank and convert paid traffic** for route keywords: "gửi hàng đi Singapore / Hàn Quốc / Nhật Bản / Đài Loan / Malaysia / Thái Lan / Mỹ", "gửi hàng Singapore về Việt Nam".
3. **Look trustworthy**: real prices, real transit times, real photos, legal info, policies.

Languages: **Vietnamese (default, no URL prefix)** and **English (`/en/…`)**, built so more locales can be added.

## 2. Tech stack (fixed — do not swap without an ADR)

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router, Turbopack) | `proxy.ts` (not `middleware.ts`), `cacheComponents: true`, async `params`/`searchParams`/`cookies()`/`headers()` |
| UI runtime | **React 19.2** | Server Components by default; `"use client"` only for interactivity |
| Mutations | **Server Actions** | All writes (lead form, admin edits) go through Server Actions with Zod validation |
| Database | **Supabase Postgres** | Accessed **only from the server** through Drizzle |
| ORM | **Drizzle ORM** + drizzle-kit | Schema in `src/db/schema/*`, migrations in `drizzle/` |
| Files | **Supabase Storage** | Buckets `media` (public), `og` (public), `private` (signed URLs) |
| Auth | **Clerk** | Staff only (admin/editor/sales). The public site has no login |
| Styling | **Tailwind CSS v4** | CSS-first `@theme` tokens generated from `data/design-tokens.json` |
| Client state | **Zustand** | UI state only (mobile nav, calculator inputs, consent, banners) |
| Client server-state | **TanStack Query (React Query)** | Only inside interactive admin screens and the shipping calculator if it needs live data |
| i18n | **next-intl** | `localePrefix: 'as-needed'`, VI default |
| Validation | **Zod** | Shared schemas between Server Actions and forms |

## 3. Golden rules

1. **Never invent business facts.** Prices, transit times, addresses, phone numbers, hours, legal name, stats, testimonials come only from the database / `docs/context/01-business.md`. If something is unknown, render nothing or use a clearly marked placeholder and add it to `docs/context/11-open-questions.md`.
2. **Prices and transit times have exactly one source of truth**: tables `route_rates` and `routes`. Rate tables, calculator, mega-menu "từ X đ/kg", JSON-LD `Offer`, OG images all read from there. Never hard-code a price in a component or in copy.
3. **No text inside images.** Headlines, prices and country names are HTML (SEO, translation, responsive).
4. **Every public page must have**: one `<h1>`, `generateMetadata` (title, description, canonical, `alternates.languages`), JSON-LD for its page type, breadcrumbs (except home), and a visible primary CTA (Zalo).
5. **Server first.** Fetch data in Server Components via `src/server/queries/*` (cached with `"use cache"` + `cacheTag`). Mutate via Server Actions in `src/server/actions/*`, then `updateTag()`/`revalidateTag(tag, 'max')`.
6. **Drizzle only on the server.** Never import `src/db` from a Client Component. Never expose the Supabase service-role key or `DATABASE_URL` to the client.
7. **Authorization is explicit.** Every admin Server Action calls `requireRole([...])` (Clerk `auth()` + role from `publicMetadata`). RLS is enabled on all tables as defense in depth (deny-by-default for `anon`/`authenticated`).
8. **Performance budget (mobile, 4G)**: LCP < 2.5 s, INP < 200 ms, CLS < 0.1, JS on route pages < 120 KB gz. No carousel above the fold, no Google Maps iframe in global layout, `next/image` everywhere.
9. **Motion**: only `transform`/`opacity`; never animate the LCP element; everything respects `prefers-reduced-motion`.
10. **Accessibility**: WCAG 2.2 AA. Use only token colours (contrast pre-checked). All inputs labelled, visible focus ring, tap targets ≥ 44 px.
11. **Vietnamese typography**: body line-height ≥ 1.6; no `uppercase` on buttons/menus (uppercase with diacritics hurts legibility); fonts loaded with `subsets: ['latin', 'vietnamese']`.
12. **Track every contact.** Zalo/phone/WhatsApp/Messenger links go through `/go/[channel]` (logs `contact_events`, then 302). Push the matching `dataLayer` event.
13. **Keep old URLs alive.** Every URL in `data/redirect-map.csv` must resolve as specified (200 / 301 / 410), in one hop.
14. **Personal data (Vietnam Decree 13/2023)**: consent checkbox on forms, privacy policy link, no raw IP stored (hash only), customer screenshots only with consent and with personal data blurred.

## 4. Context map (load on demand)

| When the task is about… | Read |
| --- | --- |
| Company facts, contacts, audience, voice | `docs/context/01-business.md` |
| What was wrong with the old site / what to keep | `docs/context/02-legacy-audit.md` |
| Sitemap, URLs, navigation, page contents | `docs/context/03-information-architecture.md` |
| Colours, fonts, spacing, components, motion | `docs/context/04-design-system.md` + `data/design-tokens.json` |
| Metadata, JSON-LD, sitemap, robots, hreflang, tracking, ads LPs | `docs/context/05-seo-and-tracking.md` |
| Folder structure, rendering/caching, proxy, auth, state | `docs/context/06-architecture.md` |
| Tables, Drizzle schema, RLS, storage | `docs/context/07-data-model.md` |
| Locales, slugs, translation workflow | `docs/context/08-i18n.md` |
| Importing WordPress content, media, redirects | `docs/context/09-migration.md` + `data/*.csv` + `data/seed/*` |
| What to build next, acceptance criteria | `docs/context/10-roadmap.md` |
| Unknowns that block content | `docs/context/11-open-questions.md` |
| VI ↔ EN terminology | `docs/context/12-glossary.md` |
| Original page text (raw material, unverified) | `docs/context/legacy-copy/*.md` |

## 5. Commands (expected — keep this list true)

```bash
pnpm dev                 # next dev (Turbopack)
pnpm build && pnpm start
pnpm lint                # eslint (flat config) — `next lint` no longer exists in Next 16
pnpm typecheck           # tsc --noEmit
pnpm test                # vitest (unit)
pnpm test:e2e            # playwright (incl. redirect + SEO checks)
pnpm db:generate         # drizzle-kit generate
pnpm db:migrate          # drizzle-kit migrate
pnpm db:seed             # tsx scripts/seed.ts (legacy routes, settings)
pnpm tokens              # build Tailwind @theme CSS from data/design-tokens.json
pnpm check:redirects     # verify every row of data/redirect-map.csv against a running server
```

## 6. Conventions

- TypeScript `strict`, no `any`. Path alias `@/` → `src/`.
- File names `kebab-case.tsx`; components `PascalCase`; Server Actions end with `Action` (`submitLeadAction`).
- One component per file under `src/components/{ui,blocks,layout}`. UI primitives have no data fetching.
- Copy for UI chrome lives in `messages/{vi,en}.json`; page content lives in the database.
- Dates stored UTC, displayed in `Asia/Ho_Chi_Minh`. Money stored as integer VND (`bigint`), formatted with `Intl.NumberFormat('vi-VN')` → `75.000 đ`.
- Commit style: Conventional Commits (`feat(route-page): …`).

## 7. Definition of done (every PR)

- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass; no new console errors.
- [ ] Works at 360 px, 768 px, 1280 px; keyboard-navigable; reduced-motion checked.
- [ ] New public page: metadata + canonical + hreflang + JSON-LD validated (Rich Results Test or schema validator).
- [ ] No hard-coded business facts; strings in `messages/*` for both VI and EN.
- [ ] Lighthouse mobile ≥ 90 performance / 100 SEO / ≥ 95 accessibility on the changed page.
- [ ] Context files updated if a decision changed (write an ADR in `docs/adr/` for stack/architecture changes).

## 8. Do not

- Do not copy text from `legacy-copy/` into production without rewriting and fact-checking.
- Do not link to competitor domains (the old site linked to `3a.net.vn`).
- Do not claim "24/7", "hàng nghìn khách hàng", insurance terms or delivery guarantees unless `01-business.md` confirms them.
- Do not list goods as "accepted" (medicine, cosmetics without labels, food) without the per-country rules in the database approved by operations.
- Do not add a second analytics/tag system outside GTM without updating `05-seo-and-tracking.md`.
