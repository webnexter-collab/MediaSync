import { SignJWT, jwtVerify } from "jose";

export type Role = "admin" | "user" | "demo" | "accountant" | "sales" | "salesperson" | "viewer";

export type SessionUser = {
  userId: number;
  name: string;
  email: string;
  role: Role;
};

export const SESSION_COOKIE = "mediasync_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    // Dev fallback so local builds work; production MUST set AUTH_SECRET.
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is not set");
    }
    return new TextEncoder().encode("dev-insecure-secret-change-me-please-32b");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.userId !== "number" || typeof payload.email !== "string") return null;
    return {
      userId: payload.userId,
      name: String(payload.name ?? ""),
      email: payload.email,
      role: (payload.role as Role) ?? "demo",
    };
  } catch {
    return null;
  }
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

/* Role helpers */
export function isAdmin(role: Role | undefined): boolean {
  return role === "admin";
}
export function isDemo(role: Role | undefined): boolean {
  return role === "demo";
}
export function canWrite(role: Role | undefined): boolean {
  return role === "admin" || role === "user" || role === "accountant" || role === "sales" || role === "salesperson";
}
/**
 * Who may approve a Booking Order (stands in for the Account Group Manager until
 * full RBAC lands). Sales/salespeople can submit for approval but not approve.
 */
export function canApprove(role: Role | undefined): boolean {
  return role === "admin" || role === "user" || role === "accountant";
}

/**
 * The restricted Sales (salesperson) group — sees only their own bookings,
 * proformas and targets, no finance/admin. `salesperson` is the retired legacy
 * value kept so any un-migrated token still behaves as restricted.
 */
export function isSalesperson(role: Role | undefined): boolean {
  return role === "sales" || role === "salesperson";
}
/** Finance surfaces (bank & cash, cash dashboard) are limited to these roles. */
export function canSeeFinance(role: Role | undefined): boolean {
  return role === "admin" || role === "accountant";
}
/** Company configuration / masters are admin-only. */
export function canManageConfig(role: Role | undefined): boolean {
  return role === "admin";
}
/** Who may SET salesperson targets — Administrators and Accounts only. */
export function canManageTargets(role: Role | undefined): boolean {
  return role === "admin" || role === "accountant";
}
