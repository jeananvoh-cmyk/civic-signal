import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FileText, AlertTriangle, Users, Scale, RefreshCw, Mail, ShieldCheck, Gavel, Building, ExternalLink } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";

const Section = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
  <section className="mb-8 bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
    <div className="flex items-center gap-2.5 mb-3">
      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
    </div>
    <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">{children}</div>
  </section>
);

const CguPage = () => {
  usePageMeta({
    title: "Conditions Générales d'Utilisation (CGU) & Mentions Légales",
    description: "Conditions d'utilisation de SIGNA.ci régies par le droit ivoirien, la réglementation ARTCI et les lois n° 2013-450 et 2013-451.",
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-4xl py-10">
        
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-3">
            <Scale className="h-3.5 w-3.5" />
            Cadre Juridique Droit Ivoirien & Directives ARTCI
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-foreground mb-3">
            Conditions Générales d'Utilisation & Mentions Légales
          </h1>
          <p className="text-sm text-muted-foreground">
            Dernière mise à jour : 30 juillet 2026 · Version 1.1 officielle
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-muted/40 p-5 mb-8 text-sm text-foreground space-y-2">
          <p className="font-bold text-foreground">Avis aux utilisateurs :</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            L'accès, l'inscription et la soumission d'un signalement sur la plateforme <strong>SIGNA.ci</strong> valent acceptation sans réserve des présentes Conditions Générales d'Utilisation, encadrées par la législation numérique en République de Côte d'Ivoire.
          </p>
        </div>

        <Section icon={FileText} title="1. Objet du Service & Statut de la Plateforme">
          <p>
            SIGNA.ci est une plateforme citoyenne participative d'intérêt public dédiée à la détection, au signalement et à la cartographie des dégradations d'infrastructures urbaines (eau potable, électricité, voirie, canaux, salubrité) en Côte d'Ivoire.
          </p>
          <p>
            SIGNA.ci agit en tant qu'intermédiaire technique et canal civique d'alerte. Les signalements validés et anonymisés sont transmis aux services des Mairies et des opérateurs concessionnaires (CIE, SODECI). SIGNA.ci ne se substitue pas aux services d'urgence de l'État.
          </p>
        </Section>

        <Section icon={Scale} title="2. Cadre Légale & Réglementation Applicable">
          <p>Les présentes CGU sont régies par le droit de la République de Côte d'Ivoire et se conforment à :</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li><strong>Loi n° 2013-450 du 19 juin 2013</strong> relative à la protection des données à caractère personnel (contrôlée par l'<strong>APDP / ARTCI</strong>).</li>
            <li><strong>Loi n° 2013-451 du 19 juin 2013</strong> relative à la lutte contre la cybercriminalité.</li>
            <li><strong>Loi n° 2013-546 du 30 juillet 2013</strong> relative aux transactions électroniques.</li>
            <li>Les décisions et recommandations édictées par l'<strong>ARTCI</strong> (Autorité de Régulation des Télécommunications/TIC).</li>
          </ul>
        </Section>

        <Section icon={Users} title="3. Engagements & Responsabilités des Citoyens">
          <p>Tout utilisateur s'engage à utiliser la plateforme de bonne foi et de manière civique :</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Fournir des informations exactes, sincères et vérifiables lors de la déclaration d'un incident.</li>
            <li>Ne pas publier de fausses alertes, de contenus diffamatoires, d'injures ou de données attentatoires à la vie privée de tiers.</li>
            <li>Ne pas inclure de visages ou de plaques d'immatriculation sans consentement sur les photos jointes.</li>
          </ul>
          
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 mt-3">
            <strong>⚠️ Rappel Légal (Loi n° 2013-451 sur la Cybercriminalité) :</strong> La soumission intentionnelle de faux signalements, l'usurpation d'identité ou la diffusion de fausses nouvelles constituent des infractions pénales passibles des peines prévues par la législation ivoirienne.
          </div>
        </Section>

        <Section icon={ShieldCheck} title="4. Modération & Suppression des Contenus">
          <p>
            SIGNA.ci applique une modération conforme aux standards civiques et aux directives de régulation numérique de l'ARTCI.
          </p>
          <p>
            L'équipe de modération se réserve le droit de refuser, modifier ou supprimer immédiatement tout signalement manifestement infondé, à caractère haineux, diffamatoire ou ne respectant pas les règles d'ordre public.
          </p>
        </Section>

        <Section icon={Gavel} title="5. Droit Applicable & Juridiction Compétente">
          <p>
            Les présentes Conditions Générales d'Utilisation sont exclusivement soumises au **Droit Ivoirien**.
          </p>
          <p>
            En cas de contestation ou de litige relatif à l'interprétation ou à l'exécution des présentes, et à défaut de résolution amiable, compétence exclusive est attribuée aux **Tribunaux compétents d'Abidjan, République de Côte d'Ivoire**.
          </p>
        </Section>

        <Section icon={Mail} title="6. Contact & Mentions Éditeur">
          <p>Pour toute question juridique, signalement d'abus ou demande d'information :</p>
          <div className="p-4 rounded-xl bg-muted/60 border border-border mt-2 text-xs space-y-1">
            <p className="font-bold text-foreground">Éditeur de la Plateforme SIGNA.ci</p>
            <p>Abidjan, République de Côte d'Ivoire</p>
            <p>E-mail contact : <a href="mailto:contact@signa.ci" className="text-primary font-bold underline">contact@signa.ci</a></p>
            <p>E-mail juridique & DPO : <a href="mailto:dpo@signa.ci" className="text-primary font-bold underline">dpo@signa.ci</a></p>
          </div>
        </Section>

      </main>
      <Footer />
    </div>
  );
};

export default CguPage;
