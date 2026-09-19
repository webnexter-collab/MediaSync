import Link from "next/link";
import { and, eq, or, sql, desc } from "drizzle-orm";
import {
  ArrowUpRight, ArrowDownRight, Landmark, AlertTriangle,
  Plus, FileText, ShoppingCart,
} from "lucide-react";
import { db } from "@/db";
import { customers, suppliers, documents, bankAccounts, payments } from "@/db/schema";
import { PageHeader } from "@/components/ui";
import { formatFils, toAed } from "@/lib/money";
import { agedReceivables, agedPayables, BUCKET_KEYS, BUCKET_LABELS } from "@/lib/reports";
import { AgingChart, CashDonut } from "@/components/dashboard-charts";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

type Metrics = {
  receivable: number; payable: number; cash: number; overdue: number;
  openInvoices: number; openPOs: number; custCount: number; suppCount: number;
  aging: { bucket: string; Receivables: number; Payables: number }[];
  cashByAccount: { name: string; value: number }[];
  recent: { type: string; number: string; party: string; total: number; status: string; date: string; href: string }[];
};

async function loadMetrics(): Promise<Metrics | null> {
  try {
    const [recv, pay] = await Promise.all([agedReceivables(), agedPayables()]);

    const accounts = await db.select().from(bankAccounts).where(eq(bankAccounts.companyId, COMPANY_ID));
    const flows = await db
      .select({ bankAccountId: payments.bankAccountId, direction: payments.direction, total: sql<number>`coalesce(sum(${payments.amountFils}),0)::bigint` })
      .from(payments).where(eq(payments.companyId, COMPANY_ID)).groupBy(payments.bankAccountId, payments.direction);
    const balOf = (id: number, opening: number) => {
      let b = opening;
      for (const f of flows) if (f.bankAccountId === id) b += f.direction === "receipt" ? Number(f.total) : -Number(f.total);
      return b;
    };
    const cashAccounts = accounts.filter((a) => a.type !== "credit_card");
    const cashByAccount = cashAccounts.map((a) => ({ name: a.name, value: toAed(balOf(a.id, a.openingBalanceFils)) }));
    const cash = cashAccounts.reduce((s, a) => s + balOf(a.id, a.openingBalanceFils), 0);

    const [custCount, suppCount, openInvoices, openPOs] = await Promise.all([
      db.$count(customers, eq(customers.companyId, COMPANY_ID)),
      db.$count(suppliers, eq(suppliers.companyId, COMPANY_ID)),
      db.$count(
        documents,
        and(
          eq(documents.companyId, COMPANY_ID),
          eq(documents.type, "invoice"),
          or(eq(documents.status, "sent"), eq(documents.status, "partially_paid")),
        ),
      ),
      db.$count(
        documents,
        and(
          eq(documents.companyId, COMPANY_ID),
          eq(documents.type, "purchase_order"),
          or(eq(documents.status, "sent"), eq(documents.status, "partially_paid")),
        ),
      ),
    ]);

    const recentDocs = await db
      .select({
        type: documents.type, number: documents.number, status: documents.status,
        date: documents.issueDate, total: documents.grandTotalFils, id: documents.id,
        custName: customers.name, suppName: suppliers.name,
      })
      .from(documents)
      .leftJoin(customers, eq(documents.customerId, customers.id))
      .leftJoin(suppliers, eq(documents.supplierId, suppliers.id))
      .where(and(eq(documents.companyId, COMPANY_ID), or(eq(documents.type, "invoice"), eq(documents.type, "purchase_order"))))
      .orderBy(desc(documents.id))
      .limit(6);

    const hrefBase: Record<string, string> = { invoice: "/invoices", purchase_order: "/purchase-orders" };
    const typeLabel: Record<string, string> = { invoice: "Invoice", purchase_order: "Purchase order" };

    const overdue = (["b1_30", "b31_60", "b61_90", "b90"] as const).reduce((s, b) => s + recv.totals[b], 0);
    const aging = BUCKET_KEYS.map((b) => ({ bucket: BUCKET_LABELS[b].replace(" days", ""), Receivables: toAed(recv.totals[b]), Payables: toAed(pay.totals[b]) }));

    return {
      receivable: recv.grand, payable: pay.grand, cash, overdue,
      openInvoices, openPOs,
      custCount, suppCount,
      aging, cashByAccount,
      recent: recentDocs.map((d) => ({
        type: typeLabel[d.type] ?? d.type, number: d.number,
        party: (d.type === "invoice" ? d.custName : d.suppName) ?? "—",
        total: d.total, status: d.status, date: d.date, href: `${hrefBase[d.type]}/${d.id}`,
      })),
    };
  } catch {
    return null;
  }
}

