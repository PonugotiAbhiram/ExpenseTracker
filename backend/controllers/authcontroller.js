const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// ─── Constants ───────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_RULES = {
  minLength: 8,
  message: "Password must be at least 8 characters long",
};

const AUTH_ERRORS = {
  INVALID_CREDENTIALS: "Invalid email or password",
  LOGIN_FAILED: "Something went wrong. Please try again later.",
  MISSING_FIELDS: "Email and password are required",
};

// Dummy hash used to prevent timing attacks when user is not found
const DUMMY_HASH =
  "$2b$10$invalidhashfortimingattackprevention000000000000000000000";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
});

const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    algorithm: "HS256",
  });
};

const validateRegistrationInput = ({ name, email, password }) => {
  if (!name?.trim()) return "Name is required";
  if (!email?.trim()) return "Email is required";
  if (!EMAIL_REGEX.test(email)) return "Invalid email format";
  if (!password) return "Password is required";
  if (password.length < PASSWORD_RULES.minLength) return PASSWORD_RULES.message;
  return null;
};

// ─── Register ────────────────────────────────────────────────────────────────

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const validationError = validateRegistrationInput({ name, email, password });
    if (validationError) {
      return res.status(422).json({ success: false, message: validationError });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail }).lean();
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: sanitizeUser(user),
    });
  } catch (error) {
    console.error("[registerUser]", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

// ─── Login ───────────────────────────────────────────────────────────────────

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res
        .status(400)
        .json({ success: false, message: AUTH_ERRORS.MISSING_FIELDS });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password"
    );

    // Always compare to prevent timing attacks
    const isMatch = user
      ? await user.matchPassword(password)
      : await bcrypt.compare(password, DUMMY_HASH);

    if (!user || !isMatch) {
      return res
        .status(401)
        .json({ success: false, message: AUTH_ERRORS.INVALID_CREDENTIALS });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      token,
      data: sanitizeUser(user),
    });
  } catch (error) {
    console.error("[loginUser]", {
      message: error.message,
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
      timestamp: new Date().toISOString(),
    });

    return res
      .status(500)
      .json({ success: false, message: AUTH_ERRORS.LOGIN_FAILED });
  }
};

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = { registerUser, loginUser };