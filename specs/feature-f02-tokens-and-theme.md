---
title: Generate the token theme and move to Tailwind v4
type: feature
status: in_implementation
branch: feat/f-02-tokens-and-theme
implementation_pr: https://github.com/Dienvm/43logistics.vn/pull/3
owner_repo: both
roadmap: F-02
priority: must-have
blocked_by_questions: []
updated: 2026-10-21
---

## Feature: Generate the token theme and move to Tailwind v4

### Problem Statement

Roadmap **F-02** (`docs/context/10-roadmap.md`, Phase 0). After F-01 the app is on Next 16, but styling still uses the template's setup:

- Tailwind 3.4 with `tailwind.config.ts` and `tailwindcss-animate`;
- shadcn's neutral HSL variables in `app/globals.css`;
- Inter as the only font;
- about 48 default-style shadcn components in `shared/ui`, none of them used.

The design system (`docs/context/04-design-system.md`, "Crimson Express") and its machine-readable tokens (`43logistics.vn/data/design-tokens.json`, set `proposed`) exist only as documentation. Every UI task from S-01 on needs:

- a generated `@theme` (rule 10: token colours only);
- the two brand fonts with the Vietnamese subset (rule 11);
- a reduced-motion base (rule 9);
- a small, token-styled primitive set.

### Proposed Solution

After this change:

- `pnpm tokens` turns the `proposed` token set into `app/theme.css`, a Tailwind v4 `@theme`. Running it twice gives byte-identical output, and `pnpm tokens:check` proves the committed file is current.
- The app is on Tailwind v4, with `tw-animate-css` and the typography plugin.
- Be Vietnam Pro (body) and Barlow Condensed (display) load through `next/font` with the `latin` + `vietnamese` subsets.
- shadcn/ui is re-initialised for v4 with only the 16 primitives S-01…S-09 need. Every one of them is styled through the token-mapped semantic variables, and no hex value appears outside `app/theme.css`.
- A development-only `/dev/tokens/` page shows the colours, type scale, radii, shadows and motion tokens, and returns 404 in production.
- The visitor still sees the same `noindex` placeholder, now in the brand fonts and colours.
- `motion` (Framer Motion) is **not** installed. Owner decision 2026-10-21: add it when the first island needs it, with a JS-budget measurement (ADR 0006). F-02 provides CSS motion only.

### Acceptance Criteria

**Tailwind v4**

- [ ] Given `package.json`, then `tailwindcss` and `@tailwindcss/postcss` are on 4.x (current), `tw-animate-css` replaces `tailwindcss-animate`, and `@tailwindcss/typography` is on current 0.5.x.
- [ ] Given the config, then:
  - `tailwind.config.ts` is deleted;
  - `postcss.config.mjs` uses `@tailwindcss/postcss`;
  - `app/globals.css` starts with `@import "tailwindcss";`, `@import "tw-animate-css";`, `@import "./theme.css";` and `@plugin "@tailwindcss/typography";`;
  - no `@tailwind` directives remain;
  - Biome's `noUnknownAtRules` ignore for `tailwind` is removed, and Biome passes with `css.parser.tailwindDirectives`.

**Token pipeline**

- [ ] Given `scripts/build-tokens.ts` (run with `tsx`, added as a dev dependency), when `pnpm tokens` runs, then it reads `data/design-tokens.json` set **`proposed`** and writes `app/theme.css` with:
  - a header comment ("generated from data/design-tokens.json (proposed) — do not edit; run `pnpm tokens`"), no timestamp;
  - one **`@theme static { … }`** block with every family in the mapping table. `static` makes Tailwind emit every variable even when no utility uses it, which the dev gallery relies on;
  - the `:root` semantic aliases (`--bg`, `--fg`, `--brand`, `--link`, `--border`, `--focus-ring` …);
  - the `@media (prefers-reduced-motion: reduce)` block.

  Font families resolve through the `next/font` CSS variables first (e.g. `--font-sans: var(--font-be-vietnam-pro), "Be Vietnam Pro", system-ui, …`).
