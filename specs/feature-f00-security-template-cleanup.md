---
title: Untrack secrets and strip the demo template
type: feature
status: in_implementation
branch: feat/f-00-security-template-cleanup
owner_repo: app
roadmap: F-00
priority: critical
blocked_by_questions: []
updated: 2026-10-21
---

## Feature: Untrack secrets and strip the demo template

### Problem Statement

Roadmap **F-00** (`docs/context/10-roadmap.md`, Phase 0). The app repo `43logistics.vn/` started from a demo template (ADR 0002) and has one commit, `3146397 Init project`, pushed to `origin/main`. Three problems:

- **`.env` is tracked.** The commit includes `.env` with real Supabase and Clerk credentials. The owner confirmed on 2026-10-21 that the keys have been **rotated** and the local `.env` values cleared. The file is still tracked, so the next real value written to it would be committed again.
- **Demo code is still wired in.** It loads Clerk and PostHog on every public page, before any consent:
  - the root layout wraps everything in `ClerkProvider` and calls `auth()` + `createProfileAction` on every request;
  - the header uses `SignedIn`/`SignedOut`;
  - `posthog.init` runs when the module loads;
  - there are public `/login` and `/signup` routes;
  - `/todo` is protected by `clerkMiddleware`;
  - Stripe env vars, "Mckay's App Template" copy and 48 `<ai_context>` headers remain.
- **The pre-commit hook runs `npm … && git add .`.** It can stage `.env*` and the WordPress dump, breaking AGENTS.md rule 15 and §6 Git.

Every later code task depends on a clean, secret-free base.

### Proposed Solution

After this change the repo contains no secrets and no template demo. Visiting the site shows a single placeholder home page in Vietnamese ("43 Logistics", site under construction), marked `noindex`. It loads no Clerk or PostHog code and makes no third-party requests. Commits and PRs are scanned for secrets.

### Acceptance Criteria

**Secrets**

- [ ] Given the app repo, when running `git ls-files | grep -E '^\.env'`, then the only result is `.env.example`. `.env` is removed from the index with `git rm --cached .env`; the local file stays.
- [ ] Given `.gitignore`, then it ignores `.env` and `.env*` and re-includes `.env.example` (`!.env.example`). `git check-ignore .env .env.local .env.production` reports all three as ignored.
- [ ] Given `.env.example`, then it lists only variable names with empty values, matching `06-architecture.md` "Environment variables" for the services installed today:
  - `DATABASE_URL`, `DATABASE_URL_DIRECT`;
  - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`;
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`;
  - `NEXT_PUBLIC_SITE_URL`;
  - `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`.

  No `STRIPE_*`, `NEXT_PUBLIC_STRIPE_*`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `SUPABASE_URL` or `SUPABASE_BUCKET_RECEIPTS`.
- [ ] Given the old credentials in commit `3146397`, then the PR description records the owner's per-credential confirmation, given on 2026-10-21 during the spec interview, that each **old** value is invalid (no longer works):
  - Supabase DB password (`DATABASE_URL`);
  - Supabase service-role key;
  - Clerk secret key;
  - PostHog key.

  It also records "history not rewritten (owner decision)". No history rewrite and no force-push. If gitleaks finds a credential type in `3146397` that is **not** on this list, stop and ask the owner before allowlisting it.
- [ ] Given the repo, when gitleaks scans the full history, then the only findings are the rotated values in commit `3146397`. Those are listed by fingerprint in `.gitleaksignore`, with a comment pointing to this spec. No other allowlist rules or path exclusions are added.
- [ ] Given a pull request or a push to any branch, when CI runs, then a **gitleaks** job (`.github/workflows/security.yml`, `gitleaks/gitleaks-action@v2`, `fetch-depth: 0`) runs and fails on any new finding. **Negative check:** a throwaway branch with a commit adding a synthetic key makes the job fail; the branch is then deleted from the remote and locally.

**Pre-commit hook**

- [ ] Given `.husky/pre-commit`, then it:
  - uses `pnpm` only;
  - runs `pnpm exec biome check --staged --no-errors-on-unmatched` (staged files only, no `--write`);
  - runs gitleaks' staged scan when `gitleaks` is on `PATH`, and otherwise prints a warning with the install hint (`brew install gitleaks`) and continues;
  - contains no `git add`.
- [ ] Given `package.json`, then `prepare` is `husky` (husky 9 syntax), not `husky install`.
- [ ] Given `biome.json`, then `vcs.enabled` is `true`, with `clientKind: "git"`, `useIgnoreFile: true` and `defaultBranch: "main"`, using the installed Biome 1.9 schema, so `--staged` works. A lint error in a **staged** file blocks the commit; the same error in an **unstaged** file doesn't.

**Demo code removed**

