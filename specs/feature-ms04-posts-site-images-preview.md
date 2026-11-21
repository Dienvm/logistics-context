---
title: Target posts per company, inline images and preview
type: feature
status: approved
owner_repo: both
roadmap: MS-04
priority: must-have
blocked_by_questions: [Q-36]
updated: 2026-11-21
---

## Feature: Target posts per company, inline images and preview

### Problem Statement

`/admin/posts/` (A-03b) cannot work with the sister sites. The owner raised this on 2026-11-21.

- **No company filter.** The list reads `posts` through `currentSite` (`modules/content/infrastructure/admin-post-queries.ts:21`), and staff cannot tell which company a post belongs to. The owner reports seeing posts "of all three sites" in the list. The local checkout's query shows only `43l` rows, which cannot establish what the deployed build showed, so this stays an unverified note and does not block anything. Either way, staff need a per-company view.
- **No target company on create.** `PostValues` omits `site` (`post-writes.ts:57-78`), so every new post is `43l`. AV and GT posts are loaded only by `pnpm db:add-posts <site>` or `db:clone-site`, which needs a developer. ADR 0012 Decision 4 promises one admin with an explicit target site, and roadmap MS-04 still lists "a switcher for the site-owned sections" and "target-site validation on every read, write, ID lookup and export".
- **No images inside the text.** A post body is `richText` markdown in a plain textarea. The public renderer drops every image (`modules/content/ui/blocks/rich-text.tsx:74`, `img: () => null`; out of scope in A-03b and A-04). A photo between two paragraphs can only be placed by splitting the text into an `image` block, which the owner does not want: they want to upload a photo from their computer and get a markdown link at the cursor.
- **No preview.** A writer sees the article only after publishing it (A-03b left "draft preview" out of scope).

This spec covers the **posts and categories** part of MS-04. Pages, menus and settings get their own MS-04 spec later.

### Proposed Solution

Staff with `admin` or `editor` (`ADMIN_SECTIONS.posts`) get the following.

**1. Company filter on `/admin/posts/`**

- A "Công ty" select with the options `Tất cả · 43 Logistics · AV Logistics · GT Logistics`. It is kept in the URL (`?site=43l|av|gt`, absent = all), like the Website filter of the leads inbox (`modules/leads/ui/admin/lead-filters.tsx`).
- Every row shows its company. A copy is labelled "Bản sao của {title} (43 Logistics)", and the source shows "Có {n} bản sao".
- `/admin/posts/categories/` gets the same select, because categories are per site. In the "Tất cả" view, the create-category form has a required company field. Edit, reorder and delete act on the category's own stored site.
- The filter is a view, not a write target. Every action on an existing post or category acts on that row's own stored `site`, which never changes. `admin` and `editor` act on all three companies (owner 2026-11-21; editor scope stays open under Q-36). `sales` has no access to the posts section (`ADMIN_SECTIONS.posts`). The posts area has no export, and this spec adds none.

**2. Target company on create**

- The create form stays VI-only, as in A-03b: the EN translation is added later with "Tạo bản nháp EN". It gets a required "Đăng cho" control with these options:
  - one of 43 / AV / GT, which creates one post on that site;
  - "Cả 3 công ty", which creates one post on each of the three sites in **one transaction**: the `43l` post is the **source**, and the `av` and `gt` posts are **copies** (`posts.source_post_id` → the source).
- The category picker lists the chosen site's categories. For "Cả 3 công ty" it lists 43's categories, and each copy gets the category with the same VI slug on its own site when one exists. Otherwise the copy gets no category, and the result message names each unmatched category per site.
- Every post, copy or not, is created as a draft and published on its own (A-03b publish flow).
- The company of an existing post never changes. The editor shows it read-only.

**3. Copies and canonical**

