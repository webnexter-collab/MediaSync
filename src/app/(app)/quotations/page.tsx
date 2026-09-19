import Link from "next/link";
import { desc, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { documents, customers } from "@/db/schema";
import { PageHeader, LinkButton, Card, Badge, EmptyState } from "@/components/ui";
import { formatFils } from "@/lib/money";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

const STATUS_TONE: Record<string, "neutral" | "good" | "muted"> = {
  draft: "muted",
  sent: "neutral",
  accepted: "good",
  rejected: "muted",
  converted: "good",
  cancelled: "muted",
};

export default async function QuotationsPage() {
  let rows: {
    id: number;
    number: string;
    status: string;
    issueDate: string;
    grandTotalFils: number;
    customerName: string | null;
  }[] = [];
  let dbError = false;
  try {
    rows = await db
      .select({
        id: documents.id,
        number: documents.number,
        status: documents.status,
        issueDate: documents.issueDate,
        grandTotalFils: documents.grandTotalFils,
        customerName: customers.name,
      })
      .from(documents)
      .leftJoin(customers, eq(documents.customerId, customers.id))
      .where(and(eq(documents.companyId, COMPANY_ID), eq(documents.type, "quotation")))
      .orderBy(desc(documents.id))
      .limit(200);
  } catch {
    dbError = true;
  }

  return (
    <div>
      <PageHeader
        title="Quotations"
        subtitle="Branded quotes you can convert to an invoice in one click."
        action={<LinkButton href="/quotations/new">New quotation</LinkButton>}
      />
      <Card>
        {dbError ? (
          <EmptyState title="Database not connected yet" hint="Set DATABASE_URL and run the migrations, then refresh." />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No quotations yet"
            hint="Create your first quotation. You'll need at least one customer and one item."
            action={<LinkButton href="/quotations/new">New quotation</LinkButton>}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Number</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-b border-line last:border-0 hover:bg-bg">
                  <td className="px-5 py-3">
                    <Link href={`/quotations/${d.id}`} className="font-medium text-ink hover:text-teal-ink tnum">
                      {d.number}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{d.customerName ?? "—"}</td>
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
