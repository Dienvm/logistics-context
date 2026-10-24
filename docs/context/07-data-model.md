# 07 — Data model (Supabase Postgres + Drizzle)

## Principles

- Structure and translations are separate tables: `pages` ↔ `page_translations (page_id, locale)`, same for routes, FAQs, goods rules, testimonials, posts, categories, menu items, media alt text. Adding a locale = add an enum value + rows; no schema change per locale.
- **Facts are data, not copy:** `routes` (transit, schedule, methods, divisor, rounding) and `route_rates` (weight bands, prices, validity) feed rate tables, the calculator, mega menu, JSON-LD and OG images.
- Money: integer VND (`bigint`, mode `number`). Weights: `numeric(8,2)` kg. Timestamps: `timestamptz` UTC.
- Legacy traceability: `legacy_wp_id`, `legacy_url` columns for imported rows.
- `is_verified = false` on all legacy-seeded routes/rates until operations confirm; the UI shows a rate table only when `routes.is_verified = true` (otherwise "Liên hệ để nhận giá mới nhất").

## ER overview

```
profiles (Clerk users) ─┬─< posts >─┬─ post_translations
                        │           └─< post_categories >── categories ─ category_translations
                        ├─< leads.assigned_to
                        └─< goods_rules.approved_by
pages ─< page_translations          media ─< media_translations
pages ─ routes ─< route_rates
              ├─< route_translations
              ├─< goods_rules ─< goods_rule_translations   (route_id null = global rule)
              ├─< faqs ─< faq_translations                  (or faqs.page_id)
              ├─< testimonials ─< testimonial_translations
              ├─< leads
              └─< contact_events
menu_items ─< menu_item_translations     site_settings (key → jsonb)     redirects
```

## Drizzle schema — split per module into `modules/<name>/infrastructure/schema.ts`, re-exported by `db/schema.ts` (ADR 0005)

> **Implemented in F-04** (drizzle-orm 0.45, drizzle-kit 0.31; one baseline migration in `43logistics.vn/db/migrations/`). The app code is authoritative. The sketch below is the original draft, with these F-04 changes:
> - **`pages.route_id → routes.id`** replaces `routes.page_id`. `content` owns the page↔route link, so module schema imports stay acyclic.
> - **`menu_items.key`** (`not null`, `unique(menu, key)`): a stable key such as `header.outbound`.
> - **`site_settings.is_verified`** (`boolean not null default false`): only verified keys are published (rule 1).
> - `pages.parent_id` and `menu_items.parent_id` are self-referencing FKs.
>
> Layout:
> - shared enums in `db/enums.ts`; `timestamps` in `db/columns.ts`; `relations()` only in `db/relations.ts`;
> - `content` is split into `infrastructure/schema/{pages,blog,editorial,menus}.ts`;
> - `.enableRLS()` is the current API in 0.45; every table has it and there are no policies.
>
> Schema import graph:
> - `routes`, `auth`, `media`, `settings`, `seo`: enums only;
> - `pricing` → `routes`; `goods` → `routes`, `auth`; `content` → `routes`, `media`, `auth`; `leads` → `routes`, `auth`; `contact` → `routes`.

