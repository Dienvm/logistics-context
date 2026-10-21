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
  - `engines.node` is `>=20.9`;
  - `pnpm install --frozen-lockfile` passes with the `pnpm-workspace.yaml` build allowlist;
  - the install log shows no peer-dependency error for `next`, `react` or `react-dom`. Peer warnings from shadcn libraries that F-02 prunes (e.g. `react-day-picker` 8) are listed in the PR, not fixed here.
- [ ] Given the repo root, then `next.config.mjs` is replaced by `next.config.ts` with:
  - `cacheComponents: true`;
  - `trailingSlash: true`;
  - no `images.remotePatterns` for `localhost`.

  `pnpm dev` and `pnpm build` use Turbopack (Next 16 default).
- [ ] Given there is no `middleware.ts` (removed in F-00), then no `proxy.ts` is added in F-01; F-06 creates it. The PR states this, since the roadmap row mentions the rename.
- [ ] Given `biome.json`, then it is migrated to **Biome 2** (`biome migrate`), with:
  - the `next` and `react` rule domains enabled;
  - `vcs` (git, `useIgnoreFile`) kept;
  - the existing correctness rules kept.

  `prettier.config.cjs` and the `prettier` dependency are deleted.
- [ ] Given the `@next/eslint-plugin-next` core-web-vitals rules and the React hooks rules, when compared with Biome 2's `next`/`react` domains, then the PR has a comparison table. A narrow ESLint config (only those plugins, no formatting) is added **only if** a rule the team needs has no Biome equivalent (ADR 0002 §4); otherwise none is added.
- [ ] Given `package.json` scripts, then:
  - `lint` = `biome check .`;
  - `lint:fix` = `biome check --write .`;
  - `format:write` = `biome format --write .`;
  - `typecheck` = `tsc --noEmit` (renamed from `type-check`);
  - `check:boundaries` = dependency-cruiser (below);
  - `dev`, `build`, `start`, `db:generate`, `db:migrate` work;
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

- [ ] Given `shared/config/env.ts`, then:
  - it validates `process.env` with Zod 4;
  - server and public schemas are separate, and it exports typed `serverEnv` / `publicEnv`;
  - server values import `server-only`;
  - every variable in `.env.example` is declared, optional until the task that uses it makes it required (documented per variable);
  - `pnpm build` with an empty `.env` still passes;
  - an invalid value (e.g. `NEXT_PUBLIC_SITE_URL=not-a-url`) fails with a readable message naming the variable and never printing values.
- [ ] Given `shared/types/action-state.ts`, then `ActionState<T>` keeps the template's `isSuccess` shape, and its failure branch adds optional `fieldErrors?: Record<string, string[]>` (ADR 0002 §10). `types/` is gone.

**ADR 0005 layout**

- [ ] Given the ADR 0005 layout, then:
  - `components/ui/*` → `shared/ui/*`;
  - `lib/utils.ts` → `shared/lib/utils.ts`;
  - `hooks/` + `lib/hooks/` + `components/ui/use-toast.ts` → `shared/hooks/` (duplicates merged; one `use-toast.ts`, one `use-mobile.tsx`; `use-copy-to-clipboard.tsx` kept);
  - `db/db.ts` → `db/client.ts` (`import "server-only"`, no `dotenv`, postgres.js with `prepare: false`, reads `DATABASE_URL` through `serverEnv`);
  - `db/schema/index.ts` → `db/schema.ts` (empty re-export with an ADR 0005 comment);
  - `modules/` exists (`modules/.gitkeep`).

  All imports are updated; `components/`, `lib/`, `hooks/`, `types/` and `db/schema/` no longer exist.
- [ ] Given `components.json`, then its aliases point to the new paths (`components` → `@/shared`, `ui` → `@/shared/ui`, `utils` → `@/shared/lib/utils`, `lib` → `@/shared/lib`, `hooks` → `@/shared/hooks`). `drizzle.config.ts` points `schema` to `./db/schema.ts` (it keeps `dotenv` for the CLI only).
- [ ] Given `.dependency-cruiser.cjs` and `pnpm check:boundaries`, when it runs on the repo, then it passes. It also **fails** on each of these deliberately broken temp files, which are created, checked and then deleted during verification:
  1. a file outside `modules/x/` importing `@/modules/x/infrastructure/...` (or a relative path into another module);
  2. a circular import between two files;
  3. `shared/**` importing from `modules/**`;
  4. `modules/*/domain/**` importing `next`, `react`, `drizzle-orm`, `zod`, `db/` or its module's `infrastructure/`.

  Exception: `modules/*/infrastructure/schema.ts` may import another module's `infrastructure/schema.ts`.
