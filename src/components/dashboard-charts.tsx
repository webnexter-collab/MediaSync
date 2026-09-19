"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

const TEAL = "#0e7c86";
const INK = "#10233f";
const AMBER = "#c2894e";

const aed = (n: number) => `AED ${n.toLocaleString("en-AE", { maximumFractionDigits: 0 })}`;

export function AgingChart({ data }: { data: { bucket: string; Receivables: number; Payables: number }[] }) {
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e6ea" vertical={false} />
          <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={{ stroke: "#e4e6ea" }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={44}
            tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)} />
          <Tooltip formatter={(value) => aed(Number(value))} contentStyle={{ borderRadius: 10, border: "1px solid #e4e6ea", fontSize: 12 }} cursor={{ fill: "rgba(14,124,134,0.06)" }} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
          <Bar dataKey="Receivables" fill={TEAL} radius={[4, 4, 0, 0]} maxBarSize={34} />
          <Bar dataKey="Payables" fill={AMBER} radius={[4, 4, 0, 0]} maxBarSize={34} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CashDonut({ data }: { data: { name: string; value: number }[] }) {
  const palette = [INK, TEAL, AMBER, "#6b7280", "#9aa9bd", "#c8d0da"];
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) {
    return <div className="grid h-[220px] place-items-center text-sm text-muted">No account balances yet</div>;
  }
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={54} outerRadius={82} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => aed(Number(value))} contentStyle={{ borderRadius: 10, border: "1px solid #e4e6ea", fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
