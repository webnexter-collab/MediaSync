"use server";

import { assertCanWrite } from "@/lib/auth";

import { and, eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { documents, documentLines } from "@/db/schema";
import { invoiceSchema, rateForCategory, type FormState, type InvoiceInput } from "@/lib/validators";
import { toFils } from "@/lib/money";
import { computeLine, computeTotals, type LineInput } from "@/lib/vat";
import { nextNumber } from "@/lib/numbering";

const COMPANY_ID = 1;

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
    paymentTerms: formData.get("paymentTerms"),
    bankDetails: formData.get("bankDetails"),
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

export async function createQuotation(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertCanWrite();
  const res = parse(formData);
  if (!res.ok) return res.state;
  const data = res.data;
  const { totals } = computeTotals(lineInputs(data));

  let newId: number;
  try {
    newId = await db.transaction(async (tx) => {
      const number = await nextNumber(tx, { companyId: COMPANY_ID, kind: "quotation", prefix: "QUO" });
      const [doc] = await tx
        .insert(documents)
        .values({
          companyId: COMPANY_ID,
          type: "quotation",
          number,
          partyType: "customer",
          customerId: data.customerId,
          status: "draft",
          issueDate: data.issueDate,
          dueDate: data.dueDate ?? null, // valid-until for quotes
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
      await tx.insert(documentLines).values(lineRows(doc.id, data));
      return doc.id;
    });
  } catch (e) {
    return { ok: false, message: `Could not create quotation: ${e instanceof Error ? e.message : "error"}` };
  }
  revalidatePath("/quotations");
  redirect(`/quotations/${newId}`);
}

export async function updateQuotation(id: number, _prev: FormState, formData: FormData): Promise<FormState> {
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
        .where(and(eq(documents.id, id), eq(documents.companyId, COMPANY_ID), eq(documents.status, "draft")));
      await tx.delete(documentLines).where(eq(documentLines.documentId, id));
      await tx.insert(documentLines).values(lineRows(id, data));
    });
  } catch (e) {
    return { ok: false, message: `Could not update quotation: ${e instanceof Error ? e.message : "error"}` };
  }
  revalidatePath(`/quotations/${id}`);
  redirect(`/quotations/${id}`);
}

export async function setQuotationStatus(
  id: number,
  status: "draft" | "sent" | "accepted" | "rejected" | "cancelled",
) {
  await assertCanWrite();
  await db
    .update(documents)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.companyId, COMPANY_ID)));
  revalidatePath(`/quotations/${id}`);
  revalidatePath("/quotations");
}

/** Create an invoice from an accepted quotation, then mark the quote converted. */
export async function convertQuotationToInvoice(id: number) {
  await assertCanWrite();
  let newInvoiceId: number;

  const quote = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.companyId, COMPANY_ID), eq(documents.type, "quotation")))
    .limit(1);
  const q = quote[0];
  if (!q) redirect("/quotations");
  if (q.status === "converted" || q.status === "cancelled") redirect(`/quotations/${id}`);

  const srcLines = await db
    .select()
    .from(documentLines)
    .where(eq(documentLines.documentId, id))
    .orderBy(asc(documentLines.lineNo));

  newInvoiceId = await db.transaction(async (tx) => {
    const number = await nextNumber(tx, { companyId: COMPANY_ID, kind: "invoice", prefix: "INV" });
    const [doc] = await tx
      .insert(documents)
      .values({
        companyId: COMPANY_ID,
        type: "invoice",
        number,
        partyType: "customer",
        customerId: q.customerId,
        status: "draft",
        issueDate: new Date().toISOString().slice(0, 10),
        dueDate: null,
        reference: q.number, // trace back to the quote
        currency: q.currency,
        subtotalFils: q.subtotalFils,
        discountTotalFils: q.discountTotalFils,
        vatTotalFils: q.vatTotalFils,
        grandTotalFils: q.grandTotalFils,
        notes: q.notes,
        terms: q.terms,
        sourceDocumentId: q.id,
      })
      .returning({ id: documents.id });

    await tx.insert(documentLines).values(
      srcLines.map((l) => ({
        documentId: doc.id,
        lineNo: l.lineNo,
        itemId: l.itemId,
        description: l.description,
        quantity: l.quantity,
        unitPriceFils: l.unitPriceFils,
        discountPercent: l.discountPercent,
        discountAmountFils: l.discountAmountFils,
        taxCategory: l.taxCategory,
        vatRate: l.vatRate,
        lineSubtotalFils: l.lineSubtotalFils,
        vatAmountFils: l.vatAmountFils,
        lineTotalFils: l.lineTotalFils,
      })),
    );

    await tx
      .update(documents)
      .set({ status: "converted", updatedAt: new Date() })
      .where(eq(documents.id, id));

    return doc.id;
  });

  revalidatePath("/quotations");
  revalidatePath("/invoices");
  redirect(`/invoices/${newInvoiceId}`);
}
