---
name: feature-bug
description: Create an implementation spec in specs/ for the 43logistics.vn app. Interviews the user, explores existing docs/specs/app code, writes a complete spec tied to a roadmap ID, has Codex review and debate it, and offers to implement. NOT for exploration — use /proposal for that.
argument-hint: "[feature|bug] <roadmap-id or short-title>"
---

# Feature / Bug — Implementation Spec Creator

> **Before Step 1:** follow AGENTS.md §6 "Running skills". Resolve and `cd` to the context root, do the state recovery, substitute and quote every `<placeholder>`, and run long commands in the background in Claude Code (synchronously in Codex).

**This skill creates implementation commitments, not exploration proposals.**
If the user is still exploring options, redirect them to `/proposal` instead.

**Context budget:**

- `AGENTS.md`
- `docs/context/00-index.md`
- `docs/context/10-roadmap.md` (the task row)
- the ADRs in `docs/adr/`
- `specs/INDEX.md` and matching existing specs

**Output contract:** `specs/<type>-<slug>.md` + updated `specs/INDEX.md` + a Codex review/debate record.

**Never:** touch app code, mark anything implemented, create specs for docs-only changes.

**Project mapping (sample → this repo):**

| Sample concept | In this repo |
| --- | --- |
| BLUEPRINT.md | `AGENTS.md` §3–4 + `docs/adr/*` + `docs/context/06-architecture.md` |
| UPDATE-PLAN.md | `docs/context/10-roadmap.md` |
| docs/INDEX.md | `docs/context/00-index.md` |
| foresent-rules / foresent-robot | `context` (this workspace) / `app` (`43logistics.vn/`) |
| Codex bridge | `codex exec` (see the final step) |
| Claude tools when Codex runs this skill | `AskUserQuestion` → ask the same batches as plain text; `Explore` subagent → `rg`/`ls` with the same limits |

---

## Step 1 — Classify and slug

From `$ARGUMENTS`:

- **Type:** `feature` or `bug` (ask if unclear).
- **Roadmap ID:** if `$ARGUMENTS` contains one (`F-00`, `S-03`…), read that row in `docs/context/10-roadmap.md`. Its *Context*, deliverable and *Accept* text are the starting point. Every spec needs a roadmap row (AGENTS.md §2). If none fits, propose a new row (phase, ID, *Accept*) and add it to `10-roadmap.md` only after the user approves. `roadmap: none` is not allowed.
- **Slug:** kebab-case, max 6 words. Prefix the roadmap ID when there is one (`s03-price-engine`).
- **Target file:** `specs/<type>-<slug>.md`.

---

## Step 2 — Gather context silently (before asking questions)

### 2a — Scan existing specs for duplicates

Read `specs/INDEX.md`. Scan for rows whose Roadmap ID or Title overlaps with the current request.

- **Exact duplicate found:** warn the user: *"A spec for this already exists: `<filename>`. Update it, or create a separate one?"*
  Then immediately log the duplicate attempt (before the user answers):
  - Append a row to `specs/LESSONS.md` (create it with a header if missing): category `DUPLICATE_SPEC`, plus a description of the overlap. This file is a **duplicate-attempt log**, not a lesson; `/lesson` is only for learnings with a follow-up.
  - This captures the pattern even if the user proceeds.
- **Partial overlap:** note it, and reference it in the new spec's Related section.

### 2b — Explore existing docs and code for context

Spawn an **Explore subagent** (subagent_type: `Explore`, thoroughness: `medium`) with this prompt:

> "Summarize relevant context for: `<topic>`
>
> **Docs (read relevant sections only — do NOT read full files):**
> 1. docs/context/10-roadmap.md — the row for `<roadmap-id>` and its listed *Context* files
> 2. each docs/context/<NN>-*.md file named in that row's *Context* (e.g. 05 → docs/context/05-seo-and-tracking.md) — search for headings matching `<topic>`, read those sections only
> 3. docs/adr/*.md — status lines + any decision about `<topic>`
> 4. docs/proposals/ — list files, check front matter status, read only `status: current` files related to `<topic>`
> 5. docs/context/11-open-questions.md — Q-IDs that block `<topic>`
> 6. specs/INDEX.md — flag rows whose Title or Roadmap overlaps with `<topic>`
>
> **Lessons (table/index only — do NOT follow file links):**
> 7. lessons/INDEX.md — read the index TABLE ONLY. Flag rows whose Summary or Categories match `<topic>`.
> 8. lessons/ai-mistakes.md — if it exists, read the full file (it is short). Flag pattern numbers relevant to `<topic>`.
>
> **App scan (paths + grep only — do NOT read file contents unless specified):**
> 9. Check if ./43logistics.vn/package.json exists. If yes:
>    - List the actual top-level folders (`ls`), then one level of: app/, modules/, shared/, db/, messages/, scripts/, plus the pre-F-01 template folders components/, lib/, hooks/, types/ if they still exist (paths only). Mark template paths as current and ADR 0005 paths as target
>    - Grep `<topic keywords>` across **/*.ts and **/*.tsx (exclude node_modules, .next) — report matching file paths and line numbers only
>    - Report the installed versions of next, react, tailwindcss, drizzle-orm, @clerk/nextjs, posthog-js from package.json
> 10. AGENTS.md §3 — which 'In the app today' gaps does `<topic>` depend on?
>
> Return: (a) relevant doc sections, (b) flagged lesson rows and mistake patterns, (c) real file paths from the app that match the topic, (d) blocking Q-IDs and stack gaps"

Wait for the result. Use it to:

- pre-fill Affected Areas with real paths from the app scan (root layout, no `src/`);
- infer plausible interview options from the actual code structure;
- carry flagged lessons and mistake patterns into Implementation Hints;
- record blocking Q-IDs in `blocked_by_questions` and stack gaps under Dependencies.

---

## Step 3 — Interview the user (use the AskUserQuestion tool)

Use `AskUserQuestion` for structured multiple-choice questions, and fall back to plain text for open-ended answers.

- Run multiple batches, and read each batch's answers before deciding what to ask next.
- Infer the options from the Step 2 findings.
- Skip questions whose answers are already clear.

---

### FEATURE interview

**Batch 1 — Core intent:**

- "What problem does this solve?" Infer 2–3 options from the roadmap row and `01-business.md` goals (more contacts, ad conversion, trust, bilingual, speed), plus Other.
- "Which repo owns this?" `app (43logistics.vn)` / `context (docs/data)` / `both` / Other.
- "Who/what triggers this?" Infer from: visitor on a public page, visitor from an ads landing page, staff in `/admin`, build/deploy step, scheduled job. Plus Other.
- "What does success look like?" Infer 2–3 outcomes from the roadmap *Accept* text, plus Other.

**Batch 2 — Scope & constraints:**

- "What is explicitly out of scope?" Infer 1–2 likely exclusions, plus "Nothing excluded" and Other.
- "Does this change the data model (`07-data-model.md`) or migrations?" `Yes (schema + migration)` / `No` / `Not sure`.
- "Does this affect URLs, redirects, metadata or tracking events (`05`, `43logistics.vn/data/redirect-map.csv`)?" `Yes` / `No` / `Not sure`.
- "Does this add client JS to public pages (≤ 50 KB gz app JS over the framework baseline, ADR 0006)?" `Yes — island needed` / `No — server only` / `Not sure`.
- "Priority?" `nice-to-have` / `must-have` / `critical`.

**Batch 3 — Edge cases & acceptance:**

- "What must be true for this to be done?" Infer 2–3 Given/When/Then options from the roadmap *Accept* text, plus Other.
- "What should happen if the input is malformed or data is missing?" Infer 2–3 likely failure modes from the architecture, plus Other. Examples:
  - a Zod validation error returns `fieldErrors`;
  - an unverified route (`is_verified = false`) shows "Liên hệ" instead of prices;
  - a missing EN translation means a 404, not a VI fallback;
  - without consent, no tracking request is sent.
- "Any performance or scale concern?" Infer from LCP/JS budget, cache tags and invalidation, ad-traffic spikes, image weight. Plus "None" and Other.
- Don't ask whether blocking Q-IDs may wait: ADR 0004 makes owner questions non-blocking. List the Q-IDs from Step 2 in `blocked_by_questions` and describe the placeholder behaviour (render nothing, "Liên hệ", or a marked placeholder behind a flag).

**Batch 4 — Manual verification plan** (no automated tests in this phase, ADR 0004):

Skip this batch entirely if the feature is a config-only change, a schema-only field addition with no new behaviour, or a pure scaffold with no logic. When in doubt, ask.

- "Which behaviours must a reviewer verify by hand?" Infer 2–3 from the acceptance criteria, plus "None — config/scaffold only" and Other. Examples:
  - the price engine rounds 1.3 kg to 1.5 kg;
  - `/go/zalo` inserts a `contact_events` row and returns a 302;
  - `/tieu-de/` returns 410.
- "Does verification need specific seed data?" Ask only if the behaviour depends on data state (routes, rates, translations, consent). Options: `Yes — I'll describe the seed needed` / `No — the default seed is fine` / `Not sure`.
- Don't ask about test layers: Vitest/Playwright are not used in this phase (ADR 0004).

**Follow-up (plain text, after all batches):**
*"Anything else important — a deadline, campaign launch date, owner constraint, or legal requirement I should include?"*

---

### BUG interview

**Batch 1 — What broke:**

- "What did you expect?" Infer 2–3 expected behaviours from the docs, plus Other.
- "What actually happened?" Infer likely failure modes, plus Other: wrong price shown, redirect chain/404, missing metadata or hreflang, tracking event not fired or fired twice, lead not saved, admin edit not reflected (cache tag), layout broken on mobile.
- "How often?" `Always` / `Sometimes (certain conditions)` / `Only once`.
- "Business impact?" `Low` / `Medium` / `High` / `Critical — loses contacts or leads`.

**Batch 2 — Context:**

- "Which repo?" `app (43logistics.vn)` / `context` / `both` / `Unknown`.
- "Which environment?" `Local` / `Preview` / `Production` / `All`.
- "Which locale/URL?" Infer from the report: VI root, `/en/…`, a landing page, admin.
- "Did this recently start?" `After a recent change` / `Always existed` / `Unknown`.
- "Is there a workaround?" `Yes` / `No` / `Not sure`.

**Batch 3 — Technical details:**

- "Where in the flow does it break?" Infer from the flow `proxy.ts` (410/legacy IDs/attribution/locale), cached query + `cacheTag`, Server Action, client island, `/go/[channel]`, tracking fan-out, `generateMetadata`/JSON-LD. Plus Other.
- "Is it data-specific?" `Yes — specific routes/rates` / `Yes — specific locale/translation` / `No` / `Not sure`.
- "Is there an error in logs, browser console or the response?" `Yes — I'll paste it` / `No visible error` / `Not sure`.

**Batch 4 — Verification** (manual; no regression tests in this phase, ADR 0004):

Skip this batch only if the bug is a pure copy/config fix with no behavioural change.

- "Which scenario must the fix be verified against?" Derive 1–2 options from the reproduction steps, plus "Same as reproduction steps" and Other.
- "Does verification need specific seed data?" Ask only if the bug depends on data state. Options: `Yes — I'll describe` / `No — the default seed is fine` / `Not sure`.
- "What is the manual verification path?" `Reproduction steps above are enough` / `Needs additional manual steps (I'll describe)` / `Cannot verify manually — explain blocker`.

**Follow-up (plain text, after all batches):**
*"Please paste the exact reproduction steps (URL, locale, device width), any error messages, and screenshots described in words."*

---

**Tips:**

- Infer option labels from the Step 2 context: use real file paths, real roadmap IDs, real Q-IDs and real table/field names.
- The tool auto-adds "Other", so users can always type a custom answer.
- If a batch answer opens a new line of questioning (e.g. the user says "Yes — I'll describe it"), ask one targeted follow-up in plain text before moving to the next batch.
- Skip questions whose answers are already clear from the roadmap row, `AGENTS.md` or the ADRs. Don't waste the user's time on obvious things.

---

## Step 4 — Write the spec

---

### FEATURE TEMPLATE

```markdown
---
title: <imperative title ≤10 words>
type: feature
status: draft
owner_repo: app | context | both
roadmap: <ID>
priority: must-have | nice-to-have | critical
blocked_by_questions: [<Q-IDs or empty>]
updated: <today YYYY-MM-DD>
---

## Feature: <title>

### Problem Statement
<!-- Why does this need to exist? What pain does it solve? Link to the roadmap row. -->

### Proposed Solution
<!-- From the visitor/staff perspective — what, not how -->

### Acceptance Criteria
- [ ] Given <context>, when <action>, then <outcome>
- [ ] ...

### Scope
**In scope:**
-

**Out of scope:**
-

### Affected Areas
| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | module infrastructure | modules/routes/infrastructure/queries.ts |
| app | page | app/[locale]/(site)/[slug]/page.tsx |
| context | doc | docs/context/<file>.md |

### Golden-rule checks
<!-- Only those that apply (AGENTS.md §4): facts from DB (1–2), metadata/JSON-LD/H1/CTA (4), server-only DB (6), requireRole (7), JS budget (8), motion (9), a11y (10), VI typography (11), /go tracking (12), redirects (13), consent/PII (14), secrets (15) -->

### Dependencies & Risks
- Depends on: <roadmap IDs / stack gaps from AGENTS.md §3>
- Blocked by questions: <Q-IDs and the placeholder behaviour>
- Risk: ...

### Manual Verification Plan
- Scenario: <Given/When/Then>, with the URL(s) and viewport(s) to check
- Seed needs: <describe or "default seed is fine">
- Steps: <numbered manual steps a reviewer follows; include the axe DevTools scan for UI changes>
- Validation commands: `pnpm -C 43logistics.vn lint` + `typecheck` (before F-01: `type-check`) + `build`; `i18n:check` (from F-03) and `check:redirects` (from F-07, every PR); the consent matrix when consent, tracking, proxy or leads are touched. No automated tests (ADR 0004)

### Implementation Hints
<!-- Optional: patterns from existing code, related specs, lessons learned -->

### Related
<!-- Links to roadmap row, docs/context sections, ADRs, proposals, other specs, lessons -->
```

---

### BUG TEMPLATE

```markdown
---
title: <broken behavior title — not the fix>
type: bug
status: draft
owner_repo: app | context | both
roadmap: <ID>
priority: critical | high | medium | low
blocked_by_questions: [<Q-IDs or empty>]
updated: <today YYYY-MM-DD>
---

## Bug: <title>

### Summary
<!-- One sentence: what is broken and where -->

### Environment
| Key | Value |
|-----|-------|
| Triggered by | <URL + locale / admin action / Server Action / route handler> |
| Environment | Local / Preview / Production |
| Device / width | <360 / 768 / 1280 / browser> |
| Frequency | Always / Sometimes / Once |

### Reproduction Steps
1. Open: "..."
2. Observe: ...

### Expected Behavior
<!-- What should happen (cite the doc/rule) -->

### Actual Behavior
<!-- What happens instead — include error message or wrong output -->

### Root Cause Hypothesis
<!-- Best guess based on proxy, cached query/tag, Server Action, client island, tracking, metadata -->

### Affected Areas
| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|

### Business Impact
`critical` | `high` | `medium` | `low` — who is affected and how (lost contacts/leads = critical)

### Verification Plan
- Scenario to verify: <reproduction case as Given/When/Then>
- Seed needs: <describe or "default seed is fine">
- Manual steps + validation commands (lint, typecheck, build): <steps>

### Fix Approach
<!-- Optional: suggest direction without prescribing exact implementation -->

### Related
```

---

## Step 5 — Quality checklist (self-review before saving)

- [ ] The title is imperative mood and ≤10 words.
- [ ] No ambiguous language: "sometimes", "should probably", "might".
- [ ] Every acceptance criterion is independently verifiable, and every roadmap *Accept* item is covered.
- [ ] `owner_repo` and `roadmap` are explicit and accurate.
- [ ] Affected areas reference plausible real paths from the Step 2 Explore pass (root layout, no `src/`).
- [ ] Scope explicitly states what is NOT included.
- [ ] No invented business facts; unknowns are listed in `blocked_by_questions`.
- [ ] The manual verification plan is concrete enough for a reviewer and Codex to follow (URLs, steps, expected result).

---

## Step 6 — Save the spec

1. Ensure the `specs/` directory exists: `mkdir -p specs`.
2. Write to `specs/<type>-<slug>.md`.
3. Do NOT echo the full doc in chat. Confirm the path and offer a one-line summary only.

---

## Step 7 — Update specs/INDEX.md

Read `specs/INDEX.md` (create it if missing):

```markdown
# Specs index

Implementation commitments for the 43logistics.vn app. Created by `/feature-bug`. Status transitions via `/mark-implemented`.

| Date | Type | File | Title | Roadmap | Owner | Status |
|------|------|------|-------|---------|-------|--------|
```

Insert the new row at the top (newest first):

```
| <today> | <type> | [<filename>](<filename>) | <title> | <roadmap> | <owner_repo> | draft |
```

Use the Edit tool; don't rewrite the whole file. Don't mention this step to the user unless it fails.

---

## Step 8 — Create PR for the spec

**All PR content must be written in English: title, summary and acceptance criteria.**

Check what git setup exists:

```bash
git rev-parse --is-inside-work-tree 2>/dev/null && echo repo=yes || echo repo=no
git remote get-url origin 2>/dev/null && echo remote=yes || echo remote=no
```

- **repo=no:** skip all git steps. Note "Spec PR skipped — context workspace is not a git repo (ADR 0003)".
- **repo=yes:** create a branch and commit locally:

  ```bash
  git checkout -b spec/<slug>
  git add specs/<type>-<slug>.md specs/INDEX.md
  git add specs/LESSONS.md            # only if Step 2a appended to it
  git commit -m "spec(<slug>): <title>"
  ```

- **remote=yes (in addition):** push and open a PR in this repo:

  ```bash
  git push -u origin spec/<slug>
  gh pr create --base main --head spec/<slug> \
    --title "spec: <title>" \
    --body "$(cat <<'EOF'
  ## Spec: <title>

  **Type:** <feature|bug>
  **Roadmap:** <ID>
  **Owner repo:** <owner_repo>
  **Priority:** <priority>

  ### Summary
  <one-line summary in English from Problem Statement>

  ### Acceptance criteria
  <paste acceptance criteria list>

  🤖 Created by /feature-bug
  EOF
  )"
  ```

  Capture the PR URL from the `gh pr create` output.

If there is no remote, or the push or `gh pr create` fails, keep the local commit and note "PR creation skipped — <reason>" for the Step 9 message.

---

## Step 9 — Send notification

**All notification content must be written in English: title, summary and metadata.**

Kept at the sample's position (ADR 0003 §6). Send via `scripts/notify-telegram.sh`, only if that script exists in this workspace and `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` are set:

```bash
test -x scripts/notify-telegram.sh && scripts/notify-telegram.sh "New spec ready for review 📋

*<title>*
Type: <feature|bug> | Roadmap: <ID> | Repo: <owner_repo> | Priority: <priority>

<one-line summary in English>

PR: <PR URL from Step 8, or \"pending\" if skipped>

Spec: specs/<type>-<slug>.md"
```

If the script is missing or fails (missing env vars, network error), print the PR URL (or the spec path) to the user so they can share it manually, and say "Notification skipped — <reason>".

---

## Step 10 — Offer to implement (Codex if available, Claude otherwise)

Use the `AskUserQuestion` tool:

- question: "Approve this spec and implement it now?"
- options:
  - `Yes — Claude implements now (/implement)`
  - `Yes — send to Codex for implementation` (only if `command -v codex` succeeded)
  - `No — I'll implement later`

Record the answer. **Don't hand off yet**: Step 11 (Codex review) runs first, and the chosen hand-off executes at the end of Step 11.

If **No**: after Step 11, report "Run `/implement <slug>` when ready."

If **Yes** (executed at the end of Step 11):

1. **Set `status: approved`** in the spec file first (Edit tool). This records the user's approval before handoff.
2. **Update `specs/INDEX.md`**: set the status column to `approved`. If a spec PR exists, commit and push both files to `spec/<slug>`.
3. **Hand off:**
   - **Claude:** run `/implement <slug>`.
   - **Codex:** run in the background from the workspace root:

     ```bash
     codex exec -s workspace-write -C "$PWD" \
       "Codex: read AGENTS.md and follow .claude/skills/implement/SKILL.md for this spec. Paths are relative to this workspace root.

     Spec path: specs/<filename>
     Roadmap: <ID>
     Owner repo: <owner_repo>
     Key acceptance criteria:
     <paste acceptance criteria>

     When done, print the Step 5 report as your final message." </dev/null
     ```

     - If the run **exits 0**, read Codex's final report. Claim success only if it shows the ACs covered and the checks passing; otherwise relay the blockers it reported.
     - If it **fails** (non-zero exit), tell the user "Codex run failed — run `/implement <slug>` to implement directly." Don't retry.

---

## Step 11 — Codex review, verify & debate

This is the final step. It runs before the hand-off chosen in Step 10 executes, so that implementation starts from a spec both agents have checked.

**11a — Availability:** `command -v codex`. If it's missing, report "Codex review skipped: codex CLI not found" and execute the Step 10 choice.

**11b — Round 1, Codex reviews** (read-only; run it in the background and wait for the notification):

```bash
codex exec -s read-only --skip-git-repo-check -C "$PWD" \
  -o /tmp/43l-codex-feature-bug-<slug>-r1.md \
  "Review specs/<type>-<slug>.md as a skeptical senior engineer. Check against AGENTS.md (§3 stack gaps, §4 golden rules), docs/adr/*, docs/context/10-roadmap.md row <ID>, and the docs/context files that row lists. Verify: (1) every roadmap Accept item is covered by an independently testable acceptance criterion; (2) affected paths exist or are clearly planned (root layout, no src/); (3) no invented business facts — unknowns carry Q-IDs; (4) dependencies on unclosed stack gaps are stated; (5) the Manual Verification Plan is concrete (steps, URLs, expected results); (6) scope/out-of-scope is unambiguous. Do NOT read .env or wordpress-site/. Do NOT edit files. Return numbered findings: severity (high/medium/low), location, issue, proposed fix." </dev/null
```

**Run check:** if codex exits non-zero, or the `-o` file is missing or older than this run, report "Codex review failed — <stderr tail>" and ask the user whether to retry or continue without it. Apply the same check after round 2.

**11c — Claude verifies:** check each finding against the files. Write `/tmp/43l-codex-feature-bug-<slug>-verdicts.md`, with one line per finding: `#N accept | partial | reject — <evidence>`.

**11d — Round 2, debate** (only if any verdict is `partial` or `reject`):

```bash
codex exec -s read-only --skip-git-repo-check -C "$PWD" \
  -o /tmp/43l-codex-feature-bug-<slug>-r2.md \
  "Round 2. Your findings: /tmp/43l-codex-feature-bug-<slug>-r1.md. Claude's verdicts: /tmp/43l-codex-feature-bug-<slug>-verdicts.md. For each partial/reject item: concede, or rebut with file:line evidence in ≤3 sentences. Do NOT edit files." </dev/null
```

Stop after 2 rounds. Items still disputed go to the user.

**11e — Resolve with the user.** Show this table:

```
| # | Codex finding | Claude verdict | After debate | Proposed edit |
```

Ask (AskUserQuestion): "Apply which?" with options `All agreed items` / `Agreed + disputed` / `Specific numbers` / `None`. Apply the chosen edits to the spec with Edit. If a spec PR exists, commit and push them to `spec/<slug>`.

---

**11f — Execute the Step 10 choice.** If the user approved, set `status: approved` and hand off as described in Step 10. If Step 11e changed the spec, ask again before the hand-off.
