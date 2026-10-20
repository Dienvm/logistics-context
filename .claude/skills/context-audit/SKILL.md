---
name: context-audit
description: Repository memory integrity check for the 43logistics.vn workspace. Finds contradictions between AGENTS.md, ADRs, docs/context, data files, skills, specs and the actual app code (versions, paths, scripts). Outputs a risk inventory with recommended actions — does not rewrite anything.
---

# Context Audit — does the workspace contradict itself?

This skill differs from `/doc-review`: it checks the workspace as a memory system, not the quality of one doc. It asks whether an agent that follows these files would get conflicting or false guidance.

**Output:** a risk inventory and recommended commands. **Do not edit files.**

---

## Step 1 — Inventory

```bash
ls docs/context docs/adr docs/proposals specs lessons 2>/dev/null
head -15 docs/proposals/*.md specs/*.md lessons/*.md 2>/dev/null
grep -n "^- Status" docs/adr/*.md
```

Build a table of `file | type | status | owner_repo | updated`.

## Step 2 — Ground truth

Read `AGENTS.md` in full, the status and decision headings of every ADR, and `docs/context/00-index.md`.

## Step 3 — Checks

### 3a — Stack claims vs installed code
Compare the "In the app today" column of `AGENTS.md` §3 with `43logistics.vn/package.json`, its config files (`next.config.*`, `proxy.ts`/`middleware.ts`, `biome.json`, `tailwind.config.*`, `drizzle.config.ts`) and its folder layout. Flag any row that is no longer true. That includes gaps that have closed but are still listed as open.

### 3b — Paths that don't exist
Grep `AGENTS.md`, `docs/context/*.md` and `.claude/skills/*/SKILL.md` for code paths (`app/`, `components/`, `server/`, `db/`, `lib/`, `scripts/`, `src/`). A missing path is fine if the text marks it as planned (a roadmap ID or "after F-xx"). Flag it otherwise. Any `src/` reference contradicts ADR 0002.

### 3c — Commands
Check every row of the `AGENTS.md` §7 table: a row marked "exists" must be in `package.json` `scripts`, and a planned row must name a roadmap ID.

### 3d — One fact, one place
Grep for business facts outside their homes. The homes are `01-business.md`, `data/seed/*`, `legacy-copy/*` and `07-data-model.md` settings examples.

```bash
grep -rnE "0979|0827|đ/kg|[0-9]{2,3}\.000" AGENTS.md docs/context .claude/skills | grep -vE "01-business|legacy-copy|07-data-model"
```

Flag values that differ between files, and prices that appear in prose instead of in `route_rates`.

### 3e — Open questions propagation
For each row in the **Answered** section of `11-open-questions.md`, check that `01-business.md` (and the seed data, if relevant) carry the answered value. For each `NEEDS CONFIRMATION` in `01-business.md`, check that a matching open Q-ID exists.

### 3f — Data counts
Check that the row counts quoted in the docs match the files:

- `data/redirect-map.csv`: 63 data rows.
- `data/media-inventory.csv`: 330 rows, of which 175 are `migrate`.

After F-01, check that `redirect-map.csv`, `design-tokens.json` and `seed/*.json` exist in `43logistics.vn/data/` and were removed from the context `data/` (ADR 0002 §11). `media-inventory.csv` stays in the context workspace until C-04. Two live copies of the same file is a 🔴 risk.

### 3g — Roadmap vs specs
- A `[x]` task in `10-roadmap.md` without an `implemented` spec, or one marked done by hand: 🟡.
- A spec marked `implemented` whose roadmap task is still `[ ]`: 🔴.
- A spec without a roadmap ID: 🟡.

### 3h — Proposals and ADRs lifecycle
- A `superseded` proposal without `superseded_by`, or one pointing at a missing file.
- A `current` proposal that contradicts an accepted ADR.
- Two current docs on the same topic.
- A draft with `updated` more than 90 days ago.
- A proposal missing from the `00-index.md` Proposals table.

### 3i — Skills and instruction files
Grep `.claude/skills` and `CLAUDE.md` for references to things that don't exist here: `foresent`, `BLUEPRINT`, `UPDATE-PLAN`, `docs/v0.2`, `yarn`, `telegram`, `send_to_codex`, `preflight.sh`, or any `scripts/*.sh` that is missing. Also confirm that `.agents/skills` is still a symlink to `.claude/skills`.

### 3j — Secrets and personal data hygiene
These are path checks only. **Never print values.**

- Report any line that `git -C 43logistics.vn ls-files | grep -E '(^|/)\.env($|\.)' | grep -v '\.env\.example$'` returns.
- Check that `wordpress-site/` is listed in the root `.gitignore`.
- Check that no `*.sql` file sits outside `wordpress-site/`.

## Step 4 — Report

```markdown
## Context Audit — <date>

| # | Risk | Severity | Files | Recommended action |
|---|------|----------|-------|--------------------|
| 1 | AGENTS §3 says next ^15.3.3 but package.json has 16.x | 🔴 | AGENTS.md, package.json | Update §3 row; tick F-01 via /mark-implemented |

### Overall health
<2–3 sentences: would an agent following these files build the right thing?>

### Fix order
1. …
```

Severity:

- 🔴 An agent would act on false or contradictory guidance, a secret or personal data is exposed, or two sources of truth exist.
- 🟡 A gap or stale pointer that could confuse.
- 🟢 Housekeeping.
