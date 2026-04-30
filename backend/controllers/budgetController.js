const Budget  = require("../models/Budget");
const Expense = require("../models/Expense");

const sendError   = (res, status, msg)  => res.status(status).json({ success: false, message: msg });
const sendSuccess = (res, status, data) => res.status(status).json({ success: true,  data });

// ─── POST /api/budgets ── Create or update a budget ──────────────────────────
const setBudget = async (req, res) => {
  try {
    const { category, limit, month, year } = req.body;
    const newLimit = Number(limit);
    const m = Number(month);
    const y = Number(year);

    if (!category || !limit || !month || !year)
      return sendError(res, 400, "category, limit, month, and year are required");
    if (newLimit <= 0) return sendError(res, 400, "Limit must be greater than 0");
    if (m < 1 || m > 12) return sendError(res, 400, "Month must be between 1 and 12");

    // ── Budget integrity check (skip for __overall__ itself) ──────────────────
    if (category !== "__overall__") {
      // Fetch overall budget + all existing category budgets for the period
      const [overallDoc, existingBudgets] = await Promise.all([
        Budget.findOne({ user: req.user._id, category: "__overall__", month: m, year: y }),
        Budget.find({ user: req.user._id, month: m, year: y, category: { $ne: "__overall__" } }),
      ]);

      // Current limit of this category (0 if new) — subtract before summing
      const currentDoc = existingBudgets.find((b) => b.category === category);
      const currentLimit = currentDoc?.limit ?? 0;

      // Sum of all OTHER category budgets
      const otherCategorySum = existingBudgets.reduce((s, b) => {
        return b.category === category ? s : s + b.limit;
      }, 0);

      if (overallDoc) {
        const remainingAllowed = overallDoc.limit - otherCategorySum;
        if (newLimit > remainingAllowed) {
          return sendError(res, 400,
            `Category budget exceeds remaining overall budget. ` +
            `You can allocate at most ₹${remainingAllowed.toLocaleString("en-IN")} to this category.`
          );
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Upsert — create or update for the same period
    const budget = await Budget.findOneAndUpdate(
      { user: req.user._id, category, month: m, year: y },
      { limit: newLimit },
      { new: true, upsert: true, runValidators: true }
    );

    // Compute updated capacity to return to client
    const allCategoryBudgets = await Budget.find({
      user: req.user._id, month: m, year: y, category: { $ne: "__overall__" },
    });
    const overallDoc = await Budget.findOne({
      user: req.user._id, category: "__overall__", month: m, year: y,
    });
    const allocatedSum = allCategoryBudgets.reduce((s, b) => s + b.limit, 0);
    const remainingCapacity = overallDoc ? Math.max(overallDoc.limit - allocatedSum, 0) : null;

    return sendSuccess(res, 200, {
      budget,
      totalCategoryBudget: allocatedSum,
      remainingBudgetCapacity: remainingCapacity,
    });
  } catch (err) {
    console.error("[setBudget]", err);
    return sendError(res, 500, "Failed to save budget");
  }
};


// ─── GET /api/budgets ── List budgets for a month/year ───────────────────────
const getBudgets = async (req, res) => {
  try {
    const now   = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year  = Number(req.query.year)  || now.getFullYear();

    const budgets = await Budget.find({ user: req.user._id, month, year }).sort({ category: 1 });
    return sendSuccess(res, 200, budgets);
  } catch (err) {
    console.error("[getBudgets]", err);
    return sendError(res, 500, "Failed to fetch budgets");
  }
};

// ─── DELETE /api/budgets/:id ──────────────────────────────────────────────────
const deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!budget) return sendError(res, 404, "Budget not found");
    return sendSuccess(res, 200, { id: req.params.id });
  } catch (err) {
    console.error("[deleteBudget]", err);
    return sendError(res, 500, "Failed to delete budget");
  }
};

