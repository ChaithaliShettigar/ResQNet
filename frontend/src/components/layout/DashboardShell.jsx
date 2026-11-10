import React from "react";
import { Brand } from "../common/Brand.jsx";
import { Icon } from "../common/Icon.jsx";

export function DashboardShell({
  name,
  authority = false,
  activeTab,
  setTab,
  go,
  onLogout,
  missedCalls = 0,
  children,
}) {
  const navItems = authority
    ? [
        { id: "overview", label: "Overview", icon: "zap" },
        { id: "queue", label: "Incident Queue", icon: "list" },
        { id: "map", label: "Incident Map", icon: "map" },
        { id: "verification", label: "Verification", icon: "shield" },
        { id: "calls", label: "Follow-Up Calls", icon: "phone" },
        { id: "coordination", label: "Response Coordination", icon: "users" },
        { id: "weather", label: "Weather & Context", icon: "weather" },
        { id: "admin", label: "Admin & Permissions", icon: "settings" },
      ]
    : [
        { id: "overview", label: "Overview", icon: "zap" },
        { id: "my-reports", label: "My Reports", icon: "list" },
        { id: "calls", label: "AI Follow-Up Calls", icon: "phoneIncoming", badge: missedCalls || null },
        { id: "public-map", label: "Public Incidents", icon: "map" },
        { id: "notifications", label: "Notifications", icon: "bell", badge: 3 },
        { id: "profile", label: "Profile & Settings", icon: "settings" },
      ];

  return (
    <div className="db-layout">
      <aside className="db-sidebar">
        <div className="db-sidebar-top">
          <Brand onHome={() => go("home")} light />
        </div>
        <div className="db-workspace-badge" style={{ margin: 12, marginTop: 14 }}>
          <div className={`db-workspace-badge-dot ${authority ? "authority" : "public"}`} />
          <div>
            <b>{authority ? "Authority workspace" : "Public dashboard"}</b>
            <small>{authority ? "Protected access" : "Connected account"}</small>
          </div>
        </div>
        <nav className="db-nav" aria-label="Dashboard navigation">
          <div className="db-nav-section">
            <div className="db-nav-label">Workspace</div>
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`db-nav-item${activeTab === item.id ? " active" : ""}`}
                onClick={() => setTab(item.id)}
              >
                <Icon name={item.icon} size={16} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {!!item.badge && <span className="db-nav-badge">{item.badge}</span>}
              </button>
            ))}
          </div>
          {!authority && (
            <div className="db-nav-section" style={{ marginTop: 12 }}>
              <div className="db-nav-label">Quick Actions</div>
              <button
                className="db-nav-item"
                onClick={() => go("report")}
                style={{ background: "rgba(239,68,68,.12)", color: "#fca5a5" }}
              >
                <Icon name="alert" size={16} /> Report Emergency
              </button>
            </div>
          )}
        </nav>
        <div className="db-sidebar-bottom">
          <div className="db-user">
            <div className={`db-avatar${authority ? " authority-avatar" : ""}`}>
              {(name || "R").charAt(0).toUpperCase()}
            </div>
            <div>
              <b>{authority ? "Responder" : name}</b>
              <small>{authority ? "Authorized personnel" : "ResQNet member"}</small>
            </div>
          </div>
          <button className="db-logout" onClick={onLogout}>
            <Icon name="logout" size={14} /> Log out
          </button>
        </div>
      </aside>
      <div className="db-main">
        <header className="db-topbar">
          <div>
            <div className="db-topbar-kicker">{authority ? "COMMAND CENTER" : "MY RESQNET"}</div>
            <div className="db-topbar-title">{authority ? "Authority Command Center" : `Welcome back, ${name}`}</div>
          </div>
          <div className="db-topbar-actions">
            <button className="topbar-icon-btn" aria-label="Notifications" onClick={() => setTab("notifications")}>
              <Icon name="bell" size={16} />
              <span className="notif-dot" />
            </button>
            {!authority && (
              <button className="btn btn-emergency btn-sm" onClick={() => go("report")}>
                <Icon name="alert" size={13} /> Report Emergency
              </button>
            )}
          </div>
        </header>
        <main className="db-content">{children}</main>
      </div>
    </div>
  );
}

export default DashboardShell;

