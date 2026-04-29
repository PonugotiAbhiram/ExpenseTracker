// context/AuthContext.jsx
import React from "react";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { login as loginApi, logout as logoutApi } from "../api/authApi";
import { TOKEN_KEY, USER_KEY } from "../utils/constants";

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // guards first render

  // Restore session on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {
      // Corrupted storage — clear and start fresh
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  const loginUser = useCallback(async (email, password) => {
    const data = await loginApi({ email, password });
    // Let errors propagate naturally — caller decides how to show them

    localStorage.setItem(TOKEN_KEY, data.token);
    const userData = data.data || data.user;
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logoutUser = useCallback(async () => {
    try {
      await logoutApi(); // invalidate token server-side if your API supports it
    } catch {
      // Best-effort — always clear client side regardless
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
    }
  }, []);

  // Memoised so consumers only re-render when values actually change
  const value = useMemo(
    () => ({ user, loading, loginUser, logoutUser }),
    [user, loading, loginUser, logoutUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};