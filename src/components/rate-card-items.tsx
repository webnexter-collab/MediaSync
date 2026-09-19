"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui";
import { formatFils } from "@/lib/money";
import { mediaTypeValues, type FormState } from "@/lib/validators";
import { addRateCardItem, deleteRateCardItem } from "@/actions/rate-cards";

const MEDIA_LABEL: Record<string, string> = { print: "Print", digital: "Digital", radio: "Radio", tv: "TV", website: "Website" };

type Item = {
  id: number; mediaType: string; platform: string | null; particulars: string | null;
  uom: string | null; unitGrossFils: number; defaultDiscountPct: string;
};

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-medium text-white transition-colors hover:bg-ink-2 disabled:opacity-60">
      {pending ? "Adding…" : "Add item"}
    </button>
  );
}

const inp = "field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm";

export function RateCardItems({
  rateCardId, currency, items, channels, uoms = [],
}: {
  rateCardId: number;
  currency: string;
  items: Item[];
  channels: { id: number; name: string; mediaType: string }[];
  uoms?: string[];
}) {
  const add = addRateCardItem.bind(null, rateCardId);
  const [state, formAction] = useActionState<FormState, FormData>(add, { ok: false });
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) formRef.current?.reset(); }, [state]);

  return (
    <div className="mt-6">
      <h2 className="font-display text-lg font-semibold text-ink">Rate card items</h2>
      <p className="mt-1 mb-4 text-sm text-muted">Priced offerings that pre-fill Booking Order lines. Prices in {currency}.</p>

      {items.length > 0 && (
        <div className="mb-5 overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2.5 font-medium">Media</th>
                <th className="px-4 py-2.5 font-medium">Platform</th>
                <th className="px-4 py-2.5 font-medium">Particulars</th>
                <th className="px-4 py-2.5 font-medium">UOM</th>
                <th className="px-4 py-2.5 text-right font-medium">Unit Gross</th>
                <th className="px-4 py-2.5 text-right font-medium">Disc%</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5"><Badge tone="neutral">{MEDIA_LABEL[it.mediaType] ?? it.mediaType}</Badge></td>
                  <td className="px-4 py-2.5 text-ink">{it.platform ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted">{it.particulars ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted">{it.uom ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right tnum">{currency} {formatFils(it.unitGrossFils, { withSymbol: false })}</td>
                  <td className="px-4 py-2.5 text-right tnum">{Number(it.defaultDiscountPct) || "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <form action={deleteRateCardItem.bind(null, it.id, rateCardId)}>
                      <button title="Delete" className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger"><Trash2 size={15} /></button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form ref={formRef} action={formAction} className="rounded-lg border border-line bg-bg/40 p-4">
        {state.message && <p className="mb-3 text-sm text-danger">{state.message}</p>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <select name="mediaType" defaultValue="digital" className={inp}>
            {mediaTypeValues.map((m) => <option key={m} value={m}>{MEDIA_LABEL[m]}</option>)}
          </select>
          <select name="channelId" defaultValue="" className={inp}>
            <option value="">Channel (optional)…</option>
            {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input name="platform" placeholder="Platform (e.g. The National)" className={inp} />
          <input name="particulars" placeholder="Particulars (e.g. Full Page)" className={inp} />
          <input name="uom" list="rc-uom-list" placeholder="UOM (e.g. Insertion)" className={inp} />
          <datalist id="rc-uom-list">{uoms.map((u) => <option key={u} value={u} />)}</datalist>
          <input name="unitGross" inputMode="decimal" placeholder={`Unit gross (${currency})`} className={inp + " tnum"} />
          <input name="defaultDiscountPct" inputMode="decimal" placeholder="Default disc %" className={inp + " tnum"} />
          <input name="brandingDetails" placeholder="Branding details (optional)" className={inp + " lg:col-span-2"} />
        </div>
        <div className="mt-3 flex justify-end"><AddButton /></div>
      </form>
    </div>
  );
}
