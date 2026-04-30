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
    <div style={{ background: "var(--bg-hover)", borderRadius: "99px", height, overflow: "hidden", marginTop: "6px" }}>
      <div style={{
        height: "100%", width: `${clamped}%`, borderRadius: "99px",
        background: cfg.color, transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: `0 0 8px ${cfg.color}55`,
      }} />
    </div>
  );
};

// ── Overall Budget card ───────────────────────────────────────
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
      border: `1.5px solid ${overall ? cfg.color + "55" : "var(--border-color)"}`,
      borderRadius: "14px", padding: "1.1rem 1.3rem", marginBottom: "1.25rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: overall && !editMode ? "14px" : "0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "1.15rem" }}>🎯</span>
          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
            Monthly Budget
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {overall && !editMode && (
            <span style={{
              fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "20px",
              background: cfg.bg, color: cfg.color,
            }}>
              {cfg.icon} {cfg.label}
            </span>
          )}
          {overall && !editMode && (
            <button onClick={handleRemove} title="Remove budget"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1rem", lineHeight: 1 }}>×</button>
          )}
          <button
            onClick={() => { setLimit(overall?.limit ?? ""); setEditMode((v) => !v); }}
            className={editMode ? "btn-secondary btn-sm" : "btn-primary btn-sm"}
            style={{ marginTop: 0, padding: "4px 12px", fontSize: "0.8rem" }}
          >
            {editMode ? "Cancel" : overall ? "Edit" : "Set Budget"}
          </button>
        </div>
      </div>

      {editMode && (
        <form onSubmit={handleSave} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "10px" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "0.85rem" }}>₹</span>
            <input
              type="number" min="1" step="1" placeholder="e.g. 50000"
              value={limit} onChange={(e) => setLimit(e.target.value)}
              autoFocus required className="filter-select"
              style={{ padding: "0.5rem 0.75rem 0.5rem 1.6rem", width: "100%", boxSizing: "border-box" }}
            />
          </div>
          <button type="submit" className="btn-primary btn-sm" disabled={saving} style={{ marginTop: 0, height: "38px", whiteSpace: "nowrap" }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      )}

      {overall && !editMode && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.95rem" }}>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{formatCurrency(overall.spent)}</span>
              <span style={{ color: "var(--text-muted)" }}> / {formatCurrency(overall.limit)}</span>
            </span>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: cfg.color }}>
              {overall.status === "exceeded" 
                ? `+${formatCurrency(overall.spent - overall.limit)}` 
                : `${formatCurrency(Math.max(overall.remaining, 0))} left`
              }
            </span>
          </div>
          <ProgressBar percentage={overall.percentage} status={overall.status} height={10} />
          
          <div style={{ marginTop: "10px", fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>Allocated: <strong>{formatCurrency(allocated)}</strong></span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span>Unassigned: <strong>{formatCurrency(Math.max(remainingCapacity ?? 0, 0))}</strong></span>
            {remainingCapacity > 0 && <span title="Unassigned budget">💡</span>}
          </div>
        </>
      )}

      {!overall && !editMode && (
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "6px" }}>
          No overall budget set. Click "Set Budget" to add a monthly cap.
        </p>
      )}
    </div>
  );
};

