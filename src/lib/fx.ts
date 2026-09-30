import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { fxRates } from "@/db/schema";

/**
 * Latest FX rate that converts 1 unit of `currency` into the base currency (AED).
 * Captured onto documents at creation so their reported value is frozen at the
 * rate that applied when the booking was made. Returns "1" for AED / unknown.
 */
export async function getRateToBase(currency: string, companyId = 1): Promise<string> {
  if (!currency || currency === "AED") return "1";
  try {
    const [row] = await db
      .select({ rate: fxRates.rateToBase })
      .from(fxRates)
      .where(and(eq(fxRates.companyId, companyId), eq(fxRates.currencyCode, currency)))
      .orderBy(desc(fxRates.asOfDate))
      .limit(1);
    return row?.rate ?? "1";
  } catch {
    return "1";
  }
}
