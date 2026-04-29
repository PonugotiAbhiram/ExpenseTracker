// src/pages/Register.jsx
import React from "react";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register as registerApi } from "../api/authApi";
import { ROUTES, TOKEN_KEY, USER_KEY } from "../utils/constants";
import { useAuth } from "../context/AuthContext";


const Register = () => {
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors]           = useState({});
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading]     = useState(false);

  // ── Validation ──────────────────────────────────────────────

  const validate = () => {
    const e = {};

    if (!formData.name.trim()) {
      e.name = "Full name is required";
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      e.email = "Please enter a valid email address";
    }

    if (!formData.password || formData.password.length < 8) {
      e.password = "Password must be at least 8 characters";
    }

    if (formData.confirmPassword !== formData.password) {
      e.confirmPassword = "Passwords do not match";
    }

    return e;
  };

  // ── Handlers ────────────────────────────────────────────────

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setServerError("");

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
    await registerApi({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
    });

    await loginUser(
        formData.email.trim(),
        formData.password
    );
  
    navigate(ROUTES.DASHBOARD);

    } catch (err) {
    setServerError(
        err?.message || err?.error || "Registration failed. Please try again."
    );
    } finally {
    setIsLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="login-page">          {/* reuse auth-page styles */}
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-icon" />
          <span className="brand-name">Expensify</span>
        </div>

        <h2 className="login-title">Create your account</h2>
        <p className="login-subtitle">Start tracking your expenses today</p>

        {serverError && (
          <div className="alert alert-danger" role="alert">
            <AlertIcon />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleRegister} noValidate>
          {/* Name */}
          <div className="form-field">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Jane Doe"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? "input-error" : ""}
              autoComplete="name"
              disabled={isLoading}
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          {/* Email */}
          <div className="form-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? "input-error" : ""}
              autoComplete="email"
              disabled={isLoading}
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          {/* Password */}
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Min. 8 characters"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? "input-error" : ""}
              autoComplete="new-password"
              disabled={isLoading}
            />
            {errors.password && (
              <span className="field-error">{errors.password}</span>
            )}
          </div>

          {/* Confirm password */}
          <div className="form-field">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={errors.confirmPassword ? "input-error" : ""}
              autoComplete="new-password"
              disabled={isLoading}
            />
            {errors.confirmPassword && (
              <span className="field-error">{errors.confirmPassword}</span>
            )}
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? <Spinner /> : "Create account"}
          </button>
        </form>

        <p className="register-prompt">
          Already have an account? <Link to={ROUTES.LOGIN}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────

const Spinner = () => (
  <span className="spinner" role="status" aria-label="Loading" />
);

const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8"  x2="12"    y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export default Register;