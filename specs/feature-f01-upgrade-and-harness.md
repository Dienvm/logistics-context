---
title: Upgrade to Next 16 and adopt the module layout
type: feature
status: draft
owner_repo: both
roadmap: F-01
priority: critical
blocked_by_questions: []
updated: 2026-10-21
---

## Feature: Upgrade to Next 16 and adopt the module layout

### Problem Statement

Roadmap **F-01** (`docs/context/10-roadmap.md`, Phase 0). After F-00, the app is a clean placeholder on the template's stack: Next 15.3, React 19.1, Biome 1.9, Zod 3, Tailwind 3. It also still has the template's layer-first folders (`components/ui`, `lib/`, `hooks/` + `lib/hooks/` duplicates, `types/`, `db/db.ts`).

Every later code task targets:
- Next 16 with Cache Components (`"use cache"`, `cacheTag`, `updateTag`);
- Biome 2;
- the feature-module layout of **ADR 0005**.

The `.claude/rules/api-patterns.md` rule makes F-01 a hard prerequisite: no module queries or actions are written before it.

The build and seed inputs (`redirect-map.csv`, `design-tokens.json`, `seed/*.json`) also still live in the context workspace, where a standalone app build (e.g. Vercel) can't read them (ADR 0002 §11).

### Proposed Solution

After this change the app runs on Next 16 / React 19.2+ with Turbopack and Cache Components on. Biome 2 is the only linter/formatter. A typed env loader and the extended `ActionState` are in place. The folders follow ADR 0005 (`app/`, `modules/`, `shared/`, `db/`), and a boundary check enforces the module rules. The build inputs live in the app's `data/` folder. Unused template dependencies are gone. Visitors still see the same `noindex` placeholder page.

### Acceptance Criteria

**Framework and tooling**

- [ ] Given `package.json`, then:
  - `next`, `react`, `react-dom`, `@types/react` and `@types/react-dom` are on current releases: Next 16.x, and React at the version Next 16 requires (≥ 19.2);
  - `engines.node` is `>=22` (Node 20 reached end of life on 2026-04-30; owner decision 2026-10-21), and `AGENTS.md` §3's Package manager row says Node ≥ 22 (via `/mark-implemented`);
  - `pnpm install --frozen-lockfile` passes with the `pnpm-workspace.yaml` build allowlist;
  - the install log shows no peer-dependency error for `next`, `react` or `react-dom`. Peer warnings from shadcn libraries that F-02 prunes (e.g. `react-day-picker` 8) are listed in the PR, not fixed here.
- [ ] Given the repo root, then `next.config.mjs` is replaced by `next.config.ts` with:
  - `cacheComponents: true`;
  - `trailingSlash: true`;
  - no `images.remotePatterns` for `localhost`.

  `pnpm dev` and `pnpm build` use Turbopack (Next 16 default).
- [ ] Given `pnpm dev`, when `http://localhost:3000/` is requested, then it returns 200 with the placeholder, and the dev log shows no compile errors or warnings about `cacheComponents`.
- [ ] Given there is no `middleware.ts` (removed in F-00), then no `proxy.ts` is added in F-01; F-06 creates it. The PR states this, since the roadmap row mentions the rename.
- [ ] Given `biome.json`, then it is migrated to **Biome 2** (`biome migrate`), with:
  - the `next` and `react` rule domains enabled;
  - `vcs` (git, `useIgnoreFile`) kept;
  - the existing correctness rules kept.

  `prettier.config.cjs` and the `prettier` dependency are deleted.
- [ ] Given the `@next/eslint-plugin-next` core-web-vitals rules and the React hooks rules, when compared with Biome 2's `next`/`react` domains, then the PR has a comparison table. A narrow ESLint config (only those plugins, no formatting) is added **only if** a rule the team needs has no Biome equivalent (ADR 0002 §4); otherwise none is added. If it is added, `pnpm lint` runs it, and a temp fixture violating one fallback rule makes `pnpm lint` fail.
- [ ] Given `package.json` scripts, then:
  - `lint` = `biome check .`, followed by ESLint (`&& eslint …`) **only if** the comparison below adds a fallback config;
  - `lint:fix` = `biome check --write .`;
  - `format:write` = `biome format --write .`;
  - `typecheck` = `tsc --noEmit` (renamed from `type-check`);
  - `check:boundaries` = dependency-cruiser (below);
  - `dev`, `build` and `start` work;
  - `db:generate` / `db:migrate` keep working as commands, but only config loading is verified in F-01 (below). Running migrations against a database is F-04.
  - `analyze` (no analyzer installed) and `clean` are removed;
  - `format:check` is either removed or points to Biome.
