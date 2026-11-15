/**
 * Base seed for a fresh MediaSync install: company, currencies, FX, tax rules,
 * the three business units, IMI's assets, units of measure and logins.
 *
 * Live data (agencies, clients, salespeople, industries/categories, bookings)
 * is loaded from Mindset's Excel files with:
 *   npx tsx scripts/import-tracker.ts "<Bookings Tracker.xlsx>" "<Industry & Category.xlsx>" --confirm
 */
import "dotenv/config";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "./index";
import {
  companies, suppliers, users, currencies, fxRates, taxRules, mediaChannels, businessUnits, uoms,
} from "./schema";

const TODAY = new Date().toISOString().slice(0, 10);

type MediaType = "print" | "digital" | "radio" | "tv" | "website" | "outdoor";

const ASSETS: { name: string; code: string; mediaType: MediaType; allowed: MediaType[] }[] = [
  { name: "Sky News Arabia TV", code: "AST-SNA-TV", mediaType: "tv", allowed: ["tv", "digital"] },
  { name: "Sky News Arabia Radio", code: "AST-SNA-RADIO", mediaType: "radio", allowed: ["radio"] },
  { name: "CNN Arabic website", code: "AST-CNN-AR", mediaType: "website", allowed: ["website", "digital"] },
  { name: "The National Newspaper", code: "AST-TN-PRINT", mediaType: "print", allowed: ["print"] },
  { name: "The National Digital", code: "AST-TN-DIGITAL", mediaType: "digital", allowed: ["digital"] },
  { name: "The National Luxury Magazine", code: "AST-TN-LUX", mediaType: "print", allowed: ["print"] },
  { name: "Al Ain News Portal", code: "AST-ALAIN", mediaType: "website", allowed: ["website", "digital"] },
];

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
  console.log("Seeding…");

  // Company 1 (the single active tenant).
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

  await db
    .insert(currencies)
    .values([
      { companyId: 1, code: "AED", name: "UAE Dirham", symbol: "د.إ", decimals: 2 },
      { companyId: 1, code: "USD", name: "US Dollar", symbol: "$", decimals: 2 },
      { companyId: 1, code: "EUR", name: "Euro", symbol: "€", decimals: 2 },
    ])
    .onConflictDoNothing();

  // Latest FX rates → base (AED). 1 unit of currency = rateToBase AED.
  const [fxExisting] = await db.select({ id: fxRates.id }).from(fxRates).where(eq(fxRates.companyId, 1)).limit(1);
  if (!fxExisting) {
    await db.insert(fxRates).values([
      { companyId: 1, currencyCode: "AED", rateToBase: "1", asOfDate: TODAY },
      { companyId: 1, currencyCode: "USD", rateToBase: "3.6725", asOfDate: TODAY },
      { companyId: 1, currencyCode: "EUR", rateToBase: "3.95", asOfDate: TODAY },
    ]);
  }

  const [taxExisting] = await db.select({ id: taxRules.id }).from(taxRules).where(eq(taxRules.companyId, 1)).limit(1);
  if (!taxExisting) {
    await db.insert(taxRules).values([
      { companyId: 1, name: "UAE VAT 5%", country: "AE", category: "standard", ratePct: "5", isDefault: true },
      { companyId: 1, name: "UAE Zero-rated", country: "AE", category: "zero_rated", ratePct: "0" },
      { companyId: 1, name: "UAE Exempt", country: "AE", category: "exempt", ratePct: "0" },
      { companyId: 1, name: "UAE Reverse Charge", country: "AE", category: "reverse_charge", ratePct: "5" },
    ]);
  }

  // Business units directly under Mindset Media. IMI is the UAE unit.
  await db
    .insert(businessUnits)
    .values([
      { companyId: 1, name: "IMI", code: "IMI", country: "United Arab Emirates", defaultCurrency: "AED", sortOrder: 1 },
      { companyId: 1, name: "Iraq Media", code: "IRQ", country: "Iraq", defaultCurrency: "USD", sortOrder: 2 },
      { companyId: 1, name: "Beirut Media", code: "BEI", country: "Lebanon", defaultCurrency: "USD", sortOrder: 3 },
    ])
    .onConflictDoNothing();
  const [imi] = await db
    .select({ id: businessUnits.id })
    .from(businessUnits)
    .where(and(eq(businessUnits.companyId, 1), eq(businessUnits.code, "IMI")))
    .limit(1);

  // IMI as the media owner of the UAE assets.
  await db
    .insert(suppliers)
    .values({ companyId: 1, code: "VEN-IMI", name: "IMI Media Group", businessUnitId: imi?.id ?? null, currency: "AED", city: "Abu Dhabi" })
    .onConflictDoNothing();
  const [imiVendor] = await db
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(and(eq(suppliers.companyId, 1), eq(suppliers.code, "VEN-IMI")))
    .limit(1);

  await db
    .insert(mediaChannels)
    .values(ASSETS.map((a) => ({
      companyId: 1, name: a.name, code: a.code, mediaType: a.mediaType,
      allowedMedia: JSON.stringify(a.allowed), businessUnitId: imi?.id ?? null, vendorId: imiVendor?.id ?? null,
    })))
    .onConflictDoNothing();

  await db
    .insert(uoms)
    .values(UOMS.map(([name, media], i) => ({ companyId: 1, name, mediaTypes: media ? JSON.stringify(media) : null, sortOrder: i + 1 })))
    .onConflictDoNothing();

  const hash = (p: string) => bcrypt.hashSync(p, 10);
  await db
    .insert(users)
    .values([
      { companyId: 1, email: "admin@mindsetmedia.ae", name: "Administrator", passwordHash: hash("admin123"), role: "admin" },
      { companyId: 1, email: "sales@mindsetmedia.ae", name: "Sales User", passwordHash: hash("sales123"), role: "sales" },
      { companyId: 1, email: "shakeel@mindsetmedia.ae", name: "Shakeel Shaikh", passwordHash: hash("shakeel123"), role: "sales" },
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
