# 00 — Context pack index

This folder is the project memory for the 43logistics.vn rebuild. It was produced from a full analysis of the old WordPress site (database dump of 2026-10-18 + live pages). Agents load files on demand; humans keep them current.

## Files

| File | Purpose | Load when |
| --- | --- | --- |
| `../../AGENTS.md` | Rules, stack, conventions, definition of done | Always (auto) |
| `01-business.md` | Company facts, contacts, routes, legacy prices, audience, voice | Any copy, settings, route data |
| `02-legacy-audit.md` | Old-site problems → rules; what to keep | Design/content decisions |
| `03-information-architecture.md` | URLs, sitemap, nav, page section specs, route registry | Pages, routing, navigation |
| `04-design-system.md` | Direction, tokens, Tailwind `@theme`, components, motion | Any UI work |
| `05-seo-and-tracking.md` | Metadata, hreflang, JSON-LD, sitemap/robots, redirects, events, consent, LPs | Pages, SEO, analytics |
| `06-architecture.md` | System diagram, folders, caching, `proxy.ts`, auth, Server Actions, state, env, testing | Scaffolding, infra, any server code |
| `07-data-model.md` | Drizzle schema (draft), settings shapes, blocks, RLS, storage, seed | DB, admin, queries |
| `08-i18n.md` | next-intl routing, slugs, switcher, formatting, translation workflow | Anything locale-related |
| `09-migration.md` | WordPress → new mapping, import steps, media, QA, go-live | Import scripts, launch |
| `10-roadmap.md` | Ordered tasks with acceptance criteria | Picking the next task |
| `11-open-questions.md` | Facts the owner must confirm (Q-IDs) | Before writing any business fact |
| `12-glossary.md` | VI ↔ EN terms | Copy, translations, UI strings |
| `legacy-copy/*.md` | Verbatim old page text (unverified raw material) | Rewriting content |
| `../adr/*.md` | Architecture decisions (0001 initial, 0002 template stack, 0003 workspace & workflow, 0004 code-only delivery, no automated tests, 0005 feature modules + clean architecture, 0006 Next 16 Cache Components + JS budget, 0007 rate cards and currencies, 0008 VPS deployment) | Before changing stack/architecture |
| `../proposals/*.md` | Undecided options (front matter `status`) — see table below | Before proposing something similar |
| `../../specs/INDEX.md` | Implementation specs tied to roadmap IDs | Before implementing / picking work |
| `../../lessons/INDEX.md` | Lessons with follow-ups | Before implementing (watch-outs) |
| `../../43logistics.vn/data/design-tokens.json` | Tokens (`current`, `proposed`) | `pnpm tokens`, Figma |
| `../../43logistics.vn/data/redirect-map.csv` | Old → new URLs (63 rows) | Redirects, QA |
| `../../data/media-inventory.csv` | 330 old media files, used/unused | Media migration |
| `../../43logistics.vn/data/seed/*.json` | Legacy routes/rates/settings (unverified) | `pnpm db:seed` |

## Proposals

| File | Status | Summary |
| --- | --- | --- |
| docs/proposals/nextjs-rebuild-quynam-pattern.md | draft | quynam.vn (sister co.) as the structure reference only; 43L's own facts, brand and media; SEO + off-page/backlinks for 43logistics.vn only; better UX, motion, security; code-only delivery |

## Prompt starters

Prefer the skills (AGENTS.md §6): `/feature-bug F-00` → `/implement` → `/code-review` → `/mark-implemented`. Free-form starters for tools without skills:

1. **Foundation:** "Read AGENTS.md, ADR 0002 and docs/context/06-architecture.md. Implement roadmap task F-00, then F-01 in 43logistics.vn/ (upgrade the template in place, root layout). Don't add any page content yet."
2. **Database:** "Implement F-04: create db/schema from the draft schema in docs/context/07-data-model.md, fix it against the installed drizzle-orm version, generate migrations, and write scripts/seed.ts that loads 43logistics.vn/data/seed/*.json idempotently."
3. **Proxy & redirects:** "Implement F-06 and F-07. Use 43logistics.vn/data/redirect-map.csv as the only source; cover every 410 and legacy-ID rule; write scripts/check-redirects.ts (no unit tests, ADR 0004)."
4. **Route page:** "Implement S-03 (price engine as pure functions, checked against the worked examples) then S-04 (route page template) following docs/context/03 section 'Outbound route page', 04 components and 05 JSON-LD rules. Prices only from route_rates; show 'liên hệ' when routes.is_verified is false."
5. **Lead flow:** "Implement S-02 and S-08. Follow 05 'Tracking plan' and 06 'Server Actions pattern'. Email must be optional; consent required."
6. **Content rewrite:** "Using docs/context/legacy-copy/gui-hang-di-han-quoc.md as raw material and 01-business.md for facts, draft new VI copy for the Korea route page as blocks JSON. Mark every unconfirmed fact with its Q-ID from 11-open-questions.md. Do not invent numbers."
7. **Review:** "Review this PR against AGENTS.md section 7 (definition of done) and the SEO checks in 05. List violations with file:line."

## Keeping the pack healthy

- One fact, one place: business facts live in `01-business.md` (and later in `site_settings`/`routes`); other files reference them.
- When a question in `11-open-questions.md` is answered, update it and the files it affects in the same commit.
- Stack/architecture changes need a new ADR in `docs/adr/` (`/adr`), propagated to AGENTS.md §3 and the affected context files in the same change.
- Run `/context-audit` after big changes; it checks docs ↔ app ↔ skills drift.
