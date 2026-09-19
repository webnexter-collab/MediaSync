import Link from "next/link";
import { desc, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { documents, customers } from "@/db/schema";
import { PageHeader, LinkButton, Card, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

const STATUS_LABEL: Record<string, string> = { draft: "draft", sent: "delivered", cancelled: "cancelled" };
const STATUS_TONE: Record<string, "neutral" | "good" | "muted"> = { draft: "muted", sent: "good", cancelled: "muted" };

export default async function DeliveryNotesPage() {
  let rows: { id: number; number: string; status: string; issueDate: string; reference: string | null; customerName: string | null }[] = [];
  let dbError = false;
  try {
    rows = await db
      .select({
        id: documents.id,
        number: documents.number,
        status: documents.status,
        issueDate: documents.issueDate,
        reference: documents.reference,
        customerName: customers.name,
      })
      .from(documents)
      .leftJoin(customers, eq(documents.customerId, customers.id))
      .where(and(eq(documents.companyId, COMPANY_ID), eq(documents.type, "delivery_note")))
      .orderBy(desc(documents.id))
      .limit(200);
  } catch {
    dbError = true;
  }

  return (
    <div>
      <PageHeader
        title="Delivery Notes"
        subtitle="Record what was delivered — generate from an invoice or create standalone."
        action={<LinkButton href="/delivery-notes/new">New delivery note</LinkButton>}
      />
      <Card>
        {dbError ? (
          <EmptyState title="Database not connected yet" hint="Set DATABASE_URL and run the migrations, then refresh." />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No delivery notes yet"
            hint="Create one directly, or generate it from an invoice."
            action={<LinkButton href="/delivery-notes/new">New delivery note</LinkButton>}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Number</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Reference</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-b border-line last:border-0 hover:bg-bg">
                  <td className="px-5 py-3">
                    <Link href={`/delivery-notes/${d.id}`} className="font-medium text-ink hover:text-teal-ink tnum">
                      {d.number}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{d.customerName ?? "—"}</td>
                  <td className="px-5 py-3 tnum text-muted">{d.issueDate}</td>
                  <td className="px-5 py-3 tnum text-muted">{d.reference ?? "—"}</td>
                  <td className="px-5 py-3">
                    <Badge tone={STATUS_TONE[d.status] ?? "neutral"}>{STATUS_LABEL[d.status] ?? d.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
