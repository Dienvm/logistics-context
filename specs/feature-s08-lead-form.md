---
title: Add the quote request form to the calculator page
type: feature
status: draft
owner_repo: both
roadmap: S-08
priority: must-have
blocked_by_questions: [Q-28, Q-17, Q-01, Q-13, Q-20]
updated: 2026-10-23
---

## Feature: Add the quote request form to the calculator page

### Problem Statement

Roadmap S-08 (`docs/context/10-roadmap.md`): "Server Action, Zod, Turnstile, rate limit, consent, `after()` notifications/conversions, success/error states in VI/EN. *Accept:* happy and validation paths checked manually in VI and EN; row has attribution fields; no email required."

Some visitors, especially people arriving from ads after office hours or people who don't use Zalo, need to leave a request without starting a chat. Today the site has no form: the `leads` table exists (F-04), but nothing writes to it. The calculator page (S-07) has a "Nhận báo giá chính xác" action that has been held back until this form exists. Zalo stays the primary channel (AGENTS.md §1). The form is the fourth channel, and it has to be safe from spam and compliant with the personal-data rules (rule 14).

### Proposed Solution

On `/tinh-cuoc/` and `/en/shipping-calculator/`, a visitor who has a result clicks "Nhận báo giá chính xác" / "Get an exact quote". The page moves to a "Nhận báo giá" section below the calculator. The form there is prefilled with the route and weight they just entered.

**Fields:**
- name;
- phone/Zalo number;
- route;
- weight (kg);
- goods type: a list of the route's approved goods, or "Khác";
- message;
- optional email;
- a required consent checkbox linked to the privacy policy.

**Submission:**
- A Cloudflare Turnstile check protects the form, and the server limits how many requests one IP may send.
- On success the visitor sees a confirmation inline, plus a Zalo button to "chat now for a faster reply".
- On a validation error each field shows its own message.
- On any other error the visitor sees a generic message with the Zalo and call alternatives.

**What happens to the lead:**
- It is saved with its consent record and, when ads consent was given, its ad attribution.
- Sales are notified by email and through the Zalo OA. Both notifiers are built but stay off until their configuration (Q-28) is set.

The form appears only on the calculator page in this task. S-09 reuses the same component on `/lien-he/`.

### Acceptance Criteria

**Placement and prefill**

- [ ] **Placement.** Given `/tinh-cuoc/` (VI) or `/en/shipping-calculator/` (EN) with Turnstile and `IP_HASH_SALT` configured, when the page loads, then a section `id="bao-gia"` with an `<h2>` ("Nhận báo giá" / "Request a quote") sits below the calculator, before the "Liên hệ" routes. No other page renders the form.
- [ ] **Prefill.**
  - Given a settled calculator result (for example Singapore, 2 kg), when the visitor clicks "Nhận báo giá chính xác", then the page scrolls to `#bao-gia` and the form opens with that route and weight prefilled.
  - A "Liên hệ" route or an invalid result shows no "Nhận báo giá chính xác" action.
  - The button sits in `CalculatorPageActions` next to "Gửi kết quả qua Zalo" and "Gọi".
- [ ] **Direct open.** Given the visitor opens `#bao-gia` directly (or scrolls to it), when they open the form with no prefill, then route and weight are empty, and the route is chosen from every active route (quotable and "Liên hệ"), grouped outbound/inbound.

**Validation**

- [ ] **Fields and limits.** Given the form, then the fields and limits are as follows. All limits live in `modules/leads/constants.ts`.

  | Field | Rule |
  |---|---|
  | name | required, trimmed, 2–80 chars |
  | phone | required, `type="tel"`, `inputMode="tel"`, `autoComplete="tel"`. Normalised to E.164: VN `0xxxxxxxxx` / `84…` / `+84…` → `+84…`; other `+<country>` numbers with 8–15 digits are kept |
  | route | optional, an active route key |
  | weight | optional, `inputMode="decimal"`, > 0 and ≤ the calculator's max weight constant |
  | goods type | optional, ≤ 120 chars |
  | message | optional, ≤ 1000 chars |
  | email | optional, valid when present, ≤ 254 chars |
  | consent | required (must be checked) |

  Email is never required (roadmap *Accept*).
