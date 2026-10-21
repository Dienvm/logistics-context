---
name: context-audit
description: Repository memory integrity check for the 43logistics.vn workspace. Finds contradictions between AGENTS.md, ADRs, docs/context, data, skills, specs and the actual app code; broken supersession chains; duplicate current docs; missing index pointers; stale references. Outputs a risk inventory with recommended commands — does not rewrite docs.
---

# Context Audit — Repository Memory Integrity

> **Before Step 1:** follow AGENTS.md §6 "Running skills". Resolve and `cd` to the context root, do the state recovery, substitute and quote every `<placeholder>`, and run long commands in the background in Claude Code (synchronously in Codex).

You are checking whether this workspace's docs, as a whole, give consistent and coherent guidance to AI agents and team members.

This is different from `/doc-review`. You are not checking one doc's quality; you are checking whether **the workspace as a memory system contradicts itself, or contradicts the app it describes**.

**Output:** a risk inventory with recommended commands. Do NOT rewrite any docs.

**Project mapping (sample → this repo):**

| Sample concept | In this repo |
| --- | --- |
| `docs/v0.2/` | `docs/adr/` (status lines) |
| `docs/discussions/` | `docs/proposals/` (front matter) |
| `docs/INDEX.md` | `docs/context/00-index.md` |
| BLUEPRINT/UPDATE-PLAN | `AGENTS.md` + `10-roadmap.md` |

The extra checks 3g–3k cover this repo's two-repo setup.

---

## Step 1 — Collect all docs and their front matter

Read the first 15 lines of every `.md` file in:

- `docs/adr/`
- `docs/proposals/`
- `specs/` and `lessons/`

```bash
grep -n "^- Status" docs/adr/*.md
find docs/proposals specs lessons -maxdepth 1 -type f -name '*.md' 2>/dev/null | sort   # empty folders are fine (no zsh glob errors)
```

For each listed file, read its front matter through the closing `---`. For ADRs, read the status line.

Build a table:

```
filename | type | status | superseded_by | owner_repo | roadmap | updated
```

---

## Step 2 — Read the index and authoritative docs

Read in full:

- `docs/context/00-index.md`
- `AGENTS.md`
- `docs/context/10-roadmap.md`

Also read the status and Decisions headings of every ADR. These are the ground truth: contradictions in current docs are measured against them.

---

## Step 3 — Check for these integrity risks

### 3a — Duplicate current docs on same topic

Two or more `status: current` proposals, or accepted ADRs, that cover the same subject (stack, analytics, consent, layout, workflow…). Resolve the amendment and supersession links first: ADR 0002 amends ADR 0001 and is not a duplicate. Flag only docs that compete for authority, and name the one that should be the single source of truth.

### 3b — Broken supersession chains

- A proposal with `status: superseded` but no `superseded_by` in its YAML, or an ADR status line "Superseded by …" with no target. These are two different formats: parse YAML for proposals and the status line for ADRs, and resolve numeric ADR targets (`0004` → `docs/adr/0004-*.md`).
- A `superseded_by` pointing to a filename that doesn't exist.
- A supersession loop (A supersedes B, B supersedes A).
- An ADR marked "Amended by NNNN" where ADR NNNN doesn't exist.

### 3c — Index gaps

- `status: current` proposals not listed in the `00-index.md` Proposals table.
- Index rows whose status differs from the file's front matter. Normalise first: the index cell `superseded → winner.md` equals YAML `superseded` (check the target separately).
- ADRs missing from the `00-index.md` ADR row.
- Specs missing from `specs/INDEX.md`, or whose INDEX status differs from the front matter.
- Lessons missing from `lessons/INDEX.md`, INDEX rows pointing to missing lesson files, and lesson status mismatches (`open`/`resolved`).

### 3d — Cross-repo docs missing consequences

Read the docs with `owner_repo: both` in full. Judge each by its own artifact's sections: Consequences for proposals and ADRs; Affected Areas plus Dependencies & Risks for specs. Flag those that don't describe both the context impact and the app impact.

### 3e — Contradiction with AGENTS.md / ADRs

Do any current proposals, `docs/context/*` sections or skills make claims that contradict `AGENTS.md` §3–4 or an accepted ADR? For example:

- `src/` paths (ADR 0002 says root layout);
- ESLint as the primary linter;
- GTM-only analytics;
- `middleware.ts` as the target;
- tags loaded before consent.

Check titles, headings and greps first; deep-read only when a hit raises a flag.

### 3f — Stale drafts

