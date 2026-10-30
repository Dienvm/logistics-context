---
title: Put Cloudflare in front of the VPS and lock the origin
type: feature
status: in_implementation
branch: feat/l00b-cloudflare-edge
implementation_pr: https://github.com/Dienvm/43logistics.vn/pull/66
owner_repo: both
roadmap: L-00b
priority: must-have
blocked_by_questions: [Q-15, Q-32]
updated: 2026-10-30
---

## Feature: Put Cloudflare in front of the VPS and lock the origin

### Problem Statement

Roadmap row: `docs/context/10-roadmap.md` **L-00b Cloudflare edge** (ADR 0010, amended by ADR 0011).

**Current state.** The site is live on one Hostinger VPS in Jakarta; the L-00 cutover is done (owner, 2026-10-30). A public lookup on 2026-10-30 shows:

- `43logistics.vn`, `www` and `quanly` resolve to the VPS IPv4 address;
- there is no AAAA, MX, TXT or DS record;
- the nameservers are Tenten's `ns-b1/b2/b3.tenten.vn` (NS TTL 3600 s).

Caddy is the only public listener. The only abuse protection is the per-source-IP `connlimit`/`hashlimit` rules in `deploy/harden-host.sh`. As a result:

- the VPS IP is public;
- static assets travel from Jakarta to Vietnamese visitors on every cold cache;
- a distributed flood would reach the origin directly.

**The decision.** ADR 0010 puts Cloudflare Free in front of Caddy by moving only the nameservers. The registrar stays Tenten and the VPS stays as it is.

**What must land before the cutover.** Three code changes:

- **Client IP:** behind the proxy, every peer is a Cloudflare edge. Without `trusted_proxies`, the lead rate limit and `ip_hash` would key on Cloudflare addresses.
- **Firewall limits:** the per-source-IP rules would throttle real visitors.
- **Origin lock:** the origin must stop answering anyone but Cloudflare, or the WAF and DDoS layer can be bypassed by hitting the IP directly.

### Proposed Solution

From the owner's and visitors' side:

**1. Code first (one app PR):**

- **Client IP.** Caddy trusts Cloudflare's published ranges and takes the visitor address from `CF-Connecting-IP`. The app keeps reading the first `X-Forwarded-For` hop, which Caddy now **sets** to that visitor address.
- **Range list.** A versioned Cloudflare range list lives in the repo. A refresh script regenerates every place it is used. An offline `--check` mode fails when a generated block drifts.
- **Firewall modes.** `harden-host.sh` gets two origin modes:
  - `public`: today's behaviour, except that Cloudflare sources skip the per-IP limits. This is the transition and rollback mode.
  - `cloudflare`: ports 80/443 accept only Cloudflare ranges, the per-IP limits are removed, and everything else is dropped. This covers IPv4 and IPv6, on both the Docker-forwarded path and the host (`ufw`) path.
- **Runbook.** `deploy/README.md` gains a Cloudflare runbook with every dashboard setting from ADR 0010/0011, as amended here.

**2. Owner runbook in two phases (owner decision 2026-10-30):**

- **Phase 1:**
  1. Deploy the PR and run `harden-host.sh --origin=public`.
  2. Create the Cloudflare zone and import every record **DNS only**. Check each record against the Tenten zone, and apply the dashboard settings.
  3. Change the nameservers at Tenten.
  4. When the zone is active and the Universal edge certificate is **Active** for the apex, `www` and `quanly`, switch those three records to **Proxied** and check HTTPS.

  Visitors who still hold old answers keep reaching the VPS directly and are not blocked.
- **Phase 2:** when the propagation gates pass, run `harden-host.sh --origin=cloudflare`, then the acceptance checks.
- **Rollback:**
  1. Run `harden-host.sh --origin=public`.
  2. Confirm there is still no DS record.
  3. Put the Tenten nameservers back.

  The Tenten zone stays intact until L-02.

**3. What visitors see.** The same pages, URLs and redirects. Static assets come from Vietnamese Cloudflare PoPs, and HTML is always fresh from the origin.