- [ ] Given `.husky/pre-commit`, then it still runs the partial-staging guard, `biome check --staged --no-errors-on-unmatched` (Biome 2) and the gitleaks step. A staged lint error still blocks a commit.

**Dependencies**

- [ ] Given dependencies that nothing imports, then these are removed:
  - `@clerk/backend`, `@clerk/nextjs`, `@clerk/themes`;
  - `@hookform/resolvers`, `framer-motion`, `next-themes`, `posthog-js`;
  - `prettier`.

  F-05, S-13 and F-02 add their current versions back when needed. `date-fns` stays, as the `react-day-picker` peer, until F-02.
- [ ] Given `zod`, then it is on **Zod 4** (current), and `server-only` and `dependency-cruiser` (dev) are added.

**Code**

- [ ] Given env validation, then there are two files (Zod 4):
  - `shared/config/env.server.ts` (`import "server-only"`) parses the server variables and exports `serverEnv`.
  - `shared/config/env.public.ts` (client-safe) builds its input from **explicit** `process.env.NEXT_PUBLIC_*` references, one per variable, so Next inlines them, and exports `publicEnv`.

  Rules for both files:
  - **Blank is absent:** an empty string (`NEXT_PUBLIC_SITE_URL=` in a copied `.env.example`) is normalised to `undefined` before validation.
  - Every variable in `.env.example` is declared, optional until the task that uses it makes it required. A comment per variable names that task (e.g. `DATABASE_URL` → F-04).
  - Errors name the variable and never print values.
- [ ] Given `app/layout.tsx`, then it imports `publicEnv` (e.g. `metadataBase` from `NEXT_PUBLIC_SITE_URL` when set). This is the one allowed behavioural change to the layout, so validation runs in every build without importing the DB. Four builds, none touching the DB:
  - variable missing → passes;
  - blank → passes;
  - `https://43logistics.vn` → passes;
  - `not-a-url` → **fails** with a message naming `NEXT_PUBLIC_SITE_URL`.
- [ ] Given `shared/types/action-state.ts`, then `ActionState<T>` keeps the template's `isSuccess` shape, and its failure branch adds optional `fieldErrors?: Record<string, string[]>` (ADR 0002 §10). `types/` is gone.

**ADR 0005 layout**

- [ ] Given the ADR 0005 layout, then:
  - `components/ui/*` → `shared/ui/*`;
  - `lib/utils.ts` → `shared/lib/utils.ts`;
  - `hooks/` + `lib/hooks/` + `components/ui/use-toast.ts` → `shared/hooks/` (duplicates merged; one `use-toast.ts`, one `use-mobile.tsx`; `use-copy-to-clipboard.tsx` kept);
  - `db/db.ts` → `db/client.ts` (`import "server-only"`, no `dotenv`, postgres.js with `prepare: false`, reads `DATABASE_URL` through `serverEnv` and throws a clear error only when the client is first used without it, never at build time);
  - `db/schema/index.ts` → `db/schema.ts` (empty re-export with an ADR 0005 comment);
  - `modules/` exists (`modules/.gitkeep`).

  All imports are updated; `components/`, `lib/`, `hooks/`, `types/` and `db/schema/` no longer exist.
