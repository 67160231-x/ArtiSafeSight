/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // ArtiSafeSight safety-tech palette
        base: {
          950: "#05080d",
          900: "#0a0f18",
          850: "#0d1420",
          800: "#111a28",
          700: "#182233",
          600: "#243044"
        },
        cyan: {
          accent: "#3ee6c4"
        },
        alert: {
          critical: "#ef4a4a",
          high: "#f0a63b",
          medium: "#f0a63b",
          low: "#f0d43b"
        },
        safe: "#3ecf8e"
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
