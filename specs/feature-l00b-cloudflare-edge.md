---
title: Put Cloudflare in front of the VPS and lock the origin
type: feature
status: draft
owner_repo: both
roadmap: L-00b
priority: must-have
blocked_by_questions: [Q-15, Q-32]
updated: 2026-10-30
---

## Feature: Put Cloudflare in front of the VPS and lock the origin

### Problem Statement

Roadmap row: `docs/context/10-roadmap.md` **L-00b Cloudflare edge** (ADR 0010, amended by ADR 0011).

The site is live on one Hostinger VPS in Jakarta (L-00 cutover done; on 2026-10-30, `43logistics.vn`, `www` and `quanly` all resolve to the VPS IPv4 address, with no AAAA, MX or TXT records and Tenten nameservers `ns-b1/b2/b3.tenten.vn`). Caddy is the only public listener, and the only abuse protection is the per-source-IP `connlimit`/`hashlimit` rules in `deploy/harden-host.sh`. The VPS IP is public, static assets travel from Jakarta to Vietnamese visitors on every cold cache, and a distributed flood would reach the origin directly.

ADR 0010 puts Cloudflare Free in front of Caddy by moving only the nameservers. The registrar stays Tenten and the VPS stays as it is. The cutover is safe only if three code changes land first:

- **Client IP:** behind the proxy, every peer is a Cloudflare edge. Without `trusted_proxies`, the lead rate limit and `ip_hash` would key on Cloudflare addresses.
- **Per-source-IP limits:** the firewall rules would throttle real visitors, because all of them arrive from a few edge IPs.
- **Origin lock:** the origin must stop answering anyone but Cloudflare, otherwise the WAF and DDoS layer can be bypassed by hitting the IP.

### Proposed Solution

From the owner's and visitors' side:

1. **Code first (one app PR):**
   - Caddy trusts Cloudflare's published ranges and takes the visitor address from `CF-Connecting-IP`. The app keeps reading the first `X-Forwarded-For` hop, which Caddy now sets to that visitor address.
   - A versioned Cloudflare range list lives in the repo, with a refresh script that regenerates every place the list is used. An offline `--check` mode fails when a generated block drifts from the list.
   - `harden-host.sh` gets two origin modes:
     - `public`: today's behaviour, except that Cloudflare sources skip the per-IP limits. This is the transition mode and also the rollback mode.
     - `cloudflare`: ports 80/443 accept only Cloudflare ranges, the per-IP limits are removed, and every other source is dropped, over IPv4 and IPv6, on both the Docker-forwarded and the host (`ufw`) paths.
   - `deploy/README.md` gains a Cloudflare runbook with every dashboard setting from ADR 0010/0011.
2. **Owner runbook, two phases (owner decision 2026-10-30):**
   - **Phase 1:** deploy the PR, run `harden-host.sh --origin=public`, create the Cloudflare zone, check every record against the Tenten zone, apply the dashboard settings, then change the nameservers at Tenten. During propagation (up to 48 h), visitors still on the old answers reach the VPS directly and are not blocked.
   - **Phase 2:** once both public resolvers and the Tenten NS TTL show Cloudflare, run `harden-host.sh --origin=cloudflare` and run the acceptance checks.
   - **Rollback:** run `harden-host.sh --origin=public`, then put the Tenten nameservers back. The Tenten zone stays intact until L-02.

Visitors see the same pages, URLs and redirects. Static assets come from Vietnamese Cloudflare PoPs, and HTML is always fresh from the origin.

### Acceptance Criteria

**Code (verifiable before the cutover)**

- [ ] **AC-01 Range list.**
  - Given the repo, when a reviewer opens `deploy/cloudflare-ips.txt`, then it lists Cloudflare's published IPv4 and IPv6 ranges, one CIDR per line, under a header comment naming the source URLs and the fetch date.
  - `deploy/refresh-cloudflare-ips.sh` re-fetches the list and regenerates every generated block derived from it (the Caddyfile and `harden-host.sh`).
  - `deploy/refresh-cloudflare-ips.sh --check` needs no network. It exits 0 when every block matches the list, and exits 1 and names the stale block otherwise.
  - The `verify` workflow runs the `--check` mode.
