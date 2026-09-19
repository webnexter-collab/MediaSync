import Link from "next/link";
import { Card, EmptyState } from "@/components/ui";
import { formatFils } from "@/lib/money";
import type { UnpaidRow, TxnRow } from "@/lib/reports";

export function StatementTabs({ base, partyId, partyParam, view }: { base: string; partyId: number; partyParam: string; view: string }) {
  const tab = (v: string, label: string) => (
    <Link
      href={`${base}?${partyParam}=${partyId}&view=${v}`}
      className={`inline-flex h-9 items-center rounded-lg px-4 text-sm font-medium transition-colors ${
        view === v ? "bg-ink text-white" : "border border-line-2 bg-surface text-fg hover:bg-bg"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <div className="mb-5 flex gap-2">
      {tab("unpaid", "Unpaid documents")}
      {tab("transactions", "Transactions")}
    </div>
  );
}

export function UnpaidStatement({ rows, docLabel }: { rows: UnpaidRow[]; docLabel: string }) {
  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState title="Nothing outstanding" hint={`No unpaid ${docLabel.toLowerCase()} for this account.`} />
      </Card>
    );
  }
  const total = rows.reduce((s, r) => s + r.outstandingFils, 0);
  return (
    <Card>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-5 py-3 font-medium">{docLabel}</th>
            <th className="px-5 py-3 font-medium">Date</th>
            <th className="px-5 py-3 font-medium">Due</th>
            <th className="px-5 py-3 text-right font-medium">Total</th>
            <th className="px-5 py-3 text-right font-medium">Paid</th>
            <th className="px-5 py-3 text-right font-medium">Outstanding</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line last:border-0 hover:bg-bg">
              <td className="px-5 py-3 font-medium text-ink tnum">{r.number}</td>
              <td className="px-5 py-3 tnum text-muted">{r.issueDate}</td>
              <td className="px-5 py-3 tnum text-muted">{r.dueDate ?? "—"}</td>
              <td className="px-5 py-3 text-right tnum">{formatFils(r.grandTotalFils, { withSymbol: false })}</td>
              <td className="px-5 py-3 text-right tnum text-muted">{formatFils(r.amountPaidFils, { withSymbol: false })}</td>
              <td className="px-5 py-3 text-right tnum font-semibold text-ink">{formatFils(r.outstandingFils, { withSymbol: false })}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-ink/20 bg-bg font-semibold">
            <td className="px-5 py-3 text-ink" colSpan={5}>Total outstanding</td>
            <td className="px-5 py-3 text-right tnum text-ink">{formatFils(total)}</td>
          </tr>
        </tfoot>
      </table>
    </Card>
  );
}

export function TransactionsStatement({ txns }: { txns: TxnRow[] }) {
  if (txns.length === 0) {
    return (
      <Card>
        <EmptyState title="No transactions" hint="There is no activity to show for this account yet." />
      </Card>
    );
  }
  let running = 0;
  return (
    <Card>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-5 py-3 font-medium">Date</th>
            <th className="px-5 py-3 font-medium">Reference</th>
            <th className="px-5 py-3 font-medium">Type</th>
            <th className="px-5 py-3 text-right font-medium">Charge</th>
            <th className="px-5 py-3 text-right font-medium">Payment</th>
            <th className="px-5 py-3 text-right font-medium">Balance</th>
          </tr>
        </thead>
        <tbody>
          {txns.map((t, i) => {
            running += t.debitFils - t.creditFils;
            return (
              <tr key={i} className="border-b border-line last:border-0 hover:bg-bg">
                <td className="px-5 py-3 tnum text-muted">{t.date}</td>
                <td className="px-5 py-3 tnum font-medium text-ink">{t.ref}</td>
                <td className="px-5 py-3 text-muted">{t.description}</td>
                <td className="px-5 py-3 text-right tnum">{t.debitFils ? formatFils(t.debitFils, { withSymbol: false }) : "—"}</td>
                <td className="px-5 py-3 text-right tnum">{t.creditFils ? formatFils(t.creditFils, { withSymbol: false }) : "—"}</td>
                <td className="px-5 py-3 text-right tnum font-semibold text-ink">{formatFils(running, { withSymbol: false })}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-ink/20 bg-bg font-semibold">
            <td className="px-5 py-3 text-ink" colSpan={5}>Closing balance</td>
            <td className="px-5 py-3 text-right tnum text-ink">{formatFils(running)}</td>
          </tr>
        </tfoot>
      </table>
    </Card>
  );
}
