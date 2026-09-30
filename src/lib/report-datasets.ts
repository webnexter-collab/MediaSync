import "server-only";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { bookingOrders, businessUnits, salespeople, industries } from "@/db/schema";
import {
  fetchApprovedBookings, getReportBusinessUnits, getSalesTargetsByPerson, rankBy,
  MONTHS, type BookingRow,
} from "@/lib/reporting";

const COMPANY_ID = 1;

export type Cell = string | number;
export type Section = {
  heading?: string;
  columns: string[];
  rows: Cell[][];
  totals?: Cell[];
  numericCols: number[]; // right-aligned / number-formatted
  moneyCols: number[]; // subset formatted as currency (2 dp)
};
export type ReportDataset = {
  title: string;
  subtitle: string;
  currency: string;
  meta: string[]; // filter summary lines
  sections: Section[];
};

const M = (fils: number) => Math.round(fils) / 100; // minor → major units
const pct = (v: number, total: number) => (total > 0 ? Math.round((v / total) * 1000) / 10 : 0);

export type ReportParams = {
  report: string;
  bu?: string;
  year?: string;
  month?: string;
  currency?: string;
  status?: string;
  q?: string;
  dim?: string;
  measure?: string;
};

function baseParams(p: ReportParams) {
  const now = new Date().getFullYear();
  const buId = p.bu && p.bu !== "all" ? Number(p.bu) : null;
  const year = p.year && p.year !== "all" ? Number(p.year) : now;
  const month = p.month && p.month !== "all" ? Number(p.month) : null;
  const currency = p.currency === "AED" ? "AED" : "USD";
  return { buId, year, month, currency };
}

async function metaLines(buId: number | null, year: number, month: number | null, currency: string) {
  let buName = "All units";
  if (buId) {
    const units = await getReportBusinessUnits();
    buName = units.find((u) => u.id === buId)?.name ?? `Unit ${buId}`;
  }
  const period = month ? `${MONTHS[month - 1]} ${year}` : `${year} (YTD)`;
  return [`Business unit: ${buName}`, `Period: ${period}`, `Reporting currency: ${currency}`];
}

/** Ranked section: [label, Bookings, Revenue, Share %]. */
function rankSection(rows: BookingRow[], keyFn: (r: BookingRow) => string | null | undefined, label: string, empty: string): Section {
  const ranked = rankBy(rows, keyFn, undefined, empty);
  const total = ranked.reduce((s, r) => s + r.value, 0);
  return {
    columns: [label, "Bookings", "Revenue", "Share %"],
    rows: ranked.map((r) => [r.label, r.count, M(r.value), pct(r.value, total)]),
    totals: ["Total", ranked.reduce((s, r) => s + r.count, 0), M(total), 100],
    numericCols: [1, 2, 3],
    moneyCols: [2],
  };
}

/* Custom-report dimensions/measures (kept in sync with the custom page). */
const DIMENSIONS: Record<string, { label: string; fn: (r: BookingRow) => string | null | undefined; empty: string }> = {
  bu: { label: "Business Unit", fn: (r) => r.buName, empty: "Unassigned" },
  platform: { label: "Platform (Media)", fn: (r) => r.medium, empty: "Unspecified" },
  medium: { label: "Station / Medium", fn: (r) => r.publisher, empty: "Unspecified" },
  agency: { label: "Agency", fn: (r) => r.agency, empty: "Direct" },
  client: { label: "Client", fn: (r) => r.client, empty: "Unspecified" },
  agencyGroup: { label: "Agency Group", fn: (r) => r.agencyGroup, empty: "Unaffiliated" },
  salesperson: { label: "Salesperson", fn: (r) => r.salesName, empty: "Unassigned" },
  industry: { label: "Industry", fn: (r) => r.industry, empty: "Unspecified" },
  campaign: { label: "Campaign", fn: (r) => r.campaign, empty: "Unspecified" },
  month: { label: "Month", fn: (r) => r.period, empty: "—" },
};
const MEASURES: Record<string, { label: string; fn: (r: BookingRow) => number; money: boolean }> = {
  net: { label: "Net revenue", fn: (r) => r.revenueFils, money: true },
  grand: { label: "Gross incl. VAT", fn: (r) => r.grandFils, money: true },
  count: { label: "Bookings", fn: () => 1, money: false },
};