Proposals or specs with `status: draft` whose `updated` date is more than 90 days before today. Flag them for an archive or promotion decision.

### 3g — Stack claims vs installed code

Compare the "In the app today" column of `AGENTS.md` §3 with `43logistics.vn/package.json`, the config files (`next.config.*`, `proxy.ts`/`middleware.ts`, `biome.json`, `tailwind.config.*`, `drizzle.config.ts`) and the folder layout. Also check the `AGENTS.md` §7 commands: an "exists" row must be in `scripts`, and a planned row must name a roadmap ID.

### 3h — One fact, one place

```bash
grep -rnE "0979|0827|đ/kg|[0-9]{2,3}\.000" AGENTS.md docs/context .claude/skills | grep -vE "01-business|legacy-copy|07-data-model"
```

Flag values that differ between files, prices written in prose instead of `route_rates`, and `NEEDS CONFIRMATION` items in `01-business.md` without a matching open Q-ID. For each **Answered** row in `11-open-questions.md`, check that the answer reached its canonical home: business facts → `01-business.md`; hosting and architecture → `06-architecture.md` or an ADR; tracking → `05-seo-and-tracking.md`; i18n → `08-i18n.md`.

### 3i — Data files

Resolve each file's canonical location from the roadmap state first:

- `redirect-map.csv`, `design-tokens.json` and `seed/*.json` live in the context `data/` before F-01 is `[x]`, and in `43logistics.vn/data/` after.
- `media-inventory.csv` lives in the context `data/` until C-04 is `[x]`.

Then check the counts at that location: `redirect-map.csv` has 63 data rows, and `media-inventory.csv` has 330 rows, 175 of them with `action = migrate`.

Two live copies of the same file is 🔴.

### 3j — Roadmap vs specs; skills vs workspace

- **Roadmap and specs:**
  - a roadmap `[x]` without an `implemented` spec is 🟡;
  - an `implemented` spec whose roadmap box is still `[ ]` is 🔴;
  - a spec without a roadmap ID is 🟡.
- **Skills:** grep `.claude/skills` and `CLAUDE.md` for references to things that don't exist here: `foresent`, `BLUEPRINT`, `UPDATE-PLAN`, `docs/v0.2`, `yarn`, `send_to_codex`, `preflight.sh`, missing `scripts/*`. Confirm that `.agents/skills` is still a symlink to `.claude/skills`, and that every skill ends with a Codex review/debate step (ADR 0003 §6).

### 3k — Secrets & personal data hygiene

These checks look at paths only. **Never print values.**

- `git -C 43logistics.vn ls-files | grep -E '(^|/)\.env($|\.)' | grep -v '\.env\.example$'` must be empty.
- `wordpress-site/` must be in the root `.gitignore`.
- No database **dump** may exist outside `wordpress-site/`. Drizzle migrations in `43logistics.vn/db/migrations/*.sql` are legitimate. Flag other `*.sql`, `*.sql.gz` or `*.dump` files by path, together with any file containing `INSERT INTO` for `wp_`/`wpiw_` tables (check with `grep -l`, never print the content).

---

## Step 4 — Report

Write the report to `/tmp/43l-context-audit.md` and show it:

```markdown
## Context Audit — Repository Memory Integrity — <date>

### Risk Inventory

| # | Risk | Severity | Files | Recommended command |
|---|------|----------|-------|---------------------|
| 1 | Duplicate current docs: consent banner | 🔴 | docs/proposals/consent-a.md, consent-b.md | `/supersede consent-a.md consent-b.md` |
| 2 | AGENTS §3 says next ^15.3.3 but package.json has 16.x | 🔴 | AGENTS.md, package.json | Correct the §3 row now. Run `/mark-implemented <f-01 spec slug> <merged app PR>` only if F-01's ACs are evidenced |
| 3 | Missing index pointer | 🟡 | docs/proposals/zalo-oa.md | Add to 00-index Proposals table |
| 4 | Stale draft >90 days | 🟢 | docs/proposals/blog-plan.md | Archive or promote |

### Overall health
<2-3 sentences on whether the workspace gives consistent guidance or has meaningful gaps an AI would stumble on>

### Recommended fix order
1. ...
2. ...
```

Severity guide:

- 🔴 **High:** an agent or team member reading the workspace would get conflicting signals, false stack claims or broken references; or a secret or personal data is exposed.
- 🟡 **Medium:** a gap or inconsistency that could confuse but doesn't directly contradict.
- 🟢 **Low:** housekeeping, no immediate impact on guidance.