- [ ] Given `tailwind.config.ts`, then `content` scans `./app/**/*.{ts,tsx}`, `./shared/**/*.{ts,tsx}` and `./modules/**/*.{ts,tsx}` (old `pages/`, `components/`, `src/` globs removed). A moved component's utility classes still produce CSS: render a temp page that uses `shared/ui/button` with `variant="destructive"`, and the production CSS contains its classes and the computed style isn't empty. Then delete the page. F-02 replaces this file.
- [ ] Given `components.json`, then its aliases point to the new paths (`components` → `@/shared`, `ui` → `@/shared/ui`, `utils` → `@/shared/lib/utils`, `lib` → `@/shared/lib`, `hooks` → `@/shared/hooks`). `drizzle.config.ts` points `schema` to `./db/schema.ts` and uses `DATABASE_URL_DIRECT` (fallback `DATABASE_URL`) for the CLI, keeping `dotenv` for the CLI only. Verification: with a dummy `DATABASE_URL_DIRECT=postgres://u:p@127.0.0.1:1/x`, `pnpm drizzle-kit check` (or `generate --name f01-probe` into a temp `out`, then discarded) loads the config and `db/schema.ts` without a `server-only` or import error. No connection is required, and nothing is written to `db/migrations/`.
- [ ] Given `.dependency-cruiser.cjs` and `pnpm check:boundaries`, when it runs on the repo, then it passes. Its rules are:
  - `no-deep-module-import`: any file **outside** `modules/<m>/` (including `app/`, `shared/`, other modules) may import `modules/<m>/` only via `index.ts`, `index.tsx`, `client.ts` or `client.tsx`. This covers alias and relative paths. The only exception is `modules/*/infrastructure/schema.ts` → another module's `infrastructure/schema.ts`.
  - `no-circular`.
  - `shared-not-to-modules`.
  - `domain-pure`: `modules/*/domain/**` must not import `next`, `react`, `react-dom`, `drizzle-orm`, `zod`, `postgres`, `db/` or its own module's `application/`, `infrastructure/` or `ui/`.

  Each rule **fails** on its fixture and names the rule. The fixtures are complete and resolvable (temp `modules/x/{index.ts,client.ts,infrastructure/q.ts,infrastructure/schema.ts}`), created, checked and then deleted:
  1. `app/zz.ts` → `@/modules/x/infrastructure/q` (alias);
  2. `modules/y/zz.ts` → `../x/infrastructure/q` (relative);
  3. a cycle between `shared/lib/zz-a.ts` and `shared/lib/zz-b.ts`;
  4. `shared/lib/zz.ts` → `@/modules/x`;
  5. `modules/x/domain/zz.ts` → `zod`.

  Positive controls pass: `app/zz-ok.ts` → `@/modules/x` and `@/modules/x/client`, and `modules/y/infrastructure/schema.ts` → `@/modules/x/infrastructure/schema`.
