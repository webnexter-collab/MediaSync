import { PageHeader, Card } from "@/components/ui";
import { formatFils } from "@/lib/money";
import { fetchApprovedBookings, getReportBusinessUnits, type BookingRow } from "@/lib/reporting";
import { ReportFilters, ReportTabs, RankTable, ReportExportButtons, parseReportParams } from "@/components/reports";

export const dynamic = "force-dynamic";

type SP = { bu?: string; year?: string; month?: string; currency?: string };

function pairRank(rows: BookingRow[], leftFn: (r: BookingRow) => string | null, leftEmpty: string) {
  const map = new Map<string, { cells: string[]; value: number; count: number }>();
  for (const r of rows) {
    const left = (leftFn(r) || leftEmpty).trim();
    const medium = (r.medium || "—").trim();
    const key = `${left}||${medium}`;
    const cur = map.get(key) ?? { cells: [left, medium], value: 0, count: 0 };
    cur.value += r.revenueFils;
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.values()].map((v) => ({ label: v.cells.join(" · "), cells: v.cells, value: v.value, count: v.count })).sort((a, b) => b.value - a.value);
}

export default async function RevenueMediumSplitReport({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { buId, year, month, currency, years } = parseReportParams(sp);
  const [{ rows }, units] = await Promise.all([
    fetchApprovedBookings({ buId, year, month, currency }),
    getReportBusinessUnits(),
  ]);
  const clientMedium = pairRank(rows, (r) => r.client, "Unspecified");
  const agencyMedium = pairRank(rows, (r) => r.agency, "Direct");
  const query = `?bu=${sp.bu ?? "all"}&year=${year}&month=${sp.month ?? "all"}&currency=${currency}`;

  return (
    <div>
      <PageHeader title="Revenue by Client / Agency × Medium" subtitle="How each client and agency splits across media platforms." />
      <ReportTabs active="/reports/revenue-medium-split" query={query} />
      <ReportFilters basePath="/reports/revenue-medium-split" units={units} bu={sp.bu} year={String(year)} month={sp.month} currency={currency} years={years} showMonth />
      <ReportExportButtons reportKey="medium-split" query={query} />

      <h2 className="mb-2 mt-2 font-display text-base font-semibold text-ink">Client × Medium</h2>
      <Card><div className="overflow-x-auto"><RankTable columns={["Client", "Media"]} rows={clientMedium} currency={currency} /></div></Card>

      <h2 className="mb-2 mt-6 font-display text-base font-semibold text-ink">Agency × Medium</h2>
      <Card><div className="overflow-x-auto"><RankTable columns={["Agency", "Media"]} rows={agencyMedium} currency={currency} /></div></Card>
    </div>
  );
}
