"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { assertCanWrite } from "@/lib/auth";
import { contactSchema, type FormState } from "@/lib/validators";
import { describeDbError } from "@/lib/db-error";

const COMPANY_ID = 1;

export async function createContact(
  customerId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await assertCanWrite();
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    role: formData.get("role"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    isPrimary: formData.get("isPrimary") === "on" || formData.get("isPrimary") === "true",
  });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;
  try {
    // Only one primary per account: clear the others first.
    if (d.isPrimary) {
      await db
        .update(contacts)
        .set({ isPrimary: false })
        .where(and(eq(contacts.companyId, COMPANY_ID), eq(contacts.customerId, customerId)));
    }
    await db.insert(contacts).values({
      companyId: COMPANY_ID,
      customerId,
      name: d.name,
      role: d.role,
      email: d.email,
      phone: d.phone,
      isPrimary: d.isPrimary,
    });
  } catch (e) {
    return { ok: false, message: `Could not add contact: ${describeDbError(e).message}` };
  }
  revalidatePath(`/customers/${customerId}/edit`);
  return { ok: true };
}

export async function deleteContact(id: number, customerId: number) {
  await assertCanWrite();
  await db
    .delete(contacts)
    .where(and(eq(contacts.id, id), eq(contacts.companyId, COMPANY_ID)));
  revalidatePath(`/customers/${customerId}/edit`);
}

export async function makeContactPrimary(id: number, customerId: number) {
  await assertCanWrite();
  await db
    .update(contacts)
    .set({ isPrimary: false })
    .where(and(eq(contacts.companyId, COMPANY_ID), eq(contacts.customerId, customerId)));
  await db
    .update(contacts)
    .set({ isPrimary: true })
    .where(and(eq(contacts.id, id), eq(contacts.companyId, COMPANY_ID)));
  revalidatePath(`/customers/${customerId}/edit`);
}
