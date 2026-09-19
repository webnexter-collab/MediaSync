"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { taxRules } from "@/db/schema";
import { assertCanWrite } from "@/lib/auth";
import { taxRuleSchema, type FormState } from "@/lib/validators";
import { describeDbError } from "@/lib/db-error";

const COMPANY_ID = 1;

function parse(formData: FormData) {
  return taxRuleSchema.safeParse({
    name: formData.get("name"),
    country: (formData.get("country") as string)?.toUpperCase() || "AE",
    category: formData.get("category") || "standard",
    ratePct: formData.get("ratePct") || 0,
    isDefault: formData.get("isDefault") === "on" || formData.get("isDefault") === "true",
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
}

// Only one rule may be the default; clear the flag on the others.
async function clearOtherDefaults(exceptId?: number) {
  await db
    .update(taxRules)
    .set({ isDefault: false })
    .where(
      exceptId
        ? and(eq(taxRules.companyId, COMPANY_ID), ne(taxRules.id, exceptId))
        : eq(taxRules.companyId, COMPANY_ID),
    );
}

export async function createTaxRule(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertCanWrite();
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  try {
    if (d.isDefault) await clearOtherDefaults();
    await db.insert(taxRules).values({
      companyId: COMPANY_ID,
      name: d.name,
      country: d.country,
      category: d.category,
      ratePct: String(d.ratePct),
      isDefault: d.isDefault,
      isActive: d.isActive,
    });
  } catch (e) {
    return { ok: false, message: `Could not save tax rule: ${describeDbError(e).message}` };
  }
  revalidatePath("/tax-rules");
  redirect("/tax-rules");
}

export async function updateTaxRule(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await assertCanWrite();
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  try {
    if (d.isDefault) await clearOtherDefaults(id);
    await db
      .update(taxRules)
      .set({
        name: d.name,
        country: d.country,
        category: d.category,
        ratePct: String(d.ratePct),
        isDefault: d.isDefault,
        isActive: d.isActive,
      })
      .where(and(eq(taxRules.id, id), eq(taxRules.companyId, COMPANY_ID)));
  } catch (e) {
    return { ok: false, message: `Could not update tax rule: ${describeDbError(e).message}` };
  }
  revalidatePath("/tax-rules");
  redirect("/tax-rules");
}
