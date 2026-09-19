import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { getSession } from "@/lib/auth";
import { bookingOrders, bookingOrderLines, companies } from "@/db/schema";
import { renderBookingOrderPdf, type BookingOrderPdfData } from "@/components/booking-order-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMPANY_ID = 1;
const MEDIA_LABEL: Record<string, string> = { print: "Print", digital: "Digital", radio: "Radio", tv: "TV", website: "Website" };

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role === "demo") return new Response("Not allowed in demo mode", { status: 403 });
  const { id } = await params;
  const boId = Number(id);
  if (!Number.isInteger(boId)) return new Response("Not found", { status: 404 });

  const [bo] = await db.select().from(bookingOrders).where(and(eq(bookingOrders.id, boId), eq(bookingOrders.companyId, COMPANY_ID))).limit(1);
  if (!bo) return new Response("Not found", { status: 404 });

  const [lines, [company]] = await Promise.all([
    db.select().from(bookingOrderLines).where(eq(bookingOrderLines.bookingOrderId, boId)).orderBy(asc(bookingOrderLines.lineNo)),
    db.select().from(companies).where(eq(companies.id, COMPANY_ID)).limit(1),
  ]);

  const data: BookingOrderPdfData = {
    company: {
      name: company?.name ?? "Mindset Media",
      legalName: company?.legalName,
      address: [company?.addressLine1, company?.addressLine2, company?.city, company?.country].filter(Boolean).join(", ") || null,
      trn: company?.trn,
    },
    bo: {
      number: bo.number, issueDate: bo.issueDate, currency: bo.currency, status: bo.status,
      toName: bo.toName, advertiser: bo.advertiser, agency: bo.agency, client: bo.client,
      brand: bo.brand, campaign: bo.campaign, medium: bo.medium, paymentTerms: bo.paymentTerms,
      totalGrossFils: bo.totalGrossFils, lineDiscountFils: bo.lineDiscountFils,
      agencyDiscountFils: bo.agencyDiscountFils, totalNetFils: bo.totalNetFils,
      vatFils: bo.vatFils, grandTotalFils: bo.grandTotalFils, vatRatePct: String(bo.vatRatePct),
      notes: bo.notes,
    },
    lines: lines.map((l) => ({
      mediaLabel: MEDIA_LABEL[l.mediaType] ?? l.mediaType,
      platform: l.platform, particulars: l.particulars, brandingDetails: l.brandingDetails,
      period: l.period, quantity: String(Number(l.quantity)), uom: l.uom,
      unitGrossFils: l.unitGrossFils, discountPct: String(l.discountPct), lineNetFils: l.lineNetFils,
    })),
  };

  const buffer = await renderBookingOrderPdf(data);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${bo.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