- A copy is a full, independent post: its own slugs, status, categories and edits.
- **Canonical rule, per locale.** A copy's locale points its canonical to the source's URL on 43logistics.vn only when the source is **servable** in that locale (`isBlogPostPublished`: post published, `publishedAt` set, translation published) and **indexable** there (the existing blog robots rules on 43, including G-07 `INDEXED_LOCALES`). Otherwise that locale of the copy keeps its self canonical. When the source becomes servable and indexable later, the canonical switches to it.
- This canonical-to-43 policy for new copies is the owner's decision of 2026-11-21. It replaces Q-34's "noindex until rewritten" answer for copies created this way, and is recorded under Q-34 and in `05-seo-and-tracking.md`.
- **Indexing surfaces.** A copy locale whose canonical points to 43 is left out of its site's sitemap, `llms.txt` and IndexNow. It stays in its site's blog list and RSS, so visitors still read it.
- **Hreflang** (HTML and sitemap, `x-default` included) is built only from the copy's locales that are published **and** self-canonical, and is emitted only when that set covers every locale, following G-07. When hreflang is omitted, the language switcher keeps finding the sibling through `<meta name="locale-alternate:{locale}">` (G-07 pattern).
- **IndexNow for other sites.** A post write in the 43 admin whose post (or copy) belongs to `av` or `gt` is handed to that site's process through the existing signed `notifySites` changes channel. That process submits its own eligible paths with its own key and origin. A URL that loses eligibility is left to the next crawl, which is the existing policy (`modules/indexnow/application/submit-indexnow.ts`).
- **"Cập nhật các bản sao"** on the source's editor, behind a confirm dialog that lists every copy translation with its status.
  - It overwrites each selected copy's `title`, `excerpt`, body blocks, SEO title and description for every locale the source has, plus the post's cover and route.
  - Draft copy translations are selected by default.
  - A **published** copy translation is overwritten only when the writer ticks it for that company: "Đã đọc lại cho {company}: nội dung, ảnh bìa, tuyến đúng với công ty này". Unticked published translations are skipped and reported. The cover and route change only on copies whose published translations were all ticked or which have none.
  - It never touches a copy's slug, status or categories.
  - A locale the copy lacks is created as a draft with the source's slug. If that slug is taken on the copy's site, including through a concurrent save, the locale is skipped and reported.
- Deleting the source leaves the copies standing (`ON DELETE SET NULL`), and they become self-canonical.

**4. Insert an image into the markdown body**

- This is an opt-in on the shared controls: `MarkdownControl` and `RichText` also serve About and policy pages, which keep today's behaviour (no button, no tab, images dropped). Only the post editor and the blog article enable it.
- An "Chèn ảnh" button above each markdown textarea of a post opens the A-04 `MediaPicker`. The writer uploads a photo from the computer (WebP conversion, required alt, `POST /api/admin/media`) or picks one from the library.
- On select, `![{alt}]({public media URL})` is inserted **at the cursor position** (or replaces the selection) on its own line, and focus returns to the textarea after the inserted text.
- **One image policy.** A single parser-backed function finds image nodes in the markdown tree, so images inside code fences or inline code are text, not images. It accepts an image only when its URL matches exactly the Supabase origin of `NEXT_PUBLIC_SUPABASE_URL`, the public `media` bucket, and the stored object path of an existing `media` row. Save validation, the media usage scan, the public renderer and the preview all use that function.
- The public renderer shows accepted images with `next/image`, using the library row's width and height, the markdown alt (the library alt in the page's locale when the markdown alt is empty), lazy loading and the content width.
- At save time, any other image URL is refused, and so is a library row without width or height.
- The media library counts these images as usage, so a photo used inside a post body cannot be deleted (A-04 AC-07). Every write that introduces references locks the referenced media rows `FOR SHARE`: post translation save, "Tạo bản nháp EN", "Cả 3 công ty" create and "Cập nhật các bản sao".

**5. Preview tab**

- Each markdown body control of a post gets two tabs, `Soạn · Xem trước`. "Xem trước" renders the current, **unsaved** textarea value with the same markdown rules as the public article: headings, lists, links and library images, including images saved earlier and URLs typed by hand. There is no GFM, so no tables, as on the public site.
- A non-library image URL is shown as a marked placeholder ("Ảnh không thuộc kho media"), and no request is made to that URL.
- The preview is client-side, inside the admin only. Nothing is saved, published or exposed on a public URL.

### Acceptance Criteria

**Filter**

