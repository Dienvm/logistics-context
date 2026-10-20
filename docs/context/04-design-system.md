# 04 — Design system

> Machine-readable tokens: `data/design-tokens.json` (W3C DTCG format; set `current` = extracted from the old site, set `proposed` = the new system). Import into Figma with Tokens Studio. Build to CSS with `pnpm tokens` (Style Dictionary or a small script) → `app/theme.css`.

## Chosen direction: "Crimson Express" (+ warmth from "Warm Trust")

- **Mood:** bold, fast, shipping-label/ticket feel; warm sand surfaces and real photos so it never feels cold.
- **Signature details kept from the old brand:** crimson `#AC0C2E`, condensed bold display type, hard offset shadow under cards, 20px card radius.
- **Layout:** bento grid of routes (flag, from-price, days); cards with 2px border + `shadow-brand-offset`; generous white space; sections alternate `bg` / `bg-subtle` (sand-50).
- **Typography:** Barlow Condensed 700–800 for hero/price/display only; Be Vietnam Pro for everything else. Display may be uppercase; buttons/menus are sentence case.
- **Motion:** quick and tactile (160–240 ms). Cards "press down" on hover (translateY 2px; the offset shadow is a pseudo-element whose `transform`/`opacity` changes — never animate `box-shadow` itself). A "stamp" micro-animation when the calculator returns a price. Route-name marquee only if it stops on hover and is disabled under reduced motion. View Transitions between route pages are out of scope until the API is stable in the installed Next/React versions (verify, then ADR).

Rejected alternatives (for the record): **Warm Trust** (cream-first, soft, photo-led — weaker in ad feeds), **Global Clean** (dark navy hero, animated flight paths — feels distant for family senders).

## Colour

Scales (proposed):

| Scale | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| crimson (brand) | #FAF0F2 | #F5E2E6 | #E9C0C9 | #DA92A1 | #C75A71 | #B62947 | **#AC0C2E** | #910B28 | #750A21 | #58091A | #3F0814 |
| ink (navy text) | #F3F4F5 | #E7E9EB | #CACFD2 | #9FA7AD | #737F89 | #4D5C68 | #2B3D4B | #15364E | #182C3B | **#0E2333** | #08151F |
| sand (warm neutral) | #FBF7F3 | #F5EEE7 | #EAE0D6 | #D6CABE | #B3A79B | #8C8177 | #6B625A | #4E4741 | #332E2A | #1E1A17 | — (sand-0 = #FFFFFF) |

Status: success `#1F7A4D` · warning `#9A5B00` · error `#B42318` · info `#1D5FA8` (all ≥ 5.3:1 on white).
Channels: Zalo `#0068FF` (white text 4.75:1) · WhatsApp `#25D366` (icon background only; text on it must be ink-900) · WhatsApp text `#0B6B3A` · Messenger `#0084FF` (white text only 3.66:1 → icon or ≥ 24px bold text).

Approved text/background pairs (WCAG AA):

| Foreground | Background | Ratio |
| --- | --- | --- |
| ink-900 | white / sand-50 | 16.07 / 15.07 |
| ink-500 (secondary) | white | 6.89 |
| sand-600 (muted) | white / sand-50 | 5.97 / 5.60 |
| crimson-600 | white / sand-50 | 7.38 / 6.92 |
| crimson-700 (links) | white | 9.20 |
| white | crimson-600 (primary button) | 7.38 |
| white | ink-900 | 16.07 |

