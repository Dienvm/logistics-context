---
title: Log contact clicks and redirect via /go/[channel]
type: feature
status: implemented
owner_repo: both
roadmap: S-02
priority: must-have
blocked_by_questions: [Q-06, Q-13, Q-20]
updated: 2026-10-22
branch: feat/s02-contact-tracker
implementation_pr: https://github.com/Dienvm/43logistics.vn/pull/13
implementation_commit: 121de49e533f4b2246e1f161f4c073c27c0367a3
implemented_date: 2026-10-22
---

## Feature: Log contact clicks and redirect via /go/[channel]

### Problem Statement

Zalo, phone, WhatsApp and Messenger clicks are the site's main conversion (AGENTS.md §1, ADR 0001 decision 8). S-01 already renders every contact CTA as a link to `/go/{channel}/`, but there's no handler yet, so those links 404. Roadmap S-02 (`docs/context/10-roadmap.md`) adds the tracker. It records one `contact_events` row per click, then sends a 302 to the channel. The `event_id` it stores is the same one the browser pushes to `dataLayer`, so S-13 and T-01 can dedupe against it later (`05-seo-and-tracking.md` "Contact click tracker").

### Proposed Solution

A visitor taps a contact CTA (header, mobile action bar, footer or contact details).

1. **In the browser:** the link creates a per-click UUID. It pushes a `click_<channel>` event to `window.dataLayer` with `event_id`, `route_key`, `placement` and `locale`, then follows `/go/<channel>/?from=<path>&eid=<uuid>&placement=<p>[&route=<key>]`.
2. **On the server:** the handler resolves the channel target from `site_settings.contact`. It answers right away with a `302` to Zalo, `tel:`, WhatsApp or Messenger.
3. **After the response:** an `after()` task inserts the `contact_events` row. The row holds channel, route, placement, source path, locale, attribution from `43l_attr`, consent state from `43l_consent`, hashed IP and user agent. Then the task calls a conversion fan-out seam. That seam is a no-op today and is gated on ads consent; T-01 plugs platforms into it once Q-13 is answered.

If the contact value is unverified and preview is off, nothing is published (golden rule 1) and the handler returns 404.

### Acceptance Criteria

**Handler, redirects**
- [ ] Given `site_settings.contact` is verified (or `PREVIEW_UNVERIFIED=1`), when a GET reaches `/go/zalo/`, then the response is `302` with `Location: https://zalo.me/<contact.zalo>`.
- [ ] Same conditions, `/go/call/` → `302` to `tel:<contact.phoneE164>`.
- [ ] Same conditions, `/go/whatsapp/` → `302` to `https://wa.me/<contact.whatsapp>?text=<prefill>`. The `whatsapp` value starts with `84` (seed schema `^\d{8,15}$`). If a stored value starts with `0`, the handler normalises it to `84…`. The prefill text comes from `messages/{vi,en}.json` (`contact.whatsappPrefill`). The locale is taken from the `from` path: `/en/…` means EN, anything else means VI.
- [ ] Same conditions, `/go/messenger/` → `302` to `https://m.me/<contact.messenger>`.
- [ ] Given any channel outside `CONTACT_CHANNELS` (e.g. `/go/email/`, `/go/foo/`, `/go/ZALO/`), the response is `404` and no row is written.
- [ ] Given `contact.isVerified = false` and `PREVIEW_UNVERIFIED` is not `1`, or the field for that channel is missing or fails its schema, the response is `404` and no row is written.
- [ ] Every `/go` response sets `Cache-Control: no-store` and `X-Robots-Tag: noindex, nofollow`.
- [ ] Only `GET` is handled. `HEAD` gets the same status and `Location` but writes no row. Other methods get `405`.

**Handler, logging**
- [ ] The redirect never waits on the database. The insert and the conversion seam run in `after()` with a short timeout (≤ 3 s). A failure is logged without values (rule 15) and never changes the response.
- [ ] One valid click writes exactly one `contact_events` row. If `eid` is a valid UUID it becomes `event_id`. If it's missing or malformed, the handler generates a server UUID. A repeat with the same `eid` doesn't create a second row (`on conflict (event_id) do nothing`).
- [ ] Fields on the row:
  - `channel`;
  - `route_id` from `route=<key>`, only if the key matches an active route (otherwise `null`);
  - `placement`, only if it's in the placement allowlist (otherwise `null`);
  - `source_path` = `from`, only if it is a same-site path starting with `/`, at most 300 chars (otherwise `null`);
  - `locale` derived from `source_path`;
  - `user_agent`, truncated to 512 chars;
  - `ip_hash` = HMAC-SHA256 of the client IP with `IP_HASH_SALT`, hex. The raw IP is never stored or logged.
