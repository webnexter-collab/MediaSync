import { PageHeader, Card } from "@/components/ui";
import { formatFils } from "@/lib/money";
import { fetchApprovedBookings, getReportBusinessUnits, rankBy } from "@/lib/reporting";
import { ReportFilters, ReportTabs, KpiCard, RankTable, parseReportParams } from "@/components/reports";

export const dynamic = "force-dynamic";

type SP = { bu?: string; year?: string; month?: string; currency?: string };

export default async function RevenueByMediumReport({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { buId, year, month, currency, years } = parseReportParams(sp);
  const [{ rows }, units] = await Promise.all([
    fetchApprovedBookings({ buId, year, month, currency }),
    getReportBusinessUnits(),
  ]);
  const ranked = rankBy(rows, (r) => r.publisher, undefined, "Unspecified");
  const total = ranked.reduce((s, r) => s + r.value, 0);
  const query = `?bu=${sp.bu ?? "all"}&year=${year}&month=${sp.month ?? "all"}&currency=${currency}`;

  return (
    <div>
      <PageHeader title="Revenue by Station / Medium" subtitle="Net revenue by the media / publisher booked (The National, Sky News Arabia, stations, sites…)." />
      <ReportTabs active="/reports/revenue-medium" query={query} />
      <ReportFilters basePath="/reports/revenue-medium" units={units} bu={sp.bu} year={String(year)} month={sp.month} currency={currency} years={years} showMonth />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label={`Total revenue · ${currency}`} value={formatFils(total, { currency })} sub={`${rows.length} bookings`} />
        <KpiCard label="Media / stations" value={String(ranked.length)} />
        <KpiCard label="Top medium" value={ranked[0]?.label ?? "—"} sub={ranked[0] ? formatFils(ranked[0].value, { currency }) : undefined} />
      </div>
      <Card><RankTable columns={["Station / Medium"]} rows={ranked} currency={currency} /></Card>
    </div>
  );
}
