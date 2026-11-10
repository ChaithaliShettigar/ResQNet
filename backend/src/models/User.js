import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    role: {
      type: String,
      enum: ["citizen", "public", "authority", "control_room", "ngo", "volunteer", "admin"],
      default: "citizen",
    },
    organization: {
      type: String,
      trim: true,
      default: "",
    },
    organizationType: {
      type: String,
      default: "",
    },
    isApproved: {
      type: Boolean,
      default: function () {
        // Citizens and public users are approved immediately; authorities require approval
        return this.role === "citizen" || this.role === "public";
      },
    },
    location: {
      type: String,
      default: "",
    },
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      publicMapVisibility: { type: Boolean, default: true },
      smsAlerts: { type: Boolean, default: false },
      allowFollowUpCalls: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare entered password with hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Exclude sensitive password field from JSON representation
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

export const User = mongoose.model("User", userSchema);
export default User;

