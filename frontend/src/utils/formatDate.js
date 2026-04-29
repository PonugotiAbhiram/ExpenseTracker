// src/utils/formatDate.js

/**
 * Format an ISO date string or Date object to a readable display string.
 * e.g. "Apr 14, 2026"
 *
 * @param {string|Date} date
 * @returns {string}
 */
export const formatDate = (date) => {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  }).format(new Date(date));
};

/**
 * Format a number as USD currency.
 * e.g. 1234.5 → "$1,234.50"
 *
 * @param {number} amount
 * @returns {string}
 */
export const formatCurrency = (amount) => {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style:                 "currency",
    currency:              "INR",
    minimumFractionDigits: 2,
  }).format(amount);
};

/**
 * Return "Today", "Yesterday", or formatted date for recent entries.
 *
 * @param {string|Date} date
 * @returns {string}
 */
export const formatRelativeDate = (date) => {
  if (!date) return "—";
  const d     = new Date(date);
  const today = new Date();
  const diff  = Math.floor((today - d) / 86_400_000);

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return formatDate(d);
};