import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Verify JWT token from Authorization header (Bearer <token>)
 */
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. Authentication token missing.",
    });
  }

  try {
    const secret = process.env.JWT_SECRET || "resqnet_development_jwt_secret_key_2026_xyz";
    const decoded = jwt.verify(token, secret);

    // Attach decoded user info
    req.user = decoded;

    // Optional: fetch fresh user details if needed
    try {
      const user = await User.findById(decoded.id).select("-password");
      if (user) {
        req.userDetails = user;
      }
    } catch {
      // If DB read fails, keep decoded token payload
    }

    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Invalid or expired authentication token.",
      error: error.message,
    });
  }
};

/**
 * Optional authentication: attaches user if token is present, but doesn't block if missing.
 * Useful for public emergency reporting where logged-in users get linked but anonymous reports are welcomed!
 */
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET || "resqnet_development_jwt_secret_key_2026_xyz";
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
  } catch {
    // Ignore invalid token in optional auth
  }

  next();
};

/**
 * Restrict access to specific roles
 * Supported roles: 'citizen', 'public', 'authority', 'control_room', 'ngo', 'volunteer', 'admin'
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to access this resource.",
      });
    }

    const userRole = req.user.role || "citizen";
    if (!roles.includes(userRole) && userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: `Forbidden: requires one of the following roles: ${roles.join(", ")}. Your role is: ${userRole}.`,
      });
    }

    next();
  };
};

/**
 * Helper to allow any authorized responder (authority, control_room, ngo, volunteer, admin)
 */
export const requireAuthority = requireRole("authority", "control_room", "ngo", "volunteer", "admin");

