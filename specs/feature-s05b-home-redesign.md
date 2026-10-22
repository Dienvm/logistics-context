---
title: Redesign the home page with confirmed owner facts and motion
type: feature
status: implemented
owner_repo: both
roadmap: S-05b
branch: feat/S-05b-home-redesign
implementation_pr: https://github.com/Dienvm/43logistics.vn/pull/15
implementation_commit: caf3a0c0b5487f61bc6c75bbc78ead2c5cc68c5f
implemented_date: 2026-10-22
priority: must-have
blocked_by_questions: [Q-01, Q-02, Q-03, Q-04, Q-08, Q-11, Q-23]
updated: 2026-10-22
---

## Feature: Redesign the home page with confirmed owner facts and motion

### Problem Statement

The S-05 home (app PR #14) was functionally correct but thin in production: every fact was unverified, so the page showed a headline, one photo and "Liên hệ" cards. The owner found it plain, weak for SEO and less convincing than the old site, quynam.vn's structure, or a Lovable reference. The owner reviewed the redesign plan in session on 2026-10-22, confirmed the live-site facts, and asked to implement it with no Codex pass.

### Owner decisions (2026-10-22, in session)

- Facts confirmed as shown on https://43logistics.vn: hotline/Zalo 0979 222 357, WhatsApp, Messenger, Facebook, email, both office addresses, hours "T2–T7 08:00–18:00", the 10% new-customer offer, per-route prices and transit times (SG, MY, KR, TW, JP, TH, US), the logo, all legacy photos (team, storefront, packing, destination photos with rights), and consent for the chat screenshots (blurred). 0827 575 567 is not published.
- Static hero with motion, not a hero carousel (AGENTS.md rule 8 kept). Below-the-fold content swipes; nothing auto-rotates.
- Home copy (hero sub-line, service strip, why us, process) approved as built.
- Codex review skipped at the owner's request.

### Acceptance Criteria

- [ ] Owner confirmations are a reviewable file (`43logistics.vn/data/owner-confirmations.json`) applied by `pnpm db:confirm`; the seed still never verifies anything. Withdrawing a confirmation hides the fact again (verified with every row unverified: no phone, email, address, hours, price, days or offer text in production HTML/RSC; JSON-LD back to WebSite + Organization).
- [ ] Header: owner's logo, sticky translucent header, dark top bar (hotline via `/go/call`, email, hours) only when verified; mega menu ≥ 1280 px and drawer below (no horizontal overflow at 1024 px in EN).
- [ ] Home sections in order: hero (pill, H1 with highlighted slogan, sub-line, Zalo + "Gọi {hotline}", route picker, photo with floating chips and a verified from-price chip), service strip, rates bento with destination photos (featured first, inbound wide, styled fallback without a photo), why us, process timeline, offer band (percent + text + CTAs), gallery + blurred chat wall (+ consented testimonials), latest guides, dark closing band with CTAs and office cards.
- [ ] Motion is CSS only (no new JS, no `motion`), transform/opacity, never on the H1 or hero photo, off under reduced motion.
- [ ] Design tokens: `flame` accent scale, `card` and `brand-glow` shadows in `data/design-tokens.json` (`pnpm tokens:check` passes).
- [ ] One H1, metadata/hreflang unchanged from S-05, JSON-LD gains contactPoint, sameAs and two LocalBusiness with hours once verified.
- [ ] Budgets: route JS unchanged vs `main`; Lighthouse mobile Performance ≥ 90 and Accessibility ≥ 95 (median of 3); axe 0 violations at 360/768/1024/1280 on both locales; no horizontal overflow.
- [ ] Context: 01 statuses, 11 answers (Q-06, Q-07, Q-12, Q-26, Q-27 answered; Q-02, Q-03, Q-04, Q-11 partly), 03 Home as built, 04 accent/motion/header breakpoint, 05 placements, AGENTS.md §7 `db:confirm`.

### Out of scope

Hero carousel; FAQ section and stats/partners bands (need owner content, Q-23, Q-08); a vector logo (Q-11); applying the confirmations to the shared Supabase database (run `pnpm db:seed && pnpm db:confirm` there when ready); the S-05 Codex follow-ups #1, #2, #8.

### Manual Verification Plan

Production build against the local seed DB after `pnpm db:seed && pnpm db:confirm`: one H1, CTAs/top bar/phone, prices and days on the bento, offices + JSON-LD; axe and overflow at 360/768/1024/1280 × VI/EN; keyboard pass and reduced motion; drawer at 1100 px; `perf:report` and Lighthouse 3 runs per locale; then every row unverified to prove nothing leaks; then re-confirm.

### Related

`specs/feature-s05-home.md` (S-05), app PR #14 (merged) and the Codex fixes `82504ca` that missed it (cherry-picked here), `docs/proposals/nextjs-rebuild-quynam-pattern.md`.
