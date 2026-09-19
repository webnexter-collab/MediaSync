/**
 * ============================================================================
 *  Billing & Documents App — Drizzle Schema (Neon Postgres)
 * ----------------------------------------------------------------------------
 *  MONEY CONVENTION: every monetary column stores an INTEGER number of FILS
 *  (1 AED = 100 fils). Never use floats for money. Format to AED only at the
 *  presentation layer (value / 100). bigint(mode:'number') is JS-safe well
 *  beyond any realistic invoice total.
 *
 *  QUANTITY / RATE: stored as numeric (exact decimal, returned as string by
 *  Drizzle) — parse with a decimal lib before arithmetic.
 *
 *  DOCUMENT NUMBERS: the human-facing number (INV-2026-0001) is NOT the PK.
 *  It is generated gap-free from `number_sequences` inside a transaction.
 * ============================================================================
 */

import {
  pgTable,
  pgEnum,
  serial,
  integer,
  bigint,
  text,
  varchar,
  boolean,
  timestamp,
  date,
  numeric,
  uniqueIndex,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/* ----------------------------------------------------------------------------
 * ENUMS
 * -------------------------------------------------------------------------- */

// Quotation / Invoice / Delivery Note / Purchase Order share one header table.
export const documentTypeEnum = pgEnum("document_type", [
  "quotation",
  "invoice",
  "delivery_note",
  "purchase_order",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "draft",
  "sent",
  "accepted", // quote accepted / PO confirmed
  "rejected",
  "partially_paid",
  "paid",
  "cancelled",
  "converted", // e.g. quote -> invoice
]);

// Who the document/payment/ledger row is against.
export const partyTypeEnum = pgEnum("party_type", ["customer", "supplier"]);

// Receipt = money IN (from customer). Payment = money OUT (to supplier).
export const paymentDirectionEnum = pgEnum("payment_direction", [
  "receipt",
  "payment",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "bank_transfer",
  "cheque",
  "card",
  "other",
]);

// UAE VAT / PINT AE tax categories.
export const taxCategoryEnum = pgEnum("tax_category", [
  "standard", // 5%
  "zero_rated", // 0%
  "exempt",
  "out_of_scope",
  "reverse_charge",
]);

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "accountant",
  "sales",
  "viewer",
  "user",
  "demo",
]);

/* --- MediaSync: CRM account classification & media channels --- */

// An "Account" (CRM) is stored in the customers table. Its type distinguishes
// a direct client from an ad agency or a buying house (which book on behalf of
// clients and may carry an agency commission).
export const accountTypeEnum = pgEnum("account_type", [
  "direct_client",
  "agency",
  "buying_house",
]);

export const mediaTypeEnum = pgEnum("media_type", [
  "print",
  "digital",
  "radio",
  "tv",
  "website",
]);

// Lifecycle of a Media Booking Order.
export const bookingOrderStatusEnum = pgEnum("booking_order_status", [
  "draft",
  "sent",
  "confirmed",
  "cancelled",
  "invoiced",
]);

/* ----------------------------------------------------------------------------
 * COMPANY / TENANT  (supports multiple FAB entities on one install)
 * -------------------------------------------------------------------------- */

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  legalName: varchar("legal_name", { length: 200 }),
  trn: varchar("trn", { length: 15 }), // 15-digit VAT TRN
  tin: varchar("tin", { length: 10 }), // first 10 digits of TRN — PINT AE participant id
  addressLine1: varchar("address_line1", { length: 200 }),
  addressLine2: varchar("address_line2", { length: 200 }),
  city: varchar("city", { length: 100 }),
  emirate: varchar("emirate", { length: 100 }),
  country: varchar("country", { length: 2 }).default("AE").notNull(),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 160 }),
  logoUrl: text("logo_url"),
  baseCurrency: varchar("base_currency", { length: 3 }).default("AED").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const branches = pgTable(
  "branches",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id),
    name: varchar("name", { length: 120 }).notNull(),
    code: varchar("code", { length: 20 }).notNull(), // used in doc numbering scope
    isActive: boolean("is_active").default(true).notNull(),
  },
  (t) => ({
    branchCodeUq: uniqueIndex("branch_code_uq").on(t.companyId, t.code),
  }),
);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id),
    email: varchar("email", { length: 160 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    passwordHash: text("password_hash"), // omit if using a NextAuth OAuth adapter
    role: userRoleEnum("role").default("viewer").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userEmailUq: uniqueIndex("user_email_uq").on(t.email),
  }),
);

