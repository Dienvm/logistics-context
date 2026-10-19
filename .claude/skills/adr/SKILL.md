---
name: adr
description: Record an Architecture Decision Record in docs/adr/. Gated — requires a settled decision with context, chosen option, and consequences. If any of the three is missing, use /proposal instead.
argument-hint: "<decision-title>"
---

# ADR — Architecture Decision Record

Use this skill for decisions that are architecturally significant or hard to reverse: stack, folder layout, data model shape, caching, auth, analytics lanes, repo topology.

**Context budget:** `AGENTS.md` §3–4, the titles and status lines of every `docs/adr/*.md`, and the `docs/context/*` file the decision touches. Nothing else.

---

## Step 1 — Gate check

The user (or the conversation) must supply all three:

1. **Context**: what forced the decision.
2. **Decision**: what was chosen, stated specifically.
3. **Consequences**: trade-offs, risks and new constraints.

If any of them is missing or vague, stop and say:

> "This looks like an open question rather than a settled decision. Use `/proposal` to explore options first, then come back to `/adr`."

**Alternatives considered** is required in the file; write "No alternatives were formally evaluated." if there were none.

## Step 2 — Number and overlap

```bash
ls docs/adr/
```

The next number is the highest `NNNN` + 1, zero-padded to 4 digits. Read the status line of any ADR whose title overlaps. If the new decision changes an accepted ADR, it **amends** or **supersedes** it. Say which in the new file, and in Step 5 update the old one.

## Step 3 — Write `docs/adr/NNNN-<kebab-slug>.md`

Match the format of the existing ADRs (see `0001`, `0002`):

```markdown
# ADR NNNN — <Decision title>

- Status: Accepted (<today YYYY-MM-DD>)
- Amends | Supersedes: ADR XXXX (<which decision>)     ← omit if neither
- Context: <why a decision was needed; facts, not opinions>

## Decisions

1. <specific, testable statement>

## Alternatives considered

- **<option>** — <why not>

## Consequences

- <what becomes easier / harder; follow-up tasks with roadmap IDs>
```

## Step 4 — Propagate (same change set)

A decision that leaves contradicting docs behind is worse than no ADR. Update every place that states the old decision:

- `AGENTS.md` §3 (stack table) or §4 (rules) if they're affected.
- The relevant `docs/context/*` sections. Find them with `grep -rn "<old term>" docs/context AGENTS.md`.
- `docs/context/10-roadmap.md` if the decision creates or changes a task.
- `docs/context/11-open-questions.md` if the decision opens or answers a question.

## Step 5 — Old ADR (only if amended or superseded)

Edit the old ADR's status line to `- Status: Amended by ADR NNNN (<date>)` or `- Status: Superseded by ADR NNNN (<date>)`. Leave its body unchanged.

## Step 6 — Report

```
## ADR Created
- File: docs/adr/NNNN-<slug>.md (Accepted)
- Amends/Supersedes: <ADR or none>
- Propagated to: <files edited, or "none needed">
- Owner repo for follow-up work: <context | app | both>
```
