import { useState } from "react";
import { Check, ArrowRight } from "lucide-react";

const TABS = ["All", "Critical", "High", "Medium"];

const SEVERITY_STYLES = {
  critical: "text-alert-critical bg-alert-critical/15",
  high: "text-alert-high bg-alert-high/15",
  medium: "text-alert-high bg-alert-high/15",
  low: "text-alert-low bg-alert-low/15"
};

export default function AlertsPanel({ alerts, onAcknowledge, onNavigate }) {
  const [tab, setTab] = useState("All");

  const filtered =
    tab === "All" ? alerts : alerts.filter((a) => a.severity === tab.toLowerCase());

  const openCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <aside className="w-full xl:w-80 shrink-0 rounded-xl border border-base-700/60 bg-base-900 flex flex-col max-h-[calc(100vh-8rem)]">
      <div className="px-4 pt-4 pb-3 border-b border-base-700/60">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-200">Recent violations</p>
          <span className="text-[10px] font-mono text-alert-critical bg-alert-critical/15 rounded-full px-1.5 py-0.5">
            {openCount}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5">Events requiring your attention.</p>

        <div className="flex items-center gap-1 mt-3">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${
                tab === t
                  ? "bg-cyan-accent/15 text-cyan-accent"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-base-700/50">
        {filtered.length === 0 && (
          <p className="text-xs text-slate-500 px-4 py-6 text-center">No violations in this category.</p>
        )}
        {filtered.map((alert) => (
          <div key={alert.id} className="flex items-start gap-2.5 px-4 py-3">
            <span
              className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                alert.severity === "critical"
                  ? "bg-alert-critical"
                  : alert.severity === "high" || alert.severity === "medium"
                  ? "bg-alert-high"
                  : "bg-alert-low"
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-medium text-slate-200">{alert.title}</p>
                <span
                  className={`text-[9px] uppercase font-semibold rounded px-1 py-0.5 ${
                    SEVERITY_STYLES[alert.severity]
                  }`}
                >
                  {alert.severity}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{alert.location}</p>
              <p className="text-[10px] font-mono text-slate-600 mt-0.5">{alert.time}</p>
            </div>
            <button
              onClick={() => onAcknowledge(alert.id)}
              disabled={alert.acknowledged}
              title={alert.acknowledged ? "Acknowledged" : "Acknowledge"}
              className={`h-6 w-6 shrink-0 flex items-center justify-center rounded-full border transition-colors ${
                alert.acknowledged
                  ? "border-safe/40 text-safe bg-safe/10"
                  : "border-base-700 text-slate-500 hover:text-cyan-accent hover:border-cyan-accent/40"
              }`}
            >
              <Check size={12} />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => onNavigate?.("alerts")}
        className="flex items-center justify-center gap-1.5 text-xs text-cyan-accent px-4 py-3 border-t border-base-700/60 hover:bg-base-850 transition-colors"
      >
        View full alert history <ArrowRight size={13} />
      </button>
    </aside>
  );
}