/* ----------------------------------------------------------------------------
 * MASTERS: CUSTOMERS / SUPPLIERS / ITEMS
 * -------------------------------------------------------------------------- */

export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id),
    code: varchar("code", { length: 30 }).notNull(), // CUST-0001
    name: varchar("name", { length: 200 }).notNull(),
    // CRM: what kind of account this is, and (for agency-booked business) the
    // agency this client belongs under. Self-reference within customers.
    accountType: accountTypeEnum("account_type").default("direct_client").notNull(),
    parentAgencyId: integer("parent_agency_id").references(
      (): AnyPgColumn => customers.id,
    ),
    agencyCommissionPct: numeric("agency_commission_pct", { precision: 5, scale: 2 }).default("0").notNull(),
    trn: varchar("trn", { length: 15 }),
    contactPerson: varchar("contact_person", { length: 160 }),
    email: varchar("email", { length: 160 }),
    phone: varchar("phone", { length: 40 }),
    billingAddress: text("billing_address"),
    shippingAddress: text("shipping_address"),
    city: varchar("city", { length: 100 }),
    country: varchar("country", { length: 2 }).default("AE"),
    paymentTermsDays: integer("payment_terms_days").default(0).notNull(),
    creditLimitFils: bigint("credit_limit_fils", { mode: "number" }).default(0),
    openingBalanceFils: bigint("opening_balance_fils", { mode: "number" }).default(0),
    currency: varchar("currency", { length: 3 }).default("AED").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    customerCodeUq: uniqueIndex("customer_code_uq").on(t.companyId, t.code),
    customerNameIdx: index("customer_name_idx").on(t.companyId, t.name),
  }),
);

export const suppliers = pgTable(
  "suppliers",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id),
    code: varchar("code", { length: 30 }).notNull(), // SUPP-0001
    name: varchar("name", { length: 200 }).notNull(),
    trn: varchar("trn", { length: 15 }),
    contactPerson: varchar("contact_person", { length: 160 }),
    email: varchar("email", { length: 160 }),
    phone: varchar("phone", { length: 40 }),
    address: text("address"),
    city: varchar("city", { length: 100 }),
    country: varchar("country", { length: 2 }).default("AE"),
    paymentTermsDays: integer("payment_terms_days").default(0).notNull(),
    openingBalanceFils: bigint("opening_balance_fils", { mode: "number" }).default(0),
    currency: varchar("currency", { length: 3 }).default("AED").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    supplierCodeUq: uniqueIndex("supplier_code_uq").on(t.companyId, t.code),
    supplierNameIdx: index("supplier_name_idx").on(t.companyId, t.name),
  }),
);

export const items = pgTable(
  "items",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id),
    code: varchar("code", { length: 40 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    unitOfMeasure: varchar("unit_of_measure", { length: 20 }).default("unit"),
    unitPriceFils: bigint("unit_price_fils", { mode: "number" }).default(0).notNull(),
    taxCategory: taxCategoryEnum("tax_category").default("standard").notNull(),
    vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).default("5.00").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (t) => ({
    itemCodeUq: uniqueIndex("item_code_uq").on(t.companyId, t.code),
  }),
);

/* ----------------------------------------------------------------------------
 * DOCUMENTS  (unified header: quotation / invoice / delivery_note / PO)
 * -------------------------------------------------------------------------- */

