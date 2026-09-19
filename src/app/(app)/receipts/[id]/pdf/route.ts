import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { getSession } from "@/lib/auth";
import { payments, paymentAllocations, documents, customers, companies } from "@/db/schema";
import { renderReceiptPdf, type ReceiptPdfData } from "@/components/receipt-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const _session = await getSession();
  if (!_session || _session.role === "demo") return new Response("Not allowed in demo mode", { status: 403 });
  const { id } = await params;
  const rId = Number(id);
  if (!Number.isInteger(rId)) return new Response("Not found", { status: 404 });

  const [receipt] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, rId), eq(payments.companyId, COMPANY_ID), eq(payments.direction, "receipt")))
    .limit(1);
  if (!receipt) return new Response("Not found", { status: 404 });

  const [[cust], allocs, [company]] = await Promise.all([
    receipt.customerId ? db.select().from(customers).where(eq(customers.id, receipt.customerId)).limit(1) : Promise.resolve([undefined]),
    db
      .select({ amountAllocatedFils: paymentAllocations.amountAllocatedFils, invoiceNumber: documents.number })
      .from(paymentAllocations)
      .leftJoin(documents, eq(paymentAllocations.documentId, documents.id))
      .where(eq(paymentAllocations.paymentId, rId)),
    db.select().from(companies).where(eq(companies.id, COMPANY_ID)).limit(1),
  ]);

  const data: ReceiptPdfData = {
    company: {
      name: company?.name ?? "Your Company",
      trn: company?.trn,
      address: [company?.addressLine1, company?.city, company?.country].filter(Boolean).join(", ") || null,
    },
    customer: { name: cust?.name ?? "—" },
    receipt: {
      number: receipt.number,
      paymentDate: receipt.paymentDate,
      method: receipt.method,
      reference: receipt.reference,
      amountFils: receipt.amountFils,
      notes: receipt.notes,
    },
    allocations: allocs.map((a) => ({ invoiceNumber: a.invoiceNumber, amountFils: a.amountAllocatedFils })),
  };

  const buffer = await renderReceiptPdf(data);
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${receipt.number}.pdf"`, "Cache-Control": "no-store" },
  });
}
