---
title: Target posts per company, inline images and preview
type: feature
status: draft
owner_repo: both
roadmap: MS-04
priority: must-have
blocked_by_questions: [Q-36]
updated: 2026-11-21
---

## Feature: Target posts per company, inline images and preview

### Problem Statement

`/admin/posts/` (A-03b) cannot work with the sister sites. The owner raised this on 2026-11-21.

- **No company filter.** The list reads `posts` through `currentSite` (`modules/content/infrastructure/admin-post-queries.ts:21`), and the staff running it cannot tell which company a post belongs to. The owner reports seeing posts "of all three sites" in the list. The code shows only `43l` rows, so those were 43 posts about AV/GT topics, or the reading needs confirming (see Dependencies). Either way, staff need a per-company view.
- **No target company on create.** `PostValues` omits `site` (`post-writes.ts:57-78`), so every new post is `43l`. AV and GT posts are loaded only by `pnpm db:add-posts <site>` or `db:clone-site`, which needs a developer. ADR 0012 Decision 4 promises one admin with an explicit target site, and roadmap MS-04 still lists "a switcher for the site-owned sections" and "target-site validation on every read, write, ID lookup and export".
- **No images inside the text.** A post body is `richText` markdown in a plain textarea. The public renderer drops every image (`modules/content/ui/blocks/rich-text.tsx:74`, `img: () => null`; out of scope in A-03b and A-04). A photo between two paragraphs can only be placed by splitting the text into an `image` block, which the owner does not want: they want to upload a photo from their computer and get a markdown link at the cursor.
- **No preview.** A writer sees the article only after publishing it (A-03b left "draft preview" out of scope).

This spec covers the **posts and categories** part of MS-04. Pages, menus and settings get their own MS-04 spec later.

### Proposed Solution

Staff with `admin` or `editor` (`ADMIN_SECTIONS.posts`) get the following.

**1. Company filter on `/admin/posts/`**

- A "Công ty" select with the options `Tất cả · 43 Logistics · AV Logistics · GT Logistics`. It is kept in the URL (`?site=43l|av|gt`, absent = all), like the Website filter of the leads inbox (`modules/leads/ui/admin/lead-filters.tsx`).
- Every row shows its company. A copy is labelled "Bản sao của {title} (43 Logistics)", and the source shows "Có {n} bản sao".
- `/admin/posts/categories/` gets the same select, because categories are per site.

**2. Target company on create**

- The create form gets a required "Đăng cho" control with these options:
  - one of 43 / AV / GT, which creates one post on that site;
  - "Cả 3 công ty", which creates one post on each of the three sites in **one transaction**: the `43l` post is the **source**, and the `av` and `gt` posts are **copies** (`posts.source_post_id` → the source).
- The category picker lists the chosen site's categories. For "Cả 3 công ty" it lists 43's categories, and each copy gets the category with the same VI slug on its own site when one exists, otherwise none.
- Every post, copy or not, is created as a draft and published on its own (A-03b publish flow).
- The company of an existing post never changes. The editor shows it read-only.

**3. Copies and canonical**

- A copy is a full, independent post: its own slugs, status, categories and edits.
- On the copy's public article, while the source has a **published** translation in the same locale, the canonical is the **source's URL on 43logistics.vn**. Otherwise the copy keeps its self canonical, and once the source publishes that locale the canonical switches to it.
- A copy whose canonical points to 43 is left out of its site's sitemap, `llms.txt` and IndexNow, and emits no hreflang. It stays in its site's blog list and RSS, so visitors still read it.
- **"Cập nhật các bản sao"** on the source's editor, behind a confirm dialog listing the copies. It overwrites each copy's `title`, `excerpt`, body blocks, SEO title and description for every locale the source has, plus the post's cover and route.
  - It never touches a copy's slug, status or categories.
  - A locale the copy lacks is created as a draft with the source's slug. If that slug is taken on the copy's site, the locale is skipped and reported.
- Deleting the source leaves the copies standing (`ON DELETE SET NULL`), and they become self-canonical.

