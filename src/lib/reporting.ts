import "server-only";
import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  bookingOrders, businessUnits, salespeople, industries, customers, agencyGroups, fxRates, salesTargets,
} from "@/db/schema";

const COMPANY_ID = 1;

/** Booking statuses that count as booked revenue (approved by the AGM or later). */
export const REVENUE_STATUSES = ["approved", "sent", "confirmed", "invoiced"] as const;

export type ReportFilters = {
  buId?: number | null;
  year?: number | null;
  month?: number | null;
  currency?: string; // reporting currency (default USD)
  salespersonId?: number | null; // scope to one salesperson (Sales role)
};

export type BookingRow = {
  id: number;
  number: string;
  year: number;
  month: number; // 1-12
  period: string; // YYYY-MM
  buId: number | null;
  buName: string | null;
  medium: string | null; // media type classification (Print/Digital/…)
  publisher: string | null; // the media/publisher (toName)
  agency: string | null;
  client: string | null;
  agencyGroup: string | null;
  campaign: string | null;
  salesId: number | null;
  salesName: string | null;
  industry: string | null;
  revenueFils: number; // net revenue (ex-VAT), converted to the reporting currency
  grandFils: number; // incl. VAT, converted
};

/** Latest FX rate (currency → AED base) per currency code. */
async function loadFxToAed(): Promise<Map<string, number>> {
  const rows = await db
    .select({ code: fxRates.currencyCode, rate: fxRates.rateToBase, asOf: fxRates.asOfDate })
    .from(fxRates)
    .where(eq(fxRates.companyId, COMPANY_ID))
    .orderBy(asc(fxRates.currencyCode), desc(fxRates.asOfDate));
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!map.has(r.code)) map.set(r.code, Number(r.rate) || 1); // first = latest per code
  }
  map.set("AED", map.get("AED") ?? 1);
  return map;
}

/** Convert fils in `from` currency into `to` currency, via AED base. */
function convert(fils: number, from: string, to: string, fx: Map<string, number>): number {
  const rFrom = fx.get(from) ?? 1;
  const rTo = fx.get(to) ?? 1;
  return Math.round((fils * rFrom) / rTo);
}

export const REPORTING_CURRENCIES = ["USD", "AED"] as const;
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Fetch approved-or-later booking orders with all reporting dimensions, each
 * amount converted into the reporting currency. Period = receipt date when
 * present, else issue date.
 */
export async function fetchApprovedBookings(filters: ReportFilters): Promise<{
  rows: BookingRow[];
  currency: string;
}> {
  const currency = (filters.currency && REPORTING_CURRENCIES.includes(filters.currency as (typeof REPORTING_CURRENCIES)[number]))
    ? filters.currency
    : "USD";
  const fx = await loadFxToAed();

  const periodExpr = sql<string>`to_char(coalesce(${bookingOrders.receiptDate}, ${bookingOrders.issueDate}), 'YYYY-MM')`;

  const conds: (SQL | undefined)[] = [
    eq(bookingOrders.companyId, COMPANY_ID),
    inArray(bookingOrders.status, [...REVENUE_STATUSES]),
  ];
  if (filters.buId) conds.push(eq(bookingOrders.businessUnitId, filters.buId));
  if (filters.salespersonId) conds.push(eq(bookingOrders.salespersonId, filters.salespersonId));
  if (filters.year) conds.push(sql`extract(year from coalesce(${bookingOrders.receiptDate}, ${bookingOrders.issueDate})) = ${filters.year}`);
  if (filters.month) conds.push(sql`extract(month from coalesce(${bookingOrders.receiptDate}, ${bookingOrders.issueDate})) = ${filters.month}`);

  const raw = await db
    .select({
      id: bookingOrders.id,
      number: bookingOrders.number,
      period: periodExpr,
      buId: bookingOrders.businessUnitId,
      buName: businessUnits.name,
      medium: bookingOrders.medium,
      publisher: bookingOrders.toName,
      agency: bookingOrders.agency,
      client: bookingOrders.client,
      agencyGroup: agencyGroups.name,
      campaign: bookingOrders.campaign,
      salesId: bookingOrders.salespersonId,
      salesName: salespeople.name,
      industry: industries.name,
      netFils: bookingOrders.totalNetFils,
      grandFils: bookingOrders.grandTotalFils,
      currency: bookingOrders.currency,
      exchangeRate: bookingOrders.exchangeRate,
    })
    .from(bookingOrders)
    .leftJoin(businessUnits, eq(businessUnits.id, bookingOrders.businessUnitId))
    .leftJoin(salespeople, eq(salespeople.id, bookingOrders.salespersonId))
    .leftJoin(industries, eq(industries.id, bookingOrders.industryId))
    .leftJoin(customers, eq(customers.id, bookingOrders.agencyAccountId))
    .leftJoin(agencyGroups, eq(agencyGroups.id, customers.agencyGroupId))
    .where(and(...conds))
    .limit(5000);

  const rTarget = fx.get(currency) ?? 1; // reporting currency → AED
  // Value in reporting currency using the booking's FROZEN rate to AED, then
  // AED → reporting currency at the current rate for that currency.
  const toReporting = (fils: number, boRate: number) => Math.round((fils * boRate) / rTarget);

  const rows: BookingRow[] = raw.map((r) => {
    const [y, m] = (r.period ?? "0000-00").split("-");
    const boRate = Number(r.exchangeRate) || 1;
    return {
      id: r.id,
      number: r.number,
      year: Number(y),
      month: Number(m),
      period: r.period ?? "",
      buId: r.buId,
      buName: r.buName,
      medium: r.medium,
      publisher: r.publisher,
      agency: r.agency,
      client: r.client,
      agencyGroup: r.agencyGroup,
      campaign: r.campaign,
      salesId: r.salesId,
      salesName: r.salesName,
      industry: r.industry,
      revenueFils: toReporting(r.netFils, boRate),
      grandFils: toReporting(r.grandFils, boRate),
    };
  });

  return { rows, currency };
}

