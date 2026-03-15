import { Link } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, useScroll, useSpring } from "framer-motion";
import { Zap, Droplets, Shield, Users, ArrowRight, BarChart3, MapPin, Radio, LogIn, UserPlus, Map, History, Info, Heart, ChevronDown, CheckCircle2 } from "lucide-react";
import SOSButtons from "@/components/SOSButtons";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { COMMUNES } from "@/lib/communes";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import FlipCounter from "@/components/FlipCounter";
const heroBg = "/images/hero-bg.jpg";
import waterIcon from "@/assets/water-icon-sm.webp";
import electricityIcon from "@/assets/electricity-icon-sm.webp";

/* ── Animation variants ── */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { type: "spring" as const, stiffness: 200, damping: 18 } },
};

const slideRight = {
  hidden: { opacity: 0, x: -16 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

/* ── Floating particle ── */
const FloatingOrb = ({ delay, x, y, size, color }: { delay: number; x: string; y: string; size: string; color: string }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{ left: x, top: y, width: size, height: size, background: color, filter: "blur(40px)" }}
    animate={{
      y: [0, -30, 0, 20, 0],
      x: [0, 15, -10, 5, 0],
      opacity: [0.3, 0.6, 0.4, 0.5, 0.3],
    }}
    transition={{ duration: 12, delay, repeat: Infinity, ease: "easeInOut" }}
  />
);

/* ── Tilt card ── */
const TiltCard = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-8, 8]);

  const handleMouse = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ── Animated counter ── */
const AnimatedCounter = ({ value, className }: { value: string; className?: string }) => {
  const num = parseInt(value.replace(/[^0-9]/g, ""));
  const suffix = value.replace(/[0-9,.]/g, "");
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isNaN(num)) return;
    const duration = 1400;
    const steps = 40;
    const increment = num / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= num) {
        setCount(num);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [num]);

  if (isNaN(num)) return <span className={className}>{value}</span>;
  return <span className={className}>{count}{suffix}</span>;
};

const PILLS = [
  { to: "/signaler?type=water_outage", border: "border-blue-400/30", bg: "bg-blue-500/15", hoverBg: "hover:bg-blue-500/30", text: "text-blue-200", icon: <img src={waterIcon} alt="" className="h-4 w-4" />, label: "Coupures d'eau" },
  { to: "/signaler?type=electricity_outage", border: "border-yellow-400/30", bg: "bg-yellow-500/15", hoverBg: "hover:bg-yellow-500/30", text: "text-yellow-200", icon: <img src={electricityIcon} alt="" className="h-4 w-4" />, label: "Coupures d'électricité" },
  { to: "/signaler?type=street_light", border: "border-orange-400/20", bg: "bg-orange-500/10", hoverBg: "hover:bg-orange-500/25", text: "text-orange-200", icon: "💡", label: "Lampadaires" },
  { to: "/signaler?type=drain_blocked", border: "border-teal-400/20", bg: "bg-teal-500/10", hoverBg: "hover:bg-teal-500/25", text: "text-teal-200", icon: "🌧️", label: "Caniveaux" },
  { to: "/signaler?type=pothole", border: "border-gray-400/20", bg: "bg-gray-500/10", hoverBg: "hover:bg-gray-500/25", text: "text-gray-300", icon: "🛣️", label: "Routes" },
];

