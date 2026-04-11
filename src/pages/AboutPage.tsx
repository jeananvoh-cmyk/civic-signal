import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Shield, Users, MapPin, Zap, Droplets, Heart, ExternalLink } from "lucide-react";
import Header from "@/components/Header";
import { COMMUNES } from "@/lib/communes";
import { COMMUNE_LOGOS } from "@/lib/commune-logos";

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-3xl py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-hero">
              <Zap className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              SIGNA<span className="text-water">-CI</span>
            </h1>
            <p className="mt-2 text-muted-foreground">
              Plateforme citoyenne de signalement des coupures d'eau et d'électricité
            </p>
          </div>

          {/* Mission */}
          <section className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">Notre mission</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              SIGNA-CI est la première plateforme citoyenne ivoirienne dédiée à l'amélioration 
              des services publics. Les habitants signalent en temps réel les coupures d'eau et 
              d'électricité, les défaillances d'infrastructures (éclairage public, voirie, 
              assainissement) et, à terme, tout dysfonctionnement affectant leur cadre de vie. 
              En structurant ces données citoyennes, nous fournissons aux opérateurs (CIE, SODECI), 
              aux collectivités et aux autorités locales des indicateurs fiables pour prioriser 
              les interventions et renforcer la qualité des services essentiels sur l'ensemble 
              du territoire.
            </p>
          </section>

          {/* Communes pilotes */}
          <section className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">7 communes pilotes</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {COMMUNES.map((c) => (
                <div key={c.nom} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg overflow-hidden border border-border"
                    style={{ backgroundColor: COMMUNE_LOGOS[c.nom] ? '#fff' : c.couleur }}
                  >
                    {COMMUNE_LOGOS[c.nom] ? (
                      <img src={COMMUNE_LOGOS[c.nom]} alt={c.nom} className="h-full w-full object-contain p-0.5" />
                    ) : (
                      <span className="text-white font-bold text-xs">{c.nom[0]}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{c.nom}</p>
                    <p className="text-xs text-muted-foreground">{(c.population / 1000).toFixed(0)}k hab.</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Comment ça marche */}
          <section className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">Comment ça marche</h2>
            </div>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                <span><strong className="text-foreground">Géolocalisation automatique</strong> — Le GPS détecte votre commune parmi les 7 pilotes.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                <span><strong className="text-foreground">Signalement rapide</strong> — Choisissez eau ou électricité, indiquez les personnes impactées et les éventuelles personnes vulnérables (bébés, femmes enceintes, personnes âgées).</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                <span><strong className="text-foreground">Vérification par les voisins</strong> — Les habitants à proximité confirment la coupure.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">4</span>
                <span><strong className="text-foreground">Dashboard en temps réel</strong> — L'urgence est calculée automatiquement selon la présence de personnes vulnérables. Opérateurs et mairies suivent les statistiques par commune.</span>
              </li>
            </ol>
          </section>

          {/* CGU */}
          <section className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">Conditions d'utilisation</h2>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p><strong className="text-foreground">Données personnelles :</strong> Vos coordonnées GPS exactes ne sont jamais affichées publiquement. Seules les statistiques agrégées par commune sont visibles. Vos coordonnées GPS sont automatiquement supprimées lorsque votre signalement est résolu.</p>
              <p><strong className="text-foreground">Utilisation responsable :</strong> Les faux signalements sont interdits. Toute exagération sur le nombre de personnes impactées fausse les statistiques et pourrait entraîner une suspension de votre compte. Chaque utilisateur est limité à 5 signalements par jour.</p>
              <p><strong className="text-foreground">Propriété des données :</strong> Les données collectées sont utilisées exclusivement pour améliorer les services publics d'eau et d'électricité à Abidjan.</p>
              <p><strong className="text-foreground">Contact :</strong> Pour toute question, contactez-nous à signaci@civictech.ci</p>
              <p className="pt-2">
                <Link to="/confidentialite" className="text-primary underline flex items-center gap-1">
                  <Shield className="h-4 w-4" /> Consulter notre politique de confidentialité complète
                </Link>
              </p>
            </div>
          </section>

          <div className="text-center text-xs text-muted-foreground">
            © 2026 SIGNA-CI — CivicTech Abidjan · Version pilote
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AboutPage;
