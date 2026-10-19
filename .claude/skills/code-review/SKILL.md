---
name: code-review
description: Review 43logistics.vn app code against its spec and the AGENTS.md golden rules — spec drift, correctness, single source of truth for facts/prices, security, performance budget, a11y, i18n, SEO. Can recommend (never execute) the implemented transition.
argument-hint: "<spec-slug | file-path | staged>"
---

# Code Review

**Context budget:** the target spec, `AGENTS.md` §3–4 and §8–9, the affected source files, and only the `docs/context/*` sections the code implements (for example, the JSON-LD rules in `05` for a route page).

**Output:** `/tmp/43l-review-findings.md`.

**Never:**

- change spec status;
- edit app files before the user picks which findings to fix (Step 7).

---

## Step 1 — Resolve the target

| `$ARGUMENTS` | Review |
| --- | --- |
| A spec slug | Read `specs/<slug>.md`, take its affected areas, and review the branch diff: `git -C 43logistics.vn diff main...HEAD --stat` |
| A file path | That file only |
| `staged` | `git -C 43logistics.vn diff --cached --name-only` |
| Nothing | The uncommitted changes in `43logistics.vn/` |

List the resolved files with their layer (page/layout, block component, ui primitive, server query, server action, route handler, proxy, db schema, script, test) and line count before you continue.

## Step 2 — Ground truth

- Extract the spec's acceptance criteria and its out-of-scope list.
- Read `AGENTS.md` §4 (golden rules) and the stack table in §3. Code must not use an API that isn't installed.

## Step 3 — Read the files

Read them in full. For files over 300 lines, read them in parts.

## Step 4 — Review (9 categories)

**A — Spec drift.** Mark each AC as `meets` / `partial` / `deviates` / `missing`. Flag any behaviour outside the spec's scope.

**B — Correctness**

- async/await, null safety, edge cases.
- Price engine: chargeable weight, rounding, band edges, open-ended bands.
- Locale handling: `setRequestLocale`, locale passed into cached functions.
- Next 16: async `params`, `updateTag` used only in actions.

**C — Single source of truth**

- Business facts, prices and contacts are hard-coded instead of read from DB/settings: 🔴 (rules 1–2).
- A fact is published from a value that isn't **Confirmed** in `01-business.md` or `is_verified` in the DB (matching the legacy text is not enough): 🔴.
- Event names or Zod schemas are duplicated.
- The same constant appears in 2 or more places.
- Dead code or unused imports.

**D — Reuse and boundaries**

- Data fetching lives in `server/queries`, not in components.
- `components/ui` contains no fetching.
- Suggest extraction only when there are 2 or more use sites.

**E — Type safety:** no `any`; no duplicated types; Zod-inferred types where a schema exists.

**F — Conventions**

- Root layout paths, kebab-case files, Server Actions named `…Action` returning `ActionState<T>`.
- Strings live in `messages/{vi,en}.json` with key parity.
- No `<ai_context>` headers in new files.
- Biome-clean.

**G — Security and privacy**

- Every admin action or handler calls `requireRole`.
- `@/db` and the service-role key never reach client code.
- Zod validates all input; no raw SQL concatenation.
- No secrets or PII in logs; IPs are hashed.
- Consent gates PostHog, the GTM ad tags and server-side conversions.
- No `.env*` in the diff.

**H — Performance**

- New client JS on public pages (check `"use client"` boundaries and imports of `motion`, Clerk or TanStack Query).
- `next/image` with `sizes`; the LCP element is not animated.
- Sequential awaits that could be `Promise.all`.
- Cache tags are correct, and every write invalidates them.

**I — SEO, a11y, i18n**

- One H1, `generateMetadata` with canonical + alternates, valid JSON-LD, breadcrumbs, a Zalo CTA via `/go`.
- Labelled inputs, visible focus, 44 px targets, token colours, no uppercase menus.
- EN pages exist only for published translations (no VI fallback).

## Step 5 — Findings → `/tmp/43l-review-findings.md`

```markdown
## Code Review: <target>

### Files reviewed
- <path> (<layer>, N lines)

### Spec drift
| Criterion | Status | Notes |

### Findings
| # | Severity | Category | Location (file:line) | Issue | Suggestion |

### Summary
<2–4 sentences: main themes, safe to merge?>

### Implemented transition recommendation
<!-- only if every AC is met and there are no 🔴 findings -->
Eligible for /mark-implemented once: [ ] PR merged · [ ] lint/typecheck/test green in CI · [ ] Lighthouse/SEO checks for changed public pages · [ ] AGENTS.md §3/§7 rows updated if a gap closed
```

Severity:

- 🔴 A bug, a spec deviation, a security/privacy issue, an invented or hard-coded fact, or a budget breach.
- 🟡 Maintainability, a convention problem, or missing reuse.
- 🟢 Style or naming.

Then print one line:

```
Review complete → /tmp/43l-review-findings.md | 🔴 N | 🟡 N | 🟢 N | Spec drift: N
```

## Step 6 — Lesson draft (on significant findings)

Write a draft if any of these is true:

- an AC is unmet;
- 3 or more 🔴 findings share a category;
- the work needed scope outside the spec.

Write `/tmp/43l-lesson-draft-<slug>.md` (what happened, the suspected cause, the follow-up options), then say "⚠️ Lesson draft saved — run /lesson <slug> or discard."

## Step 7 — Choose fixes (AskUserQuestion)

- "Does the table match what you observed?" Offer `Yes` / `Missed something` / 2–3 specific rows.
- "Fix which?" Offer `🔴 only` / `All` / `Specific numbers` / `None`.

If the user reports a missed issue, add it to the findings file first.

## Step 8 — Apply

- **Claude fixes:** make minimal edits, then re-run `pnpm -C 43logistics.vn lint && pnpm -C 43logistics.vn typecheck && pnpm -C 43logistics.vn test`.
- **Codex fixes** (offer only if `command -v codex` succeeds):

  ```bash
  codex exec -s workspace-write -C 43logistics.vn --add-dir /tmp \
   "Read /tmp/43l-review-findings.md and ../AGENTS.md. Fix findings <list>. Minimal edits, then run pnpm lint, typecheck and test, and report a fix table."
  ```

  Run it in the background. If it fails, fall back to Claude.

If the recommendation section is present, tell the user to run `/mark-implemented <slug> <PR>` after merge.
