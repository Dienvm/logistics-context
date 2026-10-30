# ADR 0010 — Cloudflare edge in front of the VPS; Cloudflare Web Analytics replaces PostHog

- Status: Accepted (2026-10-30)
- Amends: ADR 0002 Decision 8 (the product-analytics lane is Cloudflare Web Analytics, not PostHog) · ADR 0008 Decisions 1, 5 and 6 (Cloudflare proxies in front of Caddy; client IP; firewall) · ADR 0009 Decision 1 (field-data source where CrUX is thin)
- Owner repo: both
- Roadmap: L-00b (new), S-13b (new), L-01, L-02

## Context

- **Analytics:** the owner no longer wants PostHog (2026-10-30). S-13 built it switched off; it was never activated because Q-20 (region, replay, cross-border transfer under Law 91/2025/QH15 + Decree 13) stayed open. What the business actually needs is page views, sources and real-user Core Web Vitals. Contact clicks and leads, the conversions that matter, are already logged first-party in `contact_events` (`/go`) and `leads`.
- **Edge:** the site runs on one VPS in Jakarta (ADR 0008) with Caddy as the only public listener. Visitors are in Vietnam, ADR 0009 field LCP is the binding gate, and the only DDoS/abuse protection is the host firewall's per-IP limits (`deploy/harden-host.sh`); stock Caddy has no rate-limit module, and the VPS IP is public.
- **Owner constraint (2026-10-30):** keep the domain registered at **Tenten** and keep the Hostinger VPS hosting unchanged; only add Cloudflare configuration for performance and security.
- Cloudflare's Free plan proxies traffic only for a zone whose **nameservers** are Cloudflare's; CNAME (partial) setup needs the Business plan. The owner accepted moving the nameservers only (option A, 2026-10-30).

## Decisions

1. **Cloudflare Free, full setup, nameservers only.**
   - The registrar stays Tenten (ownership, renewal); only the two nameserver entries at Tenten point to Cloudflare. Hosting stays the Hostinger VPS (ADR 0008 unchanged otherwise).
   - Before the switch, every record of the current Tenten zone is copied and checked one by one in Cloudflare (MX and mail TXT/SPF/DKIM/DMARC, Google/Search Console verification TXT, `quanly`, any Clerk CNAMEs). Mail and verification records stay **DNS only** (grey cloud); the apex, `www` and `quanly` are **proxied** (orange cloud).
   - Rollback = set the Tenten nameservers back; the Tenten zone is left intact until L-02.
2. **Edge settings (recorded in `deploy/README.md`, applied by the owner on the dashboard):**
   - SSL/TLS **Full (strict)**. Caddy keeps its automatic Let's Encrypt certificates (HTTP-01 through the proxy).
   - **Redirects stay in Caddy, one hop** (rule 13): "Always Use HTTPS" and any Cloudflare `www` redirect are **off**, so `http://www` is still one 301 to `https://43logistics.vn`. `check:redirects --host-checks` proves it through Cloudflare.
   - **Cache:** Cloudflare defaults (static extensions, so `/_next/static/*` immutable assets are cached at the Vietnam PoPs) plus one Cache Rule for `/_next/image*` respecting the origin `Cache-Control`. **HTML is never edge-cached** (no "Cache Everything"): admin edits rely on in-process `updateTag` (ADR 0008 Decision 4), and `/admin`, RSC and Server Action responses must not be cached.
   - **Off:** Rocket Loader, Email Obfuscation, Auto Minify, Mirage and any HTML rewriting (they break React hydration or alter the prerendered shells). Brotli, HTTP/3 and Early Hints may stay on.
   - **Security:** the Free managed WAF rules and DDoS protection on; a rate-limiting rule on POSTs to the lead-form routes; Bot Fight Mode **off** at first (it challenges CI deploy probes and `check:redirects`/Lighthouse runs from GitHub; revisit at L-02).
3. **Origin accepts only Cloudflare.**
   - The VPS firewall allows 80/443 only from Cloudflare's published IP ranges, in the `DOCKER-USER` chain (Docker-published ports bypass ufw `INPUT`). The current per-source-IP `connlimit`/`hashlimit` rules are removed: behind the proxy every source IP is a Cloudflare edge, so they would throttle real visitors. Per-visitor limits move to Cloudflare (Decision 2) and the app's IP-hash rate limit.
   - SSH (22) is unchanged and is not proxied.
