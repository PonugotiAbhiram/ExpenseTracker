const Expense = require("../models/Expense");
const autoCategorize = require("../utils/autoCategorize");
const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sendError = (res, status, message) =>
  res.status(status).json({ success: false, message });

const sendSuccess = (res, status, data) =>
  res.status(status).json({ success: true, data });

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const calculateNextDate = (date, type) => {
  const d = new Date(date);
  if (type === "daily") d.setDate(d.getDate() + 1);
  if (type === "weekly") d.setDate(d.getDate() + 7);
  if (type === "monthly") d.setMonth(d.getMonth() + 1);
  return d;
};

// ─── Budget Check Helper ──────────────────────────────────────────────────────
const Budget = require("../models/Budget");

const checkBudgetFlags = async (userId, expenseCategory, expenseDate, additionalAmount) => {
  const d = new Date(expenseDate || Date.now());
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const [budgets, spendingAgg] = await Promise.all([
    Budget.find({ user: userId, month, year, category: { $in: ["__overall__", expenseCategory] } }),
    Expense.aggregate([
      { $match: { user: userId, date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: "$category", spent: { $sum: "$amount" } } }
    ])
  ]);

  const overallBudget = budgets.find(b => b.category === "__overall__");
  const categoryBudget = budgets.find(b => b.category === expenseCategory);

  const totalSpent = spendingAgg.reduce((sum, item) => sum + item.spent, 0);
  const categorySpent = spendingAgg.find(item => item._id === expenseCategory)?.spent || 0;

  return {
    isOverBudget: overallBudget ? (totalSpent + additionalAmount > overallBudget.limit) : false,
    isCategoryExceeded: categoryBudget ? (categorySpent + additionalAmount > categoryBudget.limit) : false,
  };
};

// ─── Add Expense ──────────────────────────────────────────────────────────────

const addExpense = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 400, errors.array()[0].msg);
  }

  try {
    const { user: _user, ...expenseData } = req.body;

    if (!expenseData.category) {
      expenseData.category = autoCategorize(expenseData.description);
    }

    if (expenseData.isRecurring && expenseData.recurrenceType) {
      expenseData.nextExecutionDate = calculateNextDate(expenseData.date || new Date(), expenseData.recurrenceType);
    }

    // ── Check soft limits ──
    const flags = await checkBudgetFlags(req.user._id, expenseData.category, expenseData.date, Number(expenseData.amount));
    expenseData.isOverBudget = flags.isOverBudget;
    expenseData.isCategoryExceeded = flags.isCategoryExceeded;

    const expense = await Expense.create({
      ...expenseData,
      user: req.user._id,
    });

    return sendSuccess(res, 201, expense);
  } catch (error) {
    if (error.name === "ValidationError") {
      return sendError(res, 400, error.message);
    }
    console.error("[addExpense]", error);
    return sendError(res, 500, "Failed to add expense");
  }
};

// ─── Update Expense ───────────────────────────────────────────────────────────

const updateExpense = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return sendError(res, 400, "Invalid expense ID");
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 400, errors.array()[0].msg);
  }

  // Prevent overwriting the owner
  const { user: _user, ...safeUpdate } = req.body;

  if (!safeUpdate.category && safeUpdate.description) {
    safeUpdate.category = autoCategorize(safeUpdate.description);
  }

  if (safeUpdate.isRecurring && safeUpdate.recurrenceType) {
    safeUpdate.nextExecutionDate = calculateNextDate(safeUpdate.date || new Date(), safeUpdate.recurrenceType);
  } else if (safeUpdate.isRecurring === false) {
    safeUpdate.nextExecutionDate = null;
    safeUpdate.recurrenceType = null;
  }

  try {
    // ── Check soft limits ──
    const existingExpense = await Expense.findById(req.params.id);
    if (!existingExpense) return sendError(res, 404, "Expense not found");

    const category = safeUpdate.category || existingExpense.category;
    const date = safeUpdate.date || existingExpense.date;
    const newAmount = safeUpdate.amount !== undefined ? Number(safeUpdate.amount) : existingExpense.amount;
    const amountDifference = newAmount - existingExpense.amount;

    if (amountDifference > 0) {
      const flags = await checkBudgetFlags(req.user._id, category, date, amountDifference);
      safeUpdate.isOverBudget = flags.isOverBudget;
      safeUpdate.isCategoryExceeded = flags.isCategoryExceeded;
    }

    const updatedExpense = await Expense.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id }, // ownership check
      safeUpdate,
      { new: true, runValidators: true }
    );

    return sendSuccess(res, 200, updatedExpense);
  } catch (error) {
    if (error.name === "ValidationError") {
      return sendError(res, 400, error.message);
    }
    console.error("[updateExpense]", error);
    return sendError(res, 500, "Failed to update expense");
  }
};

