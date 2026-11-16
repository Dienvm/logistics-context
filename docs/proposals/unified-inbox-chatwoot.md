---
title: Unified customer inbox — WhatsApp, Telegram, Messenger and quote forms for 43 / AV / GT, with per-company sales access
status: draft
owner_repo: both
roadmap: [MS-04]
updated: 2026-11-16
---

# Unified customer inbox — WhatsApp, Telegram, Messenger and quote forms for 43 / AV / GT

> `roadmap` lists only the existing task this touches (MS-04, site-scoped roles). The `IN-*` rows below are **proposed**. They enter `10-roadmap.md` only when this proposal is accepted through an ADR.

## Problem

**Owner report, 2026-11-15/16.** This is a dated owner statement, not yet recorded in `01-business.md`.

- Contacts from the three sites (43logistics.vn, avlogistics.vn, gtlogistics.vn) reach **three personal numbers** that belong to the director. Their Zalo and WhatsApp are **personal accounts**, not WhatsApp Business (owner, 2026-11-16).
- The three companies belong to one parent group (owner, 2026-11-16).
- The director handles them, is often busy, and doesn't read English, Japanese or Korean. Foreigners, including foreigners living in Vietnam, therefore struggle to get a quote and close.

**Recorded state:**
- The site's contact channels are those in `CONTACT_CHANNELS`: `zalo`, `call`, `whatsapp`, `messenger`, `telegram`. Their targets are per-site `site_settings`.
- Quote-form leads (S-08b) are saved and shown in the A-06 inbox.
- Email and Zalo OA alert notifiers exist in code but are **not yet activated**: recipients and secrets are open (Q-28, Q-35).
- Chats happen on the phone. No one sees one customer across channels, and no second person can pick up.

**What the owner wants:**
- **One screen** for WhatsApp, Telegram and Messenger messages of all three companies, plus the three sites' quote requests.
- **Data split by company:**
  - `admin` sees all three companies;
  - a telesale (`sales`) sees only the company or companies they are assigned to.
- **Sales closes by phone.** The inbox gathers enquiries and gives telesales a ready-to-call work item.
- **Later:** an AI assistant that answers from confirmed price data and hands hard questions to staff; optionally, AI voice calls.

**Out of scope for now:**
- **Zalo** (owner, 2026-11-16: last, to be confirmed with the director). Personal Zalo has no official API (Q-40).
- **Translation, the AI assistant and voice** (phase 2–3, own specs and ADR).

> **Phase 1 does not solve the language barrier.** It gives shared handling and one screen. Foreign-language conversations still need a telesale who reads the language, until translation lands in phase 2.

## Proposed approach

**Self-host Chatwoot (open-source omnichannel inbox) beside the sites. Use one Chatwoot account per company, and connect each company's channels to its own account. Import quote-form leads into the same inbox as callback work items. Apply the same per-company scoping to the website admin (MS-04).**

### 1. Chatwoot hosting (app repo: `compose.yaml`, `deploy/`; amends ADR 0008)

**Services**
- `chatwoot-web` (Rails), `chatwoot-worker` (Sidekiq), its own `chatwoot-postgres` (with `pgvector`, which current images require) and `chatwoot-redis`.
- A pinned image tag, upgraded deliberately, never `latest`.

**Its own database, not Supabase**
- Chatwoot owns its schema and migrations. Mixing it into the Drizzle-managed database would break `db:migrate` and the RLS deny-all assumptions (rules 6–7).
- The site database stays the record for leads (A-06). Chatwoot holds conversations.

**Address**
- A staff subdomain, e.g. `inbox.43logistics.vn` (Q-43), through Caddy and Cloudflare (L-00b).
- Caddy proxies WebSocket (ActionCable). Cloudflare doesn't cache it.
- The subdomain is `noindex` and adds no JS to the public sites (rule 8).

**Capacity: same VPS, measured in IN-00 (owner, 2026-11-16: no second VPS; upgrade the plan if needed)**
- Chatwoot's published self-hosted starting point is **≥ 4 GB RAM and 2 vCPU**.
- The VPS has 8 GB / 2 vCPU, and the existing Compose `mem_limit`s already total 7.5 GB (3 GB `app`, 2 GB each for two more site services, 512 MB Caddy). Limits aren't usage, but no headroom is demonstrated.
- Shared CPU contention can also hurt the public sites' field CWV (ADR 0009) even though no client JS changes.
- IN-00 measures on the VPS itself, on the pinned version, under realistic load:
  - actual RAM, CPU and disk of the three site containers plus Chatwoot (web, worker, Postgres, Redis);
  - the peaks during a rolling deploy, a VPS-side image build (`vps-build.sh`) and the nightly backup.
