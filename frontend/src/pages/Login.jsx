import React, { useState } from "react";
import { Brand } from "../components/common/Brand.jsx";
import { Icon } from "../components/common/Icon.jsx";
import { LS } from "../data/seedData.js";
import { authAPI } from "../services/api.js";

export function Login({ go, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      const userObj = res.user || { name: email.split("@")[0], email };
      LS.set("resqnet-user", userObj);
      onSuccess(userObj.name || "Member");
    } catch (err) {
      console.warn("Backend login error, trying saved session:", err.message);
      const saved = LS.get("resqnet-user", {});
      if (saved.email && saved.email === email.toLowerCase()) {
        onSuccess(saved.name || email.split("@")[0] || "ResQNet member");
      } else {
        setError(err.message || "Invalid email or password.");
      }
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
        <h1 className="auth-title">Public user login</h1>
        <p className="auth-sub">Track your reports and receive status updates.</p>
        <div className="portal-badge public">
          <div className="pb-icon">
            <Icon name="users" size={18} />
          </div>
          <div>
            <b>For community members</b>
            <small>Track reports, receive updates, manage your profile.</small>
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
          <div className="field">
            <label className="field-label">Email or phone</label>
            <input
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              id="login-email"
            />
          </div>
          <div className="field">
            <label className="field-label">Password</label>
            <div className="password-field-wrap">
              <input
                required
                type={showPw ? "text" : "password"}
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                id="login-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPw(!showPw)}
                aria-label={showPw ? "Hide" : "Show"}
              >
                <Icon name={showPw ? "eyeOff" : "eye"} size={16} />
              </button>
            </div>
            <div style={{ textAlign: "right", marginTop: 6 }}>
              <button
                type="button"
                style={{ fontSize: 13, color: "var(--teal)", fontWeight: 600, textDecoration: "underline" }}
              >
                Forgot password?
              </button>
            </div>
          </div>
          <button
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
            type="submit"
            id="login-btn"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log in"} <Icon name="arrow" size={14} />
          </button>
        </form>
        <div className="auth-switch">
          New to ResQNet? <button onClick={() => go("register")}>Create an account</button>
        </div>
        <div className="auth-divider">
          <span />
          <p>Other options</p>
          <span />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            className="btn btn-emergency"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => go("report")}
            id="emergency-no-login-btn"
          >
            <Icon name="alert" size={14} /> Report Emergency Without Logging In
          </button>
          <button
            className="btn btn-secondary"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => go("authority-login")}
          >
            <Icon name="shield" size={14} /> Go to Authority Portal
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;

