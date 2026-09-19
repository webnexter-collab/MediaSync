"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import type { FormState } from "@/lib/validators";
import { rateForCategory, taxCategoryValues } from "@/lib/validators";
import { computeTotals, type TaxCategory } from "@/lib/vat";
import { toFils, formatFils } from "@/lib/money";

export type CustomerOpt = { id: number; code: string; name: string };
export type ItemOpt = {
  id: number;
  code: string;
  name: string;
  unitPriceFils: number;
  taxCategory: string;
  description: string | null;
};

type Line = {
  itemId: number | null;
  description: string;
  quantity: string;
  unitPriceAed: string;
  discountPercent: string;
  taxCategory: TaxCategory;
};

export type InvoiceDefaults = {
  customerId?: number;
  issueDate?: string;
  dueDate?: string;
  reference?: string;
  notes?: string;
  terms?: string;
  paymentTerms?: string;
  bankDetails?: string;
  lines?: Line[];
};

const TAX_LABELS: Record<TaxCategory, string> = {
  standard: "Standard 5%",
  zero_rated: "Zero 0%",
  exempt: "Exempt",
  reverse_charge: "Reverse",
  out_of_scope: "Out of scope",
};

const emptyLine = (): Line => ({
  itemId: null,
  description: "",
  quantity: "1",
  unitPriceAed: "0",
  discountPercent: "0",
  taxCategory: "standard",
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function num(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

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

export function InvoiceForm({
  action,
  customers,
  items,
  defaults,
  submitLabel,
  cancelHref = "/invoices",
  dueDateLabel = "Due date",
  defaultTerms = "Payment due within the agreed credit period.",
  partyLabel = "Customer",
  showPaymentTerms = false,
  showBankDetails = false,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  customers: CustomerOpt[];
  items: ItemOpt[];
  defaults?: InvoiceDefaults;
  submitLabel: string;
  cancelHref?: string;
  dueDateLabel?: string;
  defaultTerms?: string;
  partyLabel?: string;
  showPaymentTerms?: boolean;
  showBankDetails?: boolean;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, { ok: false });
  const [lines, setLines] = useState<Line[]>(
    defaults?.lines?.length ? defaults.lines : [emptyLine()],
  );

  const totals = useMemo(() => {
    return computeTotals(
      lines.map((l) => ({
        quantity: num(l.quantity),
        unitPriceFils: toFils(l.unitPriceAed),
        discountPercent: num(l.discountPercent),
        taxCategory: l.taxCategory,
        vatRate: rateForCategory(l.taxCategory),
      })),
    ).totals;
  }, [lines]);

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const onPickItem = (i: number, itemId: number | null) => {
    if (itemId === null) {
      setLine(i, { itemId: null });
      return;
    }
    const it = items.find((x) => x.id === itemId);
    if (!it) return;
    setLine(i, {
      itemId,
      description: it.description || it.name,
      unitPriceAed: String((it.unitPriceFils ?? 0) / 100),
      taxCategory: (taxCategoryValues as readonly string[]).includes(it.taxCategory)
        ? (it.taxCategory as TaxCategory)
        : "standard",
    });
  };

  const lineTotalFils = (l: Line) => {
    const gross = toFils(l.unitPriceAed) * num(l.quantity);
    const net = gross * (1 - num(l.discountPercent) / 100);
    return Math.round(net * (1 + rateForCategory(l.taxCategory) / 100));
  };

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />

      {state.message && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {state.message}
        </div>
      )}

      {/* Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 rounded-xl border border-line bg-surface p-5">
        <div className="col-span-2">
          <label className="mb-1.5 block text-sm font-medium">{partyLabel} *</label>
          <select
            name="customerId"
            defaultValue={defaults?.customerId ?? ""}
            className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm"
          >
            <option value="" disabled>
              Select a {partyLabel.toLowerCase()}…
            </option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Issue date *</label>
          <input
            type="date"
            name="issueDate"
            defaultValue={defaults?.issueDate ?? today()}
            className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">{dueDateLabel}</label>
          <input
            type="date"
            name="dueDate"
            defaultValue={defaults?.dueDate ?? ""}
            className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm"
          />
        </div>
        <div className="col-span-4">
          <label className="mb-1.5 block text-sm font-medium">Reference</label>
          <input
            name="reference"
            defaultValue={defaults?.reference ?? ""}
            placeholder="Customer PO / LPO number"
            className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm"
          />
        </div>
      </div>

      {/* Lines */}
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-bg text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2.5 font-medium">Item</th>
              <th className="px-3 py-2.5 font-medium">Description</th>
              <th className="w-20 px-3 py-2.5 text-right font-medium">Qty</th>
              <th className="w-28 px-3 py-2.5 text-right font-medium">Unit (AED)</th>
              <th className="w-20 px-3 py-2.5 text-right font-medium">Disc %</th>
              <th className="w-28 px-3 py-2.5 font-medium">VAT</th>
              <th className="w-28 px-3 py-2.5 text-right font-medium">Total</th>
              <th className="w-8 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-line last:border-0">
                <td className="px-3 py-2">
                  <select
                    value={l.itemId ?? ""}
                    onChange={(e) => onPickItem(i, e.target.value ? Number(e.target.value) : null)}
                    className="field h-9 w-36 rounded-md border border-line-2 bg-surface px-2 text-sm"
                  >
                    <option value="">Free text</option>
                    {items.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.code}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    value={l.description}
                    onChange={(e) => setLine(i, { description: e.target.value })}
                    placeholder="Description"
                    className="field h-9 w-full min-w-40 rounded-md border border-line-2 bg-surface px-2 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={l.quantity}
                    onChange={(e) => setLine(i, { quantity: e.target.value })}
                    inputMode="decimal"
                    className="field tnum h-9 w-full rounded-md border border-line-2 bg-surface px-2 text-right text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={l.unitPriceAed}
                    onChange={(e) => setLine(i, { unitPriceAed: e.target.value })}
                    inputMode="decimal"
                    className="field tnum h-9 w-full rounded-md border border-line-2 bg-surface px-2 text-right text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={l.discountPercent}
                    onChange={(e) => setLine(i, { discountPercent: e.target.value })}
                    inputMode="decimal"
                    className="field tnum h-9 w-full rounded-md border border-line-2 bg-surface px-2 text-right text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={l.taxCategory}
                    onChange={(e) => setLine(i, { taxCategory: e.target.value as TaxCategory })}
                    className="field h-9 w-full rounded-md border border-line-2 bg-surface px-2 text-sm"
                  >
                    {taxCategoryValues.map((t) => (
                      <option key={t} value={t}>
                        {TAX_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-right tnum text-muted">
                  {formatFils(lineTotalFils(l), { withSymbol: false })}
                </td>
                <td className="px-2 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => setLines((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p))}
                    className="text-muted hover:text-danger"
                    aria-label="Remove line"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-line px-3 py-2">
          <button
            type="button"
            onClick={() => setLines((p) => [...p, emptyLine()])}
            className="text-sm font-medium text-teal-ink hover:underline"
          >
            + Add line
          </button>
        </div>
      </div>

      {/* Totals + meta */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Notes</label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={defaults?.notes ?? ""}
              className="field w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm"
            />
          </div>
          {showPaymentTerms && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">Payment Terms</label>
              <textarea
                name="paymentTerms"
                rows={2}
                defaultValue={defaults?.paymentTerms ?? "50% advance, balance on delivery."}
                className="field w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm"
              />
            </div>
          )}
          {showBankDetails && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">Bank Details</label>
              <textarea
                name="bankDetails"
                rows={3}
                defaultValue={defaults?.bankDetails ?? ""}
                placeholder="Bank name, Account name, Account no., IBAN, SWIFT"
                className="field w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm"
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Terms &amp; Conditions</label>
            <textarea
              name="terms"
              rows={2}
              defaultValue={defaults?.terms ?? defaultTerms}
              className="field w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="tnum">{formatFils(totals.subtotalFils)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Discount</dt>
              <dd className="tnum">− {formatFils(totals.discountTotalFils, { withSymbol: false })}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">VAT</dt>
              <dd className="tnum">{formatFils(totals.vatTotalFils)}</dd>
            </div>
            <div className="mt-2 flex justify-between border-t border-line pt-2 text-base font-semibold text-ink">
              <dt>Total</dt>
              <dd className="tnum">{formatFils(totals.grandTotalFils)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-line pt-5">
        <SubmitButton label={submitLabel} />
        <Link
          href={cancelHref}
          className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg transition-colors hover:bg-bg"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