- [ ] **AC-02 Caddy client IP.**
  - Setup: `deploy/Caddyfile` sets `trusted_proxies static` to the generated range block and `client_ip_headers CF-Connecting-IP` in the global `servers` options. Every `reverse_proxy` sets `header_up X-Forwarded-For {client_ip}`.
  - **Through a trusted peer:** a request from a Cloudflare range reaches the app with `X-Forwarded-For` equal to the `CF-Connecting-IP` value. It never contains a client-supplied XFF chain.
  - **Through an untrusted peer:** a request from any other peer (e.g. the deploy probe on `127.0.0.1`, or a direct visitor in phase 1) reaches the app with `X-Forwarded-For` equal to the peer address. Any client-sent `CF-Connecting-IP` or `X-Forwarded-For` is ignored.
  - The Caddyfile header comment no longer says that a CDN needs `trusted_proxies` first.
  - `caddy validate` passes on the new Caddyfile (run it in the `caddy:2.10-alpine` image).
- [ ] **AC-03 App comments.** `modules/tracking/application/ip-hash.ts` describes the new chain (Cloudflare → Caddy sets XFF from `CF-Connecting-IP` → app). The code is unchanged: the first XFF hop is still the client.
- [ ] **AC-04 Firewall modes.** `deploy/harden-host.sh --origin=public|cloudflare` (default `public`) stays idempotent: a second run with the same mode prints `no changes`. A mode switch replaces the managed block and the `ufw` rules it owns, and touches nothing else.
  - **`public`:** keeps today's per-IP `connlimit`/`hashlimit` rules, with an early `RETURN` for Cloudflare sources so edges are never throttled.
  - **`cloudflare`:** on the default-route interface,
    - `DOCKER-USER` accepts new TCP 80/443 only from the listed ranges and drops all other TCP 80/443 and UDP 443;
    - `ufw` replaces its any-source `80/tcp`, `443/tcp` and `443/udp` allows with allows from the listed ranges (TCP 80/443), so the IPv6 and userland-proxy path is closed too;
    - the per-IP limits are gone.
  - **Both modes:**
    - SSH 22, the Docker-range rule for `quanly` (port 3000) and loopback are untouched;
    - a failing `ufw reload` restores the backup, as today;
    - the script prints the active mode.
- [ ] **AC-05 Runbook.** `deploy/README.md` has a new section, "Cloudflare edge (L-00b)", that covers:
  - (a) **Prerequisites:**
    - the PR is deployed;
    - the GitHub secret `DEPLOY_HOST` is the VPS IP, not a hostname that will become proxied;
    - the Cloudflare account has 2FA.
  - (b) **Zone setup:**
    - add the site on the Free plan;
    - export the Tenten zone (screenshot or file) and compare it **record by record** with Cloudflare's import;
    - apex, `www` and `quanly` are **Proxied**;
    - any MX, mail TXT/SPF/DKIM/DMARC, verification TXT and Clerk CNAMEs are **DNS only**;
    - no record is deleted at Tenten.
  - (c) **Every dashboard setting from ADR 0010 Decision 2 and ADR 0011**, with its menu path:
    - SSL/TLS: Full (strict).
    - **Off:** Always Use HTTPS; Automatic HTTPS Rewrites; any `www` redirect rule; Rocket Loader; Email Obfuscation; Auto Minify (if shown); 0-RTT; Bot Fight Mode; "Block AI bots"; Cloudflare-managed `robots.txt`; Web Analytics **automatic setup** (Q-32).
    - **On:** Brotli, HTTP/3 and Early Hints may stay on.
    - **Cache Rule:** `/_next/image*` is eligible for cache and respects the origin `Cache-Control`. No "Cache Everything" rule.
    - **Security:** WAF managed rules on.
    - **One rate-limiting rule:** POST requests whose path doesn't start with `/admin` or `/api/`, counted per IP, at most 10 per 10 s, then block for 10 s.
  - (d) **Phase 1 → nameserver change → phase 2 steps**, including how to confirm propagation:
    - `dig +short NS 43logistics.vn @1.1.1.1` and `@8.8.8.8` both show Cloudflare;
    - the old NS TTL has elapsed.
  - (e) **Rollback**, in this order: run `--origin=public`, then restore the Tenten nameservers.
  - (f) **Certificate renewal through the proxy:**
    - how to read Caddy's renewal log lines;
    - the Cloudflare Origin CA fallback from ADR 0010.
  - (g) **The range refresh routine:** run the script, merge, deploy, then re-run `harden-host.sh --origin=cloudflare`.
  - (h) The old "a CDN in front … is not set up" sentence in §1 step 7 is replaced.
