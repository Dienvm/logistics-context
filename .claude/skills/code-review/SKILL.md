---
name: code-review
description: Review implemented 43logistics.vn code against its spec. Checks code quality + spec drift + AGENTS.md golden rules, then has Codex review, verify and debate the findings. Can recommend (but never execute) the implemented status transition.
argument-hint: "<spec-slug | file-path | staged>"
---

# Code Review

> **Before Step 1:** follow AGENTS.md §6 "Running skills". Resolve and `cd` to the context root, do the state recovery, substitute and quote every `<placeholder>`, and run long commands in the background in Claude Code (synchronously in Codex).

**Context budget:** target spec + `AGENTS.md` (§3–4, §8–9) + affected source files only.

**Output contract:** findings report at `/tmp/43l-review-findings.md` + spec drift section + Codex debate record.

**Never:** update spec status, or write to the app repo before the user confirms what to fix.

**Project mapping (sample → this repo):**

| Sample concept | In this repo |
| --- | --- |
| BLUEPRINT.md | `AGENTS.md` + `docs/adr/*` + the `docs/context/*` section the code implements |
| `foresent-rules` script/schema/fixture | context workspace: docs/data/scripts (rarely reviewed as code) |
| `foresent-robot` handler/service | app: page/layout, block, ui primitive, server query, server action, route handler, `proxy.ts`, db schema, script, test |
| Codex bridge | `codex exec` |

---

## Step 1 — Resolve target

From `$ARGUMENTS`, resolve **the repo, the exact revision and the diff** being reviewed. Use `$R` for the repo flag: `-C 43logistics.vn` for the app, empty for the context workspace. Secret paths are always excluded from content diffs: `X=(-- . ':(exclude).env*' ':(exclude)**/.env*')`.

| Argument | What to review |
| --- | --- |
| **Spec slug** | Read `specs/<slug>.md`; take its affected areas and `owner_repo`. If the spec has `branch:`, the revision is that branch: review `git $R diff main...<branch> "${X[@]}"`, and read file contents from the branch (`git $R show <branch>:<path>`), not the checkout. |
| **File path** | That file in the working tree; the repo is detected from the path. |
| **`staged`** | Detect the repo first. Review `git $R diff --cached "${X[@]}"`, and read the **index** versions (`git $R show :<path>`), not the working tree. |
| **No arg** | Review the uncommitted changes (`git $R diff HEAD "${X[@]}"` plus new files from `git $R ls-files --others --exclude-standard`) in each repo that has any. |

**Spec association:** for the file, staged and no-arg modes, find the matching spec (a `specs/INDEX.md` row whose affected areas or `branch` match). If there is none, mark spec drift "N/A — no spec", and skip the AC parts of Steps 4A, 5 and 6.

Write the resolved target (repo, revision, diff command) at the top of the findings file. Pass it to Codex in Step 9.

---

## Step 2 — Read spec and authoritative context

Read the spec from `specs/`, and extract its acceptance criteria and affected areas.
Read `AGENTS.md` §3 (stack: is the code using APIs that are installed?) and §4 (golden rules) as the architecture ground truth. Read only the `docs/context/*` sections the code implements, e.g. `05` JSON-LD rules for a route page.

---

## Step 3 — Read target files

Read all files in the affected areas. For each file, note:

- **layer:** page/layout, block component, ui primitive, server query, server action, route handler, proxy, db schema, script, test, message file;
- **approximate size** (lines);
- **primary responsibility.**

For large files (>300 lines), use offset + limit.

List the resolved file paths and their layers to the user before continuing.

---

## Step 4 — Review (8 categories)

### A — Spec drift

- Does the implementation satisfy every acceptance criterion?
- Are there deviations from the spec's affected areas or scope?
- Did the implementation change behaviour NOT covered by the spec?

Flag each drift item: `meets spec` / `partial` / `deviates` / `out of scope`.

### B — Correctness

- Logic errors, unhandled states, async/await correctness.
- **Price engine:** chargeable weight = max(actual, L×W×H/divisor), rounding, band edges, open-ended bands, `contact_for_price`.
- **Next.js:** async `params`/`searchParams`, `setRequestLocale`, locale passed into cached functions, `updateTag` only inside Server Actions, cache tags invalidated on every write.
- **`/go/[channel]`:** the redirect never waits on tracking; `event_id` is validated; an invalid channel returns 404.
- **Null safety** on optional DB fields (unverified routes, missing translations → 404, not a VI fallback).

