import type { FieldDef } from "@/components/master-form";
import { toAed } from "./money";

type CustomerRow = typeof import("@/db/schema").customers.$inferSelect;
type SupplierRow = typeof import("@/db/schema").suppliers.$inferSelect;

const ACCOUNT_TYPE_OPTIONS = [
  { value: "direct_client", label: "Direct client" },
  { value: "agency", label: "Agency" },
  { value: "buying_house", label: "Buying house" },
  { value: "advertiser", label: "Advertiser" },
];

export type AccountFormOptions = {
  agencies?: { value: string; label: string }[];
  currencies?: { value: string; label: string }[];
};

export function customerFields(
  row?: CustomerRow,
  suggestedCode?: string,
  opts: AccountFormOptions = {},
): FieldDef[] {
  const agencyOptions = [
    { value: "", label: "— None (direct) —" },
    ...(opts.agencies ?? []),
  ];
  const currencyOptions = opts.currencies ?? [{ value: "AED", label: "AED" }];
  return [
    { name: "code", label: "Account code", required: true, half: true, placeholder: "ACC-0001", defaultValue: row?.code ?? suggestedCode },
    { name: "name", label: "Account name", required: true, half: true, defaultValue: row?.name },
    { name: "accountType", label: "Account type", type: "select", half: true, options: ACCOUNT_TYPE_OPTIONS, defaultValue: row?.accountType ?? "direct_client" },
    { name: "parentAgencyId", label: "Parent agency", type: "select", half: true, options: agencyOptions, defaultValue: row?.parentAgencyId != null ? String(row.parentAgencyId) : "", hint: "For clients booked through an agency" },
    { name: "agencyCommissionPct", label: "Agency commission (%)", type: "number", half: true, defaultValue: row?.agencyCommissionPct ?? 0, hint: "Applied on agency/buying-house proposals" },
    { name: "currency", label: "Default currency", type: "select", half: true, options: currencyOptions, defaultValue: row?.currency ?? "AED" },
    { name: "trn", label: "TRN", half: true, placeholder: "15 digits", defaultValue: row?.trn ?? undefined },
    { name: "contactPerson", label: "Primary contact", half: true, defaultValue: row?.contactPerson ?? undefined },
    { name: "email", label: "Email", type: "email", half: true, defaultValue: row?.email ?? undefined },
    { name: "phone", label: "Phone", half: true, defaultValue: row?.phone ?? undefined },
    { name: "paymentTermsDays", label: "Payment terms (days)", type: "number", half: true, defaultValue: row?.paymentTermsDays ?? 0 },
    { name: "creditLimitAed", label: "Credit limit (AED)", type: "number", half: true, defaultValue: row ? toAed(row.creditLimitFils ?? 0) : 0 },
    { name: "billingAddress", label: "Billing address", type: "textarea", defaultValue: row?.billingAddress ?? undefined },
    { name: "shippingAddress", label: "Shipping address", type: "textarea", defaultValue: row?.shippingAddress ?? undefined },
    { name: "city", label: "City", half: true, defaultValue: row?.city ?? undefined },
    { name: "country", label: "Country", half: true, defaultValue: row?.country ?? "AE" },
    { name: "notes", label: "Notes", type: "textarea", defaultValue: row?.notes ?? undefined },
    { name: "isActive", label: "Active", type: "toggle", defaultValue: row ? row.isActive : true },
  ];
}

