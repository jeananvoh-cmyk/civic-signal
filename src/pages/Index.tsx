import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Droplets, Shield, Users, ArrowRight, BarChart3, MapPin, Radio, LogIn, UserPlus, Map, History, Info, Heart } from "lucide-react";
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

const Index = () => {
  const { user } = useAuth();
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [liveActive, setLiveActive] = useState(false);

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .eq("report_category", "outage");
      setLiveCount(count ?? 0);
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

    return () => { supabase.removeChannel(channel); };
  }, []);
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="h-full w-full object-cover" fetchPriority="high" loading="eager" />
          <div className="absolute inset-0 gradient-hero opacity-85" />
        </div>

        <div className="container relative py-24 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-2xl">

            {/* Badges au-dessus du titre */}
            <div className="mb-5 flex flex-wrap items-center gap-3">
              {liveCount !== null && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
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
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm">
                <Shield className="h-4 w-4" />
                05 communes pilotes à Abidjan
              </div>
            </div>

            <h1 className="font-display text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-6xl">
              Plateforme citoyenne pour Signaler les{" "}
              <span className="text-urgent">Coupures</span>{" "}
              <img src={waterIcon} alt="Eau" className="inline-block h-10 w-10 md:h-14 md:w-14 drop-shadow-lg" />{" "}
              <img src={electricityIcon} alt="Électricité" className="inline-block h-10 w-10 md:h-14 md:w-14 drop-shadow-lg" />
            </h1>

            <p className="mt-6 max-w-lg text-xl font-semibold text-white">
              En <span className="text-electricity">15 Secondes</span> Signales si tu n'as plus d'
              <span className="text-water-light">eau</span> ou l'
              <span className="text-electricity">électricité</span>. Tes voisins agissent déjà.
            </p>

            <div className="mt-6">
              <Button asChild size="lg" className="bg-water text-water-foreground hover:bg-water/90 px-12 py-7 text-lg font-bold">
                <Link to="/signaler">
                  <Zap className="mr-2 h-6 w-6" />
                  Signaler une coupure
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            {/* 5 communes badges */}
            <div className="mt-8 flex flex-wrap gap-2">
              {COMMUNES.map((c) =>
              <span
                key={c.nom}
                className="rounded-full px-3 py-1 text-xs font-bold text-white"
                style={{ backgroundColor: c.couleur }}>

                  {c.nom}
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center">

          <h2 className="font-display text-3xl font-bold text-foreground">
            Comment ça fonctionne
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Quatre étapes pour améliorer les services publics à Abidjan
          </p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: "01",
              emoji: "📍",
              title: "Localisation",
              headline: "GPS automatique",
              description: "GPS détecte votre commune automatiquement. Votre signalement est en ligne en moins de 2 minutes.",
              gradient: "from-amber-500/20 to-yellow-500/10",
              border: "border-amber-500/30",
              stepColor: "text-amber-500",
              badge: "bg-amber-500/10 text-amber-600",
            },
            {
              step: "02",
              emoji: "⚡",
              title: "Signalez",
              headline: "3 clics suffisent",
              description: "Choisissez le type de problème, confirmez votre quartier et envoyez.",
              gradient: "from-blue-500/20 to-cyan-500/10",
              border: "border-blue-500/30",
              stepColor: "text-blue-500",
              badge: "bg-blue-500/10 text-blue-600",
            },
            {
              step: "03",
              emoji: "🤝",
              title: "Vérifiez",
              headline: "Voisins solidaires",
              description: "Les voisins à moins de 200 m confirment le signalement pour éliminer les faux positifs.",
              gradient: "from-green-500/20 to-emerald-500/10",
              border: "border-green-500/30",
              stepColor: "text-green-500",
              badge: "bg-green-500/10 text-green-600",
            },
            {
              step: "04",
              emoji: "📊",
              title: "Dashboard",
              headline: "Impact décideur",
              description: "CIE, SODECI et autorités suivent les coupures en temps réel par commune pour améliorer les services.",
              gradient: "from-purple-500/20 to-violet-500/10",
              border: "border-purple-500/30",
              stepColor: "text-purple-500",
              badge: "bg-purple-500/10 text-purple-600",
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`relative overflow-hidden rounded-2xl border ${feature.border} bg-gradient-to-br ${feature.gradient} p-6 backdrop-blur-sm`}
            >
              {/* Step number watermark */}
              <span className={`absolute -right-2 -top-3 font-display text-7xl font-extrabold opacity-[0.06] select-none ${feature.stepColor}`}>
                {feature.step}
              </span>

              {/* Icon + step badge */}
              <div className="mb-4 flex items-center justify-between">
                <span className="text-4xl leading-none">{feature.emoji}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${feature.badge}`}>
                  Étape {feature.step}
                </span>
              </div>

              {/* Text */}
              <h3 className="font-display text-lg font-extrabold text-foreground">{feature.title}</h3>
              <p className={`mt-0.5 text-xs font-semibold uppercase tracking-wider ${feature.stepColor}`}>
                {feature.headline}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Auth CTA inline — only for visitors */}
      {!user && (
        <section className="container py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-card p-8 md:p-12 text-center"
          >
            {/* Decorative background blobs */}
            <div className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-water/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-electricity/10 blur-3xl" />

            <div className="relative">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                Gratuit · Sans publicité · Données privées
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                Rejoins des milliers de citoyens d'Abidjan
              </h2>
              <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                Signale une coupure en <span className="text-electricity font-semibold">15 secondes</span>, aide tes voisins et contribue à améliorer les services publics.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {/* Stats bar */}
      <section className="gradient-hero py-12">
        <div className="container grid gap-8 text-center sm:grid-cols-4">
          {[
            { value: "5", label: "Communes pilotes" },
            { value: "2.58M", label: "Population couverte" },
            { value: "<200m", label: "Rayon vérification" },
            {
              value: liveCount !== null ? String(liveCount) : "…",
              label: "Coupures actives",
              live: true,
            },
          ].map((stat, i) =>
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}>
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
                    {stat.value}
                  </motion.p>
                </AnimatePresence>
              </div>
              <p className="text-sm text-white/70">{stat.label}</p>
            </motion.div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-10">
        <div className="container">
          <div className="grid gap-8 sm:grid-cols-3 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-hero">
                  <Zap className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-display text-sm font-bold text-foreground">
                  Signal<span className="text-water">Énergie</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Plateforme citoyenne de signalement des coupures d'eau et d'électricité à Abidjan, Côte d'Ivoire.
              </p>
            </div>

            {/* Navigation */}
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

            {/* Legal */}
            <div>
              <p className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">Informations</p>
              <div className="flex flex-col gap-2">
                <Link to="/a-propos" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="h-3.5 w-3.5" /> À propos & CGU
                </Link>
                <Link to="/politique-confidentialite" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Shield className="h-3.5 w-3.5" /> Politique de confidentialité
                </Link>
                <Link to="/dons" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Heart className="h-3.5 w-3.5" /> Soutenir le projet
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-6 flex flex-col items-center justify-between gap-2 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              © 2026 SignalÉnergie — CivicTech Abidjan
            </p>
            <p className="text-xs text-muted-foreground">
              Fait avec ❤️ pour les citoyens d'Abidjan
            </p>
          </div>
        </div>
      </footer>
      <SOSButtons />
    </div>);

};

export default Index;