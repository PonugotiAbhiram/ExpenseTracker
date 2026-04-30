// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider }   from "./context/AuthContext";
import { ThemeProvider }  from "./context/ThemeContext";
import ProtectedRoute     from "./routes/ProtectedRoute";
import ToastContainer     from "./components/ToastContainer";

import Login     from "./pages/Login";
import Register  from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Expenses  from "./pages/Expenses";
import Analytics from "./pages/Analytics";

import { ROUTES } from "./utils/constants";

const App = () => (
  <AuthProvider>
    <ThemeProvider>
      <BrowserRouter>
        {/* Toast notifications — rendered above all routes */}
      <ToastContainer />

      <Routes>
        <Route path="/" element={<Navigate to={ROUTES.LOGIN} replace />} />
        <Route path={ROUTES.LOGIN}    element={<Login />} />
        <Route path={ROUTES.REGISTER} element={<Register />} />

        <Route element={<ProtectedRoute />}>
          <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
          <Route path={ROUTES.EXPENSES}  element={<Expenses />} />
          <Route path={ROUTES.ANALYTICS} element={<Analytics />} />
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  </AuthProvider>
);

export default App;