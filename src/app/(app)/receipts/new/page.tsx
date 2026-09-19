import Link from "next/link";
import { and, eq, asc, or, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, documents, bankAccounts } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { ReceiptForm, type OpenInvoice } from "@/components/receipt-form";
import { createReceipt } from "@/actions/receipts";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

export default async function NewReceipt({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { customerId } = await searchParams;
  const custId = customerId ? Number(customerId) : NaN;

  const custRows = await db
    .select({ id: customers.id, code: customers.code, name: customers.name })
    .from(customers)
    .where(and(eq(customers.companyId, COMPANY_ID), eq(customers.isActive, true)))
    .orderBy(asc(customers.name));

  // Step 1: choose a customer.
  if (!Number.isInteger(custId)) {
    return (
      <div>
        <PageHeader title="Record receipt" subtitle="Choose the customer who paid." />
        <Card>
          <form className="flex items-end gap-3 p-6" action="/receipts/new">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium">Customer</label>
              <select
                name="customerId"
                defaultValue=""
                className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm"
              >
                <option value="" disabled>
                  Select a customer…
                </option>
                {custRows.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button className="inline-flex h-10 items-center rounded-lg bg-ink px-5 text-sm font-medium text-white hover:bg-ink-2">
              Continue
            </button>
          </form>
        </Card>
      </div>
    );
  }

  const [customer] = await db
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .where(and(eq(customers.id, custId), eq(customers.companyId, COMPANY_ID)))
    .limit(1);

  // Step 2: open invoices for this customer (sent or partially paid, with a balance).
  const invRows = await db
    .select({
      id: documents.id,
      number: documents.number,
      issueDate: documents.issueDate,
      grandTotalFils: documents.grandTotalFils,
      amountPaidFils: documents.amountPaidFils,
    })
    .from(documents)
    .where(
      and(
        eq(documents.companyId, COMPANY_ID),
        eq(documents.type, "invoice"),
        eq(documents.customerId, custId),
        or(eq(documents.status, "sent"), eq(documents.status, "partially_paid")),
        gt(sql`${documents.grandTotalFils} - ${documents.amountPaidFils}`, 0),
      ),
    )
    .orderBy(asc(documents.issueDate));

  const openInvoices: OpenInvoice[] = invRows.map((r) => ({
    ...r,
    outstandingFils: r.grandTotalFils - r.amountPaidFils,
  }));

  const accounts = await db
    .select({ id: bankAccounts.id, name: bankAccounts.name })
    .from(bankAccounts)
    .where(and(eq(bankAccounts.companyId, COMPANY_ID), eq(bankAccounts.isActive, true)))
    .orderBy(asc(bankAccounts.name));

  return (
    <div>
      <PageHeader
        title="Record receipt"
        subtitle={`Payment received from ${customer?.name ?? "customer"}.`}
        action={
          <Link
            href="/receipts/new"
            className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg hover:bg-bg"
          >
            Change customer
          </Link>
        }
      />
      <ReceiptForm
        action={createReceipt}
        customerId={custId}
        customerName={customer?.name ?? "Customer"}
        openInvoices={openInvoices}
        bankAccounts={accounts}
      />
    </div>
  );
}