**4. Amendments to ADR 0010 Decision 2, from this spec's review** (applied to the ADR in the implementation change set):

- **No `/_next/image` Cache Rule.** Next negotiates AVIF/WebP per `Accept` with `Vary: Accept`. Cloudflare Free ignores `Vary` (except `Accept-Encoding`) when caching, so an AVIF could be served to a browser that can't decode it. Images stay on the origin's own image cache; revisit at L-02 with a measured need.
- **The rate-limiting rule matches the lead-form paths, not POST.** Free-plan rate-limiting rules can match only the path, not the HTTP method.

### Acceptance Criteria

**Code (verifiable before the cutover)**

- [ ] **AC-01 Range list.**
  - `deploy/cloudflare-ips.txt` lists Cloudflare's published IPv4 and IPv6 ranges, one CIDR per line, under a header comment with the source URLs and the fetch date.
  - `deploy/refresh-cloudflare-ips.sh` re-fetches the list and regenerates every block derived from it (the Caddyfile and `harden-host.sh`). It refuses an empty list or a non-CIDR line.
  - `deploy/refresh-cloudflare-ips.sh --check` uses no network. It exits 0 when every block matches the list, and exits 1 naming the stale block otherwise.
  - The `verify` workflow runs the `--check` mode.
- [ ] **AC-02 Caddy client IP.**
  - `deploy/Caddyfile` sets, in the global `servers` options:
    - `trusted_proxies static` with the generated range block;
    - `client_ip_headers CF-Connecting-IP`.
  - Every `reverse_proxy` sets `header_up X-Forwarded-For {client_ip}`.
  - **Request from a Cloudflare range:** it reaches the app with `X-Forwarded-For` equal to the `CF-Connecting-IP` value, never a client-supplied XFF chain.
  - **Request from any other peer** (the deploy probe on `127.0.0.1`, or a direct visitor in phase 1): it reaches the app with `X-Forwarded-For` equal to the peer address. Any `CF-Connecting-IP` or `X-Forwarded-For` the client sent is ignored.
  - The Caddyfile header no longer says that a CDN needs `trusted_proxies` first.
  - `caddy validate` passes (Manual Verification Plan step 3).
- [ ] **AC-03 App comments.** `modules/tracking/application/ip-hash.ts` describes the new chain: Cloudflare, then Caddy sets XFF from `CF-Connecting-IP`, then the app. The code is unchanged.
- [ ] **AC-04 Firewall modes.** `deploy/harden-host.sh --origin=public|cloudflare [--print]`. The default mode is `public`.
  - **`--print`:** prints the exact `DOCKER-USER`/`ip6tables`/`ufw` changes the mode would make, and changes nothing.
  - **Idempotent:** a second run with the same mode prints `no changes`.
  - **Mode switch:** replaces only the managed block and the `ufw` rules the script owns.
  - **`public`:** keeps today's per-IP limits, with an early `RETURN` for Cloudflare sources.
  - **`cloudflare`:**
    - `DOCKER-USER` accepts new TCP 80/443 on the default-route interface only from the listed IPv4 ranges. It drops all other TCP 80/443 and UDP 443. Use original-destination port matching where DNAT changes ports.
    - If Docker has IPv6 enabled, the same rules are written to `ip6tables` `DOCKER-USER` with the IPv6 ranges.
    - `ufw` replaces its any-source `80/tcp`, `443/tcp` and `443/udp` allows with allows from the listed ranges (TCP 80/443, both families). This closes the userland-proxy / host path.
    - The per-IP limits are gone.
  - **Preflight in `cloudflare` mode.** The script exits non-zero and changes nothing when any of these holds:
    - the default-route interface is missing, or there is more than one;
    - `DOCKER-USER` is missing, or Docker uses the nftables firewall backend;
    - Docker publishes 80/443 on an address family the script cannot filter. The script reads the published mappings (`docker port`/`ss -ltnp`) and the daemon's `ipv6`/`userland-proxy` settings, and prints what it found.
  - **Untouched in both modes:**
    - SSH 22;
    - the Docker-range rule for `quanly` (port 3000);
    - loopback.

    A failing `ufw reload` restores the backup, as today. The script prints the active mode.
  - **Persistence.** The rules survive `systemctl restart docker` and a reboot (Manual Verification Plan step 9).
