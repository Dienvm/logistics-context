---
name: supersede
description: Safely retire a proposal or ADR when another one wins. Updates front matter / status lines, docs/context/00-index.md, and reports dangling references. Use when a new proposal or ADR replaces an old one.
argument-hint: "<old-doc> <winning-doc>"
---

# Supersede — lifecycle chain management

**Context budget:** the first 15 lines of both docs and `docs/context/00-index.md`. Nothing else.

---

## Step 1 — Resolve paths

`$ARGUMENTS` holds two docs: the old one and the winner. Bare names resolve to `docs/proposals/<name>`, then `docs/adr/<name>`. If either file doesn't exist, stop.

`docs/context/*` files are never superseded; they're edited in place. If one is passed, stop and explain.

## Step 2 — Read the heads

- **Old doc already superseded:** confirm with the user before changing anything.
- **Winner superseded, archived or rejected:** stop, because the chain would point at a dead doc.

## Step 3 — Mark the old doc

- **Proposal (front matter):** set `status: superseded`, `superseded_by: <winning filename>` and `updated: <today>`.
- **ADR (status line):** set `- Status: Superseded by <winning ADR/file> (<today>)`.

## Step 4 — Winner status

If the winner is a proposal with `status: draft`, ask: "Mark `<winner>` as `current`?" Update it only if the user says yes. ADRs are already Accepted.

## Step 5 — Index

In `docs/context/00-index.md`, open the **Proposals** table:

- Set the old doc's status to `superseded → <winner>`.
- Make sure the winner is listed with its current status.

## Step 6 — Dangling references

```bash
grep -rn "<old filename>" AGENTS.md CLAUDE.md docs specs lessons .claude/skills
```

Report every hit, but don't auto-edit: the user decides.

## Step 7 — Report

```
## Supersede Complete
- Old: <file> → superseded by <winner>
- Winner: <file> → status <…>
- Index: updated
- Remaining references: <list or none>
```
