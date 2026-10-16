import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { salespeople } from "@/db/schema";

/**
 * Resolve the salesperson record for a login by matching email (per the
 * agreed "match by email" scoping). Returns null when there's no match.
 */
export async function salespersonIdForEmail(email: string | undefined, companyId = 1): Promise<number | null> {
  if (!email) return null;
  try {
    const [row] = await db
      .select({ id: salespeople.id })
      .from(salespeople)
      .where(and(eq(salespeople.companyId, companyId), eq(salespeople.email, email)))
      .limit(1);
    return row?.id ?? null;
  } catch {
    return null;
  }
}
