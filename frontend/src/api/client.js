// ─────────────────────────────────────────────
// src/api/client.js
// Core HTTP client — token injection, unified
// error normalisation, and response parsing.
// ─────────────────────────────────────────────

import { API_BASE_URL, TOKEN_KEY } from "../utils/constants";

// ── Error class ──────────────────────────────

export class ApiError extends Error {
  /**
   * @param {string}  message   Human-readable description
   * @param {number}  status    HTTP status code
   * @param {object}  [errors]  Field-level validation errors (optional)
   */
  constructor(message, status, errors = null) {
    super(message);
    this.name    = "ApiError";
    this.status  = status;
    this.errors  = errors;
  }
}

// ── Token helpers ────────────────────────────

const getToken = () => localStorage.getItem(TOKEN_KEY);

// ── Core request fn ──────────────────────────

/**
 * Wraps fetch with:
 *  - automatic Content-Type / Accept headers
 *  - Bearer token injection when present
 *  - unified JSON-or-text response parsing
 *  - ApiError normalisation for non-2xx responses
 *
 * @param {string} endpoint   Path relative to API_BASE_URL (e.g. "/auth/login")
 * @param {RequestInit} [options]
 * @returns {Promise<any>}    Parsed response body
 */
export const request = async (endpoint, options = {}) => {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    Accept:         "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // Parse body — gracefully handle empty responses (e.g. 204 No Content)
  const contentType = response.headers.get("Content-Type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      (typeof body === "object" && (body?.message || body?.error)) ||
      `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, body?.errors ?? null);
  }

  return body;
};

// ── Convenience methods ──────────────────────

export const get    = (endpoint, options = {}) =>
  request(endpoint, { method: "GET", ...options });

export const post   = (endpoint, payload, options = {}) =>
  request(endpoint, {
    method: "POST",
    body:   JSON.stringify(payload),
    ...options,
  });

export const put    = (endpoint, payload, options = {}) =>
  request(endpoint, {
    method: "PUT",
    body:   JSON.stringify(payload),
    ...options,
  });

export const patch  = (endpoint, payload, options = {}) =>
  request(endpoint, {
    method: "PATCH",
    body:   JSON.stringify(payload),
    ...options,
  });

export const del    = (endpoint, options = {}) =>
  request(endpoint, { method: "DELETE", ...options });