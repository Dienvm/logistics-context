---
title: Upload, describe and place photos from a media library
type: feature
status: approved
owner_repo: both
roadmap: A-04
priority: must-have
blocked_by_questions: []
updated: 2026-10-28
---

## Feature: Upload, describe and place photos from a media library

### Problem Statement

Trust is the site's third goal (AGENTS.md §1): real photos of the warehouse, packing and team (Q-26 answered: legacy and current photos may be used). Every image today is a static import from `public/images/`, so staff can't add or change a photo without a code change. Blog posts have no cover (`posts.cover_id` and `BlogPosting.image` were left to A-04 by A-03b). Pages have no `og:image` (`page_translations.og_image_id`, deferred by A-03). About and Contact have no photos (roadmap note under Phase 2: "A-04: About and Contact photos").

Roadmap: **A-04 Media library**: upload (sharp conversion), required alt VI/EN, usage list; the blog cover image; the `/wp-content/uploads/*` legacy URLs; the attachment-slug redirects from `data/media-inventory.csv`.

**Owner decision, 2026-10-28:** WordPress is no longer in use, so the legacy media URLs are not kept.
- `/wp-content/uploads/*` answers **410**.
- WordPress attachment-slug URLs (`/{attachment-slug}/`) get no handler. They fall to the ordinary 404.
- `?attachment_id=` → 301 `/` (F-06) stays as it is.

This reverses ADR 0001 decision 4 ("legacy `/wp-content/uploads/*` URLs are rewritten (200) to the storage bucket with the same paths"). The amendment lands with this spec's context change set.

### Proposed Solution

**Staff (`admin`, `editor`; `ADMIN_SECTIONS.media`, A-01)**

`/admin/media/` ("Thư viện ảnh") replaces `ComingSoon`.

- **Library page:** server-rendered, newest first, 48 per page (`?page=`), with search `?q=` over alt VI/EN and the original file name. Each tile shows the thumbnail, alt VI, pixel size, file size, upload date and how many places use it.
- **Upload:** pick or drop one or more files. Each file needs alt VI and alt EN (both required), with an optional caption VI/EN. The server then:
  - checks the real format (JPEG, PNG, WebP or AVIF) and the size (≤ 15 MB);
  - auto-rotates the image from its EXIF orientation and strips all metadata (EXIF/GPS);
  - converts it with sharp to one WebP master, longest edge ≤ 2560 px (never upscaled);
  - writes a 1200×630 JPEG Open Graph derivative (centre cover crop);
  - computes the width, height and a blur placeholder;
  - stores the files in Supabase Storage and inserts `media` + `media_translations` (vi, en).

  HEIC is refused, with a message telling staff to export the photo as JPEG.
- **Detail page:** `/admin/media/{id}/` shows the preview, edits alt and caption per locale, and lists every place that uses the image, each linked to its editor. Delete is allowed only when the usage list is empty, and it removes both Storage objects and the rows.
- **`MediaPicker`:** a shared admin dialog to search the library, upload a new image (the same upload rules) and choose one. It is used by:
  - the post editor: cover (`posts.cover_id`, shared by both locales);
  - the page translation form: Open Graph image (`page_translations.og_image_id`, per locale, every page type);
  - the new `image` block in the block editor.

  A-05 reuses it for `testimonials.avatar_id`.

**Content blocks**

A new block `{ type: "image", mediaId }` renders one photo at full content width, with the caption of the page's locale under it when one exists. It is allowed in:
- About (with its required richText) and blog posts (the same `about` block kind);
- **Contact**, which gets a new `contact` block kind: zero or more `image` blocks, shown as a photo section after the offices.

**Visitors**

- **Blog:** a post with a cover shows it on its card on `/kinh-nghiem/` (and `/en/…`) and in the post hero, and emits `BlogPosting.image` plus `og:image`. A post without a cover looks as it does today.
- **Pages:** a page translation with `og_image_id` emits `og:image` (+ width, height, alt). Without one, nothing is emitted (no default image until Q-11).
- **Images in general:** every image renders through `next/image` (`StaticImage` on public pages) from the public `media` bucket, with the stored width/height (no CLS) and the alt of the page's locale.