// ── Add category budget form with real-time validation ────────
const AddCategoryForm = ({ month, year, remainingCapacity, overallSet, onSaved }) => {
  const [category, setCategory] = useState("");
  const [limit,    setLimit]    = useState("");
  const [saving,   setSaving]   = useState(false);
  const [backendError, setBackendError] = useState("");

  const numLimit  = Number(limit);
  const hasOverall = overallSet && remainingCapacity !== null;

  // Real-time validation
  const exceedsCapacity = hasOverall && numLimit > 0 && numLimit > remainingCapacity;
  const inputOk  = category && numLimit > 0 && !exceedsCapacity;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBackendError("");
    if (!inputOk) return;
    setSaving(true);
    try {
      await setBudget({ category, limit: numLimit, month, year });
      toast.success(`Budget set for ${category}!`);
      setCategory(""); setLimit("");
      onSaved();
    } catch (err) {
      // Surface backend error message directly
      const msg = err?.message || "Failed to save budget.";
      setBackendError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Allocation meter */}
      {hasOverall && (
        <div style={{ marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "4px" }}>
            <span>Budget allocation capacity</span>
            <span style={{ fontWeight: 600, color: remainingCapacity <= 0 ? "#ef4444" : "var(--text-primary)" }}>
              {formatCurrency(Math.max(remainingCapacity, 0))} unallocated
            </span>
          </div>
          <div style={{ background: "var(--bg-hover)", borderRadius: "99px", height: "6px", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${Math.min(((overallSet - remainingCapacity) / overallSet) * 100, 100)}%`,
              borderRadius: "99px",
              background: remainingCapacity <= 0 ? "#ef4444" : remainingCapacity / overallSet < 0.2 ? "#f59e0b" : "#22c55e",
              transition: "width 0.4s ease",
            }} />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: "1 1 160px" }}>
          <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="filter-select" required style={{ padding: "0.5rem 0.75rem" }}>
            <option value="">Select…</option>
            {EXPENSE_CATEGORIES.filter((c) => c !== "Other").map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: "1 1 160px" }}>
          <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Monthly Limit (₹)
            {hasOverall && numLimit > 0 && !exceedsCapacity && (
              <span style={{ marginLeft: "6px", color: "#22c55e", fontWeight: 500, textTransform: "none" }}>✓ within budget</span>
            )}
          </label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "0.85rem" }}>₹</span>
            <input
              type="number" min="1" step="1" placeholder="0"
              value={limit} onChange={(e) => { setLimit(e.target.value); setBackendError(""); }}
              className={`filter-select${exceedsCapacity ? " input-error" : ""}`} required
              style={{ padding: "0.5rem 0.75rem 0.5rem 1.6rem", width: "100%", boxSizing: "border-box" }}
            />
          </div>
          {/* Real-time feedback */}
          {exceedsCapacity && (
            <span style={{ fontSize: "0.73rem", color: "#ef4444", fontWeight: 500 }}>
              Exceeds remaining capacity ({formatCurrency(remainingCapacity)} available)
            </span>
          )}
          {hasOverall && remainingCapacity <= 0 && !exceedsCapacity && (
            <span style={{ fontSize: "0.73rem", color: "#ef4444", fontWeight: 500 }}>
              No capacity left — increase or remove an existing category budget first.
            </span>
          )}
        </div>

        <button type="submit" className="btn-primary btn-sm" disabled={saving || !inputOk} style={{ marginTop: 0, height: "38px" }}>
          {saving ? "Saving…" : "Add"}
        </button>
      </form>

      {/* Backend error (extra safety net) */}
      {backendError && (
        <p style={{ fontSize: "0.78rem", color: "#ef4444", marginTop: "8px", fontWeight: 500 }}>⚠ {backendError}</p>
      )}
    </div>
  );
};

// ── Per-category budget card (with inline edit) ──────────────
const BudgetCard = ({ item, month, year, remainingCapacity, overallSet, onDelete, onSaved }) => {
  const [editMode,     setEditMode]     = useState(false);
  const [editLimit,    setEditLimit]    = useState(item.limit);
  const [saving,       setSaving]       = useState(false);
  const [backendError, setBackendError] = useState("");

  const cfg    = STATUS[item.status] || STATUS.safe;
  const overBy = item.spent - item.limit;

  const numLimit = Number(editLimit);
  const hasOverall = overallSet && remainingCapacity !== null;

  // Capacity available FOR this card = remaining unallocated + this card's current limit
  const capacityForThisCard = hasOverall
    ? (remainingCapacity ?? 0) + item.limit
    : Infinity;
  const exceedsCapacity = hasOverall && numLimit > 0 && numLimit > capacityForThisCard;
  const editOk = numLimit > 0 && !exceedsCapacity;

  const handleSave = async (e) => {
    e.preventDefault();
    setBackendError("");
    if (!editOk) return;
    setSaving(true);
    try {
      await setBudget({ category: item.category, limit: numLimit, month, year });
      toast.success(`${item.category} budget updated!`);
      setEditMode(false);
      onSaved();
    } catch (err) {
      const msg = err?.message || "Failed to update budget.";
      setBackendError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditLimit(item.limit);
    setBackendError("");
    setEditMode(false);
  };

  return (
    <div style={{
      background: "var(--bg-card)", border: `1px solid ${cfg.color}44`,
      borderRadius: "12px", padding: "1rem 1.25rem",
      transition: "box-shadow 0.2s",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>{item.category}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {!editMode && (
            <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", background: cfg.bg, color: cfg.color }}>
              {cfg.icon} {cfg.label}
            </span>
          )}
          {/* Edit button */}
          <button
            onClick={() => { setEditLimit(item.limit); setBackendError(""); setEditMode((v) => !v); }}
            title={editMode ? "Cancel edit" : "Edit budget"}
            style={{
              background: "none", border: `1px solid var(--border-color)`, cursor: "pointer",
              color: editMode ? "var(--text-muted)" : "var(--primary-color)",
              fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px", borderRadius: "6px",
              lineHeight: 1.4,
            }}
          >
            {editMode ? "✕" : "✎ Edit"}
          </button>
          {/* Delete button */}
          {!editMode && (
            <button onClick={() => onDelete(item._id)} title="Remove budget"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1rem", lineHeight: 1 }}>
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── Inline Edit Form ── */}
      {editMode ? (
        <form onSubmit={handleSave} style={{ marginTop: "8px" }}>
          <div style={{ fontSize: "0.73rem", color: "var(--text-muted)", marginBottom: "6px" }}>
            Current limit: <strong>{formatCurrency(item.limit)}</strong>
            {hasOverall && (
              <span style={{ marginLeft: "8px", color: capacityForThisCard > 0 ? "var(--text-muted)" : "#ef4444" }}>
                · Max allowed: {formatCurrency(capacityForThisCard)}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "0.82rem" }}>₹</span>
              <input
                type="number" min="1" step="1"
                value={editLimit}
                onChange={(e) => { setEditLimit(e.target.value); setBackendError(""); }}
                autoFocus
                className={`filter-select${exceedsCapacity ? " input-error" : ""}`}
                style={{ padding: "0.4rem 0.6rem 0.4rem 1.5rem", width: "100%", boxSizing: "border-box", fontSize: "0.85rem" }}
              />
            </div>
            <button type="submit" className="btn-primary btn-sm" disabled={saving || !editOk}
              style={{ marginTop: 0, height: "34px", whiteSpace: "nowrap", fontSize: "0.8rem" }}>
              {saving ? "…" : "Save"}
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={handleCancel}
              style={{ marginTop: 0, height: "34px", fontSize: "0.8rem" }}>
              Cancel
            </button>
          </div>
          {exceedsCapacity && (
            <p style={{ fontSize: "0.72rem", color: "#ef4444", marginTop: "4px", fontWeight: 500 }}>
              Exceeds overall budget — max {formatCurrency(capacityForThisCard)} allowed
            </p>
          )}
          {backendError && (
            <p style={{ fontSize: "0.72rem", color: "#ef4444", marginTop: "4px", fontWeight: 500 }}>⚠ {backendError}</p>
          )}
        </form>
      ) : (
        /* ── Normal display ── */
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.85rem" }}>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{formatCurrency(item.spent)}</span>
              <span style={{ color: "var(--text-muted)" }}> / {formatCurrency(item.limit)}</span>
            </span>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: cfg.color }}>
              {item.status === "exceeded" 
                ? `+${formatCurrency(overBy)}` 
                : `${formatCurrency(item.remaining)} left`
              }
            </span>
          </div>
          <ProgressBar percentage={item.percentage} status={item.status} />
        </>
      )}
    </div>
  );
};


// ── Main BudgetPanel ──────────────────────────────────────────
const BudgetPanel = ({ month, year }) => {
  const now = new Date();
  const m   = month ?? now.getMonth() + 1;
  const y   = year  ?? now.getFullYear();

  const [analysis, setAnalysis] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setAnalysis(await getBudgetAnalysis(m, y)); }
    catch { toast.error("Failed to load budget analysis."); }
    finally { setLoading(false); }
  }, [m, y]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    try { await deleteBudget(id); toast.success("Budget removed."); load(); }
    catch { toast.error("Failed to remove budget."); }
  };

  const overall              = analysis?.overall      ?? null;
  const summary              = analysis?.summary      ?? {};
  const categories           = analysis?.categories   ?? [];
  const remainingCapacity    = summary.remainingBudgetCapacity ?? null;
  const overallPct           = Math.min(summary.overallPct ?? 0, 100);
  const catStatus            = overallPct >= 100 ? "exceeded" : overallPct >= 70 ? "warning" : "safe";
  const catCfg               = STATUS[catStatus];

  return (
    <div className="chart-card" style={{ marginBottom: "2rem" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div>
          <h3 className="section-title" style={{ marginBottom: "2px" }}>Budget vs Actual</h3>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{MONTH_NAMES[m - 1]} {y}</span>
        </div>
        <button
          className="btn-secondary btn-sm"
          onClick={() => setShowForm((v) => !v)}
          style={{ marginTop: 0 }}
        >
          {showForm ? "✕ Cancel" : "+ Category Budget"}
        </button>
      </div>

      {/* Overall budget card — always visible */}
      <OverallBudgetCard
        overall={overall}
        month={m}
        year={y}
        remainingCapacity={remainingCapacity}
        allocated={summary.totalBudget ?? 0}
        onSaved={load}
      />

      {/* Add category form */}
      {showForm && (
        <div style={{ background: "var(--bg-hover)", borderRadius: "10px", padding: "1rem", marginBottom: "1.25rem" }}>
          <AddCategoryForm
            month={m} year={y}
            remainingCapacity={remainingCapacity}
            overallSet={overall?.limit ?? null}
            onSaved={() => { setShowForm(false); load(); }}
          />
        </div>
      )}

      {loading ? (
        <div className="skeleton-rows">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton-row" style={{ height: 88, animationDelay: `${i * 0.07}s` }} />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div style={{ textAlign: "center", padding: "1.5rem 1rem", color: "var(--text-muted)" }}>
          <p style={{ fontWeight: 600, marginBottom: "4px", color: "var(--text-secondary)" }}>No category budgets yet</p>
          <p style={{ fontSize: "0.82rem" }}>Click "+ Category Budget" to track spending per category.</p>
        </div>
      ) : (
        <>
          {/* Category summary bar */}
          <div style={{ background: catCfg.bg, border: `1px solid ${catCfg.color}44`, borderRadius: "10px", padding: "0.85rem 1.1rem", marginBottom: "1.1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-primary)" }}>
                Category Budgets — {MONTH_NAMES[m - 1]}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {remainingCapacity !== null && (
                  <span style={{ fontSize: "0.75rem", color: remainingCapacity <= 0 ? "#ef4444" : "var(--text-muted)" }}>
                    {formatCurrency(Math.max(remainingCapacity, 0))} allocatable
                  </span>
                )}
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: catCfg.color }}>{overallPct.toFixed(1)}% used</span>
              </div>
            </div>
            <ProgressBar percentage={overallPct} status={catStatus} />
            <div style={{ display: "flex", gap: "1.5rem", marginTop: "8px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
              <span>Budgeted <strong style={{ color: "var(--text-primary)" }}>{formatCurrency(summary.totalBudget ?? 0)}</strong></span>
              <span>Spent <strong style={{ color: catCfg.color }}>{formatCurrency(summary.totalSpent ?? 0)}</strong></span>
              <span>Left <strong style={{ color: "var(--text-primary)" }}>{formatCurrency(Math.max(summary.totalRemaining ?? 0, 0))}</strong></span>
            </div>
          </div>

          {/* Per-category grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.85rem" }}>
            {categories.map((item) => (
              <BudgetCard
                key={item._id}
                item={item}
                month={m}
                year={y}
                remainingCapacity={remainingCapacity}
                overallSet={overall?.limit ?? null}
                onDelete={handleDelete}
                onSaved={load}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default BudgetPanel;
