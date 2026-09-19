"use server";

import { assertCanWrite } from "@/lib/auth";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { documents, payments, paymentAllocations } from "@/db/schema";
import { supplierPaymentSchema, type FormState, type SupplierPaymentInput } from "@/lib/validators";
import { toFils } from "@/lib/money";
import { nextNumber } from "@/lib/numbering";

const COMPANY_ID = 1;

function parse(formData: FormData): { ok: true; data: SupplierPaymentInput } | { ok: false; state: FormState } {
  let allocations: unknown = [];
  try {
    allocations = JSON.parse(String(formData.get("allocations") ?? "[]"));
  } catch {
    return { ok: false, state: { ok: false, message: "Invalid allocation data" } };
  }
  const bankRaw = formData.get("bankAccountId");
  const parsed = supplierPaymentSchema.safeParse({
    supplierId: formData.get("supplierId"),
    paymentDate: formData.get("paymentDate"),
    method: formData.get("method") || "bank_transfer",
    bankAccountId: bankRaw ? bankRaw : undefined,
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

export async function createSupplierPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertCanWrite();
  const res = parse(formData);
  if (!res.ok) return res.state;
  const data = res.data;

  const allocs = data.allocations
    .map((a) => ({ documentId: a.documentId, amountFils: toFils(a.amountAed) }))
    .filter((a) => a.amountFils > 0);
  if (allocs.length === 0) return { ok: false, message: "Allocate an amount to at least one order" };

  let newId: number;
  try {
    newId = await db.transaction(async (tx) => {
      const ids = allocs.map((a) => a.documentId);
      const orders = await tx
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.companyId, COMPANY_ID),
            eq(documents.type, "purchase_order"),
            eq(documents.supplierId, data.supplierId),
            inArray(documents.id, ids),
          ),
        );
      const byId = new Map(orders.map((d) => [d.id, d]));

      for (const a of allocs) {
        const po = byId.get(a.documentId);
        if (!po) throw new Error("Order not found for this supplier");
        const outstanding = po.grandTotalFils - po.amountPaidFils;
        if (a.amountFils > outstanding) throw new Error(`Allocation exceeds outstanding on ${po.number}`);
      }

      const total = allocs.reduce((s, a) => s + a.amountFils, 0);
      const number = await nextNumber(tx, { companyId: COMPANY_ID, kind: "payment", prefix: "PAY" });

      const [pay] = await tx
        .insert(payments)
        .values({
          companyId: COMPANY_ID,
          direction: "payment",
          number,
          partyType: "supplier",
          supplierId: data.supplierId,
          paymentDate: data.paymentDate,
          method: data.method,
          bankAccountId: data.bankAccountId ?? null,
          reference: data.reference,
          amountFils: total,
          currency: "AED",
          notes: data.notes,
        })
        .returning({ id: payments.id });

      await tx.insert(paymentAllocations).values(
        allocs.map((a) => ({ paymentId: pay.id, documentId: a.documentId, amountAllocatedFils: a.amountFils })),
      );

      for (const a of allocs) {
        const po = byId.get(a.documentId)!;
        const newPaid = po.amountPaidFils + a.amountFils;
        const status = newPaid >= po.grandTotalFils ? "paid" : "partially_paid";
        await tx.update(documents).set({ amountPaidFils: newPaid, status, updatedAt: new Date() }).where(eq(documents.id, a.documentId));
      }

      return pay.id;
    });
  } catch (e) {
    return { ok: false, message: `Could not record payment: ${e instanceof Error ? e.message : "error"}` };
  }

  revalidatePath("/payments");
  revalidatePath("/purchase-orders");
  redirect(`/payments/${newId}`);
}