**4. Insert an image into the markdown body**

- An "Chèn ảnh" button above each markdown textarea of a post opens the A-04 `MediaPicker`. The writer uploads a photo from the computer (WebP conversion, required alt, `POST /api/admin/media`) or picks one from the library.
- On select, `![{alt}]({public media URL})` is inserted **at the cursor position** (or replaces the selection) on its own line, and focus returns to the textarea after the inserted text.
- The public renderer shows markdown images **only** when their URL is a public object in our own `media` bucket. It renders them with `next/image`, using the library row's width and height, the markdown alt (the library alt when the markdown alt is empty), lazy loading and the content width. Any other image URL is refused at save time.
- The media library counts these images as usage, so a photo used inside a post body cannot be deleted (A-04 AC-07).

**5. Preview tab**

- Each markdown body control gets two tabs, `Soạn · Xem trước`. "Xem trước" renders the current, **unsaved** textarea value with the same markdown rules as the public article: headings, lists, links, tables and the inserted images.
- The preview is client-side, inside the admin only. Nothing is saved, published or exposed on a public URL.

### Acceptance Criteria

**Filter**

- [ ] **AC-01** Given posts on `43l`, `av` and `gt`, when an admin opens `/admin/posts/`, then every post of every site is listed newest first with its company. `?site=av` lists only `av` posts, the select shows "AV Logistics", and an unknown `?site=` value falls back to all without an error.
- [ ] **AC-02** Given `?site=gt` on `/admin/posts/categories/`, the manager lists, creates and edits only `gt` categories. A category save on one site never reads or changes another site's rows.

**Target company and copies**

- [ ] **AC-03** Given the create form, when "Đăng cho" is empty, then saving returns a `fieldErrors.site` message and nothing is written. When it is `av`, then one `av` post (draft) is created with `source_post_id` null.
- [ ] **AC-04** Given "Cả 3 công ty", when the post is saved, then exactly three draft posts exist: `43l` (source, `source_post_id` null), `av` and `gt` (copies pointing at the source). They have identical translations and route, and each has its site's same-slug categories.
- [ ] **AC-05** Given "Cả 3 công ty" and a VI or EN slug already used on **any** of the three sites, when saving, then nothing is written, and the slug field shows "Slug đã dùng trên {site name}".
- [ ] **AC-06** Given any admin post read, write, publish, delete, EN draft, category assignment or slug check by post id, then it uses the post's **own** stored `site`, not `currentSite`. A request whose category id belongs to another site is refused (`fieldErrors.categories`), and the composite FKs never raise.
- [ ] **AC-07** Given an existing post, the editor shows its company read-only, and no action accepts a `site` change.

**Canonical**

- [ ] **AC-08** Given an `av` copy whose `43l` source has a published VI translation, when `/kinh-nghiem/{copy-slug}/` renders on avlogistics.vn, then its canonical is `https://43logistics.vn/kinh-nghiem/{source-slug}/`. It has no hreflang link, and the copy is absent from the AV `sitemap.xml`, `llms.txt` and IndexNow submissions. It is still in the AV blog list and RSS. The same holds on gtlogistics.vn and for `/en/guides/…`.
- [ ] **AC-09** Given a copy whose source translation in that locale is a draft or missing, or whose source was deleted, then the copy has its self canonical, hreflang per G-07, and a sitemap entry, exactly like a non-copy post.
- [ ] **AC-10** Given a non-copy post on any site, its metadata, sitemap entry and JSON-LD are byte-identical before and after this change, except timestamps.

**Update copies**

- [ ] **AC-11** Given a source with two copies, when "Cập nhật các bản sao" is confirmed, then each copy's title, excerpt, blocks, SEO title and description (every source locale), cover and route equal the source's. Slugs, statuses and categories are unchanged, and the result message names each copy updated and each locale skipped (slug taken). It runs in one transaction, sets `admin_edited_*`, and revalidates the post tags on every site.
- [ ] **AC-12** Given a post that is a copy or has no copies, the "Cập nhật các bản sao" button is not shown, and the action refuses it.