export const documents = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id),
    branchId: integer("branch_id").references(() => branches.id),
    type: documentTypeEnum("type").notNull(),
    number: varchar("number", { length: 40 }).notNull(), // INV-2026-0001 (gap-free)
    partyType: partyTypeEnum("party_type").notNull(),
    customerId: integer("customer_id").references(() => customers.id),
    supplierId: integer("supplier_id").references(() => suppliers.id),
    status: documentStatusEnum("status").default("draft").notNull(),
    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date"), // invoice due / quote valid-until
    reference: varchar("reference", { length: 120 }), // customer PO ref, LPO no, etc.

    // Currency
    currency: varchar("currency", { length: 3 }).default("AED").notNull(),
    exchangeRate: numeric("exchange_rate", { precision: 12, scale: 6 }).default("1").notNull(),

    // Money totals (fils) — computed from lines, stored for reporting speed
    subtotalFils: bigint("subtotal_fils", { mode: "number" }).default(0).notNull(),
    discountTotalFils: bigint("discount_total_fils", { mode: "number" }).default(0).notNull(),
    vatTotalFils: bigint("vat_total_fils", { mode: "number" }).default(0).notNull(),
    grandTotalFils: bigint("grand_total_fils", { mode: "number" }).default(0).notNull(),
    amountPaidFils: bigint("amount_paid_fils", { mode: "number" }).default(0).notNull(),

    notes: text("notes"),
    terms: text("terms"),
    paymentTerms: text("payment_terms"),
    bankDetails: text("bank_details"),

    // Conversion lineage: quote -> invoice -> DN, or PO -> receipt
    sourceDocumentId: integer("source_document_id").references(
      (): AnyPgColumn => documents.id,
    ),

    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    docNumberUq: uniqueIndex("doc_number_uq").on(t.companyId, t.type, t.number),
    docPartyIdx: index("doc_party_idx").on(t.companyId, t.partyType, t.status),
    docTypeDateIdx: index("doc_type_date_idx").on(t.companyId, t.type, t.issueDate),
  }),
);

export const documentLines = pgTable(
  "document_lines",
  {
    id: serial("id").primaryKey(),
    documentId: integer("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    lineNo: integer("line_no").notNull(),
    itemId: integer("item_id").references(() => items.id),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).default("1").notNull(),
    unitPriceFils: bigint("unit_price_fils", { mode: "number" }).default(0).notNull(),
    discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).default("0"),
    discountAmountFils: bigint("discount_amount_fils", { mode: "number" }).default(0).notNull(),
    taxCategory: taxCategoryEnum("tax_category").default("standard").notNull(),
    vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).default("5.00").notNull(),
    lineSubtotalFils: bigint("line_subtotal_fils", { mode: "number" }).default(0).notNull(),
    vatAmountFils: bigint("vat_amount_fils", { mode: "number" }).default(0).notNull(),
    lineTotalFils: bigint("line_total_fils", { mode: "number" }).default(0).notNull(),
  },
  (t) => ({
    lineDocIdx: index("line_doc_idx").on(t.documentId, t.lineNo),
  }),
);

/* ----------------------------------------------------------------------------
 * PAYMENTS  (receipts = money in, payments = money out)
 * -------------------------------------------------------------------------- */

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id),
    direction: paymentDirectionEnum("direction").notNull(),
    number: varchar("number", { length: 40 }).notNull(), // RCP-2026-0001 / PAY-2026-0001
    partyType: partyTypeEnum("party_type").notNull(),
    customerId: integer("customer_id").references(() => customers.id),
    supplierId: integer("supplier_id").references(() => suppliers.id),
    paymentDate: date("payment_date").notNull(),
    method: paymentMethodEnum("method").default("bank_transfer").notNull(),
    reference: varchar("reference", { length: 120 }), // cheque no / txn id
    amountFils: bigint("amount_fils", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).default("AED").notNull(),
    bankAccountId: integer("bank_account_id").references(() => bankAccounts.id),
    notes: text("notes"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    paymentNumberUq: uniqueIndex("payment_number_uq").on(
      t.companyId,
      t.direction,
      t.number,
    ),
    paymentPartyIdx: index("payment_party_idx").on(t.companyId, t.partyType),
  }),
);

// One payment can settle several invoices/POs; one invoice can be settled by
// several payments. This junction is what makes partial payment work.
export const paymentAllocations = pgTable(
  "payment_allocations",
  {
    id: serial("id").primaryKey(),
    paymentId: integer("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    documentId: integer("document_id")
      .notNull()
      .references(() => documents.id),
    amountAllocatedFils: bigint("amount_allocated_fils", { mode: "number" }).notNull(),
  },
  (t) => ({
    allocPaymentIdx: index("alloc_payment_idx").on(t.paymentId),
    allocDocIdx: index("alloc_doc_idx").on(t.documentId),
  }),
);

/* ----------------------------------------------------------------------------
 * LEDGER  (the AR/AP truth — every invoice & payment posts here)
 *   Debit increases what a customer owes you (AR) / decreases supplier balance.
 *   Party running balance = SUM(debit) - SUM(credit).
 * -------------------------------------------------------------------------- */

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id),
    partyType: partyTypeEnum("party_type").notNull(),
    customerId: integer("customer_id").references(() => customers.id),
    supplierId: integer("supplier_id").references(() => suppliers.id),
    entryDate: date("entry_date").notNull(),
    documentId: integer("document_id").references(() => documents.id),
    paymentId: integer("payment_id").references(() => payments.id),
    description: varchar("description", { length: 200 }),
    debitFils: bigint("debit_fils", { mode: "number" }).default(0).notNull(),
    creditFils: bigint("credit_fils", { mode: "number" }).default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    ledgerCustomerIdx: index("ledger_customer_idx").on(t.customerId, t.entryDate),
    ledgerSupplierIdx: index("ledger_supplier_idx").on(t.supplierId, t.entryDate),
  }),
);