- [ ] **AC-01** Given posts on `43l`, `av` and `gt`, when an admin opens `/admin/posts/`, then every post of every site is listed newest first with its company. `?site=av` lists only `av` posts, the select shows "AV Logistics", and an unknown `?site=` value falls back to all without an error.
- [ ] **AC-02** Given `?site=gt` on `/admin/posts/categories/`, then the manager lists only `gt` categories. In the "Tất cả" view, creating a category without a company returns `fieldErrors.site`. Editing, reordering or deleting a `gt` category changes only that row; no other site's rows are read for the write or changed.

**Target company and copies**

- [ ] **AC-03** Given the create form, when "Đăng cho" is empty, then saving returns `fieldErrors.site` and nothing is written.
- [ ] **AC-03a** Given "Đăng cho" = `43l`, `av` or `gt` (each checked separately), when saved, then exactly one draft post on that site exists with `source_post_id` null and its VI translation.
- [ ] **AC-04** Given "Cả 3 công ty", when the post is saved, then exactly three draft posts exist: `43l` (source, `source_post_id` null), `av` and `gt` (copies pointing at the source). They have identical VI translations and route, and each has its site's same-slug categories. A category with no same-slug match leaves that copy without it, and the result message names it per site.
- [ ] **AC-05** Given "Cả 3 công ty" and a VI slug already used on **any** of the three sites, when saving, then nothing is written (`select count(*) from posts` unchanged), and the slug field shows "Slug đã dùng trên {site name}". A unique violation from a concurrent save is mapped to the same error, and the transaction rolls back all three inserts.
- [ ] **AC-06** Every action on an existing post uses the post's **own** stored `site`, read inside the transaction, not `currentSite`. This is verified separately for an `av` post opened from the 43 admin:
  - (a) the detail page loads;
  - (b) a fields save succeeds;
  - (c) a VI translation save succeeds;
  - (d) publish succeeds;
  - (e) "Tạo bản nháp EN" succeeds;
  - (f) a slug check rejects a slug taken on `av` and accepts one taken only on `43l`;
  - (g) delete succeeds.
- [ ] **AC-06a** Given an `av` post, when a request assigns a `gt` category id, then it is refused with `fieldErrors.categories` and the composite FKs never raise. A request with an unknown post id returns the existing not-found result.
- [ ] **AC-06b** Given a `sales` user, `/admin/posts/` and every post or category action are refused, as today.
- [ ] **AC-07** Given an existing post, the editor shows its company read-only, and no action accepts a `site` change.

**Canonical, hreflang and indexing**

- [ ] **AC-08** Given an `av` copy whose `43l` source is servable and indexable in VI, when `/kinh-nghiem/{copy-slug}/` renders on avlogistics.vn, then its canonical is `https://43logistics.vn/kinh-nghiem/{source-slug}/`. The copy's VI page is absent from the AV `sitemap.xml`, `llms.txt` and IndexNow submissions, and is still in the AV blog list and `/kinh-nghiem/rss.xml`. The same holds on gtlogistics.vn, and for `/en/guides/…` and `/en/guides/rss.xml` when the source is servable in EN.
- [ ] **AC-09** Given a copy whose source in that locale is not servable (post archived, `publishedAt` null, translation draft or missing) or not indexable, or whose source was deleted, then that locale of the copy has its self canonical and a sitemap entry, exactly like a non-copy post.
- [ ] **AC-09a** Given a source published in VI only and a copy published in VI and EN, then the copy's hreflang (HTML and sitemap, `x-default` included) contains only self-canonical locales and is omitted when they are not all locales (G-07). The language switcher still reaches the sibling. After the source publishes EN as well, both copy locales canonicalise to 43, and the copy emits no hreflang.
- [ ] **AC-09b** Given IndexNow configured on the AV process, when an `av` post is published from the 43 admin, then the AV process submits its own eligible URL with the AV key and origin. A copy whose canonical points to 43 is never submitted.
- [ ] **AC-10** Given a non-copy post on 43, AV and GT, its `<head>` (metadata, canonical, hreflang), JSON-LD and sitemap entry are byte-identical before and after this change, except timestamps.

**Update copies**

