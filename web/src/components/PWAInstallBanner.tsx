import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { X, Download, Share, Smartphone, Wifi, Bell, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { toast } from "sonner";

// Réapparaît après 3 jours si ignoré (pas définitivement dismissé)
const SNOOZED_KEY  = "pwa_banner_snoozed_until";
const DISMISSED_KEY = "pwa_banner_dismissed_v2";
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000; // 3 jours

function isSnoozed(): boolean {
  const until = localStorage.getItem(SNOOZED_KEY);
  if (!until) return false;
  return Date.now() < Number(until);
}

const PERKS = [
  { icon: Zap,       text: "Accès instantané depuis l'écran d'accueil" },
  { icon: Bell,      text: "Notifications dès qu'une coupure est résolue" },
  { icon: Wifi,      text: "Fonctionne même sans connexion internet" },
];

const PWAInstallBanner = () => {
  const navigate = useNavigate();
  const { canInstall, isIOS, install } = usePWAInstall();
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!canInstall) return;
    const dismissed = localStorage.getItem(DISMISSED_KEY) === "1";
    if (dismissed || isSnoozed()) return;
    // Délai de 4s avant d'apparaître pour ne pas gêner le chargement
    const t = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(t);
  }, [canInstall]);

  const handleSnooze = () => {
    localStorage.setItem(SNOOZED_KEY, String(Date.now() + SNOOZE_MS));
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  const handleInstall = async () => {
    if (isIOS) {
      setVisible(false);
      navigate("/installer");
      return;
    }
    setInstalling(true);
    const outcome = await install();
    setInstalling(false);
    if (outcome === "accepted") {
      toast.success("✅ SIGNA-CI installée sur votre écran d'accueil !");
      setVisible(false);
    } else {
      handleSnooze();
    }
  };

  if (!visible) return null;

  return createPortal(
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-[3px]"
            onClick={handleSnooze}
          />

          {/* Modal centré au milieu de l'écran — 100% visible sans scroll */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1,   y: 0 }}
              exit={{    opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="w-full max-w-sm rounded-3xl bg-card border border-border shadow-2xl overflow-hidden pointer-events-auto"
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-2 flex items-start gap-4">
                <div className="relative shrink-0">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-inner">
                    <Smartphone className="h-8 w-8 text-primary" />
                  </div>
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-50" />
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-primary" />
                  </span>
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className="font-extrabold text-lg text-foreground leading-tight">
                    Installer SIGNA-CI
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {isIOS
                      ? "Ajoutez l'app à votre écran d'accueil"
                      : "Gratuit · Rapide · Toujours disponible"}
                  </p>
                </div>
                <button
                  onClick={handleDismiss}
                  className="p-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors shrink-0 mt-0.5"
                  aria-label="Ne plus afficher"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Avantages */}
              <div className="px-6 py-4 space-y-2.5">
                {PERKS.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <p className="text-sm text-foreground">{text}</p>
                  </div>
                ))}
              </div>

              {/* iOS instructions */}
              {isIOS && (
                <div className="mx-6 mb-3 rounded-xl bg-muted/60 border border-border px-4 py-3">
                  <p className="text-xs font-semibold text-foreground mb-2">Comment installer sur iPhone / iPad :</p>
                  {[
                    { step: "1", text: "Appuyez sur le bouton Partager" },
                    { step: "2", text: "Choisissez « Sur l'écran d'accueil »" },
                    { step: "3", text: "Appuyez sur « Ajouter »" },
                  ].map(({ step, text }) => (
                    <div key={step} className="flex items-center gap-2 py-0.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                        {step}
                      </span>
                      <p className="text-xs text-foreground">{text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="px-6 pb-6 pt-1 flex flex-col gap-2">
                <Button
                  size="lg"
                  className="w-full gap-2 font-bold text-base rounded-xl shadow-lg shadow-primary/25"
                  onClick={handleInstall}
                  disabled={installing}
                >
                  {isIOS
                    ? <><Share className="h-5 w-5" /> Voir comment installer</>
                    : installing
                      ? "Installation…"
                      : <><Download className="h-5 w-5" /> Installer l'application</>}
                </Button>
                <button
                  onClick={handleSnooze}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  Me le rappeler dans 3 jours
                </button>
              </div>

            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default PWAInstallBanner;
