import { PageHeader, Card } from "@/components/ui";
import { fetchApprovedBookings, getReportBusinessUnits, rankBy } from "@/lib/reporting";
import { ReportFilters, ReportTabs, RankTable, ReportExportButtons, parseReportParams } from "@/components/reports";

export const dynamic = "force-dynamic";

type SP = { bu?: string; year?: string; month?: string; currency?: string };

export default async function Top10Report({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { buId, year, month, currency, years } = parseReportParams(sp);
  const [{ rows }, units] = await Promise.all([
    fetchApprovedBookings({ buId, year, month, currency }),
    getReportBusinessUnits(),
  ]);
  const topAgencies = rankBy(rows, (r) => r.agency, undefined, "Direct").slice(0, 10);
  const topClients = rankBy(rows, (r) => r.client, undefined, "Unspecified").slice(0, 10);
  const topCampaigns = rankBy(rows, (r) => r.campaign, undefined, "Unspecified").slice(0, 10);
  const query = `?bu=${sp.bu ?? "all"}&year=${year}&month=${sp.month ?? "all"}&currency=${currency}`;

  return (
    <div>
      <PageHeader title="Top 10" subtitle="Highest-revenue agencies, clients and campaigns for the selection." />
      <ReportTabs active="/reports/top10" query={query} />
      <ReportFilters basePath="/reports/top10" units={units} bu={sp.bu} year={String(year)} month={sp.month} currency={currency} years={years} showMonth />
      <ReportExportButtons reportKey="top10" query={query} />

      <h2 className="mb-2 font-display text-base font-semibold text-ink">Top 10 Agencies</h2>
      <Card><RankTable columns={["Agency"]} rows={topAgencies} currency={currency} /></Card>

      <h2 className="mb-2 mt-6 font-display text-base font-semibold text-ink">Top 10 Clients</h2>
      <Card><RankTable columns={["Client"]} rows={topClients} currency={currency} /></Card>

      <h2 className="mb-2 mt-6 font-display text-base font-semibold text-ink">Top 10 Campaigns</h2>
      <Card><RankTable columns={["Campaign"]} rows={topCampaigns} currency={currency} /></Card>
    </div>
  );
}
