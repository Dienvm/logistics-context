---
title: Fill the route pages with the owner's content
type: feature
status: implemented
owner_repo: both
roadmap: S-04b
branch: feat/s04b-route-content
implementation_pr: https://github.com/Dienvm/43logistics.vn/pull/20
implementation_commit: f84192932b99b0483208706612d84458722886d1
implemented_date: 2026-10-22
priority: must-have
blocked_by_questions: [Q-02, Q-08, Q-09]
updated: 2026-10-22
---

## Feature: Fill the route pages with the owner's content

### Problem Statement

The S-04 route pages render prices and facts, but none of the content the live site carries: why-us, notes, methods, process, goods, FAQ. Those sections are hidden because no data exists. The owner wants that content back, with a better UX, in quynam.vn's route-page structure and the S-05b look.

The source is the owner's own pages, extracted verbatim in `docs/context/legacy-copy/{gui-hang-di-*,singapore-ve-viet-nam}.md`.

### Owner decisions (in session, 2026-10-22)

**Publish as on the live site:**
- (a) "CSKH 24/7";
- (d) accepted goods including medicine, cosmetics and fresh food, per route as listed;
- (f) free home delivery and the per-route price notes (VAT, insurance fee, "đồng giá" programme).

**Defaults (not confirmed):**
- (b) no insurance or compensation promises: the claims-policy link only (Q-09);
- (c) warehouses Đà Nẵng and TP.HCM only, no Hà Nội (Q-02);
- (e) no carrier names, logos or links (Q-08).

**Always excluded**, though on the old pages (AGENTS.md §10, illegal or unverifiable):
- counterfeit goods ("hàng fake");
- unlabelled cosmetics ("kem trộn");
- links to other companies (3a.net.vn, Apple, Lazada);
- the "mua hộ trên sàn TMĐT" service (Q-22);
- placeholder testimonials ("John Doe", "Lorem ipsum");
- named reviews without consent.

**Process:** the copy is rewritten for clarity (typos fixed, no superlatives such as "tốt nhất" or "hoàn hảo"), with EN translations. Phase 1: UI first, no Codex, no Lighthouse/browser runs.

### Proposed Solution

Each route page shows, in quynam's order:
1. **Hero:** H1 with the price when shown ("Gửi hàng đi Singapore – từ 57.000 đ/kg") and the route's intro.
2. **Rate table** with a **"Lưu ý" notes box** (per-route notes).
3. **Mini calculator.**
4. **Methods & transit:** air/sea cards with each method's transit text.
5. **Process:** route-specific steps.
6. **Why 43 Logistics:** per-route icon cards (price, speed, goods, home delivery, 24/7 support).
7. **Tips:** route-specific tips where the source has them (packing for KR, sender notes for TH and MY).
8. **Goods:** accepted / refused lists from `goods_rules`.
9. **Customer chats:** the consented, blurred chat wall from home.
10. **FAQ:** from `faqs`, with FAQPage JSON-LD.
11. **Related routes**, then the closing band.

