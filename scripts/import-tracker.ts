/**
 * Clear all transactional + master data and rebuild from Mindset's live files.
 *
 *   npx tsx scripts/import-tracker.ts "<Bookings Tracker.xlsx>" "<Industry & Category.xlsx>" --confirm
 *
 * Keeps: company, users, currencies, FX rates, tax rules.
 * Rebuilds: business units, assets, UOMs, agency groups, agencies, clients,
 * salespeople, industries + categories, and one confirmed Booking Order per
 * tracker row (monthly sheets Sep..Dec).
 */
import "dotenv/config";
import ExcelJS from "exceljs";
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import {
  businessUnits, mediaChannels, uoms, agencyGroups, customers, salespeople, industries,
  industryCategories, bookingOrders, bookingOrderLines, suppliers, numberSequences,
} from "../src/db/schema";

const COMPANY_ID = 1;
const [trackerPath, industryPath] = process.argv.slice(2);
if (!trackerPath || !industryPath || !process.argv.includes("--confirm")) {
  console.error('Usage: tsx scripts/import-tracker.ts "<tracker.xlsx>" "<industry.xlsx>" --confirm');
  process.exit(1);
}

type MediaType = "print" | "digital" | "radio" | "tv" | "website" | "outdoor";

function cell(c: ExcelJS.Cell): string | Date {
  let v: unknown = c.value;
  if (v && typeof v === "object" && !(v instanceof Date)) {
    const o = v as { result?: unknown; text?: string; richText?: { text: string }[] };
    v = o.result ?? o.text ?? (o.richText ? o.richText.map((t) => t.text).join("") : "");
  }
  if (v instanceof Date) return v;
  return v == null ? "" : String(v).trim();
}
const str = (c: ExcelJS.Cell) => { const v = cell(c); return v instanceof Date ? v.toISOString().slice(0, 10) : v; };
const isoDate = (c: ExcelJS.Cell) => { const v = cell(c); return v instanceof Date ? v.toISOString().slice(0, 10) : null; };

/* ---- Confirmed name mappings ---- */
const ASSETS: { name: string; code: string; mediaType: MediaType; allowed: MediaType[] }[] = [
  { name: "Sky News Arabia TV", code: "AST-SNA-TV", mediaType: "tv", allowed: ["tv", "digital"] },
  { name: "Sky News Arabia Radio", code: "AST-SNA-RADIO", mediaType: "radio", allowed: ["radio"] },
  { name: "CNN Arabic website", code: "AST-CNN-AR", mediaType: "website", allowed: ["website", "digital"] },
  { name: "The National Newspaper", code: "AST-TN-PRINT", mediaType: "print", allowed: ["print"] },
  { name: "The National Digital", code: "AST-TN-DIGITAL", mediaType: "digital", allowed: ["digital"] },
  { name: "The National Luxury Magazine", code: "AST-TN-LUX", mediaType: "print", allowed: ["print"] },
  { name: "Al Ain News Portal", code: "AST-ALAIN", mediaType: "website", allowed: ["website", "digital"] },
];
function assetFor(medium: string, platform: string): string {
  const m = medium.toLowerCase().replace(/\s+/g, " ").trim();
  const p = platform.toLowerCase();
  if (m === "sna radio") return "Sky News Arabia Radio";
  if (m === "sna" || m === "sna tv") return "Sky News Arabia TV";
  if (m.includes("national")) {
    if (m.includes("digital") || p === "digital") return "The National Digital";
    return "The National Newspaper";
  }
  throw new Error(`Unmapped medium "${medium}" (${platform})`);
}
const INDUSTRY_MAP: Record<string, string> = {
  "BANK & FINANCE": "BANKING & FINANCE",
  BANKING: "BANKING & FINANCE",
  AUTOMOBILE: "AUTOMOTIVE",
  AIRLINES: "TRAVEL, TOURISM, HOSPITALITY & ENTERTAINMENT",
  ENTERTAINMENT: "TRAVEL, TOURISM, HOSPITALITY & ENTERTAINMENT",
  EXHIBITION: "TRAVEL, TOURISM, HOSPITALITY & ENTERTAINMENT",
  "MANUFACTURING INDUSTRIES": "INDUSTRIAL SECTOR",
  TECHNOLOGY: "ELECTRONICS & TECHNOLOGY PRODUCTS",
  MISC: "MISCELLANEOUS",
  RETAIL: "RETAIL",
  WEBSITE: "MEDIA & PUBLISHING & ADVERTISING",
};
const AGENCY_ALIAS: Record<string, string> = {
  "National Network Communication": "National Network Communications",
};
const UOMS: [string, MediaType[] | null][] = [
  ["Spot", ["tv", "radio"]], ["30 Sec", ["tv", "radio"]], ["15 Sec", ["tv", "radio"]],
  ["Sponsorship", ["tv", "radio", "digital", "website"]],
  ["Insertion", ["print"]], ["Full Page", ["print"]], ["Half Page", ["print"]], ["Quarter Page", ["print"]],
  ["Article", ["print", "digital", "website"]], ["Advertorial", ["print", "digital", "website"]],
  ["Impressions", ["digital", "website"]], ["CPM", ["digital", "website"]], ["Clicks", ["digital", "website"]],
  ["Banner", ["digital", "website"]], ["Post", ["digital"]], ["Video", ["digital", "website"]],
  ["Site", ["outdoor"]], ["Billboard", ["outdoor"]], ["Face", ["outdoor"]],
  ["Day", null], ["Month", null], ["Package", null],
];

