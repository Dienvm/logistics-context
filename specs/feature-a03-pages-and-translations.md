---
title: Edit pages and their translations from the admin
type: feature
status: approved
owner_repo: both
roadmap: A-03
priority: must-have
blocked_by_questions: [Q-01, Q-08, Q-09, Q-16, Q-17, Q-23, Q-24]
updated: 2026-10-24
---

## Feature: Edit pages and their translations from the admin

### Problem Statement

The 22 IA pages (`pages` + `page_translations`, VI and EN) are seeded by `pnpm db:seed` and published by `pnpm db:confirm`. Today their H1, SEO title and description, route-page editorial blocks and the About/policy markdown change only through `data/seed/*` and a script run. A-01 left `/admin/pages/` as a guarded "Sắp có" page.

The S-09 carry-over makes this urgent:

- About and the four policies were published with drafted copy that the owner must review.
- The open facts must be filled in from the admin once they are answered: compensation (Q-09), retention period (Q-17), legal name and tax code (Q-01).
- `PRIVACY_POLICY_VERSION` is a code constant (`modules/leads/constants.ts`), so a change to the privacy text needs a deploy today.

Roadmap A-03: "block editor (form-based per block type), SEO fields with length counters, slug change → auto redirect row, status workflow (draft → review → published), 'Create EN draft'."

**Slug changes move to A-08** (owner decision, 2026-10-24, after the Codex review). Every current page URL is owned by `data/redirect-map.csv`, either as a kept URL (`/gioi-thieu/`, status 200) or as the destination of a legacy redirect (`/dich-vu/gui-hang-di-singapore/` → `/gui-hang-di-singapore/`). A slug change would therefore break rule 13 (one hop). The safe redirect lookup also isn't designed yet: a streamed `permanentRedirect` turns into a meta refresh. So in A-03 slugs are read-only, and the roadmap rows are updated to match.

### Proposed Solution

Staff with `admin` or `editor` (`ADMIN_SECTIONS.pages`) get:

- **`/admin/pages/`:** every page (22 today) with:
  - its type, key and VI title;
  - per locale: a status badge (Nháp / Chờ duyệt / Đã xuất bản), the public path and the "EN lỗi thời" badge;
  - "Sửa lần cuối {date} · {name}".
- **`/admin/pages/{key}/`:** one page, with a tab per locale (VI, EN):
  - **Translation fields:**
    - H1 (where the page type renders it from the database, see the per-type table);
    - title (breadcrumb and menu label);
    - SEO title, with a counter for ≤ 60 characters;
    - SEO description, with a counter for 120–155 characters;
    - `noindex`;
    - translation status (`draft` / `review` / `published`).

    The slug and the public path are shown read-only.
  - **Page visibility:** `pages.status` (`draft` / `published`). A locale is public only when the page and that translation are both published (`isPagePublished`, unchanged). The home page is the exception (see the table).
  - **Blocks:** a form per block type, limited to the types the page type renders:
    - **route pages:** `intro`, `notes`, `methods`, `process`, `whyUs`, `tips`, at most one of each. Blocks can be added, edited and removed. The public layout fixes their order (07: the 7 route pages stay structurally identical), so there is no reordering.
    - **About:** `richText`, one or more blocks; add, edit, remove and reorder (move up / down).
    - **Policy pages:** exactly one `policy` block (effective date + markdown). It can be edited but not removed.
  - **"Tạo bản nháp EN":** shown when a page has no EN translation. It copies the VI fields and blocks into an EN `draft`, keeping the Vietnamese text and marking it "Cần dịch" (no machine translation until Q-16), and sets `source_updated_at`.
  - **Outdated EN:** when the VI translation changed after the EN `source_updated_at`, the EN tab and the list show "EN lỗi thời". Saving the EN translation clears it.
- **Privacy policy version:** the version stored on each lead, and the lead-form draft gate, come from the published VI `policy-privacy` translation's `policy.effectiveDate`. A published privacy text change must come with a later effective date.
- Every save invalidates the page's caches, so the public page, menus, metadata, hreflang and the sitemap follow on the next request.

**Per page type: what A-03 edits**

