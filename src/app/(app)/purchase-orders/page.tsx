import Link from "next/link";
import { desc, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { documents, suppliers } from "@/db/schema";
import { PageHeader, LinkButton, Card, Badge, EmptyState } from "@/components/ui";
import { formatFils } from "@/lib/money";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

const STATUS_TONE: Record<string, "neutral" | "good" | "muted"> = {
  draft: "muted",
  sent: "neutral",
  paid: "good",
  partially_paid: "neutral",
  cancelled: "muted",
};

export default async function PurchaseOrdersPage() {
  let rows: { id: number; number: string; status: string; issueDate: string; grandTotalFils: number; supplierName: string | null }[] = [];
  let dbError = false;
  try {
    rows = await db
      .select({
        id: documents.id,
        number: documents.number,
        status: documents.status,
        issueDate: documents.issueDate,
        grandTotalFils: documents.grandTotalFils,
        supplierName: suppliers.name,
      })
      .from(documents)
      .leftJoin(suppliers, eq(documents.supplierId, suppliers.id))
      .where(and(eq(documents.companyId, COMPANY_ID), eq(documents.type, "purchase_order")))
      .orderBy(desc(documents.id))
      .limit(200);
  } catch {
    dbError = true;
  }

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        subtitle="Orders you raise to suppliers, settled by supplier payments."
        action={<LinkButton href="/purchase-orders/new">New purchase order</LinkButton>}
      />
      <Card>
        {dbError ? (
          <EmptyState title="Database not connected yet" hint="Set DATABASE_URL and run the migrations, then refresh." />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No purchase orders yet"
            hint="Raise your first PO. You'll need at least one supplier and one item."
            action={<LinkButton href="/purchase-orders/new">New purchase order</LinkButton>}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Number</th>
                <th className="px-5 py-3 font-medium">Supplier</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-b border-line last:border-0 hover:bg-bg">
                  <td className="px-5 py-3">
                    <Link href={`/purchase-orders/${d.id}`} className="font-medium text-ink hover:text-teal-ink tnum">
                      {d.number}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{d.supplierName ?? "—"}</td>
                  <td className="px-5 py-3 tnum text-muted">{d.issueDate}</td>
                  <td className="px-5 py-3">
                    <Badge tone={STATUS_TONE[d.status] ?? "neutral"}>{d.status.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right tnum">{formatFils(d.grandTotalFils)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
