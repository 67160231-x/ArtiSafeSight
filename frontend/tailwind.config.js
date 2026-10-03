/** @type {import('tailwindcss').Config} */
// Every color below reads from a CSS variable (defined in src/index.css for
// both [data-theme="dark"] and [data-theme="light"]) so the whole app can
// switch themes without any component changing its className.
function themedColor(varName) {
  return `rgb(var(${varName}) / <alpha-value>)`;
}

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // ArtiSafeSight safety-tech palette (theme-aware via CSS variables)
        base: {
          950: themedColor("--color-base-950"),
          900: themedColor("--color-base-900"),
          850: themedColor("--color-base-850"),
          800: themedColor("--color-base-800"),
          700: themedColor("--color-base-700"),
          600: themedColor("--color-base-600")
        },
        cyan: {
          accent: themedColor("--color-cyan-accent")
        },
        alert: {
          critical: themedColor("--color-alert-critical"),
          high: themedColor("--color-alert-high"),
          medium: themedColor("--color-alert-medium"),
          low: themedColor("--color-alert-low")
        },
        safe: themedColor("--color-safe"),
        ink: themedColor("--color-ink"),
        // Overriding the default slate scale so text-slate-* flips with the
        // theme too, since every component already uses those utilities.
        slate: {
          200: themedColor("--color-slate-200"),
          300: themedColor("--color-slate-300"),
          400: themedColor("--color-slate-400"),
          500: themedColor("--color-slate-500"),
          600: themedColor("--color-slate-600")
        }
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"]
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(62,230,196,0.15), 0 0 24px rgba(62,230,196,0.08)"
      }
    }
  },
  plugins: []
};