### C — Redundancy & Single Source of Truth

- **Hard-coded facts:** prices, phones, addresses, hours or carrier names in components or copy instead of DB/settings. Flag as 🔴 (rules 1–2). A value that isn't **Confirmed** in `01-business.md` or `is_verified` in the DB is also 🔴, even if it matches the legacy text.
- **Duplicated logic:** the same conditional tree, mapping/transform or fetch call in ≥ 2 places.
- **Duplicated constants:** the same string or number literal (event names, cache tags, consent categories, status codes) in ≥ 2 places.
- **Duplicated types:** the same interface or Zod shape defined in ≥ 2 files.
- **Dead code:** unused imports, unused variables, commented-out blocks, unreachable branches, new `<ai_context>` headers.
- **Inline magic values:** numbers or strings with no named constant.

### D — Reusability & Abstraction

- Logic that appears only once but is clearly generic: suggest extraction only if it would benefit other areas.
- Is data fetching (`server/queries`) separated from rendering? Does `components/ui` stay free of fetching?
- **Do not flag** single-use code as needing extraction. Only flag genuine reuse opportunities (≥ 2 use sites).

### E — Type safety

- No untyped `any` in new code.
- No duplicate type definitions; types inferred from Zod schemas where one exists.
- Exported functions have explicit return types; Server Actions return `ActionState<T>`.

### F — Conventions

Follows the patterns in `AGENTS.md` §8:

- root layout (no `src/`), kebab-case files, one component per file, `…Action` names;
- strings in `messages/{vi,en}.json` with key parity;
- shadcn primitives restyled via tokens only;
- Biome-clean;
- Conventional Commit messages.

### G — Security & privacy

- No hard-coded secrets (credentials, API keys, tokens, `DATABASE_URL`). Public identifiers, such as the canonical bucket names `media`/`og`/`private` and the GTM ID read from settings, are fine.
- Secret files: `.env.example` (no values) may change. Any other `.env*` path must not be **added or modified**. Its **removal** (F-00) is expected; verify it by name with `git $R status --short`, never by diffing its contents.
- `@/db` and `SUPABASE_SERVICE_ROLE_KEY` never reach client code (`server-only`).
- Every admin action or handler calls `requireRole`.
- Zod validates all input; no raw user input in SQL strings.
- No PII, phone numbers or raw IPs in logs; IPs are hashed.
- Consent gates PostHog, GTM, `43l_attr` and server-side conversions (rule 14).

### H — Performance, SEO, a11y

- **Client JS:** new `"use client"` boundaries or imports of `motion`, Clerk or TanStack Query on public pages. The 120 KB budget is gzipped first-party JS on the initial route render, framework included, with consent rejected; third-party scripts loaded after consent are reported separately (AGENTS.md §4.8). Also flag unnecessary sequential awaits that could be `Promise.all`.
- **Test coverage:** compare the tests in the diff with the spec's Test / Fixture Plan. Flag missing scenarios, edge cases (band edges, missing translation, no consent, invalid channel) and tests that would pass without the feature (Vitest/Playwright).
- **Images and motion:** `next/image` with `sizes`; LCP not animated; transform/opacity only; reduced motion respected.
- **SEO:** one H1, `generateMetadata` with canonical + alternates, valid JSON-LD, breadcrumbs (except home), Zalo CTA via `/go`.
- **Accessibility:** labelled inputs, visible focus, ≥ 44 px targets, token colours, no uppercase menus.

---

## Step 5 — Write findings

Write to `/tmp/43l-review-findings.md`:

```markdown
## Code Review: <target>

### Files Reviewed
- <file path> (<layer>, <N> lines)
- ...

### Spec drift
| Criterion | Status | Notes |
|-----------|--------|-------|
| Given X, when Y, then Z | ✅ meets spec | |
| Given A, when B, then C | ⚠️ partial | Missing edge case |

### Findings
| # | Severity | Category | Location | Issue | Suggestion |
|---|----------|----------|----------|-------|------------|
| 1 | 🔴 High | C – SSOT | components/blocks/rate-table.tsx:42 | Price 75000 hard-coded | Read from route_rates via server/queries |
| 2 | 🟡 Medium | C – Redundancy | lib/tracking/events.ts:10,34 | 'click_zalo' literal twice | Extract to named constant |
| 3 | 🟢 Low | F – Conventions | app/go/[channel]/route.ts:18 | `<ai_context>` header in new file | Remove |

### Summary
<2–4 sentences on the overall state of the code, the most important themes, and whether it is safe to ship as-is.>

### Implemented transition recommendation
<!-- Only include this section when ALL spec criteria are met AND no 🔴 findings remain -->
All acceptance criteria met. No blocking findings. Eligible for /mark-implemented.
Required evidence before running:
- [ ] Implementation PR link (merged): ___
- [ ] Passing checks (lint · typecheck · unit · e2e): ___
- [ ] Lighthouse / SEO checks for changed public pages: ___
- [ ] AGENTS.md §3/§7 rows updated if a gap closed: yes | N/A
- [ ] Changelog/digest decision: added | deferred | N/A
```

Severity guide:

- **🔴 High:** bug risk, spec deviation, security/privacy issue, invented or hard-coded fact, budget breach, broken invariant that affects runtime behaviour.
- **🟡 Medium:** maintainability problem, missing reuse, convention violation with no immediate runtime risk.
- **🟢 Low:** style, naming, minor cleanup.

After writing, tell the user **only one line**:

```
Review complete → /tmp/43l-review-findings.md  |  🔴 N | 🟡 N | 🟢 N | Spec drift: N items
```

---

## Step 6 — Lesson check (auto-draft on significant failures)

Check for these conditions before asking what to fix:

| Condition | Trigger |
|-----------|---------|
| 🔴 Spec drift: ≥1 acceptance criterion not met | Implementation deviated from spec |
| 🔴 findings ≥3 in same category | Pattern, not one-off |
| Implementation required scope outside spec's affected areas | Scope not captured in spec |

If ANY condition is true, create `/tmp/43l-lesson-draft-<slug>.md`:

```markdown
# Lesson Draft — <spec title>

**Auto-generated by /code-review on <date>**
**Trigger:** <which condition above>
**Spec:** specs/<spec-slug>.md

## What happened
<Describe findings: which criteria failed, which category had repeated issues>

## Suspected cause
<What was underspecified in the spec, or what pattern was missed>

## Follow-up action (required before saving)
- [ ] Tighten acceptance criteria in spec for ___
- [ ] Add to AGENTS.md §4 / implement checklist: ___
- [ ] Other: ___
```

Tell the user:

```
⚠️  Significant findings → lesson draft saved to /tmp/43l-lesson-draft-<slug>.md
    Run /lesson <slug> to finalize, or discard if not worth keeping.
```

---

## Step 7 — Interview before fixing (AskUserQuestion tool)

Use AskUserQuestion before applying any edits. When Codex runs this skill, ask the same questions in plain text.

**Batch 1:**

- "Does the findings table capture what you observed?" List 2–3 specific findings as options, plus "Yes, complete", "No — missed something" and Other.
- "Which findings to prioritize?" `🔴 High only` / `All findings` / 1–2 inferred specific rows, plus Other.
- "Any findings to skip?" List finding #s, plus "Fix everything" and Other.

Wait for the answers. If the user flags a missed finding, add it to `/tmp/43l-review-findings.md` before fixing.

---

## Step 8 — Apply fixes

Ask: "Fix which findings? (all / 🔴 only / specific numbers / none)"

**Pre-fix gate (both paths):**

1. Run `git $R status --short` in each target repo.
2. Never fix on `main`. Use the spec's `branch:`; otherwise create `fix/<slug>` from the reviewed revision.
3. If there are uncommitted changes you didn't make, list them and ask before touching those files. Never stash or revert them.
4. Resolve the check commands once from `43logistics.vn/package.json` (`$LINT`, `$TYPECHECK` = `typecheck` or `type-check`, `$TEST`, `$E2E`; missing → "not available until F-01"). Give both paths the same commands and limitations.

**Check whether Codex is available for fix delegation:**

```bash
command -v codex >/dev/null && echo codex=yes || echo codex=no
```

