import { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  Printer, Share2, Download, Copy, Check, MapPin,
  Building2, Zap, Droplets, Wrench, Trash2, Lightbulb,
  Sparkles, MessageCircle, AlertCircle, Info, ExternalLink,
  ChevronRight, CheckCircle2, ShieldCheck, HeartHandshake
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SignaLogo from "@/components/SignaLogo";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { COMMUNES } from "@/lib/communes";
import { COMMUNE_LOGOS } from "@/lib/commune-logos";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "sonner";

// ─── Thèmes d'Affiches ────────────────────────────────────────────────────────

const POSTER_THEMES = [
  {
    id: "general",
    label: "🌟 Général (Toutes pannes & Voirie)",
    headline: "Une panne d'eau, de courant ou un nid-de-poule ?",
    subhead: "Documentons-le ensemble pour accélérer la réparation !",
    icon: Sparkles,
    badgeText: "CIE · SODECI · MAIRIE",
    accentBg: "bg-emerald-600",
    accentBorder: "border-emerald-600",
    accentText: "text-emerald-700",
  },
  {
    id: "water",
    label: "💧 Eau Potable & Pénuries (SODECI)",
    headline: "Coupure d'eau ou fuite sur la chaussée ?",
    subhead: "Alertez le quartier et la SODECI en 30 secondes !",
    icon: Droplets,
    badgeText: "URGENCE EAU POTABLE · SODECI",
    accentBg: "bg-blue-600",
    accentBorder: "border-blue-600",
    accentText: "text-blue-700",
  },
  {
    id: "electricity",
    label: "⚡ Électricité & Lampadaires (CIE / Mairie)",
    headline: "Coupure de courant ou lampadaire éteint ?",
    subhead: "Flashez pour informer le quartier et lancer l'alerte !",
    icon: Zap,
    badgeText: "ÉLECTRICITÉ & ÉCLAIRAGE PUBLIC",
    accentBg: "bg-amber-600",
    accentBorder: "border-amber-600",
    accentText: "text-amber-700",
  },
  {
    id: "infrastructure",
    label: "🚧 Voirie, Caniveaux & Salubrité (Mairie)",
    headline: "Chaussée dégradée, caniveau bouché ou ordures ?",
    subhead: "Transmettez l'incident directement aux Services Techniques !",
    icon: Wrench,
    badgeText: "SERVICES TECHNIQUES MUNICIPAUX",
    accentBg: "bg-teal-700",
    accentBorder: "border-teal-700",
    accentText: "text-teal-800",
  },
];

const POPULAR_QUARTIERS_BY_COMMUNE: Record<string, string[]> = {
  Cocody: ["Angré 8e Tranche", "Angré Château", "Riviera Palmeraie", "Riviera Golf", "Deux-Plateaux Vallons", "Danga", "Ambassades", "Blockhauss", "M'Pouto", "Anono"],
  Yopougon: ["Niangon Lokoa", "Niangon Sud", "Toit Rouge", "Maroc", "Selmer", "Siporex", "Zone Industrielle", "Wassakara", "Port-Bouët 2", "Kouté"],
  Abobo: ["Abobo Baoulé", "PK 18", "Avocatier", "Sogefiha", "Gare", "Belleville", "BCET", "Dokui", "Anonkoua Kouté"],
  Marcory: ["Zone 4C", "Zone 4", "Biétry", "Anoumabo", "Aliodan", "GFCI", "Hibiscus", "Champroux"],
  Plateau: ["Centre des Affaires", "Cité Administrative", "Commerce", "Gare Lagunaire"],
  Treichville: ["Avenue 16", "Arras", "Zone Portuaire", "Belleville Treichville", "France-Amérique"],
  Koumassi: ["Remblais", "Camp Militaire", "Sopim", "Grand Campement", "Divo"],
  "Port-Bouët": ["Vridi", "Gonzagueville", "Derrière Wharf", "Adjouffou", "Phare", "Jean Folly"],
  Attécoubé: ["Agban", "Locodjro", "Santai", "Boribana", "Abobo-Doumé"],
  Adjamé: ["220 Logements", "Bracodi", "Williamsville", "Habitat", "Mairie Adjamé"],
  Bingerville: ["Gbagba", "Savane", "Blanchon", "Marché Bingerville", "Adjamé Bingerville"],
  Songon: ["Songon Agban", "Songon Kassemblé", "Songon Dagbé", "Songon M'Braté"],
  Anyama: ["Anyama Centre", "Belleville Anyama", "Zossonkoi", "Ahouabo", "Azaguié-Blida"],
};

export default function PostersPage() {
  const [selectedCommune, setSelectedCommune] = useState("Cocody");
  const [selectedQuartier, setSelectedQuartier] = useState("Angré 8e Tranche");
  const [customQuartier, setCustomQuartier] = useState("");
  const [selectedThemeId, setSelectedThemeId] = useState("general");
  const [copied, setCopied] = useState(false);

  usePageMeta({
    title: "Kit d'Affichage Terrain & QR Codes de Quartier — SIGNA.ci",
    description: "Générez et imprimez gratuitement des affiches citoyennes A4 avec QR Code pour votre cité, résidence, syndic, commerce ou quartier à Abidjan.",
  });

  const activeTheme = useMemo(
    () => POSTER_THEMES.find((t) => t.id === selectedThemeId) || POSTER_THEMES[0],
    [selectedThemeId]
  );

  const finalQuartier = useMemo(
    () => (customQuartier.trim() ? customQuartier.trim() : selectedQuartier),
    [customQuartier, selectedQuartier]
  );

  // URL directe de signalement géolocalisée et pré-remplie
  const targetUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("commune", selectedCommune);
    if (finalQuartier) params.set("quartier", finalQuartier);
    if (activeTheme.id !== "general") params.set("category", activeTheme.id);
    return `https://signa.ci/signaler?${params.toString()}`;
  }, [selectedCommune, finalQuartier, activeTheme]);

  const communeLogo = COMMUNE_LOGOS[selectedCommune];
  const activeCommuneObj = COMMUNES.find((c) => c.nom === selectedCommune);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    toast.success("Lien direct copié dans le presse-papier !");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = `📢 *Voisins de ${finalQuartier} (${selectedCommune})* :\n\nPour signaler et faire réparer rapidement nos coupures d'eau, de courant ou les pannes de voirie auprès de la Mairie, de la CIE et de la SODECI, documentons-les directement sur SIGNA.ci :\n👉 ${targetUrl}\n\n_Gratuit, sans inscription et utile pour tout le quartier !_`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="print:hidden">
        <Header />
      </div>

      <main className="container max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 print:p-0 print:m-0 print:max-w-none">
        
        {/* ─── Bannière d'Introduction (Masquée à l'impression) ─── */}
        <div className="print:hidden rounded-3xl border border-border bg-gradient-to-r from-emerald-500/15 via-card to-card p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Kit de Mobilisation Citoyenne &amp; Terrain
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight">
              Générateur d'Affiches &amp; QR Codes A4
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Imprimez et collez ces affiches dans votre <strong>hall d'immeuble, syndic de cité, pharmacie, commerce de quartier ou chefferie</strong> pour permettre aux riverains de documenter les pannes en 1 flash.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={handlePrint}
              className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs h-11 px-5 gap-2 shadow-lg shadow-emerald-600/25"
            >
              <Printer className="h-4 w-4" />
              Imprimer l'Affiche (A4)
            </Button>
          </div>
        </div>

        {/* ─── Grille : Panneau de Contrôle vs Aperçu A4 ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Colonne Gauche : Configuration (Masquée à l'impression) */}
          <div className="lg:col-span-5 space-y-6 print:hidden">
            <Card className="rounded-3xl border border-border p-6 space-y-5 bg-card shadow-sm">
              <h2 className="font-extrabold text-foreground text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Personnaliser votre affiche
              </h2>

              {/* 1. Sélecteur Commune */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  1. Commune d'Abidjan
                </label>
                <Select
                  value={selectedCommune}
                  onValueChange={(c) => {
                    setSelectedCommune(c);
                    const quartiers = POPULAR_QUARTIERS_BY_COMMUNE[c] || [];
                    if (quartiers.length > 0) setSelectedQuartier(quartiers[0]);
                    setCustomQuartier("");
                  }}
                >
                  <SelectTrigger className="h-11 rounded-2xl bg-muted/40 font-semibold text-xs">
                    <SelectValue placeholder="Sélectionner une commune" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {COMMUNES.map((c) => (
                      <SelectItem key={c.id} value={c.nom} className="text-xs font-medium">
                        Mairie de {c.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 2. Sélecteur Quartier */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">
                  2. Quartier / Cité / Résidence
                </label>
                <Select
                  value={selectedQuartier}
                  onValueChange={(q) => {
                    setSelectedQuartier(q);
                    setCustomQuartier("");
                  }}
                >
                  <SelectTrigger className="h-11 rounded-2xl bg-muted/40 font-semibold text-xs">
                    <SelectValue placeholder="Quartier suggéré" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {(POPULAR_QUARTIERS_BY_COMMUNE[selectedCommune] || []).map((q) => (
                      <SelectItem key={q} value={q} className="text-xs">
                        {q}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="pt-1">
                  <span className="text-[11px] text-muted-foreground block mb-1">
                    Ou nom exact de votre cité / rue :
                  </span>
                  <Input
                    placeholder="Ex: Cité Verte Bat A, Rue des Jardins, Cité SIR..."
                    value={customQuartier}
                    onChange={(e) => setCustomQuartier(e.target.value)}
                    className="h-10 rounded-xl text-xs bg-muted/40"
                  />
                </div>
              </div>

              {/* 3. Thématique */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  3. Thématique &amp; Message d'accroche
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {POSTER_THEMES.map((theme) => {
                    const isSelected = selectedThemeId === theme.id;
                    const Icon = theme.icon;
                    return (
                      <div
                        key={theme.id}
                        onClick={() => setSelectedThemeId(theme.id)}
                        className={`cursor-pointer p-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border/70 hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background border border-border shadow-xs shrink-0">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <div className="text-xs font-bold text-foreground truncate">{theme.label}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{theme.headline}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Boutons d'Action & Partage */}
              <div className="pt-4 border-t border-border space-y-2.5">
                <Button
                  onClick={handlePrint}
                  className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs gap-2 shadow-md"
                >
                  <Printer className="h-4 w-4" />
                  Imprimer l'Affiche A4
                </Button>

                <Button
                  variant="outline"
                  onClick={handleShareWhatsApp}
                  className="w-full h-11 rounded-2xl border-[#25D366]/40 hover:border-[#25D366] hover:bg-[#25D366]/10 text-foreground font-bold text-xs gap-2"
                >
                  <div className="h-5 w-5 rounded-full flex items-center justify-center">
                    <WhatsAppIcon className="h-4 w-4" />
                  </div>
                  Partager dans le Groupe WhatsApp des Voisins
                </Button>

                <Button
                  variant="ghost"
                  onClick={handleCopyLink}
                  className="w-full h-9 rounded-xl text-[11px] text-muted-foreground hover:text-foreground font-semibold gap-1.5"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Lien copié !" : "Copier le lien direct du quartier"}
                </Button>
              </div>
            </Card>

            {/* Conseils d'Affichage Terrain */}
            <Card className="rounded-3xl border border-border p-5 bg-muted/20 space-y-3 text-xs text-muted-foreground">
              <h3 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Info className="h-4 w-4 text-primary" />
                Où coller cette affiche ?
              </h3>
              <ul className="space-y-1.5 list-disc pl-4 text-[11px]">
                <li><strong>Halls d'immeubles &amp; ascenseurs</strong> (avec l'accord du syndic).</li>
                <li><strong>Panneaux d'affichage des cités fermées</strong> et postes de garde.</li>
                <li><strong>Pharmacies, boulangeries et supérettes</strong> de votre rue.</li>
                <li><strong>Chefferies de village et maisons de quartier</strong>.</li>
              </ul>
            </Card>
          </div>

          {/* Colonne Droite : L'Affiche A4 (Imprimable en Pleine Page) */}
          <div className="lg:col-span-7 flex justify-center w-full">
            <div
              id="printable-poster"
              className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-950 p-8 sm:p-12 rounded-3xl sm:rounded-none shadow-2xl border border-slate-200 print:border-none print:shadow-none print:p-8 print:w-full print:max-w-none flex flex-col justify-between"
              style={{
                fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                color: "#0f172a",
                backgroundColor: "#ffffff",
              }}
            >
              
              {/* ── 1. En-tête Bicolore République & Commune ── */}
              <div className="space-y-6">
                
                {/* Ligne Tricolore Orange / Blanc / Vert */}
                <div className="h-2 w-full rounded-full bg-gradient-to-r from-[#FF8200] via-white to-[#009A44] border border-slate-200" />

                <div className="flex items-center justify-between gap-4 pb-4 border-b-2 border-slate-900">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl overflow-hidden border border-slate-200 p-1 flex items-center justify-center bg-white shadow-xs">
                      {communeLogo ? (
                        <img src={communeLogo} alt={selectedCommune} className="h-full w-full object-contain" />
                      ) : (
                        <Building2 className="h-8 w-8 text-emerald-700" />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase block">
                        RÉPUBLIQUE DE CÔTE D'IVOIRE · DISTRICT D'ABIDJAN
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                        MAIRIE DE {selectedCommune}
                      </h2>
                    </div>
                  </div>

                  <div className="text-right">
                    <SignaLogo size="sm" />
                    <span className="text-[9px] font-bold text-emerald-700 block mt-0.5 tracking-wider uppercase">
                      Plateforme Citoyenne
                    </span>
                  </div>
                </div>

                {/* ── 2. Accroche & Localisation Quartier ── */}
                <div className="text-center space-y-3 py-2">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 text-white text-xs font-black uppercase tracking-widest">
                    <MapPin className="h-3.5 w-3.5 text-[#FF8200]" />
                    QUARTIER : {finalQuartier}
                  </div>

                  <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight">
                    {activeTheme.headline}
                  </h1>

                  <p className="text-sm sm:text-base font-semibold text-slate-600 max-w-lg mx-auto leading-normal">
                    {activeTheme.subhead}
                  </p>
                </div>

                {/* ── 3. Le Grand QR Code Central ── */}
                <div className="my-6 p-6 rounded-3xl border-4 border-slate-900 bg-slate-50 flex flex-col items-center justify-center space-y-4 text-center shadow-inner">
                  <div className="p-4 bg-white rounded-2xl shadow-md border-2 border-slate-300">
                    <QRCodeSVG
                      value={targetUrl}
                      size={200}
                      level="H"
                      includeMargin={false}
                      imageSettings={{
                        src: "https://raw.githubusercontent.com/jeananvoh-cmyk/civic-signal/main/web/public/favicon.svg",
                        x: undefined,
                        y: undefined,
                        height: 38,
                        width: 38,
                        excavate: true,
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide">
                      SCANNEZ AVEC VOTRE SMARTPHONE
                    </div>
                    <div className="text-xs font-bold text-emerald-700">
                      👉 Aucun téléchargement · 100% Gratuit · Sans inscription obligatoire
                    </div>
                  </div>
                </div>

                {/* ── 4. Les 3 Étapes Simples ── */}
                <div className="grid grid-cols-3 gap-3 text-center py-2">
                  <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200">
                    <div className="text-lg font-black text-slate-900 mb-1">1. 📸</div>
                    <div className="text-[11px] font-extrabold text-slate-900 uppercase">Prenez en photo</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Le lampadaire, la fuite ou le nid-de-poule</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200">
                    <div className="text-lg font-black text-slate-900 mb-1">2. 📍</div>
                    <div className="text-[11px] font-extrabold text-slate-900 uppercase">Localisez</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Localisation précise dans notre quartier</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200">
                    <div className="text-lg font-black text-slate-900 mb-1">3. 🔔</div>
                    <div className="text-[11px] font-extrabold text-slate-900 uppercase">Alertez</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">La Mairie, la CIE et la SODECI sont notifiées</div>
                  </div>
                </div>

              </div>

              {/* ── 5. Bas de Page Institutionnel & Données ── */}
              <div className="pt-6 border-t-2 border-slate-900 mt-6 space-y-3 text-center">
                <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  <span>🏢 MAIRIE DE {selectedCommune}</span>
                  <span>•</span>
                  <span>⚡ CIE (ÉLECTRICITÉ)</span>
                  <span>•</span>
                  <span>💧 SODECI (EAU POTABLE)</span>
                  <span>•</span>
                  <span>🏛️ RÉGULATEURS ANARE &amp; ONEP</span>
                </div>

                <div className="text-[9px] text-slate-500 leading-tight">
                  Affiche éditée pour le quartier <strong>{finalQuartier}</strong> · Initiative civique d'intérêt général · <strong>SIGNA.ci</strong>
                  <br />
                  Données protégées conformément à la Loi n° 2013-450 sur la protection des données à caractère personnel.
                </div>
              </div>

            </div>
          </div>

        </div>

      </main>

      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}
