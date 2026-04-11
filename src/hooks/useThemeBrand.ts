import { useEffect, useState } from "react";

const STORAGE_KEY = "signa_brand_theme";
type BrandTheme = "default" | "ivoire";

export function useThemeBrand() {
  const [theme, setTheme] = useState<BrandTheme>(() => {
    return (localStorage.getItem(STORAGE_KEY) as BrandTheme) || "ivoire";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "ivoire") {
      root.classList.add("theme-ivoire");
    } else {
      root.classList.remove("theme-ivoire");
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "ivoire" ? "default" : "ivoire"));
  const isIvoire = theme === "ivoire";

  return { theme, toggle, isIvoire };
}
