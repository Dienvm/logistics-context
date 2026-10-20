# 10 — Roadmap & task specs

> Work one task at a time. Each task lists the context to load, the deliverable and acceptance criteria. Mark tasks done here (`[x]`) in the same PR.
> Prompt template for an agent: *"Implement task {ID} from docs/context/10-roadmap.md. Load AGENTS.md and the listed context files first. Stop and list questions if a fact is missing from 01-business.md."*

## Phase 0 — Foundation

> The app repo started from a template (ADR 0002). F-00 and F-01 turn it into the base the rest of this roadmap assumes; every **code** task depends on them. Owner/content work (C-01 fact confirmation, open questions) can start immediately in parallel. Turn a task into a spec with `/feature-bug <ID>`; only `/mark-implemented` ticks a box.

- [ ] **F-00 Security & template cleanup** — `.env` is tracked in the app repo and pushed to `origin/main`: rotate the Supabase DB password + service-role key and the Clerk secret, `git rm --cached .env`, keep only `.env.example`; decide with the owner whether to purge history; add secret scanning (gitleaks in pre-commit + CI). Remove demo code (todos, profiles `membership`, `/todo`, Stripe env, public `/signup`, `createProfileAction` call in the root layout, global `ClerkProvider`), PostHog init-on-load, `<ai_context>` headers, `prompts/`, `.repo_ignore`; fix husky pre-commit (`pnpm`, Biome on staged files, no `git add .`). *Context:* ADR 0002, 06. *Accept:* `git ls-files` shows no `.env`; old keys revoked; `pnpm build` passes with no demo routes; public pages ship no Clerk or PostHog JS before consent.

- [ ] **F-01 Upgrade & harness** — upgrade the template in place (root layout, no `src/`): Next.js 16 + React 19.2 (`middleware.ts` → `proxy.ts`, `next.config.mjs` → `next.config.ts`), Biome 2 as the primary linter/formatter (`lint` = `biome check`, delete Prettier config; narrow ESLint fallback only per ADR 0002 §4), rename `type-check` → `typecheck`, Vitest, Playwright, `env.ts` (Zod), `ActionState` + `fieldErrors`, merge `lib/hooks` into `hooks/`, move the build/runtime inputs `redirect-map.csv`, `design-tokens.json` and `seed/*.json` into `43logistics.vn/data/` (ADR 0002 §11; `media-inventory.csv` moves with C-04); compatibility check of Clerk + next-intl with `cacheComponents` recorded in an ADR before enabling it. Biome 2 with `next`/`react` domains (see 06 quality harness). *Context:* 06, ADR 0002. *Accept:* `pnpm dev/build/lint/typecheck/test` work; `cacheComponents: true` (only if the compatibility check passes), `trailingSlash: true`; Node ≥ 20.9; moved files deleted from the context workspace and docs point to the app copy; AGENTS.md §3/§7 rows updated.
- [ ] **F-02 Tokens & theme** — `scripts/build-tokens.ts` turns `data/design-tokens.json` (`proposed`) into `app/theme.css` (`@theme`), Tailwind v4 wired (remove `tailwind.config.ts`, `tailwindcss-animate` → `tw-animate-css`), shadcn/ui re-initialised for v4 and pruned to the components the roadmap needs, `motion` replaces `framer-motion`, fonts via `next/font` (Be Vietnam Pro, Barlow Condensed, `latin`+`vietnamese`). *Context:* 04. *Accept:* `pnpm tokens` regenerates identical output; a `/dev/tokens` page (dev-only) shows colours/type scale; reduced-motion CSS present.
- [ ] **F-03 i18n** — next-intl routing (VI root, `/en`), `[locale]` layout, `messages/{vi,en}.json`, key-parity check script. *Context:* 08. *Accept:* `/` renders `lang="vi"`, `/en/` renders `lang="en"`; no auto redirect; parity check in CI.
- [ ] **F-04 Database** — Supabase project (Singapore region), Drizzle client + schema from 07, migrations, seed script with `data/seed/*`. *Context:* 07. *Accept:* `pnpm db:migrate && pnpm db:seed` on a fresh DB creates all tables with RLS enabled and 10 routes (8 active); `db/client.ts` cannot be imported from client code (`server-only`); template todo/profile tables dropped; Drizzle/drizzle-kit upgraded to current.
- [ ] **F-05 Auth** — Clerk for `/admin` only, roles in `publicMetadata`, session claim `role`, `requireRole()`, Clerk webhook → `profiles`. *Context:* 06. *Accept:* unauthenticated `/admin` → sign-in; `editor` cannot open leads; public pages ship no Clerk JS (check bundle).
- [ ] **F-06 proxy.ts** — 410 rules, legacy `?page_id`/`?p` redirects, attribution cookie, next-intl, Clerk protection. *Context:* 05, 06. *Accept:* unit tests for matchers; `/tieu-de/` → 410; `/?page_id=705` → 301 `/gui-hang-di-singapore/`; `?utm_source=x` sets `43l_attr` only when the ads-consent cookie is granted, and sets nothing without it.
- [ ] **F-07 Redirects** — CSV loader → `next.config.ts` `redirects()`/`rewrites()`; `scripts/check-redirects.ts`. *Context:* 05, `data/redirect-map.csv`. *Accept:* all 63 rows pass against `next start`.
- [ ] **F-08 CI** — GitHub Actions: lint, typecheck, unit, build, e2e (Playwright), check:redirects, Lighthouse CI (budgets from AGENTS.md).

