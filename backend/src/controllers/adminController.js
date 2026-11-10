import Organization from "../models/Organization.js";
import User from "../models/User.js";

/**
 * 1. Get Pending Organizations
 * GET /api/admin/pending-orgs
 */
export const getPendingOrganizations = async (req, res, next) => {
  try {
    const orgs = await Organization.find({ status: "pending" }).sort({ submittedAt: -1 }).lean();
    res.status(200).json({ success: true, count: orgs.length, organizations: orgs });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Approve Organization
 * POST /api/admin/approve-org/:id
 */
export const approveOrganization = async (req, res, next) => {
  try {
    const { id } = req.params;
    const org = await Organization.findByIdAndUpdate(
      id,
      { status: "approved", approvedAt: new Date(), approvedBy: req.user?.email || "Admin" },
      { new: true }
    );

    if (!org) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    // Also update any matching user account to approved
    await User.updateMany({ email: org.email }, { isApproved: true, role: "authority" });

    res.status(200).json({
      success: true,
      message: `${org.name} has been approved. Authority credentials activated.`,
      organization: org,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Reject Organization
 * POST /api/admin/reject-org/:id
 */
export const rejectOrganization = async (req, res, next) => {
  try {
    const { id } = req.params;
    const org = await Organization.findByIdAndUpdate(id, { status: "rejected" }, { new: true });

    if (!org) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    res.status(200).json({
      success: true,
      message: `${org.name} registration was rejected.`,
      organization: org,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Get Active Authority Accounts
 * GET /api/admin/accounts
 */
export const getAuthorityAccounts = async (req, res, next) => {
  try {
    const orgs = await Organization.find({ status: { $ne: "rejected" } }).lean();
    res.status(200).json({ success: true, accounts: orgs });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Toggle Authority Account Access
 * PATCH /api/admin/accounts/:id/toggle
 */
export const toggleAccountStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const org = await Organization.findById(id);

    if (!org) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    org.status = org.status === "disabled" ? "approved" : "disabled";
    await org.save();

    res.status(200).json({
      success: true,
      message: `${org.name} access ${org.status === "approved" ? "enabled" : "disabled"}.`,
      organization: org,
    });
  } catch (error) {
    next(error);
  }
};

