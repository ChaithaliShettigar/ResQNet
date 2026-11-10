/**
 * Central Error Handler Middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error("🔥 Server Error:", err);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: messages,
    });
  }

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `An entry with this ${field} already exists.`,
    });
  }

  // CastError (invalid MongoDB ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Resource not found with id: ${err.value}`,
    });
  }

  // Default server error
  const statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  return res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

/**
 * 404 Route Not Found Handler
 */
export const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found at: ${req.method} ${req.originalUrl}`,
  });
};