| Page type (key) | H1 | Title, SEO title/description | `noindex` | `pages.status` | Blocks |
| --- | --- | --- | --- | --- | --- |
| `home` | ✓ (used only while the home page and translation are published; otherwise the `messages` default) | ✓ (same rule) | read-only (home is always indexed, 05) | ✓, with the note "Nháp: trang chủ dùng nội dung mặc định" | — |
| `route_outbound`, `route_inbound` | ✓ | ✓ | ✓ | ✓ | route blocks (no reorder) |
| `hub` (`hub-outbound`, `hub-inbound`, `blog`) | ✓ (the `blog` loader is changed to read it) | ✓ | ✓ | ✓ | — |
| `calculator`, `goods` | ✓ (their loaders are changed to read it) | ✓ | ✓ | ✓ | — |
| `about` | ✓ | ✓ | ✓ | ✓ | `richText` (ordered) |
| `contact` | ✓ | ✓ | ✓ | ✓ | — |
| `policy` | ✓ | ✓ | ✓ | ✓ | exactly one `policy` |

Decisions (owner, 2026-10-24):

- **Scope:** pages only. The blog post editor is A-03b.
- **Publishing:** editors and admins may both publish; who and when is recorded.
- **"Tạo bản nháp EN":** copies the VI text.
- **Blocks:** only the 8 rendered block types (no reordering on route pages).
- **Privacy version:** read from the DB.
- **H1:** read from the DB on every page type that has a translation.
- **Not in A-03:**
  - draft preview;
  - creating, deleting or re-typing pages;
  - slug editing and slug-change redirects (moved to A-08).

### Acceptance Criteria

**Authorization (rule 7)**

- [ ] Given `/admin/pages/` and `/admin/pages/{key}/`, then each page's first call is `await requireSection("pages")` (admin, editor). `sales` gets 403. An unknown key → `notFound()` (admin 404).
- [ ] Given every Server Action in this task, then its first call is `requireSection("pages")`, before parsing input.

**List and editor**

- [ ] Given `/admin/pages/`, then every `pages` row is listed, published or not, with:
  - type, key and VI title;
  - per locale: status badge and public path;
  - the "EN lỗi thời" badge when it applies;
  - "Sửa lần cuối {date} · {name}" ("—" without a `profiles` row).
- [ ] Given `/admin/pages/{key}/`, then the VI and EN tabs each show that translation's editable fields per the per-type table. Slug and public path are read-only text (no form control posts them). A missing EN translation shows "Tạo bản nháp EN" instead of the form.
- [ ] Given the home page, then `noindex` and slug are read-only. `pages.status` is editable and shows the note that a draft home falls back to the default copy.

**Fields and validation**

- [ ] Given the translation form, then:
  - H1 (1–120 chars) and title (1–80) are required;
  - SEO title is optional and ≤ 60 chars;
  - SEO description is optional and 120–155 chars when given;
  - no text field may contain `&nbsp;` or raw `<`/`>` tags.

  Invalid input returns translated `fieldErrors` and writes nothing. A missing or malformed field also gets a translated message (generic fallback, A-02 lesson).
- [ ] Given a posted `slug`, `noindex` (home), `type`, `key` or any field the page type doesn't edit, then it is stripped (Zod strip policy) and never written.
- [ ] Given the SEO title and description inputs, then a live counter shows the length and the allowed range, turns to the warning tone outside it, and is announced politely (`aria-live`). The server re-validates.
- [ ] Given a block form, then it is validated by the same Zod schema the read side uses (`routeBlockSchema` / `infoBlockSchema`), and the page-type rules hold:
  - route pages: only route block types, at most one of each;
  - About: only `richText`, at least one;
  - policy: exactly one valid `policy` block, checked with `findPolicyBlock` before every save;
  - other types: no blocks.

  A violation returns a field or form error and writes nothing.
- [ ] Given a route page, when a block is removed, then the public section for it follows the existing loader: a removed section isn't rendered (no fallback copy is invented). The editor says so before removal (confirmation dialog).

**Status workflow**

- [ ] Given a translation, then admin and editor can move its status freely between `draft`, `review` and `published`. Publishing a translation sets `pages.published_at` if it is null.
- [ ] Given `pages.status`, then admin and editor can set it to `draft` or `published`. A non-home locale is public only when `isPagePublished(page, translation)` holds (unchanged).
- [ ] Given a policy page, then a translation can't be saved or published unless its blocks pass `findPolicyBlock`, the same rule `pnpm db:confirm` applies.
- [ ] Given any successful save, then the same transaction:
  - sets `page_translations.updated_by` and `pages.admin_edited_at` / `admin_edited_by` to the staff user ID (text, no FK) and now;
  - sets `pages.updated_at`.