- [ ] **AC-11** Given a source with an `av` copy (VI draft) and a `gt` copy (VI published), when "Cập nhật các bản sao" is confirmed with defaults, then the `av` copy's VI title, excerpt, blocks, SEO title and description, cover and route equal the source's. The `gt` copy is unchanged and reported "đã đăng, chưa xác nhận". Slugs, statuses, categories and copy ids are unchanged.
- [ ] **AC-11a** Given the same, with the `gt` tick "Đã đọc lại cho GT Logistics" set, then the `gt` copy is overwritten too and stays published.
- [ ] **AC-11b** Given a source with an EN translation that a copy lacks, then the copy gets an EN draft with the source's slug. When that slug is taken on the copy's site, that locale is skipped and reported, and the rest is applied.
- [ ] **AC-11c** Every update runs in one transaction, sets `admin_edited_*`, and revalidates the post tags on every site.
- [ ] **AC-12** Given a post that is a copy or has no copies, the "Cập nhật các bản sao" button is not shown, and the action refuses it.

**Inline images**

- [ ] **AC-13** Given the cursor in the middle of a post's markdown body, when the writer uploads a photo through "Chèn ảnh" (alt filled), then `![alt](https://{supabase-host}/storage/v1/object/public/media/{path})` is inserted at the cursor on its own line, the text before and after is unchanged, and focus returns to the textarea. The same works when picking an existing library photo. With a selection, the selection is replaced.
- [ ] **AC-14** Given a published post whose body holds a library image between two paragraphs, when the article renders, then the image appears at that position as a `next/image` with width and height from the library row (no CLS), the markdown alt (library alt if empty), and `loading="lazy"`. It sits outside the heading/TOC structure, and the post still has exactly one `<h1>`.
- [ ] **AC-15** Given a body with `![x](https://example.com/a.jpg)`, a URL on another bucket, or a library URL whose media row no longer exists or has no width/height, when saving, then the save is refused with a field error naming the image line ("Chỉ dùng ảnh từ kho media"). A row deleted after save is skipped at render and logged (post id, locale), like the `image` block rule.
- [ ] **AC-15a** Given a library image URL inside a fenced code block, then saving accepts it as text, the renderer prints it as code, and the usage scan does not count it.
- [ ] **AC-16** Given a library photo used only inside a post body, when an admin opens `/admin/media/{id}/`, then the usage list shows that post and the delete is refused (A-04 AC-07). Translation save, "Tạo bản nháp EN", "Cả 3 công ty" create and "Cập nhật các bản sao" each lock the referenced media rows `FOR SHARE`, so a concurrent delete either waits and then sees the usage, or wins before the save, which is then refused under AC-15.
- [ ] **AC-16a** About and policy pages render exactly as before: their editors show no "Chèn ảnh" or preview tab, and their rendered HTML is unchanged.

**Preview**

- [ ] **AC-17** Given unsaved text with a heading, a list, a link, an image inserted in this session and one saved earlier (editor reopened), when the writer opens "Xem trước", then it renders as the public article renders that markdown, with both images visible. A hand-typed foreign image URL shows the placeholder, and the network panel shows no request to it. Switching back to "Soạn" keeps the text and the cursor position, and no request writes anything.

**Rules, budget and rollout**

