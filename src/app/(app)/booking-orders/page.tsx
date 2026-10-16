import Link from "next/link";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { bookingOrders } from "@/db/schema";
import { PageHeader, LinkButton, Card, Badge, EmptyState } from "@/components/ui";
import { formatFils } from "@/lib/money";
import { getSession } from "@/lib/auth";
import { isSalesperson } from "@/lib/session";
import { salespersonIdForEmail } from "@/lib/scope";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;

const STATUS_TONE: Record<string, "good" | "neutral" | "muted"> = {
  draft: "muted", pending_approval: "neutral", approved: "good", sent: "neutral", confirmed: "good", invoiced: "good", cancelled: "muted",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", pending_approval: "Pending", approved: "Approved", sent: "Sent", confirmed: "Confirmed", invoiced: "Invoiced", cancelled: "Cancelled",
};

export default async function BookingOrdersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const session = await getSession();
  const ownId = isSalesperson(session?.role) ? await salespersonIdForEmail(session?.email) : null;
  const mineOnly = isSalesperson(session?.role) ? eq(bookingOrders.salespersonId, ownId ?? -1) : undefined;
  let rows: (typeof bookingOrders.$inferSelect)[] = [];
  let dbError = false;
  try {
    const where = q
      ? and(eq(bookingOrders.companyId, COMPANY_ID), mineOnly, or(ilike(bookingOrders.number, `%${q}%`), ilike(bookingOrders.toName, `%${q}%`), ilike(bookingOrders.campaign, `%${q}%`)))
      : and(eq(bookingOrders.companyId, COMPANY_ID), mineOnly);
    rows = await db.select().from(bookingOrders).where(where).orderBy(desc(bookingOrders.id)).limit(200);
  } catch {
    dbError = true;
  }

  return (
    <div>
      <PageHeader
        title="Booking Orders"
        subtitle="Media Booking Orders (BO) issued to publishers."
        action={<LinkButton href="/booking-orders/new">New booking order</LinkButton>}
      />
      <form className="mb-4" action="/booking-orders">
        <input name="q" defaultValue={q} placeholder="Search BO no, publisher or campaign…" className="field h-10 w-80 rounded-lg border border-line-2 bg-surface px-3 text-sm" />
      </form>
      <Card>
        {dbError ? (
          <EmptyState title="Database not connected yet" hint="Check DATABASE_URL and migrations." />
        ) : rows.length === 0 ? (
          <EmptyState title={q ? "No matches" : "No booking orders yet"} hint={q ? "Try a different search." : "Create your first Media Booking Order."} action={!q ? <LinkButton href="/booking-orders/new">New booking order</LinkButton> : undefined} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">BO No.</th>
                <th className="px-5 py-3 font-medium">To / Publisher</th>
                <th className="px-5 py-3 font-medium">Campaign</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 text-right font-medium">Net (incl. VAT)</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-b border-line last:border-0 hover:bg-bg">
                  <td className="px-5 py-3"><Link href={`/booking-orders/${b.id}`} className="font-medium text-ink hover:text-teal-ink">{b.number}</Link></td>
                  <td className="px-5 py-3">{b.toName ?? "—"}</td>
                  <td className="px-5 py-3 text-muted">{b.campaign ?? "—"}</td>
                  <td className="px-5 py-3 tnum text-muted">{b.issueDate}</td>
                  <td className="px-5 py-3 text-right tnum">{b.currency} {formatFils(b.grandTotalFils, { withSymbol: false })}</td>
                  <td className="px-5 py-3"><Badge tone={STATUS_TONE[b.status] ?? "muted"}>{STATUS_LABEL[b.status] ?? b.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