// ─── GET /api/budgets/analysis ── Budget vs Actual aggregation ───────────────
const getBudgetAnalysis = async (req, res) => {
  try {
    const now   = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year  = Number(req.query.year)  || now.getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate   = new Date(year, month, 0, 23, 59, 59, 999);

    const [allBudgets, spendingAgg] = await Promise.all([
      Budget.find({ user: req.user._id, month, year }),
      Expense.aggregate([
        { $match: { user: req.user._id, date: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: "$category", spent: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
    ]);

    // Split overall sentinel from category budgets
    const overallDoc    = allBudgets.find((b) => b.category === "__overall__");
    const categoryBudgets = allBudgets.filter((b) => b.category !== "__overall__");

    // Spending lookup map
    const spendingMap = {};
    for (const entry of spendingAgg) {
      spendingMap[entry._id] = { spent: entry.spent, count: entry.count };
    }

    // Total actual spending this month (all categories)
    const totalActualSpent = spendingAgg.reduce((s, e) => s + e.spent, 0);

    // Per-category analysis
    const analysis = categoryBudgets.map((b) => {
      const spent      = spendingMap[b.category]?.spent ?? 0;
      const remaining  = b.limit - spent;
      const percentage = b.limit > 0 ? Math.min((spent / b.limit) * 100, 999) : 0;
      const status     = percentage >= 100 ? "exceeded" : percentage >= 70 ? "warning" : "safe";
      return {
        _id: b._id, category: b.category, limit: b.limit,
        spent: Math.round(spent * 100) / 100,
        remaining: Math.round(remaining * 100) / 100,
        percentage: Math.round(percentage * 10) / 10,
        status,
        txCount: spendingMap[b.category]?.count ?? 0,
      };
    });

    const ORDER = { exceeded: 0, warning: 1, safe: 2 };
    analysis.sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.percentage - a.percentage);

    // Category-level totals (sum of per-category budgets)
    const categoryBudgetTotal = categoryBudgets.reduce((s, b) => s + b.limit, 0);
    const categorySpentTotal  = analysis.reduce((s, a) => s + a.spent, 0);

    // Overall budget doc (user-defined single limit)
    const overallLimit   = overallDoc?.limit ?? null;
    const overallSpent   = Math.round(totalActualSpent * 100) / 100;
    const overallPct     = overallLimit ? Math.round((overallSpent / overallLimit) * 1000) / 10 : null;
    const overallStatus  = overallPct === null ? null
                         : overallPct >= 100 ? "exceeded"
                         : overallPct >= 70  ? "warning" : "safe";

    const categoriesExceeded = analysis.filter(a => a.status === "exceeded").length;
    const warningsCount      = analysis.filter(a => a.status === "warning").length;

    return sendSuccess(res, 200, {
      month, year,
      overall: overallDoc ? {
        _id: overallDoc._id,
        limit: overallLimit,
        spent: overallSpent,
        remaining: Math.round((overallLimit - overallSpent) * 100) / 100,
        percentage: overallPct,
        status: overallStatus,
      } : null,
      summary: {
        totalBudget:             categoryBudgetTotal,
        totalSpent:              Math.round(categorySpentTotal * 100) / 100,
        totalRemaining:          Math.round((categoryBudgetTotal - categorySpentTotal) * 100) / 100,
        overallPct:              categoryBudgetTotal > 0 ? Math.round((categorySpentTotal / categoryBudgetTotal) * 1000) / 10 : 0,
        remainingBudgetCapacity: overallDoc
          ? Math.max(overallDoc.limit - categoryBudgetTotal, 0)
          : null,
        overallExceeded:         overallStatus === "exceeded",
        categoriesExceeded,
        warningsCount,
      },
      categories: analysis,
    });
  } catch (err) {
    console.error("[getBudgetAnalysis]", err);
    return sendError(res, 500, "Failed to compute budget analysis");
  }
};

module.exports = { setBudget, getBudgets, deleteBudget, getBudgetAnalysis };
