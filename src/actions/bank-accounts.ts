"use server";

import { assertCanWrite } from "@/lib/auth";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { bankAccounts } from "@/db/schema";
import { bankAccountSchema, type FormState } from "@/lib/validators";
import { toFils } from "@/lib/money";
import { describeDbError, isUniqueViolation } from "@/lib/db-error";

const COMPANY_ID = 1;

function parse(formData: FormData) {
  return bankAccountSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type") || "bank",
    bankName: formData.get("bankName"),
    accountNumber: formData.get("accountNumber"),
    iban: formData.get("iban"),
    openingBalanceAed: formData.get("openingBalanceAed") || 0,
    currency: formData.get("currency") || "AED",
    creditLimitAed: formData.get("creditLimitAed") || 0,
    last4: formData.get("last4") || "",
    statementDay: formData.get("statementDay") || "",
    dueDay: formData.get("dueDay") || "",
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
}

function cardCols(d: import("@/lib/validators").BankAccountInput) {
  const toNum = (v: unknown) => (v === "" || v == null ? null : Number(v));
  return {
    creditLimitFils: toFils(d.creditLimitAed ?? 0),
    last4: d.last4 ? String(d.last4) : null,
    statementDay: toNum(d.statementDay),
    dueDay: toNum(d.dueDay),
  };
}

export async function createBankAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  await assertCanWrite();
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  try {
    await db.insert(bankAccounts).values({
      companyId: COMPANY_ID,
      name: d.name,
      type: d.type,
      bankName: d.bankName,
      accountNumber: d.accountNumber,
      iban: d.iban,
      openingBalanceFils: toFils(d.openingBalanceAed),
      currency: d.currency,
      ...cardCols(d),
      isActive: d.isActive,
    });
  } catch (e) {
    return { ok: false, message: `Could not save account: ${describeDbError(e).message}` };
  }
  revalidatePath("/bank-accounts");
  redirect("/bank-accounts");
}

export async function updateBankAccount(id: number, _prev: FormState, formData: FormData): Promise<FormState> {
  await assertCanWrite();
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  try {
    await db
      .update(bankAccounts)
      .set({
        name: d.name,
        type: d.type,
        bankName: d.bankName,
        accountNumber: d.accountNumber,
        iban: d.iban,
        openingBalanceFils: toFils(d.openingBalanceAed),
        currency: d.currency,
        ...cardCols(d),
        isActive: d.isActive,
      })
      .where(and(eq(bankAccounts.id, id), eq(bankAccounts.companyId, COMPANY_ID)));
  } catch (e) {
    return { ok: false, message: `Could not update account: ${describeDbError(e).message}` };
  }
  revalidatePath("/bank-accounts");
  redirect("/bank-accounts");
}