- **Outcomes:**
  - If headroom is short, the owner upgrades the Hostinger plan: RAM and vCPU first, disk when attachments and backups grow.
  - The `mem_limit`s are re-balanced so a Chatwoot spike can't starve the site containers. Chatwoot runs with its own limits, and the sites keep theirs.
  - VPS-side image builds (`vps-build.sh`) are the heaviest peak, so they run outside working hours, or Sidekiq is paused during a build.

**Durability: amends ADR 0008**
- ADR 0008 says the VPS holds nothing irreplaceable except Caddy's certificates. Chatwoot makes conversations and attachments **production data on a VPS**.
- An ADR 0008 amendment (or a new ADR) has to set:
  - **Backups:** nightly `pg_dump` plus the storage volume, encrypted, copied off the host, with a retention period.
  - **Recovery targets:** proposed RPO 24 h and RTO 1 working day, for the owner to accept.
  - **Restore:** a rehearsal before go-live and after every major Chatwoot upgrade.
  - **Responsibility:** a named operator for upgrades and restores (Q-43).
  - **Rollback:** a pre-upgrade dump, because Chatwoot migrations aren't reversible.

**Ops**
- An upgrade runbook in `deploy/README.md`.
- Staff notification e-mail reuses the company SMTP decision (Q-28).
- Images are pulled, not built, so the manual deploy path (`deploy/deploy-from-mac.sh`) is unaffected.

### 2. Data split per company: one Chatwoot account each

Chatwoot supports several **accounts** per installation. Each account has its own inboxes, contacts, conversations, teams, labels, canned replies and reports. A user belongs to one or more accounts with a role per account (`administrator` or `agent`).

| Chatwoot account | Inboxes |
| --- | --- |
| 43 Logistics | WhatsApp, Telegram bot, Messenger page, "Web form 43logistics.vn" (API channel) |
| AV Logistics | WhatsApp, Telegram bot, Messenger page, "Web form avlogistics.vn" |
| GT Logistics | WhatsApp, Telegram bot, Messenger page, "Web form gtlogistics.vn" |

| Website role | Chatwoot membership |
| --- | --- |
| `admin` | `administrator` in all three accounts, switching account in the sidebar |
| `sales` (telesale) | `agent` only in the account(s) of the company or companies they cover (Q-43) |

**Why accounts, not one account with per-inbox membership**
- Inside one account, an agent sees only conversations of their inboxes. But the **Contacts** list and contact search span the whole account, which would show another company's customers.
- The owner's one hard requirement (2026-11-16): **a telesale of one company must not read another company's customer data.** An account boundary is the only hard wall Chatwoot offers. IN-00 confirms the contacts behaviour on the pinned version.
- **Legal arrangement:** owner decision, 2026-11-16 (Q-44). The three companies belong to one parent group, so no separate controller/processor arrangement is needed between them.

**Cost of the choice:**
- reports are per account, with no merged report;
- a customer who contacts two companies exists twice.

**Users**
- Chatwoot logins are separate from Clerk; Chatwoot SSO (SAML) is an Enterprise feature.
- Each telesale is created in both systems: in Clerk with role and `sites` (§4), and in Chatwoot with the matching account membership.
- The admin runbook has a checklist, and removal happens in both on the same day.
- Automation through the Clerk webhook and the Chatwoot Platform API is a later option.
- Every Chatwoot user enables 2FA (TOTP).

### 3. Channels

All channels are official APIs. No unofficial bridges.

**Telegram** (simplest, first)
- One bot per company, created in BotFather, connected to that account's Telegram inbox with its token.
- The site's `telegram` contact target (already a channel) points to the company's bot through `site_settings`, admin-verified (rule 1).

**Messenger**
- Each company's Facebook Page connects to its account's Facebook inbox.
- Self-hosted Chatwoot needs **our own Meta app** with `pages_messaging` (plus `pages_manage_metadata`, `pages_show_list`) approved in App Review, and a verified Business Portfolio (Q-42).
- Review takes days to weeks, so start it in IN-00.
- Messenger's 24-hour standard messaging window applies. Staff reply inside it, and we send no tagged messages outside it.

