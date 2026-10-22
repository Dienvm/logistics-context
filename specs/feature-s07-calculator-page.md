---
title: Build the shipping calculator page
type: feature
status: implemented
branch: feat/s07-calculator-page
implementation_pr: https://github.com/Dienvm/43logistics.vn/pull/21
implementation_commit: b76a21a44749af618886cc6e55c1501a2b03b0e6
implemented_date: 2026-10-22
owner_repo: both
roadmap: S-07
priority: must-have
blocked_by_questions: [Q-04, Q-25]
updated: 2026-10-22
---

## Feature: Build the shipping calculator page

### Problem Statement

The header ("Tính cước"), the mobile action bar and `03` all point at `/tinh-cuoc/` (`/en/shipping-calculator/`), but the page does not exist yet. Today a visitor can only estimate a price inside one route page's mini calculator (S-04).

Roadmap S-07 asks for a standalone calculator with:
- a Zustand store;
- "Gửi kết quả qua Zalo";
- the `calculate_quote` event.

*Accept:* it works without fetching (rates embedded at build), and form errors are accessible.

### Owner decisions (in session, 2026-10-22)

- **Zalo result: copy + open Zalo.** Zalo links cannot carry pre-filled text (`zalo.me` has no text parameter). One tap does two things:
  - it copies a plain-text summary of the result to the clipboard;
  - it opens Zalo through `/go/zalo/`.

  A visible status line then says the result was copied and can be pasted into the chat.
- **Entry points:**
  - the home hero route picker gains a "Tính cước" action to `/tinh-cuoc/?route=<key>`;
  - the route-page mini calculator gains a link to the full calculator that carries the route and the typed weight.

  The header item and the mobile bar link already exist.
- **"Nhận báo giá chính xác"** (lead form) stays hidden until S-08 builds the lead form; Zalo and call remain the CTAs.
- **Process:** phase 1, UI first. No Codex, Lighthouse or browser runs in the implementation PR.

### Proposed Solution

A visitor opens `/tinh-cuoc/` (or `/en/shipping-calculator/`) and sees, styled like S-05b:

1. **Hero:**
   - breadcrumb `Trang chủ › Tính cước`;
   - H1 "Tính cước gửi hàng đi nước ngoài" / "Shipping cost calculator";
   - a short intro.
2. **Calculator** (one client island):
   - **Inputs:**
     - route (select, grouped outbound / inbound, only quotable routes);
     - method (only when the route has more than one);
     - actual weight (kg);
     - optional L×W×H (cm).
   - **Output:** it updates as the visitor types, with no request, on the S-03 engine:
     - chargeable weight, plus the volumetric weight when it applies;
     - the band used;
     - the estimated price;
     - transit days, under the S-01 fact rule;
     - caveats (the estimate is not a final quote; VAT and surcharges are not included).

     "Liên hệ" reasons show the Zalo and call CTAs instead of a number.
   - **Actions:**
     - "Gửi kết quả qua Zalo" (copy + open Zalo, `placement=calculator`);
     - "Gọi {hotline}".
3. **Routes without public prices** are listed below as "Liên hệ" links to their route pages, so no country silently disappears.
4. **Closing band** with the offices (S-05b).

Each inbound route is listed only if it is quotable under the fact rule.

### Acceptance Criteria

- [ ] `/tinh-cuoc/` and `/en/shipping-calculator/` render with 200 once the `calculator` page is in `data/owner-confirmations.json` `pages` and `pnpm db:confirm` has run. A draft page is a 404.
- [ ] The rates the island needs are embedded in the server-rendered props. The calculator makes no network request to compute; interaction shows no fetch/XHR in DevTools. Only routes and bands that the route pages would show are embedded: verified or preview, public prices, inside their validity window. Nothing hidden reaches HTML or RSC.
- [ ] The S-03 engine produces the same result here as the route page's mini calculator for the same inputs. Spot-check three routes, including US 1.3 kg → 1.5 kg and one volumetric > actual case.
- [ ] `?route=<key>` (and the optional `&kg=<n>`) preselects the route and the weight. An unknown or non-quotable key falls back to the first quotable route with no error.
  - The home hero picker links there.
  - The route-page mini calculator links there with its route and current weight.
- [ ] Calculator inputs live in a Zustand store (`modules/pricing/ui/stores/`, no `persist`), as the roadmap row and AGENTS.md §3 require.
- [ ] **Form errors are accessible.** An invalid weight or dimension sets:
  - `aria-invalid` on the field;
  - an error text tied by `aria-describedby`;
  - an announcement through an `aria-live="polite"` region.

  Every input has a visible label, and every target is ≥ 44 px.
- [ ] "Gửi kết quả qua Zalo":
  - copies a VI/EN text built from messages: route, method, weight, chargeable weight, estimate and the page URL with the parameters;
  - then navigates to `/go/zalo/` with `placement=calculator` and the route key;
  - announces "Đã sao chép…" in the live region.

  If the clipboard is unavailable, it still opens Zalo and shows the text in a selectable box. The click is logged once (`click_zalo`, via `ContactLink` / `/go`).
- [ ] `calculate_quote` is pushed to `window.dataLayer` once per settled result, debounced (500 ms after the last change, and not again for identical inputs). Its parameters are `route_key`, `weight_kg`, `chargeable_kg`, `estimate_vnd` and `locale` (`05`). The push is defined once in `modules/tracking`, and there is no network request (GTM reads the event only after S-13).
- [ ] `generateMetadata`:
  - title and description: DB SEO fields, else the `05` pattern ("Tính cước gửi hàng đi nước ngoài" / "Shipping Cost Calculator");
  - canonical self;
  - hreflang only when both locales are published.

  The page has one `<h1>`, breadcrumbs with `BreadcrumbList` JSON-LD, and a visible Zalo CTA.
