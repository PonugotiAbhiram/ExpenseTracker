const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { body } = require("express-validator");

const {
  addExpense,
  getExpenses,
  deleteExpense,
  updateExpense,
  getTotalExpenses,
  getExpensesByCategory,
  getMonthlySummary

} = require("../controllers/expenseController");

// Validation rules
const expenseRules = [
  body("amount").isFloat({ gt: 0 }).withMessage("Amount must be positive"),
];

// Routes
router.get("/total", protect, getTotalExpenses);
router.get("/category", protect, getExpensesByCategory);
router.get("/monthly", protect, getMonthlySummary);

router.get("/", protect, getExpenses);

router.post("/", protect, expenseRules, addExpense);
router.put("/:id", protect, updateExpense);
router.delete("/:id", protect, deleteExpense);

module.exports = router;