**Inline images**

- [ ] **AC-13** Given the cursor in the middle of a post's markdown body, when the writer uploads a photo through "Chèn ảnh" (alt filled), then `![alt](https://{supabase-host}/storage/v1/object/public/media/{path})` is inserted at the cursor on its own line, the text before and after is unchanged, and focus returns to the textarea. The same works when picking an existing library photo. With a selection, the selection is replaced.
- [ ] **AC-14** Given a published post whose body holds a library image between two paragraphs, when the article renders, then the image appears at that position as a `next/image` with width and height from the library row (no CLS), the markdown alt (library alt if empty), and `loading="lazy"`. It sits outside the heading/TOC structure, and the post still has exactly one `<h1>`.
- [ ] **AC-15** Given a body with `![x](https://example.com/a.jpg)`, or a library URL whose media row no longer exists, when saving, then the save is refused with a field error naming the image line ("Chỉ dùng ảnh từ kho media"). A row deleted after save is skipped at render and logged (post id, locale), like the `image` block rule.
- [ ] **AC-16** Given a library photo used only inside a post body, when an admin tries to delete it in `/admin/media/`, then the usage list shows that post and the delete is refused (A-04 AC-07). The post save locks the referenced media rows `FOR SHARE`, like covers and `image` blocks.

**Preview**

- [ ] **AC-17** Given unsaved text with a heading, a list, a link and an inserted image, when the writer opens "Xem trước", then it renders as the public article renders that markdown, with the image visible. Switching back to "Soạn" keeps the text and the cursor position. No request writes anything.

**Rules and budget**

- [ ] **AC-18** Every new admin action and route handler calls `requireSection("posts")` (or `"media"` for uploads). Public routes ship no new client JS: the blog article's first-party JS delta is unchanged (ADR 0006), because images are server-rendered.
- [ ] **AC-19** The GT repo (`projects/gtlogistics.vn`) renders library images, applies the AC-08/AC-09 canonical and sitemap rule and has the `source_post_id` column in its Drizzle schema. The migration itself lives only in the 43 repo.

### Scope

**In scope:**

- Company filter and column on the posts list and on the categories manager.
- "Đăng cho" on create, the "Cả 3 công ty" copies, `posts.source_post_id` (additive migration), cross-domain canonical and the sitemap, `llms.txt`, IndexNow and hreflang exclusions for copies.
- "Cập nhật các bản sao".
- Target-site validation for every admin post and category path.
- "Chèn ảnh" with upload or library pick, cursor insertion, the public image rendering of library URLs, the save-time refusal of foreign URLs, and media usage plus locks.
- The `Soạn · Xem trước` tab.
- Port of the public parts to the GT repo.

**Out of scope:**

