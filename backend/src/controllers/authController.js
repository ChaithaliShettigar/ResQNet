import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Organization from "../models/Organization.js";

const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || "resqnet_development_jwt_secret_key_2026_xyz";
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    secret,
    { expiresIn }
  );
};

/**
 * 1. Register Public User / Citizen
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, phone, password, location } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required.",
      });
    }

    // Check if user already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists. Please log in.",
      });
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      location,
      role: "citizen",
      isApproved: true,
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        location: user.location,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Login Public User / Citizen
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Find by email or phone
    const user = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phone: email }],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: "Logged in successfully.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        location: user.location,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Authority Login (Command Center Portal)
 * POST /api/auth/authority-login
 */
export const authorityLogin = async (req, res, next) => {
  try {
    const { email, password, org } = req.body;
    const PROTO_PASS = "ResQNet@2026";

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Coordinator email and password are required.",
      });
    }

    // Verify against database authority account or prototype shared credentials
    let user = await User.findOne({ email: email.toLowerCase() });

    let isMatch = false;
    if (user) {
      isMatch = (await user.comparePassword(password)) || password === PROTO_PASS;
    } else if (password === PROTO_PASS) {
      // Create or provision authority user for prototype session
      user = await User.create({
        name: org || "Authorized Responder",
        email: email.toLowerCase(),
        password: PROTO_PASS,
        role: "authority",
        organization: org || "State Disaster Response",
        isApproved: true,
      });
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect authority password. Authorized credentials required.",
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: "Authority authentication verified. Access granted to Command Center.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: "authority",
        organization: user.organization || org,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Register Organization (Pending Admin Approval)
 * POST /api/auth/register-org
 */
export const registerOrganization = async (req, res, next) => {
  try {
    const { org, orgType, email } = req.body;

    if (!org || !email) {
      return res.status(400).json({
        success: false,
        message: "Organization name and coordinator email are required.",
      });
    }

    const orgRecord = await Organization.create({
      name: org,
      type: orgType || "Government disaster team",
      email: email.toLowerCase(),
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Organization registration submitted. Pending admin review.",
      organization: orgRecord,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Get Current User Profile
 * GET /api/auth/profile
 */
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Update User Profile
 * PUT /api/auth/profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, location, preferences } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          ...(name && { name }),
          ...(phone !== undefined && { phone }),
          ...(location !== undefined && { location }),
          ...(preferences && { preferences }),
        },
      },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: updated,
    });
  } catch (error) {
    next(error);
  }
};

