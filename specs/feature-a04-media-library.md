---
title: Upload, describe and place photos from a media library
type: feature
status: draft
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

  If the database insert fails after the Storage upload, the uploaded objects are removed, so no orphan files remain.
- [ ] **AC-04 Library.** Given 50 images, `/admin/media/` shows 48 newest-first and `?page=2` shows the other 2. `?q=` matches alt VI, alt EN or the original file name (case- and diacritic-insensitive: `kho` finds "Kho hàng"). An invalid `?page` falls back to 1. Each tile shows the alt VI, pixel size, file size, date (Asia/Ho_Chi_Minh) and usage count.
- [ ] **AC-05 Usage list.** The detail page lists, with links to their editors, every:
  - post whose `cover_id` is the image;
  - page translation whose `og_image_id` is the image (page and locale);
  - page or post translation whose `blocks` contain `{ type: "image", mediaId }` for it (page or post and locale);
  - testimonial whose `avatar_id` is the image.

  An image used nowhere says so in one sentence. The library's usage count equals the length of this list.
- [ ] **AC-06 Edit text.** Saving alt VI/EN or a caption on the detail page validates the input as in AC-03. The new alt/caption appears on every public page in the usage list after the save, without a rebuild (its cache tags are updated, rule 5).
- [ ] **AC-07 Delete.** Delete is enabled only when the usage list is empty. It removes the `media` row, its translations (cascade) and both Storage objects. A delete that races with a new FK reference fails without deleting anything, and the page reports the image as in use.
- [ ] **AC-08 Picker.** In the post editor (cover), the page translation form (OG image) and the block editor (`image` block), staff can open `MediaPicker`, search, upload a new image (AC-02/AC-03 rules apply) and choose one; the choice is saved with the form's existing action. Clearing a cover or OG image sets the column to `null`. Saving an id that doesn't exist in `media` is refused with a field error.
- [ ] **AC-09 Image block.**
  - **About and posts:** an `image` block is accepted, but at least one `richText` block is still required.
  - **Contact:** the page accepts zero or more `image` blocks and nothing else.
  - **Route, policy and other pages:** an `image` block is refused (`blockInvalid`).
  - **Public render:** each block shows one image with the alt of the page's locale and that locale's caption under it, if any.
  - **Missing image:** a block whose `mediaId` no longer exists is skipped on the public page and logged with its page/post key and block index only.
