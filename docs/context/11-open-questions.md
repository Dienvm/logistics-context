# 11 — Open questions (owner must answer)

> Agents: when a task needs one of these facts, do not guess — render nothing/placeholder behind a feature flag and reference the question ID. Update this file when answered (move to "Answered" with date and value, and update `01-business.md` / `site_settings`).

| ID | Question | Blocks | Status |
| --- | --- | --- | --- |
| Q-01 | Legal company name, tax code (MST), business/postal licence (if any)? | Footer, About, JSON-LD, policies | Open |
| Q-02 | Is there a Hà Nội warehouse? Address? New official ward/district names for Đà Nẵng and TP.HCM addresses after 01/07/2025? Overseas warehouse address in Singapore? | Contact, LocalBusiness schema, SG→VN page | Open |
| Q-03 | Real opening hours (header says T2–T7 08:00–18:00; contact says Mon → Saturday morning; schema 09:00–17:00). Is "CSKH 24/7" true (e.g. Zalo replies)? Does staff answer customers in English (needed before JSON-LD `availableLanguage` lists `en`)? | Header/footer, schema, copy | Open |
| Q-04 | Current price tables per route and validity of flat-rate promos (Korea 75.000 vs 68.000 đ/kg; Singapore 150.000 vs 85.000 đ/kg; Taiwan/Japan 95.000 đ/kg). VAT/insurance/surcharge rules. Who updates prices and how often? | Rate tables, calculator, ads | Open |
| Q-05 | Which routes are really active: Japan → VN ("2 chiều")? Malaysia → VN? Thailand → VN? Any new destinations (EU, AU, CA, others)? | IA, inbound pages | Open |
| Q-06 | Is 0827 575 567 still in use? Which number is Zalo / WhatsApp / hotline? | Contact links | Open |
| Q-07 | Is the "khách hàng mới giảm 10%" offer still valid? Conditions? | CTA band | Open |
| Q-08 | Carriers/partners we may name publicly (DHL, UPS, FedEx, CJ Logistics, EMS)? Logos allowed? | Trust strip, route pages | Open |
| Q-09 | Compensation/insurance policy text (old SG→VN page: "bảo hiểm 10% → đền bù 100%", otherwise "x3 phí vận chuyển") — official terms for all routes? | Claims policy, route pages | Open |
| Q-10 | Goods lists per country approved by operations (old pages accepted prescription medicine, "kem trộn", fresh food — legally risky). | Goods rules, `/hang-cam-gui/` | Open |
| Q-11 | Vector logo (SVG/AI/PDF)? Any plan to refresh the logo? | Header, favicon, OG | Open |
| Q-12 | Consent from customers shown in testimonials/screenshots? | Testimonials, proof gallery | Open |
| Q-13 | Tracking: access to GTM `GTM-WF967MKT`, GA4, Search Console, Google Ads, Meta Business, TikTok Ads? Ad budget & channel priority — which ad platforms launch first (only those get tags/CAPI)? | Phase 4 | Open |
| Q-14 | How should sales be notified of new leads (Zalo OA, email, Telegram, admin only)? | S-08 | Open |
| Q-15 | Hosting choice (Vercel or other) and domain DNS access? | L-02 | Open |
| Q-16 | Machine-translation provider for EN drafts (or human only)? | C-06 | Open |
| Q-17 | Lead data retention period? | Privacy policy, DB job | Open |
| Q-18 | Tracking numbers: is there a carrier API or internal system to power `/tra-cuu/`? | Phase 6 | Open |
| Q-19 | Keep URL strategy VI at root (no `/vi/`) — confirmed? | F-03 | Proposed: yes |
| Q-20 | PostHog: Cloud EU or US (or self-host)? Is session replay wanted? Who prepares the cross-border transfer / impact assessment under Law 91/2025/QH15 + Decree 13, and does `43l_attr` need consent (assumed yes)? | S-13, privacy policy | Open |
| Q-22 | Which extra destinations listed by Quý Nam (AU, CA, CN, UK, DE, FR, other EU) and services (order consolidation from VN marketplaces, frozen food, vacuum packing, home pickup) does 43 Logistics really offer? | Route registry, route pages, home benefits | Open |
| Q-23 | Real trust numbers for 43 Logistics: years operating, customers/shipments per year, any press mentions? | Home stats band, About, press strip | Open |
| Q-24 | Scope of reuse from Quý Nam (Q-21): (a) do Quý Nam's rate tables (origin Hồ Chí Minh) apply to 43 Logistics shipments from Đà Nẵng, or does 43 Logistics keep its own rates? (b) may Quý Nam's numbers, press coverage and claims ("bảo hiểm 100%", hours, years) appear on 43logistics.vn, and attributed to whom (Quý Nam / the group)? (c) can we get API access to `tracking.quynam.vn` (tracking + calculator)? (d) how do the two sites split keywords and cities (e.g. 43 Logistics leads on Đà Nẵng / central Vietnam)? (e) may 43logistics.vn say publicly that it is part of the Quý Nam group? | Rates, trust sections, `/tra-cuu/`, variant pages, About | Open |

## Answered

| ID | Question | Answer | Date |
| --- | --- | --- | --- |
| Q-21 | Relationship between 43 Logistics and Quý Nam (quynam.vn)? | Sister company. The owner allows reusing Quý Nam's data. Scope of the reuse → Q-24 | 2026-10-21 |
