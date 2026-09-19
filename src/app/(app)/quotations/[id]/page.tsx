import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { documents, documentLines, customers, companies } from "@/db/schema";
import { PageHeader, Card, Badge } from "@/components/ui";
import { formatFils } from "@/lib/money";
import { setQuotationStatus, convertQuotationToInvoice } from "@/actions/quotations";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

const TAX_LABEL: Record<string, string> = {
  standard: "5%",
  zero_rated: "0%",
  exempt: "Exempt",
  reverse_charge: "RC",
  out_of_scope: "OOS",
};

export default async function QuotationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qId = Number(id);
  if (!Number.isInteger(qId)) notFound();

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, qId), eq(documents.companyId, COMPANY_ID), eq(documents.type, "quotation")))
    .limit(1);
  if (!doc) notFound();

  const [[cust], lines, [company]] = await Promise.all([
    doc.customerId
      ? db.select().from(customers).where(eq(customers.id, doc.customerId)).limit(1)
      : Promise.resolve([undefined]),
    db.select().from(documentLines).where(eq(documentLines.documentId, qId)).orderBy(asc(documentLines.lineNo)),
    db.select().from(companies).where(eq(companies.id, COMPANY_ID)).limit(1),
  ]);

  const isDraft = doc.status === "draft";
  const isConverted = doc.status === "converted";
  const markSent = setQuotationStatus.bind(null, qId, "sent");
  const markAccepted = setQuotationStatus.bind(null, qId, "accepted");
  const markRejected = setQuotationStatus.bind(null, qId, "rejected");
  const reopen = setQuotationStatus.bind(null, qId, "draft");
  const convert = convertQuotationToInvoice.bind(null, qId);

  return (
    <div>
      <PageHeader
        title={doc.number}
        subtitle={`Quotation · ${cust?.name ?? "—"}`}
        action={
          <div className="flex flex-wrap gap-2">
            <a
              href={`/quotations/${qId}/pdf`}
              target="_blank"
              className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg hover:bg-bg"
            >
              Download PDF
            </a>
            {isDraft && (
              <Link
                href={`/quotations/${qId}/edit`}
                className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg hover:bg-bg"
              >
                Edit
              </Link>
            )}
            {isDraft && (
              <form action={markSent}>
                <button className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg hover:bg-bg">
                  Mark as sent
                </button>
              </form>
            )}
            {!isConverted && doc.status !== "cancelled" && (
              <form action={convert}>
                <button className="inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink-2">
                  Convert to invoice
                </button>
              </form>
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge tone={doc.status === "accepted" || doc.status === "converted" ? "good" : doc.status === "sent" ? "neutral" : "muted"}>
          {doc.status.replace("_", " ")}
        </Badge>
        {(doc.status === "sent" || doc.status === "draft") && (
          <>
            <form action={markAccepted}>
              <button className="text-xs text-teal-ink hover:underline">Mark accepted</button>
            </form>
            <form action={markRejected}>
              <button className="text-xs text-muted hover:text-danger">Mark rejected</button>
            </form>
          </>
        )}
        {(doc.status === "rejected" || doc.status === "accepted") && !isConverted && (
          <form action={reopen}>
            <button className="text-xs text-muted hover:underline">Reopen draft</button>
          </form>
        )}
        {isConverted && doc.reference && (
          <span className="text-xs text-muted">Converted to invoice</span>
        )}
      </div>

      <Card>
        <div className="p-6">
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">From</div>
              <div className="mt-1 font-medium text-ink">{company?.name}</div>
              {company?.trn && <div className="text-muted tnum">TRN: {company.trn}</div>}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Prepared for</div>
              <div className="mt-1 font-medium text-ink">{cust?.name}</div>
              {cust?.trn && <div className="text-muted tnum">TRN: {cust.trn}</div>}
              {cust?.billingAddress && <div className="text-muted">{cust.billingAddress}</div>}
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <Meta label="Issue date" value={doc.issueDate} />
            <Meta label="Valid until" value={doc.dueDate ?? "—"} />
            <Meta label="Reference" value={doc.reference ?? "—"} />
          </div>

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
