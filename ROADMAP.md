# MediaSync — v1 Roadmap & Build Plan

**Owner:** Mindset Media (media agency + buying house)
**Product:** MediaSync — cross-media (Print / Digital / Radio) ad-sales, booking & billing ERP
**Doc status:** Approved scope, pre-build · **Target:** v1 core in **30 days**
**Team:** Mindset Media (product/testing) + Claude (build)
**This document is the single source of truth for v1. Anything not listed as _In scope_ is deferred.**

---

## 1. Vision & honest framing

MediaSync is a **new vertical ERP** for a media agency/buy house, forked from the BizDocs billing app to reuse its financial core. It is **not** a "rebranded billing app" — billing is one module inside a larger sell-side + buy-side media platform.

- **Full spec** (all three visual planners with drag-and-drop, real-time inventory holds via Redis, Puppeteer pixel-perfect PDF, live Google Ad Manager + radio playout + accounting integrations) is a **6–12 month** build.
- **v1 (30 days)** delivers the **usable core**: CRM → rate cards → multi-media proposals → orders → multi-currency invoicing → payments, plus buy-side cost/margin and simplified traffic logs. The team uses it for real on day 31.
- We can move fast because ~20–30% already exists in the BizDocs fork: auth/roles, money discipline, per-line tax, gap-free numbering, PDF rendering, CRUD patterns, suppliers/POs/payments.

---

## 2. Scope

### 2.1 In scope for v1
| Area | What ships |
|---|---|
| **Foundations** | Multi-currency + multi-jurisdiction tax engine; company/tenant-ready schema; auth/roles (reused) |
| **CRM** | Accounts (Direct Client / Agency / Buying House), Contacts, credit limits, payment terms, parent-agency links |
| **Rate cards** | Print, Digital, Radio rate rules; validity windows; active/inactive |
| **Quote Studio** | Multi-media Proposal builder (Print/Digital/Radio line items side-by-side), agency commission, discounts, live totals, versioning, proposal PDF |
| **Sell-side billing** | Proposal → Media Order (Release Order) → Invoice (Pro-Forma + Tax) → Credit Notes → Payments/allocations |
| **Buy-side** | Vendors/publishers (reused suppliers), Purchase Orders at cost, per-line cost capture → **campaign margin** |
| **Traffic/execution** | Print/Digital/Radio logs as **tables/forms** with status + artwork/audio upload |
| **Assets** | Object storage (Cloudflare R2 or VPS disk) for artwork, audio, generated PDFs |
| **Reports** | Receivables, payables, **campaign profitability/margin**, tax summary, account statements |
| **Programmatic integration** | **First live integration** (Google Ad Manager-style): performance-log import (CSV first, live API if creds ready) |
| **Admin** | Users, Company profile, Currencies + FX rates, Tax rules, Media channels, settings |
| **Deploy** | Dev on VMware VM (via Fortinet DDNS) + Neon; live on Hostinger **KVM2** |

### 2.2 Deferred (v1.1+) — communicate to stakeholders
- Real-time **inventory soft-holds** with countdown timers (needs Redis) → v1 uses a DB `reserved_until` field
- **Drag-and-drop** radio grid, print calendar matrix, visual pacing bars → v1 uses tables/forms
- **Puppeteer/Chromium** pixel-perfect PDF → v1 keeps `@react-pdf`
- **Live** radio playout (RCS Zetta/WideOrbit) & **accounting** (Xero/QuickBooks) → v1 ships **CSV import/export stubs**
- True **multi-tenant** SaaS (tenant switching, per-tenant RBAC) → schema is ready; feature deferred
- Microservices split, Redis, background job queues

### 2.3 Explicit non-goals for v1
No mobile app, no public client portal, no automated media-planning AI, no e-signature, no payment-gateway processing.

---

## 3. Architecture & stack (decided)

- **App:** Single **Next.js 15 full-stack monolith** (App Router + Server Actions) — one deployable, fastest to build, friendly UI.
- **DB:** **PostgreSQL** via Drizzle ORM. Dev = Neon (free project `mediasync`). Live = Postgres on the KVM2 VPS (or paid Neon).
- **Styling/UI:** Tailwind v4; high-density data grids for the proposal builder.
- **PDF:** `@react-pdf/renderer` (Node route handlers) — reused.
- **Object storage:** Cloudflare R2 (S3-compatible) or VPS local disk behind a storage adapter, so we can swap later.
- **Auth:** `jose` JWT cookie + `bcryptjs` + role middleware — reused.
- **No** Redis / workers / microservices in v1 (added only when real-time features land).

### 3.1 Environments
| Env | Host | DB | URL | Purpose |
|---|---|---|---|---|
| Local | `D:\MediaSync` | Neon `mediasync` | localhost:3000 | Primary build |
| Dev/Test | VMware VM | Neon `mediasync` | Fortinet DDNS | Online stakeholder review |
| Live | Hostinger **KVM2** | Postgres on VPS | production domain | Real use (5 users) |

