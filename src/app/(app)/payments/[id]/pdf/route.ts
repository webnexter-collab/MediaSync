import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { getSession } from "@/lib/auth";
import { payments, paymentAllocations, documents, suppliers, companies } from "@/db/schema";
import { renderReceiptPdf, type ReceiptPdfData } from "@/components/receipt-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const _session = await getSession();
  if (!_session || _session.role === "demo") return new Response("Not allowed in demo mode", { status: 403 });
  const { id } = await params;
  const pId = Number(id);
  if (!Number.isInteger(pId)) return new Response("Not found", { status: 404 });

  const [pay] = await db.select().from(payments)
    .where(and(eq(payments.id, pId), eq(payments.companyId, COMPANY_ID), eq(payments.direction, "payment"))).limit(1);
  if (!pay) return new Response("Not found", { status: 404 });

  const [[supp], allocs, [company]] = await Promise.all([
    pay.supplierId ? db.select().from(suppliers).where(eq(suppliers.id, pay.supplierId)).limit(1) : Promise.resolve([undefined]),
    db.select({ amountAllocatedFils: paymentAllocations.amountAllocatedFils, poNumber: documents.number })
      .from(paymentAllocations).leftJoin(documents, eq(paymentAllocations.documentId, documents.id))
      .where(eq(paymentAllocations.paymentId, pId)),
    db.select().from(companies).where(eq(companies.id, COMPANY_ID)).limit(1),
  ]);

  const data: ReceiptPdfData = {
    docTitle: "PAYMENT VOUCHER",
    partyLabel: "Paid to",
    amountLabel: "Amount paid",
    appliedLabel: "Applied to order",
    company: { name: company?.name ?? "Your Company", trn: company?.trn, address: [company?.addressLine1, company?.city, company?.country].filter(Boolean).join(", ") || null },
    customer: { name: supp?.name ?? "—" },
    receipt: { number: pay.number, paymentDate: pay.paymentDate, method: pay.method, reference: pay.reference, amountFils: pay.amountFils, notes: pay.notes },
    allocations: allocs.map((a) => ({ invoiceNumber: a.poNumber, amountFils: a.amountAllocatedFils })),
  };

  const buffer = await renderReceiptPdf(data);
  return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${pay.number}.pdf"`, "Cache-Control": "no-store" } });
}
