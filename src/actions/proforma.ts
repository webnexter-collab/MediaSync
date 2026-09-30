"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { documents, documentLines } from "@/db/schema";
import { assertCanWrite } from "@/lib/auth";
import { nextNumber } from "@/lib/numbering";

const COMPANY_ID = 1;

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
