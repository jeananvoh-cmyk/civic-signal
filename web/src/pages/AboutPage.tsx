import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Shield, Users, MapPin, Zap, Droplets, Heart, ArrowRight,
  TrendingUp, Landmark, ExternalLink, Download, QrCode,
  Sparkles, CheckCircle2, Share2, Printer
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SignaLogo from "@/components/SignaLogo";
import { COMMUNES } from "@/lib/communes";
import { COMMUNE_LOGOS } from "@/lib/commune-logos";
import { usePageMeta } from "@/hooks/usePageMeta";

const AboutPage = () => {
  const [selectedPosterCommune, setSelectedPosterCommune] = useState<string>("Toutes les communes");

  usePageMeta({
    title: "À Propos de SIGNA.ci — Plateforme Citoyenne & Kit de Quartier",
    description: "Découvrez la mission de SIGNA.ci, première plateforme collaborative de signalement des pannes et infrastructures en Côte d'Ivoire. Téléchargez vos affiches de quartier.",
  });

  const handlePrintPoster = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          
          {/* En-tête Panoramique avec Logo & Vision */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-block mb-3">
              <SignaLogo size="lg" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-black tracking-widest text-emerald-700 dark:text-emerald-300 uppercase">
                CIVICTECH · SIGNALER · SUIVRE · RÉPARER
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mt-4 tracking-tight">
              L'engagement citoyen au service de nos infrastructures urbaines
            </h1>
            <p className="mt-4 text-muted-foreground text-sm sm:text-base leading-relaxed">
              SIGNA.ci est une initiative technologique et citoyenne indépendante (CivicTech) dédiée à l'amélioration du cadre de vie à Abidjan et dans toute la Côte d'Ivoire.
            </p>
          </div>

          {/* Grille 2 Colonnes : Notre Mission & Les 3 Étapes */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
            
            {/* Colonne Gauche : Notre Mission (7 cols) */}
            <section className="lg:col-span-7 rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                    <Heart className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">Notre Mission Civique</h2>
                    <p className="text-xs text-muted-foreground">Une passerelle transparente entre les citoyens et les services urbains</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  Lorsqu'une coupure d'eau survient, qu'un quartier est plongé dans le noir ou qu'un caniveau déborde, les habitants sont souvent démunis face au manque d'information et aux canaux de réclamation saturés.
                </p>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  <strong>SIGNA.ci</strong> permet à chaque citoyen de signaler un incident en 30 secondes, de géolocaliser la panne avec précision grâce au <strong>Plan d'Adressage d'Abidjan (PADA)</strong> et de corroborer les alertes avec ses voisins (&lt; 500m).
                </p>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  En agrégeant ces données en <strong>Open Data</strong>, nous offrons aux opérateurs (CIE, SODECI), aux mairies et aux autorités des indicateurs cartographiques fiables pour prioriser et accélérer les réparations.
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-border grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-muted/40 border border-border">
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">14</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">Communes</p>
                </div>
                <div className="p-3 rounded-2xl bg-muted/40 border border-border">
                  <p className="text-xl font-black text-amber-500">&lt; 500m</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">Consensus GPS</p>
                </div>
                <div className="p-3 rounded-2xl bg-muted/40 border border-border">
                  <p className="text-xl font-black text-blue-500">100%</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">Open Source</p>
                </div>
              </div>
            </section>

            {/* Colonne Droite : Comment ça marche en 3 étapes (5 cols) */}
            <section className="lg:col-span-5 rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground">Comment ça marche ?</h2>
                    <p className="text-xs text-muted-foreground">3 étapes d'action collaborative</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      step: "01",
                      title: "1. Signalez en 30s",
                      desc: "Choisissez le type de panne (Eau, Électricité, Voirie) avec capture GPS automatique et photo.",
                      color: "text-emerald-600 dark:text-emerald-400",
                      badge: "bg-emerald-500/10 border-emerald-500/20",
                    },
                    {
                      step: "02",
                      title: "2. Corroborez ensemble",
                      desc: "Les voisins à proximité confirment l'incident en 1 clic pour valider l'urgence collective.",
                      color: "text-sky-600 dark:text-sky-400",
                      badge: "bg-sky-500/10 border-sky-500/20",
                    },
                    {
                      step: "03",
                      title: "3. Suivez la réparation",
                      desc: "Le dossier est suivi jusqu'à sa clôture vérifiée par les habitants du quartier.",
                      color: "text-amber-600 dark:text-amber-400",
                      badge: "bg-amber-500/10 border-amber-500/20",
                    },
                  ].map((s) => (
                    <div key={s.step} className="p-4 rounded-2xl border border-border bg-muted/30 flex gap-4 items-start">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-black text-xs border ${s.badge} ${s.color}`}>
                        {s.step}
                      </span>
                      <div>
                        <h3 className="font-bold text-xs sm:text-sm text-foreground">{s.title}</h3>
                        <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                to="/signaler"
                className="mt-6 w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow transition-all flex items-center justify-center gap-2"
              >
                Faire un signalement immédiat <ArrowRight className="h-4 w-4" />
              </Link>
            </section>

          </div>

          {/* 🛡️ Le Réseau des Ambassadeurs de Quartier */}
          <section className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm mb-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 text-xs font-black uppercase">
                  ⭐ Démocratie de Proximité
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  Les Ambassadeurs : Les Yeux et la Voix de Chaque Rue
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  SIGNA.ci s'appuie sur des syndics d'immeubles, des délégués de jeunesse et des responsables d'associations de quartier. Accrédités avec le badge <strong>« Vérificateur Citoyen »</strong>, ils certifient les incidents sur le terrain, évitent les fausses alertes et veillent à ce que les réparations soient réellement achevées.
                </p>
                <div className="pt-2">
                  <Link
                    to="/profil?tab=account"
                    className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
                  >
                    Activer mon profil Ambassadeur dans mon compte <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5 grid grid-cols-2 gap-3 text-center">
                <div className="p-4 rounded-2xl bg-muted/40 border border-border">
                  <p className="text-2xl font-extrabold text-amber-500">⭐ Certifié</p>
                  <p className="text-xs text-muted-foreground mt-1 font-semibold">Preuve de terrain</p>
                </div>
                <div className="p-4 rounded-2xl bg-muted/40 border border-border">
                  <p className="text-2xl font-extrabold text-emerald-500">0 Doublon</p>
                  <p className="text-xs text-muted-foreground mt-1 font-semibold">Triage coordonné</p>
                </div>
              </div>
            </div>
          </section>

          {/* 📢 MODULE FIXMYSTREET POSTERS : Kit Citoyen & Affiches de Quartier */}
          <section className="rounded-3xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-card to-card p-6 sm:p-10 shadow-lg mb-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                    Mobilisation Terrain · Modèle FixMyStreet Posters
                  </span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  Affiches Citoyennes &amp; QR Codes pour votre Quartier
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Vous souhaitez mobiliser vos voisins face à un lampadaire cassé, un caniveau bouché ou une coupure d'eau récurrente ? Imprimez et collez l'affiche officielle SIGNA.ci dans votre syndic d'immeuble, marché de quartier ou arrêt de bus.
                </p>

                {/* Sélecteur & Accès au Générateur d'Affiches */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  <Link
                    to="/affiches"
                    className="h-11 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs shadow transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Ouvrir le Générateur d'Affiches de Quartier
                  </Link>

                  <Link
                    to="/affiches"
                    className="h-11 px-4 rounded-xl border border-amber-500/50 bg-background/50 hover:bg-background text-foreground font-bold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimer en Direct (A4)
                  </Link>
                </div>
              </div>

              {/* Aperçu Visuel de l'Affiche (Style Poster FixMyStreet) */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="w-full max-w-sm rounded-2xl border-4 border-amber-500/40 bg-card p-6 shadow-2xl text-center space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-amber-500 text-black text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                    AFFICHE CITOYENNE
                  </div>

                  <div className="inline-block mx-auto pt-2">
                    <SignaLogo size="md" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base font-black text-foreground uppercase tracking-tight">
                      Une panne dans notre quartier ?
                    </h3>
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      {selectedPosterCommune === "Toutes les communes" ? "Grand Abidjan" : `Commune de ${selectedPosterCommune}`}
                    </p>
                  </div>

                  {/* Faux QR Code Visuel de Démonstration */}
                  <div className="mx-auto w-36 h-36 bg-white p-2.5 rounded-2xl border-2 border-border shadow-inner flex flex-col items-center justify-center">
                    <QrCode className="h-28 w-28 text-slate-900" />
                  </div>

                  <p className="text-[11px] text-muted-foreground font-medium">
                    Scannez ce QR Code avec votre smartphone pour <strong>signaler en 30 secondes</strong> et forcer l'intervention.
                  </p>

                  <div className="text-[10px] font-bold text-foreground bg-muted/60 py-1.5 rounded-lg">
                    signa.ci · Plateforme Indépendante
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* 🏛️ Mosaïque Complète des 14 Communes du Grand Abidjan */}
          <section className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-sm mb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">14 Communes du Grand Abidjan</h2>
                  <p className="text-xs text-muted-foreground">Couverture territoriale intégrale et suivi localisé</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
              {COMMUNES.map((c) => (
                <Link
                  key={c.nom}
                  to={`/commune/${encodeURIComponent(c.nom)}`}
                  className="group flex flex-col items-center text-center p-4 rounded-2xl border border-border bg-background/50 hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:-translate-y-1 transition-all"
                >
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl overflow-hidden border border-border shadow-sm mb-3 group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: COMMUNE_LOGOS[c.nom] ? "#ffffff" : c.couleur }}
                  >
                    {COMMUNE_LOGOS[c.nom] ? (
                      <img src={COMMUNE_LOGOS[c.nom]} alt={c.nom} className="h-full w-full object-contain p-1" />
                    ) : (
                      <span className="text-white font-black text-sm tracking-wider drop-shadow-sm">
                        {c.nom.slice(0, 3).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="font-bold text-foreground text-xs truncate max-w-full">{c.nom}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{(c.population / 1000).toFixed(0)}k hab.</p>
                </Link>
              ))}
            </div>
          </section>

          {/* 🔗 Bannière Open Data, Transparence & Dépôt GitHub */}
          <section className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-card to-card p-6 sm:p-10 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Transparence &amp; Bien Public Numérique
                </span>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  Projet Open Source &amp; Gouvernance Ouverte
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  SIGNA.ci est conçu comme un Bien Public Numérique. Le code est accessible publiquement et les données agrégées sont ouvertes aux journalistes, chercheurs et administrations.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 shrink-0">
                <Link
                  to="/transparence"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 text-xs font-bold shadow transition-all inline-flex items-center gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  Baromètre Transparence
                </Link>
                <a
                  href="https://github.com/jeananvoh-cmyk/civic-signal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-border bg-card hover:bg-muted px-5 py-3 text-xs font-bold text-foreground transition-all inline-flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Code Source GitHub
                </a>
              </div>
            </div>
          </section>

        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default AboutPage;
