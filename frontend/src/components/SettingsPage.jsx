import { useEffect, useState } from "react";
import { Check, Loader2, Sun, Moon } from "lucide-react";
import { api } from "../api.js";
import { applyTheme, getStoredTheme } from "../theme.js";

const TOGGLES = [
  { id: "hardhat", label: "Hard hat detection", desc: "Flag workers without head protection in restricted zones." },
  { id: "vest", label: "Safety vest detection", desc: "Flag workers without high-visibility vests." },
  { id: "line", label: "LINE notifications", desc: "Send a LINE message when a critical violation is detected." },
  { id: "faceBlur", label: "Blur worker faces", desc: "Automatically blur detected faces in photo analysis for privacy." }
];

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative h-6 w-11 rounded-full transition-colors shrink-0 disabled:opacity-50 ${
        checked ? "bg-cyan-accent" : "bg-base-700"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [state, setState] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(getStoredTheme());

  useEffect(() => {
    api
      .getSettings()
      .then(setState)
      .catch(() => setState({ hardhat: true, vest: true, line: false, faceBlur: false }));
  }, []);

  function changeTheme(next) {
    applyTheme(next);
    setTheme(next);
  }

  async function toggle(id) {
    const next = { ...state, [id]: !state[id] };
    setState(next); // optimistic
    setSavingId(id);
    setError(null);
    try {
      const saved = await api.updateSettings({ [id]: next[id] });
      setState(saved);
      setSavedAt(new Date());
    } catch (err) {
      setState((prev) => ({ ...prev, [id]: !next[id] })); // revert
      setError(err.message || "Could not save setting.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink">System settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure which detections are active on your site.</p>
        </div>
        {savedAt && !savingId && (
          <span className="flex items-center gap-1 text-[11px] text-safe">
            <Check size={12} /> Saved
          </span>
        )}
      </div>

      {error && (
        <p className="text-xs text-alert-critical mb-3">{error}</p>
      )}

      <div className="rounded-xl border border-base-700/60 bg-base-900 max-w-2xl mb-5">
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-sm font-medium text-slate-200">Appearance</p>
            <p className="text-xs text-slate-500 mt-0.5">Choose how ArtiSafeSight looks on this device.</p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-base-700 bg-base-850 p-1">
            <button
              onClick={() => changeTheme("light")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                theme === "light" ? "bg-cyan-accent text-base-950" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Sun size={13} /> Light
            </button>
            <button
              onClick={() => changeTheme("dark")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                theme === "dark" ? "bg-cyan-accent text-base-950" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Moon size={13} /> Dark
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-base-700/60 bg-base-900 divide-y divide-base-700/50 max-w-2xl">
        {TOGGLES.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-slate-200">{t.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
            </div>
            {!state ? (
              <div className="h-6 w-11 rounded-full bg-base-800 animate-pulse" />
            ) : (
              <div className="flex items-center gap-2">
                {savingId === t.id && <Loader2 size={12} className="animate-spin text-slate-500" />}
                <Toggle checked={state[t.id]} onChange={() => toggle(t.id)} disabled={savingId === t.id} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
