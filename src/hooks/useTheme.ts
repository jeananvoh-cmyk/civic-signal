import { useEffect, useState, useRef } from "react";

type Theme = "light" | "dark" | "system";

const getSystemTheme = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const applyTheme = (t: Theme) => {
  const resolved = t === "system" ? getSystemTheme() : t;
  document.documentElement.classList.toggle("dark", resolved === "dark");
};

export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "system";
  });
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      const root = document.documentElement;
      root.classList.add("theme-transitioning");
      window.setTimeout(() => root.classList.remove("theme-transitioning"), 300);
    }
    applyTheme(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggleTheme = () =>
    setThemeState((prev) =>
      prev === "system" ? "light" : prev === "light" ? "dark" : "system"
    );

  return { theme, setTheme, toggleTheme };
};
