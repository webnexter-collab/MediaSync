import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookingOrders, bookingOrderLines } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { BookingOrderForm } from "@/components/booking-order-form";
import { getBookingOrderFormOptions } from "@/lib/crm-options";
import { updateBookingOrder } from "@/actions/booking-orders";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;

export default async function EditBookingOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const boId = Number(id);
  if (!Number.isInteger(boId)) notFound();

  const [bo] = await db.select().from(bookingOrders).where(and(eq(bookingOrders.id, boId), eq(bookingOrders.companyId, COMPANY_ID))).limit(1);
  if (!bo) notFound();

  const [lineRows, opts] = await Promise.all([
    db.select().from(bookingOrderLines).where(eq(bookingOrderLines.bookingOrderId, boId)).orderBy(asc(bookingOrderLines.lineNo)),
    getBookingOrderFormOptions(),
  ]);

  const action = updateBookingOrder.bind(null, boId);
  const defaults = {
    toName: bo.toName ?? "",
    publisherVendorId: bo.publisherVendorId,
    accountId: bo.accountId,
    advertiser: bo.advertiser ?? "",
    agency: bo.agency ?? "",
    client: bo.client ?? "",
    brand: bo.brand ?? "",
    campaign: bo.campaign ?? "",
    medium: bo.medium ?? "",
    currency: bo.currency,
    issueDate: bo.issueDate,
    paymentTerms: bo.paymentTerms ?? "",
    agencyDiscountPct: String(Number(bo.agencyDiscountPct)),
    vatRatePct: String(Number(bo.vatRatePct)),
    notes: bo.notes ?? "",
    lines: lineRows.map((l) => ({
      mediaType: l.mediaType,
      channelId: l.channelId,
      platform: l.platform ?? "",
      particulars: l.particulars ?? "",
      brandingDetails: l.brandingDetails ?? "",
      period: l.period ?? "",
      quantity: String(Number(l.quantity)),
      uom: l.uom ?? "",
      unitGross: String((l.unitGrossFils ?? 0) / 100),
      discountPct: String(Number(l.discountPct)),
      days: (() => { try { const a = JSON.parse(l.annexure ?? "[]"); return Array.isArray(a) ? a.filter((n: unknown) => typeof n === "number") : []; } catch { return []; } })(),
    })),
  };

  return (
    <div>
      <PageHeader title={`Edit ${bo.number}`} subtitle="Draft booking order" />
      <Card>
        <div className="px-6 py-6">
          <BookingOrderForm
            action={action}
            vendors={opts.vendors}
            accounts={opts.accounts}
            currencies={opts.currencies}
            channels={opts.channels}
            defaults={defaults}
            submitLabel="Update booking order"
            cancelHref={`/booking-orders/${bo.id}`}
          />
        </div>
      </Card>
    </div>
  );
}
