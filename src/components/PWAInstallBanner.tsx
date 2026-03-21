import { useState } from "react";
import { X, Download, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { toast } from "sonner";

const DISMISSED_KEY = "pwa_banner_dismissed";

const PWAInstallBanner = () => {
  const { canInstall, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === "1",
  );

  if (!canInstall || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  const handleInstall = async () => {
    if (isIOS) {
      // iOS : on ne peut pas déclencher l'install programmatiquement → rediriger vers /install
      window.location.href = "/install";
      return;
    }
    const outcome = await install();
    if (outcome === "accepted") {
      toast.success("SIGNA-CI installée sur votre écran d'accueil !");
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pointer-events-none">
      <div className="max-w-lg mx-auto pointer-events-auto">
        <div className="rounded-2xl border border-primary/20 bg-card shadow-xl p-4 flex items-center gap-3">
          {/* Icône */}
          <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>

          {/* Texte */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">
              Installer SIGNA-CI
            </p>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">
              {isIOS
                ? "Ajoutez l'app à votre écran d'accueil via Safari → Partager"
                : "Accès rapide, notifications, mode hors-ligne"}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={handleInstall} className="gap-1.5 h-8 text-xs">
              {isIOS
                ? <><Share className="h-3.5 w-3.5" /> Guide</>
                : <><Download className="h-3.5 w-3.5" /> Installer</>}
            </Button>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallBanner;