**WhatsApp: continuity is conditional, nothing is moved before IN-00 proves it**
- The three numbers use **personal** WhatsApp today (owner, 2026-11-16). Personal WhatsApp has no API.
- **Preferred path:** move a published number from WhatsApp to the **WhatsApp Business app** (free, same number, chats kept via backup), then onboard it to the Cloud API in **coexistence** mode, so the phone app and Chatwoot both send and receive.
- This requires Chatwoot's **embedded/Quick setup**. Chatwoot's manual setup doesn't support coexistence.
- IN-00 checks on a test number before any of the three real numbers is touched:
  - coexistence eligibility for a Vietnamese number;
  - which chat history syncs;
  - what the phone keeps.
- **Fallback:** a dedicated sales SIM per company on the Cloud API only (Q-41). That number replaces the director's number in that site's `whatsapp` target, which *is* a site change: verified `site_settings` plus the usual fact confirmation.
- **Per-company Meta setup:** a WhatsApp Business Account under the company's Business Portfolio, one per company or one group portfolio (Q-42).
- **Pricing (checked 2026-11-16, to re-check in IN-00):**
  - The Business app and Cloud API onboarding have no fee.
  - Messages from customers are free. Messages sent from the phone app stay free under coexistence.
  - Replies sent through the API: third-party sources report that from 2026-10-01 service messages are charged beyond **1,000 free per number per month**, at roughly **USD 0.011–0.015 per message for Vietnam**. Meta's own pricing page still says service messages are free.
  - Template messages that open a conversation are charged per message, and phase 1 sends none.
  - At current volumes this is close to zero per number.

