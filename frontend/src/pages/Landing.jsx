import React from "react";
import { Icon } from "../components/common/Icon.jsx";
import { Footer } from "../components/layout/Footer.jsx";

export function Landing({ go }) {
  const heroIncidents = [
    { type: "Building Collapse", location: "Lal Bahadur Nagar", priority: "critical" },
    { type: "Flash Flood", location: "River Belt Colony", priority: "critical" },
    { type: "Landslide", location: "Hill Road", priority: "high" },
  ];

  return (
    <div id="home">
      {/* Hero */}
      <section className="hero-section" aria-labelledby="hero-heading">
        <div className="hero-bg-img" aria-hidden="true" />
        <div className="hero-bg-scrim" aria-hidden="true" />
        <div className="hero-bg-pattern" />
        <div className="hero-glow" />
        <div className="hero-glow-2" />
        <div className="hero-inner">
          <div>
            <div className="hero-tag">
              <span className="hero-tag-dot pulse" />
              <span>Live disaster coordination platform</span>
            </div>
            <h1 id="hero-heading" className="hero-h1">
              Every second matters.<br />
              Every report <em>counts.</em>
            </h1>
            <p className="hero-desc">
              An AI-assisted disaster response platform that helps identify critical emergencies, prioritize incidents, and coordinate faster, fairer responses.
            </p>
            <div className="hero-actions">
              <button className="btn btn-emergency" onClick={() => go("report")} id="hero-report-btn">
                <Icon name="alert" size={15} />
                Report an Emergency
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => document.getElementById("how-it-works-section")?.scrollIntoView({ behavior: "smooth" })}
                id="hero-explore-btn"
              >
                Explore How It Works
                <Icon name="arrow" size={14} />
              </button>
            </div>
            <div className="hero-note">
              <Icon name="lock" size={14} />
              No account required to report an emergency
            </div>
          </div>

          {/* Animated map card */}
          <div className="hero-map-card" aria-label="Live incident preview">
            <div className="hero-map-header">
              <span className="hero-map-title">Live Incident Overview</span>
              <span className="live-badge">
                <span className="live-badge-dot pulse" /> Live
              </span>
            </div>
            <div className="hero-map-viz">
              <div className="hero-map-photo" aria-hidden="true" />
              <div className="hero-map-scrim" aria-hidden="true" />
              <div className="hmap-grid" />
              {[
                { x: "22%", y: "38%", p: "critical" },
                { x: "55%", y: "22%", p: "high" },
                { x: "72%", y: "60%", p: "critical" },
                { x: "38%", y: "68%", p: "high" },
                { x: "85%", y: "30%", p: "low" },
              ].map((m, i) => (
                <div
                  key={i}
                  className={`hmap-marker ${m.p}`}
                  style={{ left: m.x, top: m.y, position: "absolute", transform: "translate(-50%,-50%)" }}
                />
              ))}
              <div style={{ position: "absolute", bottom: 10, left: 10, right: 10, display: "flex", gap: 6 }}>
                {["critical", "high", "low"].map((p) => (
                  <div key={p} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "rgba(255,255,255,.7)" }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: { critical: "#ef4444", high: "#f59e0b", low: "#10b981" }[p],
                      }}
                    />
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </div>
                ))}
              </div>
            </div>
            <div className="hero-incident-cards">
              {heroIncidents.map((inc) => (
                <div key={inc.type} className="hero-inc-card">
                  <div
                    className="dot"
                    style={{
                      background: { critical: "#ef4444", high: "#f59e0b", medium: "#3b82f6" }[inc.priority],
                      boxShadow: `0 0 0 3px ${{
                        critical: "rgba(239,68,68,.2)",
                        high: "rgba(245,158,11,.2)",
                        medium: "rgba(59,130,246,.2)",
                      }[inc.priority]}`,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div className="inc-type">{inc.type}</div>
                    <div className="inc-location">{inc.location}</div>
                  </div>
                  <span className={`inc-pill ${inc.priority}`}>{inc.priority === "critical" ? "CRITICAL" : "HIGH"}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, textAlign: "center" }}>
              <button
                className="btn btn-sm"
                style={{
                  background: "rgba(255,255,255,.12)",
                  color: "rgba(255,255,255,.8)",
                  width: "100%",
                  justifyContent: "center",
                  fontSize: 13,
                }}
                onClick={() => go("public-map")}
              >
                View full public incident map →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works-section" className="steps-section">
        <div className="steps-inner">
          <div className="section-heading" style={{ textAlign: "center" }}>
            <div className="eyebrow" style={{ justifyContent: "center" }}>
              <span className="bar" /> How It Works
            </div>
            <h2 className="section-h2" style={{ textAlign: "center" }}>
              From Report to Response<br />
              in Four Steps
            </h2>
            <p className="section-desc" style={{ margin: "12px auto 0", textAlign: "center" }}>
              ResQNet turns fragmented emergency information into a transparent, prioritized queue that helps responders act on what matters most.
            </p>
          </div>
          <div className="steps-grid">
            {[
              { n: "📡", cls: "", title: "Report", desc: "Anyone can submit a report — via text, voice, or photo — without creating an account. Works offline too." },
              { n: "🔍", cls: "step2", title: "Analyze", desc: "AI extracts key details, checks for duplicates, and identifies missing information that could affect urgency." },
              { n: "📊", cls: "step3", title: "Prioritize", desc: "A transparent scoring system ranks incidents by urgency with clear reasoning. Authorities can review and override." },
              { n: "🚁", cls: "step4", title: "Respond", desc: "Teams are assigned, routes coordinated, and status tracked in real-time. The public sees updates without sensitive details." },
            ].map((s) => (
              <div key={s.title} className="step-card">
                <div className={`step-num ${s.cls}`} style={{ fontSize: 30 }}>
                  {s.n}
                </div>
                <h3 className="step-title">{s.title}</h3>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="features-section">
        <div className="features-inner">
          <div className="section-heading">
            <div className="eyebrow">
              <span className="bar" /> Core Features
            </div>
            <h2 className="section-h2">
              Built for the moment.<br />
              Designed for impact.
            </h2>
            <p className="section-desc">
              ResQNet combines AI assistance with human oversight to ensure every genuine emergency gets the attention it deserves.
            </p>
          </div>
          <div className="features-grid">
            {[
              { icon: "zap", color: "#fef3c7", ico: "#d97706", title: "AI Urgency Ranking", desc: "Threat-to-life signals are surfaced automatically with clear explanations. Authorities can review, adjust, and override any recommendation." },
              { icon: "search", color: "#dbeafe", ico: "#2563eb", title: "Duplicate Detection", desc: "Similar reports are grouped and flagged. A single credible report of trapped persons ranks higher than many reports of a minor obstruction." },
              { icon: "mic", color: "#f3e8ff", ico: "#7c3aed", title: "Voice Reporting", desc: "Use the microphone button to describe an emergency verbally. Speech-to-text converts it to a report you can review before submitting." },
              { icon: "cloud", color: "#d1fae5", ico: "#059669", title: "Offline Reporting", desc: "If connectivity fails, reports are saved locally and queued for automatic sync when the connection returns." },
              { icon: "phone", color: "#fee2e2", ico: "#dc2626", title: "AI Follow-Up Calls", desc: "For incomplete reports, the system can initiate follow-up calls to reporters to gather critical missing details." },
              { icon: "weather", color: "#e0f2fe", ico: "#0369a1", title: "Weather Awareness", desc: "Real-time rainfall, flood risk, and severe weather alerts give responders crucial environmental context." },
              { icon: "pin", color: "#fdf4ff", ico: "#7e22ce", title: "Privacy-First Locations", desc: "Public maps show approximate areas only. Precise coordinates are restricted to authorized personnel with appropriate permissions." },
              { icon: "shield", color: "#f0fdf4", ico: "#15803d", title: "Role-Based Access", desc: "Different roles — NGO coordinator, control room operator, volunteer — see only what they need to act effectively." },
            ].map((f) => (
              <div key={f.title} className="feat-card">
                <div className="feat-icon" style={{ background: f.color, color: f.ico }}>
                  <Icon name={f.icon} size={22} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="privacy-section">
        <div className="privacy-inner">
          <div>
            <div className="eyebrow">
              <span className="bar" /> Privacy & Accessibility
            </div>
            <h2 className="section-h2">
              Designed for everyone.<br />
              Protected by default.
            </h2>
            <div className="privacy-list">
              {[
                "Anyone can report an emergency without creating an account or providing personal information.",
                "Public incident maps show only approximate locations — precise coordinates are never exposed.",
                "Reporter contact information is restricted to authorized personnel with a legitimate need.",
                "Offline reporting works without an internet connection; data syncs automatically when connectivity returns.",
                "Anonymous reporters can check their report status using a secure reference number — no account required.",
              ].map((item) => (
                <div key={item} className="privacy-item">
                  <div className="privacy-check">
                    <Icon name="check" size={12} />
                  </div>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div
              style={{
                background: "white",
                borderRadius: 20,
                padding: 28,
                border: "1px solid var(--ink-subtle)",
                boxShadow: "var(--shadow-md)",
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  marginBottom: 20,
                  color: "var(--ink-muted)",
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                }}
              >
                Report Without Registration
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { icon: "📝", label: "Describe the emergency", sub: "Text, voice, or photo" },
                  { icon: "📍", label: "Share your location", sub: "Auto-detect or enter manually" },
                  { icon: "📱", label: "Optional contact", sub: "For follow-up calls only" },
                  { icon: "✅", label: "Submit instantly", sub: "Reference number provided" },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "12px 14px",
                      background: "#f8f9fa",
                      borderRadius: 10,
                    }}
                  >
                    <span style={{ fontSize: 26 }}>{s.icon}</span>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{s.label}</div>
                      <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 2 }}>{s.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="btn btn-emergency"
                style={{ width: "100%", justifyContent: "center", marginTop: 20 }}
                onClick={() => go("report")}
              >
                <Icon name="alert" size={15} /> Report an Emergency Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Why ResQNet */}
      <section className="why-section">
        <div className="why-inner">
          <div className="section-heading" style={{ textAlign: "center" }}>
            <div className="eyebrow" style={{ justifyContent: "center" }}>
              <span className="bar" /> Why ResQNet
            </div>
            <h2 className="section-h2" style={{ textAlign: "center" }}>
              Built for people.<br />
              Designed for impact.
            </h2>
          </div>
          <div className="why-grid">
            {[
              { icon: "zap", title: "Transparent AI", desc: "Every priority recommendation includes a clear explanation. Authorities can see why an incident was ranked critical — and override it if they disagree." },
              { icon: "users", title: "Human in the Loop", desc: "AI assists but never decides alone. Every prioritization goes through human review. Authorities control what gets verified and who responds." },
              { icon: "pin", title: "Focus on the Unheard", desc: "Designed to surface incidents from low-connectivity areas and communities less likely to be reached by traditional emergency channels." },
              { icon: "wifi", title: "Works Offline", desc: "Emergency reporting doesn't require a stable connection. Reports saved locally sync automatically when connectivity returns." },
              { icon: "shield", title: "Privacy Protected", desc: "Public information is carefully controlled. Sensitive details are only available to authorized personnel with appropriate permissions." },
              { icon: "phone", title: "Active Follow-Up", desc: "When reports are incomplete, the system can initiate automated or manual follow-up calls to gather the information responders need." },
            ].map((w) => (
              <div key={w.title} className="why-item">
                <div className="why-icon">
                  <Icon name={w.icon} size={20} />
                </div>
                <h3>{w.title}</h3>
                <p>{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-inner">
          <div>
            <div className="eyebrow light" style={{ marginBottom: 12 }}>
              <span className="bar" /> Need help now?
            </div>
            <h2 className="cta-h2">
              Your report can help<br />
              someone get home safe.
            </h2>
            <p className="cta-desc">Every report is reviewed. Every incident matters. No account required.</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button
              className="btn"
              style={{ background: "white", color: "var(--ink)", fontWeight: 700 }}
              onClick={() => go("report")}
            >
              <Icon name="alert" size={15} /> Report an Emergency
            </button>
            <button
              className="btn"
              style={{ border: "1.5px solid rgba(255,255,255,.4)", color: "rgba(255,255,255,.85)" }}
              onClick={() => go("authority-login")}
            >
              Authority Portal <Icon name="arrow" size={14} />
            </button>
          </div>
        </div>
      </section>

      <Footer go={go} />
    </div>
  );
}

export default Landing;

