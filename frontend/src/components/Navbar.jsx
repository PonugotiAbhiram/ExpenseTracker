// src/components/Navbar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { ROUTES } from "../utils/constants";

const Navbar = () => {
  const { user, logoutUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutUser();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <nav className="navbar">
      {/* Brand */}
      <div className="navbar-brand">
        <div className="brand-logo">
          <WalletIcon />
        </div>
        <span className="brand-name">Expensify</span>
      </div>

      {/* Nav links */}
      <ul className="navbar-links">
        <li>
          <NavLink
            to={ROUTES.DASHBOARD}
            className={({ isActive }) => `navbar-link${isActive ? " navbar-link--active" : ""}`}
          >
            <DashboardIcon />
            <span>Dashboard</span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to={ROUTES.EXPENSES}
            className={({ isActive }) => `navbar-link${isActive ? " navbar-link--active" : ""}`}
          >
            <ListIcon />
            <span>Expenses</span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to={ROUTES.ANALYTICS}
            className={({ isActive }) => `navbar-link${isActive ? " navbar-link--active" : ""}`}
          >
            <AnalyticsIcon />
            <span>Analytics</span>
          </NavLink>
        </li>
      </ul>

      {/* User section */}
      <div className="navbar-footer">
        <div className="navbar-user">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <span className="user-name">{user?.name || "User"}</span>
            <span className="user-email">{user?.email || ""}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={toggleTheme} title="Toggle theme" style={{ marginRight: "0.25rem" }}>
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
        <button className="logout-btn" onClick={handleLogout} title="Sign out">
          <LogoutIcon />
        </button>
      </div>
    </nav>
  );
};

const WalletIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/>
    <path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/>
    <circle cx="16" cy="14" r="1" fill="currentColor"/>
  </svg>
);
const DashboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);
const ListIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);
const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const AnalyticsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);
const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);
const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export default Navbar;