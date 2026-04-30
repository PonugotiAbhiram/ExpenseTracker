import React, { useState, useEffect, useCallback } from "react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, 
  BarChart, Bar, Legend
} from "recharts";
import { getSpendingTrends, getCategoryData } from "../api/expenseApi";
import { formatCurrency } from "../utils/formatDate";
import { toast } from "../utils/toast";
import Navbar from "../components/Navbar";

const RANGES = [
  { label: "7d",   value: "7d" },
  { label: "30d",  value: "30d" },
  { label: "3m",   value: "90d" },
  { label: "1y",   value: "1y" },
];

const GROUPINGS = [
  { label: "Day",   value: "day" },
  { label: "Week",  value: "week" },
  { label: "Month", value: "month" },
];

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

// ── Summary Card Component ───────────────────────────────────
const SummaryCard = ({ title, value, subtext, trend, icon }) => (
  <div className="card" style={{ padding: "1rem 1.25rem", flex: 1, minWidth: "180px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {title}
      </span>
      {icon && <span style={{ fontSize: "1rem" }}>{icon}</span>}
    </div>
    <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--text-primary)", marginBottom: "4px", letterSpacing: "-0.02em" }}>
      {value}
    </div>
    <div style={{ fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "4px" }}>
      {trend !== undefined && (
        <span style={{ color: trend > 0 ? "#ef4444" : trend < 0 ? "#10b981" : "var(--text-muted)", fontWeight: 700 }}>
          {trend > 0 ? "↑" : trend < 0 ? "↓" : "•"} {Math.abs(trend)}%
        </span>
      )}
      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{subtext || "vs last period"}</span>
    </div>
  </div>
);

const Analytics = () => {
  const [range, setRange] = useState("30d");
  const [groupBy, setGroupBy] = useState("day");
  const [trendData, setTrendData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [trendRes, catRes] = await Promise.all([
        getSpendingTrends({ range, groupBy }),
        getCategoryData()
      ]);
      setTrendData(trendRes.trends);
      setInsights(trendRes.insights);
      setCategoryData(catRes.sort((a, b) => b.total - a.total));
    } catch (err) {
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, [range, groupBy]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: "var(--bg-card)", padding: "8px 12px", border: "1px solid var(--border-color)", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          <p style={{ margin: 0, fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: "2px" }}>{label}</p>
          <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 800, color: "var(--accent)" }}>{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  if (loading && !insights) {
    return (
      <div className="dashboard-layout">
        <Navbar />
        <main className="dashboard-main" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="spinner"></div>
        </main>
      </div>
    );
  }

  const noData = trendData.length === 0;

  return (
    <div className="dashboard-layout">
      <Navbar />
      <main className="dashboard-main" style={{ padding: "1.5rem 2rem" }}>
        <header style={{ marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.03em" }}>Analytics</h1>
            <p style={{ color: "var(--text-muted)", margin: "2px 0 0 0", fontSize: "0.8rem" }}>Real-time spending intelligence</p>
          </div>
          
          <div style={{ display: "flex", gap: "6px", background: "var(--bg-hover)", padding: "3px", borderRadius: "8px" }}>
            {RANGES.map(r => (
              <button 
                key={r.value} 
                onClick={() => setRange(r.value)}
                style={{
                  padding: "5px 10px", fontSize: "0.72rem", fontWeight: 700, borderRadius: "6px", border: "none", cursor: "pointer",
                  background: range === r.value ? "var(--bg-card)" : "transparent",
                  color: range === r.value ? "var(--accent)" : "var(--text-muted)",
                  boxShadow: range === r.value ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </header>

        {noData ? (
          <div className="card" style={{ height: "350px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <span style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📊</span>
            <h2 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 800 }}>Add more expenses to unlock insights</h2>
            <p style={{ color: "var(--text-muted)", maxWidth: "280px", marginTop: "6px", fontSize: "0.85rem" }}>We'll analyze your spending and show trends once you have data.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            
            {/* A. Summary Cards (Top Row) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              <SummaryCard 
                title="Total Spent" 
                value={formatCurrency(insights?.totalSpent ?? 0)} 
                trend={insights?.changeVsLastPeriod}
                icon="💰"
              />
              <SummaryCard 
                title={`Avg / ${groupBy}`} 
                value={formatCurrency(insights?.averagePerPoint ?? 0)} 
                subtext="Spending rate"
                icon="📈"
              />
              <SummaryCard 
                title="Peak Amount" 
                value={formatCurrency(insights?.highestPoint?.total ?? 0)} 
                subtext={insights?.highestPoint?.label}
                icon="⚡"
              />
              <SummaryCard 
                title="Budget Status" 
                value={insights?.changeVsLastPeriod > 0 ? "Exceeding" : "Optimal"} 
                subtext={insights?.changeVsLastPeriod > 0 ? "Spending is up" : "Spending is down"}
                trend={insights?.changeVsLastPeriod}
                icon="🎯"
              />
            </div>

            {/* B. Main Trend Chart (Center) - The Hero Section */}
            <div className="card" style={{ padding: "1.25rem", boxShadow: "0 2px 10px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1rem" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800 }}>Spending Velocity</h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {insights?.changeVsLastPeriod > 0 
                      ? `Spending increased by ${insights.changeVsLastPeriod}% this period` 
                      : `Spending decreased by ${Math.abs(insights.changeVsLastPeriod)}% this period`}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "4px", background: "var(--bg-hover)", padding: "2px", borderRadius: "6px" }}>
                  {GROUPINGS.map(g => (
                    <button 
                      key={g.value} 
                      onClick={() => setGroupBy(g.value)}
                      style={{
                        padding: "4px 8px", fontSize: "0.68rem", fontWeight: 700, borderRadius: "4px", border: "none", cursor: "pointer",
                        background: groupBy === g.value ? "var(--bg-card)" : "transparent",
                        color: groupBy === g.value ? "var(--accent)" : "var(--text-muted)",
                      }}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ height: "280px", width: "100%", marginLeft: "-10px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                        <stop offset="50%" stopColor="var(--accent)" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} tickLine={false} 
                      tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }} 
                      minTickGap={40}
                    />
                    <YAxis 
                      axisLine={false} tickLine={false} 
                      tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }}
                      tickFormatter={(val) => `₹${val}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" dataKey="total" 
                      stroke="var(--accent)" strokeWidth={4}
                      fillOpacity={1} fill="url(#colorTrend)" 
                      dot={{ r: 4, fill: "var(--accent)", strokeWidth: 2, stroke: "#fff" }}
                      activeDot={{ r: 6, strokeWidth: 0, fill: "var(--accent)" }}
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* C. Breakdown Section (Bottom Row) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
              {/* Category Pie Chart */}
              <div className="card" style={{ padding: "1.25rem", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <h3 style={{ margin: "0 0 1rem 0", fontSize: "0.9rem", fontWeight: 800 }}>Distribution</h3>
                <div style={{ height: "220px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%" cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="total"
                        nameKey="category"
                        animationDuration={800}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend verticalAlign="bottom" iconSize={8} wrapperStyle={{ fontSize: "10px", fontWeight: 600 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Categories Bar Chart */}
              <div className="card" style={{ padding: "1.25rem", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <h3 style={{ margin: "0 0 1rem 0", fontSize: "0.9rem", fontWeight: 800 }}>Top Movers</h3>
                <div style={{ height: "220px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData.slice(0, 5)} layout="vertical" margin={{ left: -20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" opacity={0.4} />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="category" type="category" 
                        axisLine={false} tickLine={false} 
                        tick={{ fontSize: 10, fill: "var(--text-primary)", fontWeight: 700 }}
                        width={90}
                      />
                      <Tooltip formatter={(value) => formatCurrency(value)} cursor={{ fill: "var(--bg-hover)", opacity: 0.4 }} />
                      <Bar 
                        dataKey="total" 
                        fill="var(--accent)" 
                        radius={[0, 4, 4, 0]}
                        barSize={16}
                        animationDuration={1000}
                      >
                        {categoryData.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
};

export default Analytics;
