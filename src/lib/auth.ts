import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import {
  SESSION_COOKIE,
  verifySessionToken,
  canWrite,
  isAdmin,
  isDemo,
  type SessionUser,
} from "@/lib/session";

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Returns the session or redirects to /login. Use in protected server components. */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Admin-only pages. */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireSession();
  if (!isAdmin(session.role)) redirect("/");
  return session;
}

/** Throw for any account that may not write (demo / viewer / no session). Use at the top of mutating actions. */
export async function assertCanWrite(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error("You must be signed in.");
  if (isDemo(session.role) || !canWrite(session.role)) {
    throw new Error("Demo accounts are read-only — saving is disabled.");
  }
  return session;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
