import { useState, useEffect } from "react";
import { Download, Smartphone, Share, MoreVertical, Plus, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPage = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-4">
            <Download className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Installer SIGNA-CI</h1>
          <p className="text-muted-foreground">
            Accédez rapidement à l'application depuis votre écran d'accueil
          </p>
        </div>

        {/* Already installed */}
        {isInstalled && (
          <Card className="mb-6 border-success/30 bg-success/5">
            <CardContent className="flex items-center gap-3 py-4">
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                <Check className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="font-medium text-success">Application installée !</p>
                <p className="text-sm text-muted-foreground">
                  SignalÉnergie est sur votre écran d'accueil
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Direct install button (Android/Desktop Chrome) */}
        {deferredPrompt && !isInstalled && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="py-6 text-center">
              <Button size="lg" onClick={handleInstall} className="gap-2">
                <Download className="h-5 w-5" />
                Installer maintenant
              </Button>
              <p className="text-sm text-muted-foreground mt-3">
                Installation rapide en un clic
              </p>
            </CardContent>
          </Card>
        )}

        {/* iOS Instructions */}
        {isIOS && !isInstalled && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Sur iPhone / iPad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Step 
                number={1} 
                icon={<Share className="h-5 w-5" />}
                title="Appuyez sur Partager"
                description="En bas de Safari, touchez l'icône de partage"
              />
              <Step 
                number={2} 
                icon={<Plus className="h-5 w-5" />}
                title="Sur l'écran d'accueil"
                description="Faites défiler et appuyez sur « Sur l'écran d'accueil »"
              />
              <Step 
                number={3} 
                icon={<Check className="h-5 w-5" />}
                title="Confirmez"
                description="Appuyez sur « Ajouter » en haut à droite"
              />
            </CardContent>
          </Card>
        )}

        {/* Android Instructions */}
        {!isIOS && !deferredPrompt && !isInstalled && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Sur Android
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Step 
                number={1} 
                icon={<MoreVertical className="h-5 w-5" />}
                title="Menu du navigateur"
                description="Appuyez sur les 3 points en haut à droite de Chrome"
              />
              <Step 
                number={2} 
                icon={<Plus className="h-5 w-5" />}
                title="Ajouter à l'écran d'accueil"
                description="Sélectionnez « Ajouter à l'écran d'accueil » ou « Installer l'application »"
              />
              <Step 
                number={3} 
                icon={<Check className="h-5 w-5" />}
                title="Confirmez"
                description="Appuyez sur « Ajouter » pour confirmer"
              />
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle>Pourquoi installer l'app ?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <Benefit text="Accès rapide depuis l'écran d'accueil" />
              <Benefit text="Fonctionne même hors connexion" />
              <Benefit text="Chargement ultra-rapide" />
              <Benefit text="Expérience plein écran sans barre d'adresse" />
              <Benefit text="Signaler une coupure en 15 secondes" />
            </ul>
          </CardContent>
        </Card>

        {/* APK note */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          📱 Une version APK pour Android sera bientôt disponible pour les testeurs.
        </p>
      </main>
    </div>
  );
};

const Step = ({ number, icon, title, description }: { 
  number: number; 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) => (
  <div className="flex items-start gap-4">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
      {number}
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2 font-medium">
        {icon}
        {title}
      </div>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  </div>
);

const Benefit = ({ text }: { text: string }) => (
  <li className="flex items-center gap-3">
    <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
    <span>{text}</span>
  </li>
);

export default InstallPage;
