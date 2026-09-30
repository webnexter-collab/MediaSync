import {
  Document, Page, Text, View, Image, StyleSheet, renderToBuffer,
} from "@react-pdf/renderer";
import { formatFils } from "@/lib/money";
import { MINDSET_LOGO_DATA_URI } from "@/assets/mindset-logo";
import { BOOKING_ORDER_TERMS, BOOKING_ORDER_TERMS_INTRO } from "@/content/booking-order-terms";

const INK = "#111112";
const MUTED = "#8a8a90";
const SOFT = "#3a3a3d";
const LINE = "#e2e0da";

export type BookingOrderPdfData = {
  company: { name: string; legalName?: string | null; address?: string | null; trn?: string | null };
  bo: {
    number: string; issueDate: string; currency: string;
    toName?: string | null; advertiser?: string | null; agency?: string | null;
    client?: string | null; brand?: string | null; campaign?: string | null;
    medium?: string | null; paymentTerms?: string | null; status: string;
    totalGrossFils: number; lineDiscountFils: number; agencyDiscountFils: number;
    totalNetFils: number; vatFils: number; grandTotalFils: number; vatRatePct: string;
    notes?: string | null;
  };
  lines: {
    mediaLabel: string; platform?: string | null; particulars?: string | null;
    brandingDetails?: string | null; period?: string | null;
    quantity: string; uom?: string | null; unitGrossFils: number;
    discountPct: string; lineNetFils: number; days: number[];
  }[];
};

const DAY_NUMS = Array.from({ length: 31 }, (_, i) => i + 1);

