import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Zap, Shield, Users, ArrowRight, BarChart3, MapPin,
  Radio, LogIn, UserPlus, History, Info, Heart,
  ChevronDown, CheckCircle2, TrendingUp, Droplets, Wrench, Navigation,
  ExternalLink, MessageCircle, Mail, Map as MapIcon
} from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { SOCIAL_LINKS } from "@/lib/social-links";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { COMMUNES } from "@/lib/communes";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import waterIcon from "@/assets/water-icon-sm.webp";
import electricityIcon from "@/assets/electricity-icon-sm.webp";
import { caniveauIcon, voirieIcon, lampadaireIcon } from "@/lib/infra-icons";
import { extractInfraLabel, infraEmoji, cleanDescription } from "@/lib/report-display";

const ROTATING_WORDS = [
  { text: "coupures d'électricité", color: "text-amber-500 dark:text-amber-400" },
  { text: "coupures d'eau",         color: "text-sky-500 dark:text-sky-400" },
  { text: "lampadaires cassés",     color: "text-yellow-600 dark:text-yellow-400" },
  { text: "caniveaux bouchés",      color: "text-teal-600 dark:text-teal-400" },
  { text: "nids de poules",         color: "text-slate-800 dark:text-slate-200" },
];

const PROBLEM_TYPES = [
  {
    type: "water_outage",
    iconImg: waterIcon,
    label: "Coupures d'eau",
    desc: "SODECI · Fuites & robinets secs",
    border: "border-sky-500/20 dark:border-sky-400/30",
    grad: "from-sky-500/10 to-cyan-500/5 dark:from-sky-500/15 dark:to-cyan-500/5",
    text: "text-sky-600 dark:text-sky-300",
    glow: "hover:shadow-sky-500/20",
  },
  {
    type: "electricity_outage",
    iconImg: electricityIcon,
    label: "Coupures d'électricité",
    desc: "CIE · Pannes & transformateurs",
    border: "border-yellow-500/20 dark:border-yellow-400/30",
    grad: "from-yellow-500/10 to-amber-500/5 dark:from-yellow-500/15 dark:to-amber-500/5",
    text: "text-amber-600 dark:text-yellow-300",
    glow: "hover:shadow-yellow-500/20",
  },
  {
    type: "street_light",
    iconImg: lampadaireIcon,
    label: "Lampadaires cassés",
    desc: "Éclairage public hors service",
    border: "border-orange-500/20 dark:border-orange-400/30",
    grad: "from-orange-500/10 to-yellow-500/5 dark:from-orange-500/15 dark:to-yellow-500/5",
    text: "text-orange-600 dark:text-orange-300",
    glow: "hover:shadow-orange-500/20",
  },
  {
    type: "drain_blocked",
    iconImg: caniveauIcon,
    label: "Caniveaux bouchés",
    desc: "Eaux usées & assainissement",
    border: "border-teal-500/20 dark:border-teal-400/30",
    grad: "from-teal-500/10 to-green-500/5 dark:from-teal-500/15 dark:to-green-500/5",
    text: "text-teal-600 dark:text-teal-300",
    glow: "hover:shadow-teal-500/20",
  },
  {
    type: "pothole",
    iconImg: voirieIcon,
    label: "Nids de poules & Voirie",
    desc: "Chaussée dégradée & obstacles",
    border: "border-slate-300 dark:border-slate-400/30",
    grad: "from-slate-500/10 to-gray-500/5 dark:from-slate-500/15 dark:to-gray-500/5",
    text: "text-slate-700 dark:text-slate-300",
    glow: "hover:shadow-slate-500/20",
  },
];

