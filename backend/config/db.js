const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error("❌ DB connection error: MONGO_URI is missing in environment variables.");
      throw new Error("MONGO_URI missing");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🚀 MongoDB Connected Successfully!");
  } catch (error) {
    console.error("❌ DB connection error:", error.message);
    throw error; // Throw instead of process.exit to avoid silent crashes on Vercel
  }
};

module.exports = connectDB;