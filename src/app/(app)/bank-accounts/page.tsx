import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { CreditCard, Wallet } from "lucide-react";
import { db } from "@/db";
import { bankAccounts, payments } from "@/db/schema";
import { PageHeader, LinkButton, Card, Badge, EmptyState } from "@/components/ui";
import { formatFils } from "@/lib/money";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

const TYPE_LABEL: Record<string, string> = { bank: "Bank", cash: "Cash", credit_card: "Credit card" };

export default async function BankAccountsPage() {
  let accounts: (typeof bankAccounts.$inferSelect)[] = [];
  let flows: { bankAccountId: number | null; direction: string; total: number }[] = [];
  let dbError = false;
  try {
    accounts = await db.select().from(bankAccounts).where(eq(bankAccounts.companyId, COMPANY_ID)).orderBy(bankAccounts.name);
    flows = await db
      .select({ bankAccountId: payments.bankAccountId, direction: payments.direction, total: sql<number>`coalesce(sum(${payments.amountFils}), 0)::bigint` })
      .from(payments).where(eq(payments.companyId, COMPANY_ID)).groupBy(payments.bankAccountId, payments.direction);
  } catch {
    dbError = true;
  }

  const flow = (acctId: number, dir: string) => {
    const f = flows.find((x) => x.bankAccountId === acctId && x.direction === dir);
    return f ? Number(f.total) : 0;
  };
  // Asset accounts: opening + receipts in − payments out.
  const assetBalance = (a: typeof bankAccounts.$inferSelect) => a.openingBalanceFils + flow(a.id, "receipt") - flow(a.id, "payment");
  // Card: opening owed + payments made from card − settlements received.
  const cardOutstanding = (a: typeof bankAccounts.$inferSelect) => a.openingBalanceFils + flow(a.id, "payment") - flow(a.id, "receipt");

  const cashAccounts = accounts.filter((a) => a.type !== "credit_card");
  const cardAccounts = accounts.filter((a) => a.type === "credit_card");
  const totalCash = cashAccounts.reduce((s, a) => s + assetBalance(a), 0);
  const totalCardOutstanding = cardAccounts.reduce((s, a) => s + cardOutstanding(a), 0);

  return (
    <div>
      <PageHeader
        title="Bank & Cash Accounts"
        subtitle="Accounts, cards and their live balances from receipts and payments."
        action={<LinkButton href="/bank-accounts/new">New account</LinkButton>}
      />

      {!dbError && accounts.length > 0 && (
        <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-line bg-gradient-to-br from-ink to-ink-2 p-6 text-white">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/60"><Wallet size={14} /> Total cash position</div>
            <div className="mt-1 font-display text-3xl font-semibold tnum">{formatFils(totalCash)}</div>
            <div className="mt-1 text-xs text-white/60">{cashAccounts.length} bank & cash accounts</div>
          </div>
          <div className="rounded-2xl border border-line bg-gradient-to-br from-[#c2894e] to-[#a06c34] p-6 text-white">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/70"><CreditCard size={14} /> Card outstanding</div>
            <div className="mt-1 font-display text-3xl font-semibold tnum">{formatFils(totalCardOutstanding)}</div>
            <div className="mt-1 text-xs text-white/70">{cardAccounts.length} credit cards</div>
          </div>
        </div>
      )}

      {dbError ? (
        <Card><EmptyState title="Database not connected yet" hint="Set DATABASE_URL and run the migrations, then refresh." /></Card>
      ) : accounts.length === 0 ? (
        <Card>
          <EmptyState title="No accounts yet" hint="Add your bank, cash and credit card accounts to track balances."
            action={<LinkButton href="/bank-accounts/new">New account</LinkButton>} />
        </Card>
      ) : (
        <div className="space-y-6">
          {cashAccounts.length > 0 && (
            <Card>
              <div className="border-b border-line px-5 py-3"><h2 className="font-display text-lg font-semibold text-ink">Bank & cash</h2></div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-5 py-3 font-medium">Account</th><th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Number</th><th className="px-5 py-3 text-right font-medium">Opening</th>
                    <th className="px-5 py-3 text-right font-medium">Balance</th><th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cashAccounts.map((a) => (
                    <tr key={a.id} className="border-b border-line last:border-0 hover:bg-bg">
                      <td className="px-5 py-3">
                        <Link href={`/bank-accounts/${a.id}/edit`} className="font-medium text-ink hover:text-teal-ink">{a.name}</Link>
                        {a.bankName && <div className="text-xs text-muted">{a.bankName}</div>}
                      </td>
                      <td className="px-5 py-3 text-muted">{TYPE_LABEL[a.type]}</td>
                      <td className="px-5 py-3 tnum text-muted">{a.accountNumber ?? a.iban ?? "—"}</td>
                      <td className="px-5 py-3 text-right tnum text-muted">{formatFils(a.openingBalanceFils, { withSymbol: false })}</td>
                      <td className="px-5 py-3 text-right tnum font-medium text-ink">{formatFils(assetBalance(a), { withSymbol: false })}</td>
                      <td className="px-5 py-3">{a.isActive ? <Badge tone="good">Active</Badge> : <Badge tone="muted">Inactive</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {cardAccounts.length > 0 && (
            <Card>
              <div className="border-b border-line px-5 py-3"><h2 className="font-display text-lg font-semibold text-ink">Credit cards</h2></div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-5 py-3 font-medium">Card</th><th className="px-5 py-3 font-medium">Number</th>
                    <th className="px-5 py-3 font-medium">Cycle</th>
                    <th className="px-5 py-3 text-right font-medium">Limit</th>
                    <th className="px-5 py-3 text-right font-medium">Outstanding</th>
                    <th className="px-5 py-3 text-right font-medium">Available</th>
                  </tr>
                </thead>
                <tbody>
                  {cardAccounts.map((a) => {
                    const out = cardOutstanding(a);
                    const avail = a.creditLimitFils - out;
                    const util = a.creditLimitFils > 0 ? Math.min(100, Math.round((out / a.creditLimitFils) * 100)) : 0;
                    return (
                      <tr key={a.id} className="border-b border-line last:border-0 hover:bg-bg">
                        <td className="px-5 py-3">
                          <Link href={`/bank-accounts/${a.id}/edit`} className="font-medium text-ink hover:text-teal-ink">{a.name}</Link>
                          {a.bankName && <div className="text-xs text-muted">{a.bankName}</div>}
                        </td>
                        <td className="px-5 py-3 tnum text-muted">{a.last4 ? `•••• ${a.last4}` : "—"}</td>
                        <td className="px-5 py-3 text-muted tnum">{a.statementDay ? `stmt ${a.statementDay}` : "—"}{a.dueDay ? ` · due ${a.dueDay}` : ""}</td>
                        <td className="px-5 py-3 text-right tnum text-muted">{formatFils(a.creditLimitFils, { withSymbol: false })}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="tnum font-medium text-ink">{formatFils(out, { withSymbol: false })}</div>
                          <div className="mt-1 ml-auto h-1.5 w-24 overflow-hidden rounded-full bg-line">
                            <div className={`h-full ${util > 80 ? "bg-danger" : "bg-teal"}`} style={{ width: `${util}%` }} />
                          </div>
                        </td>
                        <td className={`px-5 py-3 text-right tnum font-medium ${avail < 0 ? "text-danger" : "text-teal-ink"}`}>{formatFils(avail, { withSymbol: false })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
      <p className="mt-3 text-xs text-muted">
        Cash balances = opening + receipts in − payments out. Card outstanding = opening owed + payments made on the card − settlements; available = limit − outstanding.
      </p>
    </div>
  );
}