- [ ] Given the generator's **mapping contract**, then `app/theme.css` follows this table. JSON is authoritative for values, and `04`'s `@theme` sample is updated to match.

  | JSON path (`proposed.…`) | CSS name | Serialisation |
  | --- | --- | --- |
  | `color.{crimson,ink,sand}.<step>` | `--color-<scale>-<step>` | hex as-is |
  | `color.status.<name>` | `--color-<name>` (`success`, `warning`, `error`, `info`; no `status-` prefix) | hex |
  | `color.channel.<name>` | `--color-<name>` (`zalo`, `whatsapp`, `whatsapp-text`, `messenger`) | hex |
  | `color.semantic.<name>` | `:root` `--<name>` (`bg`, `fg`, `brand`, `link`, `border`, `focus-ring`…) | `var(--color-…)` from `{color.x.y}` references |
  | `font.<family>` | `--font-<family>` | `var(--font-<next-font-var>)`, then the JSON family list |
  | `typography.<style>` | `--text-<size>` (fluid `clamp()` as in `04`) | font-size; line-height via `--text-<size>--line-height` where JSON gives it |
  | `radius.<name>` | `--radius-<name>` | px as-is (`pill` = **999px**, the JSON value) |
  | `shadow.<name>` (DTCG object) | `--shadow-<name>` | `x y blur spread color`, colour resolved to `var(--color-…)` |
  | `motion.duration.<name>` | `--duration-<name>`, plus whatever Tailwind v4.3 namespace the `duration-<name>` utility reads (see the motion AC) | ms |
  | `motion.easing.<name>` (`[a,b,c,d]`) | `--ease-<name>` | `cubic-bezier(a, b, c, d)` |
  | `layout.*` | `--breakpoint-*`, `--container-*` | as in JSON |
  | `space.*`, `border-width.*`, `z-index.*` | Tailwind spacing base only if it differs from 0.25rem; `--border-width-*`; `--z-<name>` + custom utilities `z-sticky` … `z-toast` | as in JSON |
  | `motion.reduced-motion` | the `@media (prefers-reduced-motion: reduce)` block | — |

  The script lists any family it doesn't emit, with a reason (none expected).

  Expected-output spot checks, present verbatim:
  - `--color-crimson-600: #AC0C2E`
  - `--color-zalo: #0068FF`
  - `--radius-pill: 999px`
  - `--shadow-brand-offset: 0 4px 0 0 var(--color-crimson-600)`
  - `--ease-standard: cubic-bezier(0.2, 0, 0, 1)`
- [ ] Given `pnpm tokens` run twice, then `git diff --exit-code app/theme.css` is clean. Given `pnpm tokens:check`, then it regenerates into memory and exits non-zero if the committed `app/theme.css` differs (F-08 adds it to CI). Editing one token value without running `pnpm tokens` makes `tokens:check` fail.
- [ ] Given `app/theme.css` is generated, then it is excluded from Biome formatting (`files.includes`), with a comment, so `lint` never rewrites generated output.

**Fonts and base styles**

- [ ] Given `app/layout.tsx`, then Inter is replaced by:
  - `Be_Vietnam_Pro` (400, 500, 600, 700) with `variable: "--font-be-vietnam-pro"`;
  - `Barlow_Condensed` (700, 800) with `variable: "--font-barlow-condensed"`;
  - both with `subsets: ["latin", "vietnamese"]` and `display: "swap"`, and both variables on `<html>`.
- [ ] Given `app/globals.css` base styles, then:
  - `body` uses `--font-sans`, colour `--fg` and background `--bg`, with `line-height` ≥ 1.6 (rule 11);
  - focus-visible uses a 3 px `--focus-ring` outline with a 2 px offset (`04` "Border");
  - no `uppercase` is applied to buttons or menus.
- [ ] Given the F-00/F-01 placeholder (`app/page.tsx`), then its `<h1>` uses the display font and the page uses token classes only. Its text and `noindex` are unchanged.

**shadcn/ui**

- [ ] Given `components.json`, then it is re-initialised for Tailwind v4, with the **shadcn CLI version pinned and named in the PR** (e.g. `shadcn@4.22.1`), the **Radix** base, the style recorded, `tailwind.config` empty, `css: "app/globals.css"`, `cssVariables: true`, and the ADR 0005 aliases (`@/shared/ui`, `@/shared/lib/utils`, `@/shared/hooks`, `@/shared/lib`).
- [ ] Given `shared/ui/`, then it contains exactly these 16 primitives, generated by the current shadcn CLI for v4:
  - button, input, label, textarea, checkbox, select;
  - accordion, dialog, sheet, tabs, table, breadcrumb;
  - navigation-menu, separator, skeleton, sonner (Toast).

  All other components are deleted, along with the hooks only they used (`shared/hooks/use-toast.ts`, `use-mobile.tsx`). `use-copy-to-clipboard.tsx` is deleted if nothing imports it.
