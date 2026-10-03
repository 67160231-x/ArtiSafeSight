import { useState } from "react";
import { Grid3x3, List, SlidersHorizontal } from "lucide-react";
import CameraCard from "./CameraCard.jsx";

const FILTERS = ["All", "Live", "Clear", "Alerts"];

function matchesFilter(camera, filter) {
  if (filter === "All") return true;
  if (filter === "Live") return camera.status === "live";
  if (filter === "Clear") return camera.status === "clear";
  if (filter === "Alerts") return camera.detections.length > 0;
  return true;
}

export default function CameraGrid({ cameras, loading }) {
  const [view, setView] = useState("grid"); // "grid" | "list"
  const [filter, setFilter] = useState("All");
  const [filterOpen, setFilterOpen] = useState(false);

  const filtered = cameras.filter((c) => matchesFilter(c, filter));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-slate-200 flex items-center gap-2">
            Live camera feeds
            <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-accent bg-cyan-accent/10 rounded-full px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-accent" /> LIVE
            </span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            AI-powered detection is active across all connected cameras.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-base-700/60 bg-base-850 p-0.5">
            <button
              onClick={() => setView("grid")}
              className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${
                view === "grid" ? "bg-base-800 text-cyan-accent" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Grid3x3 size={14} />
            </button>
            <button
              onClick={() => setView("list")}
              className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors ${
                view === "list" ? "bg-base-800 text-cyan-accent" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <List size={14} />
            </button>
          </div>
          <div className="relative">
            <button
              onClick={() => setFilterOpen((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                filter !== "All"
                  ? "border-cyan-accent/40 bg-cyan-accent/10 text-cyan-accent"
                  : "border-base-700/60 bg-base-850 text-slate-400 hover:text-slate-200"
              }`}
            >
              <SlidersHorizontal size={13} /> {filter === "All" ? "Filter" : filter}
            </button>
            {filterOpen && (
              <div className="absolute right-0 mt-1.5 w-36 rounded-lg border border-base-700/60 bg-base-850 shadow-xl z-10 overflow-hidden">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setFilter(f);
                      setFilterOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      filter === f ? "text-cyan-accent bg-cyan-accent/10" : "text-slate-300 hover:bg-base-800"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-video rounded-xl border border-base-700/60 bg-base-900 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-500 py-10 text-center rounded-xl border border-base-700/60 bg-base-900">
          No cameras match this filter.
        </p>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((camera) => (
            <CameraCard key={camera.id} camera={camera} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-base-700/60 bg-base-900 divide-y divide-base-700/50">
          {filtered.map((camera) => (
            <div key={camera.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  camera.status === "clear" ? "bg-safe" : "bg-alert-critical pulse-dot"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200">{camera.name}</p>
                <p className="text-[11px] text-slate-500">{camera.zone}</p>
              </div>
              {camera.detections.length > 0 ? (
                <span className="text-[10px] font-medium text-alert-critical bg-alert-critical/15 rounded-full px-2 py-1">
                  {camera.detections.length} alert{camera.detections.length > 1 ? "s" : ""}
                </span>
              ) : (
                <span className="text-[10px] font-medium text-safe bg-safe/15 rounded-full px-2 py-1">Clear</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
