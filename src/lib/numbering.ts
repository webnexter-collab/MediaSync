import { and, eq, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { numberSequences } from "@/db/schema";

/**
 * Allocate the next gap-free number for a document type.
 *
 * Run this INSIDE the same transaction that inserts the document, so a failed
 * insert rolls the number back and no gaps appear:
 *
 *   await db.transaction(async (tx) => {
 *     const number = await nextNumber(tx, { companyId, kind: "invoice", ... });
 *     await tx.insert(documents).values({ ..., number });
 *   });
 *
 * The UPDATE ... RETURNING takes a row lock, so concurrent callers serialise
 * and never receive the same number.
 */
export interface NextNumberArgs {
  companyId: number;
  branchId?: number | null;
  kind: string; // "invoice" | "quotation" | "delivery_note" | "purchase_order" | "receipt" | "payment"
  prefix: string; // "INV" | "QUO" | "DN" | "PO" | "RCP" | "PAY"
  year?: number; // defaults to current year
  padding?: number; // defaults to the sequence's stored padding, else 4
}

export async function nextNumber(
  tx: Parameters<Parameters<DB["transaction"]>[0]>[0] | DB,
  args: NextNumberArgs,
): Promise<string> {
  const year = args.year ?? new Date().getFullYear();
  const branchId = args.branchId ?? null;

  // Ensure the sequence row exists (idempotent).
  await tx
    .insert(numberSequences)
    .values({
      companyId: args.companyId,
      branchId,
      documentType: args.kind,
      year,
      prefix: args.prefix,
      lastNumber: 0,
      padding: args.padding ?? 4,
    })
    .onConflictDoNothing();

  // Atomically increment and read back.
  const [row] = await tx
    .update(numberSequences)
    .set({ lastNumber: sql`${numberSequences.lastNumber} + 1` })
    .where(
      and(
        eq(numberSequences.companyId, args.companyId),
        branchId === null
          ? sql`${numberSequences.branchId} is null`
          : eq(numberSequences.branchId, branchId),
        eq(numberSequences.documentType, args.kind),
        eq(numberSequences.year, year),
      ),
    )
    .returning({ last: numberSequences.lastNumber, padding: numberSequences.padding });

  const seq = String(row.last).padStart(row.padding ?? 4, "0");
  return `${args.prefix}-${year}-${seq}`;
}

/**
 * Booking Order number in Mindset's format: BO-MS-1001 (no year, sequence
 * starting at 1001). Run inside the insert transaction, like nextNumber.
 */
export async function nextBookingOrderNumber(
  tx: Parameters<Parameters<DB["transaction"]>[0]>[0] | DB,
  companyId: number,
  prefix = "BO-MS",
): Promise<string> {
  await tx
    .insert(numberSequences)
    .values({
      companyId,
      branchId: null,
      documentType: "booking_order",
      year: 0, // BO numbering is not year-scoped
      prefix,
      lastNumber: 0,
      padding: 0,
    })
    .onConflictDoNothing();

  const [row] = await tx
    .update(numberSequences)
    .set({ lastNumber: sql`${numberSequences.lastNumber} + 1` })
    .where(
      and(
        eq(numberSequences.companyId, companyId),
        sql`${numberSequences.branchId} is null`,
        eq(numberSequences.documentType, "booking_order"),
        eq(numberSequences.year, 0),
      ),
    )
    .returning({ last: numberSequences.lastNumber });

  return `${prefix}-${1000 + row.last}`;
}
