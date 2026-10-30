# 05 — SEO & tracking

## Targets

- Organic: route keywords in Vietnamese ("gửi hàng đi {nước}", "gửi hàng {nước} về việt nam", "giá gửi hàng đi {nước}", "hàng cấm gửi đi {nước}") and English ("ship from Vietnam to {country}", "Singapore to Vietnam shipping").
- Paid: Google Ads, Meta, TikTok (and possibly Zalo Ads) landing on route pages or `/lp/*`.
- Technical: Lighthouse SEO 100, valid structured data, zero redirect chains, zero 404s from old URLs.

## Metadata (Next.js Metadata API)

Every page exports `generateMetadata` that reads `page_translations` (`seo_title`, `seo_description`, `og_image_id`, `noindex`).

```ts
// modules/seo/domain/build-metadata.ts (shape)
export function buildMetadata({ locale, path, alternates, title, description, ogImage, noindex }: Args): Metadata {
  return {
    metadataBase: new URL('https://43logistics.vn'),
    title,                                   // root layout template: '%s | 43 Logistics'
    description,
    alternates: {
      canonical: path,                       // absolute via metadataBase, trailing slash
      languages: { vi: alternates.vi, en: alternates.en, 'x-default': alternates.vi }, // only locales that are published
    },
    openGraph: { type: 'website', siteName: '43 Logistics', locale: locale === 'vi' ? 'vi_VN' : 'en_US', url: path, title, description, images: ogImage ? [ogImage] : undefined },
    twitter: { card: 'summary_large_image' },
    robots: noindex ? { index: false, follow: true } : { index: true, follow: true, 'max-image-preview': 'large' },
  }
}
```

Length rules enforced in the admin: title ≤ 60 chars, description 120–155 chars, no `&nbsp;`, no year in titles unless it is kept current automatically.

Title/description patterns (defaults when the editor leaves fields empty — always fill real values for P0 pages):

| Page | VI title | EN title |
| --- | --- | --- |
| Outbound route | `Gửi hàng đi {Nước} từ {min}đ/kg – {days} ngày` | `Ship from Vietnam to {Country} – from {min} VND/kg` |
| Inbound route | `Gửi hàng {Nước} về Việt Nam – nhận tại HN, HCM` | `{Country} to Vietnam Shipping – door to door` |
| Hub outbound | `Gửi hàng đi nước ngoài – bảng giá các tuyến` | `International Shipping from Vietnam – Rates by Country` |
| Calculator | `Tính cước gửi hàng đi nước ngoài` | `Shipping Cost Calculator` |
| Blog post | `{Post title}` | `{Post title}` |

Open Graph images:

- **As built (A-04):** a page translation's `og_image_id` and a post's `cover_id` emit `og:image` (the image's 1200×630 JPEG derivative in the public `og` bucket, `og/media/{id}.jpg`, absolute Storage URL, with width, height and the locale's alt) plus `twitter:image`, from every page type's `generateMetadata` (`modules/seo` `withOgImage`). The page then repeats the site `openGraph` defaults (Next replaces `openGraph` as a whole). Without one, no `og:image` is emitted; VI and EN are independent.
- **Planned (S-10 open item, Q-11 logo):** generated route images `app/[locale]/(site)/[...]/opengraph-image.tsx` with `next/og` `ImageResponse` — flag + "Gửi hàng đi {Nước}" + "từ {min}đ/kg" + logo, 1200×630, brand colours, and a default site image. Note in Next 16 the `params` passed to metadata image routes is a Promise.

## Hreflang & canonical

- Self-referencing canonical on every indexable page, absolute, with trailing slash, no query string (UTM parameters must never become canonical).
- `hreflang` pairs only when both translations are `published`. `x-default` → Vietnamese URL.
- No automatic locale redirects (no `Accept-Language` / IP redirect); offer a dismissible "View in English?" banner instead.
- `/lp/*`, `/tra-cuu/*`, `/go/*`, `/admin/*`, `/api/*` are `noindex` or disallowed.

## `app/sitemap.ts` & `app/robots.ts`

