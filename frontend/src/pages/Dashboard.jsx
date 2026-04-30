// src/pages/Dashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getTotalExpenses, getCategoryData, getMonthlyData, getExpenses, createExpense } from "../api/expenseApi";
import { formatCurrency, formatRelativeDate } from "../utils/formatDate";
import { ROUTES } from "../utils/constants";
import Navbar          from "../components/Navbar";
import ExpenseChart    from "../components/ExpenseChart";
import MonthlyBarChart from "../components/MonthlyBarChart";
import ExpenseForm     from "../components/ExpenseForm";
import BudgetPanel     from "../components/BudgetPanel";
import { toast }       from "../utils/toast";

// ── Stat card ─────────────────────────────────────────────────
const StatCard = ({ label, value, sub, trend, trendPct, type, loading, accent }) => {
  const isHero = type === "hero";
  const isFull = type === "full";
  
  return (
    <div className={`stat-card ${isHero ? "stat-card--hero" : ""} ${isFull ? "stat-card--full" : ""}`} style={{ "--accent": accent }}>
      <div className="stat-card__body">
        <span className="stat-card__label">{label}</span>
        {loading ? (
          <div className="skeleton-text" style={{ height: isHero ? "2.5rem" : "1.25rem", margin: "0.5rem 0" }} />
        ) : (
          <>
            <span className="stat-card__value">{value}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.25rem" }}>
              {trend && (
                <div className="stat-card__trend" style={{ color: trendPct <= 0 ? "var(--success)" : "var(--danger)" }}>
                  {trendPct <= 0 ? "↓" : "↑"} {Math.abs(trendPct).toFixed(0)}%
                </div>
              )}
              {sub && <span className="stat-card__sub">{sub}</span>}
            </div>
          </>
        )}
      </div>
      <div className="stat-card__glow" aria-hidden="true" />
    </div>
  );
};

// ── Category colors ───────────────────────────────────────────
const CAT_COLORS = {
  "Food & Dining":  "#f97316",
  "Transportation": "#3b82f6",
  "Housing":        "#8b5cf6",
  "Entertainment":  "#ec4899",
  "Healthcare":     "#10b981",
  "Shopping":       "#f59e0b",
  "Education":      "#06b6d4",
  "Travel":         "#84cc16",
  "Utilities":      "#6366f1",
  "Other":          "#94a3b8",
};

