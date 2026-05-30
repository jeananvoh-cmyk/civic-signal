import Header from "@/components/Header";
import { Shield, Mail, Database, Eye, Trash2, Globe } from "lucide-react";

const Section = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
    </div>
    <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">{children}</div>
  </section>
);

const PrivacyPolicyPage = () => (
  <div className="min-h-screen bg-background">
    <Header />
    <main className="container max-w-2xl py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Politique de confidentialité</h1>
        <p className="text-sm text-muted-foreground">
          Dernière mise à jour : 24 mai 2026 · Applicable sur <strong>signa.ci</strong>
        </p>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 mb-8 text-sm text-foreground">
        SIGNA·CI collecte uniquement les données nécessaires au fonctionnement de la plateforme de signalement citoyen.
        Vos données ne sont jamais vendues ni transmises à des tiers à des fins commerciales.
      </div>

      <Section icon={Database} title="Données collectées">
        <p>Lors de votre inscription et utilisation de SIGNA·CI, nous collectons :</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Adresse e-mail (identification, notifications)</li>
          <li>Prénom et nom (optionnel — affichage profil)</li>
          <li>Numéro de téléphone (optionnel — contact en cas de suivi)</li>
          <li>Commune et quartier de résidence (ciblage des alertes locales)</li>
          <li>Données de signalement : description, type d'incident, localisation approximative, photos jointes</li>
          <li>Données d'usage anonymisées : événements d'interaction (sélection de type, soumission, vérification)</li>
        </ul>
      </Section>

      <Section icon={Eye} title="Utilisation des données">
        <p>Vos données sont utilisées pour :</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Afficher et transmettre vos signalements aux opérateurs concernés (CIE, SODECI, Mairies)</li>
          <li>Vous envoyer des notifications push relatives à vos signalements et à votre quartier</li>
          <li>Calculer le Score Citoyen — indicateur d'engagement dans la plateforme</li>
          <li>Améliorer l'expérience de la plateforme via des analyses d'usage agrégées et anonymisées</li>
        </ul>
        <p className="mt-2">
          Les signalements publics (description, commune, type, statut) sont visibles par tous les utilisateurs.
          Votre identité n'est jamais associée publiquement à un signalement.
        </p>
      </Section>

      <Section icon={Globe} title="Partage des données">
        <p>Vos données peuvent être partagées avec :</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>
            <strong>Opérateurs de services publics</strong> (CIE, SODECI, Mairies d'Abidjan) — uniquement les données
            de signalement agrégées nécessaires au traitement des incidents
          </li>
          <li>
            <strong>Supabase</strong> (infrastructure BDD et authentification) — hébergement sécurisé des données
          </li>
          <li>
            <strong>Vercel</strong> (hébergement de l'application) — aucune donnée personnelle transmise
          </li>
        </ul>
        <p className="mt-2">Aucune donnée n'est vendue à des tiers commerciaux.</p>
      </Section>

      <Section icon={Shield} title="Sécurité">
        <p>
          Toutes les communications sont chiffrées via HTTPS. Les données sont stockées sur des serveurs sécurisés.
          L'accès aux données personnelles est restreint au personnel autorisé de SIGNA·CI.
        </p>
        <p className="mt-2">
          Les mots de passe ne sont jamais stockés en clair — l'authentification est gérée par Supabase Auth.
        </p>
      </Section>

      <Section icon={Trash2} title="Vos droits">
        <p>Conformément aux lois applicables en Côte d'Ivoire, vous disposez des droits suivants :</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li><strong>Accès</strong> : obtenir une copie de vos données personnelles</li>
          <li><strong>Rectification</strong> : corriger des données inexactes</li>
          <li><strong>Suppression</strong> : demander la suppression de votre compte et de vos données</li>
          <li><strong>Opposition</strong> : vous opposer à certains traitements</li>
        </ul>
        <p className="mt-2">
          Pour exercer ces droits, contactez-nous à l'adresse indiquée ci-dessous.
          La suppression d'un compte entraîne la suppression de vos données personnelles dans un délai de 30 jours.
          Les signalements publics sont anonymisés et conservés à des fins statistiques.
        </p>
      </Section>

      <Section icon={Mail} title="Contact">
        <p>Pour toute question relative à vos données personnelles ou pour exercer vos droits :</p>
        <p className="mt-2">
          <strong>SIGNA·CI</strong><br />
          Plateforme citoyenne · Abidjan, Côte d'Ivoire<br />
          E-mail : <a href="mailto:contact@signa.ci" className="text-primary hover:underline">contact@signa.ci</a>
        </p>
      </Section>

      <p className="text-xs text-muted-foreground border-t border-border pt-6 mt-4">
        Cette politique peut être mise à jour. La date de dernière modification est indiquée en haut de page.
        L'utilisation continue de la plateforme après modification vaut acceptation de la nouvelle politique.
      </p>
    </main>
  </div>
);

export default PrivacyPolicyPage;
