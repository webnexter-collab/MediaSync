"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import type { FormState } from "@/lib/validators";
import { mediaTypeValues } from "@/lib/validators";
import { toFils, formatFils } from "@/lib/money";
import { computeBoTotals } from "@/lib/booking-order";

export type VendorOpt = { id: number; code: string; name: string };
export type AccountOpt = { id: number; code: string; name: string; accountType: string };
export type CurrencyOpt = { code: string; name: string };
export type ChannelOpt = { id: number; name: string; mediaType: string };

type Line = {
  mediaType: string;
  channelId: number | null;
  platform: string;
  particulars: string;
  brandingDetails: string;
  period: string;
  quantity: string;
  uom: string;
  unitGross: string;
  discountPct: string;
  days: number[];
};

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export type BoDefaults = {
  toName?: string;
  publisherVendorId?: number | null;
  accountId?: number | null;
  advertiser?: string;
  agency?: string;
  client?: string;
  brand?: string;
  campaign?: string;
  medium?: string;
  currency?: string;
  issueDate?: string;
  paymentTerms?: string;
  agencyDiscountPct?: string;
  vatRatePct?: string;
  notes?: string;
  lines?: Line[];
};

const MEDIA_LABEL: Record<string, string> = {
  print: "Print", digital: "Digital", radio: "Radio", tv: "TV", website: "Website",
};

const emptyLine = (): Line => ({
  mediaType: "digital", channelId: null, platform: "", particulars: "",
  brandingDetails: "", period: "", quantity: "1", uom: "", unitGross: "0", discountPct: "0",
  days: [],
});

const today = () => new Date().toISOString().slice(0, 10);
const num = (s: string) => { const n = parseFloat(s); return Number.isFinite(n) ? n : 0; };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="inline-flex h-10 items-center rounded-lg bg-ink px-5 text-sm font-medium text-white transition-colors hover:bg-ink-2 disabled:opacity-60">
      {pending ? "Saving…" : label}
    </button>
  );
}

const inp = "field h-9 w-full rounded-md border border-line-2 bg-surface px-2 text-sm";
const inpR = inp + " tnum text-right";

