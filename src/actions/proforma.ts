"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { documents, documentLines } from "@/db/schema";
import { assertCanWrite } from "@/lib/auth";
import { nextNumber } from "@/lib/numbering";
import { invoiceSchema, rateForCategory, type FormState, type InvoiceInput } from "@/lib/validators";
import { toFils } from "@/lib/money";
import { computeLine, computeTotals, type LineInput } from "@/lib/vat";

const COMPANY_ID = 1;

/** Create a standalone Proforma Invoice (not from a booking order). AED, VAT shown. */
export async function createProforma(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertCanWrite();
  let rawLines: unknown = [];
  try {
    rawLines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    return { ok: false, message: "Invalid line data" };
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
    lines: rawLines,
  });
  if (!parsed.success) {
    const fe = parsed.error.flatten();
    const first = fe.formErrors[0] ?? Object.values(fe.fieldErrors).flat().find(Boolean);
    return { ok: false, errors: fe.fieldErrors, message: first ?? undefined };
  }
  const data: InvoiceInput = parsed.data;
  const inputs: LineInput[] = data.lines.map((l) => ({
    quantity: l.quantity, unitPriceFils: toFils(l.unitPriceAed), discountPercent: l.discountPercent,
    taxCategory: l.taxCategory, vatRate: rateForCategory(l.taxCategory),
  }));
  const { totals } = computeTotals(inputs);

  let newId: number;
  try {
    newId = await db.transaction(async (tx) => {
      const number = await nextNumber(tx, { companyId: COMPANY_ID, kind: "proforma", prefix: "PRO" });
      const [doc] = await tx
        .insert(documents)
        .values({
          companyId: COMPANY_ID,
          type: "proforma_invoice",
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
          const r = computeLine({ quantity: l.quantity, unitPriceFils: toFils(l.unitPriceAed), discountPercent: l.discountPercent, taxCategory: l.taxCategory, vatRate: rateForCategory(l.taxCategory) });
          return {
            documentId: doc.id, lineNo: i + 1, itemId: l.itemId ?? null, description: l.description,
            quantity: String(l.quantity), unitPriceFils: toFils(l.unitPriceAed), discountPercent: String(l.discountPercent),
            taxCategory: l.taxCategory, vatRate: String(rateForCategory(l.taxCategory)),
            lineSubtotalFils: r.lineSubtotalFils, vatAmountFils: r.vatAmountFils, lineTotalFils: r.lineTotalFils,
          };
        }),
      );
      return doc.id;
    });
  } catch (e) {
    return { ok: false, message: `Could not create proforma: ${e instanceof Error ? e.message : "error"}` };
  }
  revalidatePath("/proforma-invoices");
  redirect(`/proforma-invoices/${newId}`);
}

/** Set a proforma's lifecycle status (draft → sent, or cancel). */
export async function setProformaStatus(
  id: number,
  status: "draft" | "sent" | "cancelled",
) {
  await assertCanWrite();
  await db
    .update(documents)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.companyId, COMPANY_ID), eq(documents.type, "proforma_invoice")));
  revalidatePath(`/proforma-invoices/${id}`);
  revalidatePath("/proforma-invoices");
}

/**
 * Issue the Tax Invoice for a proforma: copies its header + lines into a new
 * `invoice` document (own INV- number), links it back via sourceDocumentId, and
 * marks the proforma 'converted'.
 */
export async function convertProformaToTaxInvoice(proformaId: number): Promise<void> {
  await assertCanWrite();

  const [pro] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, proformaId), eq(documents.companyId, COMPANY_ID), eq(documents.type, "proforma_invoice")))
    .limit(1);
  if (!pro) throw new Error("Proforma not found.");
  if (pro.status === "cancelled") throw new Error("Cannot invoice a cancelled proforma.");
  if (pro.status === "converted") throw new Error("This proforma has already been invoiced.");

  const lines = await db
    .select()
    .from(documentLines)
    .where(eq(documentLines.documentId, proformaId))
    .orderBy(asc(documentLines.lineNo));
  if (lines.length === 0) throw new Error("Proforma has no lines.");

  let invId: number;
  try {
    invId = await db.transaction(async (tx) => {
      const number = await nextNumber(tx, { companyId: COMPANY_ID, kind: "invoice", prefix: "INV" });
      const [doc] = await tx
        .insert(documents)
        .values({
          companyId: COMPANY_ID,
          type: "invoice",
          number,
          partyType: pro.partyType,
          customerId: pro.customerId,
          status: "draft",
          issueDate: new Date().toISOString().slice(0, 10),
          reference: pro.reference,
          currency: pro.currency,
          exchangeRate: pro.exchangeRate,
          subtotalFils: pro.subtotalFils,
          discountTotalFils: pro.discountTotalFils,
          vatTotalFils: pro.vatTotalFils,
          grandTotalFils: pro.grandTotalFils,
          paymentTerms: pro.paymentTerms,
          notes: [`Tax invoice for proforma ${pro.number}.`, pro.notes].filter(Boolean).join(" "),
          sourceDocumentId: pro.id,
        })
        .returning({ id: documents.id });

      await tx.insert(documentLines).values(
        lines.map((l, i) => ({
          documentId: doc.id,
          lineNo: i + 1,
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
        .where(and(eq(documents.id, proformaId), eq(documents.companyId, COMPANY_ID)));

      return doc.id;
    });
  } catch (e) {
    throw new Error(`Could not create tax invoice: ${e instanceof Error ? e.message : "error"}`);
  }

  revalidatePath("/invoices");
  revalidatePath(`/proforma-invoices/${proformaId}`);
  redirect(`/invoices/${invId}`);
}
