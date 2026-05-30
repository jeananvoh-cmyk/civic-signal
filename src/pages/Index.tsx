import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Zap, Shield, Users, ArrowRight, BarChart3, MapPin,
  Radio, LogIn, UserPlus, Map, History, Info, Heart,
  ChevronDown, CheckCircle2, TrendingUp, Droplets, Wrench, Navigation,
  ExternalLink, Download, Share, X, BatteryFull, TrendingDown,
} from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { SOCIAL_LINKS } from "@/lib/social-links";
import SOSButtons from "@/components/SOSButtons";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import PushPromptBanner from "@/components/PushPromptBanner";
import { COMMUNES } from "@/lib/communes";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import waterIcon from "@/assets/water-icon-sm.webp";
import electricityIcon from "@/assets/electricity-icon-sm.webp";
import { caniveauIcon, voirieIcon, lampadaireIcon } from "@/lib/infra-icons";
import { extractInfraLabel, infraEmoji, cleanDescription } from "@/lib/report-display";

const ROTATING_WORDS = [
  { text: "coupures d'eau",         color: "text-sky-400",    bg: "bg-sky-400/10"    },
  { text: "coupures d'électricité", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  { text: "lampadaires cassés",     color: "text-orange-400", bg: "bg-orange-400/10" },
  { text: "caniveaux bouchés",      color: "text-teal-400",   bg: "bg-teal-400/10"   },
  { text: "nids de poules",         color: "text-slate-300",  bg: "bg-slate-400/10"  },
];

const PROBLEM_TYPES = [
  {
    type: "water_outage",
    iconImg: waterIcon,
    label: "Coupures d'eau",
    desc: "Plus d'eau au robinet ?",
    border: "border-sky-400/30",
    grad: "from-sky-500/15 to-cyan-500/5",
    text: "text-sky-300",
    glow: "hover:shadow-sky-500/20",
    prominent: true,
  },
  {
    type: "electricity_outage",
    iconImg: electricityIcon,
    label: "Coupures d'électricité",
    desc: "Coupure de courant ?",
    border: "border-yellow-400/30",
    grad: "from-yellow-500/15 to-amber-500/5",
    text: "text-yellow-300",
    glow: "hover:shadow-yellow-500/20",
    prominent: true,
  },
  {
    type: "street_light",
    iconImg: lampadaireIcon,
    label: "Lampadaires cassés",
    desc: "Lampadaire hors service ?",
    border: "border-orange-400/30",
    grad: "from-orange-500/15 to-yellow-500/5",
    text: "text-orange-300",
    glow: "hover:shadow-orange-500/20",
    prominent: false,
  },
  {
    type: "drain_blocked",
    iconImg: caniveauIcon,
    label: "Caniveaux bouchés",
    desc: "Caniveau obstrué ?",
    border: "border-teal-400/30",
    grad: "from-teal-500/15 to-green-500/5",
    text: "text-teal-300",
    glow: "hover:shadow-teal-500/20",
    prominent: false,
  },
  {
    type: "pothole",
    iconImg: voirieIcon,
    label: "Nids de poules",
    desc: "Route dégradée ?",
    border: "border-slate-400/30",
    grad: "from-slate-500/15 to-gray-500/5",
    text: "text-slate-300",
    glow: "hover:shadow-slate-500/20",
    prominent: false,
  },
];

const STEPS = [
  {
    step: "01", emoji: "📍", title: "Localisez",
    headline: "GPS automatique",
    desc: "Votre commune est détectée automatiquement. Signalement en ligne en moins de 2 minutes.",
    color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/25",
  },
  {
    step: "02", emoji: "⚡", title: "Signalez",
    headline: "3 clics suffisent",
    desc: "Choisissez le type de problème, confirmez votre quartier et envoyez.",
    color: "text-sky-400", bg: "bg-sky-400/10", border: "border-sky-400/25",
  },
  {
    step: "03", emoji: "🤝", title: "Vérifiez",
    headline: "Voisins solidaires",
    desc: "Les voisins à moins de 200 m confirment le signalement pour éliminer les faux positifs.",
    color: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/25",
  },
  {
    step: "04", emoji: "📊", title: "Impact",
    headline: "Décideurs informés",
    desc: "CIE, SODECI et autorités suivent les coupures en temps réel par commune.",
    color: "text-violet-400", bg: "bg-violet-400/10", border: "border-violet-400/25",
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

interface ServiceCounts {
  electricity: number;
  water: number;
}

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

// -- Section HOW IT WORKS — aucune dép. dynamique, jamais re-rendue -------
const HowItWorksSection = React.memo(() => (
  <section className="border-y border-border bg-card/40 py-24">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-14 text-center"
      >
        <span className="inline-block rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Comment ça marche
        </span>
        <h2 className="mt-4 font-display text-3xl font-bold text-foreground md:text-4xl">
          Simple. Rapide. Efficace.
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-muted-foreground">
          De la détection du problème à la décision en 4 étapes
        </p>
      </motion.div>

      <div className="relative grid gap-10 md:grid-cols-4">
        <div className="pointer-events-none absolute top-[2.2rem] left-[12%] right-[12%] hidden h-px bg-gradient-to-r from-transparent via-border/60 to-transparent md:block" />
        {STEPS.map((step, i) => (
          <motion.div
            key={step.step}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12, duration: 0.5 }}
            className="relative flex flex-col items-center text-center"
          >
            <div className={`relative z-10 mb-5 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border ${step.border} ${step.bg} text-3xl`}>
              {step.emoji}
              <span className={`absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-[9px] font-extrabold tabular-nums ${step.color}`}>
                {step.step}
              </span>
            </div>
            <h3 className="font-display text-base font-bold text-foreground">{step.title}</h3>
            <p className={`mt-0.5 text-xs font-bold uppercase tracking-wider ${step.color}`}>{step.headline}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
));

// -- Section COMMUNAUTÉ + FOOTER — jamais re-rendue -----------------------
const CommunityAndFooter = React.memo(() => (
  <>
    <section className="py-14 border-t border-border bg-gradient-to-b from-primary/3 to-transparent">
      <div className="container max-w-2xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Communauté</p>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground mb-3">
            Rejoignez la communauté SIGNA-CI
          </h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
            Suivez l'actualité des coupures, partagez vos expériences et restez informé en temps réel avec vos voisins.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href={SOCIAL_LINKS.facebook.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-2xl border-2 border-[#1877F2]/30 bg-[#1877F2]/5 px-6 py-4 w-full sm:w-auto transition-all hover:border-[#1877F2]/60 hover:bg-[#1877F2]/10 hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1877F2]">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </div>
              <div className="text-left">
                <p className="font-bold text-sm text-foreground group-hover:text-[#1877F2] transition-colors">Page Facebook</p>
                <p className="text-xs text-muted-foreground">Actualités & alertes</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            <a
              href={SOCIAL_LINKS.whatsapp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-2xl border-2 border-[#25D366]/30 bg-[#25D366]/5 px-6 py-4 w-full sm:w-auto transition-all hover:border-[#25D366]/60 hover:bg-[#25D366]/10 hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#25D366]">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <div className="text-left">
                <p className="font-bold text-sm text-foreground group-hover:text-[#25D366] transition-colors">Canal WhatsApp</p>
                <p className="text-xs text-muted-foreground">Alertes instantanées</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>

    <footer className="border-t border-border bg-card py-10">
      <div className="container">
        <div className="grid gap-8 sm:grid-cols-3 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8">
                <circle cx="18" cy="14" r="12" fill="hsl(var(--primary))" opacity="0.12" />
                <circle cx="18" cy="13" r="7" fill="hsl(var(--primary))" />
                <path d="M18 20 L18 34 L15 30 L18 34 L21 30 L18 34" stroke="hsl(var(--primary))" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <circle cx="18" cy="13" r="3" fill="white" />
                <path d="M11 9 Q9 11 9 13 Q9 15 11 17" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
                <path d="M25 9 Q27 11 27 13 Q27 15 25 17" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
              </svg>
              <div className="flex flex-col leading-none">
                <span className="font-extrabold text-sm text-foreground">SIGNA<span className="text-primary">·CI</span></span>
                <span className="text-[9px] font-semibold tracking-widest text-muted-foreground uppercase">Côte d'Ivoire</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Plateforme citoyenne ivoirienne de signalement des dysfonctionnements des services et infrastructures publiques urbains à Abidjan, et dans toute la Côte d'Ivoire.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">Navigation</p>
            <div className="flex flex-col gap-2">
              <Link to="/signaler" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"><Zap className="h-3.5 w-3.5" /> Signaler un problème</Link>
              <Link to="/tableau-de-bord" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"><BarChart3 className="h-3.5 w-3.5" /> Tableau de bord citoyen</Link>
              <Link to="/carte" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"><Map className="h-3.5 w-3.5" /> Carte des signalements</Link>
              <Link to="/verification" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"><Users className="h-3.5 w-3.5" /> Vérifier & confirmer un signalement</Link>
              <Link to="/historique" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"><History className="h-3.5 w-3.5" /> Mon historique</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">Informations</p>
            <div className="flex flex-col gap-2">
              <Link to="/a-propos" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"><Info className="h-3.5 w-3.5" /> À propos & CGU</Link>
              <Link to="/confidentialite" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"><Shield className="h-3.5 w-3.5" /> Politique de confidentialité</Link>
              <Link to="/dons" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"><Heart className="h-3.5 w-3.5" /> Soutenir le projet</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-border pt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-muted-foreground">© 2026 SIGNA-CI — CivicTech Abidjan</p>
          <div className="flex items-center gap-2">
            <a href={SOCIAL_LINKS.facebook.url} target="_blank" rel="noopener noreferrer" title="Page Facebook SIGNA-CI" className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 transition-colors">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href={SOCIAL_LINKS.whatsapp.url} target="_blank" rel="noopener noreferrer" title="Canal WhatsApp SIGNA-CI" className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
          </div>
          <p className="text-xs text-muted-foreground">Fiers d'être ivoirien ❤️ </p>
        </div>
      </div>
    </footer>
  </>
));

// -- Hook A : encapsule Realtime + poll (live count + service counts) -----
function useLiveData() {
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [liveActive, setLiveActive] = useState(false);
  const [serviceCounts, setServiceCounts] = useState<ServiceCounts | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCounts = async () => {
      const [rpc, elec, water] = await Promise.all([
        supabase.rpc("get_active_outage_count" as any),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "active").eq("service_type", "electricity"),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "active").eq("service_type", "water"),
      ]);
      if (cancelled) return;
      if (rpc.data !== null && rpc.data !== undefined) setLiveCount(Number(rpc.data));
      setServiceCounts({ electricity: elec.count ?? 0, water: water.count ?? 0 });
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

  return { liveCount, liveActive, serviceCounts };
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

// Isolated so wordIndex ticks don't re-render the whole page
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
  const { user } = useAuth();
  const { canInstall, isIOS, install } = usePWAInstall();
  const { liveCount, liveActive, serviceCounts } = useLiveData();
  const [landingStats, setLandingStats] = useState<LandingStats | null>(null);
  const [nearbyReports, setNearbyReports] = useState<NearbyReport[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [myActiveReports, setMyActiveReports] = useState<MyActiveReport[]>([]);
  const [avgResolutionHours, setAvgResolutionHours] = useState<Record<string, number> | null>(null);
  const [showElecBanner, setShowElecBanner] = useState(
    () => localStorage.getItem("signa_elec_feature_v1") !== "dismissed"
  );

  // Batch landing stats + transparency stats — 1 round-trip instead of 2
  useEffect(() => {
    Promise.all([
      supabase.rpc("get_landing_stats" as any),
      supabase.rpc("get_transparency_stats" as any),
    ]).then(([{ data: stats }, { data: trans }]) => {
      if (stats) setLandingStats(stats as LandingStats);
      if (trans && (trans as any).avg_resolution_hours) {
        setAvgResolutionHours((trans as any).avg_resolution_hours);
      }
    });
  }, []);

  // Mes signalements actifs — utilisateur connecté
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

  // Signalements "près de moi" — GPS optionnel, filtrage côté DB via RPC
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
          p_rayon_m: 2000,
          p_limit: 5,
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
      <PushPromptBanner />

      {/* ══════════════════════════════════════════════════════════════
          HERO — full viewport, texte rotatif animé
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative flex min-h-[93vh] items-start sm:items-center overflow-hidden">
        {/* ── Fond civic tech moderne ── */}
        <div className="absolute inset-0">
          {/* Base : gradient bleu nuit profond — crédible, institutionnel */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#030d1a] via-[#071929] to-[#0a2236]" />

          {/* Grille de points — data / cartographie */}
          <div
            className="absolute inset-0 opacity-[0.09]"
            style={{
              backgroundImage: "radial-gradient(circle, #7dd3fc 1.2px, transparent 1.2px)",
              backgroundSize: "36px 36px",
            }}
          />

          {/* Grille orthogonale fine — map grid feel */}
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(148,210,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(148,210,255,0.4) 1px, transparent 1px)",
              backgroundSize: "80px 80px",
            }}
          />

          {/* Éclat principal — sky centre-gauche */}
          <div className="pointer-events-none absolute -top-20 left-1/4 h-[520px] w-[520px] rounded-full bg-sky-500/18 blur-[130px]" />
          {/* Éclat teal — bas droite */}
          <div className="pointer-events-none absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-teal-400/14 blur-[110px]" />
          {/* Accent chaud (électricité) — haut droite */}
          <div className="pointer-events-none absolute top-0 right-1/3 h-[280px] w-[280px] rounded-full bg-amber-400/8 blur-[90px]" />
          {/* Profondeur gauche basse */}
          <div className="pointer-events-none absolute bottom-1/4 -left-10 h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-[100px]" />

          {/* Vignette bords pour focus sur le contenu */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55)_100%)]" />
        </div>

        <div className="container relative z-10 pt-10 pb-20 sm:py-20">
          <div className="max-w-3xl">

            {/* Heading with rotating word */}
            <div className="overflow-hidden">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65 }}
                className="font-display font-extrabold leading-[1.05] text-white"
              >
                <span className="block text-5xl md:text-6xl lg:text-[4.5rem]">
                  Signalez les
                </span>
                <span className="block min-h-[1.15em] text-5xl md:text-6xl lg:text-[4.5rem]">
                  <RotatingWord />
                </span>
              </motion.h1>
            </div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-4 sm:mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-white/65"
            >
              La première plateforme citoyenne ivoirienne où les habitants contribuent
              à l'amélioration des services et infrastructures publiques.
            </motion.p>

            {/* Status badges — après le titre pour ne pas casser l'entrée visuelle */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.38 }}
              className="mt-4 sm:mt-5 flex flex-wrap items-center gap-3"
            >
              {liveCount !== null && (
                <div className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold backdrop-blur-md tabular-nums",
                  liveCount > 0
                    ? "border-red-400/40 bg-red-500/15 text-red-200"
                    : "border-green-400/40 bg-green-500/15 text-green-200"
                )}>
                  <Radio className={`h-3.5 w-3.5 ${liveActive ? "animate-pulse" : ""}`} />
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={liveCount}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.18 }}
                    >
                      {liveCount > 0
                        ? `${liveCount} coupure${liveCount > 1 ? "s" : ""} active${liveCount > 1 ? "s" : ""}`
                        : "Aucune coupure active"}
                    </motion.span>
                  </AnimatePresence>
                </div>
              )}
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm text-white/75 backdrop-blur-md">
                <Shield className="h-3.5 w-3.5" />
                07 communes · Abidjan
              </div>
            </motion.div>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-6 sm:mt-8 flex flex-wrap gap-3"
            >
              <Link
                to="/signaler"
                className="group inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-water to-electricity px-8 py-4 text-base font-extrabold text-white shadow-[0_8px_32px_rgba(14,165,233,0.4)] transition-all duration-200 hover:scale-[1.04] hover:shadow-[0_12px_48px_rgba(14,165,233,0.6)] active:scale-[0.97]"
              >
                <Zap className="h-5 w-5" />
                Signaler maintenant
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              {canInstall ? (
                /* Bouton install — remplace "dashboard" si l'app n'est pas installée */
                <button
                  onClick={async () => {
                    if (isIOS) { window.location.href = "/install"; return; }
                    await install();
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/8 px-8 py-4 text-base font-bold text-white backdrop-blur-md transition-all hover:bg-white/15 active:scale-[0.97]"
                >
                  {isIOS
                    ? <><Share className="h-5 w-5" /> Ajouter à l'accueil</>
                    : <><Download className="h-5 w-5" /> Installer l'app</>}
                </button>
              ) : (
                <Link
                  to="/tableau-de-bord"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/8 px-8 py-4 text-base font-bold text-white backdrop-blur-md transition-all hover:bg-white/15 active:scale-[0.97]"
                >
                  <BarChart3 className="h-5 w-5" />
                  Voir le dashboard
                </Link>
              )}
            </motion.div>

            {/* Communes pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.72 }}
              className="mt-10 flex flex-wrap gap-2"
            >
              {COMMUNES.map((c: { nom: string; couleur: string }) => (
                <Link
                  key={c.nom}
                  to={`/commune/${encodeURIComponent(c.nom)}`}
                  className="rounded-full px-3 py-1 text-xs font-bold text-white transition-all hover:scale-105 hover:brightness-110 active:scale-95"
                  style={{ backgroundColor: c.couleur }}
                >
                  {c.nom}
                </Link>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/50"
        >
          <span className="text-xs tracking-[0.2em] uppercase">Découvrir</span>
          <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          STATS — 4 chiffres clés sur fond gradient
      ══════════════════════════════════════════════════════════════ */}
      <section className="gradient-hero py-14">
        <div className="container">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { value: "7", label: "Communes pilotes", Icon: MapPin, live: false, scale: "sm" as const },
              {
                value: landingStats ? fmtNum(landingStats.total_reports) : "…",
                label: "Signalements soumis", Icon: BarChart3, live: false, scale: "md" as const,
              },
              {
                value: landingStats ? fmtNum(landingStats.resolved_reports) : "…",
                label: "Problèmes résolus", Icon: TrendingUp, live: false, scale: "md" as const,
              },
              {
                value: liveCount !== null ? String(liveCount) : "…",
                label: "Coupures actives", Icon: Radio, live: true, scale: "lg" as const,
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
                <div className={cn(
                  "mb-3 flex items-center justify-center rounded-xl border border-white/15 bg-white/10 backdrop-blur-sm",
                  stat.scale === "lg" ? "h-13 w-13" : "h-11 w-11"
                )}>
                  <stat.Icon className={cn(
                    "text-white/70",
                    stat.scale === "lg" ? "h-6 w-6" : "h-5 w-5",
                    stat.live && liveActive ? "animate-pulse" : ""
                  )} />
                </div>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={stat.value}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className={cn(
                      "font-display font-extrabold text-white tabular-nums",
                      stat.scale === "lg" ? "text-4xl md:text-5xl" : stat.scale === "md" ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl"
                    )}
                  >
                    {stat.value}
                  </motion.p>
                </AnimatePresence>
                <p className={cn("mt-1 text-white/55", stat.scale === "lg" ? "text-sm font-semibold" : "text-sm")}>{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          TEMPS DE RÉPONSE — preuve que ça marche
      ══════════════════════════════════════════════════════════════ */}
      {avgResolutionHours && Object.keys(avgResolutionHours).length > 0 && (
        <section className="container py-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <h2 className="font-display text-sm font-bold text-foreground">Délai moyen de résolution</h2>
              </div>
              <Link to="/transparence" className="text-xs text-primary hover:underline">Voir les résultats →</Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "electricity", label: "CIE", icon: "⚡", color: "text-yellow-500" },
                { key: "water", label: "SODECI", icon: "💧", color: "text-sky-500" },
                { key: "mairie", label: "Mairie", icon: "🏛", color: "text-emerald-500" },
              ].map(({ key, label, icon, color }) => {
                const h = avgResolutionHours[key];
                if (!h) return null;
                const display = h < 1 ? `${Math.round(h * 60)} min` : h < 24 ? `${Math.round(h)} h` : `${Math.round(h / 24)} j`;
                return (
                  <div key={key} className="rounded-xl bg-secondary p-3 text-center">
                    <p className="text-lg mb-1">{icon}</p>
                    <p className={`font-display text-xl font-extrabold ${color}`}>{display}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground text-center italic">Basé sur les signalements résolus · mis à jour en temps réel</p>
          </motion.div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MES SIGNALEMENTS ACTIFS — utilisateur connecté
      ══════════════════════════════════════════════════════════════ */}
      {user && myActiveReports.length > 0 && (
        <section className="container py-8">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-amber-400/30 bg-amber-500/5 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-amber-500 animate-pulse" />
                <h2 className="font-display text-base font-bold text-foreground">Mes signalements en cours</h2>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                  {myActiveReports.length} actif{myActiveReports.length > 1 ? "s" : ""}
                </span>
              </div>
              <Link to="/historique" className="text-xs text-primary hover:underline flex items-center gap-1">
                Tout voir <ChevronDown className="h-3 w-3 -rotate-90" />
              </Link>
            </div>
            <div className="space-y-2">
              {myActiveReports.map((r) => {
                const isElec = r.service_type === "electricity";
                const isInfra = r.report_category === "infrastructure";
                const icon = isInfra ? infraEmoji(extractInfraLabel(r.description)) : isElec ? "⚡" : "💧";
                const label = isInfra ? (extractInfraLabel(r.description) ?? "Infrastructure") : isElec ? "Électricité" : "Eau";
                const verifLabel = isInfra
                  ? `${r.verifications} soutien${r.verifications > 1 ? "s" : ""}`
                  : `${r.verifications} confirmation${r.verifications > 1 ? "s" : ""}`;
                return (
                  <Link
                    key={r.id}
                    to={`/signalement/${r.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">{icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{label} · {r.commune}</p>
                        <p className="text-xs text-muted-foreground">{r.quartier && `${r.quartier} · `}{new Date(r.created_at).toLocaleDateString("fr-FR")}{r.verifications > 0 ? ` · ${verifLabel}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-full px-2 py-0.5">En cours</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground -rotate-90 group-hover:text-primary transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <Link to="/historique" className="flex-1">
                <Button variant="outline" size="sm" className="w-full text-xs gap-1">
                  <History className="h-3.5 w-3.5" /> Voir l'historique complet
                </Button>
              </Link>
              <Link to="/verification">
                <Button variant="outline" size="sm" className="text-xs gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Vérifier
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════
          FEATURE DISCOVERY — Suivi électricité prépayée (1 seule fois)
      ══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showElecBanner && (
          <motion.section
            key="elec-feature"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="container py-3"
          >
            <div className="relative overflow-hidden rounded-2xl border border-yellow-400/40 bg-gradient-to-br from-yellow-500/12 via-amber-400/8 to-orange-400/5 p-5 shadow-sm">

              {/* Bouton fermer */}
              <button
                onClick={() => {
                  setShowElecBanner(false);
                  localStorage.setItem("signa_elec_feature_v1", "dismissed");
                }}
                className="absolute top-3 right-3 h-6 w-6 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Fermer"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              {/* Pastille "Nouveau" */}
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 px-2.5 py-0.5 text-xs font-bold text-yellow-700 dark:text-yellow-400 mb-3">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-yellow-500" />
                </span>
                Nouveau sur SIGNA-CI
              </span>

              <div className="flex items-start gap-4">

                {/* Icône */}
                <div className="shrink-0 h-14 w-14 rounded-2xl bg-yellow-500/15 border border-yellow-500/25 flex flex-col items-center justify-center gap-0.5">
                  <Zap className="h-6 w-6 text-yellow-500" />
                  <BatteryFull className="h-3.5 w-3.5 text-yellow-500/70" />
                </div>

                {/* Texte */}
                <div className="flex-1 min-w-0 pr-5">
                  <p className="text-sm font-extrabold text-foreground leading-tight">
                    Suivez votre électricité prépayée
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Collez votre SMS de recharge CIE · Suivez vos kWh restants ·
                    Recevez une estimation de votre autonomie en jours.
                  </p>

                  {/* Mini métriques illustratives */}
                  <div className="flex items-center gap-3 mt-2.5">
                    <div className="flex items-center gap-1 text-xs font-semibold text-yellow-700 dark:text-yellow-400">
                      <TrendingDown className="h-3 w-3" />
                      <span>Conso/jour</span>
                    </div>
                    <div className="h-3 w-px bg-border" />
                    <div className="flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <BatteryFull className="h-3 w-3" />
                      <span>Jours restants</span>
                    </div>
                    <div className="h-3 w-px bg-border" />
                    <div className="flex items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-400">
                      <Zap className="h-3 w-3" />
                      <span>Historique</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-4 flex items-center gap-2">
                <Link
                  to="/compteur"
                  onClick={() => {
                    setShowElecBanner(false);
                    localStorage.setItem("signa_elec_feature_v1", "dismissed");
                  }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 active:scale-[0.98] transition-all py-2.5 text-sm font-bold text-white shadow-sm shadow-yellow-500/30"
                >
                  <Zap className="h-4 w-4" />
                  Essayer maintenant
                </Link>
                <button
                  onClick={() => {
                    setShowElecBanner(false);
                    localStorage.setItem("signa_elec_feature_v1", "dismissed");
                  }}
                  className="px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Plus tard
                </button>
              </div>

              {/* Fond décoratif */}
              <div className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-yellow-400/10 blur-2xl" />
              <div className="pointer-events-none absolute -top-4 -left-4 h-16 w-16 rounded-full bg-amber-400/10 blur-xl" />
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════
          FIL "PRÈS DE MOI" — signalements dans un rayon de 2 km
      ══════════════════════════════════════════════════════════════ */}
      {(nearbyLoading || nearbyReports.length > 0) && (
        <section className="container py-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-6 flex items-center gap-2"
          >
            <Navigation className="h-4 w-4 text-primary" />
            <h2 className="font-display text-xl font-bold text-foreground">Près de vous</h2>
            <span className="text-xs text-muted-foreground">· rayon 2 km</span>
          </motion.div>

          {nearbyLoading ? (
            <div className="flex justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-3">
              {nearbyReports.map((r, i) => {
                const isElec = r.service_type === "electricity";
                const isInfra = r.report_category === "infrastructure";
                const infraLabel = isInfra ? extractInfraLabel(r.description) : null;
                const icon = isInfra
                  ? <span className="text-base leading-none">{infraEmoji(infraLabel)}</span>
                  : isElec
                    ? <Zap className="h-4 w-4 text-amber-500" />
                    : <Droplets className="h-4 w-4 text-sky-500" />;
                const timeAgo = (() => {
                  const diff = (Date.now() - new Date(r.created_at).getTime()) / 60000;
                  if (diff < 60) return `il y a ${Math.round(diff)} min`;
                  if (diff < 1440) return `il y a ${Math.round(diff / 60)} h`;
                  return `il y a ${Math.round(diff / 1440)} j`;
                })();
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <Link
                      to={`/signalement/${r.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm hover:bg-accent transition-colors"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {r.commune}{r.quartier ? ` · ${r.quartier}` : ""}
                        </p>
                        {isInfra ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {infraLabel && (
                              <span className="inline-flex items-center rounded-full bg-teal-500/10 px-2 py-0.5 text-xs font-semibold text-teal-700 dark:text-teal-400 shrink-0">
                                {infraLabel}
                              </span>
                            )}
                            {r.verifications > 0 && (
                              <span className="text-xs text-muted-foreground truncate">
                                · {r.verifications} demande{r.verifications > 1 ? "s" : ""} de réparation
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground truncate">{cleanDescription(r.description)}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">{timeAgo}</p>
                        {!isInfra && r.verifications > 0 && (
                          <p className="text-xs font-semibold text-green-600">{r.verifications} confirm.</p>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════
          PROBLEM TYPES — 5 cartes cliquables
      ══════════════════════════════════════════════════════════════ */}
      <section className="container py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <span className="inline-block rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            5 catégories
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold text-foreground md:text-4xl">
            Que voulez-vous signaler ?
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-muted-foreground">
            Cliquez directement sur le problème pour lancer votre signalement
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
          {PROBLEM_TYPES.map((pt, i) => (
            <motion.div
              key={pt.type}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className={pt.prominent ? "lg:col-span-2" : "lg:col-span-1"}
            >
              <Link
                to={`/signaler?type=${pt.type}`}
                className={cn(
                  `group flex flex-col items-center gap-4 rounded-2xl border ${pt.border} bg-gradient-to-br ${pt.grad} text-center transition-all duration-200 hover:scale-[1.04] hover:shadow-xl ${pt.glow} active:scale-[0.97]`,
                  pt.prominent ? "p-8" : "p-6"
                )}
              >
                <img src={pt.iconImg} alt="" className={pt.prominent ? "h-14 w-14" : "h-10 w-10"} />
                <div>
                  <p className={cn("font-bold", pt.prominent ? "text-base" : "text-sm", pt.text)}>{pt.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{pt.desc}</p>
                </div>
                <div className={cn(
                  `flex items-center gap-1 text-xs font-semibold ${pt.text} opacity-0 transition-all group-hover:opacity-100`
                )}>
                  Signaler <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* ── État des services en temps réel ── */}
        {serviceCounts !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 flex flex-wrap justify-center gap-3"
          >
            {[
              {
                type: "electricity",
                icon: "⚡",
                label: "Électricité",
                count: serviceCounts.electricity,
                okColor: "border-green-500/30 bg-green-500/8 text-green-700 dark:text-green-300",
                alertColor: "border-yellow-500/30 bg-yellow-500/8 text-yellow-700 dark:text-yellow-300",
              },
              {
                type: "water",
                icon: "💧",
                label: "Eau",
                count: serviceCounts.water,
                okColor: "border-green-500/30 bg-green-500/8 text-green-700 dark:text-green-300",
                alertColor: "border-sky-500/30 bg-sky-500/8 text-sky-700 dark:text-sky-300",
              },
            ].map(({ type, icon, label, count, okColor, alertColor }) => (
              <Link
                key={type}
                to={`/carte`}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:scale-[1.03] ${count > 0 ? alertColor : okColor}`}
              >
                <span>{icon}</span>
                <span>{label}</span>
                <span className="opacity-70">·</span>
                <span>{count > 0 ? `${count} coupure${count > 1 ? "s" : ""} active${count > 1 ? "s" : ""}` : "RAS"}</span>
              </Link>
            ))}
          </motion.div>
        )}
      </section>

      <HowItWorksSection />

      {/* ══════════════════════════════════════════════════════════════
          AUTH CTA — pour visiteurs non connectés
      ══════════════════════════════════════════════════════════════ */}
      {!user && (
        <section className="container py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-secondary/20 p-10 text-center md:p-16"
          >
            <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-water/6 blur-[80px]" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-electricity/6 blur-[80px]" />

            <div className="relative">
              <div className="mb-6 flex flex-wrap justify-center gap-2">
                {["Gratuit", "Sans publicité", "Données privées"].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    {t}
                  </span>
                ))}
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground md:text-4xl">
                Rejoins la communauté SIGNA-CI
              </h2>
              {landingStats && landingStats.total_users > 0 && (
                <p className="mt-3 text-sm font-semibold text-water">
                  {fmtNum(landingStats.total_users)} citoyen{landingStats.total_users > 1 ? "s" : ""} déjà inscrits
                </p>
              )}
              <p className="mx-auto mt-4 max-w-md text-muted-foreground">
                Signalez une coupure en{" "}
                <span className="font-semibold text-electricity">quelques secondes</span>,
                aidez vos voisins et contribuez à améliorer les services publics d'Abidjan.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  asChild size="lg"
                  className="bg-water text-water-foreground hover:bg-water/90 px-8 font-bold shadow-[0_4px_24px_rgba(14,165,233,0.3)]"
                >
                  <Link to="/auth?tab=signup">
                    <UserPlus className="mr-2 h-5 w-5" />
                    Créer mon compte gratuitement
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="px-8">
                  <Link to="/auth?tab=login">
                    <LogIn className="mr-2 h-5 w-5" />
                    J'ai déjà un compte
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      <CommunityAndFooter />

      <SOSButtons />
    </div>
  );
};

export default Index;
