import { PageHeader, Card } from "@/components/ui";
import { formatFils } from "@/lib/money";
import { fetchApprovedBookings, getReportBusinessUnits, rankBy } from "@/lib/reporting";
import { ReportFilters, ReportTabs, KpiCard, RankTable, ReportExportButtons, parseReportParams } from "@/components/reports";

export const dynamic = "force-dynamic";

type SP = { bu?: string; year?: string; month?: string; currency?: string };

export default async function RevenueByAgencyGroupReport({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { buId, year, month, currency, years } = parseReportParams(sp);
  const [{ rows }, units] = await Promise.all([
    fetchApprovedBookings({ buId, year, month, currency }),
    getReportBusinessUnits(),
  ]);
  const ranked = rankBy(rows, (r) => r.agencyGroup, undefined, "Unaffiliated / Direct");
  const total = ranked.reduce((s, r) => s + r.value, 0);
  const query = `?bu=${sp.bu ?? "all"}&year=${year}&month=${sp.month ?? "all"}&currency=${currency}`;

  return (
    <div>
      <PageHeader title="Revenue by Agency Group" subtitle="Net revenue consolidated by agency group (GroupM, Publicis, …)." />
      <ReportTabs active="/reports/revenue-agency-group" query={query} />
      <ReportFilters basePath="/reports/revenue-agency-group" units={units} bu={sp.bu} year={String(year)} month={sp.month} currency={currency} years={years} showMonth />
      <ReportExportButtons reportKey="agency-group" query={query} />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label={`Total revenue · ${currency}`} value={formatFils(total, { currency })} sub={`${rows.length} bookings`} />
        <KpiCard label="Groups" value={String(ranked.length)} />
        <KpiCard label="Top group" value={ranked[0]?.label ?? "—"} sub={ranked[0] ? formatFils(ranked[0].value, { currency }) : undefined} />
      </div>
      <Card><RankTable columns={["Agency Group"]} rows={ranked} currency={currency} /></Card>
      <p className="mt-3 text-xs text-muted">Agency group is resolved from the booking&rsquo;s linked agency account. Bookings whose agency isn&rsquo;t mapped to a group show under &ldquo;Unaffiliated / Direct&rdquo;.</p>
    </div>
  );
}
