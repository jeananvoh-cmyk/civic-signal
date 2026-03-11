import { motion } from "framer-motion";
import { Shield, MapPin, Lock, Eye, Trash2, FileText, Mail, Scale, Globe, Server, AlertTriangle, Users, Bell } from "lucide-react";
import Header from "@/components/Header";
import { Link } from "react-router-dom";

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-3xl py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Politique de confidentialité
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Conformément au cadre juridique ivoirien en matière de protection des données personnelles et de cybersécurité
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Dernière mise à jour : 9 mars 2026</p>
          </div>

          {/* Cadre juridique */}
          <Section icon={<Scale className="h-5 w-5 text-primary" />} title="1. Cadre juridique applicable">
            <p>La présente politique de confidentialité est établie en conformité avec les textes suivants :</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong className="text-foreground">Loi n°2013-450 du 19 juin 2013</strong> relative à la protection des données à caractère personnel
              </li>
              <li>
                <strong className="text-foreground">Loi n°2013-451 du 19 juin 2013</strong> relative à la lutte contre la cybercriminalité
              </li>
              <li>
                <strong className="text-foreground">Loi n°2013-546 du 30 juillet 2013</strong> relative aux transactions électroniques
              </li>
              <li>
                <strong className="text-foreground">Loi n°2017-803 du 7 décembre 2017</strong> d'orientation de la Société de l'Information en Côte d'Ivoire
              </li>
              <li>
                <strong className="text-foreground">Ordonnance n°2012-293 du 21 mars 2012</strong> relative aux télécommunications et aux technologies de l'information et de la communication
              </li>
              <li>
                <strong className="text-foreground">Acte additionnel A/SA.1/01/10</strong> relatif à la protection des données à caractère personnel dans l'espace CEDEAO
              </li>
              <li>
                <strong className="text-foreground">Convention de l'Union Africaine sur la cybersécurité et la protection des données à caractère personnel</strong> (Convention de Malabo, 2014)
              </li>
            </ul>
          </Section>

          {/* Responsable du traitement */}
          <Section icon={<FileText className="h-5 w-5 text-primary" />} title="2. Responsable du traitement">
            <p>
              Conformément à l'<strong className="text-foreground">article 35</strong> de la Loi n°2013-450, le responsable du traitement des données personnelles est :
            </p>
            <div className="mt-3 rounded-xl border border-border bg-muted/50 p-4 text-sm">
              <p><strong className="text-foreground">Identité :</strong> Équipe SIGNA-CI — Initiative CivicTech</p>
              <p><strong className="text-foreground">Email :</strong> signaci@civictech.ci</p>
              <p><strong className="text-foreground">Siège :</strong> Abidjan, Côte d'Ivoire</p>
            </div>
            <p className="mt-3">
              Conformément aux <strong className="text-foreground">articles 5 à 7</strong> de la Loi n°2013-450, une déclaration de traitement de données à caractère personnel a été effectuée auprès de l'<strong className="text-foreground">Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire (ARTCI)</strong>, autorité de protection des données personnelles.
            </p>
          </Section>

          {/* Base légale du traitement */}
          <Section icon={<Scale className="h-5 w-5 text-primary" />} title="3. Base légale et consentement">
            <p>
              Conformément aux <strong className="text-foreground">articles 10 et 11</strong> de la Loi n°2013-450, tout traitement de données personnelles repose sur l'une des bases légales suivantes :
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong className="text-foreground">Consentement explicite</strong> (art. 10) : Avant toute collecte de données, votre consentement libre, spécifique, éclairé et univoque est recueilli. Vous pouvez le retirer à tout moment.
              </li>
              <li>
                <strong className="text-foreground">Intérêt légitime</strong> : L'amélioration des services publics d'eau et d'électricité constitue un intérêt légitime au sens de la loi.
              </li>
              <li>
                <strong className="text-foreground">Mission d'intérêt public</strong> : La collecte de données sur les coupures contribue à la mission de service public.
              </li>
            </ul>
            <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="font-semibold text-foreground mb-1">🔐 Consentement GPS spécifique</p>
              <p className="text-sm">
                Conformément à l'<strong className="text-foreground">article 10</strong>, un consentement distinct et explicite est requis avant toute collecte de coordonnées de géolocalisation. Une case à cocher obligatoire est présentée avant la soumission de chaque signalement.
              </p>
            </div>
          </Section>

          {/* Données collectées */}
          <Section icon={<Eye className="h-5 w-5 text-primary" />} title="4. Données collectées">
            <p>Conformément à l'<strong className="text-foreground">article 16</strong> de la Loi n°2013-450 (principe de minimisation), nous ne collectons que les données strictement nécessaires :</p>
            
            <h3 className="font-semibold text-foreground mt-4 mb-2">a) Données d'identification</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Prénom, nom, adresse email</li>
              <li>Numéro de téléphone (optionnel)</li>
              <li>Type d'utilisateur (ménage ou entreprise)</li>
            </ul>

            <h3 className="font-semibold text-foreground mt-4 mb-2">b) Données de profil</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Commune et quartier de résidence</li>
              <li>Références compteur eau/électricité (optionnel)</li>
            </ul>

            <h3 className="font-semibold text-foreground mt-4 mb-2">c) Données de signalement</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Type de coupure (eau, électricité, infrastructure)</li>
              <li>Description, heure de début</li>
              <li>Nombre de personnes impactées</li>
              <li>Profils vulnérables (bébés, femmes enceintes, personnes âgées)</li>
            </ul>

            <h3 className="font-semibold text-foreground mt-4 mb-2">d) Données sensibles</h3>
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-sm">
                <strong className="text-foreground">⚠️ Données de géolocalisation (art. 21)</strong> : Coordonnées GPS collectées <strong className="text-foreground">uniquement</strong> lors de la soumission d'un signalement, avec consentement explicite préalable.
              </p>
              <p className="text-sm mt-1">
                <strong className="text-foreground">⚠️ Données de vulnérabilité</strong> : Informations sur les profils vulnérables, traitées avec un niveau de protection renforcé conformément à l'<strong className="text-foreground">article 21</strong>.
              </p>
            </div>

            <h3 className="font-semibold text-foreground mt-4 mb-2">e) Photos (optionnel)</h3>
            <p>Images jointes aux signalements, limitées à 5 Mo par fichier.</p>
          </Section>

          {/* GPS */}
          <Section icon={<MapPin className="h-5 w-5 text-primary" />} title="5. Traitement de la position GPS">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-4">
              <p className="font-semibold text-foreground mb-2">🛰️ Garanties spécifiques :</p>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="text-primary font-bold">1.</span>
                  Votre GPS est utilisé <strong className="text-foreground">uniquement pour géolocaliser votre signalement</strong> et identifier votre commune.
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">2.</span>
                  Les positions sont <strong className="text-foreground">arrondies à une décimale</strong> sur la carte publique pour empêcher le suivi précis.
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">3.</span>
                  Votre position <strong className="text-foreground">n'est jamais partagée publiquement</strong> de manière individuelle. Seules les statistiques agrégées par commune sont visibles.
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">4.</span>
                  Votre consentement explicite est requis <strong className="text-foreground">avant chaque enregistrement</strong>.
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-primary" />
                Suppression automatique (art. 36)
              </p>
              <p className="text-sm">
                Conformément à l'<strong className="text-foreground">article 36</strong> de la Loi n°2013-450, lorsque votre signalement est marqué comme <strong className="text-foreground">résolu</strong>, 
                vos coordonnées GPS (latitude et longitude) sont <strong className="text-foreground">automatiquement et définitivement supprimées</strong>. 
                Seules la commune et le quartier sont conservés à des fins statistiques anonymisées.
              </p>
            </div>
          </Section>

          {/* Finalités */}
          <Section icon={<Lock className="h-5 w-5 text-primary" />} title="6. Finalités du traitement">
            <p>Conformément à l'<strong className="text-foreground">article 15</strong> de la Loi n°2013-450 (principe de finalité), vos données sont traitées exclusivement pour :</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Géolocaliser les coupures d'eau et d'électricité par commune et quartier</li>
              <li>Alerter les habitants d'un même quartier en cas de coupure signalée</li>
              <li>Produire des statistiques agrégées pour les opérateurs (CIE, SODECI) et les autorités locales</li>
              <li>Identifier et prioriser les zones à forte concentration de personnes vulnérables</li>
              <li>Améliorer la qualité des services publics d'eau et d'électricité</li>
              <li>Permettre la vérification communautaire (corroboration) des signalements</li>
            </ul>
            <p className="mt-3 text-sm">
              <strong className="text-foreground">Aucun traitement à des fins commerciales, publicitaires ou de profilage</strong> n'est effectué.
            </p>
          </Section>

          {/* Conservation */}
          <Section icon={<Trash2 className="h-5 w-5 text-primary" />} title="7. Durée de conservation">
            <p>Conformément aux <strong className="text-foreground">articles 36 et 37</strong> de la Loi n°2013-450 :</p>
            <div className="mt-3 space-y-3">
              <div className="flex gap-3 items-start">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold mt-0.5">1</span>
                <div>
                  <p className="font-semibold text-foreground">Données de profil</p>
                  <p className="text-sm">Conservées tant que le compte est actif. Supprimées dans les 30 jours suivant la suppression du compte.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold mt-0.5">2</span>
                <div>
                  <p className="font-semibold text-foreground">Signalements actifs</p>
                  <p className="text-sm">Conservés avec coordonnées GPS jusqu'à résolution ou expiration automatique.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold mt-0.5">3</span>
                <div>
                  <p className="font-semibold text-foreground">Signalements résolus</p>
                  <p className="text-sm">Coordonnées GPS <strong className="text-foreground">automatiquement supprimées</strong>. Données anonymisées conservées à des fins statistiques.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold mt-0.5">4</span>
                <div>
                  <p className="font-semibold text-foreground">Photos</p>
                  <p className="text-sm">Conservées tant que le signalement est actif. Supprimées à la résolution.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold mt-0.5">5</span>
                <div>
                  <p className="font-semibold text-foreground">Logs d'audit</p>
                  <p className="text-sm">Conservés 12 mois conformément aux obligations légales de traçabilité.</p>
                </div>
              </div>
            </div>
          </Section>

          {/* Droits des utilisateurs */}
          <Section icon={<Users className="h-5 w-5 text-primary" />} title="8. Vos droits">
            <p>
              Conformément aux <strong className="text-foreground">articles 22 à 29</strong> de la Loi n°2013-450, vous disposez des droits suivants :
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong className="text-foreground">Droit d'information (art. 22-23)</strong> : Vous êtes informé(e) de manière claire et accessible sur le traitement de vos données avant toute collecte.
              </li>
              <li>
                <strong className="text-foreground">Droit d'accès (art. 24)</strong> : Vous pouvez consulter toutes vos données personnelles depuis votre profil ou en nous contactant.
              </li>
              <li>
                <strong className="text-foreground">Droit de rectification (art. 25)</strong> : Vous pouvez modifier vos informations personnelles à tout moment depuis votre profil.
              </li>
              <li>
                <strong className="text-foreground">Droit de suppression (art. 26)</strong> : Vous pouvez supprimer vos signalements à tout moment. La suppression de votre compte entraîne la suppression de toutes vos données.
              </li>
              <li>
                <strong className="text-foreground">Droit d'opposition (art. 27)</strong> : Vous pouvez vous opposer au traitement de vos données et désactiver les notifications depuis votre profil.
              </li>
              <li>
                <strong className="text-foreground">Droit à la portabilité</strong> : Vous pouvez demander l'exportation de vos données dans un format structuré et lisible par machine.
              </li>
              <li>
                <strong className="text-foreground">Retrait du consentement</strong> : Vous pouvez retirer votre consentement à tout moment, sans que cela n'affecte la licéité du traitement antérieur.
              </li>
            </ul>
            <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
              <p><strong className="text-foreground">Comment exercer vos droits :</strong></p>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>Directement depuis votre espace personnel (profil, signalements)</li>
                <li>Par email à <strong className="text-foreground">signaci@civictech.ci</strong></li>
                <li>Délai de réponse : <strong className="text-foreground">30 jours maximum</strong></li>
              </ul>
            </div>
          </Section>

          {/* Sécurité */}
          <Section icon={<Lock className="h-5 w-5 text-primary" />} title="9. Sécurité des données">
            <p>
              Conformément aux <strong className="text-foreground">articles 35 à 40</strong> de la Loi n°2013-450 et à la <strong className="text-foreground">Loi n°2013-451</strong> relative à la cybercriminalité, nous mettons en œuvre les mesures suivantes :
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Chiffrement de toutes les communications (HTTPS/TLS)</li>
              <li>Politiques de sécurité au niveau des lignes (Row Level Security — RLS) sur toutes les tables de la base de données</li>
              <li>Blocage total de l'accès anonyme aux données personnelles via des politiques restrictives</li>
              <li>Accès restreint aux données par rôle (utilisateur, modérateur, administrateur)</li>
              <li>Anonymisation des données publiques via des fonctions serveur sécurisées</li>
              <li>Limitation du stockage : 5 Mo par photo, 5 signalements par jour par utilisateur</li>
              <li>Journalisation et traçabilité des actions administratives (logs d'audit)</li>
              <li>Authentification sécurisée avec confirmation par email</li>
            </ul>
          </Section>

          {/* Transfert de données */}
          <Section icon={<Globe className="h-5 w-5 text-primary" />} title="10. Transfert de données">
            <p>
              Conformément aux <strong className="text-foreground">articles 30 à 34</strong> de la Loi n°2013-450 relatifs au transfert de données hors du territoire national :
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                Nos serveurs sont hébergés par <strong className="text-foreground">Supabase</strong> (infrastructure cloud). Les données peuvent être stockées dans des centres de données situés hors de Côte d'Ivoire.
              </li>
              <li>
                Tout transfert est encadré par des <strong className="text-foreground">clauses contractuelles</strong> garantissant un niveau de protection adéquat.
              </li>
              <li>
                <strong className="text-foreground">Aucune donnée personnelle n'est vendue, louée ou partagée</strong> à des tiers à des fins commerciales.
              </li>
            </ul>
          </Section>

          {/* Sous-traitants */}
          <Section icon={<Server className="h-5 w-5 text-primary" />} title="11. Sous-traitants">
            <p>
              Conformément à l'<strong className="text-foreground">article 40</strong> de la Loi n°2013-450, les sous-traitants suivants accèdent à vos données dans le cadre de leurs prestations :
            </p>
            <div className="mt-3 space-y-2">
              <div className="rounded-lg border border-border p-3">
                <p className="font-semibold text-foreground text-sm">Supabase Inc.</p>
                <p className="text-xs text-muted-foreground">Hébergement, base de données, authentification, stockage de fichiers</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="font-semibold text-foreground text-sm">Lovable (GPT Engineer)</p>
                <p className="text-xs text-muted-foreground">Hébergement de l'application web (frontend)</p>
              </div>
            </div>
            <p className="mt-3 text-sm">
              Chaque sous-traitant est contractuellement tenu de respecter la confidentialité et la sécurité de vos données.
            </p>
          </Section>

          {/* Cookies */}
          <Section icon={<FileText className="h-5 w-5 text-primary" />} title="12. Cookies et stockage local">
            <p>
              Conformément à la <strong className="text-foreground">Loi n°2013-546</strong> relative aux transactions électroniques :
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>
                <strong className="text-foreground">Cookies essentiels</strong> : Utilisés pour l'authentification et le bon fonctionnement de l'application. Aucun consentement requis.
              </li>
              <li>
                <strong className="text-foreground">Stockage local (localStorage)</strong> : Utilisé pour mémoriser vos préférences (thème, langue). Aucune donnée personnelle n'y est stockée.
              </li>
              <li>
                <strong className="text-foreground">Aucun cookie publicitaire</strong> ni de suivi tiers n'est utilisé.
              </li>
            </ul>
          </Section>

          {/* Mineurs */}
          <Section icon={<AlertTriangle className="h-5 w-5 text-primary" />} title="13. Protection des mineurs">
            <p>
              SIGNA-CI est destiné aux personnes majeures (18 ans et plus). Nous ne collectons pas sciemment de données personnelles de mineurs. Si nous découvrons qu'un mineur a fourni des données personnelles, celles-ci seront supprimées dans les meilleurs délais.
            </p>
          </Section>

          {/* Notification de violation */}
          <Section icon={<Bell className="h-5 w-5 text-primary" />} title="14. Notification en cas de violation de données">
            <p>
              Conformément à l'<strong className="text-foreground">article 41</strong> de la Loi n°2013-450 :
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>En cas de violation de données personnelles, l'<strong className="text-foreground">ARTCI</strong> sera notifiée dans les <strong className="text-foreground">72 heures</strong>.</li>
              <li>Les utilisateurs concernés seront informés <strong className="text-foreground">sans délai</strong> si la violation est susceptible d'engendrer un risque élevé pour leurs droits et libertés.</li>
              <li>Les mesures correctives seront mises en œuvre immédiatement.</li>
            </ul>
          </Section>

          {/* Modifications */}
          <Section icon={<FileText className="h-5 w-5 text-primary" />} title="15. Modifications de la politique">
            <p>
              Nous nous réservons le droit de modifier la présente politique de confidentialité. En cas de modification substantielle :
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Vous serez informé(e) par <strong className="text-foreground">notification in-app</strong> et/ou par email</li>
              <li>La date de dernière mise à jour sera actualisée en haut de cette page</li>
              <li>Votre consentement sera de nouveau sollicité si les modifications affectent le traitement de vos données</li>
            </ul>
          </Section>

          {/* Contact & réclamation */}
          <section className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">16. Contact & réclamation</h2>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>Pour toute question relative à la protection de vos données ou pour exercer vos droits :</p>
              <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-2">
                <p>📧 <strong className="text-foreground">signalenergie@civictech.ci</strong></p>
                <p>📱 Depuis votre profil dans l'application</p>
              </div>
              
              <p className="mt-2">
                En cas de litige non résolu, vous pouvez introduire une <strong className="text-foreground">réclamation</strong> auprès de :
              </p>
              <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-2">
                <p className="font-semibold text-foreground">🏛️ ARTCI — Autorité de Régulation des Télécommunications/TIC</p>
                <p>Autorité de protection des données personnelles en Côte d'Ivoire</p>
                <p>🌐 <a href="https://www.artci.ci" target="_blank" rel="noopener noreferrer" className="text-primary underline">www.artci.ci</a></p>
                <p>📍 Abidjan, Côte d'Ivoire</p>
              </div>
            </div>
          </section>

          <div className="text-center space-y-3">
            <Link to="/a-propos" className="text-sm text-primary underline">
              ← Retour à la page À propos
            </Link>
          </div>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            © 2026 SIGNA-CI — CivicTech Abidjan · Version pilote
          </div>
        </motion.div>
      </main>
    </div>
  );
};

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <section className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-card">
    <div className="flex items-center gap-3 mb-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
        {icon}
      </div>
      <h2 className="font-display text-xl font-bold text-foreground">{title}</h2>
    </div>
    <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
      {children}
    </div>
  </section>
);

export default PrivacyPolicyPage;
