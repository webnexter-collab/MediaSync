import { PageHeader, Card } from "@/components/ui";
import { formatFils } from "@/lib/money";
import { fetchApprovedBookings, getReportBusinessUnits, type BookingRow } from "@/lib/reporting";
import { ReportFilters, ReportTabs, KpiCard, RankTable, parseReportParams } from "@/components/reports";

export const dynamic = "force-dynamic";

type SP = { bu?: string; year?: string; month?: string; currency?: string };

function crossRank(rows: BookingRow[]) {
  const map = new Map<string, { cells: string[]; value: number; count: number }>();
  for (const r of rows) {
    const agency = (r.agency || "Direct").trim();
    const client = (r.client || "—").trim();
    const medium = (r.medium || "—").trim();
    const key = `${agency}||${client}||${medium}`;
    const cur = map.get(key) ?? { cells: [agency, client, medium], value: 0, count: 0 };
    cur.value += r.revenueFils;
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.values()].map((v) => ({ label: v.cells.join(" · "), cells: v.cells, value: v.value, count: v.count })).sort((a, b) => b.value - a.value);
}

export default async function RevenueCrossReport({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { buId, year, month, currency, years } = parseReportParams(sp);
  const [{ rows }, units] = await Promise.all([
    fetchApprovedBookings({ buId, year, month, currency }),
    getReportBusinessUnits(),
  ]);
  const ranked = crossRank(rows);
  const total = ranked.reduce((s, r) => s + r.value, 0);
  const query = `?bu=${sp.bu ?? "all"}&year=${year}&month=${sp.month ?? "all"}&currency=${currency}`;

  return (
    <div>
      <PageHeader title="Revenue by Agency × Client × Medium" subtitle="Net revenue by every agency / client / platform combination." />
      <ReportTabs active="/reports/revenue-cross" query={query} />
      <ReportFilters basePath="/reports/revenue-cross" units={units} bu={sp.bu} year={String(year)} month={sp.month} currency={currency} years={years} showMonth />
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label={`Total revenue · ${currency}`} value={formatFils(total, { currency })} sub={`${rows.length} bookings`} />
        <KpiCard label="Combinations" value={String(ranked.length)} />
        <KpiCard label="Top combination" value={ranked[0]?.cells.join(" · ") ?? "—"} sub={ranked[0] ? formatFils(ranked[0].value, { currency }) : undefined} />
      </div>
      <Card><div className="overflow-x-auto"><RankTable columns={["Agency", "Client", "Media"]} rows={ranked} currency={currency} /></div></Card>
    </div>
  );
}
