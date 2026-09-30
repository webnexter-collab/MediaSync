import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { formatFils } from "@/lib/money";

const NAVY = "#10233f";
const TEAL = "#0e7c86";
const MUTED = "#6b7280";
const LINE = "#d7dbe0";

export type InvoicePdfData = {
  docTitle?: string;
  docFileTitle?: string;
  dueLabel?: string;
  partyHeading?: string;
  company: { name: string; trn?: string | null; address?: string | null; email?: string | null };
  customer: { name: string; trn?: string | null; address?: string | null };
  invoice: {
    number: string;
    issueDate: string;
    dueDate?: string | null;
    reference?: string | null;
    status: string;
    currency?: string;
    subtotalFils: number;
    discountTotalFils: number;
    vatTotalFils: number;
    grandTotalFils: number;
    notes?: string | null;
    terms?: string | null;
    paymentTerms?: string | null;
    bankDetails?: string | null;
  };
  lines: {
    description: string;
    quantity: string;
    unitPriceFils: number;
    vatLabel: string;
    lineSubtotalFils: number;
  }[];
};

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9.5, color: "#1f2733", fontFamily: "Helvetica" },
  row: { flexDirection: "row" },
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
  td: { flexDirection: "row", paddingVertical: 5, borderBottomWidth: 0.5, borderColor: LINE },
  cDesc: { flex: 1, paddingRight: 6 },
  cQty: { width: 45, textAlign: "right" },
  cUnit: { width: 75, textAlign: "right" },
  cVat: { width: 45, textAlign: "right" },
  cAmt: { width: 80, textAlign: "right" },
  totals: { marginTop: 12, alignSelf: "flex-end", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: NAVY,
    paddingTop: 5,
    marginTop: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: NAVY,
  },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, borderTopWidth: 0.5, borderColor: LINE, paddingTop: 8 },
});

function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  const { company, customer, invoice, lines } = data;
  return (
    <Document title={data.docFileTitle ?? `Invoice ${invoice.number}`}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.between}>
          <View>
            <Text style={s.brand}>{company.name}</Text>
            {company.trn ? <Text style={s.muted}>TRN: {company.trn}</Text> : null}
            {company.address ? <Text style={s.muted}>{company.address}</Text> : null}
            {company.email ? <Text style={s.muted}>{company.email}</Text> : null}
          </View>
          <View>
            <Text style={s.title}>{data.docTitle ?? "TAX INVOICE"}</Text>
            <Text style={[s.muted, { textAlign: "right", marginTop: 4 }]}>{invoice.number}</Text>
          </View>
        </View>

        {/* Meta + bill to */}
        <View style={[s.between, s.section]}>
          <View style={{ width: "48%" }}>
            <Text style={s.label}>{data.partyHeading ?? "Bill to"}</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", color: NAVY }}>{customer.name}</Text>
            {customer.trn ? <Text style={s.muted}>TRN: {customer.trn}</Text> : null}
            {customer.address ? <Text style={s.muted}>{customer.address}</Text> : null}
          </View>
          <View style={{ width: "40%" }}>
            <View style={s.between}>
              <Text style={s.muted}>Issue date</Text>
              <Text>{invoice.issueDate}</Text>
            </View>
            <View style={s.between}>
              <Text style={s.muted}>{data.dueLabel ?? "Due date"}</Text>
              <Text>{invoice.dueDate ?? "—"}</Text>
            </View>
            {invoice.reference ? (
              <View style={s.between}>
                <Text style={s.muted}>Reference</Text>
                <Text>{invoice.reference}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Lines */}
        <View style={s.section}>
          <View style={s.th}>
            <Text style={s.cDesc}>Description</Text>
            <Text style={s.cQty}>Qty</Text>
            <Text style={s.cUnit}>Unit</Text>
            <Text style={s.cVat}>VAT</Text>
            <Text style={s.cAmt}>Amount</Text>
          </View>
          {lines.map((l, i) => (
            <View style={s.td} key={i}>
              <Text style={s.cDesc}>{l.description}</Text>
              <Text style={s.cQty}>{l.quantity}</Text>
              <Text style={s.cUnit}>{formatFils(l.unitPriceFils, { withSymbol: false })}</Text>
              <Text style={s.cVat}>{l.vatLabel}</Text>
              <Text style={s.cAmt}>{formatFils(l.lineSubtotalFils, { withSymbol: false })}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text style={s.muted}>Subtotal</Text>
            <Text>{formatFils(invoice.subtotalFils, { currency: invoice.currency })}</Text>
          </View>
          {invoice.discountTotalFils > 0 ? (
            <View style={s.totalRow}>
              <Text style={s.muted}>Discount</Text>
              <Text>- {formatFils(invoice.discountTotalFils, { withSymbol: false })}</Text>
            </View>
          ) : null}
          <View style={s.totalRow}>
            <Text style={s.muted}>VAT</Text>
            <Text>{formatFils(invoice.vatTotalFils, { currency: invoice.currency })}</Text>
          </View>
          <View style={s.grand}>
            <Text>Total</Text>
            <Text>{formatFils(invoice.grandTotalFils, { currency: invoice.currency })}</Text>
          </View>
        </View>

        {/* Payment terms (quotations) */}
        {invoice.paymentTerms ? (
          <View style={s.section}>
            <Text style={s.label}>Payment Terms</Text>
            <Text>{invoice.paymentTerms}</Text>
          </View>
        ) : null}

        {/* Bank details (invoices) */}
        {invoice.bankDetails ? (
          <View style={s.section}>
            <Text style={s.label}>Bank Details</Text>
            <Text>{invoice.bankDetails}</Text>
          </View>
        ) : null}

        {/* Notes */}
        {invoice.notes ? (
          <View style={s.section}>
            <Text style={s.label}>Notes</Text>
            <Text>{invoice.notes}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={s.footer}>
          {invoice.terms ? <Text style={s.muted}>{invoice.terms}</Text> : null}
          <Text style={[s.muted, { marginTop: 4, color: TEAL }]}>
            {company.name}
            {company.trn ? ` · TRN ${company.trn}` : ""}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument data={data} />);
}
