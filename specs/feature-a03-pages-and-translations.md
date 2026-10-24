---
title: Edit pages and their translations from the admin
type: feature
status: draft
owner_repo: both
roadmap: A-03
priority: must-have
blocked_by_questions: [Q-01, Q-08, Q-09, Q-16, Q-17, Q-23, Q-24]
updated: 2026-10-24
---

## Feature: Edit pages and their translations from the admin

### Problem Statement

The 22 IA pages (`pages` + `page_translations`, VI and EN) are seeded by `pnpm db:seed` and published by `pnpm db:confirm`. Their H1, SEO title and description, slug, route-page editorial blocks and the About/policy markdown can only be changed in `data/seed/*` plus a script run. A-01 left `/admin/pages/` as a guarded "Sắp có" page.

The S-09 carry-over makes this urgent. About and the four policies were published with drafted copy that the owner must review, and the open facts must be filled in from the admin once answered:

- compensation (Q-09);
- retention period (Q-17);
- legal name and tax code (Q-01).

When the privacy text changes, `PRIVACY_POLICY_VERSION` is a code constant (`modules/leads/constants.ts`), so today it needs a deploy.

Roadmap A-03: "block editor (form-based per block type), SEO fields with length counters, slug change → auto redirect row, status workflow (draft → review → published), 'Create EN draft'."

### Proposed Solution

Staff with `admin` or `editor` (`ADMIN_SECTIONS.pages`) get:

- **`/admin/pages/`:** every page (22 today) with:
  - its type, key and VI title;
  - per locale: status badge (Nháp / Chờ duyệt / Đã xuất bản), slug and an "EN lỗi thời" badge;
  - "Sửa lần cuối {date} · {name}".
- **`/admin/pages/{key}/`:** one page, with a tab per locale (VI, EN):
  - **Page fields:** H1, title (menu/breadcrumb label), SEO title (counter: ≤ 60), SEO description (counter: 120–155), slug, `noindex`, translation status (`draft` / `review` / `published`).
  - **Page visibility:** `pages.status` (`draft` / `published`). A locale is public only when both the page and that translation are published (`isPagePublished`, unchanged).
  - **Blocks:** a form per block type, only the types the page type renders:
    - route pages (`route_outbound`, `route_inbound`): `intro`, `notes`, `methods`, `process`, `whyUs`, `tips`, at most one of each, any order;
    - About: `richText` (one or more, ordered);
    - policy pages: exactly one `policy` block (effective date + markdown), which can't be removed.

    Blocks can be added, edited, removed and reordered (move up / down).
  - **"Tạo bản nháp EN"** when a page has no EN translation. It copies the VI fields and blocks as an EN `draft` and sets `source_updated_at`. Machine translation stays off until Q-16. The EN copy keeps the Vietnamese text, so the form shows "Cần dịch" until it is edited.
  - **Outdated EN:** when the VI translation changed after the EN `source_updated_at`, the EN tab and the list show "EN lỗi thời". Saving the EN translation sets `source_updated_at` to the VI `updated_at`.
- **Slug change on a published translation:** the save creates a `redirects` row (old path → new path) in the same transaction. The public `[slug]` page sends visitors from the old URL to the new one with one `permanentRedirect`.
- **Privacy policy version:** the version stored on leads and the lead-form draft gate come from the published VI `policy-privacy` translation's `policy.effectiveDate`, not from a code constant.
- Every save invalidates the page's caches, so the public page, menus, hreflang and sitemap follow on the next request.

Decisions (owner, 2026-10-24):

- **Scope:** pages only; the blog post editor is a later task.
- **Slug redirects:** served by a lookup in the `[slug]` page's not-found path, without touching `proxy.ts`.
- **Roles:** editors and admins may both publish (who/when recorded).
- **"Tạo bản nháp EN":** copies the VI text (no machine translation until Q-16).
- **Blocks:** all 8 rendered block types, with add, edit, remove and reorder.
- **Privacy version:** read from the DB.
- **Out of A-03:** draft preview and creating or deleting pages.