**Quote form (S-08b) → inbox, as callback work items**
- **What it is.** A form submission becomes a conversation in that company's **API-channel inbox**. An API-channel conversation has **no outbound path to the customer**: a reply typed there reaches nobody. So the imported item is a **"cần gọi" work item**:
  - the lead summary;
  - the label `web-form`;
  - assignment to a telesale.

  The telesale calls, or messages the customer on a real channel. Then they set the lead's status in A-06.
  - Sending replies to form leads (e.g. by e-mail through the API channel's callback, or a WhatsApp template) is out of scope for phase 1.
- **Interface change.** Today `notifySales()` builds one Vietnamese `{subject, text}` and passes it to every `LeadNotifier.send()`. `LeadNotification` carries the lead fields but no source, and the site is the build's `currentSite`. A Chatwoot notifier needs structured data, so the change is:
  - `LeadNotifier.send()` receives the lead plus the built message, or the Chatwoot notifier is a separate step after `notifySales()`;
  - its site is `currentSite`;
  - configuration per site build: `CHATWOOT_BASE_URL`, `CHATWOOT_ACCOUNT_ID`, `CHATWOOT_INBOX_IDENTIFIER` (or inbox ID) and an API token, all server-only (rules 6, 15);
  - the call sequence: create or find the contact (by phone), create its contact-inbox, create the conversation, post the first message.
- **Fields that may leave Supabase:**
  - name, phone, route name, weight, goods type, message;
  - a link to `/admin/leads/{id}/`;
  - the site;
  - the **source group label only** (e.g. "Google Ads", "AI assistant", the A-07 groups).

  Never: the IP hash, user agent, click-ID values, consent records or the raw attribution payload (rule 14).
- **Build state.** Built **switched off** until the env is set (ADR 0004). It runs from `after()` like the others, with its own timeout, and one failing never stops another.
- **GT is a separate repo** (`projects/gtlogistics.vn/`), so the notifier is ported there in the same change set.

**Contact tracking is unchanged (rule 12).** Site buttons still go through `/go/[channel]` and log `contact_events`. No customer identifier from the inbox goes to GTM or Cloudflare.

### 4. Per-company scoping in the website admin (MS-04, app)

Today `admin` and `sales` see every site's leads (MS-04 partial, the Q-33 answer of 2026-10-30). The owner now limits telesales to their company. This is MS-04's "site-scoped roles" for `sales` only. Q-36 stays open for `editor` and for goods-rule approval.

**Claim and membership source**
- Clerk `publicMetadata.sites` is a list of `43l | av | gt`, copied into the session token next to `role` and validated with Zod in `modules/auth`.
  - `admin` ignores it and has all sites.
  - `sales` needs a non-empty list.
- The Clerk webhook mirrors `sites` into `profiles` (new column), so server code can check **another** user's scope, e.g. for the owner picker.
- Access decisions still use the **session** claim (06 "Auth & roles"). `profiles` serves only listing and validating assignees.

**Rollout order (no lock-out)**
1. Ship code that reads `sites` but treats a **missing** claim for `sales` as "all sites" (today's behaviour). Log a warning.
2. Admin sets `sites` on every sales user (runbook; Q-43 gives the list). Each user's session token refreshes on its next renewal; a sign-out forces it.
3. Ship the strict switch: missing or empty means no lead access (deny by default).
4. **Revocation:** removing a site from `publicMetadata` takes effect at the next token refresh (about a minute). For immediate revocation, admin also ends the user's sessions in Clerk (runbook step).

**Enforcement.** One server helper, `staffSiteScope()` → `'all' | SiteCode[]`, applied in every lead read, write, ID lookup and export:
- the A-06 list, detail, status, owner, notes and CSV export;
- staff-created leads, where the site must be in scope;
- source and attribution edits;
- the filter-option queries (routes, owners, sources);
- A-07 counts;
- the shell's new-lead badge.

Two further rules:
- A lead outside scope returns 404, not 403, so its existence isn't revealed.
- The owner picker lists only `admin`/`sales` profiles whose `sites` include the lead's site.

**New work (not existing today)**
- A **Website filter** in A-06. `LeadFilters` has none yet; the Website column exists.
- **The scope used, recorded in `lead_exports`.** It logs exports today but not the scope.
- **Membership administration:** done in the Clerk dashboard through the runbook. A-09 is settings, not users. A users screen is a separate feature if wanted.

### 5. Later phases (separate specs and an ADR)

**Phase 2: translation and AI assistant**
- Translation of incoming messages into Vietnamese, and of staff replies into the customer's language.
- Then a Chatwoot **Agent Bot** backed by an HMAC-verified route handler in the app. It answers only through tool calls to the confirmed price engine, approved goods rules and published FAQs (rules 1–2).
- It runs in draft mode first, with handoff rules (unapproved goods, large shipments, negotiation, complaints, a request for a person, low confidence) and a Vietnamese "cần gọi" summary.
- **Still to decide in that phase's ADR:** the translation and LLM provider, and the privacy-policy line about AI-assisted replies.

**Phase 3 (optional):** AI voice callback, only when the customer asks for a call.

**Zalo:** after the director decides (Q-40).

### Proposed roadmap rows (a new "Phase 7 — Customer inbox", after acceptance)

| ID | Task | owner_repo / operator | Depends on |
| --- | --- | --- | --- |
| IN-00 | Spike on a throwaway Compose:<ul><li>account isolation of contacts;</li><li>capacity (§1);</li><li>WhatsApp coexistence on a test number;</li><li>Telegram and API-channel flows.</li></ul>Owner starts Meta Business verification and App Review. | both · dev + owner | Q-42 |
| IN-01 | Chatwoot on the same VPS (plan upgraded if IN-00 says so), Caddy subdomain, encrypted off-host backups, restore rehearsal, runbook; three accounts, users and 2FA. | app · dev, named operator | IN-00, ADR 0008 amendment, Q-43 |
| MS-04 (sales part) | `sites` claim + `profiles.sites`, `staffSiteScope()`, rollout steps 1–3, Website filter, export scope. In 43 and ported to GT. | app | — |
| IN-02 | Telegram bot per company + `site_settings` targets | app + owner | IN-01, Q-42 |
| IN-03 | Chatwoot lead import (callback work items), notifier interface change, ported to GT | app (43 + GT repos) | IN-01, privacy-policy paragraph |
| IN-04 | Messenger per company | app + owner | IN-01, App Review |
| IN-05 | WhatsApp per company (coexistence or dedicated SIM) | owner + app | IN-00 result, Q-41, Q-42 |
| IN-06 | Translation + AI assistant (draft → auto), with its ADR | both | IN-01…IN-05, provider choice |

Company-scoped go-live for telesales needs **MS-04 (sales part) and IN-01** together. No telesale gets a Chatwoot login before their Clerk `sites` matches.

## Alternatives considered

1. **Build the inbox inside the website admin.** Rejected: weeks to months for no business advantage over a maintained open-source inbox, and it adds a WebSocket server to one-process-per-site Next apps. It would need:
   - real-time messaging;
   - three channel APIs with webhooks, media and receipts;
   - assignment and mobile notifications.
2. **One Chatwoot account with per-company inboxes and teams.**
   - For: merged reports and one login context.
   - Against: account-wide contacts would expose other companies' customers to telesales (§2).
   - Can be revisited if IN-00 shows contacts are inbox-scoped on the pinned version.
3. **A hosted inbox (Chatwoot Cloud, or a Vietnamese SaaS such as Pancake).**
   - For: no ops, no capacity or backup risk.
   - Against: a per-seat monthly fee and another processor holding customer conversations (to disclose). For a Vietnamese SaaS, harder bot integration with our price engine.
   - Chatwoot Cloud is the fallback only if the VPS can't carry it even after a plan upgrade (the owner prefers one VPS).
4. **tawk.to (hosted live chat; evaluated 2026-11-16).**
   - For: free core chat, unlimited agents, per-property (per-site) agent access that could separate the companies, and zero ops.
   - Against:
     - it is mainly a **website chat widget**, and its WhatsApp/Telegram support is unconfirmed (sources disagree; not in its own documentation);
     - it has no API-channel equivalent for importing our form leads;
     - its AI Assist answers from an uploaded knowledge base, a second copy of prices that drifts from the rate tables (rule 2);
     - the widget sets cookies and loads third-party JS on the public pages, so it would have to wait for consent (rule 14) and count against the JS budget (rule 8), and most visitors would never see it;
     - customer data sits with a third party;
     - paid add-ons: AI Assist about USD 29–399/month, branding removal about USD 29–39/month, voice agents from USD 49/month.
   - Rejected: the need is one inbox for messaging apps. Vietnamese customers don't use web chat (the old form produced 12 leads in about 3 years).
5. **Better alerts to the director's phone only.** Solves neither shared handling nor the language barrier. Rejected.

## Consequences

**Performance and SEO**
- No change to public pages or redirects. The inbox is a `noindex` staff subdomain.
- Risk: server-side contention if co-located (§1). IN-00 decides the host, and field CWV (ADR 0009) is watched after go-live.

**Personal data (rule 14; ADR 0012)**

Phase 1 creates a new store of customer data: transcripts, names, phones, attachments and their backups, on the VPS with off-host copies.

**Owner decision, 2026-11-16 (Q-44).** The three companies belong to one parent group, so no separate legal arrangement between them is pursued. The binding requirement is **isolation**: a telesale of one company never reads another company's customer data. That isolation is enforced in Chatwoot (§2) and in the website admin (§4).

What still applies from the golden rules:
- **The privacy policy per site (VI and EN)** gets one paragraph naming the inbox and the messaging providers. The policy already has to describe how leads are processed (rule 14, ADR 0012), and the lead form's `consent_policy_version` moves with it. This is an editor task, not a legal gate.
- **No raw IP stored:** Chatwoot's request logs and contact metadata are checked in IN-00, and IP capture is disabled or purged where Chatwoot allows. The app sends no IP (§3).
- **Retention:** transcripts follow the lead retention rule once it is set (07 "PII", NEEDS CONFIRMATION). Until then nothing is purged automatically.

**Security**
- A second internet-facing login with customer data. Required:
  - 2FA for every user;
  - Cloudflare WAF on the subdomain;
  - no public sign-up;
  - pinned security upgrades;
  - server-only API tokens (rule 15).
- A stolen telesale login exposes only that company's account.

**Cost (bounded assumptions, to be priced in IN-00)**
- Licence: Chatwoot community edition, 0.
- Channels:
  - Telegram and Messenger: free.
  - WhatsApp: see §3 pricing. Near zero at current volume, but possibly charged beyond 1,000 service messages per number per month from 2026-10-01.
  - Zalo OA, if Q-40 chooses it: the API/chatbot tier ("Tăng trưởng") is 2,500,000 đ/year per OA (VAT included, zalo.solutions price list from 2026-06-01), about 7,500,000 đ/year for three companies. Proactive messages outside the 48-hour window and ZNS are charged per message.
- Hosting: the same VPS (owner). If IN-00 shows a shortfall, a Hostinger plan upgrade (RAM/vCPU, then disk), plus off-host backup storage that grows with attachments.
- Possible SIMs if the WhatsApp fallback is used (Q-41).
- SMTP: within Gmail sending limits for staff notifications; otherwise a transactional provider.
- People: setup, monthly upgrades and backup checks, about a few hours a month for the named operator.
- The owner sets a monthly ceiling, and IN-00 reports against it (Q-43).

**Ops**
- One more stack to upgrade, back up and restore.
- User lifecycle in two systems.
- Meta verification and App Review are owner tasks with lead time.

**Policy change**
- Telesales lose the cross-company lead access the 2026-10-30 answer allowed. `admin` keeps it.
- Only the `sales` part of Q-36 is answered by this proposal.

**i18n**
- Admin scope messages go to `messages/*`.
- Chatwoot has a Vietnamese UI.
- Phase 1 has no conversation translation.

**Documentation follow-through on acceptance**
- An ADR (inbox + ADR 0008 amendment).
- `06-architecture.md` (auth `sites` claim, the Chatwoot boundary), `07-data-model.md` (`profiles.sites`), `10-roadmap.md` (Phase 7, MS-04 detail), `11-open-questions.md`.
- AGENTS.md §3 Hosting row.
- No current doc is superseded.

**GT domain.** The domain is **gtlogistics.vn**, as in `01-business.md`, Q-37 and the Caddyfile (owner, 2026-11-16). AGENTS.md, ADR 0012, the roadmap and older docs that said `gtlogistic.vn` are corrected in the same change.

### Next plan (not part of this proposal): Supabase → Postgres on the VPS

**Owner direction, 2026-11-16.** When stored data grows large, move the site database from Supabase to a local PostgreSQL on the same VPS. It gets its own proposal and ADR (it reverses part of ADR 0001/0002 and changes ADR 0008's "no irreplaceable data" stance again). Points to carry into it:
- **One Postgres server on the VPS can host both databases:** the site database and Chatwoot's, with separate roles. That shares the backup, restore and upgrade runbook set up for IN-01.
- **What Supabase provides today and must be replaced:**
  - Storage buckets for media and OG images (A-04);
  - managed backups and point-in-time recovery;
  - the connection pooler;
  - the dashboard.
- **Drizzle and the app code barely change:** the server-only `DATABASE_URL`, plus RLS deny-all if kept.
- **The trigger** should be a measured threshold (database size against the Supabase plan limit, or cost), not a date.
- Database and Supabase Storage size are worth recording monthly from IN-01 on, so the move is planned before a limit is hit.

## Open questions

New owner questions in `docs/context/11-open-questions.md`:

- **Q-40:** Zalo: unofficial bridge on the personal numbers (free, ban risk), or Zalo OA per company (official; API tier about 2.5 million đ/year each), or a dedicated sales SIM. Not before the director decides.
- **Q-41:** WhatsApp: the three numbers are personal accounts (owner, 2026-11-16). Still open: may they move to the Business app with coexistence, which IN-00 tests on a test number first? If not, is a dedicated sales SIM per company acceptable, published instead?
- **Q-42:** Meta and Telegram ownership:
  - the Facebook Page of each company;
  - the Business Portfolio admin, one per company or for the group;
  - who holds the Telegram bots.
- **Q-43:** People and scope:
  - telesales and the company or companies each covers;
  - hours, target reply time, out-of-hours cover;
  - the named Chatwoot operator;
  - the subdomain;
  - a monthly cost ceiling.
- **Q-44:** ~~Privacy gates per company~~ **Answered 2026-11-16.** The companies belong to one parent group, so no legal gates between them. The requirement is that telesales can't read another company's customer data (§2, §4).

Existing:
- Q-28/Q-35: alert recipients per site.
- Q-33: answered for AV leads; narrowed for `sales` by §4.
- Q-36: `sales` part only.
- Q-37: GT facts.

## Related

- ADR 0012 multi-site; roadmap MS-04, MS-08, MS-09.
- ADR 0008 VPS deployment (to amend), ADR 0010 Cloudflare edge, ADR 0009 field CWV gate.
- ADR 0004 code-only delivery (integrations built switched off).
- S-08b notifiers (`modules/leads/application/notify-sales.ts`, `modules/leads/domain/lead.ts`), A-06 leads inbox (`modules/leads/infrastructure/admin-lead-filters.ts`), A-07 analytics.
- AGENTS.md rules 1–2, 6–7, 12, 14–15.
- `docs/proposals/multi-site-shared-database-admin.md`.
