# ADR 0008 — VPS deployment: Docker Compose + Caddy, images built in CI

- Status: Accepted (2026-10-26)
- Amends: ADR 0001 / `AGENTS.md` §3 "Hosting" row (VPS deployment shape), `docs/context/06-architecture.md` (hosting, preview mode, client IP, env)
- Owner repo: both
- Roadmap: L-00 (new), L-01, L-02

## Context

The owner chose a self-managed VPS instead of Vercel (Q-15, 2026-10-23). The docs were still written against Vercel: the fact-visibility gate reads `VERCEL_ENV=preview`, the client IP comes from "the first `x-forwarded-for` hop (Vercel)", and SEO checks assume a preview deployment. `06-architecture.md` said the deployment shape (reverse proxy, process manager, cache handler, preview environment) needed an ADR before L-02.

The owner has provisioned the server: a **Hostinger** KVM VPS in **Jakarta, Indonesia** running **Ubuntu 26.04 LTS**, with 2 vCPU, 8 GB RAM, 100 GB disk, 8 TB bandwidth and weekly Hostinger backups. It is reachable today as `root` over SSH. The hostname and IP addresses are kept out of git (deploy secrets, Decision 2). The owner then chose the options below.

## Decisions

1. **Runtime: Docker Compose with two services on the VPS.**
   - `app`: the Next 16 build with `output: 'standalone'`, running `node server.js` as a non-root user in a Node 22 image, as **one process**. It listens on the Compose network only.
   - `caddy`: Caddy 2 is the only public listener (80/443). It terminates TLS with automatic Let's Encrypt certificates for `43logistics.vn` and `www.43logistics.vn` and reverse-proxies to `app`. The `www` → apex redirect stays in the app (`check:redirects --host-checks`), so Caddy forwards both hosts unchanged.
   - Both services use `restart: unless-stopped`. Caddy's certificate data and the Next image-optimisation cache (`.next/cache`) are named volumes, so a redeploy keeps them.
2. **Build in CI, deploy by pull.** A GitHub Actions workflow in the app repo runs on every push to `main`:
   - It builds the Docker image with the production build-time environment (`NEXT_PUBLIC_*`, and the database URL, because the shell is prerendered against Supabase at build).
   - It pushes the image to GHCR (`ghcr.io/dienvm/43logistics.vn`), tagged with the commit SHA and `latest`.
   - It connects over SSH and runs `docker compose pull app && docker compose up -d app`.
   - The secrets live in a GitHub `production` environment (`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` and the build env). The VPS is never used as a build machine.
   - Runtime secrets live in an `.env` file on the VPS, readable by the deploy user only, and never in the image.
   - **Rollback** is `docker compose up -d` with an earlier SHA tag.
3. **No staging or preview environment.** Only production runs on the VPS.
   - Preview mode (unverified facts shown with a badge) exists only under `next dev` (`pnpm dev:local`). The `VERCEL_ENV` branch of the fact-visibility gate and the `VERCEL_ENV` env entry are removed (L-00), so every `next build` hides unverified facts.
   - L-01 QA runs on a local production build (`pnpm build && pnpm start` against the Supabase project). `check:redirects` keeps running in the `verify` CI workflow against `next start`.
4. **Cache: the default in-process cache handler, one app process.** `updateTag`/`revalidateTag` act on that single process, so admin edits are fresh on the next request (`06-architecture.md`). No PM2 cluster, no replicas, no Redis. A deploy starts a fresh container whose prerendered shell comes from the new build. Scaling beyond one process needs a shared cache handler and a new ADR.
5. **Client IP comes from the edge proxy.** Caddy is the first hop. Its `reverse_proxy` ignores incoming `X-Forwarded-For` from untrusted peers and sets it to the real client address, so `ip-hash.ts` keeps reading the first `x-forwarded-for` hop (only its comment changes). If a CDN (e.g. Cloudflare) is ever put in front of Caddy, Caddy's `trusted_proxies` must list the CDN's ranges in the same change, or rate limits and `ip_hash` would key on the CDN.
6. **Host hardening (L-00):**
   - SSH by key only and a dedicated deploy user in the `docker` group. Root login over SSH is turned off once that user works (today the only SSH user is `root`).
   - A firewall allows only 22, 80 and 443.
   - Unattended security updates are on.
   - Hostinger backups stay on (weekly today). The database lives in Supabase, so the VPS holds no data that isn't reproducible except Caddy's certificates.

## Alternatives considered

- **systemd + Nginx + certbot**: no Docker, but Node and the OS are managed by hand on the host, and rollback means rebuilding. Rejected for reproducibility.
- **PM2 + Nginx**: PM2's cluster mode would run several processes, and the in-process tag invalidation (Decision 4) would then go stale across them. Rejected.
- **Building on the VPS** (`git pull && pnpm build`): simpler, but it competes with the live site for 2 vCPU and leaves source and build secrets on the server. Rejected for CI builds.
- **A staging container on the same VPS**: it would give a server-hosted preview for L-01. The owner declined it (2026-10-26) to keep one environment. Local production builds are enough for QA.
- **Vercel**: declined by the owner in Q-15.

## Consequences

- **Easier:** the deploy is one reproducible image per commit, rollback is a tag swap, Caddy handles HTTPS without a cron job, and visibility now depends only on `next dev` versus `next build`, which removes a host-specific variable.
- **Harder:**
  - The owner's team now runs the server: OS updates, disk space, Docker upgrades and uptime. L-02 monitoring must include host checks (disk, container health), not only uptime.
  - CI needs production database and Clerk/PostHog build-time values as GitHub environment secrets.
  - Without staging, the first server-hosted run of a change is in production. L-01 is a local production build, and L-02's `--host-checks` run is the first check on the real host.
  - One process on 2 vCPU limits throughput. It is enough for a marketing site with cached shells. Scaling needs a new ADR (Decision 4).
- **Location:** Jakarta sits close to Supabase `ap-southeast-1` (Singapore), which keeps DB round trips short. It is a little further from Vietnamese visitors than Singapore would be, but cached shells make that cost small. L-01/L-02 should check TTFB from Vietnam.
- **Still open (Q-15):** who administers the VPS, and who holds DNS access for `43logistics.vn`.
- **Follow-up:** new roadmap task **L-00 Deployment pipeline** (Dockerfile, `compose.yaml`, `Caddyfile`, deploy workflow, host hardening, `VERCEL_ENV` removal) before L-01. L-01 becomes a QA pass on a local production build, and L-02 cuts DNS over to the VPS.