- Changing an existing post's company, or a "copy to another company" action on an existing post (owner 2026-11-21).
- Drag-and-drop or paste of images into the textarea; only the "Chèn ảnh" button (owner 2026-11-21).
- Automatic sync of copies; only the manual "Cập nhật các bản sao".
- The site switcher for pages, menus and settings (rest of MS-04).
- Site-scoped `editor` roles. `admin` and `editor` see all three companies until Q-36 is answered, and the ADR 0014 `sites` claim mechanism will then apply.
- A full-page draft preview on a public URL or `draftMode`.
- Markdown images in pages (About, info pages) and in the `excerpt`; only post bodies.
- Rewriting AV/GT copies' text for uniqueness (G-07). Copies rely on the canonical until someone rewrites them.

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | schema + migration | `modules/content/infrastructure/schema/blog.ts` (`source_post_id uuid null references posts(id) on delete set null`, index), `db/migrations/0020_*.sql` |
| app | admin queries / writes | `modules/content/infrastructure/admin-post-queries.ts`, `post-writes.ts`, `category-writes.ts` (site argument instead of `currentSite`; copy creation; update-copies) |
| app | actions | `modules/content/actions.ts`, `modules/content/post-action-runner.ts` (Zod `site` field, `updatePostCopiesAction`, tags on every site via `shared/lib/site-tags.ts`) |
| app | domain | `modules/content/domain/admin-post.ts` (site, source, copies), a pure `markdown-images.ts` (extract and validate image URLs → media ids) |
| app | admin UI | `modules/content/ui/admin/posts/admin-post-list.tsx`, `admin-post-row.tsx`, `post-create-form.tsx`, `post-fields-section.tsx`, `category-picker.tsx`, `admin-category-manager.tsx`, `post-translation-form.tsx`; `modules/content/ui/admin/info-block-fields.tsx` (`MarkdownControl`: textarea ref, "Chèn ảnh", tabs) |
| app | admin pages | `app/admin/(shell)/posts/page.tsx`, `categories/page.tsx` (`searchParams.site`) |
| app | media | `modules/media/client.ts` (export `MediaPicker`), `modules/media/infrastructure/media-usage.ts` (scan markdown image URLs in `post_translations.blocks`), the media lock helper used by post saves |
| app | public render | `modules/content/ui/blocks/rich-text.tsx` (an `img` component for library URLs only, server-resolved dimensions), `modules/content/infrastructure/blog-queries.ts` (resolve body media rows; source canonical) |
| app | SEO | `modules/seo/application/blog-metadata.ts`, `page-alternates.ts`, `modules/content/infrastructure/sitemap-queries.ts`, the `llms.txt` and IndexNow post sources |
| app | config | `shared/config/site-codes.ts` (site names and production origins for all three codes, incl. `gt`) |
| app | i18n | `messages/vi.json`, `messages/en.json` (admin labels and errors) |
| GT repo | public render + SEO + schema | `projects/gtlogistics.vn/modules/content/ui/blocks/rich-text.tsx`, `modules/seo/application/blog-metadata.ts`, sitemap/llms/IndexNow sources, `schema/blog.ts` |
| context | docs | `docs/context/07-data-model.md` (`source_post_id`, markdown images rule), `docs/context/05-seo-and-tracking.md` (copy canonical rule), `docs/context/10-roadmap.md` (MS-04 note), AGENTS.md §3 migration list |

### Golden-rule checks

- **Rule 1 (facts):** no business fact is added. A copy carries the source's text, which already passed the writer's review. A copy may name 43 Logistics on the AV/GT site, so the writer reviews copies before publishing them (manual step, noted in the confirm dialog copy).
- **Rule 3 (no text in images):** unchanged. Inline photos are content photos, and the alt is required.
- **Rule 4:** the article keeps one `<h1>`, metadata, JSON-LD, breadcrumbs and the Zalo CTA. The canonical changes only for copies (AC-08).
- **Rule 6/7:** media id lookups stay server-only. Every action calls `requireSection`, and the post's own `site` is re-read inside the transaction (AC-06).
- **Rule 8:** no new public client JS. `next/image` with stored dimensions, lazy below the fold.
- **Rule 10:** the "Chèn ảnh" button, the tabs (Radix `Tabs`) and the select are labelled and keyboard-operable, with 44 px targets and the focus returned to the textarea after insert.
- **Rule 15:** no secret in the client. The upload keeps using the existing route handler.

### Dependencies & Risks

- **Depends on:**
  - A-04 media library (`MediaPicker`, `POST /api/admin/media`, usage scan). Its spec is `in_implementation`, but the picker is live.
  - MS-05 fan-out (`updateSiteTag`). The 43 container's `SITE_REVALIDATE_URLS` must include the **GT** service, or GT shows a new post only within its cache lifetime. Check the VPS env at deploy (owner step).
  - G-07 `INDEXED_LOCALES` and hreflang rules (AC-09).