- [ ] **Goods options.** Given a selected route, then the goods-type select lists that route's approved `allowed` and `restricted` goods rules (plus the global ones) by name in the page locale, then "Khác" / "Other". Prohibited rules and unapproved rules never appear. With no route selected, only "Khác" appears. The stored value is the chosen name, or the literal "Khác"/"Other" label.
- [ ] **Validation errors.** Given invalid input (for example a phone `12345`, or an unchecked consent), when the visitor submits, then:
  - the server returns `ActionState` with `fieldErrors`;
  - each invalid field shows a localised message linked with `aria-describedby` and `aria-invalid`;
  - focus moves to the first invalid field;
  - no row is inserted.
  - Messages come from `messages/{vi,en}.json` (`leadForm.errors.*`), never raw Zod text. The server re-validates whatever the client does.
  - Unknown form keys are stripped (`formInput` + Zod strip mode).

**Submission**

- [ ] **Happy path.** Given valid input and a passed Turnstile check, when the visitor submits, then exactly one `leads` row is inserted with:
  - `status = 'new'`;
  - `locale` and `source_path` (the page path);
  - `route_id` resolved from the route key (null if none);
  - `weight_kg`, `goods_type`, `message`, `email` (null if empty);
  - `phone` in E.164;
  - `ip_hash` (HMAC, `hashIp`);
  - `user_agent`, trimmed to the S-02 max length;
  - `consent_at = now()` and `consent_policy_version = PRIVACY_POLICY_VERSION` (a constant, see Dependencies);
  - `ads_consent` from `43l_consent`;
  - `estimate_vnd = null` (not computed in S-08, see Out of scope).

  The form is then replaced by a success panel (`role="status"`, focus moved to it) with the Zalo and call links (`placement=lead_form`). There is no redirect and no toast.
- [ ] **Attribution.** Given `43l_consent` grants ads and `43l_attr` holds UTMs and click IDs, when a lead is saved, then `utm_*`, `gclid`, `gbraid`, `wbraid`, `fbclid`, `ttclid`, `referrer` and `landing_path` are copied onto the row. Given no ads consent, those columns are all null and `ads_consent = false` (roadmap *Accept*, rule 14, same gating as S-02).
- [ ] **Idempotent submit.** Given a double click or a resubmit of the same form instance, when the action runs twice with the same hidden `submission_id` (a UUID made when the form opens, and used as `leads.id`), then only one row exists and both calls return success. The submit button is disabled while pending (`useFormStatus`).

**Turnstile and rate limit**

- [ ] **Turnstile.**
  - **Missing or failed token.** Given a missing, invalid or expired `cf-turnstile-response`, when the action runs, then it verifies the token server-side against `https://challenges.cloudflare.com/turnstile/v0/siteverify`, using `TURNSTILE_SECRET_KEY` and the client IP. It inserts nothing and returns a localised "verification failed, try again" message.
  - **No bypass.** The server never skips verification, in any environment.
  - **Script loading.** The Turnstile script loads from `challenges.cloudflare.com` only when the form opens, never on page load.
- [ ] **Form off without configuration.** Given `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` or `IP_HASH_SALT` is unset, when the page renders, then the `#bao-gia` section shows a short notice with the Zalo and call links instead of the form, and the "Nhận báo giá chính xác" action is hidden. The action also refuses submissions in this state. Local checks use Cloudflare's public test keys in `.env.local`.
- [ ] **Rate limit.** Given the same `ip_hash` already has 3 leads in the last 10 minutes, or 10 in the last 24 hours, when it submits again, then nothing is inserted and a localised "too many requests, please contact us on Zalo" message is returned. The limits are constants in `modules/leads/constants.ts`. The count is a DB query on `leads (ip_hash, created_at)`, backed by a new index in migration `0002`.

**Notifications, conversions and tracking**

- [ ] **Sales notification seam.** Given a saved lead, then `after()` calls `notifySales(lead)`, which runs each configured notifier and never delays the response.
  - **Email:** runs when `LEAD_EMAIL_API_KEY`, `LEAD_EMAIL_FROM` and `LEAD_EMAIL_TO` (comma-separated) are set. It sends through the provider's HTTP API with `fetch`; no SDK is added.
  - **Zalo OA:** runs when `ZALO_OA_ACCESS_TOKEN` and `ZALO_OA_RECIPIENT_IDS` are set. It sends an OA text message through `fetch`.
  - **Message content:** the lead ID, route, weight, goods type, name, phone and a link placeholder for the future admin (A-xx). There is no attribution in the message.
  - **Unset:** a notifier whose variables are unset is a no-op. With none set (today, Q-28), nothing is sent.
  - **Failures:** a failure is logged without the lead payload (only the lead ID and the channel).
