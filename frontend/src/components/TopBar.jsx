import { useMemo, useState } from "react";
import { Search, Bell, Settings2, Menu, LogOut } from "lucide-react";

export default function TopBar({
  userName = "Jordan Davis",
  userRole = "Safety Director",
  title = "Safety overview",
  onMenuClick,
  onLogout,
  cameras = [],
  alerts = [],
  onNavigate
}) {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  const unacknowledged = alerts.filter((a) => !a.acknowledged);

  const results = useMemo(() => {
    if (!query.trim()) return { cams: [], alerts: [] };
    const q = query.toLowerCase();
    return {
      cams: cameras.filter((c) => c.name.toLowerCase().includes(q) || c.zone.toLowerCase().includes(q)).slice(0, 4),
      alerts: alerts.filter((a) => a.title.toLowerCase().includes(q) || a.location.toLowerCase().includes(q)).slice(0, 4)
    };
  }, [query, cameras, alerts]);

  return (
    <header className="flex items-center justify-between border-b border-base-700/60 bg-base-900/80 px-4 sm:px-6 py-3.5 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden h-8 w-8 flex items-center justify-center rounded-lg border border-base-700/60 text-slate-400"
        >
          <Menu size={16} />
        </button>
        <div>
          <p className="text-[11px] text-slate-500">Workspace / Overview</p>
          <p className="text-sm font-medium text-slate-200">{title}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <div className="flex items-center gap-2 rounded-lg border border-base-700/60 bg-base-850 px-3 py-1.5 text-sm text-slate-300 w-64 focus-within:border-cyan-accent/50">
            <Search size={14} className="text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              placeholder="Search cameras, alerts..."
              className="flex-1 bg-transparent outline-none placeholder:text-slate-500 text-sm"
            />
            <kbd className="text-[10px] font-mono text-slate-600 border border-base-700 rounded px-1">⌘K</kbd>
          </div>

          {searchOpen && query.trim() && (
            <div className="absolute right-0 mt-1.5 w-72 rounded-lg border border-base-700/60 bg-base-850 shadow-xl z-20 overflow-hidden max-h-80 overflow-y-auto">
              {results.cams.length === 0 && results.alerts.length === 0 && (
                <p className="text-xs text-slate-500 px-3 py-3">No matches.</p>
              )}
              {results.cams.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-600 px-3 pt-2.5 pb-1">Cameras</p>
                  {results.cams.map((c) => (
                    <button
                      key={c.id}
                      onMouseDown={() => {
                        onNavigate?.("cameras");
                        setQuery("");
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-base-800 transition-colors"
                    >
                      <p className="text-xs text-slate-200">{c.name}</p>
                      <p className="text-[10px] text-slate-500">{c.zone}</p>
                    </button>
                  ))}
                </div>
              )}
              {results.alerts.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-600 px-3 pt-2.5 pb-1">Alerts</p>
                  {results.alerts.map((a) => (
                    <button
                      key={a.id}
                      onMouseDown={() => {
                        onNavigate?.("alerts");
                        setQuery("");
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-base-800 transition-colors"
                    >
                      <p className="text-xs text-slate-200">{a.title}</p>
                      <p className="text-[10px] text-slate-500">{a.location}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setBellOpen((v) => !v)}
            className="relative h-9 w-9 flex items-center justify-center rounded-lg border border-base-700/60 bg-base-850 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Bell size={16} />
            {unacknowledged.length > 0 && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-alert-critical" />
            )}
          </button>
          {bellOpen && (
            <div className="absolute right-0 mt-1.5 w-72 rounded-lg border border-base-700/60 bg-base-850 shadow-xl z-20 overflow-hidden">
              <p className="text-xs font-medium text-slate-200 px-3 py-2.5 border-b border-base-700/60">
                {unacknowledged.length} unacknowledged alert{unacknowledged.length !== 1 ? "s" : ""}
              </p>
              <div className="max-h-64 overflow-y-auto">
                {unacknowledged.length === 0 && (
                  <p className="text-xs text-slate-500 px-3 py-3">You're all caught up.</p>
                )}
                {unacknowledged.slice(0, 5).map((a) => (
                  <div key={a.id} className="px-3 py-2 border-b border-base-700/40 last:border-0">
                    <p className="text-xs text-slate-200">{a.title}</p>
                    <p className="text-[10px] text-slate-500">{a.location}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  onNavigate?.("alerts");
                  setBellOpen(false);
                }}
                className="w-full text-center text-xs text-cyan-accent py-2.5 hover:bg-base-800 transition-colors"
              >
                View all alerts
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => onNavigate?.("settings")}
          className="h-9 w-9 flex items-center justify-center rounded-lg border border-base-700/60 bg-base-850 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <Settings2 size={16} />
        </button>
        <div className="flex items-center gap-2 pl-2 border-l border-base-700/60">
          <div className="h-8 w-8 rounded-full bg-cyan-accent/20 flex items-center justify-center text-xs font-semibold text-cyan-accent">
            {userName.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-slate-200 leading-none">{userName}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{userRole}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          title="Log out"
          className="h-9 w-9 flex items-center justify-center rounded-lg border border-base-700/60 bg-base-850 text-slate-400 hover:text-alert-critical hover:border-alert-critical/40 transition-colors"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
