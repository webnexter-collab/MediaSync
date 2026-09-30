import Link from "next/link";
import { desc, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { documents, customers } from "@/db/schema";
import { PageHeader, Card, Badge, EmptyState, LinkButton } from "@/components/ui";
import { formatFils } from "@/lib/money";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

const STATUS_TONE: Record<string, "neutral" | "good" | "muted"> = {
  draft: "muted", sent: "neutral", converted: "good", cancelled: "muted",
};

export default async function ProformaInvoicesPage() {
  let rows: { id: number; number: string; status: string; issueDate: string; reference: string | null; currency: string; grandTotalFils: number; customerName: string | null }[] = [];
  let dbError = false;
  try {
    rows = await db
      .select({
        id: documents.id, number: documents.number, status: documents.status,
        issueDate: documents.issueDate, reference: documents.reference,
        currency: documents.currency, grandTotalFils: documents.grandTotalFils,
        customerName: customers.name,
      })
      .from(documents)
      .leftJoin(customers, eq(documents.customerId, customers.id))
      .where(and(eq(documents.companyId, COMPANY_ID), eq(documents.type, "proforma_invoice")))
      .orderBy(desc(documents.id))
      .limit(200);
  } catch {
    dbError = true;
  }

  return (
    <div>
      <PageHeader
        title="Proforma Invoices"
        subtitle="Pre-invoice payment requests, from a booking order or standalone. VAT shown; not a tax document."
        action={<LinkButton href="/proforma-invoices/new">New proforma</LinkButton>}
      />
      <Card>
        {dbError ? (
          <EmptyState title="Database not connected yet" hint="Set DATABASE_URL and run the migrations, then refresh." />
        ) : rows.length === 0 ? (
          <EmptyState title="No proforma invoices yet" hint="Open a booking order and choose “Create Proforma”." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Number</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">BO Ref</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-b border-line last:border-0 hover:bg-bg">
                  <td className="px-5 py-3"><Link href={`/proforma-invoices/${d.id}`} className="font-medium text-ink hover:text-teal-ink tnum">{d.number}</Link></td>
                  <td className="px-5 py-3">{d.customerName ?? "—"}</td>
                  <td className="px-5 py-3 tnum text-muted">{d.reference ?? "—"}</td>
                  <td className="px-5 py-3 tnum text-muted">{d.issueDate}</td>
                  <td className="px-5 py-3"><Badge tone={STATUS_TONE[d.status] ?? "neutral"}>{d.status.replace("_", " ")}</Badge></td>
                  <td className="px-5 py-3 text-right tnum">{d.currency} {formatFils(d.grandTotalFils, { withSymbol: false })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