- [ ] **Conversion seam.** Given a saved lead, then `after()` calls `sendLeadConversion` (in `modules/tracking`, the same shape as `sendContactConversion`). It is a no-op unless `ads_consent` is true, and stays a no-op until Q-13.
- [ ] **dataLayer events.** Given the visitor interacts with the form, then `modules/tracking` pushes:
  - `form_start` (`form: 'lead'`) once, on the first field focus;
  - `form_error` (`form: 'lead'`, `field`) once per failed submit, for the first invalid field;
  - `generate_lead` (`event_id` = `lead_id` = submission ID, `route_key`, `locale`, `currency: 'VND'`, no `value`) once, on success.

  Each event fires once and carries no personal data (05-seo-and-tracking.md events table).

**Copy, accessibility, budget and docs**

- [ ] **Bilingual copy.** Given EN, when the same flows run on `/en/shipping-calculator/`, then all labels, help text, errors, success and notices come from `messages/en.json` under `leadForm.*`. `pnpm i18n:check` passes.
- [ ] **Accessibility and layout.**
  - Every input has a visible `<label>`, and the consent label contains the link "chính sách bảo mật" / "privacy policy". The link points to the `policy-privacy` page path for the locale (`/chinh-sach-bao-mat/`, `/en/privacy-policy/`), resolved from the page record, not hard-coded.
  - Targets are ≥ 44 px, there are no uppercase buttons, and focus rings stay visible.
  - The form works at 360, 768 and 1280 px and with keyboard only.
- [ ] **JS budget.** Given CI `perf:report`:
  - every route except `/tinh-cuoc/` keeps its current app JS (no growth from S-08);
  - `/tinh-cuoc/` stays ≤ baseline + 50 KiB (ADR 0006);
  - the form island is a lazy `next/dynamic` chunk loaded when the form opens.
