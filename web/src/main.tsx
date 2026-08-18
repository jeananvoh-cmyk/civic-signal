import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply saved theme immediately to prevent flash
const savedTheme = localStorage.getItem("theme") || "system";
const isDark =
  savedTheme === "dark" ||
  (savedTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
if (isDark) document.documentElement.classList.add("dark");

// Auto-recover from stale chunks after new deployments
window.addEventListener("vite:preloadError", (event) => {
  console.warn("Nouveau déploiement détecté, rechargement automatique de l'application...", event);
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(<App />);