- Sitemap generated from DB: published, indexable pages + posts, both locales, each entry with `alternates.languages`, `lastModified = updated_at`. Excludes `/lp/*`, tags/authors/dates (not recreated).
- Single `/sitemap.xml`; old `/sitemap_index.xml`, `/post-sitemap.xml`, `/page-sitemap.xml`, `/category-sitemap.xml`, `/post_tag-sitemap.xml`, `/sitemap.rss` 301 → `/sitemap.xml` (see redirect map).
- robots: allow `/`; disallow `/admin/`, `/api/`, `/go/`; `Sitemap: https://43logistics.vn/sitemap.xml`. `robots.ts` is the only source of crawl rules: no Cloudflare-managed robots.txt or AI-bot blocking (ADR 0011; see "AI assistants (GEO)").
- RSS: `/kinh-nghiem/rss.xml`, `/en/guides/rss.xml` (route handlers).

S-10 as built (43logistics.vn PR #33):
- Sitemap rows come from `modules/content` `listSitemapPages`: page + translation published, not `noindex`, route active for route pages, no `landing` pages; posts published per locale. The **home is always listed**, since it renders from the owner-approved messages copy whatever its record's status, and its hreflang pair is always emitted.
- robots.txt disallows `/admin/`, `/api/`, `/go/`, `/dev/`, `/en/dev/` on the production origin and everything elsewhere; the root layout's robots meta follows the same `NEXT_PUBLIC_SITE_URL` switch (06 env table).
- Root layout defaults: title template `%s | 43 Logistics` (home uses an absolute title), Open Graph `siteName`/locale/type, `twitter: summary_large_image`.
- Not yet: OG images (`next/og`), and the Rich Results Test per page type (L-01, needs a public URL).

## Structured data (JSON-LD) per page type

Emit with a `<JsonLd data={...} />` server component (`<script type="application/ld+json">`, escaped). Values come from `site_settings`, `routes`, `route_rates`, `faqs`, `posts` — never hard-coded.

| Page type | Schema |
| --- | --- |
| All pages | (G-04 as built: see "AI assistants (GEO)") `WebSite` (name "43 Logistics", url, inLanguage) + `Organization` (logo SVG/PNG URL, `sameAs` Facebook, `contactPoint` { telephone "+84979222357", contactType "customer support", availableLanguage ["vi"] — add "en" only after Q-03 confirms English support }) |
| Home, Contact, About | `LocalBusiness` per office (Đà Nẵng, TP.HCM): name, address (`PostalAddress` with confirmed new admin names), `geo`, telephone, `openingHoursSpecification` from settings, `url`, `image` |
| Route pages | (A-02b **Offer currency rule**: one `Offer` per route page, for its derived "Từ X/kg" price only, in the currency that price is quoted in (`priceCurrency` = ISO code: VND, USD, SGD or KRW; never converted); `price` is the major-unit decimal string ("94000", "7.00"); no Offer without a shown verified public "Từ" price; `areaServed` lists the zone countries on the EU route, else the route's country.) (S-04 as built: `Service` with `Offer` only for a shown verified public from-price, `FAQPage` only with published FAQ rows, `BreadcrumbList` from the breadcrumbs; OG image deferred) `Service` { serviceType "International parcel shipping", provider → Organization, areaServed → `Country` {name}, `offers`: `Offer` with `priceSpecification` `UnitPriceSpecification` { price, priceCurrency "VND", unitCode "KGM", referenceQuantity, eligibleQuantity (min/max kg) }, `validFrom`/`validThrough` from rates } + `BreadcrumbList` + `FAQPage` (Google shows FAQ rich results only for some authoritative sites; still valid markup) |
| Hubs | `ItemList` of route services + `BreadcrumbList` |
| Blog post | `BlogPosting` (headline, image, datePublished, dateModified, author `Organization`, inLanguage, mainEntityOfPage) + `BreadcrumbList`. `image` is the absolute URL of the cover's OG JPEG when the post has a cover (A-04), else omitted; the blog index emits an `ItemList` of its articles. `author` stays the `Organization` even when the article shows a staff byline (A-03b). The blog filter (A-03b) is client-only: no URL, no `searchParams`, no change to the index's canonical, metadata, JSON-LD or sitemap entry; categories have no archive URL |
| Policy pages | `WebPage` + `BreadcrumbList` |

Do not output `AggregateRating`/`Review` unless reviews are real, collected on-site, and policy-compliant.

Every value above is emitted only when its source is verified (rule 1), and preview mode never changes structured data: badges are for humans only. Home today (S-05, `modules/seo` `buildHomeJsonLd`, one `@graph`): `WebSite` { name, url, inLanguage } + `Organization` { name, url }, plus `legalName`/`taxID` only with `company` verified (Q-01), `contactPoint` only with `contact` verified (Q-06), `sameAs` only with `social` verified; no `logo` until Q-11. One `LocalBusiness` per office only with `offices` verified (Q-02), `openingHoursSpecification` only with `hours` verified (Q-03) and its structured `spec` parsing. `alternateName`, `geo` and `image` wait for confirmed values; S-10 moves `WebSite`/`Organization` to the layout.

Info pages (S-09, `modules/seo` `InfoJsonLd`):

- **Policy pages:** `WebPage` { name, url, inLanguage, `dateModified` = the `policy` block's `effectiveDate` } + `BreadcrumbList` (from the breadcrumbs).
- **Contact and About:** `BreadcrumbList` + one `LocalBusiness` per office, only with `offices` verified. It is built by the same `buildLocalBusiness` as home (`domain/local-business.ts`) from the same verified facts (`ui/verified-business.ts`), with the home URL as `url` and `@id` base, so all three pages describe the same entities. Nothing else is emitted without verified offices.
- **Office maps:** `/lien-he/` and the closing office band (home, calculator, hubs, About, blog) embed a keyless, lazy Google Maps iframe per office (`shared/ui/map-embed.tsx`; 03 Contact, Home 8). **Known exception to rule 14 (owner decision 2026-10-23):** the iframe loads (lazily) without consent and Google may set cookies; the privacy policy discloses it. S-13 must gate it behind consent (click-to-load or the banner) before ads launch.

## AI assistants (GEO, ADR 0011)

Goal: ChatGPT, Google AI Overviews / AI Mode / Gemini, Perplexity, Copilot and Claude can retrieve, quote and recommend 43logistics.vn. Background and audit: `docs/proposals/geo-ai-assistant-visibility.md`.

- **Crawl policy:** search and user-triggered fetchers (Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot, Claude-User) allowed on public paths. Training crawlers (GPTBot, Google-Extended token, CCBot, ClaudeBot) allowed until Q-31 says otherwise. At the edge: Cloudflare "Block AI bots" off, no managed robots.txt, verified bots pass if Bot Fight Mode is ever on (checked in L-00b).
- **Entity graph (G-04, built):** the site layout renders `SiteJsonLd` once per public page: `Organization` (`@id` `{origin}/#organization`, `name`, `url`, `logo` = `/images/brand/logo-256.webp` until Q-11) + `WebSite` (`@id` `{origin}/#website`, `publisher` → the Organization). `legalName`, `taxID`, `alternateName`, `knowsAbout` (page locale) and `foundingDate` (`"YYYY"`) only with `company` verified and each value non-empty (Q-01, Q-23, Q-31); `sameAs` = `facebook`, `zaloOa`, `googleBusiness`, `youtube`, `tiktok` (that order, non-empty) only with `social` verified; `contactPoint` only with `contact` verified; `areaServed` = countries of the active routes with a published page. Home and blog posts no longer build their own Organization/WebSite: `BlogPosting` `author`/`publisher` are `{"@id": …#organization}`. Route pages add `WebPage` (`@id` `{canonical}#webpage`, `isPartOf` → `#website`, `mainEntity` → `#service`) with `dateModified` = latest of the translation's `updated_at`, the shown rate cards' `RoutePricing.updatedAt` and the published FAQs' `updated_at` (never on `Service`; omitted without any). The goods page adds `WebPage` + `ItemList` of its country sections (`{canonical}#hang-{routeKey}`).
- **Quotable facts (G-04, built):** a `<p>` right after the route `<h1>`: "Gửi hàng đi {nước}: đường bay từ X/kg, đường biển từ Y/kg; thời gian a–b ngày; nhận hàng tại {nơi}. Bảng giá cập nhật {ngày}. Nhắn Zalo …" (`routeSummary.*`). Per-method from-prices (`getMethodFromPrices`, each in its card's currency), transit, the outbound cards' `placeLabel`s (inbound labels name the destination, so inbound routes have no places clause) and the date; a hidden fact drops its clause, no visible fact → no paragraph. `/hang-cam-gui/` opens each country section with "{nước}: n nhóm hàng cấm gửi, m nhóm hạn chế, k nhóm gửi được, ví dụ cấm: a; b; c." (`goodsSummary.*`, examples separated by ";" because item names hold commas); route pages with a goods section of their own link to it ("Xem đầy đủ hàng cấm và hạn chế gửi đi {nước}"). Route/hub/calculator FAQs: A-05 per locale, restating confirmed rules only (C-02).
- **Discovery (G-04, built):** `msvalidate.01` meta from `BING_SITE_VERIFICATION` (a build variable). IndexNow (`modules/indexnow`): `/indexnow-key.txt` serves `INDEXNOW_KEY` (404 unset); admin saves of pages, posts, FAQs, rate cards/bands/surcharges, route facts and goods rules submit, from `after()`, the union of the affected pages' eligible URLs before and after the write (sitemap eligibility via `content/client.ts` `toIndexablePage`), deduplicated, absolute, ≤ 100, one POST with a 5 s timeout and no retry; only with the key, `NODE_ENV=production` and the production origin. Settings saves don't ping. `/llms.txt` (production origin only, else 404): every sitemap URL once as `- [title](url): description`, sections Trang chính / Tuyến gửi hàng / Bảng giá & công cụ / Hướng dẫn / Chính sách, then `## English`.
- **Measurement (G-05, planned):** "AI assistant" group in the reporting source below (`chatgpt.com`, `perplexity.ai`, `gemini.google.com`, `copilot.microsoft.com`, `claude.ai` hosts or `utm_source`, after click IDs); monthly prompt panel in `data/geo-prompt-panel.csv`.
- **Not allowed:** paid links, fake or gated reviews, mass AI-written or programmatic pages, unlabelled sponsored placements.

## Redirects & legacy URLs

- Source of truth: `43logistics.vn/data/redirect-map.csv` (`old_url,new_url_vi,new_url_en,status_code,notes`).
- **As built (F-07):** `next.config.ts` `redirects()` is generated from the CSV at build by `modules/seo` (`loadRedirectMap` → `buildNextRedirects`).
  - **Rules:** 43 exact rows give 80 rules, each `statusCode: 301` (not `permanent: true`, which emits 308). Non-file sources appear with and without the trailing slash, so slash-less legacy URLs are still one hop; config redirects run before `proxy.ts`.
  - **Validation:** the CSV is checked with Zod at build: header, status codes, same-origin destinations, no duplicates, no overlap with `proxy.ts` rules, and a named handler for each of the 6 wildcard rows. A malformed CSV fails the build with the line and field.
  - **Uploads (A-04, owner 2026-10-28):** WordPress media URLs are not kept. `/wp-content/uploads`, `/wp-content/uploads/` and everything below it (dotted file names included, via an explicit `proxy.ts` matcher entry) answer an empty 410 with `cache-control: public, max-age=3600`; other `/wp-content/*` paths are ordinary 404s. `check:redirects` checks three samples.
- **`?attachment_id=`** on `/`, `/vi` or `/index.php` → 301 `/` in `proxy.ts`, with precedence `page_id` > `p` > `attachment_id`; the legacy params are removed and others kept. Attachment **slugs** (`/{attachment-slug}/`) have no handler (owner, 2026-10-28; A-04): they render the localized 404 with `noindex` like any unknown slug (status: the L-01 soft-404 item).
- **Exception (owner, F-07):** legacy ID params on non-root legacy URLs (e.g. `/home1/?page_id=705`) are bypassed. They're ordinary params there, and the second hop is accepted.
- 410 rows (`/tieu-de/`, `/portfolio/*`, `/wp-admin/*`, `/wp-login.php`, `/xmlrpc.php`, `/wp-json/*`, `/wp-content/uploads/*`): handled in `proxy.ts` (F-06), which returns an empty 410 with `cache-control: public, max-age=3600`.
- Old query URLs `/?page_id={id}`, `/?p={id}` (also on `/vi` and `/index.php`): mapped through `43logistics.vn/data/legacy-wp-ids.json` (21 IDs; the sources per ID are in `specs/feature-f06-proxy-composition.md`) in one 301.
  - `page_id` wins over `p`, and other parameters are kept.
  - An ID mapped to `gone` (832) → 410; an unknown ID → 301 to `/` (owner decision).
- Trailing slash and the locale prefix (`/vi` → `/`, `/EN` → `/en/`) are normalised by `proxy.ts` in the same single hop (`skipTrailingSlashRedirect: true`).
- `http://` and `www.` → `https://43logistics.vn` at the host/CDN level (one hop).
- Runtime additions later: `redirects` table read in `proxy.ts` (cached), managed in admin. Precedence: the CSV owns legacy WordPress URLs and is immutable after launch; the table owns new redirects (slug changes). The admin action rejects a `from_path` that exists in the CSV, and `check:redirects` fails on any overlap.
- `pnpm check:redirects` (a script, not a test suite; ADR 0004) runs in the `verify` CI workflow against `pnpm start` on every PR, and **0 FAIL** is required. Outcome per check:

  | Observed | Default | `--strict` |
  | --- | --- | --- |
  | 200 | PASS | PASS |
  | 404 on a not-yet-built page | PENDING | FAIL |
  | any other status, a wrong `Location`, a second hop, a request error or a timeout | FAIL | FAIL |
  | deferred handler (A-04) | PENDING | FAIL |
  | host rules | SKIPPED (L-02) unless `--host-checks` | FAIL unless `--host-checks` |

  L-01 requires `--strict`; L-02 requires `--base https://43logistics.vn --host-checks --strict`.

## Performance rules (SEO-relevant)

- Route pages and home are fully static shells (Cache Components) with only the calculator and consent as client islands.
- LCP image: `next/image` with `priority`, correct `sizes`, AVIF/WebP, ≤ 150 KB at 1280 px wide.
- Fonts: 2 families, `display: swap`, subsets latin + vietnamese, preload via `next/font`.
- Third-party: GTM loaded with `@next/third-parties/google` `GoogleTagManager` only after the user grants ads consent (basic mode: no GTM request before that); the Cloudflare Web Analytics beacon injected only after analytics consent (ADR 0010; never Cloudflare's automatic injection); no Maps iframe (static map image + link); no chat widget scripts.
- Budgets (ADR 0006): framework baseline (134.3 KB gz on Next 16.4.2 / React 19.3.1) + ≤ 50 KB gz app JS per route; LCP < 2.5 s, INP < 200 ms, CLS < 0.1 at p75 of field data (ADR 0009; Lighthouse lab numbers are recorded, not binding) (reserve space for sticky bar and images).

## Tracking plan

### Identifiers captured (first-party cookie `43l_attr`, 90 days, set in `proxy.ts` on landing — **only when ads consent is already granted**; otherwise the identifiers are kept in the URL/session for the current visit and written after consent)

Cookie format (F-06; `modules/tracking`):
- **Attributes:** `Path=/`, `HttpOnly`, `SameSite=Lax`, `Secure` (production), `Max-Age` 90 days.
- **Value:** base64url JSON of the parameters below. `landing_path` is the pathname only, `referrer_host` the hostname only, and `first_seen_at` the first landing time.
- **Size:** each value is capped at 150 UTF-8 bytes; the cookie is at most 3,072 bytes, otherwise it isn't set.
- **Behaviour:** last-touch on each new landing with parameters, keeping `first_seen_at`. Never set on a redirect, 410 or 404 answered by the proxy.

`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid`, `gbraid`, `wbraid`, `fbclid` (→ build `_fbc`), `ttclid`, `landing_path`, `referrer`, `first_seen_at`. Attached to every `leads` and `contact_events` row.

**Reporting source (A-06 inbox, A-07 report):** each `leads` / `contact_events` row gets one source from its stored attribution, in this order: a click ID (`gclid`/`gbraid`/`wbraid` → Google Ads, `fbclid` → Facebook Ads, `ttclid` → TikTok Ads), else `utm_source` (trimmed, lowercased), else the referrer host (`referrer` holds a bare host; an older full URL is reduced to its host), else **unknown** ("Không rõ nguồn": no campaign link, or no ads consent). Keys: `click:{network}`, `utm:{value}`, `ref:{host}`, `unknown`. One pure function and its SQL twin (`modules/tracking`, `deriveTrafficSource()` / `trafficSourceKeySql()`) serve the inbox list, filter and CSV and the weekly report, so they always agree.

### Contact click tracker

`/go/[channel]/?from={path}&eid={uuid}&placement={p}&route={key}` (route handler `app/go/[channel]/route.ts`, `channel ∈ zalo | call | whatsapp | messenger`, exact lower case; S-02):
0. The client link generates a per-click UUID `event_id`, pushes the client event with it, and sends it as `?eid=` to the handler. The handler validates it (UUID) or generates a fallback; `contact_events.event_id` is unique, so a retried click is not double-counted.
1. **Redirect first:** the `302` must never wait on or fail because of tracking. Steps 2–3 run in `after()` with a short timeout; failures are logged, not retried inline.
2. Insert `contact_events` row (channel, route, path, attribution, consent state, hashed IP, user agent).
3. Fire server-side conversion (see below) only if ads consent was granted, with the same `event_id`.
4. `302` to `https://zalo.me/{contact.zalo}` / `tel:{contact.phoneE164}` / `https://wa.me/{contact.whatsapp, 0… → 84…}?text={contact.whatsappPrefill}` / `https://m.me/{contact.messenger}`, all read from `site_settings.contact` (values: `01-business.md`). The prefill locale comes from `from` (`/en/…` → EN).

Rules (S-02):

- **Unpublished → 404.** The target is published only under the fact-visibility rule (verified, or preview mode: `PREVIEW_UNVERIFIED=1` under `next dev`, ADR 0008). Otherwise, or when the channel's field is missing or malformed, or the channel is unknown (`/go/email/`, `/go/ZALO/`), the response is `404` and no row is written. There is no fallback number. Until Q-06 is verified, production CTAs 404 (L-01 checklist).
- **Methods.** `GET` redirects and logs; `HEAD` answers with the same status and `Location` but logs nothing; other methods get `405` (`Allow: GET, HEAD`). Every `/go` response has `Cache-Control: no-store` and `X-Robots-Tag: noindex, nofollow`.
- **Bots** (UA allowlist in `modules/tracking/domain/bot.ts`: `…bot/`, crawlers, link previewers, Lighthouse) get the redirect but no row.
- **Placements** (allowlist, else `null`): `header` (incl. the top-bar hotline), `hero` (home and route heroes, S-05/S-04), `rate_table` and `calculator` (route pages, S-04), `cta_band` (offer and closing bands, S-05b), `sticky_bar`, `footer`, `lead_form` (S-08), `contact_page` (Contact channel buttons) and `not_found` (404 CTAs, S-09). New placements are added to `CONTACT_PLACEMENTS` in `modules/contact/constants.ts`.
- **Row inputs** are untrusted: `eid` must be a UUID (else a server UUID), `from` must be a same-site path ≤ 300 chars (else `null`; `locale` follows it), `route` must be an active route key (else `null`). Attribution columns come from `43l_attr` only when `43l_consent` grants ads; consent columns from `parseConsent`. `ip_hash` = HMAC-SHA256 with `IP_HASH_SALT`.
- **Conversion seam.** `sendContactConversion` (`modules/tracking`) returns unless ads consent; with consent it is a no-op until T-01 / Q-13 (no network request).

The client link (`ContactLink`) mints the `event_id` on `click` (Enter included), pushes `click_<channel>` to `window.dataLayer` with it and puts it in the href as `eid`, so the push and the row share it for pixel de-duplication. Without JS the plain `/go/<channel>/` link still redirects and logs, with a server `event_id`. CTA links carry `rel="nofollow"`. Events are defined once in `modules/tracking/constants.ts` and pushed to `dataLayer` (GTM lane, after ads consent). Cloudflare Web Analytics takes no custom events (ADR 0010).

### dataLayer events

| Event | When | Parameters |
| --- | --- | --- |
| `click_zalo` / `click_call` / `click_whatsapp` / `click_messenger` | Contact button click | `event_id`, `route_key`, `placement` (header, hero, sticky_bar, rate_table, footer…), `locale` |
| `calculate_quote` | Calculator returns a result | `route_key`, `weight_kg`, `chargeable_kg`, `currency` (the rate card's: VND, USD, SGD, KRW), `estimate_amount` (major units, null for "Liên hệ"), `estimate_vnd` (only when `currency` is VND), `locale` (A-02b) |
| `generate_lead` | Lead form success | `event_id`, `route_key`, `lead_id`, `locale`, `value` (estimate if any), `currency: 'VND'` |
| `form_start` / `form_error` | First field focus / validation error | `form: 'lead'`, `field` |
| `view_route` | Route page view | `route_key`, `direction` |
| `select_route` | Route chosen in picker/mega menu | `route_key`, `placement` |

### Platforms

| Platform | Client | Server-side |
| --- | --- | --- |
| Cloudflare Web Analytics (traffic lane, ADR 0010; replaces PostHog) | Manual beacon (`static.cloudflareinsights.com/beacon.min.js`, token `NEXT_PUBLIC_CF_BEACON_TOKEN`) injected only after `analytics_storage` consent; cookieless, no identification; page views, referrers, Core Web Vitals; no custom events | — |
| GTM | Container `GTM-WF967MKT` (reuse; audit contents — currently `UNKNOWN`) or new container | — |
| GA4 | Optional (Q-13) — only if Google Ads needs it; must not be added just for traffic counts (Cloudflare Web Analytics covers them) | Measurement Protocol optional |
| Google Ads | via GTM; conversions = lead + Zalo/call clicks | Enhanced Conversions for leads (hashed phone/email); offline conversion import using stored `gclid` when a lead becomes `won` |
| Meta (only if chosen in Q-13) | Pixel via GTM | Conversions API from Server Action / `/go` handler, `event_id` dedupe, `_fbc`/`_fbp`, hashed phone |
| TikTok (only if chosen in Q-13) | Pixel via GTM | Events API, `ttclid`, `event_id` dedupe |

### Consent (Personal Data Protection Law 91/2025/QH15 — in force 01/01/2026 — and Decree 13/2023 as applicable; Google Consent Mode v2)

- Default: `ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage` = `denied` until the user chooses; only strictly necessary cookies (the consent choice itself) are allowed before consent. `43l_attr` holds ad click IDs and is therefore **not** functional. Use Consent Mode **basic** (tags not loaded at all before consent), not advanced (cookieless pings).
- Banner (VI/EN) with Accept all / Reject / Customize; choice stored (cookie + Zustand), `gtag('consent','update',…)`, and the Cloudflare Web Analytics beacon mapped to `analytics_storage`.
- **Consent cookie contract (F-06 reads it; S-13 must write exactly this):** `43l_consent`.
  - **Value:** `v1.<ads 0|1>.<analytics 0|1>.<unix seconds>`.
  - **Attributes:** `Path=/`, host-only, `SameSite=Lax`, `Secure` in production, `Max-Age` 180 days, not HttpOnly.
  - **Invalid values:** a malformed value, another version, a timestamp before 2026-01-01 or in the future all count as **not granted**.
- Server-side conversions only when consent for ads is granted (stored on the lead/event row).
- Per-vendor permissions: the Customize panel maps `analytics` → Cloudflare Web Analytics and `ads` → GTM plus each confirmed ad platform (Q-13); no vendor loads under a category the user rejected.
- Withdrawal (banner reopenable from the footer): on revoking ads consent, delete `43l_attr`, stop loading GTM on the next navigation, and send no further server-side conversions (queued ones are dropped). On revoking analytics consent, stop injecting the Cloudflare beacon (it sets no cookies; reload into the denied state if it already ran). Rows already stored keep their recorded consent state.
- Lead form has an explicit consent checkbox linking `/chinh-sach-bao-mat/`; store `consent_at` and the policy version.

S-13 as built (43logistics.vn PRs #36, #37; owner decisions 2026-10-24), with the analytics lane swapped by S-13b (ADR 0010, 2026-10-30; PostHog, `posthog-js` and `/ingest` removed):
- **Banner** (`modules/tracking/ui/consent-banner.tsx`): VI/EN, Reject and Accept all as equal buttons, Customize (Phân tích → Cloudflare Web Analytics, Quảng cáo → GTM + ad platforms), privacy link; shown after hydration while no valid `43l_consent` exists; reopened by any `#cai-dat-cookie` link (footer "Cài đặt cookie"). State is a small `useSyncExternalStore` store (not Zustand: one island, ADR 0006 budget), kept in step across tabs (BroadcastChannel, focus/visibility re-read).
- **Vendors** (`application/vendors.ts`): GTM loads only after ads consent (`consent default` all denied, then `consent update`), from `NEXT_PUBLIC_GTM_ID`; the Cloudflare Web Analytics beacon (`static.cloudflareinsights.com/beacon.min.js`, `data-cf-beacon` `{token, spa: true}` built with `JSON.stringify`) is appended once, only after analytics consent and only with `NEXT_PUBLIC_CF_BEACON_TOKEN` (Q-32); Cloudflare's automatic injection must stay off.
- **Events:** every dataLayer push goes through `application/event-bus.ts` (dataLayer only; the beacon takes no custom events).
- **Withdrawal:** a changed ads choice sends a `HEAD` for the current page (no referrer) so `proxy.ts` sets or clears `43l_attr` before the banner closes; `proxy.ts` deletes `43l_attr` whenever the cookie no longer grants ads; a vendor that already loaded can't be unloaded, so `needsReload()` reloads the page into the denied state whenever its category turns off (GTM + ads, beacon + analytics): after a Save in this tab (once the attribution sync finished), on a change from another tab (BroadcastChannel, focus, visibility) and when the stored choice becomes invalid or expires.
- **Maps** stay auto-loading (owner decision 2026-10-24): the Google Maps iframes are not gated by the banner; the privacy policy discloses them.

### New GTM container setup (Q-13; the legacy `GTM-WF967MKT` is retired)

1. Create a Web container for `43logistics.vn`; set `NEXT_PUBLIC_GTM_ID` on the server. The site already sends Consent Mode v2 `default`/`update` and loads GTM only after ads consent, so keep the container's built-in consent checks on ("Require additional consent" for ad tags).
2. Data-layer variables to create: `event_id`, `route_key`, `placement`, `locale`, `weight_kg`, `chargeable_kg`, `estimate_vnd`, `estimate_amount`, `form`, `field`, `lead_id`, `currency`.
3. Custom-event triggers: `click_zalo`, `click_call`, `click_whatsapp`, `click_messenger` (contact conversions), `calculate_quote`, `form_start`, `form_error`, `generate_lead` (primary conversion; `event_id` = `lead_id` for de-duplication with the server-side APIs in T-01).
4. Add tags only for the ad platforms confirmed in Q-13 (e.g. Google Ads conversion on `generate_lead` and `click_zalo`; Meta/TikTok pixels only if chosen). No GA4 unless an ADR adds it (traffic lane is Cloudflare Web Analytics, ADR 0010).
5. Publish, then check in GTM Preview with consent accepted (S-13 acceptance).

## Ads landing page checklist

- [ ] Message match: H1, price and offer equal the ad text (variant via `/lp/{campaign}/` content or `?v=` mapped server-side — never reflect raw query text).
- [ ] One primary CTA (Zalo) + one secondary (call); no full navigation.
- [ ] Above the fold on 360×640: H1, from-price, days, CTA.
- [ ] Lab LCP recorded (field p75 < 2.5 s is the gate, ADR 0009); no carousel, no map iframe.
- [ ] `noindex, follow`; canonical to itself; UTM captured.
- [ ] Conversion events verified in GTM preview + platform test tools before launch.
