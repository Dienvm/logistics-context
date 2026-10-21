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
   - `infrastructure/`: server-only (`import "server-only"`) except `schema.ts`; Drizzle `schema.ts`, repositories, cached queries, external APIs. Schema files are declarative tables with no secrets and must load in plain Node for `drizzle-kit`, where `server-only` throws.
   - `ui/`: Server Components by default, client islands marked `"use client"`.
   - `actions.ts`: `"use server"` entry points: authorise → validate → one use case → invalidate tags.
   - `constants.ts`: cache tags, event names, limits.

   A module creates only the folders it needs.
3. **Dependency rule.** Business logic sits in the centre, and frameworks at the edges.
   - The exact allowed imports per layer (type-only imports, `constants.ts`, server vs client UI, actions, the schema exception) are the matrix in `.claude/rules/module-structure.md`, which is authoritative.
   - In short: `domain` imports only its own code and `shared/types`/`shared/i18n` types. `application` may call `domain` and `infrastructure`. Server `ui` may read queries. Client `ui` may import only client-safe code. `actions.ts` calls one use case.
   - `db/client.ts`, every non-schema `infrastructure/` file and every module `index.ts` import `server-only`.
   - It is **pragmatic** clean architecture: no DI container and no interface per repository. A small port (a function type passed to a use case) is added only where a second implementation or a swappable external system exists.
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
   - `shared/hooks`, `shared/i18n` (next-intl routing and request config, **created** in F-03), `shared/types` (`ActionState<T>`).
   - Message catalogues stay at the app root in `messages/{vi,en}.json`.

   `shared/` never imports from `modules/`.
7. **Database.**
   - `db/client.ts` (server-only) and `db/migrations/`.
   - `db/schema.ts` re-exports each module's `infrastructure/schema.ts` and is the **one place where Drizzle `relations()` are composed**.
   - Foreign keys follow the data, not the module graph. A schema file may import the table objects from another module's `schema.ts` (e.g. `route_rates.route_id` → `routes`; `content` ↔ `routes` page links). That is the only allowed deep import, and it never touches queries or the DB client.
   - Runtime module dependencies stay acyclic. The initial allowed directions are listed in the rules file.
8. **When the move happens.** The few existing files move during the F-01 upgrade:
   - `components/ui` → `shared/ui`, with `components.json` aliases updated;
   - `lib/utils.ts` → `shared/lib/utils.ts`;
   - `hooks/` + `lib/hooks/` → `shared/hooks/` (merged);
   - `types/` → `shared/types/`;
   - `db/db.ts` → `db/client.ts`.

   F-02 re-initialises shadcn into `shared/ui`. Every later task creates its module in this layout.
9. **Detailed rules** live in `.claude/rules/*.md` (`module-structure.md` first). Claude Code loads them by path, and other agents read the matching file (`AGENTS.md` §8). They refine `AGENTS.md`, never override it.

## Alternatives considered

- **Keep the ADR 0002 layer-first layout** and enforce clean-architecture direction between folders (`lib/*` = domain, `server/services` = application, `server/queries` = infrastructure), possibly with per-capability facades. Offered to the owner, not chosen. A facade is possible, but each capability still spans five or more folders, so changes and reviews touch many places, and path-scoped rules can't target one capability.
- **Feature folders without internal layers** (`modules/pricing/{queries.ts,actions.ts,rate-table.tsx,…}`). Simpler and close to the chosen option. Not chosen as the default, because pricing, leads and tracking hold real business rules that must stay framework-free (ADR 0004 Decision 3). The chosen option keeps this simplicity where it fits: a module creates only the folders it needs, so a small module can be two or three flat files.
- **Hexagonal architecture applied everywhere** (a port for every repository and external call). Lightweight ports are cheap, but most capabilities have exactly one implementation (Drizzle/Supabase), so a port per repository adds files without benefit. Kept as a per-module option (Decision 3) where a second implementation or a swappable system exists, e.g. the notification channel (Q-14) or a tracking provider (Q-18).
- **Monorepo packages per module** (pnpm workspaces). Rejected: much more build and tooling overhead for a single Next.js app.
- **Move to `src/`** at the same time. Rejected, for the same reason as in ADR 0002: churn with no functional gain.

## Consequences

- **Easier:**
  - a capability is changed in one folder;
  - AI agents and reviewers load less context, because rules are path-scoped and modules are small;
  - pure `domain/` code is what ADR 0004 Decision 3 needs to add tests later;
  - server/client leaks are blocked by `server-only` and the two entry points.
- **Harder, and recurring:**
  - more folders and the entry-point discipline (`index.ts` vs `client.ts`);
  - mapping DB rows to domain types in `infrastructure/` is extra code in every module;
  - each PR needs a boundary review (deep imports, cycles, server code in client files) until tooling checks it.
- **Verification (no test suites, ADR 0004):**
  - **F-01** adds a boundary check script or Biome `noRestrictedImports`. It rejects alias and relative deep imports into another module (except `schema.ts` table imports), imports of `index.ts` from `"use client"` files, and import cycles (e.g. `madge --circular` or an equivalent run as a script). F-01's PR records its output.
  - **F-04** records that `pnpm db:generate` loads `db/schema.ts` in plain Node, with no `server-only` error.
  - **Every module PR** records the ADR 0004 evidence: initial first-party JS ≤ 120 KB gz with consent rejected, the consent matrix where tracking is touched, and `check:redirects`.
- **Performance budget:** unchanged and still measured per PR (ADR 0004). The `client.ts` split and `server-only` make server code in a client bundle a build error rather than a silent leak, but they don't prove the budget by themselves. A barrel mixing both entry points is forbidden.
- **SEO, redirects, i18n, consent:** no behaviour change.
  - Folder names don't affect URLs (`app/` routes are unchanged).
  - F-03 creates the next-intl config under `shared/i18n`, and `messages/` stays at the root.
  - Consent and tracking stay in `modules/tracking`, with the same activation gates: PostHog and ad tags stay off until Q-13/Q-20 are answered (ADR 0004 Decision 5).
- **Cost/ops:** no new services; at most one dev-only dependency for the cycle check. The one-time move in F-01 is small, but the recurring costs above (mapping, boundary review) last as long as the layout.
- **Docs and skills updated in the same change set:**
  - `AGENTS.md` §3 (Components and Mutations rows), rule 5, rule 12 and §8;
  - `06-architecture.md` (diagram, folder tree, `ActionState`, state table);
  - `04`, `05`, `07` and `08` path mentions;
  - `10-roadmap.md` F-01 and S-13;
  - the example paths in the `/implement`, `/code-review`, `/feature-bug`, `/fix-implement` and `/doc-review` skills.
- **Follow-up roadmap IDs:** F-01 (move + optional import-boundary check), F-02 (shadcn into `shared/ui`), F-04 (module schemas + `db/schema.ts`), and every S-/A- task (module per capability).
