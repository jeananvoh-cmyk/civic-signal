import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Shield, Users, MapPin, Zap, Droplets, Heart, ArrowRight, TrendingUp, Building2, ExternalLink } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SignaLogo from "@/components/SignaLogo";
import { COMMUNES } from "@/lib/communes";
import { COMMUNE_LOGOS } from "@/lib/commune-logos";
import { usePageMeta } from "@/hooks/usePageMeta";

const AboutPage = () => {
  usePageMeta({
    title: "À Propos de SIGNA.ci — Plateforme Citoyenne",
    description: "Découvrez la mission de SIGNA-CI, première plateforme citoyenne collaborative de signalement des pannes et infrastructures en Côte d'Ivoire.",
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-4xl py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          
          {/* En-tête avec Logo Officiel */}
          <div className="mb-12 text-center">
            <div className="inline-block mb-3">
              <SignaLogo size="lg" />
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-black tracking-widest text-emerald-700 dark:text-emerald-300 uppercase">
              SIGNALER · SUIVRE · RÉPARER
            </div>
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground mt-4">
              L'engagement citoyen au service de nos infrastructures
            </h1>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              SIGNA.ci est une initiative technologique et citoyenne indépendante (CivicTech) dédiée à l'amélioration de la qualité de vie à Abidjan et dans toute la Côte d'Ivoire.
            </p>
          </div>

          {/* 1. Notre Mission */}
          <section className="mb-8 rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Heart className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">Notre Mission Civique</h2>
                <p className="text-xs text-muted-foreground">Une passerelle transparente entre les citoyens et les services urbains</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Lorsqu'une coupure d'eau survient, qu'un quartier est plongé dans le noir ou qu'un caniveau déborde, les habitants sont souvent démunis face au manque d'information en temps réel.
            </p>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              <strong>SIGNA.ci</strong> permet à chaque citoyen de signaler un incident en 30 secondes, de géolocaliser la panne et de corroborer les alertes avec ses voisins. En agrégeant ces données en <strong>Open Data</strong>, nous offrons aux opérateurs (CIE, SODECI), aux mairies et aux autorités des indicateurs cartographiques fiables pour prioriser et accélérer les réparations.
            </p>
          </section>

          {/* 2. Comment ça marche en 3 étapes */}
          <section className="mb-8 rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">Comment fonctionne SIGNA.ci ?</h2>
                <p className="text-xs text-muted-foreground">3 étapes simples basées sur la collaboration de quartier</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "1. Signalez en 30s",
                  desc: "Sélectionnez votre type de panne (Eau, Électricité, Voirie) avec détection GPS automatique et photo facultative.",
                  color: "text-emerald-600 dark:text-emerald-400",
                },
                {
                  step: "02",
                  title: "2. Corroborez ensemble",
                  desc: "Les voisins à proximité confirment l'incident en 1 clic pour éliminer les faux positifs et prouver l'urgence.",
                  color: "text-sky-600 dark:text-sky-400",
                },
                {
                  step: "03",
                  title: "3. Suivez la résolution",
                  desc: "Le dossier est transmis aux équipes techniques et vous êtes notifié dès le rétablissement de la situation.",
                  color: "text-amber-600 dark:text-amber-400",
                },
              ].map((s) => (
                <div key={s.step} className="p-4 rounded-2xl border border-border/80 bg-background/50">
                  <span className={`font-black text-sm ${s.color}`}>{s.step}</span>
                  <h3 className="font-bold text-sm text-foreground mt-1">{s.title}</h3>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Les 14 Communes du Grand Abidjan */}
          <section className="mb-8 rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">14 Communes du Grand Abidjan</h2>
                <p className="text-xs text-muted-foreground">Couverture intégrale du District d'Abidjan et villes connectées</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {COMMUNES.map((c) => (
                <Link
                  key={c.nom}
                  to={`/commune/${encodeURIComponent(c.nom)}`}
                  className="flex items-center gap-3 rounded-2xl border border-border p-3 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden border border-border"
                    style={{ backgroundColor: COMMUNE_LOGOS[c.nom] ? '#fff' : c.couleur }}
                  >
                    {COMMUNE_LOGOS[c.nom] ? (
                      <img src={COMMUNE_LOGOS[c.nom]} alt={c.nom} className="h-full w-full object-contain p-0.5" />
                    ) : (
                      <span className="text-white font-bold text-xs">{c.nom[0]}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground text-xs sm:text-sm truncate">{c.nom}</p>
                    <p className="text-[11px] text-muted-foreground">{(c.population / 1000).toFixed(0)}k hab.</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* 4. Liens Rapides Transparence & Données Ouvertes */}
          <section className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-card to-card p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Open Data & Statistiques
                </span>
                <h2 className="font-display text-xl font-bold text-foreground mt-1">
                  Explorez la Transparence des Données
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md">
                  Consultez les délais réels de résolution par opérateur, les taux de traitement et exportez les données publiques.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Link
                  to="/transparence"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 text-xs font-bold shadow transition-all inline-flex items-center gap-1.5"
                >
                  <TrendingUp className="h-4 w-4" />
                  Transparence Open Data
                </Link>
                <Link
                  to="/partenaires"
                  className="rounded-xl border border-border bg-card hover:bg-muted px-4 py-2.5 text-xs font-bold text-foreground transition-all inline-flex items-center gap-1.5"
                >
                  <Building2 className="h-4 w-4" />
                  Mairies & Partenaires
                </Link>
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
