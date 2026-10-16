"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { businessUnits, agencyGroups, salespeople, industries, salesTargets } from "@/db/schema";
import { assertCanWrite } from "@/lib/auth";
import { canManageTargets } from "@/lib/session";
import { toFils } from "@/lib/money";

const COMPANY_ID = 1;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const numOrNull = (fd: FormData, k: string) => {
  const v = str(fd, k);
  return v ? Number(v) : null;
};

/* ----------------------------- Business Units ----------------------------- */

export async function createBusinessUnit(formData: FormData): Promise<void> {
  await assertCanWrite();
  const name = str(formData, "name");
  const code = str(formData, "code").toUpperCase();
  if (!name || !code) return;
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${businessUnits.sortOrder}), 0) + 1` })
    .from(businessUnits)
    .where(eq(businessUnits.companyId, COMPANY_ID));
  await db
    .insert(businessUnits)
    .values({
      companyId: COMPANY_ID,
      name,
      code,
      country: str(formData, "country") || null,
      defaultCurrency: (str(formData, "defaultCurrency") || "USD").toUpperCase(),
      sortOrder: Number(next) || 1,
    })
    .onConflictDoNothing();
  revalidatePath("/business-units");
}

export async function updateBusinessUnit(id: number, formData: FormData): Promise<void> {
  await assertCanWrite();
  const name = str(formData, "name");
  const code = str(formData, "code").toUpperCase();
  if (!name || !code) return;
  await db
    .update(businessUnits)
    .set({
      name,
      code,
      country: str(formData, "country") || null,
      defaultCurrency: (str(formData, "defaultCurrency") || "USD").toUpperCase(),
      isActive: formData.get("isActive") === "on",
    })
    .where(and(eq(businessUnits.id, id), eq(businessUnits.companyId, COMPANY_ID)));
  revalidatePath("/business-units");
}

/* ------------------------------ Agency Groups ----------------------------- */

export async function createAgencyGroup(formData: FormData): Promise<void> {
  await assertCanWrite();
  const name = str(formData, "name");
  if (!name) return;
  await db
    .insert(agencyGroups)
    .values({ companyId: COMPANY_ID, name })
    .onConflictDoNothing();
  revalidatePath("/agency-groups");
}

export async function updateAgencyGroup(id: number, formData: FormData): Promise<void> {
  await assertCanWrite();
  const name = str(formData, "name");
  if (!name) return;
  await db
    .update(agencyGroups)
    .set({ name })
    .where(and(eq(agencyGroups.id, id), eq(agencyGroups.companyId, COMPANY_ID)));
  revalidatePath("/agency-groups");
}

export async function deleteAgencyGroup(id: number): Promise<void> {
  await assertCanWrite();
  await db.delete(agencyGroups).where(and(eq(agencyGroups.id, id), eq(agencyGroups.companyId, COMPANY_ID)));
  revalidatePath("/agency-groups");
}

/* ------------------------------- Industries ------------------------------- */

export async function createIndustry(formData: FormData): Promise<void> {
  await assertCanWrite();
  const name = str(formData, "name");
  if (!name) return;
  await db
    .insert(industries)
    .values({ companyId: COMPANY_ID, name })
    .onConflictDoNothing();
  revalidatePath("/industries");
}

export async function updateIndustry(id: number, formData: FormData): Promise<void> {
  await assertCanWrite();
  const name = str(formData, "name");
  if (!name) return;
  await db
    .update(industries)
    .set({ name })
    .where(and(eq(industries.id, id), eq(industries.companyId, COMPANY_ID)));
  revalidatePath("/industries");
}

export async function deleteIndustry(id: number): Promise<void> {
  await assertCanWrite();
  await db.delete(industries).where(and(eq(industries.id, id), eq(industries.companyId, COMPANY_ID)));
  revalidatePath("/industries");
}

/* ------------------------------- Salespeople ------------------------------ */

export async function createSalesperson(formData: FormData): Promise<void> {
  await assertCanWrite();
  const name = str(formData, "name");
  if (!name) return;
  await db.insert(salespeople).values({
    companyId: COMPANY_ID,
    name,
    email: str(formData, "email") || null,
    businessUnitId: numOrNull(formData, "businessUnitId"),
  });
  revalidatePath("/salespeople");
}

export async function updateSalesperson(id: number, formData: FormData): Promise<void> {
  await assertCanWrite();
  const name = str(formData, "name");
  if (!name) return;
  await db
    .update(salespeople)
    .set({
      name,
      email: str(formData, "email") || null,
      businessUnitId: numOrNull(formData, "businessUnitId"),
      isActive: formData.get("isActive") === "on",
    })
    .where(and(eq(salespeople.id, id), eq(salespeople.companyId, COMPANY_ID)));
  revalidatePath("/salespeople");
}

/* ------------------------------ Sales Targets ----------------------------- */

/**
 * Upsert a full year of monthly targets for one salesperson. The form posts
 * `m1`..`m12` in the salesperson's target currency (major units).
 */
export async function saveSalesTargets(
  salespersonId: number,
  year: number,
  formData: FormData,
): Promise<void> {
  const session = await assertCanWrite();
  // Targets are set by Administrators/Accounts only — salespeople cannot change them.
  if (!canManageTargets(session.role)) {
    throw new Error("Only Administrators and Accounts can set sales targets.");
  }
  const [sp] = await db
    .select({ businessUnitId: salespeople.businessUnitId })
    .from(salespeople)
    .where(and(eq(salespeople.id, salespersonId), eq(salespeople.companyId, COMPANY_ID)))
    .limit(1);
  if (!sp) return;
  const currency = (str(formData, "currency") || "USD").toUpperCase();

  for (let month = 1; month <= 12; month++) {
    const raw = str(formData, `m${month}`);
    const targetFils = raw ? toFils(raw) : 0;
    await db
      .insert(salesTargets)
      .values({
        companyId: COMPANY_ID,
        businessUnitId: sp.businessUnitId,
        salespersonId,
        year,
        month,
        targetFils,
        currency,
      })
      .onConflictDoUpdate({
        target: [salesTargets.companyId, salesTargets.salespersonId, salesTargets.year, salesTargets.month],
        set: { targetFils, currency, businessUnitId: sp.businessUnitId },
      });
  }
  revalidatePath("/sales-targets");
}
