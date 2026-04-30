// src/api/budgetApi.js
import { get, post, del } from "./client";

const now = new Date();

// ── Set (create/update) a budget ──────────────────────────────
export const setBudget = async ({ category, limit, month, year }) => {
  const res = await post("/budgets", { category, limit, month, year });
  return res?.data ?? res;
};

// ── Fetch budgets for a month ─────────────────────────────────
export const getBudgets = async (month = now.getMonth() + 1, year = now.getFullYear()) => {
  const res = await get(`/budgets?month=${month}&year=${year}`);
  return Array.isArray(res?.data) ? res.data : [];
};

// ── Delete a budget ───────────────────────────────────────────
export const deleteBudget = async (id) => {
  const res = await del(`/budgets/${id}`);
  return res?.data ?? res;
};

// ── Full analysis (budget vs actual) ─────────────────────────
export const getBudgetAnalysis = async (month = now.getMonth() + 1, year = now.getFullYear()) => {
  const res = await get(`/budgets/analysis?month=${month}&year=${year}`);
  return res?.data ?? { summary: {}, categories: [] };
};
