import { and, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { getSession } from "@/lib/auth";
import { documents, documentLines, customers, companies } from "@/db/schema";
import { renderDeliveryPdf, type DeliveryPdfData } from "@/components/delivery-note-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const _session = await getSession();
  if (!_session || _session.role === "demo") return new Response("Not allowed in demo mode", { status: 403 });
  const { id } = await params;
  const dnId = Number(id);
  if (!Number.isInteger(dnId)) return new Response("Not found", { status: 404 });

  const [doc] = await db.select().from(documents)
    .where(and(eq(documents.id, dnId), eq(documents.companyId, COMPANY_ID), eq(documents.type, "delivery_note"))).limit(1);
  if (!doc) return new Response("Not found", { status: 404 });

  const [[cust], lines, [company]] = await Promise.all([
    doc.customerId ? db.select().from(customers).where(eq(customers.id, doc.customerId)).limit(1) : Promise.resolve([undefined]),
    db.select().from(documentLines).where(eq(documentLines.documentId, dnId)).orderBy(asc(documentLines.lineNo)),
    db.select().from(companies).where(eq(companies.id, COMPANY_ID)).limit(1),
  ]);

  const data: DeliveryPdfData = {
    company: {
      name: company?.name ?? "Your Company",
      trn: company?.trn,
      address: [company?.addressLine1, company?.city, company?.country].filter(Boolean).join(", ") || null,
      email: company?.email,
    },
    customer: { name: cust?.name ?? "—", address: cust?.billingAddress ?? null },
    note: { number: doc.number, issueDate: doc.issueDate, reference: doc.reference, notes: doc.notes },
    lines: lines.map((l) => ({ description: l.description, quantity: String(Number(l.quantity)) })),
  };

  const buffer = await renderDeliveryPdf(data);
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${doc.number}.pdf"`, "Cache-Control": "no-store" },
  });
}
