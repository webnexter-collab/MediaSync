/**
 * MONEY: everything is stored and calculated in integer fils (1 AED = 100 fils).
 * Never use floats for money. Convert to/from AED only at the edges (UI + input).
 */

/** Parse a user-entered AED string/number into integer fils. "1,250.50" -> 125050 */
export function toFils(input: string | number): number {
  if (typeof input === "number") return Math.round(input * 100);
  const cleaned = input.replace(/[^0-9.-]/g, "").trim();
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return 0;
  return Math.round(parseFloat(cleaned) * 100);
}

/** Fils -> AED number (for arithmetic display only). 125050 -> 1250.5 */
export function toAed(fils: number): number {
  return fils / 100;
}

/** Format fils as an AED string. 125050 -> "AED 1,250.50" */
export function formatFils(
  fils: number,
  opts: { currency?: string; withSymbol?: boolean } = {},
): string {
  const { currency = "AED", withSymbol = true } = opts;
  const value = (fils / 100).toLocaleString("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return withSymbol ? `${currency} ${value}` : value;
}

/** Round a fractional fils amount to a whole fil (banker-safe half-up). */
export function roundFils(value: number): number {
  return Math.round(value);
}
