import { Link } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Zap, Droplets, Shield, Users, ArrowRight, BarChart3, MapPin, Radio, LogIn, UserPlus, Map, History, Info, Heart } from "lucide-react";
import SOSButtons from "@/components/SOSButtons";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { COMMUNES } from "@/lib/communes";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
const heroBg = "/images/hero-bg.jpg";
import waterIcon from "@/assets/water-icon-sm.webp";
import electricityIcon from "@/assets/electricity-icon-sm.webp";

/* ── Animation variants ── */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  show: { opacity: 1, scale: 1, transition: { type: "spring" as const, stiffness: 260, damping: 20 } },
};

const slideRight = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

/* ── Tilt card component ── */
const TiltCard = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-6, 6]);

  const handleMouse = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
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
    const duration = 1200;
    const steps = 30;
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
  { to: "/signaler?type=water_outage", border: "border-water/40", bg: "bg-water/20", hoverBg: "hover:bg-water/35", text: "text-white", icon: <img src={waterIcon} alt="" className="h-4 w-4" />, label: "Coupures d'eau" },
  { to: "/signaler?type=electricity_outage", border: "border-primary/40", bg: "bg-primary/20", hoverBg: "hover:bg-primary/35", text: "text-white", icon: <img src={electricityIcon} alt="" className="h-4 w-4" />, label: "Coupures d'électricité" },
  { to: "/signaler?type=street_light", border: "border-warning/30", bg: "bg-warning/20", hoverBg: "hover:bg-warning/30", text: "text-white", icon: "💡", label: "Lampadaires cassés" },
  { to: "/signaler?type=drain_blocked", border: "border-water/30", bg: "bg-water/15", hoverBg: "hover:bg-water/25", text: "text-white", icon: "🌧️", label: "Caniveaux bouchés" },
  { to: "/signaler?type=pothole", border: "border-white/20", bg: "bg-white/10", hoverBg: "hover:bg-white/20", text: "text-white", icon: "🛣️", label: "Routes dégradées" },
];

