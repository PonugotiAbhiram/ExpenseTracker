// src/components/ExpenseList.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getExpenses, deleteExpense, createExpense, updateExpense } from "../api/expenseApi";
import { EXPENSE_CATEGORIES, ITEMS_PER_PAGE, PAYMENT_METHODS } from "../utils/constants";
import { toast } from "../utils/toast";
import ExpenseItem  from "./ExpenseItem";
import ExpenseForm  from "./ExpenseForm";
import ConfirmModal from "./ConfirmModal";
import Pagination   from "./Pagination";

const SortIcon = ({ field, sort }) => {
  if (sort.field !== field) return <span className="sort-icon sort-icon--neutral">↕</span>;
  return <span className="sort-icon sort-icon--active">{sort.dir === "asc" ? "↑" : "↓"}</span>;
};

const EMPTY_FILTERS = {
  search: "", category: "", paymentMethod: "",
  startDate: "", endDate: "", minAmount: "", maxAmount: "",
};

const ExpenseList = () => {
  // ── Data state ────────────────────────────────────────────
  const [expenses,    setExpenses]    = useState([]);
  const [total,       setTotal]       = useState(0);
  const [totalPages,  setTotalPages]  = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // ── UI state ──────────────────────────────────────────────
  const [filters,       setFilters]       = useState(EMPTY_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort,          setSort]          = useState({ field: "date", dir: "desc" });
  const [isLoading,     setIsLoading]     = useState(false);
  const [formLoading,   setFormLoading]   = useState(false);
  const [showAdvanced,  setShowAdvanced]  = useState(false);

  // ── Form / modal state ────────────────────────────────────
  const [showForm,    setShowForm]    = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);

  // ── Multi-select ──────────────────────────────────────────
  const [selected,     setSelected]    = useState(new Set());

  // ── Confirm modal ─────────────────────────────────────────
  const [confirmState, setConfirmState] = useState(null);

  // ── Debounce search 300ms ─────────────────────────────────
  const searchTimer = useRef(null);
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [filters.search]);

  // ── Active filter count (for badge on filter button) ──────
  const activeFilterCount = useMemo(() => {
    const { search, ...rest } = filters;
    return Object.values(rest).filter(Boolean).length + (debouncedSearch ? 1 : 0);
  }, [filters, debouncedSearch]);

  // ── Fetch (server-side filtering) ─────────────────────────
  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page:  currentPage,
        limit: ITEMS_PER_PAGE,
        ...(debouncedSearch       && { search:        debouncedSearch }),
        ...(filters.category      && { category:      filters.category }),
        ...(filters.paymentMethod && { paymentMethod: filters.paymentMethod }),
        ...(filters.startDate     && { startDate:     filters.startDate }),
        ...(filters.endDate       && { endDate:       filters.endDate }),
        ...(filters.minAmount     && { minAmount:     filters.minAmount }),
        ...(filters.maxAmount     && { maxAmount:     filters.maxAmount }),
      };
      const data = await getExpenses(params);
      setExpenses(data.expenses);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      toast.error(err?.message || "Failed to load expenses.");
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage, debouncedSearch,
    filters.category, filters.paymentMethod,
    filters.startDate, filters.endDate,
    filters.minAmount, filters.maxAmount,
  ]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);
  useEffect(() => { setSelected(new Set()); }, [expenses]);

  // ── Client-side sort only (data is already filtered on server) ──
  const displayedExpenses = useMemo(() => {
    const list = [...expenses];
    list.sort((a, b) => {
      let av = a[sort.field], bv = b[sort.field];
      if (sort.field === "amount") { av = Number(av); bv = Number(bv); }
      if (sort.field === "date")   { av = new Date(av); bv = new Date(bv); }
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ?  1 : -1;
      return 0;
    });
    return list;
  }, [expenses, sort]);

  // ── Handlers ──────────────────────────────────────────────
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    if (name !== "search") setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setCurrentPage(1);
  };

  const handleSort = (field) => {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === "asc" ? "desc" : "asc",
    }));
  };

  const handleCreate = async (data) => {
    setFormLoading(true);
    try {
      const res = await createExpense(data);
      const isOver = res?.data?.isOverBudget || res?.data?.isCategoryExceeded;
      toast.success(isOver ? "Expense added (over budget) ⚠️" : "Expense added successfully!");
      setShowForm(false);
      setCurrentPage(1);
      await fetchExpenses();
    } catch (err) {
      toast.error(err?.message || "Failed to add expense.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (data) => {
    setFormLoading(true);
    try {
      await updateExpense(editTarget._id, data);
      toast.success("Expense updated!");
      setEditTarget(null);
      setShowForm(false);
      await fetchExpenses();
    } catch (err) {
      toast.error(err?.message || "Failed to update expense.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    try {
      await deleteExpense(confirmState.id);
      toast.success("Expense deleted.");
      setConfirmState(null);
      if (expenses.length === 1 && currentPage > 1) setCurrentPage((p) => p - 1);
      else await fetchExpenses();
    } catch (err) {
      toast.error(err?.message || "Failed to delete.");
    }
  };

  const handleBulkDeleteConfirmed = async () => {
    try {
      await Promise.all([...selected].map((id) => deleteExpense(id)));
      toast.success(`${selected.size} expense(s) deleted.`);
      setSelected(new Set());
      setConfirmState(null);
      await fetchExpenses();
    } catch (err) {
      toast.error(err?.message || "Bulk delete failed.");
    }
  };

  const openEdit  = (expense) => { setEditTarget(expense); setShowForm(true); };
  const closeForm = ()        => { setShowForm(false); setEditTarget(null); };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll  = () => {
    if (selected.size === displayedExpenses.length) setSelected(new Set());
    else setSelected(new Set(displayedExpenses.map((e) => e._id)));
  };

  const allSelected = displayedExpenses.length > 0 && selected.size === displayedExpenses.length;

  // ── CSV Export ────────────────────────────────────────────
  const handleExportCSV = () => {
    if (displayedExpenses.length === 0) { toast.error("No data to export"); return; }
    const headers = ["Date", "Description", "Category", "Payment Method", "Amount", "Tags", "Notes"];
    const csvRows = [headers.join(",")];
    for (const exp of displayedExpenses) {
      csvRows.push([
        new Date(exp.date).toLocaleDateString("en-CA"),
        `"${(exp.description || "").replace(/"/g, '""')}"`,
        `"${exp.category || ""}"`,
        `"${exp.paymentMethod || ""}"`,
        exp.amount,
        `"${(exp.tags || []).join(", ")}"`,
        `"${(exp.notes || "").replace(/"/g, '""')}"`,
      ].join(","));
    }
    const link = document.createElement("a");
    link.href     = "data:text/csv;charset=utf-8," + encodeURI(csvRows.join("\n"));
    link.download = `expenses_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export successful!");
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <section className="expense-list-section">

      {/* Header */}
      <div className="section-header">
        <div className="section-header__left">
          <h2 className="section-title">Transactions</h2>
          {!isLoading && <span className="section-count">{total} total</span>}
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn-secondary btn-sm" onClick={handleExportCSV}>
            <DownloadIcon /> Export CSV
          </button>
          <button
            className="btn-primary btn-sm"
            onClick={() => { setEditTarget(null); setShowForm(true); }}
            style={{ marginTop: 0 }}
          >
            <PlusIcon /> Add expense
          </button>
        </div>
      </div>

      {/* ── Search + Filter Bar ─────────────────────────────── */}
      <div className="filters">
        <div className="search-wrap">
          <SearchIcon />
          <input
            className="search-input" type="search" name="search"
            placeholder="Search description…"
            value={filters.search} onChange={handleFilterChange}
          />
        </div>

        <select className="filter-select" name="category" value={filters.category} onChange={handleFilterChange}>
          <option value="">All categories</option>
          {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select className="filter-select" name="paymentMethod" value={filters.paymentMethod} onChange={handleFilterChange}>
          <option value="">All methods</option>
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        {/* Advanced toggle with active-count badge */}
        <button
          className={`btn-secondary btn-sm${showAdvanced ? " btn-active" : ""}`}
          onClick={() => setShowAdvanced((v) => !v)}
          title="Date & amount filters"
        >
          <FilterIcon />
          {activeFilterCount > 0 && (
            <span style={{
              marginLeft: "4px", background: "var(--primary-color)", color: "#fff",
              borderRadius: "10px", padding: "0 6px", fontSize: "0.7rem", fontWeight: 700,
            }}>
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button className="btn-secondary btn-sm" onClick={handleClearFilters} title="Clear all filters">
            ✕ Clear
          </button>
        )}
      </div>

      {/* ── Advanced Filters Panel ─────────────────────────── */}
      {showAdvanced && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.75rem", padding: "1rem",
          background: "var(--bg-card)", borderRadius: "10px",
          border: "1px solid var(--border-color)", marginBottom: "0.5rem",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>FROM DATE</label>
            <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange}
              className="filter-select" style={{ padding: "0.45rem 0.6rem" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>TO DATE</label>
            <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange}
              className="filter-select" style={{ padding: "0.45rem 0.6rem" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>MIN AMOUNT (₹)</label>
            <input type="number" name="minAmount" value={filters.minAmount} onChange={handleFilterChange}
              placeholder="0" min="0" className="filter-select" style={{ padding: "0.45rem 0.6rem" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>MAX AMOUNT (₹)</label>
            <input type="number" name="maxAmount" value={filters.maxAmount} onChange={handleFilterChange}
              placeholder="∞" min="0" className="filter-select" style={{ padding: "0.45rem 0.6rem" }} />
          </div>
        </div>
      )}

      {/* ── Active Filter Chips ─────────────────────────────── */}
      {activeFilterCount > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "0.5rem" }}>
          {debouncedSearch       && <Chip label={`Search: "${debouncedSearch}"`}      onRemove={() => setFilters((p) => ({ ...p, search: "" }))} />}
          {filters.category      && <Chip label={`Category: ${filters.category}`}     onRemove={() => setFilters((p) => ({ ...p, category: "" }))} />}
          {filters.paymentMethod && <Chip label={`Method: ${filters.paymentMethod}`}  onRemove={() => setFilters((p) => ({ ...p, paymentMethod: "" }))} />}
          {filters.startDate     && <Chip label={`From: ${filters.startDate}`}        onRemove={() => setFilters((p) => ({ ...p, startDate: "" }))} />}
          {filters.endDate       && <Chip label={`To: ${filters.endDate}`}            onRemove={() => setFilters((p) => ({ ...p, endDate: "" }))} />}
          {filters.minAmount     && <Chip label={`Min: ₹${filters.minAmount}`}        onRemove={() => setFilters((p) => ({ ...p, minAmount: "" }))} />}
          {filters.maxAmount     && <Chip label={`Max: ₹${filters.maxAmount}`}        onRemove={() => setFilters((p) => ({ ...p, maxAmount: "" }))} />}
        </div>
      )}

      {/* Sort bar */}
      <div className="sort-bar">
        <span className="sort-bar__label">Sort by:</span>
        {[["date","Date"],["amount","Amount"],["category","Category"]].map(([f, label]) => (
          <button
            key={f}
            className={`sort-btn${sort.field === f ? " sort-btn--active" : ""}`}
            onClick={() => handleSort(f)}
          >
            {label} <SortIcon field={f} sort={sort} />
          </button>
        ))}
        {selected.size > 0 && (
          <div className="bulk-toolbar">
            <span>{selected.size} selected</span>
            <button className="btn-danger btn-sm" onClick={() => setConfirmState({ type: "bulk" })}>
              Delete selected
            </button>
            <button className="btn-secondary btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="expense-list" role="table" aria-label="Expenses">
        {!isLoading && displayedExpenses.length > 0 && (
          <div className="expense-list__header">
            <input type="checkbox" className="expense-checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Select all</span>
          </div>
        )}

        {isLoading ? (
          <div className="list-state">
            <div className="skeleton-rows">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton-row" style={{ animationDelay: `${i * 0.06}s` }} />
              ))}
            </div>
          </div>
        ) : displayedExpenses.length === 0 ? (
          <div className="list-state list-state--empty">
            <EmptyIcon />
            <p>No expenses found</p>
            <span>{activeFilterCount > 0 ? "Try clearing some filters" : "Add a new expense to get started"}</span>
          </div>
        ) : (
          displayedExpenses.map((expense) => (
            <ExpenseItem
              key={expense._id}
              expense={expense}
              onEdit={openEdit}
              onDelete={(id) => setConfirmState({ type: "single", id })}
              selected={selected.has(expense._id)}
              onSelect={toggleSelect}
              showSelect
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      )}

      {showForm && (
        <ExpenseForm
          initialData={editTarget}
          onSubmit={editTarget ? handleUpdate : handleCreate}
          onClose={closeForm}
          isLoading={formLoading}
        />
      )}

      {confirmState && (
        <ConfirmModal
          title={confirmState.type === "bulk" ? `Delete ${selected.size} expense(s)?` : "Delete expense?"}
          message="This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={confirmState.type === "bulk" ? handleBulkDeleteConfirmed : handleDeleteConfirmed}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </section>
  );
};

// ── Filter Chip ─────────────────────────────────────────────────
const Chip = ({ label, onRemove }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: "4px",
    padding: "3px 10px", borderRadius: "20px", fontSize: "0.75rem",
    background: "var(--bg-hover)", color: "var(--text-secondary)",
    border: "1px solid var(--border-color)", fontWeight: 500,
  }}>
    {label}
    <button
      onClick={onRemove}
      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, lineHeight: 1, fontSize: "0.9rem" }}
    >×</button>
  </span>
);

// ── Icons ────────────────────────────────────────────────────────
const PlusIcon     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const SearchIcon   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const EmptyIcon    = () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/></svg>;
const DownloadIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const FilterIcon   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>;

export default ExpenseList;