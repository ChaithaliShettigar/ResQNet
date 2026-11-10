import React from "react";

export function Brand({ onHome, light = false }) {
  return (
    <button className="brand-logo" onClick={onHome} aria-label="ResQNet home">
      <div className="brand-crest">RQ</div>
      <div className="brand-text">
        <span className={`brand-name${light ? " light" : ""}`}>ResQNet</span>
        <span className={`brand-sub${light ? " light" : ""}`}>Disaster Response & Coordination</span>
      </div>
    </button>
  );
}

export default Brand;