const STEPS = [
  {
    step: "01", emoji: "📢", title: "Signalez en 30s",
    headline: "Ultra-rapide & simple",
    desc: "Sélectionnez votre panne (Eau, Électricité, Voirie) avec détection GPS automatique et photo facultative.",
    color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25",
  },
  {
    step: "02", emoji: "🤝", title: "Confirmez ensemble",
    headline: "Entraide de quartier",
    desc: "Les riverains confirment l'incident en 1 clic pour éliminer les faux positifs et prouver l'urgence.",
    color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/25",
  },
  {
    step: "03", emoji: "🛠️", title: "Suivez la résolution",
    headline: "Transparence totale",
    desc: "Le dossier est transmis aux équipes techniques et vous êtes notifié dès le rétablissement de la situation.",
    color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25",
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

// ── Section COMMENT ÇA MARCHE (Épurée en 3 étapes directes) ──
const HowItWorksSection = React.memo(() => (
  <section className="border-y border-border bg-card/40 py-20">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-14 text-center"
      >
        <span className="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
          SIGNALER · SUIVRE · RÉPARER
        </span>
        <h2 className="mt-4 font-display text-3xl font-extrabold text-foreground md:text-4xl">
          Comment fonctionne SIGNA.ci ?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm sm:text-base text-muted-foreground">
          3 étapes simples pour faire entendre la voix de votre quartier et accélérer les réparations.
        </p>
      </motion.div>

      <div className="grid gap-8 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.step}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12, duration: 0.5 }}
            className="relative flex flex-col items-center text-center p-6 rounded-2xl border border-border/70 bg-card shadow-sm hover:shadow-md transition-all"
          >
            <div className={`relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border ${step.border} ${step.bg} text-3xl`}>
              {step.emoji}
              <span className={`absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-[10px] font-black tabular-nums ${step.color}`}>
                {step.step}
              </span>
            </div>
            <h3 className="font-display text-lg font-bold text-foreground">{step.title}</h3>
            <p className={`mt-0.5 text-xs font-bold uppercase tracking-wider ${step.color}`}>{step.headline}</p>
            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
));

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

interface MyActiveReport {
  id: string;
  service_type: string;
  report_category: string;
  description: string;
  commune: string;
  quartier: string;
  created_at: string;
  verifications: number;
}

const RotatingWord = React.memo(() => {
  const [wordIndex, setWordIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setWordIndex((i) => (i + 1) % ROTATING_WORDS.length), 2800);
    return () => clearInterval(id);
  }, []);
  const w = ROTATING_WORDS[wordIndex];
  return (
    <>
      <span aria-live="polite" aria-atomic="true" className="sr-only">{w.text}</span>
      <AnimatePresence mode="wait">
        <motion.span
          key={wordIndex}
          initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0,  filter: "blur(0px)" }}
          exit={{   opacity: 0, y: -24, filter: "blur(4px)" }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className={w.color}
          aria-hidden="true"
        >
          {w.text}
        </motion.span>
      </AnimatePresence>
    </>
  );
});

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { liveCount, liveActive } = useLiveData();
  const [landingStats, setLandingStats] = useState<LandingStats | null>(null);
  const [nearbyReports, setNearbyReports] = useState<NearbyReport[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [myActiveReports, setMyActiveReports] = useState<MyActiveReport[]>([]);

  useEffect(() => {
    supabase.rpc("get_landing_stats" as any).then(({ data: stats }) => {
      if (stats) setLandingStats(stats as LandingStats);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("reports")
      .select("id, service_type, report_category, description, commune, quartier, created_at, verifications")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => { if (data) setMyActiveReports(data as MyActiveReport[]); });
  }, [user]);

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
          p_rayon_m: 2500,
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
          1. HERO — L'essentiel en 3 secondes
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative flex min-h-[88vh] items-start sm:items-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-emerald-50/30 to-sky-50/20 dark:from-[#030d1a] dark:via-[#071929] dark:to-[#0a2236]" />
          <div
            className="absolute inset-0 opacity-[0.05] dark:opacity-[0.09]"
            style={{
              backgroundImage: "radial-gradient(circle, #0284c7 1.2px, transparent 1.2px)",
              backgroundSize: "36px 36px",
            }}
          />
          <div className="pointer-events-none absolute -top-20 left-1/4 h-[520px] w-[520px] rounded-full bg-sky-500/10 dark:bg-sky-500/18 blur-[130px]" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-emerald-400/10 dark:bg-teal-400/14 blur-[110px]" />
        </div>

        <div className="container relative z-10 pt-8 pb-16 sm:py-20">
          <div className="max-w-3xl">

            {/* Slogan Officiel SIGNA */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 backdrop-blur-md"
            >
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-black tracking-widest text-emerald-700 dark:text-emerald-300 uppercase">
                SIGNALER · SUIVRE · RÉPARER
              </span>
            </motion.div>

            {/* Titre avec mots rotatifs */}
            <div className="overflow-hidden">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65 }}
                className="font-display font-extrabold leading-[1.05] text-slate-950 dark:text-white"
              >
                <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-[4.2rem]">
                  Signalez les
                </span>
                <span className="block min-h-[1.15em] text-4xl sm:text-5xl md:text-6xl lg:text-[4.2rem]">
                  <RotatingWord />
                </span>
              </motion.h1>
            </div>

            {/* Description claire */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-4 sm:mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-slate-600 dark:text-white/70"
            >
              La plateforme citoyenne officielle en Côte d'Ivoire où les habitants signalent,
              confirment et accélèrent la résolution des pannes publiques.
            </motion.p>

            {/* 2 Boutons d'Action Principaux */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-6 sm:mt-8 flex flex-wrap gap-4"
            >
              <Link
                to="/signaler"
                className="group flex items-center gap-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white px-7 py-4 font-extrabold text-base sm:text-lg shadow-[0_8px_32px_rgba(5,150,105,0.35)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-xl backdrop-blur-sm">
                  📢
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-base font-extrabold tracking-wide">Signaler un incident</span>
                  <span className="text-[11px] font-medium text-white/80">Eau · Courant · Voirie</span>
                </div>
                <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                to="/carte"
                className="group flex items-center gap-3.5 rounded-2xl border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:bg-slate-800 dark:text-white px-6 py-4 font-bold text-base shadow-sm backdrop-blur-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <MapIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-base font-extrabold tracking-wide">Consulter la carte</span>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-300">Incidents en direct</span>
                </div>
              </Link>
            </motion.div>

            {/* Communes couvertes — Pilules nettes */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-8 sm:mt-10 flex flex-wrap items-center gap-2"
            >
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mr-1">
                📍 Communes couvertes :
              </span>
              {COMMUNES.map((c: { nom: string }) => (
                <Link
                  key={c.nom}
                  to={`/commune/${encodeURIComponent(c.nom)}`}
                  className="rounded-full border border-slate-300/90 bg-slate-100 text-slate-900 hover:bg-emerald-100 hover:border-emerald-400 hover:text-emerald-950 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:bg-emerald-950/70 dark:hover:border-emerald-400 dark:hover:text-emerald-300 px-3.5 py-1.5 text-xs font-bold shadow-sm transition-all active:scale-95"
                >
                  {c.nom}
                </Link>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          2. STATS & IMPACT — 4 chiffres clés
      ══════════════════════════════════════════════════════════════ */}
      <section className="py-12 border-y border-border bg-slate-100/70 dark:bg-[#071524]">
        <div className="container">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              {
                value: "14+",
                label: "Communes & Villes couvertes",
                Icon: MapPin,
                live: false,
                color: "text-slate-900 dark:text-white"
              },
              {
                value: landingStats ? fmtNum(landingStats.total_reports) : "…",
                label: "Signalements citoyens",
                Icon: BarChart3,
                live: false,
                color: "text-slate-900 dark:text-white"
              },
              {
                value: landingStats ? fmtNum(landingStats.resolved_reports) : "…",
                label: "Incidents résolus",
                Icon: TrendingUp,
                live: false,
                color: "text-emerald-600 dark:text-emerald-400"
              },
              {
                value: liveCount !== null ? String(liveCount) : "…",
                label: "Coupures actives",
                Icon: Radio,
                live: true,
                color: "text-amber-600 dark:text-amber-400"
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
          3. CATÉGORIES EN 1 CLIC — 5 cartes directes
      ══════════════════════════════════════════════════════════════ */}
      <section className="container py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <span className="inline-block rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            5 Catégories de dysfonctionnements
          </span>
          <h2 className="mt-4 font-display text-3xl font-extrabold text-foreground md:text-4xl">
            Que souhaitez-vous signaler ?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Cliquez directement sur votre catégorie pour ouvrir le formulaire pré-rempli.
          </p>
        </motion.div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {PROBLEM_TYPES.map((pt, i) => (
            <motion.div
              key={pt.type}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                to={`/signaler?type=${pt.type}`}
                className={cn(
                  `group flex flex-col items-center justify-between h-full gap-3 p-5 rounded-2xl border ${pt.border} bg-gradient-to-br ${pt.grad} text-center transition-all duration-200 hover:scale-[1.03] hover:shadow-xl ${pt.glow} active:scale-[0.97]`
                )}
              >
                <img src={pt.iconImg} alt="" className="h-12 w-12 shrink-0" />
                <div>
                  <p className={cn("font-bold text-sm sm:text-base", pt.text)}>{pt.label}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-tight">{pt.desc}</p>
                </div>
                <div className={cn(
                  `inline-flex items-center gap-1 text-xs font-bold ${pt.text} mt-1`
                )}>
                  Signaler <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          4. COMMENT ÇA MARCHE — 3 étapes limpides
      ══════════════════════════════════════════════════════════════ */}
      <HowItWorksSection />

      {/* ══════════════════════════════════════════════════════════════
          5. ACTIVITÉ LOCALE RÉCENTE (Si signalements proches)
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
              const infraLabel = isInfra ? extractInfraLabel(r.description) : null;
              const icon = isInfra
                ? <span className="text-base leading-none">{infraEmoji(infraLabel)}</span>
                : isElec
                  ? <Zap className="h-4 w-4 text-amber-500" />
                  : <Droplets className="h-4 w-4 text-sky-500" />;

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
          6. BANNIÈRE CITOYENNE UNIQUE (Alerte & Entraide)
      ══════════════════════════════════════════════════════════════ */}
      <section className="container py-14">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-card to-card p-8 sm:p-12 text-center">
          <div className="max-w-2xl mx-auto space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              🇨🇮 CivicTech Côte d'Ivoire
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground">
              Faites entendre la voix de votre commune
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              SIGNA.ci est une initiative citoyenne et gratuite. En signalant une coupure ou en corroborant un incident, vous aidez directement vos voisins et fournissez des données objectives pour accélérer les réparations.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/signaler"
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 text-sm font-bold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                📢 Faire un signalement
              </Link>
              <a
                href={SOCIAL_LINKS.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-[#25D366]/40 bg-card hover:bg-[#25D366]/10 px-6 py-3 text-sm font-bold text-foreground transition-all inline-flex items-center gap-2 hover:border-[#25D366]"
              >
                <WhatsAppIcon className="h-5 w-5 shrink-0" />
                <span>WhatsApp Assistance</span>
              </a>
            </div>
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
