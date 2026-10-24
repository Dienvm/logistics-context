---
title: Write and publish blog posts from the admin
type: feature
status: approved
owner_repo: both
roadmap: A-03b
priority: must-have
blocked_by_questions: [Q-16]
updated: 2026-10-24
---

## Feature: Write and publish blog posts from the admin

### Problem Statement

The blog (`/kinh-nghiem/` ↔ `/en/guides/`, S-11) has 4 posts. They exist only because `data/seed/posts.json` + `posts/*.md` were seeded and `pnpm db:confirm` published them by VI slug. A new guide, a correction or an EN fix therefore needs a developer. A-01 left `/admin/posts/` as a guarded "Sắp có" page.

The schema already has `categories` / `category_translations` / `post_categories`, `posts.author_id` (→ `profiles`) and `posts.cover_id` (→ `media`), but nothing uses them. The IA promises a blog "list with filters by route; article layout with … author" (03 Blog, "Not yet: the route filter, author, cover images and categories").

Roadmap A-03b (split from A-03, owner 2026-10-24): "post fields and `richText` blocks, route filter on `/kinh-nghiem/`, categories, author, cover image (via A-04), 'Tạo bản nháp EN' for posts."

### Proposed Solution

Staff with `admin` or `editor` (`ADMIN_SECTIONS.posts`) get:

- **`/admin/posts/`:** every post (published or not), newest first, with:
  - the VI title and the linked route;
  - per locale: the status badge and the public path (`/kinh-nghiem/{slug}/`, `/en/guides/{slug}/`);
  - "EN lỗi thời", the author and "Sửa lần cuối {date} · {name}";
  - a "Viết bài mới" button.
- **`/admin/posts/new/`:** create a post with the VI fields (title, slug, excerpt, SEO title/description, body) and the post fields (route, author, categories). The post starts as a draft with a draft VI translation and no EN translation.
- **`/admin/posts/{id}/`:**
  - **Post fields:**
    - post status (`draft` / `published` / `archived`);
    - the publication date (shown once the post has been published, editable, never cleared);
    - the linked route (optional, any route);
    - the author (optional, a staff member; defaults to the creator);
    - categories (any number).
  - **Per-locale tab (VI, EN)**, reusing the A-03 translation form:
    - title, slug (editable only while the post has never been published), excerpt;
    - SEO title (≤ 60) and SEO description (120–155) with counters;
    - status (`draft` / `review` / `published`);
    - the body as ordered `richText` blocks (add, edit, remove, reorder).
  - **"Tạo bản nháp EN"** when the post has no EN translation: copies the VI fields and blocks into an EN draft (Q-16: no machine translation). "EN lỗi thời" and "Cần dịch" are derived as in A-03.
  - **Remove:** a never-published post (`published_at` null) can be deleted after a confirmation dialog. A post that has been published can't be deleted, only set to `draft` or `archived` (its URL then 404s, like today's drafts).
- **`/admin/posts/categories/`:** list, create, edit and reorder categories. Each has a VI and EN name and slug; a category without posts shows nowhere publicly.
- **Public blog:**
  - **`/kinh-nghiem/` and `/en/guides/`:** each post card shows its route chip (as today) and its category chips. Above the grid, filter chips list the routes and categories that have at least one published post in that locale. Choosing one hides the other cards on the client (no URL change, no new URL). Without JS every post shows and the chips are absent.
  - **Article:** a byline "Bởi {author}" under the title when the post has an author with a display name.

Decisions (owner, 2026-10-24):

- **Scope:** editor + new posts + route filter + author + categories.
- **Filtering:** on the client, no URL. Categories have no URL or page of their own (05: tag/author/date archives are not recreated).
- **Author:** a staff member, defaulting to the creator. `BlogPosting.author` stays the `Organization`.
- **Cover images:** wait for A-04.
- **Roles:** admin and editor create, edit and publish.
- **Slugs:** editable until the first publication.
- **Removal:** no deletion once published.

