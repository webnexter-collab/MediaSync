"use server";

import { assertCanWrite } from "@/lib/auth";

import { and, eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { documents, documentLines } from "@/db/schema";
import { deliveryNoteSchema, type FormState, type DeliveryNoteInput } from "@/lib/validators";
import { nextNumber } from "@/lib/numbering";

const COMPANY_ID = 1;

function parse(formData: FormData): { ok: true; data: DeliveryNoteInput } | { ok: false; state: FormState } {
  let lines: unknown = [];
  try {
    lines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    return { ok: false, state: { ok: false, message: "Invalid line data" } };
  }
  const parsed = deliveryNoteSchema.safeParse({
    customerId: formData.get("customerId"),
    issueDate: formData.get("issueDate"),
    reference: formData.get("reference"),
    notes: formData.get("notes"),
    lines,
  });
  if (!parsed.success) {
    const f = parsed.error.flatten();
    const msg = f.formErrors[0] ?? Object.values(f.fieldErrors).flat()[0];
    return { ok: false, state: { ok: false, errors: f.fieldErrors, message: msg } };
  }
  return { ok: true, data: parsed.data };
}

// Delivery notes are non-priced: line money fields are zeroed.
function lineRows(documentId: number, data: DeliveryNoteInput) {
  return data.lines.map((l, i) => ({
    documentId,
    lineNo: i + 1,
    itemId: l.itemId ?? null,
    description: l.description,
    quantity: String(l.quantity),
    unitPriceFils: 0,
    discountPercent: "0",
    taxCategory: "out_of_scope" as const,
    vatRate: "0",
    lineSubtotalFils: 0,
    vatAmountFils: 0,
    lineTotalFils: 0,
  }));
}

export async function createDeliveryNote(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertCanWrite();
  const res = parse(formData);
  if (!res.ok) return res.state;
  const data = res.data;

  let newId: number;
  try {
    newId = await db.transaction(async (tx) => {
      const number = await nextNumber(tx, { companyId: COMPANY_ID, kind: "delivery_note", prefix: "DN" });
      const [doc] = await tx
        .insert(documents)
        .values({
          companyId: COMPANY_ID,
          type: "delivery_note",
          number,
          partyType: "customer",
          customerId: data.customerId,
          status: "draft",
          issueDate: data.issueDate,
          reference: data.reference,
          currency: "AED",
          notes: data.notes,
        })
        .returning({ id: documents.id });
      await tx.insert(documentLines).values(lineRows(doc.id, data));
      return doc.id;
    });
  } catch (e) {
    return { ok: false, message: `Could not create delivery note: ${e instanceof Error ? e.message : "error"}` };
  }
  revalidatePath("/delivery-notes");
  redirect(`/delivery-notes/${newId}`);
}

export async function updateDeliveryNote(id: number, _prev: FormState, formData: FormData): Promise<FormState> {
  await assertCanWrite();
  const res = parse(formData);
  if (!res.ok) return res.state;
  const data = res.data;

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(documents)
        .set({
          customerId: data.customerId,
          issueDate: data.issueDate,
          reference: data.reference,
          notes: data.notes,
          updatedAt: new Date(),
        })
        .where(and(eq(documents.id, id), eq(documents.companyId, COMPANY_ID), eq(documents.status, "draft")));
      await tx.delete(documentLines).where(eq(documentLines.documentId, id));
      await tx.insert(documentLines).values(lineRows(id, data));
    });
  } catch (e) {
    return { ok: false, message: `Could not update delivery note: ${e instanceof Error ? e.message : "error"}` };
  }
  revalidatePath(`/delivery-notes/${id}`);
  redirect(`/delivery-notes/${id}`);
}

// "sent" is used to mean issued/delivered for delivery notes.
export async function setDeliveryNoteStatus(id: number, status: "draft" | "sent" | "cancelled") {
  await assertCanWrite();
  await db
    .update(documents)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.companyId, COMPANY_ID)));
  revalidatePath(`/delivery-notes/${id}`);
  revalidatePath("/delivery-notes");
}

/** Create a delivery note from an invoice (copies customer + line descriptions/quantities). */
export async function createDeliveryNoteFromInvoice(invoiceId: number) {
  await assertCanWrite();
  const [inv] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, invoiceId), eq(documents.companyId, COMPANY_ID), eq(documents.type, "invoice")))
    .limit(1);
  if (!inv) redirect("/invoices");

  const srcLines = await db
    .select()
    .from(documentLines)
    .where(eq(documentLines.documentId, invoiceId))
    .orderBy(asc(documentLines.lineNo));

  const newId = await db.transaction(async (tx) => {
    const number = await nextNumber(tx, { companyId: COMPANY_ID, kind: "delivery_note", prefix: "DN" });
    const [doc] = await tx
      .insert(documents)
      .values({
        companyId: COMPANY_ID,
        type: "delivery_note",
        number,
        partyType: "customer",
        customerId: inv.customerId,
        status: "draft",
        issueDate: new Date().toISOString().slice(0, 10),
        reference: inv.number,
        currency: "AED",
        sourceDocumentId: inv.id,
      })
      .returning({ id: documents.id });

    await tx.insert(documentLines).values(
      srcLines.map((l, i) => ({
        documentId: doc.id,
        lineNo: i + 1,
        itemId: l.itemId,
        description: l.description,
        quantity: l.quantity,
        unitPriceFils: 0,
        discountPercent: "0",
        taxCategory: "out_of_scope" as const,
        vatRate: "0",
        lineSubtotalFils: 0,
        vatAmountFils: 0,
        lineTotalFils: 0,
      })),
    );
    return doc.id;
  });

  revalidatePath("/delivery-notes");
  redirect(`/delivery-notes/${newId}`);
}
