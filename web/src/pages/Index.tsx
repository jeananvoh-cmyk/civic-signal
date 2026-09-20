import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Zap, Users, ArrowRight, MapPin,
  CheckCircle2, Droplets, Wrench, Navigation,
  Lightbulb, Waves, Construction, ShieldCheck, ChevronRight,
  TowerControl, AlertTriangle, Droplet, Trash2, Megaphone, Map, Landmark
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { COMMUNES } from "@/lib/communes";
import { COMMUNE_LOGOS } from "@/lib/commune-logos";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cleanDescription } from "@/lib/report-display";

const ROTATING_WORDS = [
  { text: "coupures d'électricité (CIE)", color: "text-amber-500 dark:text-amber-400" },
  { text: "coupures d'eau potable (SODECI)", color: "text-sky-500 dark:text-sky-400" },
  { text: "lampadaires & éclairage (CIE)", color: "text-amber-600 dark:text-amber-400" },
  { text: "fuites d'eau & égouts (SODECI)", color: "text-sky-600 dark:text-sky-400" },
  { text: "nids-de-poule & voirie (Mairies)", color: "text-emerald-600 dark:text-emerald-400" },
];

// ─── 1. CIE (Électricité & Éclairage Public) ──────────────────────────────────
// Conforme au portail officiel CIE (cie.ci : Éclairage public, Poteaux/Pylônes, Branchements dangereux, Pannes)
const CIE_INCIDENTS = [
  {
    type: "electricity_outage",
    Icon: Zap,
    label: "Coupure d'électricité",
    desc: "Interruption du courant, transformateur en panne, baisses de tension",
    border: "border-amber-500/25 hover:border-amber-500/60",
    bg: "bg-amber-500/5 hover:bg-amber-500/10",
    iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    textColor: "text-amber-600 dark:text-amber-400",
  },
  {
    type: "street_light",
    Icon: Lightbulb,
    label: "Éclairage public",
    desc: "Lampadaires éteints, ampoules grillées, candélabres hors service",
    border: "border-amber-500/25 hover:border-amber-500/60",
    bg: "bg-amber-500/5 hover:bg-amber-500/10",
    iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    textColor: "text-amber-600 dark:text-amber-400",
  },
  {
    type: "cie_pole",
    Icon: TowerControl,
    label: "Poteaux / Pylônes",
    desc: "Poteau électrique penché ou brisé, câbles à terre, pylône endommagé",
    border: "border-amber-500/25 hover:border-amber-500/60",
    bg: "bg-amber-500/5 hover:bg-amber-500/10",
    iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    textColor: "text-amber-600 dark:text-amber-400",
  },
  {
    type: "cie_hazard",
    Icon: AlertTriangle,
    label: "Branchements dangereux",
    desc: "Fils électriques dénudés, étincelles au poteau, risque d'électrocution",
    border: "border-amber-500/25 hover:border-amber-500/60",
    bg: "bg-amber-500/5 hover:bg-amber-500/10",
    iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    textColor: "text-amber-600 dark:text-amber-400",
  },
];

// ─── 2. SODECI (Eau Potable & Assainissement) ─────────────────────────────────
// Conforme au portail officiel SODECI (masodecienligne.ci : Canalisation publique, Fuite d'eau, Réseau eau potable)
const SODECI_INCIDENTS = [
  {
    type: "water_outage",
    Icon: Droplets,
    label: "Coupure d'eau potable",
    desc: "Robinets à sec, manque prolongé de pression ou eau trouble",
    border: "border-sky-500/25 hover:border-sky-500/60",
    bg: "bg-sky-500/5 hover:bg-sky-500/10",
    iconBg: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    textColor: "text-sky-600 dark:text-sky-400",
  },
  {
    type: "water_leak",
    Icon: Droplet,
    label: "Fuite d'eau extérieure",
    desc: "Fuite sur voie publique, conduite percée ou compteur extérieur fuyant",
    border: "border-sky-500/25 hover:border-sky-500/60",
    bg: "bg-sky-500/5 hover:bg-sky-500/10",
    iconBg: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    textColor: "text-sky-600 dark:text-sky-400",
  },
  {
    type: "canalisation_sodeci",
    Icon: Waves,
    label: "Canalisation publique",
    desc: "Égout bouché, débordement de vos regards, reflux d'assainissement",
    border: "border-sky-500/25 hover:border-sky-500/60",
    bg: "bg-sky-500/5 hover:bg-sky-500/10",
    iconBg: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    textColor: "text-sky-600 dark:text-sky-400",
  },
];

