"use server";

import { assertCanWrite } from "@/lib/auth";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { documents, documentLines } from "@/db/schema";
import { invoiceSchema, rateForCategory, type FormState, type InvoiceInput } from "@/lib/validators";
import { toFils } from "@/lib/money";
import { computeLine, computeTotals, type LineInput } from "@/lib/vat";
import { nextNumber } from "@/lib/numbering";

const COMPANY_ID = 1;

// The shared invoice form submits the party id as "customerId"; for POs it is the supplier.
function parse(formData: FormData): { ok: true; data: InvoiceInput } | { ok: false; state: FormState } {
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
    lines,
  });
  if (!parsed.success) {
    const f = parsed.error.flatten();
    const msg = f.formErrors[0] ?? Object.values(f.fieldErrors).flat()[0];
    return { ok: false, state: { ok: false, errors: f.fieldErrors, message: msg } };
  }
  return { ok: true, data: parsed.data };
}

function lineInputs(data: InvoiceInput): LineInput[] {
  return data.lines.map((l) => ({
    quantity: l.quantity,
    unitPriceFils: toFils(l.unitPriceAed),
    discountPercent: l.discountPercent,
    taxCategory: l.taxCategory,
    vatRate: rateForCategory(l.taxCategory),
  }));
}

function lineRows(documentId: number, data: InvoiceInput) {
  return data.lines.map((l, i) => {
    const r = computeLine({
      quantity: l.quantity,
      unitPriceFils: toFils(l.unitPriceAed),
      discountPercent: l.discountPercent,
      taxCategory: l.taxCategory,
      vatRate: rateForCategory(l.taxCategory),
    });
    return {
      documentId,
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
  });
}

export async function createPurchaseOrder(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertCanWrite();
  const res = parse(formData);
  if (!res.ok) return res.state;
  const data = res.data;
  const { totals } = computeTotals(lineInputs(data));

  let newId: number;
  try {
    newId = await db.transaction(async (tx) => {
      const number = await nextNumber(tx, { companyId: COMPANY_ID, kind: "purchase_order", prefix: "PO" });
      const [doc] = await tx
        .insert(documents)
        .values({
          companyId: COMPANY_ID,
          type: "purchase_order",
          number,
          partyType: "supplier",
          supplierId: data.customerId, // party id from the shared form
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
        })
        .returning({ id: documents.id });
      await tx.insert(documentLines).values(lineRows(doc.id, data));
      return doc.id;
    });
  } catch (e) {
    return { ok: false, message: `Could not create purchase order: ${e instanceof Error ? e.message : "error"}` };
  }
  revalidatePath("/purchase-orders");
  redirect(`/purchase-orders/${newId}`);
}

export async function updatePurchaseOrder(id: number, _prev: FormState, formData: FormData): Promise<FormState> {
  await assertCanWrite();
  const res = parse(formData);
  if (!res.ok) return res.state;
  const data = res.data;
  const { totals } = computeTotals(lineInputs(data));

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(documents)
        .set({
          supplierId: data.customerId,
          issueDate: data.issueDate,
          dueDate: data.dueDate ?? null,
          reference: data.reference,
          subtotalFils: totals.subtotalFils,
          discountTotalFils: totals.discountTotalFils,
          vatTotalFils: totals.vatTotalFils,
          grandTotalFils: totals.grandTotalFils,
          notes: data.notes,
          terms: data.terms,
          updatedAt: new Date(),
        })
        .where(and(eq(documents.id, id), eq(documents.companyId, COMPANY_ID), eq(documents.status, "draft")));
      await tx.delete(documentLines).where(eq(documentLines.documentId, id));
      await tx.insert(documentLines).values(lineRows(id, data));
    });
  } catch (e) {
    return { ok: false, message: `Could not update purchase order: ${e instanceof Error ? e.message : "error"}` };
  }
  revalidatePath(`/purchase-orders/${id}`);
  redirect(`/purchase-orders/${id}`);
}

export async function setPurchaseOrderStatus(
  id: number,
  status: "draft" | "sent" | "cancelled",
) {
  await assertCanWrite();
  await db
    .update(documents)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.companyId, COMPANY_ID)));
  revalidatePath(`/purchase-orders/${id}`);
  revalidatePath("/purchase-orders");
}
