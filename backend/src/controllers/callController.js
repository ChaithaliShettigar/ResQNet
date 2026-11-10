import Call from "../models/Call.js";
import Incident from "../models/Incident.js";

/**
 * 1. Get All AI Follow-Up Calls
 * GET /api/calls
 */
export const getCalls = async (req, res, next) => {
  try {
    const { reportRef, status } = req.query;
    const filter = {};

    if (reportRef) filter.reportRef = reportRef;
    if (status) filter.status = status;

    const calls = await Call.find(filter).sort({ at: -1 }).lean();

    res.status(200).json({
      success: true,
      count: calls.length,
      calls,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Request an AI Return Call
 * POST /api/calls/request
 */
export const requestReturnCall = async (req, res, next) => {
  try {
    const { reportRef, incidentType } = req.body;

    if (!reportRef) {
      return res.status(400).json({
        success: false,
        message: "reportRef is required to request a return call.",
      });
    }

    const callId = `CL-${Math.floor(10000 + Math.random() * 90000)}`;

    const call = await Call.create({
      id: callId,
      reportRef,
      incidentType: incidentType || "Emergency report",
      mode: "ai",
      status: "scheduled",
      at: new Date(),
      reason: "Citizen requested return call to verify report details",
      transcript: [],
      reviewed: false,
    });

    res.status(201).json({
      success: true,
      message: "Return call scheduled. AI agent will connect shortly.",
      call,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Update Call Status (answer, decline, end, mark reviewed)
 * PATCH /api/calls/:id
 */
export const updateCall = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, durationSec, transcript, reviewed } = req.body;

    const call = await Call.findOne({ id });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: `Call entry not found with id: ${id}`,
      });
    }

    if (status) call.status = status;
    if (durationSec !== undefined) call.durationSec = durationSec;
    if (transcript) call.transcript = transcript;
    if (reviewed !== undefined) call.reviewed = reviewed;

    await call.save();

    // If call was completed with answers, update incident callStatus and missing information
    if (status === "received" && transcript?.length > 0) {
      await Incident.findOneAndUpdate(
        { $or: [{ id: call.reportRef }, { reference: call.reportRef }] },
        {
          callStatus: "Completed",
          $push: {
            timeline: {
              action: "AI Follow-Up Call Completed",
              by: "ResQNet AI Voice Agent",
              note: `${transcript.length} clarifying question(s) answered by reporter.`,
              timestamp: new Date(),
            },
          },
        }
      );
    }

    res.status(200).json({
      success: true,
      message: "Call updated successfully.",
      call,
    });
  } catch (error) {
    next(error);
  }
};

