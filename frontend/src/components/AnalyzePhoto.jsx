import { useRef, useState, useEffect } from "react";
import { UploadCloud, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { api } from "../api.js";

const SEVERITY_STYLES = {
  critical: { border: "border-alert-critical", text: "text-alert-critical", bg: "bg-alert-critical" },
  medium: { border: "border-alert-high", text: "text-alert-high", bg: "bg-alert-high" }
};

export default function AnalyzePhoto() {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [faceBlur, setFaceBlur] = useState(false);

  useEffect(() => {
    api.getSettings().then((s) => setFaceBlur(!!s.faceBlur)).catch(() => {});
  }, []);

  function handleFile(f) {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);
    setPreview(URL.createObjectURL(f));
  }

  async function handleAnalyze() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.analyzeImage(file, null, faceBlur);
      setResult(res);
    } catch (err) {
      setError(err.message || "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-base-700/60 bg-base-900 p-5">
      <p className="text-sm font-medium text-slate-200">Analyze a photo</p>
      <p className="text-[11px] text-slate-500 mt-0.5 mb-4">
        Upload any site photo and run it through the PPE-detection model — real
        inference on the {"Gloves, Hard_hat, Mask, Person, Safety_boots, Vest"} classes.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {!preview ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-base-700 py-10 text-slate-500 hover:border-cyan-accent/50 hover:text-cyan-accent transition-colors"
        >
          <UploadCloud size={22} />
          <span className="text-xs">Click to choose an image</span>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden border border-base-700/60 aspect-video bg-base-950">
            <img src={preview} alt="Upload preview" className="h-full w-full object-contain" />
            {result?.raw_detections?.map((d, i) => {
              const style = SEVERITY_STYLES[d.label === "Hard_hat" || d.label === "Vest" ? "medium" : "critical"];
              return (
                <div
                  key={i}
                  className="absolute border-2 border-cyan-accent rounded-sm"
                  style={{
                    left: `${d.box.x}%`,
                    top: `${d.box.y}%`,
                    width: `${d.box.w}%`,
                    height: `${d.box.h}%`
                  }}
                >
                  <span className="absolute -top-5 left-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium text-black bg-cyan-accent">
                    {d.label} {Math.round(d.confidence * 100)}%
                  </span>
                </div>
              );
            })}
            {result?.violations?.map((v, i) => {
              const style = SEVERITY_STYLES[v.severity] || SEVERITY_STYLES.medium;
              return (
                <div
                  key={`v${i}`}
                  className={`absolute border-2 ${style.border} rounded-sm`}
                  style={{
                    left: `${v.box.x}%`,
                    top: `${v.box.y}%`,
                    width: `${v.box.w}%`,
                    height: `${v.box.h}%`
                  }}
                >
                  <span className={`absolute -bottom-5 left-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium text-black ${style.bg}`}>
                    {v.label}
                  </span>
                </div>
              );
            })}
            {faceBlur && result?.faces?.map((f, i) => (
              <div
                key={`face${i}`}
                className="absolute rounded-full pointer-events-none"
                style={{
                  left: `${f.box.x}%`,
                  top: `${f.box.y}%`,
                  width: `${f.box.w}%`,
                  height: `${f.box.h}%`,
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  background: "rgba(0,0,0,0.15)"
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-accent text-base-950 font-medium px-3 py-2 text-xs hover:bg-cyan-accent/90 transition-colors disabled:opacity-60"
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              {loading ? "Analyzing..." : "Run detection"}
            </button>
            <button
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-base-700/60 px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
            >
              Choose another
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-alert-high/30 bg-alert-high/10 px-3 py-2.5 text-xs text-alert-high">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{error}</p>
              </div>
            </div>
          )}

          {result && result.modelReady === false && (
            <div className="flex items-start gap-2 rounded-lg border border-alert-high/30 bg-alert-high/10 px-3 py-2.5 text-xs text-alert-high">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">No trained model loaded yet.</p>
                <p className="text-slate-400 mt-0.5">{result.detail}</p>
              </div>
            </div>
          )}

          {result && result.modelReady && (
            <div className="flex items-start gap-2 rounded-lg border border-safe/30 bg-safe/10 px-3 py-2.5 text-xs text-safe">
              <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">
                  {result.violations?.length
                    ? `${result.violations.length} violation${result.violations.length > 1 ? "s" : ""} found`
                    : "No violations detected"}
                </p>
                <p className="text-slate-400 mt-0.5">{result.raw_detections?.length || 0} objects detected total.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
