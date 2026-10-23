# Spec duplicate-attempt log

Logged by `/feature-bug` Step 2a when a new spec overlaps an existing one. This is a log, not a lesson (`/lesson` is for learnings with a follow-up).

| Date | Category | Attempted | Existing | Description |
|------|----------|-----------|----------|-------------|
| 2026-10-23 | DUPLICATE_SPEC | `/feature-bug feature s08-lead-form` | `specs/feature-s08-lead-form.md` on branch `spec/s08-lead-form` (PR #47, open, `status: approved`) | Missed because Step 2a checks only `specs/INDEX.md` on `main`; the approved spec sat on an unmerged spec branch. A second draft was written, then set aside before commit. |
