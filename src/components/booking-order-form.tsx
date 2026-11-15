"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import type { FormState } from "@/lib/validators";
import { toFils, formatFils } from "@/lib/money";
import { computeBoTotals } from "@/lib/booking-order";
import {
  type LineSchedule, type ScheduleGran, GRAN_LABEL, emptySchedule, defaultGran,
  scheduleColumns, scheduleTotal, specLabels,
} from "@/lib/schedule";

export type AccountOpt = { id: number; code: string; name: string; accountType: string; currency?: string };
export type CurrencyOpt = { code: string; name: string };
export type AssetOpt = { id: number; name: string; mediaType: string; allowedMedia: string[]; businessUnitId: number | null; vendorId: number | null };
export type UomOpt = { name: string; mediaTypes: string[] };
export type RateItemOpt = {
  id: number; label: string; mediaType: string; channelId: number | null;
  platform: string; particulars: string; brandingDetails: string; uom: string;
  unitGross: string; discountPct: string;
};
export type BusinessUnitOpt = { id: number; name: string; code: string; defaultCurrency: string };
export type SalespersonOpt = { id: number; name: string; businessUnitId: number | null };
export type IndustryOpt = { id: number; name: string };
export type CategoryOpt = { id: number; name: string; industryId: number };

export type BoLine = {
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
  unitCost: string;
  schedule: LineSchedule;
};

export type BoDefaults = {
  assetId?: number | null;
  toName?: string;
  agency?: string;
  client?: string;
  agencyAccountId?: number | null;
  clientAccountId?: number | null;
  businessUnitId?: number | null;
  salespersonId?: number | null;
  industryId?: number | null;
  categoryId?: number | null;
  campaign?: string;
  medium?: string;
  currency?: string;
  issueDate?: string;
  receiptDate?: string;
  revenueMonth?: string; // YYYY-MM
  startDate?: string;
  endDate?: string;
  region?: string;
  salesOffice?: string;
  clientBoRef?: string;
  paymentTerms?: string;
  agencyDiscountPct?: string;
  vatRatePct?: string;
  notes?: string;
  lines?: BoLine[];
};

const MEDIA_LABEL: Record<string, string> = {
  print: "Print", digital: "Digital", radio: "Radio", tv: "TV", website: "Website", outdoor: "Outdoor",
};
const ALL_MEDIA = Object.keys(MEDIA_LABEL);
const mediaKey = (label: string | undefined) =>
  ALL_MEDIA.find((k) => MEDIA_LABEL[k].toLowerCase() === (label ?? "").trim().toLowerCase()) ?? "";

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
const hdr = "field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm";
const lbl = "mb-1.5 block text-sm font-medium";