// ─── 3. SERVICES TECHNIQUES MUNICIPAUX (14 Communes du Grand Abidjan) ─────────
// Compétences techniques des Mairies (Voirie, Caniveaux communaux, Salubrité)
const MAIRIE_INCIDENTS = [
  {
    type: "pothole",
    Icon: Construction,
    label: "Nids-de-poule & Chaussée",
    desc: "Nids-de-poule, chaussée défoncée, bitume arraché, obstacles sur voirie",
    border: "border-emerald-500/25 hover:border-emerald-500/60",
    bg: "bg-emerald-500/5 hover:bg-emerald-500/10",
    iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    textColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    type: "drain_blocked",
    Icon: Waves,
    label: "Caniveaux communaux",
    desc: "Caniveaux de voirie obstrués par les déchets, eaux stagnantes, risques de débordement",
    border: "border-emerald-500/25 hover:border-emerald-500/60",
    bg: "bg-emerald-500/5 hover:bg-emerald-500/10",
    iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    textColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    type: "illegal_dump",
    Icon: Trash2,
    label: "Dépôts sauvages & Salubrité",
    desc: "Accumulation d'ordures non collectées, dépôts sauvages sur l'espace public communal",
    border: "border-emerald-500/25 hover:border-emerald-500/60",
    bg: "bg-emerald-500/5 hover:bg-emerald-500/10",
    iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    textColor: "text-emerald-600 dark:text-emerald-400",
  },
];

const STEPS = [
  {
    step: "01",
    Icon: Megaphone,
    title: "Documentez l'incident",
    headline: "Précis & en 30 secondes",
    desc: "Signalez une panne CIE, SODECI ou voirie municipale avec géolocalisation et photo.",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
  },
  {
    step: "02",
    Icon: Users,
    title: "Confirmez ensemble",
    headline: "Solidarité de quartier",
    desc: "Les voisins confirment la coupure en 1 clic pour attester l'ampleur et éliminer les faux signalements.",
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/25",
  },
  {
    step: "03",
    Icon: CheckCircle2,
    title: "Suivez le rétablissement",
    headline: "Transparence & Réparation",
    desc: "Suivez la transmission aux équipes techniques et la résolution jusqu'au rétablissement complet.",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
  },
];

interface LandingStats {
  total_reports: number;
  resolved_reports: number;
  total_users: number;
}

const fmtNum = (n: number) =>
  n >= 10_000 ? `${Math.round(n / 1000)}k`
  : n >= 1_000 ? `${(n / 1000).toFixed(1)}k`
  : String(n);

interface NearbyReport {
  id: string;
  service_type: string;
  report_category: string;
  commune: string;
  quartier: string;
  description: string;
  created_at: string;
  verifications: number;
}

function useLiveData() {
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [liveActive, setLiveActive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchCounts = async () => {
      const rpc = await supabase.rpc("get_active_outage_count" as any);
      if (cancelled) return;
      if (rpc.data !== null && rpc.data !== undefined) setLiveCount(Number(rpc.data));
    };

    fetchCounts();

    const channel = supabase
      .channel("index-live-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => {
        if (cancelled) return;
        setLiveActive(true);
        fetchCounts();
        setTimeout(() => { if (!cancelled) setLiveActive(false); }, 2000);
      })
      .subscribe();

    const poll = setInterval(fetchCounts, 30_000);
    return () => { cancelled = true; supabase.removeChannel(channel); clearInterval(poll); };
  }, []);

  return { liveCount, liveActive };
}