/* ----------------------------------------------------------------------------
 * NUMBER SEQUENCES  (gap-free per company/branch/type/year)
 *   Increment lastNumber inside the same transaction that inserts the document:
 *     UPDATE ... SET last_number = last_number + 1 ... RETURNING last_number;
 *   Row-level lock guarantees no duplicates under concurrency.
 * -------------------------------------------------------------------------- */

export const numberSequences = pgTable(
  "number_sequences",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id),
    branchId: integer("branch_id").references(() => branches.id),
    documentType: varchar("document_type", { length: 30 }).notNull(), // invoice / receipt / payment ...
    year: integer("year").notNull(),
    prefix: varchar("prefix", { length: 12 }).notNull(), // INV / QUO / DN / PO / RCP / PAY
    lastNumber: integer("last_number").default(0).notNull(),
    padding: integer("padding").default(4).notNull(),
  },
  (t) => ({
    seqUq: uniqueIndex("seq_uq").on(
      t.companyId,
      t.branchId,
      t.documentType,
      t.year,
    ),
  }),
);

/* ----------------------------------------------------------------------------
 * BANK & CASH ACCOUNTS
 * -------------------------------------------------------------------------- */

export const bankAccountTypeEnum = pgEnum("bank_account_type", ["bank", "cash", "credit_card"]);

export const bankAccounts = pgTable(
  "bank_accounts",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id),
    name: varchar("name", { length: 120 }).notNull(),
    type: bankAccountTypeEnum("type").default("bank").notNull(),
    bankName: varchar("bank_name", { length: 120 }),
    accountNumber: varchar("account_number", { length: 60 }),
    iban: varchar("iban", { length: 40 }),
    openingBalanceFils: bigint("opening_balance_fils", { mode: "number" }).default(0).notNull(),
    currency: varchar("currency", { length: 3 }).default("AED").notNull(),
    creditLimitFils: bigint("credit_limit_fils", { mode: "number" }).default(0).notNull(),
    last4: varchar("last4", { length: 4 }),
    statementDay: integer("statement_day"),
    dueDay: integer("due_day"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    bankAccountNameIdx: index("bank_account_name_idx").on(t.companyId, t.name),
  }),
);

/* ============================================================================
 * MEDIASYNC — CRM CONTACTS, MEDIA CHANNELS & MULTI-CURRENCY / TAX ENGINE
 * ========================================================================== */

/* ----------------------------------------------------------------------------
 * CONTACTS  (stakeholders belonging to a CRM account = customers row)
 * -------------------------------------------------------------------------- */

export const contacts = pgTable(
  "contacts",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    role: varchar("role", { length: 120 }), // e.g. Media Buyer, Marketing Manager
    email: varchar("email", { length: 160 }),
    phone: varchar("phone", { length: 40 }),
    isPrimary: boolean("is_primary").default(false).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    contactAccountIdx: index("contact_account_idx").on(t.companyId, t.customerId),
  }),
);

/* ----------------------------------------------------------------------------
 * MEDIA CHANNELS  (Print / Digital / Radio properties this agency deals in)
 * -------------------------------------------------------------------------- */

export const mediaChannels = pgTable(
  "media_channels",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id),
    mediaType: mediaTypeEnum("media_type").notNull(),
    name: varchar("name", { length: 160 }).notNull(), // "Gulf News", "Radio 1 FM", "example.com"
    code: varchar("code", { length: 30 }).notNull(),
    // Buy-side vendor (publisher / station / network) this channel is sourced from.
    vendorId: integer("vendor_id").references(() => suppliers.id),
    isActive: boolean("is_active").default(true).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    channelCodeUq: uniqueIndex("channel_code_uq").on(t.companyId, t.code),
    channelTypeIdx: index("channel_type_idx").on(t.companyId, t.mediaType),
  }),
);

