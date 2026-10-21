# ADR 0003 — Context workspace + app repo, with a spec/lesson workflow

- Status: Accepted (2026-10-20) · Amended by ADR 0004 (2026-10-21): code-only delivery (no test-first / regression tests), open questions don't block tasks · Amended 2026-10-21: Codex debate only in `/feature-bug`, `/implement`, `/proposal`, `/code-review` (Decision 6)
- Context: The project is split into a context workspace (this folder: AGENTS.md, `docs/`, `data/`, agent skills) and the app repo `43logistics.vn/` (`github.com/Dienvm/43logistics.vn`, declared as a submodule in `.gitmodules`). The agent skills in `.claude/skills` were copied from another project's context repo (Unicity "Foresent robot"). They referenced files, repos and scripts that don't exist here: `docs/v0.2/BLUEPRINT.md`, `foresent-rules`/`foresent-robot`, `yarn`, a Telegram notifier, a submodule preflight script and a tmux Claude↔Codex bridge. Agents following them would stall or invent paths.

## Decisions

1. **Two repos, clear ownership.** `owner_repo` in specs/proposals is one of:
   - `context`: docs, data and skills in this workspace.
   - `app`: runtime code in `43logistics.vn/`.
   - `both`.

   Runtime code never lives in the context workspace, and the context pack never lives in the app repo. Runtime data files are the one exception, and they move into the app per ADR 0002 §11.
2. **Artifact types (never mixed):**

   | Path | What it holds | Status lifecycle |
   | --- | --- | --- |
   | `docs/context/*` | Canonical knowledge (always current, no lifecycle; edited in place) | — |
   | `docs/adr/NNNN-*.md` | Decisions | Accepted → Superseded |
   | `docs/proposals/*.md` | Options being explored, with front matter | `status: draft → current → superseded \| archived` |
   | `specs/*.md` | Implementation commitments, each tied to a roadmap ID in `docs/context/10-roadmap.md` | `draft → approved → in_implementation → implemented` |
   | `lessons/*.md` | Learnings with a concrete follow-up | `open → resolved` |
3. **Canonical references used by skills.** The roles of Foresent's BLUEPRINT/UPDATE-PLAN/INDEX are mapped to this project's files:
   - **Architecture ground truth** is `AGENTS.md` + `docs/adr/*` + `docs/context/06-architecture.md`.
   - **Plan** is `docs/context/10-roadmap.md`.
   - **Doc index** is `docs/context/00-index.md`.
   - **Spec and lesson indexes** are `specs/INDEX.md` and `lessons/INDEX.md`.
4. **Only `/mark-implemented` sets `status: implemented`** and ticks the roadmap checkbox. It requires a merged PR in the spec's owning repo: the app repo for `app`/`both`, and the context repo for `context`.
5. **The Codex second opinion uses the `codex` CLI** (`codex exec -s read-only …`), not a tmux bridge. Codex reads the same skills through the `.agents/skills → .claude/skills` symlink and the same rules through `AGENTS.md`.
6. **Skills follow the sample structure in `refer-docs/skills/`** (same steps, numbering, templates and report formats, with project substitutions), amended 2026-10-20 at the owner's request:
   - The notification step stays at its sample position, but runs only if `scripts/notify-telegram.sh` exists. Otherwise the agent reports the PR or spec link.
   - `/feature-bug`, `/implement`, `/proposal` and `/code-review` end with a **Codex review → Claude verify → Codex debate** step (at most 2 rounds), with disputed items decided by the user. Amended 2026-10-21 at the owner's request: the other skills (`/adr`, `/doc-review`, `/supersede`, `/context-audit`, `/fix-implement`, `/lesson`, `/mark-implemented`) and plain prompts no longer run Codex, because the loop took too long for low-risk metadata and review steps.
7. **AGENTS.md is canonical; CLAUDE.md imports it** (`@AGENTS.md`). This is the reverse of the source project, because Codex, Cursor and Copilot read AGENTS.md natively.

## Alternatives considered

- **Keep the copied skills and "interpret" them:** every run would need the agent to translate Foresent terms, so results would drift between Claude and Codex. Rejected.
- **Single repo (move docs into the app):** simpler to clone, but the WordPress analysis, legacy copy and decision history would ship with the app, and context churn would pollute app PRs. Rejected for now. It can be revisited by a new ADR.

## Consequences

- The workspace was not a git repository, and `.gitmodules` pointed at the misspelled path `43logistic.vn`. A `.gitmodules` file alone does not create a submodule. It was registered on 2026-10-20 (commit `e80f9b0`) with:

  ```bash
  git init
  git submodule add https://github.com/Dienvm/43logistics.vn.git 43logistics.vn
  git add .gitignore .gitmodules AGENTS.md CLAUDE.md docs data specs lessons .claude .agents
  git commit -m "chore: initialise context workspace"
  ```

  `git submodule add` reuses the existing clone. Run `git status` before committing to confirm `wordpress-site/` and any `.env` are ignored. The remote `origin` (`github.com/Dienvm/logistics-context`) was added afterwards; skills still skip push and PR steps when no remote exists.
- Commit linkage between the repos:
  - each app PR body names its spec path;
  - each spec records `implementation_pr`;
  - the submodule pointer is bumped in its own context commit after an app merge.
- An agent that opens only `43logistics.vn/` (Cursor, Codex) finds `43logistics.vn/AGENTS.md`. That file is a short entry point that summarises the non-negotiable rules and points here. It is not a second copy of this pack.
- Revisit: if the owner works solo and the sync overhead outweighs the separation, a single repo (with `wordpress-site/` excluded) is the fallback. Changing to it needs a new ADR.
- `wordpress-site/` (DB dump with password hashes and leads, plus a 1.4 GB backup) sits inside the workspace. It is excluded by `.gitignore` and must never be committed.
- Skills must be kept in sync with this ADR. `/context-audit` checks for references to files or scripts that don't exist.
