---
name: implement
description: Implement an approved spec from specs/ in the 43logistics.vn app repo. Detects whether the app repo is available locally (LOCAL vs HANDOFF mode), works test-first, checks golden rules, opens a PR. Never marks a spec implemented.
argument-hint: "<spec-filename-or-slug> [--review]"
---

# Implement

**Context budget:**

- the target spec
- `AGENTS.md`
- the `docs/context/*` files the spec or roadmap row lists
- an Explore pass over the affected areas only

**Output:** one of

- working code plus a PR in `43logistics.vn/` (LOCAL)
- an implementation brief (HANDOFF)
- a drift report (REVIEW-ONLY)

**Never:**

- set `status: implemented` (that is `/mark-implemented`);
- edit context docs, except the spec's front matter, the `AGENTS.md` §3/§7 rows the task closes, and context changes that an AC of the spec explicitly requires (e.g. F-01 repointing docs to moved data files); list those as "context edits" in the scope statement;
- put runtime code in the context workspace.

---

## Step 1 — Resolve the spec

Try `specs/$ARGUMENTS`, then `specs/$ARGUMENTS.md`, then a glob on the slug. Read it fully. Extract:

- `owner_repo`, `roadmap` and `blocked_by_questions`
- the acceptance criteria, affected areas and test plan

The spec must have `status: approved` or `in_implementation`. If it is `draft`, ask the user to approve it first (via `/feature-bug` Step 8 or by editing the spec).

## Step 2 — Mode

```bash
test -f 43logistics.vn/package.json && echo app=available || echo app=absent
git -C 43logistics.vn status --short
command -v codex >/dev/null && echo codex=yes || echo codex=no
```

State the mode visibly:

- `Mode: LOCAL — app at ./43logistics.vn | worktree: clean/dirty | Codex: yes/no`
- `Mode: HANDOFF — app repo not available`
- `Mode: REVIEW-ONLY — --review flag` (Step 3c)

If the app worktree is dirty with changes you didn't make, list them and ask before continuing. Never stash or revert them.

**Prerequisite gate:** compare the spec's needs with `AGENTS.md` §3. If it needs a target feature whose closing task isn't done (e.g. `proxy.ts` before F-01), stop and say which task must come first.

## Step 3 — Clarify (AskUserQuestion, one batch)

- "Is anything in the spec unclear?" Offer `No` and 1–2 inferred ambiguities.
- "Scan beyond the affected areas?" Offer `Yes` / `No, stay in scope`.
- For each Q-ID in `blocked_by_questions`, offer "Ship with placeholder behind a flag" or "Wait for the owner".

## Step 3a — LOCAL

### Scope statement (required before writing code)

```
## Scope: <slug>
Affected areas (spec): <repo | layer | path>
Planned edits: <path — change>
AC coverage: <AC → change>
Support files (tests/fixtures/messages): <path — which AC it enables>
Out of scope: <from spec>
Watch out for: <lesson rows / golden rules that apply>
```

Any planned edit outside the affected areas that isn't a support file needs the user's OK first. Ask: "I also need to edit `<path>` because `<reason>`. Proceed?"

### Task list

Create one task per AC, plus one each for these pipeline stages:

- Red
- Green
- Self-review
- Conformance
- PR

Mark each task in progress and then completed as you go. An AC is complete only when its test passes.

### Lessons

