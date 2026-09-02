import { useState } from "react";
import CameraCard from "./CameraCard.jsx";
import AnalyzePhoto from "./AnalyzePhoto.jsx";

const FILTERS = ["All", "Live", "Clear", "Alerts"];

function matchesFilter(camera, filter) {
  if (filter === "All") return true;
  if (filter === "Live") return camera.status === "live";
  if (filter === "Clear") return camera.status === "clear";
  if (filter === "Alerts") return camera.detections.length > 0;
  return true;
}

export default function CamerasPage({ cameras, loading }) {
  const [filter, setFilter] = useState("All");
  const filtered = cameras.filter((c) => matchesFilter(c, filter));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-2xl font-display font-semibold text-white">Live cameras</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              All {cameras.length} connected feeds with real-time AI detection.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-3 mb-3">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                filter === f
                  ? "border-cyan-accent/40 bg-cyan-accent/10 text-cyan-accent"
                  : "border-base-700/60 bg-base-850 text-slate-400 hover:text-slate-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-video rounded-xl border border-base-700/60 bg-base-900 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500 py-10 text-center rounded-xl border border-base-700/60 bg-base-900">
            No cameras match this filter.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((camera) => (
              <CameraCard key={camera.id} camera={camera} />
            ))}
          </div>
        )}
      </div>

      <AnalyzePhoto />
    </div>
  );
}
