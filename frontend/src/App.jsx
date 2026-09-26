import { useEffect, useState } from "react";
import { Settings2, WifiOff } from "lucide-react";
import Sidebar from "./components/Sidebar.jsx";
import TopBar from "./components/TopBar.jsx";
import StatsCards from "./components/StatsCards.jsx";
import CameraGrid from "./components/CameraGrid.jsx";
import AlertsPanel from "./components/AlertsPanel.jsx";
import CamerasPage from "./components/CamerasPage.jsx";
import AlertsHistoryPage from "./components/AlertsHistoryPage.jsx";
import SettingsPage from "./components/SettingsPage.jsx";
import LoginPage from "./components/LoginPage.jsx";
import { api } from "./api.js";

const PAGE_TITLES = {
  dashboard: "Safety overview",
  cameras: "Live cameras",
  alerts: "Alert history",
  settings: "System settings"
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [active, setActive] = useState("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadAll() {
    try {
      setError(null);
      const [camerasRes, alertsRes, statsRes] = await Promise.all([
        api.getCameras(),
        api.getAlerts(),
        api.getStats()
      ]);
      setCameras(camerasRes);
      setAlerts(alertsRes);
      setStats(statsRes);
    } catch (err) {
      setError(err.message || "Could not reach the backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    loadAll();
    const interval = setInterval(loadAll, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [token]);

  function handleLoginSuccess(newToken, newUser) {
    setToken(newToken);
    setUser(newUser);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }

  async function handleAcknowledge(id) {
    // Optimistic update
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
    try {
      await api.acknowledgeAlert(id);
    } catch {
      loadAll(); // reconcile with server on failure
    }
  }

  if (!token) {
    return <LoginPage onSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-base-950">
      <Sidebar active={active} onNavigate={setActive} />

      {/* Mobile slide-over nav */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileNavOpen(false)} />
          <div className="relative flex h-full w-64">
            <Sidebar
              active={active}
              onNavigate={(id) => {
                setActive(id);
                setMobileNavOpen(false);
              }}
              forceVisible
            />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          title={PAGE_TITLES[active]}
          onMenuClick={() => setMobileNavOpen(true)}
          userName={user?.name || user?.email || "Signed in"}
          onLogout={handleLogout}
          cameras={cameras}
          alerts={alerts}
          onNavigate={setActive}
        />

        <main className="flex-1 overflow-y-auto px-6 py-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-alert-critical/30 bg-alert-critical/10 px-4 py-2.5 text-xs text-alert-critical">
              <WifiOff size={14} />
              Can't reach the backend at /api — is the server running? ({error})
            </div>
          )}

          {active === "dashboard" && (
            <>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="text-[11px] text-cyan-accent flex items-center gap-1.5 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-accent pulse-dot" /> LIVE MONITORING
                  </p>
                  <h1 className="text-2xl font-display font-semibold text-white mt-1">
                    Good morning, {user?.name || "Jordan"}
                  </h1>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Here's what's happening across your site right now.
                  </p>
                </div>
                <div className="hidden md:flex items-center gap-3">
                  <p className="text-[11px] text-slate-500">Data updates every 15s</p>
                  <button
                    onClick={loadAll}
                    className="flex items-center gap-1.5 rounded-lg bg-cyan-accent text-base-950 font-medium px-3 py-2 text-xs hover:bg-cyan-accent/90 transition-colors"
                  >
                    <Settings2 size={13} /> Refresh now
                  </button>
                </div>
              </div>

              <div className="mt-6">
                <StatsCards stats={stats} onNavigate={setActive} />
              </div>

              <div className="mt-6 flex flex-col xl:flex-row gap-4 items-start">
                <div className="flex-1 min-w-0">
                  <CameraGrid cameras={cameras} loading={loading} />
                </div>
                <AlertsPanel alerts={alerts} onAcknowledge={handleAcknowledge} onNavigate={setActive} />
              </div>
            </>
          )}

          {active === "cameras" && <CamerasPage cameras={cameras} loading={loading} />}

          {active === "alerts" && (
            <AlertsHistoryPage alerts={alerts} onAcknowledge={handleAcknowledge} />
          )}

          {active === "settings" && <SettingsPage />}
        </main>

        <footer className="flex items-center justify-between px-6 py-2.5 border-t border-base-700/60 text-[11px] text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-safe" /> ArtiSafeSight monitoring platform
          </span>
          <span>System v2.8.1 · Secure connection</span>
        </footer>
      </div>
    </div>
  );
}