- [ ] `/tinh-cuoc/` (VI) is added to `data/perf-budget.json`. CI's JS budget passes (≤ 50 KiB app JS over the baseline), and no `sonner`/toast is mounted on the page.
- [ ] Every new string is in VI and EN, and `pnpm i18n:check` passes. `lint`, `typecheck`, `check:boundaries` and `build` pass, and CI `verify` (with `check:redirects`) passes.

### Scope

**In scope:**
- the calculator page on the existing `[slug]` dispatch (page key `calculator`);
- the server loader that embeds quotable routes and bands;
- the full calculator island and its Zustand store;
- copy + open Zalo;
- `calculate_quote`;
- the hero picker and mini-calculator links;
- metadata, JSON-LD and breadcrumbs;
- `owner-confirmations` `pages` += `calculator`;
- perf-budget row;
- messages.

**Out of scope:**
- the lead form and "Nhận báo giá chính xác" (S-08);
- a goods-type input (no approved per-type pricing data);
- surcharges, VAT and minimum charges (Q-04, Q-25);
- live rates or TanStack Query;
- `persist` of calculator inputs;
- PostHog/GTM loading (S-13);
- an OG image.

### Affected Areas

| Repo | Layer | File / Path (likely) |
|------|-------|----------------------|
| app | page | `app/[locale]/(site)/[slug]/page.tsx` (dispatch + static params incl. the calculator slug), `app/[locale]/(site)/[slug]/calculator-view.tsx` (new) |
| app | module pricing | `application/load-calculator.ts` (quotable routes + bands, fact rule), `ui/calculator/*` (page island, inputs, output, Zalo share), `ui/stores/calculator-store.ts`, `ui/mini-calculator.tsx` (link to the full page), reuse `ui/quote-output.tsx`, `index.ts` / `client.ts` |
| app | module content | `constants.ts` (`CALCULATOR_PAGE_KEY`), `ui/home/route-picker.tsx` (calculator action), page record loader (reuse the hub pattern) |
| app | module tracking | `application/data-layer.ts` + `constants.ts` (`calculate_quote` push), `client.ts` |
| app | module seo | `application/calculator-metadata.ts`, breadcrumb JSON-LD reuse |
| app | deps | `zustand` (package.json, lockfile) |
| app | data / messages | `data/owner-confirmations.json` (`pages`), `data/perf-budget.json`, `messages/{vi,en}.json` (`calculatorPage.*`) |
| context | doc | `docs/context/03-information-architecture.md` (calculator as built), `AGENTS.md` §3 Client state row (Zustand installed) |

### Golden-rule checks

- **1–2:** prices, bands and transit come only from `route_rates`/`routes` through the S-01 fact rule; the copy has no numbers.
- **4:** one H1, metadata, `BreadcrumbList`, Zalo CTA.
- **8:** one island; budget row added; no toast library on the page.
- **10:** accessible errors, labels, 44 px targets.
- **12:** the Zalo action goes through `/go/zalo/`, and its click is logged once.
- **14:** `calculate_quote` is an in-page `dataLayer` push only; no network request before consent.

### Dependencies & Risks

- **Depends on:**
  - S-03 (engine);
  - S-04 (mini calculator, `quote-output`, route pricing loader);
  - S-05b (hero picker);
  - S-06 (`[slug]` page-key dispatch);
  - S-02 (`/go`, `ContactLink`).
- **Stack gap:** Zustand isn't installed. This task adds it (AGENTS.md §3 "Client state", closed by S-07).
- **Blocked by questions:** Q-04 / Q-25. Surcharges and VAT are unknown, so the output carries the caveat and no extra charges; unverified routes stay "Liên hệ".
- **Risk: JS budget.** Routes sit at +46.9 KiB, with a shared chunk. This page has its own island; measure it in CI. If it is over budget, drop Zustand to a `useReducer` only with an owner OK (roadmap text).
- **Risk: `?route=` and static rendering.** Read the parameters inside the island (client-side after hydration), so the page shell stays static.

### Manual Verification Plan

Deferred to the verification step (owner, phase 1). It will cover:
- both URLs at 360/1280;
- a route switch and a volumetric case;
- the three spot-checks against the route page;
- `?route=us&kg=1.3` → 1.5 kg;
- copy + open Zalo (clipboard and fallback);
- one `calculate_quote` in `dataLayer` per settled input;
- no fetch on input;
- an unverified route shown as "Liên hệ";
- axe;
- keyboard;
- Lighthouse.

**Now:** `lint`, `typecheck`, `check:boundaries`, `i18n:check`, `db:confirm` locally, and `build`. CI runs `check:redirects` and `perf:report`.

### Implementation Hints

- **Reuse:**
  - `MiniCalculator`'s engine call and `QuoteOutput`;
  - `ContactLink` (mints `event_id`, pushes `click_zalo`).

  Copy to the clipboard in its click handler before navigation (`navigator.clipboard.writeText`, then let the link proceed).
- **Page record:** follow `load-hub-page.ts` / `hub-view.tsx` (DB `h1`, else messages).
- **Fact rule:** follow `route-pricing.ts`, so the calculator embeds exactly what the route pages show.
- **Size limits:** ≤ 150 lines per component; split inputs, output and share into separate files.
- **Edits:** scripted edits after Biome must assert that the old string exists (lesson in memory).

### Related

- Roadmap S-07; `03` "Calculator `/tinh-cuoc/`"; `05` `calculate_quote`, `/go` placements, metadata patterns; `06` client state.
- Specs: `feature-s03-price-engine.md`, `feature-s04-route-page-template.md`, `feature-s06-hubs.md`.
