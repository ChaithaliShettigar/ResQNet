import React from "react";
import { Brand } from "../common/Brand.jsx";

export function PubNav({ go, currentView }) {
  return (
    <nav className="pub-nav" role="navigation" aria-label="Main navigation">
      <div className="pub-nav-inner">
        <Brand onHome={() => go("home")} />
        <div className="pub-nav-links">
          {[
            ["home", "Home"],
            ["how-it-works", "How It Works"],
            ["features", "Features"],
            ["public-map", "Public Incident Map"],
          ].map(([v, l]) => (
            <button key={v} className={currentView === v ? "active" : ""} onClick={() => go(v)}>
              {l}
            </button>
          ))}
        </div>
        <div className="pub-nav-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => go("login")}>
            Log in
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => go("register")}>
            Create Account
          </button>
          <button className="btn btn-emergency btn-sm" onClick={() => go("report")}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#fff",
                opacity: 0.85,
                display: "inline-block",
              }}
            />
            Report Emergency
          </button>
        </div>
      </div>
    </nav>
  );
}

export default PubNav;

