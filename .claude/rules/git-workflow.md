# Git workflow

Applies to both repos. Source: `AGENTS.md` §6 "Git"; this file adds the operational details.

## Accounts

- Use **only the GitHub account `Dienvm`** for this project (owner instruction, 2026-10-21). Never `dienfpt`.
- `git push` already uses Dienvm's token (credential helper). For `gh`, pass `-R Dienvm/<repo>` explicitly.
- If a scope is missing (e.g. `workflow`), ask the user to run `! gh auth refresh -h github.com -s <scope>` with Dienvm active. Don't fall back to another account.

## Branches

| Repo | Branch | Base |
| --- | --- | --- |
| App `43logistics.vn` | `feat/<roadmap-id>-<slug>`, `fix/<slug>`, `chore/<slug>` | `main` (never push to `main`) |
| Context `logistics-context` | `spec/<slug>`, `impl/<slug>`, `docs/<slug>` | `main` (only `/mark-implemented` pushes to `main`) |

Start every new branch from a freshly fetched `origin/main`, not from another feature branch. A commit pushed to a branch whose PR already merged never reaches `main`; open a new branch and PR for it.

## Commits

- **Stage explicit paths.** Never `git add .`, `-A` or `-u`: they pick up `.env*`, the WordPress dump and scratch files.
- Check `git diff --cached --name-only` before every commit; no `.env*` (except `.env.example`) and nothing from `wordpress-site/`.
- Conventional Commits: `feat(pricing): …`, `fix(leads): …`, `chore(security): …`, `docs: …`, `spec(<slug>): …`. Scope = module name.
- Small commits, one logical change each. Explain the **why** in the body when it isn't obvious.
- Never `--no-verify` on a real commit. The pre-commit hook (Biome `--staged`, partial-staging guard, gitleaks) must pass. The only exception is a throwaway gitleaks canary branch that is deleted right after.
- End commit messages with the attribution line from the session's system reminder.

## Pull requests

- Open with `gh pr create -R Dienvm/<repo> --base main`. Title = Conventional Commit; body in English, with the spec path, AC checklist, verification evidence, "Outstanding owner questions" and conformance notes (`/implement` Step 7).
- Merge order across repos: app PR → context spec PR → context impl PR.
- Submodule pointer bumps go in their own commit in the context repo, pointing at a commit that exists on the app's `main`.

## Never

- Rewrite pushed history or force-push `main`.
- Commit secrets or customer data. If one slips in: stop, tell the user, rotate the secret, then clean up.