export default async function Dashboard() {
  const m = await loadMetrics();

  if (!m) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Your sales and purchasing at a glance." />
        <div className="rounded-xl border border-line bg-surface px-6 py-12 text-center">
          <p className="text-sm text-muted">Database not connected yet. Set DATABASE_URL, run the migrations, then refresh.</p>
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Receivables", value: formatFils(m.receivable), sub: `${m.openInvoices} open invoices`, icon: ArrowUpRight, accent: "from-teal to-teal-ink", href: "/reports/aged-receivables" },
    { label: "Payables", value: formatFils(m.payable), sub: `${m.openPOs} open orders`, icon: ArrowDownRight, accent: "from-[#c2894e] to-[#a06c34]", href: "/reports/aged-payables" },
    { label: "Cash position", value: formatFils(m.cash), sub: `${m.cashByAccount.length} accounts`, icon: Landmark, accent: "from-ink to-ink-2", href: "/bank-accounts" },
    { label: "Overdue", value: formatFils(m.overdue), sub: "past due date", icon: AlertTriangle, accent: "from-danger to-[#8f1e18]", href: "/reports/aged-receivables" },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Your money in and money out, at a glance." />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href} className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-5 transition-shadow hover:shadow-lg hover:shadow-ink/5">
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${s.accent}`} />
              <div className="flex items-start justify-between">
                <div className="text-xs font-medium uppercase tracking-wide text-muted">{s.label}</div>
                <div className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${s.accent} text-white`}>
                  <Icon size={16} />
                </div>
              </div>
              <div className="mt-3 font-display text-2xl font-semibold text-ink tnum">{s.value}</div>
              <div className="mt-1 text-xs text-muted">{s.sub}</div>
            </Link>
          );
        })}
      </div>

      {/* Charts */}
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-line bg-surface p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Aging — receivables vs payables</h2>
          </div>
          <AgingChart data={m.aging} />
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-2 font-display text-lg font-semibold text-ink">Cash by account</h2>
          <CashDonut data={m.cashByAccount} />
        </div>
      </div>

      {/* Recent + quick actions */}
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="font-display text-lg font-semibold text-ink">Recent documents</h2>
          </div>
          {m.recent.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted">No documents yet.</div>
          ) : (
            <div className="divide-y divide-line">
              {m.recent.map((r, i) => (
                <Link key={i} href={r.href} className="flex flex-col gap-0.5 px-5 py-3 hover:bg-bg">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium text-ink tnum">{r.number}</span>
                    <span className="tnum font-medium text-ink whitespace-nowrap">{formatFils(r.total)}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 text-xs text-muted">
                    <span className="min-w-0 truncate">{r.type} · {r.party}</span>
                    <span className="tnum whitespace-nowrap">{r.date}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">Quick actions</h2>
          <div className="space-y-2">
            {[
              { href: "/invoices/new", label: "New invoice", icon: FileText },
              { href: "/purchase-orders/new", label: "New purchase order", icon: ShoppingCart },
              { href: "/receipts/new", label: "Record receipt", icon: Plus },
              { href: "/payments/new", label: "Record payment", icon: Plus },
            ].map((a) => {
              const Icon = a.icon;
              return (
                <Link key={a.href} href={a.href} className="flex items-center gap-2.5 rounded-lg border border-line-2 bg-surface px-3 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-bg">
                  <Icon size={16} className="text-teal-ink" />
                  {a.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
