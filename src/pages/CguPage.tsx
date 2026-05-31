import Header from "@/components/Header";
import { FileText, AlertTriangle, Users, Scale, RefreshCw, Mail } from "lucide-react";

const Section = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
    </div>
    <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">{children}</div>
  </section>
);

const CguPage = () => (
  <div className="min-h-screen bg-background">
    <Header />
    <main className="container max-w-2xl py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Conditions générales d'utilisation
        </h1>
        <p className="text-sm text-muted-foreground">
          Dernière mise à jour : 24 mai 2026 · Version 1.0
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-muted/30 px-5 py-4 mb-8 text-sm text-foreground">
        En utilisant SIGNA·CI, vous acceptez les présentes conditions. Lisez-les attentivement avant de créer un compte
        ou de soumettre un signalement.
      </div>

      <Section icon={FileText} title="Objet du service">
        <p>
          SIGNA·CI est une plateforme citoyenne de signalement d'incidents urbains (coupures d'eau, d'électricité,
          problèmes d'infrastructure) sur les communes pilotes d'Abidjan, Côte d'Ivoire.
        </p>
        <p>
          Le service permet aux citoyens de signaler des incidents, de les corroborer collectivement et de suivre
          leur résolution. SIGNA·CI transmet les signalements agrégés aux opérateurs de services publics (CIE, SODECI,
          Mairies) mais ne garantit pas leur traitement ni leur résolution dans un délai donné.
        </p>
      </Section>

      <Section icon={Users} title="Conditions d'accès">
        <p>L'utilisation de SIGNA·CI est ouverte à toute personne :</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Résidant ou évoluant dans les communes pilotes d'Abidjan</li>
          <li>Disposant d'une adresse e-mail valide</li>
          <li>Agissant de bonne foi et dans un cadre citoyen</li>
        </ul>
        <p className="mt-2">
          Sont expressément interdits : la création de faux signalements, l'usage de la plateforme à des fins
          commerciales, politiques ou partisanes, et toute tentative d'accès non autorisé au système.
        </p>
      </Section>

      <Section icon={AlertTriangle} title="Responsabilité des signalements">
        <p>
          Vous êtes responsable de l'exactitude des informations que vous publiez. SIGNA·CI n'est pas responsable
          des conséquences d'un signalement inexact, frauduleux ou malveillant.
        </p>
        <p>
          Les signalements publiés sont visibles par tous les utilisateurs. Ne publiez pas d'informations personnelles
          vous concernant ou concernant des tiers dans les descriptions ou photos.
        </p>
        <p>
          SIGNA·CI se réserve le droit de supprimer tout signalement ne respectant pas ces conditions, sans préavis.
        </p>
      </Section>

      <Section icon={Scale} title="Propriété intellectuelle">
        <p>
          Le nom SIGNA·CI, son logo, son interface et ses contenus éditoriaux sont la propriété exclusive de leurs
          auteurs. Toute reproduction sans autorisation est interdite.
        </p>
        <p>
          En soumettant un signalement (description, photos), vous accordez à SIGNA·CI une licence non exclusive
          d'utilisation à des fins de service public (transmission aux opérateurs, statistiques agrégées,
          communication institutionnelle).
        </p>
      </Section>

      <Section icon={RefreshCw} title="Modifications du service">
        <p>
          SIGNA·CI peut modifier, suspendre ou interrompre tout ou partie du service à tout moment, notamment pour
          maintenance ou évolution technique. Ces interruptions ne donnent lieu à aucune compensation.
        </p>
        <p>
          Les présentes CGU peuvent être mises à jour. La date de version est indiquée en haut de page.
          La poursuite de l'utilisation après modification vaut acceptation des nouvelles conditions.
        </p>
      </Section>

      <Section icon={Mail} title="Contact et réclamations">
        <p>
          Pour toute question ou réclamation relative au service :
        </p>
        <p className="mt-2">
          <strong>SIGNA·CI</strong><br />
          Plateforme citoyenne · Abidjan, Côte d'Ivoire<br />
          E-mail : <a href="mailto:contact@signa.ci" className="text-primary hover:underline">contact@signa.ci</a>
        </p>
        <p className="mt-2">
          Droit applicable : droit ivoirien. Tout litige est soumis à la compétence exclusive des tribunaux d'Abidjan.
        </p>
      </Section>
    </main>
  </div>
);

export default CguPage;
