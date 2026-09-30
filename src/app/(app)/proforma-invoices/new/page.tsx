import { and, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { customers, items } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { InvoiceForm } from "@/components/invoice-form";
import { createProforma } from "@/actions/proforma";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

export default async function NewProforma() {
  const [custRows, itemRows] = await Promise.all([
    db
      .select({ id: customers.id, code: customers.code, name: customers.name })
      .from(customers)
      .where(and(eq(customers.companyId, COMPANY_ID), eq(customers.isActive, true)))
      .orderBy(asc(customers.name)),
    db
      .select({ id: items.id, code: items.code, name: items.name, unitPriceFils: items.unitPriceFils, taxCategory: items.taxCategory, description: items.description })
      .from(items)
      .where(and(eq(items.companyId, COMPANY_ID), eq(items.isActive, true)))
      .orderBy(asc(items.code)),
  ]);

  return (
    <div>
      <PageHeader title="New proforma invoice" subtitle="Draft a proforma (pre-invoice) for a customer. VAT shown; not a tax document." />
      <InvoiceForm
        action={createProforma}
        customers={custRows}
        items={itemRows}
        submitLabel="Save proforma"
        cancelHref="/proforma-invoices"
      />
    </div>
  );
}
