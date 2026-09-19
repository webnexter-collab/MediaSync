import Link from "next/link";
import { desc, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { payments, suppliers } from "@/db/schema";
import { PageHeader, LinkButton, Card, EmptyState } from "@/components/ui";
import { formatFils } from "@/lib/money";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;
const METHOD_LABEL: Record<string, string> = { cash: "Cash", bank_transfer: "Bank transfer", cheque: "Cheque", card: "Card", other: "Other" };

export default async function PaymentsPage() {
  let rows: { id: number; number: string; paymentDate: string; method: string; amountFils: number; supplierName: string | null }[] = [];
  let dbError = false;
  try {
    rows = await db.select({
      id: payments.id, number: payments.number, paymentDate: payments.paymentDate,
      method: payments.method, amountFils: payments.amountFils, supplierName: suppliers.name,
    }).from(payments).leftJoin(suppliers, eq(payments.supplierId, suppliers.id))
      .where(and(eq(payments.companyId, COMPANY_ID), eq(payments.direction, "payment")))
      .orderBy(desc(payments.id)).limit(200);
  } catch { dbError = true; }

  return (
    <div>
      <PageHeader title="Payments" subtitle="Payments made to suppliers, applied to purchase orders." action={<LinkButton href="/payments/new">Record payment</LinkButton>} />
      <Card>
        {dbError ? (
          <EmptyState title="Database not connected yet" hint="Set DATABASE_URL and run the migrations, then refresh." />
        ) : rows.length === 0 ? (
          <EmptyState title="No payments yet" hint="Record a payment against a supplier's outstanding orders." action={<LinkButton href="/payments/new">Record payment</LinkButton>} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Number</th><th className="px-5 py-3 font-medium">Supplier</th>
                <th className="px-5 py-3 font-medium">Date</th><th className="px-5 py-3 font-medium">Method</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0 hover:bg-bg">
                  <td className="px-5 py-3"><Link href={`/payments/${p.id}`} className="font-medium text-ink hover:text-teal-ink tnum">{p.number}</Link></td>
                  <td className="px-5 py-3">{p.supplierName ?? "—"}</td>
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
