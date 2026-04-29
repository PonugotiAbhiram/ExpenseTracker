// ─────────────────────────────────────────────
// src/utils/constants.js
// Central configuration & app-wide constants
// ─────────────────────────────────────────────

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const TOKEN_KEY = "auth_token";
export const USER_KEY  = "auth_user";

export const HTTP_STATUS = {
  OK:           200,
  CREATED:      201,
  BAD_REQUEST:  400,
  UNAUTHORIZED: 401,
  FORBIDDEN:    403,
  NOT_FOUND:    404,
  SERVER_ERROR: 500,
};

export const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Housing",
  "Entertainment",
  "Healthcare",
  "Shopping",
  "Education",
  "Travel",
  "Utilities",
  "Other",
];

export const PAYMENT_METHODS = [
  "Cash",
  "Card",
  "UPI",
  "Bank Transfer",
  "Other",
];

export const ITEMS_PER_PAGE = 10;

// ─── Routes (Frontend navigation paths) ─────────────────────

export const ROUTES = {
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",
  EXPENSES: "/expenses",
  FORGOT_PASSWORD: "/forgot-password",
};