### Acceptance Criteria

**Authorization (rule 7)**

- [ ] Given `/admin/posts/`, `/admin/posts/new/`, `/admin/posts/{id}/` and `/admin/posts/categories/`, then each page's first call is `await requireSection("posts")` (admin, editor) and each exports `instant = false` (the A-02/A-03 admin pattern). `sales` gets 403. An unknown or malformed id → `notFound()`.
- [ ] Given every Server Action in this task, then its first call is `requireSection("posts")`, before parsing input.

**List, create, edit**

- [ ] Given `/admin/posts/`, then every `posts` row is listed newest first (by `published_at`, then `created_at`). Each row shows:
  - the VI title and the route name;
  - per-locale status badge and public path;
  - "EN lỗi thời" when the EN `source_updated_at` is null or older than the VI `updated_at`;
  - the author's display name, or "—";
  - "Sửa lần cuối {date} · {name}".
- [ ] Given "Viết bài mới", when the form is saved valid, then in one transaction:
  - a `posts` row (`status = draft`, `author_id` = the creator, `published_at` null) and a VI `post_translations` row (`status = draft`) are inserted;
  - the browser lands on `/admin/posts/{id}/`.

  The title is required (1–120 chars) and the slug follows the rule below. Blocks must hold at least one `richText` block with text.
- [ ] Given the post fields:
  - route: one of `routes` (active or not) or none; a post linked to an inactive route shows no route chip and adds no route filter option publicly (route labels come from `listNavRoutes`, active routes only, like the menu);
  - author: a `profiles` row not soft-deleted, or none;
  - categories: existing ids only, at most 5;
  - publication date: ISO date, required once `published_at` is set, never cleared.

  An unknown id is a field error and writes nothing.
- [ ] Given the translation form, then it uses the A-03 field rules:
  - title 1–120 chars; excerpt ≤ 300 chars, optional;
  - SEO title ≤ 60; SEO description 120–155 when given;
  - no `&nbsp;` or HTML tags in the plain fields;
  - status `draft` / `review` / `published`.

  The body uses the A-03 block editor with `richText` blocks only, at least one, each 1–40 000 chars (`infoBlockSchema` `richText`).
- [ ] Given a slug field, then it accepts lowercase `a–z`, `0–9`, `-` (1–80 chars, no leading, trailing or double hyphen) and must be unique per locale (`post_tr_locale_slug_uq`). A duplicate returns a slug field error, not a 500.
  - It is locked **per translation**: editable only while that translation's `post_translations.published_at` is null (set the first time that translation becomes `published` while the post is published). An EN draft created after the VI post went live therefore still gets its own natural English slug (08).
  - Once locked it is read-only text, and a posted slug is ignored (slug changes are A-08).
  - Every post path is `/kinh-nghiem/{slug}/` or `/en/guides/{slug}/`, and every `data/redirect-map.csv` source lies outside these prefixes, so a new slug can't be shadowed by a legacy redirect. The implementation re-checks this against the CSV at build or in the walk-through and records the result.

**Status, publication and removal**

- [ ] Given a post, then:
  - its status moves between `draft`, `published` and `archived`;
  - each translation's status moves between `draft`, `review` and `published`;
  - a locale is public only when the post is `published` with a `published_at` **and** that translation is `published` (`resolveBlogPost`, unchanged).
- [ ] Given the first time a post's status becomes `published`, then `posts.published_at = now()` unless a date was already set. Given the first time a translation is `published` while its post is published (in either order of the two saves), then that translation's `published_at = now()`, which locks its slug.
- [ ] Given a post with `published_at` null, when "Xoá bài" is confirmed in the dialog, then the post, its translations and its category links are deleted (FK cascade); cancelling writes nothing.
- [ ] Given a post with `published_at` set, then no delete control is shown, and a crafted delete request returns an error and deletes nothing.
- [ ] Given any successful write, then in the same transaction:
  - `posts.admin_edited_at` / `admin_edited_by` and `post_translations.updated_by` (the saved locale) are set;
  - an EN save sets `post_translations.source_updated_at` to the VI `updated_at`.

