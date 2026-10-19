---
name: fix-implement
description: Fix an implementation in 43logistics.vn that does not satisfy its spec — builds a discrepancy table, interviews the user, fixes test-first, and logs the mistakes as a lesson. Use when implementation doesn't match spec, acceptance criteria fail, or the user says "code sai", "không đúng spec", "làm lại cho đúng".
argument-hint: "<spec-filename-or-slug>"
---

# Fix Implement — correction pass

**Context budget:**

- the target spec
- `AGENTS.md` §4 and §8
- the affected source files
- `/tmp/43l-review-findings.md`, if it exists

**Output:** a discrepancy table, then the interview, then the fixes, then the lesson log.

**Never:**

- fix code in the context workspace;
- act on stale findings without warning the user;
- skip the lesson log.

---

## Step 1 — Load the spec

Try `specs/$ARGUMENTS`, then `specs/$ARGUMENTS.md`. Extract the ACs, affected areas, scope and fix approach or hints.

## Step 2 — Safety gate

```bash
test -f 43logistics.vn/package.json && echo available || echo absent
git -C 43logistics.vn status --short && git -C 43logistics.vn branch --show-current
ls -la /tmp/43l-review-findings.md 2>/dev/null
```

- **App absent:** use BRIEF mode (Step 5b).
- **On `main`:** create or switch to `fix/<slug>` first.
- **Findings file older than 24 h:** warn the user and ask whether to proceed.

## Step 3 — Discrepancy table (read only, no fixes yet)

| # | File:line | Spec requirement / rule | Actual behaviour | Severity |
|---|-----------|-------------------------|------------------|----------|

Severity:

- **Critical:** the behaviour is opposite to the spec, a fact or price is invented or hard-coded, or there is a security/privacy issue.
- **High:** an AC is missing.
- **Medium:** partial, or an edge case is missed.
- **Low:** a convention or style issue.

## Step 4 — Interview (AskUserQuestion)

- **Batch 1:**
  - "Does the table capture what you saw?" Offer 2–3 rows, plus `Complete` and `Missed something`.
  - "Which ACs are definitely failing?" List the ACs plus `Not sure, assume all`.
  - "How did you notice?" Offer manual test / review / CI / analytics / customer report.
- **Batch 2:**
  - "Priority?" Offer `Critical+High first` / `All in order` / specific rows.
  - "Check outside the affected areas?" Offer yes / no.
  - "Skip any rows?"
- **Plain text:** "Paste the error output, the wrong URL, or the screenshot description that the table doesn't capture."

Add any missed discrepancy to the table before fixing.

## Step 5a — APPLIED

Work from Critical down to Low, within the user's priorities. For each row:

1. Say which `#` you're fixing.
2. For Critical/High rows, first add a regression test that fails now (Vitest or Playwright).
3. Make the minimal edit: no rewrites, no surrounding refactors.

Then run:

```bash
pnpm -C 43logistics.vn lint && pnpm -C 43logistics.vn typecheck && pnpm -C 43logistics.vn test
```

If the test runner doesn't exist yet (before F-01), say so and verify manually.

## Step 5b — BRIEF

Write `/tmp/43l-fix-brief-<slug>.md` with the table, the fix needed per row and the commands to run. Edit nothing, and skip Step 6 (nothing was fixed yet). Go straight to the report.

## Step 6 — Log the mistakes

Create `lessons/<today>-fix-<slug>.md`:

```markdown
---
title: Fix lessons — <spec title>
date: <today>
trigger: repeated-finding
categories: [<labels below>]
related_spec: specs/<file>
status: <resolved if every chosen row is fixed and the checks pass; otherwise open>
---

# Fix lessons: <spec title>

## Mistakes found
### 1. <CATEGORY>: <description>
- File: <path>
- Expected: <spec/rule>
- Actual: <what was built>
- Root cause: <why>

## Patterns to remember
## Resolution
- Fixed: N/M · Checks: ✅/❌
```

Use the exact category labels; the vocabulary is also in `lessons/INDEX.md`:

| Label | Meaning |
| --- | --- |
| `SPEC_AMBIGUITY` | The spec didn't make the behaviour clear enough |
| `MISSING_CRITERION` | An AC wasn't implemented |
| `WRONG_TEST` | The test didn't check the real behaviour |
| `SCOPE_CREEP` | The change went outside the affected areas |
| `INVENTED_FACT` | A business fact was guessed (rule 1) |
| `HARDCODED_FACT` | A price, contact or fact was put in code or copy instead of DB/settings (rules 1–2) |
| `STALE_REFERENCE` | Code followed an outdated doc, an ADR or a template pattern |
| `STACK_GAP` | Code used an API that isn't installed (AGENTS §3) |
| `CONVENTION_VIOLATION` | A rule from AGENTS §8 was broken |
| `LOGIC_ERROR` | A wrong conditional, inverted check or missing branch |
| `I18N_GAP` | A missing EN/VI string or a wrong locale behaviour |
| `SEO_GAP` | Missing metadata, JSON-LD, H1 or redirect |
| `A11Y_GAP` | Labels, focus, contrast or target size |
| `PERF_BUDGET` | Client JS, LCP, CLS or motion rules broken |
| `PRIVACY` | Consent, PII, secrets or IP hashing |

Insert a row at the top of the `lessons/INDEX.md` table:

`| <today> | fix-<slug> | <summary> | <categories> | <resolved|open> | [link](<file>) |`

## Step 7 — Report

```
## Fix Implement Complete
Mode: APPLIED | BRIEF
Fixed: #… (skipped: #… per user)
Checks: lint ✅ · typecheck ✅ · test N/N
Lesson: lessons/<file>
Next: /code-review <slug>
```
