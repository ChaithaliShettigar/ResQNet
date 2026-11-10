import express from "express";
import {
  register,
  login,
  authorityLogin,
  registerOrganization,
  getProfile,
  updateProfile,
} from "../controllers/authController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/authority-login", authorityLogin);
router.post("/register-org", registerOrganization);

// Protected routes (JWT required)
router.get("/profile", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);

export default router;

