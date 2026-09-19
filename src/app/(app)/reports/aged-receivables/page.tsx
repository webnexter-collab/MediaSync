import { PageHeader } from "@/components/ui";
import { AgingTable } from "@/components/aging-table";
import { agedReceivables } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function AgedReceivablesPage() {
  const { rows, totals, grand } = await agedReceivables();
  return (
    <div>
      <PageHeader title="Aged Receivables" subtitle="What customers owe you, grouped by how overdue it is." />
      <AgingTable rows={rows} totals={totals} grand={grand} statementBase="/reports/customer-statement" partyParam="customerId" />
    </div>
  );
}
