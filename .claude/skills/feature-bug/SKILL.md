---
name: feature-bug
description: Create an implementation spec in specs/ for a roadmap task, feature or bug in the 43logistics.vn app. Interviews the user, reads the relevant context and real app paths, writes a complete spec tied to a roadmap ID. NOT for exploration — use /proposal for that.
argument-hint: "[feature|bug] <roadmap-id or short title>"
---

# Feature / Bug — implementation spec

**This skill creates implementation commitments, not explorations.** If the user is still choosing between options, redirect them to `/proposal`.

**Context budget:**

- `AGENTS.md`
- `docs/context/10-roadmap.md` (the task row)
- `specs/INDEX.md`
- `lessons/INDEX.md` (table only)
- the `docs/context/*` files that the roadmap row lists under *Context*

**Output:** `specs/<type>-<slug>.md` plus a row in `specs/INDEX.md`.

**Never:**

- edit app code;
- set `status` beyond `approved`;
- write a spec for a docs-only change (just edit the doc).

---

## Step 1 — Classify

- **Type:** `feature` or `bug`. Ask if it's unclear.
- **Roadmap ID:** if `$ARGUMENTS` contains one (`F-04`, `S-03`…), read that row; its *Context*, deliverable and *Accept* are the starting point. A feature without a roadmap row needs either a new row in `10-roadmap.md` (ask the user which phase it belongs to) or an explicit reason it's off-roadmap.
- **Slug:** kebab-case, at most 6 words. Prefix the roadmap ID when there is one, e.g. `feature-s03-price-engine`.

## Step 2 — Gather context silently

1. **Duplicates.** Check whether any `specs/INDEX.md` row has the same roadmap ID or title.
   - **Exact match:** ask "Update `<file>` or create a separate spec?"
   - **Partial match:** reference it under Related.
2. **Docs.** Read the sections of the listed `docs/context/*` files that match the topic, plus any ADR about the topic.
3. **Lessons.** Note the `lessons/INDEX.md` rows whose categories or summary match the topic.
4. **Blocking facts.** Note the Q-IDs in `11-open-questions.md` that block the task. They become explicit placeholders in the spec, never guesses.
5. **App scan (paths only).** If `43logistics.vn/package.json` exists:

   ```bash
   ls 43logistics.vn/{app,components,server,db,lib,hooks,stores,messages,scripts,tests} 2>/dev/null
   grep -rln "<keywords>" 43logistics.vn --include=*.ts --include=*.tsx --exclude-dir=node_modules --exclude-dir=.next | head -30
   ```

   For a broad search, spawn an `Explore` subagent (medium) with the same constraints: paths and line numbers only.
6. **Stack gap.** Check `AGENTS.md` §3 for the task's prerequisites. If it needs something that isn't installed (Next 16 APIs, Tailwind v4, next-intl…) and its closing task isn't done, record that under **Dependencies**.

## Step 3 — Interview (AskUserQuestion, in batches; skip what is already answered)

Build the options from Step 2: use real paths, real roadmap IDs and real Q-IDs.

### Feature

- **Batch 1 (intent):**
  - What does success look like? Offer 2–3 options derived from the roadmap *Accept* text.
  - Owner repo: `app` / `both`.
  - Priority: `critical` / `must-have` / `nice-to-have`.
- **Batch 2 (scope):**
  - What is out of scope?
  - Which surfaces are touched: public page / admin / proxy / DB schema / tracking / i18n strings?
  - Is any blocking Q-ID acceptable as a placeholder for now?
- **Batch 3 (acceptance):**
  - Given/When/Then options derived from the roadmap.
  - Failure behaviour: invalid input, missing translation, unverified route (`is_verified = false` → "Liên hệ"), no consent.
  - Performance/SEO impact, i.e. whether it adds client JS to public pages.
- **Batch 4 (tests):** skip for pure config work.
  - Which behaviours to lock in: unit (Vitest), e2e (Playwright), redirect/SEO checks.
  - Whether specific seed data is needed.

### Bug

- **Batch 1:** expected vs actual behaviour; frequency; business impact (lost leads or contacts = `critical`).
- **Batch 2:** environment (local / preview / production); which URL or locale; whether it started after a recent change.
- **Batch 3:** where it breaks (proxy/redirect, cached query/tag, Server Action, client island, tracking, SEO metadata); any error text.
- **Batch 4:** which regression test locks it in; the manual verification path if no test is feasible.

