// src/api/expenseApi.js
// All expense-related API calls — responses normalised here so
// callers never have to unwrap { success, data: { ... } } themselves.

import { get, post, put, del } from "./client";
import { ITEMS_PER_PAGE } from "../utils/constants";

// ── List ──────────────────────────────────────────────────────

/**
 * Returns { expenses, total, totalPages, page }
 */
export const getExpenses = async ({ page = 1, limit = ITEMS_PER_PAGE, ...filters } = {}) => {
  const query = new URLSearchParams({ page, limit, ...filters }).toString();
  const res   = await get(`/expenses?${query}`);
  // backend: { success, data: { expenses, pagination: { total, totalPages, page, … } } }
  const payload = res?.data ?? res ?? {};
  return {
    expenses:   payload.expenses              ?? [],
    total:      payload.pagination?.total     ?? 0,
    totalPages: payload.pagination?.totalPages ?? 1,
    page:       payload.pagination?.page      ?? page,
  };
};

// ── Single ────────────────────────────────────────────────────

export const getExpenseById = async (id) => {
  const res = await get(`/expenses/${id}`);
  return res?.data ?? res;
};

// ── Create ────────────────────────────────────────────────────

export const createExpense = (expenseData) =>
  post("/expenses", expenseData);

// ── Update ────────────────────────────────────────────────────

export const updateExpense = (id, expenseData) =>
  put(`/expenses/${id}`, expenseData);

// ── Delete ────────────────────────────────────────────────────

export const deleteExpense = (id) =>
  del(`/expenses/${id}`);

// ── Analytics ────────────────────────────────────────────────

/**
 * Returns { total, count, thisMonth }
 */
export const getTotalExpenses = async () => {
  const res = await get("/expenses/total");
  return res?.data ?? { total: 0, count: 0, thisMonth: 0 };
};

/**
 * Returns array of { category, total, count, avgAmount }
 */
export const getCategoryData = async () => {
  const res = await get("/expenses/category");
  return Array.isArray(res?.data) ? res.data : [];
};

/**
 * Returns { trends, insights }
 */
export const getSpendingTrends = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await get(`/expenses/trends?${query}`);
  return res?.data ?? { trends: [], insights: {} };
};

/**
 * Returns array of { year, month, total, count }
 */
export const getMonthlyData = async () => {
  const res = await get("/expenses/monthly");
  return Array.isArray(res?.data) ? res.data : [];
};