- [ ] Given the build output, when running `pnpm build`, then the only app routes are `/` and the default not-found. These no longer exist: `/todo`, `/login`, `/signup`, `/about`, `/contact`, `/pricing`.
- [ ] Given the codebase, then these are deleted:
  - `app/todo/`, `app/(auth)/`, `app/(marketing)/`;
  - `actions/db/todos-actions.ts`, `actions/db/profiles-actions.ts`;
  - `db/schema/todos-schema.ts`, `db/schema/profiles-schema.ts`;
  - `components/header.tsx`, `components/landing/`, `components/magicui/`, `components/sidebar/`;
  - `components/utilities/posthog/`, `components/utilities/providers.tsx`, `components/utilities/theme-switcher.tsx`;
  - `middleware.ts`, `prompts/`, `.repo_ignore`.

  `db/schema/index.ts` exports nothing and `db/db.ts` passes an empty schema. Migration files in `db/migrations/` are left unchanged (F-04 resets the schema).
- [ ] Given `app/layout.tsx`, then:
  - it renders `<html lang="vi">` + `<body>` + children only;
  - there is no `ClerkProvider`, `auth()`, profile action, PostHog component, theme provider or `TailwindIndicator`;
  - the font loads with `subsets: ['latin', 'vietnamese']` (rule 11);
  - metadata has the title "43 Logistics" and `robots: { index: false, follow: false }`.
- [ ] Given `app/page.tsx` (new placeholder), then it:
  - is a Server Component with exactly one `<h1>` ("43 Logistics") and one short line saying the new site is being built;
  - has no prices, phone numbers, addresses or hours (rule 1; the phone/Zalo mapping is still Q-06);
  - has no images with text and no client JS of its own.
- [ ] Given the production build served with `pnpm start`, when `/` is loaded with an empty cache, then:
  - the browser makes no requests to `*.clerk.*`, `clerk.accounts.dev`, `*.posthog.com` or `/ingest`, and sets no `__clerk*` / `ph_*` cookies;
  - `grep -rliE "posthog|clerk" .next/static` returns no files.
- [ ] Given the repo, when running `grep -rn "ai_context" . --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git`, then there are no matches. The header comment block is removed from **every** remaining file, including `lib/hooks/*`, `lib/utils.ts` and `components/ui/*`. This is a comment-only edit; the files are otherwise unchanged.
- [ ] Given `README.md`, then the template README is replaced with a short project README: what the repo is, `pnpm` commands that exist, a pointer to the context workspace and `AGENTS.md`, and "never commit `.env*`".
- [ ] Given the untracked `AGENTS.md` and `CLAUDE.md` in the app repo, then both are committed in this PR, so agents that open only the app get the rules.

**Checks**

- [ ] With an empty `.env` (all values blank), `pnpm install`, `pnpm lint`, `pnpm type-check` and `pnpm build` pass with no errors.

### Scope

**In scope:**

- Untracking `.env`, `.gitignore`, `.env.example` cleanup, `.gitleaksignore` for the rotated commit only.
- gitleaks CI workflow (`security.yml`) and a pnpm/Biome/gitleaks pre-commit hook.
- Deleting the demo routes, components, actions, schemas, middleware, `prompts/`, `.repo_ignore`, and all `<ai_context>` headers.
- Minimal root layout + `noindex` placeholder home page.
- Project README; committing the app's `AGENTS.md` / `CLAUDE.md`.

**Out of scope:**

- Rotating keys (done by the owner) and rewriting git history (owner decision: not done).
- Removing npm dependencies. `@clerk/*`, `posthog-js`, `next-themes`, `framer-motion`, `embla-carousel-react` etc. stay installed but unused: F-01/F-02 prune and upgrade them, F-05 reuses Clerk, S-13 reuses PostHog.
- Functional changes to `components/ui/*` (shadcn) and `hooks/` / `lib/hooks/` (pruning, merging): F-01/F-02. Only their `<ai_context>` comment headers are removed here.
- Next 16 / `proxy.ts` / Biome 2 / Tailwind 4 / `typecheck` rename (F-01, F-02), Zod `env.ts` (F-01).
- New DB schema, migrations, seed (F-04). Clerk for `/admin` (F-05).
- The full CI pipeline (F-08). This spec adds only the gitleaks job.
- Any real page content, i18n, design tokens.

### Affected Areas

