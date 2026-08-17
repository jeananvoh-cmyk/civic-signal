import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SignaLogo from "@/components/SignaLogo";
import { useState } from "react";
import { Copy, Check, Sparkles, Compass, Zap, Radio, Layers, Eye, Smartphone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const BrandPage = () => {
  const [copied, setCopied] = useState(false);
  const [bgMode, setBgMode] = useState<"dark" | "light" | "green" | "slate">("dark");

  const svgCode = `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="signaGradPrimary" x1="15" y1="10" x2="85" y2="95" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#10B981" />
      <stop offset="50%" stop-color="#0D9488" />
      <stop offset="100%" stop-color="#0284C7" />
    </linearGradient>
    <linearGradient id="signaGradSignal" x1="60" y1="20" x2="90" y2="50" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#EA580C" />
    </linearGradient>
  </defs>
  <path d="M 50 12 C 32 12 18 26 18 44 C 18 64 42 86 48 91.5 C 49.2 92.5 50.8 92.5 52 91.5 C 58 86 82 64 82 44 C 82 26 68 12 50 12 Z M 50 24 C 59 24 67 31 67 40 C 67 44 64 48 60 50 C 54 53 44 54 44 59 C 44 62 47 64 51 64 C 56 64 61 61 63 58 L 69 63 C 65 69 58 72 50 72 C 40 72 34 66 34 58 C 34 50 42 47 48 44 C 54 42 57 40 57 37 C 57 33 53 31 49 31 C 44 31 40 34 38 38 L 31 34 C 34 28 42 24 50 24 Z" fill="url(#signaGradPrimary)" />
  <path d="M 72 26 C 78 31 82 38 82 46 C 82 54 78 61 72 66" stroke="url(#signaGradSignal)" stroke-width="5" stroke-linecap="round" />
  <path d="M 83 18 C 91 25 96 35 96 46 C 96 57 91 67 83 74" stroke="url(#signaGradSignal)" stroke-width="5" stroke-linecap="round" />
</svg>`;

  const copySvg = () => {
    navigator.clipboard.writeText(svgCode);
    setCopied(true);
    toast.success("Code SVG copié dans le presse-papier !");
    setTimeout(() => setCopied(false), 2000);
  };

  const bgStyles = {
    dark: "bg-[#0B132B] text-white",
    light: "bg-white text-slate-900 border border-slate-200",
    green: "bg-[#064E3B] text-white",
    slate: "bg-[#F8FAFC] text-slate-900 border border-slate-200",
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 py-10 px-4 max-w-6xl mx-auto w-full">
        {/* Titre & Introduction */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Identité Visuelle & Logo Officiel SIGNA-CI
          </div>
          <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-foreground tracking-tight">
            Le Logo Définitif de <span className="text-emerald-600 dark:text-emerald-400">SIGNA</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            Inspiré des 5 meilleures Civic Techs mondiales (Thelma, FixMyStreet, Ushahidi, SeeClickFix, CitizenLab), 
            conçu pour être <strong>épuré, minimaliste, percutant et lisible</strong> à toutes les échelles.
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════════
            1. SHOWCASE VISUEL INTERACTIF (GRAND FORMAT)
           ══════════════════════════════════════════════════════════ */}
        <div className="bg-card border rounded-3xl p-6 sm:p-10 shadow-sm mb-12">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b pb-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Eye className="w-5 h-5 text-emerald-500" /> Aperçu Visuel en Direct
              </h2>
              <p className="text-xs text-muted-foreground">Testez le logo sur différents fonds et résolutions</p>
            </div>
            {/* Boutons de fond */}
            <div className="flex items-center gap-2 bg-muted p-1.5 rounded-xl text-xs font-semibold">
              <span>Fond :</span>
              <button
                onClick={() => setBgMode("dark")}
                className={`px-3 py-1 rounded-lg transition-all ${bgMode === "dark" ? "bg-slate-900 text-white shadow-xs" : "hover:text-foreground"}`}
              >
                Sombre
              </button>
              <button
                onClick={() => setBgMode("light")}
                className={`px-3 py-1 rounded-lg transition-all ${bgMode === "light" ? "bg-white text-slate-900 shadow-xs" : "hover:text-foreground"}`}
              >
                Blanc
              </button>
              <button
                onClick={() => setBgMode("green")}
                className={`px-3 py-1 rounded-lg transition-all ${bgMode === "green" ? "bg-emerald-900 text-white shadow-xs" : "hover:text-foreground"}`}
              >
                Vert Émeraude
              </button>
              <button
                onClick={() => setBgMode("slate")}
                className={`px-3 py-1 rounded-lg transition-all ${bgMode === "slate" ? "bg-slate-200 text-slate-900 shadow-xs" : "hover:text-foreground"}`}
              >
                Gris Doux
              </button>
            </div>
          </div>

          {/* Scène d'affichage principale */}
          <div className={`rounded-2xl p-8 sm:p-16 flex flex-col md:flex-row items-center justify-around gap-10 transition-colors duration-300 ${bgStyles[bgMode]}`}>
            {/* Grand Isotype */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-40 h-40 sm:w-48 sm:h-48 drop-shadow-md">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <defs>
                    <linearGradient id="demoGradPrimary" x1="15" y1="10" x2="85" y2="95" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#10B981" />
                      <stop offset="50%" stopColor="#0D9488" />
                      <stop offset="100%" stopColor="#0284C7" />
                    </linearGradient>
                    <linearGradient id="demoGradSignal" x1="60" y1="20" x2="90" y2="50" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#EA580C" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 50 12 C 32 12 18 26 18 44 C 18 64 42 86 48 91.5 C 49.2 92.5 50.8 92.5 52 91.5 C 58 86 82 64 82 44 C 82 26 68 12 50 12 Z M 50 24 C 59 24 67 31 67 40 C 67 44 64 48 60 50 C 54 53 44 54 44 59 C 44 62 47 64 51 64 C 56 64 61 61 63 58 L 69 63 C 65 69 58 72 50 72 C 40 72 34 66 34 58 C 34 50 42 47 48 44 C 54 42 57 40 57 37 C 57 33 53 31 49 31 C 44 31 40 34 38 38 L 31 34 C 34 28 42 24 50 24 Z"
                    fill="url(#demoGradPrimary)"
                  />
                  <path
                    d="M 72 26 C 78 31 82 38 82 46 C 82 54 78 61 72 66"
                    stroke="url(#demoGradSignal)"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 83 18 C 91 25 96 35 96 46 C 96 57 91 67 83 74"
                    stroke="url(#demoGradSignal)"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span className="text-xs font-mono opacity-60">Isotype Seul (192px)</span>
            </div>

            {/* Logo Complet avec Typographie */}
            <div className="flex flex-col items-center md:items-start gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0">
                  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <path
                      d="M 50 12 C 32 12 18 26 18 44 C 18 64 42 86 48 91.5 C 49.2 92.5 50.8 92.5 52 91.5 C 58 86 82 64 82 44 C 82 26 68 12 50 12 Z M 50 24 C 59 24 67 31 67 40 C 67 44 64 48 60 50 C 54 53 44 54 44 59 C 44 62 47 64 51 64 C 56 64 61 61 63 58 L 69 63 C 65 69 58 72 50 72 C 40 72 34 66 34 58 C 34 50 42 47 48 44 C 54 42 57 40 57 37 C 57 33 53 31 49 31 C 44 31 40 34 38 38 L 31 34 C 34 28 42 24 50 24 Z"
                      fill="url(#demoGradPrimary)"
                    />
                    <path
                      d="M 72 26 C 78 31 82 38 82 46 C 82 54 78 61 72 66"
                      stroke="url(#demoGradSignal)"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 83 18 C 91 25 96 35 96 46 C 96 57 91 67 83 74"
                      stroke="url(#demoGradSignal)"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div>
                  <div className="text-3xl sm:text-5xl font-display font-black tracking-tight">
                    SIGNA<span className="text-emerald-500">.ci</span>
                  </div>
                  <div className="text-xs sm:text-sm font-semibold tracking-widest uppercase opacity-75 mt-1">
                    Civic Tech Côte d'Ivoire
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono opacity-60">Format Header & Documents</span>
            </div>

            {/* Mockup Icône Mobile (Squircle) */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl bg-slate-900 shadow-xl border border-white/10 flex items-center justify-center p-4">
                <div className="w-full h-full">
                  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    <path
                      d="M 50 12 C 32 12 18 26 18 44 C 18 64 42 86 48 91.5 C 49.2 92.5 50.8 92.5 52 91.5 C 58 86 82 64 82 44 C 82 26 68 12 50 12 Z M 50 24 C 59 24 67 31 67 40 C 67 44 64 48 60 50 C 54 53 44 54 44 59 C 44 62 47 64 51 64 C 56 64 61 61 63 58 L 69 63 C 65 69 58 72 50 72 C 40 72 34 66 34 58 C 34 50 42 47 48 44 C 54 42 57 40 57 37 C 57 33 53 31 49 31 C 44 31 40 34 38 38 L 31 34 C 34 28 42 24 50 24 Z"
                      fill="url(#demoGradPrimary)"
                    />
                    <path
                      d="M 72 26 C 78 31 82 38 82 46 C 82 54 78 61 72 66"
                      stroke="url(#demoGradSignal)"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 83 18 C 91 25 96 35 96 46 C 96 57 91 67 83 74"
                      stroke="url(#demoGradSignal)"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
              <span className="text-xs font-mono opacity-60 flex items-center gap-1">
                <Smartphone className="w-3 h-3" /> App Icon (iOS/Android)
              </span>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={copySvg} variant="outline" size="sm" className="gap-2">
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "SVG Copié !" : "Copier le code SVG"}
            </Button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            2. ANATOMIE DU LOGO : POURQUOI IL EST SIMPLE & EFFICACE
           ══════════════════════════════════════════════════════════ */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold tracking-tight mb-6">Anatomie & Simplicité du Logo</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card border rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">1. Le Pin de Proximité</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Forme universelle de cartographie. Dès le premier regard, l'utilisateur comprend qu'il s'agit de géolocaliser une panne, un poteau ou une fuite près de chez lui.
              </p>
            </div>

            <div className="bg-card border rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">2. Le "S" Dynamique</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Le monogramme central forme un "S" naturel pour SIGNA. Sa courbe fluide symbolise la rapidité et la transmission sans obstacle.
              </p>
            </div>

            <div className="bg-card border rounded-2xl p-6">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4">
                <Radio className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">3. Les 2 Ondes d'Alerte</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Deux arcs concentriques solaires. Ils évoquent la diffusion du signal vers les voisins et les régies partenaires (CIE, SODECI, Mairies).
              </p>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            3. PALETTE CHROMATIQUE OFFICIELLE
           ══════════════════════════════════════════════════════════ */}
        <div className="bg-card border rounded-3xl p-6 sm:p-8 mb-12">
          <h2 className="text-2xl font-bold tracking-tight mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-500" /> Palette Chromatique Métier
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Chaque couleur représente une fonction vitale de l'application et de la cité :
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-2xl p-4 border bg-background">
              <div className="h-16 rounded-xl bg-[#10B981] mb-3 shadow-inner" />
              <div className="font-bold text-sm">Vert Émeraude</div>
              <div className="font-mono text-xs text-muted-foreground">#10B981</div>
              <div className="text-xs text-muted-foreground mt-1">Citoyenneté & Propreté</div>
            </div>

            <div className="rounded-2xl p-4 border bg-background">
              <div className="h-16 rounded-xl bg-[#0284C7] mb-3 shadow-inner" />
              <div className="font-bold text-sm">Cyan Azur</div>
              <div className="font-mono text-xs text-muted-foreground">#0284C7</div>
              <div className="text-xs text-muted-foreground mt-1">Eau & SODECI</div>
            </div>

            <div className="rounded-2xl p-4 border bg-background">
              <div className="h-16 rounded-xl bg-[#F59E0B] mb-3 shadow-inner" />
              <div className="font-bold text-sm">Or Solaire</div>
              <div className="font-mono text-xs text-muted-foreground">#F59E0B</div>
              <div className="text-xs text-muted-foreground mt-1">Électricité & CIE</div>
            </div>

            <div className="rounded-2xl p-4 border bg-background">
              <div className="h-16 rounded-xl bg-[#0F172A] mb-3 shadow-inner" />
              <div className="font-bold text-sm">Ardoise Nuit</div>
              <div className="font-mono text-xs text-muted-foreground">#0F172A</div>
              <div className="text-xs text-muted-foreground mt-1">Fond & Typographie</div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            4. BENCHMARK COMPARATIF DES 5 LOGOS CIVIC TECH
           ══════════════════════════════════════════════════════════ */}
        <div className="border rounded-3xl p-6 sm:p-8 bg-muted/40">
          <h2 className="text-2xl font-bold tracking-tight mb-2 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" /> Comparatif avec les 5 Références Mondiales
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Pourquoi le logo SIGNA-CI se positionne au même niveau d'exigence graphique :
          </p>

          <div className="space-y-4">
            <div className="bg-card border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="font-bold text-foreground">1. Thelma (ex-TellMyCity, France)</span>
                <p className="text-xs text-muted-foreground mt-0.5">Symbole : Pin + Ondes sonores | Couleurs : Vert d'eau & Corail</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Inspiration : Fusion Pin + Signal
              </span>
            </div>

            <div className="bg-card border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="font-bold text-foreground">2. FixMyStreet (Royaume-Uni, mySociety)</span>
                <p className="text-xs text-muted-foreground mt-0.5">Symbole : Clé mécanique + Épingle | Couleurs : Rouge & Bleu</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                Inspiration : Dimension utilitaire directe
              </span>
            </div>

            <div className="bg-card border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="font-bold text-foreground">3. Ushahidi (Kenya / Afrique)</span>
                <p className="text-xs text-muted-foreground mt-0.5">Symbole : Globe rayonnant | Couleurs : Orange savane & Noir</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                Inspiration : Chaleur & communauté en temps réel
              </span>
            </div>

            <div className="bg-card border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="font-bold text-foreground">4. SeeClickFix (États-Unis, CivicPlus)</span>
                <p className="text-xs text-muted-foreground mt-0.5">Symbole : Viseur avec Checkmark | Couleurs : Bleu royal & Vert</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-500/10 text-teal-600 border border-teal-500/20">
                Inspiration : Résolution & impact vérifié
              </span>
            </div>

            <div className="bg-card border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="font-bold text-foreground">5. CitizenLab (Belgique / Europe)</span>
                <p className="text-xs text-muted-foreground mt-0.5">Symbole : Boucles géométriques continues | Couleurs : Violet & Cyan</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
                Inspiration : Minimalisme moderne & scalabilité
              </span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BrandPage;