export function BookingOrderForm({
  action, vendors, accounts, currencies, channels, defaults, submitLabel, cancelHref = "/booking-orders",
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  vendors: VendorOpt[];
  accounts: AccountOpt[];
  currencies: CurrencyOpt[];
  channels: ChannelOpt[];
  defaults?: BoDefaults;
  submitLabel: string;
  cancelHref?: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, { ok: false });
  const [lines, setLines] = useState<Line[]>(defaults?.lines?.length ? defaults.lines : [emptyLine()]);
  const [currency, setCurrency] = useState(defaults?.currency ?? "AED");
  const [toName, setToName] = useState(defaults?.toName ?? "");
  const [pubVendorId, setPubVendorId] = useState<string>(defaults?.publisherVendorId != null ? String(defaults.publisherVendorId) : "");
  const [accountId, setAccountId] = useState<string>(defaults?.accountId != null ? String(defaults.accountId) : "");
  const [agency, setAgency] = useState(defaults?.agency ?? "");
  const [client, setClient] = useState(defaults?.client ?? "");
  const [agencyDisc, setAgencyDisc] = useState(defaults?.agencyDiscountPct ?? "0");
  const [vatRate, setVatRate] = useState(defaults?.vatRatePct ?? "5");

  const totals = useMemo(() => computeBoTotals(
    lines.map((l) => ({ quantity: num(l.quantity), unitGrossFils: toFils(l.unitGross), discountPct: num(l.discountPct) })),
    num(agencyDisc), num(vatRate),
  ).totals, [lines, agencyDisc, vatRate]);

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const toggleDay = (i: number, d: number) =>
    setLines((prev) =>
      prev.map((l, idx) =>
        idx === i
          ? { ...l, days: l.days.includes(d) ? l.days.filter((x) => x !== d) : [...l.days, d] }
          : l,
      ),
    );

  const onPickChannel = (i: number, id: number | null) => {
    if (id === null) { setLine(i, { channelId: null }); return; }
    const ch = channels.find((c) => c.id === id);
    if (!ch) return;
    setLine(i, { channelId: id, platform: ch.name, mediaType: ch.mediaType });
  };

  const onPickAccount = (val: string) => {
    setAccountId(val);
    const a = accounts.find((x) => String(x.id) === val);
    if (!a) return;
    if (a.accountType === "agency" || a.accountType === "buying_house") setAgency(a.name);
    else setClient(a.name);
  };

  const onPickVendor = (val: string) => {
    setPubVendorId(val);
    const v = vendors.find((x) => String(x.id) === val);
    if (v) setToName(v.name);
  };

  const cur = (fils: number) => formatFils(fils, { currency, withSymbol: false });
  const lineNet = (l: Line) => Math.round(num(l.quantity) * toFils(l.unitGross) * (1 - num(l.discountPct) / 100));

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <input type="hidden" name="publisherVendorId" value={pubVendorId} />
      <input type="hidden" name="accountId" value={accountId} />

      {state.message && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{state.message}</div>
      )}

      {/* Header */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <label className="mb-1.5 block text-sm font-medium">To — Publisher</label>
          <div className="flex gap-2">
            <select value={pubVendorId} onChange={(e) => onPickVendor(e.target.value)} className="field h-10 w-40 rounded-lg border border-line-2 bg-surface px-2 text-sm">
              <option value="">Free text…</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.code} — {v.name}</option>)}
            </select>
            <input name="toName" value={toName} onChange={(e) => setToName(e.target.value)} placeholder="Publisher name" className="field h-10 flex-1 rounded-lg border border-line-2 bg-surface px-3 text-sm" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Account (CRM)</label>
          <select value={accountId} onChange={(e) => onPickAccount(e.target.value)} className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-2 text-sm">
            <option value="">— None —</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Issue date *</label>
          <input type="date" name="issueDate" defaultValue={defaults?.issueDate ?? today()} className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm" />
        </div>

        <div><label className="mb-1.5 block text-sm font-medium">Advertiser</label><input name="advertiser" defaultValue={defaults?.advertiser ?? ""} className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm" /></div>
        <div><label className="mb-1.5 block text-sm font-medium">Agency</label><input name="agency" value={agency} onChange={(e) => setAgency(e.target.value)} className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm" /></div>
        <div><label className="mb-1.5 block text-sm font-medium">Client</label><input name="client" value={client} onChange={(e) => setClient(e.target.value)} className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm" /></div>
        <div><label className="mb-1.5 block text-sm font-medium">Brand</label><input name="brand" defaultValue={defaults?.brand ?? ""} className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm" /></div>

        <div><label className="mb-1.5 block text-sm font-medium">Campaign</label><input name="campaign" defaultValue={defaults?.campaign ?? ""} className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm" /></div>
        <div><label className="mb-1.5 block text-sm font-medium">Medium</label><input name="medium" defaultValue={defaults?.medium ?? ""} placeholder="Digital / Print / Radio" className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm" /></div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Currency</label>
          <select name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-2 text-sm">
            {currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
          </select>
        </div>
        <div><label className="mb-1.5 block text-sm font-medium">Payment Terms</label><input name="paymentTerms" defaultValue={defaults?.paymentTerms ?? "100% Advance"} className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm" /></div>
      </div>

      {/* Lines */}
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-sm" style={{ minWidth: 980 }}>
          <thead>
            <tr className="border-b border-line bg-bg text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2.5 font-medium">Media</th>
              <th className="px-3 py-2.5 font-medium">Platform</th>
              <th className="px-3 py-2.5 font-medium">Particulars</th>
              <th className="px-3 py-2.5 font-medium">Branding / Period</th>
              <th className="w-16 px-3 py-2.5 text-right font-medium">Qty</th>
              <th className="w-20 px-3 py-2.5 font-medium">UOM</th>
              <th className="w-28 px-3 py-2.5 text-right font-medium">Unit Gross</th>
              <th className="w-16 px-3 py-2.5 text-right font-medium">Disc %</th>
              <th className="w-28 px-3 py-2.5 text-right font-medium">Total Net</th>
              <th className="w-8 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-line align-top last:border-0">
                <td className="px-3 py-2">
                  <select value={l.mediaType} onChange={(e) => setLine(i, { mediaType: e.target.value })} className={inp + " w-24"}>
                    {mediaTypeValues.map((m) => <option key={m} value={m}>{MEDIA_LABEL[m]}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2" style={{ minWidth: 150 }}>
                  {channels.length > 0 && (
                    <select value={l.channelId ?? ""} onChange={(e) => onPickChannel(i, e.target.value ? Number(e.target.value) : null)} className={inp + " mb-1"}>
                      <option value="">Free text…</option>
                      {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                  <input value={l.platform} onChange={(e) => setLine(i, { platform: e.target.value })} placeholder="Publisher / platform" className={inp} />
                </td>
                <td className="px-3 py-2" style={{ minWidth: 160 }}>
                  <input value={l.particulars} onChange={(e) => setLine(i, { particulars: e.target.value })} placeholder="e.g. Advertorial" className={inp} />
                </td>
                <td className="px-3 py-2" style={{ minWidth: 190 }}>
                  <input value={l.brandingDetails} onChange={(e) => setLine(i, { brandingDetails: e.target.value })} placeholder="Branding details" className={inp + " mb-1"} />
                  <input value={l.period} onChange={(e) => setLine(i, { period: e.target.value })} placeholder="Period / duration" className={inp} />
                </td>
                <td className="px-3 py-2"><input value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} inputMode="decimal" className={inpR} /></td>
                <td className="px-3 py-2"><input value={l.uom} onChange={(e) => setLine(i, { uom: e.target.value })} placeholder="Article" className={inp} /></td>
                <td className="px-3 py-2"><input value={l.unitGross} onChange={(e) => setLine(i, { unitGross: e.target.value })} inputMode="decimal" className={inpR} /></td>
                <td className="px-3 py-2"><input value={l.discountPct} onChange={(e) => setLine(i, { discountPct: e.target.value })} inputMode="decimal" className={inpR} /></td>
                <td className="px-3 py-2 text-right tnum text-muted">{cur(lineNet(l))}</td>
                <td className="px-2 py-2 text-center">
                  <button type="button" onClick={() => setLines((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p))} className="text-muted hover:text-danger" aria-label="Remove line">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-line px-3 py-2">
          <button type="button" onClick={() => setLines((p) => [...p, emptyLine()])} className="text-sm font-medium text-teal-ink hover:underline">+ Add line</button>
        </div>
      </div>

      {/* Annexure — day 1–31 schedule per line */}
      <div className="rounded-xl border border-line bg-surface p-5">
        <div className="mb-1 flex items-baseline justify-between">
          <h3 className="font-display text-base font-semibold text-ink">Schedule (Annexure)</h3>
          <span className="text-xs text-muted">Click days each line runs</span>
        </div>
        <div className="space-y-4 overflow-x-auto">
          {lines.map((l, i) => (
            <div key={i} className="min-w-[640px] border-t border-line pt-3 first:border-0 first:pt-0">
              <div className="mb-1.5 flex items-center justify-between">
                <div className="truncate text-sm font-medium text-ink">
                  Line {i + 1}{l.platform ? ` · ${l.platform}` : ""}{l.particulars ? ` — ${l.particulars}` : ""}
                </div>
                <div className="shrink-0 text-xs text-muted">{l.days.length} day{l.days.length === 1 ? "" : "s"}</div>
              </div>
              <div className="flex flex-wrap gap-1">
                {DAYS.map((d) => {
                  const on = l.days.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(i, d)}
                      className={`tnum h-7 w-7 rounded-md border text-xs transition-colors ${on ? "border-ink bg-ink text-white" : "border-line-2 bg-surface text-muted hover:bg-bg"}`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes + totals */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Notes</label>
          <textarea name="notes" rows={4} defaultValue={defaults?.notes ?? ""} className="field w-full rounded-lg border border-line-2 bg-surface px-3 py-2 text-sm" />
          <p className="mt-2 text-xs text-muted">The standard Terms &amp; Conditions are attached automatically to the printed Booking Order.</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Total Gross</dt><dd className="tnum">{cur(totals.totalGrossFils)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd className="tnum">− {cur(totals.lineDiscountFils)}</dd></div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">Agency discount
                <input value={agencyDisc} onChange={(e) => setAgencyDisc(e.target.value)} name="agencyDiscountPct" inputMode="decimal" className="field tnum ml-2 inline-block h-7 w-14 rounded border border-line-2 bg-surface px-1.5 text-right text-xs" />%
              </dt>
              <dd className="tnum">− {cur(totals.agencyDiscountFils)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2"><dt className="text-muted">Total Net</dt><dd className="tnum">{cur(totals.totalNetFils)}</dd></div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">VAT
                <input value={vatRate} onChange={(e) => setVatRate(e.target.value)} name="vatRatePct" inputMode="decimal" className="field tnum ml-2 inline-block h-7 w-14 rounded border border-line-2 bg-surface px-1.5 text-right text-xs" />%
              </dt>
              <dd className="tnum">{cur(totals.vatFils)}</dd>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-lg bg-ink px-4 py-3 text-white">
              <dt className="text-xs uppercase tracking-wide text-white/70">Net Amount (incl. VAT)</dt>
              <dd className="font-display text-lg font-semibold tnum">{currency} {cur(totals.grandTotalFils)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-line pt-5">
        <SubmitButton label={submitLabel} />
        <Link href={cancelHref} className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg transition-colors hover:bg-bg">Cancel</Link>
      </div>
    </form>
  );
}
