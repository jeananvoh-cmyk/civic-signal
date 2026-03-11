import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, UserPlus, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

const AuthCTABar = () => {
  const { user, loading } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (loading || user || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 1.5 }}
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg shadow-lg"
      >
        <div className="container flex items-center justify-between gap-4 py-3">
          {/* Left: branding hint */}
          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex h-7 w-7 items-center justify-center rounded-md gradient-hero">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Rejoins la communauté{" "}
              <span className="text-water font-semibold">SIGNA-CI</span>
            </p>
          </div>

          {/* Center: mobile text */}
          <p className="text-xs text-muted-foreground sm:hidden flex-1">
            Connecte-toi pour signaler des coupures
          </p>

          {/* Right: CTA buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button asChild variant="outline" size="sm" className="text-xs h-8 px-3">
              <Link to="/auth?tab=login">
                <LogIn className="h-3.5 w-3.5 mr-1.5" />
                Connexion
              </Link>
            </Button>
            <Button asChild size="sm" className="text-xs h-8 px-3 bg-water text-water-foreground hover:bg-water/90">
              <Link to="/auth?tab=signup">
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Créer un compte
              </Link>
            </Button>
            <button
              onClick={() => setDismissed(true)}
              className="ml-1 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AuthCTABar;
