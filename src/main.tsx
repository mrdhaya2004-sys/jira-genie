import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  document.body.innerHTML = '<div style="min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a">Test Zone could not start. Please reload the page.</div>';
} else {
  window.addEventListener("error", (event) => {
    console.error("[Test Zone] Unhandled runtime error", event.error || event.message);
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("[Test Zone] Unhandled promise rejection", event.reason);
  });

  createRoot(rootElement).render(<App />);
}