- [ ] **AC-06 Context docs.**
  - `AGENTS.md` §3 Hosting "In the app today" describes the shipped Caddy/firewall/runbook and keeps "owner cutover pending" until the Phase 2 evidence exists.
  - `docs/context/06-architecture.md` mentions the two firewall modes and the range list.
  - The roadmap row links this spec.

**Cutover (owner, recorded in the PR or a follow-up comment; these close the roadmap *Accept*)**

- [ ] **AC-07 Redirects through Cloudflare.** Given phase 2, when `pnpm check:redirects --base https://43logistics.vn --host-checks` runs from a laptop, then it reports 0 FAIL. `curl -sI http://www.43logistics.vn/x/` is **one** 301 to `https://43logistics.vn/x/`.
- [ ] **AC-08 Visitor IP.**
  - **Step:** a `/go/zalo` click through Cloudflare, then one test lead (deleted afterwards).
  - **Expected:** both rows store an `ip_hash` equal to the HMAC of the tester's public IP. Compute it inside the app container with `IP_HASH_SALT` (README command; prints only the hash).
  - **Spoof check:** a click sent with forged `X-Forwarded-For: 1.2.3.4` and `CF-Connecting-IP: 1.2.3.4` headers still stores the tester's hash.
- [ ] **AC-09 Origin locked.**
  - Given phase 2, `curl --connect-timeout 5 --resolve 43logistics.vn:443:<VPS IP> https://43logistics.vn/` and `curl --connect-timeout 5 http://<VPS IP>/` from a laptop both time out.
  - A connection to the VPS IPv6 address on 443, if it has one, times out too.
  - `ssh deploy@<VPS IP>` still works.
  - The next deploy's internal and HTTPS probes pass.
- [ ] **AC-10 Edge cache.** Request the same URLs twice through Cloudflare:
  - a `/_next/static/…` asset shows `cf-cache-status: HIT` on the second request;
  - a `/_next/image?…` URL shows `HIT` on the second request;
  - `/`, a route page, `/en/` and `/admin/sign-in/` show `DYNAMIC`.
- [ ] **AC-11 Fresh HTML.** Given phase 2, when an editor saves a visible change in `/admin` (e.g. a route page heading, reverted afterwards), then the next public request for that page shows the change with no Cloudflare purge.
- [ ] **AC-12 HTML untouched.** For `/` and `/en/` through Cloudflare, with consent rejected:
  - the HTML contains no `/cdn-cgi/` script and no `cloudflareinsights` reference before consent (automatic beacon injection is off, Q-32);
  - the page shows no new console errors;
  - hydration works (the mobile menu opens).
- [ ] **AC-13 robots.txt and AI crawlers.**
  - `https://43logistics.vn/robots.txt` through Cloudflare is byte-identical to the app's response. Fetch the app's copy on the VPS with `curl --resolve 43logistics.vn:443:127.0.0.1 …`.
  - The dashboard screenshot shows "Block AI bots" off and managed robots.txt off (ADR 0011).
- [ ] **AC-14 DNS parity.**
  - Every record of the exported Tenten zone exists in Cloudflare with the same value, and with the proxy status set in AC-05(b).
  - On 2026-10-30 the public lookup showed no MX/TXT on the apex. If the export contains mail records, a test mail to the domain is delivered after phase 2.
  - `https://quanly.43logistics.vn` still loads and signs in.

### Scope

**In scope:**

- `deploy/Caddyfile`, `deploy/harden-host.sh` (two modes), `deploy/cloudflare-ips.txt`, `deploy/refresh-cloudflare-ips.sh`, the `verify` workflow `--check` step, and `deploy/README.md` runbook section.
- Comment updates in `ip-hash.ts` (and the Caddyfile header).
- Context updates: AGENTS.md §3 Hosting row, `06-architecture.md` edge paragraph, roadmap link.
- The owner cutover steps and their evidence (AC-07 … AC-14).

**Out of scope:**

