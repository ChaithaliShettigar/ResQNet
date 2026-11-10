import React from "react";

export function PriorityPill({ priority, size = "normal" }) {
  const map = { critical: "pill-critical", high: "pill-high", medium: "pill-medium", low: "pill-low" };
  const labels = { critical: "🔴 Critical", high: "🟠 High", medium: "🔵 Medium", low: "🟢 Low" };
  const cls = `pill ${map[priority] || "pill-unverified"}${size === "sm" ? " text-[11px]" : ""}`;
  return <span className={cls}>{labels[priority] || priority}</span>;
}

export function PriorityBar({ priority }) {
  return <div className={`iq-priority-bar ${priority}`} />;
}

export default PriorityPill;