- [ ] **Context docs updated in the same change set:**
  - 06 env table: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` replaces `TURNSTILE_SITE_KEY`; add the `LEAD_EMAIL_*` and `ZALO_OA_*` variables;
  - 07: the `ip_hash` line says HMAC, and the new leads index is listed;
  - 03 calculator "Actions": "Nhận báo giá chính xác" is live;
  - 03 Contact: S-09 reuses `LeadSection`;
  - `.env.example` gains the new names.

### Scope

**In scope:**
- the `modules/leads` domain, application, infrastructure, ui, `actions.ts`, constants, `index.ts` and `client.ts`;
- `submitLeadAction`;
- Turnstile verification;
- the DB rate limit and index migration;
- both notifiers, switched off by env;
- the conversion no-op seam;
- the three dataLayer events;
- the calculator-page placement and prefill;
- messages VI/EN;
- the env schema and `.env.example`;
- the context doc updates listed above.

**Out of scope:**
- The `/lien-he/` contact page and the privacy-policy page content (S-09).
- The form on route pages, the home page or the hubs.
- `estimate_vnd`: leads don't depend on pricing, so the estimate is left null for sales to recompute. A later task can add a server-side quote.
- Dimension fields (L×W×H): sales ask on Zalo.
- Zalo OA access-token refresh (OA tokens expire; activation work under Q-28).
- The admin lead list (A-xx).
- The retention job (Q-17).
- The consent banner (S-13).
- PostHog server events.
- Meta CAPI and Google Ads Enhanced Conversions (Q-13).
- A public `<Toaster />`.

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | leads domain | `modules/leads/domain/phone.ts` (E.164 normaliser), `domain/lead.ts` (types) |
| app | leads application | `modules/leads/application/schemas.ts` (`leadInputSchema`, client-safe), `application/submit-lead.ts` (use case), `application/notify-sales.ts`, `application/verify-turnstile.ts` |
| app | leads infrastructure | `modules/leads/infrastructure/leads.ts` (insert on conflict, rate-limit counts), `infrastructure/email-notifier.ts`, `infrastructure/zalo-oa-notifier.ts`, `infrastructure/schema.ts` (index) |
| app | leads ui | `modules/leads/ui/lead-section.tsx` (server), `ui/lead-form-loader.tsx` (lazy entry), `ui/lead-form.tsx` (client island), `ui/lead-success.tsx`, `ui/turnstile-widget.tsx`, `ui/hooks/use-lead-prefill.ts` |
| app | leads entry points | `modules/leads/actions.ts`, `constants.ts`, `index.ts`, `client.ts` |
| app | migration | `db/migrations/0002_*.sql` (index `leads (ip_hash, created_at)`) |
| app | tracking | `modules/tracking/application/attribution-columns.ts` (moved from `contact/application/record-contact-event.ts`), `application/lead-conversion.ts`, `application/data-layer.ts` (form events), `constants.ts`, index/client exports |
| app | contact | `modules/contact/application/record-contact-event.ts` (imports the moved mapper) |
| app | pricing | `modules/pricing/ui/calculator/calculator-page-actions.tsx` ("Nhận báo giá chính xác" when `leadFormEnabled`), `calculator-labels.ts` |
| app | content | `modules/content/ui/calculator/calculator-page.tsx` (new `leadForm` slot) |
| app | page | `app/[locale]/(site)/[slug]/calculator-view.tsx` (composes `LeadSection` with goods options, routes, contact links) |
| app | shared | `shared/lib/form-input.ts` (new, per api-patterns), `shared/config/env.server.ts`, `env.public.ts`, `.env.example` |
| app | messages | `messages/vi.json`, `messages/en.json` (`leadForm.*`, `calculatorPage` action label) |
| context | docs | `docs/context/06-architecture.md` (env table), `07-data-model.md` (ip_hash, index), `03-information-architecture.md` (calculator actions, contact) |

### Golden-rule checks

- **Rules 1–2:** no business facts in the form. The goods options come from approved DB rules. The contact links come from `site_settings` via `ContactLink`, which shows only verified values.
- **Rule 4:** the calculator page keeps its one H1. The lead section uses an `<h2>`. Metadata and JSON-LD are unchanged.
- **Rules 6 and 15:** DB access stays in `leads/infrastructure`. `TURNSTILE_SECRET_KEY`, the email key and the OA token are server-only. Only the site key is `NEXT_PUBLIC_`. Lead payloads are never logged.
- **Rule 8:** the JS budget AC; the Turnstile script loads on demand.
- **Rules 10–11:** labels, errors, 44 px targets, focus, no uppercase.
- **Rule 12:** the success panel's Zalo and call links go through `/go/[channel]` with `placement=lead_form`, and `generate_lead` is pushed once from `modules/tracking`.
- **Rule 14:**
  - the consent checkbox and privacy link;
  - `consent_at` and the policy version stored;
  - IP hashed only;
  - attribution only with ads consent;
  - conversions only with ads consent;
  - minimal fields.
- **Module rule (ADR 0005):** leads imports only `routes` and `tracking`. Goods options, contact links and the privacy path reach `LeadSection` as props or slots composed in `app/`.

### Dependencies & Risks

- **Depends on:** S-07 (implemented), S-02 helpers (`hashIp`, `clientIp`, `parseConsent`, `decodeAttribution`), F-04 `leads` table. No unclosed stack gap (Cache Components, `after()` and Server Actions are available).
- **Blocked by questions** (placeholders per ADR 0004):
  - **Q-28:** notifier recipients and OA access. Both notifiers stay off.
  - **Q-17:** retention. The privacy policy can't be written yet.
  - **Q-01:** legal name for the policy.
  - **Q-13 / Q-20:** conversions and PostHog stay off.
  - **Policy version:** `PRIVACY_POLICY_VERSION` is a placeholder constant (`"draft-2026-10"`) until S-09 publishes the policy. S-09 replaces it.
- **Launch gate:**
  - **Turnstile keys:** the form must not be enabled in production until S-09 publishes `/chinh-sach-bao-mat/`, since the consent link is a 404 until then. Do this by not setting the Turnstile keys in Vercel Production.
  - **Email provider:** the email adapter assumes a transactional provider with an HTTP API (Resend's `POST /emails` shape). The provider choice is confirmed at activation with Q-28.
- **Risks:**
  - **JS budget:** /tinh-cuoc/ shares the ~0.9 KiB headroom. The form must be a lazy chunk, and the static loader must stay tiny. If CI fails, the fallback is a server-rendered `<form action>` with the implicit Turnstile widget and no app island. That fallback needs a spec amendment.
  - **Zalo OA tokens:** they expire within about a day. A static token works only for testing, so activation needs a refresh flow (out of scope).
  - **Spam with a shared IP:** NAT or mobile carriers can rate-limit real users. The limits are deliberately loose, and the message points to Zalo.

### Manual Verification Plan

- **Seed needs:**
  - the default seed + `db:confirm` (calculator page published, routes and goods rules approved);
  - Cloudflare test keys in `.env.local`: site `1x00000000000000000000AA` (always passes) and `2x00000000000000000000AB` (always fails); secret `1x0000000000000000000000000000000AA`;
  - `IP_HASH_SALT` set;
  - local DB via `pnpm db:local` / `dev:local`.
- **Steps:**
  1. `/tinh-cuoc/` at 1280 px. Choose Singapore, 2 kg, then click "Nhận báo giá chính xác". Expect a scroll to `#bao-gia`, the form open, route = Singapore, weight = 2, and goods options = the SG approved allowed and restricted names + "Khác".
  2. Submit empty. Expect errors on name, phone and consent, focus on name, `form_error` in `window.dataLayer`, and 0 new rows.
  3. Enter phone `0905 123 456`, a name, and consent checked, then submit. Expect the success panel with focus on it, one row with phone `+84905123456`, `consent_at` set, attribution null (no consent cookie), and `generate_lead` pushed once. Check the row with SQL on the local DB; don't paste lead data into the PR.
  4. Set `43l_consent=v1.1.0.<now>` and visit `/tinh-cuoc/?utm_source=test&gclid=abc` so `43l_attr` is set. Submit. Expect `utm_source = test`, `gclid = abc` and `ads_consent = true` on the row.
  5. Double-click submit (or replay the same request). Expect one row.
  6. Submit 3 more times from the same IP within 10 minutes. Expect the 4th to be refused with the rate-limit message.
  7. Swap in the failing site key and submit. Expect the verification-failed message and no row.
  8. Unset the Turnstile keys and reload. Expect the notice with Zalo and call links, and no "Nhận báo giá chính xác" button.
  9. Repeat steps 1–3 on `/en/shipping-calculator/`. Expect English labels and errors, and the privacy link to `/en/privacy-policy/`.
  10. At 360 and 768 px, keyboard only: tab through the form, submit with Enter, and confirm the errors are announced. Run axe DevTools at 360 and 1280 px: 0 serious or critical issues.
  11. With no notifier env set, confirm the server log shows no send and no lead payload. Optionally set the email vars against a test inbox and confirm one email.
  12. Consent matrix (ADR 0004 Decision 2), lead parts: no `43l_attr` or attribution without ads consent, and the conversion seam stays a no-op with ads consent denied.