```ts
import { sql } from 'drizzle-orm'
import {
  bigint, boolean, check, date, index, integer, jsonb, numeric, pgEnum, pgTable, primaryKey,
  smallint, text, timestamp, uniqueIndex, uuid,
} from 'drizzle-orm/pg-core'

// ───────────────────────── enums
export const localeCode = pgEnum('locale_code', ['vi', 'en'])
export const contentStatus = pgEnum('content_status', ['draft', 'review', 'published', 'archived'])
// translation freshness is NOT a status: a translation is outdated when its source_updated_at < the source locale row's updated_at (derived, shown in the admin queue)
export const pageType = pgEnum('page_type', ['home', 'hub', 'route_outbound', 'route_inbound', 'calculator', 'goods', 'about', 'contact', 'policy', 'landing', 'generic'])
export const routeDirection = pgEnum('route_direction', ['outbound', 'inbound'])
export const shippingMethod = pgEnum('shipping_method', ['air', 'air_express', 'air_economy', 'sea'])
export const goodsRuleKind = pgEnum('goods_rule_kind', ['allowed', 'restricted', 'prohibited'])
export const leadStatus = pgEnum('lead_status', ['new', 'contacted', 'quoted', 'won', 'lost', 'spam'])
export const contactChannel = pgEnum('contact_channel', ['zalo', 'call', 'whatsapp', 'messenger', 'email', 'form'])
export const staffRole = pgEnum('staff_role', ['admin', 'editor', 'sales'])
export const testimonialSource = pgEnum('testimonial_source', ['zalo', 'facebook', 'google', 'website', 'other'])

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}

// ───────────────────────── staff (mirrors Clerk users)
export const profiles = pgTable('profiles', {
  clerkUserId: text('clerk_user_id').primaryKey(),          // Clerk `sub`
  username: text('username'),                               // staff sign in with a username (F-05, migration 0005)
  email: text('email'),                                      // optional: username-only accounts have none
  displayName: text('display_name'),
  role: staffRole('role'),                                   // null = no role (F-05); access uses the session claim
  deletedAt: timestamp('deleted_at', { withTimezone: true }), // Clerk user.deleted → soft delete, FKs kept
  ...timestamps,
}).enableRLS()

// ───────────────────────── media
export const media = pgTable('media', {
  id: uuid('id').primaryKey().defaultRandom(),
  bucket: text('bucket').notNull().default('media'),
  path: text('path').notNull(),                             // e.g. uploads/2023/12/SEE_5123.webp
  mime: text('mime').notNull(),
  width: integer('width'),
  height: integer('height'),
  bytes: integer('bytes'),
  blurDataUrl: text('blur_data_url'),
  legacyUrl: text('legacy_url'),                            // old https://43logistics.vn/wp-content/uploads/...
  legacyWpId: integer('legacy_wp_id'),
  ...timestamps,
}, (t) => [uniqueIndex('media_bucket_path_uq').on(t.bucket, t.path), index('media_legacy_url_idx').on(t.legacyUrl)]).enableRLS()

export const mediaTranslations = pgTable('media_translations', {
  mediaId: uuid('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  locale: localeCode('locale').notNull(),
  alt: text('alt').notNull(),
  caption: text('caption'),
}, (t) => [primaryKey({ columns: [t.mediaId, t.locale] })]).enableRLS()

// ───────────────────────── pages
export const pages = pgTable('pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: pageType('type').notNull(),
  key: text('key').unique(),                                // stable code key: 'home', 'hub-outbound', 'about', 'policy-privacy'…
  parentId: uuid('parent_id'),
  sort: integer('sort').notNull().default(0),
  status: contentStatus('status').notNull().default('draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  legacyWpId: integer('legacy_wp_id'),
  ...timestamps,
}).enableRLS()

export const pageTranslations = pgTable('page_translations', {
  pageId: uuid('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  locale: localeCode('locale').notNull(),
  slug: text('slug').notNull(),                             // '' for home
  title: text('title').notNull(),
  h1: text('h1').notNull(),
  excerpt: text('excerpt'),
  blocks: jsonb('blocks').$type<unknown[]>().notNull().default([]), // typed block JSON (see "Blocks")
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  ogImageId: uuid('og_image_id').references(() => media.id),
  noindex: boolean('noindex').notNull().default(false),
  status: contentStatus('status').notNull().default('draft'),
  sourceUpdatedAt: timestamp('source_updated_at', { withTimezone: true }), // VI version timestamp this translation was based on
  ...timestamps,
}, (t) => [primaryKey({ columns: [t.pageId, t.locale] }), uniqueIndex('page_tr_locale_slug_uq').on(t.locale, t.slug)]).enableRLS()

// ───────────────────────── routes & rates (single source of truth for prices/transit)
export const routes = pgTable('routes', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),                      // 'sg', 'kr', 'sg-vn'…
  pageId: uuid('page_id').references(() => pages.id),
  direction: routeDirection('direction').notNull(),
  countryCode: text('country_code').notNull(),              // ISO 3166-1 alpha-2 of the foreign country
  methods: shippingMethod('methods').array().notNull().default(sql`'{}'::shipping_method[]`),
  transitDaysMin: smallint('transit_days_min'),
  transitDaysMax: smallint('transit_days_max'),
  transitNote: text('transit_note'),                        // e.g. 'ngày làm việc kể từ ngày bay'
  flightSchedule: text('flight_schedule'),                  // e.g. 'Thứ 3-5-7'
  volumetricDivisor: integer('volumetric_divisor').notNull().default(5000),
  weightRoundingKg: numeric('weight_rounding_kg', { precision: 4, scale: 2 }), // e.g. 0.5 for US
  pricesPublic: boolean('prices_public').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  isVerified: boolean('is_verified').notNull().default(false), // legacy seed = false until ops confirms
  sort: integer('sort').notNull().default(0),
  ...timestamps,
}).enableRLS()

export const routeTranslations = pgTable('route_translations', {
  routeId: uuid('route_id').notNull().references(() => routes.id, { onDelete: 'cascade' }),
  locale: localeCode('locale').notNull(),
  name: text('name').notNull(),                             // 'Hàn Quốc' / 'South Korea'
  shortPitch: text('short_pitch'),
}, (t) => [primaryKey({ columns: [t.routeId, t.locale] })]).enableRLS()

export const routeRates = pgTable('route_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  routeId: uuid('route_id').notNull().references(() => routes.id, { onDelete: 'cascade' }),
  method: shippingMethod('method').notNull().default('air'),
  weightMinKg: numeric('weight_min_kg', { precision: 8, scale: 2 }).notNull(),
  weightMaxKg: numeric('weight_max_kg', { precision: 8, scale: 2 }),      // null = open-ended ("trên 100kg")
  pricePerKgVnd: bigint('price_per_kg_vnd', { mode: 'number' }),         // per-kg band
  flatPriceVnd: bigint('flat_price_vnd', { mode: 'number' }),            // fixed price for the band (e.g. US 5kg)
  contactForPrice: boolean('contact_for_price').notNull().default(false),
  promoLabel: text('promo_label'),                                       // 'Đồng giá'
  validFrom: date('valid_from'),
  validTo: date('valid_to'),
  notes: text('notes'),
  ...timestamps,
}, (t) => [
  index('route_rates_route_idx').on(t.routeId, t.method, t.weightMinKg),
  check('route_rates_price_ck', sql`${t.contactForPrice} or ${t.pricePerKgVnd} is not null or ${t.flatPriceVnd} is not null`),
]).enableRLS()

// ───────────────────────── goods rules, FAQs, testimonials
export const goodsRules = pgTable('goods_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  routeId: uuid('route_id').references(() => routes.id, { onDelete: 'cascade' }), // null = applies to all routes
  kind: goodsRuleKind('kind').notNull(),
  sort: integer('sort').notNull().default(0),
  approvedBy: text('approved_by').references(() => profiles.clerkUserId),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  ...timestamps,
}).enableRLS()

export const goodsRuleTranslations = pgTable('goods_rule_translations', {
  ruleId: uuid('rule_id').notNull().references(() => goodsRules.id, { onDelete: 'cascade' }),
  locale: localeCode('locale').notNull(),
  name: text('name').notNull(),
  description: text('description'),
}, (t) => [primaryKey({ columns: [t.ruleId, t.locale] })]).enableRLS()

export const faqs = pgTable('faqs', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id').references(() => pages.id, { onDelete: 'cascade' }),
  routeId: uuid('route_id').references(() => routes.id, { onDelete: 'cascade' }),
  sort: integer('sort').notNull().default(0),
  status: contentStatus('status').notNull().default('draft'),
  ...timestamps,
}).enableRLS()

export const faqTranslations = pgTable('faq_translations', {
  faqId: uuid('faq_id').notNull().references(() => faqs.id, { onDelete: 'cascade' }),
  locale: localeCode('locale').notNull(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),                         // markdown
}, (t) => [primaryKey({ columns: [t.faqId, t.locale] })]).enableRLS()

export const testimonials = pgTable('testimonials', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  location: text('location'),
  routeId: uuid('route_id').references(() => routes.id),
  avatarId: uuid('avatar_id').references(() => media.id),
  source: testimonialSource('source').notNull().default('other'),
  rating: smallint('rating'),                               // only if real
  consentAt: timestamp('consent_at', { withTimezone: true }), // shown publicly only when set
  status: contentStatus('status').notNull().default('draft'),
  ...timestamps,
}).enableRLS()

export const testimonialTranslations = pgTable('testimonial_translations', {
  testimonialId: uuid('testimonial_id').notNull().references(() => testimonials.id, { onDelete: 'cascade' }),
  locale: localeCode('locale').notNull(),
  quote: text('quote').notNull(),
}, (t) => [primaryKey({ columns: [t.testimonialId, t.locale] })]).enableRLS()

// ───────────────────────── blog
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  routeId: uuid('route_id').references(() => routes.id),
  sort: integer('sort').notNull().default(0),
}).enableRLS()

export const categoryTranslations = pgTable('category_translations', {
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  locale: localeCode('locale').notNull(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
}, (t) => [primaryKey({ columns: [t.categoryId, t.locale] }), uniqueIndex('cat_tr_locale_slug_uq').on(t.locale, t.slug)]).enableRLS()

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  coverId: uuid('cover_id').references(() => media.id),
  authorId: text('author_id').references(() => profiles.clerkUserId),
  routeId: uuid('route_id').references(() => routes.id),   // related route for CTA/internal links
  status: contentStatus('status').notNull().default('draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  legacyWpId: integer('legacy_wp_id'),
  ...timestamps,
}).enableRLS()

export const postTranslations = pgTable('post_translations', {
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  locale: localeCode('locale').notNull(),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  excerpt: text('excerpt'),
  blocks: jsonb('blocks').$type<unknown[]>().notNull().default([]),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  status: contentStatus('status').notNull().default('draft'),
  ...timestamps,
}, (t) => [primaryKey({ columns: [t.postId, t.locale] }), uniqueIndex('post_tr_locale_slug_uq').on(t.locale, t.slug)]).enableRLS()

export const postCategories = pgTable('post_categories', {
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.postId, t.categoryId] })]).enableRLS()

// ───────────────────────── navigation & settings
export const menuItems = pgTable('menu_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  menu: text('menu').notNull(),                             // 'header' | 'footer-company' | 'footer-policies'…
  parentId: uuid('parent_id'),
  pageId: uuid('page_id').references(() => pages.id),
  routeId: uuid('route_id').references(() => routes.id),
  url: text('url'),                                         // external only
  sort: integer('sort').notNull().default(0),
}).enableRLS()

export const menuItemTranslations = pgTable('menu_item_translations', {
  menuItemId: uuid('menu_item_id').notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  locale: localeCode('locale').notNull(),
  label: text('label').notNull(),
}, (t) => [primaryKey({ columns: [t.menuItemId, t.locale] })]).enableRLS()

export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),                            // 'company' | 'contact' | 'offices' | 'hours' | 'social' | 'tracking' | 'offers'
  value: jsonb('value').notNull(),                          // validated by Zod per key
  ...timestamps,
}).enableRLS()

// ───────────────────────── leads & events
export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  phone: text('phone').notNull(),                           // E.164 when possible
  email: text('email'),
  routeId: uuid('route_id').references(() => routes.id),
  weightKg: numeric('weight_kg', { precision: 8, scale: 2 }),
  lengthCm: integer('length_cm'), widthCm: integer('width_cm'), heightCm: integer('height_cm'),
  goodsType: text('goods_type'),
  message: text('message'),
  estimateVnd: bigint('estimate_vnd', { mode: 'number' }),
  locale: localeCode('locale').notNull().default('vi'),
  sourcePath: text('source_path'),
  utmSource: text('utm_source'), utmMedium: text('utm_medium'), utmCampaign: text('utm_campaign'), utmTerm: text('utm_term'), utmContent: text('utm_content'),
  gclid: text('gclid'), gbraid: text('gbraid'), wbraid: text('wbraid'), fbclid: text('fbclid'), ttclid: text('ttclid'),
  referrer: text('referrer'),
  landingPath: text('landing_path'),                        // from 43l_attr (S-02 migration; written by S-08)
  ipHash: text('ip_hash'),                                  // HMAC-SHA256(IP, IP_HASH_SALT), hex (S-08 rate limit)
  userAgent: text('user_agent'),
  consentAt: timestamp('consent_at', { withTimezone: true }).notNull(),
  consentPolicyVersion: text('consent_policy_version').notNull(),
  adsConsent: boolean('ads_consent').notNull().default(false),
  status: leadStatus('status').notNull().default('new'),
  assignedTo: text('assigned_to').references(() => profiles.clerkUserId),
  notes: text('notes'),
  ...timestamps,
}, (t) => [
  index('leads_status_created_idx').on(t.status, t.createdAt),
  index('leads_ip_hash_created_idx').on(t.ipHash, t.createdAt),   // S-08 rate limit (migration 0002)
]).enableRLS()

// S-08b (migration 0004): rotating OAuth tokens of the sales notifiers (Zalo OA). Server-only
// secrets, never rendered; one row per provider, updated under SELECT … FOR UPDATE.
export const oauthTokens = pgTable('oauth_tokens', {
  provider: text('provider').primaryKey(),                 // 'zalo_oa'
  accessToken: text('access_token'),
  refreshToken: text('refresh_token').notNull(),           // single-use; each refresh stores the next one
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  ...timestamps,
}).enableRLS()

export const contactEvents = pgTable('contact_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: text('event_id').notNull().unique(),             // per-click UUID from the client (fallback: server), shared with pixel for dedupe
  channel: contactChannel('channel').notNull(),
  routeId: uuid('route_id').references(() => routes.id),
  placement: text('placement'),
  sourcePath: text('source_path'),
  locale: localeCode('locale'),
  utmSource: text('utm_source'), utmMedium: text('utm_medium'), utmCampaign: text('utm_campaign'), utmTerm: text('utm_term'), utmContent: text('utm_content'),
  gclid: text('gclid'), gbraid: text('gbraid'), wbraid: text('wbraid'), fbclid: text('fbclid'), ttclid: text('ttclid'),
  referrer: text('referrer'), landingPath: text('landing_path'),          // referrer host + landing path from 43l_attr; attribution stored only with ads consent (S-02)
  ipHash: text('ip_hash'),                                  // HMAC-SHA256(IP, IP_HASH_SALT), hex; null without a salt
  userAgent: text('user_agent'),                            // truncated to 512 chars
  adsConsent: boolean('ads_consent').notNull().default(false),            // gate for server-side conversions
  analyticsConsent: boolean('analytics_consent').notNull().default(false),
  consentPolicyVersion: text('consent_policy_version'),
  consentAt: timestamp('consent_at', { withTimezone: true }),          // when the consent choice was made (the `at` field of the 43l_consent cookie, 05), not the event time
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('contact_events_created_idx').on(t.createdAt), index('contact_events_channel_idx').on(t.channel)]).enableRLS()

export const redirects = pgTable('redirects', {
  sourcePath: text('source_path').primaryKey(),
  destination: text('destination'),                         // null for 410
  statusCode: smallint('status_code').notNull(),            // 301 | 302 | 410
  hits: integer('hits').notNull().default(0),
  note: text('note'),
  ...timestamps,
}).enableRLS()
```

