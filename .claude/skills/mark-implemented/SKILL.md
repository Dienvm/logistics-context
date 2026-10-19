---
name: mark-implemented
description: Mark a spec as implemented after verifying evidence (merged app PR, passing checks), tick its roadmap task, and update AGENTS.md stack/command rows the work closed. The only skill that sets status implemented.
argument-hint: "<spec-slug> <pr-link>"
---

# Mark Implemented

**This is the only skill that sets `status: implemented`** or ticks a roadmap checkbox in `docs/context/10-roadmap.md`. Other skills may recommend running it, but never run it themselves.

**Context budget:** the target spec, the PR link, the spec's row in `10-roadmap.md`, and `AGENTS.md` §3 and §7.

---

## Step 1 — Resolve

Extract the slug and the PR link from `$ARGUMENTS`. If the link is missing, ask for it. Read the spec's front matter:

- `status` must be `approved` or `in_implementation`;
- if it is already `implemented`, say so and stop.

If the context workspace is a git repo, also check that the spec is committed (`git ls-files --error-unmatch specs/<file>`). If it isn't, warn: "The spec isn't committed. Commit or merge the spec PR first, or proceed anyway?"

## Step 2 — Evidence (require an explicit answer for each)

```
1. PR: <link> — merged?            gh pr view <link> --json state,mergedAt,baseRefName
2. Checks: lint · typecheck · unit · e2e — passing on the merged commit?   gh pr checks <link>
   (or an explicit waiver: "not applicable because …")
3. Public pages changed? → Lighthouse mobile ≥ 90/100/95 and SEO checks (H1, canonical, hreflang, JSON-LD) — evidence or N/A
4. Deployed to preview/production? yes / not yet / N/A
5. Changelog entry in docs/CHANGELOG.md? yes / deferred / N/A
```

The PR **must be merged** into `main`; stop otherwise and tell the user to re-run after the merge. Record the merge commit (`gh pr view <link> --json mergeCommit`) and confirm the checks passed on it.

## Step 3 — Spec front matter

```yaml
status: implemented
implementation_pr: <link>
implementation_commit: <merge sha>
implemented_date: <today YYYY-MM-DD>
```

## Step 4 — Roadmap and AGENTS.md

- In `docs/context/10-roadmap.md`, change the task's `- [ ]` to `- [x]` and append ` — spec: specs/<file>`.
- If the work closed a stack gap or added a script:
  - update the matching "In the app today" cell in `AGENTS.md` §3 (and the "Closed by" cell, e.g. `done (F-01)`);
  - update the matching "Status" cell in §7.

  Verify against `43logistics.vn/package.json` first; never trust memory.

## Step 5 — Indexes

- Set the spec's status column in `specs/INDEX.md` to `implemented`.
- If a changelog entry was chosen, add it to `docs/CHANGELOG.md` (create the file with a `# Changelog` header if needed):

  ```markdown
  ## <today> — <spec title>
  - Spec: specs/<file> · Roadmap: <ID> · PR: <link>
  - Summary: <one line>
  ```

## Step 6 — Commit (only if the context workspace is a git repo)

This is a metadata-only change, so no PR is needed. First confirm you will push only this commit:

- `git fetch origin`, then check that `git rev-parse HEAD` equals `git rev-parse origin/main` (no unpushed local commits);
- check that `git status --short` lists only the files this skill changed.

If either check fails, stop and report; don't push.

```bash
git add specs/<file> specs/INDEX.md docs/context/10-roadmap.md AGENTS.md docs/CHANGELOG.md   # only files you changed
git commit -m "spec(<slug>): mark implemented (<app PR ref>)"
git push origin HEAD:main
```

Stage only these files; never use `git add -A`. If the push is rejected (branch protection), open a branch and PR instead. If the workspace isn't a git repo, say "Commit skipped: context workspace is not a git repo (ADR 0003)".

## Step 7 — Report

```
## Spec Marked Implemented
- Spec: specs/<file> → implemented
- PR: <link> (merged, <sha>)
- Roadmap: <ID> ticked
- AGENTS.md: <rows updated | no change>
- Changelog: <added | deferred | N/A>
- Commit: <sha | skipped — reason>
```
