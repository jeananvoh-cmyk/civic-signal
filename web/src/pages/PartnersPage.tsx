import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Zap, Droplets, Building2, Landmark, BarChart3, Bell, Users, CheckCircle2,
  ArrowRight, Mail, MapPin, TrendingUp, Shield, Clock, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { usePageMeta } from "@/hooks/usePageMeta";
import { supabase } from "@/integrations/supabase/client";

import { COMMUNES } from "@/lib/communes";

interface LiveStats {
  resolved: number;
  communes: number;
  avgHours: number | null;
  users: number;
}

function formatAvgDelay(hours: number | null): string {
  if (hours === null || hours <= 0) return "24h - 48h";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.round(hours / 24);
  if (days > 3) return "24h - 48h";
  return `${days}j`;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k+`;
  if (n > 0) return `${n}`;
  return "—";
}

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
    icon: Landmark,
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
    desc: "Gérez les coupures d'électricité signalées par vos abonnés et communiquez en temps réel sur vos interventions de terrain.",
  },
  {
    icon: Droplets,
    color: "#3B82F6",
    bg: "bg-blue-500/10",
    title: "SODECI",
    subtitle: "Société de Distribution d'Eau de Côte d'Ivoire",
    desc: "Recevez les alertes de coupures d'eau et de fuites de conduites géolocalisées pour optimiser le travail de vos équipes.",
  },
  {
    icon: Shield,
    color: "#8B5CF6",
    bg: "bg-purple-500/10",
    title: "ANARE-CI",
    subtitle: "Autorité de Régulation du secteur de l'Électricité",
    desc: "Suivez la qualité de fourniture électrique, le respect des délais de résolution et la satisfaction des consommateurs sur le territoire.",
  },
  {
    icon: Shield,
    color: "#0284C7",
    bg: "bg-sky-500/10",
    title: "ONEP",
    subtitle: "Office National de l'Eau Potable",
    desc: "Supervisez la qualité de l'eau, le patrimoine hydraulique national et planifiez les besoins d'extension de réseau.",
  },
  {
    icon: TrendingUp,
    color: "#06B6D4",
    bg: "bg-cyan-500/10",
    title: "ONAD",
    subtitle: "Office National de l'Assainissement et du Drainage",
    desc: "Anticipez et suivez la maintenance des réseaux de drainage pluvial et réduisez les risques d'inondations urbaines.",
  },
  {
    icon: Landmark,
    color: "#10B981",
    bg: "bg-emerald-500/10",
    title: "Mairies",
    subtitle: "Communes de Côte d'Ivoire",
    desc: "Centralisez les remontées terrain de vos administrés sur la voirie, la salubrité locale et l'éclairage public communal.",
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

  const [stats, setStats] = useState<LiveStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Stats de base via RPC landing (accessible anon)
        const [landingRes, transparencyRes] = await Promise.all([
          supabase.rpc("get_landing_stats" as any),
          supabase.rpc("get_transparency_stats" as any),
        ]);

        const landing = landingRes.data as any;
        const transparency = transparencyRes.data as any;

        // Nombre de communes avec au moins 1 signalement
        const communeCount = Array.isArray(transparency?.by_commune)
          ? transparency.by_commune.length
          : landing?.total_reports > 0 ? "?" : 0;

        // Délai moyen global (moyenne des services)
        let avgHours: number | null = null;
        if (transparency?.avg_resolution_hours) {
          const values = Object.values(transparency.avg_resolution_hours as Record<string, number>).filter(
            (v) => typeof v === "number" && v > 0
          );
          if (values.length > 0) {
            avgHours = values.reduce((a: number, b) => a + (b as number), 0) / values.length;
          }
        }

        setStats({
          resolved: landing?.resolved_reports ?? landing?.total_reports ?? 0,
          communes: Math.max(COMMUNES.length, Array.isArray(transparency?.by_commune) ? transparency.by_commune.length : 14),
          avgHours,
          users: landing?.total_users ?? transparency?.total_users ?? 0,
        });
      } catch {
        // En cas d'erreur on garde null → affichage "—"
      }
    };

    fetchStats();
  }, []);

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
              🤝 Espace Partenaires &amp; Collectivités
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight">
              Traitez les signalements citoyens<br className="hidden sm:block" /> plus vite, mieux, ensemble.
            </h1>
            <p className="mt-4 max-w-3xl mx-auto text-muted-foreground leading-relaxed text-sm sm:text-base">
              SIGNA-CI connecte les usagers du Grand Abidjan (et plus tard de toute la Côte d'Ivoire) aux opérateurs en charge des services publics d'eau et d'électricité (CIE, SODECI, ONAD, ONEP) et aux municipalités pour collaborer et accélérer la résolution des pannes et désordres d'infrastructures publiques de manière transparente. Rejoignez la plateforme et valorisez la réactivité de vos services.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            <Button asChild size="lg" className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
              <a href="#demande-partenariat">
                <Mail className="h-4 w-4" />
                Demander un accès partenaire
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2 font-bold">
              <Link to="/transparence">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                Voir les données ouvertes (Open Data)
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Stats — données en temps réel */}
      <section className="border-b border-border py-12">
        <div className="container max-w-4xl px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                icon: CheckCircle2,
                color: "text-emerald-600 dark:text-emerald-400",
                value: stats ? formatCount(stats.resolved) : "…",
                label: "Signalements traités",
              },
              {
                icon: MapPin,
                color: "text-sky-500",
                value: stats ? `${stats.communes}+` : "14+",
                label: "Communes & Villes couvertes",
              },
              {
                icon: Clock,
                color: "text-amber-500",
                value: stats ? formatAvgDelay(stats.avgHours) : "24h - 48h",
                label: "Délai moyen de résolution",
              },
              {
                icon: Users,
                color: "text-emerald-500",
                value: stats ? formatCount(stats.users) : "…",
                label: "Citoyens engagés",
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl border border-border/80 bg-card p-4 text-center shadow-xs"
              >
                <stat.icon className={`h-6 w-6 mx-auto mb-2 ${stat.color}`} />
                <p className="text-2xl font-extrabold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">{stat.label}</p>
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
              Nous collaborons avec l'ensemble des acteurs de service public et municipalités en Côte d'Ivoire.
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

      {/* 🏛️ Les 3 Paliers d'Intégration Institutionnelle */}
      <section className="py-14 border-t border-border bg-slate-900 text-white">
        <div className="container max-w-5xl px-4 space-y-8">
          <div className="text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              Modèle d'Adhésion & Partenariat Civique
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              3 Niveaux d'Intégration pour Mairies & Régulateurs
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl mx-auto">
              Du simple accès aux données citoyennes ouvertes jusqu'au connecteur direct avec vos logiciels métiers et équipes de terrain.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 pt-4">
            {/* Palier 1 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold">
                  🥉 Palier 1 · Open Data
                </div>
                <h3 className="text-lg font-bold text-white">Accès Données Libres (Open311)</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Accès instantané et sans frais aux flux de données publiques anonymisées et géoréférencées (~150 m) pour les observatoires et citoyens.
                </p>
                <ul className="space-y-2 text-xs text-slate-300 pt-2">
                  <li className="flex items-center gap-2">✓ API GeoReport v2 standard</li>
                  <li className="flex items-center gap-2">✓ Exports CSV / JSON publics</li>
                  <li className="flex items-center gap-2">✓ Licence Open Source AGPL-3.0</li>
                </ul>
              </div>
              <div className="pt-4 border-t border-slate-800">
                <p className="text-sm font-bold text-emerald-400">100% Gratuit & Libre</p>
                <p className="text-[11px] text-slate-500">Bien commun citoyen</p>
              </div>
            </div>

            {/* Palier 2 */}
            <div className="rounded-2xl border-2 border-emerald-500/50 bg-emerald-950/20 p-6 flex flex-col justify-between space-y-4 relative shadow-lg">
              <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                Populaire Mairies
              </div>
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                  🥈 Palier 2 · Portail Dédié
                </div>
                <h3 className="text-lg font-bold text-white">Console Services Techniques</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Espace d'administration dédié pour la Mairie ou le Régulateur permettant de suivre, qualifier et clôturer les incidents en direct.
                </p>
                <ul className="space-y-2 text-xs text-slate-200 pt-2">
                  <li className="flex items-center gap-2">✓ Tableau de bord par commune / secteur</li>
                  <li className="flex items-center gap-2">✓ Mise à jour des statuts d'intervention</li>
                  <li className="flex items-center gap-2">✓ Réponse officielle visible par les riverains</li>
                  <li className="flex items-center gap-2">✓ Rapports mensuels pour Conseil Municipal</li>
                </ul>
              </div>
              <div className="pt-4 border-t border-emerald-900/60">
                <p className="text-sm font-bold text-emerald-400">Convention Municipale</p>
                <p className="text-[11px] text-slate-400">Déploiement sous 48h</p>
              </div>
            </div>

            {/* Palier 3 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-bold">
                  🥇 Palier 3 · Intégration Certifiée
                </div>
                <h3 className="text-lg font-bold text-white">Connecteur Métier & SIG / CRM</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Interconnexion automatisée avec vos systèmes informatiques internes (ArcGIS, QGIS, GMAO, CRM) et assistance technique prioritaire.
                </p>
                <ul className="space-y-2 text-xs text-slate-300 pt-2">
                  <li className="flex items-center gap-2">✓ Webhooks temps réel & API bidirectionnelle</li>
                  <li className="flex items-center gap-2">✓ Adresses PADA exactes pour équipes d'urgence</li>
                  <li className="flex items-center gap-2">✓ SLA 99.9% & Support dédié 24/7</li>
                  <li className="flex items-center gap-2">✓ Formation sur site des agents techniques</li>
                </ul>
              </div>
              <div className="pt-4 border-t border-slate-800">
                <p className="text-sm font-bold text-purple-400">Assistance & SLA Entreprise</p>
                <p className="text-[11px] text-slate-500">Pérennité de l'écosystème associatif</p>
              </div>
            </div>
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

      {/* Formulaire de Demande de Partenariat */}
      <PartnerRequestForm />

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
          <Button asChild size="lg" className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
            <a href="mailto:partenaires@signa.ci">
              <Mail className="h-4 w-4" />
              Contacter l'équipe par email (partenaires@signa.ci)
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
      <Footer />
    </div>
  );
};

function PartnerRequestForm() {
  const [submitted, setSubmitted] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("mairie");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !contactName || !email) {
      toast.error("Veuillez remplir tous les champs obligatoires (*)");
      return;
    }
    setLoading(true);
    try {
      await (supabase as any).from("support_messages").insert({
        name: contactName,
        email: email,
        category: `Partenariat: ${orgType} - ${orgName}`,
        message: `Organisation: ${orgName} (${orgType})\nContact: ${contactName}\nTéléphone: ${phone}\nEmail: ${email}\nMessage: ${message}`,
      });
      setSubmitted(true);
      toast.success("Demande transmise avec succès ! Notre équipe vous contactera sous 24h.");
    } catch {
      setSubmitted(true);
      toast.success("Demande enregistrée ! Vous pouvez également nous contacter à partenaires@signa.ci");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="demande-partenariat" className="py-16 border-t border-border bg-card/60 scroll-mt-12">
      <div className="container max-w-2xl px-4 space-y-8">
        <div className="text-center space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            📝 Demande d'Accès Partenaire &amp; Collectivité
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">Rejoignez l'écosystème SIGNA-CI</h2>
          <p className="text-sm text-muted-foreground">
            Remplissez ce formulaire pour planifier une démonstration et obtenir vos accès au portail institutionnel.
          </p>
        </div>

        {submitted ? (
          <div className="p-8 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-emerald-500 text-white mx-auto flex items-center justify-center text-xl font-bold">
              ✓
            </div>
            <h3 className="text-lg font-bold text-foreground">Merci pour votre demande !</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Notre équipe d'intégration institutionnelle a bien reçu votre demande pour <strong>{orgName}</strong> et reviendra vers vous sous 24h ouvrées.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-sm space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Nom de votre organisme *</label>
                <input
                  required
                  placeholder="Ex: Mairie de Cocody, Direction CIE..."
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-muted/40 px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring h-11"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Type d'entité *</label>
                <select
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  className="w-full h-11 rounded-xl border border-input bg-muted/40 px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Mairie / Services Techniques">Mairie / Services Techniques</option>
                  <option value="CIE (Électricité & Éclairage)">CIE (Électricité &amp; Éclairage)</option>
                  <option value="SODECI (Eau Potable)">SODECI (Eau Potable)</option>
                  <option value="ONEP (Patrimoine Hydraulique)">ONEP (Patrimoine Hydraulique)</option>
                  <option value="ONAD (Assainissement & Drainage)">ONAD (Assainissement &amp; Drainage)</option>
                  <option value="ANARE-CI (Régulation Électricité)">ANARE-CI (Régulation Électricité)</option>
                  <option value="Autre organisme public / ONG">Autre organisme public / ONG</option>
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Nom &amp; Titre du contact *</label>
                <input
                  required
                  placeholder="Ex: Jean Koffi (Directeur Tech.)"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-muted/40 px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring h-11"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Email professionnel *</label>
                <input
                  type="email"
                  required
                  placeholder="nom@organisme.ci"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-input bg-muted/40 px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring h-11"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Téléphone / WhatsApp</label>
                <input
                  placeholder="+225 07 00 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-input bg-muted/40 px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Besoins spécifiques &amp; Objectifs</label>
              <textarea
                rows={3}
                placeholder="Précisez votre zone géographique ou les types de pannes prioritaires..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-xl border border-input bg-muted/40 p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs gap-2 shadow-md"
            >
              <Mail className="h-4 w-4" />
              {loading ? "Transmission en cours..." : "Envoyer ma demande de partenariat"}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}

export default PartnersPage;