const REPORT_TITLES: Record<string, string> = {
  monthly: "Monthly Revenue",
  platform: "Revenue Share by Platform",
  medium: "Revenue by Station / Medium",
  sales: "Revenue by Sales — Target vs Achievement",
  agency: "Revenue by Agency",
  client: "Revenue by Client",
  "agency-group": "Revenue by Agency Group",
  cross: "Revenue by Agency × Client × Medium",
  "medium-split": "Revenue by Client / Agency × Medium",
  top10: "Top 10 Agencies, Clients & Campaigns",
  custom: "Custom Report",
  tracker: "Tracker — Booking Register",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", pending_approval: "Pending", approved: "Approved", sent: "Sent", confirmed: "Confirmed", invoiced: "Invoiced", cancelled: "Cancelled",
};
export async function buildReportDataset(p: ReportParams): Promise<ReportDataset> {
  const key = p.report;
  const { buId, year, month, currency } = baseParams(p);
  const title = REPORT_TITLES[key] ?? "Report";

  if (key === "tracker") return buildTrackerDataset(p, buId, year, month);

  const meta = await metaLines(buId, year, month, currency);
  const { rows } = await fetchApprovedBookings({ buId, year, month, currency });

  let sections: Section[] = [];

  if (key === "monthly") {
    const monthly = Array.from({ length: 12 }, () => ({ value: 0, count: 0 }));
    for (const r of rows) if (r.month >= 1 && r.month <= 12) { monthly[r.month - 1].value += r.revenueFils; monthly[r.month - 1].count += 1; }
    const annual = monthly.reduce((s, m) => s + m.value, 0);
    let cum = 0;
    sections = [{
      columns: ["Month", "Bookings", "Revenue", "Share %", "Cumulative (YTD)"],
      rows: monthly.map((m, i) => { cum += m.value; return [`${MONTHS[i]} ${year}`, m.count, M(m.value), pct(m.value, annual), M(cum)]; }),
      totals: [`Total ${year}`, rows.length, M(annual), 100, M(annual)],
      numericCols: [1, 2, 3, 4], moneyCols: [2, 4],
    }];
  } else if (key === "platform") {
    sections = [rankSection(rows, (r) => r.medium, "Platform", "Unspecified")];
  } else if (key === "medium") {
    sections = [rankSection(rows, (r) => r.publisher, "Station / Medium", "Unspecified")];
  } else if (key === "agency") {
    sections = [rankSection(rows, (r) => r.agency, "Agency", "Direct (no agency)")];
  } else if (key === "client") {
    sections = [rankSection(rows, (r) => r.client, "Client", "Unspecified")];
  } else if (key === "agency-group") {
    sections = [rankSection(rows, (r) => r.agencyGroup, "Agency Group", "Unaffiliated / Direct")];
  } else if (key === "cross") {
    sections = [crossSection(rows)];
  } else if (key === "medium-split") {
    sections = [
      { heading: "Client × Medium", ...pairSection(rows, (r) => r.client, "Unspecified", "Client") },
      { heading: "Agency × Medium", ...pairSection(rows, (r) => r.agency, "Direct", "Agency") },
    ];
  } else if (key === "top10") {
    sections = [
      { heading: "Top 10 Agencies", ...topSection(rows, (r) => r.agency, "Agency", "Direct") },
      { heading: "Top 10 Clients", ...topSection(rows, (r) => r.client, "Client", "Unspecified") },
      { heading: "Top 10 Campaigns", ...topSection(rows, (r) => r.campaign, "Campaign", "Unspecified") },
    ];
  } else if (key === "custom") {
    const dim = DIMENSIONS[p.dim ?? "client"] ?? DIMENSIONS.client;
    const measure = MEASURES[p.measure ?? "net"] ?? MEASURES.net;
    const ranked = rankBy(rows, dim.fn, measure.fn, dim.empty);
    const total = ranked.reduce((s, r) => s + r.value, 0);
    meta.push(`Group by: ${dim.label}  ·  Measure: ${measure.label}`);
    sections = [{
      columns: [dim.label, "Bookings", measure.label + (measure.money ? "" : " (count)"), "Share %"],
      rows: ranked.map((r) => [r.label, r.count, measure.money ? M(r.value) : r.value, pct(r.value, total)]),
      totals: ["Total", ranked.reduce((s, r) => s + r.count, 0), measure.money ? M(total) : total, 100],
      numericCols: [1, 2, 3], moneyCols: measure.money ? [2] : [],
    }];
  } else if (key === "sales") {
    sections = [await salesSection(rows, year, month, currency, buId)];
  } else {
    sections = [rankSection(rows, (r) => r.client, "Client", "Unspecified")];
  }

  return { title, subtitle: `${rows.length} approved bookings`, currency, meta, sections };
}

