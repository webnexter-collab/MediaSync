import { notFound, redirect } from "next/navigation";
import { and, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { documents, documentLines, suppliers, items } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { InvoiceForm, type InvoiceDefaults } from "@/components/invoice-form";
import { updatePurchaseOrder } from "@/actions/purchase-orders";
import { toAed } from "@/lib/money";
import type { TaxCategory } from "@/lib/vat";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

export default async function EditPurchaseOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const poId = Number(id);
  if (!Number.isInteger(poId)) notFound();
  const [doc] = await db.select().from(documents)
    .where(and(eq(documents.id, poId), eq(documents.companyId, COMPANY_ID), eq(documents.type, "purchase_order"))).limit(1);
  if (!doc) notFound();
  if (doc.status !== "draft") redirect(`/purchase-orders/${poId}`);

  const [lineRows, suppRows, itemRows] = await Promise.all([
    db.select().from(documentLines).where(eq(documentLines.documentId, poId)).orderBy(asc(documentLines.lineNo)),
    db.select({ id: suppliers.id, code: suppliers.code, name: suppliers.name }).from(suppliers)
      .where(and(eq(suppliers.companyId, COMPANY_ID), eq(suppliers.isActive, true))).orderBy(asc(suppliers.name)),
    db.select({ id: items.id, code: items.code, name: items.name, unitPriceFils: items.unitPriceFils, taxCategory: items.taxCategory, description: items.description })
      .from(items).where(and(eq(items.companyId, COMPANY_ID), eq(items.isActive, true))).orderBy(asc(items.code)),
  ]);

  const defaults: InvoiceDefaults = {
    customerId: doc.supplierId ?? undefined,
    issueDate: doc.issueDate,
    dueDate: doc.dueDate ?? undefined,
    reference: doc.reference ?? undefined,
    notes: doc.notes ?? undefined,
    terms: doc.terms ?? undefined,
    lines: lineRows.map((l) => ({
      itemId: l.itemId ?? null, description: l.description,
      quantity: String(Number(l.quantity)), unitPriceAed: String(toAed(l.unitPriceFils)),
      discountPercent: String(Number(l.discountPercent ?? "0")), taxCategory: l.taxCategory as TaxCategory,
    })),
  };
  const action = updatePurchaseOrder.bind(null, poId);
  return (
    <div>
      <PageHeader title={`Edit ${doc.number}`} subtitle="Draft purchase order." />
      <InvoiceForm action={action} customers={suppRows} items={itemRows} defaults={defaults}
        submitLabel="Update purchase order" cancelHref="/purchase-orders" partyLabel="Supplier" dueDateLabel="Delivery by" />
    </div>
  );
}
