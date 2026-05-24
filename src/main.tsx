import { createRoot } from "react-dom/client";
import "./index.css";

const rootElement = document.getElementById("root");

const renderBootFallback = (message = "Loading Test Zone…") => {
  if (!rootElement) return;
  rootElement.innerHTML = `
    <div role="status" aria-live="polite" style="min-height:100vh;display:grid;place-items:center;background:hsl(var(--background));color:hsl(var(--foreground));font-family:Inter,system-ui,sans-serif">
      <div style="display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center">
        <div style="height:48px;width:48px;border-radius:14px;background:hsl(var(--primary));box-shadow:0 14px 40px -18px hsl(var(--primary));display:grid;place-items:center;color:hsl(var(--primary-foreground));font-weight:700">TZ</div>
        <div style="height:6px;width:128px;overflow:hidden;border-radius:999px;background:hsl(var(--muted))">
          <div style="height:100%;width:50%;border-radius:999px;background:hsl(var(--primary));animation:pulse 1.4s ease-in-out infinite"></div>
        </div>
        <p style="margin:0;font-size:14px;color:hsl(var(--muted-foreground))">${message}</p>
      </div>
    </div>
  `;
};

if (!rootElement) {
  document.body.innerHTML = '<div style="min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a">Test Zone could not start. Please reload the page.</div>';
} else {
  renderBootFallback();

  window.addEventListener("error", (event) => {
    console.error("[Test Zone] Unhandled runtime error", event.error || event.message);
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("[Test Zone] Unhandled promise rejection", event.reason);
  });

  import("./App.tsx")
    .then(({ default: App }) => {
      createRoot(rootElement).render(<App />);
    })
    .catch((error) => {
      console.error("[Test Zone] Failed to load application shell", error);
      renderBootFallback("Test Zone could not finish loading. Please reload the page.");
    });
}
