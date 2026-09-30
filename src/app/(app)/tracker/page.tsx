import Link from "next/link";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { bookingOrders, businessUnits, salespeople, industries } from "@/db/schema";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { formatFils } from "@/lib/money";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;

const STATUS_TONE: Record<string, "good" | "neutral" | "muted"> = {
  draft: "muted", pending_approval: "neutral", approved: "good", sent: "neutral", confirmed: "good", invoiced: "good", cancelled: "muted",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", pending_approval: "Pending", approved: "Approved", sent: "Sent", confirmed: "Confirmed", invoiced: "Invoiced", cancelled: "Cancelled",
};
const STATUS_FILTER = ["all", "draft", "pending_approval", "approved", "sent", "confirmed", "invoiced", "cancelled"] as const;
// Revenue is counted on approved-or-later booking orders.
const REVENUE_STATUSES = new Set(["approved", "sent", "confirmed", "invoiced"]);
const MEDIA_LABEL: Record<string, string> = { print: "Print", digital: "Digital", radio: "Radio", tv: "TV", website: "Website", outdoor: "Outdoor" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const sel = "field h-9 rounded-lg border border-line-2 bg-surface px-2 text-sm";

type Search = { bu?: string; status?: string; year?: string; month?: string; q?: string };

export default async function TrackerPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const now = new Date();
  const buParam = sp.bu && sp.bu !== "all" ? Number(sp.bu) : null;
  const statusParam = sp.status && STATUS_FILTER.includes(sp.status as (typeof STATUS_FILTER)[number]) ? sp.status : "all";
  const year = sp.year && sp.year !== "all" ? Number(sp.year) : null;
  const month = sp.month && sp.month !== "all" ? Number(sp.month) : null;
  const q = sp.q?.trim() || "";
  const years = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  // Reporting month = receipt date when present, else issue date.
  const periodExpr = sql`coalesce(${bookingOrders.receiptDate}, ${bookingOrders.issueDate})`;

  let units: { id: number; name: string }[] = [];
  let rows: {
    id: number; number: string; issueDate: string; receiptDate: string | null; status: string;
    toName: string | null; agency: string | null; client: string | null; campaign: string | null;
    medium: string | null; currency: string; totalNetFils: number; vatFils: number; grandTotalFils: number;
    buName: string | null; salesName: string | null; industryName: string | null;
  }[] = [];
  let dbError = false;

  try {
    units = await db.select({ id: businessUnits.id, name: businessUnits.name })
      .from(businessUnits)
      .where(and(eq(businessUnits.companyId, COMPANY_ID), eq(businessUnits.isActive, true)))
      .orderBy(businessUnits.sortOrder);

    const conds: (SQL | undefined)[] = [eq(bookingOrders.companyId, COMPANY_ID)];
    if (buParam) conds.push(eq(bookingOrders.businessUnitId, buParam));
    if (statusParam !== "all") conds.push(eq(bookingOrders.status, statusParam as typeof bookingOrders.$inferSelect.status));
    if (year) conds.push(sql`extract(year from ${periodExpr}) = ${year}`);
    if (month) conds.push(sql`extract(month from ${periodExpr}) = ${month}`);
    if (q) conds.push(or(ilike(bookingOrders.number, `%${q}%`), ilike(bookingOrders.toName, `%${q}%`), ilike(bookingOrders.campaign, `%${q}%`), ilike(bookingOrders.agency, `%${q}%`), ilike(bookingOrders.client, `%${q}%`)));

    rows = await db
      .select({
        id: bookingOrders.id, number: bookingOrders.number, issueDate: bookingOrders.issueDate,
        receiptDate: bookingOrders.receiptDate, status: bookingOrders.status,
        toName: bookingOrders.toName, agency: bookingOrders.agency, client: bookingOrders.client,
        campaign: bookingOrders.campaign, medium: bookingOrders.medium, currency: bookingOrders.currency,
        totalNetFils: bookingOrders.totalNetFils, vatFils: bookingOrders.vatFils, grandTotalFils: bookingOrders.grandTotalFils,
        buName: businessUnits.name, salesName: salespeople.name, industryName: industries.name,
      })
      .from(bookingOrders)
      .leftJoin(businessUnits, eq(businessUnits.id, bookingOrders.businessUnitId))
      .leftJoin(salespeople, eq(salespeople.id, bookingOrders.salespersonId))
      .leftJoin(industries, eq(industries.id, bookingOrders.industryId))
      .where(and(...conds))
      .orderBy(desc(periodExpr), desc(bookingOrders.id))
      .limit(500);
  } catch {
    dbError = true;
  }

  // Totals split by currency (FX consolidation lands in a later phase).
  const byCurrency = new Map<string, { net: number; revenue: number; count: number }>();
  for (const r of rows) {
    const c = byCurrency.get(r.currency) ?? { net: 0, revenue: 0, count: 0 };
    c.count += 1;
    c.net += r.totalNetFils;
    if (REVENUE_STATUSES.has(r.status)) c.revenue += r.grandTotalFils;
    byCurrency.set(r.currency, c);
  }
  const currencies = [...byCurrency.entries()];

  return (
    <div>
      <PageHeader title="Tracker" subtitle="Cross-media booking register — every Booking Order with its revenue dimensions. Approved bookings feed revenue reports." />

      {/* Filters */}
      <form className="mb-4 flex flex-wrap items-end gap-2" action="/tracker">
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted">Business Unit</label>
          <select name="bu" defaultValue={sp.bu ?? "all"} className={sel}>
            <option value="all">All units</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted">Status</label>
          <select name="status" defaultValue={statusParam} className={sel}>
            {STATUS_FILTER.map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : (STATUS_LABEL[s] ?? s)}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted">Year</label>
          <select name="year" defaultValue={sp.year ?? "all"} className={sel}>
            <option value="all">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted">Month</label>
          <select name="month" defaultValue={sp.month ?? "all"} className={sel}>
            <option value="all">All months</option>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted">Search</label>
          <input name="q" defaultValue={q} placeholder="BO no, medium, agency, client, campaign…" className={sel + " w-full"} />
        </div>
        <button className="inline-flex h-9 items-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink-2">Apply</button>
        <Link href="/tracker" className="inline-flex h-9 items-center rounded-lg border border-line-2 bg-surface px-3 text-sm font-medium hover:bg-bg">Reset</Link>
      </form>

      {/* Summary */}
      {!dbError && rows.length > 0 && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="text-[10px] uppercase tracking-wide text-muted">Bookings</div>
            <div className="mt-1 font-display text-2xl font-semibold text-ink tnum">{rows.length}</div>
          </div>
          {currencies.map(([cur, v]) => (
            <div key={cur} className="rounded-xl border border-line bg-surface p-4">
              <div className="text-[10px] uppercase tracking-wide text-muted">Approved revenue · {cur}</div>
              <div className="mt-1 font-display text-2xl font-semibold text-ink tnum">{formatFils(v.revenue, { currency: cur })}</div>
              <div className="mt-0.5 text-xs text-muted">{v.count} BO · net {formatFils(v.net, { withSymbol: false })}</div>
            </div>
          ))}
        </div>
      )}

      <Card>
        {dbError ? (
          <EmptyState title="Database not connected yet" hint="Check DATABASE_URL and migrations." />
        ) : rows.length === 0 ? (
          <EmptyState title="No bookings match" hint="Adjust the filters, or create a booking order." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 1100 }}>
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-3 font-medium">BO No.</th>
                  <th className="px-3 py-3 font-medium">Period</th>
                  <th className="px-3 py-3 font-medium">Unit</th>
                  <th className="px-3 py-3 font-medium">Medium</th>
                  <th className="px-3 py-3 font-medium">Agency</th>
                  <th className="px-3 py-3 font-medium">Client</th>
                  <th className="px-3 py-3 font-medium">Salesperson</th>
                  <th className="px-3 py-3 font-medium">Media</th>
                  <th className="px-3 py-3 text-right font-medium">Net</th>
                  <th className="px-3 py-3 text-right font-medium">Grand Total</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0 hover:bg-bg">
                    <td className="px-3 py-2.5"><Link href={`/booking-orders/${r.id}`} className="font-medium text-ink hover:text-teal-ink">{r.number}</Link></td>
                    <td className="px-3 py-2.5 tnum text-muted">{(r.receiptDate ?? r.issueDate)}</td>
                    <td className="px-3 py-2.5 text-muted">{r.buName ?? "—"}</td>
                    <td className="px-3 py-2.5">{r.toName ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted">{r.agency ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted">{r.client ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted">{r.salesName ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted">{r.medium ?? (MEDIA_LABEL[""] ?? "—")}</td>
                    <td className="px-3 py-2.5 text-right tnum">{formatFils(r.totalNetFils, { withSymbol: false })}</td>
                    <td className="px-3 py-2.5 text-right tnum">{r.currency} {formatFils(r.grandTotalFils, { withSymbol: false })}</td>
                    <td className="px-3 py-2.5"><Badge tone={STATUS_TONE[r.status] ?? "muted"}>{STATUS_LABEL[r.status] ?? r.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-3 text-xs text-muted">Showing up to 500 rows. Revenue totals count approved, sent, confirmed and invoiced bookings; currencies are shown separately until FX consolidation is enabled.</p>
    </div>
  );
}
