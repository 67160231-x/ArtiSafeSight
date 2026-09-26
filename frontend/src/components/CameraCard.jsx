const SEVERITY_STYLES = {
  critical: { border: "border-alert-critical", text: "text-alert-critical", bg: "bg-alert-critical" },
  high: { border: "border-alert-high", text: "text-alert-high", bg: "bg-alert-high" },
  medium: { border: "border-alert-high", text: "text-alert-high", bg: "bg-alert-high" },
  low: { border: "border-alert-low", text: "text-alert-low", bg: "bg-alert-low" }
};

export default function CameraCard({ camera }) {
  const hasAlerts = camera.detections.length > 0;
  const isClear = camera.status === "clear";

  return (
    <div className="group relative rounded-xl overflow-hidden border border-base-700/60 bg-base-900">
      <div className="relative aspect-video bg-base-800">
        <img
          src={`/cameras/${camera.image}`}
          alt={camera.name}
          className="h-full w-full object-cover opacity-90"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

        {/* Live / status pill */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-md bg-black/50 px-2 py-1 text-[10px] font-mono backdrop-blur-sm">
          <span
            className={`h-1.5 w-1.5 rounded-full ${isClear ? "bg-safe" : "bg-alert-critical pulse-dot"}`}
          />
          <span className={isClear ? "text-safe" : "text-alert-critical"}>
            {isClear ? "Clear" : "Live"}
          </span>
        </div>

        {camera.timestamp && (
          <div className="absolute top-2.5 right-2.5 rounded-md bg-black/50 px-2 py-1 text-[10px] font-mono text-slate-300 backdrop-blur-sm">
            {camera.timestamp}
          </div>
        )}

        {/* Detection bounding boxes */}
        {camera.detections.map((d) => {
          const style = SEVERITY_STYLES[d.severity] || SEVERITY_STYLES.medium;
          return (
            <div
              key={d.id}
              className={`absolute border-2 ${style.border} rounded-sm`}
              style={{
                left: `${d.box?.x ?? 10}%`,
                top: `${d.box?.y ?? 15}%`,
                width: `${d.box?.w ?? 25}%`,
                height: `${d.box?.h ?? 50}%`
              }}
            >
              <span
                className={`absolute -top-6 left-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium text-black ${style.bg}`}
              >
                {d.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between px-3 py-2.5">
        <div>
          <p className="text-sm font-medium text-slate-200">{camera.name}</p>
          <p className="text-[11px] text-slate-500">{camera.zone}</p>
        </div>
        {hasAlerts ? (
          <span className="text-[10px] font-medium text-alert-critical bg-alert-critical/15 rounded-full px-2 py-1">
            {camera.detections.length} alert{camera.detections.length > 1 ? "s" : ""}
          </span>
        ) : (
          <span className="text-[10px] font-medium text-safe bg-safe/15 rounded-full px-2 py-1">
            Clear
          </span>
        )}
      </div>
    </div>
  );
}
