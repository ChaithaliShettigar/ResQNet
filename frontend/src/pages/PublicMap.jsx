import React, { useState, useEffect } from "react";
import { Brand } from "../components/common/Brand.jsx";
import { Icon } from "../components/common/Icon.jsx";
import { PriorityPill } from "../components/common/PriorityPill.jsx";
import { StatusPill } from "../components/common/StatusPill.jsx";
import { IncidentMapVis } from "../components/map/IncidentMapVis.jsx";
import { Footer } from "../components/layout/Footer.jsx";
import { getIncidents } from "../data/seedData.js";
import { timeAgo } from "../data/constants.js";
import { incidentsAPI } from "../services/api.js";
import { TranslationPanel } from "../components/voice/TranslationPanel.jsx";

export function PublicMap({ go }) {
  const [incidents, setIncidents] = useState(() => getIncidents().filter((i) => i.public));
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    incidentsAPI
      .getAll({ publicOnly: true })
      .then((res) => {
        if (res.incidents && res.incidents.length > 0) {
          setIncidents(res.incidents);
        }
      })
      .catch(() => {});
  }, []);

  const filtered = incidents.filter((i) => {
    const pMatch = filter === "all" || i.priority === filter;
    const tMatch = typeFilter === "all" || i.type === typeFilter;
    return pMatch && tMatch;
  });

  const types = [...new Set(incidents.map((i) => i.type))];
  const counts = {
    total: incidents.length,
    critical: incidents.filter((i) => i.priority === "critical").length,
    areas: [...new Set(incidents.map((i) => i.area))].length,
    recent: incidents.filter((i) => new Date(i.reportedAt) > new Date(Date.now() - 60 * 60000)).length,
  };

  return (
    <div className="screen-wrap">
      <div className="screen-header">
        <div className="screen-header-inner">
          <Brand onHome={() => go("home")} />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: "var(--ink-muted)" }}>Public view — approximate locations only</span>
            <button className="btn btn-sm btn-ghost" onClick={() => go("home")}>
              <Icon name="back" size={14} /> Home
            </button>
            <button className="btn btn-emergency btn-sm" onClick={() => go("report")}>
              Report Emergency
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "24px clamp(16px, 3vw, 48px)" }}>
        {/* Summary cards */}
        <div style={{ marginBottom: 24 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            <span className="bar" /> Public Incident Dashboard
          </div>
          <h1 className="font-display" style={{ fontSize: 34, fontWeight: 700, marginBottom: 20 }}>
            Active Incidents in Your Region
          </h1>
          <div className="stats-grid">
            <div className="stat-card neutral">
              <div className="stat-label">Reported Incidents</div>
              <div className="stat-value">{counts.total}</div>
              <div className="stat-sub">All time today</div>
            </div>
            <div className="stat-card critical">
              <div className="stat-label">Critical Incidents</div>
              <div className="stat-value v-critical">{counts.critical}</div>
              <div className="stat-sub">Immediate attention</div>
            </div>
            <div className="stat-card medium">
              <div className="stat-label">Areas Affected</div>
              <div className="stat-value v-medium">{counts.areas}</div>
              <div className="stat-sub">Distinct locations</div>
            </div>
            <div className="stat-card ok">
              <div className="stat-label">Recently Updated</div>
              <div className="stat-value" style={{ color: "#059669" }}>
                {counts.recent}
              </div>
              <div className="stat-sub">Last 60 minutes</div>
            </div>
          </div>
        </div>

        <div className="pub-map-layout" style={{ height: "auto", display: "grid", gridTemplateColumns: "380px 1fr", gap: 20 }}>
          {/* Sidebar */}
          <div style={{ background: "white", border: "1px solid var(--ink-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--ink-subtle)" }}>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>Recent Incidents</div>
              {/* Filters */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {[
                  ["all", "All"],
                  ["critical", "Critical"],
                  ["high", "High"],
                  ["medium", "Medium"],
                  ["low", "Low"],
                ].map(([v, l]) => (
                  <button
                    key={v}
                    className={`aq-filter-btn btn-xs ${filter === v ? "active" : ""} ${v}`}
                    onClick={() => setFilter(v)}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <select className="input input-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">All Types</option>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ maxHeight: 500, overflowY: "auto" }}>
              {filtered.map((inc) => {
                return (
                  <div
                    key={inc.id}
                    className="pub-inc-card"
                    style={{ background: selected?.id === inc.id ? "#f0fdf4" : "white" }}
                    onClick={() => setSelected(inc)}
                  >
                    <div className="pic-type" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div className={`dot dot-${inc.priority}`} />
                      {inc.type}
                    </div>
                    <div className="pic-location">
                      <Icon name="pin" size={11} style={{ display: "inline" }} /> {inc.area}
                    </div>
                    <div className="pic-meta">
                      <PriorityPill priority={inc.priority} size="sm" />
                      <StatusPill status={inc.verified ? "Verified" : "Needs verification"} />
                      <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                        {(() => {
                          const mins = Math.floor((Date.now() - new Date(inc.reportedAt)) / 60000);
                          return mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;
                        })()}
                      </span>
                    </div>
                    {selected?.id === inc.id && (
                      <div
                        style={{
                          marginTop: 10,
                          padding: "10px 12px",
                          background: "#f0fdf4",
                          borderRadius: 8,
                          fontSize: 13,
                          color: "rgba(17,45,56,.75)",
                          lineHeight: 1.55,
                        }}
                      >
                        <div style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 5 }}>Original report · {inc.originalLanguage || "English"}</div>
                        <p>{inc.description}</p>
                        <div onClick={(e) => e.stopPropagation()}>
                          <TranslationPanel text={inc.description} originalLang={inc.originalLanguage || "en"} incidentId={inc.id} translations={inc.translations || {}} compact />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="empty-state" style={{ padding: 32 }}>
                  <div className="empty-state-icon">🗺️</div>
                  <h3>No incidents match</h3>
                  <p>Try adjusting your filters</p>
                </div>
              )}
            </div>
          </div>
          {/* Map */}
          <div style={{ background: "white", border: "1px solid var(--ink-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ink-subtle)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Incident Map</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--teal)", fontWeight: 600 }}>
                <Icon name="lock" size={12} /> Privacy-protected · Approximate locations only
              </span>
            </div>
            <IncidentMapVis incidents={filtered} authority={false} height="520px" onMarkerClick={setSelected} />
          </div>
        </div>
      </div>
      <Footer go={go} />
    </div>
  );
}

export default PublicMap;