## Drizzle client — `db/client.ts`

```ts
import 'server-only'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL!, { prepare: false, max: 5 }) // Supabase transaction pooler
export const db = drizzle(client, { schema, casing: 'snake_case' })
```

`drizzle.config.ts`: `dialect: 'postgresql'`, `schema: './db/schema'`, `out: './db/migrations'`, `dbCredentials.url = process.env.DATABASE_URL_DIRECT`.

## Pricing rules — how `routes` + `route_rates` become a quote (S-03)

The price engine is `43logistics.vn/modules/pricing/domain/{weight,quote}.ts`, exposed client-safe through `modules/pricing/client.ts`. Rows are mapped by `infrastructure/quote-mappers.ts` (`numeric` strings → integer grams; a malformed value throws with its column name). Owner decisions 2026-10-22, open points in Q-25:

- **Units:** integer grams; actual weight rounded **up** to the gram. Volumetric = L×W×H / `routes.volumetric_divisor`, rounded up to the gram, only when all three dimensions are given. Chargeable = max(actual, volumetric), then rounded **up** to `routes.weight_rounding_kg` when set (no default step).
- **Eligibility:** "Liên hệ" when `is_verified = false` (unless preview) or `prices_public = false`. Only bands of the requested `method` whose `valid_from`/`valid_to` window contains today (Asia/Ho_Chi_Minh, inclusive) count; `routes.methods` is not consulted.
- **Bands:** `[weight_min_kg, weight_max_kg]` inclusive, `null` max open-ended. Several covering → the **highest minimum** wins; a tie on it → "Liên hệ" (`ambiguous_band`). No covering band → `no_band`.
- **Modes:** `contact_for_price` → `contact_band`; flat only → that amount; per-kg only → price × chargeable kg, half up to the đồng (bigint); both set → `ambiguous_band`.
- **Not in the engine:** VAT, insurance, surcharges, minimum charge, promos (Q-04, Q-07, Q-09). Evidence: `pnpm price:examples` (worked examples, compared by hand; ADR 0004).

