import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  FileText, AlertTriangle, Users, Scale, Mail, ShieldCheck,
  Gavel, Building, ExternalLink, ArrowRight, CheckCircle2,
  Clock, ShieldAlert, BookOpen
} from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";

const Section = ({ id, icon: Icon, title, summary, children }: { id: string; icon: React.ElementType; title: string; summary?: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-24 mb-8 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm">
    <div className="flex items-center gap-3 mb-3">
      <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-lg sm:text-xl font-extrabold text-foreground">{title}</h2>
        {summary && <p className="text-xs text-muted-foreground mt-0.5">{summary}</p>}
      </div>
    </div>
    <div className="text-xs sm:text-sm text-muted-foreground space-y-4 leading-relaxed pt-2">{children}</div>
  </section>
);

const CguPage = () => {
  usePageMeta({
    title: "Conditions Générales d'Utilisation (CGU) & Mentions Légales — SIGNA.ci",
    description: "Conditions d'utilisation de SIGNA.ci régies par le droit ivoirien, la réglementation ARTCI et les lois n° 2013-450 et 2013-451.",
  });

  const TOC_ITEMS = [
    { id: "urgences", label: "1. Avertissement Urgences Vitales", icon: AlertTriangle },
    { id: "objet", label: "2. Objet du Service & Statut", icon: FileText },
    { id: "cadre-legal", label: "3. Cadre Légal & Réglementation", icon: Scale },
    { id: "photos", label: "4. Licence Photos Civiques", icon: BookOpen },
    { id: "engagements", label: "5. Engagements & Sanctions Pénales", icon: Users },
    { id: "moderation", label: "6. Modération & Suppression", icon: ShieldCheck },
    { id: "juridiction", label: "7. Juridiction & Droit Ivoirien", icon: Gavel },
    { id: "contact", label: "8. Contact & Mentions Éditeur", icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        
        {/* En-tête Panoramique */}
        <div className="mb-10 border-b border-border pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-3">
            <Scale className="h-3.5 w-3.5" />
            Cadre Juridique Droit Ivoirien & Directives ARTCI
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight">
            Conditions Générales d'Utilisation &amp; Mentions Légales
          </h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-3xl">
            Dernière mise à jour : 30 juillet 2026 · Version 1.1 officielle · Applicable sur l'ensemble des services web et mobiles <strong>signa.ci</strong>.
          </p>
        </div>

        {/* Layout 2 Colonnes Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Colonne Gauche : Sommaire Sticky (4 colonnes) */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-24 space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">
                Table des matières
              </h3>
              <nav className="space-y-1.5">
                {TOC_ITEMS.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate">{item.label}</span>
                  </a>
                ))}
              </nav>
            </div>

            {/* Encadré Résumé de Garantie Citoyenne */}
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="h-4 w-4" />
                Plateforme d'Intérêt Public
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                SIGNA.ci est un service d'utilité civique neutre, indépendant et non marchand. Vos données ne sont jamais commercialisées.
              </p>
              <a
                href="mailto:dpo@signa.ci"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 underline"
              >
                Contacter le Délégué Juridique (DPO) <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </aside>

          {/* Colonne Droite : Contenu Juridique Détaillé (8 colonnes) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Avis Important */}
            <div className="rounded-3xl border border-border bg-muted/40 p-6 text-xs sm:text-sm text-foreground space-y-2">
              <p className="font-bold text-foreground">Avis aux utilisateurs :</p>
              <p className="text-muted-foreground leading-relaxed">
                L'accès, l'inscription et la soumission d'un signalement sur la plateforme <strong>SIGNA.ci</strong> valent acceptation pleine et entière des présentes Conditions Générales d'Utilisation, encadrées par la législation numérique en République de Côte d'Ivoire.
              </p>
            </div>

            {/* 1. Urgences */}
            <Section
              id="urgences"
              icon={AlertTriangle}
              title="1. Avertissement Urgences Vitales (Non-Substitution)"
              summary="En clair : Ne pas utiliser SIGNA.ci pour des accidents mortels ou incendies immédiats"
            >
              <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200 text-xs leading-relaxed space-y-3">
                <p className="font-extrabold text-sm flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-600" /> AVERTISSEMENT CRITIQUE :
                </p>
                <p>
                  SIGNA.ci est une plateforme citoyenne d'alerte technique et de cartographie des dégradations d'infrastructures publiques. <strong>Elle ne constitue en aucun cas un service d'urgence vitale ou de secours immédiat.</strong>
                </p>
                <p>
                  En cas de danger imminent pour la vie humaine (incendie, électrocution en cours, inondation mortelle, accident grave), vous devez immédiatement composer les numéros officiels d'urgence de la République de Côte d'Ivoire :
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-semibold text-foreground">
                  <div className="p-2.5 rounded-xl bg-background/80 border border-rose-500/20">🚒 Sapeurs-Pompiers (GSPM) : <strong>180</strong></div>
                  <div className="p-2.5 rounded-xl bg-background/80 border border-rose-500/20">👮 Police Nationale : <strong>170 / 110 / 111</strong></div>
                  <div className="p-2.5 rounded-xl bg-background/80 border border-rose-500/20">🚑 SAMU : <strong>185</strong></div>
                  <div className="p-2.5 rounded-xl bg-background/80 border border-rose-500/20">⚡ CIE Dépannage Urgence : <strong>179</strong></div>
                  <div className="p-2.5 rounded-xl bg-background/80 border border-rose-500/20 sm:col-span-2">💧 SODECI Urgence : <strong>175</strong></div>
                </div>
              </div>
            </Section>

            {/* 2. Objet */}
            <Section
              id="objet"
              icon={FileText}
              title="2. Objet du Service & Statut de la Plateforme"
              summary="En clair : Plateforme participative d'intérêt public sans affiliation commerciale"
            >
              <p>
                SIGNA.ci est une plateforme citoyenne participative d'intérêt public dédiée à la détection, au signalement et à la cartographie des dégradations d'infrastructures urbaines (eau potable, électricité, voirie, canaux, salubrité) en Côte d'Ivoire.
              </p>
              <p>
                SIGNA.ci agit en tant qu'intermédiaire technique et canal civique d'alerte. Les signalements validés et anonymisés sont transmis aux services des Mairies et des opérateurs concessionnaires (CIE, SODECI) pour optimiser les plannings de réparation.
              </p>
            </Section>

            {/* 3. Cadre Légal */}
            <Section
              id="cadre-legal"
              icon={Scale}
              title="3. Cadre Légal & Réglementation Applicable"
              summary="En clair : Respect strict des lois ivoiriennes sur le numérique et la cybercriminalité"
            >
              <p>Les présentes CGU sont régies par le droit de la République de Côte d'Ivoire et se conforment à :</p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li><strong>Loi n° 2013-450 du 19 juin 2013</strong> relative à la protection des données à caractère personnel (contrôlée par l'<strong>APDP / ARTCI</strong>).</li>
                <li><strong>Loi n° 2013-451 du 19 juin 2013</strong> relative à la lutte contre la cybercriminalité.</li>
                <li><strong>Loi n° 2013-546 du 30 juillet 2013</strong> relative aux transactions électroniques.</li>
                <li>Les décisions et recommandations édictées par l'<strong>ARTCI</strong> (Autorité de Régulation des Télécommunications/TIC).</li>
              </ul>
            </Section>

            {/* 4. Licence Photos */}
            <Section
              id="photos"
              icon={BookOpen}
              title="4. Licence d'Usage Civique des Photographies"
              summary="En clair : Vous nous autorisez à transmettre les photos de pannes aux techniciens pour réparation"
            >
              <p>
                En téléversant une photographie d'infrastructure sur SIGNA.ci, l'utilisateur garantit qu'il en est l'auteur et concède à titre gracieux, non exclusif et universel, le droit d'utiliser, reproduire et transmettre cette image aux collectivités locales (Mairies, District d'Abidjan), aux opérateurs concessionnaires (CIE, SODECI) et aux observatoires d'Open Data territorial pour les besoins exclusifs de diagnostic, réparation et valorisation de l'action publique.
              </p>
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
                <strong>Règle de vie privée :</strong> Il est strictement interdit de photographier des visages reconnaissables sans consentement, des cours intérieures d'habitations privées ou des plaques d'immatriculation.
              </div>
            </Section>

            {/* 5. Engagements */}
            <Section
              id="engagements"
              icon={Users}
              title="5. Engagements des Citoyens & Sanctions Pénales"
              summary="En clair : Utilisation de bonne foi, interdiction formelle des fausses alertes"
            >
              <p>Tout utilisateur s'engage à utiliser la plateforme de bonne foi et de manière civique :</p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li>Fournir des informations exactes, sincères et vérifiables lors de la déclaration d'un incident.</li>
                <li>Ne pas publier de fausses alertes, de contenus diffamatoires, d'injures ou de données attentatoires à la vie privée de tiers.</li>
              </ul>
              
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 mt-3">
                <strong>⚠️ Rappel Légal (Loi n° 2013-451 sur la Cybercriminalité) :</strong> La soumission intentionnelle de faux signalements, l'usurpation d'identité, la diffusion de fausses nouvelles ou les tentatives de saturation (spam/DDoS) constituent des infractions pénales passibles des peines prévues par la législation ivoirienne.
              </div>
            </Section>

            {/* 6. Modération */}
            <Section
              id="moderation"
              icon={ShieldCheck}
              title="6. Modération & Suppression des Contenus"
              summary="En clair : Filtrage des spams et des propos haineux par nos modérateurs"
            >
              <p>
                SIGNA.ci applique une modération conforme aux standards civiques et aux directives de régulation numérique de l'ARTCI.
              </p>
              <p>
                L'équipe de modération se réserve le droit de refuser, modifier ou supprimer immédiatement tout signalement manifestement infondé, à caractère haineux, diffamatoire ou ne respectant pas les règles d'ordre public.
              </p>
            </Section>

            {/* 7. Juridiction */}
            <Section
              id="juridiction"
              icon={Gavel}
              title="7. Droit Applicable & Juridiction Compétente"
              summary="En clair : Compétence exclusive des tribunaux d'Abidjan"
            >
              <p>
                Les présentes Conditions Générales d'Utilisation sont exclusivement soumises au <strong>Droit Ivoirien</strong>.
              </p>
              <p>
                En cas de contestation ou de litige relatif à l'interprétation ou à l'exécution des présentes, et à défaut de résolution amiable, compétence exclusive est attribuée aux <strong>Tribunaux compétents d'Abidjan, République de Côte d'Ivoire</strong>.
              </p>
            </Section>

            {/* 8. Contact */}
            <Section
              id="contact"
              icon={Mail}
              title="8. Contact & Mentions Éditeur"
              summary="En clair : Coordonnées de l'équipe SIGNA.ci"
            >
              <p>Pour toute question juridique, signalement d'abus ou demande d'information :</p>
              <div className="p-5 rounded-2xl bg-muted/60 border border-border mt-2 text-xs space-y-1.5">
                <p className="font-bold text-foreground text-sm">Éditeur de la Plateforme SIGNA.ci</p>
                <p className="text-muted-foreground">Abidjan, République de Côte d'Ivoire</p>
                <p>E-mail contact : <a href="mailto:contact@signa.ci" className="text-primary font-bold underline">contact@signa.ci</a></p>
                <p>E-mail juridique & DPO : <a href="mailto:dpo@signa.ci" className="text-primary font-bold underline">dpo@signa.ci</a></p>
              </div>
            </Section>

          </div>

        </div>

      </main>
      <Footer />
    </div>
  );
};

export default CguPage;
