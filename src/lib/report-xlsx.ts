import "server-only";
import ExcelJS from "exceljs";
import { MINDSET_LOGO_DATA_URI } from "@/assets/mindset-logo";
import type { ReportDataset, Section } from "@/lib/report-datasets";

const INK = "FF111112";
const HEAD = "FFF3F2EE";

function sanitizeSheetName(name: string, used: Set<string>): string {
  let base = name.replace(/[\[\]\*\?\/\\:]/g, " ").trim().slice(0, 28) || "Sheet";
  let candidate = base;
  let n = 2;
  while (used.has(candidate.toLowerCase())) candidate = `${base.slice(0, 25)} ${n++}`;
  used.add(candidate.toLowerCase());
  return candidate;
}

export async function buildReportWorkbook(data: ReportDataset): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "MindSet Media — MediaSync";
  wb.created = new Date();

  let logoId: number | undefined;
  try {
    const b64 = MINDSET_LOGO_DATA_URI.split(",")[1];
    if (b64) logoId = wb.addImage({ base64: b64, extension: "png" });
  } catch {
    logoId = undefined;
  }

  const used = new Set<string>();
  data.sections.forEach((section, idx) => {
    const sheetName = sanitizeSheetName(section.heading ?? data.title ?? `Sheet ${idx + 1}`, used);
    const ws = wb.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: 6 }] });

    if (logoId !== undefined) {
      ws.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 90, height: 34 } });
    }
    // Title block (leave room beside the logo)
    ws.mergeCells(1, 2, 1, Math.max(3, section.columns.length));
    const titleCell = ws.getCell(1, 2);
    titleCell.value = `Mindset Media — ${data.title}`;
    titleCell.font = { bold: true, size: 14 };
    ws.mergeCells(2, 2, 2, Math.max(3, section.columns.length));
    ws.getCell(2, 2).value = section.heading ?? data.subtitle;
    ws.getCell(2, 2).font = { color: { argb: "FF8A8A90" }, size: 10 };
    // Meta lines on rows 3-4
    ws.mergeCells(3, 2, 3, Math.max(3, section.columns.length));
    ws.getCell(3, 2).value = data.meta.join("     ·     ");
    ws.getCell(3, 2).font = { color: { argb: "FF8A8A90" }, size: 9 };

    const headerRowIdx = 6;
    const header = ws.getRow(headerRowIdx);
    section.columns.forEach((c, i) => {
      const cell = header.getCell(i + 1);
      cell.value = c;
      cell.font = { bold: true, color: { argb: INK } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEAD } };
      cell.alignment = { horizontal: section.numericCols.includes(i) ? "right" : "left" };
      cell.border = { bottom: { style: "thin", color: { argb: "FFE2E0DA" } } };
    });

    section.rows.forEach((row) => {
      const r = ws.addRow(row);
      applyRowFormat(r, section);
    });

    if (section.totals) {
      const r = ws.addRow(section.totals);
      applyRowFormat(r, section);
      r.eachCell((cell) => { cell.font = { bold: true }; cell.border = { top: { style: "thin", color: { argb: INK } } }; });
    }

    // Column widths
    section.columns.forEach((c, i) => {
      const isNum = section.numericCols.includes(i);
      const maxLen = Math.max(c.length, ...section.rows.map((row) => String(row[i] ?? "").length));
      ws.getColumn(i + 1).width = Math.min(isNum ? 16 : 40, Math.max(10, maxLen + 2));
    });
  });

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

/** A single billing document (proforma / invoice) as a one-sheet workbook. */
export async function buildDocumentWorkbook(input: {
  docLabel: string;
  number: string;
  issueDate: string;
  reference?: string | null;
  currency: string;
  customerName: string;
  companyName: string;
  companyTrn?: string | null;
  lines: { description: string; quantity: number; unitPrice: number; vatLabel: string; lineTotal: number }[];
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Mindset Media — MediaSync";
  wb.created = new Date();
  const ws = wb.addWorksheet(input.docLabel.slice(0, 28) || "Document");

  try {
    const b64 = MINDSET_LOGO_DATA_URI.split(",")[1];
    if (b64) {
      const id = wb.addImage({ base64: b64, extension: "png" });
      ws.addImage(id, { tl: { col: 0, row: 0 }, ext: { width: 90, height: 34 } });
    }
  } catch { /* logo optional */ }

  ws.mergeCells("B1:F1");
  ws.getCell("B1").value = `${input.companyName} — ${input.docLabel}`;
  ws.getCell("B1").font = { bold: true, size: 14 };
  ws.mergeCells("B2:F2");
  ws.getCell("B2").value = [
    input.number,
    input.issueDate,
    input.reference ? `Ref: ${input.reference}` : null,
    `Bill to: ${input.customerName}`,
    input.companyTrn ? `TRN: ${input.companyTrn}` : null,
    `Currency: ${input.currency}`,
  ].filter(Boolean).join("     ·     ");
  ws.getCell("B2").font = { color: { argb: "FF8A8A90" }, size: 9 };

  const headerRow = 4;
  const cols = ["Description", "Qty", `Unit (${input.currency})`, "VAT", `Line Total (${input.currency})`];
  cols.forEach((c, i) => {
    const cell = ws.getCell(headerRow, i + 1);
    cell.value = c;
    cell.font = { bold: true, color: { argb: INK } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEAD } };
    cell.alignment = { horizontal: i === 0 || i === 3 ? "left" : "right" };
  });

  input.lines.forEach((l) => {
    const r = ws.addRow([l.description, l.quantity, l.unitPrice, l.vatLabel, l.lineTotal]);
    r.getCell(2).numFmt = "#,##0";
    r.getCell(3).numFmt = "#,##0.00";
    r.getCell(5).numFmt = "#,##0.00";
    [2, 3, 5].forEach((c) => (r.getCell(c).alignment = { horizontal: "right" }));
  });

  ws.addRow([]);
  const totals: [string, number][] = [["Subtotal", input.subtotal], ["Discount", input.discount], ["VAT", input.vat], ["Total", input.total]];
  totals.forEach(([label, val], idx) => {
    const r = ws.addRow(["", "", "", label, val]);
    r.getCell(5).numFmt = "#,##0.00";
    r.getCell(5).alignment = { horizontal: "right" };
    if (idx === totals.length - 1) { r.getCell(4).font = { bold: true }; r.getCell(5).font = { bold: true }; }
  });

  ws.getColumn(1).width = 48;
  ws.getColumn(2).width = 10;
  ws.getColumn(3).width = 16;
  ws.getColumn(4).width = 10;
  ws.getColumn(5).width = 18;

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

function applyRowFormat(r: ExcelJS.Row, section: Section) {
  section.columns.forEach((_, i) => {
    const cell = r.getCell(i + 1);
    if (section.numericCols.includes(i)) {
      cell.alignment = { horizontal: "right" };
      if (typeof cell.value === "number") cell.numFmt = section.moneyCols.includes(i) ? "#,##0.00" : "#,##0";
    }
  });
}
