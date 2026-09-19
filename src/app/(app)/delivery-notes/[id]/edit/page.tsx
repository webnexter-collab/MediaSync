import { notFound, redirect } from "next/navigation";
import { and, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { documents, documentLines, customers, items } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { DeliveryNoteForm, type DeliveryDefaults } from "@/components/delivery-note-form";
import { updateDeliveryNote } from "@/actions/delivery-notes";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

export default async function EditDeliveryNote({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dnId = Number(id);
  if (!Number.isInteger(dnId)) notFound();

  const [doc] = await db.select().from(documents)
    .where(and(eq(documents.id, dnId), eq(documents.companyId, COMPANY_ID), eq(documents.type, "delivery_note")))
    .limit(1);
  if (!doc) notFound();
  if (doc.status !== "draft") redirect(`/delivery-notes/${dnId}`);

  const [lineRows, custRows, itemRows] = await Promise.all([
    db.select().from(documentLines).where(eq(documentLines.documentId, dnId)).orderBy(asc(documentLines.lineNo)),
    db.select({ id: customers.id, code: customers.code, name: customers.name }).from(customers)
      .where(and(eq(customers.companyId, COMPANY_ID), eq(customers.isActive, true))).orderBy(asc(customers.name)),
    db.select({ id: items.id, code: items.code, name: items.name, unitPriceFils: items.unitPriceFils, taxCategory: items.taxCategory, description: items.description })
      .from(items).where(and(eq(items.companyId, COMPANY_ID), eq(items.isActive, true))).orderBy(asc(items.code)),
  ]);

  const defaults: DeliveryDefaults = {
    customerId: doc.customerId ?? undefined,
    issueDate: doc.issueDate,
    reference: doc.reference ?? undefined,
    notes: doc.notes ?? undefined,
    lines: lineRows.map((l) => ({ itemId: l.itemId ?? null, description: l.description, quantity: String(Number(l.quantity)) })),
  };
  const action = updateDeliveryNote.bind(null, dnId);
  return (
    <div>
      <PageHeader title={`Edit ${doc.number}`} subtitle="Draft delivery note." />
      <DeliveryNoteForm action={action} customers={custRows} items={itemRows} defaults={defaults} submitLabel="Update delivery note" />
    </div>
  );
}
