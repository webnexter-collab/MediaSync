import Link from "next/link";
import { BUCKET_KEYS, BUCKET_LABELS, type AgingRow, type Bucket } from "@/lib/reports";
import { formatFils } from "@/lib/money";
import { Card, EmptyState } from "@/components/ui";

export function AgingTable({
  rows,
  totals,
  grand,
  statementBase,
  partyParam,
}: {
  rows: AgingRow[];
  totals: Record<Bucket, number>;
  grand: number;
  statementBase: string; // e.g. /reports/customer-statement
  partyParam: string; // customerId | supplierId
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState title="Nothing outstanding" hint="No unpaid documents fall into the aging buckets right now." />
      </Card>
    );
  }

  return (
    <>
      <div className="mb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {BUCKET_KEYS.map((b) => (
          <div key={b} className="rounded-xl border border-line bg-surface p-4">
            <div className="text-xs uppercase tracking-wide text-muted">{BUCKET_LABELS[b]}</div>
            <div className="mt-1 font-display text-xl font-semibold text-ink tnum">
              {formatFils(totals[b], { withSymbol: false })}
            </div>
          </div>
        ))}
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-medium">Account</th>
              {BUCKET_KEYS.map((b) => (
                <th key={b} className="px-4 py-3 text-right font-medium">
                  {BUCKET_LABELS[b]}
                </th>
              ))}
              <th className="px-5 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.partyId} className="border-b border-line last:border-0 hover:bg-bg">
                <td className="px-5 py-3">
                  <Link href={`${statementBase}?${partyParam}=${r.partyId}`} className="font-medium text-ink hover:text-teal-ink">
                    {r.partyName}
                  </Link>
                </td>
                {BUCKET_KEYS.map((b) => (
                  <td key={b} className={`px-4 py-3 text-right tnum ${r.buckets[b] > 0 ? "text-fg" : "text-muted/40"}`}>
                    {r.buckets[b] > 0 ? formatFils(r.buckets[b], { withSymbol: false }) : "—"}
                  </td>
                ))}
                <td className="px-5 py-3 text-right tnum font-semibold text-ink">{formatFils(r.total, { withSymbol: false })}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink/20 bg-bg font-semibold">
              <td className="px-5 py-3 text-ink">Total</td>
              {BUCKET_KEYS.map((b) => (
                <td key={b} className="px-4 py-3 text-right tnum text-ink">{formatFils(totals[b], { withSymbol: false })}</td>
              ))}
              <td className="px-5 py-3 text-right tnum text-ink">{formatFils(grand, { withSymbol: false })}</td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </>
  );
}