Finish with plain text: "Anything else: deadline, owner constraint, campaign date?"

## Step 4 — Write the spec

### Feature template

```markdown
---
title: <imperative, ≤10 words>
type: feature
status: draft
owner_repo: app | both
roadmap: <ID or none>
priority: critical | must-have | nice-to-have
blocked_by_questions: [<Q-IDs or empty>]
updated: <today YYYY-MM-DD>
---

## Feature: <title>

### Problem
### Proposed solution
<!-- user-visible behaviour, not implementation -->

### Acceptance criteria
- [ ] Given …, when …, then …

### Scope
**In scope:**
**Out of scope:**

### Affected areas
| Repo | Layer | Path (real or planned) |
|------|-------|------------------------|
| app | server/queries | server/queries/routes.ts |

### Golden-rule checks
<!-- only those that apply: facts from DB (1–2), metadata/JSON-LD/H1/CTA (4), server-only DB (6), requireRole (7), JS budget (8), motion (9), a11y (10), VI typography (11), /go tracking (12), redirects (13), consent/PII (14) -->

### Dependencies & risks
### Test plan
- Unit (Vitest): <cases>
- E2E (Playwright): <flows>
- Command: `pnpm -C 43logistics.vn test -- <pattern>` / `pnpm -C 43logistics.vn test:e2e -- <pattern>`
### Implementation hints
### Related
```

### Bug template

```markdown
---
title: <broken behaviour, not the fix>
type: bug
status: draft
owner_repo: app | both
roadmap: <ID or none>
priority: critical | high | medium | low
updated: <today>
---

## Bug: <title>
### Summary
### Environment
| Key | Value |
|-----|-------|
| URL / locale | |
| Environment | local / preview / production |
| Frequency | always / sometimes / once |
### Reproduction steps
### Expected
### Actual
### Root-cause hypothesis
### Affected areas
### Business impact
### Regression test plan
### Fix approach
### Related
```

## Step 5 — Self-review

- [ ] The title is imperative and at most 10 words, with no "maybe/should probably".
- [ ] Each acceptance criterion can be verified on its own, and every roadmap *Accept* item is covered.
- [ ] No invented facts; unknowns are listed in `blocked_by_questions`.
- [ ] Affected areas use the root layout (no `src/`) and real or planned paths.
- [ ] Out of scope is explicit.
- [ ] The test plan names concrete cases and commands.

## Step 6 — Save and index

1. Run `mkdir -p specs` and write `specs/<type>-<slug>.md`. Don't echo the spec in chat; give the path and a one-line summary.
2. Insert a row at the top of the table in `specs/INDEX.md`:
   `| <today> | <type> | [<file>](<file>) | <title> | <roadmap> | <owner_repo> | draft |`

## Step 7 — Spec PR (only if the context workspace is a git repo with a remote)

```bash
git rev-parse --is-inside-work-tree 2>/dev/null && git remote get-url origin 2>/dev/null
```

If it is:

```bash
git checkout -b spec/<slug>
git add specs/<type>-<slug>.md specs/INDEX.md
git commit -m "spec(<slug>): <title>"
git push -u origin spec/<slug>
gh pr create --base main --head spec/<slug> --title "spec: <title>" --body "<type> · <roadmap> · <owner_repo> · <priority>

<one-line problem>

<acceptance criteria>"
```

Otherwise report "Spec PR skipped: the context workspace has no git remote (see ADR 0003)". Write all PR text in English.

## Step 8 — Approval and hand-off

Ask (AskUserQuestion): "Approve this spec for implementation?"

- `Yes — I implement it now (/implement)`
- `Yes — hand to Codex` (only offer this if `command -v codex` succeeds)
- `No — keep as draft`

On approval, set `status: approved` in the file and in its INDEX row. If Step 7 opened a spec PR, commit and push these two files to the same `spec/<slug>` branch. Then:

- **Claude:** run `/implement <slug>`.
- **Codex:**

  ```bash
  codex exec -s workspace-write -C "$PWD" \
   "Read AGENTS.md and .claude/skills/implement/SKILL.md, then implement specs/<file>. Paths in the skill are relative to this workspace root. Follow the skill steps in order and report the results table."
  ```

  Run it in the background, and report its result when it finishes.
