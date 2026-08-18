import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Native-like pull-to-refresh for PWA / Web.
 * Invalidates active query caches smoothly without hard browser crashes.
 */
const THRESHOLD = 72; // px to pull before triggering
const MAX_PULL = 100;

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pulling = useRef(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      // Only activate when scrolled to very top
      if (window.scrollY > 4) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        setPullY(0);
        return;
      }
      // Rubber-band resistance
      const pulled = Math.min(delta * 0.5, MAX_PULL);
      setPullY(pulled);
      if (pulled > 8) e.preventDefault(); // prevent default scroll
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullY >= THRESHOLD) {
        setRefreshing(true);
        // Rafraîchissement propre des requêtes en cours sans recharger toute la page
        queryClient.invalidateQueries().finally(() => {
          setTimeout(() => {
            setRefreshing(false);
            setPullY(0);
          }, 500);
        });
      } else {
        setPullY(0);
      }
      startY.current = null;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullY, queryClient]);

  const progress = Math.min(pullY / THRESHOLD, 1);
  const ready = pullY >= THRESHOLD;

  return (
    <>
      {/* Visual pull indicator */}
      {(pullY > 0 || refreshing) && (
        <div
          className="fixed top-0 inset-x-0 z-50 flex items-center justify-center pointer-events-none transition-transform duration-75"
          style={{
            transform: `translateY(${refreshing ? 16 : Math.max(0, pullY * 0.55 - 20)}px)`,
          }}
          aria-hidden="true"
        >
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full shadow-lg text-xs font-semibold backdrop-blur-md transition-colors ${
              ready || refreshing
                ? "bg-primary text-primary-foreground shadow-primary/30"
                : "bg-card/90 text-muted-foreground border border-border"
            }`}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              style={{
                transform: refreshing ? undefined : `rotate(${progress * 270}deg)`,
                transition: refreshing ? undefined : "transform 0.05s linear",
              }}
            />
            <span>{refreshing ? "Actualisation..." : ready ? "Relâcher pour actualiser" : "Tirer pour actualiser"}</span>
          </div>
        </div>
      )}

      {children}
    </>
  );
}