Deploy path per `HOSTINGER.md`: build → `server.js` under PM2 behind Nginx/TLS on KVM2.

---

## 4. Data model (v1)

Money is stored as **integer minor units of the document's own currency**; every financial document captures `currency_code` + `fx_rate_to_base` at its date. `tenant_id` is present on all tables (single active tenant for now).

**Master / core**
- `tenants` (single row now) · `company_profile`
- `accounts` (type: direct_client | agency | buying_house; credit_limit; payment_terms; parent_agency_id; default_currency)
- `contacts` (account_id, role, email, phone)
- `media_channels` (media_type: print | digital | radio; name; code)
- `vendors` (publishers/networks/stations — reused suppliers)
- `currencies` · `fx_rates` (currency, rate_to_base, effective_date)
- `tax_rules` (jurisdiction, category, rate_pct, effective_from/to)

**Rate cards**
- `rate_cards` (name, valid_from, valid_to, is_active)
- `rate_card_print_rules` (publication, edition, ad_size, col_cm_rate, front_page_loading_pct)
- `rate_card_digital_rules` (ad_unit, pricing_model: CPM|CPC|Flat, base_rate, geo_surcharge_pct)
- `rate_card_radio_rules` (station, daypart, spot_duration_sec, base_rate, fixed_time_loading_pct)

**Sales / quoting**
- `proposals` (account_id, version_number, status, currency_code, fx_rate_to_base, gross_amount, agency_discount_pct, net_amount)
- `proposal_line_items` (media_type, rate_card_id, gross_price, applied_discount_pct, net_price, **unit_cost**, **line_margin**)
- `print_line_details` · `digital_line_details` · `radio_line_details` (per-media specifics; JSONB for flexible params)

**Fulfilment / billing**
- `media_orders` (proposal_id, release_order_number, client_po_number, booking_status)
- `purchase_orders` + `po_line_items` (buy-side cost to vendors; link to order lines) — reused/extended
- `invoices` (order_id, invoice_type: pro_forma | tax_invoice, currency, subtotal, tax_amount, total, payment_status)
- `credit_notes` (invoice_id, amount, reason)
- `payments` + `payment_allocations` — reused

**Execution / assets / integration**
- `print_traffic_logs` · `digital_flight_logs` · `radio_playout_logs` (status + upload refs)
- `assets` (metadata; file lives in object storage)
- `adserver_reports` (imported programmatic performance rows)
- `integration_io_log` (CSV import/export audit)

**Document numbering (gap-free, per type/year):** `PROP` proposals · `RO` media orders · `PINV` pro-forma · `INV` tax invoice · `CN` credit note · `PO` purchase order · `PAY`/`RCP` payments/receipts.

---

## 5. Multi-currency & tax approach

- **Base/reporting currency** configurable (e.g. AED or USD). All reports roll up to base via each document's captured `fx_rate_to_base`.
- Documents transact in the **account's / user-selected currency** (USD, AED, …); amounts stored in that currency's minor units.
- **Tax** generalises BizDocs's per-line VAT: each line has a tax category; rate resolved from `tax_rules` by jurisdiction/channel; **tax computed per line, then summed** (unchanged principle).
- **Agency commission** (e.g. −15%) and volume discounts applied on the proposal before tax; margin = sell net − buy cost.

---

## 6. Navigation / screens (v1)

`Dashboard · CRM (Accounts, Contacts) · Rate Cards · Proposals (Quote Studio) · Media Orders · Billing (Invoices, Credit Notes, Payments) · Buy-side (Vendors, Purchase Orders) · Traffic Logs · Reports · Admin (Users, Company, Currencies & Tax, Channels, Settings)`

Signature screen: **Quote Studio** — a multi-media line grid with a live sticky totals bar (Gross → Commission → Discounts → Tax → Net) and PDF preview.

---

## 7. 30-day plan (week-by-week)

Each week ends with a deployed build on the DDNS URL for review.

### Week 1 — Foundations & CRM
- Multi-currency/tax money layer (currencies, fx_rates, tax_rules; generalise `money.ts`/`vat.ts`).
- Schema: accounts, contacts, media_channels, vendors; migrations to Neon.
- CRM screens (Accounts + Contacts CRUD), admin for currencies/tax/channels.
- Rebrand cleanup (nav, dashboard shell).
- **Milestone:** log in, manage accounts/contacts, currencies & tax configured.

### Week 2 — Rate cards & Quote Studio
- Rate cards + Print/Digital/Radio rule tables & editors.
- Proposal builder: multi-media line grid, per-media detail forms, commission/discount, live totals, versioning.
- Proposal PDF.
- **Milestone:** create a full multi-media proposal end-to-end and export its PDF.

