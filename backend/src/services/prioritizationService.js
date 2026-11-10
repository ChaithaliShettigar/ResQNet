/**
 * AI-Based Emergency Urgency Prioritization Engine (Pipeline 3)
 *
 * Implements a transparent multi-factor urgency scoring system:
 * 1. Threat-to-life keyword & context extraction
 * 2. Incident category and user-estimated severity
 * 3. Completeness check (detecting critical missing details)
 * 4. Special policy: Unanswered/incomplete reports are never downgraded in priority;
 *    they are flagged for urgent verification so responders act immediately.
 * 5. Explanatory reasoning generation for transparent human-in-the-loop oversight.
 */

// Life-threatening indicators that require rapid intervention
const THREAT_PATTERNS = {
  critical: [
    /trapped/i,
    /collapse/i,
    /buried/i,
    /drown/i,
    /water\s+(level\s+)?rising\s+rapid/i,
    /cpr/i,
    /unconscious|unresponsive/i,
    /severe\s+bleeding/i,
    /cardiac|heart\s+attack/i,
    /infant|baby|elderly\s+(unable|trapped)/i,
    /explosion/i,
    /gas\s+leak.*fire/i,
    /narrow\s+window/i,
  ],
  high: [
    /injur(y|ies)/i,
    /blood/i,
    /blocked\s+highway|access\s+blocked/i,
    /ambulance\s+(needed|delayed)/i,
    /black\s+smoke|chemical/i,
    /flash\s+flood/i,
    /landslide/i,
    /evacuat(e|ion)/i,
    /electrical\s+spark|live\s+wire/i,
  ],
  medium: [
    /water\s+logging|slowly\s+rising/i,
    /fallen\s+tree|obstruction/i,
    /park\s+flooded/i,
    /property\s+damage/i,
    /traffic\s+delay/i,
  ],
};

/**
 * Identify missing critical pieces of information needed by responders
 */
export const detectMissingInformation = (type, description, location) => {
  const missing = [];
  const text = `${description} ${location}`.toLowerCase();

  // Trapped persons details
  if (text.includes("trapped") || text.includes("buried") || type === "Building collapse") {
    if (!/\b(\d+|one|two|three|four|five|several|multiple)\b/i.test(description)) {
      missing.push("Exact number of trapped persons");
    }
    if (!text.includes("adjacent") && !text.includes("structure")) {
      missing.push("Structural condition of adjacent buildings");
    }
  }

  // Flood details
  if (type === "Flood" || text.includes("flood")) {
    if (!text.includes("foot") && !text.includes("meter") && !text.includes("inch") && !text.includes("depth") && !text.includes("level")) {
      missing.push("Current water depth or rate of rise");
    }
    if (!text.includes("home") && !text.includes("residen") && !text.includes("street")) {
      missing.push("Whether floodwater has entered residential dwellings");
    }
  }

  // Road blockage / Landslide
  if (type === "Landslide" || text.includes("landslide") || text.includes("blocked")) {
    if (!text.includes("access") && !text.includes("alternate") && !text.includes("lane")) {
      missing.push("Alternative emergency access route availability");
    }
    if (text.includes("vehicle") && !text.includes("passenger") && !text.includes("occupant")) {
      missing.push("Confirmation of vehicle occupancy");
    }
  }

  // Medical emergency
  if (type === "Medical emergency" || text.includes("medical") || text.includes("collapsed")) {
    if (!text.includes("breathing") && !text.includes("conscious") && !text.includes("pulse")) {
      missing.push("Current patient vital signs (breathing/consciousness)");
    }
    if (!text.includes("age") && !text.includes("child") && !text.includes("adult")) {
      missing.push("Age group or demographic of affected individual");
    }
  }

  // Fire / Chemical
  if (type === "Fire" || text.includes("fire")) {
    if (!text.includes("chemical") && !text.includes("flammable") && !text.includes("storage")) {
      missing.push("Presence of flammable or chemical substances nearby");
    }
    if (!text.includes("spread") && !text.includes("wind")) {
      missing.push("Fire spread rate and direction");
    }
  }

  return missing;
};

