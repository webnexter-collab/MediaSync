import { and, eq, or, gt, sql, asc } from "drizzle-orm";
import { db } from "@/db";
import { documents, customers, suppliers, payments, paymentAllocations } from "@/db/schema";

const COMPANY_ID = 1;

export type Bucket = "current" | "b1_30" | "b31_60" | "b61_90" | "b90";
export const BUCKET_KEYS: Bucket[] = ["current", "b1_30", "b31_60", "b61_90", "b90"];
export const BUCKET_LABELS: Record<Bucket, string> = {
  current: "Current",
  b1_30: "1–30 days",
  b31_60: "31–60 days",
  b61_90: "61–90 days",
  b90: "90+ days",
};

export function bucketFor(refDate: string, now = new Date()): Bucket {
  const ref = new Date(refDate + "T00:00:00Z");
  const days = Math.floor((now.getTime() - ref.getTime()) / 86_400_000);
  if (days <= 0) return "current";
  if (days <= 30) return "b1_30";
  if (days <= 60) return "b31_60";
  if (days <= 90) return "b61_90";
  return "b90";
}

export type AgingRow = {
  partyId: number;
  partyName: string;
  buckets: Record<Bucket, number>;
  total: number;
};

type AgingConfig = {
  docType: "invoice" | "purchase_order";
};

async function buildAging({ docType }: AgingConfig): Promise<{ rows: AgingRow[]; totals: Record<Bucket, number>; grand: number }> {
  const isInvoice = docType === "invoice";
  const partyTable = isInvoice ? customers : suppliers;
  const partyIdCol = isInvoice ? documents.customerId : documents.supplierId;

  const lines = await db
    .select({
      partyId: partyIdCol,
      partyName: partyTable.name,
      issueDate: documents.issueDate,
      dueDate: documents.dueDate,
      outstanding: sql<number>`(${documents.grandTotalFils} - ${documents.amountPaidFils})::bigint`,
    })
    .from(documents)
    .leftJoin(partyTable, eq(partyIdCol, partyTable.id))
    .where(
      and(
        eq(documents.companyId, COMPANY_ID),
        eq(documents.type, docType),
        or(eq(documents.status, "sent"), eq(documents.status, "partially_paid")),
        gt(sql`${documents.grandTotalFils} - ${documents.amountPaidFils}`, 0),
      ),
    );

  const map = new Map<number, AgingRow>();
  const totals: Record<Bucket, number> = { current: 0, b1_30: 0, b31_60: 0, b61_90: 0, b90: 0 };

  for (const l of lines) {
    if (l.partyId == null) continue;
    const amt = Number(l.outstanding);
    const bucket = bucketFor(l.dueDate ?? l.issueDate);
    let row = map.get(l.partyId);
    if (!row) {
      row = { partyId: l.partyId, partyName: l.partyName ?? "—", buckets: { current: 0, b1_30: 0, b31_60: 0, b61_90: 0, b90: 0 }, total: 0 };
      map.set(l.partyId, row);
    }
    row.buckets[bucket] += amt;
    row.total += amt;
    totals[bucket] += amt;
  }

  const rows = [...map.values()].sort((a, b) => b.total - a.total);
  const grand = rows.reduce((s, r) => s + r.total, 0);
  return { rows, totals, grand };
}

export const agedReceivables = () => buildAging({ docType: "invoice" });
export const agedPayables = () => buildAging({ docType: "purchase_order" });

/* ---------------- Statements ---------------- */

export type UnpaidRow = {
  id: number;
  number: string;
  issueDate: string;
  dueDate: string | null;
  grandTotalFils: number;
  amountPaidFils: number;
  outstandingFils: number;
};

export async function unpaidDocuments(partyType: "customer" | "supplier", partyId: number): Promise<UnpaidRow[]> {
  const isCust = partyType === "customer";
  const partyIdCol = isCust ? documents.customerId : documents.supplierId;
  const docType = isCust ? "invoice" : "purchase_order";
  const rows = await db
    .select({
      id: documents.id,
      number: documents.number,
      issueDate: documents.issueDate,
      dueDate: documents.dueDate,
      grandTotalFils: documents.grandTotalFils,
      amountPaidFils: documents.amountPaidFils,
    })
    .from(documents)
    .where(
      and(
        eq(documents.companyId, COMPANY_ID),
        eq(documents.type, docType),
        eq(partyIdCol, partyId),
        or(eq(documents.status, "sent"), eq(documents.status, "partially_paid")),
        gt(sql`${documents.grandTotalFils} - ${documents.amountPaidFils}`, 0),
      ),
    )
    .orderBy(asc(documents.issueDate));
  return rows.map((r) => ({ ...r, outstandingFils: r.grandTotalFils - r.amountPaidFils }));
}

export type TxnRow = {
  date: string;
  ref: string;
  type: "document" | "payment";
  description: string;
  debitFils: number; // increases what they owe / we owe
  creditFils: number; // reduces it
};

export async function statementTransactions(partyType: "customer" | "supplier", partyId: number): Promise<TxnRow[]> {
  const isCust = partyType === "customer";
  const partyIdCol = isCust ? documents.customerId : documents.supplierId;
  const docType = isCust ? "invoice" : "purchase_order";
  const direction = isCust ? "receipt" : "payment";
  const payPartyCol = isCust ? payments.customerId : payments.supplierId;

  const [docs, pays] = await Promise.all([
    db
      .select({ date: documents.issueDate, ref: documents.number, amount: documents.grandTotalFils })
      .from(documents)
      .where(and(eq(documents.companyId, COMPANY_ID), eq(documents.type, docType), eq(partyIdCol, partyId), sql`${documents.status} <> 'draft' and ${documents.status} <> 'cancelled'`)),
    db
      .select({ date: payments.paymentDate, ref: payments.number, amount: payments.amountFils })
      .from(payments)
      .where(and(eq(payments.companyId, COMPANY_ID), eq(payments.direction, direction), eq(payPartyCol, partyId))),
  ]);

  const txns: TxnRow[] = [
    ...docs.map((d) => ({ date: d.date, ref: d.ref, type: "document" as const, description: isCust ? "Invoice" : "Purchase order", debitFils: d.amount, creditFils: 0 })),
    ...pays.map((p) => ({ date: p.date, ref: p.ref, type: "payment" as const, description: isCust ? "Receipt" : "Payment", debitFils: 0, creditFils: p.amount })),
  ];
  txns.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.type === "document" ? -1 : 1));
  return txns;
}