export function supplierFields(row?: SupplierRow, suggestedCode?: string): FieldDef[] {
  return [
    { name: "code", label: "Publisher code", required: true, half: true, placeholder: "VEN-0001", defaultValue: row?.code ?? suggestedCode },
    { name: "name", label: "Name", required: true, half: true, defaultValue: row?.name },
    { name: "trn", label: "TRN", half: true, placeholder: "15 digits", defaultValue: row?.trn ?? undefined },
    { name: "contactPerson", label: "Contact person", half: true, defaultValue: row?.contactPerson ?? undefined },
    { name: "email", label: "Email", type: "email", half: true, defaultValue: row?.email ?? undefined },
    { name: "phone", label: "Phone", half: true, defaultValue: row?.phone ?? undefined },
    { name: "paymentTermsDays", label: "Payment terms (days)", type: "number", half: true, defaultValue: row?.paymentTermsDays ?? 0 },
    { name: "currency", label: "Currency", half: true, defaultValue: row?.currency ?? "AED" },
    { name: "address", label: "Address", type: "textarea", defaultValue: row?.address ?? undefined },
    { name: "city", label: "City", half: true, defaultValue: row?.city ?? undefined },
    { name: "country", label: "Country", half: true, defaultValue: row?.country ?? "AE" },
    { name: "notes", label: "Notes", type: "textarea", defaultValue: row?.notes ?? undefined },
    { name: "isActive", label: "Active", type: "toggle", defaultValue: row ? row.isActive : true },
  ];
}

const TAX_OPTIONS = [
  { value: "standard", label: "Standard (5%)" },
  { value: "zero_rated", label: "Zero-rated (0%)" },
  { value: "exempt", label: "Exempt" },
  { value: "reverse_charge", label: "Reverse charge" },
  { value: "out_of_scope", label: "Out of scope" },
];

type ItemRow = typeof import("@/db/schema").items.$inferSelect;

export function itemFields(row?: ItemRow): FieldDef[] {
  return [
    { name: "code", label: "Item code", required: true, half: true, placeholder: "ITM-0001", defaultValue: row?.code },
    { name: "name", label: "Name", required: true, half: true, defaultValue: row?.name },
    { name: "unitPriceAed", label: "Unit price (AED)", type: "number", half: true, defaultValue: row ? toAed(row.unitPriceFils ?? 0) : 0 },
    { name: "unitOfMeasure", label: "Unit of measure", half: true, placeholder: "unit / hour / kg", defaultValue: row?.unitOfMeasure ?? "unit" },
    { name: "taxCategory", label: "Tax category", type: "select", half: true, options: TAX_OPTIONS, defaultValue: row?.taxCategory ?? "standard" },
    { name: "description", label: "Description", type: "textarea", defaultValue: row?.description ?? undefined },
    { name: "isActive", label: "Active", type: "toggle", defaultValue: row ? row.isActive : true },
  ];
}

const MEDIA_TYPE_OPTIONS = [
  { value: "print", label: "Print" },
  { value: "digital", label: "Digital" },
  { value: "radio", label: "Radio" },
];

type MediaChannelRow = typeof import("@/db/schema").mediaChannels.$inferSelect;

export function mediaChannelFields(
  row?: MediaChannelRow,
  vendors: { value: string; label: string }[] = [],
): FieldDef[] {
  return [
    { name: "name", label: "Channel name", required: true, half: true, placeholder: "Gulf News — Main Edition", defaultValue: row?.name },
    { name: "code", label: "Code", required: true, half: true, placeholder: "PR-GN-MAIN", defaultValue: row?.code },
    { name: "mediaType", label: "Media type", type: "select", half: true, options: MEDIA_TYPE_OPTIONS, defaultValue: row?.mediaType ?? "print" },
    { name: "vendorId", label: "Source publisher", type: "select", half: true, options: [{ value: "", label: "— None —" }, ...vendors], defaultValue: row?.vendorId != null ? String(row.vendorId) : "", hint: "Media owner / station / network" },
    { name: "notes", label: "Notes", type: "textarea", defaultValue: row?.notes ?? undefined },
    { name: "isActive", label: "Active", type: "toggle", defaultValue: row ? row.isActive : true },
  ];
}

export function taxRuleFields(row?: typeof import("@/db/schema").taxRules.$inferSelect): FieldDef[] {
  return [
    { name: "name", label: "Rule name", required: true, half: true, placeholder: "UAE VAT 5%", defaultValue: row?.name },
    { name: "country", label: "Country (ISO-2)", required: true, half: true, placeholder: "AE", defaultValue: row?.country ?? "AE" },
    { name: "category", label: "Tax category", type: "select", half: true, options: TAX_OPTIONS, defaultValue: row?.category ?? "standard" },
    { name: "ratePct", label: "Rate (%)", type: "number", half: true, defaultValue: row?.ratePct ?? 0 },
    { name: "isDefault", label: "Default rule", type: "toggle", defaultValue: row ? row.isDefault : false },
    { name: "isActive", label: "Active", type: "toggle", defaultValue: row ? row.isActive : true },
  ];
}