const FEATURES = [
  { step: "01", emoji: "📍", title: "Localisez", headline: "GPS automatique", description: "Votre commune et quartier sont détectés automatiquement. En ligne en moins de 2 minutes.", iconBg: "bg-amber-500/10", iconColor: "text-amber-500", accentColor: "from-amber-500 to-orange-500" },
  { step: "02", emoji: "⚡", title: "Signalez", headline: "3 clics suffisent", description: "Choisissez le type de problème, confirmez votre quartier et envoyez instantanément.", iconBg: "bg-blue-500/10", iconColor: "text-blue-500", accentColor: "from-blue-500 to-cyan-500" },
  { step: "03", emoji: "🤝", title: "Confirmez", headline: "Solidarité voisinage", description: "Vos voisins à moins de 200 m confirment pour éliminer les faux positifs.", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500", accentColor: "from-emerald-500 to-green-500" },
  { step: "04", emoji: "📊", title: "Impactez", headline: "Décisions en temps réel", description: "CIE, SODECI et autorités suivent les coupures par commune pour améliorer les services.", iconBg: "bg-violet-500/10", iconColor: "text-violet-500", accentColor: "from-violet-500 to-purple-500" },
];

const Index = () => {
  const { user } = useAuth();
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [liveActive, setLiveActive] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.8], [1, 1.05]);
  const heroY = useSpring(useTransform(scrollYProgress, [0, 1], [0, 80]), { stiffness: 100, damping: 30 });

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
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* ═══ HERO — Immersive fullscreen ═══ */}
      <section ref={heroRef} className="relative overflow-hidden min-h-[92vh] flex items-center">
        {/* Background layers */}
        <motion.div style={{ scale: heroScale }} className="absolute inset-0">
          <img src={heroBg} alt="" className="h-full w-full object-cover" fetchPriority="high" loading="eager" />
          <div className="absolute inset-0 gradient-hero-rich opacity-90" />
        </motion.div>

        {/* Floating orbs */}
        <FloatingOrb delay={0} x="10%" y="20%" size="300px" color="hsla(192,80%,45%,0.12)" />
        <FloatingOrb delay={3} x="70%" y="60%" size="250px" color="hsla(40,95%,50%,0.1)" />
        <FloatingOrb delay={6} x="85%" y="15%" size="200px" color="hsla(270,60%,50%,0.08)" />
        <FloatingOrb delay={2} x="30%" y="75%" size="180px" color="hsla(150,60%,40%,0.08)" />

        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)",
          backgroundSize: "80px 80px"
        }} />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="container relative z-10 py-20 md:py-28">
          <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-3xl">

            {/* Live badge + communes badge */}
            <motion.div variants={fadeUp} className="mb-6 flex flex-wrap items-center gap-3">
              {liveCount !== null && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={`inline-flex items-center gap-2.5 rounded-full border px-5 py-2.5 text-sm font-bold backdrop-blur-md transition-all ${
                    liveCount > 0
                      ? "border-red-400/30 bg-red-500/15 text-red-200 shadow-[0_0_20px_hsl(0_80%_50%/0.15)]"
                      : "border-emerald-400/30 bg-emerald-500/15 text-emerald-200 shadow-[0_0_20px_hsl(150_60%_40%/0.15)]"
                  }`}
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${liveCount > 0 ? "bg-red-400" : "bg-emerald-400"} ${liveActive ? "animate-ping" : ""}`} />
                    <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${liveCount > 0 ? "bg-red-400" : "bg-emerald-400"}`} />
                  </span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={liveCount}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.2 }}
                    >
                      {liveCount > 0 ? `${liveCount} coupure${liveCount > 1 ? "s" : ""} active${liveCount > 1 ? "s" : ""}` : "Aucune coupure active"}
                    </motion.span>
                  </AnimatePresence>
                </motion.div>
              )}
              <motion.div
                variants={scaleIn}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 backdrop-blur-md"
              >
                <Shield className="h-4 w-4 text-white/60" />
                07 communes pilotes
              </motion.div>
            </motion.div>

            {/* Title — large, dramatic */}
            <motion.div variants={fadeUp}>
              <h1 className="font-display text-[2.75rem] font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
                Signalez les{" "}
                <span className="text-gradient-brand">Coupures</span>
                <br />
                <span className="text-white/60">à Abidjan</span>
              </h1>
            </motion.div>

            {/* Problem-type pills */}
            <motion.div variants={stagger} className="mt-6 flex flex-wrap gap-2">
              {PILLS.map((pill) => (
                <motion.div key={pill.to} variants={scaleIn} whileHover={{ scale: 1.06, y: -2 }} whileTap={{ scale: 0.96 }}>
                  <Link
                    to={pill.to}
                    className={`inline-flex items-center gap-1.5 rounded-full border ${pill.border} ${pill.bg} px-3.5 py-1.5 text-xs font-bold ${pill.text} backdrop-blur-sm transition-all ${pill.hoverBg}`}
                  >
                    {typeof pill.icon === "string" ? pill.icon : pill.icon} {pill.label}
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            {/* Tagline */}
            <motion.p variants={fadeUp} className="mt-6 text-lg font-medium text-white/70 max-w-lg leading-relaxed">
              La première plateforme citoyenne ivoirienne où les habitants signalent les coupures d'eau et d'électricité, confirment celles de leurs voisins et suivent le rétablissement du service en temps réel.
            </motion.p>

            {/* CTA — with dramatic glow */}
            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="relative group"
              >
                {/* Glow behind button */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-water to-electricity opacity-40 blur-xl group-hover:opacity-60 transition-opacity" />
                <Link
                  to="/signaler"
                  className="relative inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-water to-electricity px-10 py-5 text-xl font-extrabold text-white shadow-lg"
                >
                  <Zap className="h-6 w-6 drop-shadow" />
                  Signaler maintenant
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-2" />
                </Link>
              </motion.div>
              <Link
                to="/tableau-de-bord"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-4 text-sm font-semibold text-white/80 backdrop-blur-sm transition-all hover:bg-white/10 hover:text-white"
              >
                <BarChart3 className="h-4 w-4" />
                Voir le dashboard
              </Link>
            </motion.div>

            {/* Communes badges — wave stagger */}
            <motion.div variants={stagger} className="mt-10 flex flex-wrap items-center gap-2">
              <span className="text-xs text-white/40 mr-1">Communes :</span>
              {COMMUNES.map((c) => (
                <motion.div key={c.nom} variants={slideRight} whileHover={{ scale: 1.12, y: -3 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to={`/commune/${encodeURIComponent(c.nom)}`}
                    className="rounded-full px-3 py-1 text-[11px] font-bold text-white transition-all hover:shadow-lg"
                    style={{ backgroundColor: c.couleur + "cc" }}
                  >
                    {c.nom}
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center gap-1"
          >
            <span className="text-[10px] text-white/30 uppercase tracking-widest">Découvrir</span>
            <ChevronDown className="h-4 w-4 text-white/30" />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ FEATURES — Timeline style ═══ */}
      <section className="relative py-24 overflow-hidden">
        {/* Background accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

        <div className="container relative">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-16 text-center"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold text-muted-foreground mb-4"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              Simple & efficace
            </motion.span>
            <h2 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">
              Comment ça <span className="text-gradient-brand">fonctionne</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
              Quatre étapes pour transformer les pannes en actions concrètes
            </p>
          </motion.div>

          {/* Feature grid with connecting line */}
          <div className="relative">
            {/* Connecting line (desktop) */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent -translate-y-1/2 z-0" />

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.step}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <TiltCard className="h-full">
                    <div className="relative overflow-hidden rounded-2xl glass-card-light p-6 h-full transition-shadow duration-300 hover:shadow-elevated group">
                      {/* Step number watermark */}
                      <span className="absolute -right-3 -top-4 font-display text-[5rem] font-black opacity-[0.04] select-none leading-none">
                        {f.step}
                      </span>

                      {/* Accent line at top */}
                      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${f.accentColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                      {/* Step badge */}
                      <div className="flex items-center justify-between mb-5">
                        <motion.span
                          className="text-4xl leading-none"
                          whileHover={{ rotate: [0, -12, 12, -6, 0], transition: { duration: 0.5 } }}
                        >
                          {f.emoji}
                        </motion.span>
                        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${f.iconBg} text-xs font-extrabold ${f.iconColor}`}>
                          {f.step}
                        </span>
                      </div>

                      <h3 className="font-display text-lg font-extrabold text-foreground">{f.title}</h3>
                      <p className={`mt-0.5 text-xs font-semibold uppercase tracking-wider ${f.iconColor}`}>
                        {f.headline}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.description}</p>
                    </div>
                  </TiltCard>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Auth CTA ═══ */}
      {!user && (
        <section className="container py-16">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-elevated p-8 md:p-14 text-center"
          >
            {/* Animated blobs */}
            <motion.div
              animate={{ x: [0, 30, 0], y: [0, -15, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute -top-20 -left-20 h-60 w-60 rounded-full bg-water/8 blur-[80px]"
            />
            <motion.div
              animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-electricity/8 blur-[80px]"
            />

            <div className="relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold text-muted-foreground"
              >
                <Shield className="h-3.5 w-3.5" />
                Gratuit · Sans publicité · Données privées
              </motion.div>
              <h2 className="font-display text-2xl font-extrabold text-foreground md:text-4xl">
                Rejoins la communauté citoyenne
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-muted-foreground leading-relaxed">
                Signale une coupure en <span className="text-electricity font-bold">15 secondes</span>, aide tes voisins et contribue à améliorer les services publics à Abidjan.
              </p>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.35 }}
                className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
              >
                <Button asChild size="lg" className="bg-water text-water-foreground hover:bg-water/90 px-8 font-bold shadow-lg">
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
              </motion.div>
            </div>
          </motion.div>
        </section>
      )}

      {/* ═══ Stats bar — Glass cards ═══ */}
      <section className="relative gradient-hero-rich py-16 overflow-hidden">
        <div className="container relative z-10">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { value: "7", label: "Communes pilotes", icon: <MapPin className="h-5 w-5" />, color: "text-blue-400" },
              {
                value: (() => {
                  const total = COMMUNES.reduce((sum, c) => sum + c.population, 0);
                  return total >= 1_000_000 ? `${(total / 1_000_000).toFixed(2)}M` : `${(total / 1_000).toFixed(0)}k`;
                })(),
                label: "Population couverte",
                icon: <Users className="h-5 w-5" />,
                color: "text-emerald-400",
              },
              { value: "<200m", label: "Rayon vérification", icon: <Radio className="h-5 w-5" />, color: "text-violet-400" },
              {
                value: liveCount !== null ? String(liveCount) : "…",
                label: "Coupures actives",
                live: true,
                icon: <Zap className="h-5 w-5" />,
                color: "text-amber-400",
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="glass-card rounded-2xl p-6 text-center transition-all hover:bg-white/[0.08]">
                  <div className={`mb-3 inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white/5 ${stat.color}`}>
                    {stat.icon}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    {stat.live && (
                      <span className="relative flex h-2 w-2">
                        <span className={`absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 ${liveActive ? "animate-ping" : ""}`} />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
                      </span>
                    )}
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={stat.value}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.25 }}
                        className="font-display text-3xl font-extrabold text-white md:text-4xl"
                      >
                        {stat.live && liveCount !== null ? (
                          <FlipCounter value={liveCount} className="text-3xl font-extrabold md:text-4xl" />
                        ) : (
                          <AnimatedCounter value={stat.value} />
                        )}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                  <p className="text-sm text-white/50">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="border-t border-border bg-card py-12"
      >
        <div className="container">
          <div className="grid gap-10 sm:grid-cols-3 mb-10">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-water to-electricity">
                  <Zap className="h-4.5 w-4.5 text-white" />
                </div>
                <span className="font-display font-extrabold text-foreground">
                  SIGNA<span className="text-gradient-brand">-CI</span>
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Plateforme citoyenne de signalement des coupures d'eau et d'électricité à Abidjan, Côte d'Ivoire.
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-foreground mb-4 uppercase tracking-widest">Navigation</p>
              <div className="flex flex-col gap-2.5">
                <Link to="/signaler" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><Zap className="h-3.5 w-3.5" /> Signaler</Link>
                <Link to="/tableau-de-bord" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><BarChart3 className="h-3.5 w-3.5" /> Dashboard</Link>
                <Link to="/carte" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><Map className="h-3.5 w-3.5" /> Carte</Link>
                <Link to="/verification" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><Users className="h-3.5 w-3.5" /> Vérifier</Link>
                <Link to="/historique" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><History className="h-3.5 w-3.5" /> Historique</Link>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-foreground mb-4 uppercase tracking-widest">Informations</p>
              <div className="flex flex-col gap-2.5">
                <Link to="/a-propos" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><Info className="h-3.5 w-3.5" /> À propos & CGU</Link>
                <Link to="/confidentialite" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><Shield className="h-3.5 w-3.5" /> Confidentialité</Link>
                <Link to="/dons" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><Heart className="h-3.5 w-3.5" /> Soutenir</Link>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-6 flex flex-col items-center justify-between gap-2 sm:flex-row">
            <p className="text-xs text-muted-foreground">© 2026 SIGNA-CI — CivicTech Abidjan</p>
            <p className="text-xs text-muted-foreground">Fait avec ❤️ pour les citoyens d'Abidjan</p>
          </div>
        </div>
      </motion.footer>
      <SOSButtons />
    </div>
  );
};

export default Index;
