---
title: Edit FAQs, goods rules, testimonials and site settings in the admin
type: feature
status: in_implementation
branch: feat/a05-a09-admin-lists-settings
implementation_pr: https://github.com/Dienvm/43logistics.vn/pull/61
owner_repo: both
roadmap: A-05, A-09
priority: must-have
blocked_by_questions: [Q-01, Q-02, Q-10, Q-12]
updated: 2026-10-28
---

## Feature: Edit FAQs, goods rules, testimonials and site settings in the admin

### Problem Statement

Four admin sections still show "Sắp có": FAQs, goods rules and testimonials (A-05), and Settings (A-09). Today their rows change only through `pnpm db:seed` / `pnpm db:confirm` or SQL:
- route FAQs (10 published);
- 75 approved goods rules;
- testimonials (none yet; the home section stays empty);
- `site_settings` (company, contact channels, offices, hours, offers, social).

Every one of them feeds a public page, and three carry a publication gate:
- goods rules publish only when approved (`approved_at`, AGENTS.md §10, Q-10);
- testimonials only with recorded consent (`consent_at`, rule 14, Q-12);
- settings only when verified (`is_verified`, rule 1).

A-08 (redirects + slug editing) is **not** in this spec (owner, 2026-10-28). It needs its own design: a runtime DB lookup before streaming, which `proxy.ts` can't do.

### Proposed Solution

Four server-rendered admin sections, built like A-03b/A-06:
- a list page;
- `new/` and `{id}/` edit pages, or one page for Settings;
- forms posting to Server Actions (`useActionForm`, Zod, `ActionState`);
- `requireSection(key)` first;
- `updateTag` of the public cache tag after the commit.

The admin is Vietnamese only. Each content form holds the VI and EN text on one page.

| Section | Path | Roles (ADMIN_SECTIONS) | Gate |
| --- | --- | --- | --- |
| FAQs | `/admin/faqs/` | admin, editor | `status` (draft / review / published) |
| Goods rules | `/admin/goods-rules/` | admin, editor | `approved_at`: only `admin` approves or withdraws |
| Testimonials | `/admin/testimonials/` | admin, editor | `consent_at` + `status = published` |
| Settings | `/admin/settings/` | admin | `is_verified` per key |

**FAQs.**
- **Target:** one route (`route_id`) or one page (`page_id`), never both and never neither.
- **Order:** `sort`; the list offers move up/down within its target.
- **Status:** draft / review / published.
- **Text:**
  - VI question and answer are required (answer is markdown ≤ 4 000);
  - EN is optional, but question and answer are both filled or both empty;
  - an empty EN deletes the EN row.
- **Delete** is allowed.
- **List:** grouped by target, with filters by target and status in the URL.

**Goods rules.**
- **Fields:** route (or "Mọi tuyến" = `route_id` null), kind (allowed / restricted / prohibited), sort, VI name (required), VI description, EN name/description (optional together, like FAQs).
- **Approval:**
  - an `admin` ticks "Đã duyệt" → `approved_at = now`, `approved_by = admin`;
  - unticking clears both;
  - an `editor` sees the box read-only;
  - an editor's save that changes the kind, route or any text of an approved rule clears the approval, so changed copy never publishes unreviewed (§10).
- **Delete** is allowed.
- **List:** filters by route, kind and approval.

**Testimonials.**
- **Fields:** name (required), location, route (optional), source (zalo / facebook / google / website / other), rating 1–5 (optional), avatar (A-04 `MediaInput`), status, VI quote (required), EN quote (optional).
- **Consent date** (`consent_at`, a calendar day, Asia/Ho_Chi_Minh): the day the customer agreed to publication. Without it, the testimonial never shows, whatever its status (rule 14). The form says so next to the status.
- **Delete** is allowed.
- **Avatar:** the save locks it `FOR SHARE` (A-04 AC-07) and an unknown id is a field error.
- **Public:** the home card shows the avatar when set (`StaticImage`, alt = the image's alt in the page's locale, small round, no client JS).