4. **Client IP (amends ADR 0008 Decision 5).** Caddy trusts Cloudflare's ranges (`trusted_proxies`) and takes the client address from `CF-Connecting-IP` (`client_ip_headers`), then sets `X-Forwarded-For` to it, so `ip-hash.ts` keeps reading the first hop. The range list is versioned in the repo and refreshed by a script; it ships in the same change as the proxy switch, never after.
5. **Cloudflare Web Analytics replaces PostHog (amends ADR 0002 Decision 8).**
   - The analytics lane is Cloudflare Web Analytics: cookieless, no visitor identification, page views, referrers and Core Web Vitals RUM. It has no custom events and no funnels; the event vocabulary in `05` keeps flowing to `dataLayer` (GTM lane) only.
   - The beacon is added **manually** (site token in `NEXT_PUBLIC_CF_BEACON_TOKEN`), never by Cloudflare's automatic injection, and loads **only after analytics consent**, like any analytics request (rule 14, Consent Mode basic). No token → no beacon.
   - PostHog is removed from the app: `posthog-js`, the `/ingest` rewrites, the PostHog branches in `modules/tracking`, its env vars and CI/deploy secrets, and the banner copy that names it.
   - The consent banner keeps two categories: "Phân tích" → Cloudflare Web Analytics, "Quảng cáo" → GTM + ad platforms.
6. **Turnstile** keys come from the same Cloudflare account. Activating them stays optional (S-08b) and is an owner step.

## Alternatives considered

- **Keep DNS at Tenten, CNAME setup:** needs Cloudflare Business (~200 USD/month); Tenten also can't CNAME the apex. Rejected on cost.
- **No proxy, only Web Analytics + Turnstile:** keeps DNS untouched but gives no CDN, no DDoS/WAF and leaves the VPS IP public; the owner chose the edge (option A).
- **Keep PostHog:** funnels and custom events, but a second vendor, a cross-border assessment (Q-20) and ~heavier post-consent JS for features the owner doesn't use. Rejected by the owner.
- **Edge-cache HTML at Cloudflare:** faster TTFB, but admin edits would go stale until a purge, which would need Cloudflare API calls from every admin action. Rejected for now; revisit only with a measured TTFB problem at L-02.
- **Cloudflare Origin CA certificate instead of Let's Encrypt:** removes the renewal path through the proxy, but a direct origin request would then fail TLS and Caddy config diverges from ADR 0008. Kept Let's Encrypt; the Origin CA stays the fallback if HTTP-01 renewal fails.

## Consequences

- **Easier:** static assets served from Vietnam PoPs (helps field LCP, ADR 0009); DDoS/WAF and a hidden origin IP at no cost; one analytics vendor with no cookies and no identification; Q-20 closes (PostHog questions drop out); ~post-consent JS shrinks.
- **Harder / risks:**
  - DNS now lives at Cloudflare: a missed record breaks mail or verification. Decision 1's record-by-record check and keeping the Tenten zone until L-02 contain this.
  - Every visitor request passes through Cloudflare (US company): the privacy policy (C-03) names Cloudflare as a processor for transport/security and for analytics, with the cross-border transfer disclosure.
  - Forgetting `trusted_proxies` or the firewall allowlist breaks rate limits and `ip_hash` or leaves the origin open; Decisions 3–4 ship together, and L-00b's acceptance checks them.
  - The Cloudflare IP list changes rarely but does change; the refresh script must be run when Cloudflare announces changes (L-02 monitoring).
  - Product questions like "how many people used the calculator" are no longer answered by an analytics tool. If needed later, they become first-party event rows (a new task), not a new vendor.
- **ADR 0009:** field data = Search Console CWV / CrUX, plus Cloudflare Web Analytics Core Web Vitals (consented visitors only) where CrUX has too little traffic.
- **Follow-up roadmap tasks:** **L-00b Cloudflare edge** (owner_repo: app; Caddy, firewall, IP list script, runbook, nameserver switch) and **S-13b Analytics swap** (owner_repo: app; remove PostHog, add the consent-gated beacon). Both via `/feature-bug` → `/implement`.