- Turnstile activation (S-08b, optional owner step) and the Web Analytics token (S-13b / Q-32 activation).
- Edge-caching HTML or purging Cloudflare from admin actions (ADR 0010, rejected).
- Cloudflare Origin CA certificates (fallback only, documented, not applied).
- Changing the registrar, the VPS, SSH access or `quanly`'s own app.
- Turning on Bot Fight Mode (revisit at L-02).
- Uptime and range-change monitoring (L-02).
- Fixing the soft-404 (L-01).
- Publishing the privacy-policy bullet about Cloudflare. That is an owner admin step, listed under Dependencies and done before phase 1.

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
| context | doc | `AGENTS.md` §3 Hosting row; `docs/context/06-architecture.md`; `docs/context/10-roadmap.md` (spec link) |

`compose.yaml`, `deploy/deploy-remote.sh` and `.github/workflows/deploy.yml` are expected to stay unchanged:

- The generated range block lives inside `Caddyfile` and `harden-host.sh`, so no new file has to reach the VPS.
- The probe uses `127.0.0.1`, which stays outside the firewall rule's interface.

If the implementation needs them changed, it says why in the PR.

### Golden-rule checks

- **13 (redirects):** host redirects stay in Caddy, one hop; Cloudflare must not add a redirect (AC-05c, AC-07).
- **14 (personal data):**
  - Only the IP hash is stored, now from the real visitor address (AC-08).
  - No raw IP appears in logs or in the README command output.
  - No analytics before consent: automatic beacon injection is off (AC-12).
  - The privacy policy names Cloudflare as transport/security processor before phase 1 (Dependencies).
- **15 (secrets):**
  - The Cloudflare account, its API tokens and `IP_HASH_SALT` never enter git or chat.
  - The refresh script uses Cloudflare's public, unauthenticated endpoints.
- **8 (performance):** no client JS change. HTML must not be rewritten (AC-12). Static assets edge-cached (AC-10) are the expected field-LCP gain (ADR 0009).

### Dependencies & Risks

