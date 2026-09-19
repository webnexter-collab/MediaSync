"use server";

import { assertCanWrite } from "@/lib/auth";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { items } from "@/db/schema";
import { itemSchema, rateForCategory, type FormState } from "@/lib/validators";
import { toFils } from "@/lib/money";
import { describeDbError, isUniqueViolation } from "@/lib/db-error";

const COMPANY_ID = 1;

function parse(formData: FormData) {
  return itemSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description"),
    unitOfMeasure: formData.get("unitOfMeasure") || "unit",
    unitPriceAed: formData.get("unitPriceAed") || 0,
    taxCategory: formData.get("taxCategory") || "standard",
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
}

export async function createItem(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await assertCanWrite();
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  try {
    await db.insert(items).values({
      companyId: COMPANY_ID,
      code: d.code,
      name: d.name,
      description: d.description,
      unitOfMeasure: d.unitOfMeasure,
      unitPriceFils: toFils(d.unitPriceAed),
      taxCategory: d.taxCategory,
      vatRate: String(rateForCategory(d.taxCategory)),
      isActive: d.isActive,
    });
  } catch (e) {
    if (isUniqueViolation(e, "item_code_uq"))
      return { ok: false, errors: { code: ["This code is already in use — pick another."] } };
    return { ok: false, message: `Could not save item: ${describeDbError(e).message}` };
  }
  revalidatePath("/items");
  redirect("/items");
}

export async function updateItem(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await assertCanWrite();
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  try {
    await db
      .update(items)
      .set({
        code: d.code,
        name: d.name,
        description: d.description,
        unitOfMeasure: d.unitOfMeasure,
        unitPriceFils: toFils(d.unitPriceAed),
        taxCategory: d.taxCategory,
        vatRate: String(rateForCategory(d.taxCategory)),
        isActive: d.isActive,
      })
      .where(and(eq(items.id, id), eq(items.companyId, COMPANY_ID)));
  } catch (e) {
    return { ok: false, message: `Could not update item: ${describeDbError(e).message}` };
  }
  revalidatePath("/items");
  redirect("/items");
}