| Repo | Layer | File / Path |
|------|-------|-------------|
| app | git/config | `.gitignore`, `.env.example`, `.env` (untracked), `.gitleaksignore` (new) |
| app | CI | `.github/workflows/security.yml` (new) |
| app | hooks | `.husky/pre-commit`, `package.json` (`prepare`), `biome.json` (`vcs`) |
| app | page/layout | `app/layout.tsx`, `app/page.tsx` (new), delete `app/todo/`, `app/(auth)/`, `app/(marketing)/` |
| app | middleware | delete `middleware.ts` |
| app | server action | delete `actions/db/todos-actions.ts`, `actions/db/profiles-actions.ts` |
| app | db schema | `db/schema/index.ts`, `db/db.ts`; delete `db/schema/todos-schema.ts`, `db/schema/profiles-schema.ts` |
| app | components | delete `components/header.tsx`, `components/landing/`, `components/magicui/`, `components/sidebar/`, `components/utilities/{posthog/,providers.tsx,theme-switcher.tsx}` |
| app | misc | delete `prompts/`, `.repo_ignore`; `README.md`; add `AGENTS.md`, `CLAUDE.md`; strip `<ai_context>` headers repo-wide (incl. `lib/hooks/*`, `lib/utils.ts`, `components/ui/*`) |
| context | doc (via `/mark-implemented`) | `AGENTS.md` §3 "In the app today" rows: Auth (global Clerk + public sign-up removed, staff Clerk pending F-05), Product analytics (PostHog removed, lazy consent-gated init pending S-13), Package manager (hook uses pnpm). Updated with this intermediate state by `/mark-implemented`, not by this PR |

### Golden-rule checks

- **Rule 15 (secrets):** `.env` untracked, `.gitignore` covers `.env*`, gitleaks in CI + hook, no `git add .` in the hook; never print `.env` values in the PR, logs or chat.
- **Rule 14 (consent):** no PostHog or other tags load on public pages (no consent banner exists yet, so nothing may load).
- **Rule 8 (JS budget):** no Clerk or PostHog JS on public pages.
- **Rule 1 (facts):** the placeholder shows only the confirmed brand name "43 Logistics", with no contacts, prices or hours.
- **Rules 4 / 11 and §9 strings:** the placeholder is a **development placeholder, not a public page**. It must not be served on any publicly reachable deployment:
  - not the production domain, which stays on WordPress until L-02;
  - not an unprotected Vercel preview; preview deployments, if Vercel is set up (Q-15), must have Deployment Protection enabled.

  This holds until S-01 (layout + Zalo CTA), S-05 (home) and S-10 (metadata/JSON-LD) replace it. It still has one `<h1>`, `lang="vi"` and the Vietnamese font subset (rule 11). Its two hard-coded Vietnamese strings are a **temporary exception** to §9 "strings in `messages/*`": next-intl isn't installed (AGENTS.md §3, closed by F-03), and per §3 a stack gap isn't worked around inside an unrelated task. The exception expires in F-03, which moves them into `messages/{vi,en}.json` (or S-05 replaces the page first). The `noindex` meta is defence in depth, not the justification.

### Dependencies & Risks

- **Depends on:** nothing; this is the first code task.
- **Blocked by questions:** none. Q-06 (which number is Zalo/hotline) is avoided by showing no contact details on the placeholder.
- **Risk:** if a key was missed during rotation, it stays usable from history. Mitigation: gitleaks lists every secret found in `3146397`; the implementer reports the finding types (never the values) in the PR, so the owner can confirm each one was rotated.
- **Risk:** removing `clerkMiddleware` while `@clerk/nextjs` stays installed. Nothing imports Clerk any more, so no request needs it. F-05 brings Clerk back for `/admin` only.
- **Risk:** `biome check --staged` may flag formatting in files touched by this PR. Format those files once in this PR (`pnpm format:write` on the changed paths only).
- **Risk:** the `gh` CLI is logged in as `dienfpt`, while the repo is `Dienvm/43logistics.vn`. If pushing or opening the PR fails, `/implement` keeps the branch local and reports it.

### Manual Verification Plan

