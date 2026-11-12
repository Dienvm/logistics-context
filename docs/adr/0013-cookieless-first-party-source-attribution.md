# ADR 0013 — Cookieless first-party source attribution

- Status: Accepted (2026-11-12)
- Amends:
  - ADR 0011 Decision 6: the AI group's under-count for visitors who rejected ads consent is no longer accepted; a session path fills it.
  - ADR 0004 Decision 2: the consent matrix gains the session-attribution and visit-count checks.
  - ADR 0005: `proxy.ts` may import one named server-only file, `modules/tracking/visits.ts`.
  - The F-06 / `05-seo-and-tracking.md` rule that every attribution value needs ads consent.
- Owner repo: both
- Roadmap: A-07b (spec `specs/feature-a07b-source-attribution-all-contacts.md`), G-05 (narrowed to the prompt panel)
- Context:
  - The owner needs to know which acquisition source (Google search, Google Ads, AI assistants, Facebook, Zalo, TikTok, referrals) produces the visitors who **contact** the company, so sales and ad spend follow what works (owner, 2026-11-11).
  - The A-07 report already counts every `/go/[channel]` click and every quote request, but almost every row is "Không rõ nguồn", for two reasons:
    - `extractAttribution()` captures nothing unless the landing URL carries a utm or click-ID parameter.
    - `43l_attr` is written and read only with ads consent (F-06). An organic Google, ChatGPT, Zalo or Facebook visitor is never attributed.
  - There is also no count of visits per source, so no contact rate.
  - Most customers chat on Zalo after a click. The inbox therefore has no record a salesperson can tag with "how they found us" or mark won.
  - Rule 14 forbids analytics or ad tags, cookies or requests before consent. The fix must stay inside that rule, or say exactly where it changes it.

## Decisions

1. **Two attribution paths.**
   - The **cookie path** is unchanged: `43l_attr`, set and read only with ads consent, carrying the click IDs.
   - The new **session path** carries the entry source of the current page session without any consent choice.
   - On a stored row, the cookie path wins when it applies (ads consent granted and `43l_attr` decodes). Otherwise the session path fills the attribution columns. A column `attribution_basis` (`cookie | session | none`) records which path was used.

2. **What the session path may carry, and nothing more:**
   - `ref`: the external referrer **hostname** only, never a full URL; the site's own hosts are ignored.
   - `us` / `um` / `uc`: `utm_source`, `utm_medium`, `utm_campaign`. Each is trimmed, ≤ 150 bytes and character-limited on the server, because campaign strings can carry personal data. `utm_term` and `utm_content` are excluded.
   - `lp`: the landing pathname, with no query or fragment, ≤ 150 bytes.
   - `cn`: the **name of the network** (`google`, `facebook`, `tiktok`) when the landing URL had a click-ID parameter. A click-ID **value** never travels or is stored without ads consent.
   - `cap`: a flag that the capture ran (it separates "direct" from "unknown").
   - Server-side only: `in_app`, the in-app browser class (`zalo`, `facebook`, `messenger`, `instagram`, `tiktok`, `line`), derived from the user agent the request already carries.

3. **Where it lives and how it travels.**
   - The browser holds the session values **in page memory only**: a module-level constant read once from `document.referrer` and `location`. There is no cookie, no `localStorage`, no `sessionStorage`, no IndexedDB and no request of its own.
   - The values are sent to our own server **only inside requests the visitor makes anyway**: the `/go/[channel]` contact click and the quote-form submit.
   - A new tab or a typed URL starts empty. That loss is accepted.

4. **Two keys, two purposes.**
   - The existing source key (`deriveTrafficSource`, cookie-precedence, last campaign) keeps serving the A-06 inbox filter and the A-07 `source` view.
   - A new `entry_source_key` is computed only from the session values and `in_app`. It never reads `43l_attr`. It keys the visit counts (Decision 5) and the contact rate, so rates divide like by like.
   - Both keys keep the current classifier order and add two final steps, `app:{name}` and `direct`, before `unknown`. TypeScript and SQL twins change together (ADR 0011 Decision 6).

5. **Aggregate visit counts, server-side.**
   - `proxy.ts` counts **entry page views** into `site_visits` (`site`, `day` in Asia/Ho_Chi_Minh, `source_key`, `landing_path`, `locale`, `count`).
   - An entry page view is a document GET with an absent or external `Referer`. Prefetch, RSC, bot, `HEAD`, `/admin`, `/api`, `/go`, file, redirect and 410 requests are not counted.
   - No IP, user agent, cookie, click-ID value or per-visitor row is stored.
   - The write is bounded:
     - it runs after the response through `event.waitUntil`;
     - `statement_timeout` is 2 s, `lock_timeout` 500 ms, with a 3 s application timeout;
     - at most 20 writes are in flight per process; excess visits are dropped, never queued;
     - cardinality is capped at 2,000 rows per site per day, with an `overflow` bucket, and paths are normalised;
     - it is a no-op outside production.
   - A failure never changes the response.
   - **Boundary exception (amends ADR 0005):** `proxy.ts` may import exactly one server-only file, `modules/tracking/visits.ts`. `check:boundaries` names that file. Nothing else server-only enters the proxy.

