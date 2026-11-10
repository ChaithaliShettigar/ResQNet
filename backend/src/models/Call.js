import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    reportRef: {
      type: String,
      required: true,
      index: true,
    },
    incidentType: {
      type: String,
      default: "Emergency",
    },
    mode: {
      type: String,
      enum: ["ai", "ivr"],
      default: "ai",
    },
    status: {
      type: String,
      enum: ["scheduled", "ringing", "active", "received", "missed", "declined"],
      default: "scheduled",
      index: true,
    },
    at: {
      type: Date,
      default: Date.now,
    },
    durationSec: {
      type: Number,
      default: null,
    },
    reason: {
      type: String,
      default: "Confirm missing emergency details from initial report",
    },
    transcript: [
      {
        q: { type: String, required: true },
        a: { type: String, required: true },
        _id: false,
      },
    ],
    reviewed: {
      type: Boolean,
      default: false,
    },
    targetPhone: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export const Call = mongoose.model("Call", callSchema);
export default Call;