- [ ] Given `server-only` guards, when a `"use client"` component that is **rendered by a temp page** (`app/zz-leak/page.tsx`) value-imports `@/db/client`, then `pnpm build` fails with the `server-only` error. The same holds for a value import of the temp `@/modules/x` server entry (its `index.ts` imports `server-only`). This enforces ADR 0005's "client files never import `index.ts`", which dependency-cruiser can't see (it doesn't read `"use client"`). After removing the fixtures, the build is clean.

**Data move (context ↔ app)**

- [ ] Given ADR 0002 §11, then:
  - `data/redirect-map.csv`, `data/design-tokens.json` and `data/seed/*.json` exist in `43logistics.vn/data/`, byte-identical to the context copies at the time of the move;
  - they are deleted from the context workspace;
  - `data/media-inventory.csv` stays in the context (it moves in C-04).
- [ ] Given the context docs, then every reference to the moved files points to `43logistics.vn/data/...`: `AGENTS.md`, `CLAUDE.md`, `docs/context/*`, the proposal, the ADRs' consequences only where they give an instruction, the skills and `.claude/rules/*`. `grep -rn "data/redirect-map.csv\|data/design-tokens.json\|data/seed" --include=*.md .` shows only app-relative or `43logistics.vn/`-prefixed paths.

**Records**

- [ ] Given Cache Components, then **ADR 0006** (written with `/adr`) **amends ADR 0002 §2 and the F-01 roadmap gate** ("only if the compatibility check passes"). Owner decision 2026-10-21: enable now, because neither Clerk nor next-intl is installed. ADR 0006 records:
  - the exact Next version and the documentation-based findings for the current `@clerk/nextjs` and `next-intl` releases, with versions and links;
  - the gate moves to **F-03 and F-05**. Each installs its library, runs the build and a request through a page using it with `cacheComponents: true`, and records the result in ADR 0006;
  - the fallback if a check fails: keep `cacheComponents: true` and isolate the incompatible part (e.g. the request-time Clerk calls in `/admin` inside `<Suspense>` / dynamic segments). Only if that's impossible, set it to `false` through a new ADR. Cached-query code (`api-patterns.md`) then follows that ADR's fallback.
- [ ] Given `docs/context/10-roadmap.md`, then the F-01 Accept text no longer says "only if the compatibility check passes" and points to ADR 0006. F-03 and F-05 get the re-verification as an Accept item.
- [ ] Given the app's `AGENTS.md`, then the local, uncommitted ADR 0005 edits (module layout, rules pointer) are committed in this PR, and its "today" notes are updated: Next 16, Biome 2, `typecheck`, `shared/`.
- [ ] Given F-01's Accept item "AGENTS.md §3/§7 rows updated", then `/mark-implemented f01-upgrade-and-harness` updates them **from the merge commit**:
  - §3: Framework, UI runtime, Lint/format, Mutations, Validation (Zod 4), Package manager (Node ≥ 22), Components ("in `shared/ui`, restyle pending F-02");
  - §7: `lint`, `typecheck`, the new `check:boundaries` row, and the removal of `analyze`/`clean`.

  The roadmap row is ticked only after those edits.
- [ ] Given the end state, then `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries` and `pnpm build` pass with an empty `.env`. `/` still serves the F-00 placeholder (`lang="vi"`, `noindex, nofollow`, one H1); the demo routes still 404.

### Scope

**In scope:**

- Next 16 + React (≥ 19.2) upgrade with Turbopack, `next.config.ts`, `cacheComponents`, `trailingSlash`.
- Biome 2 migration, script cleanup, Prettier removal, the ESLint-gap comparison.
- Removing the dependencies listed above; Zod 4; adding `server-only` and `dependency-cruiser`.
- `shared/config/env.server.ts` + `env.public.ts`, `shared/types/action-state.ts`, `publicEnv` in the layout.
- The ADR 0005 file moves, `components.json` and `drizzle.config.ts` paths, `db/client.ts`, `modules/.gitkeep`.
- dependency-cruiser boundary rules + `check:boundaries`.
- The data move and the context reference updates.
- ADR 0006 (Cache Components, amending ADR 0002 §2) and the roadmap gate text.
- `tailwind.config.ts` `content` globs (the only Tailwind change; v4 is F-02).
- Node ≥ 22 (`engines`, README; `AGENTS.md` §3 via `/mark-implemented`).
- App `AGENTS.md` / README command updates.

**Out of scope:**

- Tailwind v4, tokens, shadcn re-init/pruning, `motion`, fonts (**F-02**). Tailwind 3 and the current shadcn files keep working after the move.
- next-intl, `[locale]` layout, `messages/`, `shared/i18n` (**F-03**).
- New DB schema, Drizzle/drizzle-kit upgrade, Supabase project, seed script (**F-04**).
- Clerk for `/admin` (**F-05**); `proxy.ts` (**F-06**); redirects loader and `check:redirects` (**F-07**); the CI workflow beyond the existing gitleaks job (**F-08**). `check:boundaries` joins CI in F-08.
- Any real page, module code or content.
- `AGENTS.md` §3/§7 "In the app today" and "Status" cells: see the closure AC below.

### Affected Areas

| Repo | Layer | File / Path |
|------|-------|-------------|
| app | tooling | `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` (allowlist if new build scripts appear), `biome.json`, `.husky/pre-commit` |
| app | config | `tailwind.config.ts` (`content` globs), `next.config.mjs` → `next.config.ts`, `tsconfig.json` (only if Next 16 requires it), `components.json`, `drizzle.config.ts`, `postcss.config.mjs` (unchanged unless the upgrade requires), delete `prettier.config.cjs` |
| app | boundaries | `.dependency-cruiser.cjs` (new) |
| app | shared | `shared/ui/*` (from `components/ui/*`), `shared/lib/utils.ts`, `shared/hooks/*`, `shared/config/env.server.ts` + `env.public.ts` (new), `shared/types/action-state.ts` |
| app | db | `db/client.ts` (from `db/db.ts`), `db/schema.ts` (from `db/schema/index.ts`); `db/migrations/` untouched |
| app | modules | `modules/.gitkeep` |
| app | pages | `app/layout.tsx` (import paths + `publicEnv` for `metadataBase`), `app/page.tsx` (unchanged) |
| app | data | `data/redirect-map.csv`, `data/design-tokens.json`, `data/seed/*.json` (new copies) |
| app | docs | `AGENTS.md`, `README.md` |
| context | data | delete `data/redirect-map.csv`, `data/design-tokens.json`, `data/seed/` |
| context | docs | `AGENTS.md`, `CLAUDE.md`, `docs/context/*`, `docs/proposals/*`, `.claude/skills/*`, `.claude/rules/*` (path references only), `docs/adr/0006-*.md` (new, via `/adr`, amends ADR 0002 §2), `docs/context/00-index.md`, `docs/context/10-roadmap.md` (F-01/F-03/F-05 Accept text for the Cache Components gate) |

### Golden-rule checks

- **Rule 15 (secrets):** `env.server.ts` and `env.public.ts` never log values; `.env.example` unchanged except for any variable genuinely added (none expected).
- **Rule 6 (server-only DB):** `db/client.ts` imports `server-only`; the build-failure check proves a client import breaks the build.
- **Rule 8 (JS budget):** removing Clerk/PostHog/framer-motion must not increase first-load JS. Record the before/after first-load JS of `/` from the build output.
- **Rule 13 (redirects):** the CSV moves byte-identically, so nothing changes yet (F-07 consumes it).
- **Stack gaps (`AGENTS.md` §3):** this task closes the Framework, UI runtime, Lint/format and Mutations gaps, and the Validation row moves to Zod 4. Components (Tailwind/shadcn) stays open for F-02.

### Dependencies & Risks

- **Depends on:** F-00 (done).
- **Blocked by questions:** none.
- **Risk: Next 16 breaking changes** (async request APIs, removed `next lint`, Turbopack default, image defaults). Run the official codemod (`npx @next/codemod@latest upgrade`) first, then fix what remains; the placeholder app is tiny.
- **Risk: Biome 2 reports new errors in the moved shadcn files.** Fix those that are real; for vendored shadcn code, prefer narrow `overrides` on `shared/ui/**` over disabling rules globally, and list each override in the PR.
- **Risk: dependency-cruiser's TypeScript path resolution.** Configure `tsConfig` so `@/*` aliases resolve; the negative checks prove the rules fire.
- **Risk:** dependency-cruiser ≥ 17 requires Node ≥ 22; resolved by the owner's Node ≥ 22 decision (2026-10-21). Use the latest release.
- **Risk:** Zod 4 has API changes (`z.string().url()` → `z.url()` etc.). There are no existing schemas, so only `env.ts` is affected.
- **Risk:** deleting `data/*` from the context breaks docs links. The grep AC covers it.

### Manual Verification Plan

- **Scenario:** Given a fresh clone of the PR branch with an empty `.env`, when it is installed, checked and built, then everything passes on Next 16 / Biome 2 / Zod 4. The new layout is in place, the boundary rules catch violations, and `/` behaves exactly as after F-00.
- **Seed needs:** none.
- **Steps:**
  1. `node -v` ≥ 22. Then `pnpm install --frozen-lockfile`: record the install log's peer warnings, with none for `next`/`react`/`react-dom`.
  2. `pnpm ls next react react-dom zod @biomejs/biome --depth 0` → Next 16.x, React ≥ 19.2, Zod 4.x, Biome 2.x. `pnpm ls @clerk/nextjs posthog-js framer-motion next-themes prettier` → not found.
  3. `pnpm lint && pnpm typecheck && pnpm check:boundaries && pnpm build`. All pass; the build shows Turbopack and the route table (`/`, `/_not-found`). Next 16 no longer prints first-load JS, so measure it in step 10.
  4. `ls components lib hooks types db/schema 2>&1` → "No such file". `ls shared/ui shared/lib shared/hooks shared/config shared/types modules db` → as specified. `grep -rn "@/components\|@/lib/\|@/hooks\|@/types" --include=*.ts --include=*.tsx . --exclude-dir=node_modules` → no output.
  5. `cat next.config.ts` → `cacheComponents: true`, `trailingSlash: true`.
  6. **Boundary checks.** Create the complete fixtures from the dependency-cruiser AC. `pnpm check:boundaries` fails on each of the 5 negative fixtures (one at a time), naming the expected rule, and passes with only the positive controls. Delete all fixtures, and it passes again.
  7. **Server-only checks.** Create `app/zz-leak/page.tsx`, which renders a `"use client"` component that value-imports `@/db/client` → `pnpm build` fails with the `server-only` error. Repeat with a value import of the temp `@/modules/x` (index imports `server-only`) → it fails again. Delete the fixtures → the build is clean.
  8. **env:**
     - four builds of `NEXT_PUBLIC_SITE_URL` (missing / blank / `https://43logistics.vn` / `not-a-url`) → pass / pass / pass / fail naming the variable with no value printed;
     - `grep -c "process.env.NEXT_PUBLIC_" shared/config/env.public.ts` ≥ the number of public variables;
     - a client file importing `shared/config/env.server.ts` fails the build (`server-only`).
  9. **Hook:** stage a temp file with an unused import → `git commit` is blocked by Biome 2. Then unstage and delete it.
  10. **Placeholder unchanged.** `pnpm start -p 3100`:
      - `/` → 200 with `lang="vi"`, `noindex, nofollow`, one `<h1>`;
      - `/todo` → 404.
      - The axe-core scan at 360 and 1280 px finds 0 violations.
      - At 768 px there's no horizontal scroll (CDP `scrollWidth`).
      - Keyboard: no focusable elements, or a visible focus ring if any.
      - Under `prefers-reduced-motion: reduce`, 0 running animations.
      - Lighthouse mobile (arm64 Node): performance ≥ 90, accessibility 100; record LCP, CLS and TBT.
      - INP: "unavailable, no interactive element", as in F-00.
      - **Initial first-party JS (gz):** sum the `transferSize` of every `/_next/static/**/*.js` request on the initial load of `/` (CDP Network, cache disabled, framework chunks included). Record it against the 120 KB budget and F-00's 100.6 KB transfer.
  11. **Data move:**
      - `cmp` each moved file against the context copy in the commit before the deletion → identical;
      - in the context repo, `ls data/` → only `media-inventory.csv`;
      - the reference grep from the AC is clean.
  12. **ESLint comparison:** the PR table lists each core-web-vitals and hooks rule with its Biome 2 equivalent, or "missing → ESLint added".
- **Validation commands:** `pnpm -C 43logistics.vn lint` + `typecheck` + `check:boundaries` + `build`. `i18n:check` and `check:redirects` don't exist yet (F-03/F-07). No consent matrix (no tracking). No automated tests (ADR 0004).

### Implementation Hints

- Order:
  1. branch `feat/f-01-upgrade-and-harness` from a fresh `main`, carrying the uncommitted app `AGENTS.md` edits;
  2. remove unused deps;
  3. Next/React upgrade via `@next/codemod upgrade`;
  4. Biome 2 `migrate`;
  5. Zod 4 + `server-only` + `env.server.ts`/`env.public.ts` + `ActionState`;
  6. file moves with `git mv` (keeps history) + import rewrite;
  7. `components.json` / `drizzle.config.ts`;
  8. dependency-cruiser;
  9. data move;
  10. docs.
- Use `git mv` for every move, so reviewers see renames rather than add/delete pairs.
- dependency-cruiser:
  - start from `npx depcruise --init`;
  - the rules are `no-circular`, `no-cross-module-deep-import` (path `^modules/([^/]+)/` → not `^modules/$1/`, allowing only `^modules/[^/]+/(index|client)\.tsx?$` and the schema exception), `shared-not-to-modules`, and `domain-pure`;
  - set `options.tsConfig` and `exclude: node_modules|.next`.
- `.claude/rules/*` and `module-structure.md` describe the target. If F-01 shows a rule is impractical, raise it in the PR; don't change the rule silently.
- The context data move and doc edits go on `impl/f01-upgrade-and-harness` in the context repo (`/implement` Step 7). ADR 0006 goes through `/adr`.
- Local tooling notes: arm64 Node for Lighthouse; CDP for 360 px (`verification-patterns.md`).

### Related

- Roadmap F-01; next: F-02 (Tailwind v4/tokens/shadcn into `shared/ui`), F-03 (next-intl), F-04 (DB).
- ADR 0002 §2, §4, §10, §11; ADR 0004 (verification); ADR 0005 (layout); ADR 0006 (to be written in this task).
- `.claude/rules/module-structure.md`, `api-patterns.md`, `code-style.md`, `security-patterns.md`, `verification-patterns.md`.
- Spec `feature-f00-security-template-cleanup.md` (baseline: placeholder, hook, 101 kB first-load JS).
