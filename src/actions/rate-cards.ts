"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { rateCards, rateCardItems } from "@/db/schema";
import { assertCanWrite } from "@/lib/auth";
import { rateCardSchema, rateCardItemSchema, type FormState } from "@/lib/validators";
import { toFils } from "@/lib/money";
import { describeDbError } from "@/lib/db-error";

const COMPANY_ID = 1;

function parseCard(formData: FormData) {
  return rateCardSchema.safeParse({
    name: formData.get("name"),
    businessUnitId: formData.get("businessUnitId"),
    currency: formData.get("currency") || "AED",
    validFrom: formData.get("validFrom") || undefined,
    validTo: formData.get("validTo") || undefined,
    notes: formData.get("notes"),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
}

export async function createRateCard(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertCanWrite();
  const parsed = parseCard(formData);
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  let newId: number;
  try {
    const [row] = await db
      .insert(rateCards)
      .values({
        companyId: COMPANY_ID,
        name: d.name,
        businessUnitId: d.businessUnitId,
        currency: d.currency,
        validFrom: d.validFrom ?? null,
        validTo: d.validTo ?? null,
        notes: d.notes,
        isActive: d.isActive,
      })
      .returning({ id: rateCards.id });
    newId = row.id;
  } catch (e) {
    return { ok: false, message: `Could not save rate card: ${describeDbError(e).message}` };
  }
  revalidatePath("/rate-cards");
  redirect(`/rate-cards/${newId}`);
}

export async function updateRateCard(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await assertCanWrite();
  const parsed = parseCard(formData);
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  try {
    await db
      .update(rateCards)
      .set({
        name: d.name,
        businessUnitId: d.businessUnitId,
        currency: d.currency,
        validFrom: d.validFrom ?? null,
        validTo: d.validTo ?? null,
        notes: d.notes,
        isActive: d.isActive,
      })
      .where(and(eq(rateCards.id, id), eq(rateCards.companyId, COMPANY_ID)));
  } catch (e) {
    return { ok: false, message: `Could not update rate card: ${describeDbError(e).message}` };
  }
  revalidatePath(`/rate-cards/${id}`);
  redirect(`/rate-cards/${id}`);
}

export async function addRateCardItem(
  rateCardId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await assertCanWrite();
  const parsed = rateCardItemSchema.safeParse({
    mediaType: formData.get("mediaType") || "digital",
    channelId: formData.get("channelId"),
    platform: formData.get("platform"),
    particulars: formData.get("particulars"),
    brandingDetails: formData.get("brandingDetails"),
    uom: formData.get("uom"),
    unitGross: formData.get("unitGross") || 0,
    defaultDiscountPct: formData.get("defaultDiscountPct") || 0,
  });
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  try {
    const [{ next }] = await db
      .select({ next: sql<number>`coalesce(max(${rateCardItems.sortOrder}), 0) + 1` })
      .from(rateCardItems)
      .where(eq(rateCardItems.rateCardId, rateCardId));
    await db.insert(rateCardItems).values({
      rateCardId,
      mediaType: d.mediaType,
      channelId: d.channelId,
      platform: d.platform,
      particulars: d.particulars,
      brandingDetails: d.brandingDetails,
      uom: d.uom,
      unitGrossFils: toFils(d.unitGross),
      defaultDiscountPct: String(d.defaultDiscountPct),
      sortOrder: Number(next) || 1,
    });
  } catch (e) {
    return { ok: false, message: `Could not add item: ${describeDbError(e).message}` };
  }
  revalidatePath(`/rate-cards/${rateCardId}`);
  return { ok: true };
}

export async function deleteRateCardItem(id: number, rateCardId: number) {
  await assertCanWrite();
  await db.delete(rateCardItems).where(eq(rateCardItems.id, id));
  revalidatePath(`/rate-cards/${rateCardId}`);
}
