const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");   // ✅ ADD THIS
const connectDB = require("./config/db");
const expenseRoutes = require("./routes/expenseRoutes");
const authRoutes = require("./routes/authRoutes");

dotenv.config();
connectDB();

const app = express();

// ✅ ADD CORS HERE (VERY IMPORTANT)
app.use(cors({
  origin: [
    "http://localhost:5173",
    process.env.FRONTEND_URL
  ].filter(Boolean), // Filter out undefined if FRONTEND_URL is not set
  credentials: true
}));

app.use(express.json());

app.use("/api/expenses", expenseRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("API is running...");
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🔥 Server running on port ${PORT}`);
  });
}

module.exports = app;