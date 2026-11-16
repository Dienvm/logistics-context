---
title: Prove Chatwoot on the production VPS before building the inbox
type: feature
status: approved
owner_repo: both
roadmap: IN-00
priority: must-have
blocked_by_questions: [Q-41, Q-42, Q-43]
updated: 2026-11-16
---

## Feature: Prove Chatwoot on the production VPS before building the inbox

### Problem Statement

ADR 0014 puts a self-hosted Chatwoot (web, Sidekiq worker, Postgres, Redis) on the **same** Hostinger VPS that serves 43logistics.vn, avlogistics.vn and gtlogistics.vn (owner, 2026-11-16: no second VPS; upgrade the plan if needed). Four assumptions behind ADR 0014 are unproven, and IN-01 can't be specified safely until they are measured:

1. **Capacity.** Chatwoot's published starting point is ≥ 4 GB RAM / 2 vCPU. The VPS is 8 GB / 2 vCPU, with site `mem_limit`s already totalling 7.5 GB. Real headroom and the peaks during a VPS-side build, a deploy and a backup are unknown.
2. **Isolation.** ADR 0014 uses one Chatwoot account per company because contacts are account-wide inside one account. That has to be shown on the pinned version.
3. **Channels.** Telegram and the API channel (form leads, IN-03) must work end to end through a public HTTPS subdomain behind Caddy.
4. **WhatsApp coexistence.** It is unknown for a Vietnamese number with a self-hosted Chatwoot (embedded signup).

Roadmap row: IN-00 (Phase 7, ADR 0014).

### Proposed Solution

**A time-boxed spike on the production VPS**
- Off-hours window, 21:00–23:30 Vietnam time.
- Runs as its **own Compose project** with hard limits.
- An **automatic watchdog** stops it before the three sites suffer.
- The artifacts stay in the app repo under `deploy/chatwoot/` as the draft for IN-01 (owner choice).
- All spike data is synthetic and is removed at the end, including external registrations.

**Output: a spike report**
- capacity, isolation, channel, WhatsApp and IP-retention results, each marked `pass | fail | pending | aborted (inconclusive)`;
- a recommendation: go on the current plan, or upgrade the Hostinger plan (with a target size).

The staff address is `https://inbox.43logistics.vn` (owner confirmed, 2026-11-16).

### Result semantics

| Result | Meaning |
|--------|---------|
| `pass` | Criterion met, with evidence in the report |
| `fail` | Measured and not met. For capacity, this is the evidence for a plan upgrade |
| `pending` | Allowed only for AC-09 (WhatsApp) and AC-10 (Meta review) while Q-42 / Meta verification is outstanding. Moves to IN-05/IN-04 with a named owner |
| `aborted (inconclusive)` | The watchdog fired for a cause that isn't Chatwoot load (DNS, an unrelated site error, a misconfigured limit). It needs a re-run and never counts as capacity evidence |

**IN-00 is complete when:**
- AC-01–AC-08 and AC-11–AC-13 are `pass` or `fail` (none inconclusive);
- AC-09 and AC-10 are `pass`, `fail` or `pending`.

### Pre-flight gates (before the window; all recorded in the report)

