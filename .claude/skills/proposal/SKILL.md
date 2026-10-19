---
name: proposal
description: Create a proposal doc in docs/proposals/ with front matter, duplicate detection, and optional Codex critique. Use for options that are not yet decided (design directions, integrations, data-model alternatives, content strategy).
argument-hint: "<slug-or-title>"
---

# Proposal — explore an option before deciding

**Context budget:** `docs/context/00-index.md`, `AGENTS.md` §3–4, `docs/context/10-roadmap.md`, the ADR titles in `docs/adr/`, and only the `docs/context/*` file or proposals the topic touches. Don't load every proposal.

---

## Step 1 — Slug

Derive a kebab-case slug of at most 6 words from `$ARGUMENTS`. The target is `docs/proposals/<slug>.md` (create the folder if it doesn't exist). If the file already exists, stop and tell the user.

## Step 2 — Duplicates

```bash
ls docs/proposals/ 2>/dev/null; grep -il "<keyword>" docs/proposals/*.md docs/adr/*.md 2>/dev/null
```

- **The same topic is already decided in an ADR:** tell the user, and ask whether this proposal is meant to revisit that ADR.
- **A similar proposal exists:** ask whether to update it instead.
- **Partial overlap:** list the overlapping doc under **Related**.

## Step 3 — Gather missing information (one message)

Ask only for what the user hasn't already said:

1. What problem does this solve? (1–2 sentences)
2. Who owns the implementation: `context`, `app` or `both`?
3. Which roadmap task(s) does it affect (IDs from `10-roadmap.md`), if any?

## Step 4 — Write the doc

```markdown
---
title: <human title>
status: draft
owner_repo: <context | app | both>
roadmap: [<IDs or empty>]
updated: <today YYYY-MM-DD>
---

# <Title>

## Problem
## Proposed approach
## Alternatives considered
## Consequences
<!-- performance budget, Decree 13 / consent, SEO/redirects, i18n, cost, ops effort — whichever apply -->
## Open questions
<!-- owner facts go to docs/context/11-open-questions.md as Q-IDs; reference them here -->
## Related
```

## Step 5 — Self-check

- [ ] Front matter has `title`, `status`, `owner_repo`, `roadmap` and `updated`.
- [ ] The problem is concrete (not "improve performance").
- [ ] Any contradiction with an accepted ADR or an `AGENTS.md` rule is stated explicitly, with the ADR number.
- [ ] No invented business facts. Unknowns reference Q-IDs.
- [ ] If `owner_repo: both`: the impact on the docs and on the app code is described separately.

## Step 6 — Index

Add a row to the **Proposals** table in `docs/context/00-index.md`:

```
| docs/proposals/<slug>.md | draft | <one-line summary> |
```

## Step 7 — Codex critique (conditional)

Send the doc to Codex only if `owner_repo` is `both` or the doc will be marked `current` in this session, **and** it has a real Problem and Approach (not a stub). Also require `command -v codex` to succeed.

```bash
codex exec -s read-only --skip-git-repo-check -C "$PWD" -o /tmp/43l-codex-proposal-<slug>.md \
 "Critique docs/proposals/<slug>.md. Check: (1) contradictions with AGENTS.md and docs/adr/*; (2) stale or wrong claims about 43logistics.vn/ code or docs/context; (3) missing consequences for performance budget, consent (Decree 13), SEO/redirects, i18n; (4) does it make a current doc obsolete? Return a numbered critique list. Do NOT edit files."
```

Present the critique and apply only the points the user approves. If you skip this step, say "Codex critique skipped (<reason>); run /doc-review later".

## Step 8 — Report

```
## Proposal Created
- File: docs/proposals/<slug>.md (draft)
- Owner repo: <…> · Roadmap: <IDs>
- Index: docs/context/00-index.md updated
- Codex critique: <applied N of M | skipped — reason>
```
