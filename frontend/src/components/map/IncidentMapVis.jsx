import React, { useState, useRef } from "react";
import { Icon } from "../common/Icon.jsx";
import { PriorityPill } from "../common/PriorityPill.jsx";

export function IncidentMapVis({ incidents, authority = false, height = "320px", onMarkerClick }) {
  const [tooltip, setTooltip] = useState(null);
  const mapRef = useRef(null);

  // Lay out markers in a visually spread way
  const positions = [
    { x: "18%", y: "28%" },
    { x: "35%", y: "55%" },
    { x: "52%", y: "20%" },
    { x: "67%", y: "45%" },
    { x: "79%", y: "68%" },
    { x: "88%", y: "32%" },
    { x: "28%", y: "72%" },
    { x: "60%", y: "75%" },
  ];

  return (
    <div className="pub-map-viz" style={{ height }} ref={mapRef}>
      <div className="pub-map-overlay" />
      {/* Roads */}
      <div className="pub-map-road-h" style={{ top: "40%", left: "5%", right: "5%" }} />
      <div className="pub-map-road-h" style={{ top: "65%", left: "20%", right: "15%" }} />
      <div className="pub-map-road-v" style={{ left: "30%", top: "5%", bottom: "5%" }} />
      <div className="pub-map-road-v" style={{ left: "60%", top: "30%", bottom: "10%" }} />
      {/* River */}
      <div
        className="pub-map-river"
        style={{
          left: "42%",
          top: "-10%",
          width: "18px",
          height: "120%",
          transform: "rotate(15deg)",
          background: "rgba(91,170,188,.35)",
        }}
      />
      {/* Markers */}
      {incidents.slice(0, 8).map((inc, i) => {
        const pos = positions[i] || { x: `${30 + i * 8}%`, y: `${40 + i * 6}%` };
        return (
          <div
            key={inc.id}
            className="pub-map-marker"
            style={{ left: pos.x, top: pos.y }}
            onMouseEnter={(e) => setTooltip({ inc, x: e.clientX, y: e.clientY })}
            onMouseLeave={() => setTooltip(null)}
            onClick={() => onMarkerClick && onMarkerClick(inc)}
          >
            <div className={`pub-map-marker-dot ${inc.priority}`} />
          </div>
        );
      })}
      {/* Legend */}
      <div className="pub-map-legend">
        <h4>Incident Priority</h4>
        {[
          ["critical", "Critical"],
          ["high", "High"],
          ["medium", "Medium"],
          ["low", "Low / Resolved"],
        ].map(([p, l]) => (
          <div key={p} className="legend-item">
            <div
              className={`legend-dot`}
              style={{
                background: { critical: "#ef4444", high: "#f59e0b", medium: "#3b82f6", low: "#10b981" }[p],
              }}
            />
            {l}
          </div>
        ))}
      </div>
      {/* Toolbar */}
      <div className="pub-map-toolbar">
        <button aria-label="Zoom in">+</button>
        <button aria-label="Zoom out">−</button>
        <button aria-label="Locate me" title="Current location">
          <Icon name="pin" size={14} />
        </button>
      </div>
      {/* Privacy notice for public */}
      {!authority && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            right: 16,
            background: "rgba(255,255,255,.9)",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 12,
            fontWeight: 600,
            color: "#315360",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Icon name="lock" size={11} /> Approximate locations only
        </div>
      )}
      {/* Tooltip */}
      {tooltip && (
        <div className="pub-map-tooltip" style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
          <h4>{tooltip.inc.type}</h4>
          <p style={{ marginBottom: 6 }}>{tooltip.inc.area}</p>
          <PriorityPill priority={tooltip.inc.priority} size="sm" />
        </div>
      )}
    </div>
  );
}

export default IncidentMapVis;