- [ ] **G-1 DNS and firewall mode are observed, not assumed.**
  - Record the authoritative nameservers for 43logistics.vn (`dig NS`) and the `harden-host.sh` mode in force (`--print`).
  - **Origin still public, DNS at Tenten** (today's state): the owner adds an A record `inbox` → VPS at Tenten. This is a declared temporary deviation from ADR 0014's Cloudflare shape, valid only until L-00b.
  - **L-00b already done** (Cloudflare proxied, origin limited to Cloudflare ranges): `inbox` is a **proxied** Cloudflare record, and the spike verifies TLS, WebSocket, webhooks and `cf-cache-status` not `HIT` for HTML/API through Cloudflare.
  - In both cases the origin firewall is **never** reopened for the spike.
- [ ] **G-2 Disk budget.** Free space ≥ 25 GB, and inodes ≥ 10 % free (`df -h`, `df -i`), against this budget:
  - images: about 4 GB;
  - Postgres and Redis volumes plus WAL: ≤ 2 GB;
  - logs: bounded at 10 MB × 3 per container (the existing `x-logging` pattern);
  - one dump: ≤ 1 GB;
  - margin: 10 GB.

  If it doesn't fit, the spike doesn't start.
- [ ] **G-3 Rollback copies.** Save the current `deploy/Caddyfile` copy on the VPS (`Caddyfile.pre-in00`). Record `docker ps --format '{{.ID}} {{.Names}} {{.Status}}'` and each site container's `RestartCount`.
- [ ] **G-4 Test accounts only.**
  - The Telegram test bot is new and throwaway.
  - The WhatsApp test number has **no real chat history** (see Dependencies).
  - The load and API payloads are synthetic.

### Acceptance Criteria

**Artifacts (app repo)**
- [ ] **AC-01** `deploy/chatwoot/` contains:
  - **`compose.chatwoot.yaml`:**
    - top-level `name: inbox-spike`, a project distinct from `logistics`;
    - services `chatwoot-web`, `chatwoot-worker`, `chatwoot-postgres` (pgvector image) and `chatwoot-redis`;
    - images pinned **by version and digest**;
    - `mem_limit`s: web 1.5 GB, worker 1 GB, postgres 768 MB, redis 256 MB;
    - `restart: "no"` during the spike;
    - logging bounded like `compose.yaml`'s `x-logging`;
    - named volumes owned by this project only;
    - a private network `inbox` for all four services;
    - **only `chatwoot-web`** also joins the existing external network `logistics_default` (Caddy's);
    - no published host ports;
    - `env_file: /home/deploy/chatwoot/.env.chatwoot` (absolute path, untracked).
  - **`env.template`:** every variable with a comment and no secret values. Includes `ENABLE_ACCOUNT_SIGNUP=false` and `FRONTEND_URL=https://inbox.43logistics.vn`, with SMTP empty.
  - **The inbox site block, added to `deploy/Caddyfile` itself.** Caddy mounts only that one file (`compose.yaml`), so a separate snippet would need a Caddy recreate. The block:
    - serves `inbox.{$SITE_HOST}`;
    - reverse-proxies to `chatwoot-web:3000` (WebSocket passes through `reverse_proxy`);
    - sets `X-Robots-Tag: noindex, nofollow`.
  - **`watchdog.sh`:** see AC-04.
  - **`load.sh`:** the synthetic inbound-message driver through the API channel.
  - **`api-smoke.sh`:** see AC-08.
  - **`README.md`:** exact start, stop, abort, teardown and Caddy-rollback commands, all using `docker compose -p inbox-spike -f /home/deploy/chatwoot/compose.chatwoot.yaml …`.
- [ ] **AC-02 Activation without touching site containers.**
  1. `docker compose -p inbox-spike … config -q` passes with the real env file. Its output is never printed, because it would show secrets.
  2. The new Caddyfile is written **in place** over the bind-mounted file (`cat new > Caddyfile`, which keeps the inode), then validated with `docker exec <caddy> caddy validate --config /etc/caddy/Caddyfile`.
  3. Caddy is reloaded gracefully with `caddy reload` (the command `deploy-remote.sh` uses).
  4. `up -d` starts the Chatwoot project. Then:
     - `https://inbox.43logistics.vn` serves the Chatwoot login over TLS, with the `noindex` header and sign-up disabled;
     - the site containers' IDs and `RestartCount` equal the G-3 record.
  5. **Rollback** reverses the order: restore `Caddyfile.pre-in00` in place, validate and reload, **then** stop or remove Chatwoot.

**Capacity**
- [ ] **AC-03** `watchdog.sh` writes one CSV row every 10 s from G-1 to teardown, covering the pull, `db:chatwoot_prepare` and start-up too. Each row records:
  - per container: `docker stats` memory and CPU;
  - host `MemAvailable`, swap used, load average, free disk bytes and inodes;
  - per site home page: HTTP status, curl exit code and `time_starttransfer`, with `--max-time 5`.

  Phases, each ≥ 10 minutes unless noted:
  - (a) baseline, sites only (also records the swap baseline);
  - (b) Chatwoot idle;
  - (c) `load.sh`: about 200 synthetic inbound messages over 10 minutes across the three accounts;
  - (d) a **build-only** site image: `docker build` of the AV or GT image from a source tarball with a disposable tag `in00-<date>`, **no push**, and the image removed afterwards. `vps-build.sh` is not used, because it pushes and moves `latest` for 43;
  - (e) a **site deploy overlap**: `deploy-remote.sh` for AV (`app-av`) to the tag already running, which measures the old/new container overlap with Chatwoot running. AC-02's "no restart" rule covers the Chatwoot install, not this phase;
  - (f) a **backup**: one `pg_dump -Fc` of the Chatwoot database to the VPS disk, timed, with its size recorded. This is the operation IN-01 will schedule nightly.

  **Report summary per phase:**
  - peak and p95 RAM per container;
  - minimum host `MemAvailable`, maximum swap above baseline;
  - CPU load;
  - disk minimum and growth;
  - site TTFB p95 and any non-2xx.
- [ ] **AC-04 Automatic abort.** `watchdog.sh` runs in its own `tmux`/`nohup` session, not in an interactive shell. Within 30 s of a breach it:
  - **checks:**
    - host `MemAvailable` < 512 MB;
    - swap > baseline + 256 MB;
    - any container OOM-killed or with `RestartCount` up (`docker inspect` `.State.OOMKilled` / `RestartCount` each sample);
    - any site non-2xx or curl failure on 3 consecutive samples;
    - any site's 1-minute TTFB p95 > 2× its phase (a) value;
    - free disk < 10 GB.
  - **acts, in order:**
    1. kills the spike-owned workload of the current phase (load script, build, dump);
    2. runs `docker compose -p inbox-spike stop`;
    3. writes the breach reason and the last 5 minutes of samples to the report folder;
    4. re-probes the three sites until three consecutive 2xx results.

  The window then ends. The report classifies the breach as `fail` (Chatwoot load) or `aborted (inconclusive)`, per "Result semantics".

**Isolation**
- [ ] **AC-05 Account isolation.**
  - **Setup:**
    - three accounts, "43 Logistics", "AV Logistics" and "GT Logistics";
    - each with one inbox, **two named synthetic contacts and one conversation each**;
    - users: `agent-av` (`agent` only in AV) and `admin-all` (`administrator` in all three).
  - **Positive controls:** `agent-av` can list, search and open AV's contacts and conversations by ID. `admin-all` can do the same in every account.
  - **Denial checks** for `agent-av`, against **both** the 43 and GT accounts, in the UI and with `agent-av`'s API token:
    - list contacts, search contacts by a known name, `GET` a known contact ID;
    - list conversations, `GET` a known conversation ID;
    - also a cross-account ID: an AV-scoped URL with a 43 contact ID.
  - **Pass** = no field of a foreign record is disclosed in any response body. 401, 403 and 404 are all acceptable denials. Each request, status and body summary is recorded.
- [ ] **AC-06 Inbox scope inside one account.** "AV Logistics" gets a second inbox with its own synthetic contact, and `agent-av` is a member of the first inbox only. The report records, with the same request set as AC-05, whether `agent-av` can see that contact in the Contacts list, search, by ID and via the API. This confirms or refutes ADR 0014's reason for accounts over inboxes.

**Channels**
- [ ] **AC-07 Telegram.** A throwaway test bot is connected to "AV Logistics". Then:
  - a text and a photo sent to the bot from a Telegram account appear in Chatwoot within 10 s;
  - an agent's text and photo reply reaches the Telegram chat;
  - the webhook goes through the G-1 path.
- [ ] **AC-08 API channel (provisional IN-03 format).** `api-smoke.sh` posts this synthetic lead twice to an API-channel inbox in "43 Logistics":

  ```
  name: "IN00 Test", phone: "+84000000001", route: "Đà Nẵng → Singapore (test)",
  weight: "12 kg", goods: "quần áo (test)", message: "spike test",
  site: "43l", source: "Google Ads", link: "https://43logistics.vn/admin/leads/00000000-0000-0000-0000-000000000000/"
  ```

  Only ADR 0014 Decision 5's allowed fields are present. The first message renders as:

  ```
  Yêu cầu báo giá mới từ 43logistics.vn
  Tên: … · SĐT: … · Tuyến: … · Cân nặng: … · Loại hàng: … · Nguồn: … · Ghi chú: … · Lead: <link>
  ```

  - **Expected on the first run:** a contact is created; its contact-inbox, a conversation and the first message are created; the label `web-form` is applied.
  - **Expected on the second run:** the **same** contact is found by phone (no duplicate), and a second conversation is created.
  - The same phone posted to the "AV Logistics" API inbox creates a **separate** contact (account scoping).
  - The script reads its token from env and never prints it.
- [ ] **AC-09 WhatsApp coexistence** (`pending` allowed; test number only):
  - **Setup question:** can Chatwoot's WhatsApp embedded signup be configured on a self-hosted instance with our own Meta app (app ID, configuration ID), or does it need a Tech Provider or BSP?
  - **Eligibility:** is the Vietnamese test number on the WhatsApp Business app offered coexistence?
  - **After connecting:**
    - a message from a second phone appears in both Chatwoot and the app;
    - replies from each side reach the sender;
    - how much history synced;
    - which app features changed.
- [ ] **AC-10 Meta review** (`pending` allowed while Q-42 is open). The owner starts Meta Business verification and submits App Review for `pages_messaging`, `pages_manage_metadata` and `pages_show_list`. The report records the dates and status, and who follows up.

**Personal data**
- [ ] **AC-11 IP storage traced, not assumed.** One controlled request per path is traced through Caddy (`crawlers.log` keeps only crawlers), Chatwoot web logs, Sidekiq logs and the database (`contacts.additional_attributes`, `users.current_sign_in_ip` / `last_sign_in_ip`, any `*_ip` column found by a schema grep). The paths are:
  - a staff browser sign-in;
  - an API-channel post;
  - a Telegram inbound.

  For each place, the report records observed storage (sanitized: field names and whether a value existed, never the value) and one of:
  - a verified suppression, redaction or purge method;
  - "unresolved: IN-01 launch blocker".

  Rotation alone is not suppression.

**Close-out**
- [ ] **AC-12 Full teardown.** At the end, in this order:
  1. Caddy rollback (AC-02 step 5), validated and reloaded;
  2. `docker compose -p inbox-spike down -v --rmi all`;
  3. `docker volume ls`, `docker ps -a` and `docker images` show no `inbox-spike` resources, while every `logistics` container, volume and the rollback images remain;
  4. the Telegram webhook is deleted (`deleteWebhook`) and the test bot is revoked;
  5. Meta: the test number is disconnected from the API and its app tokens are revoked;
  6. API tokens are discarded;
  7. dumps, CSV raw files and `.env.chatwoot` are deleted from the VPS, keeping only the summarized report;
  8. the next Hostinger weekly backup may still hold the spike's synthetic data. That is accepted, since it is synthetic only;
  9. the `inbox` DNS record is kept or removed per the report;
  10. the three sites return 200, and `pnpm -C projects/43logistics.vn check:redirects --base https://43logistics.vn` passes.
- [ ] **AC-13** The spike report goes into the app PR body and this spec's "Spike results" section (context impl PR). It carries:
  - the result of every AC per "Result semantics";
  - the capacity table;
  - a recommendation: go on the current plan, or a plan upgrade with a target size;
  - the inputs IN-01 needs: limits, dump duration and size, pinned version and digest, and IP-retention settings.

### Scope

**In scope:**
- the `deploy/chatwoot/` artifacts and the inbox block in `deploy/Caddyfile`;
- one off-hours window on the VPS, plus one re-run window if a phase is inconclusive or WhatsApp verification lands later;
- the capacity, isolation, Telegram, API-channel, WhatsApp-coexistence and IP-trace tests on synthetic data;
- Meta verification and App Review started by the owner;
- the spike report.

**Out of scope:**
- **Real data:** real customers and company numbers, the three published WhatsApp numbers, and real Facebook Pages' traffic.
- **IN-01 work:** scheduled backups, restore rehearsal, 2FA enforcement, user onboarding, SMTP, `restart: unless-stopped`.
- **The site side:** the app-side lead import (IN-03), and any change to `modules/*` or public pages.
- **Other channels:** Zalo (Q-40), and Messenger beyond the App Review submission.
- **Infrastructure changes:** the Hostinger plan upgrade (the spike recommends, the owner orders), and changing `harden-host.sh` mode or the Cloudflare cutover (L-00b).

### Affected Areas

| Repo | Layer | File / Path |
|------|-------|-------------|
| app | deploy | `deploy/chatwoot/compose.chatwoot.yaml`, `env.template`, `watchdog.sh`, `load.sh`, `api-smoke.sh`, `README.md` (new) |
| app | deploy | `deploy/Caddyfile` (inbox site block; written in place on the VPS, rolled back per AC-02) |
| VPS | ops | `/home/deploy/chatwoot/.env.chatwoot` (untracked), watchdog CSVs and report folder (deleted after the summary) |
| owner | DNS / Meta | the `inbox` record per G-1; Meta Business verification and App Review (Q-42) |
| context | spec | this spec's "Spike results" section (context impl PR) |

### Golden-rule checks

- **Rule 15: secrets stay out of git and out of output.**
  - Secrets live only in the untracked VPS env file; `env.template` carries no values.
  - Scripts never echo tokens, and `compose config` output is never printed.
  - **Local** `gitleaks protect --staged` (or `gitleaks detect` on the branch) runs before the push and is recorded, because Actions are blocked. Install it with `brew install gitleaks` if it is missing.
- **Rule 14:** synthetic data only (G-4); IP storage traced (AC-11); full teardown (AC-12).
- **Rule 8 / ADR 0009:** public pages are unchanged; site TTFB is guarded by the watchdog (AC-04).
- **Rule 13:** `check:redirects` passes after teardown.
- **ADR 0008:** site containers aren't restarted by the install (AC-02). Phase (e) is a deliberate AV deploy to the running tag. Operation is manual (memory: manual deploy on the VPS).

### Dependencies & Risks

- **Depends on:**
  - ADR 0014 (logistics-context PR #110);
  - VPS SSH access;
  - G-1 to G-4.
- **Unclosed gaps:**
  - **L-00b** (Cloudflare) decides G-1's path;
  - **GitHub Actions are blocked by billing**, so gitleaks runs locally and the build is local;
  - **DNS** is at Tenten until L-00b.
- **Blocked by questions** (ADR 0004 placeholders):
  - **Q-42:** AC-09 and AC-10 may be `pending`;
  - **Q-41:** the published numbers are never touched;
  - **Q-43:** the operator and cost ceiling, which price the recommendation.
- **WhatsApp test number.** A **dedicated number with only synthetic history**: a spare SIM (cheapest and safest) or a personal number its owner confirms holds no real chats, freshly registered on WhatsApp Business.
  - Never one of the three published numbers.
  - Never a number with real customer or private history, because history sync would import it.
  - If none is available, AC-09 is `pending`.
- **Risk: memory pressure on live sites.** The limits allow more than the 8 GB host in total, so the **watchdog**, not the limits, is the safety net (AC-04).
- **Risk: disk.** Covered by the G-2 budget and the watchdog disk check.
- **Risk: Caddy.** A bad config must never be loaded, hence validate before reload and the saved rollback copy (AC-02).

### Manual Verification Plan

- **Before the window:**
  1. G-1 to G-4 recorded.
  2. Phase (a) baseline.
- **During the window:**
  1. AC-02 activation.
  2. Phases (b)–(f) under the watchdog.
  3. AC-05 and AC-06 through the UI at `https://inbox.43logistics.vn` and `curl` with each user's token (fixtures and expected denials per AC-05).
  4. AC-07, then AC-08 (two runs, plus the AV account).
  5. AC-09 if ready.
  6. AC-11 traces.
- **After the window:** AC-12 in order, then the AC-13 report.
- **Validation commands (app PR):**
  - `pnpm -C projects/43logistics.vn lint`, `typecheck`, `build`, `check:redirects`;
  - `shellcheck deploy/chatwoot/*.sh`;
  - `docker compose -f deploy/chatwoot/compose.chatwoot.yaml config -q` with `env.template` copied to a dummy env;
  - `caddy validate --config deploy/Caddyfile`, through `docker run --rm -v …:ro caddy:2.10-alpine caddy validate …`;
  - local gitleaks.

  Each is recorded with its output summary. Biome doesn't check Markdown, so the README is reviewed by hand. No automated tests (ADR 0004).
- **Seed needs:** none from the site database. Everything inside the spike is synthetic.

### Implementation Hints

- Mirror `compose.yaml` conventions (`x-logging`, `security_opt: [no-new-privileges:true]`, `mem_limit`), but keep `name: inbox-spike` and always pass `-p inbox-spike` explicitly, so no command can address the `logistics` project.
- **Chatwoot setup:**
  - `docker compose -p inbox-spike run --rm chatwoot-web bundle exec rails db:chatwoot_prepare` once;
  - create the accounts and users through the Rails console or the Platform API;
  - put the commands in `README.md` for IN-01.
- **`watchdog.sh`:**
  - POSIX `sh`, compatible with `sh -e` (memory: dev machine quirks);
  - read `/proc/meminfo` for `MemAvailable` and `SwapFree`;
  - keep the spike workload PIDs in a file so the abort can kill them.
- The Caddyfile bind mount is a single file. Editors that replace the file change the inode, and the container then keeps the old content. Always write in place.

### Spike results

_(filled in after the window: per-AC results, capacity table, recommendation, IN-01 inputs)_

### Related

- `docs/adr/0014-unified-customer-inbox-chatwoot.md`
- `docs/adr/0008-vps-deployment.md` (amended)
- `docs/proposals/unified-inbox-chatwoot.md`
- `docs/context/10-roadmap.md` IN-00…IN-05, L-00b
- `specs/feature-ms04-sales-site-scope.md` (sibling)
- `specs/feature-l00b-cloudflare-edge.md`
- `deploy/README.md`
- Q-40…Q-43
