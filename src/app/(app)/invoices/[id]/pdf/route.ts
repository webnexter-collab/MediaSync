import { and, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { getSession } from "@/lib/auth";
import { documents, documentLines, customers, companies } from "@/db/schema";
import { renderInvoicePdf, type InvoicePdfData } from "@/components/invoice-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMPANY_ID = 1;

const VAT_LABEL: Record<string, string> = {
  standard: "5%",
  zero_rated: "0%",
  exempt: "Exempt",
  reverse_charge: "RC",
  out_of_scope: "OOS",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const _session = await getSession();
  if (!_session || _session.role === "demo") return new Response("Not allowed in demo mode", { status: 403 });
  const { id } = await params;
  const invId = Number(id);
  if (!Number.isInteger(invId)) return new Response("Not found", { status: 404 });

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, invId), eq(documents.companyId, COMPANY_ID), eq(documents.type, "invoice")))
    .limit(1);
  if (!doc) return new Response("Not found", { status: 404 });

  const [[cust], lines, [company]] = await Promise.all([
    doc.customerId
      ? db.select().from(customers).where(eq(customers.id, doc.customerId)).limit(1)
      : Promise.resolve([undefined]),
    db.select().from(documentLines).where(eq(documentLines.documentId, invId)).orderBy(asc(documentLines.lineNo)),
    db.select().from(companies).where(eq(companies.id, COMPANY_ID)).limit(1),
  ]);

  const data: InvoicePdfData = {
    company: {
      name: company?.name ?? "Your Company",
      trn: company?.trn,
      address: [company?.addressLine1, company?.city, company?.country].filter(Boolean).join(", ") || null,
      email: company?.email,
    },
    customer: {
      name: cust?.name ?? "—",
      trn: cust?.trn,
      address: cust?.billingAddress ?? null,
    },
    invoice: {
      number: doc.number,
      issueDate: doc.issueDate,
      dueDate: doc.dueDate,
      reference: doc.reference,
      status: doc.status,
      currency: doc.currency,
      subtotalFils: doc.subtotalFils,
      discountTotalFils: doc.discountTotalFils,
      vatTotalFils: doc.vatTotalFils,
      grandTotalFils: doc.grandTotalFils,
      notes: doc.notes,
      terms: doc.terms,
      paymentTerms: doc.paymentTerms,
      bankDetails: doc.bankDetails,
    },
    lines: lines.map((l) => ({
      description: l.description,
      quantity: String(Number(l.quantity)),
      unitPriceFils: l.unitPriceFils,
      vatLabel: VAT_LABEL[l.taxCategory] ?? l.taxCategory,
      lineSubtotalFils: l.lineSubtotalFils,
    })),
  };

  const buffer = await renderInvoicePdf(data);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
