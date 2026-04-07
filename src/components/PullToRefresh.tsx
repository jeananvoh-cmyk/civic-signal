import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Native-like pull-to-refresh for PWA.
 * Wraps children and triggers window.location.reload() on pull ≥ threshold.
 */
const THRESHOLD = 72; // px to pull before triggering
const MAX_PULL  = 100;

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pullY, setPullY]       = useState(0);
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
      if (delta <= 0) { setPullY(0); return; }
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
        setTimeout(() => window.location.reload(), 600);
      } else {
        setPullY(0);
      }
      startY.current = null;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove",  onTouchMove,  { passive: false });
    document.addEventListener("touchend",   onTouchEnd);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove",  onTouchMove);
      document.removeEventListener("touchend",   onTouchEnd);
    };
  }, [pullY]);

  const progress = Math.min(pullY / THRESHOLD, 1);
  const ready    = pullY >= THRESHOLD;

  return (
    <>
      {/* Pull indicator */}
      {(pullY > 4 || refreshing) && (
        <div
          className="fixed top-0 inset-x-0 z-[9999] flex items-center justify-center pointer-events-none"
          style={{ height: `${Math.max(pullY, refreshing ? THRESHOLD : 0)}px`, transition: refreshing ? "height 0.2s" : "none" }}
        >
          <div
            className="flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold shadow-lg"
            style={{
              background: ready || refreshing ? "#1a2744" : "#f1f5f9",
              color: ready || refreshing ? "#fff" : "#64748b",
              opacity: Math.min(progress * 1.5, 1),
              transform: `scale(${0.7 + progress * 0.3})`,
              transition: "background 0.15s, color 0.15s",
            }}
          >
            <RefreshCw
              className="h-3.5 w-3.5"
              style={{
                transform: `rotate(${refreshing ? 360 : progress * 180}deg)`,
                transition: refreshing ? "transform 0.6s linear" : "none",
                animation: refreshing ? "spin 0.6s linear infinite" : "none",
              }}
            />
            {refreshing ? "Mise à jour…" : ready ? "Relâchez pour actualiser" : "Tirer pour actualiser"}
          </div>
        </div>
      )}

      {/* Push content down while pulling */}
      <div style={{ transform: `translateY(${pullY}px)`, transition: pullY === 0 ? "transform 0.3s ease" : "none" }}>
        {children}
      </div>
    </>
  );
}