export function currencyFields(
  row?: typeof import("@/db/schema").currencies.$inferSelect,
  latestRate?: string | number,
): FieldDef[] {
  return [
    { name: "code", label: "Code (ISO-3)", required: true, half: true, placeholder: "USD", defaultValue: row?.code, hint: row ? "Cannot be changed" : undefined },
    { name: "name", label: "Name", required: true, half: true, placeholder: "US Dollar", defaultValue: row?.name },
    { name: "symbol", label: "Symbol", half: true, placeholder: "$", defaultValue: row?.symbol ?? undefined },
    { name: "decimals", label: "Decimals", type: "number", half: true, defaultValue: row?.decimals ?? 2 },
    { name: "rateToBase", label: "Rate to base (AED)", type: "number", half: true, defaultValue: latestRate ?? 1, hint: "1 unit = this many AED" },
    { name: "isActive", label: "Active", type: "toggle", defaultValue: row ? row.isActive : true },
  ];
}

export function rateCardFields(
  row?: typeof import("@/db/schema").rateCards.$inferSelect,
  currencies: { value: string; label: string }[] = [{ value: "AED", label: "AED" }],
): FieldDef[] {
  return [
    { name: "name", label: "Rate card name", required: true, half: true, placeholder: "The National — 2026 Rates", defaultValue: row?.name },
    { name: "currency", label: "Currency", type: "select", half: true, options: currencies, defaultValue: row?.currency ?? "AED" },
    { name: "validFrom", label: "Valid from", type: "date", half: true, defaultValue: row?.validFrom ?? undefined },
    { name: "validTo", label: "Valid to", type: "date", half: true, defaultValue: row?.validTo ?? undefined },
    { name: "notes", label: "Notes", type: "textarea", defaultValue: row?.notes ?? undefined },
    { name: "isActive", label: "Active", type: "toggle", defaultValue: row ? row.isActive : true },
  ];
}

const ACCT_TYPE_OPTIONS = [
  { value: "bank", label: "Bank account" },
  { value: "cash", label: "Cash / petty cash" },
  { value: "credit_card", label: "Credit card" },
];

type BankAccountRow = typeof import("@/db/schema").bankAccounts.$inferSelect;

export function bankAccountFields(row?: BankAccountRow): FieldDef[] {
  return [
    { name: "name", label: "Account name", required: true, half: true, placeholder: "Emirates NBD — Current", defaultValue: row?.name },
    { name: "type", label: "Type", type: "select", half: true, options: ACCT_TYPE_OPTIONS, defaultValue: row?.type ?? "bank" },
    { name: "bankName", label: "Bank / issuer", half: true, defaultValue: row?.bankName ?? undefined },
    { name: "accountNumber", label: "Account number", half: true, defaultValue: row?.accountNumber ?? undefined },
    { name: "iban", label: "IBAN", half: true, defaultValue: row?.iban ?? undefined },
    { name: "openingBalanceAed", label: "Opening balance / owed (AED)", type: "number", half: true, defaultValue: row ? toAed(row.openingBalanceFils ?? 0) : 0 },
    { name: "creditLimitAed", label: "Credit limit (AED) — cards only", type: "number", half: true, defaultValue: row ? toAed(row.creditLimitFils ?? 0) : 0 },
    { name: "last4", label: "Card last 4 — cards only", half: true, defaultValue: row?.last4 ?? undefined, placeholder: "1234" },
    { name: "statementDay", label: "Statement day (1–31)", type: "number", half: true, defaultValue: row?.statementDay ?? undefined },
    { name: "dueDay", label: "Payment due day (1–31)", type: "number", half: true, defaultValue: row?.dueDay ?? undefined },
    { name: "currency", label: "Currency", half: true, defaultValue: row?.currency ?? "AED" },
    { name: "isActive", label: "Active", type: "toggle", defaultValue: row ? row.isActive : true },
  ];
}
