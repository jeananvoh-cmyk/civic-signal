import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Zap, Droplets, Building2, BarChart3, Bell, Users, CheckCircle2,
  ArrowRight, Mail, MapPin, TrendingUp, Shield, Clock, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { usePageMeta } from "@/hooks/usePageMeta";

const STATS = [
  { value: "500+", label: "Signalements traités", icon: CheckCircle2, color: "text-primary" },
  { value: "7", label: "Communes couvertes", icon: MapPin, color: "text-blue-500" },
  { value: "72h", label: "Délai moyen de résolution", icon: Clock, color: "text-amber-500" },
  { value: "2 000+", label: "Citoyens actifs", icon: Users, color: "text-emerald-500" },
];

const BENEFITS_CIE_SODECI = [
  {
    icon: Bell,
    title: "Alertes centralisées en temps réel",
    desc: "Recevez toutes les coupures signalées dans votre zone de couverture directement sur votre tableau de bord, avant que les appels clients n'arrivent.",
  },
  {
    icon: MapPin,
    title: "Cartographie géolocalisée",
    desc: "Visualisez instantanément les zones les plus touchées sur une carte interactive pour prioriser les interventions.",
  },
  {
    icon: BarChart3,
    title: "Données & rapports analytiques",
    desc: "Accédez à des statistiques détaillées par commune, type de panne et durée pour améliorer votre planification opérationnelle.",
  },
  {
    icon: MessageSquare,
    title: "Canal de réponse officiel",
    desc: "Répondez directement aux citoyens depuis votre espace partenaire : mises à jour, délais d'intervention, explications — en toute transparence.",
  },
  {
    icon: Shield,
    title: "Gestion de la réputation",
    desc: "Montrez concrètement aux abonnés que vous traitez leurs signalements. Chaque intervention documentée renforce la confiance.",
  },
  {
    icon: TrendingUp,
    title: "Réduction des appels entrants",
    desc: "Les citoyens informés en temps réel appellent moins. SIGNA-CI réduit la pression sur vos centres d'appels.",
  },
];

const BENEFITS_MAIRIE = [
  {
    icon: Building2,
    title: "Tableau de bord dédié",
    desc: "Suivez en temps réel tous les signalements d'infrastructure (voirie, caniveaux, éclairage) dans votre commune.",
  },
  {
    icon: Users,
    title: "Engagement citoyen mesurable",
    desc: "Chaque signalement confirmé par plusieurs citoyens reflète une priorité réelle du terrain — hiérarchisez vos interventions.",
  },
  {
    icon: CheckCircle2,
    title: "Traçabilité des résolutions",
    desc: "Clôturez les signalements résolus et montrez à vos administrés les actions concrètes menées.",
  },
  {
    icon: BarChart3,
    title: "Rapports mensuels automatisés",
    desc: "Exportez des rapports d'activité pour vos réunions de conseil municipal et votre communication institutionnelle.",
  },
];

const PARTNER_TYPES = [
  {
    icon: Zap,
    color: "#F59E0B",
    bg: "bg-amber-500/10",
    title: "CIE",
    subtitle: "Compagnie Ivoirienne d'Électricité",
    desc: "Gérez les coupures d'électricité signalées par vos abonnés et communiquez en temps réel sur vos interventions.",
  },
  {
    icon: Droplets,
    color: "#3B82F6",
    bg: "bg-blue-500/10",
    title: "SODECI",
    subtitle: "Société de Distribution d'Eau de Côte d'Ivoire",
    desc: "Recevez les alertes coupures d'eau et fuites géolocalisées, priorisez vos équipes sur le terrain.",
  },
  {
    icon: Building2,
    color: "#10B981",
    bg: "bg-emerald-500/10",
    title: "Mairies",
    subtitle: "Communes d'Abidjan",
    desc: "Centralisez les remontées terrain de vos citoyens sur la voirie, l'éclairage et les caniveaux.",
  },
];

const FAQ = [
  {
    q: "Combien coûte l'accès partenaire ?",
    a: "L'accès est entièrement gratuit pendant la phase pilote pour toutes les entités publiques et opérateurs de service.",
  },
  {
    q: "Comment fonctionne la vérification des signalements ?",
    a: "Chaque signalement est validé par notre équipe de modération avant d'être transmis. Les doublons et faux signalements sont filtrés automatiquement.",
  },
  {
    q: "Nos données sont-elles sécurisées ?",
    a: "Oui. SIGNA-CI ne partage aucune donnée personnelle citoyenne avec les partenaires. Vous accédez uniquement aux signalements géolocalisés et anonymisés.",
  },
  {
    q: "Peut-on intégrer SIGNA-CI à nos outils existants ?",
    a: "Nous proposons une API REST et des webhooks pour connecter SIGNA-CI à vos systèmes internes (CRM, GIS, helpdesk). Contactez-nous pour en savoir plus.",
  },
];

