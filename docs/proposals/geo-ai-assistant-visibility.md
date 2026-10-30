---
title: GEO — get AI assistants to recommend and cite 43logistics.vn
status: draft
owner_repo: both
roadmap: [S-04, S-10, S-12, A-07, C-02, C-03, C-05, L-00b, L-02]
updated: 2026-10-30
---

# GEO — get AI assistants to recommend and cite 43logistics.vn

## Problem

More and more customers ask an AI assistant instead of typing a Google query: "gửi hàng đi Hàn Quốc ở Đà Nẵng chỗ nào uy tín", "ship a parcel from Vietnam to Singapore, how much per kg?". ChatGPT (search), Google AI Overviews / AI Mode / Gemini, Perplexity, Microsoft Copilot and Claude answer by retrieving a handful of web sources and naming the businesses those sources mention. In the small search sample below, 43 Logistics did not appear in that source pool. How often assistants actually mention it, and whether any contacts come from them, is **unknown** until the prompt panel and the AI source group (D) measure it.

Generative Engine Optimization (GEO) is the work that makes the site (a) retrievable by these engines, (b) easy to quote correctly, and (c) mentioned by enough third-party sources that an assistant treats 43 Logistics as a real, recommendable option.

### Audit of the live site (2026-10-30)

Checked against `https://43logistics.vn` (new Next.js app behind Caddy) with `curl`, and two web searches.

**Already good (keep):**

- Pages are server-rendered: route pages ship ~2,100–2,500 visible words in the initial HTML, so crawlers that don't run JavaScript see the full content.
- `robots.txt` allows everything except `/admin/`, `/api/`, `/go/`, `/dev/`, so no AI crawler token is disallowed. Requests sent with GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot and CCBot user-agent strings got `200` from the origin. This only shows the origin doesn't filter by user agent; it doesn't prove real crawlers get through (they come from published IP ranges), and Google-Extended is a robots token, not a user agent. It must be re-checked once Cloudflare sits in front (ADR 0010, L-00b).
- `sitemap.xml` lists 60 VI + EN URLs with hreflang; one `<h1>`, canonical and description on every checked page.
- Route pages put the from-price and transit time in the `<title>` and `<h1>`, render the rate table as HTML, and show a visible "Cập nhật …" date — exactly the facts an assistant quotes.
- JSON-LD: `Service` + `Offer` (`UnitPriceSpecification` per kg) and `BreadcrumbList` on route pages; `WebSite` + `Organization` + one `LocalBusiness` per verified office on home; `BlogPosting` on posts.

**Gaps (ordered by expected impact):**

| # | Gap | Evidence |
| --- | --- | --- |
| 1 | **Little visible off-site footprint (sample of two searches).** AI answers are built from third-party sources; 43 Logistics did not appear in any result of the sample. | Search `"43 Logistics" Đà Nẵng gửi hàng` returns nothing about the company; "43" collides with Nghị quyết 43 về Đà Nẵng. Category search "gửi hàng đi Singapore Đà Nẵng uy tín" surfaces toplist.vn roundups, the GHN blog, DHL guides and competitors (3A Express, Sải Cánh, Manda). |
| 2 | **The inspected route pages have no FAQ section and no `FAQPage`**, although the template supports it (`43logistics.vn/modules/seo/domain/route-json-ld.ts:61`, S-04 §9) and the A-05 editor can already target routes and pages (`modules/content/ui/admin/faqs/faq-target-options.ts`). This is a content gap (no published FAQ attached to those routes), not missing code. Question → short answer is the format assistants extract most often. | Singapore and Korea pages (other routes not checked): the only `<details>` are the rate-card policy accordions; no "Câu hỏi thường gặp" H2. |
| 3 | **Weak entity graph.** Route pages reference `#organization` by `@id` but don't include the node; `Organization` has no `logo`, `sameAs` is Facebook only, no `alternateName`, `legalName`/`taxID` (Q-01) or `foundingDate` (Q-23). Assistants can't tell "43 Logistics" the forwarder from anything else called "43". | JSON-LD dump of `/` and `/gui-hang-di-singapore/`. |
| 4 | **No answer-first summary.** The route page goes from `<h1>` straight into the rate tabs. There is no 2–3 sentence paragraph that states, in one quotable block, the from-price, transit, methods, pickup cities and how to order. | H2 list of route pages. |
| 5 | **`/hang-cam-gui/` is under-used.** It is a high-intent informational page ("hàng cấm gửi đi Hàn Quốc") with stable `hang-{routeKey}` anchors and country navigation already (`modules/goods/ui/goods-catalog.tsx:19`), but only `BreadcrumbList`, no per-country summary sentence, and route pages don't deep-link to their country's section. | Page analysis. |
| 6 | **Thin About page** (~800 words, no founding year, volumes or legal info). Trust signals are what assistants use to say "uy tín". | Founding year and volumes wait on Q-23, legal info on Q-01; team/warehouse photos were supplied (Q-26, answered) and can be used. |
| 7 | **Bing is not covered.** ChatGPT search and Copilot rely in part on Bing's index; there is no Bing Webmaster Tools verification and no IndexNow ping on publish. Search Console is still pending (Q-13, L-02). | No verification meta; L-02 lists Search Console only. |
| 8 | **AI referrals are not grouped.** A-07 already shows individual `utm:{value}` / `ref:{host}` sources (e.g. `ref:chatgpt.com`), but has no "AI assistant" group, so the trend is hard to read. | 05 "Reporting source". |
| 9 | No `/llms.txt`. Low impact (no major engine has confirmed using it) but nearly free. | `404`. |

