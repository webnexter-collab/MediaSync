"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import type { FormState } from "@/lib/validators";
import type { CustomerOpt, ItemOpt } from "@/components/invoice-form";

type Line = { itemId: number | null; description: string; quantity: string };

export type DeliveryDefaults = {
  customerId?: number;
  issueDate?: string;
  reference?: string;
  notes?: string;
  lines?: Line[];
};

const emptyLine = (): Line => ({ itemId: null, description: "", quantity: "1" });
const today = () => new Date().toISOString().slice(0, 10);

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

export function DeliveryNoteForm({
  action,
  customers,
  items,
  defaults,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  customers: CustomerOpt[];
  items: ItemOpt[];
  defaults?: DeliveryDefaults;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, { ok: false });
  const [lines, setLines] = useState<Line[]>(defaults?.lines?.length ? defaults.lines : [emptyLine()]);

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const onPickItem = (i: number, itemId: number | null) => {
    if (itemId === null) return setLine(i, { itemId: null });
    const it = items.find((x) => x.id === itemId);
    if (!it) return;
    setLine(i, { itemId, description: it.description || it.name });
  };

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />

      {state.message && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {state.message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 rounded-xl border border-line bg-surface p-5">
        <div className="col-span-2">
          <label className="mb-1.5 block text-sm font-medium">Customer *</label>
          <select
            name="customerId"
            defaultValue={defaults?.customerId ?? ""}
            className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm"
          >
            <option value="" disabled>
              Select a customer…
            </option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Delivery date *</label>
          <input
            type="date"
            name="issueDate"
            defaultValue={defaults?.issueDate ?? today()}
            className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Reference</label>
          <input
            name="reference"
            defaultValue={defaults?.reference ?? ""}
            placeholder="Invoice / order no."
            className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-bg text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2.5 font-medium">Item</th>
              <th className="px-3 py-2.5 font-medium">Description</th>
              <th className="w-28 px-3 py-2.5 text-right font-medium">Qty</th>
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
                    placeholder="Description of goods"
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

      <div>
        <label className="mb-1.5 block text-sm font-medium">Notes</label>
        <textarea
          name="notes"
          rows={2}
          defaultValue={defaults?.notes ?? ""}
          placeholder="Delivery instructions, condition on receipt, etc."
          className="field w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm"
        />
      </div>

      <div className="flex items-center gap-3 border-t border-line pt-5">
        <SubmitButton label={submitLabel} />
        <Link
          href="/delivery-notes"
          className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg transition-colors hover:bg-bg"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
