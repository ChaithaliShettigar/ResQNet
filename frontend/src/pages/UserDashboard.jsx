import React, { useState, useEffect, useRef } from "react";
import Icon from "../components/common/Icon";
import { PriorityPill } from "../components/common/PriorityPill";
import StatusPill from "../components/common/StatusPill";
import UpvoteButton from "../components/common/UpvoteButton";
import DashboardShell from "../components/layout/DashboardShell";
import IncidentMapVis from "../components/map/IncidentMapVis";
import UserCallsPanel from "../components/calls/UserCallsPanel";
import { TranslationPanel } from "../components/voice/TranslationPanel.jsx";
import { getReports, getIncidents, getUserCalls, saveUserCalls, LS } from "../data/seedData";
import { CALL_SCRIPT, timeAgoShort } from "../data/constants";
import { incidentsAPI, authAPI } from "../services/api";

export default function UserDashboard({ name, go, onLogout }) {
  const [tab, setTab] = useState(() => window.location.hash.startsWith("#dashboard/") ? window.location.hash.slice(11) : "overview");
  const changeTab = (nextTab) => {
    if (nextTab === tab) return;
    window.history.replaceState({ dashboardTab: nextTab }, "", `#dashboard/${nextTab}`);
    setTab(nextTab);
  };
  useEffect(() => {
    const restoreTab = () => {
      const match = window.location.hash.match(/^#dashboard\/([^/]+)$/);
      if (match) setTab(match[1]);
    };
    window.addEventListener("popstate", restoreTab);
    window.addEventListener("hashchange", restoreTab);
    return () => { window.removeEventListener("popstate", restoreTab); window.removeEventListener("hashchange", restoreTab); };
  }, []);
  const reports = getReports();
  const [incidents, setIncidents] = useState(() => getIncidents().filter(i => i.public).slice(0, 5));
  const [refSearch, setRefSearch] = useState("");
  const [refResult, setRefResult] = useState(null);
  const [profile, setProfile] = useState(() => LS.get("resqnet-user", {}));

  useEffect(() => {
    incidentsAPI.getAll({ publicOnly: true })
      .then((res) => {
        if (res.incidents && res.incidents.length > 0) {
          setIncidents(res.incidents.slice(0, 5));
        }
      })
      .catch(() => {});
  }, []);

  /* community upvotes (public incident confirmation) */
  const [upvoted, setUpvoted] = useState(() => LS.get("resqnet-user-upvotes", []));
  const toggleUpvote = async (id) => {
    setUpvoted(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      LS.set("resqnet-user-upvotes", next);
      return next;
    });
    try {
      await incidentsAPI.upvote(id);
    } catch (err) {
      console.warn("Upvote offline note:", err.message);
    }
  };

  const handleTrackRef = async () => {
    if (!refSearch.trim()) return;
    try {
      const res = await incidentsAPI.track(refSearch.trim());
      setRefResult(res.incident);
    } catch (err) {
      const r = reports.find(r => r.reference === refSearch.trim());
      setRefResult(r || { reference: refSearch, status: "Not found in database", type: "Unknown" });
    }
  };

  const handleSaveProfile = async () => {
    LS.set("resqnet-user", profile);
    try {
      await authAPI.updateProfile(profile);
      showToast("Profile saved to database");
    } catch (err) {
      showToast("Profile saved locally");
    }
  };

  /* AI follow-up calls */
  const [calls, setCalls] = useState(getUserCalls);
  const [activeId, setActiveId] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [step, setStep] = useState(0);
  const [toast, setToast] = useState(null);
  const callTimers = useRef({ tick: null, advance: null, ring: null });

  const showToast = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200); };

  const persistCalls = (next) => { setCalls(next); saveUserCalls(next); };
  const stopCallTimers = () => {
    if (callTimers.current.tick) clearInterval(callTimers.current.tick);
    if (callTimers.current.advance) clearInterval(callTimers.current.advance);
    callTimers.current.tick = null;
    callTimers.current.advance = null;
  };
  useEffect(() => () => { stopCallTimers(); if (callTimers.current.ring) clearTimeout(callTimers.current.ring); }, []);

  const ringing = calls.find(c => c.status === "ringing");
  const active = calls.find(c => c.id === activeId);
  const missedCount = calls.filter(c => c.status === "missed").length;

  const requestReturnCall = (reportRef, incidentType = "Your report") => {
    if (calls.some(c => c.status === "ringing" || c.status === "active" || c.status === "scheduled")) {
      showToast("A follow-up call is already pending", "error");
      return;
    }
    const id = `CL-${Date.now().toString().slice(-6)}`;
    const entry = {
      id, reportRef, incidentType, mode: "ai", status: "scheduled",
      at: new Date().toISOString(), durationSec: null,
      reason: "You requested a return call — the AI agent will confirm missing details on your report",
      transcript: [], reviewed: false,
    };
    persistCalls([entry, ...calls]);
    showToast("Return call requested — the AI agent will ring you in a moment");
    callTimers.current.ring = setTimeout(() => {
      setCalls(prev => {
        const next = prev.map(c => c.id === id ? { ...c, status: "ringing", at: new Date().toISOString() } : c);
        saveUserCalls(next);
        return next;
      });
      showToast("Incoming AI follow-up call — pick up to continue", "ok");
    }, 6000);
  };

  const answerCall = (id) => {
    if (callTimers.current.ring) { clearTimeout(callTimers.current.ring); callTimers.current.ring = null; }
    setActiveId(id); setStep(0); setElapsed(0);
    persistCalls(calls.map(c => c.id === id ? { ...c, status: "active" } : c));
    callTimers.current.tick = setInterval(() => setElapsed(e => e + 1), 1000);
    callTimers.current.advance = setInterval(() => setStep(s => (s >= CALL_SCRIPT.length ? s : s + 1)), 2600);
  };

  const declineCall = (id) => {
    if (callTimers.current.ring) { clearTimeout(callTimers.current.ring); callTimers.current.ring = null; }
    persistCalls(calls.map(c => c.id === id ? { ...c, status: "declined" } : c));
    showToast("Call declined — request a return call whenever you're ready");
  };

  const endCall = () => {
    stopCallTimers();
    const done = Math.min(step, CALL_SCRIPT.length);
    persistCalls(calls.map(c => c.id === activeId
      ? { ...c, status: "received", durationSec: elapsed, reviewed: false,
          transcript: CALL_SCRIPT.slice(0, done).map(x => ({ q: x.q, a: x.a })) }
      : c));
    setActiveId(null);
    showToast(`Call ended — ${done} detail${done === 1 ? "" : "s"} captured for responders`);
  };

  const markReviewed = (id) => {
    if (!id) return;
    persistCalls(calls.map(c => c.id === id ? { ...c, reviewed: true } : c));
    showToast("Marked as reviewed");
  };

  const notifications = [
    ...calls.filter(c => c.status === "missed").map(c => ({
      msg: `AI follow-up call about ${c.reportRef} was missed — request a return call to verify faster.`,
      time: timeAgoShort(c.at),
    })),
    ...calls.filter(c => c.status === "received").slice(0, 1).map(c => ({
      msg: `AI follow-up call about ${c.reportRef} completed — ${c.transcript.length} detail${c.transcript.length === 1 ? "" : "s"} captured.`,
      time: timeAgoShort(c.at),
    })),
    { msg: "Your report RQ-3840211 has been received by the coordination team.", time: "2 minutes ago" },
    { msg: "A response team has been assigned to the flood incident near River Belt Colony.", time: "18 minutes ago" },
    { msg: "Report RQ-3840150 status updated to 'Monitoring'.", time: "1 hour ago" },
    { msg: "Public incident map updated — 4 new reports in your area.", time: "2 hours ago" },
  ];

  return (
    <DashboardShell name={name} authority={false} activeTab={tab} setTab={changeTab} go={go} onLogout={onLogout} missedCalls={missedCount}>
      {/* OVERVIEW */}
      {tab === "overview" && (
        <div>
          <div className="stats-grid">
            <div className="stat-card neutral"><div className="stat-label">My Reports</div><div className="stat-value">{reports.length}</div><div className="stat-sub">Submitted by you</div></div>
            <div className="stat-card neutral"><div className="stat-label">Unread Notifications</div><div className="stat-value">{notifications.length}</div><div className="stat-sub">Check updates</div></div>
            <div className="stat-card critical"><div className="stat-label">Public Incidents</div><div className="stat-value">{incidents.length}</div><div className="stat-sub">Active today</div></div>
          </div>
          {missedCount > 0 && (
            <div className="missed-call-banner">
              <div className="call-icon failed"><Icon name="phoneMissed" size={18} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{missedCount} AI follow-up {missedCount === 1 ? "call" : "calls"} missed</div>
                <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 2 }}>The AI agent tried to reach you about missing report details. A quick return call helps responders verify your report faster.</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setTab("calls")}><Icon name="phoneIncoming" size={13} /> View calls</button>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
            <div className="card card-p">
              <div style={{ fontFamily: "Lora, serif", fontSize: 21, fontWeight: 700, marginBottom: 4 }}>Recent public incidents near you</div>
              <div style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 16 }}>Public information only. Precise locations are restricted to authorized personnel. If you are at the scene, upvote a genuine incident so responders can verify it faster.</div>
              {incidents.map(inc => (
                <div key={inc.id} className="my-report-card">
                  <div className={`dot dot-${inc.priority}`} />
                  <div style={{ flex: 1 }}>
                    <div className="my-report-type">{inc.type}</div>
                  <div className="my-report-meta">{inc.location || inc.area} · {(() => { const m = Math.floor((Date.now() - new Date(inc.reportedAt)) / 60000); return m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`; })()}</div>
                  <p style={{ margin: "8px 0", fontSize: 14, lineHeight: 1.55 }}>{inc.description}</p>
                  <div style={{ fontSize: 12, color: "var(--ink-muted)", marginBottom: 6 }}>Original language: {inc.originalLanguage || "English"}</div>
                  <TranslationPanel text={inc.description} originalLang={inc.originalLanguage || "en"} incidentId={inc.id} translations={inc.translations || {}} compact />
                  {(inc.instructions || []).map((instruction, index) => (
                    <div key={`${inc.id}-instruction-${index}`} style={{ marginTop: 12, padding: 10, background: "var(--cream)", borderRadius: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Emergency instruction</div>
                      <p style={{ margin: 0, fontSize: 14 }}>{instruction.text}</p>
                      <TranslationPanel text={instruction.text} originalLang={instruction.language || "en"} compact translations={instruction.translations || {}} />
                    </div>
                  ))}
                  </div>
                  <PriorityPill priority={inc.priority} size="sm" />
                  <StatusPill status={inc.status} />
                  <UpvoteButton incident={inc} upvoted={upvoted.includes(inc.id)} onToggle={toggleUpvote} />
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => setTab("public-map")}>View all incidents →</button>
            </div>
            <div className="card card-p">
              <div style={{ fontFamily: "Lora, serif", fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Track anonymous report</div>
              <p style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 14, lineHeight: 1.6 }}>Enter a reference number to check a report submitted without login. Sensitive location details remain protected.</p>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="input input-sm" value={refSearch} onChange={e => setRefSearch(e.target.value)} placeholder="RQ-1234567" style={{ fontFamily: "monospace" }} />
                <button className="btn btn-primary btn-sm" onClick={handleTrackRef}>Find</button>
              </div>
              {refResult && (
                <div style={{ marginTop: 12, background: refResult.type === "Unknown" ? "#fee2e2" : "#f0fdf4", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, marginBottom: 4 }}>{refResult.reference}</div>
                  <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>{refResult.type} · {refResult.status}</div>
                </div>
              )}
              <div className="divider" />
              <div style={{ fontFamily: "Lora, serif", fontSize: 17, fontWeight: 700, marginBottom: 10 }}>Recent notifications</div>
              {notifications.slice(0, 2).map((n, i) => (
                <div key={i} className="notif-item">
                  <div className="notif-dot" />
                  <div>
                    <div className="notif-msg">{n.msg}</div>
                    <div className="notif-time">{n.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MY REPORTS */}
      {tab === "my-reports" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h2 className="font-display" style={{ fontSize: 26, fontWeight: 700 }}>My Reports</h2>
              <p style={{ fontSize: 15, color: "var(--ink-muted)", marginTop: 4 }}>Private status updates for reports connected to this device.</p>
            </div>
            <button className="btn btn-emergency btn-sm" onClick={() => go("report")}><Icon name="plus" size={14} /> New Report</button>
          </div>
          {reports.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📋</div><h3>No reports yet</h3><p>Emergency reports submitted from this device will appear here.</p><button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => go("report")}>Submit a Report</button></div>
          ) : reports.map(r => (
            <div key={r.reference} className="my-report-card">
              <div className="my-report-ref">{r.reference}</div>
              <div style={{ flex: 1 }}>
                <div className="my-report-type">{r.type}</div>
                <div className="my-report-meta">{r.location} · {new Date(r.createdAt).toLocaleString()}</div>
              </div>
              {calls.some(c => c.reportRef === r.reference) && (
                <button className="btn btn-secondary btn-sm" onClick={() => setTab("calls")}>
                  <Icon name="phone" size={12} /> Follow-up call
                </button>
              )}
              <StatusPill status={r.status} />
            </div>
          ))}
          <div className="card card-p" style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Track an anonymous report</h3>
            <p style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 12, lineHeight: 1.55 }}>Enter a reference number from a report submitted without login.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="input input-sm" value={refSearch} onChange={e => setRefSearch(e.target.value)} placeholder="RQ-1234567" style={{ fontFamily: "monospace" }} />
              <button className="btn btn-primary btn-sm" onClick={handleTrackRef}>Find</button>
            </div>
            {refResult && <div style={{ marginTop: 10, background: "#f0fdf4", borderRadius: 8, padding: "10px 12px", fontSize: 13 }}><b style={{ fontFamily: "monospace" }}>{refResult.reference}</b> · {refResult.type} · {refResult.status}</div>}
          </div>
        </div>
      )}

      {/* AI FOLLOW-UP CALLS */}
      {tab === "calls" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h2 className="font-display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>AI Follow-Up Calls</h2>
            <p style={{ fontSize: 15, color: "var(--ink-muted)", maxWidth: 680 }}>The AI agent calls back when details are missing from a report. Answer to confirm location, status and urgency — answers are attached to your report for responders.</p>
          </div>
          <UserCallsPanel
            calls={calls}
            ringing={ringing}
            active={active}
            elapsed={elapsed}
            step={step}
            reports={reports}
            onAnswer={answerCall}
            onDecline={declineCall}
            onEnd={endCall}
            onRequestCallback={requestReturnCall}
            onMarkReviewed={markReviewed}
            onNewReport={() => go("report")}
          />
        </div>
      )}

      {/* PUBLIC MAP */}
      {tab === "public-map" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div><h2 className="font-display" style={{ fontSize: 26, fontWeight: 700 }}>Public Incident Map</h2><p style={{ fontSize: 15, color: "var(--ink-muted)", marginTop: 4 }}>Approximate locations only — precise coordinates are restricted to responders.</p></div>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--teal)", background: "var(--teal-light)", padding: "6px 12px", borderRadius: 999 }}><Icon name="lock" size={11} /> Privacy protected</span>
          </div>
          <div className="card" style={{ overflow: "hidden" }}>
            <IncidentMapVis incidents={getIncidents()} authority={false} height="380px" />
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
            {[["critical", "#ef4444", "Critical"], ["high", "#f59e0b", "High priority"], ["medium", "#3b82f6", "Medium"], ["low", "#10b981", "Monitoring"]].map(([p, c, l]) => (
              <span key={p} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-muted)" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: c, display: "inline-block" }} />{l}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* NOTIFICATIONS */}
      {tab === "notifications" && (
        <div>
          <h2 className="font-display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Notifications</h2>
          <p style={{ fontSize: 15, color: "var(--ink-muted)", marginBottom: 24 }}>Updates about your reports and relevant incidents.</p>
          <div className="card card-p">
            {notifications.map((n, i) => (
              <div key={i} className="notif-item">
                <div className="notif-dot" style={{ background: i < 3 ? "var(--teal)" : "#d1d5db" }} />
                <div>
                  <div className="notif-msg">{n.msg}</div>
                  <div className="notif-time">{n.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PROFILE */}
      {tab === "profile" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="card card-p">
            <h2 className="font-display" style={{ fontSize: 21, fontWeight: 700, marginBottom: 20 }}>Your Profile</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field"><label className="field-label">Full name</label><input className="input" value={profile.name || ""} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="field"><label className="field-label">Email</label><input className="input" value={profile.email || ""} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} /></div>
              <div className="field"><label className="field-label">Phone</label><input className="input" value={profile.phone || ""} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} /></div>
              <div className="field"><label className="field-label">Location / city</label><input className="input" value={profile.location || ""} onChange={e => setProfile(p => ({ ...p, location: e.target.value }))} /></div>
              <button className="btn btn-primary" onClick={handleSaveProfile}>Save profile</button>
            </div>
          </div>
          <div className="card card-p">
            <h2 className="font-display" style={{ fontSize: 21, fontWeight: 700, marginBottom: 20 }}>Privacy & Notifications</h2>
            {[["Email me about report status", true], ["Show my reports on public map (approximate)", true], ["SMS updates for urgent nearby incidents", false], ["Allow follow-up calls for my reports", true]].map(([label, def]) => (
              <label key={label} className="setting-toggle" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderBottom: "1px solid var(--ink-subtle)", fontSize: 15, color: "rgba(17,45,56,.75)", cursor: "pointer" }}>
                <input type="checkbox" defaultChecked={def} style={{ accentColor: "var(--teal)", width: 16, height: 16 }} />
                {label}
              </label>
            ))}
            <p style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 16, lineHeight: 1.6 }}>Anonymous reports are never linked to your profile unless you retrieve them using their reference number.</p>
          </div>
        </div>
      )}
      {/* Toast */}
      {toast && (
        <div className={`toast${toast.type === "error" ? " error" : ""}`}>{toast.msg}</div>
      )}
    </DashboardShell>
  );
}