## `site_settings` keys (validated with Zod)

| key | shape (example values from legacy site — confirm before publishing) |
| --- | --- |
| `company` | `{ brandName: "43 Logistics", legalName: null, taxCode: null, alternateName: "43Logistics.vn", logoMediaId }` |
| `contact` | `{ phoneDisplay: "0979 222 357", phoneE164: "+84979222357", zalo: "0979222357", whatsapp: "84979222357", messenger: "43logistics", email: "43logistics.danang@gmail.com" }` |
| `offices` | `[{ key: "danang", name: "Đà Nẵng", street: "24 Bình Hòa 6", ward, district, city: "Đà Nẵng", postalCode: "50700", lat, lng, isWarehouse: true }, { key: "hcm", name: "TP. Hồ Chí Minh", street: "34 Nguyễn Trọng Lội", … }]` |
| `hours` | `{ display: { vi, en }, spec: [{ days: ["Mo","Tu","We","Th","Fr","Sa"], opens: "08:00", closes: "18:00" }] }` — NEEDS CONFIRMATION |
| `social` | `{ facebook: "https://www.facebook.com/43logistics" }` |
| `tracking` | `{ gtmId: "GTM-WF967MKT" }` |
| `pricingRules` | `{ volumetricFormula, paymentNote: { vi } }` — legacy copy, NEEDS CONFIRMATION |
| `offers` | `{ newCustomer: { active: true, percent: 10, text: { vi, en } } }` — NEEDS CONFIRMATION |

