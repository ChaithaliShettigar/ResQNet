import React, { useState, useCallback } from "react";
import { LS } from "./data/seedData";

// Pages
import Landing from "./pages/Landing";
import EmergencyReport from "./pages/EmergencyReport";
import PublicMap from "./pages/PublicMap";
import Register from "./pages/Register";
import Login from "./pages/Login";
import AuthorityLogin from "./pages/AuthorityLogin";
import UserDashboard from "./pages/UserDashboard";
import AuthorityDashboard from "./pages/AuthorityDashboard";

// Layout
import PubNav from "./components/layout/PubNav";

export default function App() {
  const [view, setView] = useState(() => window.location.hash.slice(1) || "home");
  const [userName, setUserName] = useState(() => LS.get("resqnet-user", {}).name || "");

  const go = useCallback((v, options = {}) => {
    if (v !== view) {
      const method = options.replace ? "replaceState" : "pushState";
      window.history[method]({ resqnetView: v }, "", `#${v}`);
    }
    setView(v);
    window.scrollTo(0, 0);
  }, [view]);

  React.useEffect(() => {
    const restoreView = () => setView(window.location.hash.slice(1) || "home");
    window.addEventListener("popstate", restoreView);
    window.addEventListener("hashchange", restoreView);
    if (!window.location.hash) window.history.replaceState({ resqnetView: view }, "", "#home");
    return () => { window.removeEventListener("popstate", restoreView); window.removeEventListener("hashchange", restoreView); };
  }, []);

  if (view === "report") return <EmergencyReport go={go} />;
  if (view === "public-map") return <PublicMap go={go} />;
  if (view === "register") return <Register go={go} onSuccess={n => { setUserName(n); go("dashboard"); }} />;
  if (view === "login") return <Login go={go} onSuccess={n => { setUserName(n || LS.get("resqnet-user", {}).name || "member"); go("dashboard"); }} />;
  if (view === "authority-login") return <AuthorityLogin go={go} onSuccess={() => go("authority")} />;
  if (view === "dashboard") return <UserDashboard name={userName || "User"} go={go} onLogout={() => go("home")} />;
  if (view === "authority") return <AuthorityDashboard go={go} onLogout={() => go("home")} />;
  if (view === "admin") return <AuthorityDashboard go={go} onLogout={() => go("home")} />;

  // Default: Home (Landing page with public nav)
  return (
    <>
      <PubNav go={go} currentView={view} />
      <Landing go={go} />
    </>
  );
}

