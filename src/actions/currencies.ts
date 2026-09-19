"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { currencies, fxRates } from "@/db/schema";
import { assertCanWrite } from "@/lib/auth";
import { currencySchema, type FormState } from "@/lib/validators";
import { describeDbError, isUniqueViolation } from "@/lib/db-error";

const COMPANY_ID = 1;

function parse(formData: FormData) {
  return currencySchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    symbol: formData.get("symbol"),
    decimals: formData.get("decimals") || 2,
    rateToBase: formData.get("rateToBase") || 1,
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
}

const TODAY = () => new Date().toISOString().slice(0, 10);

export async function createCurrency(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertCanWrite();
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  try {
    await db.insert(currencies).values({
      companyId: COMPANY_ID,
      code: d.code,
      name: d.name,
      symbol: d.symbol,
      decimals: d.decimals,
      isActive: d.isActive,
    });
    await db.insert(fxRates).values({
      companyId: COMPANY_ID,
      currencyCode: d.code,
      rateToBase: String(d.rateToBase),
      asOfDate: TODAY(),
    });
  } catch (e) {
    if (isUniqueViolation(e, "currency_code_uq"))
      return { ok: false, errors: { code: ["This currency already exists."] } };
    return { ok: false, message: `Could not save currency: ${describeDbError(e).message}` };
  }
  revalidatePath("/currencies");
  redirect("/currencies");
}

export async function updateCurrency(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await assertCanWrite();
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  try {
    const [existing] = await db
      .select({ code: currencies.code })
      .from(currencies)
      .where(and(eq(currencies.id, id), eq(currencies.companyId, COMPANY_ID)))
      .limit(1);
    if (!existing) return { ok: false, message: "Currency not found." };

    await db
      .update(currencies)
      .set({ name: d.name, symbol: d.symbol, decimals: d.decimals, isActive: d.isActive })
      .where(and(eq(currencies.id, id), eq(currencies.companyId, COMPANY_ID)));
    // Capture a new FX rate as-of today (rate history is append-only).
    await db.insert(fxRates).values({
      companyId: COMPANY_ID,
      currencyCode: existing.code,
      rateToBase: String(d.rateToBase),
      asOfDate: TODAY(),
    });
  } catch (e) {
    return { ok: false, message: `Could not update currency: ${describeDbError(e).message}` };
  }
  revalidatePath("/currencies");
  redirect("/currencies");
}
