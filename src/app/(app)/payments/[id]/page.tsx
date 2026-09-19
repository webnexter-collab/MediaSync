import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, paymentAllocations, documents, suppliers, companies, bankAccounts } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { formatFils } from "@/lib/money";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;
const METHOD_LABEL: Record<string, string> = { cash: "Cash", bank_transfer: "Bank transfer", cheque: "Cheque", card: "Card", other: "Other" };

export default async function PaymentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pId = Number(id);
  if (!Number.isInteger(pId)) notFound();

  const [pay] = await db.select().from(payments)
    .where(and(eq(payments.id, pId), eq(payments.companyId, COMPANY_ID), eq(payments.direction, "payment"))).limit(1);
  if (!pay) notFound();

  const [[supp], allocs, [company], acct] = await Promise.all([
    pay.supplierId ? db.select().from(suppliers).where(eq(suppliers.id, pay.supplierId)).limit(1) : Promise.resolve([undefined]),
    db.select({ amountAllocatedFils: paymentAllocations.amountAllocatedFils, poNumber: documents.number, poId: documents.id })
      .from(paymentAllocations).leftJoin(documents, eq(paymentAllocations.documentId, documents.id))
      .where(eq(paymentAllocations.paymentId, pId)),
    db.select().from(companies).where(eq(companies.id, COMPANY_ID)).limit(1),
    pay.bankAccountId ? db.select({ name: bankAccounts.name }).from(bankAccounts).where(eq(bankAccounts.id, pay.bankAccountId)).limit(1) : Promise.resolve([]),
  ]);

  return (
    <div>
      <PageHeader title={pay.number} subtitle={`Payment · ${supp?.name ?? "—"}`}
        action={<a href={`/payments/${pId}/pdf`} target="_blank" className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg hover:bg-bg">Download PDF</a>} />
      <Card>
        <div className="p-6">
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div><div className="text-xs uppercase tracking-wide text-muted">Paid by</div><div className="mt-1 font-medium text-ink">{company?.name}</div></div>
            <div><div className="text-xs uppercase tracking-wide text-muted">Paid to</div><div className="mt-1 font-medium text-ink">{supp?.name}</div></div>
          </div>
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><div className="text-xs uppercase tracking-wide text-muted">Date</div><div className="mt-0.5 tnum text-fg">{pay.paymentDate}</div></div>
            <div><div className="text-xs uppercase tracking-wide text-muted">Method</div><div className="mt-0.5 text-fg">{METHOD_LABEL[pay.method] ?? pay.method}</div></div>
            <div><div className="text-xs uppercase tracking-wide text-muted">From account</div><div className="mt-0.5 text-fg">{acct[0]?.name ?? "—"}</div></div>
            <div><div className="text-xs uppercase tracking-wide text-muted">Reference</div><div className="mt-0.5 tnum text-fg">{pay.reference ?? "—"}</div></div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2.5 pr-3 font-medium">Applied to order</th><th className="py-2.5 pl-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {allocs.map((a, i) => (
                <tr key={i} className="border-b border-line">
                  <td className="py-2.5 pr-3">{a.poId ? <Link href={`/purchase-orders/${a.poId}`} className="text-ink hover:text-teal-ink tnum">{a.poNumber}</Link> : "—"}</td>
                  <td className="py-2.5 pl-3 text-right tnum">{formatFils(a.amountAllocatedFils, { withSymbol: false })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex justify-end">
            <div className="flex w-64 justify-between border-t border-line pt-2 text-base font-semibold text-ink">
              <span>Total paid</span><span className="tnum">{formatFils(pay.amountFils)}</span>
            </div>
          </div>
          {pay.notes && (<div className="mt-6 text-sm"><div className="text-xs uppercase tracking-wide text-muted">Notes</div><p className="mt-1 whitespace-pre-wrap text-fg">{pay.notes}</p></div>)}
        </div>
      </Card>
    </div>
  );
}
