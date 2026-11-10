import mongoose from "mongoose";

const timelineEntrySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    by: { type: String, default: "System" },
    note: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const incidentSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    reference: {
      type: String,
      index: true,
    },
    type: {
      type: String,
      required: [true, "Incident type is required"],
      enum: ["Building collapse", "Flood", "Landslide", "Medical emergency", "Fire", "Other"],
      index: true,
    },
    severity: {
      type: String,
      default: "Not sure",
    },
    description: {
      type: String,
      required: [true, "Incident description is required"],
      trim: true,
    },
    originalLanguage: { type: String, default: "en" },
    translations: { type: Map, of: String, default: {} },
    instructions: [{
      text: { type: String, required: true },
      language: { type: String, default: "en" },
      translations: { type: Map, of: String, default: {} },
      by: { type: String, default: "Authority Responder" },
      createdAt: { type: Date, default: Date.now },
    }],
    location: {
      type: String,
      required: [true, "Location description is required"],
      trim: true,
    },
    locMode: {
      type: String,
      enum: ["gps", "map", "manual", null],
      default: null,
    },
    area: {
      type: String,
      default: "Central district",
      index: true,
    },
    lat: {
      type: Number,
      default: 28.6139,
    },
    lng: {
      type: Number,
      default: 77.209,
    },
    priority: {
      type: String,
      enum: ["critical", "high", "medium", "low", "Pending review"],
      default: "medium",
      index: true,
    },
    status: {
      type: String,
      enum: [
        "Needs verification",
        "Verified",
        "Under Review",
        "Response in Progress",
        "Monitoring",
        "Resolved",
        "Assigned",
        "Needs information",
        "Escalated",
        "Received",
      ],
      default: "Needs verification",
      index: true,
    },
    reportedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    reporter: {
      type: String,
      default: null,
    },
    reporterUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    duplicate: {
      type: Boolean,
      default: false,
    },
    duplicateOf: {
      type: String,
      default: null,
    },
    team: {
      type: String,
      default: null,
    },
    callStatus: {
      type: String,
      enum: ["Pending", "Completed", "Failed", "Not required", "AI"],
      default: "Pending",
    },
    verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 75,
    },
    aiReason: {
      type: String,
      default: "Initial assessment based on reported incident type and severity keywords.",
    },
    missing: {
      type: [String],
      default: [],
    },
    weather: {
      type: String,
      default: "Standard conditions",
    },
    public: {
      type: Boolean,
      default: true,
      index: true,
    },
    confirmations: {
      type: Number,
      default: 0,
    },
    confirmedBy: {
      type: [String],
      default: [],
    },
    photo: {
      type: String,
      default: null,
    },
    timeline: {
      type: [timelineEntrySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Always keep id and reference synchronized
incidentSchema.pre("validate", function (next) {
  if (!this.reference && this.id) this.reference = this.id;
  if (!this.id && this.reference) this.id = this.reference;
  next();
});

export const Incident = mongoose.model("Incident", incidentSchema);
export default Incident;

