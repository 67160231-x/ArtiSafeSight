import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { applyTheme, getStoredTheme } from "./theme.js";
import "./index.css";

// Apply the saved theme before the first paint so there's no flash of the
// wrong theme on reload.
applyTheme(getStoredTheme());

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
