---
name: implement
description: Implement an approved spec from specs/ in the 43logistics.vn app repo. Detects whether the app repo is locally available and switches mode accordingly, works test-first, opens a PR, then has Codex review, verify and debate the implementation. Never marks spec as implemented.
argument-hint: "<spec-filename-or-slug> [--review]"
---

# Implement

> **Before Step 1:** follow AGENTS.md §6 "Running skills". Resolve and `cd` to the context root, do the state recovery, substitute and quote every `<placeholder>`, and run long commands in the background in Claude Code (synchronously in Codex).

**Context budget:** the target spec + `AGENTS.md` (§3 stack gaps, §4 golden rules, §8 conventions) + a targeted Explore of the affected areas only.

**Output contract:** working code + PR (LOCAL mode), OR an implementation brief (HANDOFF mode), OR a drift report (REVIEW-ONLY mode). Always followed by a Codex review/debate record.

**Never:**

- Update spec status beyond `in_implementation`.
- Touch docs outside the target repo. The exceptions are:
  - lifecycle metadata: the spec's front matter and its `specs/INDEX.md` row;
  - the `AGENTS.md` §3/§7 rows the task closes;
  - context updates that an AC requires, or that `AGENTS.md` §9 requires when a fact or decision changes (list them in the scope statement).
- Apply fixes in the wrong workspace. Runtime code goes only in `43logistics.vn/`.

**Project mapping (sample → this repo):**

| Sample concept | In this repo |
| --- | --- |
| BLUEPRINT.md | `AGENTS.md` + `docs/adr/*` + `docs/context/06-architecture.md` |
| foresent-rules / foresent-robot | `context` (this workspace) / `app` (`43logistics.vn/`) |
| `yarn test` / `yarn lint` | `pnpm -C 43logistics.vn test` / `pnpm -C 43logistics.vn lint` + `typecheck` |
| Fixture YAML | Vitest unit tests + Playwright e2e + seed data |
| Codex bridge | `codex exec` |

---

## Step 1 — Resolve spec

First strip flags from `$ARGUMENTS` (`--review` selects REVIEW-ONLY mode). Then resolve the remaining slug: try `specs/<slug>`, then `specs/<slug>.md`, then `specs/*-<slug>.md`.

- **None found:** stop.
- **More than one match:** stop, list the matches, and ask which one.

Read the spec fully. Extract:

- `owner_repo`, `roadmap`, `blocked_by_questions`, `branch` (if present)
- the Affected Areas table
- the Acceptance Criteria
- the Test / Fixture plan

The spec must have `status: approved` or `status: in_implementation` to proceed.
If it has `status: draft`, tell the user to review and approve the spec first (`/feature-bug` Step 11, or edit the spec).

---

## Step 2 — Detect mode

Select the repos from `owner_repo`:

- `app`: the app only.
- `context`: the context workspace only (no app branch or PR).
- `both`: both repos.

Check that each selected repo is available locally:

```bash
# app (owner_repo app | both)
ls ./43logistics.vn/package.json 2>/dev/null && echo "available" || echo "absent"
git -C 43logistics.vn status --short
git -C 43logistics.vn branch --show-current
# context (always: the spec and INDEX live here)
git rev-parse --is-inside-work-tree && git status --short
git remote get-url origin 2>/dev/null && echo context_remote=yes || echo context_remote=no
```

**Detect the check commands** from `43logistics.vn/package.json` `scripts`. Every later step uses these variables, never hard-coded script names:

- `$LINT` = `lint`
- `$TYPECHECK` = `typecheck`, or else `type-check`
- `$TEST` = `test` if present
- `$E2E` = `test:e2e` if present

A missing script is reported as "not available until F-01". The step that needs it then falls back to the manual check it names.