async function main() {
  const tracker = new ExcelJS.Workbook();
  await tracker.xlsx.readFile(trackerPath);
  const indWb = new ExcelJS.Workbook();
  await indWb.xlsx.readFile(industryPath);

  /* ---- Read industries + categories ---- */
  const indSheet = indWb.getWorksheet("Industries")!;
  const industryNames: string[] = [];
  for (let r = 2; r <= indSheet.rowCount; r++) { const v = str(indSheet.getRow(r).getCell(1)); if (v) industryNames.push(v); }
  const indSet = new Set(industryNames);
  const catSheet = indWb.getWorksheet("Categories")!;
  const catTree = new Map<string, string[]>();
  let cur: string | null = null;
  for (let r = 2; r <= catSheet.rowCount; r++) {
    const v = str(catSheet.getRow(r).getCell(1));
    if (!v) continue;
    if (indSet.has(v)) { cur = v; if (!catTree.has(v)) catTree.set(v, []); }
    else if (cur) catTree.get(cur)!.push(v);
  }

  /* ---- Read agency → group from the Data Sheet ---- */
  const groupOf = new Map<string, string>();
  const ds = tracker.getWorksheet("Data Sheet")!;
  for (let r = 2; r <= ds.rowCount; r++) {
    const g = str(ds.getRow(r).getCell(2)); let a = str(ds.getRow(r).getCell(3));
    if (!a || !g) continue;
    a = AGENCY_ALIAS[a] ?? a;
    groupOf.set(a.toLowerCase(), g);
  }

  /* ---- Read booking rows from the monthly sheets ---- */
  type Row = {
    sheet: string; platform: string; receipt: string | null; medium: string; region: string; month: string | null;
    campaign: string; industry: string; agency: string; client: string; boRef: string; start: string | null; end: string | null;
    periodNote: string | null; currency: string; netAed: number; salesOffice: string; salesperson: string; comment: string;
  };
  const rows: Row[] = [];
  const MONTH_NO: Record<string, string> = { Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
  for (const sn of ["Sep", "Oct", "Nov", "Dec"]) {
    const ws = tracker.getWorksheet(sn);
    if (!ws) continue;
    const last = Math.min(ws.rowCount, 500);
    for (let r = 3; r <= last; r++) {
      const row = ws.getRow(r);
      const medium = str(row.getCell(4));
      if (!medium) continue;
      const monthIso = isoDate(row.getCell(6));
      const year = (monthIso ?? isoDate(row.getCell(3)) ?? "2026").slice(0, 4);
      const start = isoDate(row.getCell(13)); const end = isoDate(row.getCell(14));
      const startTxt = str(row.getCell(13)); const endTxt = str(row.getCell(14));
      let agency = str(row.getCell(10)); agency = AGENCY_ALIAS[agency] ?? agency;
      rows.push({
        sheet: sn, platform: str(row.getCell(1)), receipt: isoDate(row.getCell(3)), medium, region: str(row.getCell(5)),
        month: `${year}-${MONTH_NO[sn]}-01`, campaign: str(row.getCell(7)), industry: str(row.getCell(8)).toUpperCase(),
        agency, client: str(row.getCell(11)), boRef: str(row.getCell(12)), start, end,
        periodNote: start && end ? null : [startTxt, endTxt].filter(Boolean).join(" – ") || null,
        currency: str(row.getCell(15)) || "AED", netAed: Number(str(row.getCell(16))) || 0,
        salesOffice: str(row.getCell(19)), salesperson: str(row.getCell(20)), comment: str(row.getCell(21)),
      });
    }
  }
  console.log(`Read ${rows.length} booking rows, ${industryNames.length} industries, ${[...catTree.values()].flat().length} categories.`);
  for (const r of rows) { assetFor(r.medium, r.platform); if (r.industry && !INDUSTRY_MAP[r.industry]) throw new Error(`Unmapped industry "${r.industry}"`); }

  /* ---- Clear ---- */
  await db.execute(sql`TRUNCATE TABLE
    payment_allocations, payments, ledger_entries, document_lines, documents,
    booking_order_lines, booking_orders, rate_card_items, rate_cards, sales_targets, salespeople,
    contacts, customers, media_channels, suppliers, items, bank_accounts, number_sequences,
    industry_categories, industries, agency_groups, uoms, business_units
    RESTART IDENTITY CASCADE`);
  console.log("Cleared existing data.");

  /* ---- Masters ---- */
  const bu = await db.insert(businessUnits).values([
    { companyId: COMPANY_ID, name: "IMI", code: "IMI", country: "United Arab Emirates", defaultCurrency: "AED", sortOrder: 1 },
    { companyId: COMPANY_ID, name: "Iraq Media", code: "IRQ", country: "Iraq", defaultCurrency: "USD", sortOrder: 2 },
    { companyId: COMPANY_ID, name: "Beirut Media", code: "BEI", country: "Lebanon", defaultCurrency: "USD", sortOrder: 3 },
  ]).returning({ id: businessUnits.id, code: businessUnits.code });
  const imiId = bu.find((b) => b.code === "IMI")!.id;

  const [imiVendor] = await db.insert(suppliers).values({
    companyId: COMPANY_ID, code: "VEN-IMI", name: "IMI Media Group", businessUnitId: imiId, currency: "AED", city: "Abu Dhabi",
  }).returning({ id: suppliers.id });

  const assetRows = await db.insert(mediaChannels).values(ASSETS.map((a) => ({
    companyId: COMPANY_ID, name: a.name, code: a.code, mediaType: a.mediaType,
    allowedMedia: JSON.stringify(a.allowed), businessUnitId: imiId, vendorId: imiVendor.id,
  }))).returning({ id: mediaChannels.id, name: mediaChannels.name });
  const assetId = new Map(assetRows.map((a) => [a.name, a.id]));

  await db.insert(uoms).values(UOMS.map(([name, media], i) => ({
    companyId: COMPANY_ID, name, mediaTypes: media ? JSON.stringify(media) : null, sortOrder: i + 1,
  })));

  const indRows = await db.insert(industries).values(industryNames.map((name) => ({ companyId: COMPANY_ID, name })))
    .returning({ id: industries.id, name: industries.name });
  const industryId = new Map(indRows.map((i) => [i.name, i.id]));
  const catValues = [...catTree.entries()].flatMap(([ind, cats]) =>
    [...new Set(cats)].map((name) => ({ companyId: COMPANY_ID, industryId: industryId.get(ind)!, name })));
  if (catValues.length) await db.insert(industryCategories).values(catValues);

  const groupNames = [...new Set([...groupOf.values()])];
  const grpRows = await db.insert(agencyGroups).values(groupNames.map((name) => ({ companyId: COMPANY_ID, name })))
    .returning({ id: agencyGroups.id, name: agencyGroups.name });
  const groupId = new Map(grpRows.map((g) => [g.name, g.id]));

  const agencyNames = [...new Set(rows.map((r) => r.agency).filter(Boolean))].sort();
  const agencyRows = await db.insert(customers).values(agencyNames.map((name, i) => {
    const g = groupOf.get(name.toLowerCase());
    return {
      companyId: COMPANY_ID, code: `AGY-${String(i + 1).padStart(4, "0")}`, name, accountType: "agency" as const,
      agencyGroupId: g ? groupId.get(g) ?? null : null, businessUnitId: imiId, currency: "AED", country: "AE",
    };
  })).returning({ id: customers.id, name: customers.name });
  const agencyId = new Map(agencyRows.map((a) => [a.name, a.id]));

  const clientNames = [...new Set(rows.map((r) => r.client).filter(Boolean))].sort();
  const clientRows = await db.insert(customers).values(clientNames.map((name, i) => ({
    companyId: COMPANY_ID, code: `CLT-${String(i + 1).padStart(4, "0")}`, name, accountType: "direct_client" as const,
    businessUnitId: imiId, currency: "AED", country: "AE",
  }))).returning({ id: customers.id, name: customers.name });
  const clientId = new Map(clientRows.map((c) => [c.name, c.id]));

  const spNames = [...new Set(rows.map((r) => r.salesperson).filter(Boolean))].sort();
  const spRows = await db.insert(salespeople).values(spNames.map((name) => ({
    companyId: COMPANY_ID, name, businessUnitId: imiId,
    email: name.toLowerCase() === "shakeel" ? "shakeel@mindsetmedia.ae" : null,
  }))).returning({ id: salespeople.id, name: salespeople.name });
  const spId = new Map(spRows.map((s) => [s.name, s.id]));

  /* ---- Booking orders (one confirmed BO per tracker row) ---- */
  let n = 0;
  for (const r of rows) {
    n++;
    const netFils = Math.round(r.netAed * 100);
    const vatFils = Math.round(netFils * 0.05);
    const assetName = assetFor(r.medium, r.platform);
    const mediaType = r.platform.toLowerCase() as MediaType;
    const date = r.receipt ?? r.month!;
    const [bo] = await db.insert(bookingOrders).values({
      companyId: COMPANY_ID, number: `BO-MS-${1000 + n}`, status: "confirmed",
      publisherVendorId: imiVendor.id, toName: assetName, assetId: assetId.get(assetName)!,
      agency: r.agency || null, client: r.client || null,
      agencyAccountId: r.agency ? agencyId.get(r.agency) ?? null : null,
      clientAccountId: r.client ? clientId.get(r.client) ?? null : null,
      accountId: r.client ? clientId.get(r.client) ?? null : null,
      campaign: r.campaign || null, medium: r.platform || null,
      businessUnitId: imiId, salespersonId: r.salesperson ? spId.get(r.salesperson) ?? null : null,
      industryId: r.industry ? industryId.get(INDUSTRY_MAP[r.industry]) ?? null : null,
      region: r.region || null, salesOffice: r.salesOffice || null, clientBoRef: r.boRef || null,
      revenueMonth: r.month, startDate: r.start, endDate: r.end, periodNote: r.periodNote,
      currency: r.currency, exchangeRate: "1", issueDate: date, receiptDate: r.receipt,
      agencyDiscountPct: "0", vatRatePct: "5",
      totalGrossFils: netFils, lineDiscountFils: 0, agencyDiscountFils: 0, totalNetFils: netFils,
      vatFils, grandTotalFils: netFils + vatFils, totalCostFils: 0, marginFils: netFils,
      notes: r.comment || null,
    }).returning({ id: bookingOrders.id });
    await db.insert(bookingOrderLines).values({
      bookingOrderId: bo.id, lineNo: 1, mediaType, channelId: assetId.get(assetName)!, platform: assetName,
      particulars: r.campaign || null, period: r.periodNote ?? ([r.start, r.end].filter(Boolean).join(" → ") || null),
      quantity: "1", unitGrossFils: netFils, discountPct: "0", unitNetFils: netFils,
      lineGrossFils: netFils, lineNetFils: netFils, unitCostFils: 0, lineCostFils: 0,
    });
  }
  await db.insert(numberSequences).values({
    companyId: COMPANY_ID, branchId: null, documentType: "booking_order", year: 0, prefix: "BO-MS", lastNumber: n, padding: 0,
  });

  const total = rows.reduce((s, r) => s + r.netAed, 0);
  console.log(`Imported ${n} booking orders. Net AED total: ${total.toFixed(2)}`);
  console.log(`Masters: 3 business units, ${ASSETS.length} assets, ${UOMS.length} UOMs, ${groupNames.length} agency groups, ${agencyNames.length} agencies, ${clientNames.length} clients, ${spNames.length} salespeople.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
