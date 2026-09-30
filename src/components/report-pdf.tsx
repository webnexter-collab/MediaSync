import {
  Document, Page, Text, View, Image, StyleSheet, renderToBuffer,
} from "@react-pdf/renderer";
import { MINDSET_LOGO_DATA_URI } from "@/assets/mindset-logo";
import type { ReportDataset, Section, Cell } from "@/lib/report-datasets";

const INK = "#111112";
const MUTED = "#8a8a90";
const SOFT = "#3a3a3d";
const LINE = "#e2e0da";
const HEAD = "#f3f2ee";

const s = StyleSheet.create({
  page: { fontSize: 8, color: SOFT, fontFamily: "Helvetica", paddingBottom: 36 },
  top: { backgroundColor: INK, color: "#fff", paddingHorizontal: 28, paddingVertical: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logo: { height: 38, width: 38 },
  brand: { fontSize: 13, color: "#fff", fontFamily: "Helvetica-Bold" },
  brandSub: { fontSize: 7, color: "#bdbdc2", letterSpacing: 1, textTransform: "uppercase", marginTop: 2 },
  kicker: { fontSize: 7, letterSpacing: 2, color: "#bdbdc2", textTransform: "uppercase", textAlign: "right" },
  title: { fontSize: 13, color: "#fff", fontFamily: "Helvetica-Bold", textAlign: "right", marginTop: 2 },
  body: { paddingHorizontal: 28, paddingTop: 14 },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginBottom: 12 },
  metaItem: { fontSize: 8, color: MUTED },
  heading: { fontSize: 10, color: INK, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 5 },
  table: { borderWidth: 0.5, borderColor: LINE, borderRadius: 3 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: LINE },
  th: { backgroundColor: HEAD, color: INK, fontFamily: "Helvetica-Bold", fontSize: 7.5, padding: 4, textTransform: "uppercase" },
  td: { padding: 4, fontSize: 8, color: SOFT },
  totalRow: { flexDirection: "row", borderTopWidth: 1, borderColor: INK, backgroundColor: "#faf9f6" },
  totalCell: { padding: 4, fontSize: 8, color: INK, fontFamily: "Helvetica-Bold" },
  footer: { position: "absolute", bottom: 16, left: 28, right: 28, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: MUTED },
});

function fmt(cell: Cell, isMoney: boolean, isNumeric: boolean): string {
  if (typeof cell === "number") {
    if (isMoney) return cell.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (isNumeric) return cell.toLocaleString("en-US");
    return String(cell);
  }
  return cell ?? "";
}

/** Column widths: first (label) columns wider, numeric columns narrower. */
function widths(section: Section): number[] {
  return section.columns.map((_, i) => (section.numericCols.includes(i) ? 1 : 1.9));
}

function Table({ section }: { section: Section }) {
  const w = widths(section);
  return (
    <View style={s.table}>
      <View style={s.tr} wrap={false}>
        {section.columns.map((c, i) => (
          <Text key={i} style={[s.th, { flex: w[i], textAlign: section.numericCols.includes(i) ? "right" : "left" }]}>{c}</Text>
        ))}
      </View>
      {section.rows.map((row, ri) => (
        <View key={ri} style={s.tr} wrap={false}>
          {row.map((cell, ci) => (
            <Text key={ci} style={[s.td, { flex: w[ci], textAlign: section.numericCols.includes(ci) ? "right" : "left" }]}>
              {fmt(cell, section.moneyCols.includes(ci), section.numericCols.includes(ci))}
            </Text>
          ))}
        </View>
      ))}
      {section.totals && (
        <View style={s.totalRow} wrap={false}>
          {section.totals.map((cell, ci) => (
            <Text key={ci} style={[s.totalCell, { flex: w[ci], textAlign: section.numericCols.includes(ci) ? "right" : "left" }]}>
              {fmt(cell, section.moneyCols.includes(ci), section.numericCols.includes(ci))}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function ReportDoc({ data }: { data: ReportDataset }) {
  const wide = data.sections.some((sec) => sec.columns.length > 6);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Document title={`${data.title} — ${today}`}>
      <Page size="A4" orientation={wide ? "landscape" : "portrait"} style={s.page}>
        <View style={s.top} fixed>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Image style={s.logo} src={MINDSET_LOGO_DATA_URI} />
            <View>
              <Text style={s.brand}>Mindset Media</Text>
              <Text style={s.brandSub}>Cross-media Revenue</Text>
            </View>
          </View>
          <View>
            <Text style={s.kicker}>Report</Text>
            <Text style={s.title}>{data.title}</Text>
          </View>
        </View>

        <View style={s.body}>
          <View style={s.meta}>
            {data.meta.map((m, i) => <Text key={i} style={s.metaItem}>{m}</Text>)}
          </View>
          {data.sections.map((sec, i) => (
            <View key={i}>
              {sec.heading && <Text style={s.heading}>{sec.heading}</Text>}
              <Table section={sec} />
            </View>
          ))}
        </View>

        <View style={s.footer} fixed>
          <Text>Mindset Media — generated {today}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function renderReportPdf(data: ReportDataset): Promise<Buffer> {
  return renderToBuffer(<ReportDoc data={data} />);
}
