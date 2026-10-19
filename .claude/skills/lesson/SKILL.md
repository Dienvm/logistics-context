---
name: lesson
description: Record a lesson learned that changes future process, rules, docs or code conventions. Triggered manually or from a draft auto-written by /implement, /code-review, /fix-implement. Requires a concrete follow-up action.
argument-hint: "<short-slug>"
---

# Lesson Learned

**Use this skill only when there is a concrete follow-up:** a rule change in `AGENTS.md`, a doc fix, a skill change, a new spec, a test to add, or a process change.

With no follow-up, add a note to the related spec's **Related** section instead.

**Output:** `lessons/YYYY-MM-DD-<slug>.md` plus a row in `lessons/INDEX.md`.

---

## Step 0 — Auto-drafted?

```bash
ls /tmp/43l-lesson-draft-*.md 2>/dev/null
```

If a draft matches the slug, read it and pre-fill every section. Tell the user: "Found a draft from /implement | /code-review | /fix-implement; pre-filled." The user then only needs to confirm the **Follow-up action**.

## Step 1 — Gate

Ask for the follow-up, or confirm it. Typical answers:

- Edit `AGENTS.md` (a rule or the stack table).
- Fix a `docs/context/*` file or an ADR.
- Change a skill in `.claude/skills/`.
- Add a test or check to the app (name the roadmap or spec ID).
- Ask the owner a new question (add a Q-ID to `11-open-questions.md`).

If there's no follow-up, say: "This is an observation, not a lesson. I'll add it to the spec's Related section instead."

## Step 2 — Write `lessons/YYYY-MM-DD-<slug>.md`

```markdown
---
title: <human title>
date: <today YYYY-MM-DD>
trigger: incident | near-miss | repeated-finding | failed-assumption | invented-fact
categories: [<from the vocabulary in lessons/INDEX.md>]
related_spec: <specs/<file>.md or N/A>
status: open
---

# <Title>

## What happened
## What we learned
## Follow-up action
<file / rule / skill to change, and who does it>
## Related
```

## Step 3 — Index and links

- Insert a row at the top of the table in `lessons/INDEX.md`:
  `| <date> | <slug> | <one-line summary> | <categories> | open | [link](<file>) |`
- If there is a `related_spec`, append `- Lesson: [lessons/<file>](../lessons/<file>) — <summary>` to the spec's **Related** section.

## Step 4 — Report

```
## Lesson Created
- File: lessons/<file>.md (open)
- Follow-up: <action>
- Linked spec: <spec or N/A>
Next: do the follow-up, then set status: resolved (file + INDEX row).
```
