import "dotenv/config";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "./index";
import {
  companies,
  customers,
  suppliers,
  items,
  bankAccounts,
  users,
  currencies,
  fxRates,
  taxRules,
  mediaChannels,
  businessUnits,
  agencyGroups,
  industries,
  salespeople,
} from "./schema";

const TODAY = new Date().toISOString().slice(0, 10);

async function main() {
  console.log("Seeding…");

  // Company 1 (the single active tenant for v1).
  await db
    .insert(companies)
    .values({
      id: 1,
      name: "Mindset Media",
      legalName: "MINDSET LLC",
      trn: "104820268100001",
      tin: "1048202681",
      addressLine1: "DMC Building @ 1, Office 110",
      addressLine2: "Dubai Media City",
      city: "Dubai",
      emirate: "Dubai",
      country: "AE",
      email: "accounts@mindsetmedia.ae",
      baseCurrency: "AED",
    })
    .onConflictDoNothing();

  // Currencies MediaSync transacts in (base = AED).
  await db
    .insert(currencies)
    .values([
      { companyId: 1, code: "AED", name: "UAE Dirham", symbol: "د.إ", decimals: 2 },
      { companyId: 1, code: "USD", name: "US Dollar", symbol: "$", decimals: 2 },
      { companyId: 1, code: "EUR", name: "Euro", symbol: "€", decimals: 2 },
    ])
    .onConflictDoNothing();

  // Latest FX rates → base (AED). 1 unit of currency = rateToBase AED.
  await db
    .insert(fxRates)
    .values([
      { companyId: 1, currencyCode: "AED", rateToBase: "1", asOfDate: TODAY },
      { companyId: 1, currencyCode: "USD", rateToBase: "3.6725", asOfDate: TODAY },
      { companyId: 1, currencyCode: "EUR", rateToBase: "3.95", asOfDate: TODAY },
    ])
    .onConflictDoNothing();

  // Tax rules (multi-jurisdiction). UAE 5% standard is the default.
  await db
    .insert(taxRules)
    .values([
      { companyId: 1, name: "UAE VAT 5%", country: "AE", category: "standard", ratePct: "5", isDefault: true },
      { companyId: 1, name: "UAE Zero-rated", country: "AE", category: "zero_rated", ratePct: "0" },
      { companyId: 1, name: "UAE Exempt", country: "AE", category: "exempt", ratePct: "0" },
      { companyId: 1, name: "UAE Reverse Charge", country: "AE", category: "reverse_charge", ratePct: "5" },
      { companyId: 1, name: "US — Out of scope", country: "US", category: "out_of_scope", ratePct: "0" },
    ])
    .onConflictDoNothing();

  // CRM accounts (stored in customers): a direct client, an agency, a buying house.
  await db
    .insert(customers)
    .values([
      { companyId: 1, code: "ACC-0001", name: "Al Habtoor Retail LLC", accountType: "direct_client", trn: "100111111111113", paymentTermsDays: 30, creditLimitFils: 50_000_00, currency: "AED", city: "Dubai" },
      { companyId: 1, code: "ACC-0002", name: "Horizon Media Agency", accountType: "agency", agencyCommissionPct: "15", paymentTermsDays: 45, creditLimitFils: 250_000_00, currency: "AED", city: "Dubai" },
      { companyId: 1, code: "ACC-0003", name: "BlueWave Buying House", accountType: "buying_house", agencyCommissionPct: "12.5", paymentTermsDays: 60, creditLimitFils: 400_000_00, currency: "USD", city: "Abu Dhabi" },
    ])
    .onConflictDoNothing();

  // Buy-side vendors: publishers / stations / networks.
  await db
    .insert(suppliers)
    .values([
      { companyId: 1, code: "VEN-0001", name: "Gulf News (Al Nisr Publishing)", paymentTermsDays: 30, city: "Dubai" },
      { companyId: 1, code: "VEN-0002", name: "Radio 1 FM Network", paymentTermsDays: 30, city: "Dubai" },
      { companyId: 1, code: "VEN-0003", name: "Programmatic Exchange DSP", currency: "USD", paymentTermsDays: 15, city: "London" },
    ])
    .onConflictDoNothing();

  // Media channels (Print / Digital / Radio) sourced from those vendors.
  await db
    .insert(mediaChannels)
    .values([
      { companyId: 1, mediaType: "print", name: "Gulf News — Main Edition", code: "PR-GN-MAIN" },
      { companyId: 1, mediaType: "radio", name: "Radio 1 FM 104.1", code: "RD-R1-1041" },
      { companyId: 1, mediaType: "digital", name: "Programmatic Display Network", code: "DG-PROG-DISP" },
    ])
    .onConflictDoNothing();

  // Business Units — the markets Mindset Media operates (reporting dimension).
  await db
    .insert(businessUnits)
    .values([
      { companyId: 1, name: "UAE Media", code: "UAE", country: "United Arab Emirates", defaultCurrency: "USD", sortOrder: 1 },
      { companyId: 1, name: "Beirut Outdoor", code: "BEI", country: "Lebanon", defaultCurrency: "USD", sortOrder: 2 },
      { companyId: 1, name: "Iraq TV", code: "IRQ", country: "Iraq", defaultCurrency: "USD", sortOrder: 3 },
    ])
    .onConflictDoNothing();

  // Agency groups (agencies are mapped to these for consolidated reporting).
  await db
    .insert(agencyGroups)
    .values(
      ["BPG", "BPN", "Dentsu", "Direct", "Fusion", "GROUPM", "Havas", "MCN", "Memac", "Omnicom", "Publicis", "Radix", "SMB", "Times"]
        .map((name) => ({ companyId: 1, name })),
    )
    .onConflictDoNothing();

  // Advertiser industry categories.
  await db
    .insert(industries)
    .values(
      [
        "AIRLINES", "AUTOMOTIVE", "BANKING & FINANCE", "EDUCATION", "GOVERNMENT & PUBLIC SERVICES",
        "HEALTHCARE", "MISCELLANEOUS", "REAL ESTATE & CONSTRUCTION", "RETAIL", "SKIN CARE",
        "TECHNOLOGY", "TRAVEL, TOURISM, HOSPITALITY & ENTERTAINMENT",
      ].map((name) => ({ companyId: 1, name })),
    )
    .onConflictDoNothing();

  // Resolve business-unit ids by code for the cross-market rollout below.
  const buRows = await db
    .select({ id: businessUnits.id, code: businessUnits.code })
    .from(businessUnits)
    .where(eq(businessUnits.companyId, 1));
  const buId: Record<string, number> = Object.fromEntries(buRows.map((b) => [b.code, b.id]));

  // Beirut (Outdoor) & Iraq (TV) publishers — starter records; rename in the UI
  // to the real media owners once confirmed with Mindset.
  await db
    .insert(suppliers)
    .values([
      { companyId: 1, code: "VEN-BEI-01", name: "Beirut Outdoor Network", businessUnitId: buId.BEI ?? null, currency: "USD", paymentTermsDays: 30, city: "Beirut" },
      { companyId: 1, code: "VEN-IRQ-01", name: "Mindset TV — Iraq", businessUnitId: buId.IRQ ?? null, currency: "USD", paymentTermsDays: 30, city: "Baghdad" },
    ])
    .onConflictDoNothing();

  const venRows = await db
    .select({ id: suppliers.id, code: suppliers.code })
    .from(suppliers)
    .where(eq(suppliers.companyId, 1));
  const venId: Record<string, number> = Object.fromEntries(venRows.map((v) => [v.code, v.id]));

  // Beirut Outdoor (OOH) & Iraq TV media channels — starter placeholders.
  await db
    .insert(mediaChannels)
    .values([
      { companyId: 1, mediaType: "outdoor", name: "Beirut CBD Billboards", code: "OOH-BEI-CBD", businessUnitId: buId.BEI ?? null, vendorId: venId["VEN-BEI-01"] ?? null },
      { companyId: 1, mediaType: "outdoor", name: "Airport Road Unipoles", code: "OOH-BEI-APT", businessUnitId: buId.BEI ?? null, vendorId: venId["VEN-BEI-01"] ?? null },
      { companyId: 1, mediaType: "outdoor", name: "Hamra Digital Screens", code: "OOH-BEI-HAM", businessUnitId: buId.BEI ?? null, vendorId: venId["VEN-BEI-01"] ?? null },
      { companyId: 1, mediaType: "tv", name: "Iraq TV — Primetime", code: "TV-IRQ-PRIME", businessUnitId: buId.IRQ ?? null, vendorId: venId["VEN-IRQ-01"] ?? null },
      { companyId: 1, mediaType: "tv", name: "Iraq TV — News Bulletin", code: "TV-IRQ-NEWS", businessUnitId: buId.IRQ ?? null, vendorId: venId["VEN-IRQ-01"] ?? null },
      { companyId: 1, mediaType: "tv", name: "Iraq TV — Sports", code: "TV-IRQ-SPORT", businessUnitId: buId.IRQ ?? null, vendorId: venId["VEN-IRQ-01"] ?? null },
    ])
    .onConflictDoNothing();

  // Salespeople per business unit. Seeded once per BU (table has no unique key).
  const spRows = await db
    .select({ buId: salespeople.businessUnitId })
    .from(salespeople)
    .where(eq(salespeople.companyId, 1));
  const haveBu = new Set(spRows.map((r) => r.buId));
  const spToInsert: { companyId: number; name: string; businessUnitId: number }[] = [];
  if (buId.UAE && !haveBu.has(buId.UAE)) {
    for (const name of ["Carla Bou Nader", "Management", "Nicolas Antoine Berbari", "Priyanka Raman", "Shakeel Shaikh"])
      spToInsert.push({ companyId: 1, name, businessUnitId: buId.UAE });
  }
  if (buId.BEI && !haveBu.has(buId.BEI)) spToInsert.push({ companyId: 1, name: "Beirut Management", businessUnitId: buId.BEI });
  if (buId.IRQ && !haveBu.has(buId.IRQ)) spToInsert.push({ companyId: 1, name: "Iraq Management", businessUnitId: buId.IRQ });
  if (spToInsert.length) await db.insert(salespeople).values(spToInsert);

  await db
    .insert(items)
    .values([
      { companyId: 1, code: "ITM-0001", name: "Creative Production (per hour)", unitOfMeasure: "hour", unitPriceFils: 250_00, taxCategory: "standard", vatRate: "5" },
      { companyId: 1, code: "ITM-0002", name: "Campaign Management Fee", unitOfMeasure: "month", unitPriceFils: 5_000_00, taxCategory: "standard", vatRate: "5" },
    ])
    .onConflictDoNothing();

  await db
    .insert(bankAccounts)
    .values([
      { companyId: 1, name: "Emirates NBD — Current", type: "bank", bankName: "Emirates NBD", accountNumber: "1015xxxxxx401", iban: "AE07026xxxxxxxxxx0401", openingBalanceFils: 75_000_00, currency: "AED" },
      { companyId: 1, name: "USD Account — ADCB", type: "bank", bankName: "ADCB", openingBalanceFils: 0, currency: "USD" },
      { companyId: 1, name: "Petty Cash", type: "cash", openingBalanceFils: 3_000_00, currency: "AED" },
    ])
    .onConflictDoNothing();

  const hash = (p: string) => bcrypt.hashSync(p, 10);
  await db
    .insert(users)
    .values([
      { companyId: 1, email: "admin@mindsetmedia.ae", name: "Administrator", passwordHash: hash("admin123"), role: "admin" },
      { companyId: 1, email: "sales@mindsetmedia.ae", name: "Sales User", passwordHash: hash("sales123"), role: "sales" },
      { companyId: 1, email: "demo@mindsetmedia.ae", name: "Demo User", passwordHash: hash("demo123"), role: "demo" },
    ])
    .onConflictDoNothing();

  console.log("Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