- **Validation commands:** `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build`, `check:redirects`; `db:generate` reviewed for `0002`; CI `perf:report`. There are no automated tests (ADR 0004).
- **Process:** per the owner's phase-1 rule, the browser, axe and Lighthouse steps above may be deferred from the implementation PR and recorded as pending. Lint, typecheck, boundaries, build and CI perf still gate.

### Implementation Hints

- **Prefill:** the calculator and the lead island are separate, so pass the prefill without shared state. "Nhận báo giá chính xác" writes `?route=<key>&kg=<n>` with `calculatorUrl` + `history.replaceState`, then focuses `#bao-gia`. The lead island reads `location.search` when it opens (`use-lead-prefill.ts`).
- **Lazy loading:** keep `lead-form-loader.tsx` minimal: a button that `import()`s the form. Check that the chunk is excluded from other routes' prefetch, as S-07 learned.
- **Turnstile:** render explicitly with `window.turnstile.render` after injecting the script on open. Remove the widget on unmount. No npm package.
- **Server Action shape** (06-architecture.md "Server Actions"):
  1. `formInput`
  2. `leadInputSchema.safeParse`
  3. `verifyTurnstile`
  4. `rateLimit`
  5. read the consent and attribution cookies
  6. `createLead` (insert … on conflict (id) do nothing)
  7. `after(notifySales)` and `after(sendLeadConversion)`
  8. return `ok({ leadId })`
- **Reuse:**
  - move `attributionColumns` from `contact/application/record-contact-event.ts` into `tracking`, and use `buildContactEventRow`'s gating as the model;
  - `findActiveRouteId` from `@/modules/routes`;
  - `USER_AGENT_MAX_LENGTH`.
- **Goods options:** `listRouteGoodsRules(routeKey, locale)` from `modules/goods` (add it to the goods `index.ts`), called per active route in `calculator-view.tsx`, filtered to `allowed` and `restricted`.
- **Scripted edits:** assert every scripted replacement (memory: Biome reflows files).

### Related

- Roadmap: `docs/context/10-roadmap.md` S-08
- `docs/context/03-information-architecture.md` (Calculator, Contact), `04-design-system.md` (LeadForm component), `05-seo-and-tracking.md` (events, `43l_attr`, consent), `06-architecture.md` (Server Actions, env), `07-data-model.md` (`leads`)
- ADR 0004 (Decisions 2, 3, 5), ADR 0005, ADR 0006
- Specs: `feature-s02-contact-tracker.md` (attribution and IP-hash pattern), `feature-s07-calculator-page.md` (held-back action, JS budget)
- Open questions: Q-28, Q-17, Q-01, Q-13, Q-20; Q-14 answered 2026-10-23
- `.claude/rules/form-patterns.md`, `security-patterns.md`, `api-patterns.md`