- **Scenario:** Given a fresh clone of the PR branch with an empty `.env`, when it is installed, built and served, then the site has only a `noindex` placeholder home, loads no Clerk/PostHog code, no secret is tracked, and any new secret makes CI fail (and the pre-commit hook, where gitleaks is installed).
- **Seed needs:** none (no DB access in this task).
- **Steps:**
  1. `git ls-files | grep -E '^\.env'` → only `.env.example`. `git check-ignore .env .env.local .env.production` → all three printed.
  2. `cat .env.example` → only the names listed in the AC, no values, no Stripe/sign-up/receipts/`SUPABASE_URL`.
  3. `pnpm install && pnpm lint && pnpm type-check && pnpm build` → all pass. The build route table lists only `/` (+ `/_not-found`).
  4. `grep -rliE "posthog|clerk" .next/static` → no output. `grep -rn "ai_context" . --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git` → no output. `ls prompts .repo_ignore middleware.ts` → "No such file".
  5. `pnpm start`, open `http://localhost:3000/` at 360 px and 1280 px with DevTools → Network, cache disabled:
     - no requests to Clerk or PostHog domains; Application → Cookies has no `__clerk*` / `ph_*`;
     - view source has `<html lang="vi">`, `<meta name="robots" content="noindex, nofollow">`, exactly one `<h1>`;
     - no contact details, prices or hours on the page.
  6. **Tracking-removal check**, in a fresh profile:
     - (a) first visit;
     - (b) reload and open `/does-not-exist` then back to `/`;
     - (c) manually create the old template's leftovers (a `ph_test_posthog` cookie and a `__clerk_db_jwt` cookie on localhost, plus a `ph_test` localStorage key), then reload.

     In every case: Network shows only same-origin requests (`localhost:3000`, `/_next/*`); no new cookies or localStorage keys are created by the page; the leftovers aren't read or refreshed by any script. Consent-banner states (accept, selective, withdraw) are **not applicable**: no consent UI or tag exists until S-13, and that's recorded in the PR.
  7. Open `/todo`, `/login`, `/signup`, `/about`, `/contact`, `/pricing` → 404 for each.
  8. Viewports and input:
     - check `/` at 360, 768 and 1280 px: no horizontal scroll, text readable;
     - keyboard: Tab reaches nothing unexpected and the focus ring is visible on any focusable element (expected: none or the not-found link only);
     - DevTools → Rendering → `prefers-reduced-motion: reduce`: no animation either way (there is none).
  9. axe DevTools scan of `/` at 360 and 1280 px → zero serious/critical issues.
  10. Performance (Lighthouse mobile, `pnpm start`, consent N/A). Record:
      - performance and accessibility scores (targets ≥ 90 / ≥ 95);
      - LCP, CLS, and INP from a manual click/tap on the page (Web Vitals extension or the Performance panel);
      - initial first-party JS transferred (gz) from the Network panel, which must be under 120 KB.

      The SEO 100 target is **not applicable**: the page is intentionally `noindex` (see Golden-rule checks).
  11. Hook check:
     - `cat .husky/pre-commit` → `pnpm exec biome check --staged …`, a gitleaks step guarded by `command -v gitleaks`, no `npm`, no `git add`;
     - stage a harmless file and commit → the hook runs, and prints the gitleaks warning if it isn't installed;
     - with gitleaks installed, stage a file containing a fake AWS-style key (`AKIA` + 16 chars) → the commit is blocked (then unstage and delete it);
     - Biome: add an unused import to a staged file → blocked; add the same to an unstaged file and commit another staged clean file → allowed.
  12. CI:
      - the PR shows a green **gitleaks** job, and `.gitleaksignore` contains only fingerprints whose commit is `3146397`;
      - negative check: push a throwaway branch `chore/gitleaks-canary` with one commit adding a synthetic `AKIA…` key → the gitleaks job fails; then delete the branch on the remote and locally.
- **Validation commands:** `pnpm -C 43logistics.vn lint` + `type-check` + `build`. `i18n:check` and `check:redirects` don't exist yet (F-03/F-07). The full consent matrix isn't applicable (no consent UI yet); step 6 is the removal-specific version of it. No automated tests (ADR 0004).

### Implementation Hints

- Order: branch `feat/f-00-security-template-cleanup` from `main` → `git rm --cached .env` + `.gitignore` first (so nothing secret can be staged) → deletions → layout/page → hook/CI → README.
- **Stage explicit paths only** (AGENTS.md §6 Git); never `git add .` / `-A`, even after the hook is fixed.
- Generate `.gitleaksignore` by running gitleaks on the full history (`gitleaks git --report-format json` or `gitleaks detect` on older versions) and copying only the fingerprints of findings in `3146397`. If gitleaks isn't installed locally, install it with `brew install gitleaks`, or run the CI job once and copy the fingerprints from its report.
- Never print `.env` contents or secret values; report only rule IDs and file names.
- `db/db.ts` calls `config({ path: ".env" })` and throws without `DATABASE_URL` when imported. After this change nothing imports it, so the build must not import it either (check the build passes with an empty `.env`).
- Delete `components/utilities/tailwind-indicator.tsx` only if nothing else imports it; the layout no longer uses it.
- PR description: list the deleted paths, the rotation note, "Outstanding owner questions: none".

### Related

- Roadmap: `docs/context/10-roadmap.md` F-00 (next: F-01 upgrade, F-08 CI).
- ADR 0002 (template stack, F-00 cleanup), ADR 0004 (code-only delivery; gitleaks kept), ADR 0003 (workflow).
- `docs/context/06-architecture.md` "Environment variables" (template leftovers list).
- `AGENTS.md` §3 (Auth, Product analytics, Package manager rows), §4 rules 1, 8, 14, 15, §6 Git.
- Proposal `docs/proposals/nextjs-rebuild-quynam-pattern.md` §6 security (F-00 stays first).
