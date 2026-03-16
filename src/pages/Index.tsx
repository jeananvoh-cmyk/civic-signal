import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Shield, Users, ArrowRight, BarChart3, MapPin,
  Radio, LogIn, UserPlus, Map, History, Info, Heart,
  ChevronDown, CheckCircle2,
} from "lucide-react";
import SOSButtons from "@/components/SOSButtons";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { COMMUNES } from "@/lib/communes";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
const heroBg = "/images/hero-bg.jpg";
import waterIcon from "@/assets/water-icon-sm.webp";
import electricityIcon from "@/assets/electricity-icon-sm.webp";

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
  },
  {
    type: "electricity_outage",
    iconImg: electricityIcon,
    label: "Coupures d'électricité",
    desc: "Panne de courant ?",
    border: "border-yellow-400/30",
    grad: "from-yellow-500/15 to-amber-500/5",
    text: "text-yellow-300",
    glow: "hover:shadow-yellow-500/20",
  },
  {
    type: "street_light",
    emoji: "💡",
    label: "Lampadaires cassés",
    desc: "Éclairage public en panne ?",
    border: "border-orange-400/30",
    grad: "from-orange-500/15 to-yellow-500/5",
    text: "text-orange-300",
    glow: "hover:shadow-orange-500/20",
  },
  {
    type: "drain_blocked",
    emoji: "🌧️",
    label: "Caniveaux bouchés",
    desc: "Caniveau obstrué ?",
    border: "border-teal-400/30",
    grad: "from-teal-500/15 to-green-500/5",
    text: "text-teal-300",
    glow: "hover:shadow-teal-500/20",
  },
  {
    type: "pothole",
    emoji: "🕳️",
    label: "Nids de poules",
    desc: "Route dégradée ?",
    border: "border-slate-400/30",
    grad: "from-slate-500/15 to-gray-500/5",
    text: "text-slate-300",
    glow: "hover:shadow-slate-500/20",
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

const Index = () => {
  const { user } = useAuth();
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [liveActive, setLiveActive] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const { data } = await supabase.rpc("get_active_outage_count" as any);
      if (data !== null && data !== undefined) setLiveCount(Number(data));
    };
    fetchCount();

    const channel = supabase
      .channel("index-live-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => {
        setLiveActive(true);
        fetchCount();
        setTimeout(() => setLiveActive(false), 2000);
      })
      .subscribe();

    const poll = setInterval(fetchCount, 10_000);
    return () => { supabase.removeChannel(channel); clearInterval(poll); };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setWordIndex((i) => (i + 1) % ROTATING_WORDS.length), 2800);
    return () => clearInterval(id);
  }, []);

  const totalPop = COMMUNES.reduce((s: number, c: { population: number }) => s + c.population, 0);
  const popLabel = totalPop >= 1_000_000
    ? `${(totalPop / 1_000_000).toFixed(2)}M`
    : `${(totalPop / 1_000).toFixed(0)}k`;

  const currentWord = ROTATING_WORDS[wordIndex];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* ══════════════════════════════════════════════════════════════
          HERO — full viewport, texte rotatif animé
      ══════════════════════════════════════════════════════════════ */}
      <section className="relative flex min-h-[93vh] items-center overflow-hidden">
        {/* Background image + overlay — bg-black couvre les bords, brightness assombrit l'image */}
        <div className="absolute inset-0 bg-black">
          <img
            src={heroBg} alt=""
            className="h-full w-full object-cover"
            style={{ filter: 'brightness(0.28)' }}
            fetchPriority="high" loading="eager"
          />
        </div>

        {/* Ambient blobs */}
        <div className="pointer-events-none absolute top-1/3 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-sky-600/8 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-1/4 right-0 h-80 w-80 rounded-full bg-teal-500/8 blur-[100px]" />

        <div className="container relative z-10 py-20">
          <div className="max-w-3xl">

            {/* Status badges */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8 flex flex-wrap items-center gap-3"
            >
              {liveCount !== null && (
                <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold backdrop-blur-md ${
                  liveCount > 0
                    ? "border-red-400/40 bg-red-500/15 text-red-200"
                    : "border-green-400/40 bg-green-500/15 text-green-200"
                }`}>
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

            {/* Heading with rotating word */}
            <div className="overflow-hidden">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.1 }}
                className="font-display font-extrabold leading-[1.05] text-white"
              >
                <span className="block text-5xl md:text-6xl lg:text-[4.5rem]">
                  Signalez les
                </span>
                <span className="block min-h-[1.15em] text-5xl md:text-6xl lg:text-[4.5rem]">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={wordIndex}
                      initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0,  filter: "blur(0px)" }}
                      exit={{   opacity: 0, y: -24, filter: "blur(4px)" }}
                      transition={{ duration: 0.45, ease: "easeInOut" }}
                      className={currentWord.color}
                    >
                      {currentWord.text}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </motion.h1>
            </div>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="mt-6 max-w-xl text-lg leading-relaxed text-white/65"
            >
              La première plateforme citoyenne ivoirienne où les habitants contribuent
              à l'amélioration des services d'eau, d'électricité et des infrastructures publiques.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.48 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link
                to="/signaler"
                className="group inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-water to-electricity px-8 py-4 text-base font-extrabold text-white shadow-[0_8px_32px_rgba(14,165,233,0.4)] transition-all duration-200 hover:scale-[1.04] hover:shadow-[0_12px_48px_rgba(14,165,233,0.6)] active:scale-[0.97]"
              >
                <Zap className="h-5 w-5" />
                Signaler maintenant
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/tableau-de-bord"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/8 px-8 py-4 text-base font-bold text-white backdrop-blur-md transition-all hover:bg-white/15 active:scale-[0.97]"
              >
                <BarChart3 className="h-5 w-5" />
                Voir le dashboard
              </Link>
            </motion.div>

            {/* Communes pills */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.65 }}
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
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/30"
        >
          <span className="text-[10px] tracking-[0.2em] uppercase">Découvrir</span>
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
              { value: "7",       label: "Communes pilotes",      Icon: MapPin,  live: false },
              { value: popLabel,  label: "Habitants couverts",     Icon: Users,   live: false },
              { value: "<200m",   label: "Rayon de vérification",  Icon: Shield,  live: false },
              {
                value: liveCount !== null ? String(liveCount) : "…",
                label: "Coupures actives", Icon: Radio, live: true,
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
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 backdrop-blur-sm">
                  <stat.Icon className={`h-5 w-5 text-white/70 ${stat.live && liveActive ? "animate-pulse" : ""}`} />
                </div>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={stat.value}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="font-display text-3xl font-extrabold text-white md:text-4xl"
                  >
                    {stat.value}
                  </motion.p>
                </AnimatePresence>
                <p className="mt-1 text-sm text-white/55">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PROBLEM_TYPES.map((pt, i) => (
            <motion.div
              key={pt.type}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
            >
              <Link
                to={`/signaler?type=${pt.type}`}
                className={`group flex flex-col items-center gap-4 rounded-2xl border ${pt.border} bg-gradient-to-br ${pt.grad} p-6 text-center transition-all duration-200 hover:scale-[1.04] hover:shadow-xl ${pt.glow} active:scale-[0.97]`}
              >
                <div className="text-4xl leading-none">
                  {"iconImg" in pt
                    ? <img src={pt.iconImg} alt="" className="h-10 w-10" />
                    : pt.emoji}
                </div>
                <div>
                  <p className={`text-sm font-bold ${pt.text}`}>{pt.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{pt.desc}</p>
                </div>
                <div className={`flex items-center gap-1 text-xs font-semibold ${pt.text} opacity-0 transition-all group-hover:opacity-100`}>
                  Signaler <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          HOW IT WORKS — 4 étapes avec ligne de connexion
      ══════════════════════════════════════════════════════════════ */}
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
            {/* Ligne de connexion desktop */}
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
                {/* Icon circle */}
                <div className={`relative z-10 mb-5 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border ${step.border} ${step.bg} text-3xl`}>
                  {step.emoji}
                  <span className={`absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-[9px] font-extrabold tabular-nums ${step.color}`}>
                    {step.step}
                  </span>
                </div>

                <h3 className="font-display text-base font-bold text-foreground">{step.title}</h3>
                <p className={`mt-0.5 text-[11px] font-bold uppercase tracking-wider ${step.color}`}>{step.headline}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

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
              <p className="mx-auto mt-4 max-w-md text-muted-foreground">
                Signale une coupure en{" "}
                <span className="font-semibold text-electricity">15 secondes</span>,
                aide tes voisins et contribue à améliorer les services publics d'Abidjan.
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

      {/* ══════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-border bg-card py-10">
        <div className="container">
          <div className="grid gap-8 sm:grid-cols-3 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-sm text-foreground">
                  SIGNA<span className="text-primary">-CI</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Plateforme citoyenne de signalement des coupures d'eau et d'électricité à Abidjan, Côte d'Ivoire.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">Navigation</p>
              <div className="flex flex-col gap-2">
                <Link to="/signaler" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Zap className="h-3.5 w-3.5" /> Signaler une coupure
                </Link>
                <Link to="/tableau-de-bord" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <BarChart3 className="h-3.5 w-3.5" /> Tableau de Bord Public
                </Link>
                <Link to="/carte" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Map className="h-3.5 w-3.5" /> Carte interactive
                </Link>
                <Link to="/verification" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Users className="h-3.5 w-3.5" /> Vérifier un signalement
                </Link>
                <Link to="/historique" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <History className="h-3.5 w-3.5" /> Historique
                </Link>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">Informations</p>
              <div className="flex flex-col gap-2">
                <Link to="/a-propos" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="h-3.5 w-3.5" /> À propos & CGU
                </Link>
                <Link to="/confidentialite" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Shield className="h-3.5 w-3.5" /> Politique de confidentialité
                </Link>
                <Link to="/dons" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Heart className="h-3.5 w-3.5" /> Soutenir le projet
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-6 flex flex-col items-center justify-between gap-2 sm:flex-row">
            <p className="text-xs text-muted-foreground">© 2026 SIGNA-CI — CivicTech Abidjan</p>
            <p className="text-xs text-muted-foreground">Fait avec ❤️ pour les citoyens d'Abidjan</p>
          </div>
        </div>
      </footer>

      <SOSButtons />
    </div>
  );
};

export default Index;