- [ ] **AC-18** Every new admin action and route handler calls `requireSection("posts")` (or `"media"` for uploads). Public routes ship no new client JS: the first-party JS delta of a blog article with an inline image stays within ADR 0006 and is not above `main`'s, because images are server-rendered.
- [ ] **AC-19** The GT repo (`projects/gtlogistics.vn`) renders library images with the same policy, applies the AC-08 to AC-09b canonical, hreflang, sitemap, `llms.txt` and IndexNow rules, and has `source_post_id` in its Drizzle schema. The migration itself lives only in the 43 repo.
- [ ] **AC-20** Rollout order is stated in the PR and followed:
  1. apply `0020` on Supabase;
  2. deploy the 43/AV build and the GT build that read `source_post_id`;
  3. only then create copies.

  The 43 container's `SITE_REVALIDATE_URLS` lists the AV and GT services and `REVALIDATE_SECRET` is set. After a 43-admin publish of an `av` post, a warmed AV page shows it by the second request without a restart.

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
- The rest of MS-04: the site switcher for pages, menus and settings, and the leads/analytics, consent and export bullets.
- MS-05's admin notice when a fan-out post fails (it stays logged only).
- Site-scoped `editor` roles. `admin` and `editor` see all three companies until Q-36 is answered, and the ADR 0014 `sites` claim mechanism will then apply.
- A full-page draft preview on a public URL or `draftMode`.
- Markdown images in pages (About, info pages) and in the `excerpt`; only post bodies.
- Rewriting AV/GT copies' text for uniqueness (G-07). Copies rely on the canonical until someone rewrites them.

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | schema + migration | `modules/content/infrastructure/schema/blog.ts` (`source_post_id uuid null references posts(id) on delete set null`, index), `db/migrations/0020_*.sql` |
| app | admin queries / writes | `modules/content/infrastructure/admin-post-queries.ts`, `post-writes.ts`, `category-writes.ts` (site argument instead of `currentSite`; copy creation; update-copies) |
| app | actions | `modules/content/post-actions.ts`, `modules/content/category-actions.ts`, `modules/content/post-action-runner.ts`, `modules/content/application/admin-post-schemas.ts` (Zod `site` field, `updatePostCopiesAction` (planned), tags on every site via `shared/lib/site-tags.ts`) |
| app | domain | `modules/content/domain/admin-post.ts` (site, source, copies), `modules/content/domain/blog.ts` (`isBlogPostPublished` reused for the source), planned pure `modules/content/domain/markdown-images.ts` (mdast-based image extraction and URL policy → media ids) |
| app | admin UI | `modules/content/ui/admin/posts/admin-post-list.tsx`, `admin-post-row.tsx`, `post-create-form.tsx`, `post-fields-section.tsx`, `category-picker.tsx`, `category-form.tsx`, `admin-category-manager.tsx`, `post-translation-form.tsx`; `modules/content/ui/admin/info-block-fields.tsx` (`MarkdownControl`: opt-in textarea ref, "Chèn ảnh", tabs) |
| app | admin pages | `app/admin/(shell)/posts/page.tsx`, `app/admin/(shell)/posts/categories/page.tsx` (`searchParams.site`) |
| app | media | `modules/media/client.ts` (export `MediaPicker`), `modules/media/infrastructure/media-usage.ts` (scan markdown image URLs in `post_translations.blocks`), the media lock helper used by post saves |
| app | public render | `modules/content/ui/blocks/rich-text.tsx` (an `img` component for library URLs only, server-resolved dimensions), `modules/content/infrastructure/blog-queries.ts` (resolve body media rows; source canonical) |
| app | SEO | `modules/seo/application/blog-metadata.ts`, `modules/seo/application/page-alternates.ts`, `modules/seo/application/llms-txt.ts`, `modules/content/application/list-sitemap.ts`, `modules/content/infrastructure/sitemap-queries.ts` |
| app | IndexNow | `modules/indexnow/infrastructure/eligible-paths.ts`, `modules/indexnow/application/submit-indexnow.ts` (hand other-site post changes to their process; exclude cross-canonical copies) |
| app | config | `shared/config/site-codes.ts` (site names and production origins for all three codes, incl. `gt`) |
| app | i18n | `messages/vi.json`, `messages/en.json` (admin labels and errors) |
| GT repo | public render + SEO + schema | `projects/gtlogistics.vn/modules/content/ui/blocks/rich-text.tsx`, `modules/seo/application/blog-metadata.ts`, `modules/seo/application/llms-txt.ts`, `modules/content/application/list-sitemap.ts`, `modules/indexnow/infrastructure/eligible-paths.ts`, `modules/content/infrastructure/schema/blog.ts` |
| context | docs | `docs/context/07-data-model.md` (`source_post_id`, markdown images rule), `docs/context/05-seo-and-tracking.md` (copy canonical rule), `docs/context/11-open-questions.md` (Q-34 copy policy 2026-11-21; Q-36 posts: admin/editor all sites for now), `docs/context/10-roadmap.md` (MS-04 note), AGENTS.md §3 migration list |