const RotatingWord = React.memo(() => {
  const [wordIndex, setWordIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setWordIndex((i) => (i + 1) % ROTATING_WORDS.length), 3000);
    return () => clearInterval(id);
  }, []);
  const w = ROTATING_WORDS[wordIndex];
  return (
    <span className="inline-block relative min-w-[280px]">
      <span aria-live="polite" aria-atomic="true" className="sr-only">{w.text}</span>
      <AnimatePresence mode="wait">
        <motion.span
          key={wordIndex}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className={cn("inline-block font-extrabold", w.color)}
          aria-hidden="true"
        >
          {w.text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
});

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { liveCount, liveActive } = useLiveData();
  const [landingStats, setLandingStats] = useState<LandingStats | null>(null);
  const [nearbyReports, setNearbyReports] = useState<NearbyReport[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  useEffect(() => {
    supabase.rpc("get_landing_stats" as any).then(({ data: stats }) => {
      if (stats) setLandingStats(stats as LandingStats);
    });
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    let cancelled = false;
    setNearbyLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const { data } = await supabase.rpc("get_landing_nearby_reports" as any, {
          p_lat: latitude,
          p_lon: longitude,
          p_rayon_m: 3500,
          p_limit: 4,
        });
        if (cancelled) return;
        if (data) setNearbyReports(data as NearbyReport[]);
        setNearbyLoading(false);
      },
      () => { if (!cancelled) setNearbyLoading(false); },
      { timeout: 5000, maximumAge: 60000 }
    );
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* ══════════════════════════════════════════════════════════════
          1. HERO — Clarté & Action Immédiate en 3 Secondes
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative flex min-h-[75vh] items-center overflow-hidden border-b border-border/40">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-emerald-50/30 to-sky-50/20 dark:from-[#030d1a] dark:via-[#071929] dark:to-[#0a2236]" />
          <div
            className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08]"
            style={{
              backgroundImage: "radial-gradient(circle, #0284c7 1.2px, transparent 1.2px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="pointer-events-none absolute -top-20 left-1/4 h-[450px] w-[450px] rounded-full bg-sky-500/10 dark:bg-sky-500/18 blur-[120px]" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-[380px] w-[380px] rounded-full bg-emerald-400/10 dark:bg-teal-400/14 blur-[100px]" />
        </div>

        <div className="container relative z-10 py-12 sm:py-20">
          <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
            {/* Titre Principal H1 */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="font-display font-extrabold tracking-tight leading-[1.12] text-slate-950 dark:text-white text-3xl sm:text-5xl md:text-6xl"
            >
              <span className="block">Signalez &amp; suivez les</span>
              <span className="block min-h-[1.3em] mt-1.5 text-2xl sm:text-4xl md:text-5xl">
                <RotatingWord />
              </span>
            </motion.h1>

            {/* Description claire et centrée */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mt-4 sm:mt-6 max-w-2xl text-sm sm:text-lg leading-relaxed text-muted-foreground font-normal"
            >
              Documentez les pannes d'électricité (<strong>CIE</strong>), d'eau (<strong>SODECI</strong>) et les dégradations de voirie (<strong>Mairies</strong>) en 30 secondes pour accélérer les réparations dans votre quartier.
            </motion.p>

            {/* 2 Boutons d'Action Principaux */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-4 w-full"
            >
              <Link
                to="/signaler"
                className="group flex items-center gap-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white px-7 py-3.5 font-extrabold text-base shadow-[0_6px_24px_rgba(5,150,105,0.3)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-base font-extrabold tracking-wide">Documenter un incident</span>
                  <span className="text-[11px] font-medium text-white/80">CIE · SODECI · Mairie</span>
                </div>
                <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                to="/carte"
                className="group flex items-center gap-3 rounded-2xl border-2 border-sky-300 bg-sky-50/90 hover:bg-sky-100 text-sky-950 dark:border-sky-800 dark:bg-sky-950/40 dark:hover:bg-sky-900/60 dark:text-sky-200 px-7 py-3.5 font-bold text-base shadow-sm backdrop-blur-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 font-extrabold">
                  <Map className="h-5 w-5" />
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-base font-extrabold tracking-wide">Explorer la Carte en direct</span>
                  <span className="text-[11px] font-medium text-sky-700 dark:text-sky-300">Coupures des 14 communes</span>
                </div>
                <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          2. SÉLECTEUR RAPIDE DE COMMUNE (Navigation Directe 1 Clic)
      ══════════════════════════════════════════════════════════════ */}
      <section className="border-b border-border bg-card/60 py-5">
        <div className="container">
          <div className="flex items-center justify-between gap-4 mb-3">
            <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Consulter par commune :
            </p>
            <Link to="/tableau-de-bord" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              Tableau comparatif complet →
            </Link>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {COMMUNES.map((c) => {
              const logo = COMMUNE_LOGOS[c.nom];
              return (
                <Link
                  key={c.nom}
                  to={`/commune/${encodeURIComponent(c.nom)}`}
                  className="group flex shrink-0 items-center gap-2 rounded-full border border-border/80 bg-background px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-all hover:border-primary hover:bg-primary/5 hover:scale-105 active:scale-95"
                >
                  <div
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full overflow-hidden border border-border/40"
                    style={{ backgroundColor: logo ? "#fff" : c.couleur }}
                  >
                    {logo ? (
                      <img src={logo} alt="" className="h-full w-full object-contain p-0.5" />
                    ) : (
                      <span className="text-[9px] text-white font-black">{c.nom[0]}</span>
                    )}
                  </div>
                  <span>{c.nom}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          3. PÔLES DE SIGNALEMENT ORGANISÉS SELON LES OPÉRATEURS OFFICIELS
          (CIE · SODECI · MAIRIES & SERVICES MUNICIPAUX)
      ══════════════════════════════════════════════════════════════ */}
      <section className="container py-14">
        <div className="mb-10 text-center">
          <span className="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
            CATÉGORIES OFFICIELLES PAR OPÉRATEUR
          </span>
          <h2 className="mt-3 font-display text-2xl sm:text-3xl font-extrabold text-foreground">
            Que souhaitez-vous signaler aujourd'hui ?
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Sélectionnez votre incident selon l'opérateur responsable (CIE, SODECI ou Services Techniques Mairie) pour diriger l'alerte vers le service technique compétent.
          </p>
        </div>

        <div className="space-y-10 max-w-5xl mx-auto">
          
          {/* OPÉRATEUR 1 : CIE (Électricité & Éclairage Public) */}
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/70">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Zap className="h-4 w-4" />
                </div>
                <h3 className="font-display text-base sm:text-lg font-extrabold text-foreground">
                  CIE · Électricité &amp; Éclairage Public
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full w-fit">
                Conforme portail officiel CIE
              </span>
            </div>
            <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {CIE_INCIDENTS.map((item) => (
                <Link
                  key={item.type}
                  to={`/signaler?type=${item.type}`}
                  className={cn(
                    "group flex flex-col justify-between rounded-2xl border p-4 sm:p-5 transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] bg-card",
                    item.border,
                    item.bg
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", item.iconBg)}>
                        <item.Icon className="h-5 w-5" />
                      </div>
                      <ArrowRight className={cn("h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0", item.textColor)} />
                    </div>
                    <p className={cn("font-bold text-sm sm:text-base leading-snug", item.textColor)}>{item.label}</p>
                    <p className="text-xs text-muted-foreground/85 mt-1.5 leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                    <span>Opérateur : CIE</span>
                    <span className={cn("font-bold group-hover:underline", item.textColor)}>Signaler →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* OPÉRATEUR 2 : SODECI (Eau Potable & Assainissement) */}
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/70">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
                  <Droplets className="h-4 w-4" />
                </div>
                <h3 className="font-display text-base sm:text-lg font-extrabold text-foreground">
                  SODECI · Eau Potable &amp; Assainissement
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-full w-fit">
                Conforme portail officiel SODECI
              </span>
            </div>
            <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-3">
              {SODECI_INCIDENTS.map((item) => (
                <Link
                  key={item.type}
                  to={`/signaler?type=${item.type}`}
                  className={cn(
                    "group flex flex-col justify-between rounded-2xl border p-4 sm:p-5 transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] bg-card",
                    item.border,
                    item.bg
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", item.iconBg)}>
                        <item.Icon className="h-5 w-5" />
                      </div>
                      <ArrowRight className={cn("h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0", item.textColor)} />
                    </div>
                    <p className={cn("font-bold text-sm sm:text-base leading-snug", item.textColor)}>{item.label}</p>
                    <p className="text-xs text-muted-foreground/85 mt-1.5 leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                    <span>Opérateur : SODECI</span>
                    <span className={cn("font-bold group-hover:underline", item.textColor)}>Signaler →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* OPÉRATEUR 3 : MAIRIES & SERVICES TECHNIQUES MUNICIPAUX */}
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/70">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Landmark className="h-4 w-4" />
                </div>
                <h3 className="font-display text-base sm:text-lg font-extrabold text-foreground">
                  Services Municipaux · Voirie &amp; Salubrité (14 Communes)
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full w-fit">
                Compétences techniques communales
              </span>
            </div>
            <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-3">
              {MAIRIE_INCIDENTS.map((item) => (
                <Link
                  key={item.type}
                  to={`/signaler?type=${item.type}`}
                  className={cn(
                    "group flex flex-col justify-between rounded-2xl border p-4 sm:p-5 transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] bg-card",
                    item.border,
                    item.bg
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", item.iconBg)}>
                        <item.Icon className="h-5 w-5" />
                      </div>
                      <ArrowRight className={cn("h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0", item.textColor)} />
                    </div>
                    <p className={cn("font-bold text-sm sm:text-base leading-snug", item.textColor)}>{item.label}</p>
                    <p className="text-xs text-muted-foreground/85 mt-1.5 leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                    <span>Services Municipaux Mairie</span>
                    <span className={cn("font-bold group-hover:underline", item.textColor)}>Signaler →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          4. STATS & IMPACT — 4 Chiffres Clés en Direct
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-12 border-y border-border bg-slate-100/70 dark:bg-[#071524]">
        <div className="container">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              {
                value: "14",
                label: "Communes & Villes",
                Icon: MapPin,
                live: false,
                color: "text-slate-900 dark:text-white",
              },
              {
                value: landingStats ? fmtNum(landingStats.total_reports) : "…",
                label: "Signalements citoyens",
                Icon: Users,
                live: false,
                color: "text-slate-900 dark:text-white",
              },
              {
                value: landingStats ? fmtNum(landingStats.resolved_reports) : "…",
                label: "Incidents résolus",
                Icon: CheckCircle2,
                live: false,
                color: "text-emerald-600 dark:text-emerald-400",
              },
              {
                value: liveCount !== null ? String(liveCount) : "…",
                label: "Coupures actives",
                Icon: Zap,
                live: true,
                color: "text-amber-600 dark:text-amber-400",
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex flex-col items-center text-center"
              >
                <div className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200/80 bg-white dark:border-white/15 dark:bg-white/10 shadow-sm backdrop-blur-sm">
                  <stat.Icon className={cn(
                    "h-5 w-5 text-slate-700 dark:text-white/80",
                    stat.live && liveActive ? "animate-pulse text-amber-500" : ""
                  )} />
                </div>
                <p className={cn("font-display text-3xl sm:text-4xl font-extrabold tabular-nums", stat.color)}>
                  {stat.value}
                </p>
                <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500 dark:text-white/60">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          5. ACTIVITÉ LOCALE RÉCENTE (Signalements vérifiés proches)
      ══════════════════════════════════════════════════════════════ */}
      {nearbyReports.length > 0 && (
        <section className="container py-14">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-primary" />
              <h2 className="font-display text-xl font-bold text-foreground">Derniers signalements près de vous</h2>
            </div>
            <Link to="/carte" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              Voir sur la carte →
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {nearbyReports.map((r) => {
              const isElec = r.service_type === "electricity";
              const isInfra = r.report_category === "infrastructure";
              const icon = isElec ? (
                <Zap className="h-4 w-4 text-amber-500" />
              ) : isInfra ? (
                <Construction className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Droplets className="h-4 w-4 text-sky-500" />
              );

              return (
                <Link
                  key={r.id}
                  to={`/signalement/${r.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm hover:bg-accent/40 transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {r.commune}{r.quartier ? ` · ${r.quartier}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{cleanDescription(r.description)}</p>
                  </div>
                  {r.verifications > 0 && (
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                      {r.verifications} confirmé{r.verifications > 1 ? "s" : ""}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════
          6. COMMENT FONCTIONNE SIGNA.CI (3 Étapes Linéaires Épurées)
      ══════════════════════════════════════════════════════════════ */}
      <section className="border-t border-border bg-card/40 py-16">
        <div className="container">
          <div className="mb-12 text-center">
            <span className="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
              SIGNALER · SUIVRE · RÉPARER
            </span>
            <h2 className="mt-3 font-display text-2xl sm:text-3xl font-extrabold text-foreground">
              Comment fonctionne SIGNA.ci ?
            </h2>
            <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-muted-foreground">
              3 étapes simples pour faire entendre la voix de votre quartier et accélérer les réparations.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="relative flex flex-col items-center text-center p-6 rounded-2xl border border-border/70 bg-card shadow-sm hover:shadow-md transition-all"
              >
                <div className={`relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border ${step.border} ${step.bg}`}>
                  <step.Icon className={cn("h-6 w-6", step.color)} />
                  <span className={`absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-[9px] font-black tabular-nums ${step.color}`}>
                    {step.step}
                  </span>
                </div>
                <h3 className="font-display text-base font-bold text-foreground">{step.title}</h3>
                <p className={`mt-0.5 text-[11px] font-bold uppercase tracking-wider ${step.color}`}>{step.headline}</p>
                <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          7. FOOTER OFFICIEL UNIQUE
      ══════════════════════════════════════════════════════════════ */}
      <Footer />
    </div>
  );
};

export default Index;