### Week 3 — Orders, billing & buy-side
- Proposal → Media Order (RO) conversion.
- Invoices (pro-forma + tax), credit notes, payments/allocations — multi-currency.
- Buy-side: vendor POs at cost linked to order lines → **campaign margin**.
- Core reports (receivables, payables, margin, tax).
- **Milestone:** quote → order → invoice → payment, with margin visible.

### Week 4 — Traffic, assets, integration, deploy
- Traffic logs (Print/Digital/Radio) as tables + artwork/audio upload to object storage.
- Programmatic import (CSV; live GAM API if credentials are ready) → `adserver_reports`.
- CSV export stubs for radio playout & accounting.
- UX polish, seed/demo data, docs.
- Deploy to **KVM2**, smoke-test via production domain.
- **Milestone:** v1 live on KVM2, 5 users onboarded.

> **Buffer note:** 30 days is aggressive. If a week slips, the cut order is: (1) live GAM API → CSV stub, (2) radio/accounting export polish, (3) some reports → v1.1. The core quote→order→invoice→payment chain is protected and ships no matter what.

---

## 8. Integrations

| Integration | v1 | Notes |
|---|---|---|
| Programmatic / Ad server (GAM/OpenX) | **Live if creds ready, else CSV import** | Needs GAM network API access, GCP service account, OAuth creds — **arrange from day 1** |
| Radio playout (RCS Zetta/WideOrbit/ENCO) | CSV/XML export stub | Live automation deferred to v1.1 |
| Accounting (Xero/QuickBooks) | CSV export stub | Two-way webhook sync deferred to v1.1 |

---

## 9. Risks & assumptions

- **Timeline risk (high):** full-time focus and firm scope required; scope creep is the main threat — this doc is the guardrail.
- **GAM credential lead time (high):** external dependency on Mindset Media; fallback = CSV.
- **Multi-currency/tax complexity (medium):** the one non-trivial rebuild; front-loaded to Week 1.
- **Single builder bandwidth (medium):** deferred list keeps v1 finishable.
- **Neon free limits (low):** dev only; live uses VPS Postgres.
- **Assumption:** 5 users, one agency/tenant, English UI, at launch.

---

## 10. Success criteria (v1 "done")

1. A user can build a multi-media proposal (print+digital+radio), apply commission/discount, see live multi-currency totals, and export a PDF.
2. Convert it to a Release Order, raise pro-forma + tax invoices, record payments, and see outstanding balances.
3. Capture buy-side cost and view **campaign margin**.
4. Log traffic status and upload artwork/audio.
5. Import at least one programmatic performance report.
6. Running on KVM2 with 5 real users.

---

## 10a. Revision 1 — aligned to Mindset's real Media Booking Order (2026-09-19)

After studying Mindset's live Excel workbook and real BOs, v1 is re-centred on their
actual core document. This supersedes the generic "Proposal → Media Order" framing where they differ.

- **Central document = Media Booking Order (`BO-MS-<seq>`)** — issued by the company to a
  publisher. A 3-part document: **(1)** header + line items + VAT totals, **(2)** Annexure
  day 1–31 schedule grid per line, **(3)** bilingual EN/AR Terms & Conditions.
- **Header:** To/Advertiser (publisher), Agency, Client, Brand, Campaign, Medium, Currency,
  Payment Terms, Date, BO No.
- **Line items = FLAT format** (decided): Platform, Particulars/Description, Branding details,
  Period/Duration, Qty, UOM, Unit Gross, Total Gross(=qty×unitGross), Discount, Unit Net,
  Total Net(=qty×unitNet) + a **media-type tag**. No heavy per-media sub-tables.
- **Totals:** Total Gross → Discount → Agency Discount → Total Net → VAT 5% → Net (incl. VAT).
- **Media types:** Print, Digital, Radio, **TV, Website** (expand the enum).
- **Issuer:** Mindset LLC only for now; schema stays company-aware for later white-label
  (ENG Future Media LLC etc.).
- **BO output:** modern editorial black-and-white design (approved preview), Fraunces + IBM Plex,
  rendered via `@react-pdf`. Annexure grid + bilingual T&C included (T&C as configurable blocks).
- **Publishers/media** = vendors master (The National, Sky News Arabia, Al Ain, IMI group).

Revised Week 2/3 emphasis: build the **BO document** (header + flat lines + totals + PDF) first,
then rate cards feeding line prices, then the Annexure + T&C, then convert BO → invoice.

## 11. Open items / dependencies (Mindset Media to provide)
- [ ] New Neon **`DATABASE_URL`** for project `mindsetmedia`/`mediasync` (dev) → into `.env`
- [ ] Base/reporting currency choice (AED or USD?) and the currencies/jurisdictions in play
- [ ] Google Ad Manager API credentials (start now — longest lead time)
- [ ] Object storage choice confirm (Cloudflare R2 recommended) + account
- [ ] KVM2 provisioning + domain/DNS for live
- [ ] Sample rate cards (print/digital/radio) + a few real accounts for realistic testing
