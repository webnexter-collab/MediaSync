import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookingOrders, bookingOrderLines } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { BookingOrderForm, type BoDefaults } from "@/components/booking-order-form";
import { getBookingOrderFormOptions } from "@/lib/crm-options";
import { updateBookingOrder } from "@/actions/booking-orders";
import { parseSchedule } from "@/lib/schedule";

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
  const defaults: BoDefaults = {
    assetId: bo.assetId,
    toName: bo.toName ?? "",
    agency: bo.agency ?? "",
    client: bo.client ?? "",
    agencyAccountId: bo.agencyAccountId,
    clientAccountId: bo.clientAccountId,
    businessUnitId: bo.businessUnitId,
    salespersonId: bo.salespersonId,
    industryId: bo.industryId,
    categoryId: bo.categoryId,
    campaign: bo.campaign ?? "",
    medium: bo.medium ?? "",
    currency: bo.currency,
    issueDate: bo.issueDate,
    receiptDate: bo.receiptDate ?? "",
    revenueMonth: (bo.revenueMonth ?? bo.receiptDate ?? bo.issueDate).slice(0, 7),
    startDate: bo.startDate ?? "",
    endDate: bo.endDate ?? "",
    region: bo.region ?? "",
    salesOffice: bo.salesOffice ?? "",
    clientBoRef: bo.clientBoRef ?? "",
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
      unitCost: String((l.unitCostFils ?? 0) / 100),
      schedule: parseSchedule(l.annexure, l.mediaType),
    })),
  };

  return (
    <div>
      <PageHeader title={`Edit ${bo.number}`} subtitle="Draft booking order" />
      <Card>
        <div className="px-6 py-6">
          <BookingOrderForm
            action={action}
            accounts={opts.accounts}
            currencies={opts.currencies}
            assets={opts.assets}
            rateItems={opts.rateItems}
            uomOptions={opts.uomOptions}
            businessUnits={opts.businessUnits}
            salespeople={opts.salespeople}
            industries={opts.industries}
            categories={opts.categories}
            defaults={defaults}
            submitLabel="Update booking order"
            cancelHref={`/booking-orders/${bo.id}`}
          />
        </div>
      </Card>
    </div>
  );
}
