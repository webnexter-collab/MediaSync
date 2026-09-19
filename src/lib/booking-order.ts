/**
 * Booking Order money math. Pure + isomorphic (client form + server action share it).
 * All *Fils values are integer MINOR UNITS of the BO currency (2-decimal → ×100).
 *
 * Flat line model (matches Mindset's real BO):
 *   line gross = qty × unitGross
 *   line net   = qty × unitGross × (1 − discountPct/100)
 * Totals: gross → line discount → agency discount → net → VAT → grand total.
 */

export interface BoLineInput {
  quantity: number;
  unitGrossFils: number;
  discountPct: number; // 0..100
}

export interface BoLineResult {
  unitNetFils: number;
  lineGrossFils: number;
  lineNetFils: number;
}

export interface BoTotals {
  totalGrossFils: number;
  lineDiscountFils: number;
  agencyDiscountFils: number;
  totalNetFils: number;
  vatFils: number;
  grandTotalFils: number;
}

const r = Math.round;

export function computeBoLine(l: BoLineInput): BoLineResult {
  const disc = Math.min(100, Math.max(0, l.discountPct || 0));
  const unitNetFils = r(l.unitGrossFils * (1 - disc / 100));
  const lineGrossFils = r(l.quantity * l.unitGrossFils);
  const lineNetFils = r(l.quantity * unitNetFils);
  return { unitNetFils, lineGrossFils, lineNetFils };
}

export function computeBoTotals(
  lines: BoLineInput[],
  agencyDiscountPct: number,
  vatRatePct: number,
): { totals: BoTotals; lines: BoLineResult[] } {
  let totalGrossFils = 0;
  let totalNetBeforeAgencyFils = 0;
  const results: BoLineResult[] = [];

  for (const l of lines) {
    const res = computeBoLine(l);
    totalGrossFils += res.lineGrossFils;
    totalNetBeforeAgencyFils += res.lineNetFils;
    results.push(res);
  }

  const lineDiscountFils = totalGrossFils - totalNetBeforeAgencyFils;
  const agencyPct = Math.min(100, Math.max(0, agencyDiscountPct || 0));
  const agencyDiscountFils = r((totalNetBeforeAgencyFils * agencyPct) / 100);
  const totalNetFils = totalNetBeforeAgencyFils - agencyDiscountFils;
  const vatFils = r((totalNetFils * (vatRatePct || 0)) / 100);
  const grandTotalFils = totalNetFils + vatFils;

  return {
    totals: {
      totalGrossFils,
      lineDiscountFils,
      agencyDiscountFils,
      totalNetFils,
      vatFils,
      grandTotalFils,
    },
    lines: results,
  };
}