Read the `lessons/INDEX.md` table (rows only, don't follow links). Also read `lessons/ai-mistakes.md` if it exists. Carry the matches into "Watch out for".

### Branch

- **Resuming** (`status: in_implementation` and the spec has `branch:`): run `git -C 43logistics.vn switch <branch>` and continue there.
- **New:**

  ```bash
  git -C 43logistics.vn switch main && git -C 43logistics.vn pull --ff-only
  git -C 43logistics.vn switch -c feat/<roadmap-id>-<slug>     # fix/<slug> for bugs
  ```

  Then record `branch: <name>` in the spec front matter.

### Red → Green

1. Write failing tests first:
   - pure logic (price engine, slug and metadata builders, Zod schemas, redirect loader) → Vitest in `tests/unit/`;
   - flows (`/go/[channel]`, lead form, language switch, redirects) → Playwright in `tests/e2e/`.
2. Run `pnpm -C 43logistics.vn test -- <pattern>`. If the tests **pass** before any code exists, stop: either the test is wrong or the behaviour already exists. Investigate.
   - If the test runner doesn't exist yet (before F-01), say so. Verify instead with `pnpm -C 43logistics.vn typecheck` (or `type-check`) plus a manual check, and note it in the PR.
3. Implement until the tests are green. Then run:

   ```bash
   pnpm -C 43logistics.vn lint && pnpm -C 43logistics.vn typecheck && pnpm -C 43logistics.vn test
   ```

4. After the first passing check, set the spec to `status: in_implementation` (file + `specs/INDEX.md` row).

**Failure tracking:** if tests still fail after 2 fix attempts, record what broke and what you tried, then write a lesson draft (Step 4).

### Self-review (fix inline before moving on)

**Code quality**

- No dead code, unused imports or commented-out blocks.
- No `<ai_context>` headers in new files.
- One source of truth: shared constants, event names (`lib/tracking`), Zod schemas and types are each defined once.
- Extract only when there are 2 or more real use sites.

**Golden rules (`AGENTS.md` §4); check each one that applies**

- [ ] No business fact or price in components or copy; it is read from DB/settings, and unknowns render nothing or a placeholder (rules 1–2).
- [ ] Public pages have one H1, `generateMetadata` with canonical + alternates, JSON-LD, breadcrumbs and a Zalo CTA (4).
- [ ] Reads go through `server/queries` with `"use cache"` + `cacheTag`; writes go through `server/actions`, which call `updateTag`/`revalidateTag` (5).
- [ ] `@/db` is imported only on the server; no secrets in client bundles (6).
- [ ] Admin actions and handlers call `requireRole` (7).
- [ ] No new client JS on public pages without need: no Clerk, TanStack Query or `motion` there; `next/image` is used (8).
- [ ] Animations use transform/opacity only, respect reduced motion and don't touch the LCP element (9).
- [ ] Inputs are labelled, focus is visible, targets are ≥ 44 px and only token colours are used (10).
- [ ] No uppercase menus or buttons; fonts load the `vietnamese` subset (11).
- [ ] Contact links go through `/go/[channel]`, and events are fired once via `lib/tracking` (12).
- [ ] Consent is respected; IPs are hashed (14).
- [ ] Strings exist in both `messages/vi.json` and `messages/en.json`; `typecheck` passes with no `any`.

Re-run the full check command after the self-review fixes. If a test breaks, fix the code, not the test.

### Spec conformance

```
## Spec Conformance: <slug>
✅ Covered: <ACs>
Mismatches:
- [implementation-bug] … → BLOCKING
- [spec-amendment] … → noted in PR; spec owner updates spec
- [compatible-tightening] … → noted in PR
Result: PASS | BLOCKED (N)
```

Fix every `implementation-bug` before opening the PR.

### Close stack gaps

If this task closes a row in `AGENTS.md` §3 or adds a script to §7, update those rows in the context workspace. Tell the user this is a context-repo change.

### PR (English)

```bash
git -C 43logistics.vn add <explicit paths>          # never add . / -A
git -C 43logistics.vn commit -m "feat(<scope>): <title>"   # Conventional Commits
git -C 43logistics.vn push -u origin HEAD
gh pr create -R Dienvm/43logistics.vn --base main --head "$(git -C 43logistics.vn branch --show-current)" --title "<type>(<scope>): <spec title>" --body "Spec: logistics-context/specs/<file> · Roadmap: <ID>

## Changes
## Acceptance criteria (✅ / ⚠️)
## Test results
## Conformance notes
"
```

If push or PR creation fails, report the exact error and leave the branch in place.

## Step 3b — HANDOFF

Write `/tmp/43l-impl-brief-<slug>.md` containing:

- the spec summary, affected areas and steps;
- the golden rules that apply;
- the commands to run;
- completion criteria: "All ACs green → `/mark-implemented <slug> <merged PR>`".

Write no code in this mode.

## Step 3c — REVIEW-ONLY

Compare the existing diff or PR against each AC (met / partial / missing / deviates). Write `/tmp/43l-impl-review-<slug>.md`.

## Step 4 — Lesson draft (only on failure)

Write a draft if any of these happened:

- tests still failed after 2 attempts;
- an AC was too ambiguous to implement;
- edits were needed outside the affected areas;
- lint or type errors couldn't be resolved.

Write `/tmp/43l-lesson-draft-<slug>.md` with: what happened, the suspected cause, and the follow-up options. Then say: "⚠️ Lesson draft saved — run `/lesson <slug>` or discard."

## Step 5 — Report

```
## Implement — <spec title>
Mode: LOCAL | HANDOFF | REVIEW-ONLY
Spec: specs/<file> (status: in_implementation)
Checks: lint ✅ · typecheck ✅ · unit N/N · e2e N/N   (or: not run — reason)
PR: <url | skipped — reason>
Next: /code-review <slug>, then /mark-implemented <slug> <PR> after merge
```
