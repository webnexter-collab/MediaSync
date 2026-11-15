import Link from "next/link";
import { PageHeader, Card } from "@/components/ui";
import { formatFils } from "@/lib/money";
import { fetchApprovedBookings, getReportBusinessUnits, MONTHS, REPORTING_CURRENCIES } from "@/lib/reporting";
import { DIMENSIONS, MEASURES, buildPivot, displayLabel, parseMonths } from "@/lib/report-dimensions";
import { ReportTabs, KpiCard, ReportExportButtons, parseReportParams } from "@/components/reports";

export const dynamic = "force-dynamic";

type SP = { bu?: string; year?: string; currency?: string; rows?: string; cols?: string; measure?: string; m?: string | string[] };

const sel = "field h-9 rounded-lg border border-line-2 bg-surface px-2 text-sm";
const lbl = "mb-1 block text-[10px] uppercase tracking-wide text-muted";

export default async function CustomReport({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { buId, year, currency, years } = parseReportParams(sp);
  const months = parseMonths(sp.m);
  const rowKey = sp.rows && DIMENSIONS[sp.rows] ? sp.rows : "asset";
  const colKey =
    sp.cols === undefined ? (rowKey === "platform" ? "none" : "platform")
    : DIMENSIONS[sp.cols] && sp.cols !== rowKey ? sp.cols
    : "none";
  const measureKey = sp.measure && MEASURES[sp.measure] ? sp.measure : "net";
  const rowDim = DIMENSIONS[rowKey];
  const colDim = colKey !== "none" ? DIMENSIONS[colKey] : null;
  const measure = MEASURES[measureKey];

  const [{ rows }, units] = await Promise.all([
    fetchApprovedBookings({ buId, year, currency, months }),
    getReportBusinessUnits(),
  ]);
  const pivot = buildPivot(rows, rowDim, colDim, measure);
  const fmt = (v: number) => (measure.money ? formatFils(v, { withSymbol: false }) : String(v));
  const monthsLabel = months.length ? months.map((m) => MONTHS[m - 1]).join(", ") : "All months";
  const query = `?bu=${sp.bu ?? "all"}&year=${year}&currency=${currency}&dim=${rowKey}&col=${colKey}&measure=${measureKey}&months=${months.join(",")}`;
  const tabQuery = `?bu=${sp.bu ?? "all"}&year=${year}&currency=${currency}`;

  return (
    <div>
      <PageHeader title="Custom Report" subtitle="Build any combination: pick what goes in rows, what goes in columns, the measure and the months." />
      <ReportTabs active="/reports/custom" query={tabQuery} />

      <form action="/reports/custom" className="mb-4 space-y-3 rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className={lbl}>Rows</label>
            <select name="rows" defaultValue={rowKey} className={sel}>
              {Object.entries(DIMENSIONS).map(([k, d]) => <option key={k} value={k}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Columns</label>
            <select name="cols" defaultValue={colKey} className={sel}>
              <option value="none">— None (simple list) —</option>
              {Object.entries(DIMENSIONS).map(([k, d]) => <option key={k} value={k}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Measure</label>
            <select name="measure" defaultValue={measureKey} className={sel}>
              {Object.entries(MEASURES).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Business Unit</label>
            <select name="bu" defaultValue={sp.bu ?? "all"} className={sel}>
              <option value="all">All units</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Year</label>
            <select name="year" defaultValue={String(year)} className={sel}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Currency</label>
            <select name="currency" defaultValue={currency} className={sel}>
              {REPORTING_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <div className={lbl}>Months — tick any combination (none ticked = all months)</div>
          <div className="flex flex-wrap gap-1.5">
            {MONTHS.map((m, i) => (
              <label key={m} className="flex cursor-pointer items-center gap-1.5 rounded-md border border-line-2 bg-surface px-2.5 py-1.5 text-xs has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white">
                <input type="checkbox" name="m" value={i + 1} defaultChecked={months.includes(i + 1)} className="sr-only" />
                {m}
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex h-9 items-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink-2">Build report</button>
          <Link href="/reports/custom" className="inline-flex h-9 items-center rounded-lg border border-line-2 bg-surface px-3 text-sm font-medium hover:bg-bg">Reset</Link>
        </div>
      </form>

      <ReportExportButtons reportKey="custom" query={query} />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label={measure.money ? `Total · ${currency}` : "Total bookings"} value={measure.money ? formatFils(pivot.grand, { currency }) : String(pivot.grand)} sub={`${rows.length} approved bookings`} />
        <KpiCard label="Layout" value={colDim ? `${rowDim.label} × ${colDim.label}` : rowDim.label} sub={measure.label} />
        <KpiCard label="Period" value={String(year)} sub={monthsLabel} />
      </div>

      <Card>
        {pivot.rowLabels.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">No approved bookings for this selection.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">{rowDim.label}</th>
                  {colDim && pivot.colLabels.map((c) => <th key={c} className="px-4 py-3 text-right font-medium">{displayLabel(colDim, c)}</th>)}
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-right font-medium">Share</th>
                </tr>
              </thead>
              <tbody>
                {pivot.rowLabels.map((r) => (
                  <tr key={r} className="border-b border-line last:border-0 hover:bg-bg">
                    <td className="px-4 py-2.5 text-ink">{displayLabel(rowDim, r)}</td>
                    {colDim && pivot.colLabels.map((c) => {
                      const v = pivot.cell(r, c);
                      return <td key={c} className="px-4 py-2.5 text-right tnum text-muted">{v ? fmt(v) : "—"}</td>;
                    })}
                    <td className="px-4 py-2.5 text-right tnum font-medium">{fmt(pivot.rowTotal(r))}</td>
                    <td className="px-4 py-2.5 text-right tnum text-xs text-muted">{pivot.grand > 0 ? `${((pivot.rowTotal(r) / pivot.grand) * 100).toFixed(1)}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-line font-medium">
                  <td className="px-4 py-3">Grand total</td>
                  {colDim && pivot.colLabels.map((c) => <td key={c} className="px-4 py-3 text-right tnum">{fmt(pivot.colTotal(c))}</td>)}
                  <td className="px-4 py-3 text-right tnum">{fmt(pivot.grand)}</td>
                  <td className="px-4 py-3 text-right tnum text-muted">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">Counts approved, sent, confirmed and invoiced bookings by revenue month, converted to {currency}.</p>
    </div>
  );
}
