import React from "react";
import { Brand } from "../common/Brand.jsx";

export function Footer({ go }) {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-col">
            <Brand onHome={() => go("home")} light />
            <p style={{ fontSize: 16, color: "rgba(255,255,255,.5)", marginTop: 16, lineHeight: 1.65 }}>
              AI-assisted disaster response platform helping identify critical emergencies, prioritize incidents, and coordinate faster responses.
            </p>
          </div>
          <div className="footer-col">
            <h4>Platform</h4>
            {[
              ["home", "Home"],
              ["how-it-works", "How It Works"],
              ["public-map", "Public Incident Map"],
              ["report", "Report Emergency"],
            ].map(([v, l]) => (
              <button key={v} onClick={() => go(v)}>
                {l}
              </button>
            ))}
          </div>
          <div className="footer-col">
            <h4>Access</h4>
            {[
              ["login", "Public Login"],
              ["register", "Create Account"],
              ["authority-login", "Authority Portal"],
              ["admin", "Admin Panel"],
            ].map(([v, l]) => (
              <button key={v} onClick={() => go(v)}>
                {l}
              </button>
            ))}
          </div>
          <div className="footer-col">
            <h4>Features</h4>
            <a href="#">AI Urgency Ranking</a>
            <a href="#">Voice Reporting</a>
            <a href="#">Offline Mode</a>
            <a href="#">Privacy Protection</a>
            <a href="#">Weather Awareness</a>
          </div>
        </div>
        <div className="footer-bottom">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>© 2026 ResQNet. Coordinating care when it matters most.</span>
            <span style={{ opacity: 0.7 }}>
              Hero photography: NDRF flood rescue, Bihar (PIB / Govt. of India) and U.S. Navy aerial survey — via Wikimedia Commons
            </span>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            <a href="#" style={{ fontSize: 13, color: "rgba(255,255,255,.4)", textDecoration: "none" }}>
              Privacy Policy
            </a>
            <a href="#" style={{ fontSize: 13, color: "rgba(255,255,255,.4)", textDecoration: "none" }}>
              Accessibility
            </a>
            <a href="#" style={{ fontSize: 13, color: "rgba(255,255,255,.4)", textDecoration: "none" }}>
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