### Acceptance Criteria

- [ ] **AC-01 Access.** A signed-in `sales` user gets 403 on `/admin/media/`, `/admin/media/{id}/` and every media action or route handler. No session → `/admin/sign-in/`. `admin` and `editor` get the pages. Every media write calls `requireSection("media")` server-side (rule 7).
- [ ] **AC-02 Accepted upload.**
  - **Given** a JPEG of 4032×3024 px with EXIF orientation 6 and GPS tags (≤ 15 MB), alt VI and alt EN filled in.
  - **When** it is uploaded.
  - **Then** Storage holds `media/YYYY/MM/{uuid}-{slug}.webp`:
    - upright, longest edge 2560 px, no EXIF/GPS (checked with `exiftool` or sharp metadata);
    - `YYYY/MM` is the upload month in Asia/Ho_Chi_Minh, and `slug` comes from the original file name.
  - **And** `og/media/{id}.jpg` is exactly 1200×630.
  - **And** one `media` row has `bucket = 'media'`, the path, `mime = 'image/webp'`, the master's real `width`/`height`/`bytes` and a `blur_data_url`.
  - **And** two `media_translations` rows (vi, en) hold the alts and the captions.
  - An image smaller than 2560 px keeps its size (no upscaling).
- [ ] **AC-03 Refused upload.** Each of these is refused with a field error in Vietnamese, and nothing is written to Storage or the database:
  - a file > 15 MB;
  - a HEIC file (message: export as JPEG);
  - a `.jpg` that is really a PDF or text file (format sniffed by sharp, not by the extension or the browser's MIME);
  - an image sharp cannot decode;
  - an empty alt VI or alt EN (whitespace only counts as empty);
  - an alt over 250 characters.

  **Partial failure:**
  - if the OG upload fails after the master upload, the master is removed;
  - if the database insert fails after both uploads, both objects are removed;
  - in both cases no `media` row is written.

  If that cleanup itself fails, the error response and the server log name the exact object paths left behind, for manual removal.
- [ ] **AC-04 Library.** Given 50 images, `/admin/media/` shows 48 newest-first and `?page=2` shows the other 2. `?q=` matches alt VI, alt EN or the stored path, whose file part is the slug of the original name. The schema has no original-name column, and A-04 adds none. Matching ignores case and diacritics: `hang` finds "Kho hàng", and `KHO` finds it too. An invalid `?page` falls back to 1. Each tile shows the alt VI, pixel size, file size, date (Asia/Ho_Chi_Minh) and usage count.
- [ ] **AC-05 Usage list.** The detail page lists, with links to their editors, every:
  - post whose `cover_id` is the image;
  - page translation whose `og_image_id` is the image (page and locale);
  - page or post translation whose `blocks` contain `{ type: "image", mediaId }` for it (page or post and locale);
  - testimonial whose `avatar_id` is the image. Until A-05 ships the testimonial editor, these entries are plain text ("Testimonial" + its locale count), with no link, and still block deletion.

  An image used nowhere says so in one sentence. The library's usage count equals the length of this list.
- [ ] **AC-06 Edit text.** Saving alt VI/EN or a caption on the detail page validates the input as in AC-03. The new alt/caption appears on every public page in the usage list after the save, without a rebuild (its cache tags are updated, rule 5).
- [ ] **AC-07 Delete.** Delete is enabled only when the usage list is empty.
  - **What it removes:** the `media` row, its translations (cascade), then both Storage objects. The rows go first, so the FKs still guard them.
  - **Lock protocol:**
    - the delete transaction takes `SELECT … FOR UPDATE` on the `media` row, re-runs the usage scan, and deletes only if the scan is empty;
    - every save that writes a cover, OG image or `image` block (page translation, post, post translation) takes `SELECT … FOR SHARE` on each referenced `media` row in ascending id order, holds the locks until commit, and refuses an id that no longer exists (field error).
  - **Concurrent case:** a block save and a delete of the same image never both succeed, in either order. Either the save fails with "ảnh không còn tồn tại", or the delete fails and the page reports the image as in use.
  - **Object cleanup failure:** if deleting a Storage object fails after the rows are gone, the delete still succeeds. The server log and the result message name the exact object paths left for manual cleanup. No page references those files.
- [ ] **AC-08 Picker.** In the post editor (cover), the page translation form (OG image) and the block editor (`image` block), staff can open `MediaPicker`, search, upload a new image (AC-02/AC-03 rules apply) and choose one; the choice is saved with the form's existing action. Clearing a cover or OG image sets the column to `null`. Saving an id that doesn't exist in `media` is refused with a field error.
- [ ] **AC-09 Image block.**
  - **About and posts:** an `image` block is accepted, but at least one `richText` block is still required.
  - **Contact:** the page accepts zero or more `image` blocks and nothing else.
  - **Route, policy and other pages:** an `image` block is refused (`blockInvalid`).
  - **Public render:** each block shows one image with the alt of the page's locale and that locale's caption under it, if any.
  - **Order:** blocks render in their stored order, `richText` and `image` mixed. A post `richText → image → richText` shows the image between the two text sections. The table of contents covers the headings of every `richText` segment, and heading ids stay unique across segments. Today `load-blog.ts:69-71` joins the post's richText into one markdown and `about-page.tsx` takes richText sections only; both change.
  - **Missing image:** a block whose `mediaId` no longer exists is skipped on the public page and logged with its page/post key and block index only.
- [ ] **AC-10 Blog cover and JSON-LD.** A published post with a cover shows it on its card (both locales' index pages) and in the post hero. The hero image is the post's LCP element, so it gets `priority` and correct `sizes`. `BlogPosting.image` is the absolute URL of the cover's OG JPEG, and the post's `og:image` is the same URL with `width` 1200, `height` 630 and the locale's alt. A post without a cover keeps today's markup and emits no `image`.
- [ ] **AC-11 Page OG image.** A page translation with `og_image_id` emits `og:image` (absolute OG JPEG URL, 1200×630, locale alt) and `twitter:image` from every page type's `generateMetadata`. Without it, no `og:image` is emitted. The VI and EN translations are independent.
- [ ] **AC-12 Legacy media URLs.**
  - `GET /wp-content/uploads/2023/12/SEE_5123.webp`, `/wp-content/uploads/` and `/wp-content/uploads` each answer an empty **410** with `cache-control: public, max-age=3600`, in one hop. This includes paths with a dot in the last segment, which the `proxy.ts` matcher skips today.
  - `redirect-map.csv` row `/wp-content/uploads/*` has status 410.
  - `check:redirects` reports it PASS, and no PENDING A-04 entry remains (neither uploads nor attachment slugs).
  - Other `/wp-content/*` paths are not covered (404).
- [ ] **AC-12b Attachment slugs.**
  - **Given** the WordPress attachment-slug URL `/see_5123/` (from the `SEE_5123` file in `data/media-inventory.csv`) and `/en/see_5123/`.
  - **Then** each renders the localized 404 page with `noindex`, exactly like any unknown slug. No redirect and no media handler exist for them.
  - **Known gap:** the HTTP status of that 404 is the existing streamed-render soft-404 issue (status 200), owned by the roadmap Phase 2 note "Soft 404" and fixed before launch (L-01). A-04 does not fix it.
  - **Checker:** `check:redirects` no longer lists an attachment-slug entry. The entry is removed by owner decision, not reported as passing.
- [ ] **AC-13 Public JS and privacy.**
  - Public routes ship no new client JS. The picker, uploader and block editor stay inside `/admin`, and `perf:report` stays within the ADR 0006 budget.
  - `SUPABASE_SERVICE_ROLE_KEY` is read only in `server-only` code.
  - No public HTML contains a signed URL, a service key or a `private` bucket path.
- [ ] **AC-14 Storage configuration.** Public reads and staff writes are configured separately:
  - **Public read** needs only `NEXT_PUBLIC_SUPABASE_URL`. The Dockerfile already passes it as a build `ARG`, and it builds the URLs and `remotePatterns`.
  - **Upload and delete** need `SUPABASE_SERVICE_ROLE_KEY`, read at runtime only. It is never a build argument.
  - **(a) No `NEXT_PUBLIC_SUPABASE_URL`:**
    - the build passes;
    - Storage-backed images (covers, `image` blocks, OG) are omitted, with no broken `<img>` and no `og:image`;
    - static `public/images/` photos render unchanged;
    - `/admin/media/` says Storage isn't configured.
  - **(b) URL set, no service key:**
    - public pages show Storage images normally;
    - `/admin/media/` lists images, but upload and delete are disabled with one sentence saying the server key is missing;
    - a direct upload or delete request is refused.
- [ ] **AC-15 Buckets.** `pnpm storage:setup` creates the buckets, and a second run changes nothing:

  | Bucket | Read access | Size limit | MIME types |
  | --- | --- | --- | --- |
  | `media` | public | 15 MB | `image/webp` |
  | `og` | public | — | `image/jpeg` |
  | `private` | private | — | — |

  It never deletes a bucket or an object, and it needs `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

### Scope

**In scope:**

- Admin library, detail, upload, edit, delete and usage list (`/admin/media/`).
- The `MediaPicker` used by the cover, OG image and `image` block editors.
- The `image` block (About, posts, Contact).
- Blog covers on card and hero; `BlogPosting.image`; page and post `og:image`.
- 410 for `/wp-content/uploads/*`; closing the attachment-slug deferral.
- `pnpm storage:setup`; `sharp` and the Storage client as direct dependencies; `images.remotePatterns` for the Supabase Storage public path.
- Context updates: ADR 0001 amendment, 05, 06, 07, 09, AGENTS.md §3 *Files* row and §7.

**Out of scope:**

- Importing the 175 legacy files from `data/media-inventory.csv`, and their alt review (**C-04**).
- The testimonial edit screen and avatar on public cards (**A-05** wires `MediaPicker` to `avatar_id`).
- `proofGallery`, customer screenshots and the `private` bucket's use (A-05, with the consent gate, rule 14).
- Generated OG images with `next/og` and a default site OG image (S-10 open item; Q-11 logo).
- Images inside markdown (`![]()` stays unrendered, S-09).
- Crop and focal-point editing; replacing a file under the same id; folders or tags.
- Moving the current `public/images/` photos into Storage (they stay static imports).

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | module (new layers) | `modules/media/{domain,application,infrastructure,ui}/`, `modules/media/{index.ts,client.ts,actions.ts,constants.ts}` (only `infrastructure/schema.ts` exists) |
| app | module infrastructure | `modules/media/infrastructure/storage.ts` (server-only Storage client), `media-queries.ts`, `media-usage.ts`, `media-writes.ts` |
| app | module application | `modules/media/application/process-image.ts` (sharp), `upload-media.ts`, `save-media-text.ts`, `delete-media.ts`, `media-schemas.ts` |
| app | route handler | `app/admin/api/media/route.ts` or `app/api/admin/media/route.ts` (multipart upload, see Hints) |
| app | admin pages | `app/admin/(shell)/media/page.tsx` (replace `ComingSoon`), `app/admin/(shell)/media/[id]/page.tsx` |
| app | admin UI | `modules/media/ui/admin/{media-library,media-tile,media-uploader,media-detail,media-picker,media-usage-list}.tsx` |
| app | content blocks | `modules/content/application/info-blocks.ts` (`image` block), `page-blocks.ts` (`about` kind + new `contact` kind), `modules/content/domain/page-type-rules.ts` (`contact: "contact"`), `modules/content/ui/admin/{block-editor,block-fields,info-block-fields,initial-blocks,editable-block}.tsx/.ts`, `modules/content/ui/blocks/` (public image block) |
| app | post editor | `modules/content/application/{admin-post-schemas,save-post}.ts`, `modules/content/ui/admin/posts/post-fields-form.tsx` (cover picker) |
| app | page editor | `modules/content/application/{admin-page-schemas,save-page-translation}.ts`, `modules/content/ui/admin/translation-form*.tsx` (OG picker) |
| app | public UI | `modules/content/ui/blog/{blog-post-card,blog-post-hero,blog-post-page}.tsx`, `modules/content/application/{load-blog,load-info-page,markdown-outline}.ts` (ordered mixed blocks instead of one joined markdown; outline across segments), `modules/content/ui/blocks/{rich-text,table-of-contents}.tsx`, `modules/content/ui/info/{about-page,contact-page}.tsx`, `modules/content/infrastructure/blog-queries.ts` + info/page queries (join media + locale translation) |
| app | SEO | `modules/seo/domain/blog-posting-json-ld.ts`, `modules/seo/application/{blog-metadata,info-page-metadata,home-metadata,hub-metadata,route-metadata,calculator-metadata,goods-metadata}.ts` (shared OG helper), `modules/seo/domain/gone-paths.ts` (uploads pattern + stale comment), `modules/seo/application/redirect-rules.ts`, `scripts/redirects/plan.ts` |
| app | proxy / config | `proxy.ts` (matcher entry for `/wp-content/uploads/:path*`), `next.config.ts` (`images.remotePatterns`; upload body limit if needed) |
| app | env | `shared/config/env.server.ts` (`SUPABASE_SERVICE_ROLE_KEY`), `shared/config/env.public.ts` (`NEXT_PUBLIC_SUPABASE_URL`), `.env.example`, `deploy/env.template` |
| app | scripts / deps | `scripts/storage-setup.ts` + `package.json` (`storage:setup`, `sharp`, Storage client), `Dockerfile` (sharp in the standalone image) |
| app | data | `data/redirect-map.csv` (uploads row → 410) |
| app | messages | `messages/{vi,en}.json` (`admin.media.*`, block and picker labels) |
| context | ADR | `docs/adr/0001-initial-architecture.md` (amendment 2026-10-28 to decision 4) |
| context | docs | `docs/context/05-seo-and-tracking.md` (uploads, attachment slugs, OG, BlogPosting.image), `06-architecture.md` (planned images config, uploads rewrite line, admin media), `07-data-model.md` (buckets; `uploads/YYYY/MM` path convention; `image` block shape; `contact` block kind), `09-migration.md` (step 4 paths), `AGENTS.md` §3 *Files* + §7 |

### Golden-rule checks

- **Rules 1–3:** the library stores photos only. No price or country name is ever baked into an image (staff guidance on the upload form: "Không chèn chữ vào ảnh"). Alt text is staff-written, never generated.
- **Rule 4:** OG image, `BlogPosting.image` and metadata for pages and posts; the H1 is unchanged.
- **Rule 5:** cached queries read media with the page/post. Saves and deletes call `updateTag()` for the affected page/post tags.
- **Rules 6 and 15:** the Storage service key is server-only. Uploads go through a server route handler or action, never from the browser to Storage.
- **Rule 7:** `requireSection("media")` on every media write. The picker's search endpoint also requires a section that can edit content.
- **Rule 8:**
  - public pages stay server-rendered (`StaticImage`, no `<Image>` client chunk);
  - the hero cover uses `priority` and `sizes`;
  - images are served through the optimizer, with its cache on the `.next/cache` volume (ADR 0008).
- **Rule 10:** alt is required in both locales. The picker is a Radix dialog with labelled search; tiles are buttons with the alt as their name; targets ≥ 44 px.
- **Rule 13:** the CSV row changes to 410 by owner decision (2026-10-28, pre-launch). `check:redirects` covers it.
- **Rule 14:** EXIF/GPS is stripped. Customer screenshots are out of scope (A-05).

### Dependencies & Risks

- **Depends on:** A-01 (sections, `requireSection`), A-03 / A-03b (block editor, page and post forms), F-06 / F-07 (proxy 410 list, redirect checker). Stack gap **Files** (AGENTS.md §3, "Closed by A-04") is closed by this spec.
- **Blocked by questions:** none. Q-26 (photos may be used) is answered. Q-11 (logo) only affects a default OG image, which is out of scope.
- **Activation (owner step, not a blocker):**
  - set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` locally and in the VPS env (`deploy/env.template`);
  - run `pnpm storage:setup` once against the Supabase project.

  Until then, AC-14 applies.
- **Risk: upload body size.** The default Server Action body limit is 1 MB. Raising it globally would also raise the public lead action's limit, so use a route handler for uploads. `proxy.ts` runs on `/admin/*` and `/api/*`, and Next 16 buffers proxied request bodies up to a configurable limit. Check that limit against Next 16.4 and either set it to 16 MB or exclude the upload path from the matcher.
- **Risk: sharp in Docker.** sharp is only a transitive dependency of next today. Add it directly and confirm the standalone image loads it on the VPS architecture (L-00 Dockerfile).
- **Risk: Contact block kind.** Changing Contact from `none` to `contact` must keep its seeded empty `blocks` valid. `db:confirm` and the seed parse Contact without change.
- **Risk: JSON references.** Block references are JSON, not FKs. The lock protocol of AC-07 (`FOR UPDATE` on delete, `FOR SHARE` on reference-writing saves) closes the race, and a stale reference that slips in through the database is skipped at render (AC-09).
- **Risk: shared database.** Local dev writes to the production Supabase project and Storage (owner setup). Test uploads must be deleted after checking.

### Manual Verification Plan

Phase 2 rule (owner): static checks and a logic review by the implementer. The browser, axe and Lighthouse passes on public pages are carried to the owner and listed in the PR.

**Fixtures:**
- **Files:** a phone JPEG with EXIF orientation 6 and GPS; a PNG under 2560 px; a HEIC; a PDF renamed `.jpg`; a 16 MB JPEG.
- **Pagination:** 50 `media` rows inserted into the local Docker database (`pnpm db:local`, then `pnpm dev:local`). Their Storage objects need not exist, so broken thumbnails are expected there.
- **Content:** one draft test post, `/gioi-thieu/` / `/en/about/` and `/lien-he/` / `/en/contact/`.

**Steps.** The implementer does the code review and the local run; the owner does the browser pass.

1. **Access (AC-01):**
   - as `sales`, `GET /admin/media/` and `/admin/media/{id}/` → 403;
   - as `sales`, `curl -X POST` to the upload route handler (session cookie copied from the browser) → 403, and nothing written;
   - as `sales`, call the save-text and delete actions (replayed request) → 403;
   - as `editor` → the library opens.
2. **Accepted upload (AC-02):** upload the phone JPEG with both alts. Then check:
   - the Storage path `media/YYYY/MM/{uuid}-{slug}.webp`;
   - the 2560 px longest edge, upright orientation, and no EXIF/GPS (`exiftool` on the downloaded object);
   - `og/media/{id}.jpg` at 1200×630;
   - the `media` row and both translations.

   Then upload the PNG: its size is unchanged.
3. **Refused uploads (AC-03):** upload the HEIC, the fake `.jpg`, the 16 MB file, then the JPEG with alt EN `"  "`. Each gives its field error, and the Storage object count and `media` row count are unchanged.

   **Failure injection:** temporarily make the OG upload throw (local edit, reverted after). The master object is removed and no row is written. Then make the DB insert throw: both objects are removed.
4. **Library (AC-04):** on the local Docker database with 50 rows:
   - `/admin/media/` shows 48;
   - `?page=2` shows 2;
   - `?page=abc` shows page 1.

   On the real library:
   - `?q=hang` finds the image whose alt VI is "Kho hàng";
   - `?q=KHO` finds it too;
   - an alt EN word finds it.
5. **Picker and usage (AC-05, AC-08):** set the uploaded image as:
   - the test post's cover;
   - the `/gioi-thieu/` VI OG image;
   - an `image` block between two richText blocks on About VI;
   - an `image` block on Contact VI.

   The detail page lists all four with links, and delete is disabled. Then:
   - saving the cover with a random uuid gives a field error (AC-08);
   - adding an `image` block to a route page or a policy page is refused with `blockInvalid` (AC-09).
6. **Public render (AC-09–AC-11):**
   - `/kinh-nghiem/` card and the post hero show the cover;
   - the post's view-source has `BlogPosting.image` and `og:image` (1200×630, alt);
   - `/gioi-thieu/` shows text → image → text with the VI alt and caption, and its TOC/heading ids stay unique;
   - `/lien-he/` shows the photo section;
   - `/gioi-thieu/` `<head>` has `og:image`, and `/en/about/` has none.

   Set an OG image on one page of each remaining type (home, hub, route, calculator, goods, blog index), and confirm `og:image` in each `<head>`.
7. **Alt edit (AC-06):** edit alt VI on the detail page and reload `/gioi-thieu/`. The new alt is in the `<img>` without a rebuild.
8. **Concurrent delete (AC-07):** remove every use except the About VI block. In two tabs, start a delete and a re-save of About VI with that block. Run each order twice, using `pg_sleep` in a local transaction to hold the lock. Exactly one succeeds, and the other shows its message.
9. **Delete (AC-07):** remove all uses and delete the image. The rows and both objects are gone, and the pages still render.

   Then make an object delete throw (local edit): the delete succeeds, and the message and log name the remaining paths.
10. **Stale reference (AC-09):** put a random uuid into an About block via the local database. The page renders, the block is skipped, and one log line names the page key and block index.
11. **Legacy URLs (AC-12, AC-12b):** for each of `/wp-content/uploads/2023/12/SEE_5123.webp`, `/wp-content/uploads/` and `/wp-content/uploads`, run `curl -s -o /dev/null -w '%{http_code} %{size_download} %{redirect_url}\n' http://localhost:3100{path}` → `410 0` with no redirect, and `cache-control: public, max-age=3600`.

    `/see_5123/` and `/en/see_5123/` show the localized 404 with `noindex`; the status is whatever the L-01 soft-404 item leaves it. `pnpm check:redirects` reports no PENDING A-04 and 0 FAIL.
12. **Storage configuration (AC-14):**
    - (a) build and start without `NEXT_PUBLIC_SUPABASE_URL`: covers, blocks and OG are omitted, static photos show, and `/admin/media/` says not configured;
    - (b) URL set, no service key: public Storage images show, upload and delete are disabled, and a direct POST is refused.
13. **Buckets (AC-15):** run `pnpm storage:setup` twice. The second run reports no change.
14. **Clean up:** delete every test image, cover, OG choice and block from the shared production database and Storage.
15. **Owner (browser, AC-10, AC-13):**
    - 360/768/1280 px on the library, the picker, `/kinh-nghiem/`, a post with a cover, `/gioi-thieu/` and `/lien-he/`;
    - keyboard through the picker dialog;
    - reduced motion;
    - axe scan, 0 serious/critical;
    - Lighthouse mobile on the post with a cover and on `/gioi-thieu/`, consent rejected. Record SEO (100) and a11y (≥ 95), which are binding, plus performance, LCP, CLS and TBT vs `main` (ADR 0009), and the app JS delta from `perf:report` (≤ 50 KB gz, ADR 0006).

**AC → step matrix:**

| AC | Steps |
| --- | --- |
| 01 | 1 |
| 02 | 2 |
| 03 | 3 |
| 04 | 4 |
| 05 | 5 |
| 06 | 7 |
| 07 | 8, 9 |
| 08 | 5 |
| 09 | 5, 6, 10 |
| 10 | 6, 15 |
| 11 | 6 |
| 12 | 11 |
| 12b | 11 |
| 13 | 15 + view-source grep for `service_role` / `private/` / `token=` |
| 14 | 12 |
| 15 | 13 |

**Validation commands:** `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `build`, `i18n:check`, `check:redirects` (0 FAIL), `tokens:check`; gitleaks via the pre-commit hook. `proxy.ts` changes (matcher + 410), so the consent matrix (ADR 0004 Decision 2) is re-run for `43l_attr` on a landing URL with `gclid`; carried to the owner with step 15 if not run. No automated tests (ADR 0004).

### Implementation Hints

- **Module boundaries (ADR 0005, 07 lines 47–48):**
  - `content` may depend on `media`, but `media` depends on enums only.
  - So the usage scan, which reads posts, page translations and testimonials, lives where it may import those tables. Either put it in `media/infrastructure` with raw table imports from `@/db/schema`, as other cross-table queries do, or expose a `content` usage query that `media` consumes through a port. Pick whichever `check:boundaries` accepts, and say which in the PR.
- **Image block:** the block stores only `mediaId`. Alt and caption are read from `media_translations` for the page's locale when rendering, so an alt edit needs no block rewrite. Extend `infoBlockSchema` with `z.object({ type: z.literal("image"), mediaId: z.uuid() })`; `validatePageBlocks("about")` already serves posts (`save-post-translation.ts:48`).
- **URLs:**
  - public URL = `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}`; add the matching `images.remotePatterns` entry (06 line 86 has the planned shape).
  - `og:image` and `BlogPosting.image` need absolute URLs, and the Storage URL already is one.
- **410:** add `/^\/wp-content\/uploads(\/.*)?$/` to `GONE_PATTERNS`, and add `"/wp-content/uploads/:path*"` to the `proxy.ts` matcher, because the catch-all skips paths whose last segment has a dot. Fix the stale comment in `gone-paths.ts:2`. Set the uploads entry in `redirect-rules.ts`/`plan.ts` to checked with an expected 410 and a sample path, and remove the attachment-slug deferral.
- **Storage client:** use `@supabase/storage-js` or plain `fetch` against the Storage REST API. Either is server-only behind `import "server-only"`; prefer the smaller dependency.
- **Upload order:** process with sharp → upload master → upload OG (on failure, remove the master) → insert rows in one transaction (on failure, remove both). On delete: lock and re-scan, then delete the rows (FKs still guard them) → commit → delete the objects, logging any failed path. Locks are taken in ascending media id order and held until commit (AC-07).
- **Upload validation:** use `sharp(buffer, { limitInputPixels: … }).metadata()` to sniff the format, and keep sharp's default decompression-bomb guard.
- **Lessons:**
  - `2026-10-23-s08-lead-form`: list every file a new prop or enum value threads through (block kind, picker prop, OG field).
  - Run `biome check --write` only on changed files, and check `git status` after `lint:fix` (memory: Biome reflows files, so scripted edits can silently miss).
- **Admin reads:** server-rendered pages with URL params, like A-06/A-07. The picker's search is the only client fetch: a small `GET` route handler, or TanStack Query, which is already in the admin shell.

### Related

- Roadmap: `docs/context/10-roadmap.md` A-04 (line 58), the Phase 2 carry-over note (line 44), C-04 (line 70), L-00 media rows (line 82).
- Docs: `docs/context/07-data-model.md` (media tables, buckets, blocks), `06-architecture.md` (Storage, env, admin sections), `05-seo-and-tracking.md` (uploads, attachment slugs, OG, `BlogPosting`), `09-migration.md` (media step), `04-design-system.md` (`ImageUploader`, photo rules).
- ADRs: 0001 (decision 4, amended here), 0005 (modules), 0006 (JS budget), 0008 (VPS, image cache volume).
- Specs: `specs/feature-a03-pages-and-translations.md` (OG deferred), `specs/feature-a03b-blog-post-editor.md` (cover deferred), `specs/feature-f07-legacy-redirects-check.md` (PENDING A-04 rows), `specs/feature-l00-deployment-pipeline.md` (media rows deferred).
- Lessons: `lessons/2026-10-23-s08-lead-form.md`.