const s = StyleSheet.create({
  page: { fontSize: 9, color: SOFT, fontFamily: "Helvetica", paddingBottom: 44 },
  // header
  top: { backgroundColor: INK, color: "#fff", paddingHorizontal: 34, paddingVertical: 20,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logo: { height: 44, width: 44 },
  kicker: { fontSize: 8, letterSpacing: 2, color: "#bdbdc2", textTransform: "uppercase", textAlign: "right" },
  title: { fontSize: 17, color: "#fff", fontFamily: "Helvetica-Bold", textAlign: "right", marginTop: 2 },
  no: { fontSize: 10, color: "#e9e9ec", textAlign: "right", marginTop: 5 },
  body: { paddingHorizontal: 34 },
  strip: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderColor: LINE },
  issuerNm: { fontSize: 11, color: INK, fontFamily: "Helvetica-Bold" },
  small: { color: MUTED, fontSize: 8, lineHeight: 1.5 },
  chips: { flexDirection: "row", flexWrap: "wrap", width: 250, justifyContent: "flex-end" },
  chip: { width: 120, marginBottom: 6, marginLeft: 8 },
  chipK: { fontSize: 7, letterSpacing: 1, color: MUTED, textTransform: "uppercase" },
  chipV: { fontSize: 10, color: INK, fontFamily: "Helvetica-Bold", marginTop: 1 },
  parties: { flexDirection: "row", flexWrap: "wrap", borderBottomWidth: 1, borderColor: LINE, paddingVertical: 4 },
  party: { width: "50%", paddingVertical: 8, paddingRight: 12 },
  pk: { fontSize: 7, letterSpacing: 1, color: MUTED, textTransform: "uppercase" },
  pv: { fontSize: 10, color: INK, marginTop: 2 },
  // table
  th: { flexDirection: "row", borderBottomWidth: 1.3, borderColor: INK, paddingTop: 12, paddingBottom: 5,
    fontFamily: "Helvetica-Bold", fontSize: 7, color: MUTED, textTransform: "uppercase" },
  td: { flexDirection: "row", paddingVertical: 7, borderBottomWidth: 0.5, borderColor: LINE },
  cNo: { width: 20 },
  cPlat: { width: 74, paddingRight: 4 },
  cPart: { flex: 1, paddingRight: 6 },
  cQty: { width: 30, textAlign: "right" },
  cUom: { width: 42, paddingLeft: 4 },
  cUnit: { width: 60, textAlign: "right" },
  cDisc: { width: 34, textAlign: "right" },
  cNet: { width: 62, textAlign: "right" },
  partTitle: { fontSize: 9.5, color: INK, fontFamily: "Helvetica-Bold" },
  desc: { fontSize: 8, color: SOFT, marginTop: 2, lineHeight: 1.45 },
  period: { fontSize: 7.5, color: MUTED, marginTop: 2 },
  tag: { fontSize: 7, color: "#fff", backgroundColor: INK, borderRadius: 2, paddingHorizontal: 4,
    paddingVertical: 1, marginTop: 3, alignSelf: "flex-start" },
  totals: { marginTop: 14, alignSelf: "flex-end", width: 240 },
  tr: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottomWidth: 0.5, borderColor: LINE },
  grand: { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: INK, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 9, marginTop: 8 },
  grandK: { color: "#c9c9cf", fontSize: 8, textTransform: "uppercase", letterSpacing: 1 },
  grandV: { color: "#fff", fontSize: 13, fontFamily: "Helvetica-Bold" },
  foot: { position: "absolute", bottom: 18, left: 34, right: 34, borderTopWidth: 0.5, borderColor: LINE,
    paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
  // T&C page (two-column, single page)
  tcHead: { backgroundColor: INK, color: "#fff", paddingHorizontal: 34, paddingVertical: 14,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tcIntro: { paddingHorizontal: 34, paddingTop: 10, paddingBottom: 2, fontSize: 7, color: SOFT, fontStyle: "italic" },
  tcCols: { paddingHorizontal: 30, paddingTop: 4, flexDirection: "row" },
  tcCol: { width: "50%", paddingHorizontal: 4 },
  tcSec: { marginBottom: 5 },
  tcH: { fontSize: 7, color: INK, fontFamily: "Helvetica-Bold", marginBottom: 1 },
  tcP: { fontSize: 5.8, color: SOFT, lineHeight: 1.3, marginBottom: 1 },
  // Annexure page
  anxHead: { backgroundColor: INK, color: "#fff", paddingHorizontal: 34, paddingVertical: 16,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  anxWrap: { paddingHorizontal: 18, paddingTop: 12 },
  anxRow: { flexDirection: "row", alignItems: "stretch", borderBottomWidth: 0.5, borderColor: LINE },
  anxHeadRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: INK, backgroundColor: "#f3f2ee" },
  anxSl: { width: 16, fontSize: 6, textAlign: "center", paddingVertical: 3 },
  anxPart: { width: 96, fontSize: 6.5, paddingVertical: 3, paddingRight: 3 },
  anxDay: { width: 13, fontSize: 5, textAlign: "center", paddingVertical: 3, borderLeftWidth: 0.5, borderColor: LINE },
  anxDayOn: { backgroundColor: INK, color: "#fff" },
  anxTot: { width: 26, fontSize: 6, textAlign: "center", paddingVertical: 3, borderLeftWidth: 0.5, borderColor: INK, fontFamily: "Helvetica-Bold" },
});

function money(fils: number) { return formatFils(fils, { withSymbol: false }); }

function Doc({ data }: { data: BookingOrderPdfData }) {
  const { company, bo, lines } = data;
  const addr = [company.legalName ?? company.name, company.address, company.trn ? `TRN: ${company.trn}` : null]
    .filter(Boolean);
  const partyRows: [string, string | null | undefined][] = [
    ["Medium", bo.toName],
    ["Agency", bo.agency],
    ["Client", bo.client],
    ["Campaign", bo.campaign],
  ];
  // Balance the T&C sections across two columns by cumulative length.
  const secLen = (sec: (typeof BOOKING_ORDER_TERMS)[number]) => sec.heading.length + sec.clauses.join(" ").length;
  const tcTotal = BOOKING_ORDER_TERMS.reduce((n, sec) => n + secLen(sec), 0);
  const tcLeft: typeof BOOKING_ORDER_TERMS = [];
  const tcRight: typeof BOOKING_ORDER_TERMS = [];
  let tcAcc = 0;
  for (const sec of BOOKING_ORDER_TERMS) {
    if (tcAcc < tcTotal / 2) { tcLeft.push(sec); tcAcc += secLen(sec); } else { tcRight.push(sec); }
  }
  return (
    <Document title={`Booking Order ${bo.number}`}>
      {/* PAGE 1 — BO */}
      <Page size="A4" style={s.page}>
        <View style={s.top}>
          <Image style={s.logo} src={MINDSET_LOGO_DATA_URI} />
          <View>
            <Text style={s.kicker}>Media Booking Order</Text>
            <Text style={s.title}>Booking Order</Text>
            <Text style={s.no}>{bo.number}</Text>
          </View>
        </View>

        <View style={s.body}>
          <View style={s.strip}>
            <View>
              <Text style={s.issuerNm}>{company.legalName ?? company.name}</Text>
              {addr.slice(1).map((l, i) => <Text key={i} style={s.small}>{l}</Text>)}
            </View>
            <View style={s.chips}>
              <View style={s.chip}><Text style={s.chipK}>Date</Text><Text style={s.chipV}>{bo.issueDate}</Text></View>
              <View style={s.chip}><Text style={s.chipK}>Currency</Text><Text style={s.chipV}>{bo.currency}</Text></View>
              <View style={s.chip}><Text style={s.chipK}>Campaign</Text><Text style={s.chipV}>{bo.campaign || "—"}</Text></View>
              <View style={s.chip}><Text style={s.chipK}>Payment Terms</Text><Text style={s.chipV}>{bo.paymentTerms || "—"}</Text></View>
            </View>
          </View>

          <View style={s.parties}>
            {partyRows.map(([k, v]) => (
              <View key={k} style={s.party}><Text style={s.pk}>{k}</Text><Text style={s.pv}>{v || "—"}</Text></View>
            ))}
          </View>

          {/* Lines */}
          <View style={s.th}>
            <Text style={s.cNo}>#</Text>
            <Text style={s.cPlat}>Platform</Text>
            <Text style={s.cPart}>Particulars & Branding</Text>
            <Text style={s.cQty}>Qty</Text>
            <Text style={s.cUom}>UOM</Text>
            <Text style={s.cUnit}>Unit Gross</Text>
            <Text style={s.cDisc}>Disc%</Text>
            <Text style={s.cNet}>Total Net</Text>
          </View>
          {lines.map((l, i) => (
            <View style={s.td} key={i} wrap={false}>
              <Text style={s.cNo}>{String(i + 1).padStart(2, "0")}</Text>
              <View style={s.cPlat}>
                <Text style={{ fontFamily: "Helvetica-Bold", color: INK }}>{l.platform || "—"}</Text>
                <Text style={s.tag}>{l.mediaLabel}</Text>
              </View>
              <View style={s.cPart}>
                <Text style={s.partTitle}>{l.particulars || "—"}</Text>
                {l.brandingDetails ? <Text style={s.desc}>{l.brandingDetails}</Text> : null}
                {l.period ? <Text style={s.period}>{l.period}</Text> : null}
              </View>
              <Text style={s.cQty}>{Number(l.quantity)}</Text>
              <Text style={s.cUom}>{l.uom || "—"}</Text>
              <Text style={s.cUnit}>{money(l.unitGrossFils)}</Text>
              <Text style={s.cDisc}>{Number(l.discountPct) || "—"}</Text>
              <Text style={s.cNet}>{money(l.lineNetFils)}</Text>
            </View>
          ))}

          {/* Totals */}
          <View style={s.totals}>
            <View style={s.tr}><Text style={{ color: MUTED }}>Total Gross Amount</Text><Text>{money(bo.totalGrossFils)}</Text></View>
            <View style={s.tr}><Text style={{ color: MUTED }}>Discount</Text><Text>{bo.lineDiscountFils ? `- ${money(bo.lineDiscountFils)}` : "—"}</Text></View>
            {bo.agencyDiscountFils ? (
              <View style={s.tr}><Text style={{ color: MUTED }}>Agency Discount</Text><Text>- {money(bo.agencyDiscountFils)}</Text></View>
            ) : null}
            <View style={s.tr}><Text style={{ color: MUTED }}>Total Net Amount</Text><Text>{money(bo.totalNetFils)}</Text></View>
            <View style={s.tr}><Text style={{ color: MUTED }}>VAT ({Number(bo.vatRatePct)}%)</Text><Text>{money(bo.vatFils)}</Text></View>
            <View style={s.grand}>
              <Text style={s.grandK}>Net Amount (incl. VAT)</Text>
              <Text style={s.grandV}>{bo.currency} {money(bo.grandTotalFils)}</Text>
            </View>
          </View>

          {bo.notes ? (
            <View style={{ marginTop: 16 }}>
              <Text style={s.pk}>Notes</Text>
              <Text style={{ fontSize: 8.5, color: SOFT, marginTop: 3 }}>{bo.notes}</Text>
            </View>
          ) : null}
        </View>

        <View style={s.foot} fixed>
          <Text style={s.small}>{company.legalName ?? company.name}{company.trn ? ` · TRN ${company.trn}` : ""}</Text>
          <Text style={s.small} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* PAGE 2 — ANNEXURE (day 1–31 schedule) */}
      <Page size="A4" style={s.page}>
        <View style={s.anxHead}>
          <Image style={s.logo} src={MINDSET_LOGO_DATA_URI} />
          <View>
            <Text style={s.kicker}>Annexure — Schedule</Text>
            <Text style={s.title}>Booking Schedule</Text>
            <Text style={s.no}>{bo.number}</Text>
          </View>
        </View>
        <View style={s.anxWrap}>
          <View style={s.anxHeadRow}>
            <Text style={s.anxSl}>#</Text>
            <Text style={s.anxPart}>Particulars</Text>
            {DAY_NUMS.map((d) => <Text key={d} style={s.anxDay}>{d}</Text>)}
            <Text style={s.anxTot}>Tot</Text>
          </View>
          {lines.map((l, i) => (
            <View key={i} style={s.anxRow} wrap={false}>
              <Text style={s.anxSl}>{String(i + 1).padStart(2, "0")}</Text>
              <Text style={s.anxPart}>{l.particulars || l.platform || "—"}</Text>
              {DAY_NUMS.map((d) => {
                const on = l.days.includes(d);
                return <Text key={d} style={on ? [s.anxDay, s.anxDayOn] : s.anxDay}>{on ? "X" : ""}</Text>;
              })}
              <Text style={s.anxTot}>{l.days.length}</Text>
            </View>
          ))}
        </View>
        <View style={{ paddingHorizontal: 34, paddingTop: 12 }}>
          <Text style={s.small}>Marked cells (X) indicate the days on which each line runs during the campaign month.</Text>
        </View>
        <View style={s.foot} fixed>
          <Text style={s.small}>{company.legalName ?? company.name}{company.trn ? ` · TRN ${company.trn}` : ""}</Text>
          <Text style={s.small} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* PAGE 3 — TERMS & CONDITIONS (single page, two columns) */}
      <Page size="A4" style={s.page}>
        <View style={s.tcHead}>
          <Image style={s.logo} src={MINDSET_LOGO_DATA_URI} />
          <View>
            <Text style={s.kicker}>Terms & Conditions</Text>
            <Text style={s.no}>{bo.number}</Text>
          </View>
        </View>
        <Text style={s.tcIntro}>{BOOKING_ORDER_TERMS_INTRO}</Text>
        <View style={s.tcCols}>
          <View style={s.tcCol}>
            {tcLeft.map((sec) => (
              <View key={sec.heading} style={s.tcSec} wrap={false}>
                <Text style={s.tcH}>{sec.heading}</Text>
                {sec.clauses.map((c, i) => <Text key={i} style={s.tcP}>{c}</Text>)}
              </View>
            ))}
          </View>
          <View style={s.tcCol}>
            {tcRight.map((sec) => (
              <View key={sec.heading} style={s.tcSec} wrap={false}>
                <Text style={s.tcH}>{sec.heading}</Text>
                {sec.clauses.map((c, i) => <Text key={i} style={s.tcP}>{c}</Text>)}
              </View>
            ))}
          </View>
        </View>
        <View style={s.foot} fixed>
          <Text style={s.small}>{company.legalName ?? company.name} · Dubai Media City, Dubai, UAE</Text>
          <Text style={s.small} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function renderBookingOrderPdf(data: BookingOrderPdfData): Promise<Buffer> {
  return renderToBuffer(<Doc data={data} />);
}