Forbidden: crimson-300/400 for text, any hex not in the tokens, the old CTA reds (#FE0000, #F70000, #FF0202 — fail AA), the old kit pink #D81F47.

## Typography

- Fonts via `next/font/google`: `Be_Vietnam_Pro({ subsets: ['latin','vietnamese'], weight: ['400','500','600','700'], display: 'swap', variable: '--font-sans' })` and `Barlow_Condensed({ subsets: ['latin','vietnamese'], weight: ['700','800'], display: 'swap', variable: '--font-display' })`.
- Fluid scale (360 → 1440 px viewport): xs 12 · sm 14 · base 16 · lg 18 · xl 20→24 · 2xl 24→32 · 3xl 30→44 · 4xl 36→60 · 5xl 44→80.

| Style | Font | Size | Weight | Line-height | Use |
| --- | --- | --- | --- | --- | --- |
| display-xl | Barlow Condensed | 5xl | 800 | 0.95, tracking −0.01em, uppercase | Hero H1 |
| display-l | Barlow Condensed | 4xl | 800 | 1.0 | Section hero |
| heading-1 | Barlow Condensed | 3xl | 700 | 1.1 | Page H1 (non-hero) |
| heading-2 | Be Vietnam Pro | 2xl | 700 | 1.25 | Section H2 |
| heading-3 | Be Vietnam Pro | xl | 600 | 1.35 | Card/sub-section |
| body-l | Be Vietnam Pro | lg | 400 | 1.65 | Lead paragraph |
| body | Be Vietnam Pro | base | 400 | 1.65 | Body |
| body-s | Be Vietnam Pro | sm | 400 | 1.55 | Captions, notes |
| label | Be Vietnam Pro | sm | 600 | 1.3 | Form labels, badges |
| button | Be Vietnam Pro | base | 600 | 1.2 | Buttons (sentence case) |
| price | Barlow Condensed | 3xl | 700 | 1.0, `tnum` | Prices |

## Space, layout, shape

- Spacing (4 px base): 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128.
- Container 1280 px; prose 720 px; gutters 16 px mobile / 32 px desktop. Grid 4 / 8 / 12 columns, gap 24 px.
- Section vertical padding: sm 48 · md 80 · lg 128.
- Breakpoints: sm 640 · md 768 · lg 1024 · xl 1280. Design mobile-first at 360 px.
- Radius: sm 8 (inputs) · md 12 · **lg 20 (cards)** · xl 28 · pill (badges, small buttons).
- Border: 1 px default, 2 px strong (cards), 3 px focus ring (ink-900, 2 px offset).
- Shadows: `brand-offset` 0 4 0 0 crimson-600 · `ink-offset` 0 4 0 0 ink-900 · sm / md / lg soft ink shadows for overlays only.
- Z-index: sticky 100 · floating contact bar 200 · overlay 300 · modal 400 · toast 500.

## Motion

| Token | Value | Use |
| --- | --- | --- |
| instant | 100 ms | Opacity on press (colour changes are instant, not animated) |
| fast | 160 ms | Hover, press, toggles |
| base | 240 ms | Accordion, menu, popover |
| slow | 400 ms | Reveal on scroll |
| slower | 640 ms | Hero entrance (never the LCP element) |
| standard | cubic-bezier(0.2, 0, 0, 1) | Default |
| emphasized | cubic-bezier(0.3, 0, 0, 1) | Entrances |
| exit | cubic-bezier(0.4, 0, 1, 1) | Exits |
| overshoot | cubic-bezier(0.34, 1.56, 0.64, 1) | Stamp/badge micro-interactions only |

Rules: animate `transform` and `opacity` only; scroll reveals with CSS (`@starting-style`, `animation-timeline: view()` with fallbacks) or a tiny IntersectionObserver hook. **`motion` (Framer Motion, `motion/react`)** is allowed only inside client islands that need orchestrated or gesture animation (calculator "stamp", mobile drawer, admin), loaded with `LazyMotion` + `m` components (`domAnimation` features) — never in Server Components, never on the LCP element, and only on a public page when the island's JS still fits the 120 KB budget (ADR 0002). Respect `prefers-reduced-motion` (global CSS below + `useReducedMotion` for JS animations).

## Components (build in `components/ui` (shadcn/ui primitives, token-styled) and `components/blocks`)

Primitives come from **shadcn/ui** (Radix under the hood) and are restyled only through token CSS variables — keep their ARIA/keyboard behaviour, delete generated components no task uses. V0 drafts are mapped to these tokens before merge.

Every interactive component documents: default · hover · focus-visible · pressed · disabled · loading · error (where relevant), in VI and EN.

| Component | Variants / notes |
| --- | --- |
| Button | primary (crimson), secondary (ink), ghost, link; channel buttons Zalo / Call / WhatsApp / Messenger (icon + label, go through `/go/[channel]`); sizes sm/md/lg; full-width on mobile |
| Badge | "Đồng giá", "Nhanh", "Mới", "Ưu đãi"; pill radius |
| Header | desktop with mega menu (route cards from DB), language switch, Zalo CTA; mobile with drawer |
| MobileActionBar | sticky bottom: Zalo · Gọi · Tính cước; hides on scroll down, shows on scroll up; safe-area aware |
| RouteCard | flag, country, from-price, days, badge; press-down hover |
| RouteBento | responsive grid of RouteCards (featured card spans 2) |
| RateTable | weight bands → price; table ≥ md, stacked cards < md; "Cập nhật {date}"; notes (VAT, insurance) |
| QuoteCalculator | route select, weight, L×W×H, goods type; result card (chargeable weight, band, estimate, days); empty / invalid / result states; actions "Gửi qua Zalo", "Nhận báo giá" |
| LeadForm | fields: route, weight, size, goods type, name, phone/Zalo, email (optional), message, consent checkbox; inline validation; success + error states; Turnstile |
| ProcessSteps | 3–5 numbered steps, horizontal ≥ lg, vertical < lg |
| GoodsList | allowed / restricted / prohibited groups with icons; filter by country |
| FAQAccordion | single-open; emits FAQPage JSON-LD via parent |
| TestimonialCard | photo, name, location, route, rating (real only), quote, source |
| ProofGallery | blurred chat screenshots, lightbox |
| CtaBand | headline + Zalo + call; variants crimson / sand |
| TrustStrip | carriers/partners logos (only confirmed), years of experience (only real) |
| Breadcrumbs | + BreadcrumbList JSON-LD |
| TableOfContents | sticky on desktop for blog/policies |
| BlogCard, ArticleLayout | cover, title, excerpt, date, route tag |
| Footer | company + legal, services, policies, contact, social |
| ConsentBanner | Consent Mode v2 categories; remembers choice (Zustand + cookie) |
| Toast | success/error after actions |
| Admin primitives | DataTable (TanStack Table + React Query), FormField, Select, DatePicker, ImageUploader (Supabase Storage, requires alt VI/EN) |

Icons: one SVG line set (Lucide), 1.5–2 px stroke, coloured via `currentColor`. Flags: SVG flag set (e.g. `country-flag-icons`), never emoji. Replace the old multi-colour PNG icons.

Imagery: real photos first (office, warehouse, packing, team). Customer screenshots only with consent and personal data blurred. No stock photos of foreign trucks/ports pretending to be ours. Never text inside images.

## Tailwind v4 theme (`app/theme.css`, generated)

```css
@import "tailwindcss";

@theme {
  /* generated from data/design-tokens.json (proposed) — do not edit by hand; run `pnpm tokens` */
  --color-crimson-50: #FAF0F2;
  --color-crimson-100: #F5E2E6;
  --color-crimson-200: #E9C0C9;
  --color-crimson-300: #DA92A1;
  --color-crimson-400: #C75A71;
  --color-crimson-500: #B62947;
  --color-crimson-600: #AC0C2E;
  --color-crimson-700: #910B28;
  --color-crimson-800: #750A21;
  --color-crimson-900: #58091A;
  --color-crimson-950: #3F0814;
  --color-ink-50: #F3F4F5;
  --color-ink-100: #E7E9EB;
  --color-ink-200: #CACFD2;
  --color-ink-300: #9FA7AD;
  --color-ink-400: #737F89;
  --color-ink-500: #4D5C68;
  --color-ink-600: #2B3D4B;
  --color-ink-700: #15364E;
  --color-ink-800: #182C3B;
  --color-ink-900: #0E2333;
  --color-ink-950: #08151F;
  --color-sand-0: #FFFFFF;
  --color-sand-50: #FBF7F3;
  --color-sand-100: #F5EEE7;
  --color-sand-200: #EAE0D6;
  --color-sand-300: #D6CABE;
  --color-sand-400: #B3A79B;
  --color-sand-500: #8C8177;
  --color-sand-600: #6B625A;
  --color-sand-700: #4E4741;
  --color-sand-800: #332E2A;
  --color-sand-900: #1E1A17;
  --color-success: #1F7A4D;
  --color-warning: #9A5B00;
  --color-error: #B42318;
  --color-info: #1D5FA8;
  --color-zalo: #0068FF;
  --color-whatsapp: #25D366;
  --color-whatsapp-text: #0B6B3A;
  --color-messenger: #0084FF;
  --font-display: "Barlow Condensed", "Be Vietnam Pro", system-ui, sans-serif;
  --font-sans: "Be Vietnam Pro", system-ui, -apple-system, "Segoe UI", sans-serif;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: clamp(1.25rem, 1.1667rem + 0.3704vw, 1.5rem);
  --text-2xl: clamp(1.5rem, 1.3333rem + 0.7407vw, 2rem);
  --text-3xl: clamp(1.875rem, 1.5833rem + 1.2963vw, 2.75rem);
  --text-4xl: clamp(2.25rem, 1.7500rem + 2.2222vw, 3.75rem);
  --text-5xl: clamp(2.75rem, 2.0000rem + 3.3333vw, 5rem);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --radius-pill: 9999px;
  --shadow-brand-offset: 0 4px 0 0 var(--color-crimson-600);
  --shadow-ink-offset: 0 4px 0 0 var(--color-ink-900);
  --shadow-sm: 0 1px 2px 0 rgb(14 35 51 / 0.08);
  --shadow-md: 0 8px 24px -6px rgb(14 35 51 / 0.14);
  --shadow-lg: 0 24px 48px -12px rgb(14 35 51 / 0.20);
  --duration-instant: 100ms;
  --duration-fast: 160ms;
  --duration-base: 240ms;
  --duration-slow: 400ms;
  --duration-slower: 640ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-emphasized: cubic-bezier(0.3, 0, 0, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --ease-overshoot: cubic-bezier(0.34, 1.56, 0.64, 1);
  --breakpoint-sm: 40rem; --breakpoint-md: 48rem; --breakpoint-lg: 64rem; --breakpoint-xl: 80rem;
  --container-page: 80rem; /* 1280px */
  --container-prose: 45rem; /* 720px */
}

/* semantic aliases */
:root {
  --bg: var(--color-sand-0); --bg-subtle: var(--color-sand-50); --bg-muted: var(--color-sand-100); --bg-inverse: var(--color-ink-900);
  --fg: var(--color-ink-900); --fg-secondary: var(--color-ink-500); --fg-muted: var(--color-sand-600); --fg-inverse: var(--color-sand-0);
  --brand: var(--color-crimson-600); --brand-hover: var(--color-crimson-700); --brand-pressed: var(--color-crimson-800); --brand-subtle: var(--color-crimson-50);
  --link: var(--color-crimson-700); --link-hover: var(--color-crimson-900);
  --border: var(--color-sand-200); --border-strong: var(--color-ink-300); --focus-ring: var(--color-ink-900);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
}
```

## Legacy design reference (set `current` in tokens)

Old kit: primary #D81F47, secondary #54595F, text #7A7A7A, accent #0E2333, white, grey #F2F2F2, secondary navy #15364E; headings Barlow Condensed 800 uppercase (H1 34px, H2 30px, H3 34px with broken line-height 0.5), body Arial 16/1.8, buttons Inter 14/500 uppercase pill. Actually used brand colour #AC0C2E; top bar #AD3030; container 1140–1200px; breakpoints 768/1025; animations fadeInUp + hover grow/shrink.