## Blocks (`page_translations.blocks`, `post_translations.blocks`)

Typed JSON array; each block maps to a component in `modules/content/ui/blocks/`. Validate with a Zod discriminated union on `type`:

`hero` · `richText` (markdown) · `routeGrid` · `rateTable` (routeKey) · `calculator` (routeKey?) · `processSteps` (items) · `reasons` (items) · `goodsList` (routeKey) · `faq` (faqIds or routeKey) · `testimonials` (routeKey?) · `proofGallery` (mediaIds) · `ctaBand` (variant) · `image` (mediaId) · `callout` (tone, text) · `relatedRoutes` · `relatedPosts`.

Route pages mostly render from route data; blocks only add editorial sections, so all 7 route pages stay structurally identical.

**Info pages (S-09, `modules/content/application/info-blocks.ts`):**

- `policy` { `effectiveDate`: ISO date, `markdown`: ≤ 40 000 chars }: the whole body of a policy page. A policy translation holds **exactly one** valid `policy` block; its `effectiveDate` is the "Cập nhật" date and the `WebPage` `dateModified`, so editing other fields of the page never changes it.
- `richText` { `markdown`: ≤ 40 000 chars }: About sections, rendered in order as one body.
- Markdown renders on the server through `react-markdown` without raw HTML (shown as text) or images; headings are demoted below the page H1.
- **Seed copy:** `data/seed/info-pages.json` lists the pages whose copy lives in `data/seed/info-pages/{key}.{vi|en}.md` (policies get the manifest's `effectiveDate`). `pnpm db:seed` re-parses them with the strict page schema and writes them only into translations whose `blocks` is still `[]`, so an editor's text is never overwritten.
- **Every write path validates a policy translation with the same check (`findPolicyBlock`) before saving or publishing:** `pnpm db:seed` parses page blocks strictly (a bad seed file fails); `pnpm db:confirm` refuses to publish a `policy` page whose translation lacks exactly one valid block and names the page and locale; A-03's page actions must run `parseInfoBlocks`/`findPolicyBlock` before saving. The render-time 404 for an invalid policy is only a guard.

## Security (RLS & access)

- The app reads/writes through Drizzle on the server; authorization = `requireRole()` in Server Actions and admin pages.
- **RLS enabled on every table with no policies for `anon` / `authenticated`** → Supabase Data API (PostgREST) returns nothing even if the anon key leaks. Optionally also disable the Data API for the `public` schema in Supabase settings.
- If a future feature needs client-side Supabase (e.g. realtime lead notifications in admin), enable Clerk as a Supabase third-party auth provider and add explicit policies, e.g.:

```sql
create policy "staff read leads" on public.leads for select to authenticated
using ((select auth.jwt()->>'role') in ('admin','sales'));
```

- PII: `leads.phone/email/name/message` visible only to `admin` and `sales`; retention policy (e.g. delete or anonymise leads older than 24 months) — `NEEDS CONFIRMATION`, document in the privacy policy.
- `ip_hash = HMAC-SHA256(ip, IP_HASH_SALT)` (hex); never store raw IPs.

## Storage buckets

| Bucket | Access | Contents |
| --- | --- | --- |
| `media` | public read, server-only write | Site images; migrated files keep `uploads/YYYY/MM/<name>` paths for the `/wp-content/uploads/*` rewrite; new uploads `YYYY/MM/<uuid>-<slug>.<ext>` |
| `og` | public read | Generated/override OG images |
| `private` | signed URLs only | Unredacted customer screenshots, files attached to leads (if added later) |

Upload pipeline (server action): validate type/size → convert to WebP/AVIF (sharp) with max edge 2560 px → compute width/height/blur → require alt text VI (+ EN) → insert `media` + `media_translations`.

## Seed

`pnpm db:seed` (`scripts/seed.ts`, F-04) reads the following from `43logistics.vn/data/seed/`, or from `$SEED_DATA_DIR` when set:
- `routes.legacy.json`: routes, rates and translations, with `isVerified` that must be `false`;
- `site-settings.legacy.json`;
- `pages.json`: 22 IA pages from `03`. Route pages take their slugs and names from the routes file;
- `menus.json`: `header`, `footer-services` and `footer-policies`, 27 items;
- `info-pages.json` + `info-pages/*.md`: About and policy copy (S-09), written only into empty blocks;
- `posts.json` + `posts/*.md`: blog posts (S-11), each inserted as a draft when its VI slug is new, with one `richText` block per translation; `db:confirm` publishes the VI slugs listed under `posts` in `owner-confirmations.json`.

Every file is validated with Zod, including cross-file references, before anything is written. Everything runs in one transaction and needs `DATABASE_URL_DIRECT`.

Re-runs are idempotent and respect ownership:
- routes and settings are refreshed only while `is_verified = false`;
- an unverified route's rate bands are replaced, and a verified route is never touched;
- pages, menus and all translations are insert-only.

Legacy route-level `notes` (e.g. "Giá chưa bao gồm VAT") have no column. They are page copy for the route-page tasks and aren't seeded.
