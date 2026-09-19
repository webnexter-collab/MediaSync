import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { customers, currencies, suppliers, mediaChannels } from "@/db/schema";
import type { AccountFormOptions } from "@/lib/form-fields";

const COMPANY_ID = 1;

/** All the dropdown data the Booking Order builder needs. */
export async function getBookingOrderFormOptions() {
  try {
    const [vendors, accounts, curr, channels] = await Promise.all([
      db.select({ id: suppliers.id, code: suppliers.code, name: suppliers.name })
        .from(suppliers).where(and(eq(suppliers.companyId, COMPANY_ID), eq(suppliers.isActive, true)))
        .orderBy(asc(suppliers.name)),
      db.select({ id: customers.id, code: customers.code, name: customers.name, accountType: customers.accountType })
        .from(customers).where(and(eq(customers.companyId, COMPANY_ID), eq(customers.isActive, true)))
        .orderBy(asc(customers.name)),
      db.select({ code: currencies.code, name: currencies.name })
        .from(currencies).where(and(eq(currencies.companyId, COMPANY_ID), eq(currencies.isActive, true)))
        .orderBy(asc(currencies.code)),
      db.select({ id: mediaChannels.id, name: mediaChannels.name, mediaType: mediaChannels.mediaType })
        .from(mediaChannels).where(and(eq(mediaChannels.companyId, COMPANY_ID), eq(mediaChannels.isActive, true)))
        .orderBy(asc(mediaChannels.name)),
    ]);
    return {
      vendors,
      accounts,
      currencies: curr.length ? curr : [{ code: "AED", name: "UAE Dirham" }],
      channels,
    };
  } catch {
    return { vendors: [], accounts: [], currencies: [{ code: "AED", name: "UAE Dirham" }], channels: [] };
  }
}

/** Active vendors (suppliers) as {value,label} options for the channel form. */
export async function getVendorOptions(): Promise<{ value: string; label: string }[]> {
  try {
    const rows = await db
      .select({ id: suppliers.id, name: suppliers.name, code: suppliers.code })
      .from(suppliers)
      .where(and(eq(suppliers.companyId, COMPANY_ID), eq(suppliers.isActive, true)))
      .orderBy(asc(suppliers.name));
    return rows.map((v) => ({ value: String(v.id), label: `${v.name} (${v.code})` }));
  } catch {
    return [];
  }
}

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