const Index = () => {
  const { user } = useAuth();
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [liveActive, setLiveActive] = useState(false);

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

      {/* ═══ Hero ═══ */}
      <section className="relative overflow-hidden">
        <motion.div
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute inset-0"
        >
          <img src={heroBg} alt="" className="h-full w-full object-cover" fetchPriority="high" loading="eager" />
          <div className="absolute inset-0 gradient-hero opacity-85" />
        </motion.div>

        <div className="container relative py-24 md:py-32">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="max-w-2xl"
          >
            {/* Badges */}
            <motion.div variants={fadeUp} className="mb-5 flex flex-wrap items-center gap-3">
              {liveCount !== null && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-colors ${
                    liveCount > 0
                      ? "border-red-400/40 bg-red-500/20 text-red-200"
                      : "border-green-400/40 bg-green-500/20 text-green-200"
                  }`}
                >
                  <Radio className={`h-3.5 w-3.5 ${liveActive ? "animate-pulse" : ""}`} />
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={liveCount}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.2 }}
                    >
                      {liveCount > 0 ? `${liveCount} coupure${liveCount > 1 ? "s" : ""} active${liveCount > 1 ? "s" : ""}` : "Aucune coupure active"}
                    </motion.span>
                  </AnimatePresence>
                </motion.div>
              )}
              <motion.div
                variants={scaleIn}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm"
              >
                <Shield className="h-4 w-4" />
                07 communes pilotes à Abidjan
              </motion.div>
            </motion.div>

            {/* Title */}
            <motion.h1
              variants={fadeUp}
              className="font-display text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-6xl"
            >
              La Première Plateforme Ivoirienne{" "}
              pour <span className="text-urgent">Signaler les </span>
            </motion.h1>

            {/* Problem-type pills — staggered */}
            <motion.div variants={stagger} className="mt-4 flex flex-wrap gap-2">
              {PILLS.map((pill) => (
                <motion.div key={pill.to} variants={scaleIn} whileHover={{ scale: 1.08, y: -2 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    to={pill.to}
                    className={`inline-flex items-center gap-1.5 rounded-full border ${pill.border} ${pill.bg} px-3 py-1.5 text-xs font-bold ${pill.text} backdrop-blur-sm transition-colors ${pill.hoverBg}`}
                  >
                    {typeof pill.icon === "string" ? pill.icon : pill.icon} {pill.label}
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            {/* Tagline */}
            <motion.p variants={fadeUp} className="mt-5 text-xl font-extrabold text-white">
              Vos voisins agissent déjà.
            </motion.p>

            {/* CTA — with glow pulse */}
            <motion.div variants={fadeUp} className="mt-8">
              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                animate={{ boxShadow: ["0 8px 32px rgba(14,165,233,0.35)", "0 8px 48px rgba(14,165,233,0.6)", "0 8px 32px rgba(14,165,233,0.35)"] }}
                transition={{ boxShadow: { duration: 2.5, repeat: Infinity, ease: "easeInOut" }, scale: { duration: 0.2 } }}
                className="inline-block rounded-2xl"
              >
                <Link
                  to="/signaler"
                  className="group inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-water to-electricity px-10 py-5 text-xl font-extrabold text-white"
                >
                  <Zap className="h-6 w-6 drop-shadow" />
                  Signaler
                  <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1.5" />
                </Link>
              </motion.div>
            </motion.div>

            {/* 7 communes badges — wave stagger */}
            <motion.div variants={stagger} className="mt-8 flex flex-wrap gap-2">
              {COMMUNES.map((c, i) => (
                <motion.div
                  key={c.nom}
                  variants={slideRight}
                  whileHover={{ scale: 1.1, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to={`/commune/${encodeURIComponent(c.nom)}`}
                    className="rounded-full px-3 py-1 text-xs font-bold text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: c.couleur }}
                  >
                    {c.nom}
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══ Features ═══ */}
      <section className="container py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <h2 className="font-display text-3xl font-bold text-foreground">
            Comment ça fonctionne
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Quatre étapes pour améliorer les services publics à Abidjan
          </p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            { step: "01", emoji: "📍", title: "Localisation", headline: "GPS automatique", description: "GPS détecte votre commune automatiquement. Votre signalement est en ligne en moins de 2 minutes.", gradient: "from-amber-500/20 to-yellow-500/10", border: "border-amber-500/30", stepColor: "text-amber-500", badge: "bg-amber-500/10 text-amber-600" },
            { step: "02", emoji: "⚡", title: "Signalez", headline: "3 clics suffisent", description: "Choisissez le type de problème, confirmez votre quartier et envoyez.", gradient: "from-blue-500/20 to-cyan-500/10", border: "border-blue-500/30", stepColor: "text-blue-500", badge: "bg-blue-500/10 text-blue-600" },
            { step: "03", emoji: "🤝", title: "Vérifiez", headline: "Voisins solidaires", description: "Les voisins à moins de 200 m confirment le signalement pour éliminer les faux positifs.", gradient: "from-green-500/20 to-emerald-500/10", border: "border-green-500/30", stepColor: "text-green-500", badge: "bg-green-500/10 text-green-600" },
            { step: "04", emoji: "📊", title: "Dashboard", headline: "Impact décideur", description: "CIE, SODECI et autorités suivent les coupures en temps réel par commune pour améliorer les services.", gradient: "from-purple-500/20 to-violet-500/10", border: "border-purple-500/30", stepColor: "text-purple-500", badge: "bg-purple-500/10 text-purple-600" },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.12, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <TiltCard className={`relative overflow-hidden rounded-2xl border ${feature.border} bg-gradient-to-br ${feature.gradient} p-6 backdrop-blur-sm transition-shadow duration-300 hover:shadow-lg h-full`}>
                <span className={`absolute -right-2 -top-3 font-display text-7xl font-extrabold opacity-[0.06] select-none ${feature.stepColor}`}>
                  {feature.step}
                </span>
                <div className="mb-4 flex items-center justify-between">
                  <motion.span
                    className="text-4xl leading-none"
                    whileHover={{ rotate: [0, -10, 10, -5, 0], transition: { duration: 0.5 } }}
                  >
                    {feature.emoji}
                  </motion.span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${feature.badge}`}>
                    Étape {feature.step}
                  </span>
                </div>
                <h3 className="font-display text-lg font-extrabold text-foreground">{feature.title}</h3>
                <p className={`mt-0.5 text-xs font-semibold uppercase tracking-wider ${feature.stepColor}`}>
                  {feature.headline}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ Auth CTA ═══ */}
      {!user && (
        <section className="container py-16">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-card p-8 md:p-12 text-center"
          >
            <motion.div
              animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-water/10 blur-3xl"
            />
            <motion.div
              animate={{ x: [0, -15, 0], y: [0, 15, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-electricity/10 blur-3xl"
            />

            <div className="relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold text-muted-foreground"
              >
                <Shield className="h-3.5 w-3.5" />
                Gratuit · Sans publicité · Données privées
              </motion.div>
              <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                Rejoins des milliers de citoyens d'Abidjan
              </h2>
              <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                Signale une coupure en <span className="text-electricity font-semibold">15 secondes</span>, aide tes voisins et contribue à améliorer les services publics.
              </p>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.35 }}
                className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
              >
                <Button asChild size="lg" className="bg-water text-water-foreground hover:bg-water/90 px-8 font-bold">
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

      {/* ═══ Stats bar ═══ */}
      <section className="gradient-hero py-12">
        <div className="container grid gap-8 text-center sm:grid-cols-4">
          {[
            { value: "7", label: "Communes pilotes" },
            {
              value: (() => {
                const total = COMMUNES.reduce((sum, c) => sum + c.population, 0);
                return total >= 1_000_000
                  ? `${(total / 1_000_000).toFixed(2)}M`
                  : `${(total / 1_000).toFixed(0)}k`;
              })(),
              label: "Population couverte",
            },
            { value: "<200m", label: "Rayon vérification" },
            {
              value: liveCount !== null ? String(liveCount) : "…",
              label: "Coupures actives",
              live: true,
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                {stat.live && <Radio className={`h-3.5 w-3.5 text-white/70 ${liveActive ? "animate-pulse" : ""}`} />}
                <AnimatePresence mode="wait">
                  <motion.p
                    key={stat.value}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.25 }}
                    className="font-display text-3xl font-extrabold text-white md:text-4xl"
                  >
                    {stat.live ? stat.value : <AnimatedCounter value={stat.value} />}
                  </motion.p>
                </AnimatePresence>
              </div>
              <p className="text-sm text-white/70">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="border-t border-border bg-card py-10"
      >
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
                <Link to="/signaler" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"><Zap className="h-3.5 w-3.5" /> Signaler une coupure</Link>
                <Link to="/tableau-de-bord" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"><BarChart3 className="h-3.5 w-3.5" /> Tableau de Bord Public</Link>
                <Link to="/carte" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"><Map className="h-3.5 w-3.5" /> Carte interactive</Link>
                <Link to="/verification" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"><Users className="h-3.5 w-3.5" /> Vérifier un signalement</Link>
                <Link to="/historique" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"><History className="h-3.5 w-3.5" /> Historique</Link>
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