/** Sum a measure over rows grouped by a string key; returns sorted desc. */
export function rankBy(
  rows: BookingRow[],
  keyFn: (r: BookingRow) => string | null | undefined,
  measure: (r: BookingRow) => number = (r) => r.revenueFils,
  emptyLabel = "—",
): { label: string; value: number; count: number }[] {
  const map = new Map<string, { value: number; count: number }>();
  for (const r of rows) {
    const label = (keyFn(r) || emptyLabel).trim() || emptyLabel;
    const cur = map.get(label) ?? { value: 0, count: 0 };
    cur.value += measure(r);
    cur.count += 1;
    map.set(label, cur);
  }
  return [...map.entries()]
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.value - a.value);
}

/** Active business units for filter dropdowns. */
export async function getReportBusinessUnits(): Promise<{ id: number; name: string }[]> {
  try {
    return await db
      .select({ id: businessUnits.id, name: businessUnits.name })
      .from(businessUnits)
      .where(and(eq(businessUnits.companyId, COMPANY_ID), eq(businessUnits.isActive, true)))
      .orderBy(asc(businessUnits.sortOrder), asc(businessUnits.name));
  } catch {
    return [];
  }
}

/** Monthly target totals (converted to reporting currency) per salesperson for a year. */
export async function getSalesTargetsByPerson(
  year: number,
  currency: string,
  buId?: number | null,
  onlySalespersonId?: number | null,
): Promise<Map<number, { name: string; monthly: number[]; annual: number }>> {
  const fx = await loadFxToAed();
  const spRows = await db
    .select({ id: salespeople.id, name: salespeople.name, buId: salespeople.businessUnitId })
    .from(salespeople)
    .where(and(eq(salespeople.companyId, COMPANY_ID), eq(salespeople.isActive, true)))
    .orderBy(asc(salespeople.name));
  const tRows = await db
    .select({ salespersonId: salesTargets.salespersonId, month: salesTargets.month, targetFils: salesTargets.targetFils, currency: salesTargets.currency })
    .from(salesTargets)
    .where(and(eq(salesTargets.companyId, COMPANY_ID), eq(salesTargets.year, year)));

  const out = new Map<number, { name: string; monthly: number[]; annual: number }>();
  for (const sp of spRows) {
    if (buId && sp.buId !== buId) continue;
    if (onlySalespersonId && sp.id !== onlySalespersonId) continue;
    out.set(sp.id, { name: sp.name, monthly: Array(12).fill(0), annual: 0 });
  }
  for (const t of tRows) {
    const e = out.get(t.salespersonId);
    if (!e) continue;
    const v = convert(t.targetFils, t.currency, currency, fx);
    e.monthly[t.month - 1] += v;
    e.annual += v;
  }
  return out;
}
