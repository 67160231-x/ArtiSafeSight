import { Video, AlertTriangle, ShieldCheck, MoreHorizontal } from "lucide-react";

function StatCard({ icon: Icon, iconBg, iconColor, label, value, suffix, delta, deltaGood, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 text-left rounded-xl border border-base-700/60 bg-base-900 px-5 py-4 hover:border-base-600 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon size={16} className={iconColor} />
        </div>
        <span className="text-slate-600">
          <MoreHorizontal size={16} />
        </span>
      </div>
      <p className="text-xs text-slate-500 mt-3">{label}</p>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className="text-2xl font-display font-semibold text-white">{value}</span>
        {suffix && <span className="text-xs text-slate-500">{suffix}</span>}
      </div>
      {delta && (
        <p className={`text-[11px] mt-1 ${deltaGood ? "text-safe" : "text-alert-critical"}`}>
          {delta}
        </p>
      )}
    </button>
  );
}

export default function StatsCards({ stats, onNavigate }) {
  if (!stats) {
    return (
      <div className="flex flex-col md:flex-row gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 h-24 rounded-xl border border-base-700/60 bg-base-900 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-3">
      <StatCard
        icon={Video}
        iconBg="bg-cyan-accent/15"
        iconColor="text-cyan-accent"
        label="Total active cameras"
        value={String(stats.activeCameras.value).padStart(2, "0")}
        suffix={`of ${stats.activeCameras.total} total`}
        onClick={() => onNavigate?.("cameras")}
      />
      <StatCard
        icon={AlertTriangle}
        iconBg="bg-alert-critical/15"
        iconColor="text-alert-critical"
        label="Daily warnings"
        value={stats.dailyWarnings.value}
        delta={`${stats.dailyWarnings.deltaVsYesterday}% vs yesterday`}
        deltaGood
        onClick={() => onNavigate?.("alerts")}
      />
      <StatCard
        icon={ShieldCheck}
        iconBg="bg-safe/15"
        iconColor="text-safe"
        label="Safety compliance rate"
        value={`${stats.complianceRate.value}%`}
        delta={`+${stats.complianceRate.deltaVsYesterday}% vs yesterday`}
        deltaGood
        onClick={() => onNavigate?.("settings")}
      />
    </div>
  );
}