- [ ] **AC-10 Blog cover and JSON-LD.** A published post with a cover shows it on its card (both locales' index pages) and in the post hero. The hero image is the post's LCP element, so it gets `priority` and correct `sizes`. `BlogPosting.image` is the absolute URL of the cover's OG JPEG, and the post's `og:image` is the same URL with `width` 1200, `height` 630 and the locale's alt. A post without a cover keeps today's markup and emits no `image`.
- [ ] **AC-11 Page OG image.** A page translation with `og_image_id` emits `og:image` (absolute OG JPEG URL, 1200×630, locale alt) and `twitter:image` from every page type's `generateMetadata`. Without it, no `og:image` is emitted. The VI and EN translations are independent.
- [ ] **AC-12 Legacy media URLs.**
  - `GET /wp-content/uploads/2023/12/SEE_5123.webp`, `/wp-content/uploads/` and `/wp-content/uploads` each answer an empty **410** with `cache-control: public, max-age=3600`, in one hop. This includes paths with a dot in the last segment, which the `proxy.ts` matcher skips today.
  - `redirect-map.csv` row `/wp-content/uploads/*` has status 410.
  - `check:redirects` reports it PASS, and no PENDING A-04 entry remains (neither uploads nor attachment slugs).
  - Other `/wp-content/*` paths are not covered (404).
- [ ] **AC-13 Public JS and privacy.**
  - Public routes ship no new client JS. The picker, uploader and block editor stay inside `/admin`, and `perf:report` stays within the ADR 0006 budget.
  - `SUPABASE_SERVICE_ROLE_KEY` is read only in `server-only` code.
  - No public HTML contains a signed URL, a service key or a `private` bucket path.
- [ ] **AC-14 Storage off.** Without `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`:
  - `/admin/media/` shows one sentence that Storage isn't configured, and upload/delete are disabled;
  - the build passes;
  - public pages render without images rather than failing.
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
| app | public UI | `modules/content/ui/blog/{blog-post-card,blog-post-hero}.tsx`, `modules/content/ui/info/{about-page,contact-page}.tsx`, `modules/content/infrastructure/blog-queries.ts` + info/page queries (join media + locale translation) |
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
- **Risk: JSON references.** Block references are JSON, not FKs. Deleting relies on the usage scan (AC-05/AC-07), and a stale reference is skipped at render (AC-09).
- **Risk: shared database.** Local dev writes to the production Supabase project and Storage (owner setup). Test uploads must be deleted after checking.

### Manual Verification Plan

Phase 2 rule (owner): static checks and a logic review by the implementer. The browser, axe and Lighthouse passes on public pages are carried to the owner and listed in the PR.

**Seed needs:**
- 3 test images: a phone JPEG with EXIF orientation 6 and GPS, a PNG under 2560 px, and a HEIC;
- a `.jpg` that is really a PDF;
- one published draft-safe test post;
- the About and Contact pages.

**Steps (implementer: code review and local run; owner: browser):**

1. **Access:** as `sales`, open `/admin/media/` → 403. As `editor` → the library. (AC-01)
2. **Accepted upload:** upload the JPEG with both alts. Then check:
   - the Storage object path, the 2560 px edge, upright orientation and no GPS (`exiftool` on the downloaded object);
   - the OG JPEG at 1200×630;
   - the `media` row and both translations. (AC-02)

   Upload the PNG: its size is unchanged.
3. **Refused uploads:** upload the HEIC, the fake `.jpg`, a 16 MB file and an empty alt EN. Each gives a field error, and the Storage and table counts are unchanged. (AC-03)
4. **Library:** search `kho` and an EN alt word; open `?page=2` and `?page=abc`. (AC-04)
5. **Picker and usage:** set the image as the test post's cover, as the About VI OG image, and as an `image` block on About EN and on Contact VI. Then:
   - the detail page lists all four places with links (AC-05, AC-08);
   - delete is disabled (AC-07).
6. **Public render:**
   - `/kinh-nghiem/` card and post hero show the cover;
   - view-source shows `BlogPosting.image` and `og:image` (1200×630);
   - `/en/…/about` shows the EN alt and caption;
   - `/lien-he/` shows the photo section;
   - the About VI `<head>` has `og:image` and About EN has none. (AC-09–AC-11)
7. **Alt edit:** edit alt VI, reload the About page: the new alt shows without a rebuild. (AC-06)
8. **Delete:** remove all four uses; delete is enabled; delete. The rows and both objects are gone, and the About EN page still renders. (AC-07)
9. **Stale reference:** put a random uuid in an About block via the DB. The page renders, the block is skipped, and one log line appears. (AC-09)
10. **Legacy URLs:** `curl -sI` the three `/wp-content/uploads/...` URLs from AC-12 → 410, no `Location`; `pnpm check:redirects` shows no PENDING A-04. (AC-12)
11. **Storage off:** unset both env vars, then `pnpm build` passes, `/admin/media/` shows the not-configured sentence, and public pages render. (AC-14)
12. **Buckets:** run `pnpm storage:setup` twice. The second run reports no change. (AC-15)
13. **Clean up:** delete every test image, cover, OG choice and block from the shared database.
14. **Owner (browser):**
    - 360/768/1280 px on the library, picker, `/kinh-nghiem/`, a post, About and Contact;
    - keyboard through the picker dialog;
    - an axe scan with zero serious/critical issues;
    - Lighthouse mobile on a post with a cover, consent rejected: SEO 100, a11y ≥ 95, LCP recorded vs `main`. (AC-10, AC-13)

**Validation commands:** `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `build`, `i18n:check`, `check:redirects` (0 FAIL), `tokens:check`; gitleaks via the pre-commit hook. `proxy.ts` changes (matcher + 410), so the consent matrix (ADR 0004 Decision 2) is re-run for `43l_attr` on a landing URL with `gclid`; carried to the owner with step 14 if not run. No automated tests (ADR 0004).

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
- **Upload order:** process with sharp → upload both objects → insert rows in one transaction → on a DB error, delete the objects. On delete: delete the rows (FKs block it if still used) → then the objects.
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
