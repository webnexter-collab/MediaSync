"use server";

import { assertCanWrite } from "@/lib/auth";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { documents, documentLines } from "@/db/schema";
import {
  invoiceSchema,
  rateForCategory,
  type FormState,
} from "@/lib/validators";
import { toFils } from "@/lib/money";
import { computeLine, computeTotals, type LineInput } from "@/lib/vat";
import { nextNumber } from "@/lib/numbering";

const COMPANY_ID = 1;

type ParsedResult =
  | { ok: true; data: import("@/lib/validators").InvoiceInput }
  | { ok: false; state: FormState };

function parseInvoice(formData: FormData): ParsedResult {
  let lines: unknown = [];
  try {
    lines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    return { ok: false, state: { ok: false, message: "Invalid line data" } };
  }
  const parsed = invoiceSchema.safeParse({
    customerId: formData.get("customerId"),
    issueDate: formData.get("issueDate"),
    dueDate: formData.get("dueDate") || undefined,
    reference: formData.get("reference"),
    notes: formData.get("notes"),
    terms: formData.get("terms"),
    paymentTerms: formData.get("paymentTerms"),
    bankDetails: formData.get("bankDetails"),
    lines,
  });
  if (!parsed.success) {
    return {
      ok: false,
      state: { ok: false, errors: parsed.error.flatten().fieldErrors, message: firstError(parsed.error.flatten()) },
    };
  }
  return { ok: true, data: parsed.data };
}

function firstError(f: { formErrors: string[]; fieldErrors: Record<string, string[] | undefined> }): string | undefined {
  if (f.formErrors[0]) return f.formErrors[0];
  for (const k of Object.keys(f.fieldErrors)) {
    const v = f.fieldErrors[k];
    if (v?.[0]) return v[0];
  }
  return undefined;
}

/** Map validated form lines into VAT engine inputs (fils + implied rate). */
function toLineInputs(data: import("@/lib/validators").InvoiceInput): LineInput[] {
  return data.lines.map((l) => ({
    quantity: l.quantity,
    unitPriceFils: toFils(l.unitPriceAed),
    discountPercent: l.discountPercent,
    taxCategory: l.taxCategory,
    vatRate: rateForCategory(l.taxCategory),
  }));
}

export async function createInvoice(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await assertCanWrite();
  const res = parseInvoice(formData);
  if (!res.ok) return res.state;
  const data = res.data;

  const inputs = toLineInputs(data);
  const { totals } = computeTotals(inputs);

  let newId: number;
  try {
    newId = await db.transaction(async (tx) => {
      const number = await nextNumber(tx, {
        companyId: COMPANY_ID,
        kind: "invoice",
        prefix: "INV",
      });

      const [doc] = await tx
        .insert(documents)
        .values({
          companyId: COMPANY_ID,
          type: "invoice",
          number,
          partyType: "customer",
          customerId: data.customerId,
          status: "draft",
          issueDate: data.issueDate,
          dueDate: data.dueDate ?? null,
          reference: data.reference,
          currency: "AED",
          subtotalFils: totals.subtotalFils,
          discountTotalFils: totals.discountTotalFils,
          vatTotalFils: totals.vatTotalFils,
          grandTotalFils: totals.grandTotalFils,
          notes: data.notes,
          terms: data.terms,
          paymentTerms: data.paymentTerms,
          bankDetails: data.bankDetails,
        })
        .returning({ id: documents.id });

      await tx.insert(documentLines).values(
        data.lines.map((l, i) => {
          const r = computeLine({
            quantity: l.quantity,
            unitPriceFils: toFils(l.unitPriceAed),
            discountPercent: l.discountPercent,
            taxCategory: l.taxCategory,
            vatRate: rateForCategory(l.taxCategory),
          });
          return {
            documentId: doc.id,
            lineNo: i + 1,
            itemId: l.itemId ?? null,
            description: l.description,
            quantity: String(l.quantity),
            unitPriceFils: toFils(l.unitPriceAed),
            discountPercent: String(l.discountPercent),
            taxCategory: l.taxCategory,
            vatRate: String(rateForCategory(l.taxCategory)),
            lineSubtotalFils: r.lineSubtotalFils,
            vatAmountFils: r.vatAmountFils,
            lineTotalFils: r.lineTotalFils,
          };
        }),
      );

      return doc.id;
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, message: `Could not create invoice: ${msg}` };
  }

  revalidatePath("/invoices");
  redirect(`/invoices/${newId}`);
}

export async function updateInvoice(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await assertCanWrite();
  const res = parseInvoice(formData);
  if (!res.ok) return res.state;
  const data = res.data;

  const inputs = toLineInputs(data);
  const { totals } = computeTotals(inputs);

  try {
    await db.transaction(async (tx) => {
      // Only drafts are editable; keep the existing number.
      await tx
        .update(documents)
        .set({
          customerId: data.customerId,
          issueDate: data.issueDate,
          dueDate: data.dueDate ?? null,
          reference: data.reference,
          subtotalFils: totals.subtotalFils,
          discountTotalFils: totals.discountTotalFils,
          vatTotalFils: totals.vatTotalFils,
          grandTotalFils: totals.grandTotalFils,
          notes: data.notes,
          terms: data.terms,
          paymentTerms: data.paymentTerms,
          bankDetails: data.bankDetails,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(documents.id, id),
            eq(documents.companyId, COMPANY_ID),
            eq(documents.status, "draft"),
          ),
        );

      await tx.delete(documentLines).where(eq(documentLines.documentId, id));
      await tx.insert(documentLines).values(
        data.lines.map((l, i) => {
          const r = computeLine({
            quantity: l.quantity,
            unitPriceFils: toFils(l.unitPriceAed),
            discountPercent: l.discountPercent,
            taxCategory: l.taxCategory,
            vatRate: rateForCategory(l.taxCategory),
          });
          return {
            documentId: id,
            lineNo: i + 1,
            itemId: l.itemId ?? null,
            description: l.description,
            quantity: String(l.quantity),
            unitPriceFils: toFils(l.unitPriceAed),
            discountPercent: String(l.discountPercent),
            taxCategory: l.taxCategory,
            vatRate: String(rateForCategory(l.taxCategory)),
            lineSubtotalFils: r.lineSubtotalFils,
            vatAmountFils: r.vatAmountFils,
            lineTotalFils: r.lineTotalFils,
          };
        }),
      );
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, message: `Could not update invoice: ${msg}` };
  }

  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}

export async function setInvoiceStatus(
  id: number,
  status: "draft" | "sent" | "cancelled",
) {
  await assertCanWrite();
  await db
    .update(documents)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.companyId, COMPANY_ID)));
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
}
