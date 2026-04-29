const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Extracts Bearer token from Authorization header.
 * @param {string} authHeader
 * @returns {string|null}
 */
const extractBearerToken = (authHeader) => {
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    return token || null;
  }
  return null;
};

/**
 * Middleware to protect routes via JWT authentication.
 * Attaches the authenticated user to `req.user` on success.
 */
const protect = async (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized. No token provided.",
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    const isExpired = error.name === "TokenExpiredError";
    return res.status(401).json({
      success: false,
      message: isExpired ? "Token has expired." : "Invalid token.",
    });
  }

  try {
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User associated with this token no longer exists.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("[protect] DB lookup failed:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication.",
    });
  }
};

module.exports = { protect };