- [ ] Given the shadcn semantic variables (`--background`, `--foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--muted`, `--muted-foreground`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`, …), then they are defined in `app/globals.css` **only as references to token variables**, from the approved pairs in `04` "Colour":
  - primary → crimson-600 with white text;
  - foreground → ink-900;
  - muted text → sand-600;
  - border → sand-200;
  - **input borders → ink-400**, so the input boundary meets 3:1 non-text contrast (WCAG 1.4.11);
  - ring → ink-900;
  - destructive → error;
  - `--radius` → `--radius-md`.

  `grep -rnE "#[0-9a-fA-F]{3,8}\b|hsl\(|oklch\(" app shared --include=*.css --include=*.tsx` finds nothing outside `app/theme.css`. The same grep also covers `rgb(`.
- [ ] Given `app/globals.css`, then an **`@theme inline` bridge** maps every shadcn semantic variable the 16 primitives use to a Tailwind colour (`--color-background: var(--background)`, `--color-primary: var(--primary)`, …). That makes `bg-primary`, `text-muted-foreground`, `border-input`, `ring-ring` etc. generate CSS. Any stylesheet the pinned CLI requires (e.g. `shadcn/tailwind.css` with its custom variants/utilities) is kept or vendored, and the PR says which.
- [ ] Given the radius scale, then:
  - the CLI's derived radius declarations (`--radius-sm: calc(var(--radius) - …)` etc.) are **deleted**, so the generated tokens are the only radius source;
  - `--radius` is a literal equal to `--radius-md`'s value (12px), not a self-referencing `var()`;
  - computed `border-radius` for `rounded-sm` / `md` / `lg` / `xl` / `pill` is 8 / 12 / 20 / 28 / 999 px.
- [ ] Given Tailwind's default palette, then no class in `app/` or `shared/` uses it.
  - `grep -rnoE "\b(bg|text|border|ring|fill|stroke|outline|from|to|via|shadow|decoration|accent|caret)-(black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(-[0-9]{2,3})?\b" app shared` → no matches.
  - No arbitrary colour values (`[#…]`, `[rgb(…)]`).
  - Computed styles for the default, hover, focus-visible, `aria-invalid` and open-overlay states of button, input, select, tabs, dialog and sheet all resolve to token colours (the PR records the measured values).
- [ ] Given `tailwind-merge`, then it is on **3.x** (Tailwind v4 support), and `cn("px-2 rounded-md", "px-4 rounded-lg")` returns `px-4 rounded-lg` (recorded in the PR).
- [ ] Given dependencies, then every package only the deleted components used is removed: e.g. `cmdk`, `vaul`, `embla-carousel-react`, `recharts`, `input-otp`, `react-day-picker`, `date-fns`, `react-resizable-panels`, `react-hook-form`, unused `@radix-ui/*`, `tailwindcss-animate`, and `tailwind-merge`/`clsx` only if no longer imported. `pnpm peers check` reports no unmet peers.

**Motion (rule 9)**

- [ ] Given the 16 primitives, then every animation or transition changes only `transform` and/or `opacity`:
  - accordion and navigation-menu **don't animate `height`/`width`**: they open instantly with an opacity/translate fade;
  - `transition-all` and colour transitions are replaced by `transition-[opacity,transform]`. Colour changes are instant, per `04`.

  `grep -rnE "transition-all|animate-accordion|height|transition-colors|transition-\[color" shared/ui` → only justified non-animated uses, listed in the PR.
- [ ] Given the duration and easing tokens, then a utility such as `duration-fast` / `ease-standard` (or the documented custom utility) actually applies: computed `transition-duration: 0.16s` on a test element. Under `prefers-reduced-motion: reduce`, accordion, navigation-menu, dialog, sheet and toast open with no running animations (`document.getAnimations().length` = 0 after opening).

**Dev tokens page**

- [ ] Given `app/dev/tokens/page.tsx` (a Server Component), when `pnpm dev` serves `/dev/tokens/`, then it shows:
  - every colour scale with token names and hex values;
  - the semantic aliases;
  - the text scale in both fonts, with a Vietnamese sample sentence;
  - radius, shadow (incl. `brand-offset`), durations and easings.

  It renders the 16 primitives once each, as a visual check. `page.tsx` stays thin (`module-structure.md`): the gallery lives in small files under `app/dev/tokens/_components/` (private folder, under the size limits), with one small `"use client"` demo for the interactive primitives (dialog, sheet, toast trigger). **Sonner's `<Toaster />` mounts only inside the dev page**, never in the root layout (S-08 decides the public mounting). When the production build serves `/dev/tokens/`, it returns **404** (`notFound()` when `NODE_ENV === "production"`), and the page is `noindex`. Its strings are developer-tooling text: a recorded exception to `messages/*`, with no business facts.

**Accessibility of the primitives (rule 10)**

- [ ] Given the 16 primitives at their default sizes, then every interactive one has a **hit area ≥ 44 × 44 px**, measured with `getBoundingClientRect()` and including padding or a pseudo-element hit area: button (default and `sm` variants used publicly), checkbox (via its label or hit area), select trigger, tabs trigger, accordion trigger, navigation-menu trigger, dialog/sheet close button, breadcrumb link.
- [ ] Given keyboard use on `/dev/tokens/`, then:
  - Tab reaches every interactive primitive in DOM order with a visible focus ring;
  - Enter/Space activate buttons, checkboxes and accordion triggers;
  - arrow keys move between tabs, select options and navigation-menu items;
  - Escape closes the open dialog, sheet, select and navigation-menu;
  - dialog and sheet **trap focus** while open and **return focus** to their trigger on close.

**Checks and budget**

- [ ] Given the end state, then these all pass:
  - `pnpm install --frozen-lockfile`, `pnpm tokens:check`, `pnpm lint`, `pnpm typecheck`, `pnpm check:boundaries`, `pnpm build`;
  - the build route table lists `/`, `/_not-found` and `/dev/tokens` (404 at runtime in production).
- [ ] Given the production build, then `/` measured by the ADR 0006 method has:
  - an app JS delta ≤ 50 KiB over the framework baseline;
  - LCP < 2.5 s and CLS < 0.1, with Lighthouse mobile performance ≥ 90 and accessibility 100;
  - its CSS and font transfer recorded (KiB), plus the font preloads.

**Docs**

- [ ] Given the context docs, then:
  - `10-roadmap.md` F-02 says `motion` is deferred to the first island that needs it;
  - `04-design-system.md` names `sonner` for Toast, lists the 16-primitive core set, and its `@theme` sample matches the generator (incl. `radius-pill: 999px`, `@theme static`);
  - `AGENTS.md` §3 Styling / Components / Motion and §7 `pnpm tokens` + `pnpm tokens:check` are updated by `/mark-implemented` from the merge commit.

### Scope

**In scope:**

- Tailwind v4 migration (PostCSS plugin, CSS-first config, `tw-animate-css`, typography plugin).
- `scripts/build-tokens.ts`, `pnpm tokens`, `pnpm tokens:check`, generated `app/theme.css`.
- Brand fonts via `next/font`; base styles; the shadcn ↔ token variable mapping.
- shadcn v4 re-init with the 16-primitive core set; deleting the other components, their hooks and dependencies.
- The `/dev/tokens/` page (dev only). Restyling the placeholder with tokens.
- The context doc updates listed above.

**Out of scope:**

- `motion` / Framer Motion (deferred; first island task).
- Business components (RouteCard, RateTable, QuoteCalculator, LeadForm, Header, MobileActionBar, Footer…): S-01 onwards in `modules/*/ui`.
- Admin primitives (calendar, form, dropdown-menu, popover, data table, switch…): A-01 onwards.
- Dark mode (not in the design system).
- Logo and favicon (Q-11).
- next-intl / `messages/*` (F-03).
- Figma / Tokens Studio sync.
- Adding `tokens:check` to CI (F-08).

### Affected Areas

| Repo | Layer | File / Path |
|------|-------|-------------|
| app | tooling | `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` (allowlist if new build scripts), `postcss.config.mjs`, delete `tailwind.config.ts`, `biome.json` |
| app | script | `scripts/build-tokens.ts` (new) |
| app | styles | `app/theme.css` (generated), `app/globals.css` |
| app | layout/pages | `app/layout.tsx` (fonts), `app/page.tsx` (token classes), `app/dev/tokens/page.tsx` (new, dev-only) |
| app | shared | `shared/ui/*` (re-generated core set, the rest deleted), `shared/hooks/*` (unused deleted), `shared/lib/utils.ts` (kept if `cn` is still used), `components.json` |
| app | docs | `README.md` (commands), `AGENTS.md` (styling line) |
| context | docs | `docs/context/10-roadmap.md` (F-02 text), `docs/context/04-design-system.md` (sonner, core set); `AGENTS.md` §3/§7 via `/mark-implemented` |

### Golden-rule checks

- **Rule 10 (a11y, token colours):**
  - colours only from tokens;
  - the shadcn mapping uses the approved pairs in `04`;
  - input borders reach 3:1 (ink-400);
  - focus ring visible;
  - axe 0 serious/critical on `/` and `/dev/tokens/`.
- **Rule 11 (Vietnamese typography):** `vietnamese` subset on both fonts; body line-height ≥ 1.6; no uppercase on buttons or menus. The display style may be uppercase, per `04`.
- **Rule 9 (motion):** the reduced-motion block is generated. `tw-animate-css` also ships height-based accordion keyframes, so the primitives are adjusted to animate only `transform`/`opacity` (see the motion AC).
- **Rule 8 (budget):** CSS and fonts don't count as JS, but LCP/CLS are re-measured. No new client JS on `/`. `sonner` is client-side, but it is not mounted anywhere yet (S-08 mounts it).
- **Rule 3:** no text in images (none added).
- **Rule 1:** the dev page shows only design tokens, no business facts.

### Dependencies & Risks

- **Depends on:** F-01 (done: Next 16, `shared/ui` layout, Biome 2).
- **Blocked by questions:** none. Q-11 (logo) isn't needed here.
- **Risk: the shadcn v4 CLI layout.** The CLI may write to its own default paths, or rewrite `globals.css`. Run it with the ADR 0005 aliases, review the diff, keep our token mapping, and re-run `pnpm tokens:check` afterwards.
- **Risk: shadcn's default theme uses `oklch` colours.** Replace every generated colour with token references (the grep AC).
- **Risk: font weight / LCP.** Two families with 6 weights total. Keep to the listed weights only, let `next/font` preload and self-host them, and record LCP/CLS. If LCP regresses past 2.5 s, drop Be Vietnam Pro 500 first and note it in the PR.
- **Risk: Tailwind v4 automatic content detection** skips git-ignored paths. If a class from `shared/ui` doesn't generate CSS, add `@source` lines. The computed-style check covers this.

### Manual Verification Plan

- **Scenario:** Given a fresh clone of the PR branch with an empty `.env`, when it is installed, tokens are generated, and the app is built and served, then everything passes. `/` shows the placeholder in Barlow Condensed / Be Vietnam Pro with token colours, `/dev/tokens/` works in dev and returns 404 in production, and budgets hold.
- **Seed needs:** none.
- **Steps:**
  1. `pnpm install --frozen-lockfile`, then `pnpm peers check`: no unmet peers. `pnpm ls tailwindcss @tailwindcss/postcss tw-animate-css` → 4.x / 4.x / present. `pnpm ls tailwindcss-animate motion framer-motion react-day-picker cmdk vaul recharts` → not found.
  2. **Generator determinism:** `pnpm tokens && git diff --exit-code app/theme.css` → clean. Run `pnpm tokens` again → still clean.
     - Change `crimson.600` in a temp copy of the tokens file used by `tokens:check` (or the real file, reverted afterwards) → `pnpm tokens:check` fails naming the drift.
     - Revert → passes.
  3. `grep -c "@theme" app/theme.css` = 1. `grep -c "prefers-reduced-motion" app/theme.css` ≥ 1. `grep -rnE "#[0-9a-fA-F]{3,8}\b|hsl\(|oklch\(" app shared --include=*.css --include=*.tsx | grep -v app/theme.css` → no output. `ls tailwind.config.ts` → no such file. `ls shared/ui` → exactly the 16 files.
  4. `pnpm lint && pnpm typecheck && pnpm check:boundaries && pnpm build` → all pass; the route table includes `/dev/tokens`.
  5. **Dev page:** `pnpm dev`, open `http://localhost:3000/dev/tokens/` at 1280 px.
     - Every scale and alias is shown, the Vietnamese sample renders without missing glyphs, and all 16 primitives render.
     - Computed styles via CDP: a primary button's background is `rgb(172, 12, 46)` (crimson-600) with white text; an input's border colour is ink-400 `rgb(115, 127, 137)`; `body` font-family starts with the Be Vietnam Pro `next/font` family; `body` line-height ≥ 1.6 × font size.
     - axe at 1280 and 360 px → 0 serious/critical.
  5b. **Primitive checks** (CDP, on `/dev/tokens/` in dev):
     - `rounded-*` computed radii (8/12/20/28/999 px);
     - hit-area sizes for each interactive primitive (≥ 44 px);
     - computed colours in the default, hover, focus-visible, `aria-invalid` and open states;
     - `duration-fast` computed 0.16 s;
     - with reduced motion, open each overlay and record `document.getAnimations().length` = 0;
     - the full keyboard script from the AC, including focus trap and return for dialog and sheet;
     - the palette-class grep and the `cn()` merge check.
  6. **Production:** `pnpm build && pnpm start -p 3100`, after confirming port 3100 is free (`lsof`).
     - `/dev/tokens/` → 404. `/` → 200 with one `<h1>` in Barlow Condensed (computed `font-family`), `lang="vi"`, `noindex, nofollow`.
     - `/` at 360/768/1280 px: no horizontal scroll. Keyboard: no focusable elements. Reduced motion: 0 animations.
  7. **Budget (ADR 0006 method):** Lighthouse 12.8.2 mobile on `/`:
     - Script `transferSize` total minus the 134.3 KiB baseline = app delta, expected ≈ 0, ≤ 50.
     - Record performance, accessibility, LCP, CLS and TBT, plus CSS KiB, font KiB and preloads. Performance ≥ 90, accessibility 100, LCP < 2.5 s, CLS < 0.1.
  8. **Hook:** stage a temp CSS file with a hex colour outside `theme.css` → no lint failure is expected, because the colour rule is enforced by the grep step, not Biome. Record that the grep is the guard. A staged TS lint error is still blocked.
- **Validation commands:** `pnpm -C 43logistics.vn tokens:check` + `lint` + `typecheck` + `check:boundaries` + `build`. `i18n:check` and `check:redirects` don't exist yet (F-03/F-07). No consent matrix (no tracking). No automated tests (ADR 0004).

### Implementation Hints

- **Order:**
  1. branch `feat/f-02-tokens-and-theme` from a fresh `origin/main`;
  2. Tailwind v4 upgrade (`npx @tailwindcss/upgrade` can help, then delete `tailwind.config.ts`);
  3. token script and `theme.css`;
  4. fonts and base;
  5. shadcn re-init and `shadcn add` of the 16, then replace their colours with tokens;
  6. delete the rest and prune dependencies;
  7. dev page;
  8. measurements;
  9. docs.
- Keep `build-tokens.ts` small and pure:
  - `readTokens()` → `flatten(proposed)` → `renderTheme()` → write.
  - `tokens:check` reuses `renderTheme()` and compares strings.
  - Under `code-style.md` size limits, split into `scripts/tokens/{read,render}.ts` if it grows past 200 lines.
- The token JSON uses W3C DTCG (`$value`, `$type`). Resolve references like `{color.crimson.600}` when rendering the aliases.
- Measurement tooling notes are in `.claude/rules/verification-patterns.md` (arm64 Node for Lighthouse, CDP for 360 px, kill `next-server` before measuring).
- `/dev/tokens/` may import `data/design-tokens.json` directly (server component, dev only). It is not module code, so it stays in `app/` and doesn't create a module.

### Related

- Roadmap F-02. Next: F-03 (i18n), S-01 (layout uses these primitives and tokens).
- `docs/context/04-design-system.md` (direction, scales, approved pairs, motion, the `@theme` sample); `43logistics.vn/data/design-tokens.json`.
- ADR 0002 §5–7 (shadcn, Tailwind v4, motion), ADR 0004 (verification), ADR 0005 (`shared/ui`), ADR 0006 (budget method).
- `.claude/rules/component-patterns.md`, `code-style.md`, `verification-patterns.md`.
- Spec `feature-f01-upgrade-and-harness.md` (baseline 134.3 KiB, Tailwind content-glob history).
