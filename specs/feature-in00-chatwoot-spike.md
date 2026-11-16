---
title: Prove Chatwoot on the production VPS before building the inbox
type: feature
status: draft
owner_repo: both
roadmap: IN-00
priority: must-have
blocked_by_questions: [Q-41, Q-42, Q-43]
updated: 2026-11-16
---

## Feature: Prove Chatwoot on the production VPS before building the inbox

### Problem Statement

ADR 0014 puts a self-hosted Chatwoot (web, Sidekiq worker, Postgres, Redis) on the **same** Hostinger VPS that already serves 43logistics.vn, avlogistics.vn and gtlogistics.vn (owner, 2026-11-16: no second VPS; upgrade the plan if needed). Four assumptions behind ADR 0014 are unproven, and IN-01 can't be specified safely until they are measured:

1. **Capacity.** Chatwoot's published starting point is ≥ 4 GB RAM / 2 vCPU. The VPS is 8 GB / 2 vCPU with Compose `mem_limit`s already totalling 7.5 GB. Nobody knows the real headroom, or the peaks during a VPS-side build, a deploy or a backup.
2. **Isolation.** ADR 0014 uses one Chatwoot account per company, because inside one account contacts are account-wide. That has to be shown on the pinned version, in the UI and through the API.
3. **Channels.** Telegram and the API channel (for form leads, IN-03) must work end to end through a public HTTPS subdomain behind Caddy.
4. **WhatsApp coexistence.** We don't know whether it works for a Vietnamese number with a self-hosted Chatwoot (embedded signup), or which history syncs.

Roadmap row: IN-00 (Phase 7, ADR 0014).

### Proposed Solution

A time-boxed spike on the production VPS during an off-hours window (21:00–23:30 Vietnam time), with hard memory limits and an abort rule that protects the three sites. The Chatwoot Compose file, env template, Caddy block and measurement scripts are kept in the app repo under `deploy/chatwoot/` as the draft for IN-01 (owner choice). Spike data is test data only and is wiped at the end.

The output is a written **spike report** with:
- capacity numbers;
- the isolation result;
- channel results;
- the WhatsApp finding;
- a recommendation: go on the current plan, or upgrade the Hostinger plan (and to what).

The staff address is `https://inbox.43logistics.vn` (owner confirmed, 2026-11-16).

### Acceptance Criteria

**Artifacts (app repo)**
- [ ] **AC-01** `deploy/chatwoot/` contains:
  - `compose.chatwoot.yaml`: services `chatwoot-web`, `chatwoot-worker`, `chatwoot-postgres` (pgvector image), `chatwoot-redis`; images pinned **by version and digest**; `mem_limit`s web 1.5 GB, worker 1 GB, postgres 768 MB, redis 256 MB; restart `unless-stopped`; named volumes; joins the existing Caddy network; no published host ports.
  - `env.template`: every variable with a comment and no values for secrets. Includes `ENABLE_ACCOUNT_SIGNUP=false`, `FRONTEND_URL=https://inbox.43logistics.vn`, `FORCE_SSL` and SMTP left empty.
  - `Caddyfile.inbox` snippet: the `inbox.43logistics.vn` site, reverse proxy to `chatwoot-web:3000` with WebSocket, and `X-Robots-Tag: noindex, nofollow`.
  - `measure.sh`: samples `docker stats --no-stream`, `free -m`, load average, `df` and an HTTPS timing of each site's home page every 10 s to a CSV.
  - `README.md`: start, stop, wipe and abort commands.

  Real secrets live only in `~/chatwoot/.env.chatwoot` on the VPS, which is untracked (rule 15). gitleaks passes.
- [ ] **AC-02** Given the window is open, when `docker compose -f deploy/chatwoot/compose.chatwoot.yaml up -d` runs on the VPS, then:
  - the site services (`app`, `app-av`, `app-gt`, `caddy`) are not restarted or rebuilt;
  - `https://inbox.43logistics.vn` serves the Chatwoot login over TLS with the `noindex` header;
  - the sign-up page is disabled.

**Capacity**
- [ ] **AC-03** Given Chatwoot is running, `measure.sh` records at least these phases, each ≥ 10 minutes unless noted:
  - (a) idle, sites only, as the baseline before start;
  - (b) Chatwoot idle;
  - (c) Chatwoot under a scripted load of about 200 inbound test messages over 10 minutes across the three accounts;
  - (d) one VPS-side site image build (`~/build/vps-build.sh` for one site) with Chatwoot running;
  - (e) one `pg_dump` of the Chatwoot database.

  The CSV and a summary table go into the report: per-phase peak and p95 RAM per container, host available RAM, swap used, CPU load, and site home-page TTFB p95.
- [ ] **AC-04 Abort rule.** If, during any phase:
  - host available RAM drops below 512 MB; or
  - swap use grows by more than 256 MB; or
  - any container is OOM-killed; or
  - any site's home-page TTFB p95 over 1 minute exceeds 2× its phase (a) value, or any site returns a non-2xx;

  then Chatwoot is stopped at once (`compose … stop`), the phase is recorded as failed with its numbers, and the window ends. A failed phase is a valid spike result: it means a plan upgrade.

