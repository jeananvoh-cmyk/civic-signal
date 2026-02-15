import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Droplets, Shield, Users, ArrowRight, BarChart3, MapPin, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { COMMUNES } from "@/lib/communes";
const heroBg = "/images/hero-bg.jpg";
import waterIcon from "@/assets/water-icon-sm.webp";
import electricityIcon from "@/assets/electricity-icon-sm.webp";

const Index = () => {
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

            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white backdrop-blur-sm">05 communes Pilotes — Abidjan
              <Shield className="h-4 w-4" />
              Pilote 5 communes — Abidjan
            </div>

            <h1 className="font-display text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-6xl">
              Plateforme citoyenne pour Signaler les{" "}
              <span className="text-urgent">Coupures</span>{" "}
              <img src={waterIcon} alt="Eau" className="inline-block h-10 w-10 md:h-14 md:w-14 drop-shadow-lg" />{" "}
              <img src={electricityIcon} alt="Électricité" className="inline-block h-10 w-10 md:h-14 md:w-14 drop-shadow-lg" />
            </h1>

            <p className="mt-6 max-w-lg text-xl font-semibold text-white">En 15 Secondes Signales si tu n'as plus d'eau ou l'électricité. 
Tes voisins agissent déjà.<span className="text-electricity">15 Secondes</span> Signales si tu n'as plus d'
              <span className="text-water-light">eau</span> ou l'
              <span className="text-electricity">électricité</span>. Tes voisins agissent déjà.
            </p>

            <div className="mt-8">
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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
          {
            icon: <MapPin className="h-6 w-6" />,
            title: "1. Localisation",
            description: "GPS détecte votre commune automatiquement parmi les 5 pilotes.",
            bgClass: "bg-electricity-light",
            iconClass: "text-electricity"
          },
          {
            icon: <Zap className="h-6 w-6" />,
            title: "2. Signalez",
            description: "Choisissez Eau ou Électricité, indiquez les personnes impactées et confirmez.",
            bgClass: "bg-water-light",
            iconClass: "text-water"
          },
          {
            icon: <Users className="h-6 w-6" />,
            title: "3. Vérifiez",
            description: "Les voisins à moins de 200m confirment pour éliminer les faux positifs.",
            bgClass: "bg-secondary",
            iconClass: "text-primary"
          },
          {
            icon: <BarChart3 className="h-6 w-6" />,
            title: "4. Dashboard",
            description: "Opérateurs et mairies suivent les coupures en temps réel par commune.",
            bgClass: "bg-muted",
            iconClass: "text-foreground"
          }].
          map((feature, i) =>
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card">

              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.bgClass}`}>
                <span className={feature.iconClass}>{feature.icon}</span>
              </div>
              <h3 className="mb-2 font-display text-xl font-bold text-foreground">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </motion.div>
          )}
        </div>
      </section>

      {/* Stats bar */}
      <section className="gradient-hero py-12">
        <div className="container grid gap-8 text-center sm:grid-cols-3">
          {[
          { value: "5", label: "Communes pilotes" },
          { value: "2.58M", label: "Population couverte" },
          { value: "<200m", label: "Rayon vérification" }].
          map((stat, i) =>
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}>

              <p className="font-display text-3xl font-extrabold text-white md:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-white/70">{stat.label}</p>
            </motion.div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-hero">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-sm font-bold text-foreground">
              Signal<span className="text-water">Énergie</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/a-propos" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              À propos & CGU
            </Link>
            <p className="text-xs text-muted-foreground">
              © 2026 SignalÉnergie — CivicTech Abidjan
            </p>
          </div>
        </div>
      </footer>
    </div>);

};

export default Index;