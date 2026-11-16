# ADR 0014 — Unified customer inbox: self-hosted Chatwoot, one account per company

- Status: Accepted (2026-11-16)
- Amends:
  - **ADR 0008 Decision 6:** the VPS will hold non-reproducible production data (inbox conversations and attachments), so it gets encrypted off-host backups, recovery targets and restore rehearsals. ADR 0008 Decision 4 ("no Redis") stays true for the site app; Chatwoot's Redis is Chatwoot's own.
  - **ADR 0012:** narrows the 2026-10-30 Q-33 answer. `sales` staff see only the sites (companies) they are assigned to, and `admin` keeps all sites.
- Owner repo: both
- Roadmap: new Phase 7 (IN-00…IN-06); MS-04 (site-scoped roles, `sales` part)
- Proposal: `docs/proposals/unified-inbox-chatwoot.md`
- Context:
  - **Who answers today.** Contacts from 43logistics.vn, avlogistics.vn and gtlogistics.vn reach three personal numbers of the director, with personal Zalo and WhatsApp accounts (owner, 2026-11-15/16). The director is busy and doesn't read English, Japanese or Korean, so enquiries wait and foreign customers struggle to get a quote.
  - **What the owner wants (2026-11-16):**
    - one screen for WhatsApp, Telegram, Messenger and the three sites' quote requests;
    - `admin` sees all three companies;
    - a telesale sees only their own company's data;
    - sales still closes by phone.
  - **What is deferred:** Zalo (to confirm with the director), and an AI assistant and voice later.
  - **Constraints:**
    - The three companies belong to one parent group. The owner requires only that one company's telesale can't read another company's customer data, with no further legal gates between them (Q-44).
    - Same VPS, with the plan upgraded if needed, and no second server (owner).
    - Personal WhatsApp and personal Zalo have no official API.

## Decisions

1. **Chatwoot community edition, self-hosted on the existing VPS**, beside the site containers.
   - Services: `chatwoot-web`, `chatwoot-worker`, its own Postgres (with `pgvector`) and its own Redis.
   - A pinned image tag; upgrades only after a pre-upgrade dump.
   - Served at a `noindex` staff subdomain through Caddy and Cloudflare (WebSocket proxied, not cached). It adds nothing to the public sites.
   - Capacity is measured on the VPS in IN-00. If it is short, the Hostinger plan is upgraded (RAM/vCPU first, then disk). Container memory limits keep a Chatwoot spike from starving the sites.
2. **Chatwoot keeps its own database.** The site database (Supabase today) stays the record for leads (A-06). Chatwoot holds conversations.
   - Chatwoot never shares the Drizzle-managed schema.
   - The app reaches Chatwoot only through its HTTP API with server-only tokens (rules 6, 15).
3. **One Chatwoot account per company** (43 Logistics, AV Logistics, GT Logistics). Each account holds that company's WhatsApp, Telegram, Messenger and web-form (API channel) inboxes.
   - `admin` is `administrator` in all three accounts.
   - A telesale is `agent` only in the account(s) of the company or companies they cover.
   - The account is the isolation boundary, because contacts are account-wide inside Chatwoot.
4. **Official channel APIs only. No unofficial bridges in this decision.**
   - **Telegram:** one bot per company.
   - **Messenger:** each company's Page, through our own Meta app with `pages_messaging` approved.
   - **WhatsApp:** the published number moves from personal WhatsApp to the WhatsApp Business app and joins the Cloud API in coexistence mode. This is proven on a test number in IN-00 before any real number is touched. If coexistence fails, the fallback is a dedicated sales SIM per company, published as a verified `site_settings` change.
   - **Zalo** is out of this decision (Q-40) and needs its own decision.
5. **Quote-form leads enter the inbox as callback work items.**
   - After a lead is saved, a switched-off-by-default step (ADR 0004) posts it to its company's API-channel inbox. An API-channel conversation can't reply to the customer, so the item is a "cần gọi" task.
   - **Fields that may be sent:** name, phone, route, weight, goods type, message, site, source group label and a link to the A-06 lead.
   - **Fields that are never sent:** IP hash, user agent, click-ID values, consent records or the raw attribution.
   - The step is ported to the GT repo too.