const PartnersPage = () => {
  usePageMeta({
    title: "Partenaires — SIGNA-CI",
    description: "CIE, SODECI, Mairies d'Abidjan : rejoignez SIGNA-CI pour gérer les signalements citoyens en temps réel et améliorer votre réactivité sur le terrain.",
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <div className="container max-w-4xl px-4 py-16 text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary mb-4">
              🤝 Espace Partenaires
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight">
              Traitez les signalements citoyens<br className="hidden sm:block" /> plus vite, mieux, ensemble.
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-muted-foreground leading-relaxed">
              SIGNA-CI connecte les citoyens d'Abidjan aux opérateurs de services (CIE, SODECI) et aux mairies
              pour accélérer la résolution des pannes et problèmes d'infrastructure.
              Rejoignez la plateforme et montrez à vos usagers que vous agissez.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            <Button asChild size="lg" className="gap-2">
              <a href="mailto:partenaires@signa.ci">
                <Mail className="h-4 w-4" />
                Devenir partenaire
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link to="/transparence">
                <BarChart3 className="h-4 w-4" />
                Voir nos stats
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border py-12">
        <div className="container max-w-4xl px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl border border-border bg-card p-4 text-center"
              >
                <stat.icon className={`h-6 w-6 mx-auto mb-2 ${stat.color}`} />
                <p className="text-2xl font-extrabold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Qui peut rejoindre */}
      <section className="py-14">
        <div className="container max-w-4xl px-4 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Qui peut rejoindre SIGNA-CI ?</h2>
            <p className="text-muted-foreground text-sm">
              Nous travaillons avec tous les acteurs de service public à Abidjan.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {PARTNER_TYPES.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-border bg-card p-5 space-y-3"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${p.bg}`}>
                  <p.icon className="h-6 w-6" style={{ color: p.color }} />
                </div>
                <div>
                  <p className="font-bold text-foreground">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.subtitle}</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bénéfices CIE/SODECI */}
      <section className="py-14 border-t border-border bg-muted/20">
        <div className="container max-w-4xl px-4 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Pour CIE & SODECI</h2>
            <p className="text-sm text-muted-foreground">
              Un outil opérationnel pour gérer les incidents réseau en temps réel.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {BENEFITS_CIE_SODECI.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex gap-4 rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <b.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{b.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{b.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bénéfices Mairies */}
      <section className="py-14 border-t border-border">
        <div className="container max-w-4xl px-4 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Pour les Mairies d'Abidjan</h2>
            <p className="text-sm text-muted-foreground">
              Centralisez les remontées terrain et prouvez votre réactivité aux citoyens.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {BENEFITS_MAIRIE.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex gap-4 rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                  <b.icon className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{b.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{b.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="py-14 border-t border-border bg-muted/20">
        <div className="container max-w-2xl px-4 space-y-8">
          <h2 className="text-2xl font-bold text-foreground text-center">Comment rejoindre la plateforme ?</h2>
          <div className="space-y-4">
            {[
              { step: "1", title: "Contactez-nous", desc: "Envoyez-nous un email à partenaires@signa.ci avec le nom de votre organisation et votre rôle." },
              { step: "2", title: "Démonstration personnalisée", desc: "Nous vous présentons le tableau de bord partenaire adapté à votre cas d'usage (opérateur réseau ou mairie)." },
              { step: "3", title: "Création de votre espace", desc: "Un compte partenaire est créé pour votre équipe. Formation incluse, intégration en moins de 48h." },
              { step: "4", title: "Go live", desc: "Vous recevez les signalements en temps réel et pouvez répondre publiquement aux citoyens depuis votre espace." },
            ].map((s) => (
              <div key={s.step} className="flex gap-4 items-start">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {s.step}
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 border-t border-border">
        <div className="container max-w-2xl px-4 space-y-6">
          <h2 className="text-2xl font-bold text-foreground text-center">Questions fréquentes</h2>
          <div className="space-y-3">
            {FAQ.map((item) => (
              <div key={item.q} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">{item.q}</p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 border-t border-border bg-primary/5">
        <div className="container max-w-md px-4 text-center space-y-5">
          <h2 className="text-2xl font-bold text-foreground">
            Prêt à rejoindre SIGNA-CI ?
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Gratuit pendant la phase pilote. Aucun engagement. Démarrage sous 48h.
          </p>
          <Button asChild size="lg" className="w-full gap-2">
            <a href="mailto:partenaires@signa.ci">
              <Mail className="h-4 w-4" />
              Contacter l'équipe SIGNA-CI
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
          <p className="text-xs text-muted-foreground">
            Vous êtes déjà partenaire ?{" "}
            <Link to="/partner/dashboard" className="text-primary underline">
              Accéder à votre tableau de bord →
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
};

export default PartnersPage;
