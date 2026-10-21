---
name: mark-implemented
description: Mark a spec as implemented after verifying evidence. Requires a merged app PR link, passing checks, and a changelog decision; ticks the roadmap task and updates AGENTS.md rows the work closed; Codex independently verifies the evidence and debates before anything is pushed. The only skill that updates spec status to implemented.
argument-hint: "<spec-slug> <pr-link>"
---

# Mark Implemented

> **Before Step 1:** follow AGENTS.md §6 "Running skills". Resolve and `cd` to the context root, do the state recovery, substitute and quote every `<placeholder>`, and run long commands in the background in Claude Code (synchronously in Codex).

**This is the ONLY skill that sets `status: implemented`** on a spec, or ticks a roadmap checkbox in `docs/context/10-roadmap.md`.

Other skills (implement, code-review) may recommend running it. They never run it themselves.

**Context budget:**

- the target spec's front matter and the PR link the user provides
- the spec's row in `10-roadmap.md`
- `AGENTS.md` §3 and §7

**Output contract:** updated spec front matter + roadmap tick + index + optional changelog entry + Codex verification record + a commit (pushed only after Step 7 passes).

**Project mapping (sample → this repo):** "master" → `main` · release/publish (S3/current.json) → deploy to preview/production (Vercel, Q-15) · cross-repo digest → `docs/CHANGELOG.md` · ADR-001 submodule rule → bump the `43logistics.vn` submodule pointer in its own commit, never in this one.

---

## Step 1 — Resolve spec

From `$ARGUMENTS`, extract the spec slug and the PR link. If the PR link is missing, ask for it.

**Resolve exactly one spec file:** try `specs/<slug>`, then `specs/<slug>.md`, then `specs/*-<slug>.md`.

- **None found:** stop.
- **Several found:** list them and ask.

Set `FILE` to the resolved path.

**Check the context workspace before any edit:**

```bash
git branch --show-current          # must be main — if not, stop and ask (e.g. /implement left you on impl/<slug>)
git status --short                 # record pre-existing changes; never stage or discard them
git show "main:$FILE" > /dev/null 2>&1 || echo "not on main"
```

If the spec isn't on `main`, stop and tell the user:

> "Spec `<FILE>` is not on main in this repo. Merge the spec/impl branch first, then re-run `/mark-implemented`."

Read the spec's front matter. Its status must be `in_implementation` or `approved` to proceed.
If it is already `status: implemented`, tell the user and stop.

---

## Step 2 — Evidence checklist

Present this checklist, and require an explicit answer for each item:

```
Before marking this spec implemented, confirm:

1. Implementation PR link: <from $ARGUMENTS or ask>
   - Merged into main of the OWNING repo?   gh pr view <link> --json url,state,mergedAt,baseRefName,mergeCommit,body
     · owner_repo app|both → the PR must belong to Dienvm/43logistics.vn
     · owner_repo context  → the PR must belong to Dienvm/logistics-context
   - Does the PR implement THIS spec? (its body names specs/<file>, or the diff matches the ACs)

2. Target repo: <from spec owner_repo>
   - Checks on the MERGE COMMIT, not just the PR head:
       gh api repos/<owner>/<repo>/commits/<mergeCommit.oid>/check-runs --jq '.check_runs[] | "\(.name): \(.conclusion)"'
       gh api repos/<owner>/<repo>/commits/<mergeCommit.oid>/status --jq '.state'
     Pending or missing → not passing. PR-head-only evidence is reported as such.
   - OR explicit waiver: "checks not applicable because ___"

3. Public pages changed?
   - Lighthouse mobile ≥ 90 / 100 / ≥ 95 and SEO checks (H1, canonical, hreflang, JSON-LD): evidence | N/A

4. Release / deploy (if applicable):
   - Deployed to preview/production? (yes / no / not yet / N/A)

5. Changelog / digest:
   - Add entry to docs/CHANGELOG.md? (yes / deferred / N/A)
```

The PR **must be merged** into `main`. If it isn't, stop and tell the user to re-run after the merge. Record the merge commit SHA.

---

## Step 3 — Update spec front matter

Edit the spec file:

```yaml
status: implemented
implementation_pr: <pr-link>
implementation_commit: <merge sha>
implemented_date: <today YYYY-MM-DD>
```

Remove `in_implementation` if it's present.

---

## Step 4 — Optional: add changelog digest entry

If the user said "yes" to item 5 in Step 2:

Read `docs/CHANGELOG.md`. If it's absent, create it with a `# Changelog` header and a note that it's a cross-repo digest.

Add an entry:

```markdown
## <today YYYY-MM-DD> — <spec title>

- Spec: [specs/<file>](../specs/<file>) · Roadmap: <ID>
- Implementation PR: <link> (<merge sha>)
- Owner: <owner_repo>
- Summary: <one line from spec Problem section>
```

---

## Step 5 — Update INDEX.md, roadmap and AGENTS.md

- In `specs/INDEX.md`, find the spec's row and update its status column to `implemented`.
- **Roadmap:** in `docs/context/10-roadmap.md`, tick the task only if **all** of its *Accept* items are evidenced. That may take this spec plus earlier implemented specs; a single bug-fix spec rarely closes a task. If it's already `[x]`, leave it and don't duplicate the annotation. When ticking, change `- [ ]` to `- [x]` and append ` — spec: specs/<file>`. If the task isn't complete, add ` — partial: specs/<file>` without ticking.
- **Stack gaps:** if the work closed a stack gap or added a script, verify against the files **at the merge commit**, never the local checkout (which may be an old submodule revision) and never memory. For example: `gh api repos/Dienvm/43logistics.vn/contents/package.json?ref=<sha> --jq .content | base64 -d`, or `git -C 43logistics.vn show <sha>:package.json` after a fetch. Use the same method for `next.config.ts`, `proxy.ts` and so on. Then update:
  - the matching "In the app today" cell and the "Closed by" cell (e.g. `done (F-01)`) in `AGENTS.md` §3;
  - the matching "Status" cell in §7.

