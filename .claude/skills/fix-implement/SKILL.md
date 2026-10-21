---
name: fix-implement
description: Fix an incorrect 43logistics.vn implementation by comparing it against the original spec, building a discrepancy table, interviewing the user, logging lessons and fixing. Use when implementation doesn't match spec, "code sai", "không đúng spec", "làm lại cho đúng", or acceptance criteria are failing.
argument-hint: "<spec-filename-or-slug>"
---

# Fix Implement — Correction Pass

> **Before Step 1:** follow AGENTS.md §6 "Running skills". Resolve and `cd` to the context root, do the state recovery, substitute and quote every `<placeholder>`, and run long commands in the background in Claude Code (synchronously in Codex).

You are fixing code that was implemented but doesn't satisfy its spec.

**Context budget:** target spec + `AGENTS.md` (§3–4, §8) + affected source files only.

**Output contract:** discrepancy table → interview → fixes → lesson log.

**Never:**

- apply runtime-code fixes in the context repo (runtime code lives only in `43logistics.vn/`). Specs with `owner_repo: context` fix docs/data in the context workspace;
- work from stale findings without warning;
- skip logging mistakes;
- print `.env*` contents. Every content diff uses `X=(-- . ':(exclude).env*' ':(exclude)**/.env*')`.

**Project mapping (sample → this repo):**

| Sample concept | In this repo |
| --- | --- |
| BLUEPRINT.md | `AGENTS.md` + `docs/adr/*` |
| `../foresent-robot`, `../foresent-rules` | `43logistics.vn/` (app) · context workspace (docs/data only) |
| `yarn test` / `yarn lint` / validator | `$LINT` / `$TYPECHECK` / `$BUILD`, resolved from `43logistics.vn/package.json` (no test suites, ADR 0004) |
| Fixture YAML case | Manual verification step / seed data |

---

## Step 1 — Load the spec

Try `specs/$ARGUMENTS`, then `specs/$ARGUMENTS.md`, then `specs/*-$ARGUMENTS.md`. If none is found, stop; if more than one matches, list them and ask.

Read it fully. Extract:

- the Acceptance Criteria;
- the Affected Areas table;
- the Scope / Out of scope;
- the Fix Approach (bug) or Implementation Hints (feature);
- `owner_repo`, `branch` and `implementation_pr`, if present.

Route every path by `owner_repo`:

- `app`: `43logistics.vn/`; repo flag `$R = -C 43logistics.vn`.
- `context`: the workspace root; `$R` is empty; checks are greps and row counts, not pnpm.
- `both`: both, with each Affected Areas row routed by its Repo column.

---

## Step 2 — Safety gate

Before touching any files:

```bash
# Check repo availability and state
ls ./43logistics.vn/package.json 2>/dev/null && echo "available" || echo "absent"
git -C 43logistics.vn status --short
git -C 43logistics.vn branch --show-current

# Check findings age if using /tmp/43l-review-findings.md
ls -la /tmp/43l-review-findings.md 2>/dev/null
```

- **Target repo absent:** switch to BRIEF MODE (Step 5b). No code edits.
- **Correction branch, whatever the current branch is:** use the spec's `branch:` if it exists; otherwise create `fix/<slug>` from `main`. Switch to it (`git $R switch <branch>`) before Step 3, and record it as `$FIX_BRANCH`. Never fix on `main`.
- **Capture the base** before any edit: `BASE=$(git $R rev-parse HEAD)`. Steps 7 and 8 use it to isolate this correction pass.
- **Uncommitted changes you didn't make:** list them and ask before touching those files. Never stash or revert them.
- **Findings file >24 h old:** warn the user and ask: "Findings are stale — proceed anyway?"

Resolve the check commands once from the `package.json` scripts:

- `$LINT` = `lint`
- `$TYPECHECK` = `typecheck`, or else `type-check`
- `$BUILD` = `build`
- `$REDIRECTS` = `check:redirects` if present

Report any missing ones as "not available until F-01". No `$TEST` / `$E2E`: automated tests are not used in the initial build phase (ADR 0004).

---

## Step 3 — Build discrepancy table

For every file in Affected Areas:

1. Read the file from the **working tree** of `$FIX_BRANCH` (after Step 2's switch). This includes staged, unstaged and untracked files in Affected Areas (`git $R status --short`). A file listed in Affected Areas that doesn't exist yet is itself a discrepancy.
2. Compare the actual code against what the spec requires and against the `AGENTS.md` §4 golden rules.
3. Do NOT fix anything yet.

Output to the user:

```
## Discrepancy Report

| # | File | Spec Requirement | Actual Behavior | Severity |
|---|------|-----------------|-----------------|----------|
| 1 | modules/pricing/ui/rate-table.tsx:42 | Prices only from route_rates (AC 2, rule 2) | 75.000 đ hard-coded | Critical |
| 2 | app/go/[channel]/route.ts:18 | 302 never waits on tracking (05) | awaits DB insert before redirect | High |
| 3 | modules/pricing/domain/chargeable-weight.ts:12 | 1.3 kg rounds to 1.5 kg for US (manual verification plan) | rounds to 1.0 kg | Medium |
```

Severity:

- **Critical:** wrong behaviour (the opposite of the spec), an invented or hard-coded fact, or a security/privacy issue.
- **High:** a missing acceptance criterion.
- **Medium:** a partial implementation, or a missed edge case.
- **Low:** a convention violation, or style only.

---

## Step 4 — Interview the user (AskUserQuestion tool)

Use AskUserQuestion for multiple choice; when Codex runs this skill, ask in plain text. Infer the options from the actual discrepancy rows.

**Batch 1 — Validate the audit:**

- "Does the discrepancy table capture what you observed?" List 2–3 specific rows as options, plus "Yes, complete", "No — you missed something" and Other.
- "Which acceptance criteria are definitely failing?" List all ACs from the spec as options, plus "Not sure, assume all" and Other.
- "How did you notice something was wrong?" `Tested manually` / `Code review` / `Test/CI failed` / `AI flagged it` / `Customer or analytics report`, plus Other.

**Batch 2 — Scope & priorities:**

- "Which discrepancies to prioritize?" `Critical and High first` / `All top-to-bottom` / 1–2 inferred specific rows, plus Other.
- "Check files outside Affected Areas?" `Yes — implementation may have touched more` / `No — stay in scope` / `Not sure`.
- "Any discrepancies to skip?" List the row #s as "Skip #N: <label>", plus "No, fix everything" and Other.

**Follow-up (plain text):**
*"Paste any error messages, wrong outputs, URLs/locales/viewport widths, or exact failing scenarios the table doesn't capture."*

If Batch 1 reveals a missing discrepancy, add it to the table before Step 5.

---

## Step 5a — APPLIED mode (repo available)

Work through the discrepancies from Critical to High to Medium to Low, respecting the priorities from Step 4.

For each fix:

1. State which discrepancy # you are fixing.
2. Apply a minimal edit: no rewrites, no surrounding refactors.
3. For app Critical/High rows: reproduce the problem by hand first (URL, steps, observed result), then repeat the same steps after the fix and record both. No regression tests are added (ADR 0004).
4. For data-dependent rows: add or adjust seed data so the manual check shows the corrected behaviour.

After all fixes, run:

```bash
pnpm -C 43logistics.vn $LINT 2>&1 && pnpm -C 43logistics.vn $TYPECHECK 2>&1 && pnpm -C 43logistics.vn $BUILD 2>&1
pnpm -C 43logistics.vn $REDIRECTS 2>&1     # every fix PR once the script exists (F-07)
```

Report the check results and the before/after manual verification per row. Skip unavailable scripts and say so. For context-owned rows, re-run the greps and row counts that prove the fix.

Commit to the fix branch (explicit paths, Conventional Commits, `fix(<scope>): …`). If a PR exists, push to it.

---

## Step 5b — BRIEF MODE (repo absent)

Generate a fix brief at `/tmp/43l-fix-brief-<slug>.md`:

```markdown
## Fix Brief: <spec title>
Spec: specs/<slug>.md
Target repo: 43logistics.vn (not available locally)

### Discrepancies to fix
| # | File | Fix needed | Severity |
|---|------|-----------|----------|

### Commands to run after fixing
cd 43logistics.vn
# use the scripts that exist in package.json: lint; typecheck or type-check; build (no test suites, ADR 0004)
pnpm lint && pnpm <typecheck|type-check> && pnpm build
# then repeat the manual reproduction steps for each fixed row
```

In BRIEF mode, still run Step 6. Record the evidenced mistakes with `status: open`, and mark the fixes as "not applied — BRIEF mode".

---

## Step 6 — Log the mistakes

Create `lessons/<today>-fix-<spec-slug>.md`:

```markdown
---
title: Fix lessons — <spec title>
date: <today YYYY-MM-DD>
trigger: fix-implement
categories: [<labels below>]
related_spec: specs/<spec-slug>.md
status: <resolved only when the fixes pass AND the Follow-up action is done; otherwise open>
---

# Fix Lessons: <spec title>

## Mistakes Found

### 1. <Category>: <concise description>
- **File:** <path>
- **Expected:** <what spec/rule required>
- **Actual:** <what was implemented>
- **Root cause:** <why this likely happened>

## Patterns to Remember
- <actionable lesson>

## Follow-up action
- Action: <what changes — rule, checklist, doc, test, process>
- Target: <file / skill / process>
- Owner: <who>

## Resolution
- Discrepancies fixed: N/N
- Checks + manual verification: ✅ | ❌
```

Mistake categories (use these exact labels; the vocabulary also lives in `lessons/INDEX.md`):

- `SPEC_AMBIGUITY`: the spec didn't make the behaviour clear enough.
- `MISSING_CRITERION`: an acceptance criterion wasn't implemented at all.
- `WRONG_TEST`: the test doesn't check the right behaviour (the sample's `WRONG_FIXTURE`).
- `SCOPE_CREEP`: the implementation went outside the spec's affected areas.
- `INVENTED_FACT`: a business fact was guessed (rule 1).
- `HARDCODED_FACT`: a price, contact or fact is in code or copy instead of DB/settings (rules 1–2; the sample's `RULE_BUNDLE_ERROR` slot).
- `STALE_REFERENCE`: the code followed an outdated doc, ADR or template pattern.
- `STACK_GAP`: the code used an API that isn't installed (AGENTS.md §3).
- `CONVENTION_VIOLATION`: it doesn't follow the AGENTS.md §8 patterns.
- `LOGIC_ERROR`: a wrong conditional, an inverted check or a missing branch.
- `I18N_GAP` / `SEO_GAP` / `A11Y_GAP` / `PERF_BUDGET` / `PRIVACY`: the matching golden-rule area.

Then insert a row at the top of the `lessons/INDEX.md` table (create the file with its header if missing):

```
| <today> | fix-<spec-slug> | <one-line summary> | <categories> | <resolved|open> | [link](<filename>) |
```

---

## Step 7 — Report

```
## Fix Implement Complete

Mode: APPLIED | BRIEF
Target: 43logistics.vn  ·  Branch: <branch>
Discrepancies fixed: #1, #2, #4 (skipped: #3 per user)
Checks + manual verification: ✅ N/N | ❌ <errors> | not available — <reason>
Lesson file: lessons/<filename>.md (status: open | resolved)

Remaining open: <any skipped rows>
Next: /code-review <spec-slug> to verify all acceptance criteria now pass.
```
