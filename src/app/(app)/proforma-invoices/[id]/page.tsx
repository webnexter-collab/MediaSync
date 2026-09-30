import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { documents, documentLines, customers, companies } from "@/db/schema";
import { PageHeader, Card, Badge } from "@/components/ui";
import { formatFils } from "@/lib/money";
import { setProformaStatus, convertProformaToTaxInvoice } from "@/actions/proforma";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

const TAX_LABEL: Record<string, string> = { standard: "5%", zero_rated: "0%", exempt: "Exempt", reverse_charge: "RC", out_of_scope: "OOS" };
const STATUS_TONE: Record<string, "neutral" | "good" | "muted"> = { draft: "muted", sent: "neutral", converted: "good", cancelled: "muted" };

export default async function ProformaDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proId = Number(id);
  if (!Number.isInteger(proId)) notFound();

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, proId), eq(documents.companyId, COMPANY_ID), eq(documents.type, "proforma_invoice")))
    .limit(1);
  if (!doc) notFound();

  const [[cust], lines, [company]] = await Promise.all([
    doc.customerId ? db.select().from(customers).where(eq(customers.id, doc.customerId)).limit(1) : Promise.resolve([undefined]),
    db.select().from(documentLines).where(eq(documentLines.documentId, proId)).orderBy(asc(documentLines.lineNo)),
    db.select().from(companies).where(eq(companies.id, COMPANY_ID)).limit(1),
  ]);

  const isDraft = doc.status === "draft";
  const isConverted = doc.status === "converted";
  const markSent = setProformaStatus.bind(null, proId, "sent");
  const reopen = setProformaStatus.bind(null, proId, "draft");
  const cancel = setProformaStatus.bind(null, proId, "cancelled");
  const toInvoice = convertProformaToTaxInvoice.bind(null, proId);

  return (
    <div>
      <PageHeader
        title={doc.number}
        subtitle={`Proforma Invoice · ${cust?.name ?? "—"}`}
        action={
          <div className="flex flex-wrap gap-2">
            <a href={`/proforma-invoices/${proId}/pdf`} target="_blank" className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg hover:bg-bg">Download PDF</a>
            <a href={`/proforma-invoices/${proId}/export`} className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg hover:bg-bg">Excel</a>
            {isDraft && (
              <form action={markSent}><button className="inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink-2">Mark as sent</button></form>
            )}
            {doc.status === "sent" && (
              <form action={reopen}><button className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg hover:bg-bg">Reopen draft</button></form>
            )}
            {!isConverted && doc.status !== "cancelled" && (
              <form action={toInvoice}><button className="inline-flex h-10 items-center rounded-lg bg-teal px-4 text-sm font-medium text-white hover:opacity-90">Issue Tax Invoice</button></form>
            )}
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <Badge tone={STATUS_TONE[doc.status] ?? "neutral"}>{doc.status.replace("_", " ")}</Badge>
        {isConverted && <span className="text-xs text-teal-ink">Tax invoice issued. <Link href="/invoices" className="underline">View invoices →</Link></span>}
        {doc.status !== "cancelled" && !isConverted && (
          <form action={cancel}><button className="text-xs text-muted hover:text-danger">Cancel proforma</button></form>
        )}
      </div>

      <Card>
        <div className="p-6">
          <div className="mb-6 grid grid-cols-1 gap-6 text-sm sm:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">From</div>
              <div className="mt-1 font-medium text-ink">{company?.name}</div>
              {company?.trn && <div className="tnum text-muted">TRN: {company.trn}</div>}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Bill to</div>
              <div className="mt-1 font-medium text-ink">{cust?.name ?? "—"}</div>
              {cust?.trn && <div className="tnum text-muted">TRN: {cust.trn}</div>}
              {cust?.billingAddress && <div className="text-muted">{cust.billingAddress}</div>}
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <Meta label="Issue date" value={doc.issueDate} />
            <Meta label="BO reference" value={doc.reference ?? "—"} />
            <Meta label="Currency" value={doc.currency} />
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2.5 pr-3 font-medium">Description</th>
                <th className="w-16 px-3 py-2.5 text-right font-medium">Qty</th>
                <th className="w-28 px-3 py-2.5 text-right font-medium">Unit</th>
                <th className="w-16 px-3 py-2.5 text-right font-medium">VAT</th>
                <th className="w-32 py-2.5 pl-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} className="border-b border-line">
                  <td className="py-2.5 pr-3">{l.description}</td>
                  <td className="px-3 py-2.5 text-right tnum">{Number(l.quantity)}</td>
                  <td className="px-3 py-2.5 text-right tnum">{formatFils(l.unitPriceFils, { withSymbol: false })}</td>
                  <td className="px-3 py-2.5 text-right tnum text-muted">{TAX_LABEL[l.taxCategory] ?? l.taxCategory}</td>
                  <td className="py-2.5 pl-3 text-right tnum">{formatFils(l.lineSubtotalFils, { withSymbol: false })}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <dl className="w-64 space-y-1.5 text-sm">
              <Row label="Subtotal" value={formatFils(doc.subtotalFils, { currency: doc.currency })} />
              {doc.discountTotalFils > 0 && <Row label="Discount" value={`− ${formatFils(doc.discountTotalFils, { withSymbol: false })}`} />}
              <Row label="VAT" value={formatFils(doc.vatTotalFils, { currency: doc.currency })} />
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold text-ink">
                <dt>Total</dt><dd className="tnum">{formatFils(doc.grandTotalFils, { currency: doc.currency })}</dd>
              </div>
            </dl>
          </div>

          {doc.notes && (
            <div className="mt-6 text-sm">
              <div className="text-xs uppercase tracking-wide text-muted">Notes</div>
              <p className="mt-1 whitespace-pre-wrap text-fg">{doc.notes}</p>
            </div>
          )}
          <p className="mt-6 text-xs text-muted">This is a proforma invoice for payment purposes and is not a tax invoice.</p>
        </div>
      </Card>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs uppercase tracking-wide text-muted">{label}</div><div className="mt-0.5 tnum text-fg">{value}</div></div>;
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><dt className="text-muted">{label}</dt><dd className="tnum">{value}</dd></div>;
}
