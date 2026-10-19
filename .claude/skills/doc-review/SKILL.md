---
name: doc-review
description: Review docs for quality and consistency. Single-file mode gives detailed findings on one proposal, ADR, spec or docs/context file. Audit mode (--audit) scans all current proposals/ADRs for lifecycle risks. Use after writing a proposal or before marking a doc current.
argument-hint: "<file> | --audit"
---

# Doc Review

- `$ARGUMENTS` = a file: **single-doc mode**.
- `$ARGUMENTS` = `--audit`: **audit mode**. Lifecycle risks only; for whole-workspace integrity use `/context-audit`.

---

## Single-doc mode

### Step 1 — Resolve the target

Try the path as given, then `docs/proposals/<arg>`, `docs/adr/<arg>`, `docs/context/<arg>` and `specs/<arg>`. If none exists, stop. Read the whole file.

### Step 2 — Ground truth (bounded)

Read `AGENTS.md` §3–4 and the status lines of the ADRs. Read a `docs/context/*` file only if the target makes claims in its area (for example, a tracking proposal leads you to read `05-seo-and-tracking.md`).

### Step 3 — Criteria

**Metadata**

- **Proposals and specs:** front matter is complete. Proposals need `title`, `status`, `owner_repo`, `updated`; specs also need `type`, `priority` and `roadmap`. `status` is valid, and `superseded_by` resolves to a real file.
- **ADRs:** the status line is present, and Amends/Supersedes names a real ADR.
- **`docs/context/*`:** no lifecycle metadata is expected.

**Consistency**

- Claims match `AGENTS.md` and the accepted ADRs. Any intentional contradiction is stated explicitly.
- Paths follow ADR 0002: root layout, no `src/`, `server/*`, `db/migrations`, `app/theme.css`.
- Commands exist in `AGENTS.md` §7, or are marked with the roadmap ID that adds them.

**Facts (golden rule 1)**

- Every business fact (price, phone, address, hours, legal info, carrier names, claims such as "24/7" or "English support") is marked **Confirmed** in `01-business.md`, or is presented as unverified with its Q-ID. Matching the legacy text alone is not enough.
- No price is hard-coded in copy; prices point to `route_rates`.

**Completeness**

- The doc has Alternatives and Consequences (proposals, ADRs).
- Consequences cover the areas that apply: the performance budget, consent/Decree 13, SEO/redirects, i18n (VI + EN) and accessibility.
- If `owner_repo: both`: the docs impact and the app impact are both described.

**Staleness and supersession**

- Does it reference removed concepts? Examples: Foresent terms, ESLint as the linter, GTM-only analytics, `middleware.ts` as the target.
- Does it make an existing current doc obsolete? If so, recommend `/supersede`.

### Step 4 — Findings → `/tmp/43l-doc-review.md`

```markdown
## Doc Review: <file>

| # | Severity | Category | Location | Issue | Suggestion |
|---|----------|----------|----------|-------|------------|

### Summary
<2–3 sentences; safe to mark current?>
```

Severity:

- 🔴 Contradicts AGENTS/ADR, states an invented fact, or breaks the supersession chain.
- 🟡 Missing metadata, a stale but not wrong claim, or a missing consequence area.
- 🟢 Wording or cleanup.

### Step 5 — Report

Print one line:

```
Review complete → /tmp/43l-doc-review.md | Total N | 🔴 N | 🟡 N | 🟢 N
```

Then ask: "Apply any findings? (all / numbers / none)". Apply the chosen ones with Edit, then re-check the metadata.

### Step 6 — Codex second opinion (only if the user asks, and `command -v codex` succeeds)

```bash
codex exec -s read-only --skip-git-repo-check -C "$PWD" -o /tmp/43l-codex-doc-review.md \
 "Read /tmp/43l-doc-review.md and <file>. For each finding give agree/disagree with a reason, and list anything important that was missed. Do NOT edit files."
```

---

## Audit mode (`--audit`)

1. Read the front matter of `docs/proposals/*.md` and `specs/*.md`, and the status lines of `docs/adr/*.md`.
2. Read the Proposals table in `docs/context/00-index.md` and `specs/INDEX.md`.
3. Flag these risks:
   - two current docs on one topic;
   - a current doc missing from its index, or an index row whose status differs from the file;
   - a broken `superseded_by` chain;
   - drafts more than 90 days old;
   - `owner_repo: both` docs without consequences for both repos.
4. Output a table with columns `Risk | Severity | Files | Recommended command` and **no edits**.
