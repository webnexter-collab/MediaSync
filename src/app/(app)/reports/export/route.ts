import { getSession } from "@/lib/auth";
import { isSalesperson } from "@/lib/session";
import { salespersonIdForEmail } from "@/lib/scope";
import { buildReportDataset, type ReportParams } from "@/lib/report-datasets";
import { renderReportPdf } from "@/components/report-pdf";
import { buildReportWorkbook } from "@/lib/report-xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "report";
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role === "demo") return new Response("Not allowed in demo mode", { status: 403 });

  const url = new URL(req.url);
  const g = (k: string) => url.searchParams.get(k) ?? undefined;
  const format = (g("format") ?? "pdf").toLowerCase();
  const params: ReportParams = {
    report: g("report") ?? "monthly",
    bu: g("bu"), year: g("year"), month: g("month"), currency: g("currency"),
    status: g("status"), q: g("q"), dim: g("dim"), measure: g("measure"),
  };

  // A Sales (salesperson) user may only export their own target-vs-sales report.
  if (isSalesperson(session.role)) {
    params.report = "sales";
    params.salespersonId = await salespersonIdForEmail(session.email);
  }

  let data;
  try {
    data = await buildReportDataset(params);
  } catch (e) {
    return new Response(`Could not build report: ${e instanceof Error ? e.message : "error"}`, { status: 500 });
  }

  const date = new Date().toISOString().slice(0, 10);
  const filename = `${slug(data.title)}-${date}`;

  if (format === "xlsx" || format === "excel") {
    const buf = await buildReportWorkbook(data);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const buf = await renderReportPdf(data);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
