# ADR 0011 — GEO: optimise 43logistics.vn for AI assistants as part of the SEO lane

- Status: Accepted (2026-10-30)
- Amends: ADR 0010 Decision 2 (edge security settings: Cloudflare's AI-bot blocking and managed robots.txt stay off; verified crawlers must pass if Bot Fight Mode is turned on later)
- Owner repo: both
- Roadmap: G-01, G-02, G-03, G-04 (new), G-05 (new), L-00b, A-07, C-02, C-03, C-05, L-02
- Source: `docs/proposals/geo-ai-assistant-visibility.md` (audit of the live site 2026-10-30, Codex-reviewed)
- Context:
  - Customers increasingly ask ChatGPT, Google AI Overviews / AI Mode / Gemini, Perplexity, Copilot and Claude instead of searching. These engines retrieve a few web sources and name the businesses those sources mention. In a small search sample (2026-10-30), 43 Logistics did not appear in the source pool: the brand query returned Nghị quyết 43 về Đà Nẵng instead of the company, and the category query returned roundups (toplist.vn), the GHN blog, DHL guides and competitors. How often assistants mention the brand today is unknown.
  - The live site is already crawlable and server-rendered, with prices and transit in titles and JSON-LD. The gaps are: no FAQs on the inspected route pages (content, not code), a thin entity graph (`Organization` only on home, Facebook-only `sameAs`), no quotable summary under the route `<h1>`, no Bing/IndexNow, no grouped AI referral source, and almost no third-party mentions.
  - ADR 0010 puts Cloudflare in front of the origin. Cloudflare's dashboard can block AI crawlers at the edge, or add AI-crawler `Disallow` rules to `robots.txt`, without any change in the app. If either were on, every on-site GEO change would be invisible to assistants.

## Decisions

1. **GEO is part of the SEO lane, not a new lane.** It reuses `modules/seo`, `05-seo-and-tracking.md`, the existing JSON-LD builders, A-05 FAQs, the rate cards (rule 2) and A-07 reporting. It adds no analytics vendor, tag, cookie or client request (ADR 0002 as amended by ADR 0010 is unchanged) and no client JS island.

2. **Crawl policy — four separate things.**
   - **Edge access (amends ADR 0010 Decision 2):** Cloudflare "Block AI bots" is **off**, and the managed robots.txt / AI crawl control feature does **not** add or rewrite `robots.txt` rules. Bot Fight Mode stays off (ADR 0010); if it is turned on at L-02, verified search and AI crawlers must still pass. L-00b verifies this from the Cloudflare dashboard and logs, not with a spoofed user agent.
   - **robots.txt:** the app's `robots.ts` is the only source. Search and user-triggered fetchers (Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot, Claude-User) stay allowed on every public path.
   - **Training crawlers** (GPTBot, the Google-Extended token, CCBot, ClaudeBot): stay **allowed as today** until the owner answers Q-31. Blocking them later is a `robots.ts` change only and doesn't affect search retrieval.
   - **Private paths** keep their existing disallows (`/admin/`, `/api/`, `/go/`, `/dev/`).

3. **Entity data only from verified sources (rule 1).**
   - Every public page emits the `Organization` node with one stable `@id` (`https://43logistics.vn/#organization`) and the raster `logo` (Q-11).
   - `sameAs`, `alternateName`, `knowsAbout`, `legalName`, `taxID` and `foundingDate` are emitted only when their `site_settings` value is verified. Brand aliases and profile URLs come from Q-31, legal data from Q-01, the founding year from Q-23. `areaServed` is derived from active routes.
   - Route pages add a `WebPage` node whose `dateModified` is the latest of the page translation, its active rate cards and its published FAQs. `dateModified` is never set on `Service`. The visible per-card "Cập nhật" dates stay.

4. **Quotable on-page facts come from the database.** The route page gets a server-rendered "Tóm tắt nhanh" / "At a glance" block under the `<h1>`: from-price per method, transit, origin offices, update date and how to order. It is derived from the same active-card summary as the title. Unverified fields are hidden, never placeholdered with numbers. Route, hub and calculator FAQs are content in A-05, published per locale. They restate confirmed rules and never introduce new numbers.

5. **Discovery pings are server-side and switched off by default (ADR 0004).**
   - Bing Webmaster verification uses an env var, and IndexNow uses an env key with a key-file route that answers in one hop through `proxy.ts`. Neither runs when its env var is unset.
   - IndexNow submits only canonical public URLs, using the `sitemap.ts` eligibility rules. It submits on publish, change, unpublish and delete. A rate-card change also submits the pages that show the card: the route page, hub, home and calculator.
   - One bounded attempt per submission, run in `after()`. Failures are logged and never retried inline, and an admin save never waits on the ping.
   - `/llms.txt` is optional. If built, it uses the same eligibility rules.

6. **Measurement.**
   - A-07 and A-06 gain an **"AI assistant" source group** (hosts or `utm_source` values `chatgpt.com`, `perplexity.ai`, `gemini.google.com`, `copilot.microsoft.com`, `claude.ai`) on top of the existing `utm:` / `ref:` sources.
   - The group keeps the 05 precedence: click IDs come first.
   - The paired TypeScript and SQL classifiers, the filters, the labels and the CSV export change together.
   - The group under-counts visitors who rejected ads consent; that is accepted.
   - A monthly **prompt panel** (~20 fixed VI/EN prompts × ChatGPT, Gemini / AI Mode, Perplexity, Copilot) is recorded in `data/geo-prompt-panel.csv` (context repo, no personal data). The first run is the baseline.

7. **Off-site presence is decided work, done honestly.** G-01 to G-03 (from `nextjs-rebuild-quynam-pattern.md` §5) become roadmap tasks, with GEO added to them:
   - Google Business Profile, Bing Places and Apple Business Connect for each verified office.
   - Identical NAP and one brand string ("43 Logistics — gửi hàng quốc tế") everywhere.
   - Inclusion in roundups and directories; any paid placement is labelled as sponsored.
   - Disclosed staff answers in community groups, and how-to videos.

   Not allowed: no paid links, PBNs, fake or gated reviews, no mass AI-written or programmatic pages (the quynam thin-page gate applies), and no new review or screenshot without customer consent and blurring (rule 14).

## Alternatives considered

- **Classic SEO only:** covers retrievability, but not the missing third-party mentions, which decide whether an assistant names a small brand. Rejected as the whole answer; it remains the base.
- **Block AI training crawlers now:** protects the copy, but takes the brand out of future model knowledge. Deferred to the owner (Q-31); the status quo (allowed) stays meanwhile.
- **Let Cloudflare manage AI bots (block or managed robots.txt):** a dashboard toggle would silently override the app's `robots.ts` and could undo GEO without a code change. Rejected; the app is the only source of crawl rules.
- **Paid GEO monitoring tools** (Profound, Otterly, Semrush AI toolkit): useful at scale, but a monthly subscription for a 20-prompt panel. Not adopted; it is an owner budget decision if the manual panel becomes too slow.
- **Programmatic or AI-generated page volume:** rejected (rule 1, the thin-page gate, Google spam policies).

## Consequences

- **Easier:** one documented crawl policy across Cloudflare and the app. Assistants get quotable, dated facts from the same source as prices (rule 2). AI traffic becomes visible in the existing A-07 report.
- **Harder / risks:**
  - Assistants cache and repeat facts. A stale or wrong price spreads further, so update dates must stay data-driven and prices must stay in `/admin/routes/`.
  - Results depend on engines that change their retrieval often. Every expected benefit is a hypothesis, judged by the panel and the AI source group, with a review after 3 months.
  - Most of the result depends on recurring staff time: content (B), off-site work (G-01–G-03) and the panel (G-05). Who does it, and any spend on sponsored placements or tools, is open (Q-31).
  - Cloudflare dashboard settings are outside git. `deploy/README.md` records them, and L-00b checks them.
- **Performance and consent:** no new client JS, cookies or tags. JSON-LD grows by about 1–2 KB per page (estimate). The G-04 PR still records the ADR 0006 app-JS delta, Lighthouse SEO 100 / accessibility ≥ 95 and the axe scans. Field CWV stays the L-02 gate (ADR 0009). IndexNow sends only public URLs.
- **i18n:** summaries and FAQs need both VI and EN (DB content via the C-06 workflow, chrome in `messages/*`). A locale is pinged and listed only when its translation is published.
- **Follow-up roadmap tasks:**
  - **G-04 GEO on-site** (app): Decisions 2–5 in code.
  - **G-05 GEO measurement** (both): the AI source group and the panel baseline.
  - **G-01–G-03** off-site work (owner / marketer).
  - L-00b gains the Cloudflare AI-bot check.
  - C-02, C-03 and C-05 gain route FAQs, question-led H2s and the About facts.
  - G-04 and G-05 go through `/feature-bug` → `/implement`.
