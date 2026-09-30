import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { customers, currencies, suppliers, mediaChannels, rateCards, rateCardItems, uoms, businessUnits, salespeople, industries } from "@/db/schema";
import type { AccountFormOptions } from "@/lib/form-fields";

const COMPANY_ID = 1;

/** All the dropdown data the Booking Order builder needs. */
export async function getBookingOrderFormOptions() {
  try {
    const [vendors, accounts, curr, channels, units, sales, inds] = await Promise.all([
      db.select({ id: suppliers.id, code: suppliers.code, name: suppliers.name })
        .from(suppliers).where(and(eq(suppliers.companyId, COMPANY_ID), eq(suppliers.isActive, true)))
        .orderBy(asc(suppliers.name)),
      db.select({ id: customers.id, code: customers.code, name: customers.name, accountType: customers.accountType, currency: customers.currency })
        .from(customers).where(and(eq(customers.companyId, COMPANY_ID), eq(customers.isActive, true)))
        .orderBy(asc(customers.name)),
      db.select({ code: currencies.code, name: currencies.name })
        .from(currencies).where(and(eq(currencies.companyId, COMPANY_ID), eq(currencies.isActive, true)))
        .orderBy(asc(currencies.code)),
      db.select({ id: mediaChannels.id, name: mediaChannels.name, mediaType: mediaChannels.mediaType })
        .from(mediaChannels).where(and(eq(mediaChannels.companyId, COMPANY_ID), eq(mediaChannels.isActive, true)))
        .orderBy(asc(mediaChannels.name)),
      db.select({ id: businessUnits.id, name: businessUnits.name, code: businessUnits.code, defaultCurrency: businessUnits.defaultCurrency })
        .from(businessUnits).where(and(eq(businessUnits.companyId, COMPANY_ID), eq(businessUnits.isActive, true)))
        .orderBy(asc(businessUnits.sortOrder), asc(businessUnits.name)),
      db.select({ id: salespeople.id, name: salespeople.name, businessUnitId: salespeople.businessUnitId })
        .from(salespeople).where(and(eq(salespeople.companyId, COMPANY_ID), eq(salespeople.isActive, true)))
        .orderBy(asc(salespeople.name)),
      db.select({ id: industries.id, name: industries.name })
        .from(industries).where(and(eq(industries.companyId, COMPANY_ID), eq(industries.isActive, true)))
        .orderBy(asc(industries.name)),
    ]);

    const uomRows = await db
      .select({ name: uoms.name })
      .from(uoms)
      .where(and(eq(uoms.companyId, COMPANY_ID), eq(uoms.isActive, true)))
      .orderBy(asc(uoms.sortOrder), asc(uoms.name));

    const rateRows = await db
      .select({
        id: rateCardItems.id, mediaType: rateCardItems.mediaType, platform: rateCardItems.platform,
        particulars: rateCardItems.particulars, brandingDetails: rateCardItems.brandingDetails,
        uom: rateCardItems.uom, unitGrossFils: rateCardItems.unitGrossFils, channelId: rateCardItems.channelId,
        defaultDiscountPct: rateCardItems.defaultDiscountPct, cardName: rateCards.name, cardCurrency: rateCards.currency,
      })
      .from(rateCardItems)
      .innerJoin(rateCards, eq(rateCardItems.rateCardId, rateCards.id))
      .where(and(eq(rateCards.companyId, COMPANY_ID), eq(rateCards.isActive, true), eq(rateCardItems.isActive, true)))
      .orderBy(asc(rateCards.name), asc(rateCardItems.sortOrder));

    const rateItems = rateRows.map((r) => ({
      id: r.id,
      label: `${r.cardName} — ${r.particulars || r.platform || "item"} (${r.cardCurrency} ${(r.unitGrossFils / 100).toLocaleString("en-AE", { minimumFractionDigits: 2 })})`,
      mediaType: r.mediaType,
      channelId: r.channelId,
      platform: r.platform ?? "",
      particulars: r.particulars ?? "",
      brandingDetails: r.brandingDetails ?? "",
      uom: r.uom ?? "",
      unitGross: String(r.unitGrossFils / 100),
      discountPct: String(Number(r.defaultDiscountPct)),
    }));

    return {
      vendors,
      accounts,
      currencies: curr.length ? curr : [{ code: "AED", name: "UAE Dirham" }],
      channels,
      rateItems,
      uoms: uomRows.map((u) => u.name),
      businessUnits: units,
      salespeople: sales,
      industries: inds,
    };
  } catch {
    return {
      vendors: [], accounts: [], currencies: [{ code: "AED", name: "UAE Dirham" }],
      channels: [], rateItems: [], uoms: [] as string[],
      businessUnits: [] as { id: number; name: string; code: string; defaultCurrency: string }[],
      salespeople: [] as { id: number; name: string; businessUnitId: number | null }[],
      industries: [] as { id: number; name: string }[],
    };
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
