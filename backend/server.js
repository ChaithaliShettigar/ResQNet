import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./src/config/db.js";
import { seedInitialDatabase } from "./src/utils/seedData.js";
import { errorHandler, notFound } from "./src/middleware/errorHandler.js";

// Routes
import authRoutes from "./src/routes/authRoutes.js";
import incidentRoutes from "./src/routes/incidentRoutes.js";
import aiRoutes from "./src/routes/aiRoutes.js";
import callRoutes from "./src/routes/callRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";

// Initialize environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Cross-Origin Resource Sharing (CORS) for frontend client
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key-ID"],
    credentials: true,
  })
);

// Body parser middleware (supports text, JSON, and large payloads)
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// System Health Check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "ResQNet Backend API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API Route Mounts
app.use("/api/auth", authRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/calls", callRoutes);
app.use("/api/admin", adminRoutes);

// 404 Handler & Central Error Handling
app.use(notFound);
app.use(errorHandler);

// Start Server and Connect Database
const startServer = async () => {
  const server = app.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`🚀 ResQNet Backend Server running on port: ${PORT}`);
    console.log(`📡 Base API URL: http://localhost:${PORT}/api`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🤖 Gnani AI Proxy: http://localhost:${PORT}/api/ai`);
    console.log(`=================================================\n`);
  });

  // Connect to MongoDB Atlas (asynchronous non-blocking startup)
  connectDB().then((isConnected) => {
    if (isConnected) {
      seedInitialDatabase();
    }
  });

  return server;
};

startServer();

export default app;