- [ ] Given `server-only` in `db/client.ts`, when any client component imports it (temp file), then `pnpm build` fails. This is the client/server leak check that dependency-cruiser can't see (it doesn't read `"use client"`).

**Data move (context ↔ app)**

- [ ] Given ADR 0002 §11, then:
  - `data/redirect-map.csv`, `data/design-tokens.json` and `data/seed/*.json` exist in `43logistics.vn/data/`, byte-identical to the context copies at the time of the move;
  - they are deleted from the context workspace;
  - `data/media-inventory.csv` stays in the context (it moves in C-04).
- [ ] Given the context docs, then every reference to the moved files points to `43logistics.vn/data/...`: `AGENTS.md`, `CLAUDE.md`, `docs/context/*`, the proposal, the ADRs' consequences only where they give an instruction, the skills and `.claude/rules/*`. `grep -rn "data/redirect-map.csv\|data/design-tokens.json\|data/seed" --include=*.md .` shows only app-relative or `43logistics.vn/`-prefixed paths.

**Records**

- [ ] Given Cache Components, then **ADR 0006** (written with `/adr`) records:
  - Cache Components is enabled in F-01;
  - the compatibility findings for the current Clerk and next-intl releases (doc-based, both not installed);
  - the rule that F-03 (next-intl) and F-05 (Clerk) re-verify on install and amend ADR 0006 if they need a fallback.
- [ ] Given the app's `AGENTS.md`, then the local, uncommitted ADR 0005 edits (module layout, rules pointer) are committed in this PR, and its "today" notes are updated: Next 16, Biome 2, `typecheck`, `shared/`.
- [ ] Given the end state, then `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries` and `pnpm build` pass with an empty `.env`. `/` still serves the F-00 placeholder (`lang="vi"`, `noindex, nofollow`, one H1); the demo routes still 404.

### Scope

**In scope:**

- Next 16 + React (≥ 19.2) upgrade with Turbopack, `next.config.ts`, `cacheComponents`, `trailingSlash`.
- Biome 2 migration, script cleanup, Prettier removal, the ESLint-gap comparison.
- Removing the dependencies listed above; Zod 4; adding `server-only` and `dependency-cruiser`.
- `shared/config/env.ts`, `shared/types/action-state.ts`.
- The ADR 0005 file moves, `components.json` and `drizzle.config.ts` paths, `db/client.ts`, `modules/.gitkeep`.
- dependency-cruiser boundary rules + `check:boundaries`.
- The data move and the context reference updates.
- ADR 0006 (Cache Components compatibility).
- App `AGENTS.md` / README command updates.

**Out of scope:**

- Tailwind v4, tokens, shadcn re-init/pruning, `motion`, fonts (**F-02**). Tailwind 3 and the current shadcn files keep working after the move.
- next-intl, `[locale]` layout, `messages/`, `shared/i18n` (**F-03**).
- New DB schema, Drizzle/drizzle-kit upgrade, Supabase project, seed script (**F-04**).
- Clerk for `/admin` (**F-05**); `proxy.ts` (**F-06**); redirects loader and `check:redirects` (**F-07**); the CI workflow beyond the existing gitleaks job (**F-08**). `check:boundaries` joins CI in F-08.
- Any real page, module code or content.
- `AGENTS.md` §3/§7 "In the app today" and "Status" cells. `/mark-implemented` updates them from the merge commit.

### Affected Areas

