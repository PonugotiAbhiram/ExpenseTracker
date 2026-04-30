// src/components/BudgetPanel.jsx
import React, { useState, useEffect, useCallback } from "react";
import { getBudgetAnalysis, setBudget, deleteBudget } from "../api/budgetApi";
import { EXPENSE_CATEGORIES } from "../utils/constants";
import { formatCurrency } from "../utils/formatDate";
import { toast } from "../utils/toast";

const OVERALL_KEY  = "__overall__";
const MONTH_NAMES  = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const STATUS = {
  safe:     { color: "#22c55e", bg: "rgba(34,197,94,0.12)",  label: "On Track", icon: "✓" },
  warning:  { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "Warning",  icon: "⚠" },
  exceeded: { color: "#ef4444", bg: "rgba(239,68,68,0.12)",  label: "Exceeded", icon: "✕" },
};

// ── Reusable progress bar ─────────────────────────────────────
const ProgressBar = ({ percentage, status, height = 8 }) => {
  const cfg     = STATUS[status] || STATUS.safe;
  const clamped = Math.min(percentage ?? 0, 100);
  return (
    <div className="progress-track" style={{ height, marginTop: "6px" }}>
      <div 
        className="progress-fill" 
        style={{ width: `${clamped}%`, background: cfg.color, boxShadow: `0 0 8px ${cfg.color}55` }} 
      />
    </div>
  );
};

// ── Overall Budget card (For Drawer) ──────────────────────────
const OverallBudgetCard = ({ overall, month, year, remainingCapacity, allocated, onSaved }) => {
  const [editMode, setEditMode] = useState(false);
  const [limit,    setLimit]    = useState(overall?.limit ?? "");
  const [saving,   setSaving]   = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!limit || Number(limit) <= 0) { toast.error("Enter a valid budget amount."); return; }
    setSaving(true);
    try {
      await setBudget({ category: OVERALL_KEY, limit: Number(limit), month, year });
      toast.success("Overall budget saved!");
      setEditMode(false);
      onSaved();
    } catch (err) {
      toast.error(err?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!overall?._id) return;
    try {
      await deleteBudget(overall._id);
      toast.success("Overall budget removed.");
      setLimit("");
      onSaved();
    } catch { toast.error("Failed to remove."); }
  };

  const cfg = overall?.status ? STATUS[overall.status] : STATUS.safe;

  return (
    <div style={{
      background: overall ? cfg.bg : "var(--bg-hover)",
      border: `1.5px solid ${overall ? cfg.color + "55" : "var(--border)"}`,
      borderRadius: "14px", padding: "1.1rem 1.3rem", marginBottom: "1.25rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: overall && !editMode ? "14px" : "0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>Monthly Cap</span>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {overall && !editMode && (
            <button onClick={handleRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1rem" }}>×</button>
          )}
          <button
            onClick={() => { setLimit(overall?.limit ?? ""); setEditMode((v) => !v); }}
            className={editMode ? "btn-secondary btn-sm" : "btn-primary btn-sm"}
            style={{ marginTop: 0 }}
          >
            {editMode ? "Cancel" : overall ? "Edit" : "Set Cap"}
          </button>
        </div>
      </div>

      {editMode && (
        <form onSubmit={handleSave} style={{ display: "flex", gap: "0.5rem", marginTop: "10px" }}>
          <input
            type="number" value={limit} onChange={(e) => setLimit(e.target.value)}
            className="filter-select" style={{ flex: 1 }} placeholder="₹ Budget"
          />
          <button type="submit" className="btn-primary btn-sm" disabled={saving} style={{ marginTop: 0 }}>
            {saving ? "…" : "Save"}
          </button>
        </form>
      )}

      {overall && !editMode && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>
              {formatCurrency(overall.spent)} <span style={{ color: "var(--text-muted)" }}>/ {formatCurrency(overall.limit)}</span>
            </span>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
          </div>
          <ProgressBar percentage={overall.percentage} status={overall.status} height={8} />
        </>
      )}
    </div>
  );
};

// ── Per-category card (For Drawer) ───────────────────────────
const CategoryBudgetCard = ({ item, month, year, remainingCapacity, overallSet, onDelete, onSaved }) => {
  const [editMode, setEditMode] = useState(false);
  const [editLimit, setEditLimit] = useState(item.limit);
  const [saving, setSaving] = useState(false);

  const cfg = STATUS[item.status] || STATUS.safe;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setBudget({ category: item.category, limit: Number(editLimit), month, year });
      setEditMode(false);
      onSaved();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: "12px", marginBottom: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
        <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{item.category}</span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setEditMode(!editMode)} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "0.75rem", cursor: "pointer" }}>{editMode ? "Cancel" : "Edit"}</button>
          <button onClick={() => onDelete(item._id)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>×</button>
        </div>
      </div>
      
      {editMode ? (
        <form onSubmit={handleSave} style={{ display: "flex", gap: "0.5rem" }}>
          <input type="number" value={editLimit} onChange={(e) => setEditLimit(e.target.value)} className="filter-select" style={{ flex: 1 }} />
          <button type="submit" className="btn-primary btn-sm" disabled={saving} style={{ marginTop: 0 }}>{saving ? "…" : "Save"}</button>
        </form>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "4px" }}>
            <span style={{ color: "var(--text-secondary)" }}>{formatCurrency(item.spent)} / {formatCurrency(item.limit)}</span>
            <span style={{ color: cfg.color, fontWeight: 700 }}>{item.status === "exceeded" ? "Over" : "Left"}</span>
          </div>
          <ProgressBar percentage={item.percentage} status={item.status} height={6} />
        </>
      )}
    </div>
  );
};

