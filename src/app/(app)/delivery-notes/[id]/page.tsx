import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { documents, documentLines, customers, companies } from "@/db/schema";
import { PageHeader, Card, Badge } from "@/components/ui";
import { setDeliveryNoteStatus } from "@/actions/delivery-notes";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

const STATUS_LABEL: Record<string, string> = { draft: "draft", sent: "delivered", cancelled: "cancelled" };

export default async function DeliveryNoteDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dnId = Number(id);
  if (!Number.isInteger(dnId)) notFound();

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, dnId), eq(documents.companyId, COMPANY_ID), eq(documents.type, "delivery_note")))
    .limit(1);
  if (!doc) notFound();

  const [[cust], lines, [company]] = await Promise.all([
    doc.customerId ? db.select().from(customers).where(eq(customers.id, doc.customerId)).limit(1) : Promise.resolve([undefined]),
    db.select().from(documentLines).where(eq(documentLines.documentId, dnId)).orderBy(asc(documentLines.lineNo)),
    db.select().from(companies).where(eq(companies.id, COMPANY_ID)).limit(1),
  ]);

  const isDraft = doc.status === "draft";
  const markDelivered = setDeliveryNoteStatus.bind(null, dnId, "sent");
  const reopen = setDeliveryNoteStatus.bind(null, dnId, "draft");
  const cancel = setDeliveryNoteStatus.bind(null, dnId, "cancelled");

  return (
    <div>
      <PageHeader
        title={doc.number}
        subtitle={`Delivery note · ${cust?.name ?? "—"}`}
        action={
          <div className="flex flex-wrap gap-2">
            <a href={`/delivery-notes/${dnId}/pdf`} target="_blank" className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg hover:bg-bg">
              Download PDF
            </a>
            {isDraft && (
              <Link href={`/delivery-notes/${dnId}/edit`} className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg hover:bg-bg">
                Edit
              </Link>
            )}
            {isDraft ? (
              <form action={markDelivered}>
                <button className="inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink-2">Mark delivered</button>
              </form>
            ) : doc.status !== "cancelled" ? (
              <form action={reopen}>
                <button className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg hover:bg-bg">Reopen draft</button>
              </form>
            ) : null}
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <Badge tone={doc.status === "sent" ? "good" : "muted"}>{STATUS_LABEL[doc.status] ?? doc.status}</Badge>
        {doc.status !== "cancelled" && (
          <form action={cancel}>
            <button className="text-xs text-muted hover:text-danger">Cancel</button>
          </form>
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
              <div className="text-xs uppercase tracking-wide text-muted">Deliver to</div>
              <div className="mt-1 font-medium text-ink">{cust?.name}</div>
              {cust?.billingAddress && <div className="text-muted">{cust.billingAddress}</div>}
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Delivery date</div>
              <div className="mt-0.5 tnum text-fg">{doc.issueDate}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted">Reference</div>
              <div className="mt-0.5 tnum text-fg">{doc.reference ?? "—"}</div>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="w-10 py-2.5 pr-3 font-medium">#</th>
                <th className="py-2.5 pr-3 font-medium">Description</th>
                <th className="w-24 py-2.5 pl-3 text-right font-medium">Qty</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.id} className="border-b border-line">
                  <td className="py-2.5 pr-3 tnum text-muted">{i + 1}</td>
                  <td className="py-2.5 pr-3">{l.description}</td>
                  <td className="py-2.5 pl-3 text-right tnum">{Number(l.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

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