// ─── Get All Expenses ─────────────────────────────────────────────────────────

const getExpenses = async (req, res) => {
  try {
    // ─── Handle Recurring Expenses Generation ───
    const now = new Date();
    const recurringExpenses = await Expense.find({
      user: req.user._id,
      isRecurring: true,
      nextExecutionDate: { $lte: now }
    });

    for (const exp of recurringExpenses) {
      let currentDate = new Date(exp.nextExecutionDate);
      
      while (currentDate <= now) {
        const clonedData = exp.toObject();
        delete clonedData._id;
        delete clonedData.__v;
        delete clonedData.createdAt;
        delete clonedData.updatedAt;
        
        clonedData.date = currentDate;
        clonedData.isRecurring = false; // Prevent children from duplicating
        clonedData.nextExecutionDate = null;
        clonedData.recurrenceType = null;
        
        await Expense.create(clonedData);
        currentDate = calculateNextDate(currentDate, exp.recurrenceType);
      }
      
      await Expense.findByIdAndUpdate(exp._id, { nextExecutionDate: currentDate });
    }
    // ────────────────────────────────────────────

    const {
      category, paymentMethod,
      search, startDate, endDate,
      minAmount, maxAmount,
      limit = 20, page = 1,
    } = req.query;

    const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const pageNum  = Math.max(parseInt(page) || 1, 1);
    const skip     = (pageNum - 1) * limitNum;

    // ─── Dynamic Query Builder ───────────────────────────────────
    const filter = { user: req.user._id };

    if (search)        filter.description = { $regex: search.trim(), $options: "i" };
    if (category)      filter.category = category;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const d = new Date(startDate);
        if (!isNaN(d)) filter.date.$gte = d;
      }
      if (endDate) {
        const d = new Date(endDate);
        if (!isNaN(d)) { d.setHours(23, 59, 59, 999); filter.date.$lte = d; }
      }
    }

    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount && !isNaN(Number(minAmount))) filter.amount.$gte = Number(minAmount);
      if (maxAmount && !isNaN(Number(maxAmount))) filter.amount.$lte = Number(maxAmount);
    }
    // ─────────────────────────────────────────────────────────────

    const [expenses, total] = await Promise.all([
      Expense.find(filter).sort({ date: -1 }).skip(skip).limit(limitNum),
      Expense.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, {
      expenses,
      pagination: {
        total,
        page:       pageNum,
        limit:      limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNext:    pageNum * limitNum < total,
        hasPrev:    pageNum > 1,
      },
    });
  } catch (error) {
    console.error("[getExpenses]", error);
    return sendError(res, 500, "Failed to fetch expenses");
  }
};

// ─── Delete Expense ───────────────────────────────────────────────────────────

const deleteExpense = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return sendError(res, 400, "Invalid expense ID");
  }

  try {
    // findOneAndDelete with ownership check — prevents deleting another user's expense
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!expense) return sendError(res, 404, "Expense not found");

    return sendSuccess(res, 200, { id: req.params.id });
  } catch (error) {
    console.error("[deleteExpense]", error);
    return sendError(res, 500, "Failed to delete expense");
  }
};

// ─── Get Total Expenses ───────────────────────────────────────────────────────

const getTotalExpenses = async (req, res) => {
  try {
    const { category, from, to } = req.query;

    const matchStage = {
      user: req.user._id,
      ...(category && { category }),
      ...((from || to) && {
        date: {
          ...(from && { $gte: new Date(from) }),
          ...(to   && { $lte: new Date(to)   }),
        },
      }),
    };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [overall, monthly] = await Promise.all([
      Expense.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
      Expense.aggregate([
        {
          $match: {
            user: req.user._id,
            date: { $gte: startOfMonth }, 
          },
        },
        {
          $group: {
            _id: null,
            thisMonth: { $sum: "$amount" },
            thisMonthCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    return sendSuccess(res, 200, {
      total: overall[0]?.total ?? 0,
      count: overall[0]?.count ?? 0,
      thisMonth: monthly[0]?.thisMonth ?? 0,
      thisMonthCount: monthly[0]?.thisMonthCount ?? 0,
    });

  } catch (error) {
    console.error("[getTotalExpenses]", error);
    return sendError(res, 500, "Failed to fetch total expenses");
  }
};
// ─── Get Expenses By Category ─────────────────────────────────────────────────

const getExpensesByCategory = async (req, res) => {
  try {
    const data = await Expense.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
          avgAmount: { $avg: "$amount" },
        },
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          total: { $round: ["$total", 2] },
          count: 1,
          avgAmount: { $round: ["$avgAmount", 2] },
        },
      },
      { $sort: { total: -1 } },
    ]);

    return sendSuccess(res, 200, data);
  } catch (error) {
    console.error("[getExpensesByCategory]", error);
    return sendError(res, 500, "Failed to fetch category breakdown");
  }
};

// ─── Get Monthly Summary ──────────────────────────────────────────────────────

const getMonthlySummary = async (req, res) => {
  try {
    const { year } = req.query;

    const matchStage = { user: req.user._id };
    if (year) {
      const y = parseInt(year);
      matchStage.date = {
        $gte: new Date(`${y}-01-01`),
        $lte: new Date(`${y}-12-31`),
      };
    }

    const data = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          total: { $round: ["$total", 2] },
          count: 1,
        },
      },
      { $sort: { year: -1, month: -1 } },
    ]);

    return sendSuccess(res, 200, data);
  } catch (error) {
    console.error("[getMonthlySummary]", error);
    return sendError(res, 500, "Failed to fetch monthly summary");
  }
};

