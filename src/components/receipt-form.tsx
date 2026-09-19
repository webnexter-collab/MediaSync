"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import type { FormState } from "@/lib/validators";
import { paymentMethodValues } from "@/lib/validators";
import { formatFils, toFils, toAed } from "@/lib/money";

export type OpenInvoice = {
  id: number;
  number: string;
  issueDate: string;
  grandTotalFils: number;
  amountPaidFils: number;
  outstandingFils: number;
};

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

export function ReceiptForm({
  action,
  customerId,
  customerName,
  openInvoices,
  bankAccounts = [],
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  customerId: number;
  customerName: string;
  openInvoices: OpenInvoice[];
  bankAccounts?: { id: number; name: string }[];
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, { ok: false });
  const [amounts, setAmounts] = useState<Record<number, string>>({});

  const setAmt = (id: number, v: string) => setAmounts((p) => ({ ...p, [id]: v }));

  const allocations = useMemo(
    () =>
      openInvoices
        .map((inv) => ({ documentId: inv.id, amountAed: num(amounts[inv.id] ?? "") }))
        .filter((a) => a.amountAed > 0),
    [amounts, openInvoices],
  );

  const totalFils = allocations.reduce((s, a) => s + toFils(a.amountAed), 0);

  const overAllocated = openInvoices.some(
    (inv) => toFils(num(amounts[inv.id] ?? "")) > inv.outstandingFils,
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="allocations" value={JSON.stringify(allocations)} />

      {state.message && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {state.message}
        </div>
      )}

      {/* Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 rounded-xl border border-line bg-surface p-5">
        <div className="col-span-2">
          <label className="mb-1.5 block text-sm font-medium">Customer</label>
          <div className="flex h-10 items-center rounded-lg border border-line bg-bg px-3 text-sm text-fg">
            {customerName}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Date *</label>
          <input
            type="date"
            name="paymentDate"
            defaultValue={today()}
            className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Method</label>
          <select
            name="method"
            defaultValue="bank_transfer"
            className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm"
          >
            {paymentMethodValues.map((m) => (
              <option key={m} value={m}>
                {METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="mb-1.5 block text-sm font-medium">Received into account</label>
          <select
            name="bankAccountId"
            defaultValue=""
            className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm"
          >
            <option value="">— none —</option>
            {bankAccounts.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-4">
          <label className="mb-1.5 block text-sm font-medium">Reference</label>
          <input
            name="reference"
            placeholder="Cheque no. / transaction ID"
            className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm"
          />
        </div>
      </div>

      {/* Allocations */}
      {openInvoices.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface px-6 py-10 text-center text-sm text-muted">
          This customer has no outstanding invoices. Only sent invoices with a balance can receive a payment.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-bg text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2.5 font-medium">Invoice</th>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
                <th className="px-4 py-2.5 text-right font-medium">Outstanding</th>
                <th className="w-40 px-4 py-2.5 text-right font-medium">Allocate (AED)</th>
              </tr>
            </thead>
            <tbody>
              {openInvoices.map((inv) => {
                const over = toFils(num(amounts[inv.id] ?? "")) > inv.outstandingFils;
                return (
                  <tr key={inv.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 font-medium text-ink tnum">{inv.number}</td>
                    <td className="px-4 py-2.5 tnum text-muted">{inv.issueDate}</td>
                    <td className="px-4 py-2.5 text-right tnum">{formatFils(inv.grandTotalFils, { withSymbol: false })}</td>
                    <td className="px-4 py-2.5 text-right tnum">{formatFils(inv.outstandingFils, { withSymbol: false })}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <input
                          value={amounts[inv.id] ?? ""}
                          onChange={(e) => setAmt(inv.id, e.target.value)}
                          inputMode="decimal"
                          placeholder="0.00"
                          className={`field tnum h-9 w-28 rounded-md border bg-surface px-2 text-right text-sm ${over ? "border-danger" : "border-line-2"}`}
                        />
                        <button
                          type="button"
                          onClick={() => setAmt(inv.id, String(toAed(inv.outstandingFils)))}
                          className="text-xs text-teal-ink hover:underline"
                          title="Fill outstanding"
                        >
                          full
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-line bg-bg px-4 py-3">
            <span className="text-sm font-medium text-fg">Receipt total</span>
            <span className="font-display text-lg font-semibold text-ink tnum">{formatFils(totalFils)}</span>
          </div>
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium">Notes</label>
        <textarea
          name="notes"
          rows={2}
          className="field w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm"
        />
      </div>

      {overAllocated && (
        <p className="text-sm text-danger">One or more allocations exceed the invoice's outstanding amount.</p>
      )}

      <div className="flex items-center gap-3 border-t border-line pt-5">
        <SubmitButton label="Record receipt" />
        <Link
          href="/receipts"
          className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg transition-colors hover:bg-bg"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
