import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./index";
import { companies, customers, suppliers, items, bankAccounts, users } from "./schema";

async function main() {
  console.log("Seeding…");

  // Company 1 (the tenant used across v1).
  await db
    .insert(companies)
    .values({
      id: 1,
      name: "Demo Trading LLC",
      legalName: "Demo Trading L.L.C.",
      trn: "100000000000003",
      tin: "1000000000",
      city: "Dubai",
      emirate: "Dubai",
      country: "AE",
      email: "accounts@demo.ae",
      baseCurrency: "AED",
    })
    .onConflictDoNothing();

  await db
    .insert(customers)
    .values([
      { companyId: 1, code: "CUST-0001", name: "Al Habtoor Retail LLC", trn: "100111111111113", paymentTermsDays: 30, creditLimitFils: 50_000_00, city: "Dubai" },
      { companyId: 1, code: "CUST-0002", name: "Marina Hospitality Group", trn: "100222222222223", paymentTermsDays: 45, creditLimitFils: 120_000_00, city: "Abu Dhabi" },
      { companyId: 1, code: "CUST-0003", name: "Green Valley Clinic", paymentTermsDays: 15, city: "Sharjah" },
    ])
    .onConflictDoNothing();

  await db
    .insert(suppliers)
    .values([
      { companyId: 1, code: "SUPP-0001", name: "Gulf Electronics FZE", trn: "100333333333333", paymentTermsDays: 30, city: "Dubai" },
      { companyId: 1, code: "SUPP-0002", name: "Emirates Packaging Co", paymentTermsDays: 60, city: "Dubai" },
    ])
    .onConflictDoNothing();

  await db
    .insert(items)
    .values([
      { companyId: 1, code: "ITM-0001", name: "Consulting (per hour)", unitOfMeasure: "hour", unitPriceFils: 250_00, taxCategory: "standard", vatRate: "5" },
      { companyId: 1, code: "ITM-0002", name: "LED Display Panel P3.9", unitOfMeasure: "unit", unitPriceFils: 4_500_00, taxCategory: "standard", vatRate: "5" },
      { companyId: 1, code: "ITM-0003", name: "Annual Maintenance Contract", unitOfMeasure: "year", unitPriceFils: 12_000_00, taxCategory: "standard", vatRate: "5" },
    ])
    .onConflictDoNothing();

  await db
    .insert(bankAccounts)
    .values([
      { companyId: 1, name: "Emirates NBD — Current", type: "bank", bankName: "Emirates NBD", accountNumber: "1015xxxxxx401", iban: "AE07026xxxxxxxxxx0401", openingBalanceFils: 75_000_00, currency: "AED" },
      { companyId: 1, name: "Petty Cash", type: "cash", openingBalanceFils: 3_000_00, currency: "AED" },
      { companyId: 1, name: "Business Credit Card", type: "credit_card", bankName: "Emirates NBD", last4: "4417", creditLimitFils: 50_000_00, openingBalanceFils: 0, statementDay: 25, dueDay: 15, currency: "AED" },
    ])
    .onConflictDoNothing();

  const hash = (p: string) => bcrypt.hashSync(p, 10);
  await db
    .insert(users)
    .values([
      { companyId: 1, email: "admin@mediasync.local", name: "Administrator", passwordHash: hash("admin123"), role: "admin" },
      { companyId: 1, email: "user@mediasync.local", name: "Office User", passwordHash: hash("user123"), role: "user" },
      { companyId: 1, email: "demo@mediasync.local", name: "Demo User", passwordHash: hash("demo123"), role: "demo" },
    ])
    .onConflictDoNothing();

  console.log("Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
