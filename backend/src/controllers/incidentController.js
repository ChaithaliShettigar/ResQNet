import Incident from "../models/Incident.js";
import Call from "../models/Call.js";
import { analyzeIncidentUrgency } from "../services/prioritizationService.js";
import { analyzeIncidentWithLLM } from "../services/openRouterService.js";

/**
 * 1. Submit Emergency Report
 * POST /api/incidents
 */
export const createIncident = async (req, res, next) => {
  try {
    const { type, description, location, severity, locMode, phone, photo, lat, lng, area, originalLanguage, translations } = req.body;

    if (!type || !description || !location) {
      return res.status(400).json({
        success: false,
        message: "Incident type, description, and location are required.",
      });
    }

    // Generate unique reference number: RQ-xxxxxxx
    const randomDigits = Math.floor(1000000 + Math.random() * 9000000);
    const incidentId = `RQ-${randomDigits}`;

    // Run AI Prioritization Engine (Pipeline 3)
    const incidentInput = {
      type,
      description,
      originalLanguage: originalLanguage || "en",
      translations: translations || {},
      severity,
      location,
      reporterPhone: phone,
      hasPhoto: !!photo,
      callStatus: phone ? "Pending" : "Not required",
    };
    const fallbackAnalysis = analyzeIncidentUrgency(incidentInput);
    let aiAnalysis = fallbackAnalysis;
    try {
      const llmAnalysis = await analyzeIncidentWithLLM(incidentInput);
      if (llmAnalysis.priority) {
        const order = { low: 0, medium: 1, high: 2, critical: 3 };
        const priority = order[llmAnalysis.priority] > order[fallbackAnalysis.priority] ? llmAnalysis.priority : fallbackAnalysis.priority;
        aiAnalysis = {
          ...fallbackAnalysis,
          priority,
          aiReason: `${llmAnalysis.aiReason || fallbackAnalysis.aiReason}${priority !== llmAnalysis.priority ? " Safety checks retained a higher priority." : ""}`,
          missing: [...new Set([...fallbackAnalysis.missing, ...llmAnalysis.missing])],
        };
      }
    } catch (error) {
      console.warn("OpenRouter incident analysis unavailable; using local safety analysis:", error.message);
    }

    const incident = await Incident.create({
      id: incidentId,
      reference: incidentId,
      type,
      severity: severity || "Not sure",
      description,
      location,
      locMode: locMode || null,
      area: area || (location.toLowerCase().includes("north") ? "North district" : "Central"),
      lat: lat || 28.3 + (Math.random() * 0.4 - 0.2),
      lng: lng || 77.3 + (Math.random() * 0.4 - 0.2),
      reporter: phone || null,
      reporterUser: req.user ? req.user.id : null,
      photo: photo || null,
      priority: aiAnalysis.priority,
      status: "Needs verification",
      verified: false,
      confidence: aiAnalysis.confidence,
      aiReason: aiAnalysis.aiReason,
      missing: aiAnalysis.missing,
      weather: "Active monitoring",
      callStatus: phone && aiAnalysis.missing.length > 0 ? "Pending" : "Not required",
      public: true,
      confirmations: 1,
      timeline: [
        {
          action: "Report Submitted",
          by: req.user ? req.user.name : "Citizen (Web Portal)",
          note: `Initial report received. AI assigned priority: ${aiAnalysis.priority.toUpperCase()}`,
        },
      ],
    });

    // If report has missing information and phone is provided, create a pending follow-up call
    if (phone && aiAnalysis.missing.length > 0) {
      const callId = `CL-${Math.floor(10000 + Math.random() * 90000)}`;
      await Call.create({
        id: callId,
        reportRef: incident.id,
        incidentType: incident.type,
        mode: "ai",
        status: "scheduled",
        targetPhone: phone,
        reason: `Confirm missing details: ${aiAnalysis.missing.join("; ")}`,
        transcript: [],
      }).catch(() => {}); // non-blocking
    }

    res.status(201).json({
      success: true,
      message: "Emergency report submitted and analyzed successfully.",
      incident,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Get All Incidents with Dynamic Filtering
 * GET /api/incidents
 * Query params: priority, status, type, area, publicOnly, search
 */
export const getIncidents = async (req, res, next) => {
  try {
    const { priority, status, type, area, publicOnly, search } = req.query;

    const query = {};

    if (priority && priority !== "all") query.priority = priority;
    if (status && status !== "all") query.status = status;
    if (type && type !== "all") query.type = type;
    if (area && area !== "all") query.area = area;
    if (publicOnly === "true") query.public = true;

    if (search) {
      query.$or = [
        { id: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { type: { $regex: search, $options: "i" } },
      ];
    }

    // Priority ordering weight: critical (1), high (2), medium (3), low (4)
    const incidents = await Incident.find(query).sort({ reportedAt: -1 }).lean();

    // Map custom priority sort order
    const priorityWeight = { critical: 1, high: 2, medium: 3, low: 4, "Pending review": 5 };
    incidents.sort((a, b) => {
      const wA = priorityWeight[a.priority] || 99;
      const wB = priorityWeight[b.priority] || 99;
      if (wA !== wB) return wA - wB;
      return new Date(b.reportedAt) - new Date(a.reportedAt);
    });

    res.status(200).json({
      success: true,
      count: incidents.length,
      incidents,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Get Single Incident by ID or Reference
 * GET /api/incidents/:id
 */
export const getIncidentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const incident = await Incident.findOne({
      $or: [{ id }, { reference: id }],
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: `Incident not found with ID: ${id}`,
      });
    }

    res.status(200).json({
      success: true,
      incident,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Update Incident Details / Human Override
 * PATCH /api/incidents/:id
 */
export const updateIncident = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const incident = await Incident.findOne({
      $or: [{ id }, { reference: id }],
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: `Incident not found with ID: ${id}`,
      });
    }

    // Apply allowed modifications
    const allowedKeys = [
      "status",
      "verified",
      "team",
      "duplicate",
      "callStatus",
      "priority",
      "aiReason",
      "missing",
      "weather",
      "public",
      "translations",
      "instructions",
    ];

    allowedKeys.forEach((key) => {
      if (updates[key] !== undefined) {
        incident[key] = updates[key];
      }
    });

    // If responder verified the incident, sync verified flag and status
    if (updates.verified === true && !updates.status) {
      incident.status = "Verified";
    }

    // Add audit timeline entry
    const actionLabel = updates.aiReason?.includes("[HUMAN OVERRIDE]")
      ? "AI Priority Overridden by Authority"
      : updates.team
      ? `Team Assigned: ${updates.team}`
      : updates.status
      ? `Status Changed: ${updates.status}`
      : "Incident Updated";

    incident.timeline.push({
      action: actionLabel,
      by: req.user?.name || "Authority Responder",
      note: updates.note || updates.aiReason || "Action taken in Command Center",
      timestamp: new Date(),
    });

    await incident.save();

    res.status(200).json({
      success: true,
      message: "Incident updated successfully.",
      incident,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Community Upvote / Confirmation ("It's real")
 * POST /api/incidents/:id/upvote
 */
export const upvoteIncident = async (req, res, next) => {
  try {
    const { id } = req.params;
    const voterId = req.user?.id || req.body.deviceId || req.ip || "anon";

    const incident = await Incident.findOne({
      $or: [{ id }, { reference: id }],
    });

    if (!incident) {
      return res.status(404).json({ success: false, message: "Incident not found" });
    }

    const hasUpvoted = incident.confirmedBy.includes(voterId);

    if (hasUpvoted) {
      // Toggle off
      incident.confirmedBy = incident.confirmedBy.filter((v) => v !== voterId);
      incident.confirmations = Math.max(0, incident.confirmations - 1);
    } else {
      // Add confirmation
      incident.confirmedBy.push(voterId);
      incident.confirmations += 1;
    }

    await incident.save();

    res.status(200).json({
      success: true,
      upvoted: !hasUpvoted,
      confirmations: incident.confirmations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Track Anonymous Report by Reference Number
 * GET /api/incidents/track/:reference
 */
export const trackIncident = async (req, res, next) => {
  try {
    const { reference } = req.params;

    const incident = await Incident.findOne({
      $or: [{ id: reference.trim() }, { reference: reference.trim() }],
    }).select("id reference type status priority location area reportedAt createdAt");

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Report reference number not found.",
      });
    }

    res.status(200).json({
      success: true,
      incident: {
        reference: incident.id,
        type: incident.type,
        status: incident.status,
        priority: incident.priority,
        area: incident.area,
        reportedAt: incident.reportedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