// ─── Get Spending Trends ──────────────────────────────────────────────────────

const getSpendingTrends = async (req, res) => {
  try {
    const { range, groupBy = "day", startDate, endDate } = req.query;

    let start = new Date();
    let end = new Date();

    // 1. Determine Date Range
    if (range === "7d") {
      start.setDate(start.getDate() - 7);
    } else if (range === "30d") {
      start.setDate(start.getDate() - 30);
    } else if (range === "90d") {
      start.setDate(start.getDate() - 90);
    } else if (range === "1y") {
      start.setFullYear(start.getFullYear() - 1);
    } else if (range === "custom" && startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else {
      start.setDate(start.getDate() - 30);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // 2. Build Grouping Stage
    let groupFormat = "%Y-%m-%d";
    if (groupBy === "month") groupFormat = "%Y-%m";
    else if (groupBy === "year") groupFormat = "%Y";

    const pipeline = [
      { $match: { user: req.user._id, date: { $gte: start, $lte: end } } }
    ];

    if (groupBy === "week") {
      pipeline.push({
        $group: {
          _id: { year: { $isoWeekYear: "$date" }, week: { $isoWeek: "$date" } },
          total: { $sum: "$amount" },
          date: { $min: "$date" }
        }
      }, {
        $project: {
          _id: 0,
          label: { $concat: ["W", { $toString: "$_id.week" }, "-", { $toString: "$_id.year" }] },
          total: { $round: ["$total", 2] },
          sortDate: "$date"
        }
      });
    } else {
      pipeline.push({
        $group: {
          _id: { $dateToString: { format: groupFormat, date: "$date" } },
          total: { $sum: "$amount" },
          date: { $min: "$date" }
        }
      }, {
        $project: {
          _id: 0,
          label: "$_id",
          total: { $round: ["$total", 2] },
          sortDate: "$date"
        }
      });
    }

    pipeline.push({ $sort: { sortDate: 1 } });

    // ─── Calculate Previous Period for Comparison ───
    const durationMs = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - durationMs - 1);
    const prevEnd = new Date(start.getTime() - 1);

    const [trends, prevTotalAgg] = await Promise.all([
      Expense.aggregate(pipeline),
      Expense.aggregate([
        { $match: { user: req.user._id, date: { $gte: prevStart, $lte: prevEnd } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ])
    ]);

    const totalSpentInRange = trends.reduce((sum, item) => sum + item.total, 0);
    const prevTotal = prevTotalAgg[0]?.total ?? 0;
    const changePct = prevTotal > 0 ? ((totalSpentInRange - prevTotal) / prevTotal) * 100 : 0;

    let highest = { label: "N/A", total: 0 };
    if (trends.length > 0) {
      highest = trends.reduce((prev, curr) => (prev.total > curr.total ? prev : curr));
    }

    return sendSuccess(res, 200, {
      trends,
      insights: {
        totalSpent: Math.round(totalSpentInRange * 100) / 100,
        averagePerPoint: Math.round((totalSpentInRange / (trends.length || 1)) * 100) / 100,
        highestPoint: highest,
        changeVsLastPeriod: Math.round(changePct * 10) / 10,
        prevTotal: Math.round(prevTotal * 100) / 100,
      }
    });
  } catch (error) {
    console.error("[getSpendingTrends]", error);
    return sendError(res, 500, "Failed to fetch spending trends");
  }
};


// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  addExpense,
  getExpenses,
  deleteExpense,
  updateExpense,
  getTotalExpenses,
  getExpensesByCategory,
  getMonthlySummary,
  getSpendingTrends,
};