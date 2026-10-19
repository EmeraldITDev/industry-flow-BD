import React from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

registerSW({ immediate: true });

// A lazy page chunk can disappear after a deploy while an old tab is open;
// reload once to pick up the new build instead of showing a broken screen.
window.addEventListener("vite:preloadError", (event) => {
  const key = "chunk-reload-at";
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(key) || 0);
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // Storage unavailable: still reload, the timestamp guard is best-effort.
  }
  if (Date.now() - last > 10_000) {
    event.preventDefault();
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
