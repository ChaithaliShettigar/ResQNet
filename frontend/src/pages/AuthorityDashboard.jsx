import React, { useState, useEffect } from "react";
import Icon from "../components/common/Icon";
import { PriorityPill, PriorityBar } from "../components/common/PriorityPill";
import StatusPill from "../components/common/StatusPill";
import DashboardShell from "../components/layout/DashboardShell";
import IncidentMapVis from "../components/map/IncidentMapVis";
import { TranslationPanel } from "../components/voice/TranslationPanel.jsx";
import { getIncidents, saveIncidents, LS } from "../data/seedData";
import { incidentsAPI, adminAPI } from "../services/api";

export default function AuthorityDashboard({ go, onLogout }) {
  const [tab, setTab] = useState("overview");
  const [incidents, setIncidents] = useState(getIncidents());
  const [selected, setSelected] = useState(null);
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [overrideReason, setOverrideReason] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const [toast, setToast] = useState(null);
  const [instructionDraft, setInstructionDraft] = useState("");
  const [pendingOrgs, setPendingOrgs] = useState([
    { id: "org-1", name: "Green Valley NGO", type: "NGO", email: "coord@greenvalley.org", submitted: "2h ago" },
    { id: "org-2", name: "District Medical Response", type: "Healthcare", email: "dmr@health.gov.in", submitted: "5h ago" },
    { id: "org-3", name: "Volunteer Fire Corps #7", type: "Emergency services", email: "vfc7@rescue.in", submitted: "1d ago" },
  ]);

  useEffect(() => {
    incidentsAPI.getAll()
      .then((res) => {
        if (res.incidents && res.incidents.length > 0) {
          setIncidents(res.incidents);
          saveIncidents(res.incidents);
        }
      })
      .catch((err) => console.warn("Backend load note:", err.message));

    adminAPI.getPendingOrgs()
      .then((res) => {
        if (res.organizations && res.organizations.length > 0) {
          setPendingOrgs(res.organizations.map(o => ({
            id: o._id || o.id,
            name: o.name,
            type: o.type,
            email: o.email,
            submitted: "Recent",
          })));
        }
      })
      .catch(() => {});
  }, []);

  const showToast = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3200); };

  const updateIncident = async (id, changes) => {
    const updated = incidents.map(i => i.id === id ? { ...i, ...changes } : i);
    setIncidents(updated);
    saveIncidents(updated);
    if (selected?.id === id) setSelected({ ...selected, ...changes });

    try {
      await incidentsAPI.update(id, changes);
    } catch (err) {
      console.warn("Backend update error:", err.message);
    }
  };

  const handleApproveOrg = async (r) => {
    setPendingOrgs(prev => prev.filter(p => p.name !== r.name));
    showToast(`${r.name} approved`);
    try {
      await adminAPI.approveOrg(r.id || r.name);
    } catch (err) {
      console.warn("Admin action note:", err.message);
    }
  };

  const handleRejectOrg = async (r) => {
    setPendingOrgs(prev => prev.filter(p => p.name !== r.name));
    showToast(`${r.name} rejected`);
    try {
      await adminAPI.rejectOrg(r.id || r.name);
    } catch (err) {
      console.warn("Admin action note:", err.message);
    }
  };

  const filteredQueue = incidents.filter(i => {
    const pOk = filterPriority === "all" || i.priority === filterPriority;
    const sOk = filterStatus === "all" || i.status === filterStatus;
    const tOk = filterType === "all" || i.type === filterType;
    return pOk && sOk && tOk;
  });

  const stats = {
    total: incidents.filter(i => i.status !== "Resolved").length,
    critical: incidents.filter(i => i.priority === "critical").length,
    high: incidents.filter(i => i.priority === "high").length,
    verification: incidents.filter(i => !i.verified).length,
    unassigned: incidents.filter(i => !i.team && i.status !== "Resolved").length,
  };

  const weather = { temp: "28°C", rain: "48mm/hr", humidity: "91%", wind: "22km/h NE", alert: "Heavy rain warning active in River Belt district. Flash flood risk elevated through 23:00." };

  function timeAgo(iso) { const m = Math.floor((Date.now() - new Date(iso)) / 60000); return m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`; }

  /* ---- Incident Detail Panel ---- */
  function IncidentDetailPanel({ inc }) {
    if (!inc) return (
      <div className="id-panel">
        <div style={{ padding: 32, textAlign: "center", color: "var(--ink-muted)" }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Select an incident</div>
          <div style={{ fontSize: 15 }}>Click any incident in the queue to view details, AI analysis, and verification options.</div>
        </div>
      </div>
    );

    return (
      <div className="id-panel">
        <div className="id-panel-header">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--teal)", marginBottom: 4 }}>Incident Details</div>
              <div style={{ fontFamily: "Lora, serif", fontSize: 21, fontWeight: 700 }}>{inc.type}</div>
              <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 3 }}>{inc.id} · {timeAgo(inc.reportedAt)}</div>
            </div>
            <PriorityPill priority={inc.priority} />
          </div>
        </div>
        <div className="id-panel-body">
          {/* AI Analysis */}
          <div className="id-section">
            <div className="id-section-title">AI Analysis — Pipeline 3: Urgency Ranking</div>
            <div className="ai-panel">
              <div className="ai-panel-title"><Icon name="zap" size={14} /> AI Priority Recommendation</div>
              <div className="ai-priority-badge" style={{ color: { critical: "#dc2626", high: "#d97706", medium: "#2563eb", low: "#059669" }[inc.priority] || "#374151" }}>
                {inc.priority?.toUpperCase()} PRIORITY
              </div>
              <p className="ai-reasoning">{inc.aiReason}</p>
              {inc.missing?.length > 0 && (
                <div className="ai-missing">
                  <div className="ai-missing-title">⚠️ Missing information</div>
                  {inc.missing.map(m => (
                    <div key={m} className="ai-missing-item"><Icon name="alert" size={12} /> {m}</div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--ink-muted)", marginBottom: 4 }}>
                  <span>AI Confidence</span><span>{inc.confidence}%</span>
                </div>
                <div className="confidence-bar"><div className="confidence-fill" style={{ width: `${inc.confidence}%` }} /></div>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--ink-muted)", fontStyle: "italic" }}>AI analysis assists review — it does not verify the incident.</div>
            </div>
          </div>

          {/* Report Info */}
          <div className="id-section">
            <div className="id-section-title">Report Information</div>
            {[
              ["Incident ID", inc.id],
              ["Category", inc.type],
              ["Location", inc.location],
              ["Reported", timeAgo(inc.reportedAt)],
              ["Status", <StatusPill status={inc.status} />],
              ["Verified", inc.verified ? "✅ Yes" : "❌ Awaiting verification"],
              ["Team assigned", inc.team || "None"],
              ["Reporter contact", inc.reporter ? `${inc.reporter} (restricted)` : "Not provided"],
              ["Weather context", inc.weather || "N/A"],
            ].map(([k, v]) => (
              <div key={k} className="id-field">
                <span className="id-field-key">{k}</span>
                <span className="id-field-val">{v}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="id-section">
            <div className="id-section-title">Original Report Description</div>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(17,45,56,.8)" }}>{inc.description}</p>
            <div style={{ fontSize: 12, color: "var(--ink-muted)", marginBottom: 8 }}>Original language: {inc.originalLanguage || "English"}</div>
            <TranslationPanel key={inc.id} text={inc.description} originalLang={inc.originalLanguage || "en"} incidentId={inc.id} translations={inc.translations || {}} />
          </div>

          <div className="id-section">
            <div className="id-section-title">Emergency Instructions and Updates</div>
            {(inc.instructions || []).map((instruction, index) => (
              <div key={`${instruction.createdAt || index}-${index}`} style={{ border: "1px solid var(--ink-subtle)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <p style={{ margin: "0 0 8px", lineHeight: 1.6 }}>{instruction.text}</p>
                <TranslationPanel
                  text={instruction.text}
                  originalLang={instruction.language || "en"}
                  translations={instruction.translations || {}}
                  onTranslation={(lang, translatedText) => {
                    const instructions = [...(inc.instructions || [])];
                    instructions[index] = { ...instruction, translations: { ...(instruction.translations || {}), [lang]: translatedText } };
                    updateIncident(inc.id, { instructions });
                  }}
                />
              </div>
            ))}
            <textarea className="input" value={instructionDraft} onChange={(e) => setInstructionDraft(e.target.value)} placeholder="Enter an emergency instruction or update…" aria-label="Emergency instruction" />
            <button type="button" className="btn btn-primary btn-sm" disabled={!instructionDraft.trim()} onClick={() => {
              const instructions = [...(inc.instructions || []), { text: instructionDraft.trim(), language: "en", by: "Authority Responder", createdAt: new Date().toISOString() }];
              updateIncident(inc.id, { instructions });
              setInstructionDraft("");
              showToast("Emergency instruction published");
            }}>Publish instruction</button>
          </div>

          {/* Duplicate flag */}
          {inc.duplicate && (
            <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8, padding: "10px 12px", marginBottom: 16, fontSize: 13, color: "#92400e", display: "flex", gap: 8 }}>
              <Icon name="alert" size={14} /> This report may be a duplicate of another incident. Review before creating a separate response.
            </div>
          )}

          {/* Override */}
          {showOverride && (
            <div className="override-box">
              <div style={{ fontSize: 13, fontWeight: 700, color: "#c2410c", marginBottom: 8 }}>Record reason for overriding AI priority</div>
              <textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder="Explain why you are changing the priority..." />
            </div>
          )}

          {/* Actions */}
          <div className="id-section">
            <div className="id-section-title">Verification Actions</div>
            <div className="id-action-grid">
              <button className="id-action-btn primary full" onClick={() => { updateIncident(inc.id, { verified: true, status: "Verified" }); showToast("Incident confirmed and verified"); }}>
                ✅ Confirm Incident
              </button>
              <button className="id-action-btn" onClick={() => { updateIncident(inc.id, { status: "Needs information" }); showToast("Flagged — additional information requested"); }}>
                📋 Request Information
              </button>
              <button className="id-action-btn" onClick={() => { updateIncident(inc.id, { status: "Escalated", priority: "critical" }); showToast("Priority escalated to Critical"); }}>
                🔺 Escalate Priority
              </button>
              <button className="id-action-btn" onClick={() => { updateIncident(inc.id, { duplicate: !inc.duplicate }); showToast(inc.duplicate ? "Duplicate flag removed" : "Flagged as possible duplicate"); }}>
                🔁 {inc.duplicate ? "Unmark Duplicate" : "Flag Duplicate"}
              </button>
              <button className="id-action-btn" onClick={() => setShowOverride(!showOverride)}>
                ✏️ Override AI Reasoning
              </button>
              {showOverride && <button className="id-action-btn primary" onClick={() => { if (overrideReason) { updateIncident(inc.id, { aiReason: `[HUMAN OVERRIDE] ${overrideReason}` }); setShowOverride(false); setOverrideReason(""); showToast("AI reasoning overridden"); } }}>Save Override</button>}
              <button className="id-action-btn danger full" onClick={() => { updateIncident(inc.id, { status: "Needs verification", verified: false }); showToast("Marked as unverified"); }}>
                ❌ Mark as Unverified
              </button>
            </div>
          </div>

          {/* Team Assignment */}
          <div className="id-section">
            <div className="id-section-title">Response Assignment</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <select className="input input-sm" value={inc.team || ""} onChange={e => { updateIncident(inc.id, { team: e.target.value || null }); showToast(e.target.value ? `Assigned to ${e.target.value}` : "Team unassigned"); }}>
                <option value="">Unassigned</option>
                {["Team Alpha", "Team Bravo", "Team Delta", "Team Echo", "NDRF Unit 3", "Fire Brigade #12", "Medical Response A"].map(t => <option key={t}>{t}</option>)}
              </select>
              <select className="input input-sm" value={inc.status} onChange={e => { updateIncident(inc.id, { status: e.target.value }); showToast(`Status updated to: ${e.target.value}`); }}>
                {["Needs verification", "Under Review", "Verified", "Assigned", "Response in Progress", "Monitoring", "Resolved"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const types = [...new Set(incidents.map(i => i.type))];

  return (
    <DashboardShell name="Responder" authority activeTab={tab} setTab={setTab} go={go} onLogout={onLogout}>
      {/* OVERVIEW */}
      {tab === "overview" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "12px 16px", fontSize: 15, color: "#c2410c" }}>
            <Icon name="lock" size={15} />
            Protected workspace — public accounts do not receive authority access automatically. Organization approval is required.
          </div>
          <div className="stats-grid">
            <div className="stat-card neutral"><div className="stat-label">Active Incidents</div><div className="stat-value">{stats.total}</div><div className="stat-sub">Excluding resolved</div></div>
            <div className="stat-card critical"><div className="stat-label">Critical Priority</div><div className="stat-value v-critical">{stats.critical}</div><div className="stat-sub">Immediate attention</div></div>
            <div className="stat-card high"><div className="stat-label">High Priority</div><div className="stat-value v-high">{stats.high}</div><div className="stat-sub">Urgent response</div></div>
            <div className="stat-card neutral"><div className="stat-label">Awaiting Verification</div><div className="stat-value">{stats.verification}</div><div className="stat-sub">Human review needed</div></div>
            <div className="stat-card neutral"><div className="stat-label">Awaiting Response</div><div className="stat-value">{stats.unassigned}</div><div className="stat-sub">No team assigned</div></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
            <div className="card card-p">
              <div style={{ fontFamily: "Lora, serif", fontSize: 21, fontWeight: 700, marginBottom: 4 }}>Urgency-Ranked Incidents</div>
              <p style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 16 }}>AI-assisted prioritization. Click an incident to view details and take action.</p>
              {incidents.filter(i => i.status !== "Resolved").slice(0, 4).map(inc => (
                <div key={inc.id} className={`iq-row${selected?.id === inc.id ? " selected" : ""}`} onClick={() => { setSelected(inc); setTab("queue"); }}>
                  <PriorityBar priority={inc.priority} />
                  <div className="iq-body">
                    <div className="iq-header">
                      <span className="iq-title">{inc.type}</span>
                      <PriorityPill priority={inc.priority} size="sm" />
                    </div>
                    <div className="iq-meta"><Icon name="pin" size={11} /> {inc.location} · {timeAgo(inc.reportedAt)}</div>
                    <div className="iq-ai-reason">
                      <div className="ai-label">AI Reasoning</div>
                      <p>{inc.aiReason?.slice(0, 100)}...</p>
                    </div>
                  </div>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => setTab("queue")}>View all incidents →</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="weather-panel">
                <div className="weather-header">
                  <span className="weather-title">🌧️ Weather Context</span>
                  <span className="weather-timestamp">Updated 5 min ago</span>
                </div>
                <div className="weather-grid">
                  {[["🌡️", weather.temp, "Temperature"], ["🌧️", weather.rain, "Rainfall rate"], ["💧", weather.humidity, "Humidity"], ["💨", weather.wind, "Wind speed"]].map(([icon, val, label]) => (
                    <div key={label} className="weather-card">
                      <div style={{ fontSize: 23, marginBottom: 6 }}>{icon}</div>
                      <div className="weather-val">{val}</div>
                      <div className="weather-label">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="weather-alert"><Icon name="alert" size={14} /> {weather.alert}</div>
              </div>
              <div className="card card-p">
                <div style={{ fontFamily: "Lora, serif", fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Quick Actions</div>
                {[["queue", "View incident queue", "list"], ["calls", "Follow-up calls", "phone"], ["coordination", "Response coordination", "users"]].map(([v, l, i]) => (
                  <button key={v} className="btn btn-secondary btn-sm" style={{ width: "100%", justifyContent: "flex-start", marginBottom: 8 }} onClick={() => setTab(v)}>
                    <Icon name={i} size={14} /> {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INCIDENT QUEUE */}
      {tab === "queue" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h2 className="font-display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Urgency-Ranked Incident Queue</h2>
            <p style={{ fontSize: 15, color: "var(--ink-muted)" }}>AI-assisted prioritization with clear reasoning. Authorities can review and override. Precise locations visible to authorized responders only.</p>
          </div>
          <div className="aq-layout">
            {/* Queue list */}
            <div>
              {/* Filters */}
              <div style={{ marginBottom: 14 }}>
                <div className="aq-filters">
                  {[["all", "All", ""], ["critical", "🔴 Critical", "critical"], ["high", "🟠 High", "high"], ["medium", "🔵 Medium", ""], ["low", "🟢 Low", ""]].map(([v, l, c]) => (
                    <button key={v} className={`aq-filter-btn ${c} ${filterPriority === v ? "active" : ""}`} onClick={() => setFilterPriority(v)}>{l}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <select className="input input-sm" style={{ flex: 1 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="all">All statuses</option>
                    {["Needs verification", "Verified", "Under Review", "Response in Progress", "Monitoring", "Resolved"].map(s => <option key={s}>{s}</option>)}
                  </select>
                  <select className="input input-sm" style={{ flex: 1 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                    <option value="all">All types</option>
                    {types.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 12 }}>Showing {filteredQueue.length} of {incidents.length} incidents</div>
              {filteredQueue.length === 0 ? (
                <div className="empty-state"><div className="empty-state-icon">✅</div><h3>No incidents match</h3><p>Try adjusting filters</p></div>
              ) : filteredQueue.map(inc => (
                <div key={inc.id} className={`iq-row${selected?.id === inc.id ? " selected" : ""}`} onClick={() => setSelected(inc)}>
                  <PriorityBar priority={inc.priority} />
                  <div className="iq-body">
                    <div className="iq-header">
                      <span className="iq-title">{inc.type} — {inc.location}</span>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <PriorityPill priority={inc.priority} size="sm" />
                        {inc.duplicate && <span className="pill pill-high">Possible duplicate</span>}
                      </div>
                    </div>
                    <div className="iq-meta"><Icon name="pin" size={11} /> {inc.area} · {timeAgo(inc.reportedAt)} · {inc.verified ? "✅ Verified" : "⏳ Unverified"}</div>
                    <div className="iq-ai-reason">
                      <div className="ai-label">🤖 AI Reasoning (Pipeline 3)</div>
                      <p>{inc.aiReason}</p>
                    </div>
                    <div className="iq-actions" onClick={e => e.stopPropagation()}>
                      <button className="iq-action-btn primary" onClick={() => { setSelected(inc); }}>View Details</button>
                      <button className="iq-action-btn" onClick={() => { updateIncident(inc.id, { verified: true, status: "Verified" }); showToast("Incident verified"); }}>✅ Verify</button>
                      <button className="iq-action-btn" onClick={() => { updateIncident(inc.id, { status: "Escalated", priority: "critical" }); showToast("Escalated to Critical"); }}>🔺 Escalate</button>
                      <button className="iq-action-btn" onClick={() => { setSelected(inc); setTab("calls"); showToast("Opened in follow-up calls"); }}>📞 Follow-up</button>
                      <select className="authority-select" value={inc.team || ""} onChange={e => { updateIncident(inc.id, { team: e.target.value || null }); showToast(e.target.value ? `Assigned to ${e.target.value}` : "Team removed"); }} style={{ border: "1.5px solid var(--ink-subtle)", borderRadius: 999, padding: "6px 28px 6px 10px", fontSize: 12, fontWeight: 600, background: "white", cursor: "pointer", appearance: "auto" }}>
                        <option value="">Assign team</option>
                        {["Team Alpha", "Team Bravo", "Team Delta", "NDRF Unit 3", "Fire Brigade #12"].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Detail panel */}
            <IncidentDetailPanel inc={selected} />
          </div>
        </div>
      )}

      {/* INCIDENT MAP */}
      {tab === "map" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h2 className="font-display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Incident Map — Authority View</h2>
            <p style={{ fontSize: 15, color: "var(--ink-muted)" }}>Authorized responders can access precise coordinates. Click markers to view incident details.</p>
          </div>
          <div className="card" style={{ overflow: "hidden" }}>
            <IncidentMapVis incidents={incidents} authority height="500px" onMarkerClick={inc => { setSelected(inc); setTab("queue"); }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 16 }}>
            {incidents.filter(i => i.status !== "Resolved").slice(0, 4).map(inc => (
              <div key={inc.id} className="card card-p" style={{ cursor: "pointer" }} onClick={() => { setSelected(inc); setTab("queue"); }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <div className={`dot dot-${inc.priority}`} style={{ marginTop: 3 }} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{inc.type}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>{inc.area}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-muted)" }}>Precise: {inc.location}</div>
                <PriorityPill priority={inc.priority} size="sm" />
                <p style={{ fontSize: 13, lineHeight: 1.5, margin: "8px 0 4px" }}>{inc.description}</p>
                <div style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 4 }}>Original language: {inc.originalLanguage || "English"}</div>
                <div onClick={(e) => e.stopPropagation()}>
                  <TranslationPanel text={inc.description} originalLang={inc.originalLanguage || "en"} incidentId={inc.id} translations={inc.translations || {}} compact />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VERIFICATION */}
      {tab === "verification" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h2 className="font-display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Incident Verification</h2>
            <p style={{ fontSize: 15, color: "var(--ink-muted)" }}>Review unverified incidents and confirm or reject them. Link duplicates before creating separate response tasks.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 20 }}>
            <div>
              <div className="tabs">
                <button className="tab-btn active">Unverified ({incidents.filter(i => !i.verified).length})</button>
                <button className="tab-btn">Possible duplicates ({incidents.filter(i => i.duplicate).length})</button>
                <button className="tab-btn">All incidents ({incidents.length})</button>
              </div>
              {incidents.filter(i => !i.verified).map(inc => (
                <div key={inc.id} className={`iq-row${selected?.id === inc.id ? " selected" : ""}`} onClick={() => setSelected(inc)}>
                  <PriorityBar priority={inc.priority} />
                  <div className="iq-body">
                    <div className="iq-header">
                      <span className="iq-title">{inc.type} — {inc.location}</span>
                      <PriorityPill priority={inc.priority} size="sm" />
                    </div>
                    <div className="iq-meta">{inc.id} · {timeAgo(inc.reportedAt)} · Confidence: {inc.confidence}%</div>
                    <div className="iq-actions" onClick={e => e.stopPropagation()}>
                      <button className="iq-action-btn primary" onClick={() => { updateIncident(inc.id, { verified: true, status: "Verified" }); showToast("Incident verified"); }}>✅ Confirm Incident</button>
                      <button className="iq-action-btn danger" onClick={() => { updateIncident(inc.id, { status: "Needs verification", verified: false }); showToast("Marked as unverified"); }}>❌ Mark Unverified</button>
                      <button className="iq-action-btn" onClick={() => { updateIncident(inc.id, { duplicate: !inc.duplicate }); showToast(inc.duplicate ? "Duplicate flag removed" : "Flagged as duplicate"); }}>{inc.duplicate ? "🔁 Unlink Duplicate" : "🔗 Link Duplicate"}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <IncidentDetailPanel inc={selected} />
          </div>
        </div>
      )}

      {/* FOLLOW-UP CALLS */}
      {tab === "calls" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h2 className="font-display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>AI-Assisted Follow-Up Calls</h2>
            <p style={{ fontSize: 15, color: "var(--ink-muted)" }}>Initiate follow-up calls for incomplete reports. Urgent incidents are never downgraded due to unanswered calls.</p>
          </div>
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 15, color: "#1e40af" }}>
            <Icon name="phone" size={14} style={{ display: "inline", marginRight: 8 }} />
            For this prototype, call outcomes are simulated. In production, this integrates with a telephony provider (e.g., Twilio, Exotel) for real AI-assisted or IVR calls.
          </div>
          {incidents.filter(i => i.reporter && i.status !== "Resolved").map(inc => (
            <div key={inc.id} className="call-row">
              <div className={`call-icon ${inc.callStatus === "Completed" ? "completed" : inc.callStatus === "Failed" ? "failed" : "pending"}`}>
                <Icon name="phone" size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{inc.type} — {inc.id}</span>
                  <PriorityPill priority={inc.priority} size="sm" />
                  <span className={`call-mode-badge ${inc.callStatus === "AI" ? "ai" : "ivr"}`}>
                    {inc.callStatus === "Completed" ? "AI call" : "IVR mode"}
                  </span>
                </div>
                <div className="call-detail">{inc.location} · Reporter: {inc.reporter}</div>
                {inc.missing?.length > 0 && (
                  <div className="call-q">
                    <b>Questions to ask:</b>
                    {inc.missing.map(m => <div key={m} style={{ marginTop: 4 }}>• {m}</div>)}
                  </div>
                )}
                <div style={{ marginTop: 8 }}>
                  <span className={`pill ${inc.callStatus === "Completed" ? "pill-verified" : inc.callStatus === "Failed" ? "pill-critical" : "pill-pending"}`}>
                    Call: {inc.callStatus || "Pending"}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <button className="btn btn-primary btn-sm" onClick={() => { updateIncident(inc.id, { callStatus: "Completed", missing: [] }); showToast(`Follow-up call simulated for ${inc.id}`); }}>
                  <Icon name="phone" size={12} /> Initiate Call
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => { updateIncident(inc.id, { callStatus: "Failed" }); showToast("Call marked as failed — incident remains in queue"); }}>
                  Mark Failed
                </button>
              </div>
            </div>
          ))}
          <div className="card card-p" style={{ marginTop: 20 }}>
            <h3 style={{ fontFamily: "Lora, serif", fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Calling Modes</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { mode: "ai", title: "Mode 1: AI-Assisted Call", desc: "A telephony service connects to an AI that asks relevant follow-up questions and extracts information from responses automatically." },
                { mode: "ivr", title: "Mode 2: IVR Without AI", desc: "Pre-recorded prompts are played and keypad responses collected. Works without online AI dependency — suitable for low-bandwidth areas." },
              ].map(m => (
                <div key={m.mode} style={{ background: "var(--cream)", borderRadius: 10, padding: 16 }}>
                  <span className={`call-mode-badge ${m.mode}`} style={{ marginBottom: 10, display: "inline-block" }}>{m.mode === "ai" ? "AI-Assisted" : "IVR"}</span>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{m.title}</div>
                  <div style={{ fontSize: 15, color: "var(--ink-muted)", lineHeight: 1.6 }}>{m.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RESPONSE COORDINATION */}
      {tab === "coordination" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h2 className="font-display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Response Coordination</h2>
            <p style={{ fontSize: 15, color: "var(--ink-muted)" }}>Track team assignments, response status, and incident lifecycle from verification to resolution.</p>
          </div>
          {/* Lifecycle legend */}
          <div className="card card-p" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Incident Lifecycle</div>
            <div className="lifecycle">
              {["Reported", "Under Review", "Verified", "Assigned", "In Progress", "Resolved"].map((s, i, arr) => (
                <React.Fragment key={s}>
                  <div className="lifecycle-step">
                    <div className={`lifecycle-dot ${i < 3 ? "done" : i === 3 ? "current" : ""}`}>{i < 3 ? <Icon name="check" size={12} /> : i + 1}</div>
                    <div className="lifecycle-label">{s}</div>
                  </div>
                  {i < arr.length - 1 && <div className={`lifecycle-line${i < 3 ? " done" : ""}`} style={{ flex: 1 }} />}
                </React.Fragment>
              ))}
            </div>
          </div>
          {incidents.filter(i => i.status !== "Resolved").map(inc => (
            <div key={inc.id} className="rc-row">
              <PriorityBar priority={inc.priority} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{inc.type} — {inc.id}</span>
                  <PriorityPill priority={inc.priority} size="sm" />
                  <StatusPill status={inc.status} />
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 8 }}>{inc.location} · {timeAgo(inc.reportedAt)}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {inc.team ? <span className="team-tag"><Icon name="users" size={12} /> {inc.team}</span> : <span style={{ fontSize: 13, color: "#9ca3af" }}>No team assigned</span>}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <select className="input input-sm" value={inc.team || ""} onChange={e => { updateIncident(inc.id, { team: e.target.value || null }); showToast(e.target.value ? `Assigned to ${e.target.value}` : "Team removed"); }}>
                  <option value="">Assign team</option>
                  {["Team Alpha", "Team Bravo", "Team Delta", "NDRF Unit 3", "Fire Brigade #12", "Medical Response A"].map(t => <option key={t}>{t}</option>)}
                </select>
                <select className="input input-sm" value={inc.status} onChange={e => { updateIncident(inc.id, { status: e.target.value }); showToast(`Status → ${e.target.value}`); }}>
                  {["Needs verification", "Under Review", "Verified", "Assigned", "Response in Progress", "Monitoring", "Resolved"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* WEATHER */}
      {tab === "weather" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h2 className="font-display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Weather & Environmental Context</h2>
            <p style={{ fontSize: 15, color: "var(--ink-muted)" }}>Real-time weather data to support incident assessment. Weather informs but does not determine priority.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div className="weather-panel" style={{ height: "auto" }}>
              <div className="weather-header">
                <span className="weather-title">🌧️ Current Conditions — Response Area</span>
                <span className="weather-timestamp">Updated: {new Date().toLocaleTimeString()}</span>
              </div>
              <div className="weather-grid">
                {[["🌡️", weather.temp, "Temperature"], ["🌧️", weather.rain, "Rainfall (active)"], ["💧", weather.humidity, "Humidity"], ["💨", weather.wind, "Wind direction & speed"], ["👁️", "3km", "Visibility"], ["🌊", "Elevated", "Flood risk"]].map(([icon, val, label]) => (
                  <div key={label} className="weather-card">
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
                    <div className="weather-val">{val}</div>
                    <div className="weather-label">{label}</div>
                  </div>
                ))}
              </div>
              <div className="weather-alert"><Icon name="alert" size={14} /> {weather.alert}</div>
              <div style={{ marginTop: 12, fontSize: 12, color: "rgba(255,255,255,.45)" }}>Data source: India Meteorological Department (IMD) · Refreshed every 5 minutes</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="card card-p">
                <div style={{ fontFamily: "Lora, serif", fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Severe Weather Alerts</div>
                {[
                  { level: "high", alert: "Flash flood warning — River Belt district", time: "Active until 23:00" },
                  { level: "medium", alert: "Strong wind advisory — North Hill corridor", time: "Active until 22:00" },
                  { level: "low", alert: "Landslide risk elevated — post-rain terrain instability", time: "12-hour advisory" },
                ].map(a => (
                  <div key={a.alert} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--ink-subtle)" }}>
                    <div className={`dot dot-${a.level}`} style={{ marginTop: 3, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{a.alert}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 3 }}>{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="card card-p">
                <div style={{ fontFamily: "Lora, serif", fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Weather × Incidents</div>
                <p style={{ fontSize: 15, color: "var(--ink-muted)", lineHeight: 1.65, marginBottom: 14 }}>Current rainfall and flood conditions correlate with {incidents.filter(i => ["Flood", "Landslide"].includes(i.type)).length} active incidents. Weather context is provided to help authorities assess conditions — weather data alone does not change incident priority.</p>
                {incidents.filter(i => ["Flood", "Landslide"].includes(i.type) && i.status !== "Resolved").slice(0, 3).map(inc => (
                  <div key={inc.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--ink-subtle)", fontSize: 13 }}>
                    <div className={`dot dot-${inc.priority}`} />
                    <span style={{ flex: 1 }}>{inc.type} — {inc.area}</span>
                    <span style={{ color: "var(--ink-muted)" }}>{inc.weather}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN */}
      {tab === "admin" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h2 className="font-display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Admin & Permissions</h2>
            <p style={{ fontSize: 15, color: "var(--ink-muted)" }}>Review authority account requests, manage roles and organizations. Public users cannot grant themselves privileged roles.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div className="card card-p">
              <div style={{ fontFamily: "Lora, serif", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Pending Approvals</div>
              <p style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 16 }}>Organizations awaiting authority access review</p>
              {pendingOrgs.map(r => (
                <div key={r.name} className="admin-row">
                  <div className="admin-avatar">{r.name.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 3 }}>{r.type} · {r.email}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>Submitted {r.submitted}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-sm" style={{ background: "#d1fae5", color: "#065f46", fontWeight: 700 }} onClick={() => handleApproveOrg(r)}>Approve</button>
                    <button className="btn btn-sm" style={{ background: "#fee2e2", color: "#dc2626", fontWeight: 700 }} onClick={() => handleRejectOrg(r)}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="card card-p">
              <div style={{ fontFamily: "Lora, serif", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Active Authority Accounts</div>
              <p style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 16 }}>Approved organizations with active access</p>
              {[
                { name: "State NDRF Unit 3", role: "Disaster management authority", email: "ndrf3@ndrf.gov.in", status: "Active" },
                { name: "District Control Room", role: "Control-room operator", email: "dcr@district.gov.in", status: "Active" },
                { name: "City Fire Brigade #12", role: "Fire and rescue responder", email: "cfb12@fire.gov.in", status: "Active" },
                { name: "Helping Hands NGO", role: "NGO coordinator", email: "coord@hh.org", status: "Active" },
              ].map(a => (
                <div key={a.name} className="admin-row">
                  <div className="admin-avatar" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>{a.name.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{a.name}</div>
                    <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 2 }}>{a.email}</div>
                    <span className="role-tag authority-role" style={{ marginTop: 4, display: "inline-flex" }}>{a.role}</span>
                  </div>
                  <button className="btn btn-ghost btn-xs" onClick={() => showToast(`${a.name} access disabled`)}>Disable</button>
                </div>
              ))}
            </div>
          </div>
          <div className="card card-p" style={{ marginTop: 20 }}>
            <div style={{ fontFamily: "Lora, serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Available Roles</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              {[
                ["Disaster management authority", "authority-role", "Full incident access"],
                ["Control-room operator", "authority-role", "Monitor and coordinate"],
                ["Fire and rescue responder", "authority-role", "Field response"],
                ["NGO coordinator", "volunteer-role", "Aid coordination"],
                ["Volunteer", "volunteer-role", "Limited field support"],
                ["Public user", "public-role", "Report and track only"],
                ["Administrator", "admin-role", "Platform management"],
              ].map(([role, cls, desc]) => (
                <div key={role} style={{ padding: "12px 14px", background: "var(--cream)", borderRadius: 10 }}>
                  <span className={`role-tag ${cls}`} style={{ marginBottom: 6, display: "inline-flex" }}>{role}</span>
                  <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 4 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast${toast.type === "error" ? " error" : ""}`}>
          <Icon name="checkCircle" size={18} style={{ color: "var(--teal)", flexShrink: 0 }} />
          {toast.msg}
        </div>
      )}
    </DashboardShell>
  );
}

