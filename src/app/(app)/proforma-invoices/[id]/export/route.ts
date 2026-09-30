import { and, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { getSession } from "@/lib/auth";
import { documents, documentLines, customers, companies } from "@/db/schema";
import { buildDocumentWorkbook } from "@/lib/report-xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMPANY_ID = 1;
const VAT_LABEL: Record<string, string> = { standard: "5%", zero_rated: "0%", exempt: "Exempt", reverse_charge: "RC", out_of_scope: "OOS" };
const M = (fils: number) => Math.round(fils) / 100;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role === "demo") return new Response("Not allowed in demo mode", { status: 403 });
  const { id } = await params;
  const proId = Number(id);
  if (!Number.isInteger(proId)) return new Response("Not found", { status: 404 });

  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, proId), eq(documents.companyId, COMPANY_ID), eq(documents.type, "proforma_invoice")))
    .limit(1);
  if (!doc) return new Response("Not found", { status: 404 });

  const [[cust], lines, [company]] = await Promise.all([
    doc.customerId ? db.select().from(customers).where(eq(customers.id, doc.customerId)).limit(1) : Promise.resolve([undefined]),
    db.select().from(documentLines).where(eq(documentLines.documentId, proId)).orderBy(asc(documentLines.lineNo)),
    db.select().from(companies).where(eq(companies.id, COMPANY_ID)).limit(1),
  ]);

  const buf = await buildDocumentWorkbook({
    docLabel: "Proforma Invoice",
    number: doc.number,
    issueDate: doc.issueDate,
    reference: doc.reference,
    currency: doc.currency,
    customerName: cust?.name ?? "—",
    companyName: company?.name ?? "Mindset Media",
    companyTrn: company?.trn,
    lines: lines.map((l) => ({
      description: l.description,
      quantity: Number(l.quantity),
      unitPrice: M(l.unitPriceFils),
      vatLabel: VAT_LABEL[l.taxCategory] ?? l.taxCategory,
      lineTotal: M(l.lineSubtotalFils),
    })),
    subtotal: M(doc.subtotalFils),
    discount: M(doc.discountTotalFils),
    vat: M(doc.vatTotalFils),
    total: M(doc.grandTotalFils),
  });

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${doc.number}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
