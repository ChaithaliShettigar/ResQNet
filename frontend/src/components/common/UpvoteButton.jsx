import React from "react";
import { Icon } from "./Icon.jsx";

export const baseConfirmations = (inc) =>
  inc.confirmations ?? (inc.verified ? 12 : inc.priority === "critical" ? 9 : 4);

export function UpvoteButton({ incident, upvoted, onToggle }) {
  const count = baseConfirmations(incident) + (upvoted ? 1 : 0);
  return (
    <button
      className={`upvote-btn${upvoted ? " upvoted" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(incident.id);
      }}
      aria-pressed={upvoted}
      title={upvoted ? "Remove your confirmation" : "Confirm this incident is real"}
    >
      <Icon name="confirm" size={14} />
      <span>{upvoted ? "Confirmed" : "It's real"}</span>
      <span className="upvote-count">{count}</span>
    </button>
  );
}

export default UpvoteButton;

