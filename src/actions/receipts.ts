"use server";

import { assertCanWrite } from "@/lib/auth";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { documents, payments, paymentAllocations } from "@/db/schema";
import { receiptSchema, type FormState, type ReceiptInput } from "@/lib/validators";
import { toFils } from "@/lib/money";
import { nextNumber } from "@/lib/numbering";

const COMPANY_ID = 1;

function parse(formData: FormData): { ok: true; data: ReceiptInput } | { ok: false; state: FormState } {
  let allocations: unknown = [];
  try {
    allocations = JSON.parse(String(formData.get("allocations") ?? "[]"));
  } catch {
    return { ok: false, state: { ok: false, message: "Invalid allocation data" } };
  }
  const parsed = receiptSchema.safeParse({
    customerId: formData.get("customerId"),
    paymentDate: formData.get("paymentDate"),
    method: formData.get("method") || "bank_transfer",
    reference: formData.get("reference"),
    notes: formData.get("notes"),
    allocations,
  });
  if (!parsed.success) {
    const f = parsed.error.flatten();
    const msg = f.formErrors[0] ?? Object.values(f.fieldErrors).flat()[0];
    return { ok: false, state: { ok: false, errors: f.fieldErrors, message: msg } };
  }
  return { ok: true, data: parsed.data };
}

export async function createReceipt(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertCanWrite();
  const res = parse(formData);
  if (!res.ok) return res.state;
  const data = res.data;

  const bankRaw = formData.get("bankAccountId");
  const bankAccountId = bankRaw && Number(bankRaw) > 0 ? Number(bankRaw) : null;

  // Keep only positive allocations.
  const allocs = data.allocations
    .map((a) => ({ documentId: a.documentId, amountFils: toFils(a.amountAed) }))
    .filter((a) => a.amountFils > 0);

  if (allocs.length === 0) {
    return { ok: false, message: "Allocate an amount to at least one invoice" };
  }

  let newId: number;
  try {
    newId = await db.transaction(async (tx) => {
      // Load the target invoices and validate ownership + outstanding.
      const ids = allocs.map((a) => a.documentId);
      const invoices = await tx
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.companyId, COMPANY_ID),
            eq(documents.type, "invoice"),
            eq(documents.customerId, data.customerId),
            inArray(documents.id, ids),
          ),
        );
      const byId = new Map(invoices.map((d) => [d.id, d]));

      for (const a of allocs) {
        const inv = byId.get(a.documentId);
        if (!inv) throw new Error("Invoice not found for this customer");
        const outstanding = inv.grandTotalFils - inv.amountPaidFils;
        if (a.amountFils > outstanding) {
          throw new Error(`Allocation exceeds outstanding on ${inv.number}`);
        }
      }

      const total = allocs.reduce((s, a) => s + a.amountFils, 0);
      const number = await nextNumber(tx, { companyId: COMPANY_ID, kind: "receipt", prefix: "RCP" });

      const [receipt] = await tx
        .insert(payments)
        .values({
          companyId: COMPANY_ID,
          direction: "receipt",
          number,
          partyType: "customer",
          customerId: data.customerId,
          paymentDate: data.paymentDate,
          method: data.method,
          bankAccountId,
          reference: data.reference,
          amountFils: total,
          currency: "AED",
          notes: data.notes,
        })
        .returning({ id: payments.id });

      await tx.insert(paymentAllocations).values(
        allocs.map((a) => ({
          paymentId: receipt.id,
          documentId: a.documentId,
          amountAllocatedFils: a.amountFils,
        })),
      );

      // Update each invoice's paid amount + status.
      for (const a of allocs) {
        const inv = byId.get(a.documentId)!;
        const newPaid = inv.amountPaidFils + a.amountFils;
        const status = newPaid >= inv.grandTotalFils ? "paid" : "partially_paid";
        await tx
          .update(documents)
          .set({ amountPaidFils: newPaid, status, updatedAt: new Date() })
          .where(eq(documents.id, a.documentId));
      }

      return receipt.id;
    });
  } catch (e) {
    return { ok: false, message: `Could not record receipt: ${e instanceof Error ? e.message : "error"}` };
  }

  revalidatePath("/receipts");
  revalidatePath("/invoices");
  redirect(`/receipts/${newId}`);
}
