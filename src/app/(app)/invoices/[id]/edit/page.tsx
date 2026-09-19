import { notFound, redirect } from "next/navigation";
import { and, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { documents, documentLines, customers, items } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { InvoiceForm, type InvoiceDefaults } from "@/components/invoice-form";
import { updateInvoice } from "@/actions/invoices";
import { toAed } from "@/lib/money";
import type { TaxCategory } from "@/lib/vat";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

export default async function EditInvoice({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invId = Number(id);
  if (!Number.isInteger(invId)) notFound();

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, invId), eq(documents.companyId, COMPANY_ID), eq(documents.type, "invoice")))
    .limit(1);
  if (!doc) notFound();
  // Only drafts are editable.
  if (doc.status !== "draft") redirect(`/invoices/${invId}`);

  const [lineRows, custRows, itemRows] = await Promise.all([
    db.select().from(documentLines).where(eq(documentLines.documentId, invId)).orderBy(asc(documentLines.lineNo)),
    db
      .select({ id: customers.id, code: customers.code, name: customers.name })
      .from(customers)
      .where(and(eq(customers.companyId, COMPANY_ID), eq(customers.isActive, true)))
      .orderBy(asc(customers.name)),
    db
      .select({
        id: items.id,
        code: items.code,
        name: items.name,
        unitPriceFils: items.unitPriceFils,
        taxCategory: items.taxCategory,
        description: items.description,
      })
      .from(items)
      .where(and(eq(items.companyId, COMPANY_ID), eq(items.isActive, true)))
      .orderBy(asc(items.code)),
  ]);

  const defaults: InvoiceDefaults = {
    customerId: doc.customerId ?? undefined,
    issueDate: doc.issueDate,
    dueDate: doc.dueDate ?? undefined,
    reference: doc.reference ?? undefined,
    notes: doc.notes ?? undefined,
    terms: doc.terms ?? undefined,
    bankDetails: doc.bankDetails ?? undefined,
    lines: lineRows.map((l) => ({
      itemId: l.itemId ?? null,
      description: l.description,
      quantity: String(Number(l.quantity)),
      unitPriceAed: String(toAed(l.unitPriceFils)),
      discountPercent: String(Number(l.discountPercent ?? "0")),
      taxCategory: l.taxCategory as TaxCategory,
    })),
  };

  const action = updateInvoice.bind(null, invId);

  return (
    <div>
      <PageHeader title={`Edit ${doc.number}`} subtitle="Draft invoice." />
      <InvoiceForm
        showBankDetails
        action={action}
        customers={custRows}
        items={itemRows}
        defaults={defaults}
        submitLabel="Update invoice"
      />
    </div>
  );
}