**Settings.**
- **One form per key**, on one page: company, contact, offices, hours, offers, social.
- **Write schemas** (stricter than the read schemas): required fields, `phoneE164` `+84…`, digits-only Zalo/WhatsApp ids, `HH:MM` times with `opens < closes`, unique office keys, offer percent 1–100.
- **Unknown stored fields are kept** (object keys merged; offices merged by `key`). Seed extras such as `tagline`, `country` or `isWarehouse` survive an edit.
- **"Đã xác nhận (hiện công khai)"** checkbox per key, set by the admin (the only role in this section). Saving never changes it unless the box changes.
- **Seed protection:** today `pnpm db:seed` refreshes an unverified key's value. A key saved in the admin must never be overwritten by the seed. A new nullable column `site_settings.updated_by` is set on save, and the seed skips rows where it is not null.

### Acceptance Criteria

- [ ] **AC-01 Access.** Each section page, action and form calls `requireSection` with its key first.
  - `sales` gets 403 on FAQs, goods rules, testimonials and settings.
  - `editor` gets 403 on settings.
  - No session → sign-in.
  - Approving a goods rule as `editor` (a replayed request with the approval field) is refused and writes nothing.
- [ ] **AC-02 FAQ editing.**
  - Create, edit, reorder and delete a FAQ for a route and for a page.
  - Choosing both or neither target is a field error.
  - A published FAQ appears on its route page / hub after the save without a rebuild (`updateTag(FAQS_TAG)`).
  - A draft or review FAQ does not appear.
  - EN shows only when the EN row exists.
  - Question ≤ 200 and answer ≤ 4 000 characters, no HTML in the question.
- [ ] **AC-03 Goods rule editing and approval.**
  - Create, edit and delete.
  - Only approved rules appear on route pages and `/hang-cam-gui/` (unchanged read gate).
  - An admin approval stamps `approved_at`/`approved_by` and refreshes `GOODS_TAG`.
  - An editor's save of an approved rule that changes kind, route or text clears the approval, and the rule disappears from public pages after the save.
  - An editor's save that changes only `sort` keeps it.
- [ ] **AC-04 Testimonial editing and consent.**
  - Create, edit and delete.
  - A testimonial shows on the home page only when it is published, has `consent_at` and has a quote in that locale.
  - Clearing the consent date hides it after the save (`updateTag(TESTIMONIALS_TAG)`).
  - The avatar is chosen with the A-04 picker, locked `FOR SHARE` on save, and listed in the media usage list (already scanned).
  - Rating outside 1–5 is a field error.