### Acceptance Criteria

**Authorization (rule 7)**

- [ ] Given `/admin/pages/` and `/admin/pages/{key}/`, then each page's first call is `await requireSection("pages")` (admin, editor); `sales` gets 403; an unknown key → `notFound()` (admin 404).
- [ ] Given every Server Action in this task, then its first call is `requireSection("pages")`, before parsing input.

**List and editor**

- [ ] Given `/admin/pages/`, then every `pages` row is listed (published or not) with type, key, VI title, per-locale status badge and slug, the "EN lỗi thời" badge when it applies, and "Sửa lần cuối {date} · {name}" ("—" without a `profiles` row).
- [ ] Given `/admin/pages/{key}/`, then the VI and EN tabs each show that translation's fields and blocks. A missing EN translation shows "Tạo bản nháp EN" instead of the form.
- [ ] Given the home page (`slug = ''`), then its slug field is read-only and it has no blocks editor; its other fields save.

**Fields and validation**

- [ ] Given the translation form, then H1 (1–120 chars), title (1–80) and slug are required.
  - Slug: lowercase `a–z`, `0–9`, `-`, 1–80 chars, no leading/trailing or double hyphen. It is unique per locale and may not collide with the reserved first segments: the blog segment, `admin`, `api`, `go`, `en`, `ingest`.
  - SEO title is optional, ≤ 60 chars; SEO description is optional, 120–155 chars when given; neither may contain `&nbsp;`.
  - Invalid input returns translated `fieldErrors` and writes nothing.
- [ ] Given the SEO title and description inputs, then a live counter shows the length and the allowed range, and turns to the warning tone outside it (client island; the server re-validates).
- [ ] Given a block form, then it is validated by the same Zod schema the read side uses (`routeBlockSchema` / `infoBlockSchema`), and the page type's rules hold:
  - route pages: only route block types, at most one of each;
  - About: only `richText`;
  - policy: exactly one valid `policy` block, checked with `findPolicyBlock` before save;
  - other page types: no blocks.

  A violation returns a field or form error and writes nothing.

**Status workflow**

- [ ] Given a translation, then its status can move freely between `draft`, `review` and `published` (admin and editor). Publishing a translation sets `pages.published_at` if it is null.
- [ ] Given `pages.status`, then admin and editor can set it to `draft` or `published`. The public page of a locale stays governed by `isPagePublished(page, translation)`, unchanged.
- [ ] Given a policy page, then a translation can't be published unless its blocks pass `findPolicyBlock`, the same rule `pnpm db:confirm` applies.
- [ ] Given any successful save, then `page_translations.updated_by` / `pages.admin_edited_by` record the staff user ID (text, no FK) and the times are set in the same transaction.

**Slug change → redirect**

- [ ] Given a **published** translation whose slug changes, when it is saved, then in the same transaction:
  - a `redirects` row `{ source_path: old path, destination: new path, status_code: 301, note: "A-03 slug change {key}/{locale}" }` is inserted. Paths use the public form: VI `/old/`, EN `/en/old/`.
  - any existing row whose destination is the old path is re-pointed to the new path (chains stay one hop);
  - a row whose source equals the new path is deleted (the slug is taken back).
- [ ] Given an old path that is a source in `data/redirect-map.csv` (or the new path collides with one), then the save is rejected with a slug field error. The CSV owns legacy URLs (05).
- [ ] Given a draft or review translation, then changing its slug creates no redirect.
- [ ] Given a request to an old slug after the change, when no published page has that slug, then the `[slug]` page looks up `redirects` (a cached read tagged `redirects`) and calls `permanentRedirect(destination)`. The response is a single redirect to the new URL: **308 with `Location` before any body is streamed**, recorded with `curl -sI`. A `410` row returns 410 if the lookup supports it, else it is left to A-08 (state which in the PR).
- [ ] Given `redirects.hits`, then this task doesn't increment it (A-08).

**"Tạo bản nháp EN" and outdated translations**