Also check whether Codex is available in this session (it's used for the Step 9 review):

```bash
command -v codex >/dev/null && echo "codex=yes" || echo "codex=no"
```

**State the mode visibly before proceeding:**

```
Mode: LOCAL — app found at ./43logistics.vn  |  worktree: clean  |  Codex: available
```
or
```
Mode: HANDOFF — 43logistics.vn not found locally  |  Codex: not in this session
```
or
```
Mode: REVIEW-ONLY — called with --review flag
```

If repo availability is ambiguous, **default to HANDOFF mode**.

If the app worktree has changes you didn't make, list them and ask before continuing. Never stash or revert them.

**Stack-gap gate:** compare what the spec needs with `AGENTS.md` §3.

- Capabilities that **this spec's own roadmap task introduces** are exempt. F-01 introduces `proxy.ts`; F-02 introduces `@theme`.
- For any other target feature, the task that closes it must be done. If it isn't (e.g. a route page needing `proxy.ts` before F-01), stop and name that task.

---

## Step 3 — Interview before implementing (AskUserQuestion tool)

Before writing any code, ask the user clarifying questions. Use AskUserQuestion for multiple choice. Skip any question the spec already settles.

**Non-interactive runs** (e.g. Codex started by `/feature-bug` Step 10) can't ask questions:

- Proceed on the scope the spec settles, and list every assumption in the Step 5 report.
- For genuine blockers (AGENTS.md §6.6, or a `blocked_by_questions` item without an approved placeholder), stop the dependent ACs. Implement the rest, and report the blockers as plain-text questions for the user.

**Batch 1 — Confirm scope:**

- "Is there anything in the spec that's unclear or needs clarification before I start?" `No, spec is clear` / `Yes — <infer 1–2 likely ambiguities from the spec>`, plus Other.
- "Should I check for existing code that might need to change beyond the Affected Areas?" `Yes, scan broadly` / `No, stay in scope` / `Not sure`.
- "Any known constraints or gotchas I should watch out for?" Infer 1–2 from `AGENTS.md` §4 (JS budget, consent, no hard-coded facts), plus `None` and Other.
- For each Q-ID in `blocked_by_questions`, ask: `Ship with placeholder behind a flag` / `Wait for the owner`.

Wait for the answers, then continue.

---

## Step 3a — LOCAL mode

**Pre-code scope statement (required before writing any code):**

Output a structured statement with these required fields:

```
## Scope: <spec-slug>

Affected Areas (from spec):
- <repo> | <layer> | <file/path>
- ...

Planned edits:
- <file> — <what will change>
- ...

Acceptance Criteria covered:
- AC: <criterion> → <planned change that satisfies it>
- ...

Exempt support files (tests/seed/messages — no approval needed):
- <file> — <reason: "directly enables AC X">
- (none if not applicable)

Context edits (only if an AC requires them):
- <file> — <AC>

Out-of-scope (explicitly NOT implementing):
- <item from spec "Out of scope" section>
- ...
```

If any planned edit covers a file that is NOT in Affected Areas and NOT listed as an exempt support file, ask the user before proceeding:

> "I plan to also create/edit `<file>` which is outside the spec's Affected Areas. This is needed because `<reason>`. Proceed?"

**Task list (LOCAL mode only):**

Before writing any code, call `TaskCreate` (or the session's task-list tool, if one is available) to turn the scope statement above into a tracked task list:

- **One task per item in "Acceptance Criteria covered"**, not one per file. An AC is the unit the Step 6 conformance check verifies; splitting by file just duplicates the same work under a different cut.
- **One task per remaining pipeline stage:**
  - `Write failing test (Red)`
  - `Implement to green`
  - `Self-review checklist`
  - `Spec conformance check`
  - `Create PR`
  - `Send notification`
  - `Codex review & debate`

Set a task to `in_progress` when you start it, and to `completed` as soon as it's done; don't batch the updates at the end. Mark an AC task `completed` only once the code that satisfies it passes its test, not when the edit is merely written. This keeps progress durable if the session is interrupted or compacted mid-implementation. It also shows the user which criteria are actually verified and which are just touched.

**Read mistake patterns before writing code:**

1. Read `lessons/ai-mistakes.md` in full, if it exists. Note every pattern number and name.
2. Read the `lessons/INDEX.md` table only (do NOT follow file links). Flag rows whose Summary or Categories match this spec's topic.
3. Add the flagged patterns and lessons to the pre-code scope statement, under a "Watch out for" line:

   ```
   Watch out for: HARDCODED_FACT (prices from route_rates only), STACK_GAP (no Next 16 APIs before F-01)
   ```

Spawn an `Explore` subagent with this prompt:

> "Read these files and summarize current patterns, conventions, and content: [list every file from Affected Areas table only — not the whole app]. Note naming conventions and how similar problems are solved nearby (server/queries, server/actions, components/ui vs blocks, lib/tracking, messages keys)."

Wait for the result, and use it to inform the implementation plan.

**Branch:**

- **Resuming** (`status: in_implementation` and the spec has `branch:`): run `git -C 43logistics.vn switch <branch>` and continue there.
- **New:**

  ```bash
  git -C 43logistics.vn switch main && git -C 43logistics.vn pull --ff-only
  git -C 43logistics.vn switch -c feat/<roadmap-id>-<slug>     # fix/<slug> for bugs
  ```

  Then record `branch: <name>` in the spec's front matter.

**Context branch:** spec and INDEX status changes, and any other context edits, are committed on the context branch `impl/<slug>` (create it from `main`; on resume, switch to it). This applies to every mode that edits the context workspace.

**For context-repo changes (owner_repo `context` or `both`):**

- Make the doc/data edits the ACs require. Keep facts in their single home (`01-business.md`, `data/seed/*`).
- Verify with greps: no dangling references, and row counts match.

**For the app (Next.js):**

- Write failing tests first (Red):
  - pure logic (price engine, slug/metadata/JSON-LD builders, Zod schemas, redirect loader) → Vitest in `tests/unit/`;
  - flows (`/go/[channel]`, lead form, language switch, redirects, SEO checks) → Playwright in `tests/e2e/`.
- Run: `pnpm -C 43logistics.vn $TEST -- <pattern> 2>&1`
- **If the tests pass at this point, stop.** Either the test is wrong (it doesn't test real behaviour) or the code already exists. Investigate before proceeding.
- Expected output: the tests FAIL with "Cannot find module", "is not a function" or assertion errors. That means they correctly describe code that doesn't exist yet.
- If `$TEST` isn't available (before F-01), say so. Verify with `pnpm -C 43logistics.vn $TYPECHECK` plus the manual check named in the spec's test plan, and note it in the PR.
- Implement code to make the tests pass (Green).
- Re-run `pnpm -C 43logistics.vn $TEST -- <pattern> 2>&1`; everything must pass.
- Run lint: `pnpm -C 43logistics.vn $LINT 2>&1 && pnpm -C 43logistics.vn $TYPECHECK 2>&1`

Update the spec's front matter to `status: in_implementation` after the first passing check. Update its `specs/INDEX.md` row too.

**Failure tracking:** count your fix attempts. If the tests still fail after 2 attempts:

- note the failure pattern (what broke, what was tried);
- auto-create a lesson draft (see Step 4 — Lesson check).

---

### Code quality self-review (LOCAL mode — run after tests pass, before Step 4)

Scan every file written or modified and apply these checks. Fix issues inline before moving on.

**A — Eliminate redundant code**

- Remove dead code: unused imports, unused variables, commented-out blocks.
- Don't add the template's `<ai_context>` headers to new files.
- If the same value is computed more than once, extract it to a named variable.

**B — Single source of truth**

- Shared constants (event names, cache tags, route keys, consent categories, status codes) must live in ONE place (`lib/tracking`, `lib/seo`, …).
- Types and Zod schemas that describe the same shape must not be duplicated across files; infer types from the schema.
- Business facts and prices are never literals; they come from DB/settings.

**C — Reusable functions**

- Only extract logic that appears in ≥ 2 places. Do NOT extract for a single use site.
- Keep data fetching (`server/queries`) separate from rendering. `components/ui` does no fetching.

---

### Self-review checklist (LOCAL mode — all items must pass before Step 4)

**Universal**

- [ ] No `any` types in new code.
- [ ] No files created outside Affected Areas (or the user approved the exceptions).
- [ ] Every acceptance criterion from the spec is implemented.
- [ ] No duplicated constants, event names, Zod schemas or type definitions.

**Context repo** (if touched)

- [ ] Facts stay in their single home; no price or contact is copied into another doc.
- [ ] Every path referenced in a doc exists, or is marked with the roadmap ID that creates it.

**App (`43logistics.vn`), per `AGENTS.md` §4**

- [ ] No business fact or price in components/copy; unknowns render nothing or a placeholder (rules 1–2).
- [ ] Public pages: one H1, `generateMetadata` with canonical + alternates, JSON-LD, breadcrumbs (except home), Zalo CTA (rule 4).
- [ ] Reads go through `server/queries` with `"use cache"` + `cacheTag`; writes go through `server/actions` and invalidate the right tags (rule 5).
- [ ] `@/db` is imported only on the server, and no secrets reach client bundles (rule 6).
- [ ] Admin actions and handlers call `requireRole` (rule 7).
- [ ] No new client JS on public pages without need (no Clerk, TanStack Query or `motion` there), and `next/image` is used (rule 8).
- [ ] Animations use transform/opacity only, respect reduced motion and don't touch the LCP element (rule 9).
- [ ] Labels, visible focus, ≥ 44 px targets, token colours; no uppercase menus or buttons (rules 10–11).
- [ ] Contact links go through `/go/[channel]`, and events fire once via `lib/tracking` (rule 12).
- [ ] Consent is respected; IPs are hashed; no `.env*` is staged (rules 14–15).
- [ ] Strings exist in both `messages/vi.json` and `messages/en.json`.
- [ ] `pnpm -C 43logistics.vn $LINT 2>&1` passes with 0 errors.

---

### Re-run tests after lint/quality fixes (LOCAL mode)

The TDD tests were confirmed green above. Re-run them now, to make sure the lint/quality fixes didn't break anything:

- app: `pnpm -C 43logistics.vn $TEST -- <pattern> 2>&1 && pnpm -C 43logistics.vn $TYPECHECK 2>&1` (skip `$TEST` if unavailable)
- context: re-run the verification greps

If a test now fails after a quality fix, the fix broke something. Revert or correct the implementation, not the test.

### Definition-of-done evidence (`AGENTS.md` §9 — before Step 7)

Record the evidence for each item, or write "not available — <reason>" when you can't verify it. Never claim a check you didn't run.

- [ ] Full `$LINT`, `$TYPECHECK` and `$TEST` runs (not just the pattern), plus `$E2E` if it exists.
- [ ] 360 / 768 / 1280 px and keyboard-only check of the changed pages (method used).
- [ ] Public pages changed: Lighthouse mobile ≥ 90 / 100 / ≥ 95, and the SEO checks (H1, canonical, hreflang, JSON-LD).
- [ ] VI and EN message keys exist for new strings.

Then produce the Step 5 report.

---

## Step 3b — HANDOFF mode

Generate an implementation brief:

```markdown
## Implementation Brief: <spec title>

**Spec:** specs/<filename>.md
**Roadmap:** <ID>
**Target repo:** <app | context | both>
**Mode:** Handoff (repo not available locally)

### What to implement
<Summary of acceptance criteria>

### Affected areas
<Table from spec>

### Implementation steps
1. ...
2. ...

### Golden rules that apply
<from AGENTS.md §4>

### Test / fixture plan
<From spec>

### Commands to run
cd 43logistics.vn && pnpm test -- <pattern> && pnpm lint && pnpm typecheck

### Completion criteria
All acceptance criteria passing. Then run `/mark-implemented <spec-slug> <merged-pr-link>`.
```

Save the brief to `/tmp/43l-impl-brief-<slug>.md`. Do NOT attempt to write code in this mode.

---

## Step 3c — REVIEW-ONLY mode (`--review` flag or existing PR to compare)

Compare the existing implementation (a diff or PR) against the spec's acceptance criteria.
Report which criteria are met, which are missing and which deviate from the spec.
Write the output to `/tmp/43l-impl-review-<slug>.md`.

---

## Step 4 — Lesson check (auto-draft on failure)

Check whether any of these failure conditions occurred during this run:

| Condition | Trigger |
|-----------|---------|
| Tests failed after 2+ fix attempts | LOCAL mode repeated failure |
| Spec acceptance criteria were ambiguous and blocked implementation | Any mode |
| Implementation required changes outside the spec's affected areas | LOCAL mode scope creep |
| Lint/type errors could not be resolved | LOCAL mode |
| A needed fact was missing (Q-ID) and blocked an AC | Any mode |

If ANY condition is true, create `/tmp/43l-lesson-draft-<slug>.md`:

```markdown
# Lesson Draft — <spec title>

**Auto-generated by /implement on <date>**
**Trigger:** <which condition above>
**Spec:** specs/<spec-slug>.md

## What happened
<Describe the failure: what was tried, what broke, how many attempts>

## Suspected cause
<What assumption in the spec or implementation turned out to be wrong>

## Follow-up action (required before saving)
<!-- Fill this in before running /lesson to finalize -->
- [ ] Update spec acceptance criteria to clarify ___
- [ ] Update AGENTS.md / docs/context/<file> to note ___
- [ ] Other: ___
```

Then tell the user:

```
⚠️  Failure detected → lesson draft saved to /tmp/43l-lesson-draft-<slug>.md
    Run /lesson <slug> to finalize, or discard if not worth keeping.
```

If no failure conditions occurred, skip this step silently.

---

## Step 5 — Report

```
## Implement — <spec title>

Mode: <LOCAL | HANDOFF | REVIEW-ONLY>
Spec: specs/<filename>.md (status: in_implementation)
Target repo: <repo>  ·  Branch: <branch>

[LOCAL] Tests: ✅ N/N pass | Lint: ✅ | Typecheck: ✅
[HANDOFF] Brief: /tmp/43l-impl-brief-<slug>.md
[REVIEW-ONLY] Report: /tmp/43l-impl-review-<slug>.md
```

- **LOCAL mode:** proceed to Step 6.
- **HANDOFF / REVIEW-ONLY:** skip to Step 9, where Codex reviews the brief or the drift report. These modes never fix code, commit or push unless the user explicitly switches to LOCAL mode, which restarts from Step 2.
- **Non-interactive runs:** include an "Assumptions" list here.

---

## Step 6 — Spec conformance check (LOCAL mode only)

Before creating a PR, compare the **whole** working change against the spec: committed, staged, unstaged and new files. Secret paths are always excluded from content diffs. Verify a `.env` removal by name only (`git status`), never by its diff.

```bash
X=(-- . ':(exclude).env*' ':(exclude)**/.env*')
git -C 43logistics.vn status --short
git -C 43logistics.vn diff main...HEAD "${X[@]}"      # committed on branch
git -C 43logistics.vn diff HEAD "${X[@]}"             # staged + unstaged
git -C 43logistics.vn ls-files --others --exclude-standard   # new files (read them individually, never .env*)
```

For context edits, run the same commands without `-C 43logistics.vn`.

Classify each mismatch:

| Class | Meaning | Action |
|-------|---------|--------|
| `implementation-bug` | The diff contradicts an AC or a golden rule | **Block PR — fix before Step 7** |
| `spec-amendment` | The diff goes beyond the spec's intent (new behaviour, new fields) | Record it in the PR description; the spec owner must update the spec |
| `compatible-tightening` | The diff is stricter or more precise than the spec but fully satisfies the AC | Record it in the PR description, and note whether a spec amendment is needed |

Output format:

```
## Spec Conformance: <spec-slug>

✅ Covered: <list ACs satisfied by diff>

Mismatches:
- [implementation-bug] <description> → BLOCKING
- [spec-amendment] <description> → noted in PR
- [compatible-tightening] <description> → noted in PR (spec amendment: required | not required)

Result: PASS (no bugs) | BLOCKED (N bugs found)
```

- **BLOCKED:** fix all `implementation-bug` items before Step 7.
- **PASS:** proceed to Step 7, and include the mismatch notes in the PR body.

---

## Step 7 — Create PR in sub-repo (LOCAL mode only)

Skip the app part when `owner_repo` is `context`.

**All PR content must be written in English: the title, changes summary and test results.**

```bash
git -C 43logistics.vn add <explicit paths>                    # never `add .` / `-A`
git -C 43logistics.vn commit -m "feat(<scope>): <spec title>"   # Conventional Commits; fix(...) for bugs
git -C 43logistics.vn push -u origin HEAD
gh pr create -R Dienvm/43logistics.vn --base main \
  --head "$(git -C 43logistics.vn branch --show-current)" \
  --title "feat(<scope>): <spec title>" \
  --body "$(cat <<'EOF'
## Implementation: <spec title>

**Spec:** logistics-context/specs/<type>-<slug>.md
**Roadmap:** <ID>
**Owner repo:** <owner_repo>

### Changes
<summarize in English what was implemented — key files changed, approach taken>

### Acceptance criteria
<paste from spec — mark each ✅ or ⚠️ partial>

### Test results
<paste test output summary in English>

### Conformance notes
<spec-amendment / compatible-tightening items, or "none">

🤖 Implemented by /implement
EOF
)"
```

Capture the PR URL from the output, and record `implementation_pr: <url>` in the spec's front matter.

If the push or `gh pr create` fails, report the exact error, leave the branch in place, and note "PR creation skipped — <reason>" for the Step 8 message.

**Context workspace (every run that edited it):**

1. Commit the spec, the `specs/INDEX.md` row and any context edits on `impl/<slug>`, staging explicit paths only.
2. With `context_remote=yes`: push, and open a PR with `gh pr create --base main --head impl/<slug>`.
3. With `context_remote=no`: keep the local commit, and report "Context PR skipped — no remote (ADR 0003)".

---

## Step 8 — Send Telegram notification (LOCAL mode only)

**All notification content must be written in English.**

Send via `scripts/notify-telegram.sh`, only if the script exists in this workspace and `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` are set:

```bash
test -x scripts/notify-telegram.sh && scripts/notify-telegram.sh "Implementation ready for review ✅

*<spec title>*
Roadmap: <ID> | Repo: <owner_repo>

PR: <PR URL from Step 7, or \"pending\" if skipped>

Spec: specs/<type>-<slug>.md

Code review findings: 🔴 N | 🟡 N | 🟢 N"
```

Fill the findings counts from the latest `/tmp/43l-review-findings.md`, or write "not reviewed yet".

The condition (script + credentials) follows ADR 0003 §6. If the script is missing or fails, print the PR URL to the user so they can share it manually, and say "Notification skipped — <reason>".

---

## Step 9 — Codex review, verify & debate

**9a — Availability:** if `codex=no` from Step 2, report "Codex review skipped: codex CLI not found" and stop.

**9b — Round 1, Codex reviews** (read-only; run it in the background and wait for the notification):

```bash
codex exec -s read-only --skip-git-repo-check -C "$PWD" \
  -o /tmp/43l-codex-implement-<slug>-r1.md \
  "Review the implementation of specs/<file> on app branch <branch> (run: git -C 43logistics.vn diff main...<branch> -- . ':(exclude).env*' ':(exclude)**/.env*' — never print secret-file diffs). [HANDOFF/REVIEW-ONLY: review /tmp/43l-impl-brief-<slug>.md or /tmp/43l-impl-review-<slug>.md instead.] Check: (1) every acceptance criterion is truly met and tested; (2) AGENTS.md §4 golden rules — hard-coded facts/prices, metadata/JSON-LD/H1, server-only DB, requireRole, client JS budget, consent, secrets; (3) correctness bugs and missing edge cases; (4) APIs used that are not installed (AGENTS.md §3); (5) tests that would pass without the feature. Do NOT read .env or wordpress-site/. Do NOT edit files. Return numbered findings: severity (high/medium/low), file:line, issue, fix." </dev/null
```

**Run check:** if codex exits non-zero, or the `-o` file is missing or older than this run, report "Codex review failed — <stderr tail>" and ask whether to retry or finish without it. Apply the same check after round 2.

**9c — Claude verifies:** reproduce or inspect each finding. Write `/tmp/43l-codex-implement-<slug>-verdicts.md`, with one line per finding: `#N accept | partial | reject — <evidence (file:line, test output)>`.

**9d — Round 2, debate** (only if any verdict is `partial` or `reject`):

```bash
codex exec -s read-only --skip-git-repo-check -C "$PWD" \
  -o /tmp/43l-codex-implement-<slug>-r2.md \
  "Round 2. Your findings: /tmp/43l-codex-implement-<slug>-r1.md. Claude's verdicts: /tmp/43l-codex-implement-<slug>-verdicts.md. For each partial/reject item: concede, or rebut with file:line evidence in ≤3 sentences. Do NOT edit files." </dev/null
```

Stop after 2 rounds. Items still disputed go to the user.

**9e — Resolve with the user.** Show this table:

```
| # | Codex finding | Claude verdict | After debate | Proposed fix |
```

Ask (AskUserQuestion): "Fix which?" with options `All agreed` / `Agreed + disputed` / `Specific numbers` / `None`.

Then act according to the mode:

- **LOCAL**, for each chosen fix:
  1. Add a failing test when the finding is about behaviour.
  2. Fix it.
  3. Re-run `$LINT`, `$TYPECHECK` and `$TEST` (whichever are available).
  4. Commit and push to the same branch.
- **HANDOFF / REVIEW-ONLY:** update only the brief or the review report. No code, commits or pushes.

Save the final table (`| # | Codex finding | Claude verdict | After debate | Action taken |`) to `/tmp/43l-codex-implement-<slug>-table.md`. If a PR exists, append the table to the PR body; skip this when there's no PR:

```bash
gh pr view <url> -R Dienvm/43logistics.vn --json body -q .body > /tmp/43l-pr-body-<slug>.md
printf '\n\n## Codex review & debate\n\n' >> /tmp/43l-pr-body-<slug>.md
cat /tmp/43l-codex-implement-<slug>-table.md >> /tmp/43l-pr-body-<slug>.md
gh pr edit <url> -R Dienvm/43logistics.vn --body-file /tmp/43l-pr-body-<slug>.md
```

**Final line:** `Next: /code-review <slug>, then /mark-implemented <slug> <PR> after merge.`