### Golden-rule checks

- **Rule 1 (facts):** no business fact is added by code. A copy carries the source's prose, cover and route, which can hold 43-specific claims (name, contacts, offices). Two human gates cover it: a copy is created as a draft, and the writer publishes it only after reading it for that company; "Cập nhật các bản sao" overwrites a published copy only after the per-company tick (AC-11a). The publish and tick copy both say "kiểm tra thông tin riêng của công ty (tên, số điện thoại, văn phòng) trước khi đăng".
- **Rule 3 (no text in images):** unchanged. Inline photos are content photos, and the alt is required.
- **Rule 4:** the article keeps one `<h1>`, metadata, JSON-LD, breadcrumbs and the Zalo CTA. The canonical changes only for copies (AC-08).
- **Rule 6/7:** media id lookups stay server-only. Every action calls `requireSection`, and the post's own `site` is re-read inside the transaction (AC-06).
- **Rule 8:** no new public client JS. `next/image` with stored dimensions, lazy below the fold.
- **Rule 10:** the "Chèn ảnh" button, the tabs (Radix `Tabs`) and the select are labelled and keyboard-operable, with 44 px targets and the focus returned to the textarea after insert.
- **Rule 15:** no secret in the client. The upload keeps using the existing route handler.

### Dependencies & Risks

- **Depends on (available):** A-04's `MediaPicker` and `POST /api/admin/media` (live; spec still `in_implementation`); G-07 `INDEXED_LOCALES` and hreflang rules; `updateSiteTag` in `post-action-runner.ts`.
- **Depends on (deployment gates, AC-20):**
  - MS-05 is partial. Remote delivery needs `REVALIDATE_SECRET` and `SITE_REVALIDATE_URLS` listing **both** AV and GT, because posts are `cacheLife("max")` and a missed callback stays stale until a deploy. Failures are only logged (the admin notice is out of scope).
  - Migration `0020` must be applied on Supabase before either build that reads `source_post_id` is deployed.
- **Blocked by questions:** Q-36 (editor site scope). Until it is answered, `admin` and `editor` act on all three companies (owner 2026-11-21), and Q-36 records that for posts.
- **Unverified note:** the owner saw posts "of all three sites" in production. It is not a blocker; the implementer may compare the live list with a read-only `select site, count(*) from posts group by site` and note the result in the PR.
- **Risks:**
  - The cross-domain canonical asks Google to index 43's URL instead of the AV/GT copy, so a copy brings AV/GT no search traffic. A rewritten copy stays canonical to 43 until it is detached, which has no UI in this spec (see Implementation Hints, "Detaching a copy").
  - Replacing `currentSite` in admin post paths touches many files. Thread `site` through explicitly (lesson `2026-10-23-s08-lead-form`).
  - Migration `0020` must be applied on Supabase **before** the build that reads `source_post_id` is deployed. The local machine points at production, so the migration is rehearsed on `pnpm db:local` only.

### Manual Verification Plan

- **Database:** `pnpm db:local` (Docker Postgres 17, `localhost:54329`) with the default seed and migration `0020` run from the 43 repo. **Every** command in this plan (admin server, builds, `db:*` scripts, `psql`) is started with **both** `DATABASE_URL` and `DATABASE_URL_DIRECT` set explicitly to the URL `db:local` prints, never from `.env`, because the local `.env` points at production. Do not use `db:clone-site`: it deletes target-site rows, and the 43 checkout clones `av` only.
- **Fixtures (created through the feature itself, step 1):**
  - categories via `/admin/posts/categories/`: "Hướng dẫn" (same VI slug on 43, AV and GT) and "Chỉ 43" (on 43 only);
  - posts: one single-site post per site (AC-03a); one "Cả 3 công ty" post with both categories; on that source, an EN draft made with "Tạo bản nháp EN";
  - explicit statuses per step below.
