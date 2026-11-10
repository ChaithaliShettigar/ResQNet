import express from "express";
import {
  getCalls,
  requestReturnCall,
  updateCall,
} from "../controllers/callController.js";
import { optionalAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", getCalls);
router.post("/request", optionalAuth, requestReturnCall);
router.patch("/:id", optionalAuth, updateCall);

export default router;