---

## Step 5b — Commit to main (NO PR) — local first

This is a trivial metadata flip, so don't open a PR for it.

Stage only what this invocation changed:

- Stage each path that exists and that you edited. `docs/CHANGELOG.md` is included only if Step 4 created or edited it.
- If a file already had edits before this run (from the Step 1 `git status`), stage only your hunks (`git add -p`), or stop and ask.

```bash
git add -- "$FILE" specs/INDEX.md docs/context/10-roadmap.md      # + AGENTS.md / docs/CHANGELOG.md only if edited
git diff --cached --stat                                       # must list only these files; stop on any staging error
git commit -m "spec(<slug>): mark implemented (<owner repo> PR <ref>)"
MI_COMMIT=$(git rev-parse HEAD)                                # record that THIS run created this commit
```

**Don't push yet:** the push happens at the end of Step 7, after Codex has verified the evidence.

Stage only the touched doc files. Never use `git add -A`, and never include a submodule pointer bump (that goes in a separate commit). If the workspace isn't a git repo, say "Commit skipped: context workspace is not a git repo (ADR 0003)".

---

## Step 6 — Report

```
## Spec Marked Implemented

- Spec: specs/<file>
- Status: implemented
- Implementation PR: <link> (merged, <sha>)
- Roadmap: <ID> ticked
- AGENTS.md: <rows updated | no change>
- Changelog: <added | deferred | N/A>
- INDEX.md: updated
- Commit: <sha (local, push pending Step 7) | skipped — reason>
```

---

## Step 7 — Codex review, verify & debate

Codex independently re-checks the evidence before the change is pushed.

**7a — Availability:** run `command -v codex`. If it's missing, report "Codex review skipped: codex CLI not found", ask the user whether to push anyway, and go to 7f.

**7b — Round 1, Codex verifies** (read-only; run it in the background and wait for the notification):

```bash
codex exec -s read-only --skip-git-repo-check -C "$PWD" \
  -o /tmp/43l-codex-mark-implemented-<slug>-r1.md \
  "Independently verify that specs/<file> may be marked implemented. Run: gh pr view <link> --json state,mergedAt,baseRefName,mergeCommit and gh pr checks <link>. Check: (1) PR merged into main and the recorded SHA matches; (2) checks passed (or the waiver is justified); (3) every acceptance criterion in the spec is evidenced by the merged diff, the required checks and the recorded manual verification results (no test suites, ADR 0004) — list any that are not; (4) roadmap row, specs/INDEX.md, AGENTS.md §3/§7 edits (git show HEAD) are correct and match 43logistics.vn/package.json; (5) the commit touches only these metadata files. Never print .env* contents. Do NOT edit files. Return numbered findings: severity, file:line, issue, fix." </dev/null
```

**Run check:** if codex exits non-zero, or the `-o` file is missing or older than this run, report "Codex review failed — <stderr tail>" and ask whether to retry, or to push without it. Apply the same check after round 2.

**7c — Claude verifies:** check each finding. Write `/tmp/43l-codex-mark-implemented-<slug>-verdicts.md`, with one line per finding: `#N accept | partial | reject — <evidence>`.

**7d — Round 2, debate** (only if any verdict is `partial` or `reject`):

```bash
codex exec -s read-only --skip-git-repo-check -C "$PWD" \
  -o /tmp/43l-codex-mark-implemented-<slug>-r2.md \
  "Round 2. Your findings: /tmp/43l-codex-mark-implemented-<slug>-r1.md. Claude's verdicts: /tmp/43l-codex-mark-implemented-<slug>-verdicts.md. For each partial/reject item: concede, or rebut with evidence in ≤3 sentences. Do NOT edit files." </dev/null
```

Stop after 2 rounds. Items still disputed go to the user.

**7e — Resolve with the user.** Show this table:

```
| # | Codex finding | Claude verdict | After debate | Action |
```

Ask the user (AskUserQuestion) which items to act on. Nothing is corrected, rolled back or pushed without that answer.

- **User accepts that an AC isn't met, or that the PR isn't merged:**
  1. Only if this run created the commit (`MI_COMMIT` is set and `git rev-parse HEAD` equals it), run `git revert --no-edit "$MI_COMMIT"`. This is safe and keeps the history and your pre-existing edits intact.
  2. If no commit was made, undo only this run's edits to the files it touched; leave the user's earlier hunks alone.
  3. Stop and recommend `/fix-implement <slug>`.
- **User accepts metadata corrections:** amend `MI_COMMIT` (`git commit --amend`; it hasn't been pushed).
- **Any blocking item still unresolved or disputed:** don't push.

**7f — Push.** Do this only if the context workspace has a remote (`git remote get-url origin`):

1. Run `git fetch origin`. Confirm that `git rev-parse HEAD~1` equals `git rev-parse origin/main`, so this is the only unpushed commit. If it isn't, stop and list `git log --oneline origin/main..HEAD`. Earlier commits (for example a submodule-pointer bump) must be pushed first, through their own PR or with the user's OK. Then re-run 7f.
2. Run `git push origin HEAD:main`.
3. If the push is rejected (branch protection), push a branch and open a PR instead.

If there's no remote, report "Push skipped: no remote (ADR 0003)".

Final line:

```
Codex debate: N items | agreed N | conceded by Codex N | disputed → user N · Push: <done | skipped — reason>
```