function crossSection(rows: BookingRow[]): Section {
  const map = new Map<string, { cells: string[]; value: number; count: number }>();
  for (const r of rows) {
    const cells = [(r.agency || "Direct").trim(), (r.client || "—").trim(), (r.medium || "—").trim()];
    const key = cells.join("||");
    const cur = map.get(key) ?? { cells, value: 0, count: 0 };
    cur.value += r.revenueFils; cur.count += 1; map.set(key, cur);
  }
  const list = [...map.values()].sort((a, b) => b.value - a.value);
  const total = list.reduce((s, r) => s + r.value, 0);
  return {
    columns: ["Agency", "Client", "Media", "Bookings", "Revenue", "Share %"],
    rows: list.map((r) => [...r.cells, r.count, M(r.value), pct(r.value, total)]),
    totals: ["Total", "", "", list.reduce((s, r) => s + r.count, 0), M(total), 100],
    numericCols: [3, 4, 5], moneyCols: [4],
  };
}

function pairSection(rows: BookingRow[], leftFn: (r: BookingRow) => string | null, leftEmpty: string, leftLabel: string): Omit<Section, "heading"> {
  const map = new Map<string, { cells: string[]; value: number; count: number }>();
  for (const r of rows) {
    const cells = [(leftFn(r) || leftEmpty).trim(), (r.medium || "—").trim()];
    const key = cells.join("||");
    const cur = map.get(key) ?? { cells, value: 0, count: 0 };
    cur.value += r.revenueFils; cur.count += 1; map.set(key, cur);
  }
  const list = [...map.values()].sort((a, b) => b.value - a.value);
  const total = list.reduce((s, r) => s + r.value, 0);
  return {
    columns: [leftLabel, "Media", "Bookings", "Revenue", "Share %"],
    rows: list.map((r) => [...r.cells, r.count, M(r.value), pct(r.value, total)]),
    totals: ["Total", "", list.reduce((s, r) => s + r.count, 0), M(total), 100],
    numericCols: [2, 3, 4], moneyCols: [3],
  };
}

function topSection(rows: BookingRow[], keyFn: (r: BookingRow) => string | null | undefined, label: string, empty: string): Omit<Section, "heading"> {
  const ranked = rankBy(rows, keyFn, undefined, empty).slice(0, 10);
  const total = ranked.reduce((s, r) => s + r.value, 0);
  return {
    columns: [label, "Bookings", "Revenue", "Share %"],
    rows: ranked.map((r) => [r.label, r.count, M(r.value), pct(r.value, total)]),
    numericCols: [1, 2, 3], moneyCols: [2],
  };
}

async function salesSection(rows: BookingRow[], year: number, month: number | null, currency: string, buId: number | null): Promise<Section> {
  const targets = await getSalesTargetsByPerson(year, currency, buId);
  const achieved = new Map<number, number>();
  let unassigned = 0;
  for (const r of rows) {
    if (r.salesId == null) { unassigned += r.revenueFils; continue; }
    achieved.set(r.salesId, (achieved.get(r.salesId) ?? 0) + r.revenueFils);
  }
  const list = [...targets.entries()].map(([id, t]) => {
    const target = month ? t.monthly[month - 1] : t.annual;
    const ach = achieved.get(id) ?? 0;
    return { name: t.name, target, ach, variance: ach - target, pct: target > 0 ? Math.round((ach / target) * 1000) / 10 : "" as number | "" };
  }).sort((a, b) => b.ach - a.ach);
  const rowsOut: Cell[][] = list.map((r) => [r.name, M(r.target), M(r.ach), M(r.variance), r.pct === "" ? "—" : r.pct]);
  if (unassigned > 0) rowsOut.push(["Unassigned bookings", 0, M(unassigned), M(unassigned), "—"]);
  const totalTarget = list.reduce((s, r) => s + r.target, 0);
  const totalAch = list.reduce((s, r) => s + r.ach, 0) + unassigned;
  return {
    columns: ["Salesperson", "Target", "Achieved", "Variance", "Attainment %"],
    rows: rowsOut,
    totals: ["Total", M(totalTarget), M(totalAch), M(totalAch - totalTarget), totalTarget > 0 ? Math.round((totalAch / totalTarget) * 1000) / 10 : "—"],
    numericCols: [1, 2, 3, 4], moneyCols: [1, 2, 3],
  };
}

