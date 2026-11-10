import React, { useState, useEffect } from "react";
import { Brand } from "../components/common/Brand.jsx";
import { Icon } from "../components/common/Icon.jsx";
import { Footer } from "../components/layout/Footer.jsx";
import { getReports, getIncidents, LS } from "../data/seedData.js";
import { incidentsAPI } from "../services/api.js";
import { VoiceRecorder } from "../components/voice/VoiceRecorder.jsx";
import { TranslationPanel } from "../components/voice/TranslationPanel.jsx";

export function EmergencyReport({ go }) {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [locMode, setLocMode] = useState(null);
  const [form, setForm] = useState({ type: "Flood", description: "", originalLanguage: "en", location: "", locMode: null, phone: "", photo: null });

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value, ...(k === "description" ? { translations: {} } : {}) }));

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const handleTranscript = (text, language) => setForm((f) => ({
    ...f,
    description: f.description ? `${f.description}\n${text}` : text,
    originalLanguage: language || f.originalLanguage || "en",
    translations: {},
  }));

  const getLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) =>
        setForm((f) => ({
          ...f,
          location: `Lat ${pos.coords.latitude.toFixed(4)}, Lng ${pos.coords.longitude.toFixed(4)} (device GPS)`,
          locMode: "gps",
        })),
      () => setForm((f) => ({ ...f, location: "Location access denied — please enter manually", locMode: "manual" }))
    );
    setLocMode("gps");
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await incidentsAPI.create(form);
      const report = res.incident;
      const existing = getReports();
      LS.set("resqnet-reports", [report, ...existing.filter((r) => r.id !== report.id)]);
      const incs = getIncidents();
      LS.set("resqnet-incidents", [report, ...incs.filter((i) => i.id !== report.id)]);
      setSubmitted(report);
    } catch (err) {
      console.warn("Backend submit error, using local fallback:", err.message);
      const ref = `RQ-${Date.now().toString().slice(-7)}`;
      const report = {
        ...form,
        id: ref,
        reference: ref,
        priority: "Pending review",
        status: "Received",
        createdAt: new Date().toISOString(),
        public: true,
      };
      const existing = getReports();
      LS.set("resqnet-reports", [...existing, report]);
      const incs = getIncidents();
      LS.set("resqnet-incidents", [
        ...incs,
        {
          ...report,
          area: "Pending",
          aiReason: "Awaiting AI analysis",
          confidence: 0,
          missing: [],
          verified: false,
          duplicate: false,
          team: null,
          callStatus: "Pending",
          lat: 28.3,
          lng: 77.3,
        },
      ]);
      setSubmitted(report);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="screen-wrap">
        <div className="screen-header">
          <div className="screen-header-inner">
            <Brand onHome={() => go("home")} />
            <button className="btn btn-ghost btn-sm" onClick={() => go("home")}>
              <Icon name="back" size={14} /> Home
            </button>
          </div>
        </div>
        <div className="report-form-wrap">
          <div className="submission-success">
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "#bbf7d0",
                color: "#15803d",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 20px",
              }}
            >
              <Icon name="checkCircle" size={30} />
            </div>
            <h1 className="font-display" style={{ fontSize: 34, fontWeight: 700, marginBottom: 8 }}>
              Report submitted successfully
            </h1>
            <p style={{ fontSize: 17, color: "var(--ink-muted)", maxWidth: 440, margin: "0 auto 20px" }}>
              Our coordination team has received your report. Keep your reference number to check for updates.
            </p>
            <div className="ref-number">{submitted.reference}</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 12,
                maxWidth: 420,
                margin: "24px auto 0",
                textAlign: "left",
              }}
            >
              {[
                ["Incident type", submitted.type],
                ["Location", submitted.location || "Not provided"],
                ["Status", offline ? "Saved on device — waiting to sync" : "Received by coordination team"],
                [
                  "Next steps",
                  "Authorities will review and prioritize. You may receive a follow-up call if you provided a number.",
                ],
              ].map(([k, v]) => (
                <div key={k} style={{ background: "rgba(255,255,255,.7)", borderRadius: 10, padding: "12px 14px" }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--ink-muted)",
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                      marginBottom: 4,
                    }}
                  >
                    {k}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>
            {offline && (
              <div
                style={{
                  marginTop: 20,
                  padding: "12px 16px",
                  background: "#fef3c7",
                  borderRadius: 10,
                  fontSize: 15,
                  color: "#92400e",
                  display: "flex",
                  gap: 8,
                }}
              >
                <Icon name="cloud" size={16} /> Report saved on this device. Will sync automatically when you reconnect.
              </div>
            )}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={() => go("home")}>
                Return Home
              </button>
              <button className="btn btn-secondary" onClick={() => go("public-map")}>
                View Public Incidents
              </button>
              <button className="btn btn-ghost" onClick={() => go("login")}>
                Track with an Account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-wrap">
      {/* Header */}
      <div className="report-page-header">
        <div className="report-header-inner">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <Brand onHome={() => go("home")} light />
            <button className="btn btn-ghost btn-sm" style={{ color: "rgba(255,255,255,.7)" }} onClick={() => go("home")}>
              <Icon name="back" size={14} /> Back
            </button>
          </div>
          <div className="eyebrow light" style={{ marginBottom: 12 }}>
            <span className="bar" /> No login required
          </div>
          <h1 className="font-display" style={{ fontSize: 38, fontWeight: 700, color: "white", marginBottom: 8 }}>
            Report an Emergency
          </h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,.65)", maxWidth: 480 }}>
            Share what you know. You can add details later. Essential information first — additional questions may follow if needed.
          </p>
        </div>
      </div>

      <div className="report-form-wrap">
        {/* Connectivity banner */}
        <div className={`offline-banner ${!offline ? "online-banner" : ""}`} style={{ marginBottom: 24 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: offline ? "#f59e0b" : "#059669",
              flexShrink: 0,
            }}
          />
          {offline
            ? "You are offline — your report will be saved on this device and synced when you reconnect."
            : "You are online — your report will be sent securely to the coordination team."}
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {/* Step 1: Describe */}
          <div>
            <div className="report-step-header">
              <div className="report-step-num">1</div>
              <div>
                <div className="report-step-title">Describe the incident</div>
                <div className="report-step-sub">Share only what you know. You can add details later.</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div className="field">
                <label className="field-label">Incident type *</label>
                <select className="input" value={form.type} onChange={update("type")} id="incident-type">
                  {["Flood", "Fire", "Landslide", "Building collapse", "Medical emergency", "Other"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Severity (your estimate)</label>
                <select className="input" id="incident-severity" onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
                  <option value="">Not sure</option>
                  <option>People may be trapped</option>
                  <option>Injuries present</option>
                  <option>Evacuation needed</option>
                  <option>Property damage only</option>
                  <option>Monitoring / precautionary</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label className="field-label">What is happening? *</label>
              <textarea
                id="incident-description"
                className="input"
                value={form.description}
                onChange={update("description")}
                required
                placeholder="Describe the emergency: what you see, who is affected, and what immediate help is needed..."
              />
              <VoiceRecorder
                onTranscript={handleTranscript}
                onError={(message) => console.warn(message)}
                disabled={submitting}
              />
              {form.description && (
                <TranslationPanel
                  key={form.description}
                  text={form.description}
                  originalLang={form.originalLanguage || "en"}
                  translations={form.translations || {}}
                  onTranslation={(language, translatedText) => setForm((current) => ({
                    ...current,
                    translations: { ...(current.translations || {}), [language]: translatedText },
                  }))}
                />
              )}
              <div className="field-hint">
                Voice recording uses Gnani Prisma Speech-to-Text. You can review and edit the transcribed text before submitting.
              </div>
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label className="field-label">Photo (optional)</label>
              <div className="photo-drop" onClick={() => document.getElementById("photo-input").click()}>
                <Icon name="upload" size={24} style={{ color: "var(--ink-muted)" }} />
                <p>Click to attach a photo</p>
                <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>JPG, PNG, WEBP · max 10MB</span>
                <input
                  id="photo-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setForm((f) => ({ ...f, photo: e.target.files[0]?.name }))}
                />
              </div>
              {form.photo && (
                <div style={{ fontSize: 13, color: "var(--teal)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="check" size={13} /> {form.photo}
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Location */}
          <div>
            <div className="report-step-header">
              <div className="report-step-num">2</div>
              <div>
                <div className="report-step-title">Provide the location</div>
                <div className="report-step-sub">Even an approximate location helps responders reach the right area.</div>
              </div>
            </div>
            <div className="loc-btn-grid" style={{ marginBottom: 16 }}>
              {[
                { id: "gps", icon: "pin", label: "Use my location", sub: "Auto-detect via GPS", action: getLocation },
                {
                  id: "map",
                  icon: "map",
                  label: "Select on map",
                  sub: "Choose approximate area",
                  action: () => {
                    setLocMode("map");
                    setForm((f) => ({ ...f, location: "Location selected on map (approximate)", locMode: "map" }));
                  },
                },
                { id: "manual", icon: "search", label: "Enter manually", sub: "Type address or landmark", action: () => setLocMode("manual") },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`loc-btn${locMode === m.id ? " selected" : ""}`}
                  onClick={m.action}
                  id={`loc-${m.id}-btn`}
                >
                  <Icon name={m.icon} size={22} style={{ color: "var(--teal)" }} />
                  <span>{m.label}</span>
                  <small>{m.sub}</small>
                </button>
              ))}
            </div>
            <div className="field">
              <label className="field-label">Location details *</label>
              <input
                id="location-input"
                required
                className="input"
                value={form.location}
                onChange={update("location")}
                placeholder="Address, landmark, village name, or general area..."
              />
              <div className="field-hint">
                You can submit even if automatic location access fails. Your approximate description is helpful.
              </div>
            </div>
          </div>

          {/* Step 3: Contact */}
          <div>
            <div className="report-step-header">
              <div className="report-step-num">3</div>
              <div>
                <div className="report-step-title">Contact information (optional)</div>
                <div className="report-step-sub">Only used if responders need to follow up with clarifying questions.</div>
              </div>
            </div>
            <div className="field">
              <label className="field-label">Phone number (optional)</label>
              <input
                id="phone-input"
                className="input"
                value={form.phone}
                onChange={update("phone")}
                placeholder="+91 98765 43210"
              />
              <div className="field-hint">
                Your number will not be shared publicly. It is used only if the coordination team needs to clarify details to help respond effectively.
              </div>
            </div>
          </div>

          {/* Submit */}
          <div
            style={{
              borderTop: "1px solid var(--ink-subtle)",
              paddingTop: 24,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <p style={{ fontSize: 13, color: "var(--ink-muted)", maxWidth: 360, lineHeight: 1.6 }}>
              You can submit without an account. Public maps show approximate locations only. Exact coordinates are restricted to authorized personnel.
            </p>
            <button
              id="submit-report-btn"
              className="btn btn-emergency"
              type="submit"
              style={{ fontSize: 17, padding: "13px 28px" }}
              disabled={submitting}
            >
              <Icon name="alert" size={16} /> {submitting ? "Submitting to MongoDB..." : "Submit Emergency Report"}
            </button>
          </div>
        </form>
      </div>
      <Footer go={go} />
    </div>
  );
}

export default EmergencyReport;