6. **Processing types and their basis (PDP Law 91/2025/QH15; Decree 13/2023 as applicable).** "Cookieless" does not by itself make the data non-personal, so each processing type is handled separately. The legal basis below is the **owner's working position**; Q-39 tracks the legal adviser's confirmation, and activation waits for it (Decision 8).

   | Type | Data | Working basis | Notice | Minimisation and safeguards |
   | --- | --- | --- | --- | --- |
   | 1. Aggregate visit counts | `site_visits` rows | Not personal data: daily counts by source key and page, with no identifier. Small counts are possible, but no identifier sits next to them. | Privacy policy: "visits are counted per day without identifying anyone". | No IP, user agent, cookie or ID stored; bounded cardinality; character-limited keys; site dimension (ADR 0012). |
   | 2a. Attribution on a form lead | Session values on a `leads` row with name and phone | Covered by the lead's existing explicit consent (form checkbox, rule 14), with the policy updated to name these fields. | Policy section on quote requests. | Host only, capped values, no click IDs without ads consent; retention per Q-17. |
   | 2b. Attribution on a contact click | Session values on a `contact_events` row (hashed IP, user agent) | Pseudonymous measurement of the visitor's own contact request. **Q-39 must confirm** this basis, or the session values are not stored on clicks. | Policy section on contact clicks: "the referring site's name and campaign tag are recorded with the click, without cookies". | The same minimisation; the IP is only ever an HMAC (rule 14). |
   | 3. Staff-recorded enquiry | A lead created by sales for a customer who contacted us by phone or Zalo (name, optional phone, channel, route, note) | Handling the customer's own request for a service, before a contract. **Q-39 must confirm** this is an exception to consent under PDP Law 91/2025. | Policy: "staff may record an enquiry you make by phone or Zalo". | Phone optional; no IP, user agent or attribution; the normal lead retention (Q-17); staff roles only (`requireRole`). |
   | 4. Self-reported source | "How did you hear about us?" on the form; sales-tagged source | Optional field under the form consent (form) or under type 3 (staff). | Policy: the question is optional. | A fixed enum, no free text. |

7. **What does not change.**
   - Consent Mode basic, GTM only after ads consent, the Cloudflare beacon only after analytics consent, and server-side conversions only with ads consent all stay as they are.
   - No new vendor or tag system is added (ADR 0002 Decision 8 / ADR 0010 lanes): this is first-party measurement in our own database.
   - `43l_attr` keeps its contract.

8. **Activation is switched off until Q-39 is answered and the policy is published (ADR 0004 Decision 5).**
   - One public env flag, `NEXT_PUBLIC_SESSION_ATTRIBUTION`, read through `shared/config/env.public.ts`, gates the whole session path. When unset, three things hold:
     - the client sends no session params;
     - the server ignores any it receives;
     - `proxy.ts` counts no visits.
   - The self-reported question, the sales tag and staff leads (types 3–4) are gated by the same flag, so the switch-on matches the published policy.
   - The owner turns it on per site, in that site's env (`.env`, `.env.av`, `.env.gt`), after that site's privacy page is published with the new text.

## Alternatives considered

- **Keep consent-only attribution (status quo).** Correct, but it measures almost nothing for organic and AI traffic, which is the goal of A-07b and ADR 0011. Rejected by the owner, 2026-11-11.
- **A first-party source cookie set before consent (30–90 days).** This would keep the source across tabs and return visits. It breaks rule 14 (no cookies before consent) and is not strictly necessary storage. Rejected.
- **`sessionStorage` or `localStorage` for the session values.** This would survive a new tab in some browsers. It is still storage on the visitor's device before consent, with the same objection as a cookie. Rejected.
- **A client beacon (`/api/visit`) for visit counts.** It is a first-party analytics request fired before consent, and it adds client JS. The proxy already sees the request, so counting there sends nothing extra. Rejected.
- **Cloudflare Web Analytics for visits by source.** It runs only after analytics consent (ADR 0010), has no custom events, and can't be joined with contacts in the database. It stays the traffic lane, but it isn't the denominator for contact rates.
- **Batching visit counts in memory.** This means fewer writes, but the counts are lost on a restart, and it adds complexity at today's traffic. It is deferred: it becomes a follow-up if proxy p95 rises measurably.

## Consequences

- **Easier:**
  - the A-07 report shows sources for organic, AI and in-app traffic;
  - it shows a contact rate per source;
  - sales can tag sources and record Zalo and phone customers through to "Chốt đơn".
- **Harder:**
  - two keys (source and entry source) must be explained in the report;
  - the proxy now writes to the database, bounded, and failures are swallowed;
  - the TS/SQL classifier pairs grow;
  - the leads schema relaxes `phone`, `consent_at` and `consent_policy_version` for staff rows, behind a check constraint;
  - every admin consumer of those fields must handle null.
- **Accepted limits:**
  - Gemini, many apps and `rel=noreferrer` links send no referrer and show as `direct`;
  - Google AI Overviews look like Google search;
  - a reload counts as another entry;
  - "Lượt vào" means entry page views, not unique visitors.
  - The self-reported view is the cross-check for all of these.
- **Legal risk:** types 2b and 3 rest on a working position until Q-39 is answered. The flag (Decision 8) keeps them off in production until then.
- **Privacy policy:** each site's published privacy page gains the paragraph from the A-07b spec (AC-20) and a new `effectiveDate`. Leads then store the new version (`getLeadPolicyVersion()`). AV and GT follow at their port.
- **Verification:** the ADR 0004 consent matrix adds these checks:
  - with consent rejected, no cookie other than `43l_consent` and no storage key;
  - no request to any host other than the site's own, beyond what the matrix already allows;
  - `/go` and form requests carry only the Decision 2 fields;
  - no click-ID value in any `/go` URL or row without ads consent;
  - with the flag unset, none of the above params are sent and no `site_visits` row changes.
- **Follow-ups:**
  - A-07b (implementation);
  - Q-39 (legal confirmation);
  - Q-17 (retention of `site_visits` and the new lead columns);
  - the AV/GT ports (ADR 0012);
  - G-05, which keeps only the prompt panel.
