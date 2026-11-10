import React from "react";
import { Icon } from "../common/Icon.jsx";
import { CALL_SCRIPT, CALL_STATUS, fmtDur, timeAgoShort } from "../../data/constants.js";

export function UserCallsPanel({
  calls,
  ringing,
  active,
  elapsed,
  step,
  reports,
  onAnswer,
  onDecline,
  onEnd,
  onRequestCallback,
  onMarkReviewed,
  onNewReport,
}) {
  const received = calls.filter((c) => c.status === "received").length;
  const missed = calls.filter((c) => c.status === "missed" || c.status === "declined").length;

  return (
    <div>
      <div
        style={{
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 20,
          fontSize: 14,
          color: "#1e40af",
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <Icon name="phone" size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          Calls are simulated in this prototype. In production this connects to a telephony provider (Twilio / Exotel)
          running the AI voice agent or IVR mode.
        </span>
      </div>

      {/* Incoming AI call */}
      {ringing && (
        <div className="call-incoming">
          <div className="call-phone-pulse">
            <Icon name="phoneIncoming" size={24} />
          </div>
          <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: "#6ee7b7",
              }}
            >
              Incoming AI follow-up call
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
              {ringing.incidentType} — {ringing.reportRef}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.65)", marginTop: 4 }}>{ringing.reason}</div>
          </div>
          <div style={{ display: "flex", gap: 10, position: "relative", zIndex: 1, flexWrap: "wrap" }}>
            <button
              className="btn btn-sm"
              style={{ background: "#10b981", color: "white" }}
              onClick={() => onAnswer(ringing.id)}
            >
              <Icon name="phone" size={13} /> Answer
            </button>
            <button
              className="btn btn-sm"
              style={{ background: "rgba(255,255,255,.14)", color: "rgba(255,255,255,.85)" }}
              onClick={() => onDecline(ringing.id)}
            >
              Can't talk now
            </button>
          </div>
        </div>
      )}

      {/* Active call */}
      {active && (
        <div className="call-active-card">
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div className="waveform">
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i} style={{ animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
            <div style={{ flex: 1, minWidth: 200, position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>AI follow-up call in progress</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.65)", marginTop: 2 }}>
                {active.incidentType} — {active.reportRef} · {fmtDur(elapsed)}
              </div>
            </div>
            <button className="btn btn-danger btn-sm" onClick={onEnd}>
              <Icon name="x" size={12} /> End call
            </button>
          </div>
          <div className="call-transcript" style={{ position: "relative", zIndex: 1 }}>
            {CALL_SCRIPT.map((line, i) => (
              <div
                key={line.q}
                style={{
                  opacity: i <= step ? 1 : 0.3,
                  transition: "opacity .4s",
                  marginBottom: i < CALL_SCRIPT.length - 1 ? 12 : 0,
                }}
              >
                <div className="ct-agent">AI agent: {line.q}</div>
                {i < step && <div className="ct-user">You: {line.a}</div>}
              </div>
            ))}
            {step >= CALL_SCRIPT.length && (
              <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: "#6ee7b7" }}>
                All questions answered — you can end the call.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card neutral">
          <div className="stat-label">Total calls</div>
          <div className="stat-value">{calls.length}</div>
          <div className="stat-sub">AI &amp; IVR follow-ups</div>
        </div>
        <div className="stat-card ok">
          <div className="stat-label">Received</div>
          <div className="stat-value">{received}</div>
          <div className="stat-sub">Details captured</div>
        </div>
        <div className="stat-card critical">
          <div className="stat-label">Missed</div>
          <div className="stat-value v-critical">{missed}</div>
          <div className="stat-sub">Request a return call</div>
        </div>
      </div>

      {/* Request a follow-up call */}
      <div className="card card-p" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Request a return call</h3>
        <p style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 14, lineHeight: 1.55 }}>
          Missed our call? Ask the AI agent to call you back so you can confirm details on your report — it only takes a
          minute.
        </p>
        {reports.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>
            No reports on this device yet —{" "}
            <button onClick={onNewReport} style={{ color: "var(--teal)", fontWeight: 600, textDecoration: "underline" }}>
              submit a report
            </button>{" "}
            to enable follow-up calls about it.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {reports.map((r) => (
              <div
                key={r.reference}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  background: "var(--cream)",
                  borderRadius: 10,
                }}
              >
                <div className="my-report-ref" style={{ minWidth: 96 }}>
                  {r.reference}
                </div>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{r.type}</div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => onRequestCallback(r.reference, r.type)}
                >
                  <Icon name="phoneIncoming" size={12} /> Call me back
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Call history */}
      <div style={{ fontFamily: "Lora, serif", fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Call history</div>
      {calls.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📞</div>
          <h3>No follow-up calls yet</h3>
          <p>The AI agent will call if details are missing from a report.</p>
        </div>
      ) : (
        calls.map((c) => {
          const meta = CALL_STATUS[c.status] || CALL_STATUS.missed;
          return (
            <div key={c.id} className="call-row">
              <div className={meta.cls}>
                <Icon name={meta.icon} size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>
                    {c.incidentType} — {c.reportRef}
                  </span>
                  <span className={`call-mode-badge ${c.mode}`}>{c.mode === "ai" ? "AI-Assisted" : "IVR"}</span>
                  <span className={`pill ${meta.pill}`}>{meta.label}</span>
                  {c.reviewed && <span className="pill pill-resolved">Reviewed</span>}
                </div>
                <div className="call-detail">
                  {timeAgoShort(c.at)}
                  {c.durationSec ? ` · ${fmtDur(c.durationSec)} call` : ""} ·{" "}
                  {c.mode === "ai" ? "ResQNet AI voice agent" : "ResQNet IVR line"}
                </div>
                <div className="call-q">
                  <b>Reason for call:</b>
                  <div style={{ marginTop: 4 }}>{c.reason}</div>
                </div>
                {c.transcript?.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                    {c.transcript.map((t) => (
                      <div key={t.q} style={{ background: "var(--cream)", borderRadius: 8, padding: "8px 10px" }}>
                        <div className="ct-agent dark">AI: {t.q}</div>
                        <div className="ct-user dark">You: {t.a}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                {(c.status === "missed" || c.status === "declined") && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onRequestCallback(c.reportRef, c.incidentType)}
                  >
                    <Icon name="phoneIncoming" size={12} /> Return call
                  </button>
                )}
                {c.status === "received" && !c.reviewed && (
                  <button className="btn btn-secondary btn-sm" onClick={() => onMarkReviewed(c.id)}>
                    Mark reviewed
                  </button>
                )}
                {c.status === "scheduled" && <span className="pill pill-pending">Waiting for callback…</span>}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default UserCallsPanel;