## Phase 1 — Public site core

- [ ] **S-01 Layout** — Header (mega menu from `routes` + `route_rates` min price), MobileActionBar, Footer from `site_settings`, Breadcrumbs, `/go/[channel]` links. *Context:* 03, 04. *Accept:* 360/768/1280 screenshots; keyboard nav of mega menu; no CLS from sticky bar.
- [ ] **S-02 Contact tracker** — `app/go/[channel]/route.ts`: insert `contact_events`, 302 to channel URL (WhatsApp with `84` prefix), `event_id` shared with dataLayer push. *Context:* 05. *Accept:* e2e asserts row + 302 for each channel; invalid channel → 404.
- [ ] **S-03 Price engine** — pure functions: chargeable weight (max(actual, L×W×H/divisor)), rounding (`weight_rounding_kg`), band lookup, flat vs per-kg, open-ended bands, `contact_for_price`. *Context:* 01, 07. *Accept:* ≥ 20 unit tests incl. US 1.3 kg → 1.5 kg, SG 5 kg vs 6 kg band edge, volumetric > actual.
- [ ] **S-04 Route page template** — sections per 03 (hero, mini calculator, RateTable, pricing rules, process, goods, methods, compensation, FAQ, testimonials, related), metadata, JSON-LD (`Service`/`Offer`, `BreadcrumbList`, `FAQPage`), OG image. *Accept:* 7 outbound + SG→VN render from DB; unverified routes show "liên hệ" instead of prices; Lighthouse mobile ≥ 90/100/95.
- [ ] **S-05 Home** — per 03. *Accept:* H1 present; route bento from DB; no carousel above the fold; LCP image ≤ 150 KB.
- [ ] **S-06 Hubs** — `/dich-vu/`, `/nhap-hang/` comparison tables. 
- [ ] **S-07 Calculator page** — `/tinh-cuoc/` with Zustand store, "Gửi kết quả qua Zalo" (prefilled text), `calculate_quote` event. *Accept:* works without JS-fetching (rates embedded at build); accessible form errors.
- [ ] **S-08 Lead form** — Server Action, Zod, Turnstile, rate limit, consent, `after()` notifications/conversions, success/error states in VI/EN. *Accept:* e2e happy + validation paths; row has attribution fields; no email required.
- [ ] **S-09 About, Contact, Policies, 404** — templates; policy pages render markdown with TOC and "Cập nhật" date. *Accept:* footer has no `#` links.
- [ ] **S-10 SEO infra** — `buildMetadata`, `JsonLd`, `sitemap.ts`, `robots.ts`, RSS. *Accept:* sitemap lists only published+indexable URLs with alternates; CI SEO check (1 H1, canonical, hreflang reciprocal, JSON-LD parses).
- [ ] **S-11 Blog** — list (filter by route), article (TOC, CTA box, related route), `BlogPosting`. 
- [ ] **S-12 Prohibited goods** — `/hang-cam-gui/` grouped + filter; only rules with `approved_at`.
- [ ] **S-13 Consent, GTM & PostHog** — Consent Mode v2 defaults, banner, GTM via `@next/third-parties`, PostHog lazy init + `/ingest` rewrite, `lib/tracking/events.ts` fan-out. *Context:* 05, ADR 0002. *Accept:* no ad or analytics cookies/requests before consent; events visible in GTM preview and PostHog live events after consent, with matching `event_id`.

