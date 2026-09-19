import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { documents, documentLines, customers, companies } from "@/db/schema";
import { PageHeader, Card, Badge } from "@/components/ui";
import { formatFils } from "@/lib/money";
import { setInvoiceStatus } from "@/actions/invoices";
import { createDeliveryNoteFromInvoice } from "@/actions/delivery-notes";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

const TAX_LABEL: Record<string, string> = {
  standard: "5%",
  zero_rated: "0%",
  exempt: "Exempt",
  reverse_charge: "RC",
  out_of_scope: "OOS",
};

export default async function InvoiceDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invId = Number(id);
  if (!Number.isInteger(invId)) notFound();

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, invId), eq(documents.companyId, COMPANY_ID), eq(documents.type, "invoice")))
    .limit(1);
  if (!doc) notFound();

  const [[cust], lines, [company]] = await Promise.all([
    doc.customerId
      ? db.select().from(customers).where(eq(customers.id, doc.customerId)).limit(1)
      : Promise.resolve([undefined]),
    db.select().from(documentLines).where(eq(documentLines.documentId, invId)).orderBy(asc(documentLines.lineNo)),
    db.select().from(companies).where(eq(companies.id, COMPANY_ID)).limit(1),
  ]);

  const isDraft = doc.status === "draft";
  const outstandingFils = doc.grandTotalFils - doc.amountPaidFils;
  const canReceive = (doc.status === "sent" || doc.status === "partially_paid") && outstandingFils > 0;
  const makeDeliveryNote = createDeliveryNoteFromInvoice.bind(null, invId);
  const markSent = setInvoiceStatus.bind(null, invId, "sent");
  const cancel = setInvoiceStatus.bind(null, invId, "cancelled");
  const reopen = setInvoiceStatus.bind(null, invId, "draft");

  return (
    <div>
      <PageHeader
        title={doc.number}
        subtitle={`Invoice · ${cust?.name ?? "—"}`}
        action={
          <div className="flex flex-wrap gap-2">
            <a
              href={`/invoices/${invId}/pdf`}
              target="_blank"
              className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg hover:bg-bg"
            >
              Download PDF
            </a>
            {isDraft && (
              <Link
                href={`/invoices/${invId}/edit`}
                className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg hover:bg-bg"
              >
                Edit
              </Link>
            )}
            {doc.status !== "cancelled" && (
              <form action={makeDeliveryNote}>
                <button className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg hover:bg-bg">
                  Create delivery note
                </button>
              </form>
            )}
            {isDraft && (
              <form action={markSent}>
                <button className="inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink-2">
                  Mark as sent
                </button>
              </form>
            )}
            {canReceive && (
              <Link
                href={`/receipts/new?customerId=${doc.customerId}`}
                className="inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink-2"
              >
                Record receipt
              </Link>
            )}
            {doc.status === "sent" && (
              <form action={reopen}>
                <button className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg hover:bg-bg">
                  Reopen draft
                </button>
              </form>
            )}
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <Badge tone={doc.status === "cancelled" ? "muted" : doc.status === "sent" ? "good" : "neutral"}>
          {doc.status.replace("_", " ")}
        </Badge>
        {doc.status !== "cancelled" && (
          <form action={cancel}>
            <button className="text-xs text-muted hover:text-danger">Cancel invoice</button>
          </form>
        )}
      </div>

      <Card>
        <div className="p-6">
          {/* Parties */}
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">From</div>
              <div className="mt-1 font-medium text-ink">{company?.name}</div>
              {company?.trn && <div className="text-muted tnum">TRN: {company.trn}</div>}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Bill to</div>
              <div className="mt-1 font-medium text-ink">{cust?.name}</div>
              {cust?.trn && <div className="text-muted tnum">TRN: {cust.trn}</div>}
              {cust?.billingAddress && <div className="text-muted">{cust.billingAddress}</div>}
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <Meta label="Issue date" value={doc.issueDate} />
            <Meta label="Due date" value={doc.dueDate ?? "—"} />
            <Meta label="Reference" value={doc.reference ?? "—"} />
          </div>

          {/* Lines */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2.5 pr-3 font-medium">Description</th>
                <th className="w-16 py-2.5 px-3 text-right font-medium">Qty</th>
                <th className="w-28 py-2.5 px-3 text-right font-medium">Unit</th>
                <th className="w-16 py-2.5 px-3 text-right font-medium">VAT</th>
                <th className="w-32 py-2.5 pl-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} className="border-b border-line">
                  <td className="py-2.5 pr-3">{l.description}</td>
                  <td className="py-2.5 px-3 text-right tnum">{l.quantity}</td>
                  <td className="py-2.5 px-3 text-right tnum">{formatFils(l.unitPriceFils, { withSymbol: false })}</td>
                  <td className="py-2.5 px-3 text-right tnum text-muted">{TAX_LABEL[l.taxCategory] ?? l.taxCategory}</td>
                  <td className="py-2.5 pl-3 text-right tnum">{formatFils(l.lineSubtotalFils, { withSymbol: false })}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <dl className="w-64 space-y-1.5 text-sm">
              <Row label="Subtotal" value={formatFils(doc.subtotalFils)} />
              {doc.discountTotalFils > 0 && (
                <Row label="Discount" value={`− ${formatFils(doc.discountTotalFils, { withSymbol: false })}`} />
              )}
              <Row label="VAT" value={formatFils(doc.vatTotalFils)} />
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold text-ink">
                <dt>Total</dt>
                <dd className="tnum">{formatFils(doc.grandTotalFils)}</dd>
              </div>
              {doc.amountPaidFils > 0 && (
                <>
                  <Row label="Paid" value={`− ${formatFils(doc.amountPaidFils, { withSymbol: false })}`} />
                  <div className="flex justify-between border-t border-line pt-2 font-semibold text-teal-ink">
                    <dt>Outstanding</dt>
                    <dd className="tnum">{formatFils(outstandingFils)}</dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          {doc.notes && (
            <div className="mt-6 text-sm">
              <div className="text-xs uppercase tracking-wide text-muted">Notes</div>
              <p className="mt-1 whitespace-pre-wrap text-fg">{doc.notes}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 tnum text-fg">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="tnum">{value}</dd>
    </div>
  );
}
