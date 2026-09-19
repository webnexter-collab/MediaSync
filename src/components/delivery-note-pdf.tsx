import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const NAVY = "#10233f";
const TEAL = "#0e7c86";
const MUTED = "#6b7280";
const LINE = "#d7dbe0";

export type DeliveryPdfData = {
  company: { name: string; trn?: string | null; address?: string | null; email?: string | null };
  customer: { name: string; address?: string | null };
  note: { number: string; issueDate: string; reference?: string | null; notes?: string | null };
  lines: { description: string; quantity: string }[];
};

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9.5, color: "#1f2733", fontFamily: "Helvetica" },
  between: { flexDirection: "row", justifyContent: "space-between" },
  brand: { fontSize: 20, color: NAVY, fontFamily: "Helvetica-Bold" },
  title: { fontSize: 16, color: NAVY, fontFamily: "Helvetica-Bold", textAlign: "right" },
  muted: { color: MUTED },
  label: { color: MUTED, fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  section: { marginTop: 18 },
  th: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: NAVY,
    paddingVertical: 5,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: NAVY,
    textTransform: "uppercase",
  },
  td: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 0.5, borderColor: LINE },
  cNo: { width: 30 },
  cDesc: { flex: 1, paddingRight: 6 },
  cQty: { width: 70, textAlign: "right" },
  sign: { flexDirection: "row", justifyContent: "space-between", marginTop: 50 },
  signBox: { width: "45%" },
  signLine: { borderTopWidth: 0.7, borderColor: "#9aa3ad", marginTop: 34, paddingTop: 4 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, borderTopWidth: 0.5, borderColor: LINE, paddingTop: 8 },
});

function DeliveryDocument({ data }: { data: DeliveryPdfData }) {
  const { company, customer, note, lines } = data;
  return (
    <Document title={`Delivery Note ${note.number}`}>
      <Page size="A4" style={s.page}>
        <View style={s.between}>
          <View>
            <Text style={s.brand}>{company.name}</Text>
            {company.trn ? <Text style={s.muted}>TRN: {company.trn}</Text> : null}
            {company.address ? <Text style={s.muted}>{company.address}</Text> : null}
          </View>
          <View>
            <Text style={s.title}>DELIVERY NOTE</Text>
            <Text style={[s.muted, { textAlign: "right", marginTop: 4 }]}>{note.number}</Text>
          </View>
        </View>

        <View style={[s.between, s.section]}>
          <View style={{ width: "48%" }}>
            <Text style={s.label}>Deliver to</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", color: NAVY }}>{customer.name}</Text>
            {customer.address ? <Text style={s.muted}>{customer.address}</Text> : null}
          </View>
          <View style={{ width: "40%" }}>
            <View style={s.between}>
              <Text style={s.muted}>Delivery date</Text>
              <Text>{note.issueDate}</Text>
            </View>
            {note.reference ? (
              <View style={s.between}>
                <Text style={s.muted}>Reference</Text>
                <Text>{note.reference}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={s.section}>
          <View style={s.th}>
            <Text style={s.cNo}>#</Text>
            <Text style={s.cDesc}>Description of goods</Text>
            <Text style={s.cQty}>Qty</Text>
          </View>
          {lines.map((l, i) => (
            <View style={s.td} key={i}>
              <Text style={s.cNo}>{i + 1}</Text>
              <Text style={s.cDesc}>{l.description}</Text>
              <Text style={s.cQty}>{l.quantity}</Text>
            </View>
          ))}
        </View>

        {note.notes ? (
          <View style={s.section}>
            <Text style={s.label}>Notes</Text>
            <Text>{note.notes}</Text>
          </View>
        ) : null}

        <View style={s.sign}>
          <View style={s.signBox}>
            <Text style={s.label}>Delivered by</Text>
            <Text style={s.signLine}>Name / Signature / Date</Text>
          </View>
          <View style={s.signBox}>
            <Text style={s.label}>Received in good condition</Text>
            <Text style={s.signLine}>Name / Signature / Date</Text>
          </View>
        </View>

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

export async function renderDeliveryPdf(data: DeliveryPdfData): Promise<Buffer> {
  return renderToBuffer(<DeliveryDocument data={data} />);
}
