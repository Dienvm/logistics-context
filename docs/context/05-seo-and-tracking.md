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

Open Graph images: `app/[locale]/(site)/[...]/opengraph-image.tsx` with `next/og` `ImageResponse` — flag + "Gửi hàng đi {Nước}" + "từ {min}đ/kg" + logo, 1200×630, brand colours. Note in Next 16 the `params` passed to metadata image routes is a Promise.

## Hreflang & canonical

- Self-referencing canonical on every indexable page, absolute, with trailing slash, no query string (UTM parameters must never become canonical).
- `hreflang` pairs only when both translations are `published`. `x-default` → Vietnamese URL.
- No automatic locale redirects (no `Accept-Language` / IP redirect); offer a dismissible "View in English?" banner instead.
- `/lp/*`, `/tra-cuu/*`, `/go/*`, `/admin/*`, `/api/*` are `noindex` or disallowed.

## `app/sitemap.ts` & `app/robots.ts`

- Sitemap generated from DB: published, indexable pages + posts, both locales, each entry with `alternates.languages`, `lastModified = updated_at`. Excludes `/lp/*`, tags/authors/dates (not recreated).
- Single `/sitemap.xml`; old `/sitemap_index.xml`, `/post-sitemap.xml`, `/page-sitemap.xml`, `/category-sitemap.xml`, `/post_tag-sitemap.xml`, `/sitemap.rss` 301 → `/sitemap.xml` (see redirect map).
- robots: allow `/`; disallow `/admin/`, `/api/`, `/go/`; `Sitemap: https://43logistics.vn/sitemap.xml`.
- RSS: `/kinh-nghiem/rss.xml`, `/en/guides/rss.xml` (route handlers).

## Structured data (JSON-LD) per page type

Emit with a `<JsonLd data={...} />` server component (`<script type="application/ld+json">`, escaped). Values come from `site_settings`, `routes`, `route_rates`, `faqs`, `posts` — never hard-coded.

| Page type | Schema |
| --- | --- |
| All pages | `WebSite` (name "43 Logistics", alternateName "43Logistics.vn", url, inLanguage) + `Organization` (logo SVG/PNG URL, `sameAs` Facebook, `contactPoint` { telephone "+84979222357", contactType "customer support", availableLanguage ["vi"] — add "en" only after Q-03 confirms English support }) |
| Home, Contact, About | `LocalBusiness` per office (Đà Nẵng, TP.HCM): name, address (`PostalAddress` with confirmed new admin names), `geo`, telephone, `openingHoursSpecification` from settings, `url`, `image` |
| Route pages | `Service` { serviceType "International parcel shipping", provider → Organization, areaServed → `Country` {name}, `offers`: `Offer` with `priceSpecification` `UnitPriceSpecification` { price, priceCurrency "VND", unitCode "KGM", referenceQuantity, eligibleQuantity (min/max kg) }, `validFrom`/`validThrough` from rates } + `BreadcrumbList` + `FAQPage` (Google shows FAQ rich results only for some authoritative sites; still valid markup) |
| Hubs | `ItemList` of route services + `BreadcrumbList` |
| Blog post | `BlogPosting` (headline, image, datePublished, dateModified, author `Organization`, inLanguage, mainEntityOfPage) + `BreadcrumbList` |
| Policy pages | `WebPage` + `BreadcrumbList` |

Do not output `AggregateRating`/`Review` unless reviews are real, collected on-site, and policy-compliant.

## Redirects & legacy URLs

- Source of truth: `data/redirect-map.csv` (`old_url,new_url_vi,new_url_en,status_code,notes`).
- Implementation v1: generate `redirects()` in `next.config.ts` from the CSV at build (≈50 rules, all **301** — use `statusCode: 301`, not `permanent: true`, which emits 308), plus `rewrites()` for `/wp-content/uploads/:path*` → Supabase Storage public URL (same path, 200).
- 410 rows (`/tieu-de/`, `/portfolio/*`, `/wp-admin/*`, `/wp-login.php`, `/xmlrpc.php`, `/wp-json/*`): handled in `proxy.ts` returning `new NextResponse(null, { status: 410 })`.
- Old query URLs `/?page_id={id}`, `/?p={id}` → map WP IDs (580, 705, 834, 836, 837, 838, 851, 866, 3596, 694, 3570, 3587) to new URLs in `proxy.ts`.
- `http://` and `www.` → `https://43logistics.vn` at the host/CDN level (one hop).
- Runtime additions later: `redirects` table read in `proxy.ts` (cached), managed in admin. Precedence: the CSV owns legacy WordPress URLs and is immutable after launch; the table owns new redirects (slug changes). The admin action rejects a `from_path` that exists in the CSV, and `check:redirects` fails on any overlap.
- `pnpm check:redirects` (a Node script using `fetch`/undici, not a test suite; ADR 0004) must pass in CI: every CSV row returns the expected status and `Location`, no chains.

## Performance rules (SEO-relevant)

- Route pages and home are fully static shells (Cache Components) with only the calculator and consent as client islands.
- LCP image: `next/image` with `priority`, correct `sizes`, AVIF/WebP, ≤ 150 KB at 1280 px wide.
- Fonts: 2 families, `display: swap`, subsets latin + vietnamese, preload via `next/font`.
- Third-party: GTM loaded with `@next/third-parties/google` `GoogleTagManager` only after the user grants ads consent (basic mode: no GTM request before that); PostHog initialised lazily only after analytics consent (no `posthog.init` at module load); no Maps iframe (static map image + link); no chat widget scripts.
- Budgets: JS ≤ 120 KB gz on route pages; CLS < 0.1 (reserve space for sticky bar and images).

