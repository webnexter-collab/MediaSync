import type { FieldDef } from "@/components/master-form";
import { toAed } from "./money";

type CustomerRow = typeof import("@/db/schema").customers.$inferSelect;
type SupplierRow = typeof import("@/db/schema").suppliers.$inferSelect;

export function customerFields(row?: CustomerRow, suggestedCode?: string): FieldDef[] {
  return [
    { name: "code", label: "Customer code", required: true, half: true, placeholder: "CUST-0001", defaultValue: row?.code ?? suggestedCode },
    { name: "name", label: "Name", required: true, half: true, defaultValue: row?.name },
    { name: "trn", label: "TRN", half: true, placeholder: "15 digits", defaultValue: row?.trn ?? undefined },
    { name: "contactPerson", label: "Contact person", half: true, defaultValue: row?.contactPerson ?? undefined },
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
    { name: "code", label: "Supplier code", required: true, half: true, placeholder: "SUPP-0001", defaultValue: row?.code ?? suggestedCode },
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
