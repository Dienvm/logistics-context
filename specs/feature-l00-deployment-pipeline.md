---
title: Deploy the app to the VPS and cut DNS over
type: feature
status: draft
owner_repo: both
roadmap: L-00
priority: must-have
blocked_by_questions: [Q-15, Q-17, Q-20]
updated: 2026-10-26
---

## Feature: Deploy the app to the VPS and cut DNS over

### Problem Statement

ADR 0008 fixed the hosting shape: a Hostinger VPS in Jakarta running Docker Compose (`app` + Caddy), with images built in CI, pushed to GHCR and pulled over SSH. None of it exists yet. There is no `output: 'standalone'`, no Dockerfile, no compose file, no Caddyfile and no deploy workflow. The fact-visibility gate still trusts `VERCEL_ENV=preview`, a variable that no host sets any more. Until this lands, the site can't leave localhost, and `43logistics.vn` keeps serving the old WordPress site.

**Owner decision (2026-10-26):** this task also cuts DNS over. The old WordPress host is retired. `43logistics.vn` and `www` point at the VPS, and the new site is indexed immediately (`NEXT_PUBLIC_SITE_URL=https://43logistics.vn`) so the 301 map keeps the old rankings. This moves the DNS step out of L-02, and the site goes live **before the L-01 QA pass**.

The owner accepted two consequences:

- Unverified facts stay hidden in production by the fact-visibility gate, so rule 1 holds.
- Rows still deferred in `data/redirect-map.csv` (media under `/wp-content/uploads`, PENDING A-04) return 404 until A-04 lands.

After this task, L-01 runs against production plus local production builds, and L-02 keeps Search Console, monitoring and the 4-week watch.

