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

  try {
    const updatedExpense = await Expense.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id }, // ownership check
      safeUpdate,
      { new: true, runValidators: true }
    );

    if (!updatedExpense) {
      return sendError(res, 404, "Expense not found");
    }

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
    const { category, paymentMethod, limit = 20, page = 1 } = req.query;

    const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100); // clamp: 1–100
    const pageNum  = Math.max(parseInt(page) || 1, 1);
    const skip     = (pageNum - 1) * limitNum;

    const filter = {
      user: req.user._id,
      ...(category && { category }),
      ...(paymentMethod && { paymentMethod }),
    };

    const [expenses, total] = await Promise.all([
      Expense.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
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
          },
        },
      ]),
    ]);

    return sendSuccess(res, 200, {
      total: overall[0]?.total ?? 0,
      count: overall[0]?.count ?? 0,
      thisMonth: monthly[0]?.thisMonth ?? 0, 
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

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  addExpense,
  getExpenses,
  deleteExpense,
  updateExpense,
  getTotalExpenses,
  getExpensesByCategory,
  getMonthlySummary,
};