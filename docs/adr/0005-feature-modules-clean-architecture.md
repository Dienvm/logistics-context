# ADR 0005 — Feature modules with clean-architecture layers

- Status: Accepted (2026-10-21)
- Amends: ADR 0002 §3 (server code in `server/{queries,actions,services}`) and §5 (shadcn primitives in `components/ui`). The root-level layout without `src/` and `@/*` → app root stay.
- Owner repo: both
- Context: The owner asked (2026-10-21) for smaller code, a modular architecture and clean-architecture layering before any feature code is written. The layer-first layout from ADR 0002 spreads one business capability across `server/queries`, `server/actions`, `server/services`, `components/blocks`, `lib/*` and `stores/`. For example, pricing would live in five folders, and nothing stops a component from reaching into the DB layer of another feature. After F-00 the app holds only a placeholder page, the shadcn primitives and a few utilities, so changing the layout now costs almost nothing.

## Decisions

1. **Organise the app by business module.** `modules/<name>/` holds one capability end to end. The initial set:
   - `routes`: shipping lanes;
   - `pricing`;
   - `content`;
   - `goods`;
   - `leads`;
   - `contact`;
   - `media`;
   - `settings`;
   - `seo`;
   - `tracking`;
   - `auth`.

   The table of modules and the tables each one owns lives in `.claude/rules/module-structure.md`, and is updated in the same change that adds a module.
2. **Layers inside a module.**
   - `domain/`: pure TypeScript, no framework or IO imports.
   - `application/`: use cases + client-safe Zod schemas.
   - `infrastructure/`: server-only; Drizzle `schema.ts`, repositories, cached queries, external APIs.
   - `ui/`: Server Components by default, client islands marked `"use client"`.
   - `actions.ts`: `"use server"` entry points: authorise → validate → one use case → invalidate tags.
   - `constants.ts`: cache tags, event names, limits.

   A module creates only the folders it needs.
3. **Dependency rule.** Dependencies point inward:
   - `ui` → `application` → `domain`;
   - `infrastructure` → `domain`;
   - `application` may call `infrastructure`.
   - `domain` imports nothing outside itself except `shared/types`. Every `infrastructure/` file and every module `index.ts` imports `server-only`.
   - It is **pragmatic** clean architecture: no ports, interfaces or DI containers until a second implementation exists.
4. **Two public entry points per module.**
   - `index.ts` is the server API.
   - `client.ts` is the client-safe API: client components, schemas, domain types.
   - Other modules and `app/` import only these entry points, never deep paths.
   - Cycles are forbidden; shared parts move to the lower module or to `shared/`.
5. **`app/` is a thin routing layer.** Pages and route handlers read params, call module entry points, compose module UI and export metadata through `modules/seo`. No queries, loops or calculations in `app/`.
6. **`shared/` holds code with no business meaning:**
   - `shared/ui` (shadcn primitives, replacing `components/ui`);
   - `shared/lib` (utils, formatting);
   - `shared/config` (`env.ts`);
   - `shared/hooks`, `shared/i18n` (next-intl routing), `shared/types` (`ActionState<T>`).

   `shared/` never imports from `modules/`.
7. **Database.** `db/client.ts` (server-only), `db/schema.ts` (re-exports each module's `infrastructure/schema.ts` for drizzle-kit and relations), and `db/migrations/`.
8. **When the move happens.** The few existing files move during the F-01 upgrade:
   - `components/ui` → `shared/ui`, with `components.json` aliases updated;
   - `lib/utils.ts` → `shared/lib/utils.ts`;
   - `hooks/` + `lib/hooks/` → `shared/hooks/` (merged);
   - `types/` → `shared/types/`;
   - `db/db.ts` → `db/client.ts`.

   F-02 re-initialises shadcn into `shared/ui`. Every later task creates its module in this layout.
9. **Detailed rules** live in `.claude/rules/*.md` (`module-structure.md` first). Claude Code loads them by path, and other agents read the matching file (`AGENTS.md` §8). They refine `AGENTS.md`, never override it.

## Alternatives considered

- **Keep the ADR 0002 layer-first layout** and enforce clean-architecture direction between folders (`lib/*` = domain, `server/services` = application, `server/queries` = infrastructure). Offered to the owner, not chosen: one feature still spans many folders and there is no single public API per capability.
- **Strict hexagonal architecture** (ports/adapters, interfaces for every repository, DI). Rejected for now: most capabilities have exactly one implementation (Drizzle/Supabase), so the ceremony adds files without benefit and works against "smaller code". It can be added per module when a second implementation appears (e.g. a real tracking API next to manual statuses).
- **Monorepo packages per module** (pnpm workspaces). Rejected: much more build and tooling overhead for a single Next.js app.
- **Move to `src/`** at the same time. Rejected, for the same reason as in ADR 0002: churn with no functional gain.

## Consequences

- **Easier:**
  - a capability is changed in one folder;
  - AI agents and reviewers load less context, because rules are path-scoped and modules are small;
  - pure `domain/` code is what ADR 0004 Decision 3 needs to add tests later;
  - server/client leaks are blocked by `server-only` and the two entry points.
- **Harder:**
  - more folders and the entry-point discipline (`index.ts` vs `client.ts`);
  - deep imports and cycles must be caught in review until a lint rule exists. Optional follow-up in F-01: Biome `noRestrictedImports` or a small script that rejects `@/modules/*/{domain,application,infrastructure,ui}/` imports from outside the module.
- **Performance budget:** unchanged. The `client.ts` split keeps server-only code out of client bundles; a barrel that mixed both would risk bundling server code, so it is forbidden.
- **SEO, redirects, i18n, consent:** no behaviour change. Folder names don't affect URLs (`app/` routes are unchanged); `messages/` and next-intl routing move to `shared/i18n` only as files.
- **Cost/ops:** no new dependencies or services. A small one-time move in F-01.
- **Docs and skills updated in the same change set:**
  - `AGENTS.md` §3 (Components and Mutations rows), rule 5, rule 12 and §8;
  - `06-architecture.md` (diagram, folder tree, `ActionState`, state table);
  - `04`, `05`, `07` and `08` path mentions;
  - `10-roadmap.md` F-01 and S-13;
  - the example paths in the `/implement`, `/code-review`, `/feature-bug`, `/fix-implement` and `/doc-review` skills.
- **Follow-up roadmap IDs:** F-01 (move + optional import-boundary check), F-02 (shadcn into `shared/ui`), F-04 (module schemas + `db/schema.ts`), and every S-/A- task (module per capability).
