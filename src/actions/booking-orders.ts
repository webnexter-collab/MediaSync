"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { bookingOrders, bookingOrderLines, documents, documentLines } from "@/db/schema";
import { assertCanWrite, assertCanApprove, getSession } from "@/lib/auth";
import { bookingOrderSchema, type FormState, type BookingOrderInput } from "@/lib/validators";
import { toFils } from "@/lib/money";
import { computeBoLine, computeBoTotals } from "@/lib/booking-order";
import { computeLine, computeTotals, type LineInput } from "@/lib/vat";
import { nextNumber, nextBookingOrderNumber } from "@/lib/numbering";
import { getRateToBase } from "@/lib/fx";

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
    businessUnitId: formData.get("businessUnitId"),
    salespersonId: formData.get("salespersonId"),
    industryId: formData.get("industryId"),
    agencyAccountId: formData.get("agencyAccountId"),
    clientAccountId: formData.get("clientAccountId"),
    receiptDate: formData.get("receiptDate"),
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
    const unitCostFils = toFils(l.unitCost);
    const r = computeBoLine({ quantity: l.quantity, unitGrossFils, discountPct: l.discountPct, unitCostFils });
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
      unitCostFils,
      lineCostFils: r.lineCostFils,
      annexure: JSON.stringify([...(l.days ?? [])].sort((a, b) => a - b)),
    };
  });
}

