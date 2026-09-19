"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth";
import { signSession, SESSION_COOKIE, cookieOptions, type Role } from "@/lib/session";
import type { FormState } from "@/lib/validators";

const COMPANY_ID = 1;

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/") || "/";

  if (!email || !password) return { ok: false, message: "Enter your email and password." };

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.companyId, COMPANY_ID), eq(users.email, email)))
    .limit(1);

  const genericError: FormState = { ok: false, message: "Invalid email or password." };
  if (!user || !user.passwordHash || !user.isActive) return genericError;

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return genericError;

  const token = await signSession({
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions);

  redirect(next.startsWith("/") ? next : "/");
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
