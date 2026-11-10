export const timeAgoShort = (iso) => {
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const timeAgo = (iso) => {
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
};

export const fmtDur = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export const CALL_SCRIPT = [
  { q: "Hello, this is the ResQNet AI assistant following up on your emergency report. Is now a good time?", a: "Yes, I can talk." },
  { q: "Can you confirm the location you reported is still correct?", a: "Yes, the location is correct." },
  { q: "Has the situation changed since you submitted the report?", a: "No change from what I reported." },
  { q: "Is anyone in immediate danger at that location right now?", a: "Yes — help is still needed there." },
  { q: "Thank you. Your answers were added to the report for responders.", a: "Understood, thank you." },
];

export const CALL_STATUS = {
  received: { icon: "checkCircle", cls: "call-icon completed", label: "Received", pill: "pill-verified" },
  missed: { icon: "phoneMissed", cls: "call-icon failed", label: "Missed call", pill: "pill-critical" },
  declined: { icon: "phoneMissed", cls: "call-icon failed", label: "Couldn't talk", pill: "pill-unverified" },
  scheduled: { icon: "phoneIncoming", cls: "call-icon pending", label: "Return call scheduled", pill: "pill-pending" },
  ringing: { icon: "phoneIncoming", cls: "call-icon pending", label: "Incoming now", pill: "pill-verified" },
  active: { icon: "phone", cls: "call-icon completed", label: "In progress", pill: "pill-assigned" },
};

