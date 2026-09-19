"use server";

import { assertCanWrite } from "@/lib/auth";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { customerSchema, type FormState } from "@/lib/validators";
import { toFils } from "@/lib/money";
import { describeDbError, isUniqueViolation } from "@/lib/db-error";

// Single-company build for v1. Swap for the authenticated user's company later.
const COMPANY_ID = 1;

function parse(formData: FormData) {
  return customerSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    trn: formData.get("trn"),
    contactPerson: formData.get("contactPerson"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    billingAddress: formData.get("billingAddress"),
    shippingAddress: formData.get("shippingAddress"),
    city: formData.get("city"),
    country: formData.get("country") || "AE",
    paymentTermsDays: formData.get("paymentTermsDays") || 0,
    creditLimitAed: formData.get("creditLimitAed") || 0,
    currency: formData.get("currency") || "AED",
    notes: formData.get("notes"),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
}

export async function createCustomer(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await assertCanWrite();
  const parsed = parse(formData);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;
  try {
    await db.insert(customers).values({
      companyId: COMPANY_ID,
      code: d.code,
      name: d.name,
      trn: d.trn,
      contactPerson: d.contactPerson,
      email: d.email,
      phone: d.phone,
      billingAddress: d.billingAddress,
      shippingAddress: d.shippingAddress,
      city: d.city,
      country: d.country,
      paymentTermsDays: d.paymentTermsDays,
      creditLimitFils: toFils(d.creditLimitAed),
      currency: d.currency,
      notes: d.notes,
      isActive: d.isActive,
    });
  } catch (e) {
    if (isUniqueViolation(e, "customer_code_uq"))
      return { ok: false, errors: { code: ["This code is already in use — pick another."] } };
    return { ok: false, message: `Could not save customer: ${describeDbError(e).message}` };
  }
  revalidatePath("/customers");
  redirect("/customers");
}

export async function updateCustomer(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await assertCanWrite();
  const parsed = parse(formData);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;
  try {
    await db
      .update(customers)
      .set({
        code: d.code,
        name: d.name,
        trn: d.trn,
        contactPerson: d.contactPerson,
        email: d.email,
        phone: d.phone,
        billingAddress: d.billingAddress,
        shippingAddress: d.shippingAddress,
        city: d.city,
        country: d.country,
        paymentTermsDays: d.paymentTermsDays,
        creditLimitFils: toFils(d.creditLimitAed),
        currency: d.currency,
        notes: d.notes,
        isActive: d.isActive,
      })
      .where(and(eq(customers.id, id), eq(customers.companyId, COMPANY_ID)));
  } catch (e) {
    if (isUniqueViolation(e, "customer_code_uq"))
      return { ok: false, errors: { code: ["This code is already in use — pick another."] } };
    return { ok: false, message: `Could not update customer: ${describeDbError(e).message}` };
  }
  revalidatePath("/customers");
  redirect("/customers");
}

export async function toggleCustomerActive(id: number, isActive: boolean) {
  await assertCanWrite();
  await db
    .update(customers)
    .set({ isActive })
    .where(and(eq(customers.id, id), eq(customers.companyId, COMPANY_ID)));
  revalidatePath("/customers");
}
