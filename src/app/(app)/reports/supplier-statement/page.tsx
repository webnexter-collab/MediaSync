import { and, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { StatementTabs, UnpaidStatement, TransactionsStatement } from "@/components/statement";
import { unpaidDocuments, statementTransactions } from "@/lib/reports";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

export default async function SupplierStatement({
  searchParams,
}: {
  searchParams: Promise<{ supplierId?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const suppId = sp.supplierId ? Number(sp.supplierId) : NaN;
  const view = sp.view === "transactions" ? "transactions" : "unpaid";

  const suppRows = await db
    .select({ id: suppliers.id, code: suppliers.code, name: suppliers.name })
    .from(suppliers)
    .where(and(eq(suppliers.companyId, COMPANY_ID), eq(suppliers.isActive, true)))
    .orderBy(asc(suppliers.name));

  if (!Number.isInteger(suppId)) {
    return (
      <div>
        <PageHeader title="Supplier Statement" subtitle="Choose a supplier to view their statement." />
        <Card>
          <form className="flex items-end gap-3 p-6" action="/reports/supplier-statement">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium">Supplier</label>
              <select name="supplierId" defaultValue="" className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm">
                <option value="" disabled>Select a supplier…</option>
                {suppRows.map((s) => (<option key={s.id} value={s.id}>{s.code} — {s.name}</option>))}
              </select>
            </div>
            <button className="inline-flex h-10 items-center rounded-lg bg-ink px-5 text-sm font-medium text-white hover:bg-ink-2">View</button>
          </form>
        </Card>
      </div>
    );
  }

  const [supplier] = await db.select({ name: suppliers.name }).from(suppliers).where(and(eq(suppliers.id, suppId), eq(suppliers.companyId, COMPANY_ID))).limit(1);

  return (
    <div>
      <PageHeader
        title="Supplier Statement"
        subtitle={supplier?.name ?? "Supplier"}
        action={
          <a href={`/reports/supplier-statement`} className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg hover:bg-bg">
            Change supplier
          </a>
        }
      />
      <StatementTabs base="/reports/supplier-statement" partyId={suppId} partyParam="supplierId" view={view} />
      {view === "unpaid" ? (
        <UnpaidStatement rows={await unpaidDocuments("supplier", suppId)} docLabel="Purchase order" />
      ) : (
        <TransactionsStatement txns={await statementTransactions("supplier", suppId)} />
      )}
    </div>
  );
}
