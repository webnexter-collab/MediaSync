/**
 * Booking-order line schedule (Annexure). Isomorphic — used by the form, the
 * view page and the PDF. The shape adapts to the media type:
 *   TV / Radio  → daily grid of spot counts for a month (+ time segment, position, copy duration)
 *   Print       → list of insertion dates
 *   Digital/Web → monthly quantities across a year
 *   Outdoor     → monthly (or yearly) quantities
 * Stored as JSON in booking_order_lines.annexure. Legacy value = array of day numbers.
 */
export type ScheduleGran = "daily" | "monthly" | "yearly" | "dates";

export type LineSchedule = {
  gran: ScheduleGran;
  month?: string; // YYYY-MM (daily)
  year?: number; // (monthly) / first year (yearly)
  cells?: Record<string, number>; // daily: "1".."31", monthly: "1".."12", yearly: "2026"…
  dates?: string[]; // YYYY-MM-DD (dates)
  segment?: string;
  position?: string;
  duration?: string;
};

export const GRAN_LABEL: Record<ScheduleGran, string> = {
  daily: "Daily", monthly: "Monthly", yearly: "Yearly", dates: "Specific dates",
};
export const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function defaultGran(mediaType: string): ScheduleGran {
  if (mediaType === "tv" || mediaType === "radio") return "daily";
  if (mediaType === "print") return "dates";
  return "monthly"; // digital, website, outdoor
}

/** Labels for the three free-text spec fields, per media type. */
export function specLabels(mediaType: string): { segment: string; position: string; duration: string } {
  switch (mediaType) {
    case "tv":
    case "radio":
      return { segment: "Time segment", position: "Position", duration: "Copy duration" };
    case "print":
      return { segment: "Section / page", position: "Position", duration: "Size" };
    case "outdoor":
      return { segment: "Location / site", position: "Face / side", duration: "Size" };
    default:
      return { segment: "Placement", position: "Format", duration: "Targeting" };
  }
}

export function emptySchedule(mediaType: string, today = new Date()): LineSchedule {
  const gran = defaultGran(mediaType);
  return {
    gran,
    month: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`,
    year: today.getFullYear(),
    cells: {},
    dates: [],
  };
}

export function parseSchedule(json: string | null | undefined, mediaType = "digital"): LineSchedule {
  try {
    const v = JSON.parse(json ?? "null");
    if (Array.isArray(v)) {
      // Legacy: plain list of day numbers.
      const cells: Record<string, number> = {};
      for (const d of v) if (typeof d === "number") cells[String(d)] = 1;
      return { ...emptySchedule(mediaType), gran: "daily", cells };
    }
    if (v && typeof v === "object" && typeof v.gran === "string") {
      return { ...emptySchedule(mediaType), ...v, cells: v.cells ?? {}, dates: v.dates ?? [] };
    }
  } catch {
    /* fall through */
  }
  return emptySchedule(mediaType);
}

export function daysInMonth(month: string | undefined): number {
  const [y, m] = (month ?? "").split("-").map(Number);
  if (!y || !m) return 31;
  return new Date(y, m, 0).getDate();
}

/** Column keys + labels for the grid of the given granularity. */
export function scheduleColumns(s: LineSchedule): { key: string; label: string; sub?: string }[] {
  if (s.gran === "daily") {
    const [y, m] = (s.month ?? "").split("-").map(Number);
    const n = daysInMonth(s.month);
    return Array.from({ length: n }, (_, i) => {
      const d = i + 1;
      const wd = y && m ? "SMTWTFS"[new Date(y, m - 1, d).getDay()] : undefined;
      return { key: String(d), label: String(d), sub: wd };
    });
  }
  if (s.gran === "monthly") return MONTH_SHORT.map((label, i) => ({ key: String(i + 1), label }));
  if (s.gran === "yearly") {
    const base = s.year ?? new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => ({ key: String(base + i), label: String(base + i) }));
  }
  return [];
}

export function scheduleTotal(s: LineSchedule): number {
  if (s.gran === "dates") return (s.dates ?? []).filter(Boolean).length;
  const keys = new Set(scheduleColumns(s).map((c) => c.key));
  return Object.entries(s.cells ?? {}).reduce((sum, [k, v]) => sum + (keys.has(k) ? Number(v) || 0 : 0), 0);
}

export function scheduleIsEmpty(s: LineSchedule): boolean {
  return scheduleTotal(s) === 0 && !s.segment && !s.position && !s.duration;
}

/** One-line human summary, e.g. "Daily · Oct 2026 · 17 spots". */
export function scheduleSummary(s: LineSchedule): string {
  const total = scheduleTotal(s);
  if (s.gran === "dates") return total ? `${total} date${total === 1 ? "" : "s"}: ${(s.dates ?? []).filter(Boolean).join(", ")}` : "";
  if (!total) return "";
  let period = "";
  if (s.gran === "daily" && s.month) {
    const [y, m] = s.month.split("-").map(Number);
    period = `${MONTH_SHORT[m - 1]} ${y}`;
  } else if (s.gran === "monthly") period = String(s.year ?? "");
  return [GRAN_LABEL[s.gran], period, `total ${total}`].filter(Boolean).join(" · ");
}
