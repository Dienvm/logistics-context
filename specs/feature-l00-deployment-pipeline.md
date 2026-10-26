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

ADR 0008 fixed the hosting shape: a Hostinger VPS in Jakarta running Docker Compose (`app` + Caddy), with images built in CI, pushed to GHCR and pulled over SSH. None of it exists yet:

- no `output: 'standalone'`;
- no Dockerfile, compose file, Caddyfile or deploy workflow;
- the fact-visibility gate still trusts `VERCEL_ENV=preview`, a variable no host sets now.

Until this lands, the site can't leave localhost and `43logistics.vn` keeps serving the old WordPress site.

**Owner decision (2026-10-26): this task also cuts DNS over.** The old WordPress host is retired. `43logistics.vn` and `www` point at the VPS, and the new site is indexed immediately (`NEXT_PUBLIC_SITE_URL=https://43logistics.vn`) so the 301 map keeps the old rankings.

This moves the DNS step out of L-02 and goes live **before the L-01 QA pass**. Two things accepted by the owner follow from that:

- Unverified facts stay hidden in production by the fact-visibility gate (rule 1 holds).
- Rows still deferred in `data/redirect-map.csv` (media under `/wp-content/uploads`, PENDING A-04) return 404 until A-04 lands.

L-01 then runs against production plus local production builds, and L-02 keeps Search Console, monitoring and the 4-week watch.

Roadmap row: `docs/context/10-roadmap.md` L-00 (updated by this spec, see Related).

### Proposed Solution

- **Merging to `main` is the only way code reaches the site.** After the `verify` workflow passes on `main`, a deploy workflow:
  1. builds one production image;
  2. tags it with the commit SHA;
  3. pushes it to GHCR;
  4. replaces the running container on the VPS;
  5. checks the live site over HTTPS;
  6. if that check fails, puts the previous image back by itself.
- **Staff can run the same workflow by hand** with a SHA to roll back.
- **Visitors** reach `https://43logistics.vn/` on the VPS, and `www`, `http` and legacy URLs redirect there in one hop.
- **The owner prepares the server once** with a bootstrap script and does the DNS switch from a runbook.
- **Database migrations stay a manual, owner-approved step**, run from a local machine and described in the same runbook.

### Acceptance Criteria

**Image and runtime**

- [ ] AC-01. Given `next.config.ts` with `output: "standalone"`, when `docker build .` runs, then it produces an image that:
  - runs `node server.js` as a non-root user on Node 22;
  - contains `public/` and `.next/static`;
  - contains no `.env*`, `.git`, `node_modules` dev tooling, `wordpress-site/`, `.backups/` or `lighthouse-report/`, as `docker run --rm <image> ls -a /app` shows.
- [ ] AC-02. Given the image, when `pnpm install` runs inside the build, then it uses the pnpm version pinned in `package.json` `packageManager` (the same major as CI, pnpm 11) with `--frozen-lockfile`, and husky's `prepare` script does not fail (`HUSKY=0`).
- [ ] AC-03. Given `compose.yaml`, when `docker compose up -d` runs on the VPS, then:
  - `app` listens only on the Compose network (no published port) with `HOSTNAME=0.0.0.0` and `PORT=3000`, has a healthcheck on `GET /`, and runs `restart: unless-stopped`;
  - `caddy` is the only service publishing 80 and 443;
  - named volumes hold Caddy's `/data` + `/config` and **only** `/app/.next/cache/images`. The rest of `.next/cache` must come from the new image on every deploy, never from a volume (stale build cache).
- [ ] AC-04. Given `deploy/Caddyfile` with its site list from `{$SITE_HOSTS}` (production: `43logistics.vn, www.43logistics.vn`), when a request arrives, then:
  - Caddy obtains Let's Encrypt certificates for both hosts;
  - it redirects `http://` → `https://`;
  - it reverse-proxies both hosts unchanged to `app:3000`;
  - it sets `X-Forwarded-For` to the real client address, ignoring any client-sent value (no `trusted_proxies`, ADR 0008 Decision 5).

  The `www` → apex redirect stays in the app.

**Pipeline**

- [ ] AC-05. Given a push to `main`, when `verify` finishes successfully, then `.github/workflows/deploy.yml` (trigger `workflow_run` on `verify`, `branches: [main]`, `conclusion == success`) builds and pushes `ghcr.io/dienvm/43logistics.vn:<sha>` and `:latest`. If `verify` fails, no deploy job runs.
- [ ] AC-06. Given the deploy job, when it builds, then:
  - build-time values come only from the GitHub `production` environment: `DATABASE_URL`, every `NEXT_PUBLIC_*` in `.env.example`, and `NEXT_PUBLIC_SITE_URL=https://43logistics.vn`;
  - they reach `next build` as BuildKit secrets or build args that are not in the final image layers, as `docker history --no-trunc` shows no `DATABASE_URL`;
  - runtime secrets live only in `/opt/43logistics/.env` on the VPS (mode 600, owner `deploy`).
