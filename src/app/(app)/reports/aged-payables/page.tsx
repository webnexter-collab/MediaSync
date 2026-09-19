import { PageHeader } from "@/components/ui";
import { AgingTable } from "@/components/aging-table";
import { agedPayables } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function AgedPayablesPage() {
  const { rows, totals, grand } = await agedPayables();
  return (
    <div>
      <PageHeader title="Aged Payables" subtitle="What you owe suppliers, grouped by how overdue it is." />
      <AgingTable rows={rows} totals={totals} grand={grand} statementBase="/reports/supplier-statement" partyParam="supplierId" />
    </div>
  );
}