// ── Dashboard ─────────────────────────────────────────────────
const Dashboard = () => {
  const { user } = useAuth();

  const [stats,        setStats]        = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [monthlyData,  setMonthlyData]  = useState([]);
  const [recentTx,     setRecentTx]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [formLoading,  setFormLoading]  = useState(false);

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? "Good morning" :
    greetingHour < 17 ? "Good afternoon" :
                        "Good evening";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [totals, cats, monthly, recent] = await Promise.all([
        getTotalExpenses(),
        getCategoryData(),
        getMonthlyData(),
        getExpenses({ page: 1, limit: 5 }),
      ]);

      setStats(totals);
      setCategoryData(
        cats
          .map((item) => ({ category: item.category || "Unknown", total: Number(item.total) || 0 }))
          .sort((a, b) => b.total - a.total)
      );
      setMonthlyData(monthly);
      setRecentTx(recent.expenses || []);
    } catch {
      // stats error handling
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreateExpense = async (data) => {
    setFormLoading(true);
    try {
      const res = await createExpense(data);
      const isOver = res?.data?.isOverBudget || res?.data?.isCategoryExceeded;
      toast.success(isOver ? "Expense added (over budget) ⚠️" : "Expense added successfully!");
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err?.message || "Failed to add expense.");
    } finally {
      setFormLoading(false);
    }
  };

  // ── Metrics ──────────────────────────────────────────────────
  const now          = new Date();
  const monthName    = now.toLocaleString("default", { month: "short" });
  
  const totalSpent   = stats?.total ?? 0;
  const thisMonth    = stats?.thisMonth ?? 0;
  const thisMonthCount = stats?.thisMonthCount ?? 0;
  
  // Trend
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const pmY = prevMonthDate.getFullYear();
  const pmM = prevMonthDate.getMonth() + 1;
  const lastMonthItem = monthlyData.find(m => m.year === pmY && m.month === pmM);
  const lastMonthTotal = lastMonthItem ? Number(lastMonthItem.total) : (monthlyData.length > 0 ? 0 : null);
  
  const trendPct = lastMonthTotal !== null && lastMonthTotal > 0
    ? ((thisMonth - lastMonthTotal) / lastMonthTotal) * 100
    : (lastMonthTotal === 0 && thisMonth > 0 ? 100 : null);

  const trendStr = trendPct === null ? "No prior data" : `${trendPct > 0 ? "+" : ""}${trendPct.toFixed(1)}%`;
  const trendColor = trendPct === null ? "#94a3b8" : trendPct <= 0 ? "var(--success)" : "var(--danger)";

  // Daily Insight for Hero
  const dayOfMonth   = now.getDate();
  const dailyAvg     = thisMonth ? thisMonth / dayOfMonth : 0;
  const insightText  = trendPct !== null && trendPct <= 0 ? "You are spending less than last month" : "Spending is up this month";

  // Top Category
  const topCat      = categoryData[0];
  const topCatPct   = topCat && totalSpent > 0 ? Math.round((topCat.total / totalSpent) * 100) : 0;
  const topCatInfo  = topCat ? `${topCat.category} — ${formatCurrency(topCat.total)} (${topCatPct}%)` : "No data";

  return (
    <div className="dashboard-layout">
      <Navbar />

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-greeting">{greeting},</p>
            <h1 className="dashboard-name">{user?.name ?? "there"} 👋</h1>
          </div>
          <button className="btn-primary btn-sm" onClick={() => setShowForm(true)}>
            <PlusIcon /> Quick Add
          </button>
        </header>

        {/* ── Grid Layout ── */}
        <div className="stats-grid">
          
          {/* Row 1: Hero + Total */}
          <StatCard
            type="hero"
            label={`${monthName} Spending`}
            value={formatCurrency(thisMonth)}
            trend={trendPct !== null}
            trendPct={trendPct}
            sub={insightText}
            loading={loading}
            accent="var(--accent)"
          />
          <StatCard
            label="Total Spent"
            value={formatCurrency(totalSpent)}
            loading={loading}
            sub="All time"
          />

          {/* Row 2: Stats */}
          <StatCard
            label="Transactions"
            value={thisMonthCount}
            loading={loading}
            sub={monthName}
          />
          <StatCard
            label="Avg"
            value={thisMonthCount ? formatCurrency(thisMonth / thisMonthCount) : "—"}
            loading={loading}
            sub="Per tx"
          />
          <StatCard
            label="Trend"
            value={trendStr}
            loading={loading}
            accent={trendColor}
            sub="vs last month"
          />

          {/* Row 4: Monthly Budget */}
          <div className="stat-card--full">
            <BudgetPanel />
          </div>
        </div>

        <div className="charts-grid">
          {/* Keep monthly trend as it provides deep context */}
          <div className="chart-card" style={{ gridColumn: "span 2" }}>
            <h3 className="section-title" style={{ marginBottom: "1.5rem" }}>Monthly Trend</h3>
            <MonthlyBarChart data={monthlyData} />
          </div>

          {/* Category analytics with toggle */}
          <div className="chart-card">
            <ExpenseChart title="Category Distribution" data={categoryData.slice(0, 5)} />
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="chart-card" style={{ marginTop: "1.5rem" }}>
          <div className="section-header">
            <h3 className="section-title">Recent Transactions</h3>
            <Link to={ROUTES.EXPENSES} className="view-all-link">View all →</Link>
          </div>

          {loading ? (
            <div className="skeleton-rows">
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton-row" style={{ height: 44 }} />)}
            </div>
          ) : recentTx.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "1.5rem 0" }}>No transactions yet</p>
          ) : (
            recentTx.map((tx) => {
              const color = CAT_COLORS[tx.category] || "#94a3b8";
              return (
                <div key={tx._id} className="recent-tx-row">
                  <div className="recent-tx__dot" style={{ background: color }} />
                  <div className="recent-tx__info">
                    <span className="recent-tx__desc">{tx.description || "Untitled"}</span>
                    <span className="recent-tx__cat" style={{ color }}>{tx.category}</span>
                  </div>
                  <div className="recent-tx__right">
                    <span className="recent-tx__amount">{formatCurrency(tx.amount)}</span>
                    <span className="recent-tx__date">{formatRelativeDate(tx.date)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {showForm && (
        <ExpenseForm onClose={() => setShowForm(false)} onSubmit={handleCreateExpense} isLoading={formLoading} />
      )}
    </div>
  );
};

// ── Icons ─────────────────────────────────────────────────────
const PlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;

export default Dashboard;
