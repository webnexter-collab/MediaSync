import { and, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { customers, items } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { InvoiceForm } from "@/components/invoice-form";
import { createInvoice } from "@/actions/invoices";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

export default async function NewInvoice() {
  const [custRows, itemRows] = await Promise.all([
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

  return (
    <div>
      <PageHeader title="New invoice" subtitle="Draft a tax invoice for a customer." />
      <InvoiceForm
        showBankDetails
        action={createInvoice}
        customers={custRows}
        items={itemRows}
        submitLabel="Save invoice"
      />
    </div>
  );
}
