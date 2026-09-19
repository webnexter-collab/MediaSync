import { sql, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { customers, suppliers, items } from "@/db/schema";

const COMPANY_ID = 1;

/** Next code like CUST-0004 based on the highest existing numeric suffix (gap-tolerant, collision-safe). */
export async function nextCustomerCode(): Promise<string> {
  return nextCode(customers, "CUST");
}
export async function nextSupplierCode(): Promise<string> {
  return nextCode(suppliers, "SUPP");
}
export async function nextItemCode(): Promise<string> {
  return nextCode(items, "ITM");
}

async function nextCode(
  table: typeof customers | typeof suppliers | typeof items,
  prefix: string,
): Promise<string> {
  try {
    const [row] = await db
      .select({
        maxNum: sql<number>`coalesce(max(nullif(regexp_replace(${table.code}, '[^0-9]', '', 'g'), '')::int), 0)`,
      })
      .from(table)
      .where(and(eq(table.companyId, COMPANY_ID)));
    const next = Number(row?.maxNum ?? 0) + 1;
    return `${prefix}-${String(next).padStart(4, "0")}`;
  } catch {
    return `${prefix}-0001`;
  }
}
