import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
    },
    type: {
      type: String,
      required: true,
      default: "Government disaster team",
    },
    email: {
      type: String,
      required: [true, "Coordinator email is required"],
      trim: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "disabled"],
      default: "pending",
      index: true,
    },
    role: {
      type: String,
      default: "Disaster management authority",
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    approvedBy: {
      type: String,
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Organization = mongoose.model("Organization", organizationSchema);
export default Organization;

