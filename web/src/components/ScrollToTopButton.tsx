import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Visible après 250px de défilement vers le bas
      setVisible(window.scrollY > 250);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          onClick={scrollToTop}
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "fixed right-4 z-40 flex h-11 w-11 items-center justify-center rounded-2xl",
            "bg-slate-900/90 dark:bg-slate-800/90 text-white shadow-xl backdrop-blur-md",
            "border border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-600 dark:hover:bg-emerald-500",
            "transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer group",
            // Position au-dessus de la BottomNav sur mobile (BottomNav = ~64px) et en bas à droite sur desktop
            "bottom-20 md:bottom-6"
          )}
          title="Retour en haut de la page"
          aria-label="Retour en haut de la page"
        >
          <ArrowUp className="h-5 w-5 transition-transform duration-200 group-hover:-translate-y-0.5 text-emerald-400 group-hover:text-white" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
