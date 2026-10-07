/** @type {import('tailwindcss').Config} */
// Colours are CSS variables (see src/index.css) so the light/dark toggle can swap them.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        white: v("white"),
        slate: { 200: v("slate-200"), 300: v("slate-300"), 400: v("slate-400"), 500: v("slate-500"), 600: v("slate-600") },
        base: { 950: v("base-950"), 900: v("base-900"), 850: v("base-850"), 800: v("base-800"), 700: v("base-700"), 600: v("base-600") },
        cyan: { accent: v("accent") },
        alert: { critical: v("critical"), high: v("high"), medium: v("high"), low: v("low") },
        safe: v("safe")
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