- [ ] **AC-05 Runbook.** `deploy/README.md` gains a section "Cloudflare edge (L-00b)" covering items (a) to (h). Commands state their working directory.
  - **(a) Prerequisites:**
    - the PR is deployed;
    - the GitHub secret `DEPLOY_HOST` is the VPS IP, not a hostname that will become proxied;
    - the Cloudflare account has 2FA;
    - `dig +short DS 43logistics.vn` is empty (else disable DNSSEC at Tenten and wait out the DS TTL first);
    - the owner confirms `quanly` needs no single upload above 100 MB (Cloudflare Free's request-body limit). If it does, stop before phase 1 and decide: a DNS-only `quanly` is impossible behind the shared origin lock;
    - the owner states whether any mailbox `@43logistics.vn` exists (AC-14);
    - the "Cloudflare network/security" privacy bullet is published in `/admin`.
  - **(b) Zone setup:**
    - add the site on the Free plan;
    - export the Tenten zone (screenshot or file);
    - compare it **record by record** with Cloudflare's import, excluding the provider-owned SOA and apex NS;
    - import everything **DNS only**;
    - MX, mail TXT/SPF/DKIM/DMARC, verification TXT and Clerk CNAMEs stay DNS only for good;
    - only the apex, `www` and `quanly` become **Proxied**, in step (d);
    - nothing is deleted at Tenten;
    - Cloudflare DNSSEC stays off during L-00b.
  - **(c) Dashboard settings.** Every setting from ADR 0010 Decision 2 (as amended) and ADR 0011, with its menu path.

    | Group | Settings |
    | --- | --- |
    | SSL/TLS | Full (strict) |
    | Off | Always Use HTTPS (keeps the redirect one hop, rule 13); Automatic HTTPS Rewrites; any `www` redirect rule; Rocket Loader; Email Obfuscation; Auto Minify (if shown); 0-RTT; **Pseudo IPv4**; Bot Fight Mode; "Block AI bots"; Cloudflare-managed `robots.txt`; Web Analytics **automatic setup** (Q-32) |
    | May stay on | Brotli, HTTP/3, Early Hints |
    | Cache | Cloudflare defaults only: no Cache Rule, no "Cache Everything" |
    | Security | WAF managed rules on |
    | Rate limiting | One rule: path equals `/tinh-cuoc/` or `/en/shipping-calculator/` (the lead-form pages); 30 requests per 10 s per IP; block for 10 s |
  - **(d) Phase 1, nameserver change, phase 2:**
    - the authoritative delegation check at the `.vn` parent shows Cloudflare's nameservers;
    - Edge Certificates shows the Universal certificate Active for the apex, `www` and `quanly`, then the three records switch to Proxied;
    - the **propagation gate for phase 2**: both of these have elapsed since their own change:
      - the recorded pre-change Tenten NS and record TTLs, after the nameserver change;
      - the TTL of Cloudflare's DNS-only answers, after the switch to Proxied;
    - `dig +short NS 43logistics.vn @1.1.1.1` and `@8.8.8.8` both show Cloudflare.
  - **(e) Rollback, in order:**
    1. `--origin=public`;
    2. a DS check;
    3. restore the Tenten nameservers;
    4. wait for the Cloudflare NS TTL.
  - **(f) Certificate renewal through the proxy:**
    - the AC-16 challenge-path check;
    - how to read Caddy's renewal log lines;
    - renewal evidence is recorded at the first real renewal (L-02);
    - the Cloudflare Origin CA fallback (ADR 0010).
  - **(g) Range refresh routine:**
    1. run the script;
    2. merge and deploy;
    3. re-run `harden-host.sh --origin=cloudflare`.
  - **(h) Old wording:** the §1 step 7 sentence "a CDN in front … is not set up" is replaced.
- [ ] **AC-06 Context docs** (same change set):
  - **`AGENTS.md` §3 Hosting row:** "In the app today" describes the shipped Caddy, firewall and runbook, and keeps "owner cutover pending" until the phase 2 evidence exists.
  - **`docs/context/06-architecture.md` edge paragraph:** covers the two firewall modes and the range list, says images are not edge-cached, and replaces "POST rate limit" with the path-based rule.
  - **ADR 0010:** Decision 2 records the two amendments, with a status-line note pointing to this spec.
  - **Roadmap row:** links this spec, and its wording follows the amendments.

**Cutover (owner; evidence recorded in the PR or a follow-up comment; these close the roadmap *Accept*)**

- [ ] **AC-07 Redirects through Cloudflare.**
  - From the app root on a laptop, `pnpm check:redirects --base https://43logistics.vn --host-checks` reports 0 FAIL.
  - `curl -sI http://www.43logistics.vn/x/` returns **one** 301 to `https://43logistics.vn/x/`.
- [ ] **AC-08 Visitor IP.**
  - **Tests:** one `/go/zalo` click through Cloudflare, and one test lead named "TEST L-00b". The test lead is not deleted (Q-17); it is set to the A-06 closed/spam status.
  - **Expected:** both rows store an `ip_hash` equal to the hash of the tester's public IPv4 address. The hash is computed in the app container with the app's **effective** key, as the README command describes. Nothing is rotated.
  - **Spoof check:** a click with forged `X-Forwarded-For: 1.2.3.4` and `CF-Connecting-IP: 1.2.3.4` headers still stores the tester's hash.
  - **IPv6:** if the tester has IPv6, the same check over IPv6 stores the hash of the IPv6 address, which proves Pseudo IPv4 is off. Otherwise the PR records "IPv6 visitor check pending a tester with IPv6".
- [ ] **AC-09 Origin locked.** In phase 2, from a laptop:
  - `curl --connect-timeout 5 --resolve 43logistics.vn:443:<VPS IP> https://43logistics.vn/` times out;
  - `curl --connect-timeout 5 http://<VPS IP>/` times out;
  - so does 443 on the VPS IPv6 address, if it has one;
  - `ssh deploy@<VPS IP>` still works;
  - the next deploy's internal and HTTPS probes pass.
- [ ] **AC-10 Edge cache.** Each URL is requested twice through Cloudflare:
  - a `/_next/static/…` asset shows `cf-cache-status: HIT` on the second request;
  - `/_next/image?…`, `/`, a route page, `/en/` and `/admin/sign-in/` show `DYNAMIC` (or no `cf-cache-status`).
- [ ] **AC-11 Fresh HTML.** In phase 2, an editor saves a visible change in `/admin` (a route-page heading, reverted afterwards). The next public request for that page shows the change, with no Cloudflare purge.
- [ ] **AC-12 No HTML rewriting, no analytics before consent.** For `/` and `/en/` through Cloudflare:
  - **Served HTML:** contains no `/cdn-cgi/` script and no `cloudflareinsights` reference.
  - **Fresh Chrome profile:** DevTools Network shows no request to `cloudflareinsights.com` or `/cdn-cgi/rum`, both before any choice and after "Từ chối" plus two navigations.
  - **Console and hydration:** no new console errors; hydration works (the mobile menu opens).
- [ ] **AC-13 robots.txt and AI crawlers.**
  - `https://43logistics.vn/robots.txt` through Cloudflare is byte-identical to the app's copy. The app's copy is fetched on the VPS with `curl --resolve 43logistics.vn:443:127.0.0.1 …`.
  - A dashboard screenshot shows "Block AI bots" off and managed robots.txt off.
  - Verified-crawler log evidence (ADR 0011) is recorded as pending L-02, because Free-plan logs are limited.
- [ ] **AC-14 DNS and mail parity.**
  - Every exported Tenten record, except SOA and the apex NS, exists in Cloudflare with the same value and the proxy status from AC-05(b).
  - **Mail:** if the owner confirms that no `@43logistics.vn` mailbox needs preserving, the PR records "mail: N/A (owner-confirmed, no domain mail service)". Otherwise a test mail to the named mailbox is delivered after phase 2.
  - `https://quanly.43logistics.vn` still loads, and the owner can sign in.
- [ ] **AC-15 Rate limit.**
  - From one IP, 40 requests to `/tinh-cuoc/` within 10 s get blocked (429 or the Cloudflare block page) after the threshold, and are served normally again after the block period.
  - A normal visit (open the page, fill in and submit the form once) is never blocked.
- [ ] **AC-16 ACME challenge path.** `curl -s http://43logistics.vn/.well-known/acme-challenge/l00b-probe` (GET) through Cloudflare gets Caddy's own response for an unknown token, with no Cloudflare redirect or challenge. This shows that HTTP-01 requests reach Caddy. The first real renewal's log line is recorded at L-02 (AC-05f).

### Scope

**In scope:**

- `deploy/Caddyfile`, `deploy/harden-host.sh` (two modes, `--print`, preflight), `deploy/cloudflare-ips.txt`, `deploy/refresh-cloudflare-ips.sh`, the `verify` workflow `--check` step, and the new `deploy/README.md` section.
- Comment updates in `ip-hash.ts` and the Caddyfile header.
- Context updates: AGENTS.md §3 Hosting row, `06-architecture.md` edge paragraph, ADR 0010 Decision 2 amendment note, and the roadmap row.
- The owner cutover steps and their evidence (AC-07 … AC-16).

**Out of scope:**

- **Other owner activations:**
  - Turnstile (S-08b, optional owner step);
  - the Web Analytics token (S-13b, Q-32 activation).
- **Caching beyond the defaults:**
  - edge-caching HTML or purging Cloudflare from admin actions (ADR 0010, rejected);
  - edge-caching `/_next/image` (amended out; revisit at L-02).
- **Certificates:**
  - Cloudflare Origin CA (documented fallback only);
  - forcing a certificate re-issue to prove renewal.
- **Unchanged infrastructure:** the registrar, the VPS, SSH access, and the `quanly` app itself.
- **Later tasks:**
  - Cloudflare DNSSEC, Bot Fight Mode, and uptime/range-change monitoring (L-02);
  - the soft-404 fix (L-01).

### Affected Areas

| Repo | Layer | File / Path |
|------|-------|-------------|
| app | edge config | `deploy/Caddyfile` |
| app | host script | `deploy/harden-host.sh` |
| app | data (new) | `deploy/cloudflare-ips.txt` |
| app | script (new) | `deploy/refresh-cloudflare-ips.sh` |
| app | runbook | `deploy/README.md` |
| app | CI | `.github/workflows/verify.yml` (one `--check` step) |
| app | module comment | `modules/tracking/application/ip-hash.ts` |
| context | doc | `AGENTS.md` §3 Hosting row; `docs/context/06-architecture.md`; `docs/adr/0010-cloudflare-edge-and-web-analytics.md` (Decision 2 amendment note); `docs/context/10-roadmap.md` (L-00b row) |

`compose.yaml`, `deploy/deploy-remote.sh` and `.github/workflows/deploy.yml` are expected to stay unchanged:

- The generated range block lives inside `Caddyfile` and `harden-host.sh`, so no new file has to reach the VPS.
- The probe uses `127.0.0.1`, which is outside the firewall rule's interface.

If the implementation needs any of them changed, it says why in the PR.

### Golden-rule checks

- **13 (redirects):** host redirects stay in Caddy, one hop. Cloudflare adds no redirect (AC-05c, AC-07, AC-16).
- **14 (personal data):**
  - only the IP hash is stored, now from the real visitor (AC-08);
  - no raw IP appears in logs, the README command output or the PR text (`<VPS IP>` placeholder);
  - no analytics before consent (AC-12);
  - the privacy policy names Cloudflare before phase 1 (AC-05a).
- **15 (secrets):**
  - the Cloudflare account and any API token, `IP_HASH_SALT` and `DATABASE_URL` never enter git or chat;
  - the refresh script uses Cloudflare's public, unauthenticated endpoints;
  - the hash command prints only the hash.
- **8 (performance):**
  - no client JS change;
  - no HTML rewriting (AC-12);
  - edge-cached static assets (AC-10) are the expected field-LCP gain (ADR 0009).

### Dependencies & Risks

**Depends on:**

- L-00, live on the VPS (owner, 2026-10-30).
- S-13b merged (PR #64), so the beacon is manual and consent-gated.
- The privacy bullet published in `/admin` before phase 1 (AC-05a).

**Blocked by questions** (non-blocking for code, ADR 0004):

- **Q-32:** confirm automatic beacon injection is off. Enforced by AC-05c and AC-12.
- **Q-15:** who administers the VPS, i.e. who runs `harden-host.sh` as root in the hPanel console. The owner does until Q-15 is answered.

**Risks:**

| Risk | Mitigation |
| --- | --- |
| Visitors locked out during propagation | Two phases. Phase 2 waits for the AC-05d gates, which include the recorded old TTLs and the DNS-only interval. |
| No edge certificate at activation | Records stay DNS only until the Universal certificate is Active (AC-05d). |
| Missed DNS record | Record-by-record comparison; the Tenten zone is kept for rollback. |
| Stale DS record breaks resolution | DS checks before the switch and before rollback; Cloudflare DNSSEC stays off. |
| Spoofed client IP (a visitor choosing their own rate-limit key) | XFF is set, not appended (AC-02, AC-08). Pseudo IPv4 is off. |
| IPv6 or userland-proxy bypass | Preflight detection plus the `ufw` allow-list (AC-04, AC-09). |
| Let's Encrypt renewal through the proxy | AC-16 proves challenge requests reach Caddy. Real-renewal evidence comes at L-02. Fallback: Origin CA. |
| Range list goes stale | Refresh routine (AC-05g); monitoring at L-02. |
| Origin IP already public in DNS history | The firewall allow-list is the protection, not secrecy. |
| `quanly` uploads above 100 MB | Checked as a prerequisite. There is no DNS-only fallback behind the shared origin lock. |
| WAF on GitHub-hosted runs (`check:redirects`, Lighthouse) | Bot Fight Mode stays off. |
| Rate-limit rule also counts GET navigation on the lead-form pages | The threshold (30 per 10 s) is far above a human visit (AC-15). |

### Manual Verification Plan

Working directory: the **app root** (`43logistics.vn/`) unless a step says "on the VPS".

**Seed needs.** Default production data. AC-08 creates one test lead, which stays in place and is set to closed/spam. AC-11 makes one admin edit, which is reverted.

**Before the PR (implementer, local):**

1. `pnpm lint && pnpm typecheck && pnpm build && pnpm i18n:check`, then `pnpm check:redirects` against `pnpm start`: 0 FAIL.
2. **Range check.**
   - `bash deploy/refresh-cloudflare-ips.sh --check` exits 0.
   - Change one CIDR inside the Caddyfile block: the check exits 1 and names the block.
   - Revert the change.
3. **Caddy config.** `docker run --rm -e SITE_HOST=localhost -v "$PWD/deploy/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2.10-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile` passes.
4. **Local XFF observation** (throwaway, not committed): run Caddy with the new Caddyfile in front of a small header-echo container in place of `app:3000`. Two cases:
   - **(a) Untrusted peer:** send `curl -k -H 'CF-Connecting-IP: 9.9.9.9' -H 'X-Forwarded-For: 8.8.8.8' https://localhost/`. The echo shows XFF = the Docker peer address.
   - **(b) Trusted peer:** add the Docker bridge range to the generated block temporarily and repeat. The echo shows XFF = `9.9.9.9` only.

   Record both outputs (test addresses only).
5. **Firewall script.**
   - `bash -n deploy/harden-host.sh` passes, plus `shellcheck` if available.
   - `--origin=public --print` and `--origin=cloudflare --print` output is reviewed against AC-04 and pasted into the PR.

**Owner, phase 1** (follows the README):

6. Deploy. On the VPS, run `harden-host.sh --origin=public` twice; the second run prints `no changes`.
7. Complete the AC-05a prerequisites, then the zone import and record comparison (AC-14 evidence: screenshots of both lists), then the settings.
8. Change the nameservers at Tenten. When the Universal certificate is Active, switch the three records to Proxied, then check `curl -I https://43logistics.vn/` (200, `server: cloudflare`).

**Owner, phase 2:**

9. After the AC-05d gates pass, on the VPS:
   - run `harden-host.sh --origin=cloudflare --print`, then without `--print`, then again (prints `no changes`);
   - run `systemctl restart docker`, and later reboot in a quiet hour, then re-run the AC-09 curls (still time out).
10. Run AC-07 … AC-16 in order, and record each command's headers or output. Write IPs as `<VPS IP>` / `<tester IP>`.
11. **Rollback dry run** (quiet hour; nameservers untouched):
    - `--origin=public`: `curl --resolve … https://43logistics.vn/` answers 200, and `http://<VPS IP>/` answers one 301;
    - then `--origin=cloudflare`: both time out again.

**Validation commands:** lint, typecheck, build, `i18n:check` and `check:redirects` (every PR). The consent matrix is not required, because no consent or tracking code changes; AC-12 covers the before-consent risk at the edge. No automated tests (ADR 0004).

### Implementation Hints

- **Caddy 2.10:**
  - `trusted_proxies static <cidr…>` and `client_ip_headers CF-Connecting-IP` go in the global `servers {}` block, so they also cover `quanly`.
  - `reverse_proxy` otherwise *appends* to a trusted peer's XFF; `header_up X-Forwarded-For {client_ip}` replaces it.
  - `trusted_proxies_strict` makes no difference with a single `CF-Connecting-IP` value.
- **Generated blocks.** Use marker lines `# BEGIN cloudflare-ips (generated by refresh-cloudflare-ips.sh)` … `# END cloudflare-ips`, as `harden-host.sh` already does for `after.rules`. Keep `harden-host.sh` self-contained: it is scp'ed alone and run from the hPanel console.
- **Range sources:** `https://www.cloudflare.com/ips-v4` and `https://www.cloudflare.com/ips-v6` (or `https://api.cloudflare.com/client/v4/ips`, no auth).
- **`DOCKER-USER`:**
  - after DNAT, the destination is the container; Docker's documented pattern is `-m conntrack --ctorigdstport`;
  - persistence goes through `/etc/ufw/after.rules` (and `after6.rules` for IPv6), as today.
- **Hash command** (README): compute the key exactly as `hashKey()` in `ip-hash.ts` does (`IP_HASH_SALT`, else `sha256("43l-ip-hash:" + DATABASE_URL)`). Run it inside the app container (`docker compose --env-file .deploy.env exec -T app node -e '…' <ip>`) and print only the hex digest. Never change the salt for this check.
- **Patterns to follow:** the existing `put`/`did` helpers, the backup-and-restore around `ufw reload`, and the "no changes" summary.
- **Lessons:** `lessons/INDEX.md` has no deploy or firewall lesson. CI runs on free minutes only, so keep the `--check` step cheap (bash, no install).

### Related

- **Roadmap:** `docs/context/10-roadmap.md` L-00b; L-00 (`specs/feature-l00-deployment-pipeline.md`), L-01, L-02.
- **ADRs:** 0010 (Cloudflare edge, Web Analytics; amended by this spec), 0011 (GEO: AI bots, robots.txt), 0008 (VPS, Caddy, client IP), 0009 (field data).
- **Context:** `docs/context/06-architecture.md` (hosting, edge, image formats); `docs/context/11-open-questions.md` Q-15, Q-17, Q-32.
- **Specs:** `specs/feature-s13b-analytics-swap.md` (beacon, two-step privacy publication).
- **Review record:** Codex review in 2 rounds, 2026-10-30. All 12 findings were applied.