**Data:**
- **Narrative sections** are `page_translations.blocks` (typed JSON, VI + EN) per route page, seeded from `data/seed/route-content.json`. The seed fills `blocks` only while it is empty, so editor edits (A-03) are never overwritten.
- **Goods** are `goods_rules` rows (route-specific), **FAQ** is `faqs` rows (route-linked).
- Both are seeded unapproved/draft. `pnpm db:confirm` approves and publishes them for the routes listed under `routeContent` in `data/owner-confirmations.json` (the owner's record; AGENTS.md §10 requires approved per-country goods rules).

### Acceptance Criteria

- [ ] `data/seed/route-content.json` holds, for `sg, my, kr, tw, jp, th, us, sg-vn`, VI + EN blocks (`intro`, `notes`, `methods`, `process`, `whyUs`, optional `tips`), goods lists and FAQs, rewritten from the legacy copy under the owner decisions above. A Zod schema validates it; `pnpm db:seed` fails on malformed content.
- [ ] `pnpm db:seed` writes blocks only into empty `page_translations.blocks`, and inserts goods rules and FAQs for a route only when it has none. It stays idempotent.
- [ ] `pnpm db:confirm` approves those routes' goods rules (`approved_at`) and publishes their FAQs, all-or-nothing, for the routes in `routeContent`.
- [ ] The read side validates blocks (Zod): an unknown or malformed block is dropped alone (logged by page key and block type, never its content).
- [ ] The route page renders the sections above in order, and a block that is absent renders nothing. Route-specific process steps replace the generic home process; the generic steps remain the fallback.
- [ ] The H1 includes "– từ {price}" when the from-price is shown (VI and EN patterns); otherwise it is the plain pattern.
- [ ] The goods section shows approved rules only, and the FAQ shows published rows only, with FAQPage JSON-LD.
- [ ] Nothing excluded above appears anywhere in the seed or the UI (grep the JSON for "fake", "kem trộn", "3a.net", "John Doe", "Lorem").
- [ ] VI/EN parity for every UI string (`pnpm i18n:check`); no new client JS; `lint`, `typecheck`, `check:boundaries` and `build` pass; CI `verify` passes.

### Scope

**In scope:**
- the seed content file and its schema;
- seed and confirm extensions;
- the blocks read model and renderer;
- the route page section order;
- the price H1;
- reusing the chat wall on route pages;
- context notes (`01`/`11` owner decisions a, d, f; `03` as built).

**Out of scope:**
- carriers, insurance and compensation copy (Q-08, Q-09);
- a Hà Nội warehouse (Q-02);
- testimonial rows (named reviews need consent);
- admin editing of blocks (A-03);
- new photos or illustrations (lucide icons and existing photos only);
- the OG image (S-04 follow-up).

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | data | `data/seed/route-content.json` (new), `data/owner-confirmations.json` (`routeContent`) |
| app | scripts | `scripts/seed/schemas.ts`, `scripts/seed/load.ts`, `scripts/seed/write-route-content.ts` (new), `scripts/seed.ts`, `scripts/confirm-facts.ts` |
| app | module content | `domain/route-blocks.ts` (types), `infrastructure/route-blocks.ts` (Zod read model), `infrastructure/route-page-queries.ts` (blocks column), `application/load-route-page.ts` (blocks, price H1 flag), `ui/route/*` (block sections), `ui/home/chat-wall.tsx` (reuse) |
| app | page | `app/[locale]/(site)/[slug]/route-view.tsx` (H1 with price, order) |
| app | messages | `messages/{vi,en}.json` (`routePage.*` section titles, icons) |
| context | doc | `docs/context/01-business.md`, `11-open-questions.md` (a, d, f), `03-information-architecture.md` |

### Golden-rule checks

- **1:** only owner-confirmed claims (a, d, f) plus facts already verified (prices and days from the DB, never typed into the copy). Transit texts per method come from the owner's pages.
- **§10:** goods published only as owner-approved `goods_rules`; no competitor links; "24/7" only because the owner confirmed it.
- **3:** no text in images. **8:** server-rendered, no new island. **12:** CTAs through `/go`.

### Dependencies & Risks

- **Depends on:** S-04, S-06 (route-view structure), F-04 (`faqs`, `goods_rules` tables).
- **Risk:** the content is long. Keep sections scannable (cards, short lines) and avoid walls of text.
- **Risk:** blocks are a new data shape that A-03 will edit. Keep the types small and validated.

### Manual Verification Plan

Deferred to the verification step (owner, phase 1): each route page shows its own notes, methods, process and goods; an excluded term never appears; FAQ JSON-LD validates; 360/1280 layout.

**Now:** `lint`, `typecheck`, `check:boundaries`, `i18n:check`, `db:seed` + `db:confirm` on the local DB, `build`.

### Related

- `docs/context/legacy-copy/*.md`; `03` route pages; specs S-04, S-06; AGENTS.md §10.