**Isolation**
- [ ] **AC-05** Given three Chatwoot accounts "43 Logistics", "AV Logistics" and "GT Logistics", each with one test inbox and test contacts, and a user `agent-av` who is `agent` only in "AV Logistics":
  - when `agent-av` uses the UI, they can't list, search or open any contact or conversation of the other two accounts;
  - their API token gets 401/404 on `GET /api/v1/accounts/{43-id}/contacts` and `/conversations`.

  Both results are recorded with the pinned version.
- [ ] **AC-06** Inside "AV Logistics", with two inboxes and `agent-av` a member of only one, the report records whether that agent can see contacts that exist only in the other inbox, in the Contacts list, in search and via the API. This confirms or refutes the reason ADR 0014 chose accounts over inboxes.

**Channels**
- [ ] **AC-07 Telegram.** Given a throwaway test bot connected to "AV Logistics":
  - a message to the bot from a personal Telegram account appears in Chatwoot within 10 s;
  - an agent reply reaches the Telegram chat;
  - attachments (one photo) work both ways.
- [ ] **AC-08 API channel.** Given an API-channel inbox in "43 Logistics", when `deploy/chatwoot/api-smoke.sh` runs with **fake** lead data (no real customer), then:
  - a contact is created or found by phone;
  - its contact-inbox and a conversation are created;
  - the first message carries the lead-summary format IN-03 will use;
  - the label `web-form` is applied.

  The script reads the token from env and prints no secret.
- [ ] **AC-09 WhatsApp coexistence**, only on the **test number** (see Dependencies):
  - the report records whether Chatwoot's WhatsApp embedded signup can be configured on a self-hosted instance with our own Meta app (app ID and configuration ID), or whether it needs a Tech Provider or a BSP;
  - whether the Vietnamese test number on the WhatsApp Business app is offered coexistence;
  - after connecting: whether a message from a second phone appears in Chatwoot and on the Business app, and a reply from each side reaches the customer;
  - how much history synced;
  - which app features changed.

  If Meta verification isn't done within the spike's two weeks, AC-09 is recorded as "pending" and moves to IN-05. That does not fail IN-00.
- [ ] **AC-10 Meta App Review.** The owner has started Meta Business verification and submitted the App Review request for `pages_messaging` (plus `pages_manage_metadata`, `pages_show_list`) for the Messenger and WhatsApp work. The report records the submission date and status (Q-42).

**Personal data**
- [ ] **AC-11** The report records where the pinned Chatwoot stores client IP addresses (contact `additional_attributes`, Rails and Nginx-style logs, Sidekiq), and which settings or log rotation keep raw IPs from being retained for API, Telegram and WhatsApp contacts (rule 14). No real customer data enters the spike.

**Close-out**
- [ ] **AC-12** At the end, `compose … down -v` removes the Chatwoot containers and volumes. The `inbox` DNS record and the Caddy block are kept or removed per the report's recommendation. The three sites are verified 200 after teardown.
- [ ] **AC-13** The spike report is published in the app PR body and copied into this spec's "Spike results" section in the context impl PR. It ends with:
  - **Capacity:** go on the current plan, or a plan upgrade with a target size;
  - **Isolation:** account model confirmed or not;
  - **Channels:** Telegram and API channel OK or not;
  - **WhatsApp:** coexistence OK, BSP needed, or pending;
  - the inputs IN-01 needs (memory limits, backup duration, version).

### Scope

**In scope:**
- The `deploy/chatwoot/` artifacts.
- One off-hours window on the VPS, with a second window allowed if the first aborts or WhatsApp verification lands later.
- Capacity, isolation, Telegram, API-channel and WhatsApp-coexistence tests on test accounts and test numbers.
- The owner starting Meta verification and App Review.
- The spike report.

**Out of scope:**
- **Production use:** real customers, real company numbers, the three published WhatsApp numbers and real Facebook Pages' traffic.
- **IN-01 work:** backups, restore rehearsal, 2FA enforcement, user onboarding, SMTP.
- **The site side:** the app-side lead import (IN-03) and any change to `modules/*` or public pages.
- **Other channels:** Zalo (Q-40), and Messenger beyond the App Review submission.
- **The Hostinger plan upgrade itself.** The spike recommends; the owner orders it.

### Affected Areas

| Repo | Layer | File / Path |
|------|-------|-------------|
| app | deploy | `deploy/chatwoot/compose.chatwoot.yaml` (new) |
| app | deploy | `deploy/chatwoot/env.template` (new), `deploy/chatwoot/Caddyfile.inbox` (new) |
| app | deploy | `deploy/chatwoot/measure.sh`, `deploy/chatwoot/api-smoke.sh`, `deploy/chatwoot/README.md` (new) |
| app | deploy | `deploy/Caddyfile` (import of `Caddyfile.inbox`, only for the window, or kept per AC-12) |
| VPS | ops | `~/chatwoot/.env.chatwoot` (untracked), `~/chatwoot/measure-<date>.csv` |
| owner | DNS | A record `inbox.43logistics.vn` → VPS at Tenten (Cloudflare later, L-00b) |
| context | spec | this spec's "Spike results" section (context impl PR) |