- **Storage:** the upload writes real Supabase Storage objects (fresh UUID paths). Note each test media id. At the end, remove the fixtures' references (delete the fixture posts on `db:local`), then delete exactly those media from `/admin/media/{id}/` while the local DB still holds their rows.
- **Servers:**
  - admin: `pnpm dev:local`, at 1280 px and then 360 px;
  - public checks: production builds on `db:local`, `pnpm build && pnpm start -p 3100` (43), `NEXT_PUBLIC_SITE=av` on port 3101, and the GT repo on port 3102;
  - each build gets `NEXT_PUBLIC_SITE_URL` = its production origin, so canonical and `/llms.txt` behave as in production, with requests sent to `localhost`;
  - `INDEXNOW_ENDPOINT` points at a loopback receiver (e.g. `nc -lk 4999` or a tiny logging server) that records each payload;
  - `REVALIDATE_SECRET` and `SITE_REVALIDATE_URLS` (pointing at 3101 and 3102) are set on the 43 admin process.
- **Steps:**
  1. Create the fixture categories, including one in the "Tất cả" view without a company → `fieldErrors.site` (AC-02). Reorder and delete a GT category; `psql` shows only that row changed. `/admin/posts/?site=av` → only AV; `?site=xx` → all, no error (AC-01).
  2. `/admin/posts/new/`: empty "Đăng cho" → field error (AC-03). Create one post each for 43, AV and GT → one draft each, `source_post_id` null, company read-only in the editor (AC-03a, AC-07).
  3. Create with "Cả 3 công ty" and both categories → three drafts. The GT and AV copies have "Hướng dẫn" but not "Chỉ 43", which the message names. The list shows "Có 2 bản sao" and "Bản sao của …" (AC-04). Repeat with a VI slug used only on GT → error naming GT, `select count(*) from posts` unchanged (AC-05).
  4. On the AV single-site post, run AC-06 (a)–(g) one by one. With devtools, post a GT category id → `fieldErrors.categories` (AC-06a). Sign in as a `sales` user → `/admin/posts/` refused (AC-06b).
  5. In the source's VI body, put the cursor between two paragraphs, "Chèn ảnh" → upload a JPEG with alt → the markdown line appears at the cursor and focus is back in the textarea (AC-13). Pick an existing photo with a word selected → the selection is replaced. Save, reopen the editor.
  6. Type `![x](https://example.com/a.jpg)` → save refused with the line named. A library URL inside a ```` ``` ```` fence → accepted, rendered as code, not in usage (AC-15, AC-15a).
  7. "Xem trước" → heading, list, link, the new photo and the photo saved in step 5 render. The foreign URL shows the placeholder with no network request to it. Back to "Soạn": the text and cursor are intact; no write request (AC-17).
  8. Publish the source (VI) and the AV and GT copies (VI and EN). Then check on 3101 (AV) and 3102 (GT):
     - `/kinh-nghiem/{copy-slug}/` → canonical `https://43logistics.vn/kinh-nghiem/{source-slug}/`;
     - `/en/guides/{copy-en-slug}/` → self canonical, because the source EN is still a draft;
     - hreflang per AC-09a in the HTML and in `/sitemap.xml`;
     - `/sitemap.xml` and `/llms.txt` omit the VI copy and list the EN copy;
     - `/kinh-nghiem/` and `/kinh-nghiem/rss.xml` list the VI copy, and `/en/guides/rss.xml` lists the EN copy (AC-08, AC-09a).
  9. Publish the source EN → both copy locales canonicalise to 43, and there is no hreflang (AC-09a). Archive the source → every copy locale is self-canonical and in the sitemap. Restore it, then delete it → still self-canonical, and `source_post_id` is null (AC-09).
  10. The IndexNow receiver shows the AV process (AV key, `avlogistics.vn` origin) submitting the AV single-site post published in step 4 (positive control), and no submission of a cross-canonical copy URL (AC-09b).
  11. On 3100, the article shows the photo between the paragraphs as `<img>` with width and height and `loading="lazy"`, and has one `<h1>` (AC-14). `perf:report` (or ADR 0006's three cold mobile runs, consent rejected) on that article vs `main`: the first-party JS delta is within budget and not above `main` (AC-18).
  12. Recreate a source with copies. Edit the source → "Cập nhật các bản sao" with defaults: the draft copy is updated and the published copy is reported and unchanged (AC-11). Tick the published copy → updated, still published (AC-11a). Add an EN translation on the source whose slug is taken on GT → the GT EN is skipped and reported (AC-11b). There is no button on a copy (AC-12).
  13. `/admin/media/{id}/` for the uploaded photo → usage lists the post, and delete is refused (AC-16).
  14. Compare the `<head>`, JSON-LD and sitemap entry of an existing non-copy post on 3100, 3101 and 3102 with `main` builds on the same DB → identical except timestamps (AC-10). The About page and one policy page render HTML identical to `main`, and their editors have no "Chèn ảnh" or preview tab (AC-16a).
  15. Warm an AV page on 3101, then publish a new AV post from the 43 admin → it appears by the second request with no restart (AC-20).
  16. axe DevTools on `/admin/posts/`, `/admin/posts/new/` (tabs and picker open) and one article with an image, at 360 and 1280 px: zero serious/critical issues. Keyboard only: reach "Chèn ảnh", insert, switch tabs, tick a copy in the update dialog.
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
- **Canonical:** the copy's public query joins the source post and its translation in the same locale, applies `isBlogPostPublished` and the 43 blog robots rule, and builds `https://43logistics.vn{postPath(locale, sourceSlug)}` from the 43 production origin in `site-codes.ts`. Keep it in `"use cache"` with `POSTS_TAG`. The source's publish already fans `POSTS_TAG` out to AV/GT, so their canonical updates.
- **Image URLs:** the library public URL pattern is the `media` bucket under `NEXT_PUBLIC_SUPABASE_URL` (`/storage/v1/object/public/media/…`), already in `images.remotePatterns`. Parse with the same remark pipeline as `react-markdown` (`mdast` image nodes), never a regex or a substring search, so code fences are ignored. Compare the URL exactly to `{NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/{stored path}` and map it to the media id. For the usage scan, prefer deriving the referenced media ids at save time with that parser (e.g. inside the stored block JSON or a side column). A JSON substring search would count code-fenced URLs. Document the choice in `07`.
- **Renderer:** `RichText` stays a server component. Resolve the body's media rows in the post query (one `inArray` lookup) and pass a `Map<url, {width,height,alt}>` to an `img` component. Unknown URLs render nothing.
- **Preview:** extract the react-markdown `components` and options from `rich-text.tsx` into a shared, client-safe module so the admin tab and the public article cannot drift. The admin preview resolves library URLs through the picker's search endpoint or the URL itself (plain `<img>`, `unoptimized`), and for foreign URLs it renders the placeholder without setting `src`. The admin bundle has no ADR 0006 budget, but keep the preview lazy (`next/dynamic`) so it doesn't slow the form.
- **Cursor insert:** keep a ref on the textarea, read `selectionStart`/`selectionEnd` before opening the picker (the dialog steals focus), splice the value, then `setSelectionRange` after the inserted text on the next frame. It is a controlled `useActionState` form, so update the field state, not only the DOM.
- **"Detaching" a copy** (so a rewritten AV copy is indexed on AV): not in the UI in this spec. The writer deletes the copy and creates a single-site post, or a developer sets `source_post_id = null`. Note it as a follow-up in the PR.
- Lessons: thread new props through every file explicitly; no repo-wide `lint:fix` (`lessons/2026-10-23-s08-lead-form`); assert old strings in scripted edits (memory `scripted-edits-after-biome`); script DB writes need tag revalidation.

### Related

- Roadmap MS-04 (`docs/context/10-roadmap.md`), A-03b, A-04, MS-05, G-07.
- ADR 0012 (Decisions 1, 4, 5, 7), ADR 0014 (site scope via the `sites` claim), ADR 0006 (JS budget), ADR 0004 (verification).
- `specs/feature-a03b-blog-post-editor.md` (post editor; preview and markdown images were out of scope), `specs/feature-a04-media-library.md` (picker, usage, AC-07), `specs/feature-ms04-sales-site-scope.md` (sales scope, filter pattern), `specs/feature-g07-sister-site-dedup.md` (duplicate content, indexed locales).
- `docs/context/07-data-model.md` (site-owned tables, blocks), `docs/context/05-seo-and-tracking.md`, Q-34, Q-36.