## Phase 2 — Admin (staff CMS)

- [ ] **A-01 Admin shell** — `/admin` layout with Clerk `<UserButton>`, nav by role, React Query provider. 
- [ ] **A-02 Routes & rates editor** — CRUD bands, validity dates, `is_verified` toggle (admin only), preview of public table; actions call `updateTag('route:{key}')` + `revalidateTag('menu','max')`. *Accept:* editing a price shows on the public route page, mega menu and calculator after save (e2e).
- [ ] **A-03 Pages & translations** — block editor (form-based per block type), SEO fields with length counters, slug change → auto redirect row, status workflow (draft → review → published), "Create EN draft".
- [ ] **A-04 Media library** — upload (sharp conversion), required alt VI/EN, usage list.
- [ ] **A-05 FAQs, goods rules, testimonials** — with approval (`approved_at`) and consent (`consent_at`) gates.
- [ ] **A-06 Leads inbox** (sales) — DataTable (TanStack Query + Table), filters (status, route, source, date), status updates, notes, CSV export, attribution detail. *Accept:* `editor` gets 403.
- [ ] **A-07 Contact analytics** — counts of `contact_events` + leads by channel/route/source per week.
- [ ] **A-08 Redirects manager** — list/add/edit, hits counter.
- [ ] **A-09 Settings** — company, contacts, offices, hours, offers (Zod-validated forms).

## Phase 3 — Content & EN

- [ ] **C-01 Confirm facts** — close the blocking items in `11-open-questions.md` (prices, hours, addresses, legal info, active inbound routes).
- [ ] **C-02 Route copy** — rewrite 7 outbound + SG→VN from `legacy-copy/*` (unique per route, no competitor links), add FAQs (5–8 each), goods rules approved by ops.
- [ ] **C-03 Core pages copy** — home, about (real story/photos), contact, hubs, 5 policies (privacy covers Decree 13/2023).
- [ ] **C-04 Media** — migrate 175 used files per 09, new photos of warehouse/packing/team.
- [ ] **C-05 Blog** — migrate 2 posts (+ merge the 2023 post), plan 2 posts/month by route.
- [ ] **C-06 English** — EN for P0 pages per 08 workflow; human review of SEO fields.

## Phase 4 — Ads & conversions

- [ ] **T-01 Server-side conversions** — only for the ad platforms chosen in Q-13: Meta CAPI, TikTok Events API (lead + contact clicks, `event_id` dedupe, consent-gated).
- [ ] **T-02 Google Ads** — conversions via GTM, Enhanced Conversions for leads; offline import of `won` leads by `gclid` (later).
- [ ] **T-03 Landing pages** — `/lp/[campaign]/` template + 1 LP per top route; checklist in 05.

## Phase 5 — Launch

- [ ] **L-01 Staging QA** — everything in `09-migration.md` step 7.
- [ ] **L-02 Go-live** — DNS, Search Console sitemap, monitoring (Sentry or similar, uptime), 4-week watch.

## Phase 6 — Later

- [ ] Inbound MY→VN, TH→VN pages (if confirmed) · tracking page (if a carrier API exists) · new routes (EU, AU, CA) · Zalo OA integration for lead notifications · reviews collection with consent.
