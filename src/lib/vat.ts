import { roundFils } from "./money";

/**
 * VAT is calculated PER LINE then summed — never on the invoice total at once,
 * or fils-level rounding will disagree with the FTA's expectation.
 */

export type TaxCategory =
  | "standard"
  | "zero_rated"
  | "exempt"
  | "out_of_scope"
  | "reverse_charge";

export interface LineInput {
  quantity: number; // may be fractional
  unitPriceFils: number;
  discountPercent?: number; // 0..100
  discountAmountFils?: number; // absolute, applied after % discount
  taxCategory: TaxCategory;
  vatRate: number; // e.g. 5 for 5%
}

export interface LineResult {
  lineSubtotalFils: number; // after discount, before VAT
  vatAmountFils: number;
  lineTotalFils: number;
}

export interface DocTotals {
  subtotalFils: number;
  discountTotalFils: number;
  vatTotalFils: number;
  grandTotalFils: number;
}

/** Zero-rated/exempt/out-of-scope charge no VAT regardless of rate. */
function effectiveRate(cat: TaxCategory, rate: number): number {
  if (cat === "standard" || cat === "reverse_charge") return rate;
  return 0;
}

export function computeLine(line: LineInput): LineResult & { grossFils: number } {
  const gross = roundFils(line.quantity * line.unitPriceFils);
  const pctDiscount = roundFils((gross * (line.discountPercent ?? 0)) / 100);
  const discount = pctDiscount + (line.discountAmountFils ?? 0);
  const lineSubtotalFils = Math.max(0, gross - discount);

  const rate = effectiveRate(line.taxCategory, line.vatRate);
  // reverse_charge: VAT is accounted by the buyer, so no VAT added to the total.
  const vatAmountFils =
    line.taxCategory === "reverse_charge"
      ? 0
      : roundFils((lineSubtotalFils * rate) / 100);

  return {
    grossFils: gross,
    lineSubtotalFils,
    vatAmountFils,
    lineTotalFils: lineSubtotalFils + vatAmountFils,
  };
}

export function computeTotals(lines: LineInput[]): {
  totals: DocTotals;
  lines: LineResult[];
} {
  let subtotalFils = 0;
  let discountTotalFils = 0;
  let vatTotalFils = 0;
  const results: LineResult[] = [];

  for (const line of lines) {
    const r = computeLine(line);
    const gross = r.grossFils;
    subtotalFils += gross;
    discountTotalFils += gross - r.lineSubtotalFils;
    vatTotalFils += r.vatAmountFils;
    results.push({
      lineSubtotalFils: r.lineSubtotalFils,
      vatAmountFils: r.vatAmountFils,
      lineTotalFils: r.lineTotalFils,
    });
  }

  const netSubtotal = subtotalFils - discountTotalFils;
  return {
    totals: {
      subtotalFils: netSubtotal,
      discountTotalFils,
      vatTotalFils,
      grandTotalFils: netSubtotal + vatTotalFils,
    },
    lines: results,
  };
}
