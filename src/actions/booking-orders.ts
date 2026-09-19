"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { bookingOrders, bookingOrderLines } from "@/db/schema";
import { assertCanWrite, getSession } from "@/lib/auth";
import { bookingOrderSchema, type FormState, type BookingOrderInput } from "@/lib/validators";
import { toFils } from "@/lib/money";
import { computeBoLine, computeBoTotals } from "@/lib/booking-order";
import { nextBookingOrderNumber } from "@/lib/numbering";

const COMPANY_ID = 1;

type Parsed = { ok: true; data: BookingOrderInput } | { ok: false; state: FormState };

function parse(formData: FormData): Parsed {
  let lines: unknown = [];
  try {
    lines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    return { ok: false, state: { ok: false, message: "Invalid line data" } };
  }
  const parsed = bookingOrderSchema.safeParse({
    toName: formData.get("toName"),
    publisherVendorId: formData.get("publisherVendorId"),
    accountId: formData.get("accountId"),
    advertiser: formData.get("advertiser"),
    agency: formData.get("agency"),
    client: formData.get("client"),
    brand: formData.get("brand"),
    campaign: formData.get("campaign"),
    medium: formData.get("medium"),
    currency: formData.get("currency") || "AED",
    issueDate: formData.get("issueDate"),
    paymentTerms: formData.get("paymentTerms"),
    agencyDiscountPct: formData.get("agencyDiscountPct") || 0,
    vatRatePct: formData.get("vatRatePct") ?? 5,
    notes: formData.get("notes"),
    terms: formData.get("terms"),
    lines,
  });
  if (!parsed.success) {
    const fe = parsed.error.flatten();
    const first = fe.formErrors[0] ?? Object.values(fe.fieldErrors).flat().find(Boolean);
    return { ok: false, state: { ok: false, errors: fe.fieldErrors, message: first ?? undefined } };
  }
  return { ok: true, data: parsed.data };
}

function lineValues(boId: number, data: BookingOrderInput) {
  return data.lines.map((l, i) => {
    const unitGrossFils = toFils(l.unitGross);
    const r = computeBoLine({ quantity: l.quantity, unitGrossFils, discountPct: l.discountPct });
    return {
      bookingOrderId: boId,
      lineNo: i + 1,
      mediaType: l.mediaType,
      channelId: l.channelId,
      platform: l.platform,
      particulars: l.particulars,
      brandingDetails: l.brandingDetails,
      period: l.period,
      quantity: String(l.quantity),
      uom: l.uom,
      unitGrossFils,
      discountPct: String(l.discountPct),
      unitNetFils: r.unitNetFils,
      lineGrossFils: r.lineGrossFils,
      lineNetFils: r.lineNetFils,
    };
  });
}

function headerTotals(data: BookingOrderInput) {
  const { totals } = computeBoTotals(
    data.lines.map((l) => ({
      quantity: l.quantity,
      unitGrossFils: toFils(l.unitGross),
      discountPct: l.discountPct,
    })),
    data.agencyDiscountPct,
    data.vatRatePct,
  );
  return totals;
}

export async function createBookingOrder(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertCanWrite();
  const res = parse(formData);
  if (!res.ok) return res.state;
  const data = res.data;
  const session = await getSession();
  const t = headerTotals(data);

  let newId: number;
  try {
    newId = await db.transaction(async (tx) => {
      const number = await nextBookingOrderNumber(tx, COMPANY_ID);
      const [bo] = await tx
        .insert(bookingOrders)
        .values({
          companyId: COMPANY_ID,
          number,
          status: "draft",
          publisherVendorId: data.publisherVendorId,
          toName: data.toName,
          accountId: data.accountId,
          advertiser: data.advertiser,
          agency: data.agency,
          client: data.client,
          brand: data.brand,
          campaign: data.campaign,
          medium: data.medium,
          currency: data.currency,
          issueDate: data.issueDate,
          paymentTerms: data.paymentTerms,
          agencyDiscountPct: String(data.agencyDiscountPct),
          vatRatePct: String(data.vatRatePct),
          totalGrossFils: t.totalGrossFils,
          lineDiscountFils: t.lineDiscountFils,
          agencyDiscountFils: t.agencyDiscountFils,
          totalNetFils: t.totalNetFils,
          vatFils: t.vatFils,
          grandTotalFils: t.grandTotalFils,
          notes: data.notes,
          terms: data.terms,
          createdBy: session?.userId ?? null,
        })
        .returning({ id: bookingOrders.id });
      await tx.insert(bookingOrderLines).values(lineValues(bo.id, data));
      return bo.id;
    });
  } catch (e) {
    return { ok: false, message: `Could not create booking order: ${e instanceof Error ? e.message : "error"}` };
  }
  revalidatePath("/booking-orders");
  redirect(`/booking-orders/${newId}`);
}

export async function updateBookingOrder(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await assertCanWrite();
  const res = parse(formData);
  if (!res.ok) return res.state;
  const data = res.data;
  const t = headerTotals(data);

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(bookingOrders)
        .set({
          publisherVendorId: data.publisherVendorId,
          toName: data.toName,
          accountId: data.accountId,
          advertiser: data.advertiser,
          agency: data.agency,
          client: data.client,
          brand: data.brand,
          campaign: data.campaign,
          medium: data.medium,
          currency: data.currency,
          issueDate: data.issueDate,
          paymentTerms: data.paymentTerms,
          agencyDiscountPct: String(data.agencyDiscountPct),
          vatRatePct: String(data.vatRatePct),
          totalGrossFils: t.totalGrossFils,
          lineDiscountFils: t.lineDiscountFils,
          agencyDiscountFils: t.agencyDiscountFils,
          totalNetFils: t.totalNetFils,
          vatFils: t.vatFils,
          grandTotalFils: t.grandTotalFils,
          notes: data.notes,
          terms: data.terms,
          updatedAt: new Date(),
        })
        .where(and(eq(bookingOrders.id, id), eq(bookingOrders.companyId, COMPANY_ID), eq(bookingOrders.status, "draft")));
      await tx.delete(bookingOrderLines).where(eq(bookingOrderLines.bookingOrderId, id));
      await tx.insert(bookingOrderLines).values(lineValues(id, data));
    });
  } catch (e) {
    return { ok: false, message: `Could not update booking order: ${e instanceof Error ? e.message : "error"}` };
  }
  revalidatePath(`/booking-orders/${id}`);
  redirect(`/booking-orders/${id}`);
}

export async function setBookingOrderStatus(
  id: number,
  status: "draft" | "sent" | "confirmed" | "cancelled",
) {
  await assertCanWrite();
  await db
    .update(bookingOrders)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(bookingOrders.id, id), eq(bookingOrders.companyId, COMPANY_ID)));
  revalidatePath(`/booking-orders/${id}`);
  revalidatePath("/booking-orders");
}
