// ─────────────────────────────────────────────
// src/api/authApi.js
// All authentication-related API calls.
// ─────────────────────────────────────────────

import { post } from "./client";

/**
 * Authenticate an existing user.
 *
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ token: string, user: object }>}
 * @throws  {ApiError}
 */
export const login = ({ email, password }) =>
  post("/auth/login", { email, password });

/**
 * Create a new user account.
 *
 * @param {{ name: string, email: string, password: string }} userData
 * @returns {Promise<{ token: string, user: object }>}
 * @throws  {ApiError}
 */
export const register = (userData) =>
  post("/auth/register", userData);

/**
 * Exchange a refresh token for a new access token.
 *
 * @param {string} refreshToken
 * @returns {Promise<{ token: string }>}
 * @throws  {ApiError}
 */
export const refreshToken = (refreshToken) =>
  post("/auth/refresh", { refreshToken });

/**
 * Invalidate the current session server-side.
 *
 * @returns {Promise<void>}
 * @throws  {ApiError}
 */
export const logout = () =>
  post("/auth/logout", {});