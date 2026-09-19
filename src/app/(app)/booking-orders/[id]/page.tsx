import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookingOrders, bookingOrderLines } from "@/db/schema";
import { PageHeader, Card, Badge, LinkButton } from "@/components/ui";
import { formatFils } from "@/lib/money";
import { setBookingOrderStatus, convertBookingOrderToInvoice } from "@/actions/booking-orders";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;
const MEDIA_LABEL: Record<string, string> = { print: "Print", digital: "Digital", radio: "Radio", tv: "TV", website: "Website" };

function parseDays(json: string | null): number[] {
  try {
    const a = JSON.parse(json ?? "[]");
    return Array.isArray(a) ? a.filter((n): n is number => typeof n === "number") : [];
  } catch {
    return [];
  }
}

export default async function BookingOrderView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const boId = Number(id);
  if (!Number.isInteger(boId)) notFound();

  const [bo] = await db.select().from(bookingOrders).where(and(eq(bookingOrders.id, boId), eq(bookingOrders.companyId, COMPANY_ID))).limit(1);
  if (!bo) notFound();
  const lines = await db.select().from(bookingOrderLines).where(eq(bookingOrderLines.bookingOrderId, boId)).orderBy(asc(bookingOrderLines.lineNo));

  const cur = (f: number) => `${bo.currency} ${formatFils(f, { withSymbol: false })}`;
  const parties: [string, string | null][] = [
    ["To — Publisher", bo.toName], ["Advertiser", bo.advertiser], ["Agency", bo.agency],
    ["Client", bo.client], ["Brand", bo.brand], ["Campaign", bo.campaign],
  ];

  return (
    <div>
      <PageHeader
        title={bo.number}
        subtitle={`Media Booking Order · ${bo.issueDate}`}
        action={
          <div className="flex items-center gap-2">
            <a href={`/booking-orders/${bo.id}/pdf`} target="_blank" rel="noopener" className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg hover:bg-bg">PDF</a>
            {bo.status === "draft" && <LinkButton href={`/booking-orders/${bo.id}/edit`}>Edit</LinkButton>}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={bo.status === "confirmed" || bo.status === "invoiced" ? "good" : "muted"}>{bo.status}</Badge>
        {bo.status === "draft" && (
          <form action={setBookingOrderStatus.bind(null, bo.id, "sent")}><button className="rounded-lg border border-line-2 bg-surface px-3 py-1.5 text-xs font-medium hover:bg-bg">Mark sent</button></form>
        )}
        {(bo.status === "draft" || bo.status === "sent") && (
          <form action={setBookingOrderStatus.bind(null, bo.id, "confirmed")}><button className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-ink-2">Confirm</button></form>
        )}
        {bo.status !== "cancelled" && bo.status !== "invoiced" && (
          <form action={setBookingOrderStatus.bind(null, bo.id, "cancelled")}><button className="rounded-lg border border-line-2 bg-surface px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/5">Cancel</button></form>
        )}
        {(bo.status === "confirmed" || bo.status === "sent") && (
          <form action={convertBookingOrderToInvoice.bind(null, bo.id)}><button className="rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">Create Invoice</button></form>
        )}
        {bo.status === "invoiced" && (
          <Link href="/invoices" className="rounded-lg border border-line-2 bg-surface px-3 py-1.5 text-xs font-medium text-teal-ink hover:bg-bg">View invoices →</Link>
        )}
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-6 sm:grid-cols-3">
          {parties.map(([k, v]) => (
            <div key={k}><div className="text-[10px] uppercase tracking-wide text-muted">{k}</div><div className="mt-0.5 text-sm text-ink">{v || "—"}</div></div>
          ))}
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Currency</div><div className="mt-0.5 text-sm text-ink">{bo.currency}</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Payment Terms</div><div className="mt-0.5 text-sm text-ink">{bo.paymentTerms || "—"}</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Medium</div><div className="mt-0.5 text-sm text-ink">{bo.medium || "—"}</div></div>
        </div>
      </Card>

      <div className="mt-4">
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Platform</th>
                <th className="px-4 py-3 font-medium">Particulars / Branding</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">UOM</th>
                <th className="px-4 py-3 text-right font-medium">Unit Gross</th>
                <th className="px-4 py-3 text-right font-medium">Disc%</th>
                <th className="px-4 py-3 text-right font-medium">Total Net</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.id} className="border-b border-line align-top last:border-0">
                  <td className="px-4 py-3 tnum text-muted">{String(i + 1).padStart(2, "0")}</td>
                  <td className="px-4 py-3"><div className="font-medium text-ink">{l.platform || "—"}</div><Badge tone="neutral">{MEDIA_LABEL[l.mediaType] ?? l.mediaType}</Badge></td>
                  <td className="px-4 py-3"><div className="font-medium text-ink">{l.particulars || "—"}</div>{l.brandingDetails && <div className="mt-1 max-w-md text-xs text-muted">{l.brandingDetails}</div>}{l.period && <div className="mt-1 text-xs text-muted">{l.period}</div>}{(() => { const d = parseDays(l.annexure); return d.length > 0 ? <div className="mt-1 text-xs text-muted">Schedule ({d.length}d): {d.join(", ")}</div> : null; })()}</td>
                  <td className="px-4 py-3 text-right tnum">{Number(l.quantity)}</td>
                  <td className="px-4 py-3">{l.uom || "—"}</td>
                  <td className="px-4 py-3 text-right tnum">{formatFils(l.unitGrossFils, { withSymbol: false })}</td>
                  <td className="px-4 py-3 text-right tnum">{Number(l.discountPct) || "—"}</td>
                  <td className="px-4 py-3 text-right tnum">{formatFils(l.lineNetFils, { withSymbol: false })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="mt-4 flex justify-end">
        <div className="w-full max-w-xs rounded-xl border border-line bg-surface p-5">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Total Gross</dt><dd className="tnum">{cur(bo.totalGrossFils)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd className="tnum">{bo.lineDiscountFils ? `− ${formatFils(bo.lineDiscountFils, { withSymbol: false })}` : "—"}</dd></div>
            {bo.agencyDiscountFils > 0 && <div className="flex justify-between"><dt className="text-muted">Agency discount</dt><dd className="tnum">− {formatFils(bo.agencyDiscountFils, { withSymbol: false })}</dd></div>}
            <div className="flex justify-between border-t border-line pt-2"><dt className="text-muted">Total Net</dt><dd className="tnum">{cur(bo.totalNetFils)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">VAT ({Number(bo.vatRatePct)}%)</dt><dd className="tnum">{formatFils(bo.vatFils, { withSymbol: false })}</dd></div>
            <div className="mt-1 flex items-center justify-between rounded-lg bg-ink px-4 py-3 text-white"><dt className="text-xs uppercase tracking-wide text-white/70">Net (incl. VAT)</dt><dd className="font-display text-base font-semibold tnum">{cur(bo.grandTotalFils)}</dd></div>
            {(bo.totalCostFils > 0 || bo.marginFils !== bo.totalNetFils) && (
              <div className="mt-3 rounded-lg border border-dashed border-line-2 bg-bg/40 p-3">
                <div className="mb-1 text-[10px] uppercase tracking-wide text-muted">Internal — profitability</div>
                <div className="flex justify-between text-sm"><dt className="text-muted">Media cost</dt><dd className="tnum">{cur(bo.totalCostFils)}</dd></div>
                <div className="flex justify-between text-sm"><dt className="text-muted">Margin</dt><dd className={`tnum font-medium ${bo.marginFils < 0 ? "text-danger" : "text-teal-ink"}`}>{cur(bo.marginFils)}{bo.totalNetFils > 0 ? ` (${Math.round((bo.marginFils / bo.totalNetFils) * 100)}%)` : ""}</dd></div>
              </div>
            )}
          </dl>
        </div>
      </div>

      {bo.notes && <div className="mt-4 rounded-xl border border-line bg-surface p-5 text-sm"><div className="text-[10px] uppercase tracking-wide text-muted">Notes</div><p className="mt-1 text-ink">{bo.notes}</p></div>}
    </div>
  );
}
