"use server";

import { assertCanWrite } from "@/lib/auth";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { supplierSchema, type FormState } from "@/lib/validators";
import { describeDbError, isUniqueViolation } from "@/lib/db-error";

const COMPANY_ID = 1;

function parse(formData: FormData) {
  return supplierSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    trn: formData.get("trn"),
    contactPerson: formData.get("contactPerson"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    city: formData.get("city"),
    country: formData.get("country") || "AE",
    paymentTermsDays: formData.get("paymentTermsDays") || 0,
    currency: formData.get("currency") || "AED",
    notes: formData.get("notes"),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
}

export async function createSupplier(
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
    await db.insert(suppliers).values({
      companyId: COMPANY_ID,
      code: d.code,
      name: d.name,
      trn: d.trn,
      contactPerson: d.contactPerson,
      email: d.email,
      phone: d.phone,
      address: d.address,
      city: d.city,
      country: d.country,
      paymentTermsDays: d.paymentTermsDays,
      currency: d.currency,
      notes: d.notes,
      isActive: d.isActive,
    });
  } catch (e) {
    if (isUniqueViolation(e, "supplier_code_uq"))
      return { ok: false, errors: { code: ["This code is already in use — pick another."] } };
    return { ok: false, message: `Could not save supplier: ${describeDbError(e).message}` };
  }
  revalidatePath("/suppliers");
  redirect("/suppliers");
}

export async function updateSupplier(
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
      .update(suppliers)
      .set({
        code: d.code,
        name: d.name,
        trn: d.trn,
        contactPerson: d.contactPerson,
        email: d.email,
        phone: d.phone,
        address: d.address,
        city: d.city,
        country: d.country,
        paymentTermsDays: d.paymentTermsDays,
        currency: d.currency,
        notes: d.notes,
        isActive: d.isActive,
      })
      .where(and(eq(suppliers.id, id), eq(suppliers.companyId, COMPANY_ID)));
  } catch (e) {
    return { ok: false, message: `Could not update supplier: ${describeDbError(e).message}` };
  }
  revalidatePath("/suppliers");
  redirect("/suppliers");
}

export async function toggleSupplierActive(id: number, isActive: boolean) {
  await assertCanWrite();
  await db
    .update(suppliers)
    .set({ isActive })
    .where(and(eq(suppliers.id, id), eq(suppliers.companyId, COMPANY_ID)));
  revalidatePath("/suppliers");
}
