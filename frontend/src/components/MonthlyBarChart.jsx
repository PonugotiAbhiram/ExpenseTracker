// src/components/MonthlyBarChart.jsx
import React, { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { formatCurrency } from "../utils/formatDate";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── Custom Tooltip ────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-elevated)",
      border: "1px solid var(--border-light)",
      borderRadius: 8,
      padding: "8px 12px",
      fontSize: 13,
    }}>
      <p style={{ color: "var(--text-secondary)", marginBottom: 4, fontSize: 11 }}>{label}</p>
      <p style={{ fontWeight: 700, color: "var(--text-primary)" }}>
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
};

// ── Component ─────────────────────────────────────────────────
const MonthlyBarChart = ({ data = [] }) => {
  const chartData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const found = data.find((item) => item.year === y && item.month === m);
      return {
        month: MONTH_NAMES[d.getMonth()],
        total: found?.total ?? 0,
        isCurrent: i === 5,
      };
    });
  }, [data]);

  if (!data.length) {
    return (
      <div style={{
        textAlign: "center", padding: "2.5rem 1rem",
        color: "var(--text-muted)", fontSize: 13,
      }}>
        No monthly data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.07)", radius: 4 }} />
        <Bar dataKey="total" radius={[5, 5, 0, 0]} maxBarSize={36}>
          {chartData.map((entry, i) => (
            <Cell
              key={`cell-${i}`}
              fill={entry.isCurrent ? "var(--accent)" : "var(--bg-hover)"}
              stroke={entry.isCurrent ? "rgba(99,102,241,0.4)" : "var(--border-light)"}
              strokeWidth={1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default MonthlyBarChart;
