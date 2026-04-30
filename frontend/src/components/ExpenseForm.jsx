// src/components/ExpenseForm.jsx
import React, { useState, useEffect } from "react";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "../utils/constants";
import { autoCategorize } from "../utils/autoCategorize";

const EMPTY_FORM = {
  description:   "",
  amount:        "",
  category:      "",
  paymentMethod: "",
  date:          new Date().toISOString().slice(0, 10),
  tags:          "",
  notes:         "",
  isRecurring:   false,
  recurrenceType: "monthly",
};

const ExpenseForm = ({ initialData = null, onSubmit, onClose, isLoading }) => {
  const isEditing = Boolean(initialData);
  const [form,   setForm]   = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [autoDetected, setAutoDetected] = useState(false);
  const [isCategoryManuallySet, setIsCategoryManuallySet] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        description:   initialData.description   || "",
        amount:        initialData.amount        || "",
        category:      initialData.category      || "",
        paymentMethod: initialData.paymentMethod || "",
        date:          initialData.date
          ? new Date(initialData.date).toISOString().slice(0, 10)
          : EMPTY_FORM.date,
        tags:  Array.isArray(initialData.tags) ? initialData.tags.join(", ") : (initialData.tags || ""),
        notes: initialData.notes || "",
        isRecurring: initialData.isRecurring || false,
        recurrenceType: initialData.recurrenceType || "monthly",
      });
      setIsCategoryManuallySet(Boolean(initialData.category));
    } else {
      setForm(EMPTY_FORM);
      setIsCategoryManuallySet(false);
    }
    setAutoDetected(false);
  }, [initialData]);

  // Dynamic Auto-Categorization
  useEffect(() => {
    if (!form.description) {
      setIsCategoryManuallySet(false);
      setAutoDetected(false);
      return;
    }

    if (!isCategoryManuallySet) {
      const suggestedCategory = autoCategorize(form.description);
      if (suggestedCategory && suggestedCategory !== form.category) {
        setForm((prev) => ({ ...prev, category: suggestedCategory }));
        setAutoDetected(true);
      }
    }
  }, [form.description, isCategoryManuallySet, form.category]);

  const validate = () => {
    const e = {};
    if (!form.description.trim())                               e.description = "Description is required";
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) e.amount = "Enter a valid positive amount";
    if (!form.category)                                         e.category = "Please select a category";
    if (!form.date)                                             e.date     = "Date is required";
    if (form.isRecurring && !form.recurrenceType)               e.recurrenceType = "Select recurrence type";
    return e;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    
    if (name === "category") {
      setIsCategoryManuallySet(true);
      setAutoDetected(false);
    }

    setForm((prev) => ({ ...prev, [name]: val }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    await onSubmit({
      description:   form.description.trim(),
      amount:        parseFloat(form.amount),
      category:      form.category || "Other", // Fallback for safety
      paymentMethod: form.paymentMethod || undefined,
      date:          form.date,
      tags:          form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      notes:         form.notes.trim() || undefined,
      isRecurring:   form.isRecurring,
      recurrenceType: form.isRecurring ? form.recurrenceType : undefined,
    });
  };

  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <div className="modal-backdrop" onClick={handleBackdrop} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal modal--wide">

        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">
            {isEditing ? "Edit Expense" : "New Expense"}
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="modal-body">

          {/* Description */}
          <div className="form-field">
            <label htmlFor="ef-description">Description</label>
            <input
              id="ef-description" name="description" type="text"
              placeholder="e.g. Lunch at café"
              value={form.description} onChange={handleChange}
              className={errors.description ? "input-error" : ""}
              disabled={isLoading} autoFocus
            />
            {errors.description && <span className="field-error">{errors.description}</span>}
          </div>

          {/* Amount + Date (2-col) */}
          <div className="form-row-2">
            <div className="form-field">
              <label htmlFor="ef-amount">Amount (₹)</label>
              <div className="input-prefix-wrap">
                <span className="input-prefix">₹</span>
                <input
                  id="ef-amount" name="amount" type="number"
                  min="0.01" step="0.01" placeholder="0.00"
                  value={form.amount} onChange={handleChange}
                  className={`input-prefixed${errors.amount ? " input-error" : ""}`}
                  disabled={isLoading}
                />
              </div>
              {errors.amount && <span className="field-error">{errors.amount}</span>}
            </div>

            <div className="form-field">
              <label htmlFor="ef-date">Date</label>
              <input
                id="ef-date" name="date" type="date"
                value={form.date} onChange={handleChange}
                className={errors.date ? "input-error" : ""}
                disabled={isLoading}
              />
              {errors.date && <span className="field-error">{errors.date}</span>}
            </div>
          </div>

          {/* Category + Payment Method (2-col) */}
          <div className="form-row-2">
            <div className="form-field">
              <label htmlFor="ef-category">Category</label>
              <select
                id="ef-category" name="category"
                value={form.category} onChange={handleChange}
                className={errors.category ? "input-error" : ""}
                disabled={isLoading}
              >
                <option value="" disabled>Select category</option>
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {autoDetected && !errors.category && (
                <span style={{ fontSize: "0.75rem", color: "var(--primary-color)", marginTop: "4px", display: "block" }}>
                  ✨ Auto-detected category
                </span>
              )}
              {errors.category && <span className="field-error">{errors.category}</span>}
            </div>

            <div className="form-field">
              <label htmlFor="ef-paymentMethod">Payment Method</label>
              <select
                id="ef-paymentMethod" name="paymentMethod"
                value={form.paymentMethod} onChange={handleChange}
                disabled={isLoading}
              >
                <option value="">Optional</option>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className="form-field">
            <label htmlFor="ef-tags">
              Tags&nbsp;<span style={{ fontWeight: 400, color: "var(--text-muted)" }}>— comma-separated, optional</span>
            </label>
            <input
              id="ef-tags" name="tags" type="text"
              placeholder="e.g. work, client, lunch"
              value={form.tags} onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          {/* Notes */}
          <div className="form-field">
            <label htmlFor="ef-notes">
              Notes&nbsp;<span style={{ fontWeight: 400, color: "var(--text-muted)" }}>— optional</span>
            </label>
            <textarea
              id="ef-notes" name="notes" rows={2}
              placeholder="Any additional details..."
              value={form.notes} onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          {/* Recurring Options */}
          <div className="form-field" style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px", marginBottom: "16px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: "normal" }}>
              <input
                type="checkbox"
                name="isRecurring"
                checked={form.isRecurring}
                onChange={handleChange}
                disabled={isLoading}
                style={{ width: "16px", height: "16px", accentColor: "var(--primary-color)" }}
              />
              Make this a recurring expense
            </label>

            {form.isRecurring && (
              <div style={{ marginLeft: "24px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <label htmlFor="ef-recurrenceType" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Recurs every</label>
                <select
                  id="ef-recurrenceType"
                  name="recurrenceType"
                  value={form.recurrenceType}
                  onChange={handleChange}
                  disabled={isLoading}
                  className={errors.recurrenceType ? "input-error" : ""}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                {errors.recurrenceType && <span className="field-error">{errors.recurrenceType}</span>}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? <Spinner /> : isEditing ? "Save changes" : "Add expense"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const Spinner = () => <span className="spinner" role="status" aria-label="Loading" />;

export default ExpenseForm;