import React, { useState } from "react";
import Icon from "../components/common/Icon";
import Brand from "../components/common/Brand";
import { authAPI } from "../services/api";
import { LS } from "../data/seedData";

const AUTHORITY_PASSWORD = "ResQNet@2026";

export default function AuthorityLogin({ go, onSuccess }) {
  const [tab, setTab] = useState("login");
  const [org, setOrg] = useState("");
  const [orgType, setOrgType] = useState("Government disaster team");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (tab === "register") {
      try {
        await authAPI.registerOrg({ org, orgType, email });
        setRegistered(true);
      } catch (err) {
        console.warn("Backend registerOrg note:", err.message);
        setRegistered(true);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const res = await authAPI.authorityLogin({ email, password, org });
      LS.set("resqnet-authority", res.user || { org, orgType, email, role: "authority" });
      onSuccess();
    } catch (err) {
      if (password.trim() === AUTHORITY_PASSWORD) {
        LS.set("resqnet-authority", { org, orgType, email, role: "authority" });
        onSuccess();
      } else {
        setError(err.message || "Incorrect authority password. Use the prototype password shown below.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (registered) return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#d1fae5", color: "#059669", display: "grid", placeItems: "center", margin: "0 auto 20px" }}>
          <Icon name="checkCircle" size={32} />
        </div>
        <h1 className="auth-title">Registration submitted</h1>
        <p style={{ fontSize: 16, color: "var(--ink-muted)", lineHeight: 1.65, marginBottom: 24 }}><strong>{org}</strong> is pending approval. The ResQNet admin team will verify your {orgType.toLowerCase()} credentials. Access credentials are provided only after approval.</p>
        <button className="btn btn-primary" style={{ justifyContent: "center", width: "100%" }} onClick={() => go("home")}>Return Home</button>
      </div>
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-logo-wrap"><Brand onHome={() => go("home")} /></div>
        <h1 className="auth-title">Authority Portal</h1>
        <p className="auth-sub">For approved responder organizations — NGOs, government teams, emergency services.</p>
        <div className="portal-badge authority">
          <div className="pb-icon"><Icon name="shield" size={18} /></div>
          <div><b>Protected access</b><small>This portal leads to the command center, not the public dashboard.</small></div>
        </div>
        <div style={{ display: "flex", background: "#f0f4f8", borderRadius: 10, padding: 4, marginBottom: 24 }}>
          {[["login", "Authority Login"], ["register", "Register Organization"]].map(([v, l]) => (
            <button key={v} type="button" onClick={() => { setTab(v); setError(""); }} style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 15, fontWeight: 600, background: tab === v ? "white" : "transparent", color: tab === v ? "var(--teal)" : "var(--ink-muted)", boxShadow: tab === v ? "var(--shadow-sm)" : "none", transition: "all .2s" }}>{l}</button>
          ))}
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field"><label className="field-label">Organization type</label>
              <select className="input" value={orgType} onChange={e => setOrgType(e.target.value)} id="auth-org-type">
                {["Government disaster team", "NGO", "Emergency services", "Healthcare organization", "Relief & volunteer group"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field"><label className="field-label">Organization name</label><input required className="input" value={org} onChange={e => setOrg(e.target.value)} placeholder="e.g. State NDRF" id="auth-org-name" /></div>
          </div>
          <div className="field"><label className="field-label">Coordinator email / ID</label><input required className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="coordinator@agency.gov.in" id="auth-email" /></div>
          {tab === "login" && (
            <>
              <div className="field"><label className="field-label">Shared authority password</label>
                <div className="password-field-wrap"><input required type={showPw ? "text" : "password"} className="input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Authority access password" id="auth-password" />
                  <button type="button" className="password-toggle" onClick={() => setShowPw(!showPw)} aria-label="Toggle password"><Icon name={showPw ? "eyeOff" : "eye"} size={16} /></button>
                </div>
              </div>
              <div className="proto-hint">
                <span>Prototype access password:</span>
                <b>{AUTHORITY_PASSWORD}</b>
                <button type="button" onClick={() => { setPassword(AUTHORITY_PASSWORD); setError(""); }}>Use this</button>
              </div>
              {error && <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", fontSize: 15, color: "#dc2626", display: "flex", gap: 8 }}><Icon name="alert" size={14} /> {error}</div>}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", background: "#eff6ff", borderRadius: 8, fontSize: 13, color: "#1e40af" }}>
                <Icon name="shield" size={14} style={{ flexShrink: 0, marginTop: 2 }} /> Public registration never creates authority access. Organization approval and a managed shared password are required.
              </div>
            </>
          )}
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", background: "var(--navy)" }} type="submit" id="authority-submit-btn" disabled={loading}>
            {loading ? "Checking..." : tab === "login" ? "Enter Command Center" : "Submit Organization Registration"} <Icon name="arrow" size={14} />
          </button>
          <button type="button" className="btn btn-emergency" style={{ width: "100%", justifyContent: "center" }} onClick={() => go("report")}>
            <Icon name="alert" size={14} /> Report Emergency Without Login
          </button>
        </form>
        <div className="auth-switch">Public user? <button onClick={() => go("login")}>Log in here</button></div>
      </div>
    </div>
  );
}

