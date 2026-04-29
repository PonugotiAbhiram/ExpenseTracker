// src/pages/Expenses.jsx
import React from "react";
import Navbar      from "../components/Navbar";
import ExpenseList from "../components/ExpenseList";

const Expenses = () => (
  <div className="dashboard-layout">
    <Navbar />
    <main className="dashboard-main expenses-page">
      <header className="expenses-page__header">
        <div>
          <h1 className="expenses-page__title">Expenses</h1>
          <p className="expenses-page__subtitle">Track, filter and manage all your transactions</p>
        </div>
      </header>
      <ExpenseList />
    </main>
  </div>
);

export default Expenses;
