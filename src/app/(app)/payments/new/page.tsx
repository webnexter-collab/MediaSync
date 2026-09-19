import Link from "next/link";
import { and, eq, asc, or, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { suppliers, documents, bankAccounts } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { PaymentForm } from "@/components/payment-form";
import type { OpenInvoice } from "@/components/receipt-form";
import { createSupplierPayment } from "@/actions/payments";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

export default async function NewPayment({ searchParams }: { searchParams: Promise<{ supplierId?: string }> }) {
  const { supplierId } = await searchParams;
  const suppId = supplierId ? Number(supplierId) : NaN;

  const suppRows = await db
    .select({ id: suppliers.id, code: suppliers.code, name: suppliers.name })
    .from(suppliers)
    .where(and(eq(suppliers.companyId, COMPANY_ID), eq(suppliers.isActive, true)))
    .orderBy(asc(suppliers.name));

  if (!Number.isInteger(suppId)) {
    return (
      <div>
        <PageHeader title="Record payment" subtitle="Choose the supplier you paid." />
        <Card>
          <form className="flex items-end gap-3 p-6" action="/payments/new">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium">Supplier</label>
              <select name="supplierId" defaultValue="" className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm">
                <option value="" disabled>Select a supplier…</option>
                {suppRows.map((s) => (<option key={s.id} value={s.id}>{s.code} — {s.name}</option>))}
              </select>
            </div>
            <button className="inline-flex h-10 items-center rounded-lg bg-ink px-5 text-sm font-medium text-white hover:bg-ink-2">Continue</button>
          </form>
        </Card>
      </div>
    );
  }

  const [[supplier], accounts, poRows] = await Promise.all([
    db.select({ id: suppliers.id, name: suppliers.name }).from(suppliers).where(and(eq(suppliers.id, suppId), eq(suppliers.companyId, COMPANY_ID))).limit(1),
    db.select({ id: bankAccounts.id, name: bankAccounts.name }).from(bankAccounts).where(and(eq(bankAccounts.companyId, COMPANY_ID), eq(bankAccounts.isActive, true))).orderBy(asc(bankAccounts.name)),
    db.select({ id: documents.id, number: documents.number, issueDate: documents.issueDate, grandTotalFils: documents.grandTotalFils, amountPaidFils: documents.amountPaidFils })
      .from(documents)
      .where(and(
        eq(documents.companyId, COMPANY_ID),
        eq(documents.type, "purchase_order"),
        eq(documents.supplierId, suppId),
        or(eq(documents.status, "sent"), eq(documents.status, "partially_paid")),
        gt(sql`${documents.grandTotalFils} - ${documents.amountPaidFils}`, 0),
      ))
      .orderBy(asc(documents.issueDate)),
  ]);

  const openOrders: OpenInvoice[] = poRows.map((r) => ({ ...r, outstandingFils: r.grandTotalFils - r.amountPaidFils }));

  return (
    <div>
      <PageHeader
        title="Record payment"
        subtitle={`Payment made to ${supplier?.name ?? "supplier"}.`}
        action={<Link href="/payments/new" className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg hover:bg-bg">Change supplier</Link>}
      />
      <PaymentForm action={createSupplierPayment} supplierId={suppId} supplierName={supplier?.name ?? "Supplier"} openOrders={openOrders} bankAccounts={accounts} />
    </div>
  );
}
