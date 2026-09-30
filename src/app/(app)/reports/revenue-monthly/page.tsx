import { PageHeader, Card } from "@/components/ui";
import { formatFils } from "@/lib/money";
import { fetchApprovedBookings, getReportBusinessUnits, MONTHS } from "@/lib/reporting";
import { ReportFilters, ReportTabs, KpiCard, parseReportParams } from "@/components/reports";

export const dynamic = "force-dynamic";

type SP = { bu?: string; year?: string; currency?: string };

export default async function RevenueMonthlyReport({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { buId, year, currency, years } = parseReportParams(sp);
  const [{ rows }, units] = await Promise.all([
    fetchApprovedBookings({ buId, year, currency }),
    getReportBusinessUnits(),
  ]);

  const monthly = Array.from({ length: 12 }, () => ({ value: 0, count: 0 }));
  for (const r of rows) if (r.month >= 1 && r.month <= 12) { monthly[r.month - 1].value += r.revenueFils; monthly[r.month - 1].count += 1; }
  const annual = monthly.reduce((s, m) => s + m.value, 0);
  const maxV = monthly.reduce((m, x) => Math.max(m, x.value), 0) || 1;
  const best = monthly.reduce((bi, x, i, arr) => (x.value > arr[bi].value ? i : bi), 0);
  let cum = 0;
  const query = `?bu=${sp.bu ?? "all"}&year=${year}&currency=${currency}`;

  return (
    <div>
      <PageHeader title="Monthly Revenue" subtitle="Net revenue (excl. VAT) by month for approved bookings, with running YTD." />
      <ReportTabs active="/reports/revenue-monthly" query={query} />
      <ReportFilters basePath="/reports/revenue-monthly" units={units} bu={sp.bu} year={String(year)} currency={currency} years={years} />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label={`Annual revenue · ${currency}`} value={formatFils(annual, { currency })} sub={`${rows.length} approved bookings`} />
        <KpiCard label="Best month" value={MONTHS[best]} sub={formatFils(monthly[best].value, { currency })} />
        <KpiCard label="Monthly average" value={formatFils(Math.round(annual / 12), { currency })} sub={`${year}`} />
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Month</th>
              <th className="px-4 py-3 text-right font-medium">Bookings</th>
              <th className="px-4 py-3 text-right font-medium">Revenue ({currency})</th>
              <th className="px-4 py-3 font-medium">Share</th>
              <th className="px-4 py-3 text-right font-medium">Cumulative (YTD)</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map((m, i) => {
              cum += m.value;
              return (
                <tr key={i} className="border-b border-line last:border-0 hover:bg-bg">
                  <td className="px-4 py-2.5 font-medium text-ink">{MONTHS[i]} {year}</td>
                  <td className="px-4 py-2.5 text-right tnum text-muted">{m.count || "—"}</td>
                  <td className="px-4 py-2.5 text-right tnum font-medium">{formatFils(m.value, { withSymbol: false })}</td>
                  <td className="px-4 py-2.5">
                    <div className="h-1.5 w-40 overflow-hidden rounded-full bg-bg"><div className="h-full rounded-full bg-teal" style={{ width: `${(m.value / maxV) * 100}%` }} /></div>
                  </td>
                  <td className="px-4 py-2.5 text-right tnum text-muted">{formatFils(cum, { withSymbol: false })}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line font-medium">
              <td className="px-4 py-3">Total {year}</td>
              <td className="px-4 py-3 text-right tnum">{rows.length}</td>
              <td className="px-4 py-3 text-right tnum">{formatFils(annual, { withSymbol: false })}</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-right tnum">{formatFils(annual, { withSymbol: false })}</td>
            </tr>
          </tfoot>
        </table>
      </Card>
      <p className="mt-3 text-xs text-muted">Revenue = net booking value (excl. VAT) of approved, sent, confirmed and invoiced bookings, by receipt month (falling back to issue date), converted to {currency} at latest FX.</p>
    </div>
  );
}