| Repo | Layer | File / Path |
|------|-------|-------------|
| app | tooling | `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` (allowlist if new build scripts appear), `biome.json`, `.husky/pre-commit` |
| app | config | `next.config.mjs` → `next.config.ts`, `tsconfig.json` (only if Next 16 requires it), `components.json`, `drizzle.config.ts`, `postcss.config.mjs` (unchanged unless the upgrade requires), delete `prettier.config.cjs` |
| app | boundaries | `.dependency-cruiser.cjs` (new) |
| app | shared | `shared/ui/*` (from `components/ui/*`), `shared/lib/utils.ts`, `shared/hooks/*`, `shared/config/env.ts` (new), `shared/types/action-state.ts` |
| app | db | `db/client.ts` (from `db/db.ts`), `db/schema.ts` (from `db/schema/index.ts`); `db/migrations/` untouched |
| app | modules | `modules/.gitkeep` |
| app | pages | `app/layout.tsx` (import path updates only), `app/page.tsx` (unchanged) |
| app | data | `data/redirect-map.csv`, `data/design-tokens.json`, `data/seed/*.json` (new copies) |
| app | docs | `AGENTS.md`, `README.md` |
| context | data | delete `data/redirect-map.csv`, `data/design-tokens.json`, `data/seed/` |
| context | docs | `AGENTS.md`, `CLAUDE.md`, `docs/context/*`, `docs/proposals/*`, `.claude/skills/*`, `.claude/rules/*` (path references only), `docs/adr/0006-*.md` (new, via `/adr`), `docs/context/00-index.md` |

### Golden-rule checks

- **Rule 15 (secrets):** `env.ts` never logs values; `.env.example` unchanged except for any variable genuinely added (none expected).
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
- **Risk:** Zod 4 has API changes (`z.string().url()` → `z.url()` etc.). There are no existing schemas, so only `env.ts` is affected.
- **Risk:** deleting `data/*` from the context breaks docs links. The grep AC covers it.

### Manual Verification Plan

- **Scenario:** Given a fresh clone of the PR branch with an empty `.env`, when it is installed, checked and built, then everything passes on Next 16 / Biome 2 / Zod 4. The new layout is in place, the boundary rules catch violations, and `/` behaves exactly as after F-00.
- **Seed needs:** none.
- **Steps:**
  1. `node -v` ≥ 20.9. Then `pnpm install --frozen-lockfile`: record the install log's peer warnings, with none for `next`/`react`/`react-dom`.
  2. `pnpm ls next react react-dom zod @biomejs/biome --depth 0` → Next 16.x, React ≥ 19.2, Zod 4.x, Biome 2.x. `pnpm ls @clerk/nextjs posthog-js framer-motion next-themes prettier` → not found.
  3. `pnpm lint && pnpm typecheck && pnpm check:boundaries && pnpm build`. All pass; the build shows Turbopack and the route table (`/`, `/_not-found`). Record first-load JS for `/` and compare with F-00's 101 kB.
  4. `ls components lib hooks types db/schema 2>&1` → "No such file". `ls shared/ui shared/lib shared/hooks shared/config shared/types modules db` → as specified. `grep -rn "@/components\|@/lib/\|@/hooks\|@/types" --include=*.ts --include=*.tsx . --exclude-dir=node_modules` → no output.
  5. `cat next.config.ts` → `cacheComponents: true`, `trailingSlash: true`.
  6. **Boundary negative checks.** Create each temp file, run `pnpm check:boundaries` (expect a failure naming the rule), then delete it:
     - (a) `app/zz.ts` importing `@/modules/x/infrastructure/q` (create a temp `modules/x/infrastructure/q.ts` too);
     - (b) `shared/lib/zz-a.ts` ↔ `shared/lib/zz-b.ts` importing each other;
     - (c) `shared/lib/zz.ts` importing `@/modules/x`;
     - (d) `modules/x/domain/zz.ts` importing `zod`.
     - (e) A positive control: `modules/y/infrastructure/schema.ts` importing `@/modules/x/infrastructure/schema` passes.
  7. **Server-only check:** a temp `app/zz-client.tsx` with `"use client"` importing `@/db/client` → `pnpm build` fails with the `server-only` error. Delete it, and the build passes again.
  8. **env.ts:**
     - `NEXT_PUBLIC_SITE_URL=not-a-url pnpm build` → fails, naming `NEXT_PUBLIC_SITE_URL` and printing no value;
     - unset → passes;
     - `NEXT_PUBLIC_SITE_URL=https://43logistics.vn pnpm build` → passes.
  9. **Hook:** stage a temp file with an unused import → `git commit` is blocked by Biome 2. Then unstage and delete it.
  10. **Placeholder unchanged.** `pnpm start -p 3100`:
      - `/` → 200 with `lang="vi"`, `noindex, nofollow`, one `<h1>`;
      - `/todo` → 404.
      - The axe-core scan at 360 and 1280 px finds 0 violations.
      - Lighthouse mobile performance ≥ 90 and accessibility 100, with LCP/CLS recorded (verification-patterns tooling).
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
  5. Zod 4 + `server-only` + `env.ts` + `ActionState`;
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
