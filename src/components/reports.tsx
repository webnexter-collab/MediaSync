import Link from "next/link";
import { formatFils } from "@/lib/money";
import { MONTHS, REPORTING_CURRENCIES } from "@/lib/reporting";

const sel = "field h-9 rounded-lg border border-line-2 bg-surface px-2 text-sm";

/** Shared GET filter bar for revenue reports. */
export function ReportFilters({
  basePath,
  units,
  bu,
  year,
  month,
  currency,
  showMonth = false,
  years,
}: {
  basePath: string;
  units: { id: number; name: string }[];
  bu?: string;
  year?: string;
  month?: string;
  currency: string;
  showMonth?: boolean;
  years: number[];
}) {
  return (
    <form className="mb-5 flex flex-wrap items-end gap-2" action={basePath}>
      <div>
        <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted">Business Unit</label>
        <select name="bu" defaultValue={bu ?? "all"} className={sel}>
          <option value="all">All units</option>
          {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted">Year</label>
        <select name="year" defaultValue={year ?? String(years[years.length - 2] ?? years[0])} className={sel}>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {showMonth && (
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted">Month</label>
          <select name="month" defaultValue={month ?? "all"} className={sel}>
            <option value="all">All months (YTD)</option>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted">Currency</label>
        <select name="currency" defaultValue={currency} className={sel}>
          {REPORTING_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <button className="inline-flex h-9 items-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink-2">Apply</button>
      <Link href={basePath} className="inline-flex h-9 items-center rounded-lg border border-line-2 bg-surface px-3 text-sm font-medium hover:bg-bg">Reset</Link>
    </form>
  );
}

export function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold text-ink tnum">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

/** Ranked table with a share bar per row. */
export function RankTable({
  columns = ["Name"],
  rows,
  currency,
  emptyHint = "No data for this selection.",
}: {
  columns?: string[];
  rows: { label: string; value: number; count?: number; cells?: string[] }[];
  currency: string;
  emptyHint?: string;
}) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0) || 1;
  if (rows.length === 0) return <div className="p-8 text-center text-sm text-muted">{emptyHint}</div>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
          <th className="px-4 py-3 font-medium">#</th>
          {columns.map((c) => <th key={c} className="px-4 py-3 font-medium">{c}</th>)}
          <th className="px-4 py-3 text-right font-medium">Bookings</th>
          <th className="px-4 py-3 text-right font-medium">Revenue ({currency})</th>
          <th className="px-4 py-3 text-right font-medium">Share</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const pct = total > 0 ? (r.value / total) * 100 : 0;
          return (
            <tr key={r.label + i} className="border-b border-line last:border-0 hover:bg-bg">
              <td className="px-4 py-2.5 tnum text-muted">{i + 1}</td>
              {(r.cells ?? [r.label]).map((c, j) => (
                <td key={j} className="px-4 py-2.5 text-ink">{c || "—"}</td>
              ))}
              <td className="px-4 py-2.5 text-right tnum text-muted">{r.count ?? "—"}</td>
              <td className="px-4 py-2.5 text-right tnum font-medium">{formatFils(r.value, { withSymbol: false })}</td>
              <td className="px-4 py-2.5">
                <div className="flex items-center justify-end gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-bg">
                    <div className="h-full rounded-full bg-teal" style={{ width: `${(r.value / max) * 100}%` }} />
                  </div>
                  <span className="w-12 text-right tnum text-xs text-muted">{pct.toFixed(1)}%</span>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-line font-medium">
          <td className="px-4 py-3" colSpan={(columns.length) + 1}>Total</td>
          <td className="px-4 py-3 text-right tnum">{rows.reduce((s, r) => s + (r.count ?? 0), 0)}</td>
          <td className="px-4 py-3 text-right tnum">{formatFils(total, { withSymbol: false })}</td>
          <td className="px-4 py-3 text-right tnum text-muted">100%</td>
        </tr>
      </tfoot>
    </table>
  );
}

/** Report navigation tabs shown on every revenue report. */
export const REPORT_TABS: { href: string; label: string }[] = [
  { href: "/reports/revenue-monthly", label: "Monthly" },
  { href: "/reports/revenue-platform", label: "By Platform" },
  { href: "/reports/revenue-medium", label: "By Station/Medium" },
  { href: "/reports/revenue-sales", label: "Sales vs Target" },
  { href: "/reports/revenue-agency", label: "By Agency" },
  { href: "/reports/revenue-client", label: "By Client" },
  { href: "/reports/revenue-agency-group", label: "By Agency Group" },
  { href: "/reports/revenue-cross", label: "Agency×Client×Medium" },
  { href: "/reports/revenue-medium-split", label: "Client/Agency × Medium" },
  { href: "/reports/top10", label: "Top 10" },
  { href: "/reports/custom", label: "Custom" },
];

export function ReportTabs({ active, query = "" }: { active: string; query?: string }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1.5 border-b border-line pb-3">
      {REPORT_TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href + query}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${active === t.href ? "bg-ink text-white" : "border border-line-2 bg-surface text-fg hover:bg-bg"}`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

/** Parse shared report search params. */
export function parseReportParams(sp: { bu?: string; year?: string; month?: string; currency?: string }) {
  const now = new Date().getFullYear();
  const buId = sp.bu && sp.bu !== "all" ? Number(sp.bu) : null;
  const year = sp.year && sp.year !== "all" ? Number(sp.year) : now;
  const month = sp.month && sp.month !== "all" ? Number(sp.month) : null;
  const currency = sp.currency === "AED" ? "AED" : "USD";
  const years = [now - 2, now - 1, now, now + 1];
  return { buId, year, month, currency, years };
}
