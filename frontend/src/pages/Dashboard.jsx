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
const StatCard = ({ label, value, icon, accent, loading, sub }) => (
  <div className="stat-card" style={{ "--accent": accent }}>
    <div className="stat-card__icon">{icon}</div>
    <div className="stat-card__body">
      <span className="stat-card__label">{label}</span>
      {loading
        ? <div className="skeleton-text" />
        : (
          <>
            <span className="stat-card__value">{value}</span>
            {sub && <span className="stat-card__sub">{sub}</span>}
          </>
        )
      }
    </div>
    <div className="stat-card__glow" aria-hidden="true" />
  </div>
);

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
          .slice(0, 5)
      );
      setMonthlyData(monthly);
      setRecentTx(recent.expenses || []);
    } catch {
      // stat cards will just show 0
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

  // ── Derived metrics ──────────────────────────────────────────

  // 1. Total Spent (all time)
  const totalSpent = stats?.total ?? 0;

  // 2. This Month
  const thisMonth = stats?.thisMonth ?? 0;

  // 4. Daily Spend — with projected monthly spend as subtitle
  const dayOfMonth   = new Date().getDate();
  const dailyAvg     = thisMonth ? thisMonth / dayOfMonth : 0;
  const projectedMo  = dailyAvg * 30;

  // 6. Spending Trend — this month vs last month
  const lastMonthTotal = monthlyData.length >= 2
    ? Number(monthlyData[monthlyData.length - 2]?.total) || 0
    : null;
  const trendPct = lastMonthTotal && lastMonthTotal > 0
    ? ((thisMonth - lastMonthTotal) / lastMonthTotal) * 100
    : null;
  const trendStr   = trendPct === null ? "No prior data" : `${trendPct > 0 ? "+" : ""}${trendPct.toFixed(1)}%`;
  const trendColor = trendPct === null ? "#94a3b8" : trendPct <= 0 ? "#22c55e" : "#ef4444";
  const trendSub   = trendPct === null ? "" : trendPct <= 0 ? "vs last month ✓" : "vs last month ↑";

  // 7. Top Category with % share
  const topCat        = categoryData[0];
  const topCatPct     = topCat && totalSpent > 0 ? Math.round((topCat.total / totalSpent) * 100) : 0;
  const topCatLabel   = topCat ? `${topCat.category}` : "—";
  const topCatSub     = topCat ? `${topCatPct}% of total spend` : "";

  // 8. Biggest Single Category Amount (top category's actual ₹ — from full data, not limited recent tx)
  const biggestCatAmount = topCat?.total ?? 0;

  return (
    <div className="dashboard-layout">
      <Navbar />

      <main className="dashboard-main">

        {/* ── Header ── */}
        <header className="dashboard-header">
          <div>
            <p className="dashboard-greeting">{greeting},</p>
            <h1 className="dashboard-name">{user?.name ?? "there"} 👋</h1>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
            <p className="dashboard-date">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <button className="btn-primary btn-sm" onClick={() => setShowForm(true)} style={{ marginTop: 0 }}>
              <PlusIcon /> Quick Add
            </button>
          </div>
        </header>



        {/* ── KPI Cards (8 high-signal) ── */}
        <div className="stats-grid">

          {/* 1. Total Spent */}
          <StatCard
            label="Total Spent"
            value={formatCurrency(totalSpent)}
            accent="#6366f1"
            loading={loading}
            icon={<WalletIcon />}
            sub="all time"
          />

          {/* 2. This Month */}
          <StatCard
            label="This Month"
            value={formatCurrency(thisMonth)}
            accent="#f97316"
            loading={loading}
            icon={<CalendarIcon />}
            sub={`Day ${dayOfMonth} of ${new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate()}`}
          />

          {/* 3. Transactions this month */}
          <StatCard
            label="Transactions"
            value={stats?.count ?? 0}
            accent="#22c55e"
            loading={loading}
            icon={<SafeIcon />}
            sub="all time"
          />

          {/* 4. Daily Spend + projected */}
          <StatCard
            label="Daily Spend"
            value={formatCurrency(dailyAvg)}
            accent="#06b6d4"
            loading={loading}
            icon={<ActivityIcon />}
            sub={projectedMo > 0 ? `~${formatCurrency(projectedMo)} projected` : "no data yet"}
          />

          {/* 5. Avg per transaction */}
          <StatCard
            label="Avg Transaction"
            value={stats?.count ? formatCurrency((stats?.total ?? 0) / stats.count) : "—"}
            accent="#8b5cf6"
            loading={loading}
            icon={<ShieldIcon />}
            sub="all-time average"
          />

          {/* 6. Spending Trend */}
          <StatCard
            label="Spending Trend"
            value={trendStr}
            accent={trendColor}
            loading={loading}
            icon={<TrendingIcon />}
            sub={trendSub}
          />

          {/* 7. Top Category with % */}
          <StatCard
            label="Top Category"
            value={topCatLabel}
            accent="#ec4899"
            loading={loading}
            icon={<TagIcon />}
            sub={topCatSub}
          />

          {/* 8. Biggest Category Amount */}
          <StatCard
            label="Biggest Category ₹"
            value={formatCurrency(biggestCatAmount)}
            accent="#eab308"
            loading={loading}
            icon={<PieChartIcon />}
            sub={topCat ? topCat.category : "no data"}
          />

        </div>

        {/* ── Budget Panel ── */}
        <BudgetPanel />

        {/* ── Charts row ── */}
        <div className="charts-grid">
          {/* Category breakdown */}
          <div className="chart-card">
            <h3 className="section-title" style={{ marginBottom: "1.25rem" }}>Spending by Category</h3>
            {categoryData.length === 0 && !loading ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "2rem 0" }}>No data yet</p>
            ) : (
              <div className="category-bars">
                {categoryData.map((item, i) => {
                  const pct   = totalSpent ? Math.round((item.total / totalSpent) * 100) : 0;
                  const color = CAT_COLORS[item.category] || "#94a3b8";
                  return (
                    <div key={item.category} className="category-bar-row">
                      <span className="category-bar-label">{item.category}</span>
                      <div className="category-bar-track">
                        <div
                          className="category-bar-fill"
                          style={{ width: `${pct}%`, animationDelay: `${i * 0.08}s`, background: `linear-gradient(90deg, ${color}, ${color}99)` }}
                        />
                      </div>
                      <span className="category-bar-amount">{formatCurrency(item.total)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Monthly trend */}
          <div className="chart-card">
            <h3 className="section-title" style={{ marginBottom: "1.25rem" }}>Monthly Trend</h3>
            <MonthlyBarChart data={monthlyData} />
          </div>
        </div>

        {/* ── Pie Chart ── */}
        <div className="chart-card" style={{ marginBottom: "2rem" }}>
          <h3 className="section-title" style={{ marginBottom: "1.25rem" }}>Category Distribution</h3>
          <ExpenseChart data={categoryData} />
        </div>

        {/* ── Recent Transactions ── */}
        <div className="chart-card">
          <div className="section-header" style={{ marginBottom: "1rem" }}>
            <h3 className="section-title">Recent Transactions</h3>
            <Link to={ROUTES.EXPENSES} className="view-all-link">View all →</Link>
          </div>

          {loading ? (
            <div className="skeleton-rows">
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton-row" style={{ height: 44, animationDelay: `${i * 0.06}s` }} />)}
            </div>
          ) : recentTx.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "1.5rem 0" }}>
              No transactions yet
            </p>
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

      {/* Expense Form Modal */}
      {showForm && (
        <ExpenseForm 
          onClose={() => setShowForm(false)} 
          onSubmit={handleCreateExpense} 
          isLoading={formLoading} 
        />
      )}
    </div>
  );
};

// ── Icons ─────────────────────────────────────────────────────
const WalletIcon   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><circle cx="16" cy="14" r="1" fill="currentColor"/></svg>;
const CalendarIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const TagIcon      = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
const PlusIcon     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const ActivityIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const TrendingIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const SafeIcon     = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const PieChartIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>;
const ShieldIcon   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;

export default Dashboard;
