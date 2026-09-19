"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin, hashPassword } from "@/lib/auth";
import type { FormState } from "@/lib/validators";
import type { Role } from "@/lib/session";

const COMPANY_ID = 1;
const ALLOWED_ROLES: Role[] = ["admin", "user", "demo"];

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "user") as Role;

  if (!name) return { ok: false, message: "Name is required." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "Enter a valid email." };
  if (password.length < 6) return { ok: false, message: "Password must be at least 6 characters." };
  if (!ALLOWED_ROLES.includes(role)) return { ok: false, message: "Invalid role." };

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.companyId, COMPANY_ID), eq(users.email, email)))
    .limit(1);
  if (existing) return { ok: false, message: "A user with that email already exists." };

  try {
    await db.insert(users).values({
      companyId: COMPANY_ID,
      email,
      name,
      passwordHash: await hashPassword(password),
      role,
      isActive: true,
    });
  } catch (e) {
    return { ok: false, message: `Could not create user: ${e instanceof Error ? e.message : "error"}` };
  }
  revalidatePath("/admin/users");
  return { ok: true, message: `User ${email} created.` };
}

export async function deleteUser(id: number) {
  const admin = await requireAdmin();
  if (id === admin.userId) return; // never delete yourself

  // Don't remove the last active administrator.
  const [row] = await db.select({ role: users.role }).from(users).where(eq(users.id, id)).limit(1);
  if (row?.role === "admin") {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.companyId, COMPANY_ID), eq(users.role, "admin"), eq(users.isActive, true), ne(users.id, id)));
    if ((n ?? 0) === 0) return; // would leave no admin
  }

  await db.delete(users).where(and(eq(users.id, id), eq(users.companyId, COMPANY_ID)));
  revalidatePath("/admin/users");
}
