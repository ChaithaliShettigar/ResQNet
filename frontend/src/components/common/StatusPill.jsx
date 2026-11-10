import React from "react";

export function StatusPill({ status }) {
  const map = {
    "Needs verification": "pill-unverified",
    "Verified": "pill-verified",
    "Under Review": "pill-unverified",
    "Response in Progress": "pill-assigned",
    "Resolved": "pill-resolved",
    "Monitoring": "pill-medium",
    "Assigned": "pill-assigned",
    "Needs information": "pill-pending",
    "Escalated": "pill-critical",
  };
  return <span className={`pill ${map[status] || "pill-unverified"}`}>{status}</span>;
}

export default StatusPill;