### Golden-rule checks

- **Rule 15:** secrets only in the untracked VPS env file; `env.template` committed without values; scripts never echo tokens; gitleaks passes.
- **Rule 14:** no real customer data; IP retention findings recorded (AC-11); volumes wiped (AC-12).
- **Rule 8 and ADR 0009:** public pages unchanged. Site TTFB is monitored, and the spike aborts on regression (AC-04).
- **Rule 13:** `check:redirects` still passes. The new subdomain doesn't touch site hosts.
- **ADR 0008:** site services are not restarted. Manual operation, since Actions are blocked (memory: manual deploy on the VPS).

### Dependencies & Risks

- **Depends on:**
  - ADR 0014 (logistics-context PR #110);
  - VPS SSH access;
  - the owner adding the `inbox` A record at Tenten before the window.
- **Blocked by questions** (placeholders, ADR 0004):
  - **Q-42** (Meta Business admin, Facebook Pages, who holds bots): AC-10 and AC-09 need it. Without it they are recorded "pending" and the rest of IN-00 proceeds.
  - **Q-41** (published numbers): not touched by the spike.
  - **Q-43** (operator, cost ceiling): the report's recommendation is priced against it when answered.
- **WhatsApp test number.** The three published numbers are never used. The test runs on **one personal number that is not published on any site** (e.g. the developer's own), with its owner's consent:
  - it is switched from WhatsApp to the free WhatsApp Business app (back up chats first);
  - converting back later is possible but may not keep every feature.

  If no such number is available, AC-09 is "pending".
- **Risk: memory pressure on live sites.** Mitigated by the off-hours window, hard `mem_limit`s, `measure.sh`, the AC-04 abort rule and a single `stop` command.
- **Risk: Chatwoot image size and disk.** Images are several GB. `df` is checked before the pull, and the pull aborts if free disk would fall below 10 GB.
- **Risk: Telegram and Meta webhooks need public HTTPS.** Hence the real subdomain. The sign-up page is disabled, and only test accounts exist during the window.

### Manual Verification Plan

- **Before the window:**
  1. `df -h`, `free -m`, `docker ps` recorded.
  2. Phase (a) baseline for 10 min with `measure.sh`.
  3. The three sites return 200.
- **During the window:**
  1. Run phases (b)–(e) per AC-03, watching AC-04.
  2. Run the isolation steps (AC-05, AC-06) through the UI at `https://inbox.43logistics.vn` and through `curl` with each user's API token.
  3. Run Telegram (AC-07) and `api-smoke.sh` (AC-08).
  4. Run WhatsApp (AC-09) if Meta verification is ready.
- **After the window:**
  1. `down -v`.
  2. Sites 200.
  3. `pnpm -C projects/43logistics.vn check:redirects --base https://43logistics.vn`.
  4. Confirm no Chatwoot containers or volumes remain (`docker ps -a`, `docker volume ls`).
- **Validation commands (app PR):** `pnpm -C projects/43logistics.vn lint` (Biome covers the yaml/md it formats), `typecheck`, `build`, `check:redirects`; `shellcheck deploy/chatwoot/*.sh` if available; gitleaks in CI. No automated tests (ADR 0004).
- **Seed needs:** none from the site database. Test accounts, contacts and messages are created inside the spike, with fake names and phones.

### Implementation Hints

- Follow the existing `compose.yaml` conventions (Caddy network name, `mem_limit`, `restart`), but keep Chatwoot in its **own** Compose file so a `stop` or `down -v` can't touch the site services.
- **Chatwoot setup:**
  - run `bundle exec rails db:chatwoot_prepare` once through `chatwoot-web` (one-off `run --rm`);
  - create the three accounts and the users with the Rails console or the Platform API;
  - record the commands in `deploy/chatwoot/README.md` so IN-01 can repeat them.
- **Load script:** drive inbound messages through the API channel (no external service), spread across accounts. Keep the payload fake.
- **`measure.sh`:** write the CSV header once, then append rows. Use `curl -o /dev/null -s -w '%{time_starttransfer}'` per site. Keep it POSIX `sh`, so it works with the husky `sh -e` (memory: dev machine quirks).
- **Manual deploy path:** copy `deploy/chatwoot/` to the VPS with the existing deploy tooling or `scp`. Don't run `deploy-from-mac.sh` for the sites during the window.

### Spike results

_(filled in after the window: capacity table, isolation, channels, WhatsApp, recommendation)_

### Related

- `docs/adr/0014-unified-customer-inbox-chatwoot.md`
- `docs/adr/0008-vps-deployment.md` (amended)
- `docs/proposals/unified-inbox-chatwoot.md`
- `docs/context/10-roadmap.md` IN-00…IN-05
- `specs/feature-ms04-sales-site-scope.md` (sibling)
- Q-40…Q-43
- `deploy/README.md`
