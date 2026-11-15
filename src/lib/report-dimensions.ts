/**
 * Dimensions, measures and the pivot builder for the Custom Report.
 * Shared by the on-screen report and the PDF/Excel export.
 */
import type { BookingRow } from "@/lib/reporting";

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const STATUS_LABEL: Record<string, string> = {
  approved: "Approved", sent: "Sent", confirmed: "Confirmed", invoiced: "Invoiced",
};

export type Dimension = { label: string; fn: (r: BookingRow) => string | null | undefined; empty: string; sort?: "label" };

export const DIMENSIONS: Record<string, Dimension> = {
  bu: { label: "Business Unit", fn: (r) => r.buName, empty: "Unassigned" },
  asset: { label: "Asset", fn: (r) => r.publisher, empty: "Unspecified" },
  platform: { label: "Media (Platform)", fn: (r) => r.medium, empty: "Unspecified" },
  agencyGroup: { label: "Agency Group", fn: (r) => r.agencyGroup, empty: "Unaffiliated" },
  agency: { label: "Agency", fn: (r) => r.agency, empty: "Direct" },
  client: { label: "Client", fn: (r) => r.client, empty: "Unspecified" },
  campaign: { label: "Campaign", fn: (r) => r.campaign, empty: "Unspecified" },
  salesperson: { label: "Salesperson", fn: (r) => r.salesName, empty: "Unassigned" },
  industry: { label: "Industry", fn: (r) => r.industry, empty: "Unspecified" },
  category: { label: "Category", fn: (r) => r.category, empty: "Unspecified" },
  region: { label: "Region", fn: (r) => r.region, empty: "Unspecified" },
  month: { label: "Month", fn: (r) => (r.month ? `${String(r.month).padStart(2, "0")} ${MONTH_SHORT[r.month - 1]} ${r.year}` : null), empty: "—", sort: "label" },
  status: { label: "Status", fn: (r) => STATUS_LABEL[r.status] ?? r.status, empty: "—" },
};

export type Measure = { label: string; fn: (r: BookingRow) => number; money: boolean };
export const MEASURES: Record<string, Measure> = {
  net: { label: "Net revenue", fn: (r) => r.revenueFils, money: true },
  grand: { label: "Gross incl. VAT", fn: (r) => r.grandFils, money: true },
  count: { label: "Bookings", fn: () => 1, money: false },
};

export type Pivot = {
  rowLabels: string[];
  colLabels: string[]; // empty when there is no column dimension
  cell: (row: string, col: string) => number;
  rowTotal: (row: string) => number;
  colTotal: (col: string) => number;
  grand: number;
};

const keyOf = (d: Dimension, r: BookingRow) => (d.fn(r) || d.empty).toString().trim() || d.empty;

/** Cross-tabulate bookings: rows × (optional) columns, summing the measure. */
export function buildPivot(rows: BookingRow[], rowDim: Dimension, colDim: Dimension | null, measure: Measure): Pivot {
  const cells = new Map<string, number>();
  const rowTotals = new Map<string, number>();
  const colTotals = new Map<string, number>();
  let grand = 0;
  for (const r of rows) {
    const rk = keyOf(rowDim, r);
    const ck = colDim ? keyOf(colDim, r) : "";
    const v = measure.fn(r);
    cells.set(`${rk}\u0000${ck}`, (cells.get(`${rk}\u0000${ck}`) ?? 0) + v);
    rowTotals.set(rk, (rowTotals.get(rk) ?? 0) + v);
    if (colDim) colTotals.set(ck, (colTotals.get(ck) ?? 0) + v);
    grand += v;
  }
  const order = (d: Dimension, totals: Map<string, number>) =>
    [...totals.keys()].sort((a, b) => (d.sort === "label" ? a.localeCompare(b) : (totals.get(b) ?? 0) - (totals.get(a) ?? 0) || a.localeCompare(b)));
  return {
    rowLabels: order(rowDim, rowTotals),
    colLabels: colDim ? order(colDim, colTotals) : [],
    cell: (row, col) => cells.get(`${row}\u0000${col}`) ?? 0,
    rowTotal: (row) => rowTotals.get(row) ?? 0,
    colTotal: (col) => colTotals.get(col) ?? 0,
    grand,
  };
}

/** Month dimension labels carry a "MM " sort prefix — strip it for display. */
export const displayLabel = (d: Dimension, label: string) => (d.sort === "label" ? label.replace(/^\d{2} /, "") : label);

/** Parse a months selection ("9,10" or ["9","10"]) into valid month numbers. */
export function parseMonths(v: string | string[] | undefined): number[] {
  const list = Array.isArray(v) ? v : (v ?? "").split(",");
  return [...new Set(list.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n >= 1 && n <= 12))].sort((a, b) => a - b);
}