- [ ] Given a page with no EN translation, when "Tạo bản nháp EN" is pressed, then an EN translation is inserted with:
  - the VI H1, title, SEO fields, blocks and `noindex`;
  - the VI slug, or `{vi-slug}-en` when the VI slug is taken in EN;
  - `status = draft` and `source_updated_at = VI updated_at`.

  The action is idempotent: a second press when EN exists does nothing and returns an error.
- [ ] Given a provider-based machine translation, then it is not built. The action has a single seam (`translateDraft(fields) → fields`, identity today) for Q-16.
- [ ] Given VI `updated_at` > EN `source_updated_at` (or EN `source_updated_at` null), then the EN tab and list show "EN lỗi thời". Saving the EN translation sets `source_updated_at = VI updated_at`, which clears it. The flag is derived; no column or status is added for it.

**Privacy policy version (Q-17 text changes without a deploy)**

- [ ] Given the published VI `policy-privacy` translation, then a lead's `consent_policy_version` is that translation's `policy.effectiveDate` (a cached read tagged `pageTag("policy-privacy")`), replacing `PRIVACY_POLICY_VERSION`.
- [ ] Given no published VI privacy policy, then in a production runtime the lead form is off (today's `draft-` gate, now derived from the DB), and the action rejects submissions the same way.
- [ ] Given this new runtime dependency `leads → content`, then `.claude/rules/module-structure.md` lists it and `pnpm check:boundaries` passes (no cycle: `content` must not import `leads`).
- [ ] Given the policy editor, then changing the privacy policy's `effectiveDate` shows a note that new leads will record the new version.

**Cache invalidation**

- [ ] Given every successful write (translation save, page status, blocks, EN draft), then the action calls `updateTag(pageTag(key))` and `updateTag(MENU_TAG)` after the commit. Menus, slug lists, the sitemap and hreflang read `MENU_TAG`. A slug change also calls `updateTag(REDIRECTS_TAG)`, and a route page also calls `updateTag(routeTag(routeKey))`. A failed write invalidates nothing.
- [ ] Given a published slug change, when the new URL is requested, then it renders (on demand if it wasn't prerendered), the old URL redirects, and the language switcher, hreflang and sitemap show the new slug on the next request (owner check).

**Data model**

- [ ] Given a new migration (`pnpm db:generate`, reviewed SQL), then:
  - `pages` gains `admin_edited_at timestamptz null` and `admin_edited_by text null`;
  - `page_translations` gains `updated_by text null`;
  - the migration has nothing else and no FK; RLS stays on with no policies;
  - `07-data-model.md` documents the columns.
- [ ] Given `pnpm db:seed`, then pages, page translations and menus stay insert-only, so admin edits survive (today's rule). Given `pnpm db:confirm`, then it leaves alone the pages listed in `owner-confirmations.json` that have `admin_edited_at` not null, and prints "skipped (edited in admin): {key}". Neither script ever overwrites an editor's text.

**UI, copy and boundaries**

- [ ] Given the new screens, then they reuse the A-02 admin patterns:
  - shared primitives: `shared/ui/form-field.tsx`, `shared/hooks/use-action-form.ts`, `shared/ui` table, tabs, dialog, input, textarea, select, checkbox, badge and button;
  - native `<input type="date">` for `effectiveDate`;
  - 44 px targets, labels, `aria-describedby` errors, submit disabled while pending;
  - no new dependency (no rich-text editor; markdown is a `<textarea>`), no `motion`, no Zustand, no `react-hook-form`.
- [ ] Given the markdown fields, then they show the character count against `INFO_MARKDOWN_MAX` and a short note that headings start at `##` and raw HTML/images are not rendered.
- [ ] All new copy is in `messages/{vi,en}.json` under `admin.pages.*` and `admin.blocks.*`; `pnpm i18n:check` passes; the admin renders VI.
- [ ] `pnpm check:boundaries` passes:
  - admin reads are uncached functions in `modules/content/infrastructure`;
  - client islands import only `@/modules/<m>/client` and `shared/*`;
  - the redirect write runs inside the content use case's transaction without a runtime cycle: either a port the content action wires to `@/modules/seo`, or the writer moved into `content`. Today `seo` → `content` is allowed and `content` → `seo` is not; see Risks. The chosen direction is recorded in `module-structure.md`.
- [ ] Public routes don't regress: no admin code in the initial scripts of `/`, `/en/` and one route page; their gzip total grows ≤ 1 KiB versus `main` (A-02 curl + gzip method).

**Context docs**

- [ ] `07-data-model.md`: the new columns, the confirm skip rule and the privacy-version source.
- [ ] `06-architecture.md`: Permissions (pages: admin + editor publish) and the slug-redirect lookup in the caching table.
- [ ] `05-seo-and-tracking.md`: the runtime redirect line now says how slug-change rows are served (page-level lookup, 308), replacing "read in `proxy.ts`".
- [ ] `08-i18n.md`: the translation workflow (copy, no MT until Q-16, outdated flag, editor publishes).
- [ ] `.claude/rules/module-structure.md`: the new allowed directions.
- [ ] `10-roadmap.md`: A-03 links this spec, and a new row for the blog post editor (A-03b).

### Scope

**In scope:**

- `/admin/pages/` list and `/admin/pages/{key}/` editor for the existing pages; per-locale fields, status, `noindex`, slug; the 8 rendered block types with add, edit, remove and reorder.
- Slug-change redirects (write + public lookup), "Tạo bản nháp EN", the outdated flag.
- The privacy policy version from the DB.
- Migration (edit stamps), the `db:confirm` skip rule, messages, context docs.

**Out of scope:**

- Blog posts, categories and authors (new roadmap row A-03b), menus and menu labels, FAQs, goods rules and testimonials (A-05), media and OG images (`og_image_id`, A-04), settings (A-09), the redirects manager and the hit counter (A-08).
- Creating, deleting or re-typing pages; `pages.key`, `type`, `route_id`, `parent_id`, `sort`; `archived` status.
- Draft preview, rich-text WYSIWYG, machine translation (Q-16), translation for locales other than EN.
- The 16 aspirational block types in `07` (only the 8 rendered ones), home-page copy (code-owned, `HOME_COPY_APPROVED`).
- Concurrency control (last write wins), version history/undo.
- Filling the open facts themselves (Q-01, Q-09, Q-17, Q-23, Q-24, Q-08): the editor makes them editable; the owner supplies them.
- Fixing the streamed soft-404 (L-01), except that the redirect lookup must not stream a 200 (AC above).

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | schema + migration | `modules/content/infrastructure/schema/pages.ts` (stamp columns), `db/migrations/0007_*` + `meta/*` (generated; `0006` is A-02) |
| app | content module | `modules/content/application/{schemas,save-page-translation,set-page-status,create-en-draft,page-block-rules}.ts`, `modules/content/domain/{admin-page,translation-outdated,page-path}.ts` (pure), `modules/content/infrastructure/{admin-page-queries,page-writes}.ts`, `modules/content/actions.ts`, `modules/content/ui/admin/*` (list, editor tabs, translation form, SEO counter, block list + one form per block type, EN draft button), `modules/content/index.ts`, `modules/content/client.ts`, `modules/content/constants.ts` (reserved segments, limits) |
| app | content read side | `modules/content/application/info-blocks.ts`, `route-blocks.ts` (reuse; export block-type lists), a cached `getPrivacyPolicyVersion()` in `modules/content/infrastructure/info-page-queries.ts` |
| app | seo module | `modules/seo/infrastructure/redirect-writes.ts` (insert / re-point / delete within a tx), `modules/seo/infrastructure/redirect-queries.ts` (cached `findRedirect(path)`, tag `redirects`), `modules/seo/application/redirect-rules.ts` or `domain/redirect-csv.ts` (CSV-source check), `modules/seo/constants.ts` (`REDIRECTS_TAG`), `modules/seo/index.ts` |
| app | public page | `app/[locale]/(site)/[slug]/page.tsx` (not-found path → redirect lookup), possibly `app/[locale]/(site)/[...rest]/page.tsx` |
| app | leads | `modules/leads/constants.ts` (drop `PRIVACY_POLICY_VERSION`), `modules/leads/application/{submit-lead,lead-form-config}.ts` |
| app | admin routes | `app/admin/(shell)/pages/page.tsx` (replaces `ComingSoon`), `app/admin/(shell)/pages/[key]/page.tsx` (new) |
| app | scripts | `scripts/confirm-facts.ts` (skip admin-edited pages) |
| app | shared / auth | reuse `shared/ui/form-field.tsx`, `shared/hooks/use-action-form.ts`, `shared/lib/form-input.ts`, `db/client.ts` `DbTransaction`, `modules/auth` `requireSection` / `listStaffNames` / `AdminSection` (all from A-02); `shared/ui/tabs.tsx` |
| app | i18n | `messages/vi.json`, `messages/en.json` (`admin.pages.*`, `admin.blocks.*`) |
| context | docs | `docs/context/{05,06,07,08,10}-*.md`, `.claude/rules/module-structure.md`, `specs/INDEX.md` |

### Golden-rule checks

- **Rule 1 (facts):** the editor stores what staff type; open facts stay owner questions (Q-01, Q-09, Q-17, Q-23, Q-24, Q-08). Prices and transit times are never page copy: they come from `routes` / `route_rates` (A-02). The route block forms carry no price fields.
- **Rule 4:** public pages keep one H1 (the `h1` field), `generateMetadata` with canonical and hreflang from the translations, and JSON-LD; slug and SEO edits flow into them through the existing loaders.
- **Rule 5:** uncached admin reads after `requireSection`; writes in `actions.ts` → use case → `updateTag`.
- **Rule 6:** Drizzle only on the server; islands get plain props.
- **Rule 7:** `requireSection("pages")` first in pages and actions.
- **Rule 8:** admin JS stays under `/admin`; the public `[slug]` page adds only a server-side lookup.
- **Rules 10–11:** labels, counters announced politely (`aria-live`), 44 px targets, no `uppercase`.
- **Rule 13:** CSV redirects unchanged and always win; `check:redirects` stays 0 FAIL.
- **Rule 14:** the privacy policy version recorded with each lead follows the published text.
- Admin pages aren't public: the rule 4 SEO set doesn't apply to them; they stay `noindex`.

### Dependencies & Risks

- **Depends on:**
  - A-02 merged (app PR #40): shared form helpers, `DbTransaction`, `listStaffNames`, `AdminSection`;
  - A-01 (shell);
  - S-04/S-04b/S-09 (block schemas and loaders);
  - F-07 (CSV redirect map).
  - No stack gap: `updateTag` and `permanentRedirect` are in Next 16.4.
- **Blocked by questions (non-blocking, ADR 0004):**
  - Q-16: no machine translation; "Tạo bản nháp EN" copies the VI text.
  - Q-01, Q-09, Q-17, Q-23, Q-24, Q-08: the copy stays as drafted until the owner supplies the facts through this editor.
- **Risk — redirect after streaming:** `[slug]` renders unknown slugs as a streamed 404 with status 200 (soft-404 note). The redirect lookup must run before any `Suspense` boundary or streamed output so that `permanentRedirect` sets the status, instead of a client-side meta refresh. Verify with `curl -sI` on the production build.
- **Risk — new slug not prerendered:** `generateStaticParams` lists published slugs at build. A slug added later must render on demand; confirm `dynamicParams` isn't disabled and that the on-demand render caches under the page tag.
- **Risk — module directions:**
  - the content use case must write `redirects` (owned by `seo`) in its transaction, but `seo` already depends on `content`, so `content → seo` would create a cycle;
  - option A: the content use case receives a port `(tx, change) => Promise<void>` that the content action wires to `@/modules/seo`'s writer (actions may import other modules' `index.ts`, and the use case itself stays acyclic);
  - option B: move the `redirects` writer into `content`;
  - pick A unless `check:boundaries` disagrees, and record it in `module-structure.md`;
  - `leads → content` (privacy version) is a new allowed direction, also recorded there.
- **Risk — CSV collision check at runtime:** the CSV is a build input (`data/redirect-map.csv`). The action needs its sources (import the parsed map in `modules/seo`, server-only) so that a slug change can't shadow a legacy URL.
- **Risk — markdown size:** 40 000-char textareas post large FormData. Keep the server body limit in mind (`serverActions.bodySizeLimit` default 1 MB is enough; don't raise it).
- **Risk — several instances:** tag invalidation is per process (Q-15 / L-02), as in A-02.

### Manual Verification Plan

Owner instruction 2026-10-24 (Phase 2 admin): no CI wait, no SEO/Lighthouse, no Chrome runs by the agent. Evidence is static checks, a code walk-through and local database plus `curl` checks; the owner runs the browser checklist.

- **Scenario:** given the published About page, when an editor edits its H1 and a `richText` block and saves, then `/gioi-thieu/` shows the new H1 and text on the next request. When the VI slug changes to `gioi-thieu-43-logistics`, then `/gioi-thieu/` sends one 308 to `/gioi-thieu-43-logistics/`, and the menu, the language switcher and the sitemap use the new slug.
- **Seed needs:** default seed + `pnpm db:confirm` on the local Docker database (`pnpm db:local`); Clerk dev users `admin`, `editor`, `sales` (owner).
- **Agent checks (recorded in the PR):**
  1. Migration SQL reviewed: only the three nullable columns, no FK; applied to the local database only.
  2. Pure functions evaluated by a one-off `tsx` call (printed, not committed):
     - the translation schema on each invalid input above: bad slug, reserved segment, 61-char SEO title, 119- and 156-char description, `&nbsp;`;
     - the page-type block rules: two `intro` blocks, a `richText` block on a route page, zero or two `policy` blocks;
     - the outdated flag on `vi.updated_at` > / = / < `source_updated_at` and null;
     - the redirect planner for a chain (A → B exists, then B → C gives A → C + B → C) and for taking back an old slug.
  3. Local database + production build (`pnpm build && pnpm start`): run the use case once through a one-off script, or have the owner save once in the UI.
     - Change the VI slug of `about` and show the `redirects` row by SQL.
     - `curl -sI /gioi-thieu/` → `308` + `Location: /gioi-thieu-43-logistics/`; `curl -sI /gioi-thieu-43-logistics/` → `200`.
     - A CSV source as the new slug → rejected.
  4. `pnpm db:confirm` with `admin_edited_at` set on `about` by SQL: prints the skip line and leaves the row unchanged.
  5. Code walk-through:
     - `requireSection("pages")` is first in every page and action;
     - the policy check runs before publish;
     - `updateTag` calls happen only after commit;
     - the redirect write is in the same transaction as the slug change;
     - client islands import only `client.ts` / `shared/*`.
  6. Public JS: curl + gzip of the initial scripts of `/`, `/en/` and `/gui-hang-di-singapore/` vs `main` (≤ 1 KiB, no admin code).
- **Owner checklist (Clerk dev instance, `pnpm build && pnpm start`, private windows):**

  | # | User | Action | Expected |
  | --- | --- | --- | --- |
  | 1 | `sales` | open `/admin/pages/` and `/admin/pages/about/` | 403 |
  | 2 | `editor` | open `/admin/pages/` | 22 pages with type, VI title, VI/EN status and slug, last edit |
  | 3 | `editor` | About VI: change H1 and the first `richText` block, save; open `/gioi-thieu/` | new H1 and text on first load; "Sửa lần cuối" shows the editor |
  | 4 | `editor` | Privacy policy VI: try to remove the `policy` block | not possible; an empty markdown → field error, nothing saved |
  | 5 | `admin` | Privacy policy VI: change `effectiveDate` to today, save; submit a test lead | the note about the new version shows; the lead row's `consent_policy_version` = today |
  | 6 | `editor` | route page SG VI: reorder `process` above `intro`, edit a `tips` item, save; open `/gui-hang-di-singapore/` | order and text updated; prices unchanged |
  | 7 | `editor` | SEO title 61 chars, description 100 chars | counters warn; save rejected with field errors |
  | 8 | `admin` | About VI slug → `gioi-thieu-43-logistics`, save; open `/gioi-thieu/`, the header/footer links, the EN page's language switcher | old URL lands on the new one; links use the new slug |
  | 9 | `editor` | edit VI of Contact, then open its EN tab | "EN lỗi thời" shown; saving EN clears it |
  | 10 | `admin` | set About EN translation to `draft`, save; open `/en/about/` and the VI page's hreflang | `/en/about/` 404; no EN hreflang on the VI page |
  | 11 | `admin` | keyboard only through the editor: tabs, block move up/down, dialogs, Esc | everything reachable, focus visible, Esc closes dialogs without saving |
  | 12 | `admin` | 360 px and 1280 px | list and editor usable; no horizontal page scroll |

- **Runtime ACs are "pending owner verification"** until the owner runs the checklist; the PR lists each one with that label.
- **Validation commands:** `pnpm -C 43logistics.vn lint` (scoped `biome check --write <files>` for fixes), `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build`, `check:redirects` against the candidate build (must stay 0 FAIL). No automated tests (ADR 0004). Run the consent matrix: no (consent and tracking untouched). Lead processing does change, through the policy version only, so record one local lead submission with the new version.

### Implementation Hints

- Copy the A-02 shape: thin actions (`requireSection` → `formInput` + `safeParse` → one use case → `updateTag` → translated `ActionState`), use cases in `application/` running in a transaction from `infrastructure/`, server labels passed to client islands (the admin has no `NextIntlClientProvider`), `useActionForm`, `FormField`, `zodFieldErrors` / `translateFieldErrors` with the `errors.invalid` fallback.
- Blocks post as one hidden JSON field (`blocks`), built by the client block list from per-block forms. The server parses it with `z.array(blockSchemaFor(pageType))` and then the page-type rules. Don't post one FormData field per nested item.
- Block-type lists: export `ROUTE_BLOCK_TYPES` / `INFO_BLOCK_TYPES` from the schema files (derive them from the union's options), so the editor's "Thêm block" menu can't drift from the renderer.
- Path building: one pure `publicPagePath(locale, slug)` (`/x/` or `/en/x/`, home `/` and `/en/`). Reuse `localizedPath()` from `shared/i18n` if it already produces this form.
- `findPolicyBlock` already exists for exactly this check (S-09). Call it in the use case, not only in the form.
- Lesson `2026-10-23-s08-lead-form`: list every file a new prop or enum threads through; scoped `biome check --write <files>`, then `git status`.
- A-02 review lesson: every translated error needs a code (missing fields too), with a generic fallback.

### Related

- Roadmap: `docs/context/10-roadmap.md` A-03 and the Phase 2 carry-over notes (S-09), A-04 (media/OG), A-05, A-08 (redirects manager), L-01 (soft 404)
- `docs/context/07-data-model.md` (pages, page_translations, Blocks, redirects, Seed), `08-i18n.md` (Slugs, Translation workflow), `05-seo-and-tracking.md` (length rules, redirects precedence), `06-architecture.md` (Permissions, caching)
- `docs/context/11-open-questions.md` Q-01, Q-08, Q-09, Q-16, Q-17, Q-23, Q-24
- ADR 0004 (verification), ADR 0005 (modules), ADR 0006 (Cache Components)
- `specs/feature-s09-about-contact-policies-404.md`, `specs/feature-s04b-route-page-content.md`, `specs/feature-a02-routes-rates-editor.md`, `specs/feature-a01-admin-shell.md`
- `.claude/rules/form-patterns.md`, `conditional-form-patterns.md`, `api-patterns.md`, `seo-patterns.md`
- `lessons/2026-10-23-s08-lead-form.md`
