// Small helper around the light/dark theme toggle. The actual colors live
// in src/index.css as CSS variables; this just flips the [data-theme]
// attribute on <html> and remembers the choice.
const STORAGE_KEY = "artisafesight-theme";

export function getStoredTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "dark";
}

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
}
