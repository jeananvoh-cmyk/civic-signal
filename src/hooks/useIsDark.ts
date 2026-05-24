import { useEffect, useState } from "react";

export function useIsDark() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const mo = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark")),
    );
    mo.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  return isDark;
}