**Loaders read the saved H1**

- [ ] Given a published translation, when its H1 is saved, then the public page shows it on the next request, for every type in the per-type table. `load-calculator-page.ts`, `load-goods-page.ts` and `load-blog.ts` (blog index) read `page_translations.h1`, keeping the `messages` value only as the fallback when the H1 is empty. Their `intro` and `crumb` copy stays in `messages` (code-owned).

**"Tạo bản nháp EN" and outdated translations**

- [ ] Given a page with no EN translation, when "Tạo bản nháp EN" is pressed, then an EN translation is inserted with:
  - the VI H1, title, SEO fields, blocks and `noindex`;
  - `status = draft` and `source_updated_at = VI updated_at`;
  - a slug: the VI slug when it is free in EN; else `{vi-slug}-en`, then `-en-2` … `-en-9`, truncated so the result is ≤ 80 chars. When none of these is free, the action returns an error and writes nothing.

  The slug stays read-only until A-08. The action is idempotent: a second press when EN exists does nothing and returns an error.
- [ ] Given machine translation, then it is not built. The use case passes the copied fields through one seam (`translateDraft(fields) → fields`, identity today) for Q-16.
- [ ] Given VI `updated_at` > EN `source_updated_at`, or EN `source_updated_at` null, then the EN tab and the list show "EN lỗi thời". Saving the EN translation sets `source_updated_at` to the VI `updated_at` and clears the badge. The flag is derived by a pure function (`isTranslationOutdated`); no column or status is added.

**Privacy policy version (Q-17 text changes without a deploy)**

- [ ] Given the published VI `policy-privacy` translation, then a new lead's `consent_policy_version` is that translation's `policy.effectiveDate`, read by a cached query tagged `pageTag("policy-privacy")`. This replaces `PRIVACY_POLICY_VERSION`. Existing lead rows keep their stored version.
- [ ] Given no published VI privacy policy (page or translation not published, or an invalid policy block), then in a production runtime the lead form is off and the action rejects submissions as `unavailable`. This is today's `draft-` gate, now derived from the DB. Every caller of the gate is updated for the async read: `lead-section.tsx`, `calculator-view.tsx`, `submit-lead.ts`.
- [ ] Given a **published** VI privacy translation whose `policy.markdown` changes, when it is saved, then the new `effectiveDate` must be later than the stored one; otherwise the save gets an `effectiveDate` field error and writes nothing. A date-only change is allowed when it moves forward. Editing a draft or review privacy translation has no such rule. The editor shows that new leads will record the new version.
- [ ] Given this new runtime dependency, `leads → content`, then `.claude/rules/module-structure.md` lists it. Today `content` has no import of `leads`, so there is no cycle; the walk-through records the import list, because `check:boundaries` catches cycles, not the direction table.

**Cache invalidation**

- [ ] Given every successful write (translation save, page status, blocks, EN draft), then the action calls `updateTag(pageTag(key))` and `updateTag(MENU_TAG)` after the commit. Menus, slug lists, the sitemap and hreflang read `MENU_TAG`. A route page also calls `updateTag(routeTag(routeKey))`. A failed write invalidates nothing.

**Data model and scripts**

- [ ] Given a new migration (`pnpm db:generate`, reviewed SQL), then:
  - `pages` gains `admin_edited_at timestamptz null` and `admin_edited_by text null`;
  - `page_translations` gains `updated_by text null`;
  - the migration contains nothing else and no FK; RLS stays on with no policies;
  - `07-data-model.md` documents the columns.