- **Codex available:** offer to delegate the fixes. If the user agrees, run in the background:

  ```bash
  codex exec -s workspace-write -C "$PWD" \
    "Read /tmp/43l-review-findings.md and AGENTS.md. In 43logistics.vn/ on branch <branch>, fix [all / 🔴 High / findings #N,M]. Edit minimally, then run pnpm -C 43logistics.vn <$LINT> <$TYPECHECK> <$TEST — only those that exist>, and report a fix table (finding #, file:line, change, check result). Never print .env* contents." </dev/null
  ```

  If it exits non-zero or its report shows failing checks, fall back to Claude applying the fixes directly.
- **Codex not available:** Claude applies the fixes directly. Edit minimally with the Edit tool, then re-run the resolved `$LINT`, `$TYPECHECK` and `$TEST` (state which are unavailable).

If the "Implemented transition recommendation" section is present, tell the user to run `/mark-implemented <spec-slug> <pr-link>` once the PR is merged.

---

## Step 9 — Codex review, verify & debate

Codex acts as a second reviewer. It verifies Claude's findings, finds what was missed, and checks the applied fixes.

**9a — Availability:** if `codex=no`, report "Codex review skipped: codex CLI not found" and stop.

**9b — Round 1, Codex reviews** (read-only; run it in the background and wait for the notification):

```bash
codex exec -s read-only --skip-git-repo-check -C "$PWD" \
  -o /tmp/43l-codex-code-review-<slug>-r1.md \
  "Second-review this target: <repo, revision and diff command from the top of /tmp/43l-review-findings.md>; spec: specs/<file> or 'none'. Never print .env* contents. Claude's findings: /tmp/43l-review-findings.md. For EACH Claude finding: agree / disagree with evidence. Then list important issues Claude MISSED (spec drift, golden rules in AGENTS.md §4, correctness, security/privacy, performance). If fixes were applied in Step 8, verify each is correct and complete. Do NOT read .env or wordpress-site/. Do NOT edit files. Return numbered items: type (verdict-on-#N | missed | fix-check), severity, file:line, issue, fix." </dev/null
```

**Run check:** if codex exits non-zero, or the `-o` file is missing or older than this run, report "Codex review failed — <stderr tail>" and ask whether to retry or finish without it. Apply the same check after round 2.

**9c — Claude verifies:** check each Codex item against the code. Write `/tmp/43l-codex-code-review-<slug>-verdicts.md`, with one line per item: `#N accept | partial | reject — <evidence>`.

**9d — Round 2, debate** (only if any verdict is `partial` or `reject`):

```bash
codex exec -s read-only --skip-git-repo-check -C "$PWD" \
  -o /tmp/43l-codex-code-review-<slug>-r2.md \
  "Round 2. Your items: /tmp/43l-codex-code-review-<slug>-r1.md. Claude's verdicts: /tmp/43l-codex-code-review-<slug>-verdicts.md. For each partial/reject item: concede, or rebut with file:line evidence in ≤3 sentences. Do NOT edit files." </dev/null
```

Stop after 2 rounds. Items still disputed go to the user.

**9e — Resolve with the user.** Show this table:

```
| # | Codex item | Claude verdict | After debate | Action |
```

Ask (AskUserQuestion): "Act on which?" with options `All agreed` / `Agreed + disputed` / `Specific numbers` / `None`.

This pass is read-only. Accepted items are handled like this:

- Add accepted "missed" items to `/tmp/43l-review-findings.md`.
- Fix the items the user authorizes through **Step 8** (same gate, same checks).
- **Refresh** after the fixes:
  - re-evaluate every acceptance criterion and the spec-drift table;
  - re-run the Step 6 lesson triggers;
  - keep the "Implemented transition recommendation" section only if all ACs are met and no 🔴 item remains.

**9f — Final fix check** (only if 9e led to fixes): run one more read-only Codex pass over the resulting diff:

```bash
codex exec -s read-only --skip-git-repo-check -C "$PWD" \
  -o /tmp/43l-codex-code-review-<slug>-fixcheck.md \
  "Verify only the fixes made after /tmp/43l-codex-code-review-<slug>-verdicts.md: <diff command>. For each: correct / incomplete / regressed, with file:line. Do NOT edit files." </dev/null
```

Report its result. Anything it marks as incomplete or regressed goes back to the user; don't start an extra debate round.

Final line:

```
Codex debate: N items | agreed N | conceded by Codex N | disputed → user N
```
