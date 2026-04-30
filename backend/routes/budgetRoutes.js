const express = require("express");
const router  = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { setBudget, getBudgets, deleteBudget, getBudgetAnalysis } = require("../controllers/budgetController");

// ── Analysis must come before /:id ────────────────────────────
router.get("/analysis", protect, getBudgetAnalysis);

router.get("/",         protect, getBudgets);
router.post("/",        protect, setBudget);
router.delete("/:id",   protect, deleteBudget);

module.exports = router;
