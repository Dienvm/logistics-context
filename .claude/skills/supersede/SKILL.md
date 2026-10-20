---
name: supersede
description: Safely update lifecycle metadata when one doc supersedes another (proposals or ADRs). Updates front matter / status lines, superseded_by chains, docs/context/00-index.md, reports broken references, then has Codex verify and debate the chain. Use when a new proposal or ADR wins over an old one.
argument-hint: "<old-doc-filename> <winning-doc-filename>"
---

# Supersede — Lifecycle Chain Management

> **Before Step 1:** follow AGENTS.md §6 "Running skills". Resolve and `cd` to the context root, do the state recovery, substitute and quote every `<placeholder>`, and run long commands in the background in Claude Code (synchronously in Codex).

You are updating the docs lifecycle metadata for the 43logistics.vn context workspace.

Your job:

1. mark the old doc as superseded;
2. update the winning doc's status if needed;
3. fix the navigation in `docs/context/00-index.md`;
4. check for broken references;
5. have Codex verify the chain.

**Context budget:** besides the AGENTS.md §6 state recovery, read ONLY the files listed in each step. Don't load all proposals out of habit.

**Project mapping (sample → this repo):** `docs/discussions/` → `docs/proposals/` (front matter) and `docs/adr/` (status line) · `docs/INDEX.md` → `docs/context/00-index.md`. `docs/context/*` files are never superseded; they're edited in place.

---

## Step 1 — Parse arguments

`$ARGUMENTS` should contain two filenames: the old doc and the winning doc.

- **Old doc:** the one being superseded (e.g. `consent-banner-options.md`).
- **Winning doc:** the replacement (e.g. `consent-banner-basic-mode.md`, or `0004-consent-banner.md`).

If the paths aren't prefixed, try `docs/proposals/<name>`, then `docs/adr/<name>`. Resolve the full paths, then validate them **before any edit**:

- Both files exist, and each one lives in `docs/proposals/` or `docs/adr/`. Anything else (`docs/context/*`, specs, lessons, app files) is rejected.
- The two resolved paths are different, so a doc can't supersede itself.
- **ADR → winner:** an ADR can be superseded only by another **Accepted** ADR, never by a proposal. A partial change is an **amendment**: use `/adr` and its scoped "Amended by" annotation, not this skill.
- **Proposal → winner:** the winner may be a proposal or an ADR.
- **Chain:** follow the winner's `superseded_by` (or its "Superseded by" status) to the end. If the chain reaches the old doc (a loop) or ends at a missing file, stop.

If any check fails, stop and tell the user.

---

## Step 2 — Read both docs (front matter only)

For a proposal, read through the closing `---` of the front matter (not a fixed line count). For an ADR, read the title and every `- Status` / `- Amends` / `- Supersedes` line.

Check the old doc:

- Is it already `superseded` (`status:` or `- Status: Superseded`)? If yes, confirm with the user before proceeding.
- Does it already have `superseded_by`? Note it.

Check the winning doc:

- What is its current status (`draft`, `current`, `superseded`, `archived`; for an ADR, `Accepted` or `Superseded`)?
- If it is superseded or archived, stop: the winning doc is itself superseded. Ask the user to clarify.

---

## Step 3 — Update old doc front matter

- **Proposal:** set `status: superseded` and `superseded_by: <winning-doc-filename>` (filename only, no path). If an `updated` field exists, set it to today's date.
- **ADR:** set the status line to `- Status: Superseded by <winning ADR number or filename> (<today>)`. Leave the body unchanged.

---

## Step 4 — Update winning doc front matter (if needed)

- **Winning proposal with `status: draft`:** ask the user, "Mark winning doc as `current`?" Update it only on a yes.
- **Already `current`, or an Accepted ADR:** no change needed.

---

## Step 5 — Update docs/context/00-index.md

Read `docs/context/00-index.md`.

- **Proposals table:**
  - set the old doc's status cell to `superseded → <winning-doc-filename>`;
  - make sure the winning doc is listed with its current status.
- **ADR row:** if an ADR was superseded, update the ADR list in the `../adr/*.md` row.

---

## Step 6 — Check for broken references

Run:

```bash
grep -rn "<old-doc-filename>" AGENTS.md CLAUDE.md docs specs lessons .claude/skills --include="*.md"
```

Report every file that still links to or names the old doc. Don't auto-fix them; just report them so the user can decide.

---

## Step 7 — Report

```
## Supersede Complete

- Old doc: <filename> → <proposal: status: superseded, superseded_by: <winning> | ADR: status line "Superseded by <ADR>">
- Winning doc: <filename> → status: <new status>
- Index: docs/context/00-index.md updated
- References to old doc found in: <list or "none">
```

---

## Step 8 — Codex review, verify & debate

**8a — Availability:** run `command -v codex`. If it's missing, report "Codex review skipped: codex CLI not found" and stop.

**8b — Round 1, Codex reviews** (read-only; run it in the background and wait for the notification):

```bash
codex exec -s read-only --skip-git-repo-check -C "$PWD" \
  -o /tmp/43l-codex-supersede-<old-slug>-r1.md \
  "Verify the supersession <old-doc> → <winning-doc>. Check: (1) old doc status/superseded_by (or ADR status line) is correct and points to an existing file; (2) winner is not itself superseded/archived and no loop exists; (3) docs/context/00-index.md matches both files' status; (4) does the winner actually cover what the old doc decided, or is anything dropped?; (5) remaining references to the old doc in AGENTS.md, docs, specs, lessons, .claude/skills that would mislead an agent. Do NOT edit files. Return numbered findings: severity, file:line, issue, fix." </dev/null
```

**Run check:** if codex exits non-zero, or the `-o` file is missing or older than this run, report "Codex review failed — <stderr tail>" and ask whether to retry or finish without it. Apply the same check after round 2.

**8c — Claude verifies:** check each finding. Write `/tmp/43l-codex-supersede-<old-slug>-verdicts.md`, with one line per finding: `#N accept | partial | reject — <evidence>`.

**8d — Round 2, debate** (only if any verdict is `partial` or `reject`):

```bash
codex exec -s read-only --skip-git-repo-check -C "$PWD" \
  -o /tmp/43l-codex-supersede-<old-slug>-r2.md \
  "Round 2. Your findings: /tmp/43l-codex-supersede-<old-slug>-r1.md. Claude's verdicts: /tmp/43l-codex-supersede-<old-slug>-verdicts.md. For each partial/reject item: concede, or rebut with file:line evidence in ≤3 sentences. Do NOT edit files." </dev/null
```

Stop after 2 rounds. Items still disputed go to the user.

**8e — Resolve with the user.** Show this table:

```
| # | Codex finding | Claude verdict | After debate | Proposed edit |
```

Apply only the edits the user approves. Reference fixes in other docs stay the user's decision (Step 6).

Final line:

```
Codex debate: N items | agreed N | conceded by Codex N | disputed → user N
```
