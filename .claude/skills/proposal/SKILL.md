---
name: proposal
description: Create a new proposal doc in docs/proposals/ with proper front matter, duplicate detection, and a Codex review/verify/debate pass. Use when adding a new architecture proposal, design option, integration or content-strategy option that is not yet decided.
argument-hint: "<slug-or-title>"
---

# Proposal — Create a New Discussion Doc

> **Before Step 1:** follow AGENTS.md §6 "Running skills". Resolve and `cd` to the context root, do the state recovery, substitute and quote every `<placeholder>`, and run long commands in the background in Claude Code (synchronously in Codex).

You are creating a new proposal document for the 43logistics.vn context workspace.

Your job:

1. detect duplicates;
2. gather the minimum context;
3. create a well-structured doc with front matter;
4. update the index;
5. have Codex review, verify and debate it.

**Context budget:**

- `docs/context/00-index.md`
- `AGENTS.md` §3–4
- `docs/context/10-roadmap.md`
- the ADR titles in `docs/adr/`
- only the related proposals or `docs/context/*` sections found by slug/topic search

Do not load all proposals.

**Project mapping (sample → this repo):** `docs/discussions/` → `docs/proposals/` · `docs/INDEX.md` → `docs/context/00-index.md` (Proposals table) · BLUEPRINT.md → `AGENTS.md` + `docs/adr/*` · UPDATE-PLAN.md → `10-roadmap.md` · owner_repo → `context | app | both` · Codex bridge → `codex exec`.

---

## Step 1 — Parse argument and derive slug

From `$ARGUMENTS`, extract a kebab-case slug (lowercase, hyphens, max 6 words).

Target path: `docs/proposals/<slug>.md` (run `mkdir -p docs/proposals`).

If the file already exists, stop and tell the user.

---

## Step 2 — Check for duplicates

Read the **Proposals** table in `docs/context/00-index.md`, and grep the existing docs:

```bash
KW='<keyword>'   # substitute
rg -il -F --glob '*.md' -- "$KW" docs/proposals docs/adr 2>/dev/null
```

- **A highly similar doc exists:** tell the user which file it is, and ask whether to continue anyway or update the existing doc instead.
- **The topic is already decided in an ADR:** say so, and ask whether this proposal is meant to revisit that ADR.
- **A partially related doc exists:** note it, and reference it in the new doc's **Related** section.

---

## Step 3 — Read authoritative context (bounded)

Read these before drafting, to understand the current architecture:

- `AGENTS.md` §3 (stack) and §4 (golden rules)
- `docs/context/10-roadmap.md`, to see which phase/task this touches
- the related `docs/context/*` section(s) and ADR(s) found in Step 2

Do not read every file in `docs/proposals/`.

---

## Step 4 — Gather missing information

First infer what the user's message and the inspected files already answer (e.g. the owner repo is obvious from the topic, or the roadmap ID is named in the related row). Then ask only for what is still unresolved, in one message:

1. What problem does this proposal solve? (1–2 sentences)
2. Which repo owns the implementation? `context` / `app` / `both`
3. Which roadmap task(s) does it affect? (IDs from `10-roadmap.md`, or none)

Don't ask questions the user's message or the files already answered; state the inferred answers instead.

---

## Step 5 — Create the doc

Create `docs/proposals/<slug>.md` with this structure:

```markdown
---
title: <human-readable title>
status: draft
owner_repo: <context | app | both>
roadmap: [<IDs or empty>]
updated: <today YYYY-MM-DD>
---

# <Title>

## Problem

<What this is trying to solve>

## Proposed approach

<The proposal — leave this as a placeholder if not yet known>

## Alternatives considered

<Other approaches evaluated, or "None considered yet">

## Consequences

<Trade-offs, risks, what this changes — performance budget, consent/PDP law, SEO/redirects, i18n, cost, ops effort, whichever apply>

## Open questions

<Owner facts go to docs/context/11-open-questions.md as Q-IDs; reference them here, never guess>

## Related

<Links to related docs, ADRs, roadmap rows, or "None">
```

---

## Step 6 — Self-review checklist

Before updating the index or sending the doc to Codex, verify:

- [ ] Front matter has all required fields (`title`, `status`, `owner_repo`, `roadmap`, `updated`).
- [ ] The Problem section is concrete, not vague ("improve performance").
- [ ] The proposal doesn't contradict `AGENTS.md` or an accepted ADR without stating the contradiction explicitly (with the ADR number).
- [ ] No invented business facts: unknowns reference Q-IDs.
- [ ] If `owner_repo` is `both`: the impact on the docs/data and on the app code is described separately.
- [ ] No placeholders left if the user provided the full proposal content.

---

## Step 7 — Update the index

Add the new doc to the **Proposals** table in `docs/context/00-index.md`, with a one-line description:

```
| docs/proposals/<slug>.md | draft | <one-line summary> |
```

Remove the "_(none yet …)_" line if present. When in doubt, add the row: it's easier to remove a row than to find a missing doc.

---

## Step 8 — Codex review, verify & debate

Codex reviews every proposal; a stub with no real Problem or Approach gets a short review.

**8a — Availability:** run `command -v codex`. If it's missing, report "Codex review skipped: codex CLI not found", suggest `/doc-review <slug>.md` later, and go to Step 9.

**8b — Round 1, Codex reviews** (read-only; run it in the background and wait for the notification):

```bash
codex exec -s read-only --skip-git-repo-check -C "$PWD" \
  -o /tmp/43l-codex-proposal-<slug>-r1.md \
  "Review docs/proposals/<slug>.md for: (1) contradictions with AGENTS.md and docs/adr/*; (2) stale or incorrect claims about 43logistics.vn/ code (package.json, folder layout) or docs/context; (3) missing ownership or consequences — performance budget, consent/PDP law, SEO/redirects, i18n, cost; (4) supersession — does this make any existing current doc obsolete?; (5) invented business facts. Do NOT read .env or wordpress-site/. Do NOT rewrite the doc. Return a numbered critique: severity, location, issue, suggestion." </dev/null
```

**Run check:** if codex exits non-zero, or the `-o` file is missing or older than this run, report "Codex review failed — <stderr tail>" and ask whether to retry or continue without it. Apply the same check after round 2.

**8c — Claude verifies:** check each item. Write `/tmp/43l-codex-proposal-<slug>-verdicts.md`, with one line per item: `#N accept | partial | reject — <evidence>`.

**8d — Round 2, debate** (only if any verdict is `partial` or `reject`):

```bash
codex exec -s read-only --skip-git-repo-check -C "$PWD" \
  -o /tmp/43l-codex-proposal-<slug>-r2.md \
  "Round 2. Your critique: /tmp/43l-codex-proposal-<slug>-r1.md. Claude's verdicts: /tmp/43l-codex-proposal-<slug>-verdicts.md. For each partial/reject item: concede, or rebut with file:line evidence in ≤3 sentences. Do NOT edit files." </dev/null
```

Stop after 2 rounds. Items still disputed go to the user.

**8e — Resolve with the user.** Present the critique table:

```
| # | Codex item | Claude verdict | After debate | Proposed edit |
```

Apply only the edits the user approves (AskUserQuestion: `All agreed` / `Agreed + disputed` / `Specific numbers` / `None`; plain text when Codex runs this skill).

---

## Step 9 — Report

```
## Proposal Created

- File: docs/proposals/<slug>.md
- Status: draft
- Owner repo: <repo> · Roadmap: <IDs>
- Index: docs/context/00-index.md updated (Proposals table)
- Codex: N items | agreed N | conceded by Codex N | disputed → user N | applied N  (or: skipped — reason)
```
