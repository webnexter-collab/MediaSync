import Link from "next/link";
import { PageHeader, Card } from "@/components/ui";
import { formatFils } from "@/lib/money";
import { fetchApprovedBookings, getReportBusinessUnits, rankBy, type BookingRow } from "@/lib/reporting";
import { ReportFilters, ReportTabs, KpiCard, RankTable, parseReportParams } from "@/components/reports";

export const dynamic = "force-dynamic";

type SP = { bu?: string; year?: string; month?: string; currency?: string; dim?: string; measure?: string };

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

const MEASURES: Record<string, { label: string; fn: (r: BookingRow) => number }> = {
  net: { label: "Net revenue (excl. VAT)", fn: (r) => r.revenueFils },
  grand: { label: "Gross incl. VAT", fn: (r) => r.grandFils },
  count: { label: "Bookings count", fn: () => 1 },
};

const sel = "field h-9 rounded-lg border border-line-2 bg-surface px-2 text-sm";

export default async function CustomReport({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { buId, year, month, currency, years } = parseReportParams(sp);
  const dimKey = sp.dim && DIMENSIONS[sp.dim] ? sp.dim : "client";
  const measureKey = sp.measure && MEASURES[sp.measure] ? sp.measure : "net";
  const dim = DIMENSIONS[dimKey];
  const measure = MEASURES[measureKey];

  const [{ rows }, units] = await Promise.all([
    fetchApprovedBookings({ buId, year, month, currency }),
    getReportBusinessUnits(),
  ]);

  const ranked = rankBy(rows, dim.fn, measure.fn, dim.empty);
  const isMoney = measureKey !== "count";
  const total = ranked.reduce((s, r) => s + r.value, 0);
  const query = `?bu=${sp.bu ?? "all"}&year=${year}&month=${sp.month ?? "all"}&currency=${currency}`;

  // Preserve the standard filters when the builder selects change.
  const hidden = (
    <>
      <input type="hidden" name="bu" value={sp.bu ?? "all"} />
      <input type="hidden" name="year" value={String(year)} />
      <input type="hidden" name="month" value={sp.month ?? "all"} />
      <input type="hidden" name="currency" value={currency} />
    </>
  );

  return (
    <div>
      <PageHeader title="Custom Report" subtitle="Pick any dimension and measure. Standard filters (unit, year, month, currency) apply." />
      <ReportTabs active="/reports/custom" query={query} />
      <ReportFilters basePath="/reports/custom" units={units} bu={sp.bu} year={String(year)} month={sp.month} currency={currency} years={years} showMonth />

      <form action="/reports/custom" className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface p-4">
        {hidden}
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted">Group by</label>
          <select name="dim" defaultValue={dimKey} className={sel}>
            {Object.entries(DIMENSIONS).map(([k, d]) => <option key={k} value={k}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted">Measure</label>
          <select name="measure" defaultValue={measureKey} className={sel}>
            {Object.entries(MEASURES).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
          </select>
        </div>
        <button className="inline-flex h-9 items-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink-2">Build</button>
      </form>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label={isMoney ? `Total · ${currency}` : "Total bookings"} value={isMoney ? formatFils(total, { currency }) : String(total)} sub={`${dim.label} · ${measure.label}`} />
        <KpiCard label={dim.label + "s"} value={String(ranked.length)} />
        <KpiCard label="Top" value={ranked[0]?.label ?? "—"} sub={ranked[0] ? (isMoney ? formatFils(ranked[0].value, { currency }) : `${ranked[0].value} bookings`) : undefined} />
      </div>

      <Card>
        {isMoney ? (
          <RankTable columns={[dim.label]} rows={ranked} currency={currency} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">{dim.label}</th>
                <th className="px-4 py-3 text-right font-medium">Bookings</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r, i) => (
                <tr key={r.label + i} className="border-b border-line last:border-0 hover:bg-bg">
                  <td className="px-4 py-2.5 tnum text-muted">{i + 1}</td>
                  <td className="px-4 py-2.5 text-ink">{r.label}</td>
                  <td className="px-4 py-2.5 text-right tnum font-medium">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">
        Approved bookings only. Need a saved layout or export? <Link href="/tracker" className="text-teal-ink hover:underline">Open the Tracker</Link> for the full register.
      </p>
    </div>
  );
}