export function BookingOrderForm({
  action, accounts, currencies, assets, rateItems = [], uomOptions = [],
  businessUnits = [], salespeople = [], industries = [], categories = [],
  defaults, submitLabel, cancelHref = "/booking-orders",
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  accounts: AccountOpt[];
  currencies: CurrencyOpt[];
  assets: AssetOpt[];
  rateItems?: RateItemOpt[];
  uomOptions?: UomOpt[];
  businessUnits?: BusinessUnitOpt[];
  salespeople?: SalespersonOpt[];
  industries?: IndustryOpt[];
  categories?: CategoryOpt[];
  defaults?: BoDefaults;
  submitLabel: string;
  cancelHref?: string;
}) {
  const agencyAccounts = accounts.filter((a) => a.accountType === "agency" || a.accountType === "buying_house");
  const clientAccounts = accounts.filter((a) => a.accountType === "direct_client");
  const [state, formAction] = useActionState<FormState, FormData>(action, { ok: false });

  const [businessUnitId, setBusinessUnitId] = useState<string>(
    defaults?.businessUnitId != null ? String(defaults.businessUnitId) : (businessUnits[0] ? String(businessUnits[0].id) : ""),
  );
  const [assetId, setAssetId] = useState<string>(defaults?.assetId != null ? String(defaults.assetId) : "");
  const asset = assets.find((a) => String(a.id) === assetId) ?? null;
  const [media, setMedia] = useState<string>(mediaKey(defaults?.medium) || asset?.mediaType || "");
  const [currency, setCurrency] = useState(defaults?.currency ?? "AED");
  const [agencyId, setAgencyId] = useState<string>(defaults?.agencyAccountId != null ? String(defaults.agencyAccountId) : "");
  const [clientId, setClientId] = useState<string>(defaults?.clientAccountId != null ? String(defaults.clientAccountId) : "");
  const [agency, setAgency] = useState(defaults?.agency ?? "");
  const [client, setClient] = useState(defaults?.client ?? "");
  const [salespersonId, setSalespersonId] = useState<string>(defaults?.salespersonId != null ? String(defaults.salespersonId) : "");
  const [industryId, setIndustryId] = useState<string>(defaults?.industryId != null ? String(defaults.industryId) : "");
  const [categoryId, setCategoryId] = useState<string>(defaults?.categoryId != null ? String(defaults.categoryId) : "");
  const [agencyDisc, setAgencyDisc] = useState(defaults?.agencyDiscountPct ?? "0");
  const [vatRate, setVatRate] = useState(defaults?.vatRatePct ?? "5");

  const newLine = (mediaType: string, a: AssetOpt | null): BoLine => ({
    mediaType: mediaType || "digital", channelId: a?.id ?? null, platform: a?.name ?? "", particulars: "",
    brandingDetails: "", period: "", quantity: "1", uom: "", unitGross: "0", discountPct: "0", unitCost: "0",
    schedule: emptySchedule(mediaType || "digital"),
  });
  const [lines, setLines] = useState<BoLine[]>(defaults?.lines?.length ? defaults.lines : [newLine(media, asset)]);

  // Relations: Business Unit → Asset → Media → UOM.
  const buAssets = assets.filter((a) => !businessUnitId || a.businessUnitId == null || String(a.businessUnitId) === businessUnitId);
  const allowedMedia = asset ? asset.allowedMedia : ALL_MEDIA;
  const uomsFor = (mediaType: string) =>
    uomOptions.filter((u) => u.mediaTypes.length === 0 || u.mediaTypes.includes(mediaType)).map((u) => u.name);
  const industryCategories = categories.filter((c) => String(c.industryId) === industryId);

  const totals = useMemo(() => computeBoTotals(
    lines.map((l) => ({ quantity: num(l.quantity), unitGrossFils: toFils(l.unitGross), discountPct: num(l.discountPct), unitCostFils: toFils(l.unitCost) })),
    num(agencyDisc), num(vatRate),
  ).totals, [lines, agencyDisc, vatRate]);

  const setLine = (i: number, patch: Partial<BoLine>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const setSchedule = (i: number, patch: Partial<LineSchedule>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, schedule: { ...l.schedule, ...patch } } : l)));
  const setCell = (i: number, key: string, value: string) =>
    setLines((prev) => prev.map((l, idx) => {
      if (idx !== i) return l;
      const cells = { ...(l.schedule.cells ?? {}) };
      const n = Math.max(0, Math.floor(num(value)));
      if (n > 0) cells[key] = n; else delete cells[key];
      return { ...l, schedule: { ...l.schedule, cells } };
    }));

  /** Changing a line's media re-filters its UOM and resets the schedule layout. */
  const setLineMedia = (i: number, mediaType: string) =>
    setLines((prev) => prev.map((l, idx) => {
      if (idx !== i) return l;
      const stillValid = uomsFor(mediaType).includes(l.uom);
      return { ...l, mediaType, uom: stillValid ? l.uom : "", schedule: { ...l.schedule, gran: defaultGran(mediaType) } };
    }));

  const onPickBusinessUnit = (val: string) => {
    setBusinessUnitId(val);
    const bu = businessUnits.find((b) => String(b.id) === val);
    if (bu && !clientId && !agencyId) setCurrency(bu.defaultCurrency);
    if (asset && asset.businessUnitId != null && String(asset.businessUnitId) !== val) onPickAsset("");
  };

  const onPickAsset = (val: string) => {
    const prev = asset;
    setAssetId(val);
    const a = assets.find((x) => String(x.id) === val) ?? null;
    const nextMedia = a ? (a.allowedMedia.includes(media) ? media : a.mediaType) : media;
    setMedia(nextMedia);
    // Carry the asset onto lines that still point at the previous asset (or nothing).
    setLines((ls) => ls.map((l) => {
      const follows = l.channelId == null || l.channelId === prev?.id;
      if (!follows) return l;
      // Lines on the header media (or with none chosen yet) follow the asset's media.
      const mediaType = a && (!media || l.mediaType === media || !a.allowedMedia.includes(l.mediaType)) ? nextMedia : l.mediaType;
      const mediaChanged = mediaType !== l.mediaType;
      return {
        ...l, channelId: a?.id ?? null,
        platform: !l.platform || l.platform === prev?.name ? (a?.name ?? "") : l.platform,
        mediaType,
        uom: mediaChanged && !uomsFor(mediaType).includes(l.uom) ? "" : l.uom,
        schedule: mediaChanged ? { ...l.schedule, gran: defaultGran(mediaType) } : l.schedule,
      };
    }));
  };

  const onPickMedia = (val: string) => {
    const prev = media;
    setMedia(val);
    // Lines that were on the header media follow it.
    setLines((ls) => ls.map((l) => (l.mediaType === prev || !l.mediaType
      ? { ...l, mediaType: val, uom: uomsFor(val).includes(l.uom) ? l.uom : "", schedule: { ...l.schedule, gran: defaultGran(val) } }
      : l)));
  };

  const onPickRate = (i: number, id: number | null) => {
    if (id === null) return;
    const r = rateItems.find((x) => x.id === id);
    if (!r) return;
    setLine(i, {
      mediaType: r.mediaType, channelId: r.channelId, platform: r.platform,
      particulars: r.particulars, brandingDetails: r.brandingDetails, uom: r.uom,
      unitGross: r.unitGross, discountPct: r.discountPct,
    });
  };

  const onPickAgency = (val: string) => {
    setAgencyId(val);
    const a = accounts.find((x) => String(x.id) === val);
    setAgency(a?.name ?? "");
    if (a && !clientId && a.currency) setCurrency(a.currency); // client currency wins when set
  };
  const onPickClient = (val: string) => {
    setClientId(val);
    const a = accounts.find((x) => String(x.id) === val);
    setClient(a?.name ?? "");
    if (a?.currency) setCurrency(a.currency);
  };

  const cur = (fils: number) => formatFils(fils, { currency, withSymbol: false });
  const lineNet = (l: BoLine) => Math.round(num(l.quantity) * toFils(l.unitGross) * (1 - num(l.discountPct) / 100));
  const lineMargin = (l: BoLine) => lineNet(l) - Math.round(num(l.quantity) * toFils(l.unitCost));

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <input type="hidden" name="assetId" value={assetId} />
      <input type="hidden" name="toName" value={asset?.name ?? defaults?.toName ?? ""} />
      <input type="hidden" name="publisherVendorId" value={asset?.vendorId ?? ""} />
      <input type="hidden" name="medium" value={media ? MEDIA_LABEL[media] : ""} />
      <input type="hidden" name="agencyAccountId" value={agencyId} />
      <input type="hidden" name="clientAccountId" value={clientId} />
      <input type="hidden" name="agency" value={agency} />
      <input type="hidden" name="client" value={client} />
      <input type="hidden" name="businessUnitId" value={businessUnitId} />
      <input type="hidden" name="salespersonId" value={salespersonId} />
      <input type="hidden" name="industryId" value={industryId} />
      <input type="hidden" name="categoryId" value={categoryId} />

      {state.message && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{state.message}</div>
      )}

      {/* Header */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={lbl}>Business Unit *</label>
          <select value={businessUnitId} onChange={(e) => onPickBusinessUnit(e.target.value)} className={hdr}>
            {businessUnits.length === 0 && <option value="">— None —</option>}
            {businessUnits.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Asset *</label>
          <select value={assetId} onChange={(e) => onPickAsset(e.target.value)} className={hdr}>
            <option value="">{buAssets.length ? "— Select asset —" : "No assets for this unit"}</option>
            {buAssets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Media</label>
          <select value={media} onChange={(e) => onPickMedia(e.target.value)} className={hdr}>
            <option value="">— Select —</option>
            {allowedMedia.map((m) => <option key={m} value={m}>{MEDIA_LABEL[m] ?? m}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Currency</label>
          <select name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className={hdr}>
            {currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
          </select>
        </div>

        <div>
          <label className={lbl}>Agency</label>
          <select value={agencyId} onChange={(e) => onPickAgency(e.target.value)} className={hdr}>
            <option value="">— None —</option>
            {agencyAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Client</label>
          <select value={clientId} onChange={(e) => onPickClient(e.target.value)} className={hdr}>
            <option value="">— None —</option>
            {clientAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Salesperson</label>
          <select value={salespersonId} onChange={(e) => setSalespersonId(e.target.value)} className={hdr}>
            <option value="">— None —</option>
            {salespeople
              .filter((s) => !businessUnitId || s.businessUnitId == null || String(s.businessUnitId) === businessUnitId)
              .map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div><label className={lbl}>Campaign</label><input name="campaign" defaultValue={defaults?.campaign ?? ""} className={hdr} /></div>

        <div>
          <label className={lbl}>Industry</label>
          <select value={industryId} onChange={(e) => { setIndustryId(e.target.value); setCategoryId(""); }} className={hdr}>
            <option value="">— None —</option>
            {industries.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Category</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={!industryId} className={hdr + " disabled:opacity-60"}>
            <option value="">{industryId ? (industryCategories.length ? "— None —" : "No categories") : "Pick an industry first"}</option>
            {industryCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div><label className={lbl}>Region</label><input name="region" defaultValue={defaults?.region ?? ""} placeholder="e.g. Dubai" className={hdr} /></div>
        <div><label className={lbl}>Sales Office</label><input name="salesOffice" defaultValue={defaults?.salesOffice ?? ""} placeholder="e.g. Dubai" className={hdr} /></div>

        <div><label className={lbl}>Issue date *</label><input type="date" name="issueDate" defaultValue={defaults?.issueDate ?? today()} className={hdr} /></div>
        <div><label className={lbl}>Date BO received</label><input type="date" name="receiptDate" defaultValue={defaults?.receiptDate ?? ""} className={hdr} /></div>
        <div>
          <label className={lbl}>Revenue month</label>
          <input type="month" name="revenueMonth" defaultValue={defaults?.revenueMonth ?? today().slice(0, 7)} className={hdr} />
        </div>
        <div><label className={lbl}>Client BO #</label><input name="clientBoRef" defaultValue={defaults?.clientBoRef ?? ""} placeholder="Agency / client BO number" className={hdr} /></div>

        <div><label className={lbl}>BO start date</label><input type="date" name="startDate" defaultValue={defaults?.startDate ?? ""} className={hdr} /></div>
        <div><label className={lbl}>BO end date</label><input type="date" name="endDate" defaultValue={defaults?.endDate ?? ""} className={hdr} /></div>
        <div className="lg:col-span-2"><label className={lbl}>Payment Terms</label><input name="paymentTerms" defaultValue={defaults?.paymentTerms ?? "100% Advance"} className={hdr} /></div>
      </div>

      {/* Lines */}
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-sm" style={{ minWidth: 1220 }}>
          <thead>
            <tr className="border-b border-line bg-bg text-left text-xs uppercase tracking-wide text-muted">
              <th className="w-28 px-3 py-2.5 font-medium">Media</th>
              <th className="px-3 py-2.5 font-medium">Platform</th>
              <th className="px-3 py-2.5 font-medium">Particulars</th>
              <th className="px-3 py-2.5 font-medium">Branding / Period</th>
              <th className="w-20 px-3 py-2.5 text-right font-medium">Qty</th>
              <th className="w-36 px-3 py-2.5 font-medium">UOM</th>
              <th className="w-32 px-3 py-2.5 text-right font-medium">Unit Gross</th>
              <th className="w-20 px-3 py-2.5 text-right font-medium">Disc %</th>
              <th className="w-32 px-3 py-2.5 text-right font-medium">Unit Cost</th>
              <th className="w-32 px-3 py-2.5 text-right font-medium">Total Net</th>
              <th className="w-32 px-3 py-2.5 text-right font-medium">Margin</th>
              <th className="w-8 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const lineUoms = uomsFor(l.mediaType);
              return (
                <tr key={i} className="border-b border-line align-top last:border-0">
                  <td className="px-3 py-2">
                    <select value={l.mediaType} onChange={(e) => setLineMedia(i, e.target.value)} className={inp}>
                      {(allowedMedia.includes(l.mediaType) ? allowedMedia : [l.mediaType, ...allowedMedia]).map((m) => (
                        <option key={m} value={m}>{MEDIA_LABEL[m] ?? m}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2" style={{ minWidth: 170 }}>
                    {rateItems.length > 0 && (
                      <select value="" onChange={(e) => onPickRate(i, e.target.value ? Number(e.target.value) : null)} className={inp + " mb-1 text-teal-ink"}>
                        <option value="">⚡ From rate card…</option>
                        {rateItems.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                      </select>
                    )}
                    <input value={l.platform} onChange={(e) => setLine(i, { platform: e.target.value })} placeholder="Asset / platform" className={inp} />
                  </td>
                  <td className="px-3 py-2" style={{ minWidth: 160 }}>
                    <input value={l.particulars} onChange={(e) => setLine(i, { particulars: e.target.value })} placeholder="e.g. Advertorial" className={inp} />
                  </td>
                  <td className="px-3 py-2" style={{ minWidth: 190 }}>
                    <input value={l.brandingDetails} onChange={(e) => setLine(i, { brandingDetails: e.target.value })} placeholder="Branding details" className={inp + " mb-1"} />
                    <input value={l.period} onChange={(e) => setLine(i, { period: e.target.value })} placeholder="Period / duration" className={inp} />
                  </td>
                  <td className="px-3 py-2"><input value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} inputMode="decimal" className={inpR} /></td>
                  <td className="px-3 py-2">
                    <select value={l.uom} onChange={(e) => setLine(i, { uom: e.target.value })} className={inp}>
                      <option value="">— UOM —</option>
                      {(l.uom && !lineUoms.includes(l.uom) ? [l.uom, ...lineUoms] : lineUoms).map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2"><input value={l.unitGross} onChange={(e) => setLine(i, { unitGross: e.target.value })} inputMode="decimal" className={inpR} /></td>
                  <td className="px-3 py-2"><input value={l.discountPct} onChange={(e) => setLine(i, { discountPct: e.target.value })} inputMode="decimal" className={inpR} /></td>
                  <td className="px-3 py-2"><input value={l.unitCost} onChange={(e) => setLine(i, { unitCost: e.target.value })} inputMode="decimal" className={inpR} title="Internal cost payable to the media owner" /></td>
                  <td className="px-3 py-2 text-right tnum text-muted">{cur(lineNet(l))}</td>
                  <td className={`px-3 py-2 text-right tnum ${lineMargin(l) < 0 ? "text-danger" : "text-teal-ink"}`}>{cur(lineMargin(l))}</td>
                  <td className="px-2 py-2 text-center">
                    <button type="button" onClick={() => setLines((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p))} className="text-muted hover:text-danger" aria-label="Remove line">✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="border-t border-line px-3 py-2">
          <button type="button" onClick={() => setLines((p) => [...p, newLine(media, asset)])} className="text-sm font-medium text-teal-ink hover:underline">+ Add line</button>
        </div>
      </div>

      {/* Schedule (Annexure) — layout follows each line's media */}
      <div className="rounded-xl border border-line bg-surface p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="font-display text-base font-semibold text-ink">Schedule (Annexure)</h3>
          <span className="text-xs text-muted">The layout follows the media of each line; switch the view if needed.</span>
        </div>
        <div className="space-y-5">
          {lines.map((l, i) => {
            const s = l.schedule;
            const cols = scheduleColumns(s);
            const labels = specLabels(l.mediaType);
            const total = scheduleTotal(s);
            return (
              <div key={i} className="border-t border-line pt-4 first:border-0 first:pt-0">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="truncate text-sm font-medium text-ink">
                    Line {i + 1} · {MEDIA_LABEL[l.mediaType] ?? l.mediaType}{l.platform ? ` · ${l.platform}` : ""}{l.particulars ? ` — ${l.particulars}` : ""}
                  </div>
                  <div className="flex items-center gap-1">
                    {(Object.keys(GRAN_LABEL) as ScheduleGran[]).map((g) => (
                      <button key={g} type="button" onClick={() => setSchedule(i, { gran: g })}
                        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${s.gran === g ? "border-ink bg-ink text-white" : "border-line-2 bg-surface text-muted hover:bg-bg"}`}>
                        {GRAN_LABEL[g]}
                      </button>
                    ))}
                    <span className="ml-2 text-xs text-muted">Total <span className="tnum font-semibold text-ink">{total}</span></span>
                  </div>
                </div>

                <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
                  <input value={s.segment ?? ""} onChange={(e) => setSchedule(i, { segment: e.target.value })} placeholder={labels.segment} className={inp} />
                  <input value={s.position ?? ""} onChange={(e) => setSchedule(i, { position: e.target.value })} placeholder={labels.position} className={inp} />
                  <input value={s.duration ?? ""} onChange={(e) => setSchedule(i, { duration: e.target.value })} placeholder={labels.duration} className={inp} />
                  {s.gran === "daily" && (
                    <input type="month" value={s.month ?? ""} onChange={(e) => setSchedule(i, { month: e.target.value })} className={inp} aria-label="Schedule month" />
                  )}
                  {(s.gran === "monthly" || s.gran === "yearly") && (
                    <input type="number" value={s.year ?? ""} onChange={(e) => setSchedule(i, { year: Number(e.target.value) || undefined })} placeholder={s.gran === "monthly" ? "Year" : "First year"} className={inp} aria-label="Schedule year" />
                  )}
                </div>

                {s.gran === "dates" ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {(s.dates ?? []).map((d, di) => (
                      <span key={di} className="inline-flex items-center gap-1">
                        <input type="date" value={d} onChange={(e) => setSchedule(i, { dates: (s.dates ?? []).map((x, xi) => (xi === di ? e.target.value : x)) })} className={inp + " w-40"} />
                        <button type="button" onClick={() => setSchedule(i, { dates: (s.dates ?? []).filter((_, xi) => xi !== di) })} className="text-muted hover:text-danger" aria-label="Remove date">✕</button>
                      </span>
                    ))}
                    <button type="button" onClick={() => setSchedule(i, { dates: [...(s.dates ?? []), ""] })} className="text-sm font-medium text-teal-ink hover:underline">+ Add date</button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="flex gap-1" style={{ minWidth: s.gran === "daily" ? 31 * 36 : undefined }}>
                      {cols.map((c) => {
                        const v = s.cells?.[c.key];
                        return (
                          <label key={c.key} className={`flex flex-col items-center ${s.gran === "daily" ? "w-8" : "w-16"}`}>
                            <span className="text-[10px] leading-tight text-muted">{c.sub ?? ""}</span>
                            <span className="mb-0.5 text-[10px] font-medium text-muted">{c.label}</span>
                            <input value={v ?? ""} onChange={(e) => setCell(i, c.key, e.target.value)} inputMode="numeric"
                              className={`tnum h-8 w-full rounded-md border px-0.5 text-center text-xs ${v ? "border-ink bg-ink text-white" : "border-line-2 bg-surface"}`} />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Notes + totals */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <label className={lbl}>Notes</label>
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
            <div className="mt-3 rounded-lg border border-dashed border-line-2 bg-bg/40 p-3">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-muted">Internal — not shown on the PDF</div>
              <div className="flex justify-between text-sm"><dt className="text-muted">Media cost</dt><dd className="tnum">{cur(totals.totalCostFils)}</dd></div>
              <div className="flex justify-between text-sm"><dt className="text-muted">Margin</dt><dd className={`tnum font-medium ${totals.marginFils < 0 ? "text-danger" : "text-teal-ink"}`}>{cur(totals.marginFils)}{totals.totalNetFils > 0 ? ` (${Math.round((totals.marginFils / totals.totalNetFils) * 100)}%)` : ""}</dd></div>
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
