"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSession, hashPassword, verifyPassword } from "@/lib/auth";
import { isDemo } from "@/lib/session";
import type { FormState } from "@/lib/validators";

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) return { ok: false, message: "You must be signed in." };
  if (isDemo(session.role)) return { ok: false, message: "Demo accounts cannot change the password." };

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (next.length < 6) return { ok: false, message: "New password must be at least 6 characters." };
  if (next !== confirm) return { ok: false, message: "New password and confirmation do not match." };

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user || !user.passwordHash) return { ok: false, message: "Account not found." };

  const ok = await verifyPassword(current, user.passwordHash);
  if (!ok) return { ok: false, message: "Your current password is incorrect." };

  await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, session.userId));
  return { ok: true, message: "Password updated successfully." };
}