/* ----------------------------------------------------------------------------
 * CURRENCIES  (documents transact in these; company base is companies.baseCurrency)
 * -------------------------------------------------------------------------- */

export const currencies = pgTable(
  "currencies",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id),
    code: varchar("code", { length: 3 }).notNull(), // AED, USD, EUR
    name: varchar("name", { length: 60 }).notNull(),
    symbol: varchar("symbol", { length: 8 }),
    decimals: integer("decimals").default(2).notNull(), // minor units per major (100 = 2dp)
    isActive: boolean("is_active").default(true).notNull(),
  },
  (t) => ({
    currencyCodeUq: uniqueIndex("currency_code_uq").on(t.companyId, t.code),
  }),
);

/* ----------------------------------------------------------------------------
 * FX RATES  (rate to convert 1 unit of `currencyCode` into the base currency,
 *   captured on financial documents at their issue date for reporting.)
 * -------------------------------------------------------------------------- */

export const fxRates = pgTable(
  "fx_rates",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    rateToBase: numeric("rate_to_base", { precision: 18, scale: 8 }).notNull(),
    asOfDate: date("as_of_date").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    fxLookupIdx: index("fx_lookup_idx").on(t.companyId, t.currencyCode, t.asOfDate),
  }),
);

/* ----------------------------------------------------------------------------
 * TAX RULES  (generalises the fixed UAE 5% VAT to multi-jurisdiction:
 *   resolve a rate by country + tax category, effective on the document date.)
 * -------------------------------------------------------------------------- */

export const taxRules = pgTable(
  "tax_rules",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id),
    name: varchar("name", { length: 120 }).notNull(), // "UAE VAT 5%", "US Sales Tax — exempt"
    country: varchar("country", { length: 2 }).default("AE").notNull(),
    category: taxCategoryEnum("category").default("standard").notNull(),
    ratePct: numeric("rate_pct", { precision: 5, scale: 2 }).default("0").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    effectiveFrom: date("effective_from"),
    effectiveTo: date("effective_to"),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (t) => ({
    taxRuleLookupIdx: index("tax_rule_lookup_idx").on(t.companyId, t.country, t.category),
  }),
);

/* ============================================================================
 * MEDIA BOOKING ORDER  (BO-MS-####) — the central sell/buy document.
 *   Money columns store integer MINOR UNITS of the BO's own currency
 *   (2-decimal currencies: 1 unit = 100 minor). Totals are computed per line
 *   then summed (see src/lib/booking-order.ts) and stored for reporting speed.
 * ========================================================================== */

export const bookingOrders = pgTable(
  "booking_orders",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id),
    number: varchar("number", { length: 40 }).notNull(), // BO-MS-1001
    status: bookingOrderStatusEnum("status").default("draft").notNull(),

    // "To" — the publisher/media the space is booked with.
    publisherVendorId: integer("publisher_vendor_id").references(() => suppliers.id),
    toName: varchar("to_name", { length: 200 }),

    // The buyer chain — free-text so both agency and direct-advertiser BOs work,
    // with an optional CRM link for reporting.
    accountId: integer("account_id").references(() => customers.id),
    advertiser: varchar("advertiser", { length: 200 }),
    agency: varchar("agency", { length: 200 }),
    client: varchar("client", { length: 200 }),
    brand: varchar("brand", { length: 200 }),
    campaign: varchar("campaign", { length: 200 }),
    medium: varchar("medium", { length: 120 }),

    currency: varchar("currency", { length: 3 }).default("AED").notNull(),
    exchangeRate: numeric("exchange_rate", { precision: 18, scale: 8 }).default("1").notNull(),
    issueDate: date("issue_date").notNull(),
    paymentTerms: varchar("payment_terms", { length: 200 }),

    agencyDiscountPct: numeric("agency_discount_pct", { precision: 5, scale: 2 }).default("0").notNull(),
    vatRatePct: numeric("vat_rate_pct", { precision: 5, scale: 2 }).default("5").notNull(),

    // Totals (minor units of `currency`)
    totalGrossFils: bigint("total_gross_fils", { mode: "number" }).default(0).notNull(),
    lineDiscountFils: bigint("line_discount_fils", { mode: "number" }).default(0).notNull(),
    agencyDiscountFils: bigint("agency_discount_fils", { mode: "number" }).default(0).notNull(),
    totalNetFils: bigint("total_net_fils", { mode: "number" }).default(0).notNull(),
    vatFils: bigint("vat_fils", { mode: "number" }).default(0).notNull(),
    grandTotalFils: bigint("grand_total_fils", { mode: "number" }).default(0).notNull(),
    // Buy-side (internal): total media cost payable, and margin = net - cost.
    totalCostFils: bigint("total_cost_fils", { mode: "number" }).default(0).notNull(),
    marginFils: bigint("margin_fils", { mode: "number" }).default(0).notNull(),

    notes: text("notes"),
    terms: text("terms"), // null = use default T&C content
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    boNumberUq: uniqueIndex("bo_number_uq").on(t.companyId, t.number),
    boStatusIdx: index("bo_status_idx").on(t.companyId, t.status, t.issueDate),
  }),
);

