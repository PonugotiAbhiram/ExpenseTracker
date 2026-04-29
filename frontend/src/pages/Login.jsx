import React from "react";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROUTES } from "../utils/constants";

const Login = () => {
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.password || formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setServerError("");

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
        await loginUser(
        formData.email.trim(),
        formData.password
        );
        navigate(ROUTES.DASHBOARD);
    } catch (err) {
      setServerError(
        err?.message || err?.error || "Invalid email or password. Please try again."
        );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-icon">
            {/* replace with your logo */}
          </div>
          <span className="brand-name">Expensify</span>
        </div>

        <h2 className="login-title">Welcome back</h2>
        <p className="login-subtitle">Sign in to your account to continue</p>

        {serverError && (
          <div className="alert alert-danger" role="alert">
            <AlertIcon />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleLogin} noValidate>
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

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? "input-error" : ""}
              autoComplete="current-password"
              disabled={isLoading}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          {/* 
            <Link to={ROUTES.FORGOT_PASSWORD} className="forgot-link">
            Forgot password?
            </Link> 
            */}

          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? <Spinner /> : "Sign in"}
          </button>
        </form>

        <p className="register-prompt">
          Don't have an account? <Link to={ROUTES.REGISTER}>Create one</Link>
        </p>
      </div>
    </div>
  );
};

const Spinner = () => (
  <span className="spinner" role="status" aria-label="Loading" />
);

const AlertIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export default Login;