- [ ] Given `pnpm db:seed`, then pages, page translations and menus stay insert-only (today's rule). Given `pnpm db:confirm` and a page listed in `owner-confirmations.json` with `admin_edited_at` not null, then it leaves that page and its translations alone and prints "skipped (edited in admin): {key}".

**UI, copy and boundaries**

- [ ] Given the new screens, then they reuse the A-02 admin patterns and add no dependency:
  - `shared/ui/form-field.tsx`, `shared/hooks/use-action-form.ts`;
  - `shared/ui` table, tabs, dialog, input, textarea, select, checkbox, badge and button;
  - native `<input type="date">` for `effectiveDate`.

  Accessibility: 44 px targets, labels on every input, `aria-describedby` errors, submit disabled while pending. No rich-text editor (markdown is a `<textarea>`), no `motion`, no Zustand, no `react-hook-form`.
- [ ] Given a markdown field, then it shows its character count against `INFO_MARKDOWN_MAX` and a short note that headings start at `##` and that raw HTML and images aren't rendered.
- [ ] All new copy is in `messages/{vi,en}.json` under `admin.pages.*` and `admin.blocks.*`; `pnpm i18n:check` passes; the admin renders VI.
- [ ] `pnpm check:boundaries` passes:
  - admin reads are uncached functions in `modules/content/infrastructure`;
  - client islands import only `@/modules/<m>/client` and `shared/*`;
  - `modules/content` gains no import of `seo` or `leads`.
- [ ] Public routes don't regress: no admin code in the initial scripts of `/`, `/en/` and one route page; their gzip total grows ≤ 1 KiB versus `main` (A-02 curl + gzip method).

**Context docs**

- [ ] `07-data-model.md`: the new columns, the confirm skip rule and the privacy-version source.
- [ ] `06-architecture.md`: Permissions (pages: admin + editor publish).
- [ ] `08-i18n.md` Translation workflow: copy, no machine translation until Q-16, derived outdated flag, editor publishes.
- [ ] `08-i18n.md` Slugs: slug editing is A-08.
- [ ] `.claude/rules/module-structure.md`: `leads → content`.
- [ ] `10-roadmap.md`:
  - A-03 links this spec and drops "slug change → auto redirect row";
  - A-08 gains slug editing + automatic redirect rows (CSV-owned paths locked, one hop, served before streaming);
  - a new row **A-03b Blog post editor**: post fields, `richText` blocks, route filter on `/kinh-nghiem/`, categories, author, cover image via A-04;
  - the Phase 2 carry-over notes point A-03 (blog) at A-03b.

### Scope

**In scope:**

- `/admin/pages/` list and `/admin/pages/{key}/` editor for the existing pages: per-locale H1, title, SEO fields, `noindex`, status, page visibility.
- Blocks per the per-type table.
- "Tạo bản nháp EN" and the outdated flag.
- The privacy version from the DB, with its date rule.
- H1 loaders for calculator, goods and the blog index.
- Migration (edit stamps), the `db:confirm` skip rule, messages, context docs.

**Out of scope:**

- Slug editing and slug-change redirects, the runtime redirect lookup and the redirects manager (A-08).
- Blog posts, categories and authors (A-03b), menus and menu labels, FAQs, goods rules and testimonials (A-05), media and OG images (`og_image_id`, A-04), settings (A-09).
- Creating, deleting or re-typing pages; `pages.key`, `type`, `route_id`, `parent_id`, `sort`; the `archived` status.
- Draft preview, rich-text WYSIWYG, machine translation (Q-16), locales other than EN.
- The 16 aspirational block types in `07`; reordering route-page sections; the home page's section copy (code-owned, `HOME_COPY_APPROVED`); `intro`/`crumb` copy of the calculator, goods and blog index (messages).
- Concurrency control (last write wins), version history and undo.
- Supplying the open facts (Q-01, Q-08, Q-09, Q-17, Q-23, Q-24): the editor makes them editable; the owner supplies them.

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | schema + migration | `modules/content/infrastructure/schema/pages.ts` (stamp columns), `db/migrations/0007_*` + `meta/*` (generated; `0006` is A-02) |
| app | content: domain | `modules/content/domain/{admin-page,translation-outdated,page-type-rules}.ts` (pure), `modules/content/domain/page-published.ts` (reuse) |
| app | content: application | `modules/content/application/{admin-page-schemas,save-page-translation,set-page-status,create-en-draft,translate-draft}.ts`; `info-blocks.ts`, `route-blocks.ts` (export block-type lists; reuse `findPolicyBlock`) |
| app | content: infrastructure | `modules/content/infrastructure/{admin-page-queries,page-writes}.ts`, `info-page-queries.ts` (cached `getPrivacyPolicyVersion()`) |
| app | content: actions, entries | `modules/content/actions.ts`, `index.ts`, `client.ts`, `constants.ts` (limits) |
| app | content: admin UI | `modules/content/ui/admin/*`: list, editor tabs, translation form, SEO counter, block list, one form per block type, remove-block dialog, EN draft button |
| app | content: loaders | `modules/content/application/{load-calculator-page,load-goods-page,load-blog}.ts` (H1 from the DB) and their queries if the `h1` column isn't read yet |
| app | leads | `modules/leads/constants.ts` (drop `PRIVACY_POLICY_VERSION`), `modules/leads/application/{submit-lead,lead-form-config}.ts`, `modules/leads/ui/lead-section.tsx`, `modules/leads/index.ts` |
| app | public page | `app/[locale]/(site)/[slug]/calculator-view.tsx` (async lead gate) |
| app | admin routes | `app/admin/(shell)/pages/page.tsx` (replaces `ComingSoon`), `app/admin/(shell)/pages/[key]/page.tsx` (new) |
| app | scripts | `scripts/confirm-facts.ts` (skip admin-edited pages) |
| app | shared / auth (reuse) | `shared/ui/form-field.tsx`, `shared/hooks/use-action-form.ts`, `shared/lib/form-input.ts`, `shared/ui/tabs.tsx`, `db/client.ts` `DbTransaction`, `modules/auth` `requireSection` / `listStaffNames` / `AdminSection` (from A-02) |
| app | i18n | `messages/vi.json`, `messages/en.json` (`admin.pages.*`, `admin.blocks.*`) |
| context | docs | `docs/context/{06,07,08,10}-*.md`, `.claude/rules/module-structure.md`, `specs/INDEX.md` |

### Golden-rule checks

- **Rule 1 (facts):** the editor stores what staff type; the open facts stay owner questions (Q-01, Q-09, Q-17, Q-23, Q-24, Q-08). Prices and transit times are never page copy (they come from `routes` / `route_rates`, A-02); the route block forms carry no price fields.
- **Rule 4:** public pages keep one H1 (now the `h1` field everywhere), `generateMetadata` with canonical and hreflang from the translations, and JSON-LD.
- **Rule 5:** uncached admin reads after `requireSection`; writes in `actions.ts` → use case → `updateTag`.
- **Rule 6:** Drizzle only on the server; islands get plain props.
- **Rule 7:** `requireSection("pages")` first in pages and actions.
- **Rule 8:** admin JS stays under `/admin`.
- **Rules 10–11:** labels, counters announced politely, 44 px targets, no `uppercase`.
- **Rule 13:** slugs are untouched, so the CSV redirects and `check:redirects` (0 FAIL) are unaffected.
- **Rule 14:** each lead records the version of the privacy text actually published.

### Dependencies & Risks

- **Depends on:**
  - A-02 merged (app PR #40): shared form helpers, `DbTransaction`, `listStaffNames`, `AdminSection`;
  - A-01 (shell); S-04/S-04b/S-09/S-11/S-12 (block schemas and loaders).
  - No stack gap: `updateTag` is in Next 16.4.
- **Blocked by questions (non-blocking, ADR 0004):**
  - Q-16: no machine translation; the EN draft copies the VI text.
  - Q-01, Q-09, Q-17, Q-23, Q-24, Q-08: the copy stays as drafted until the owner supplies the facts through this editor.
- **Risk — async lead gate:** `isLeadFormEnabled()` becomes a DB read. The calculator and route pages are prerendered, so a cached read (tag `page:policy-privacy`) keeps them static. Every caller must await it, and the action must re-check it.
- **Risk — privacy date rule:** "later than the stored date" must compare ISO dates as strings, and only for the VI published translation; the EN privacy page follows its own `effectiveDate` for display only.
- **Risk — markdown size:** 40 000-char textareas post large FormData. The default `serverActions.bodySizeLimit` (1 MB) is enough; don't raise it.
- **Risk — several instances:** tag invalidation is per process (Q-15 / L-02), as in A-02.

### Manual Verification Plan

Owner instruction 2026-10-24 (Phase 2 admin): no CI wait, no SEO/Lighthouse, no Chrome runs by the agent. Evidence is static checks, a code walk-through and local database plus `curl` checks; the owner runs the browser checklist. Base URL: `http://localhost:3100` (`pnpm build && pnpm start -p 3100` against the local Docker database).

- **Scenario:** given the published About page, when an editor edits its H1 and a `richText` block and saves, then `/gioi-thieu/` shows the new H1 and text on the next request, and "Sửa lần cuối" names the editor.
- **Seed needs:**
  - default seed + `pnpm db:confirm` on the local database (`pnpm db:local`);
  - Clerk dev users `admin`, `editor` and `sales` (owner);
  - a missing-EN fixture: before the build, `delete from page_translations where locale = 'en' and page_id = (select id from pages where key = 'policy-terms')` on the local database only.
- **Agent checks (recorded in the PR):**
  1. Migration SQL reviewed (three nullable columns, no FK); applied to the local database only.
  2. Pure functions evaluated by a one-off `tsx` call (printed, not committed):
     - the translation schema on each invalid input above: empty H1, 81-char title, 61-char SEO title, 119- and 156-char description, `&nbsp;`, a posted slug, which is stripped;
     - the page-type block rules: two `intro` blocks, a `richText` block on a route page, zero and two `policy` blocks, About with no `richText`;
     - `isTranslationOutdated` for VI `updated_at` > / = / < `source_updated_at` and for null;
     - the EN-slug picker: VI slug free, taken, and taken through `-en-9`, plus an 80-char slug;
     - the privacy date rule: same date with changed text → error; a later date → ok; a draft translation → no rule.
  3. Order: build first, then mutate. Then run each Server Action once through the app with the owner, or call its use case and then the action's tags from a one-off script, recording which one was used.
     - `curl -s http://localhost:3100/gioi-thieu/ | grep -o '<h1[^>]*>[^<]*'` before and after the H1 save shows the change on the first request after the save, without a rebuild.
     - `curl -s http://localhost:3100/tinh-cuoc/` shows the DB H1 after a calculator H1 edit.
     - After a policy save, the `page_translations` row shows `updated_by` and `pages` shows `admin_edited_at/by` by SQL.
  4. Privacy version, on the local database:
     - Set the VI privacy `effectiveDate` later and submit one lead with `curl` or the form → the `leads.consent_policy_version` value equals it.
     - Set the VI privacy translation to `draft` → the lead form is off in `pnpm start` (production runtime) and a submission is rejected.
  5. `pnpm db:confirm` with `admin_edited_at` set on `about` by SQL → prints the skip line; the page row and its translations are unchanged.
  6. "Tạo bản nháp EN" on `policy-terms` (fixture) → an EN draft row with the VI text, `source_updated_at` = VI `updated_at`. A second press returns an error and adds no row.
  7. Code walk-through:
     - `requireSection("pages")` is first in every page and action;
     - `findPolicyBlock` runs before every policy save;
     - `updateTag` runs only after a successful commit;
     - the import list shows `content` imports neither `seo` nor `leads`;
     - client islands import only `client.ts` / `shared/*`.
  8. Public JS: curl + gzip of the initial scripts of `/`, `/en/` and `/gui-hang-di-singapore/` vs `main` (≤ 1 KiB growth, no admin code).
  9. `pnpm check:redirects` against the candidate build: 0 FAIL.
- **Owner checklist (Clerk dev instance, `pnpm build && pnpm start -p 3100`, private windows):**

  | # | User | Action | Expected |
  | --- | --- | --- | --- |
  | 1 | `sales` | open `/admin/pages/` and `/admin/pages/about/` | 403 |
  | 2 | `editor` | open `/admin/pages/` | 22 pages with type, VI title, VI/EN status and path, last edit; `policy-terms` has no EN (fixture) |
  | 3 | `editor` | About VI: change H1 and the first `richText` block, move the second block up, save; open `/gioi-thieu/` | new H1, text and order on first load; "Sửa lần cuối" shows the editor |
  | 4 | `editor` | Privacy VI: look for a way to remove the `policy` block; empty its markdown and save | no remove control; field error, nothing saved |
  | 5 | `admin` | Privacy VI (published): change one sentence and keep the date, save; then set the date to today, save; submit a test lead | first save rejected on `effectiveDate`; second saves with the version note; the lead's `consent_policy_version` = today |
  | 6 | `editor` | route page SG VI: edit a `tips` item, remove `whyUs` (confirm), save; open `/gui-hang-di-singapore/` | tips updated, the why-us section gone, prices unchanged |
  | 7 | `editor` | SEO title 61 chars, description 100 chars | counters warn; save rejected with field errors |
  | 8 | `editor` | `policy-terms`: press "Tạo bản nháp EN", then press it again | EN tab appears as a draft with the VI text and "Cần dịch"; the second press shows an error |
  | 9 | `editor` | edit VI of Contact, then open its EN tab; save EN | "EN lỗi thời" shown, cleared after saving EN |
  | 10 | `admin` | set About EN translation to `draft`, save; open `/en/about/` and view the source of `/gioi-thieu/` | `/en/about/` 404; no EN `hreflang` on the VI page |
  | 11 | `admin` | `/admin/pages/calculator/` VI: change H1, save; open `/tinh-cuoc/` | the new H1 shows |
  | 12 | `admin` | keyboard only through the editor: tabs, block move up/down, dialogs, Esc | everything reachable, focus visible, Esc closes dialogs without saving |
  | 13 | `admin` | 360 px and 1280 px | list and editor usable; no horizontal page scroll |
  | 14 | owner | consent matrix (ADR 0004 Decision 2) on a page with the lead form | unchanged results: the lead change is only the version source; recorded as owner-run, pending until done |

- **Runtime ACs are "pending owner verification"** until the owner runs the checklist; the PR lists each one with that label.
- **Validation commands:** `pnpm -C 43logistics.vn lint` (scoped `biome check --write <files>` for fixes), `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build`, `check:redirects` against the candidate build. No automated tests (ADR 0004).

### Implementation Hints

- **Copy the A-02 shape:**
  - thin actions: `requireSection` → `formInput` + `safeParse` → one use case → `updateTag` → translated `ActionState`;
  - use cases in `application/` running in a transaction from `infrastructure/`;
  - server-built labels passed to client islands (the admin has no `NextIntlClientProvider`);
  - `useActionForm`, `FormField`, and `zodFieldErrors` / `translateFieldErrors` with the `errors.invalid` fallback.
- **Blocks post as one hidden JSON field (`blocks`),** built by the client block list from the per-block forms. The server parses it with `z.array(blockSchemaFor(pageType))`, then applies the page-type rules. Don't post one FormData field per nested item.
- **Block-type lists:** export `ROUTE_BLOCK_TYPES` / `INFO_BLOCK_TYPES` derived from the union options, so the "Thêm block" menu can't drift from the renderer.
- **Privacy version:**
  - a cached `getPrivacyPolicyVersion(): Promise<string | null>` in `modules/content` (tag `pageTag(PRIVACY_PAGE_KEY)`), exported from `index.ts`;
  - `leads` awaits it in `isLeadFormEnabled()` and `submitLead`;
  - the date rule lives in a pure `content/domain` function used by the save use case.
- **Lesson `2026-10-23-s08-lead-form`:** list every file a new prop or enum threads through; scoped `biome check --write <files>`, then `git status`.
- **A-02 review lesson:** every translated error needs a code, missing fields too, with a generic fallback.

### Related

- Roadmap: `docs/context/10-roadmap.md` A-03, the Phase 2 carry-over notes (S-09), A-03b (new), A-04 (media/OG), A-05, A-08 (redirects manager + slug editing), L-01 (soft 404)
- `docs/context/07-data-model.md` (pages, page_translations, Blocks, Seed), `08-i18n.md` (Slugs, Translation workflow), `05-seo-and-tracking.md` (length rules, redirects precedence), `06-architecture.md` (Permissions, caching)
- `docs/context/11-open-questions.md` Q-01, Q-08, Q-09, Q-16, Q-17, Q-23, Q-24
- ADR 0004 (verification), ADR 0005 (modules), ADR 0006 (Cache Components)
- `specs/feature-s09-about-contact-policies-404.md`, `specs/feature-s04b-route-page-content.md`, `specs/feature-a02-routes-rates-editor.md`, `specs/feature-a01-admin-shell.md`
- `.claude/rules/form-patterns.md`, `conditional-form-patterns.md`, `api-patterns.md`, `seo-patterns.md`
- `lessons/2026-10-23-s08-lead-form.md`