- **Depends on:**
  - L-00, live on the VPS (owner confirmed 2026-10-30).
  - S-13b merged, so the beacon is manual and consent-gated (PR #64).
  - Owner publishes the "Cloudflare network/security" privacy bullet in `/admin` before phase 1 (S-13b two-step policy publication).
- **Blocked by questions** (non-blocking for code, ADR 0004):
  - **Q-32:** confirm automatic beacon injection is off. The runbook step and AC-12 enforce it.
  - **Q-15:** who administers the VPS. Whoever runs `harden-host.sh` as root in the hPanel console. Until Q-15 is answered, the owner runs it.
- **Risks:**
  - **Lock-out of real visitors during propagation:** mitigated by the two-phase order; phase 2 starts only after the NS checks pass.
  - **Missed DNS record:** mitigated by the record-by-record comparison and by keeping the Tenten zone for rollback.
  - **Spoofed client IP:** if XFF were appended instead of set, a visitor could choose their own rate-limit key. AC-02 and AC-08 prove that it is set.
  - **IPv6 bypass:** Docker's userland proxy serves IPv6 through `INPUT`, not `DOCKER-USER`, so the `ufw` allow-list is required too (AC-04, AC-09).
  - **Let's Encrypt HTTP-01 renewal through the proxy:** this needs "Always Use HTTPS" off, which is already required. Fallback: Origin CA (AC-05f).
  - **Range list goes stale:** Cloudflare announces changes rarely. When it does, the refresh routine applies them (AC-05g), and L-02 adds monitoring.
  - **Origin IP is already public in DNS history:** hiding the IP is not the protection; the firewall allow-list is.
  - **`quanly` behind the proxy:** Cloudflare Free caps request bodies at 100 MB. If the management app uploads larger files, set its record to DNS only and note it in the README.
  - **GitHub-hosted runs** (`check:redirects`, Lighthouse) now pass through the WAF. Bot Fight Mode stays off so they aren't challenged.

### Manual Verification Plan

- **Seed needs:** the default production data. AC-08 creates one test lead, which is deleted afterwards. AC-11 makes one admin edit, which is reverted afterwards.

**Before the PR (implementer, local):**

1. `pnpm -C 43logistics.vn lint`, `typecheck`, `build`, `i18n:check`, `check:redirects` against `pnpm start`: no regressions expected, since app code is unchanged apart from comments.
2. `bash deploy/refresh-cloudflare-ips.sh --check` exits 0. Then edit one CIDR in the Caddyfile block: the check exits 1 and names the block. Revert the edit.
3. `docker run --rm -v "$PWD/deploy/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2.10-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile` passes (with `SITE_HOST=localhost`).
4. **Local Caddy + app** (`SITE_HOST=localhost`):
   - Run `curl -k -H 'CF-Connecting-IP: 9.9.9.9' -H 'X-Forwarded-For: 8.8.8.8' https://localhost/go/zalo`. The peer is untrusted, so the stored or logged XFF is the Docker peer address, not 9.9.9.9 or 8.8.8.8.
   - For the trusted path, temporarily add the Docker bridge range to the generated block (not committed), repeat the request, and see XFF = 9.9.9.9 only.
   - Record both results.
5. `bash -n deploy/harden-host.sh` passes, plus `shellcheck` if available. Print the rule set each mode would write (dry run or `--print`) and review it against AC-04.

**Owner, phase 1** (follows the README):

6. Deploy, run `harden-host.sh --origin=public`, then run it again and expect `no changes`.
7. Create the zone and compare records (AC-14 evidence: screenshot of both lists), apply the settings, then change the NS at Tenten.

**Owner, phase 2:**

8. After the NS checks pass, run `harden-host.sh --origin=cloudflare`, then run it again and expect `no changes`.
9. Run AC-07 … AC-14 in order and record each command's output (headers only, no IPs in the PR text; write `<VPS IP>`).
10. Do a rollback dry run in a quiet hour: `--origin=public` reopens direct access (AC-09 curl answers 200), then `--origin=cloudflare` locks it again. Nameservers are not touched in this dry run.

Validation commands: lint + typecheck + build + `i18n:check` + `check:redirects` (every PR); the consent matrix is not required because no consent or tracking code changes. AC-12 covers the beacon-before-consent risk at the edge. No automated tests (ADR 0004).

### Implementation Hints

- **Caddy 2.10 options:**
  - `trusted_proxies static <cidr…>` and `client_ip_headers CF-Connecting-IP` go in the global `servers {}` block, so they cover `quanly` as well.
  - `{client_ip}` is the resolved client. `reverse_proxy` otherwise *appends* to a trusted peer's XFF, which is why `header_up X-Forwarded-For {client_ip}` is needed.
  - Consider `trusted_proxies_strict` (right-to-left parsing) only if it is needed. With a single `CF-Connecting-IP` value it makes no difference.
- **Generated blocks:** use marker lines (`# BEGIN cloudflare-ips (generated by refresh-cloudflare-ips.sh)` … `# END cloudflare-ips`), as `harden-host.sh` already does for `after.rules`. Keep `harden-host.sh` self-contained, because it is scp'ed alone and run from the hPanel console.
- **Cloudflare sources:**
  - `https://www.cloudflare.com/ips-v4` and `https://www.cloudflare.com/ips-v6` (or `https://api.cloudflare.com/client/v4/ips`, no auth).
  - The script refuses to write an empty or non-CIDR list.
- **`DOCKER-USER` rules:**
  - After DNAT the destination is the container. Match `-m conntrack --ctorigdstport 80/443` (Docker's documented pattern) or keep `--dports` on the published ports, and verify in step 5.
  - For IPv6, add the same block via `ip6tables` only if `ip6tables -S DOCKER-USER` exists. Otherwise the `ufw` allow-list covers it.
- **Existing pattern to follow:** the existing `put`/`did` helpers, the backup-and-restore around `ufw reload`, and the "no changes" summary.
- **IP-hash command in the README:**
  - `docker compose --env-file .deploy.env exec -T app node -e 'process.stdout.write(require("node:crypto").createHmac("sha256",process.env.IP_HASH_SALT).update(process.argv[1]).digest("hex"))' <ip>`
  - If `IP_HASH_SALT` is unset, the app derives the key from `DATABASE_URL` (`ip-hash.ts`). The README says to set the salt first.
- **Lessons:** `lessons/INDEX.md` has no deploy/firewall lesson. Memory: CI runs on free minutes only, so keep the `--check` step cheap (bash, no install).

### Related

- Roadmap: `docs/context/10-roadmap.md` L-00b; L-00 (`specs/feature-l00-deployment-pipeline.md`), L-01, L-02.
- ADRs: 0010 (Cloudflare edge, Web Analytics), 0011 (GEO: AI bots, robots.txt), 0008 (VPS, Caddy, client IP), 0009 (field data).
- `docs/context/06-architecture.md` (hosting and edge paragraph); `docs/context/11-open-questions.md` Q-15, Q-32.
- `specs/feature-s13b-analytics-swap.md` (beacon, two-step privacy-policy publication).