/**
 * Core AI Prioritization function
 */
export const analyzeIncidentUrgency = ({
  type = "Other",
  description = "",
  severity = "",
  location = "",
  reporterPhone = null,
  hasPhoto = false,
  callStatus = "Pending",
  weatherContext = "",
}) => {
  const combinedText = `${type} ${description} ${severity}`.toLowerCase();
  let criticalScore = 0;
  let highScore = 0;
  let mediumScore = 0;

  // 1. Evaluate regex patterns
  THREAT_PATTERNS.critical.forEach((pattern) => {
    if (pattern.test(combinedText)) criticalScore += 3;
  });

  THREAT_PATTERNS.high.forEach((pattern) => {
    if (pattern.test(combinedText)) highScore += 2;
  });

  THREAT_PATTERNS.medium.forEach((pattern) => {
    if (pattern.test(combinedText)) mediumScore += 1;
  });

  // 2. Evaluate user-selected severity
  if (severity === "People may be trapped") criticalScore += 5;
  if (severity === "Injuries present") highScore += 4;
  if (severity === "Evacuation needed") highScore += 3;
  if (severity === "Property damage only") mediumScore += 2;

  // 3. Category inherent baseline
  if (type === "Building collapse") criticalScore += 4;
  if (type === "Medical emergency") highScore += 3;
  if (type === "Flash Flood" || type === "Flood") highScore += 2;
  if (type === "Fire") highScore += 2;

  // 4. Missing information analysis
  const missing = detectMissingInformation(type, description, location);

  // 5. Prioritize unanswered emergency reports appropriately
  // Important rule: Never downgrade unanswered or incomplete reports!
  // If an urgent report is missing details or has an unanswered call, it stays high/critical
  // and is explicitly flagged for rapid field verification.
  const isUnanswered = callStatus === "Pending" || callStatus === "Failed";

  // Determine priority level
  let priority = "medium";
  let aiReason = "";

  if (criticalScore >= 3 || (type === "Building collapse" && criticalScore >= 2)) {
    priority = "critical";
    aiReason = `Report exhibits direct threat-to-life indicators (${
      severity.includes("trapped") ? "suspected trapped individuals" : "rapid danger progression"
    }). Collapse or flash hazards have narrow intervention windows. Immediate emergency deployment is recommended.`;
  } else if (highScore >= 3 || criticalScore >= 1) {
    priority = "high";
    aiReason = `Urgent situation with potential life safety impact (${type}). Timely medical or response dispatch is required to prevent escalation.`;
  } else if (mediumScore >= 1 || combinedText.includes("road") || combinedText.includes("obstruction")) {
    priority = "medium";
    aiReason = `Infrastructure or environmental disruption reported without immediate life threat confirmed. Monitoring and routine response team assignment recommended.`;
  } else {
    priority = "low";
    aiReason = `Minor disruption or resolved localized event. No current life hazard detected. Precautionary monitoring or routine verification suggested.`;
  }

  // Reason refinement for incomplete or unanswered reports
  if (missing.length > 0 && (priority === "critical" || priority === "high")) {
    aiReason += ` Missing ${missing.length} key operational detail(s); prioritized for rapid verification rather than downgraded.`;
  }

  if (isUnanswered && (priority === "critical" || priority === "high")) {
    aiReason += " Follow-up verification call pending/unanswered; maintains high priority under safety-first policy.";
  }

  // 6. Calculate Confidence score (0-100)
  let confidence = 60;
  if (description.length > 80) confidence += 15;
  if (reporterPhone) confidence += 10;
  if (hasPhoto) confidence += 8;
  if (location.toLowerCase().includes("ward") || location.toLowerCase().includes("sector") || location.includes("gps")) confidence += 7;
  confidence = Math.min(Math.max(confidence, 40), 96);

  return {
    priority,
    aiReason,
    confidence,
    missing,
  };
};

export default {
  analyzeIncidentUrgency,
  detectMissingInformation,
};

