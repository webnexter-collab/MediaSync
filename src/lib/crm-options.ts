import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { customers, currencies } from "@/db/schema";
import type { AccountFormOptions } from "@/lib/form-fields";

const COMPANY_ID = 1;

/**
 * Options for the Account form: existing agencies/buying-houses (as possible
 * parents) and the active currencies. Falls back gracefully if the DB is down.
 */
export async function getAccountFormOptions(
  excludeId?: number,
): Promise<AccountFormOptions> {
  try {
    const agencyRows = await db
      .select({ id: customers.id, name: customers.name, code: customers.code })
      .from(customers)
      .where(
        and(
          eq(customers.companyId, COMPANY_ID),
          inArray(customers.accountType, ["agency", "buying_house"]),
        ),
      )
      .orderBy(asc(customers.name));

    const currencyRows = await db
      .select({ code: currencies.code, name: currencies.name })
      .from(currencies)
      .where(and(eq(currencies.companyId, COMPANY_ID), eq(currencies.isActive, true)))
      .orderBy(asc(currencies.code));

    return {
      agencies: agencyRows
        .filter((a) => a.id !== excludeId)
        .map((a) => ({ value: String(a.id), label: `${a.name} (${a.code})` })),
      currencies: (currencyRows.length
        ? currencyRows
        : [{ code: "AED", name: "UAE Dirham" }]
      ).map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` })),
    };
  } catch {
    return { agencies: [], currencies: [{ value: "AED", label: "AED" }] };
  }
}