export const bookingOrderLines = pgTable(
  "booking_order_lines",
  {
    id: serial("id").primaryKey(),
    bookingOrderId: integer("booking_order_id")
      .notNull()
      .references(() => bookingOrders.id, { onDelete: "cascade" }),
    lineNo: integer("line_no").notNull(),
    mediaType: mediaTypeEnum("media_type").default("digital").notNull(),
    channelId: integer("channel_id").references(() => mediaChannels.id),
    platform: varchar("platform", { length: 200 }), // "The National"
    particulars: text("particulars"), // "Advertorial"
    brandingDetails: text("branding_details"),
    period: text("period"), // "3 days home page + …"
    quantity: numeric("quantity", { precision: 12, scale: 2 }).default("1").notNull(),
    uom: varchar("uom", { length: 40 }), // Article, Spot, Insertion…
    unitGrossFils: bigint("unit_gross_fils", { mode: "number" }).default(0).notNull(),
    discountPct: numeric("discount_pct", { precision: 5, scale: 2 }).default("0").notNull(),
    unitNetFils: bigint("unit_net_fils", { mode: "number" }).default(0).notNull(),
    lineGrossFils: bigint("line_gross_fils", { mode: "number" }).default(0).notNull(),
    lineNetFils: bigint("line_net_fils", { mode: "number" }).default(0).notNull(),
    // Buy-side (internal): unit cost payable to the publisher, and line cost.
    unitCostFils: bigint("unit_cost_fils", { mode: "number" }).default(0).notNull(),
    lineCostFils: bigint("line_cost_fils", { mode: "number" }).default(0).notNull(),
    annexure: text("annexure"), // JSON: per-day schedule
  },
  (t) => ({
    boLineIdx: index("bo_line_idx").on(t.bookingOrderId, t.lineNo),
  }),
);

/* ============================================================================
 * RATE CARDS — reusable priced offerings that pre-fill Booking Order lines.
 *   Flat model (matches BO lines): one item table across all media types.
 *   unit_gross_fils = minor units of the rate card's currency.
 * ========================================================================== */

export const rateCards = pgTable(
  "rate_cards",
  {
    id: serial("id").primaryKey(),
    companyId: integer("company_id")
      .notNull()
      .references(() => companies.id),
    name: varchar("name", { length: 160 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("AED").notNull(),
    validFrom: date("valid_from"),
    validTo: date("valid_to"),
    isActive: boolean("is_active").default(true).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    rateCardNameIdx: index("rate_card_name_idx").on(t.companyId, t.name),
  }),
);

export const rateCardItems = pgTable(
  "rate_card_items",
  {
    id: serial("id").primaryKey(),
    rateCardId: integer("rate_card_id")
      .notNull()
      .references(() => rateCards.id, { onDelete: "cascade" }),
    mediaType: mediaTypeEnum("media_type").default("digital").notNull(),
    channelId: integer("channel_id").references(() => mediaChannels.id),
    platform: varchar("platform", { length: 200 }),
    particulars: text("particulars"),
    brandingDetails: text("branding_details"),
    uom: varchar("uom", { length: 40 }),
    unitGrossFils: bigint("unit_gross_fils", { mode: "number" }).default(0).notNull(),
    defaultDiscountPct: numeric("default_discount_pct", { precision: 5, scale: 2 }).default("0").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (t) => ({
    rateCardItemIdx: index("rate_card_item_idx").on(t.rateCardId, t.sortOrder),
  }),
);
