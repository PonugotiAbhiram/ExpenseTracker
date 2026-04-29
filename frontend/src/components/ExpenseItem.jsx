// src/components/ExpenseItem.jsx
import React from "react";
import { formatRelativeDate, formatCurrency } from "../utils/formatDate";

const CATEGORY_COLORS = {
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

const getCategoryColor = (cat) => CATEGORY_COLORS[cat] || CATEGORY_COLORS["Other"];

const ExpenseItem = ({ expense, onEdit, onDelete, selected = false, onSelect, showSelect = false }) => {
  const color = getCategoryColor(expense.category);
  const tags  = Array.isArray(expense.tags) ? expense.tags : [];

  return (
    <div
      className={`expense-item${selected ? " expense-item--selected" : ""}`}
      role="row"
    >
      {/* Checkbox */}
      {showSelect && (
        <div className="expense-item__check">
          <input
            type="checkbox"
            className="expense-checkbox"
            checked={selected}
            onChange={() => onSelect && onSelect(expense._id)}
            aria-label={`Select ${expense.description}`}
          />
        </div>
      )}

      {/* Left — dot + info */}
      <div className="expense-item__left">
        <div className="expense-item__dot" style={{ background: color }} aria-hidden="true" />
        <div className="expense-item__info">
          <span className="expense-item__desc">{expense.description || "Untitled"}</span>
          <div className="expense-item__meta">
            <span className="expense-item__category" style={{ color, borderColor: `${color}33` }}>
              {expense.category}
            </span>
            {expense.paymentMethod && (
              <span className="payment-badge">{expense.paymentMethod}</span>
            )}
            {tags.slice(0, 2).map((tag) => (
              <span key={tag} className="tag-chip">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right — amount + date + actions */}
      <div className="expense-item__right">
        <span className="expense-item__amount">{formatCurrency(expense.amount)}</span>
        <span className="expense-item__date">{formatRelativeDate(expense.date)}</span>
        <div className="expense-item__actions">
          <button
            className="action-btn action-btn--edit"
            onClick={() => onEdit(expense)}
            title="Edit"
            aria-label={`Edit ${expense.description}`}
          >
            <EditIcon />
          </button>
          <button
            className="action-btn action-btn--delete"
            onClick={() => onDelete(expense._id)}
            title="Delete"
            aria-label={`Delete ${expense.description}`}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

const EditIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);

export default ExpenseItem;