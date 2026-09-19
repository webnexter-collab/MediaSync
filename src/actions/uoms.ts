"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { uoms } from "@/db/schema";
import { assertCanWrite } from "@/lib/auth";

const COMPANY_ID = 1;

export async function createUom(formData: FormData): Promise<void> {
  await assertCanWrite();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${uoms.sortOrder}), 0) + 1` })
    .from(uoms)
    .where(eq(uoms.companyId, COMPANY_ID));
  await db
    .insert(uoms)
    .values({ companyId: COMPANY_ID, name, sortOrder: Number(next) || 1 })
    .onConflictDoNothing();
  revalidatePath("/uoms");
}

export async function deleteUom(id: number): Promise<void> {
  await assertCanWrite();
  await db.delete(uoms).where(and(eq(uoms.id, id), eq(uoms.companyId, COMPANY_ID)));
  revalidatePath("/uoms");
}