- [ ] AC-07. Given the image is pushed, when the job deploys, then it connects over SSH as `deploy` (`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, plus a pinned `DEPLOY_KNOWN_HOSTS` entry; no `StrictHostKeyChecking=no`) and:
  1. logs in to GHCR with the job's `GITHUB_TOKEN` (no long-lived registry token on the VPS);
  2. records the running tag;
  3. runs `IMAGE_TAG=<sha> docker compose pull app && docker compose up -d app`;
  4. waits for the container to be healthy;
  5. checks that `https://43logistics.vn/` returns 200.
- [ ] AC-08. Given the new container is unhealthy or the HTTPS check fails within 120 s, when the job notices, then it starts the previously recorded tag again, waits for it to be healthy, and fails the job with the reason.
- [ ] AC-09. Given `workflow_dispatch` with an input `tag` (an existing SHA tag), when it is run, then the same SSH deploy step (AC-07/AC-08) runs that tag without building. This is the rollback path, and it is demonstrated once in the PR.
- [ ] AC-10. Given two pushes to `main` in quick succession, when both pass `verify`, then the deploys run one at a time (`concurrency: deploy-production`, no cancel-in-progress), and the later SHA ends up running.

**Host**

- [ ] AC-11. Given a fresh Ubuntu 26.04 VPS reachable as `root`, when the owner runs `deploy/bootstrap-host.sh` (safe to run again), then it:
  - installs Docker Engine and the Compose plugin from Docker's apt repository;
  - creates the user `deploy` in the `docker` group with the given public key;
  - creates `/opt/43logistics` (with `compose.yaml`, `Caddyfile` and an `.env` template, mode 600);
  - enables `ufw` allowing only 22, 80 and 443 (also 443/udp for HTTP/3);
  - enables `unattended-upgrades`.

  It turns off root and password SSH login **only** after the operator confirms a working `ssh deploy@…` session in a second terminal. Running it twice changes nothing the second time.

**Code cleanup**

- [ ] AC-12. Given any `next build`, when a page renders an unverified fact, then it is hidden, whatever `PREVIEW_UNVERIFIED` and `VERCEL_ENV` say. Under `next dev` with `PREVIEW_UNVERIFIED=1` it is still badged. `VERCEL_ENV` is removed from `shared/config/env.server.ts`, `factEnv` and `FactEnv`, and the Vercel wording is removed from the comments in:
  - `shared/lib/fact-visibility.ts`
  - `shared/config/env.server.ts`
  - `modules/pricing/domain/quote.ts`
  - `modules/tracking/application/ip-hash.ts`
  - `.env.example`
- [ ] AC-13. Given a request through Caddy with a forged `X-Forwarded-For: 1.2.3.4`, when `/go/zalo/` logs a `contact_events` row, then its `ip_hash` equals the hash of the real client address, not of `1.2.3.4`. Check this on production by comparing two requests, one with and one without the forged header: both give the same hash.

**DNS cutover (owner, runbook)**

- [ ] AC-14. Given the runbook in `deploy/README.md`, when the owner cuts over, then:
  - the TTL of the apex and `www` records is lowered to 300 s at least one old-TTL period before the switch;
  - **only** the apex and `www` `A`/`AAAA` records change, to the VPS addresses;
  - every other record is left as it was (MX, SPF/DKIM/DMARC `TXT`, verification `TXT`, any Clerk or mail `CNAME`). The runbook says to export or screenshot the zone first.
- [ ] AC-15. Given DNS has propagated, when `pnpm check:redirects --base https://43logistics.vn --host-checks` runs, then it reports 0 FAIL. Every non-PASS row is a named deferral (PENDING A-04 media and the like), and the run's output is pasted into the PR. `--strict` stays an L-01/L-02 gate.
- [ ] AC-16. Given production, when `https://43logistics.vn/robots.txt` and `/sitemap.xml` are fetched, then robots allows crawling and the sitemap lists `https://43logistics.vn/…` URLs (the S-10 indexing switch is on). `http://www.43logistics.vn/` reaches `https://43logistics.vn/` in at most two hops: Caddy's scheme upgrade, then the app's host redirect.

**Database before first deploy (owner, runbook)**

- [ ] AC-17. Given the Supabase project, when the first production image is built, then every migration on `main` (today through `0009`) is applied and `db:import-rate-cards --replace` + `db:confirm` have run. These run from a local machine with `DATABASE_URL_DIRECT`, only after the owner's go-ahead (AGENTS.md §3), and the runbook lists the commands. Otherwise the build's prerender fails, and the workflow stops before deploying.

### Scope

**In scope:**

- `output: "standalone"`, `Dockerfile`, `.dockerignore`, `compose.yaml`, `deploy/Caddyfile`, `deploy/bootstrap-host.sh`, `deploy/README.md` (runbook: bootstrap, secrets, migrations, DNS cutover, rollback, logs) and `.github/workflows/deploy.yml`.
- A `packageManager` pin in `package.json`.
- Removing `VERCEL_ENV` and the Vercel comments (AC-12). The `_vercel` exclusion in the `proxy.ts` matcher is removed too: it is dead on this host.
- Context updates: AGENTS.md §3 Hosting row, `06-architecture.md` env table and hosting paragraph, the `10-roadmap.md` L-00/L-01/L-02 rows, and Q-15 (DNS access: the owner holds it).

**Out of scope:**

- Security headers (HSTS, CSP, Permissions-Policy). They stay with the planned security-headers work: S-13 follow-up per `docs/proposals/nextjs-rebuild-quynam-pattern.md`. Caddy only does the HTTP → HTTPS upgrade.
- Monitoring and alerting (Sentry, uptime, disk), Search Console and the 4-week watch (L-02).
- A staging host (ADR 0008 Decision 3) and migrations in CI (owner decision 2026-10-26: manual).
- Media migration for `/wp-content/uploads` URLs (A-04).
- Clerk production instance setup. If the production keys aren't in the VPS `.env`, `/admin` stays 404 (fail closed, F-05).
- A CDN in front of Caddy.

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | config | `next.config.ts` (`output: "standalone"`), `package.json` (`packageManager`) |
| app | build | `Dockerfile`, `.dockerignore` (new) |
| app | ops | `compose.yaml`, `deploy/Caddyfile`, `deploy/bootstrap-host.sh`, `deploy/README.md` (new) |
| app | CI | `.github/workflows/deploy.yml` (new); `verify.yml` unchanged (its name is the `workflow_run` trigger) |
| app | shared | `shared/lib/fact-visibility.ts`, `shared/config/env.server.ts`, `.env.example` |
| app | modules | `modules/tracking/application/ip-hash.ts`, `modules/pricing/domain/quote.ts` (comments only) |
| app | proxy | `proxy.ts` matcher (`_vercel` exclusion) |
| app | docs | `43logistics.vn/AGENTS.md` §3 Hosting row |
| context | doc | `AGENTS.md` §3, `docs/context/06-architecture.md`, `docs/context/10-roadmap.md`, `docs/context/11-open-questions.md` |

### Golden-rule checks

- **Rule 1:** production builds hide every unverified fact (AC-12). The cutover happens before L-01, which is why this matters.
- **Rule 6:** `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and the Clerk secret never enter an image layer or the client (AC-06).
- **Rule 13:** legacy URLs resolve in one hop on the real host (AC-15, AC-16). Media rows are deferred to A-04 by owner decision.
- **Rule 14:** client IP comes from Caddy, and only its hash is stored (AC-13). No new cookies or requests.
- **Rule 15:** secrets live only in the GitHub `production` environment and the VPS `.env`. Hostname and IP stay out of git (`DEPLOY_HOST` secret). The runbook names variables, never values.
- **Rule 8:** the image doesn't change client JS. `perf:report` in `verify` stays green.

### Dependencies & Risks

- **Depends on:**
  - ADR 0008;
  - F-08 `verify` workflow (done);
  - S-10 indexing switch (done);
  - the Supabase migrations `0008`–`0009` and the rate-card import, which need the owner's go-ahead (AC-17);
  - GitHub `production` environment secrets set by the owner;
  - `deploy/bootstrap-host.sh` run by the owner.
- **Blocked by questions** (non-blocking for code, ADR 0004):
  - **Q-15:** VPS administrator still open. DNS access is with the owner (2026-10-26).
  - **Q-20:** PostHog stays off until `NEXT_PUBLIC_POSTHOG_*` are set; they are build-time, so a rebuild is needed.
  - **Q-17:** retention text unchanged.
- **Risks:**
  - **Going live before L-01.** Mitigation: the fact gate, deferral-only `check:redirects`, and rollback by tag.
  - **Lost email from a wrong DNS edit.** Mitigation: AC-14, change only A/AAAA and export the zone first.
  - **Let's Encrypt rate limits if Caddy restarts in a loop with bad DNS.** Mitigation: the runbook starts Caddy only after `dig` shows the VPS addresses, with the staging CA for a first dry run.
  - **Prerender during CI against production Supabase.** A DB outage blocks deploys but not the running site.
  - **2 vCPU:** no builds happen on the VPS.

### Manual Verification Plan

- Seed needs: Supabase project with migrations through `0009`, the rate-card import and `db:confirm` done (AC-17).
- Steps:
  1. Locally: `docker build .` with throwaway build args. Then `docker run --rm <image> ls -a /app`, `docker history --no-trunc <image> | grep -c DATABASE_URL` (expect 0) and `docker run --rm <image> id -u` (non-zero) (AC-01, AC-02, AC-06).
  2. Locally: `docker compose up` with a local `.env` against `pnpm db:local`, `SITE_HOSTS=localhost` (Caddy internal TLS). `curl -kI https://localhost/` returns 200, and `docker compose ps` shows `app` healthy and no published port (AC-03, AC-04).
  3. `next build` with `PREVIEW_UNVERIFIED=1 VERCEL_ENV=preview`: a route with an unverified card shows no price. `pnpm dev:local`: the same route shows the "chưa xác nhận" badge (AC-12).
  4. On the VPS, run `deploy/bootstrap-host.sh` twice (the second run makes no changes). Then `ufw status` shows 22, 80 and 443; `ssh root@…` is refused after the confirmation step; `ssh deploy@…` works (AC-11).
  5. Merge to `main`. The deploy job waits for `verify`, builds, pushes `:<sha>`, deploys, and its HTTPS check passes. A deliberately failing `verify` on a throwaway branch starts no deploy (branch filter) (AC-05, AC-07).
  6. Break the health check with an image whose `CMD` exits, via `workflow_dispatch` on a throwaway tag. The job restores the previous tag and fails. Then run `workflow_dispatch` with the previous good SHA and see it serve (AC-08, AC-09).
  7. DNS cutover per runbook: compare the zone export before and after (only apex/`www` A/AAAA differ). `dig MX 43logistics.vn` is unchanged, and a test email to the domain is delivered (AC-14).
  8. `pnpm check:redirects --base https://43logistics.vn --host-checks` shows 0 FAIL, with the output in the PR. Check robots.txt, sitemap.xml and `curl -IL http://www.43logistics.vn/` (AC-15, AC-16).
  9. `curl -H 'X-Forwarded-For: 1.2.3.4' https://43logistics.vn/go/zalo/` and the same without the header give two `contact_events` rows with equal `ip_hash` (AC-13).
- Validation commands: `pnpm -C 43logistics.vn lint` (changed files only for YAML/MD, lesson s08), `typecheck`, `build`, `i18n:check`, `check:redirects`. Re-run the consent matrix (ADR 0004 Decision 2) on production once, because the proxy matcher changes. No automated tests (ADR 0004).

### Implementation Hints

- Next standalone: copy `.next/standalone`, then `.next/static` → `.next/static` and `public` → `public` in the runner stage. `sharp` is allowed in `pnpm-workspace.yaml` `allowBuilds`, so make sure it ends up in the standalone trace for `next/image` (`getImageProps` in `shared/ui/static-image.tsx`).
- `next.config.ts` reads `data/redirect-map.csv` at build time, so the builder stage needs `data/`. The runner stage doesn't.
- In the BuildKit build, mount secrets (`--mount=type=secret,id=database_url`) for `DATABASE_URL`. `NEXT_PUBLIC_*` may be build args: they become public in the client bundle anyway.
- Use `docker/build-push-action` with GHA layer cache, and `appleboy/ssh-action` or plain `ssh` with the pinned `known_hosts`. Pin actions to a major version, as `verify.yml` does.
- Keep `IMAGE_TAG` in `/opt/43logistics/.deploy-tag` (current) and `.deploy-tag.prev` for AC-08.
- Biome formats YAML/MD (lesson `2026-10-23-s08-lead-form`). Run `biome check --write` on changed paths only.
- `scripts/ci/with-server.sh` uses `next start`. It keeps working, because `output: "standalone"` doesn't break `next start`, but check that `perf:report` still runs in `verify`.

### Related

- ADR 0008 (`docs/adr/0008-vps-deployment.md`), ADR 0004 (verification), ADR 0006 (JS budget).
- Roadmap L-00, L-01, L-02 (`docs/context/10-roadmap.md`).
- `docs/context/06-architecture.md` (hosting, preview mode, env table).
- `specs/feature-f07-legacy-redirects-check.md` (host checks), `specs/feature-f08-ci-lighthouse-budget.md` (`verify`), `specs/feature-s10-*` (indexing switch), `specs/feature-s01-site-layout-shell.md` (fact visibility).
- Lesson `lessons/2026-10-23-s08-lead-form.md` (Biome formats YAML/MD).
