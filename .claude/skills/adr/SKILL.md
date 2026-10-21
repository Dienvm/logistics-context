---
name: adr
description: Create an Architecture Decision Record in docs/adr/. Gated — requires a real decision with context, chosen option, and consequences. If you can't answer all three, use /proposal instead.
argument-hint: "<decision-title>"
---

# ADR — Architecture Decision Record

> **Before Step 1:** follow AGENTS.md §6 "Running skills". Resolve and `cd` to the context root, do the state recovery, substitute and quote every `<placeholder>`, and run long commands in the background in Claude Code (synchronously in Codex).

You are creating an ADR for an architecturally significant or hard-to-reverse decision: stack, folder layout, data model shape, caching, auth, analytics lanes, repo topology.

**Context budget:**

- `AGENTS.md` §3–4
- `docs/context/10-roadmap.md`
- the existing ADR files in `docs/adr/` (titles and status lines; full text only if they overlap)
- the `docs/context/*` file the decision touches

**Project mapping (sample → this repo):** `docs/v0.2/ADR-NNN-*.md` → `docs/adr/NNNN-*.md` · BLUEPRINT.md → `AGENTS.md` · UPDATE-PLAN.md → `10-roadmap.md` · `docs/INDEX.md` → `docs/context/00-index.md` · owner_repo → `context | app | both`.

---

## Step 1 — Gate check

Before creating anything, verify that the user can answer all three:

1. **Context:** Why was this decision needed? What forced it?
2. **Decision:** What was decided? (specific, not vague)
3. **Consequences:** What trade-offs, risks or constraints does it introduce?

If any of the three is missing or vague, do not create the ADR. Instead tell the user:

> "This looks like an open question rather than a settled decision. Consider `/proposal` to explore options first. Come back to `/adr` once the decision is made."

Optional but encouraged: **Alternatives considered**, i.e. which other options were evaluated and why they weren't chosen.

---

## Step 2 — Check for existing ADRs

```bash
ls docs/adr/*.md 2>/dev/null || echo "no ADRs yet"
grep -n "^- Status" docs/adr/*.md
```

If ADRs exist, read their titles to find the next number, and check for overlap with the new decision. If the new decision changes an accepted ADR, it **amends** or **supersedes** that ADR. Note which.

---

## Step 3 — Derive filename

Format: `docs/adr/<NNNN>-<slug>.md`

- **NNNN:** zero-padded 4-digit sequence (0001, 0002, …).
- **slug:** kebab-case from the decision title.

---

## Step 4 — Create the ADR

Match the format of the existing ADRs (`0001`–`0003`):

```markdown
# ADR <NNNN> — <Decision Title>

- Status: Accepted (<today YYYY-MM-DD>)
- Amends | Supersedes: ADR <XXXX> (<which decision>)     ← omit if neither
- Owner repo: <context | app | both>
- Context: <Why this decision was needed — the forces, constraints, or events that made a decision necessary>

## Decisions

1. <What was decided — specific and unambiguous>

## Alternatives considered

<Other options that were evaluated and why they were not chosen. If none: "No alternatives were formally evaluated." Do not leave this blank.>

## Consequences

<Trade-offs, risks, and constraints this decision introduces. What becomes easier? What becomes harder? Follow-up roadmap IDs.>
```

---

## Step 5 — Update the index and propagate

1. **Index:** `docs/context/00-index.md` lists the ADRs in its `../adr/*.md` row. Add the new number and title there. ADRs are decisions, so never list them under Proposals.
2. **Propagate in the same change set.** A decision that leaves contradicting docs behind is worse than no ADR. Update:
   - `AGENTS.md` §3 (stack table) or §4 (rules), if affected;
   - the relevant `docs/context/*` sections (find them with `grep -rn "<old term>" docs/context AGENTS.md .claude/skills`);
   - `10-roadmap.md`, if the decision creates or changes a task;
   - `11-open-questions.md`, if it opens or answers a question.
3. **Old ADR**, if one is amended or superseded. Leave its body unchanged.
   - **Amended:** keep `Accepted` and any earlier annotations, and append the scoped reference, e.g. `- Status: Accepted (2026-10-20) · Amended by ADR 0002 (2026-10-20): folder layout, linter`.
   - **Fully superseded:** only then replace the status, with `- Status: Superseded by ADR NNNN (<date>)`.

---

## Step 6 — Report

```
## ADR Created

- File: docs/adr/<NNNN>-<slug>.md
- Status: Accepted
- Owner: <context | app | both>
- Amends/Supersedes: <ADR or none>
- Index: docs/context/00-index.md updated
- Propagated to: <files edited, or "none needed">
```
