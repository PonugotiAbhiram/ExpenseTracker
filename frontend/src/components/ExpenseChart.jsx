import React, { useState, useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import { formatCurrency } from "../utils/formatDate";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

// ── Custom Tooltip ────────────────────────────────────────────
const CustomTooltip = ({ active, payload, totalAmount }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const pct = totalAmount ? ((value / totalAmount) * 100).toFixed(1) : 0;
  
  return (
    <div style={{
      background: "var(--bg-elevated)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: "10px 14px",
      boxShadow: "var(--shadow-md)",
      fontSize: 13,
    }}>
      <p style={{ fontWeight: 700, marginBottom: 4, color: "var(--text-primary)" }}>{name}</p>
      <p style={{ color: "var(--text-secondary)", margin: 0 }}>
        {formatCurrency(value)} &nbsp;·&nbsp; {pct}%
      </p>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────
const ExpenseChart = ({ data = [], title }) => {
  const [view, setView] = useState("distribution");

  const totalAmount = useMemo(() => 
    data.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
  , [data]);

  const sortedData = useMemo(() => 
    [...data].sort((a, b) => b.total - a.total)
  , [data]);

  if (!data.length) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--text-muted)", fontSize: 14 }}>
        Add expenses to view category insights
      </div>
    );
  }

  return (
    <div className="chart-container">
      {/* ── Header with Title + Toggle ── */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1.5rem"
      }}>
        <h3 className="section-title" style={{ margin: 0 }}>{title}</h3>
        
        <div style={{
          display: "flex",
          gap: 4,
          background: "var(--bg-elevated)",
          padding: 3,
          borderRadius: 8,
          border: "1px solid var(--border)",
        }}>
          {["distribution", "comparison"].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "capitalize",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                background: view === v ? "var(--bg-hover)" : "transparent",
                color: view === v ? "var(--accent)" : "var(--text-muted)",
                boxShadow: view === v ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 280 }} className="fade-in">
        <ResponsiveContainer width="100%" height="100%">
          {view === "distribution" ? (
            <PieChart>
              <Pie
                data={sortedData}
                dataKey="total"
                nameKey="category"
                cx="50%" cy="50%"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={4}
                stroke="none"
              >
                {sortedData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip totalAmount={totalAmount} />} />
              <Legend 
                verticalAlign="bottom" 
                iconType="circle" 
                iconSize={8} 
                wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 10 }} 
              />
            </PieChart>
          ) : (
            <BarChart
              layout="vertical"
              data={sortedData.slice(0, 5)}
              margin={{ left: 0, right: 30, top: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.3} />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="category" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: "var(--text-primary)", fontSize: 11, fontWeight: 700 }}
                width={100}
              />
              <Tooltip cursor={{ fill: "var(--bg-hover)", opacity: 0.4 }} content={<CustomTooltip totalAmount={totalAmount} />} />
              <Bar 
                dataKey="total" 
                radius={[0, 4, 4, 0]} 
                barSize={18}
              >
                {sortedData.slice(0, 5).map((_, index) => (
                  <Cell key={`bar-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ExpenseChart;