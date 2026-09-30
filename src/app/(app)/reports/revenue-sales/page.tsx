import { PageHeader, Card } from "@/components/ui";
import { formatFils } from "@/lib/money";
import { fetchApprovedBookings, getReportBusinessUnits, getSalesTargetsByPerson, MONTHS } from "@/lib/reporting";
import { ReportFilters, ReportTabs, KpiCard, ReportExportButtons, parseReportParams } from "@/components/reports";

export const dynamic = "force-dynamic";

type SP = { bu?: string; year?: string; month?: string; currency?: string };

export default async function RevenueBySalesReport({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { buId, year, month, currency, years } = parseReportParams(sp);
  const [{ rows }, units, targets] = await Promise.all([
    fetchApprovedBookings({ buId, year, month, currency }),
    getReportBusinessUnits(),
    getSalesTargetsByPerson(year, currency, buId),
  ]);

  // Achievement by salesperson (net revenue).
  const achieved = new Map<number, number>();
  let unassigned = 0;
  for (const r of rows) {
    if (r.salesId == null) { unassigned += r.revenueFils; continue; }
    achieved.set(r.salesId, (achieved.get(r.salesId) ?? 0) + r.revenueFils);
  }

  const table = [...targets.entries()].map(([id, t]) => {
    const target = month ? t.monthly[month - 1] : t.annual;
    const ach = achieved.get(id) ?? 0;
    return { name: t.name, target, ach, variance: ach - target, pct: target > 0 ? (ach / target) * 100 : null };
  }).sort((a, b) => b.ach - a.ach);

  const totalTarget = table.reduce((s, r) => s + r.target, 0);
  const totalAch = table.reduce((s, r) => s + r.ach, 0) + unassigned;
  const overallPct = totalTarget > 0 ? (totalAch / totalTarget) * 100 : null;
  const periodLabel = month ? `${MONTHS[month - 1]} ${year}` : `${year} YTD`;
  const query = `?bu=${sp.bu ?? "all"}&year=${year}&month=${sp.month ?? "all"}&currency=${currency}`;

  return (
    <div>
      <PageHeader title="Revenue by Sales — Target vs Achievement" subtitle={`Salesperson performance for ${periodLabel}. Achievement = approved booking revenue.`} />
      <ReportTabs active="/reports/revenue-sales" query={query} />
      <ReportFilters basePath="/reports/revenue-sales" units={units} bu={sp.bu} year={String(year)} month={sp.month} currency={currency} years={years} showMonth />
      <ReportExportButtons reportKey="sales" query={query} />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <KpiCard label={`Target · ${currency}`} value={formatFils(totalTarget, { currency })} sub={periodLabel} />
        <KpiCard label={`Achieved · ${currency}`} value={formatFils(totalAch, { currency })} sub={`${rows.length} bookings`} />
        <KpiCard label="Attainment" value={overallPct != null ? `${overallPct.toFixed(1)}%` : "—"} sub={totalAch >= totalTarget ? "On/above target" : "Below target"} />
        <KpiCard label="Variance" value={formatFils(totalAch - totalTarget, { currency })} />
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Salesperson</th>
              <th className="px-4 py-3 text-right font-medium">Target ({currency})</th>
              <th className="px-4 py-3 text-right font-medium">Achieved ({currency})</th>
              <th className="px-4 py-3 text-right font-medium">Variance</th>
              <th className="px-4 py-3 font-medium">Attainment</th>
            </tr>
          </thead>
          <tbody>
            {table.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-sm text-muted">No salespeople for this selection. Add targets under Sales &rsaquo; Sales Targets.</td></tr>
            )}
            {table.map((r) => {
              const pct = r.pct;
              const tone = pct == null ? "text-muted" : pct >= 100 ? "text-teal-ink" : pct >= 70 ? "text-ink" : "text-danger";
              return (
                <tr key={r.name} className="border-b border-line last:border-0 hover:bg-bg">
                  <td className="px-4 py-2.5 font-medium text-ink">{r.name}</td>
                  <td className="px-4 py-2.5 text-right tnum text-muted">{formatFils(r.target, { withSymbol: false })}</td>
                  <td className="px-4 py-2.5 text-right tnum font-medium">{formatFils(r.ach, { withSymbol: false })}</td>
                  <td className={`px-4 py-2.5 text-right tnum ${r.variance < 0 ? "text-danger" : "text-teal-ink"}`}>{formatFils(r.variance, { withSymbol: false })}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-bg"><div className={`h-full rounded-full ${pct != null && pct >= 100 ? "bg-teal" : "bg-ink"}`} style={{ width: `${Math.min(100, pct ?? 0)}%` }} /></div>
                      <span className={`w-14 text-right tnum text-xs ${tone}`}>{pct != null ? `${pct.toFixed(0)}%` : "—"}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {unassigned > 0 && (
              <tr className="border-b border-line last:border-0">
                <td className="px-4 py-2.5 italic text-muted">Unassigned bookings</td>
                <td className="px-4 py-2.5 text-right tnum text-muted">—</td>
                <td className="px-4 py-2.5 text-right tnum">{formatFils(unassigned, { withSymbol: false })}</td>
                <td className="px-4 py-2.5 text-right tnum text-muted">—</td>
                <td className="px-4 py-2.5 text-muted">—</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line font-medium">
              <td className="px-4 py-3">Total</td>
              <td className="px-4 py-3 text-right tnum">{formatFils(totalTarget, { withSymbol: false })}</td>
              <td className="px-4 py-3 text-right tnum">{formatFils(totalAch, { withSymbol: false })}</td>
              <td className="px-4 py-3 text-right tnum">{formatFils(totalAch - totalTarget, { withSymbol: false })}</td>
              <td className="px-4 py-3 tnum text-muted">{overallPct != null ? `${overallPct.toFixed(0)}%` : "—"}</td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  );
}
