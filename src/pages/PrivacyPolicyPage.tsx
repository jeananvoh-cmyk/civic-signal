import { motion } from "framer-motion";
import { Shield, MapPin, Lock, Eye, Trash2, FileText, Mail } from "lucide-react";
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
              Conformément à la loi n°2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel en Côte d'Ivoire
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Dernière mise à jour : 15 février 2026</p>
          </div>

          {/* Responsable du traitement */}
          <Section icon={<FileText className="h-5 w-5 text-primary" />} title="1. Responsable du traitement">
            <p>
              SignalÉnergie est une initiative CivicTech. Le responsable du traitement des données 
              personnelles est l'équipe SignalÉnergie, joignable à <strong className="text-foreground">signalenergie@civictech.ci</strong>.
            </p>
            <p>
              Conformément à la <strong className="text-foreground">loi n°2013-450</strong> relative à la protection des données à caractère personnel 
              et aux recommandations de l'<strong className="text-foreground">ARTCI</strong> (Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire), 
              nous nous engageons à protéger la vie privée de nos utilisateurs.
            </p>
          </Section>

          {/* Données collectées */}
          <Section icon={<Eye className="h-5 w-5 text-primary" />} title="2. Données collectées">
            <p>Nous collectons les données suivantes dans le cadre de l'utilisation du service :</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong className="text-foreground">Identité</strong> : prénom, nom, adresse email, numéro de téléphone (optionnel)</li>
              <li><strong className="text-foreground">Profil</strong> : type d'utilisateur (ménage ou entreprise), commune, quartier</li>
              <li><strong className="text-foreground">Signalements</strong> : type de coupure, description, nombre de personnes impactées, profils vulnérables</li>
              <li><strong className="text-foreground">Position GPS</strong> : coordonnées géographiques, <strong>uniquement lors de la soumission d'un signalement</strong> et avec votre consentement explicite</li>
              <li><strong className="text-foreground">Photos</strong> : images jointes aux signalements (optionnel)</li>
            </ul>
          </Section>

          {/* GPS — Section spéciale */}
          <Section icon={<MapPin className="h-5 w-5 text-primary" />} title="3. Utilisation de la position GPS">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-4">
              <p className="font-semibold text-foreground mb-2">🛰️ Comment nous utilisons votre position GPS :</p>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="text-primary font-bold">1.</span>
                  Votre GPS est utilisé <strong className="text-foreground">uniquement pour géolocaliser votre signalement</strong> et identifier votre commune.
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">2.</span>
                  Votre position GPS <strong className="text-foreground">n'est jamais partagée publiquement</strong>. Seules les statistiques agrégées par commune sont visibles.
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">3.</span>
                  Votre consentement explicite est requis avant tout enregistrement de votre position.
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
              <p className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-green-600" />
                Suppression automatique des coordonnées GPS
              </p>
              <p className="text-sm">
                Lorsque votre signalement est marqué comme <strong className="text-foreground">résolu</strong>, 
                vos coordonnées GPS (latitude et longitude) sont <strong className="text-foreground">automatiquement et définitivement supprimées</strong> de 
                notre base de données. Nous ne conservons que la commune et le quartier à des fins statistiques.
              </p>
            </div>
          </Section>

          {/* Finalité du traitement */}
          <Section icon={<Lock className="h-5 w-5 text-primary" />} title="4. Finalités du traitement">
            <p>Vos données sont traitées pour les finalités suivantes :</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Géolocaliser les coupures d'eau et d'électricité par commune et quartier</li>
              <li>Alerter les habitants d'un même quartier en cas de coupure signalée</li>
              <li>Produire des statistiques agrégées pour les opérateurs (CIE, SODECI) et les autorités locales</li>
              <li>Identifier et prioriser les zones à forte concentration de personnes vulnérables</li>
              <li>Améliorer la qualité du service public d'eau et d'électricité</li>
            </ul>
          </Section>

          {/* Conservation */}
          <Section icon={<Trash2 className="h-5 w-5 text-primary" />} title="5. Durée de conservation">
            <ul className="list-disc pl-6 space-y-1">
              <li><strong className="text-foreground">Données de profil</strong> : conservées tant que le compte est actif</li>
              <li><strong className="text-foreground">Signalements actifs</strong> : conservés avec les coordonnées GPS jusqu'à résolution</li>
              <li><strong className="text-foreground">Signalements résolus</strong> : les coordonnées GPS sont supprimées automatiquement, les données anonymisées sont conservées à des fins statistiques</li>
              <li><strong className="text-foreground">Photos</strong> : conservées tant que le signalement est actif</li>
            </ul>
          </Section>

          {/* Droits des utilisateurs */}
          <Section icon={<Shield className="h-5 w-5 text-primary" />} title="6. Vos droits">
            <p>
              Conformément à la loi n°2013-450, vous disposez des droits suivants :
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong className="text-foreground">Droit d'accès</strong> : vous pouvez consulter toutes vos données depuis votre profil</li>
              <li><strong className="text-foreground">Droit de rectification</strong> : vous pouvez modifier vos informations personnelles</li>
              <li><strong className="text-foreground">Droit de suppression</strong> : vous pouvez supprimer vos signalements à tout moment</li>
              <li><strong className="text-foreground">Droit d'opposition</strong> : vous pouvez désactiver les notifications depuis votre profil</li>
              <li><strong className="text-foreground">Droit à la portabilité</strong> : vous pouvez demander l'exportation de vos données</li>
            </ul>
            <p className="mt-3">
              Pour exercer vos droits, contactez-nous à <strong className="text-foreground">signalenergie@civictech.ci</strong> ou 
              adressez une réclamation à l'<strong className="text-foreground">ARTCI</strong>.
            </p>
          </Section>

          {/* Sécurité */}
          <Section icon={<Lock className="h-5 w-5 text-primary" />} title="7. Sécurité des données">
            <ul className="list-disc pl-6 space-y-1">
              <li>Chiffrement des communications (HTTPS/TLS)</li>
              <li>Politiques de sécurité au niveau des lignes (Row Level Security) sur toutes les tables</li>
              <li>Accès restreint aux données personnelles par rôle (utilisateur, modérateur, administrateur)</li>
              <li>Anonymisation des données publiques via des fonctions serveur sécurisées</li>
              <li>Limitation du stockage (5 Mo par photo, 5 signalements par jour)</li>
            </ul>
          </Section>

          {/* Contact */}
          <section className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">8. Contact</h2>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>Pour toute question relative à la protection de vos données :</p>
              <p>📧 <strong className="text-foreground">signalenergie@civictech.ci</strong></p>
              <p>🏛️ ARTCI — <a href="https://www.artci.ci" target="_blank" rel="noopener noreferrer" className="text-primary underline">www.artci.ci</a></p>
            </div>
          </section>

          <div className="text-center">
            <Link to="/a-propos" className="text-sm text-primary underline">
              ← Retour à la page À propos
            </Link>
          </div>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            © 2026 SignalÉnergie — CivicTech Abidjan · Version pilote
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
