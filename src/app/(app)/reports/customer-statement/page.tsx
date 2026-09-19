import { and, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { StatementTabs, UnpaidStatement, TransactionsStatement } from "@/components/statement";
import { unpaidDocuments, statementTransactions } from "@/lib/reports";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

export default async function CustomerStatement({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const custId = sp.customerId ? Number(sp.customerId) : NaN;
  const view = sp.view === "transactions" ? "transactions" : "unpaid";

  const custRows = await db
    .select({ id: customers.id, code: customers.code, name: customers.name })
    .from(customers)
    .where(and(eq(customers.companyId, COMPANY_ID), eq(customers.isActive, true)))
    .orderBy(asc(customers.name));

  if (!Number.isInteger(custId)) {
    return (
      <div>
        <PageHeader title="Customer Statement" subtitle="Choose a customer to view their statement." />
        <Card>
          <form className="flex items-end gap-3 p-6" action="/reports/customer-statement">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium">Customer</label>
              <select name="customerId" defaultValue="" className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm">
                <option value="" disabled>Select a customer…</option>
                {custRows.map((c) => (<option key={c.id} value={c.id}>{c.code} — {c.name}</option>))}
              </select>
            </div>
            <button className="inline-flex h-10 items-center rounded-lg bg-ink px-5 text-sm font-medium text-white hover:bg-ink-2">View</button>
          </form>
        </Card>
      </div>
    );
  }

  const [customer] = await db.select({ name: customers.name }).from(customers).where(and(eq(customers.id, custId), eq(customers.companyId, COMPANY_ID))).limit(1);

  return (
    <div>
      <PageHeader
        title="Customer Statement"
        subtitle={customer?.name ?? "Customer"}
        action={
          <a href={`/reports/customer-statement`} className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg hover:bg-bg">
            Change customer
          </a>
        }
      />
      <StatementTabs base="/reports/customer-statement" partyId={custId} partyParam="customerId" view={view} />
      {view === "unpaid" ? (
        <UnpaidStatement rows={await unpaidDocuments("customer", custId)} docLabel="Invoice" />
      ) : (
        <TransactionsStatement txns={await statementTransactions("customer", custId)} />
      )}
    </div>
  );
}