6. **The website admin is scoped the same way (MS-04, `sales` part).**
   - **Claim:** a Clerk `sites` claim (`43l | av | gt` list) beside `role`, mirrored into `profiles.sites` for assignment checks. Access is still decided by the session claim.
   - **Enforcement:** one server helper `staffSiteScope()` applies the scope to every lead and analytics read, write, ID lookup, filter option, export and badge. A lead outside scope returns 404.
   - **Rollout without lock-out:**
     1. A missing claim means all sites, with a warning.
     2. Admin sets `sites` on every sales user.
     3. The strict switch makes missing or empty mean no access.
   - **Revocation:** at the next token refresh, or immediately by ending the user's sessions.
   - No telesale gets a Chatwoot login before their Clerk `sites` matches their Chatwoot accounts.
7. **Durability on the VPS (amends ADR 0008 Decision 6):**
   - nightly encrypted `pg_dump` plus the storage volume, copied off the host, with a retention period;
   - recovery targets RPO 24 h and RTO 1 working day;
   - a restore rehearsal before go-live and after every major Chatwoot upgrade;
   - a named operator (Q-43).
8. **Contact tracking is unchanged.**
   - Site buttons still go through `/go/[channel]` and log `contact_events` (rule 12).
   - No inbox data reaches GTM or Cloudflare.
   - The privacy policy of each site (VI/EN) gains a paragraph naming the inbox and the messaging providers (rule 14).
   - Chatwoot IP capture is disabled or purged where it allows (no raw IP).

## Alternatives considered

- **Build the inbox inside the website admin.** Rejected: months of work, and a WebSocket server inside one-process-per-site Next apps. It would need real-time messaging, three channel APIs, assignment and mobile notifications.
- **One Chatwoot account with per-company inboxes and teams.** Rejected: account-wide contacts would show other companies' customers to telesales. It can be revisited if IN-00 shows contacts are inbox-scoped on the pinned version.
- **tawk.to** (evaluated 2026-11-16). Rejected:
  - it is mainly a website chat widget, and its WhatsApp and Telegram support is unconfirmed;
  - it can't import our form leads;
  - its AI Assist keeps a second copy of prices (rule 2);
  - the widget's third-party JS and cookies must wait for consent (rules 8 and 14);
  - Vietnamese customers don't use web chat.
- **Chatwoot Cloud or a Vietnamese SaaS (e.g. Pancake).** Not chosen:
  - a per-seat fee;
  - a third party holds conversations;
  - harder bot integration with our price engine.

  Chatwoot Cloud stays the fallback only if the VPS can't carry the stack even after a plan upgrade.
- **An unofficial personal-Zalo/WhatsApp bridge.** Excluded: account-ban risk on the director's numbers. Zalo is decided separately (Q-40).

## Consequences

**Easier**
- One screen and shared handling for three companies.
- A telesale stolen login exposes one company only.
- The phase-2 AI assistant can call our own price engine (rules 1–2) instead of a copied knowledge base.
- No change to public pages, SEO, redirects or the JS budget.

**Harder**
- One more stack to upgrade, back up and restore on a VPS that already runs three site containers.
- The VPS stops being "reproducible except certificates".
- Users are managed in two systems (Clerk and Chatwoot) until automated.
- Meta Business verification and App Review are owner tasks with lead time.
- Reports are per company, with no merged report.
- A customer who contacts two companies exists twice.

**Not solved yet**
- The language barrier. Phase 1 needs a telesale who reads the customer's language. Translation and the AI assistant (IN-06) need their own ADR, which picks the provider.

**Cost**
- Chatwoot licence: 0.
- Telegram and Messenger: free.
- WhatsApp: near zero at current volume. Third-party sources report charges beyond 1,000 service messages per number per month from 2026-10-01.
- A possible Hostinger plan upgrade.
- Zalo OA, if later chosen: about 2.5 million đ/year per company.

**Follow-ups**
- **Roadmap Phase 7:** IN-00 (spike), IN-01 (Chatwoot host, accounts, backups), IN-02 (Telegram), IN-03 (lead import), IN-04 (Messenger), IN-05 (WhatsApp), IN-06 (translation and AI, own ADR).
- **MS-04:** `sales` scoping.
- **Owner questions:** Q-40–Q-43.
- **Later direction (owner, 2026-11-16):** move the site database from Supabase to Postgres on the VPS when the data grows. That needs its own proposal and ADR; one Postgres server could then host both databases.
