import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Shield, Mail, Database, Eye, Trash2, Globe, Scale, Lock,
  Building, CheckCircle2, ExternalLink, FileText, ArrowRight,
  ShieldCheck, Smartphone, KeyRound
} from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";

const Section = ({ id, icon: Icon, title, summary, children }: { id: string; icon: React.ElementType; title: string; summary?: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-24 mb-8 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm">
    <div className="flex items-center gap-3 mb-3">
      <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-lg sm:text-xl font-extrabold text-foreground">{title}</h2>
        {summary && <p className="text-xs text-muted-foreground mt-0.5">{summary}</p>}
      </div>
    </div>
    <div className="text-xs sm:text-sm text-muted-foreground space-y-4 leading-relaxed pt-2">{children}</div>
  </section>
);

const PrivacyPolicyPage = () => {
  usePageMeta({
    title: "Politique de Protection des Données Personnelles (Loi n° 2013-450) — SIGNA.ci",
    description: "Informations légales obligatoires communiquées aux utilisateurs conformément à la Loi n° 2013-450 du 19 juin 2013 et aux directives de l'ARTCI / APDP en Côte d'Ivoire.",
  });

  const TOC_ITEMS = [
    { id: "responsable", label: "1. Responsable de Traitement", icon: Scale },
    { id: "donnees", label: "2. Données Collectées & Finalités", icon: Database },
    { id: "anonymisation", label: "3. Floutage GPS & Vie Privée", icon: Globe },
    { id: "conservation", label: "4. Durée & Sécurité des Données", icon: Lock },
    { id: "droits", label: "5. Vos Droits (Loi 2013-450)", icon: Trash2 },
    { id: "recours", label: "6. Exercice des Droits & APDP", icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Banner de Conformité Légale */}
        <div className="mb-10 border-b border-border pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-bold mb-3">
            <Shield className="h-3.5 w-3.5" />
            Informations Obligatoires (Loi n° 2013-450 relatives aux données personnelles)
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight">
            Politique de Protection des Données Personnelles
          </h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-3xl">
            Dernière mise à jour : 30 juillet 2026 · Conforme aux directives de l'<strong>ARTCI / APDP</strong> et applicable sur <strong>signa.ci</strong> et l'application mobile.
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
                    <item.icon className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="truncate">{item.label}</span>
                  </a>
                ))}
              </nav>
            </div>

            {/* Certificat de Conformité APDP */}
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="h-4 w-4" />
                Procédure CERTINUM APDP
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                SIGNA.ci applique le principe fondamental de minimisation des données et est engagée dans la déclaration auprès de l'ARTCI / APDP.
              </p>
              <a
                href="https://certinumapdp.ci/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 underline"
              >
                Portail National CERTINUM <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </aside>

          {/* Colonne Droite : Contenu Juridique Détaillé (8 colonnes) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Encadré d'Information Transparente */}
            <div className="rounded-3xl border border-emerald-600/30 bg-emerald-500/10 p-6 text-xs sm:text-sm text-foreground space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400 text-base">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                Engagement de Transparence &amp; Respect de la Vie Privée
              </div>
              <p className="text-muted-foreground leading-relaxed">
                La présente politique contient l'ensemble des <strong>mentions légales obligatoires</strong> prescrites par les articles 28 à 34 de la <strong>Loi n° 2013-450 du 19 juin 2013</strong> relative à la protection des données à caractère personnel en République de Côte d'Ivoire.
              </p>
            </div>

            {/* 1. Responsable de Traitement */}
            <Section
              id="responsable"
              icon={Scale}
              title="1. Identité du Responsable de Traitement (Art. 28)"
              summary="En clair : Qui gère et protège vos données au quotidien"
            >
              <p>
                Le responsable des traitements de données à caractère personnel effectués sur le site <strong>signa.ci</strong> et l'application mobile SIGNA est l'équipe d'édition et de gouvernance de la plateforme citoyenne SIGNA.ci, basée à Abidjan, République de Côte d'Ivoire.
              </p>
              <p>
                Toutes les données personnelles sont traitées dans le respect strict de la législation ivoirienne en vigueur sous le contrôle de l'<strong>ARTCI</strong> (Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire).
              </p>
            </Section>

            {/* 2. Données Collectées */}
            <Section
              id="donnees"
              icon={Database}
              title="2. Données Collectées & Finalités (Art. 28)"
              summary="En clair : Nous ne collectons que ce qui est strictement nécessaire au dépannage"
            >
              <p>SIGNA.ci applique le principe de minimisation et ne recueille que les données utiles aux signalements urbains :</p>
              
              <div className="grid sm:grid-cols-2 gap-4 my-2">
                <div className="p-4 rounded-2xl bg-muted/50 border border-border">
                  <span className="font-bold text-foreground text-xs block mb-1">👤 Données d'Identification</span>
                  <span className="text-xs text-muted-foreground">Adresse email (pour le suivi), prénom et nom (facultatifs), numéro de téléphone (facultatif).</span>
                </div>
                <div className="p-4 rounded-2xl bg-muted/50 border border-border">
                  <span className="font-bold text-foreground text-xs block mb-1">📍 Données de Signalement</span>
                  <span className="text-xs text-muted-foreground">Commune, quartier, coordonnées GPS de l'incident, photographies de l'infrastructure endommagée.</span>
                </div>
              </div>

              <p className="font-bold text-foreground mt-2">Finalités exclusives des traitements :</p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li>Transmission des alertes techniques aux services d'intervention habilités (CIE, SODECI, Mairies).</li>
                <li>Envoi de notifications relatives au suivi de l'avancement des signalements aux usagers concernés.</li>
                <li>Élaboration de statistiques d'intérêt public anonymisées sur la réactivité des services urbains.</li>
              </ul>
              
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                <strong>Garantie Absolue :</strong> Vos données personnelles ne sont jamais vendues, cédées, louées ou utilisées à des fins commerciales ou publicitaires.
              </div>
            </Section>

            {/* 3. Floutage GPS */}
            <Section
              id="anonymisation"
              icon={Globe}
              title="3. Protection de la Vie Privée & Floutage Systématique GPS"
              summary="En clair : Vos coordonnées exactes de domicile sont protégées sur la carte publique"
            >
              <p>
                Afin de préserver la vie privée des citoyens et l'anonymat de leur lieu de résidence :
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li><strong>Floutage GPS Public</strong> : Sur la cartographie publique et les flux ouverts, les coordonnées géographiques sont automatiquement tronquées à 3 décimales (rayon d'incertitude protecteur d'environ 110 mètres).</li>
                <li><strong>Non-Divulgation de l'Identité</strong> : L'identifiant utilisateur (<code>user_id</code>), l'adresse email et le numéro de téléphone ne sont jamais accessibles au public ni aux tiers non habilités.</li>
                <li><strong>Accès Opérateur Restreint</strong> : Seules les équipes d'intervention agréées (CIE, SODECI, agents communaux mandatés) disposent des coordonnées précises pour localiser le poteau ou la canalisation endommagée.</li>
              </ul>
            </Section>

            {/* 4. Durée & Sécurité */}
            <Section
              id="conservation"
              icon={Lock}
              title="4. Durée de Conservation & Sécurité des Données"
              summary="En clair : Chiffrement intégral HTTPS/TLS et suppression sur simple demande"
            >
              <p>
                Conformément à l'Article 41 de la Loi n° 2013-450, des mesures de sécurité techniques et organisationnelles renforcées garantissent la confidentialité de vos données :
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2">
                <li><strong>Chiffrement TLS / HTTPS</strong> de l'ensemble des flux de données en transit.</li>
                <li><strong>Authentification Sécurisée</strong> et chiffrement des identifiants en base de données.</li>
                <li><strong>Durée de conservation</strong> : Les données du profil sont conservées tant que le compte demeure actif. En cas de fermeture de compte ou de demande de suppression, les données identifiables sont définitivement effacées sous <strong>30 jours</strong>. Seuls les signalements restent archivés sous forme rigoureusement anonyme.</li>
              </ul>
            </Section>

            {/* 5. Droits */}
            <Section
              id="droits"
              icon={Trash2}
              title="5. Droits des Utilisateurs (Articles 28 à 34)"
              summary="En clair : Vous gardez le contrôle total sur vos données personnelles"
            >
              <p>Conformément à la Loi n° 2013-450, vous disposez des droits fondamentaux suivants :</p>
              
              <div className="space-y-2.5 my-2">
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border text-xs">
                  <strong className="text-foreground">Droit d'Accès (Art. 28) :</strong> Obtenir la confirmation que vos données font l'objet d'un traitement et en recevoir copie.
                </div>
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border text-xs">
                  <strong className="text-foreground">Droit de Rectification (Art. 31) :</strong> Obtenir la mise à jour ou la correction de données inexactes vous concernant.
                </div>
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border text-xs">
                  <strong className="text-foreground">Droit à l'Effacement / Suppression (Art. 32) :</strong> Obtenir l'effacement définitif de votre compte et de vos données d'identification.
                </div>
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border text-xs">
                  <strong className="text-foreground">Droit d'Opposition (Art. 33) :</strong> S'opposer pour des motifs légitimes au traitement de vos données.
                </div>
              </div>
            </Section>

            {/* 6. Exercice des Droits & APDP */}
            <Section
              id="recours"
              icon={Mail}
              title="6. Exercice des Droits & Voies de Recours"
              summary="En clair : Comment nous contacter ou saisir l'autorité de régulation"
            >
              <p>
                Pour toute demande relative à l'exercice de vos droits ou à la protection de vos données personnelles :
              </p>
              <div className="p-5 rounded-2xl bg-muted/60 border border-border my-2 text-xs space-y-1.5">
                <p className="font-bold text-foreground text-sm">Contact Référent Données Personnelles — SIGNA.ci</p>
                <p className="text-muted-foreground">E-mail direct : <a href="mailto:contact@signa.ci" className="text-primary font-bold underline">contact@signa.ci</a></p>
                <p className="text-muted-foreground">Localisation : Abidjan, République de Côte d'Ivoire</p>
              </div>

              <p className="mt-4">
                En cas de contestation ou de réponse insatisfaisante, vous avez le droit légal de saisir l'Autorité de Protection nationale :
              </p>
              <div className="p-5 rounded-2xl bg-slate-900 text-white my-2 text-xs space-y-2 border border-slate-800">
                <p className="font-extrabold text-emerald-400 text-sm">Autorité de Régulation / Protection des Données (ARTCI — APDP)</p>
                <p className="text-slate-300">Marcory Anoumabo, 18 BP 2203 Abidjan 18, République de Côte d'Ivoire</p>
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

          </div>

        </div>

      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;
