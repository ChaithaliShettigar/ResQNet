import React, { useState } from "react";
import { Brand } from "../components/common/Brand.jsx";
import { Icon } from "../components/common/Icon.jsx";
import { LS } from "../data/seedData.js";
import { authAPI } from "../services/api.js";

export function Register({ go, onSuccess }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "", location: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const [showPw, setShowPw] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await authAPI.register(form);
      const userObj = res.user || { name: form.name, email: form.email, phone: form.phone, location: form.location, role: "public" };
      LS.set("resqnet-user", userObj);
      onSuccess(userObj.name || form.name);
    } catch (err) {
      console.warn("Backend register error, fallback to local:", err.message);
      if (err.status === 409) {
        setError(err.message || "An account with this email already exists.");
        setLoading(false);
        return;
      }
      LS.set("resqnet-user", { name: form.name, email: form.email, phone: form.phone, location: form.location, role: "public" });
      onSuccess(form.name);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo-wrap">
          <Brand onHome={() => go("home")} />
        </div>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-sub">Track reports, receive updates, and stay connected to your community.</p>
        <div className="portal-badge public">
          <div className="pb-icon">
            <Icon name="users" size={18} />
          </div>
          <div>
            <b>Public user account</b>
            <small>For residents and community members. Does not grant authority access.</small>
          </div>
        </div>
        {error && (
          <div
            style={{
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 14,
              color: "#dc2626",
              display: "flex",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <Icon name="alert" size={14} /> {error}
          </div>
        )}
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label className="field-label">Full name *</label>
              <input required className="input" value={form.name} onChange={update("name")} placeholder="Your full name" id="reg-name" />
            </div>
            <div className="field">
              <label className="field-label">Email *</label>
              <input required type="email" className="input" value={form.email} onChange={update("email")} placeholder="you@example.com" id="reg-email" />
            </div>
            <div className="field">
              <label className="field-label">Phone</label>
              <input className="input" value={form.phone} onChange={update("phone")} placeholder="+91 98765 43210" id="reg-phone" />
            </div>
            <div className="field">
              <label className="field-label">City / locality</label>
              <input className="input" value={form.location} onChange={update("location")} placeholder="Where are you based?" id="reg-location" />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Password *</label>
            <div className="password-field-wrap">
              <input
                required
                minLength={6}
                type={showPw ? "text" : "password"}
                className="input"
                value={form.password}
                onChange={update("password")}
                placeholder="At least 6 characters"
                id="reg-password"
              />
              <button type="button" className="password-toggle" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Hide" : "Show"}>
                <Icon name={showPw ? "eyeOff" : "eye"} size={16} />
              </button>
            </div>
          </div>
          <div className="field">
            <label className="field-label">Confirm password *</label>
            <input required type="password" className="input" value={form.confirm} onChange={update("confirm")} placeholder="Repeat your password" id="reg-confirm" />
          </div>
          <button
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
            type="submit"
            id="create-account-btn"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account"} <Icon name="arrow" size={14} />
          </button>
        </form>
        <div className="auth-switch">
          Already registered? <button onClick={() => go("login")}>Log in</button>
        </div>
        <div className="auth-divider">
          <span />
          <p>Emergency access</p>
          <span />
        </div>
        <button
          className="btn btn-emergency"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={() => go("report")}
        >
          <Icon name="alert" size={14} /> Report Emergency Without Account
        </button>
      </div>
    </div>
  );
}

export default Register;

