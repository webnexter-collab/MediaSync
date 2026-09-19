import { z } from "zod";

const optionalStr = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

// UAE TRN is 15 digits when present.
const trn = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v))
  .refine((v) => v === undefined || /^\d{15}$/.test(v), {
    message: "TRN must be 15 digits",
  });

export const accountTypeValues = ["direct_client", "agency", "buying_house"] as const;

export const customerSchema = z.object({
  code: z.string().trim().min(1, "Code is required").max(30),
  name: z.string().trim().min(1, "Name is required").max(200),
  accountType: z.enum(accountTypeValues).default("direct_client"),
  parentAgencyId: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
    z.number().int().positive().nullable(),
  ),
  agencyCommissionPct: z.coerce.number().min(0).max(100).default(0),
  trn,
  contactPerson: optionalStr,
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => v === undefined || z.string().email().safeParse(v).success, {
      message: "Invalid email",
    }),
  phone: optionalStr,
  billingAddress: optionalStr,
  shippingAddress: optionalStr,
  city: optionalStr,
  country: z.string().trim().max(2).default("AE"),
  paymentTermsDays: z.coerce.number().int().min(0).max(365).default(0),
  creditLimitAed: z.coerce.number().min(0).default(0),
  currency: z.string().trim().max(3).default("AED"),
  notes: optionalStr,
  isActive: z.coerce.boolean().default(true),
});

export const supplierSchema = z.object({
  code: z.string().trim().min(1, "Code is required").max(30),
  name: z.string().trim().min(1, "Name is required").max(200),
  trn,
  contactPerson: optionalStr,
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => v === undefined || z.string().email().safeParse(v).success, {
      message: "Invalid email",
    }),
  phone: optionalStr,
  address: optionalStr,
  city: optionalStr,
  country: z.string().trim().max(2).default("AE"),
  paymentTermsDays: z.coerce.number().int().min(0).max(365).default(0),
  currency: z.string().trim().max(3).default("AED"),
  notes: optionalStr,
  isActive: z.coerce.boolean().default(true),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;

export type FormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

/* ---------------- Items ---------------- */

export const taxCategoryValues = [
  "standard",
  "zero_rated",
  "exempt",
  "out_of_scope",
  "reverse_charge",
] as const;

export const itemSchema = z.object({
  code: z.string().trim().min(1, "Code is required").max(40),
  name: z.string().trim().min(1, "Name is required").max(200),
  description: optionalStr,
  unitOfMeasure: z.string().trim().max(20).default("unit"),
  unitPriceAed: z.coerce.number().min(0).default(0),
  taxCategory: z.enum(taxCategoryValues).default("standard"),
  isActive: z.coerce.boolean().default(true),
});
export type ItemInput = z.infer<typeof itemSchema>;

/* ---------------- Invoices ---------------- */

export const invoiceLineSchema = z.object({
  itemId: z.coerce.number().int().positive().nullable().optional(),
  description: z.string().trim().min(1, "Description required").max(500),
  quantity: z.coerce.number().positive("Qty must be > 0"),
  unitPriceAed: z.coerce.number().min(0),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  taxCategory: z.enum(taxCategoryValues).default("standard"),
});

export const invoiceSchema = z.object({
  customerId: z.coerce.number().int().positive("Select a customer"),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  dueDate: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => v === undefined || /^\d{4}-\d{2}-\d{2}$/.test(v), "Invalid date"),
  reference: optionalStr,
  notes: optionalStr,
  terms: optionalStr,
  paymentTerms: optionalStr,
  bankDetails: optionalStr,
  lines: z.array(invoiceLineSchema).min(1, "Add at least one line"),
});
export type InvoiceInput = z.infer<typeof invoiceSchema>;

/** VAT rate implied by category (standard = 5%, everything else = 0%). */
export function rateForCategory(cat: (typeof taxCategoryValues)[number]): number {
  return cat === "standard" || cat === "reverse_charge" ? 5 : 0;
}

/* ---------------- Delivery Notes ---------------- */

export const deliveryLineSchema = z.object({
  itemId: z.coerce.number().int().positive().nullable().optional(),
  description: z.string().trim().min(1, "Description required").max(500),
  quantity: z.coerce.number().positive("Qty must be > 0"),
});

export const deliveryNoteSchema = z.object({
  customerId: z.coerce.number().int().positive("Select a customer"),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  reference: optionalStr,
  notes: optionalStr,
  lines: z.array(deliveryLineSchema).min(1, "Add at least one line"),
});
export type DeliveryNoteInput = z.infer<typeof deliveryNoteSchema>;

/* ---------------- Receipts ---------------- */

export const paymentMethodValues = ["cash", "bank_transfer", "cheque", "card", "other"] as const;

export const receiptAllocationSchema = z.object({
  documentId: z.coerce.number().int().positive(),
  amountAed: z.coerce.number().min(0),
});

export const receiptSchema = z
  .object({
    customerId: z.coerce.number().int().positive("Select a customer"),
    paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
    method: z.enum(paymentMethodValues).default("bank_transfer"),
    reference: optionalStr,
    notes: optionalStr,
    allocations: z.array(receiptAllocationSchema),
  })
  .refine((v) => v.allocations.some((a) => a.amountAed > 0), {
    message: "Allocate an amount to at least one invoice",
    path: ["allocations"],
  });
export type ReceiptInput = z.infer<typeof receiptSchema>;

/* ---------------- Supplier Payments ---------------- */

export const supplierPaymentSchema = z
  .object({
    supplierId: z.coerce.number().int().positive("Select a supplier"),
    paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
    method: z.enum(paymentMethodValues).default("bank_transfer"),
    bankAccountId: z.coerce.number().int().positive().nullable().optional(),
    reference: optionalStr,
    notes: optionalStr,
    allocations: z.array(receiptAllocationSchema),
  })
  .refine((v) => v.allocations.some((a) => a.amountAed > 0), {
    message: "Allocate an amount to at least one order",
    path: ["allocations"],
  });
export type SupplierPaymentInput = z.infer<typeof supplierPaymentSchema>;

/* ---------------- Bank & Cash Accounts ---------------- */

export const bankAccountSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  type: z.enum(["bank", "cash", "credit_card"]).default("bank"),
  bankName: optionalStr,
  accountNumber: optionalStr,
  iban: optionalStr,
  openingBalanceAed: z.coerce.number().default(0),
  currency: z.string().trim().max(3).default("AED"),
  creditLimitAed: z.coerce.number().min(0).default(0),
  last4: z.string().trim().regex(/^\d{4}$/u, "Enter the last 4 digits").optional().or(z.literal("")),
  statementDay: z.coerce.number().int().min(1).max(31).optional().or(z.literal("")),
  dueDay: z.coerce.number().int().min(1).max(31).optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
});
export type BankAccountInput = z.infer<typeof bankAccountSchema>;
