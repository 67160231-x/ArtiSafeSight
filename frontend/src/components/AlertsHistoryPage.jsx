import { useState } from "react";
import { Check } from "lucide-react";

const TABS = ["All", "Critical", "High", "Medium"];
const SEVERITY_STYLES = {
  critical: "text-alert-critical bg-alert-critical/15",
  high: "text-alert-high bg-alert-high/15",
  medium: "text-alert-high bg-alert-high/15",
  low: "text-alert-low bg-alert-low/15"
};

export default function AlertsHistoryPage({ alerts, onAcknowledge }) {
  const [tab, setTab] = useState("All");
  const filtered = tab === "All" ? alerts : alerts.filter((a) => a.severity === tab.toLowerCase());

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-white">Alert history</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Every safety violation detected across your site, newest first.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-base-700/60 bg-base-850 p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                tab === t ? "bg-cyan-accent/15 text-cyan-accent" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-base-700/60 bg-base-900 divide-y divide-base-700/50">
        {filtered.length === 0 && (
          <p className="text-sm text-slate-500 px-5 py-10 text-center">No violations in this category.</p>
        )}
        {filtered.map((alert) => (
          <div key={alert.id} className="flex items-center gap-3 px-5 py-3.5">
            <span
              className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                alert.severity === "critical"
                  ? "bg-alert-critical"
                  : alert.severity === "high" || alert.severity === "medium"
                  ? "bg-alert-high"
                  : "bg-alert-low"
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-slate-200">{alert.title}</p>
                <span className={`text-[9px] uppercase font-semibold rounded px-1.5 py-0.5 ${SEVERITY_STYLES[alert.severity]}`}>
                  {alert.severity}
                </span>
                {alert.acknowledged && (
                  <span className="text-[9px] uppercase font-semibold rounded px-1.5 py-0.5 text-safe bg-safe/15">
                    Acknowledged
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{alert.location}</p>
            </div>
            <p className="text-xs font-mono text-slate-600 hidden sm:block">{alert.time}</p>
            <button
              onClick={() => onAcknowledge(alert.id)}
              disabled={alert.acknowledged}
              className={`h-8 w-8 shrink-0 flex items-center justify-center rounded-full border transition-colors ${
                alert.acknowledged
                  ? "border-safe/40 text-safe bg-safe/10"
                  : "border-base-700 text-slate-500 hover:text-cyan-accent hover:border-cyan-accent/40"
              }`}
            >
              <Check size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
