"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import type { FormState } from "@/lib/validators";
import { paymentMethodValues } from "@/lib/validators";
import { formatFils, toFils, toAed } from "@/lib/money";
import type { OpenInvoice } from "@/components/receipt-form";

export type BankAccountOpt = { id: number; name: string };

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  cheque: "Cheque",
  card: "Card",
  other: "Other",
};

const today = () => new Date().toISOString().slice(0, 10);
const num = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center rounded-lg bg-ink px-5 text-sm font-medium text-white transition-colors hover:bg-ink-2 disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

export function PaymentForm({
  action,
  supplierId,
  supplierName,
  openOrders,
  bankAccounts,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  supplierId: number;
  supplierName: string;
  openOrders: OpenInvoice[];
  bankAccounts: BankAccountOpt[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, { ok: false });
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const setAmt = (id: number, v: string) => setAmounts((p) => ({ ...p, [id]: v }));

  const allocations = useMemo(
    () =>
      openOrders
        .map((o) => ({ documentId: o.id, amountAed: num(amounts[o.id] ?? "") }))
        .filter((a) => a.amountAed > 0),
    [amounts, openOrders],
  );
  const totalFils = allocations.reduce((s, a) => s + toFils(a.amountAed), 0);
  const overAllocated = openOrders.some((o) => toFils(num(amounts[o.id] ?? "")) > o.outstandingFils);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="supplierId" value={supplierId} />
      <input type="hidden" name="allocations" value={JSON.stringify(allocations)} />

      {state.message && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{state.message}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 rounded-xl border border-line bg-surface p-5">
        <div className="col-span-2">
          <label className="mb-1.5 block text-sm font-medium">Supplier</label>
          <div className="flex h-10 items-center rounded-lg border border-line bg-bg px-3 text-sm text-fg">{supplierName}</div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Date *</label>
          <input type="date" name="paymentDate" defaultValue={today()} className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Method</label>
          <select name="method" defaultValue="bank_transfer" className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm">
            {paymentMethodValues.map((m) => (
              <option key={m} value={m}>{METHOD_LABELS[m]}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="mb-1.5 block text-sm font-medium">Paid from account</label>
          <select name="bankAccountId" defaultValue="" className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm">
            <option value="">— none —</option>
            {bankAccounts.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="mb-1.5 block text-sm font-medium">Reference</label>
          <input name="reference" placeholder="Cheque no. / transaction ID" className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm" />
        </div>
      </div>

      {openOrders.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface px-6 py-10 text-center text-sm text-muted">
          This supplier has no outstanding purchase orders. Only issued POs with a balance can receive a payment.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-bg text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2.5 font-medium">Order</th>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
                <th className="px-4 py-2.5 text-right font-medium">Outstanding</th>
                <th className="w-40 px-4 py-2.5 text-right font-medium">Allocate (AED)</th>
              </tr>
            </thead>
            <tbody>
              {openOrders.map((o) => {
                const over = toFils(num(amounts[o.id] ?? "")) > o.outstandingFils;
                return (
                  <tr key={o.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 font-medium text-ink tnum">{o.number}</td>
                    <td className="px-4 py-2.5 tnum text-muted">{o.issueDate}</td>
                    <td className="px-4 py-2.5 text-right tnum">{formatFils(o.grandTotalFils, { withSymbol: false })}</td>
                    <td className="px-4 py-2.5 text-right tnum">{formatFils(o.outstandingFils, { withSymbol: false })}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <input
                          value={amounts[o.id] ?? ""}
                          onChange={(e) => setAmt(o.id, e.target.value)}
                          inputMode="decimal"
                          placeholder="0.00"
                          className={`field tnum h-9 w-28 rounded-md border bg-surface px-2 text-right text-sm ${over ? "border-danger" : "border-line-2"}`}
                        />
                        <button type="button" onClick={() => setAmt(o.id, String(toAed(o.outstandingFils)))} className="text-xs text-teal-ink hover:underline">full</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-line bg-bg px-4 py-3">
            <span className="text-sm font-medium text-fg">Payment total</span>
            <span className="font-display text-lg font-semibold text-ink tnum">{formatFils(totalFils)}</span>
          </div>
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium">Notes</label>
        <textarea name="notes" rows={2} className="field w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm" />
      </div>

      {overAllocated && <p className="text-sm text-danger">One or more allocations exceed the order's outstanding amount.</p>}

      <div className="flex items-center gap-3 border-t border-line pt-5">
        <SubmitButton label="Record payment" />
        <Link href="/payments" className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg transition-colors hover:bg-bg">Cancel</Link>
      </div>
    </form>
  );
}