## Tracking plan

### Identifiers captured (first-party cookie `43l_attr`, 90 days, set in `proxy.ts` on landing — **only when ads consent is already granted**; otherwise the identifiers are kept in the URL/session for the current visit and written after consent)

`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid`, `gbraid`, `wbraid`, `fbclid` (→ build `_fbc`), `ttclid`, `landing_path`, `referrer`, `first_seen_at`. Attached to every `leads` and `contact_events` row.

### Contact click tracker

`/go/[channel]?from={path}&route={key}` (route handler, `channel ∈ zalo | call | whatsapp | messenger`):
0. The client link generates a per-click UUID `event_id`, pushes the client event with it, and sends it as `?eid=` to the handler. The handler validates it (UUID) or generates a fallback; `contact_events.event_id` is unique, so a retried click is not double-counted.
1. **Redirect first:** the `302` must never wait on or fail because of tracking. Steps 2–3 run in `after()` with a short timeout; failures are logged, not retried inline.
2. Insert `contact_events` row (channel, route, path, attribution, consent state, hashed IP, user agent).
3. Fire server-side conversion (see below) only if ads consent was granted, with the same `event_id`.
4. `302` to `https://zalo.me/0979222357` / `tel:+84979222357` / `https://wa.me/84979222357?text=…` / `https://m.me/43logistics`.

The client link also emits the event with the same `event_id` (pass via data attribute) for pixel de-duplication. Events are defined once in `modules/tracking/constants.ts` and fanned out to `dataLayer` (GTM) and — after consent — PostHog.

### dataLayer events

| Event | When | Parameters |
| --- | --- | --- |
| `click_zalo` / `click_call` / `click_whatsapp` / `click_messenger` | Contact button click | `event_id`, `route_key`, `placement` (header, hero, sticky_bar, rate_table, footer…), `locale` |
| `calculate_quote` | Calculator returns a result | `route_key`, `weight_kg`, `chargeable_kg`, `estimate_vnd`, `locale` |
| `generate_lead` | Lead form success | `event_id`, `route_key`, `lead_id`, `locale`, `value` (estimate if any), `currency: 'VND'` |
| `form_start` / `form_error` | First field focus / validation error | `form: 'lead'`, `field` |
| `view_route` | Route page view | `route_key`, `direction` |
| `select_route` | Route chosen in picker/mega menu | `route_key`, `placement` |

### Platforms

| Platform | Client | Server-side |
| --- | --- | --- |
| PostHog (product lane, ADR 0002) | `posthog-js` after `analytics_storage` consent; requests via `/ingest` rewrite; `person_profiles: 'identified_only'` and never identify public visitors; autocapture off, capture the event names in this table explicitly; session replay off until Q-20 | `posthog-node` optional for server events (`generate_lead`) with the same `event_id` |
| GTM | Container `GTM-WF967MKT` (reuse; audit contents — currently `UNKNOWN`) or new container | — |
| GA4 | Optional (Q-13) — only if Google Ads needs it; must not duplicate PostHog funnels | Measurement Protocol optional |
| Google Ads | via GTM; conversions = lead + Zalo/call clicks | Enhanced Conversions for leads (hashed phone/email); offline conversion import using stored `gclid` when a lead becomes `won` |
| Meta (only if chosen in Q-13) | Pixel via GTM | Conversions API from Server Action / `/go` handler, `event_id` dedupe, `_fbc`/`_fbp`, hashed phone |
| TikTok (only if chosen in Q-13) | Pixel via GTM | Events API, `ttclid`, `event_id` dedupe |

### Consent (Personal Data Protection Law 91/2025/QH15 — in force 01/01/2026 — and Decree 13/2023 as applicable; Google Consent Mode v2)

- Default: `ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage` = `denied` until the user chooses; only strictly necessary cookies (the consent choice itself) are allowed before consent. `43l_attr` holds ad click IDs and is therefore **not** functional. Use Consent Mode **basic** (tags not loaded at all before consent), not advanced (cookieless pings).
- Banner (VI/EN) with Accept all / Reject / Customize; choice stored (cookie + Zustand), `gtag('consent','update',…)`, and PostHog `opt_in_capturing()` / `opt_out_capturing()` mapped to `analytics_storage`.
- Server-side conversions only when consent for ads is granted (stored on the lead/event row).
- Per-vendor permissions: the Customize panel maps `analytics` → PostHog and `ads` → GTM plus each confirmed ad platform (Q-13); no vendor loads under a category the user rejected.
- Withdrawal (banner reopenable from the footer): on revoking ads consent, delete `43l_attr`, stop loading GTM on the next navigation, and send no further server-side conversions (queued ones are dropped). On revoking analytics consent, call PostHog `opt_out_capturing()` and clear its cookies/storage. Rows already stored keep their recorded consent state.
- Lead form has an explicit consent checkbox linking `/chinh-sach-bao-mat/`; store `consent_at` and the policy version.

## Ads landing page checklist

- [ ] Message match: H1, price and offer equal the ad text (variant via `/lp/{campaign}/` content or `?v=` mapped server-side — never reflect raw query text).
- [ ] One primary CTA (Zalo) + one secondary (call); no full navigation.
- [ ] Above the fold on 360×640: H1, from-price, days, CTA.
- [ ] LCP < 2.5 s on 4G; no carousel, no map iframe.
- [ ] `noindex, follow`; canonical to itself; UTM captured.
- [ ] Conversion events verified in GTM preview + platform test tools before launch.
