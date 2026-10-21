---
name: lesson
description: Record a lesson learned that changes future process, rules, docs or skills. Triggered manually OR auto-drafted by /implement, /code-review, /fix-implement on failure. Requires a concrete follow-up action.
argument-hint: "<short-slug>"
---

# Lesson Learned

> **Before Step 1:** follow AGENTS.md §6 "Running skills". Resolve and `cd` to the context root, do the state recovery, substitute and quote every `<placeholder>`, and run long commands in the background in Claude Code (synchronously in Codex).

**Use only when there is a concrete follow-up action:** a process change, a rule or doc update, a skill change, a test to add, or a spec annotation.

If there is no follow-up action, append a note to the related spec or to `/tmp/43l-review-findings.md` instead.

**Context budget:** the user's description, OR `/tmp/43l-lesson-draft-<slug>.md` if it was auto-generated, plus the related spec (if any) and the `lessons/INDEX.md` table.

**Output contract:** `lessons/YYYY-MM-DD-<slug>.md` + a `lessons/INDEX.md` row. Alternatively, a redirect to a spec annotation.

**Project mapping (sample → this repo):** follow-up targets are `AGENTS.md`, `docs/context/*`, `docs/adr/*`, `.claude/skills/*`, app tests, and `docs/context/11-open-questions.md` (Q-IDs). There is no rule-bundle repo.

---

## Step 0 — Check for auto-generated draft

Before asking any questions, check:

```bash
find /tmp -maxdepth 1 -type f -name '43l-lesson-draft-*.md' 2>/dev/null
```

If a draft matching the slug exists, read it and pre-fill from it. Tell the user: "Found auto-generated draft from /implement | /code-review. Pre-filling from it."

The drafts come from `/implement` Step 4 and `/code-review` Step 6. `/fix-implement` writes its lesson file directly, not a draft. The drafts carry "What happened", "Suspected cause" and follow-up checkboxes, but **no categories**. So before saving:

1. Assign categories from the `lessons/INDEX.md` vocabulary.
2. Check that the suspected cause is backed by evidence (the spec, the findings file, test output). If it isn't, mark it as a hypothesis in "What we learned".
3. Have the user confirm or edit the **Follow-up action**.

---

## Step 1 — Gate check

Ask for, or confirm, the concrete follow-up action.

Options:

- Update a rule or the stack table in `AGENTS.md`.
- Update a doc in this workspace (`docs/context/*`, an ADR via `/adr`, a spec).
- Update a skill in `.claude/skills/` (e.g. add a checklist item to `/implement` or `/code-review`).
- Add a check to the app: a manual verification step, or a permitted script (lint rule, `i18n:check`, `check:redirects`, gitleaks). Name the roadmap or spec ID. Automated tests need a proposal for a later ADR (ADR 0004).
- Ask the owner a new question (add a Q-ID to `docs/context/11-open-questions.md`).
- Create a new spec for a bug or gap found (`/feature-bug`).

If the user can't name a follow-up, redirect them:

> "This sounds like an observation rather than a lesson with consequences. Consider adding it as a note in the related spec's 'Related' section or in your review findings."

---

## Step 2 — Create lesson file

Create `lessons/YYYY-MM-DD-<slug>.md`:

```markdown
---
title: <human title>
date: <today YYYY-MM-DD>
trigger: incident | near-miss | repeated-finding | failed-assumption | invented-fact
categories: [<labels from the lessons/INDEX.md vocabulary>]
related_spec: <specs/filename.md or N/A>
status: open
---

# <Title>

## What happened
<Concrete description — what went wrong or was discovered>

## What we learned
<The insight — why it happened, what assumption was wrong>

## Follow-up action
- Action: <exactly what will change>
- Target: <which file / rule / skill / process>
- Owner: <who>

## Related
<Spec, review findings, PR link>
```

Then insert a row at the top of the `lessons/INDEX.md` table:

```
| <today> | <slug> | <one-line summary> | <categories> | open | [link](<filename>) |
```

---

## Step 3 — Link from related spec (if applicable)

If `related_spec` is not N/A, read that spec file and add a line to its **Related** section:

```
- Lesson: [lessons/<filename>](../lessons/<filename>) — <one line summary>
```

---

## Step 4 — Report

```
## Lesson Created

- File: lessons/<filename>.md
- Trigger: <type> · Categories: <labels>
- Follow-up: <action summary> → <target> (<owner>)
- Linked to spec: <spec or N/A>

Next: complete the follow-up action, then set status: resolved in the lesson file and its INDEX row.
```