// ── Compact Summary Card (For Dashboard) ──────────────────────
const BudgetSummaryCard = ({ analysis, onViewDetails, loading }) => {
  const overall = analysis?.overall;
  const cfg = overall?.status ? STATUS[overall.status] : STATUS.safe;

  if (loading) return <div className="skeleton-row" style={{ height: 120 }} />;

  return (
    <div className="stat-card" style={{ cursor: "pointer" }} onClick={onViewDetails}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span className="stat-card__label">Monthly Budget</span>
        {overall && (
          <span style={{ 
            fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: "20px",
            background: cfg.bg, color: cfg.color, textTransform: "uppercase"
          }}>
            {cfg.label}
          </span>
        )}
      </div>

      {!overall ? (
        <div style={{ marginTop: "1rem" }}>
          <span className="stat-card__sub">No budget set for this month</span>
          <button className="btn-secondary btn-sm" style={{ width: "100%", marginTop: "0.5rem" }}>Setup Budget →</button>
        </div>
      ) : (
        <>
          <span className="stat-card__value" style={{ margin: "0.5rem 0" }}>
            {formatCurrency(overall.spent)} <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 400 }}>/ {formatCurrency(overall.limit)}</span>
          </span>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <span className="stat-card__sub" style={{ color: overall.status === "exceeded" ? "var(--danger)" : "var(--text-secondary)" }}>
              {overall.status === "exceeded" 
                ? `Over by ${formatCurrency(overall.spent - overall.limit)}` 
                : `${formatCurrency(overall.remaining)} remaining`
              }
            </span>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent)" }}>View Details →</span>
          </div>
          <ProgressBar percentage={overall.percentage} status={overall.status} height={6} />
        </>
      )}
      <div className="stat-card__glow" />
    </div>
  );
};

// ── Budget Drawer (Detailed View) ─────────────────────────────
const BudgetDrawer = ({ analysis, m, y, onClose, onSaved }) => {
  const overall              = analysis?.overall      ?? null;
  const summary              = analysis?.summary      ?? {};
  const categories           = analysis?.categories   ?? [];
  const remainingCapacity    = summary.remainingBudgetCapacity ?? null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <header className="drawer-header">
          <div>
            <h2 style={{ fontSize: "1.25rem", margin: 0 }}>Budget Analysis</h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 0" }}>{MONTH_NAMES[m - 1]} {y}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-muted)" }}>×</button>
        </header>

        <div className="drawer-content">
          <OverallBudgetCard
            overall={overall} month={m} year={y}
            remainingCapacity={remainingCapacity}
            allocated={summary.totalBudget ?? 0}
            onSaved={onSaved}
          />

          <div style={{ marginTop: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "0.9rem", margin: 0 }}>Category Budgets</h3>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{categories.length} tracked</span>
            </div>

            <AddCategoryForm
              month={m} year={y}
              remainingCapacity={remainingCapacity}
              overallSet={overall?.limit ?? null}
              onSaved={onSaved}
            />

            <div style={{ marginTop: "1.5rem" }}>
              {categories.map(item => (
                <CategoryBudgetCard
                  key={item._id} item={item} month={m} year={y}
                  remainingCapacity={remainingCapacity}
                  overallSet={overall?.limit ?? null}
                  onDelete={async (id) => {
                    try { await deleteBudget(id); toast.success("Budget removed."); onSaved(); }
                    catch { toast.error("Failed to remove."); }
                  }}
                  onSaved={onSaved}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ── AddCategoryForm (Internal) ────────────────────────────────
const AddCategoryForm = ({ month, year, remainingCapacity, overallSet, onSaved }) => {
  const [category, setCategory] = useState("");
  const [limit,    setLimit]    = useState("");
  const [saving,   setSaving]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category || !limit) return;
    setSaving(true);
    try {
      await setBudget({ category, limit: Number(limit), month, year });
      setCategory(""); setLimit("");
      onSaved();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: "var(--bg-hover)", padding: "1rem", borderRadius: "10px", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
      <select value={category} onChange={e => setCategory(e.target.value)} className="filter-select" style={{ flex: 1 }}>
        <option value="">Select Category</option>
        {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <input type="number" value={limit} onChange={e => setLimit(e.target.value)} className="filter-select" style={{ flex: 1 }} placeholder="₹ Limit" />
      <button type="submit" className="btn-primary btn-sm" disabled={saving} style={{ marginTop: 0 }}>{saving ? "…" : "Add"}</button>
    </form>
  );
};


// ── Main Export ───────────────────────────────────────────────
const BudgetPanel = ({ month, year }) => {
  const now = new Date();
  const m = month ?? now.getMonth() + 1;
  const y = year ?? now.getFullYear();

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setAnalysis(await getBudgetAnalysis(m, y)); }
    catch { }
    finally { setLoading(false); }
  }, [m, y]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <BudgetSummaryCard 
        analysis={analysis} 
        onViewDetails={() => setDrawerOpen(true)} 
        loading={loading} 
      />

      {drawerOpen && (
        <BudgetDrawer 
          analysis={analysis} 
          m={m} y={y} 
          onClose={() => setDrawerOpen(false)} 
          onSaved={load} 
        />
      )}
    </>
  );
};

export default BudgetPanel;
