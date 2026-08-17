import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Shield, Mail, Database, Eye, Trash2, Globe, Scale, Lock, Building, CheckCircle2, ExternalLink, FileText } from "lucide-react";
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

const PrivacyPolicyPage = () => {
  usePageMeta({
    title: "Politique de Confidentialité — Information Obligatoire (Loi n° 2013-450)",
    description: "Informations légales obligatoires communiquées aux utilisateurs conformément à la Loi n° 2013-450 du 19 juin 2013 et aux directives de l'ARTCI / APDP en Côte d'Ivoire.",
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-4xl py-10">
        
        {/* Banner de Conformité Légale */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-bold mb-3">
            <Shield className="h-3.5 w-3.5" />
            Informations Obligatoires (Loi n° 2013-450 relatives aux données personnelles)
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-foreground mb-3">
            Politique de Protection des Données Personnelles
          </h1>
          <p className="text-sm text-muted-foreground">
            Dernière mise à jour : 30 juillet 2026 · Applicable sur <strong>signa.ci</strong> et l'application mobile SIGNA.
          </p>
        </div>

        {/* Encadré d'Information Transparente */}
        <div className="rounded-2xl border border-emerald-600/30 bg-emerald-950/10 p-5 mb-8 text-sm text-foreground space-y-2">
          <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400 text-base">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Engagement de Transparence & Déclarations APDP / ARTCI
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            La présente politique contient l'ensemble des <strong>mentions légales obligatoires</strong> prescrites par les articles 28 à 34 de la <strong>Loi n° 2013-450 du 19 juin 2013</strong>. SIGNA.ci est conçue dans le respect strict des principes de minimisation des données et est engagée dans la procédure de déclaration d'immatriculation auprès de l'<strong>ARTCI / APDP</strong> via la plateforme nationale <a href="https://certinumapdp.ci/" target="_blank" rel="noopener noreferrer" className="underline font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5">CERTINUM APDP <ExternalLink className="h-3 w-3 inline" /></a>.
          </p>
        </div>

        <Section icon={Scale} title="1. Identité du Responsable de Traitement (Mention Obligatoire - Art. 28)">
          <p>
            Le responsable des traitements de données à caractère personnel effectués sur le site <strong>signa.ci</strong> et l'application mobile SIGNA est l'équipe d'édition et de gouvernance de la plateforme citoyenne SIGNA.ci, basée à Abidjan, République de Côte d'Ivoire.
          </p>
          <p>
            Toutes les données personnelles sont traitées dans le respect strict de la législation ivoirienne en vigueur sous le contrôle de l'<strong>ARTCI</strong> (Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire).
          </p>
        </Section>

        <Section icon={Database} title="2. Données Collectées & Finalités (Mention Obligatoire - Art. 28)">
          <p>SIGNA.ci collecte uniquement les données adéquates, pertinentes et non excessives au regard des finalités pour lesquelles elles sont collectées :</p>
          
          <div className="grid sm:grid-cols-2 gap-3 my-2">
            <div className="p-3.5 rounded-xl bg-muted/50 border border-border/50">
              <span className="font-bold text-foreground text-xs block mb-1">👤 Données d'Inscription</span>
              <span className="text-xs text-muted-foreground">Adresse email (obligatoire), prénom et nom (optionnels), numéro de téléphone (optionnel).</span>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/50 border border-border/50">
              <span className="font-bold text-foreground text-xs block mb-1">📍 Données de Signalement</span>
              <span className="text-xs text-muted-foreground">Commune, quartier, coordonnées GPS de l'incident, photos explicatives de la panne ou dégradation.</span>
            </div>
          </div>

          <p className="font-semibold text-foreground mt-2">Finalités exclusives des traitements :</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Transmission des alertes techniques aux services d'intervention habilités (CIE, SODECI, Mairies).</li>
            <li>Envoi de notifications relatives au suivi de l'avancement des signalements aux usagers concernés.</li>
            <li>Élaboration de statistiques d'intérêt public anonymisées sur la réactivité des services urbains.</li>
          </ul>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-2">
            <strong>Garantie :</strong> Vos données personnelles ne sont jamais vendues, cédées ou utilisées à des fins commerciales ou publicitaires.
          </p>
        </Section>

        <Section icon={Globe} title="3. Protection de la Vie Privée & Floutage Systématique GPS">
          <p>
            Afin de préserver la vie privée des citoyens et l'anonymat de leur lieu de résidence :
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li><strong>Floutage GPS Public</strong> : Sur la cartographie publique et les flux ouverts, les coordonnées géographiques sont automatiquement tronquées à 3 décimales (rayon d'incertitude d'environ 110 mètres).</li>
            <li><strong>Non-Divulgation de l'Identité</strong> : L'identifiant utilisateur (<code>user_id</code>), l'adresse email et le numéro de téléphone ne sont jamais accessibles au public ni aux tiers non habilités.</li>
            <li><strong>Accès Opérateur Restreint</strong> : Seules les équipes d'intervention agréées (CIE, SODECI, agents communaux mandatés) disposent des coordonnées précises pour localiser le poteau ou la canalisation endommagée.</li>
          </ul>
        </Section>

        <Section icon={Lock} title="4. Durée de Conservation & Sécurité des Données">
          <p>
            Conformément à l'Article 41 de la Loi n° 2013-450, des mesures de sécurité techniques et organisationnelles renforcées garantissent la confidentialité de vos données :
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Chiffrement TLS / HTTPS</strong> de l'ensemble des flux de données en transit.</li>
            <li><strong>Authentification Sécurisée</strong> et chiffrement des identifiants en base de données.</li>
            <li><strong>Durée de conservation</strong> : Les données du profil sont conservées tant que le compte demeure actif. En cas de fermeture de compte ou de demande de suppression, les données identifiables sont définitivement effacées sous <strong>30 jours</strong>. Seuls les signalements restent archivés sous forme rigoureusement anonyme.</li>
          </ul>
        </Section>

        <Section icon={Trash2} title="5. Droits des Utilisateurs (Mentions Obligatoires - Articles 28 à 34)">
          <p>Conformément à la Loi n° 2013-450, vous disposez des droits suivants sur vos données personnelles :</p>
          
          <div className="space-y-2 my-2">
            <div className="p-3.5 rounded-xl bg-muted/40 border text-xs">
              <strong className="text-foreground">Droit d'Accès (Art. 28) :</strong> Obtenir la confirmation que vos données font l'objet d'un traitement et en recevoir copie.
            </div>
            <div className="p-3.5 rounded-xl bg-muted/40 border text-xs">
              <strong className="text-foreground">Droit de Rectification (Art. 31) :</strong> Obtenir la mise à jour ou la correction de données inexactes vous concernant.
            </div>
            <div className="p-3.5 rounded-xl bg-muted/40 border text-xs">
              <strong className="text-foreground">Droit à l'Effacement / Suppression (Art. 32) :</strong> Obtenir l'effacement définitif de votre compte et de vos données d'identification.
            </div>
            <div className="p-3.5 rounded-xl bg-muted/40 border text-xs">
              <strong className="text-foreground">Droit d'Opposition (Art. 33) :</strong> S'opposer pour des motifs légitimes au traitement de vos données.
            </div>
          </div>
        </Section>

        <Section icon={Mail} title="5. Exercice des Droits & Voies de Recours">
          <p>
            Pour toute demande relative à l'exercice de vos droits ou à la protection de vos données personnelles :
          </p>
          <div className="p-4 rounded-xl bg-muted/60 border border-border my-2 text-xs space-y-1">
            <p className="font-bold text-foreground">Contact Référent Données Personnelles — SIGNA.ci</p>
            <p className="text-muted-foreground">E-mail direct : <a href="mailto:contact@signa.ci" className="text-primary font-bold underline">contact@signa.ci</a></p>
            <p className="text-muted-foreground">Localisation : Abidjan, République de Côte d'Ivoire</p>
          </div>

          <p className="mt-3">
            En cas de contestation ou de réponse insatisfaisante, vous avez le droit de saisir l'Autorité de Protection nationale :
          </p>
          <div className="p-4 rounded-xl bg-slate-900 text-white my-2 text-xs space-y-1.5 border border-slate-800">
            <p className="font-extrabold text-emerald-400">Autorité de Régulation / Protection des Données (ARTCI — APDP)</p>
            <p className="text-slate-300">Marcory Anoumabo, 18 BP 2203 Abidjan 18, Côte d'Ivoire</p>
            <div className="flex flex-wrap gap-4 pt-1">
              <a href="https://www.autoritedeprotection.ci/" target="_blank" rel="noopener noreferrer" className="text-emerald-300 font-bold underline inline-flex items-center gap-1">
                Site Officiel APDP <ExternalLink className="h-3 w-3" />
              </a>
              <a href="https://certinumapdp.ci/" target="_blank" rel="noopener noreferrer" className="text-emerald-300 font-bold underline inline-flex items-center gap-1">
                Portail Déclaratif CERTINUM APDP <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </Section>

        <div className="text-xs text-muted-foreground border-t border-border pt-6 mt-8">
          Cette politique informe les utilisateurs des exigences légales de transparence conformément aux lois de la République de Côte d'Ivoire.
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;
