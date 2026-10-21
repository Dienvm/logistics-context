---
name: doc-review
description: Review docs for quality and consistency. Single-file mode gives detailed findings on one proposal, ADR, spec or docs/context file. Audit mode (--audit) scans all current docs for lifecycle risks. Both modes end with a Codex review/verify/debate pass. Use after writing a proposal or before marking a doc as current.
argument-hint: "<filename> | --audit"
---

# Doc Review

> **Before Step 1:** follow AGENTS.md §6 "Running skills". Resolve and `cd` to the context root, do the state recovery, substitute and quote every `<placeholder>`, and run long commands in the background in Claude Code (synchronously in Codex).

There are two modes, depending on the argument:

- `$ARGUMENTS` = a filename: **single-doc mode**, a deep review of one doc.
- `$ARGUMENTS` = `--audit`: **audit mode**, a risk inventory across all current proposals, ADRs and specs. For whole-workspace integrity (docs ↔ app ↔ skills), use `/context-audit`.

**Project mapping (sample → this repo):** `docs/discussions/` → `docs/proposals/` · `docs/v0.2/` → `docs/adr/` · `docs/INDEX.md` → `docs/context/00-index.md` · BLUEPRINT.md / UPDATE-PLAN.md → `AGENTS.md` + ADRs / `10-roadmap.md` · Codex bridge → `codex exec`.

---

## Single-doc mode

### Step 1 — Resolve target

If the path isn't prefixed with `docs/` or `specs/`, try these in order:

1. `docs/proposals/<arg>`
2. `docs/adr/<arg>`
3. `docs/context/<arg>`
4. `specs/<arg>`

If it still isn't found, stop.

Read the full file.

### Step 2 — Read authoritative context (bounded)

Read `AGENTS.md` §3–4, the ADR status lines, and `docs/context/10-roadmap.md`. These are the ground truth.

Don't read other docs unless the target doc explicitly references them, or makes claims in their area (e.g. a tracking proposal → read `05-seo-and-tracking.md`).

### Step 3 — Review against these criteria

**Front matter**

Each artifact type has its own lifecycle (ADR 0003 §2):

- **Proposals:** `title`, `status` (`draft | current | superseded | archived`), `owner_repo` (`context | app | both`), `roadmap` and `updated`. If `superseded`, `superseded_by` points to an existing file.
- **Specs:** `title`, `type`, `status` (`draft | approved | in_implementation | implemented`), `owner_repo`, `roadmap`, `priority` and `updated`. Features also need `blocked_by_questions`. `implemented` requires `implementation_pr`.
- **ADRs:** a status line (`Accepted`, optionally with "Amended by …", or `Superseded by …`) whose referenced ADR exists.
- **Lessons:** `title`, `date`, `trigger`, `categories`, `status` (`open | resolved`).
- **`docs/context/*`:** no lifecycle metadata is expected.

**Consistency with authoritative docs**

- Claims about the architecture match `AGENTS.md` and the accepted ADRs; any intended contradiction is stated with the ADR number.
- Claims about the current phase or task match `10-roadmap.md`.
- Paths follow ADR 0002 (root layout, no `src/`, `server/*`, `db/migrations`, `app/theme.css`). Commands exist in `AGENTS.md` §7, or name the roadmap ID that adds them.
- No references to approaches the ADRs ruled out (ESLint as primary, GTM-only analytics, tags before consent) without noting that they were ruled out.

**Facts (golden rule 1)**

- Every business fact (price, phone, address, hours, legal info, carrier names, "24/7", "English support") is marked **Confirmed** in `01-business.md`, or is presented as unverified with its Q-ID. Matching the legacy text alone is not enough.
- Prices point to `route_rates`; they are never written into prose.

**Staleness**

- Are any referenced file paths, field names, table names or component names out of date (check `07-data-model.md` and the app)?
- Are there any leftover Foresent terms?

**Supersession**

- Does this doc make an existing current doc obsolete? Route the fix by type:
  - proposal or ADR → `/supersede`;
  - `docs/context/*` → edit in place;
  - spec → its own lifecycle (`/feature-bug` to update it, `/mark-implemented` to close it).
- Does this doc itself need to be superseded by something more recent?

**Ownership and completeness**

- If `owner_repo` is `both`: are the consequences for both the docs/data and the app code described?
- Are consequences and alternatives present, and do they cover the performance budget, consent/PDP law, SEO/redirects, i18n and accessibility where relevant?

### Step 4 — Write findings

Write to `/tmp/43l-doc-review-findings.md`:

```markdown
## Doc Review: <filename>

### Findings
| # | Severity | Category | Location | Issue | Suggestion |
|---|----------|----------|----------|-------|------------|
| 1 | 🔴 High | Consistency | §2, para 3 | Claims GTM-only analytics; contradicts ADR 0002 §8 | Update to the two-lane model |
| 2 | 🟡 Medium | Front matter | front matter | missing updated field | Add today's date |
| 3 | 🟢 Low | Staleness | §5 | References `src/lib/seo` | Use `modules/seo` |

### Summary
<2-3 sentences on doc health and whether it is safe to mark current>
```

Severity guide:

- 🔴 **High:** contradicts `AGENTS.md` or an ADR, wrong ownership, an invented fact, or a broken supersession chain.
- 🟡 **Medium:** missing front matter fields, or claims that are stale but not wrong.
- 🟢 **Low:** phrasing, minor cleanup, optional improvements.

### Step 5 — Report in-chat

Tell the user one line:

```
Review complete → /tmp/43l-doc-review-findings.md  |  Total: N | 🔴 N | 🟡 N | 🟢 N
```