async function buildTrackerDataset(p: ReportParams, buId: number | null, year: number, month: number | null): Promise<ReportDataset> {
  const status = p.status && p.status !== "all" ? p.status : null;
  const q = p.q?.trim() || "";
  const periodExpr = sql`coalesce(${bookingOrders.receiptDate}, ${bookingOrders.issueDate})`;
  const conds: (SQL | undefined)[] = [eq(bookingOrders.companyId, COMPANY_ID)];
  if (buId) conds.push(eq(bookingOrders.businessUnitId, buId));
  if (status) conds.push(eq(bookingOrders.status, status as typeof bookingOrders.$inferSelect.status));
  if (year) conds.push(sql`extract(year from ${periodExpr}) = ${year}`);
  if (month) conds.push(sql`extract(month from ${periodExpr}) = ${month}`);
  if (q) conds.push(or(ilike(bookingOrders.number, `%${q}%`), ilike(bookingOrders.toName, `%${q}%`), ilike(bookingOrders.campaign, `%${q}%`), ilike(bookingOrders.agency, `%${q}%`), ilike(bookingOrders.client, `%${q}%`)));

  const raw = await db
    .select({
      number: bookingOrders.number, issueDate: bookingOrders.issueDate, receiptDate: bookingOrders.receiptDate,
      status: bookingOrders.status, toName: bookingOrders.toName, agency: bookingOrders.agency, client: bookingOrders.client,
      medium: bookingOrders.medium, currency: bookingOrders.currency, totalNetFils: bookingOrders.totalNetFils,
      grandTotalFils: bookingOrders.grandTotalFils, buName: businessUnits.name, salesName: salespeople.name, industry: industries.name,
    })
    .from(bookingOrders)
    .leftJoin(businessUnits, eq(businessUnits.id, bookingOrders.businessUnitId))
    .leftJoin(salespeople, eq(salespeople.id, bookingOrders.salespersonId))
    .leftJoin(industries, eq(industries.id, bookingOrders.industryId))
    .where(and(...conds))
    .orderBy(desc(periodExpr), desc(bookingOrders.id))
    .limit(2000);

  const section: Section = {
    columns: ["BO No.", "Period", "Unit", "Medium", "Agency", "Client", "Salesperson", "Media", "Cur", "Net", "Grand Total", "Status"],
    rows: raw.map((r) => [
      r.number, r.receiptDate ?? r.issueDate, r.buName ?? "—", r.toName ?? "—", r.agency ?? "—", r.client ?? "—",
      r.salesName ?? "—", r.medium ?? "—", r.currency, M(r.totalNetFils), M(r.grandTotalFils), STATUS_LABEL[r.status] ?? r.status,
    ]),
    numericCols: [9, 10], moneyCols: [9, 10],
  };
  const buName = buId ? (await getReportBusinessUnits()).find((u) => u.id === buId)?.name ?? `Unit ${buId}` : "All units";
  const period = month ? `${MONTHS[month - 1]} ${year}` : `${year}`;
  return {
    title: REPORT_TITLES.tracker,
    subtitle: `${raw.length} booking orders`,
    currency: "mixed",
    meta: [`Business unit: ${buName}`, `Period: ${period}`, `Status: ${status ? (STATUS_LABEL[status] ?? status) : "All"}`, q ? `Search: "${q}"` : "Amounts in each booking's own currency"],
    sections: [section],
  };
}
