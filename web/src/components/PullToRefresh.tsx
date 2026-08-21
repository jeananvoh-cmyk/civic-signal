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
  const isAtTop = useRef(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      // Activer uniquement au sommet absolu
      if (window.scrollY === 0 || document.documentElement.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        isAtTop.current = true;
      } else {
        isAtTop.current = false;
        startY.current = null;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isAtTop.current || startY.current === null) return;
      if (window.scrollY > 0 || document.documentElement.scrollTop > 0) {
        isAtTop.current = false;
        setPullY(0);
        return;
      }
      const currentY = e.touches[0].clientY;
      const delta = currentY - startY.current;
      if (delta > 0) {
        // Défilement vers le bas au sommet absolu
        const pulled = Math.min(delta * 0.4, MAX_PULL);
        setPullY(pulled);
      } else {
        setPullY(0);
      }
    };

    const onTouchEnd = () => {
      if (isAtTop.current && pullY >= THRESHOLD && !refreshing) {
        setRefreshing(true);
        queryClient.invalidateQueries().finally(() => {
          setTimeout(() => {
            setRefreshing(false);
            setPullY(0);
          }, 400);
        });
      } else {
        setPullY(0);
      }
      startY.current = null;
      isAtTop.current = false;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [queryClient, refreshing, pullY]);

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
