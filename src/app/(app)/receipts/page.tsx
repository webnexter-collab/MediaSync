import Link from "next/link";
import { desc, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { payments, customers } from "@/db/schema";
import { PageHeader, LinkButton, Card, EmptyState } from "@/components/ui";
import { formatFils } from "@/lib/money";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  cheque: "Cheque",
  card: "Card",
  other: "Other",
};

export default async function ReceiptsPage() {
  let rows: { id: number; number: string; paymentDate: string; method: string; amountFils: number; reference: string | null; customerName: string | null }[] = [];
  let dbError = false;
  try {
    rows = await db
      .select({
        id: payments.id,
        number: payments.number,
        paymentDate: payments.paymentDate,
        method: payments.method,
        amountFils: payments.amountFils,
        reference: payments.reference,
        customerName: customers.name,
      })
      .from(payments)
      .leftJoin(customers, eq(payments.customerId, customers.id))
      .where(and(eq(payments.companyId, COMPANY_ID), eq(payments.direction, "receipt")))
      .orderBy(desc(payments.id))
      .limit(200);
  } catch {
    dbError = true;
  }

  return (
    <div>
      <PageHeader
        title="Receipts"
        subtitle="Payments received from customers, applied to their invoices."
        action={<LinkButton href="/receipts/new">Record receipt</LinkButton>}
      />
      <Card>
        {dbError ? (
          <EmptyState title="Database not connected yet" hint="Set DATABASE_URL and run the migrations, then refresh." />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No receipts yet"
            hint="Record a payment against a customer's outstanding invoices."
            action={<LinkButton href="/receipts/new">Record receipt</LinkButton>}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Number</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Method</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0 hover:bg-bg">
                  <td className="px-5 py-3">
                    <Link href={`/receipts/${p.id}`} className="font-medium text-ink hover:text-teal-ink tnum">
                      {p.number}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{p.customerName ?? "—"}</td>
                  <td className="px-5 py-3 tnum text-muted">{p.paymentDate}</td>
                  <td className="px-5 py-3 text-muted">{METHOD_LABEL[p.method] ?? p.method}</td>
                  <td className="px-5 py-3 text-right tnum">{formatFils(p.amountFils)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