**"Tạo bản nháp EN"**

- [ ] Given a post without an EN translation, when "Tạo bản nháp EN" is pressed, then an EN translation is inserted with:
  - the VI title, excerpt, SEO fields and blocks, through the A-03 `translateDraft` seam (identity until Q-16);
  - `status = draft` and `source_updated_at` = VI `updated_at`;
  - a slug from the A-03 picker (`pickEnDraftSlug` against EN post slugs).

  A second press when EN exists does nothing and returns an error.

**Categories**

- [ ] Given `/admin/posts/categories/`, then a category can be created, renamed and reordered (`categories.sort`) with a VI and EN name (1–60 chars) and slug (slug rule above, unique per locale). Deleting a category removes its `post_categories` links, after a confirmation that names how many posts use it.
- [ ] Given a post, then its categories are saved as `post_categories` rows (replace-all in the post's transaction).

**Public blog (rule 4 on `/kinh-nghiem/`, `/en/guides/` and every article)**

- [ ] Given the blog index in a locale, then each card shows its route chip and its category chips; category names come from `category_translations` of that locale, and a category without a name in that locale is not shown in it.
- [ ] Given the blog index, then a filter bar lists "Tất cả", then every **active** route used by at least one published post in that locale (in `routes.sort` order), then every category used by one (in `categories.sort` order).
  - **One chip is active at a time** (single select across routes and categories). Choosing a route chip shows only posts linked to that route; choosing a category chip shows only posts in that category; choosing another chip replaces the selection; "Tất cả" (the default) shows every card. The active chip has `aria-pressed="true"`, the others `false`.
  - An `aria-live="polite"` line announces the visible count.
  - The bar is a client island; the cards stay server-rendered.
  - Without JS the bar isn't rendered and all cards show.
  - No `searchParams`, no new URL, no change to the page's canonical, metadata, JSON-LD or sitemap entry.
- [ ] Given an article whose post has an author, then "Bởi {name}" shows under the title only when `profiles.display_name` is set **and differs from** `profiles.username` (F-05's `displayNameOf` falls back to the username when Clerk has no first/last name, so `display_name` alone isn't public-safe). Otherwise there is no byline. A username or e-mail is never shown publicly. `BlogPosting.author` stays the `Organization` (05).
- [ ] Given a post save, a status change, a category change or an EN draft, then the action calls `updateTag(POSTS_TAG)` after the commit. This covers the blog index, the article, home "latest guides", route-page related guides and the RSS feeds. A failed write invalidates nothing.
- [ ] Given a newly published post whose slug wasn't prerendered, when `/kinh-nghiem/{slug}/` is requested, then the response body holds that post's own title as the `<h1>` and its body text (status 200 alone proves nothing: unknown slugs stream a 200 soft-404 until L-01), and the sitemap and RSS list it on the next request.
- [ ] Given an archived or unpublished post, then its URL renders the localized not-found page (`noindex`) and it leaves the index, home latest guides, related guides, sitemap and RSS. The HTTP status of that not-found render stays as today (streamed 200 until L-01 fixes the soft 404).

**Data model and scripts**

- [ ] Given a new migration `0008` (`pnpm db:generate`, reviewed SQL), then:
  - `posts` gains `admin_edited_at timestamptz null` and `admin_edited_by text null`;
  - `post_translations` gains `updated_by text null`, `source_updated_at timestamptz null` and `published_at timestamptz null` (first publication of that translation, the slug lock); the migration backfills `published_at` from `posts.published_at` for translations already `published`;
  - nothing else and no FK; RLS stays on with no policies;
  - `07-data-model.md` documents the columns.
- [ ] Given `pnpm db:confirm` and a VI slug listed under `posts` whose post has `admin_edited_at` set, then it leaves that post alone and prints "skipped (edited in admin): {slug}". `pnpm db:seed` stays insert-only for posts (today's rule).

**UI, copy, boundaries, budget**

- [ ] Given the new admin screens, then they reuse the A-03 components:
  - the translation form fields, `BlockEditor` with the `about` kind (richText only), `CountedInput`, `useActionForm`, `FormField` and `SelectField`;
  - the author and route are a `SelectField`; categories are a checkbox group;
  - all errors are linked through `aria-describedby`, and focus moves to the first invalid control or the block error;
  - no new dependency, no rich-text editor, no `motion`, no Zustand, no `react-hook-form`.
- [ ] All new copy is in `messages/{vi,en}.json` under `admin.posts.*`, `admin.categories.*` and `blogPage.filter.*` / `blogPage.byline`; `pnpm i18n:check` passes.
- [ ] `pnpm check:boundaries` passes: content's admin reads are uncached functions in `modules/content/infrastructure`, and staff names come from `@/modules/auth` `listStaffNames` (admin) or the `posts.author` relation, `display_name` + `username` columns only, compared on the server; only a display name that differs from the username reaches the HTML (public). No new module direction.
- [ ] Given `/kinh-nghiem/` and `/en/guides/` (both in `data/perf-budget.json`), then their initial app JS stays within the ADR 0006 budget (framework baseline + ≤ 50 KiB gz). The filter island's growth over `main` is recorded (curl + gzip, A-02 method), and no admin code reaches those chunks; `/`, `/en/` and one route page don't grow by more than 1 KiB.

**Context docs**

- [ ] Update the context docs:
  - `03-information-architecture.md` Blog: filter (client, no URL), category chips, byline; "Not yet" reduced to cover images (A-04);
  - `05-seo-and-tracking.md`: blog filter adds no URL; author stays `Organization`;
  - `06-architecture.md`: Permissions (posts: admin + editor publish);
  - `07-data-model.md`: the columns, the confirm skip rule;
  - `08-i18n.md`: posts follow the A-03 translation workflow;
  - `10-roadmap.md`: A-03b links this spec; A-04 keeps the cover image (`posts.cover_id`, `BlogPosting.image`).

### Scope

**In scope:**

- `/admin/posts/` list, `/admin/posts/new/`, `/admin/posts/{id}/` editor, `/admin/posts/categories/`.
- Post fields: route, author, categories, publication date, status.
- Translations with `richText` blocks, "Tạo bản nháp EN", derived "EN lỗi thời" / "Cần dịch".
- Never-published deletion; category CRUD.
- Public blog filter island, category chips, byline.
- Migration `0008`, the `db:confirm` skip rule, messages, context docs.

**Out of scope:**

- Cover images and `BlogPosting.image` (A-04), and media inside posts (markdown images stay unrendered, S-09).
- Category or author pages and URLs, tag archives, `?tuyen=` query URLs (the CSV comment on row 26 stays a "could").
- Slug changes after publication and their redirects (A-08), and deleting published posts.
- Machine translation (Q-16), locales other than EN, scheduled publishing, draft preview, revision history, concurrency control.
- `categories.route_id` (left null and unused), menus, the home "latest guides" layout, route-page related-guides layout (they only pick up the new data).
- Rewriting the 4 existing posts' copy (the owner does that through this editor).

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | schema + migration | `modules/content/infrastructure/schema/blog.ts` (new columns), `db/migrations/0008_*` + `meta/*` (generated) |
| app | content: domain | `modules/content/domain/admin-post.ts`, `domain/blog.ts` (categories + author name on `BlogPostRecord`/`BlogPost`), `domain/blog-filter.ts` (pure: filter options from posts) |
| app | content: application | `application/admin-post-schemas.ts`, `application/{create-post,save-post,save-post-translation,delete-post,create-post-en-draft,save-category,delete-category}.ts`; reuse `page-blocks.ts` (`about` kind) and `domain/en-draft-slug.ts` (`pickEnDraftSlug`); **extract** the private field helpers of `admin-page-schemas.ts` (required/optional text, markup check) into a shared `application/text-fields.ts` used by pages and posts; generalise `translate-draft.ts` to a draft-fields type with optional `h1` / `excerpt` (page drafts unchanged) |
| app | content: infrastructure | `infrastructure/{admin-post-queries,post-writes,category-writes}.ts`, `infrastructure/blog-queries.ts` (categories + public author name in `listPostRecords`) |
| app | auth | `modules/auth/infrastructure/staff-names.ts` or a sibling: `listStaffAuthors()` (non-deleted profiles with id + name, for the author select), exported from `index.ts`; `listStaffNames` stays for "Sửa lần cuối" |
| app | content: actions, entries | `modules/content/actions.ts` (or a `post-actions.ts` split if it passes 200 lines), `index.ts`, `constants.ts` (limits) |
| app | content: admin UI | `modules/content/ui/admin/posts/*` (list, create form, post fields form, category picker, delete dialog, category manager), reusing `ui/admin/{translation-form,block-editor,counted-input,en-draft-button,…}` (generalised from pages where needed) |
| app | content: public UI | `modules/content/ui/blog/{blog-index-page,blog-post-card,blog-post-hero}.tsx`, new `ui/blog/blog-filter.tsx` (client island) |
| app | admin routes | `app/admin/(shell)/posts/page.tsx` (replaces `ComingSoon`), `app/admin/(shell)/posts/new/page.tsx`, `app/admin/(shell)/posts/[id]/page.tsx`, `app/admin/(shell)/posts/categories/page.tsx` |
| app | scripts | `scripts/confirm-facts.ts` (skip admin-edited posts) |
| app | i18n | `messages/vi.json`, `messages/en.json` |
| context | docs | `docs/context/{03,05,06,07,08,10}-*.md`, `specs/INDEX.md` |

### Golden-rule checks

- **Rule 1:** posts are editorial copy; staff must not type prices, transit times or unconfirmed claims. The editor shows a one-line reminder that prices come from the rate table. The 4 seeded posts were rewritten without prices (S-11).
- **Rule 4:** the index and articles keep one H1, metadata with canonical + hreflang (published translations only), `BlogPosting` / `BreadcrumbList` JSON-LD and the Zalo CTA; the filter changes none of them.
- **Rule 5:** uncached admin reads after `requireSection`; writes in actions → use case → `updateTag(POSTS_TAG)`.
- **Rule 7:** `requireSection("posts")` first everywhere.
- **Rule 8:** the filter island is measured against the blog index budget; admin code stays under `/admin`.
- **Rules 10–11:** chips are buttons with `aria-pressed` and ≥ 44 px targets; the result count is announced; labels on every input.
- **Rule 13:** the 2 legacy posts' slugs are CSV destinations and stay locked (they are published).
- **Rule 14:** only the author's display name is public; no username or e-mail.

### Dependencies & Risks

- **Depends on:**
  - A-03 (merged, app PR #41): the translation form, block editor, `translateDraft`, `pickEnDraftSlug`, field schemas;
  - A-02 shared helpers; S-11 (blog loaders, RSS, sitemap); F-05 (`profiles`).
  - No stack gap. Migrations `0006`–`0007` are applied on Supabase (owner, 2026-10-24); `0008` must be applied before deploying A-03b.
- **Blocked by questions:** Q-16 (no machine translation: the EN draft copies the VI text).
- **Risk — generalising A-03 components:** the translation form and labels were built for pages (`pageKey`, H1). Prefer a small shared core with page/post wrappers over copy-paste, and keep the A-03 page editor behaviour unchanged (re-check one page save).
- **Risk — on-demand article pages:** a post published after the build isn't in `generateStaticParams`. It must render on demand (as A-03 page slugs) and be cached under `POSTS_TAG`. Status 200 doesn't prove it (soft-404, L-01): check the post's own `<h1>` and body text.
- **Risk — filter island budget:** keep it to a few hundred bytes of logic over server-rendered cards (`data-route` / `data-categories` attributes). Don't ship the posts list as JSON.
- **Risk — display names:** `profiles.display_name` is `displayNameOf(user)` (F-05): first + last name, **else the username**. The public byline therefore compares it with `profiles.username` and hides it when they match. Staff who want a byline need a first/last name in Clerk.
- **Risk — several instances:** tag invalidation is per process (Q-15 / L-02).

### Manual Verification Plan

Owner instruction 2026-10-24 (Phase 2 admin): no CI wait, no SEO/Lighthouse, no Chrome runs by the agent. Evidence is static checks, a code walk-through, local database + `curl` checks against a production build, and Server Actions reached through the public route when no session is needed. The owner runs the signed-in browser checklist. Base URL `http://localhost:3100`. Every process uses the local Docker database:

```bash
pnpm -C 43logistics.vn db:local                      # Docker Postgres on localhost:54329, migrate + seed
LOCAL="$(43logistics.vn/scripts/db-local.sh --url)"
case "$LOCAL" in *@localhost:54329/*) ;; *) echo "not local, stop"; exit 1;; esac
DATABASE_URL_DIRECT="$LOCAL" pnpm -C 43logistics.vn db:confirm
DATABASE_URL="$LOCAL" pnpm -C 43logistics.vn build
DATABASE_URL="$LOCAL" pnpm -C 43logistics.vn start -p 3100
# one-off scripts and SQL: DATABASE_URL="$LOCAL" … / docker exec 43l-postgres psql …
```

- **Scenario:** given an editor, when they create a VI post linked to SG in category "Đóng gói", publish it and its VI translation, then `/kinh-nghiem/{slug}/` renders on the next request with the byline, the index shows it with both chips, the SG filter shows it, and its slug is now read-only.
- **Seed needs:**
  - default seed + confirm;
  - one category created by SQL before the build (VI "Đóng gói" / EN "Packing"), linked to one existing post;
  - three `profiles` rows as authors: one with a real `display_name` (≠ username), one username-only (`display_name` = `username`), one with `display_name` null;
  - four filter fixtures among the posts: SG + "Đóng gói", SG only, "Đóng gói" only, neither; and one post linked to an inactive route (e.g. `my-vn`).
- **Agent checks (recorded in the PR):**
  1. Migration SQL reviewed (four nullable columns, no FK); applied to the local database only.
  2. Pure functions by a one-off `tsx` call (printed, not committed):
     - post and category schemas on invalid input: empty title, 121-char title, 301-char excerpt, bad slug, duplicate category ids, 6 categories, `&nbsp;`;
     - the filter-options builder on four fixture posts (SG + "Đóng gói", SG only, "Đóng gói" only, neither, plus one linked to an inactive route) in each locale: expected options, order, and the visible card ids for "Tất cả", SG and "Đóng gói";
     - the public author-name rule: display name ≠ username → shown; display name = username → none; null → none;
     - `pickEnDraftSlug` against post slugs;
     - the EN draft copy keeps the excerpt (post draft fields).
  3. Build first, then: curl `/kinh-nghiem/` and `/en/guides/`.
     - Category chips appear on the linked post's card only.
     - The server HTML holds no filter bar (it mounts on the client), and every card carries `data-route` / `data-categories`.
     - The article whose author has a real display name shows "Bởi {name}". The article whose author is a username-only account shows no byline, and `grep` finds that username nowhere in its HTML.
  4. Use cases on the local database (one-off script; the admin actions need a Clerk session):
     - create a post → rows inserted with `author_id` and the draft statuses;
     - publish the post and its VI translation → `posts.published_at` and the VI `published_at` set; a VI slug change afterwards is ignored;
     - then "Tạo bản nháp EN" → the EN slug is still editable (EN `published_at` null), the excerpt was copied; a second call → exists;
     - a duplicate slug (another post's VI slug) → a `slug` field error, no row changed;
     - blocks: add a second `richText`, reorder, remove the first → the stored array matches;
     - deleting a published post → error, nothing deleted; deleting a never-published post → post, translations and `post_categories` rows gone;
     - categories: create, rename, reorder (sort persisted), delete one used by 2 posts → the action reports 2 and removes both links; a failed delete (unknown id) changes nothing;
     - a failed save (invalid field) leaves every row as before (checked by SQL).
  5. On-demand article: create and publish a new post by use case **before** the build is not allowed (it would be prerendered). Instead build first, then publish it by use case, restart `pnpm start` (the use case can't call `updateTag`), and `curl -s /kinh-nghiem/{new-slug}/` shows its unique title in the `<h1>` and a unique sentence of its body; the sitemap and `/kinh-nghiem/rss.xml` list it. Invalidation without a restart (the real Server Action) is owner checklist row 5.
  6. `pnpm db:confirm` with `admin_edited_at` set on a listed post → the skip line, row unchanged.
  7. Code walk-through:
     - `requireSection("posts")` first in every page and action;
     - `updateTag(POSTS_TAG)` only after commit;
     - the public author read maps to a name only when `display_name` ≠ `username`, and the username never reaches a component prop;
     - the filter adds no `searchParams`;
     - client islands import only client-safe files.
  8. Public JS: curl + gzip of the initial scripts of `/kinh-nghiem/`, `/en/guides/`, `/`, `/en/` and `/gui-hang-di-singapore/` vs `main`; no admin code; the blog index stays within budget.
  9. `pnpm check:redirects` against the candidate build: 0 FAIL (the 2 legacy post rows still one hop).
- **Owner checklist (Clerk dev instance, `pnpm build && pnpm start -p 3100`, private windows):**

  | # | User | Action | Expected |
  | --- | --- | --- | --- |
  | 1 | `sales` | open `/admin/posts/` and `/admin/posts/categories/`; submit a crafted save to the post action | 403 pages; the action is refused before parsing, nothing written |
  | 2 | `editor` | `/admin/posts/` | 4 posts, newest first, with route, status, paths, author, last edit |
  | 3 | `editor` | `/admin/posts/categories/`: create "Hướng dẫn" / "How-to"; rename it; move it above "Đóng gói"; delete "Đóng gói" (cancel once, then confirm) | listed; order persisted; the delete dialog names its post count; cancel keeps it; confirm removes it and its chips |
  | 4 | `editor` | "Viết bài mới": title, slug `huong-dan-thu-nghiem`, route SG, category "Đóng gói", one `richText` block; save | lands on the post editor; status draft; author = editor |
  | 5 | `editor` | with `/kinh-nghiem/`, the sitemap and the RSS already opened once (warm caches), publish the post and its VI translation; open `/kinh-nghiem/huong-dan-thu-nghiem/`, `/kinh-nghiem/`, `/sitemap.xml`, `/kinh-nghiem/rss.xml` without restarting | the article shows its own title and body and the byline (if the editor has a real display name); the index, sitemap and RSS list it; the VI slug is now read-only |
  | 6 | visitor | `/kinh-nghiem/` with the four fixtures: press SG, then "Đóng gói", then "Tất cả" (keyboard too) | SG → the SG + "Đóng gói" and SG-only cards; "Đóng gói" → the SG + "Đóng gói" and "Đóng gói"-only cards (the selection is replaced, not combined); "Tất cả" → all; `aria-pressed` follows; the count line updates; the URL never changes; no chip for the inactive route |
  | 7 | `editor` | after row 5, "Tạo bản nháp EN"; change the EN slug to `test-guide`, translate, publish EN; open `/en/guides/test-guide/` | the EN slug was editable; the EN article shows its own title; the VI page gains the EN hreflang; the EN slug is now read-only |
  | 8 | `editor` | edit VI again, open the EN tab | "EN lỗi thời" shown; saving EN clears it |
  | 9 | `editor` | try to delete the published post; create and delete a second draft post | no delete control on the published post; the draft is gone after confirming |
  | 10 | `admin` | archive the new post; open its URL | the localized not-found page (`noindex`; HTTP status as today until L-01); it leaves the index, home latest guides, sitemap and RSS on the next request |
  | 11 | `admin` | keyboard-only pass of the editor and the category manager; 360 px and 1280 px | everything reachable; focus visible; no horizontal page scroll |

- **Runtime ACs are "pending owner verification"** until the owner runs the checklist; the PR lists each one.
- **Validation commands:** `pnpm -C 43logistics.vn lint` (scoped `biome check --write <files>` for fixes), `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build`, `check:redirects` against the candidate build. No automated tests (ADR 0004). No consent matrix (consent, tracking, proxy and leads untouched).

### Implementation Hints

- **Shape (A-02/A-03):** thin actions; transactional use cases in `application/` with a row lock on `posts`; uncached admin reads; server-built labels passed to islands; `useActionForm`; translated `fieldErrors` with the `errors.invalid` fallback; `instant = false` on every admin data page.
- **Reuse, don't fork:**
  - `validatePageBlocks("about", …)` gives the richText-only rule; `pickEnDraftSlug` (domain) and `isTranslationOutdated` are pure and reusable as they are.
  - The markup regex and field builders in `admin-page-schemas.ts` are private today: extract them (one `text-fields.ts`), don't copy them.
  - `translateDraft` takes page fields with a required `h1` and no `excerpt`: widen its input type for posts.
  - If the translation form needs a slug field and an excerpt for posts, add them as optional props rather than a second form; re-check one A-03 page save after the change.
  - The author select needs every eligible staff member, which `listStaffNames(ids)` can't list: add `listStaffAuthors()` in `modules/auth`.
- **Unique-slug race:** catch the `post_tr_locale_slug_uq` / `cat_tr_locale_slug_uq` unique violation (Postgres `23505`) and map it to a slug field error.
- **Filter island:**
  - render `data-route` / `data-categories` on each card and a small client component that toggles a `hidden` attribute;
  - keep the chip labels server-built;
  - use `inert`/`hidden` so filtered cards leave the tab order.
- **Author name (public):** select it through the existing `postsRelations.author` relation (`display_name`, `username`) inside the cached `listPostRecords`. Map it in the query to `authorName: string | null` (null when missing or equal to the username), so the username never leaves the server. The profiles mirror changes rarely and the next post save refreshes it.
- **Lesson `2026-10-23-s08-lead-form`:** list every file a new prop threads through; scoped Biome, then `git status`.

### Related

- Roadmap `docs/context/10-roadmap.md` A-03b (and A-03, A-04 cover images, A-08 slug changes), Phase 2 carry-over note "A-03b (blog)"
- `docs/context/03-information-architecture.md` Blog, `05-seo-and-tracking.md` (BlogPosting, sitemap: no tag/author archives), `07-data-model.md` (posts, categories, Seed), `08-i18n.md` (Translation workflow)
- `docs/context/11-open-questions.md` Q-16
- ADR 0004, ADR 0005, ADR 0006
- S-11 blog (built on owner instruction, 43logistics.vn PR #30; no spec), `specs/feature-a03-pages-and-translations.md`, `specs/feature-a02-routes-rates-editor.md`
- `lessons/2026-10-23-s08-lead-form.md`