- [ ] Attribution: when `43l_attr` decodes (`decodeAttribution`), the row stores its `utm_*`, `gclid`, `gbraid`, `wbraid`, `fbclid`, `ttclid`, `referrer` and `landing_path`. When the cookie is missing or invalid, all of these are `null`.
- [ ] Consent: `ads_consent`, `analytics_consent`, `consent_policy_version` (`v1`) and `consent_at` come from `parseConsent(43l_consent)`. A missing or malformed cookie gives `false/false/null/null`.
- [ ] Known bots (UA matches the bot allowlist in `modules/tracking/domain`) still get the redirect, but no row is written.

**Conversion seam**
- [ ] `after()` calls `sendContactConversion(event)` (or similar) from `modules/tracking`. It returns immediately unless `ads_consent` is true. With ads consent it reaches a no-op that names T-01 / Q-13. It sends no network request.

**Client**
- [ ] `ContactLink` takes optional `placement` and `routeKey` props. On activation (click, or Enter on the focused link) it generates one UUID (`crypto.randomUUID()`), pushes exactly one `click_<channel>` event to `window.dataLayer` (`event`, `event_id`, `route_key`, `placement`, `locale`), and sets the link's `href` to include `eid`, `placement`, `route` and `from`. A single click produces exactly one push and one row, and both carry the same `event_id`.
- [ ] Event names and parameter names are defined once in `modules/tracking/constants.ts` (`click_zalo`, `click_call`, `click_whatsapp`, `click_messenger`). No GTM or PostHog is loaded. The push doesn't depend on consent: it's an in-page array with no network request and no cookies (S-13 adds GTM and Consent Mode).
- [ ] The S-01 callers pass their placement: header → `header`, mobile action bar → `sticky_bar`, footer / contact details → `footer`.
- [ ] Without JS, the server-rendered `/go/<channel>/` link still redirects and logs a row with a server-generated `event_id`.
- [ ] CTA links carry `rel="nofollow"`.

**Data and env**
- [ ] A migration (`pnpm db:generate`) adds `gbraid`, `wbraid`, `referrer` and `landing_path` (text, nullable) to `contact_events`, and `landing_path` to `leads`. RLS stays on with no policies.
- [ ] `ContactSettings` (`modules/settings/domain/settings.ts`) and `settingValueSchemas.contact` (`modules/settings/infrastructure/setting-values.ts`) add `zalo`, `whatsapp` and `messenger`, matching the seed schema. The fields stay optional, and a malformed value drops only that channel.
- [ ] `IP_HASH_SALT` is added to `shared/config/env.server.ts` (optional, min 32 chars) and to `.env.example` (empty). If it's absent, `ip_hash` is `null` and a single value-free warning is logged.

**Budget and checks**
- [ ] `/` and `/en/` stay within the ADR 0006 JS budget (`pnpm perf:report`), with the app JS delta of the `ContactLink` change recorded in the PR.
- [ ] `pnpm lint && pnpm typecheck && pnpm check:boundaries && pnpm tokens:check && pnpm i18n:check && pnpm build` pass, and `pnpm check:redirects` reports 0 FAIL.

### Scope

**In scope:**
- `app/go/[channel]/route.ts`;
- `contact_events` insert in `after()`;
- the attribution and consent read;
- IP hashing;
- the bot skip;
- the client `event_id` and `dataLayer` push in `ContactLink`;
- the `modules/tracking` event constants;
- the off-by-default conversion seam;
- the settings read model fields;
- the attribution columns migration;
- `IP_HASH_SALT`;
- the WhatsApp prefill copy (VI/EN);
- doc updates in `05` (unverified → 404 behaviour, placement allowlist) and `07` (new columns).

