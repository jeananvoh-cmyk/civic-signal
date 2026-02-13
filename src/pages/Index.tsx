import { motion } from "framer-motion";
import { Zap, Droplets, Shield, Users, ArrowRight, BarChart3, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import heroBg from "@/assets/hero-bg.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 gradient-hero opacity-85" />
        </div>

        <div className="container relative py-24 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-2xl"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-sm text-primary-foreground backdrop-blur-sm">
              <Shield className="h-4 w-4" />
              Vérification communautaire — Fiabilité &gt;95%
            </div>

            <h1 className="font-display text-4xl font-extrabold leading-tight text-primary-foreground md:text-5xl lg:text-6xl">
              Signalez les coupures.{" "}
              <span className="text-water-light">Ensemble.</span>
            </h1>

            <p className="mt-6 max-w-lg text-lg text-primary-foreground/80">
              Plateforme citoyenne pour signaler les coupures d'électricité et d'eau en temps réel. 
              Chaque signalement est validé par la communauté.
            </p>

            <div className="mt-8">
              <Button size="lg" className="bg-water text-water-foreground hover:bg-water/90 px-10 py-6 text-base">
                <Zap className="mr-2 h-5 w-5" />
                Signaler une coupure
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
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
          className="mb-12 text-center"
        >
          <h2 className="font-display text-3xl font-bold text-foreground">
            Comment ça fonctionne
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Trois étapes simples pour améliorer la fiabilité des services publics
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: <MapPin className="h-6 w-6" />,
              title: "1. Signalez",
              description: "Localisez-vous par GPS et décrivez la coupure en quelques secondes.",
              bgClass: "bg-electricity-light",
              iconClass: "text-electricity",
            },
            {
              icon: <Users className="h-6 w-6" />,
              title: "2. Vérifiez",
              description: "La communauté confirme le signalement pour éliminer les faux positifs.",
              bgClass: "bg-water-light",
              iconClass: "text-water",
            },
            {
              icon: <BarChart3 className="h-6 w-6" />,
              title: "3. Agissez",
              description: "Les opérateurs reçoivent des données fiables pour prioriser les interventions.",
              bgClass: "bg-secondary",
              iconClass: "text-primary",
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="rounded-xl border border-border bg-card p-6 shadow-card"
            >
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.bgClass}`}>
                <span className={feature.iconClass}>{feature.icon}</span>
              </div>
              <h3 className="mb-2 font-display text-xl font-bold text-foreground">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats bar */}
      <section className="gradient-hero py-12">
        <div className="container grid gap-8 text-center sm:grid-cols-3">
          {[
            { value: "2 340+", label: "Signalements ce mois" },
            { value: "96%", label: "Fiabilité vérifiée" },
            { value: "12 min", label: "Temps moyen de validation" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <p className="font-display text-3xl font-extrabold text-primary-foreground md:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-primary-foreground/70">{stat.label}</p>
            </motion.div>
          ))}
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
          <p className="text-xs text-muted-foreground">
            © 2026 SignalÉnergie — Plateforme CivicTech pour la transparence des services publics
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