- **Blocked by questions:** Q-36 (editor site scope). Until it is answered, `admin` and `editor` act on all three companies.
- **To confirm with the owner:** the "posts of all three sites" reading. Production `/admin/posts/` runs the 43 build, whose query shows `43l` rows only. The implementer checks the live list against `select site, count(*) from posts group by site` (read-only) and records the answer in the PR.
- **Risks:**
  - The cross-domain canonical asks Google to index 43's URL instead of the AV/GT copy, so a copy brings AV/GT no search traffic. A rewritten copy stays canonical to 43 until it is detached, which has no UI in this spec (see Implementation Hints, "Detaching a copy").
  - Replacing `currentSite` in admin post paths touches many files. Thread `site` through explicitly (lesson `2026-10-23-s08-lead-form`).
  - Migration `0020` must be applied on Supabase **before** the build that reads `source_post_id` is deployed. The local machine points at production, so the migration is rehearsed on `pnpm db:local` only.

### Manual Verification Plan

- **Seed needs:** `pnpm db:local` (Docker Postgres) with the default seed, plus `pnpm db:clone-site av` and `gt` on the local DB so all three sites have posts and categories. Every admin write in this plan runs against `db:local` (`pnpm dev:local`), never production. The upload step writes real Supabase Storage objects; delete the test photos from `/admin/media/` afterwards.
- **Steps (`pnpm dev:local`, admin signed in, 1280 px, then 360 px):**
  1. `/admin/posts/`: all three companies appear with their labels. `?site=av` → only AV. `?site=xx` → all, no error (AC-01). `/admin/posts/categories/?site=gt` → only GT categories; create one (AC-02).
  2. `/admin/posts/new/`: save with "Đăng cho" empty → field error (AC-03). Create with "AV Logistics" → one AV draft, editor shows the company read-only (AC-03, AC-07).
  3. Create with "Cả 3 công ty" and a category that exists on all sites → three drafts, the list shows the source with "Có 2 bản sao" and the copies with "Bản sao của …" (AC-04). Repeat with a VI slug already used on GT → error naming GT, `select count(*)` unchanged (AC-05).
  4. With devtools, post the update action with a GT category id for an AV post → `fieldErrors.categories` (AC-06).
  5. In the source's VI body, put the cursor between two paragraphs, "Chèn ảnh" → upload a JPEG with alt → the markdown line appears at the cursor, and focus is back in the textarea (AC-13). Pick an existing photo with a word selected → selection replaced.
  6. Type `![x](https://example.com/a.jpg)` → save refused with the line named (AC-15).
  7. "Xem trước" → heading, list, link and both photos render. Back to "Soạn": the text and cursor are intact; the network tab shows no write (AC-17).
  8. Publish the source and the AV copy (VI). `NEXT_PUBLIC_SITE=av pnpm dev:local` (or an AV build): the copy's article has canonical `https://43logistics.vn/kinh-nghiem/{slug}/` and no hreflang. `/sitemap.xml` and `/llms.txt` omit it, and `/kinh-nghiem/` and the RSS list it (AC-08). Unpublish the source's VI → the copy is self-canonical and in the sitemap (AC-09).
  9. On the 43 build, the article shows the photo between the paragraphs with width and height attributes. Lighthouse CLS is unchanged, and there is one `<h1>` (AC-14).
  10. Edit the source title and body → "Cập nhật các bản sao" → confirm. The AV and GT copies show the new text with unchanged slugs and statuses, and the message lists both (AC-11). The button is absent on a copy (AC-12).
  11. `/admin/media/`: the uploaded photo lists the post under usage, and delete is refused (AC-16).
  12. Compare `/kinh-nghiem/{existing-post}/` HTML head, `/sitemap.xml` and `/llms.txt` on 43 with `main` → identical except timestamps (AC-10).
  13. GT repo against `db:local` with `NEXT_PUBLIC_SITE=gt`: repeat steps 8 and 9 for the GT copy (AC-19).
  14. axe DevTools on `/admin/posts/`, `/admin/posts/new/` (tabs and picker open) and one article with an image, at 360 and 1280 px: zero serious/critical issues. Keyboard only: reach "Chèn ảnh", insert, switch tabs.
- **Validation commands:**
  - `pnpm -C projects/43logistics.vn lint`, `typecheck`, `build`, `i18n:check`, `check:boundaries` and `check:redirects`;
  - the same `lint`, `typecheck` and `build` in `projects/gtlogistics.vn`;
  - the migration rehearsed with `pnpm db:local` (apply, re-run seed idempotently);
  - `perf:report` on the blog article route (label `lighthouse`), JS delta unchanged (AC-18).

  No automated tests (ADR 0004).

