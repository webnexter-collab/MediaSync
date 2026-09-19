import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, paymentAllocations, documents, customers, companies } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
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

export default async function ReceiptDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rId = Number(id);
  if (!Number.isInteger(rId)) notFound();

  const [receipt] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, rId), eq(payments.companyId, COMPANY_ID), eq(payments.direction, "receipt")))
    .limit(1);
  if (!receipt) notFound();

  const [[cust], allocs, [company]] = await Promise.all([
    receipt.customerId ? db.select().from(customers).where(eq(customers.id, receipt.customerId)).limit(1) : Promise.resolve([undefined]),
    db
      .select({
        amountAllocatedFils: paymentAllocations.amountAllocatedFils,
        invoiceNumber: documents.number,
        invoiceId: documents.id,
      })
      .from(paymentAllocations)
      .leftJoin(documents, eq(paymentAllocations.documentId, documents.id))
      .where(eq(paymentAllocations.paymentId, rId)),
    db.select().from(companies).where(eq(companies.id, COMPANY_ID)).limit(1),
  ]);

  return (
    <div>
      <PageHeader
        title={receipt.number}
        subtitle={`Receipt · ${cust?.name ?? "—"}`}
        action={
          <a
            href={`/receipts/${rId}/pdf`}
            target="_blank"
            className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg hover:bg-bg"
          >
            Download PDF
          </a>
        }
      />

      <Card>
        <div className="p-6">
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Received by</div>
              <div className="mt-1 font-medium text-ink">{company?.name}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Received from</div>
              <div className="mt-1 font-medium text-ink">{cust?.name}</div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Date</div>
              <div className="mt-0.5 tnum text-fg">{receipt.paymentDate}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Method</div>
              <div className="mt-0.5 text-fg">{METHOD_LABEL[receipt.method] ?? receipt.method}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Reference</div>
              <div className="mt-0.5 tnum text-fg">{receipt.reference ?? "—"}</div>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2.5 pr-3 font-medium">Applied to invoice</th>
                <th className="py-2.5 pl-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {allocs.map((a, i) => (
                <tr key={i} className="border-b border-line">
                  <td className="py-2.5 pr-3">
                    {a.invoiceId ? (
                      <Link href={`/invoices/${a.invoiceId}`} className="text-ink hover:text-teal-ink tnum">
                        {a.invoiceNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2.5 pl-3 text-right tnum">{formatFils(a.amountAllocatedFils, { withSymbol: false })}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <div className="flex w-64 justify-between border-t border-line pt-2 text-base font-semibold text-ink">
              <span>Total received</span>
              <span className="tnum">{formatFils(receipt.amountFils)}</span>
            </div>
          </div>

          {receipt.notes && (
            <div className="mt-6 text-sm">
              <div className="text-xs uppercase tracking-wide text-muted">Notes</div>
              <p className="mt-1 whitespace-pre-wrap text-fg">{receipt.notes}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
