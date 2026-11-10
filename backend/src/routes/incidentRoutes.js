import express from "express";
import {
  createIncident,
  getIncidents,
  getIncidentById,
  updateIncident,
  upvoteIncident,
  trackIncident,
} from "../controllers/incidentController.js";
import { optionalAuth, authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Public / Citizen reporting & tracking
router.post("/", optionalAuth, createIncident);
router.get("/", getIncidents);
router.get("/track/:reference", trackIncident);
router.get("/:id", getIncidentById);

// Community upvote / confirmation
router.post("/:id/upvote", optionalAuth, upvoteIncident);

// Responder updates & verification (supports optional token or prototype authority)
router.patch("/:id", optionalAuth, updateIncident);

export default router;