### Implementation Hints

- **Site source of truth in the admin:**
  - list filter = `searchParams.site` parsed with `isSiteCode` from `shared/config/site-codes.ts`;
  - writes by id = `select site from posts where id = $1 for update` inside the transaction, then pass that site to every child write (translations, `post_categories`, slug checks);
  - creates = the validated "Đăng cho" value.

  `currentSite` stays only in public queries.
- **Slug check:** `post_tr_site_locale_slug_uq (site, locale, slug)`. For "Cả 3 công ty", check all three sites first, then insert, and map a unique violation (`unique-violation.ts`) back to the site name in case of a race.
- **Copy migration:** `source_post_id` is a plain FK to `posts(id)` (no site in the key, since copies are cross-site by design) with `ON DELETE SET NULL`, plus an app-level guard: source and copy sites differ, a source has `source_post_id` null (one level), and at most one copy per site per source (partial unique index `(source_post_id, site)`).
- **Canonical:** the copy's public query joins the source translation in the same locale (`status = 'published'`) and builds `https://43logistics.vn{postPath(locale, sourceSlug)}` from the 43 production origin in `site-codes.ts`. Keep it in `"use cache"` with `POSTS_TAG`. The source's publish already fans `POSTS_TAG` out to AV/GT, so their canonical updates.
- **Image URLs:** the library public URL pattern is the `media` bucket under `NEXT_PUBLIC_SUPABASE_URL` (`/storage/v1/object/public/media/…`), already in `images.remotePatterns`. Extract the media id from the path with a pure function shared by the save validation, the usage scan and the renderer. The usage scan for markdown can use `position(… in blocks::text)` on `post_translations.blocks`, or a stored `media_ids` derivation at save time. Pick the cheaper one and document it in `07`.
- **Renderer:** `RichText` stays a server component. Resolve the body's media rows in the post query (one `inArray` lookup) and pass a `Map<url, {width,height,alt}>` to an `img` component. Unknown URLs render nothing.
- **Preview:** extract the react-markdown `components` and options from `rich-text.tsx` into a shared, client-safe module so the admin tab and the public article cannot drift. The admin preview uses plain `<img>` with the picker's known dimensions or `unoptimized`. The admin bundle has no ADR 0006 budget, but keep the preview lazy (`next/dynamic`) so it doesn't slow the form.
- **Cursor insert:** keep a ref on the textarea, read `selectionStart`/`selectionEnd` before opening the picker (the dialog steals focus), splice the value, then `setSelectionRange` after the inserted text on the next frame. It is a controlled `useActionState` form, so update the field state, not only the DOM.
- **"Detaching" a copy** (so a rewritten AV copy is indexed on AV): not in the UI in this spec. The writer deletes the copy and creates a single-site post, or a developer sets `source_post_id = null`. Note it as a follow-up in the PR.
- Lessons: thread new props through every file explicitly; no repo-wide `lint:fix` (`lessons/2026-10-23-s08-lead-form`); assert old strings in scripted edits (memory `scripted-edits-after-biome`); script DB writes need tag revalidation.

### Related

- Roadmap MS-04 (`docs/context/10-roadmap.md`), A-03b, A-04, MS-05, G-07.
- ADR 0012 (Decisions 1, 4, 5, 7), ADR 0014 (site scope via the `sites` claim), ADR 0006 (JS budget), ADR 0004 (verification).
- `specs/feature-a03b-blog-post-editor.md` (post editor; preview and markdown images were out of scope), `specs/feature-a04-media-library.md` (picker, usage, AC-07), `specs/feature-ms04-sales-site-scope.md` (sales scope, filter pattern), `specs/feature-g07-sister-site-dedup.md` (duplicate content, indexed locales).
- `docs/context/07-data-model.md` (site-owned tables, blocks), `docs/context/05-seo-and-tracking.md`, Q-34, Q-36.