- [ ] **AC-05 Testimonial avatar on the home card.** With an avatar, the card shows it (48 px, round, the locale's alt, stored width/height); without one, today's markup. No new client JS on `/` and `/en/`.
- [ ] **AC-06 Settings editing.**
  - Each key's form saves alone, validated by its write schema; field errors in Vietnamese.
  - After a save, the header, footer, contact page, office band, `/go/[channel]` targets and LocalBusiness JSON-LD use the new value without a rebuild (`updateTag(SETTINGS_TAG)`), **only when the key is verified** (the existing consumer gates are unchanged).
  - Unknown stored fields survive the save.
- [ ] **AC-07 Verification gate.**
  - Ticking "Đã xác nhận" sets `is_verified = true`; unticking hides that key's facts on public pages after the save.
  - Changing a value without touching the box keeps the flag as it was.
- [ ] **AC-08 Seed never overwrites admin edits.**
  - Migration `0013` adds `site_settings.updated_by text null`.
  - Every settings save sets it to the admin's user id.
  - `pnpm db:seed` refreshes an unverified key only when `updated_by is null`. A second seed run after an admin edit leaves the value unchanged.
- [ ] **AC-09 Lists.**
  - Each list is server-rendered with its filters as URL params (an invalid param falls back to "all").
  - Each row links to its edit page.
  - Each list shows its gate state: status; approved yes/no; consent date and status; and, on Settings, verified yes/no per key.
- [ ] **AC-10 Copy and i18n.** Every new string is in `messages/vi.json` and `en.json` (`admin.faqs.*`, `admin.goodsRules.*`, `admin.testimonials.*`, `admin.settings.*`), and `pnpm i18n:check` passes.

### Scope

**In scope:** the four sections above; the testimonial avatar on the home card; migration `0013` and the seed's settings write rule; context updates (06 permissions, 07 `site_settings.updated_by`, AGENTS.md §3 *Database* row).

**Out of scope:**
- **A-08:** redirects and slug editing.
- **Testimonials:** screenshots / `proofGallery` and the `private` bucket.
- **FAQ placement:** FAQs on page types that don't render them today. Only route pages and hubs list FAQs; other pages may hold them for later.
- **Bulk import/export.**
- **Machine translation (Q-16).**
- **Confirming the facts themselves (C-01):** the admin ticks the box; the spec doesn't decide what is true.

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | admin pages | `app/admin/(shell)/{faqs,goods-rules,testimonials}/{page.tsx,new/page.tsx,[id]/page.tsx}`, `app/admin/(shell)/settings/page.tsx` |
| app | content (FAQs, testimonials) | `modules/content/application/{faq-*,testimonial-*}.ts`, `modules/content/infrastructure/{faq,testimonial}-{writes,admin-queries}.ts`, `modules/content/{faq-actions,testimonial-actions}.ts`, `modules/content/ui/admin/{faqs,testimonials}/*`, `modules/content/ui/home/testimonial-card.tsx`, `modules/content/infrastructure/home-queries.ts`, `modules/content/domain/home.ts` |
| app | goods | `modules/goods/{actions.ts,application/*,domain/*,infrastructure/{admin-queries,writes}.ts,ui/admin/*,index.ts,client.ts}` |
| app | settings | `modules/settings/{actions.ts,application/*,infrastructure/{writes,schema}.ts,ui/admin/*,index.ts,client.ts}` |
| app | db / seed | `db/migrations/0013_*.sql` + meta, `scripts/seed/write-routes.ts` (settings write rule) |
| app | messages | `messages/{vi,en}.json` |
| context | docs | `docs/context/06-architecture.md` (permissions), `07-data-model.md` (`site_settings.updated_by`, seed rule), `AGENTS.md` §3 *Database* row |

### Golden-rule checks

- **Rule 1:** settings publish only when verified, and the admin is the only role who can verify. The spec writes no fact; the forms only edit stored values.
- **§10:** goods rules publish only when approved. An editor's content change clears the approval.
- **Rule 5:** reads stay cached queries; saves call `updateTag` (`FAQS_TAG`, `GOODS_TAG`, `TESTIMONIALS_TAG`, `SETTINGS_TAG`).
- **Rule 7:** `requireSection` everywhere; the approval field is checked against the role in the action.
- **Rule 8:** public pages ship no new client JS (the avatar is `StaticImage`).
- **Rule 14:** testimonials without `consent_at` never publish; no customer identifier reaches analytics.

### Dependencies & Risks

- **Depends on:** A-01 (sections), A-04 (picker, `lockReferencedMedia`), S-04/S-06 (FAQ readers), S-12 (goods readers), S-05 (testimonial reader).
- **Risk: migration on the shared database.** `0013` is additive. Apply it before deploying the code that reads `updated_by`, with the owner's go-ahead (local = production, memory note).
- **Risk: verified settings.** Editing a verified key's value keeps it verified; that is the admin's explicit decision. The form shows "Đang hiện công khai" next to a verified key so the admin knows the edit is live.

### Manual Verification Plan

Phase-2 admin rule (owner): static checks plus a logic walk-through by the implementer; the browser pass goes to the owner.

1. **Access (AC-01):** code walk-through of every page, action and form guard. Walk through the goods approval check with an `editor` role.
2. **Pure checks (in memory):**
   - the FAQ target rule;
   - the EN both-or-neither rule;
   - the goods approval-clearing rule (which field changes clear it);
   - the settings write schemas and the merge of unknown fields (offices by key);
   - `opens < closes`.
3. **`pnpm db:local`:**
   - apply `0013`;
   - edit a setting through the action logic;
   - re-run `pnpm db:seed`: the value is unchanged (AC-08).
4. **Owner (browser, shared database):**
   - create a draft FAQ on an inactive route, publish it, check it, then delete it;
   - approve and unapprove a test goods rule;
   - create a testimonial without consent (hidden), add consent (shown), then delete it;
   - toggle the verified flag on `social` and check the footer.
   - Revert every test edit afterwards.

**Validation commands:** `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `i18n:check`, `tokens:check`, `build`, `check:redirects`. No automated tests (ADR 0004).

### Related

- Roadmap: A-05, A-09 (`docs/context/10-roadmap.md` Phase 2); A-08 left open.
- Specs: `feature-a04-media-library.md` (picker, locks), `feature-a03b-blog-post-editor.md` (admin list/editor pattern), `feature-a06-leads-inbox.md` (URL filters).
- Open questions: Q-01 (legal name), Q-02 (offices), Q-10 (goods approval), Q-12 (testimonial consent).