Don't apply anything yet. Step 6 runs first, so the user decides on the merged findings.

### Step 6 — Codex review, verify & debate

**6a — Availability:** run `command -v codex`. If it's missing, report "Codex review skipped: codex CLI not found" and go to 6e with Claude's findings only.

**6b — Round 1, Codex reviews** (read-only; run it in the background and wait for the notification):

```bash
codex exec -s read-only --skip-git-repo-check -C "$PWD" \
  -o /tmp/43l-codex-doc-review-<slug>-r1.md \
  "Read /tmp/43l-doc-review-findings.md and <file>. For each finding, assess: is it correct? Is the suggested fix appropriate? Return a verdict per finding (agree / disagree with reason). Then list important issues that were MISSED (contradictions with AGENTS.md/ADRs, invented or unconfirmed facts, stale paths, missing consequences). Do NOT read .env or wordpress-site/. Do NOT rewrite the doc. Return numbered items: type (verdict-on-#N | missed), severity, location, issue, suggestion." </dev/null
```

**Run check:** if codex exits non-zero, or the `-o` file is missing or older than this run, report "Codex review failed — <stderr tail>" and ask whether to retry or continue with Claude's findings only. Apply the same check after round 2.

**6c — Claude verifies:** check each item. Write `/tmp/43l-codex-doc-review-<slug>-verdicts.md`, with one line per item: `#N accept | partial | reject — <evidence>`.

**6d — Round 2, debate** (only if any verdict is `partial` or `reject`):

```bash
codex exec -s read-only --skip-git-repo-check -C "$PWD" \
  -o /tmp/43l-codex-doc-review-<slug>-r2.md \
  "Round 2. Your items: /tmp/43l-codex-doc-review-<slug>-r1.md. Claude's verdicts: /tmp/43l-codex-doc-review-<slug>-verdicts.md. For each partial/reject item: concede, or rebut with evidence in ≤3 sentences. Do NOT edit files." </dev/null
```

Stop after 2 rounds.

**6e — Reconcile, then apply.**

1. Rewrite the findings file as a revised, numbered list:
   - drop Claude findings that the debate disproved;
   - correct the severity or suggestion of findings that were partially accepted;
   - add the agreed "missed" items;
   - mark the disputed items `⚖️`.
2. Show the revised list, then ask: "Apply any findings? (yes / specific numbers / no)".
3. Apply with the Edit tool, routing by type:
   - lifecycle changes (supersession, `implemented`) go through their owning skill (`/supersede`, `/mark-implemented`), never by direct edits;
   - content and metadata fixes are edited directly.
4. After applying, re-check **each** applied finding against its evidence (not just the front matter), and report: applied N, verified N.

Final line:

```
Codex debate: N items | agreed N | conceded by Codex N | disputed → user N
```

---

## Audit mode (`--audit`)

Goal: answer "does the current doc set have risks as a whole?", not "fix every doc".

### Step 1 — Find all current docs

```bash
find docs/proposals specs lessons -maxdepth 1 -type f -name '*.md' 2>/dev/null | sort
grep -n "^- Status" docs/adr/*.md
```

List every file, not just `status: current` ones: stale drafts and superseded docs are risks too. Read each front matter through the closing `---`, and the ADR status lines, then classify each file by its own artifact lifecycle (see single-doc Step 3).

### Step 2 — Read the indexes

Read the Proposals table and the ADR row in `docs/context/00-index.md`, plus `specs/INDEX.md`. Note which current docs appear there, and which are missing or show a different status.

### Step 3 — Identify risks (don't deep-read every file)

Scan for these risks at front-matter and title level only. Read a full file only if a specific risk requires it.

1. **Duplicate current docs:** two or more current docs on the same topic.
2. **Missing index pointers:** current docs not listed in `00-index.md` or `specs/INDEX.md`.
3. **Broken supersession chains:** a proposal whose `superseded_by` is missing or points to a missing file, or an ADR status line "Superseded by …" whose target doesn't exist. Parse each format separately.
4. **Orphaned docs:** `status: draft` docs whose `updated` date is more than 90 days old, with no activity.
5. **Cross-repo docs without consequences:** `owner_repo: both` docs with no consequences section (read those docs briefly).

### Step 4 — Report

Write to `/tmp/43l-doc-audit.md`:

```markdown
## Docs Audit — Risk Inventory

| # | Risk | Severity | Files |
|---|------|----------|-------|
| 1 | Duplicate current docs on consent | 🔴 | docs/proposals/consent-a.md, consent-b.md |
| 2 | Missing index pointer | 🟡 | docs/proposals/zalo-oa.md |
| 3 | Stale draft (>90 days) | 🟢 | docs/proposals/blog-plan.md |

### Recommended actions
1. Run `/supersede consent-a.md consent-b.md`
2. Add zalo-oa.md to the 00-index Proposals table
3. Ask the owner whether blog-plan.md should be archived
```

Don't rewrite any docs in audit mode; output the risks and recommended commands only.

### Step 5 — Codex review, verify & debate

Follow the single-doc Step 6 protocol with these changes:

- Name the files `/tmp/43l-codex-doc-audit-r1.md`, `/tmp/43l-codex-doc-audit-verdicts.md` and `/tmp/43l-codex-doc-audit-r2.md`.
- Use this round-1 prompt: *"Independently scan front matter/status of docs/proposals, docs/adr, specs and the indexes; then for each row of /tmp/43l-doc-audit.md agree/disagree with evidence and list missed lifecycle risks. Do NOT edit files."*
- End by merging the agreed items into `/tmp/43l-doc-audit.md`, marking disputed rows `⚖️`, and printing the debate summary line. Make no doc edits.