**Out of scope:**
- GTM, Consent Mode, the consent banner and PostHog fan-out (S-13);
- real server-side conversions to Meta, TikTok or Google (T-01, T-02);
- contact analytics screens (A-07);
- `robots.txt` disallow for `/go` (S-10);
- the lead form (S-08), apart from the `leads.landing_path` column;
- rate limiting `/go` (the unique `event_id` prevents double counting; abuse protection waits until it's needed);
- `email` and `form` channels (enum values exist, but they don't go through `/go`).

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | route handler | `app/go/[channel]/route.ts` (new; outside `app/[locale]`, `trailingSlash` → `/go/zalo/`) |
| app | module application | `modules/contact/application/resolve-channel-target.ts` (pure: channel + contact settings + preview flag → URL or `null`) |
| app | module application | `modules/contact/application/record-contact-event.ts` (builds the row from request inputs; pure parts in `domain/`) |
| app | module infrastructure | `modules/contact/infrastructure/contact-events.ts` (insert, `on conflict do nothing`), `schema.ts` (new columns) |
| app | module domain | `modules/contact/domain/contact-channel.ts` (`isContactChannel`), placement allowlist in `modules/contact/constants.ts` |
| app | module UI | `modules/contact/ui/contact-link.tsx` (`eid`, `placement`, `routeKey`, `rel`), callers `header-contact-cta.tsx`, `mobile-action-bar.tsx`, `contact-details.tsx` |
| app | module | `modules/tracking/constants.ts` (event names/params), `modules/tracking/client.ts` (`pushDataLayer`), `modules/tracking/domain/bot.ts`, `modules/tracking/domain/ip-hash.ts` or `application/`, `modules/tracking/index.ts` (server: `sendContactConversion` seam, `decodeAttribution`) |
| app | module | `modules/settings/domain/settings.ts`, `modules/settings/infrastructure/setting-values.ts` |
| app | module | `modules/leads/infrastructure/schema.ts` (`landing_path`) |
| app | db | `db/migrations/*` (generated) |
| app | config | `shared/config/env.server.ts`, `.env.example` |
| app | messages | `messages/vi.json`, `messages/en.json` (`contact.whatsappPrefill`) |
| app | reuse | `shared/lib/fact-visibility.ts` (verified / preview rule), `modules/tracking/domain/consent.ts` (`parseConsent`), `modules/tracking/application/attribution-cookie.ts` (`decodeAttribution`) |
| context | doc | `docs/context/05-seo-and-tracking.md` (Contact click tracker: unverified → 404, `HEAD`, bots, placements), `docs/context/07-data-model.md` (`contact_events` + `leads` columns) |

### Golden-rule checks

- **1. Facts:** channel targets come only from `site_settings.contact`. Without verification or the preview flag, the handler returns 404. Nothing is hard-coded, and there's no fallback number.
- **6. Server-only DB:** the insert lives in `modules/contact/infrastructure` (server-only). `ContactLink` imports only client-safe entries.
- **8. JS budget:** the `ContactLink` change is tiny but measured; there are no new dependencies (`crypto.randomUUID`, plain `window.dataLayer`).
- **10. Accessibility:** the link stays a native `<a>`, and keyboard activation behaves the same as a click.
- **12. Contact tracking:** this spec implements rule 12. Every event is pushed once, from `modules/tracking`.
- **14. Consent and personal data:**
  - Only the hashed IP is stored.
  - Attribution is read only from `43l_attr`, which F-06 already sets only with ads consent.
  - The conversion seam is gated on ads consent.
  - Nothing is sent to third parties.
- **15. Secrets and logs:** `IP_HASH_SALT` is server-only. Logs carry no IP, UA, phone number or cookie values.

### Dependencies & Risks

**Depends on:**
- F-04 (`contact_events`, `site_settings`);
- F-06 (`/go` pass-through, `parseConsent`, `43l_attr`);
- S-01 (`ContactLink`, `goHref`).
- Stack gaps that stay open: GTM and PostHog (S-13), server conversions (T-01).

**Blocked by questions (placeholders, ADR 0004):**
- **Q-06**, contact numbers unconfirmed: in production, `/go/*` returns 404 until `contact` is verified. With `PREVIEW_UNVERIFIED=1` (local or staging) it redirects to the legacy seed values.
- **Q-13**, ad platforms: the conversion seam stays a no-op.
- **Q-20**, PostHog and attribution consent: there's no PostHog push, and attribution follows the F-06 ads-consent rule.

**Risks:**
- `after()` with `cacheComponents: true` in a route handler is unproven in this app. Verify that the row is written on `next start`, and record the result in ADR 0006 if it behaves unexpectedly.
- The `getSiteSettings` read is `"use cache"`. A verification change only shows after the `settings` tag is revalidated (A-09) or after a redeploy.
- A `302` to `tel:` may do nothing on desktops without a dialer. That's acceptable, since the row is still logged.
- Until Q-06 is answered, production CTAs lead to a 404. This is intended, but it must be on the launch checklist (L-01).
- Client IP source: use the first value of `x-forwarded-for` (Vercel), with `x-real-ip` as fallback. An absent IP means `ip_hash` is `null`.

### Manual Verification Plan

**Seed needs:** the default seed (contact unverified). Run against `pnpm dev:local` (`PREVIEW_UNVERIFIED=1`), and once against `pnpm build && pnpm start` with the flag unset.

**Steps:**
1. With preview on, `curl -sI 'http://localhost:3000/go/<ch>/?from=/gui-hang-di-singapore/&eid=<uuid>&placement=header&route=sg'` for each of `zalo`, `call`, `whatsapp` and `messenger`. Expect a `302` with the right `Location`, `Cache-Control: no-store` and `X-Robots-Tag`. Note that `-I` sends `HEAD`, so then repeat each with `curl -s -o /dev/null -w '%{http_code} %{redirect_url}'`, which sends `GET`.
2. Query `select channel, event_id, route_id, placement, source_path, locale, ip_hash is not null, ads_consent from contact_events order by created_at desc limit 5`. Expect exactly one row per GET, none for `HEAD`, the `eid` stored, `route_id` set, and `placement = header`.
3. Repeat one GET with the same `eid`. The row count doesn't change.
4. `eid=not-a-uuid` gives a row with a server UUID. A GET with no params gives a row with null route, placement and path.
5. `/go/foo/`, `/go/email/` and `/go/ZALO/` return 404, with no row.
6. Bot UA (`-A 'Googlebot/2.1'`) gives a 302 and no row.
7. **Consent matrix** (ADR 0004), with synthetic cookies:
   - no cookie → `ads_consent=false`, attribution null;
   - `43l_consent=v1.1.0.<now>` + a valid `43l_attr` → `ads_consent=true`, utm and gclid columns filled;
   - malformed consent → false.
   - In every case, the network panel or server logs show no outbound conversion request.
8. Flag unset, on `next start`: every channel returns 404 while `contact.is_verified=false`. Temporarily set it to true in the local DB and revalidate or restart: the 302s work.
9. Browser at 360 / 768 / 1280 px, VI and EN:
   - Click each CTA (header, sticky bar, footer). DevTools `window.dataLayer` shows one `click_<channel>` with the same `event_id` as the new row.
   - Keyboard Enter on a focused CTA does the same.
   - With JS disabled, the CTA still redirects and logs.
10. Run an axe DevTools scan at 360 and 1280 px on `/`: no new serious or critical issues.
11. `pnpm perf:report`: `/` and `/en/` stay within budget. Record the delta.

**Validation commands:** `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build`, `check:redirects` (0 FAIL) and `perf:report`. No automated tests (ADR 0004).

### Implementation Hints

- The route handler stays thin: parse params → `resolveChannelTarget` → `NextResponse.redirect(url, 302)` + headers → `after(() => recordContactEvent(...))`. Keep the domain functions pure (channel guard, path sanitiser, locale from path, WhatsApp normalisation, bot test) so they can be checked by hand and stay testable later.
- Reuse `isFactVisible`-style logic from `shared/lib/fact-visibility.ts` rather than re-reading `PREVIEW_UNVERIFIED`.
- `decodeAttribution` isn't exported from a server entry yet. Expose it through `modules/tracking/index.ts`, not `client.ts`.
- `ContactLink` currently rewrites `href` on pointerdown, focus and keydown. Generate the `eid` and push only on `click` (which fires for Enter too), so that focus and pointerdown don't produce extra pushes. Set the final `href` in the click handler before navigation proceeds.
- The `/go` pass-through in `modules/seo/application/request-plan.ts` is case-sensitive. `/GO/zalo/` falls to normalisation, and whatever it resolves to must not log a row.
- No lessons are flagged (the lessons index is empty).

### Related

- Roadmap: `docs/context/10-roadmap.md` S-02.
- Docs:
  - `docs/context/05-seo-and-tracking.md` (Contact click tracker, dataLayer events, attribution, consent);
  - `06-architecture.md` (`app/go`, proxy pass-through, `IP_HASH_SALT`);
  - `07-data-model.md` (`contact_events`, `site_settings.contact`);
  - `01-business.md` (contact channels, legacy).
- ADRs:
  - 0001 (decision 8);
  - 0002 (tracking lanes);
  - 0004 (manual verification, consent matrix);
  - 0005 (modules);
  - 0006 (JS budget, Cache Components).
- Specs:
  - `specs/feature-s01-site-layout-shell.md` (`ContactLink`, CTAs 404 until S-02);
  - `specs/feature-f06-proxy-composition.md` (`/go` pass-through, `parseConsent`, `43l_attr`).
- Follow-ups: S-13 (GTM/PostHog fan-out of the same events), T-01 (conversion seam), S-10 (`robots.txt` `/go`), L-01 (Q-06 must be verified or the CTAs 404).
