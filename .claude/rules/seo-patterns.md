---
paths:
  - "43logistics.vn/app/**/*.{ts,tsx}"
  - "43logistics.vn/modules/seo/**/*.{ts,tsx}"
  - "43logistics.vn/modules/content/**/*.{ts,tsx}"
---

# SEO patterns (43logistics.vn only)

We optimise **only 43logistics.vn**. Context: `docs/context/05-seo-and-tracking.md`, the proposal's §5, `AGENTS.md` rules 3–4 and 13.

## Every public page

- **Exactly one `<h1>`**, describing the page (e.g. "Gửi hàng đi Singapore"), never the logo.
- `generateMetadata` built with `modules/seo` `buildMetadata({ locale, path, title, description, alternates })`:
  - title ≤ 60 characters, description 120–160 characters, both hand-written per locale (DB fields);
  - `alternates.canonical` is the absolute self URL with a trailing slash;
  - `alternates.languages` lists `vi`, `en` and `x-default` only for translations that are **published**.
- JSON-LD from `modules/seo` builders (`<JsonLd data={...} />`), with data from the DB:
  - `Organization`/`LocalBusiness` (home/contact);
  - `Service` + `Offer` (route pages; prices via the eligibility rule only);
  - `BreadcrumbList`, `FAQPage`, `BlogPosting`.
- Breadcrumbs on every page except home; a visible Zalo CTA through `/go/[channel]`.
- Semantic headings in order (h1 → h2 → h3), descriptive link text (not "xem thêm"), `alt` from media (VI/EN).

## Rendering for crawlers

- Content is server-rendered HTML. Never render primary text or prices only on the client.
- Static generation where possible (`generateStaticParams` for published slugs per locale).
- Don't put the canonical URL or important links behind JS, consent or Suspense fallbacks.
- `next/image` with real dimensions (CLS); no text in images (rule 3). OG images come from `next/og` with DB data.

## URLs and redirects

- Slug rules: lowercase, no diacritics, keyword-first, trailing slash; VI at the root, EN under `/en/`.
- Every row of `data/redirect-map.csv` resolves in **one hop** (`check:redirects`). A slug change in admin creates a redirect row.
- `noindex` only for LPs (`/lp/*`), drafts and dev placeholders, and keep them out of `sitemap.ts`.
- `sitemap.ts` lists only published, indexable URLs with their alternates; `robots.ts` points to it.

## Content and links

- Original 43 Logistics copy only: no text copied from quynam.vn or any other site, and no cross-domain canonicals.
- Internal links come from the data model (route ↔ guides ↔ variants via `route_id`), not hand-typed URLs. Use `modules/routes` URL builders.
- Long-tail variant pages are published only past the quality gate (unique copy, own FAQ, confirmed goods/city coverage); otherwise they stay `noindex` drafts.
- Off-page work (Google Business Profile, citations, earned backlinks) is not code. Don't add link widgets, link exchanges or hidden links.