Roadmap row: `docs/context/10-roadmap.md` L-00 (updated by this spec's PR).

### Proposed Solution

- **Normal deploys:** a commit reaches the site only by being merged to `main`. When both `verify` and `security` have passed for that exact commit, and it is still the head of `main`, a deploy workflow runs these steps:
  1. builds one production image of that commit;
  2. pushes it to GHCR, tagged with the SHA;
  3. replaces the running container on the VPS;
  4. probes the live site;
  5. restores the last known-good image by itself if the probe fails.
- **Rollback:** staff run the same workflow by hand with a known-good SHA.
- **Caddy:** it serves `https://43logistics.vn/` and sends `http://` and `www` there with one 301.
- **Owner, once:** prepares the server with a bootstrap script, then does the first deploy and the DNS switch from a runbook, with a way back at every step.
- **Migrations:** they stay a manual, owner-approved step, described in the same runbook.

### Acceptance Criteria

**Image and runtime**

- [ ] **AC-01.** Given `next.config.ts` with `output: "standalone"`, when `docker build .` runs, then the image:
  - runs `node server.js` as a non-root user (uid ≠ 0) on Node 22;
  - contains `public/` and `.next/static`;
  - contains no `.env*`, `.git`, dev-only `node_modules`, `wordpress-site/`, `.backups/` or `lighthouse-report/` (`docker run --rm <image> ls -a /app`).
- [ ] **AC-02.** Given the image build, when `pnpm install` runs inside it, then:
  - it uses the pnpm version pinned in `package.json` `packageManager` (pnpm 11, the same as `verify.yml`);
  - it runs with `--frozen-lockfile`;
  - husky's `prepare` script does not fail (`HUSKY=0`).
- [ ] **AC-03.** Given `compose.yaml`, when `docker compose up -d` runs on the VPS, then:
  - **`app`** reads its image tag from `/opt/43logistics/.deploy.env` (`IMAGE_TAG=<sha>`, loaded by every compose command via `--env-file`). It listens only on the Compose network, with no published port, `HOSTNAME=0.0.0.0` and `PORT=3000`. It has a healthcheck on `GET /`.
  - **`caddy`** is the only service publishing 80, 443 and 443/udp.
  - **Both services** run with `restart: unless-stopped`.
  - **Named volumes** hold Caddy's `/data` and `/config`, and **only** `/app/.next/cache/images`. The rest of `.next/cache` comes from the new image on every deploy and never from a volume, because a volume would keep a stale build cache.
  - **The image cache** is writable by the non-root user. A `/_next/image?url=…` request for a file in `public/images` returns 200, writes to the volume, and is served from the cache after `docker compose up -d --force-recreate app`.
- [ ] **AC-04.** Given `deploy/Caddyfile`, when a request arrives, then:
  - `https://43logistics.vn` reverse-proxies to `app:3000`;
  - `http://43logistics.vn/*`, `http://www.43logistics.vn/*` and `https://www.43logistics.vn/*` each answer **one 301** to `https://43logistics.vn{uri}` (explicit `redir … 301`, not Caddy's default 308, so the F-07 host checks pass);
  - Caddy obtains Let's Encrypt certificates for both hosts;
  - Caddy sets `X-Forwarded-For` to the real client address and ignores any client-sent value (no `trusted_proxies`, ADR 0008 Decision 5).

  The host list comes from `{$SITE_HOSTS}` so a local run can use `localhost` with internal TLS.

**Pipeline**

- [ ] **AC-05.** Given `.github/workflows/deploy.yml` triggered by `workflow_run` (`workflows: [verify]`, `types: [completed]`), when it runs, then it proceeds only if all of the following hold, and otherwise ends without deploying and with the reason in the job summary:
  - `workflow_run.conclusion == 'success'`;
  - `event == 'push'`;
  - `head_branch == 'main'`;
  - `head_repository.full_name == github.repository`;
  - a `security` workflow run for the same `head_sha` has concluded `success`. The job waits up to 15 min for it and fails closed after that.

  It checks out, builds and tags `github.event.workflow_run.head_sha`, never `github.sha`.
- [ ] **AC-06.** Given the build step:
  - `DATABASE_URL` reaches `next build` only through a BuildKit secret mount (`--mount=type=secret`);
  - build args carry only the public `NEXT_PUBLIC_*` values from `.env.example`, with `NEXT_PUBLIC_SITE_URL=https://43logistics.vn`;
  - all values come from the GitHub `production` environment;
  - provenance is `mode=min` and SBOM attestation is off.

  Verification: a local build with a sentinel `DATABASE_URL` (e.g. `postgres://sentinel-7f3a…`) shows the sentinel string in neither `docker save <image>` nor `docker history --no-trunc`. Runtime secrets live only in `/opt/43logistics/.env` on the VPS (mode 600, owner `deploy`).
- [ ] **AC-07.** Given a pushed image, when the deploy step runs, then it connects over SSH as `deploy`. It uses the `DEPLOY_HOST`, `DEPLOY_USER` and `DEPLOY_SSH_KEY` secrets plus a pinned `DEPLOY_KNOWN_HOSTS` entry, and never `StrictHostKeyChecking=no`. It then:
  1. logs in to GHCR with the job's `GITHUB_TOKEN`, so no long-lived registry token stays on the VPS;
  2. writes `IMAGE_TAG=<sha>` to `.deploy.env`;
  3. runs `docker compose --env-file .deploy.env pull app` and then `docker compose --env-file .deploy.env up -d app`;
  4. waits until the container is healthy;
  5. checks that the running container's image digest equals the digest the build pushed;
  6. runs the **probe**: `curl --resolve 43logistics.vn:443:127.0.0.1` from the VPS returns 200 for `https://43logistics.vn/` and `https://43logistics.vn/gui-hang-di-singapore/` (a route page that reads routes and rate cards).

  On success it appends the digest and SHA to `/opt/43logistics/known-good.log`. Only successful deploys are written there.
- [ ] **AC-08.** Given the new container is unhealthy, has the wrong digest, or fails the probe within 120 s, when the job sees that, then:
  1. it writes the last entry of `known-good.log` back to `.deploy.env`;
  2. it brings that image up and re-runs the probe;
  3. it fails the job with the reason.

  If the recovery probe also fails, or `known-good.log` is empty (first deploy), the job fails with "recovery failed". GitHub's failed-workflow email to the repo owner is the alert.
- [ ] **AC-09.** Given `workflow_dispatch` with an input `sha`, when it runs, then:
  - it refuses a SHA that is not in `known-good.log`;
  - otherwise it runs the AC-07/AC-08 deploy step for that SHA without building.

  This is the rollback path, demonstrated once in the PR. The runbook states the migration rule: every migration must keep the previous known-good release working (expand, then contract later). A rollback across a migration that breaks this is not supported.
- [ ] **AC-10.** Given automatic deploys, then:
  - they run under `concurrency: deploy-production` with no cancel-in-progress;
  - once the job holds that lock, it deploys only if `head_sha` still equals the current head of `main` (`git ls-remote origin refs/heads/main`). Otherwise it ends with "superseded by <sha>" and deploys nothing.

  Manual `workflow_dispatch` rollbacks skip this check.

**Host**

- [ ] **AC-11.** Given a fresh Ubuntu 26.04 VPS reachable as `root`, when the owner runs `deploy/bootstrap-host.sh`, then the script:
  - installs Docker Engine and the Compose plugin from Docker's apt repository;
  - creates the user `deploy` in the `docker` group, with the public key given;
  - creates `/opt/43logistics` with `compose.yaml`, `Caddyfile`, `.env` (template, mode 600) and `.deploy.env`;
  - enables `ufw` with only 22, 80 and 443 (tcp, plus 443/udp) allowed;
  - enables `unattended-upgrades`.

  It turns off root and password SSH login **only** after the operator confirms a working `ssh deploy@…` session in a second terminal. A second run changes nothing. The PR records that Hostinger's weekly backup schedule is still on (hPanel screenshot or text).

**Code cleanup**

- [ ] **AC-12.** Given any `next build`, when a page renders an unverified fact, then the fact is hidden, whatever `PREVIEW_UNVERIFIED` and `VERCEL_ENV` say. Under `next dev` with `PREVIEW_UNVERIFIED=1` it is still badged.

  `VERCEL_ENV` is removed from `shared/config/env.server.ts`, `factEnv` and `FactEnv`. The Vercel wording is removed from the comments in `shared/lib/fact-visibility.ts`, `shared/config/env.server.ts`, `modules/pricing/domain/quote.ts`, `modules/tracking/application/ip-hash.ts` and `.env.example`, and the `_vercel` exclusion is removed from the `proxy.ts` matcher.
- [ ] **AC-13.** Given production behind Caddy, when the tester requests `/go/zalo/` from a client with a known public IP, then:
  - the new `contact_events` row has a non-null `ip_hash`;
  - that hash equals the HMAC of that IP, computed inside the `app` container with `IP_HASH_SALT` (never printed);
  - a second request with a forged `X-Forwarded-For: 1.2.3.4` gives the same hash;
  - a request from a second client (another network) gives a different hash.

**First deploy and DNS cutover (owner, runbook in `deploy/README.md`)**

- [ ] **AC-14.** Given the runbook, when the owner does the first deploy and cutover, then the steps run in this order:
  1. **Database ready.** See AC-17.
  2. **First image.** The deploy workflow runs with the VPS still off DNS. `app` comes up healthy, and the internal readiness check passes: `docker compose exec caddy wget -qO- http://app:3000/` and `…/gui-hang-di-singapore/` both return 200. Caddy runs, but cannot get certificates yet. That is expected, and the HTTPS probe is reported as "pending DNS". If this step fails, nothing public changed.
  3. **TTL.** The apex and `www` record TTL is lowered to 300 s at least one old-TTL period earlier.
  4. **Zone export.** The DNS zone is exported or screenshotted.
  5. **DNS change.** **Only** the apex and `www` `A`/`AAAA` records change, to the VPS addresses. Every other record (MX, SPF/DKIM/DMARC `TXT`, verification `TXT`, any Clerk or mail `CNAME`) stays as it was.
  6. **Certificates.** After `dig` from two resolvers shows the VPS, `docker compose restart caddy` triggers issuance. `curl -I https://43logistics.vn/` from outside the VPS shows a trusted certificate and 200.
  7. **Failure exit.** If step 6 fails within 1 hour, the A/AAAA records go back to the exported values.
  8. **Old host.** The WordPress hosting stays reachable by its old address for 14 days as that fallback, then the owner retires it.
- [ ] **AC-15.** Given DNS has propagated, when `pnpm check:redirects --base https://43logistics.vn --host-checks` runs, then it reports 0 FAIL. Every non-PASS row is a named deferral (PENDING A-04 media and similar), and the output is pasted into the PR. `--strict` stays an L-01/L-02 gate.
- [ ] **AC-16.** Given production:
  - `https://43logistics.vn/robots.txt` allows crawling;
  - `/sitemap.xml` lists `https://43logistics.vn/…` URLs, so the S-10 indexing switch is on;
  - `curl -sI` of `http://www.43logistics.vn/x/` returns a single 301 to `https://43logistics.vn/x/`.

**Database before first deploy (owner, runbook)**

- [ ] **AC-17.** Given the Supabase project, before step 2 of AC-14, the owner gives the go-ahead (AGENTS.md §3) and the following run from a local machine with `DATABASE_URL_DIRECT`: every migration on `main` (today through `0009`), then `pnpm db:import-rate-cards --replace`, then `pnpm db:confirm`. The PR records separate evidence for each:
  - the rows in the drizzle migrations table, through `0009`;
  - the import and confirm console summaries;
  - `pnpm price:cards` output for at least the Singapore route.

  A successful build alone is not evidence, because missing data can render as hidden instead of failing.

### Scope

**In scope:**

- `output: "standalone"`, `Dockerfile`, `.dockerignore` and `compose.yaml`.
- `deploy/Caddyfile`, `deploy/bootstrap-host.sh` and `deploy/README.md`. The README is the runbook: bootstrap, secrets, migrations and the expand/contract rule, first deploy and cutover, rollback, logs.
- `.github/workflows/deploy.yml`.
- A `packageManager` pin in `package.json`.
- AC-12 cleanup.
- Context updates:
  - AGENTS.md §3 Hosting row;
  - `06-architecture.md` env table and hosting paragraph;
  - ADR 0008 amendment (already in this spec's PR);
  - roadmap L-00/L-01/L-02 and Q-15 (already in this spec's PR).

**Out of scope:**

- Security headers (HSTS, CSP, Permissions-Policy). They stay with the planned security-headers work (`docs/proposals/nextjs-rebuild-quynam-pattern.md`, S-13 follow-up).
- Monitoring and alerting beyond GitHub's failed-run email (Sentry, uptime, disk); Search Console; the 4-week watch. These are all L-02.
- A staging host (ADR 0008 Decision 3).
- Migrations in CI. The owner decided on 2026-10-26 to keep them manual.
- A DB compatibility test suite (ADR 0004).
- Media for `/wp-content/uploads` URLs (A-04).
- Clerk production instance setup. Without production keys in the VPS `.env`, `/admin` stays 404 (fail closed, F-05).
- A CDN in front of Caddy.
- A public release-identifier endpoint. The image digest check (AC-07) replaces it.

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | config | `next.config.ts` (`output: "standalone"`), `package.json` (`packageManager`) |
| app | build | `Dockerfile`, `.dockerignore` (new) |
| app | ops | `compose.yaml`, `deploy/Caddyfile`, `deploy/bootstrap-host.sh`, `deploy/README.md` (new) |
| app | CI | `.github/workflows/deploy.yml` (new); `verify.yml` and `security.yml` unchanged (their `name:` values are the gates) |
| app | shared | `shared/lib/fact-visibility.ts`, `shared/config/env.server.ts`, `.env.example` |
| app | modules | `modules/tracking/application/ip-hash.ts`, `modules/pricing/domain/quote.ts` (comments only) |
| app | proxy | `proxy.ts` matcher (`_vercel` exclusion) |
| app | docs | `43logistics.vn/AGENTS.md` §3 Hosting row |
| context | doc | `AGENTS.md` §3, `docs/context/06-architecture.md`; `docs/adr/0008-vps-deployment.md`, `10-roadmap.md` and `11-open-questions.md` (this PR) |

### Golden-rule checks

- **Rule 1:** production builds hide every unverified fact (AC-12). This matters because cutover happens before L-01.
- **Rule 6:** `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and the Clerk secret never enter an image layer, an attestation or the client (AC-06).
- **Rule 13:** legacy URLs and the host variants resolve in one 301 on the real host (AC-04, AC-15, AC-16). Media rows are deferred to A-04 by owner decision.
- **Rule 14:** the client IP comes from Caddy, and only its hash is stored (AC-13). No new cookies or requests.
- **Rule 15:** secrets live only in the GitHub `production` environment and the VPS `.env`. The hostname and IP stay out of git (`DEPLOY_HOST` secret). The runbook names variables, never values.
- **Rule 8:** no change to client JS. `perf:report` in `verify` stays green.

### Dependencies & Risks

- **Depends on:**
  - ADR 0008 (as amended 2026-10-26);
  - the F-08 `verify` workflow and the F-00 `security` workflow (both done);
  - the S-10 indexing switch (done);
  - the F-07 host checks (done);
  - Supabase migrations `0008`–`0009` plus the rate-card import, which need the owner's go-ahead (AC-17);
  - the GitHub `production` environment secrets, set by the owner;
  - `deploy/bootstrap-host.sh`, run by the owner.
- **Blocked by questions** (code is not blocked, ADR 0004):
  - **Q-15:** who administers the VPS is still open. DNS access is with the owner (2026-10-26).
  - **Q-20:** PostHog stays off until `NEXT_PUBLIC_POSTHOG_*` are set. These are build-time values, so a rebuild is needed.
  - **Q-17:** the retention text is unchanged.
- **Risks:**
  - **Going live before L-01.** Mitigated by the fact gate, a `check:redirects` run that allows only named deferrals, the probe with auto-restore, and rollback by known-good SHA.
  - **Lost email from a wrong DNS edit.** Mitigated by AC-14 steps 4–5 and the zone export.
  - **Let's Encrypt failed-validation limits.** Caddy is restarted for issuance only after `dig` shows the VPS (AC-14 step 6).
  - **CI prerender depends on production Supabase.** A DB outage blocks deploys, not the running site.
  - **2 vCPU.** Nothing is built on the VPS.

### Manual Verification Plan

- **Seed needs:**
  - **Local:** `pnpm db:local` without `db:confirm`, so every route is unverified.
  - **Production:** AC-17 done.
- **Steps:**
  1. **Image build, secrets and user (AC-01, AC-02, AC-06).** Build locally with `DOCKER_BUILDKIT=1` and a sentinel `DATABASE_URL` secret pointing at `db:local` through `host.docker.internal`, using the same Dockerfile and flags as `deploy.yml`. Then check:
     - `docker run --rm <image> ls -a /app` shows the expected contents and no excluded files;
     - `docker run --rm <image> id -u` is non-zero;
     - `docker save <image> | grep -ac sentinel-7f3a` gives 0;
     - `docker history --no-trunc <image> | grep -c sentinel` gives 0.
  2. **Compose, Caddy and image cache (AC-03, AC-04).** Run `docker compose up` locally with `SITE_HOSTS=localhost`, `extra_hosts: host.docker.internal:host-gateway`, and `DATABASE_URL` pointing at `db:local`. Then check:
     - `curl -kI https://localhost/` gives 200;
     - `curl -I http://localhost/x/` gives one 301 to `https://localhost/x/`;
     - `docker compose ps` shows `app` healthy with no published port;
     - a `/_next/image` request writes into the volume and is still cached after `--force-recreate`.
  3. **Fact visibility (AC-12).** On the step-2 image (a `next build` with `PREVIEW_UNVERIFIED=1` and `VERCEL_ENV=preview` passed at build), `/gui-hang-di-singapore/` shows no price and no transit. With `pnpm dev:local`, the same URL shows the "chưa xác nhận" badge.
  4. **Host bootstrap (AC-11).** On the VPS, run `deploy/bootstrap-host.sh` twice; the second run reports no changes. Then check:
     - `ufw status` lists only 22, 80 and 443;
     - `ssh root@…` is refused after the confirmation step;
     - `ssh deploy@…` works.

     Record the backup schedule.
  5. **Database (AC-17).** Run the migrations, import and confirm, and record the evidence.
  6. **First deploy (AC-14 step 2).** Merge the L-00 PR. The deploy waits for `verify` and `security`, then builds and pushes `:<sha>`. The internal readiness check passes, and the HTTPS probe reports "pending DNS".
  7. **DNS cutover (AC-14 steps 3–8, AC-15, AC-16).** Diff the zone export before and after: only the apex and `www` A/AAAA records differ. `dig MX 43logistics.vn` is unchanged, and a test email to the domain is delivered. Then:
     - `curl -I https://43logistics.vn/` from a laptop shows a trusted certificate and 200;
     - run `pnpm check:redirects --base https://43logistics.vn --host-checks`;
     - fetch robots.txt and sitemap.xml;
     - `curl -sI http://www.43logistics.vn/x/` returns a single 301.
  8. **Gates (AC-05).** Under `workflow_dispatch`, dispatch an SHA that is not in `known-good.log`: the job refuses (AC-09). In a test repository fork, or by reading the job summary of a real run, confirm that a `verify` run with `conclusion != success` or a missing `security` success ends with the reason and no deploy step. Record which method was used.
  9. **Ordering (AC-10).** Push two small commits to `main` within a minute, through two PRs. The older SHA's deploy ends "superseded" if the newer head is already on `main` when it gets the lock. Only the newer digest runs.
  10. **Failure and rollback (AC-08, AC-09).**
      - **Restore:** on the VPS, add a temporary compose override that sets `PORT=3999` for `app` (healthcheck fails), then re-run the last deploy with `workflow_dispatch`. The job restores the known-good image and fails. Remove the override afterwards.
      - **Rollback:** `workflow_dispatch` with the previous known-good SHA serves it, and the probe passes.
  11. **Client IP (AC-13).** Make three `/go/zalo/` requests from a known IP, from the same IP with a forged header, and from a phone on mobile data. Compare their `ip_hash` values with the HMAC computed in the container.
- **Validation commands:**
  - `pnpm -C 43logistics.vn lint` (run Biome `--write` only on the changed YAML and MD files, lesson s08);
  - `typecheck`, `build`, `i18n:check` and `check:redirects`;
  - the consent matrix (ADR 0004 Decision 2), once on production, because the proxy matcher changes.

  No automated tests (ADR 0004).

### Implementation Hints

- **Next standalone:** copy `.next/standalone`, then `.next/static` → `.next/static` and `public` → `public` in the runner stage. `sharp` is allowed in `pnpm-workspace.yaml` `allowBuilds`; make sure it ends up in the standalone trace for `next/image` (`getImageProps` in `shared/ui/static-image.tsx`).
- **`data/` folder:** `next.config.ts` reads `data/redirect-map.csv` at build, so the builder stage needs `data/`. The runner stage does not.
- **Secret mount:** use `RUN --mount=type=secret,id=database_url DATABASE_URL="$(cat /run/secrets/database_url)" pnpm build`. Pass it from `docker/build-push-action` with `secrets:` and set `provenance: mode=min` and `sbom: false`. The GHA layer cache never contains secret mounts.
- **Security gate:** check it with `gh api repos/{owner}/{repo}/actions/workflows/security.yml/runs?head_sha=<sha>`, polling every 30 s for up to 15 min.
- **Superseded check:** `git ls-remote origin refs/heads/main` inside the locked job.
- **Biome** formats YAML and MD (lesson `2026-10-23-s08-lead-form`), so run `biome check --write` on changed paths only.
- **`scripts/ci/with-server.sh`** uses `next start`, which still works with `output: "standalone"`. Check that `perf:report` still runs in `verify`.

### Related

- ADR 0008 (`docs/adr/0008-vps-deployment.md`, amended 2026-10-26), ADR 0004 (verification) and ADR 0006 (JS budget).
- Roadmap L-00, L-01, L-02 and the S-10 row (indexing switch, built without a spec) in `docs/context/10-roadmap.md`.
- `docs/context/06-architecture.md` (hosting, preview mode, env table).
- `specs/feature-f07-legacy-redirects-check.md` (host checks: `scripts/redirects/plan.ts`, `run.ts` expect 301), `specs/feature-f08-ci-lighthouse-budget.md` (`verify`), `specs/feature-f00-security-template-cleanup.md` (`security`), `specs/feature-s01-site-layout-shell.md` (fact visibility).
- Lesson `lessons/2026-10-23-s08-lead-form.md` (Biome formats YAML/MD).
- Codex review: `/tmp/43l-codex-feature-bug-l00-deployment-pipeline-r1.md`, `-verdicts.md`, `-r2.md` (2026-10-26). All 13 findings were applied.
