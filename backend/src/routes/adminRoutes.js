import express from "express";
import {
  getPendingOrganizations,
  approveOrganization,
  rejectOrganization,
  getAuthorityAccounts,
  toggleAccountStatus,
} from "../controllers/adminController.js";
import { optionalAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/pending-orgs", optionalAuth, getPendingOrganizations);
router.post("/approve-org/:id", optionalAuth, approveOrganization);
router.post("/reject-org/:id", optionalAuth, rejectOrganization);
router.get("/accounts", optionalAuth, getAuthorityAccounts);
router.patch("/accounts/:id/toggle", optionalAuth, toggleAccountStatus);

export default router;