function headerTotals(data: BookingOrderInput) {
  const { totals } = computeBoTotals(
    data.lines.map((l) => ({
      quantity: l.quantity,
      unitGrossFils: toFils(l.unitGross),
      discountPct: l.discountPct,
      unitCostFils: toFils(l.unitCost),
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
  const exchangeRate = await getRateToBase(data.currency, COMPANY_ID);

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
          exchangeRate,
          publisherVendorId: data.publisherVendorId,
          toName: data.toName,
          accountId: data.accountId,
          advertiser: data.advertiser,
          agency: data.agency,
          client: data.client,
          brand: data.brand,
          campaign: data.campaign,
          medium: data.medium,
          businessUnitId: data.businessUnitId,
          salespersonId: data.salespersonId,
          industryId: data.industryId,
          agencyAccountId: data.agencyAccountId,
          clientAccountId: data.clientAccountId,
          receiptDate: data.receiptDate,
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
          totalCostFils: t.totalCostFils,
          marginFils: t.marginFils,
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
  const exchangeRate = await getRateToBase(data.currency, COMPANY_ID);

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(bookingOrders)
        .set({
          exchangeRate,
          publisherVendorId: data.publisherVendorId,
          toName: data.toName,
          accountId: data.accountId,
          advertiser: data.advertiser,
          agency: data.agency,
          client: data.client,
          brand: data.brand,
          campaign: data.campaign,
          medium: data.medium,
          businessUnitId: data.businessUnitId,
          salespersonId: data.salespersonId,
          industryId: data.industryId,
          agencyAccountId: data.agencyAccountId,
          clientAccountId: data.clientAccountId,
          receiptDate: data.receiptDate,
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
          totalCostFils: t.totalCostFils,
          marginFils: t.marginFils,
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

/**
 * Convert a Booking Order into a Tax Invoice (documents table). The BO's
 * header agency-discount is folded into each line's discount so the invoice
 * totals reconcile with the BO. Marks the BO 'invoiced'.
 */
export async function convertBookingOrderToInvoice(boId: number): Promise<void> {
  await assertCanWrite();

  const [bo] = await db
    .select()
    .from(bookingOrders)
    .where(and(eq(bookingOrders.id, boId), eq(bookingOrders.companyId, COMPANY_ID)))
    .limit(1);
  if (!bo) throw new Error("Booking order not found.");
  if (bo.status === "cancelled" || bo.status === "invoiced") {
    throw new Error(`Cannot invoice a ${bo.status} booking order.`);
  }

  const lines = await db
    .select()
    .from(bookingOrderLines)
    .where(eq(bookingOrderLines.bookingOrderId, boId))
    .orderBy(asc(bookingOrderLines.lineNo));
  if (lines.length === 0) throw new Error("Booking order has no lines.");

  const agencyPct = Number(bo.agencyDiscountPct) || 0;
  const vatRate = Number(bo.vatRatePct) || 0;

  // Map each BO line to an invoice line; combined discount = 1 - (1-lineDisc)(1-agency).
  const mapped = lines.map((l) => {
    const lineDisc = Number(l.discountPct) || 0;
    const combinedPct = Math.round((1 - (1 - lineDisc / 100) * (1 - agencyPct / 100)) * 10000) / 100;
    const description = [l.platform, l.particulars, l.brandingDetails, l.period]
      .filter(Boolean)
      .join(" · ") || "Media placement";
    return {
      description,
      quantity: Number(l.quantity),
      unitPriceFils: l.unitGrossFils,
      discountPercent: combinedPct,
      taxCategory: "standard" as const,
      vatRate,
    };
  });

  const inputs: LineInput[] = mapped.map((m) => ({
    quantity: m.quantity,
    unitPriceFils: m.unitPriceFils,
    discountPercent: m.discountPercent,
    taxCategory: m.taxCategory,
    vatRate: m.vatRate,
  }));
  const { totals } = computeTotals(inputs);

  const notes = [
    `Converted from Booking Order ${bo.number}.`,
    bo.toName ? `Publisher: ${bo.toName}.` : null,
    bo.advertiser || bo.agency || bo.client ? `Advertiser/Agency/Client: ${[bo.advertiser, bo.agency, bo.client].filter(Boolean).join(" / ")}.` : null,
    bo.campaign ? `Campaign: ${bo.campaign}.` : null,
  ].filter(Boolean).join(" ");

  let invId: number;
  try {
    invId = await db.transaction(async (tx) => {
      const number = await nextNumber(tx, { companyId: COMPANY_ID, kind: "invoice", prefix: "INV" });
      const [doc] = await tx
        .insert(documents)
        .values({
          companyId: COMPANY_ID,
          type: "invoice",
          number,
          partyType: "customer",
          customerId: bo.accountId,
          status: "draft",
          issueDate: new Date().toISOString().slice(0, 10),
          reference: bo.number,
          currency: bo.currency,
          exchangeRate: bo.exchangeRate,
          subtotalFils: totals.subtotalFils,
          discountTotalFils: totals.discountTotalFils,
          vatTotalFils: totals.vatTotalFils,
          grandTotalFils: totals.grandTotalFils,
          paymentTerms: bo.paymentTerms,
          notes,
        })
        .returning({ id: documents.id });

      await tx.insert(documentLines).values(
        mapped.map((m, i) => {
          const r = computeLine({
            quantity: m.quantity,
            unitPriceFils: m.unitPriceFils,
            discountPercent: m.discountPercent,
            taxCategory: m.taxCategory,
            vatRate: m.vatRate,
          });
          return {
            documentId: doc.id,
            lineNo: i + 1,
            description: m.description,
            quantity: String(m.quantity),
            unitPriceFils: m.unitPriceFils,
            discountPercent: String(m.discountPercent),
            taxCategory: m.taxCategory,
            vatRate: String(m.vatRate),
            lineSubtotalFils: r.lineSubtotalFils,
            vatAmountFils: r.vatAmountFils,
            lineTotalFils: r.lineTotalFils,
          };
        }),
      );

      await tx
        .update(bookingOrders)
        .set({ status: "invoiced", updatedAt: new Date() })
        .where(and(eq(bookingOrders.id, boId), eq(bookingOrders.companyId, COMPANY_ID)));

      return doc.id;
    });
  } catch (e) {
    throw new Error(`Could not create invoice: ${e instanceof Error ? e.message : "error"}`);
  }

  revalidatePath("/invoices");
  revalidatePath(`/booking-orders/${boId}`);
  redirect(`/invoices/${invId}`);
}

/**
 * Convert a Booking Order into a Proforma Invoice (documents table, type
 * proforma_invoice, own PRO- numbering). A proforma is a pre-invoice quote for
 * payment — it shows VAT but does NOT consume the BO (no status change) and is
 * not a tax document. The client later gets a Tax Invoice.
 */
export async function convertBookingOrderToProforma(boId: number): Promise<void> {
  await assertCanWrite();

  const [bo] = await db
    .select()
    .from(bookingOrders)
    .where(and(eq(bookingOrders.id, boId), eq(bookingOrders.companyId, COMPANY_ID)))
    .limit(1);
  if (!bo) throw new Error("Booking order not found.");
  if (bo.status === "cancelled") throw new Error("Cannot raise a proforma for a cancelled booking order.");

  const lines = await db
    .select()
    .from(bookingOrderLines)
    .where(eq(bookingOrderLines.bookingOrderId, boId))
    .orderBy(asc(bookingOrderLines.lineNo));
  if (lines.length === 0) throw new Error("Booking order has no lines.");

  const agencyPct = Number(bo.agencyDiscountPct) || 0;
  const vatRate = Number(bo.vatRatePct) || 0;

  const mapped = lines.map((l) => {
    const lineDisc = Number(l.discountPct) || 0;
    const combinedPct = Math.round((1 - (1 - lineDisc / 100) * (1 - agencyPct / 100)) * 10000) / 100;
    const description = [l.platform, l.particulars, l.brandingDetails, l.period].filter(Boolean).join(" · ") || "Media placement";
    return { description, quantity: Number(l.quantity), unitPriceFils: l.unitGrossFils, discountPercent: combinedPct, taxCategory: "standard" as const, vatRate };
  });

  const inputs: LineInput[] = mapped.map((m) => ({ quantity: m.quantity, unitPriceFils: m.unitPriceFils, discountPercent: m.discountPercent, taxCategory: m.taxCategory, vatRate: m.vatRate }));
  const { totals } = computeTotals(inputs);

  const notes = [
    `Proforma for Booking Order ${bo.number}.`,
    bo.toName ? `Medium: ${bo.toName}.` : null,
    bo.agency || bo.client ? `Agency/Client: ${[bo.agency, bo.client].filter(Boolean).join(" / ")}.` : null,
    bo.campaign ? `Campaign: ${bo.campaign}.` : null,
  ].filter(Boolean).join(" ");

  let proId: number;
  try {
    proId = await db.transaction(async (tx) => {
      const number = await nextNumber(tx, { companyId: COMPANY_ID, kind: "proforma", prefix: "PRO" });
      const [doc] = await tx
        .insert(documents)
        .values({
          companyId: COMPANY_ID,
          type: "proforma_invoice",
          number,
          partyType: "customer",
          customerId: bo.clientAccountId ?? bo.accountId,
          status: "draft",
          issueDate: new Date().toISOString().slice(0, 10),
          reference: bo.number,
          currency: bo.currency,
          exchangeRate: bo.exchangeRate,
          subtotalFils: totals.subtotalFils,
          discountTotalFils: totals.discountTotalFils,
          vatTotalFils: totals.vatTotalFils,
          grandTotalFils: totals.grandTotalFils,
          paymentTerms: bo.paymentTerms,
          notes,
        })
        .returning({ id: documents.id });

      await tx.insert(documentLines).values(
        mapped.map((m, i) => {
          const r = computeLine({ quantity: m.quantity, unitPriceFils: m.unitPriceFils, discountPercent: m.discountPercent, taxCategory: m.taxCategory, vatRate: m.vatRate });
          return {
            documentId: doc.id, lineNo: i + 1, description: m.description,
            quantity: String(m.quantity), unitPriceFils: m.unitPriceFils,
            discountPercent: String(m.discountPercent), taxCategory: m.taxCategory, vatRate: String(m.vatRate),
            lineSubtotalFils: r.lineSubtotalFils, vatAmountFils: r.vatAmountFils, lineTotalFils: r.lineTotalFils,
          };
        }),
      );
      return doc.id;
    });
  } catch (e) {
    throw new Error(`Could not create proforma: ${e instanceof Error ? e.message : "error"}`);
  }

  revalidatePath("/proforma-invoices");
  revalidatePath(`/booking-orders/${boId}`);
  redirect(`/proforma-invoices/${proId}`);
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
  revalidatePath("/tracker");
}

/* --------------------------- Approval workflow ---------------------------- *
 * Sales Manager creates a draft BO and submits it; the Account Group Manager
 * approves it after the client confirms. Reporting counts approved BOs.
 * Lifecycle: draft → pending_approval → approved → sent → confirmed → invoiced.
 * -------------------------------------------------------------------------- */

/** Sales submits a draft for the Account Group Manager to approve. */
export async function submitBookingOrderForApproval(id: number) {
  await assertCanWrite();
  await db
    .update(bookingOrders)
    .set({ status: "pending_approval", submittedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(bookingOrders.id, id), eq(bookingOrders.companyId, COMPANY_ID), eq(bookingOrders.status, "draft")));
  revalidatePath(`/booking-orders/${id}`);
  revalidatePath("/booking-orders");
  revalidatePath("/tracker");
}

/** Account Group Manager approves a submitted BO. */
export async function approveBookingOrder(id: number) {
  const session = await assertCanApprove();
  await db
    .update(bookingOrders)
    .set({ status: "approved", approvedBy: session.userId, approvedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(bookingOrders.id, id), eq(bookingOrders.companyId, COMPANY_ID), eq(bookingOrders.status, "pending_approval")));
  revalidatePath(`/booking-orders/${id}`);
  revalidatePath("/booking-orders");
  revalidatePath("/tracker");
}

/** Account Group Manager sends a submitted BO back to draft for revision. */
export async function rejectBookingOrder(id: number) {
  await assertCanApprove();
  await db
    .update(bookingOrders)
    .set({ status: "draft", submittedAt: null, updatedAt: new Date() })
    .where(and(eq(bookingOrders.id, id), eq(bookingOrders.companyId, COMPANY_ID), eq(bookingOrders.status, "pending_approval")));
  revalidatePath(`/booking-orders/${id}`);
  revalidatePath("/booking-orders");
  revalidatePath("/tracker");
}
