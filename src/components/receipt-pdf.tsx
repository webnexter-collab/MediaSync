import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatFils } from "@/lib/money";

const NAVY = "#10233f";
const TEAL = "#0e7c86";
const MUTED = "#6b7280";
const LINE = "#d7dbe0";

export type ReceiptPdfData = {
  docTitle?: string;
  partyLabel?: string;
  amountLabel?: string;
  appliedLabel?: string;
  company: { name: string; trn?: string | null; address?: string | null };
  customer: { name: string };
  receipt: {
    number: string;
    paymentDate: string;
    method: string;
    reference?: string | null;
    amountFils: number;
    notes?: string | null;
  };
  allocations: { invoiceNumber: string | null; amountFils: number }[];
};

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9.5, color: "#1f2733", fontFamily: "Helvetica" },
  between: { flexDirection: "row", justifyContent: "space-between" },
  brand: { fontSize: 20, color: NAVY, fontFamily: "Helvetica-Bold" },
  title: { fontSize: 16, color: NAVY, fontFamily: "Helvetica-Bold", textAlign: "right" },
  muted: { color: MUTED },
  label: { color: MUTED, fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  section: { marginTop: 18 },
  amountBox: { marginTop: 16, borderWidth: 1, borderColor: NAVY, borderRadius: 6, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  amountBig: { fontSize: 18, color: NAVY, fontFamily: "Helvetica-Bold" },
  th: { flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1, borderColor: NAVY, paddingVertical: 5, fontFamily: "Helvetica-Bold", fontSize: 8, color: NAVY, textTransform: "uppercase" },
  td: { flexDirection: "row", paddingVertical: 5, borderBottomWidth: 0.5, borderColor: LINE },
  cInv: { flex: 1 },
  cAmt: { width: 120, textAlign: "right" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, borderTopWidth: 0.5, borderColor: LINE, paddingTop: 8 },
});

function ReceiptDocument({ data }: { data: ReceiptPdfData }) {
  const { company, customer, receipt, allocations } = data;
  const methodLabel: Record<string, string> = {
    cash: "Cash",
    bank_transfer: "Bank transfer",
    cheque: "Cheque",
    card: "Card",
    other: "Other",
  };
  return (
    <Document title={`Receipt ${receipt.number}`}>
      <Page size="A4" style={s.page}>
        <View style={s.between}>
          <View>
            <Text style={s.brand}>{company.name}</Text>
            {company.trn ? <Text style={s.muted}>TRN: {company.trn}</Text> : null}
            {company.address ? <Text style={s.muted}>{company.address}</Text> : null}
          </View>
          <View>
            <Text style={s.title}>{data.docTitle ?? "RECEIPT"}</Text>
            <Text style={[s.muted, { textAlign: "right", marginTop: 4 }]}>{receipt.number}</Text>
          </View>
        </View>

        <View style={[s.between, s.section]}>
          <View style={{ width: "48%" }}>
            <Text style={s.label}>{data.partyLabel ?? "Received from"}</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", color: NAVY }}>{customer.name}</Text>
          </View>
          <View style={{ width: "40%" }}>
            <View style={s.between}>
              <Text style={s.muted}>Date</Text>
              <Text>{receipt.paymentDate}</Text>
            </View>
            <View style={s.between}>
              <Text style={s.muted}>Method</Text>
              <Text>{methodLabel[receipt.method] ?? receipt.method}</Text>
            </View>
            {receipt.reference ? (
              <View style={s.between}>
                <Text style={s.muted}>Reference</Text>
                <Text>{receipt.reference}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={s.amountBox}>
          <Text style={s.label}>{data.amountLabel ?? "Amount received"}</Text>
          <Text style={s.amountBig}>{formatFils(receipt.amountFils)}</Text>
        </View>

        <View style={s.section}>
          <View style={s.th}>
            <Text style={s.cInv}>{data.appliedLabel ?? "Applied to invoice"}</Text>
            <Text style={s.cAmt}>Amount</Text>
          </View>
          {allocations.map((a, i) => (
            <View style={s.td} key={i}>
              <Text style={s.cInv}>{a.invoiceNumber ?? "—"}</Text>
              <Text style={s.cAmt}>{formatFils(a.amountFils, { withSymbol: false })}</Text>
            </View>
          ))}
        </View>

        {receipt.notes ? (
          <View style={s.section}>
            <Text style={s.label}>Notes</Text>
            <Text>{receipt.notes}</Text>
          </View>
        ) : null}

        <View style={s.footer}>
          <Text style={[s.muted, { color: TEAL }]}>
            {company.name}
            {company.trn ? ` · TRN ${company.trn}` : ""}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderReceiptPdf(data: ReceiptPdfData): Promise<Buffer> {
  return renderToBuffer(<ReceiptDocument data={data} />);
}
