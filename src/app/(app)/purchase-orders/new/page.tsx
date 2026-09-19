import { and, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { suppliers, items } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { InvoiceForm } from "@/components/invoice-form";
import { createPurchaseOrder } from "@/actions/purchase-orders";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

export default async function NewPurchaseOrder() {
  const [suppRows, itemRows] = await Promise.all([
    db.select({ id: suppliers.id, code: suppliers.code, name: suppliers.name }).from(suppliers)
      .where(and(eq(suppliers.companyId, COMPANY_ID), eq(suppliers.isActive, true))).orderBy(asc(suppliers.name)),
    db.select({ id: items.id, code: items.code, name: items.name, unitPriceFils: items.unitPriceFils, taxCategory: items.taxCategory, description: items.description })
      .from(items).where(and(eq(items.companyId, COMPANY_ID), eq(items.isActive, true))).orderBy(asc(items.code)),
  ]);
  return (
    <div>
      <PageHeader title="New purchase order" subtitle="Order goods or services from a supplier." />
      <InvoiceForm
        action={createPurchaseOrder}
        customers={suppRows}
        items={itemRows}
        submitLabel="Save purchase order"
        cancelHref="/purchase-orders"
        partyLabel="Supplier"
        dueDateLabel="Delivery by"
        defaultTerms="Please supply the above at the agreed prices and confirm the delivery date."
      />
    </div>
  );
}
