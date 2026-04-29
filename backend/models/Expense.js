const mongoose = require("mongoose");

const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Housing",
  "Entertainment",
  "Healthcare",
  "Shopping",
  "Education",
  "Utilities",
  "Travel",
  "Personal Care",
  "Investments",
  "Other",
];

const expenseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
      set: (v) => parseFloat(v.toFixed(2)), // Ensure 2 decimal places
    },

    currency: {
      type: String,
      default: "USD",
      uppercase: true,
      trim: true,
      maxlength: [3, "Currency code must be 3 characters"],
    },

    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: EXPENSE_CATEGORIES,
        message: "{VALUE} is not a valid category",
      },
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },

    date: {
      type: Date,
      default: Date.now,
      validate: {
        validator: (v) => v <= new Date(),
        message: "Expense date cannot be in the future",
      },
    },

    paymentMethod: {
      type: String,
      enum: ["Cash", "Card", "UPI", "Bank Transfer", "Other", "cash", "credit_card", "debit_card", "upi", "net_banking", "other"],
      default: "Other",
    },

    tags: {
      type: [String],
      default: [],
      set: (tags) => tags.map((t) => t.toLowerCase().trim()),
    },

    isRecurring: {
      type: Boolean,
      default: false,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtuals ────────────────────────────────────────────────────────────────

expenseSchema.virtual("formattedAmount").get(function () {
  return `${this.currency} ${this.amount.toFixed(2)}`;
});

expenseSchema.virtual("monthYear").get(function () {
  return this.date.toLocaleString("default", { month: "long", year: "numeric" });
});

// ─── Indexes ─────────────────────────────────────────────────────────────────

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ date: -1, category: 1 });

// ─── Static Methods ───────────────────────────────────────────────────────────

expenseSchema.statics.getTotalByCategory = async function (startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        date: {user: new mongoose.Types.ObjectId(userId), $gte: new Date(startDate), $lte: new Date(endDate) },
      },
    },
    {
      $group: {
        _id: "$category",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ]);
};

expenseSchema.statics.getMonthlyTotal = async function (year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  const result = await this.aggregate([
    { $match: {user: new mongoose.Types.ObjectId(userId),  date: { $gte: start, $lte: end } } },
    { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);
  return result[0] || { total: 0, count: 0 };
};

// ─── Instance Methods ─────────────────────────────────────────────────────────

expenseSchema.methods.addTag = function (tag) {
  const normalized = tag.toLowerCase().trim();
  if (!this.tags.includes(normalized)) {
    this.tags.push(normalized);
  }
  return this;
};

const Expense = mongoose.model("Expense", expenseSchema);

module.exports = Expense;