## Proposed approach

Four workstreams. GEO overlaps classic SEO for ~70 % of the work; the difference is the weight on quotable facts, Q&A, entity clarity and off-site mentions.

### A. On-site, app code (owner_repo: app) — one spec, proposed roadmap task **G-04 GEO on-site**

1. **Route FAQs live (mostly content).** The section, `FAQPage` and the A-05 route/page targeting already exist. Work: write and publish 5–8 FAQs per route in `/admin/faqs/` (content from B), then check every published route page renders them. Code only if a gap shows up (e.g. hubs or `/tinh-cuoc/` not rendering page FAQs). Calculator FAQs (volumetric weight, rounding) restate the engine rules, never new numbers.
2. **"Tóm tắt nhanh" / "At a glance" block** right under the route `<h1>`: a server-rendered paragraph plus a `<dl>` derived from the active rate cards (from-price per method, transit, origin offices, "Cập nhật" date, how to order via Zalo). No new facts and no hard-coded prices (rule 2): it reads the same derived summary as the title. Hidden fields when unverified (rule 1).
3. **Sitewide entity graph.** Emit the `Organization` node (stable `@id`) on every page, not only home, with `logo` (raster logo, Q-11). Every other property is emitted only from a verified source (rule 1): `sameAs` from verified `site_settings` profiles (Facebook today; Zalo OA, Google Business Profile, YouTube/TikTok once confirmed, Q-31); `alternateName` only with aliases the owner confirms (Q-31; `01-business.md` has "43Logistics.vn" from the old Rank Math config, not Confirmed); `areaServed` derived from active routes; `knowsAbout` only if the owner approves the list; `legalName`/`taxID` once Q-01 and `foundingDate` once Q-23 are verified. Add a route-page `WebPage` node with `dateModified` (schema.org defines it on `CreativeWork`, not `Service`) = the latest of the page translation, its active rate cards and its published FAQs; the visible per-card "Cập nhật" dates stay as they are.
4. **Prohibited goods page:** reuse the existing `hang-{routeKey}` anchors; add one summary sentence per country from approved `goods_rules`, an `ItemList`, and a deep link from each route page's goods section to its anchor.
5. **Hub/home comparison table:** keep the all-routes price table a semantic `<table>` (caption, header cells) with from-price and transit per route — the single most quotable asset for "giá gửi hàng đi nước ngoài".
6. **Bing + IndexNow:** Bing Webmaster verification meta from an env var (off when unset, ADR 0004). An IndexNow key file route (checked against the `proxy.ts` slash/locale rules so it answers `200` in one hop) and a server-side ping in `after()` when an admin action publishes, changes or unpublishes a page, post or rate card. Rules: submit only canonical public URLs of published, indexable locale versions (the same eligibility as `sitemap.ts`); on unpublish or delete, submit the removed URL; when a rate card changes, also submit the pages that show it (route page, hub, home, calculator); one bounded attempt with a short timeout, failures logged and never retried inline, and the editor's save never waits on it. Owner of the integration: the G-04 spec. No client JS.
7. **`/llms.txt`** generated from the DB with the `sitemap.ts` eligibility (published, not `noindex`, active route; a locale's line only when that translation is published): one line per route, hub, policy and guide with its canonical URL and one-sentence summary, VI and EN. Optional, ships last; expected benefit is a hypothesis.
8. **robots and edge policy made explicit.** Keep four things separate: (a) HTTP access — real crawlers must not be blocked at the edge; once Cloudflare is in front (ADR 0010, L-00b), check that its AI-bot blocking / AI crawl controls don't block the crawlers we allow, and verify with the Cloudflare logs or each vendor's crawler documentation, not a spoofed user agent; (b) robots permission for search and user-triggered fetchers (Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot/Claude-User) — keep allowed; (c) search retrieval — depends on (a), (b) and indexing in Google/Bing; (d) training permission (GPTBot, the Google-Extended token, CCBot, ClaudeBot). Recommendation for (d): allow, on the hypothesis that appearing in future model knowledge helps a lead-gen site more than protecting its copy; blocking would not remove what models already learned. Owner decision (Q-31).

### B. Content (owner_repo: context → DB via admin) — refocus C-02, C-03, C-05

- Write for the questions people actually ask an assistant, as question H2s with a direct first-sentence answer: "Gửi hàng đi Hàn Quốc mất bao lâu?", "Gửi đồ ăn khô đi Mỹ được không?", "Cước tính theo kg thực hay kg thể tích?", "Gửi hàng từ Đà Nẵng đi Nhật như thế nào?". EN equivalents for diaspora and foreign customers ("ship from Da Nang to Singapore").
- Citable original assets: the combined price list with its update date, worked examples of volumetric weight from the price engine, per-country goods rules approved by operations (Q-10), packing guides with real photos.
- About page with a real story, founding year and volumes (Q-23), the team and warehouse photos already supplied (Q-26, answered), legal info (Q-01).
- Owners: the owner (or a named staff member) writes or approves VI copy; EN follows the C-06 / `08-i18n.md` workflow with human review; the agent only drafts from confirmed facts.
- Blog cadence stays C-05's 2 posts/month, chosen from the prompt panel (D) where we're absent.
- **Never invent facts** (rule 1). Assistants repeat what they read; a wrong price or a "24/7" claim spreads further than on a normal page.

### C. Off-site presence (owner / marketer, recurring) — extends G-01…G-03 of `nextjs-rebuild-quynam-pattern.md` §5

- **Google Business Profile** for each verified office (feeds Gemini, AI Overviews and Maps), plus **Bing Places** and **Apple Business Connect**; real photos, hours from `site_settings`, reviews from real customers, never bought. Q-12's answer covers only the existing chat screenshots; any new review or screenshot needs its own customer consent, with names, avatars and order codes blurred (rule 14).
- **One brand string everywhere:** "43 Logistics — gửi hàng quốc tế từ Đà Nẵng / TP.HCM" with identical NAP on the site, GBP, Facebook, Zalo OA, directories — this is what separates the company from "Nghị quyết 43".
- **Get into the sources assistants already cite:** Vietnamese "top đơn vị gửi hàng đi {nước}" roundups (toplist-style sites, local media), business directories, and e-commerce/expat/study-abroad blogs. Paid placements are labelled as sponsored; no fake reviews, PBNs or link schemes (same rules as G-02).
- **Community answers:** staff answer real questions in Vietnamese diaspora groups (Singapore, Korea, Japan, Taiwan, US), forums and Reddit, disclosing who they are and linking the relevant guide, not the home page.
- **Video:** short packing/how-to videos on YouTube/TikTok with Vietnamese titles and descriptions; transcripts are indexed and cited.
- Wikidata item (optional, only if it meets Wikidata's notability policy, with the official website and verified facts).

### D. Measurement (owner_repo: both) — extends G-03

- **Prompt panel:** a fixed list of ~20 prompts (VI and EN, per top route + "Đà Nẵng" local intent + brand), run monthly in ChatGPT, Gemini / Google AI Mode, Perplexity and Copilot (~80 checks, roughly 2–3 staff hours a month); record per engine whether 43 Logistics is mentioned, cited (linked), its position and whether the facts are correct. Stored as `data/geo-prompt-panel.csv` in the context repo (no personal data). **Baseline: unknown** until the first full run, which is the first D task.
- **AI assistant source group** in the A-07 report and A-06 inbox, as a reporting enhancement: today those visits already show as `utm:chatgpt.com`, `ref:perplexity.ai` etc.; add a group that collects `chatgpt.com`, `perplexity.ai`, `gemini.google.com`, `copilot.microsoft.com`, `claude.ai` hosts / `utm_source` values. Keep 05's "Reporting source" precedence (click IDs first) and change the paired TypeScript and SQL classifiers, the filters, labels and CSV export together. No new cookie or client tracking; it reuses consented attribution, so it under-counts visitors who rejected ads consent (accepted limitation). Cloudflare Web Analytics (ADR 0010) can show AI referrers for consented page views alongside, but A-07 stays the first-party source for contacts and leads.
- Search Console (L-02) and Bing Webmaster Tools reports per route.
- Review after 3 months: if the panel and AI referrals don't move, shift effort between C and B.

### Order

1. **Now:** first prompt-panel run (baseline); A1 content check; A2, A3, A6; A8 together with L-00b (Cloudflare); AI source group.
2. **Next:** A4, A5, A7; B rewrites, starting with the priority subset from `AGENTS.md` §1 (SG, KR, JP, TW, MY, TH, US outbound + SG→VN), then the other routes now active per Q-05; About.
3. **Ongoing:** C and the monthly panel; blog topics from panel gaps.

## Alternatives considered

- **Classic SEO only.** Covers retrievability but not gap 1: without third-party mentions assistants rarely recommend a small brand, however good the page. Rejected as the whole answer; kept as the base.
- **Paid GEO monitoring tools** (Profound, Otterly, Semrush AI toolkit, etc.). Useful at scale but a monthly subscription; at this size a manual 20-prompt panel is enough. A budget decision for the owner if the panel becomes too slow (not ruled out by the free-CI rule, which covers GitHub Actions only).
- **Mass AI-written or programmatic pages** to "flood" the index. Rejected: breaks the thin-page gate in the quynam proposal §4, rule 1, and Google's spam policies.
- **Blocking AI training crawlers** (GPTBot, Google-Extended, CCBot). Protects copy but removes the brand from model knowledge; not recommended for a lead-gen site (Q-31).

## Consequences

- **Performance (ADR 0006/0009):** all on-site items are designed as server-rendered HTML or JSON-LD with no new client island, and JSON-LD should grow by roughly 1–2 KB per page (estimate). That doesn't replace the gates: the G-04 PR still records the app-JS delta (≤ 50 KiB gz over baseline), Lighthouse SEO 100 / accessibility ≥ 95 and the axe scans of §9, and field CWV stays the L-02 gate. IndexNow runs server-side in `after()`.
- **Consent / PDP law:** no new cookies, tags or client requests; the AI source group reuses consented attribution. IndexNow sends only public canonical URLs, never user data. New reviews and screenshots need customer consent and blurring of personal data (rule 14). Community posts never include customer data.
- **SEO / redirects:** no URL changes; anchors on `/hang-cam-gui/` are additive. FAQ and summary content also help normal search snippets.
- **i18n:** every new block and FAQ needs VI and EN (`messages/*` for chrome, DB for content); EN matters for English prompts from diaspora and foreign shippers.
- **Accuracy risk:** assistants cache and repeat facts; stale prices are worse than missing ones. The visible "Cập nhật" date and `dateModified` must come from the rate card, and price edits must stay in `/admin/routes/` (rule 2).
- **Effort and cost:** code is roughly one spec (A). Free services: Search Console, Bing Webmaster, IndexNow, GBP / Bing Places / Apple Business Connect. Not free: staff time for B (copy, translation review), C (profiles, outreach, community answers) and D (~2–3 h/month), where most of the result comes from; optional spend on sponsored roundup placements (always labelled) and any monitoring subscription — both owner budget decisions (Q-31).
- **Uncertainty:** engines change their retrieval often and publish little; every expected benefit here is a hypothesis measured by the panel, not promised.
- **Supersession:** none. This extends `nextjs-rebuild-quynam-pattern.md` §5; implemented specs stay as they are.
- **Docs to update if accepted (in place):** `05-seo-and-tracking.md` (entity graph, robots/edge policy, IndexNow, AI source group), `10-roadmap.md` (G-04 and G-01…G-03), `03-information-architecture.md` (route page summary block), `07-data-model.md` (any new `site_settings` keys such as profile URLs or the IndexNow key), `08-i18n.md` (FAQ and summary translation rules); G-04 gets its spec through `/feature-bug`.

## Open questions

- Q-01 legal name and tax code (entity graph `legalName`/`taxID`, About).
- Q-11 vector logo (`Organization.logo`; raster works meanwhile).
- Q-13 Search Console access (and now Bing Webmaster).
- Q-23 years operating, volumes, press (About, `foundingDate`).
- Answered, used as is: Q-12 (existing screenshots only; new reviews need new consent), Q-26 (team and warehouse photos supplied).
- **Q-31 (new):** official brand profiles and access — Google Business Profile per office, Zalo OA public URL, YouTube/TikTok channels, Bing Webmaster account; confirmed brand aliases (`alternateName`) and topics (`knowsAbout`); who does the recurring off-site and panel work (C, D) and any budget for sponsored placements or tools; allow AI training crawlers (GPTBot, Google-Extended, CCBot, ClaudeBot) or only search/user fetchers?

## Related

- `docs/proposals/nextjs-rebuild-quynam-pattern.md` §4–5 (topic clusters, thin-page gate, off-page G-01…G-03) — this proposal extends it for AI assistants and does not supersede it.
- `docs/context/05-seo-and-tracking.md` (metadata, JSON-LD, robots, reporting source).
- `specs/feature-s04-route-page-template.md` (FAQ section, `FAQPage`), `specs/feature-a05-a09-admin-lists-settings.md` (FAQ editor, settings), `specs/feature-a07-contact-analytics.md`.
- ADR 0004 (owner-dependent integrations built switched off), ADR 0006 (JS budget), ADR 0009 (field CWV gate), ADR 0002 as amended by ADR 0010 (Cloudflare edge + Web Analytics; tracking lanes unchanged by this proposal).
- Roadmap: S-04, S-10, S-12, A-07, C-02, C-03, C-05, L-00b, L-02.
