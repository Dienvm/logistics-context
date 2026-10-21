# CLAUDE.md

@AGENTS.md

## Claude Code specifics

- `AGENTS.md` (imported above) is canonical and shared with Codex, Cursor and Copilot. Put project rules there, not here. This file only adds Claude Code behaviour.
- Load `docs/context/*` files on demand via the context map (AGENTS.md §5). Don't preload the whole pack.
- Coding rules live in `.claude/rules/*.md`. Claude Code loads `git-workflow.md` always, and the others when it reads or edits a matching app file (`paths:` frontmatter). They refine `AGENTS.md`, never override it.
- Skills live in `.claude/skills/<name>/SKILL.md`. Codex reads the same files through the `.agents/skills` symlink, so edit them once, here. Invoke them as `/name` and finish every step in order. A step that can't run (no git remote, no `gh`, no `codex`) is reported as skipped, never silently dropped.
- The session usually starts at the workspace root. Run app commands with `pnpm -C 43logistics.vn <script>` and app git with `git -C 43logistics.vn …`.
- Never `cat` `43logistics.vn/.env` or the `wordpress-site/` dump. Grep the dump for a specific fact and quote only that fact.
- Run long Codex critiques (`codex exec …`, see AGENTS.md §6) in the background and wait for the notification. Then present the critique and apply only what the user accepts.
- Memory is for user preferences and non-obvious lessons. Project facts belong in `docs/context/*`, and decisions belong in `docs/adr/*`.
