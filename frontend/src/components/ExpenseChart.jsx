import React from "react";
import { useMemo } from "react";
import { formatCurrency } from "../utils/formatDate";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
const COLORS = ["#534AB7", "#1D9E75", "#D85A30", "#D4537E", "#378ADD"];
const getColor = (index) =>
  COLORS[index % COLORS.length];

const RADIAN = Math.PI / 180;

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null; // hide labels on tiny slices
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={500}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload, totalAmount }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const pct = totalAmount
  ? ((value / totalAmount) * 100).toFixed(1)
  : 0;
  return (
    <div style={{
      background: "var(--bg-surface)",
      border: "0.5px solid var(--border)",
      borderRadius: 8,
      padding: "10px 14px",
      fontSize: 13,
    }}>
      <p style={{ fontWeight: 500, marginBottom: 4 }}>{name}</p>
      <p style={{ color:"var(--text-secondary)" }}>
        {formatCurrency(value)} &nbsp;·&nbsp; {pct}%
      </p>
    </div>
  );
};

const EmptyState = () => (
  <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--color-text-tertiary)", fontSize: 14 }}>
    No expense data to display
  </div>
);

const ExpenseChart = ({ data = [] }) => {
  const totalAmount = useMemo(
  () =>
    data.reduce((sum, item) => {
      const value =
        typeof item.total === "number"
          ? item.total
          : Number(item.total?.amount || item.total || 0);

      return sum + value;
    }, 0),
  [data]
);

const sortedData = useMemo(
  () => [...data].sort((a, b) => b.total - a.total),
  [data]
);

const topCategory = sortedData[0];

  if (!data.length) return <EmptyState />;

  return (
    <div style={{ width: "100%" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: 10,
        marginBottom: "1.25rem",
      }}>
        {[
          { label: "Total spent", value: formatCurrency(totalAmount) },
          { label: "Categories", value: data.length },
          { label: "Top category", value: topCategory?.category ?? "—" },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: "var(--color-background-secondary)",
            borderRadius: 8,
            padding: "0.85rem 1rem",
          }}>
            <p style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</p>
            <p style={{ fontSize: 18, fontWeight: 500 }}>{value}</p>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <PieChart role="img" aria-label="Expense distribution chart">
          <Pie
            data={data}
            dataKey="total"
            nameKey="category"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={2}
            labelLine={false}
            label={renderCustomLabel}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip totalAmount={totalAmount} />} />
          <Legend
            iconType="square"
            iconSize={10}
            formatter={(value) => (
              <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ExpenseChart;