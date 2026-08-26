const fs = require("fs");
const path = require("path");
const docx = require(path.resolve(__dirname, "../web/node_modules/docx"));
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
} = docx;

const PRIMARY_COLOR = "0D9488"; // Teal/Emerald
const SECONDARY_COLOR = "1E293B"; // Slate
const BORDER_COLOR = "CBD5E1"; // Light Gray
const BG_HEADER_COLOR = "F1F5F9"; // Light Table Header

function createTitle(text) {
  return new Paragraph({
    text: text,
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 100 },
    run: {
      bold: true,
      size: 36,
      color: PRIMARY_COLOR,
      font: "Calibri",
    },
  });
}

function createSubtitle(text) {
  return new Paragraph({
    text: text,
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 200 },
    run: {
      bold: true,
      size: 24,
      color: SECONDARY_COLOR,
      font: "Calibri",
    },
  });
}

function createSubheader(text) {
  return new Paragraph({
    text: text,
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 400 },
    run: {
      italics: true,
      size: 20,
      color: "64748B",
      font: "Calibri",
    },
  });
}

function createH2(text) {
  return new Paragraph({
    text: text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 120 },
    run: {
      bold: true,
      size: 26,
      color: PRIMARY_COLOR,
      font: "Calibri",
    },
  });
}

function createParagraph(text, isBoldPrefix = "") {
  const runs = [];
  if (isBoldPrefix) {
    runs.push(
      new TextRun({
        text: isBoldPrefix,
        bold: true,
        font: "Calibri",
        size: 22,
        color: "0F172A",
      })
    );
  }
  runs.push(
    new TextRun({
      text: text,
      font: "Calibri",
      size: 22,
      color: "334155",
    })
  );
  return new Paragraph({
    children: runs,
    spacing: { before: 60, after: 100, line: 280 },
  });
}

function createBullet(title, desc) {
  return new Paragraph({
    bullet: { level: 0 },
    children: [
      new TextRun({
        text: title + (title ? " : " : ""),
        bold: !!title,
        font: "Calibri",
        size: 22,
        color: "0F172A",
      }),
      new TextRun({
        text: desc,
        font: "Calibri",
        size: 22,
        color: "334155",
      }),
    ],
    spacing: { before: 40, after: 60 },
  });
}

function createNumberItem(num, title, desc) {
  return new Paragraph({
    children: [
      new TextRun({
        text: `${num}. `,
        bold: true,
        color: PRIMARY_COLOR,
        font: "Calibri",
        size: 22,
      }),
      new TextRun({
        text: title + (title ? " : " : ""),
        bold: true,
        color: "0F172A",
        font: "Calibri",
        size: 22,
      }),
      new TextRun({
        text: desc,
        color: "334155",
        font: "Calibri",
        size: 22,
      }),
    ],
    spacing: { before: 60, after: 60 },
  });
}

function createTable(headers, rows) {
  const tableRows = [
    new TableRow({
      tableHeader: true,
      children: headers.map(
        (h) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: h,
                    bold: true,
                    color: "0F172A",
                    font: "Calibri",
                    size: 20,
                  }),
                ],
                alignment: AlignmentType.LEFT,
              }),
            ],
            shading: {
              type: ShadingType.CLEAR,
              fill: BG_HEADER_COLOR,
            },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
          })
      ),
    }),
    ...rows.map(
      (row) =>
        new TableRow({
          children: row.map(
            (cell) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: cell,
                        font: "Calibri",
                        size: 20,
                        color: "334155",
                      }),
                    ],
                  }),
                ],
                margins: { top: 100, bottom: 100, left: 160, right: 160 },
              })
          ),
        })
    ),
  ];

  return new Table({
    rows: tableRows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
  });
}

const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      children: [
        createTitle("SIGNA-CI V2"),
        createSubtitle("BLUEPRINT PRODUIT • UX • ARCHITECTURE • SÉCURITÉ"),
        createSubheader(
          "Document maître pour la refonte Web + Mobile React / Capacitor"
        ),

        createH2("1. Vision produit"),
        createParagraph(
          "SIGNA-CI est une infrastructure civique qui permet aux citoyens de signaler, suivre et corroborer des problèmes affectant les services publics et les infrastructures, tout en donnant aux collectivités, opérateurs et régulateurs des outils adaptés à leur rôle."
        ),
        createParagraph(
          "une même vérité opérationnelle — l’Incident — alimentée par des Signalements citoyens, des confirmations, des preuves et des mises à jour institutionnelles.",
          "Principe directeur : "
        ),

        createH2("2. Décisions structurantes"),
        createBullet("Cible mobile", "React + Capacitor. Flutter devient legacy et ne doit plus recevoir de nouvelles fonctionnalités."),
        createBullet("Design system unique", "Un seul design system pour Web et Mobile ; layouts différents selon le contexte."),
        createBullet("Expérience citoyenne simple", "Accueil, Fil, Signaler, Carte, Moi."),
        createBullet("Espaces professionnels dédiés", "Espace Web séparé par rôle : Mairie, Opérateur, Régulateur."),
        createBullet("Agrégation Incident", "Un Incident peut regrouper plusieurs Signalements citoyens."),
        createBullet("Sécurité côté serveur", "La localisation publique est une décision de sécurité côté serveur, jamais uniquement côté UI."),
        createBullet("Protection des médias", "Les photos originales et EXIF sensibles restent protégés ; les médias publics sont nettoyés."),
        createBullet("Capacité Offline", "Le mode hors ligne est une capacité produit, pas seulement une optimisation technique."),

        createH2("3. Cartographie cible — Mobile citoyen"),
        createTable(
          ["Onglet", "Contenu principal", "Action primaire"],
          [
            ["Accueil", "État autour de moi, 3–5 catégories, incidents proches", "Signaler"],
            ["Fil", "Incidents publics, mises à jour, confirmations", "Ouvrir une fiche"],
            ["Signaler (+)", "Parcours guidé de création d’un signalement", "Envoyer"],
            ["Carte", "Incidents publics + filtres + vue liste", "Filtrer / ouvrir"],
            ["Moi", "Mon activité, notifications, profil, paramètres", "Gérer mon activité"],
          ]
        ),
        createParagraph(
          "Accueil · Fil · + · Carte · Moi. Le bouton + est l’action centrale.",
          "Navigation basse recommandée : "
        ),

        createH2("4. Cartographie cible — Web public"),
        createTable(
          ["Rubrique", "Objectif"],
          [
            ["Accueil", "Comprendre SIGNA-CI et accéder rapidement aux actions"],
            ["Signalements", "Explorer les problèmes publics sans exposer les données personnelles"],
            ["Carte", "Consulter les incidents publics avec filtres"],
            ["Transparence", "Statistiques, délais, résolution, données ouvertes, méthodologie"],
            ["Partenaires", "Expliquer la collaboration et les conditions de partenariat"],
            ["À propos", "Mission, gouvernance, fonctionnement, confidentialité, contact"],
          ]
        ),

        createH2("5. Espaces professionnels"),
        createTable(
          ["Rôle", "Navigation cible"],
          [
            ["Mairie", "Dashboard · Incidents · Carte opérationnelle · Interventions · Équipes · Performance"],
            ["Opérateur (CIE/SODECI/etc.)", "Dashboard · Incidents · Carte opérationnelle · Interventions · Performance · Équipes"],
            ["Régulateur", "Observatoire · Opérateurs · Territoires · Délais · Incidents chroniques · Données"],
          ]
        ),
        createParagraph(
          "Le portail technique des mairies et outils similaires ne doivent pas apparaître dans la navigation citoyenne."
        ),

        createH2("6. Modèle de domaine : Incident / Signalement"),
        createParagraph(
          "Le modèle recommandé sépare ce que le citoyen envoie de l’événement public traité."
        ),
        createTable(
          ["Objet", "Rôle"],
          [
            ["Incident", "Problème public unique pouvant regrouper plusieurs contributions"],
            ["Signalement", "Contribution initiale d’un citoyen"],
            ["Confirmation", "Indique qu’un autre citoyen est également concerné"],
            ["Preuve", "Photo ou information ajoutée à l’incident"],
            ["Mise à jour", "Évolution publiée par un acteur autorisé"],
            ["Intervention", "Action opérationnelle affectée à une équipe"],
            ["Résolution", "Clôture documentée de l’incident"],
          ]
        ),
        createParagraph(
          "OUTAGE_ELECTRICITY, OUTAGE_WATER, PUBLIC_INFRASTRUCTURE, ROAD. Les catégories et organisations doivent rester configurables pour l’expansion africaine.",
          "Types initiaux : "
        ),

        createH2("7. Cycle de vie d’un incident"),
        createParagraph(
          "Signalé → Qualifié → Confirmé → Transmis → Pris en charge → Intervention → Résolu → Vérifié/Clôturé."
        ),
        createParagraph(
          "Les statuts visibles au citoyen doivent rester compréhensibles. Les statuts techniques internes peuvent être plus détaillés."
        ),

        createH2("8. Parcours de signalement"),
        createNumberItem("1", "Choisir le problème", "électricité, eau, voirie/infrastructure, autre catégorie disponible."),
        createNumberItem("2", "Décrire en quelques mots", "la description doit rester modifiable avant et après envoi selon les règles métier."),
        createNumberItem("3", "Localiser", "GPS actuel, carte ou position issue d’une photo si disponible ; l’utilisateur peut signaler depuis la galerie après avoir quitté le lieu."),
        createNumberItem("4", "Ajouter des preuves", "jusqu’à 3 photos pour l’infrastructure si la règle métier le confirme ; prise directe possible après autorisation caméra."),
        createNumberItem("5", "Vérifier les informations", "contrôle de la visibilité publique et des données personnelles."),
        createNumberItem("6", "Envoyer ou file d'attente", "transmission immédiate ou mise en file d’attente hors ligne."),
        createNumberItem("7", "Suivi immédiat", "affichage immédiat du statut et du numéro/référence de suivi."),
        createParagraph(
          "Ne pas demander le nombre de personnes impactées pour les incidents d’infrastructure si cette donnée n’est pas pertinente. Pour les coupures, elle peut rester une donnée métier si elle est justifiée.",
          "Important : "
        ),

        createH2("9. Fiche Incident citoyenne"),
        createParagraph("Une fiche unique doit servir de point d’entrée au suivi, à la corroboration et au partage :"),
        createBullet("", "Catégorie + titre clair"),
        createBullet("", "Commune / zone publique adaptée"),
        createBullet("", "Statut et chronologie"),
        createBullet("", "Nombre de contributions/confirmations lorsque pertinent"),
        createBullet("", "Photos publiques nettoyées"),
        createBullet("", "Mises à jour de l’organisation responsable"),
        createBullet("Actions citoyennes", "Je suis également concerné · Ajouter une information/photo · Partager"),
        createBullet("Protection des données", "Protection systématique de l’adresse personnelle et des coordonnées exactes du signaleur"),

        createH2("10. Fil des signalements"),
        createParagraph(
          "Le Fil est un flux civique, pas un réseau social. Il montre les infrastructures publiques et incidents pertinents, avec des mises à jour institutionnelles. Pas de likes, followers ou mécanique de popularité."
        ),
        createParagraph("Confirmer · Ajouter une information · Partager.", "Actions recommandées : "),

        createH2("11. Cartes et confidentialité géographique"),
        createTable(
          ["Niveau", "Exemple d’usage", "Public"],
          [
            ["PUBLIC_EXACT", "Infrastructure publique précisément localisable", "Selon règle métier"],
            ["PUBLIC_APPROXIMATE", "Zone d’un incident", "Oui"],
            ["PUBLIC_AREA", "Coupure / zone affectée", "Oui"],
            ["PRIVATE_TECHNICAL", "Coordonnée exacte utile aux équipes", "Non"],
            ["PRIVATE", "Donnée personnelle", "Non"],
          ]
        ),
        createParagraph("La précision publiée doit être déterminée par le backend/RLS/API. Le floutage frontend seul est insuffisant."),

        createH2("12. Médias et EXIF"),
        createParagraph(
          "Les photos originales peuvent contenir GPS, date, appareil et autres métadonnées. Architecture cible : original protégé → traitement → version publique nettoyée. Les originaux ne doivent être accessibles qu’aux rôles autorisés."
        ),

        createH2("13. Offline-first"),
        createParagraph(
          "Le citoyen doit pouvoir commencer et enregistrer un signalement sans réseau. Une file locale indique : En attente d’envoi → Upload → Envoyé → Échec à réessayer. Après reconnexion, la synchronisation est automatique. Les doublons peuvent être rapprochés côté serveur par proximité géographique, temps et catégorie."
        ),

        createH2("14. Partage"),
        createParagraph(
          "Remplacer « Générateur d’affiche » par « Partager »."
        ),
        createParagraph(
          "WhatsApp · Copier le lien · Visuel/affiche · autres. Un partage doit pointer vers la fiche publique et ne jamais exposer l’adresse personnelle.",
          "Sous-actions : "
        ),

        createH2("15. Mon activité / Profil / Paramètres"),
        createTable(
          ["Espace", "Contenu"],
          [
            ["Mon activité", "Mes signalements · En attente d’envoi · À confirmer · Historique"],
            ["Notifications", "Mises à jour utiles, invitations à confirmer, résolution, incidents proches"],
            ["Profil", "Identité minimale, commune si nécessaire, préférences"],
            ["Paramètres", "Compte · Notifications · Confidentialité · Localisation · Apparence · Langue · Données · Aide"],
          ]
        ),
        createParagraph(
          "Les outils de test, sandbox, injection ou bypass doivent être exclus de la production et protégés par build/feature flags."
        ),

        createH2("16. Dashboard professionnel"),
        createParagraph(
          "Les tableaux de bord doivent compter les Incidents, pas seulement les Signalements. (Exemple : 8 incidents actifs / 134 contributions associées)."
        ),
        createTable(
          ["Rôle", "KPI prioritaires"],
          [
            ["Mairie", "Incidents ouverts · pris en charge · résolus · délai médian · récurrence"],
            ["Opérateur", "Incidents actifs · volume de contributions · prise en charge · résolution · zones affectées"],
            ["Régulateur", "Volume · taux de résolution · délais · incidents chroniques · comparaison opérateurs/territoires"],
          ]
        ),

        createH2("17. Transparence"),
        createParagraph(
          "La page publique doit privilégier les données agrégées : volumes, statuts, délais, résolution, tendances, méthodologie et données ouvertes. Les coordonnées exactes et informations opérationnelles sensibles restent réservées."
        ),

        createH2("18. Design system cible"),
        createTable(
          ["Élément", "Règle"],
          [
            ["Typographie", "Une famille sans-serif lisible ; hiérarchie courte et stable"],
            ["Espacement", "Échelle 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64"],
            ["Rayons", "8 / 12 / 16 / 24 selon composant"],
            ["Boutons", "Primary · Secondary · Tertiary"],
            ["Couleurs", "Tokens : background, surface, text, border, brand, success, warning, danger, info"],
            ["Icônes", "Même famille visuelle partout ; catégories limitées sur l’accueil"],
            ["Dark mode", "Tokens dédiés, jamais simple inversion de couleurs"],
          ]
        ),
        createParagraph(
          "Les couleurs des opérateurs ne doivent pas devenir l’identité SIGNA-CI. Elles servent à identifier une catégorie ou une organisation."
        ),

        createH2("19. Architecture React / Capacitor cible"),
        createParagraph(
          "app/ · features/auth · features/incidents · features/infrastructure · features/outages · features/map · features/feed · features/notifications · features/transparency · features/profile · features/pro/municipality · features/pro/operator · features/pro/regulator · components/ui · components/report · components/map · components/navigation · services · domain · lib.",
          "Organisation recommandée : "
        ),
        createParagraph(
          "UI → Use Case → Service → Supabase/API. Éviter la logique métier et les requêtes directes dispersées dans les pages.",
          "Flux : "
        ),

        createH2("20. Sécurité P0"),
        createBullet("RLS explicite", "RLS explicite par utilisateur, organisation et périmètre."),
        createBullet("Autorité serveur", "Le frontend ne peut pas décider seul du rôle, organization_id, statut ou niveau de visibilité."),
        createBullet("Protection EXIF & GPS", "Coordonnées exactes et EXIF protégés côté serveur."),
        createBullet("Variables d'environnement", "Audit des variables d’environnement ; utiliser .env.example et ne jamais versionner de secret."),
        createBullet("OAuth Google Mobile", "navigateur système → callback/deep link → retour dans l’application Capacitor → session restaurée."),
        createBullet("Tests d'accès négatifs", "un citoyen ne doit jamais pouvoir lire les données techniques d’un autre rôle."),

        createH2("21. Performance & résilience"),
        createBullet("Carte", "viewport + zoom + filtres + clustering ; ne pas charger toute la base."),
        createBullet("Fil", "pagination par curseur."),
        createBullet("Photos", "compression + thumbnails + chargement différé."),
        createBullet("Application", "cache et écrans légers sur Android milieu de gamme et réseau instable."),
        createBullet("Médias", "Pas de vidéo ou média lourd automatique."),

        createH2("22. Tests de sortie"),
        createTable(
          ["Parcours", "Test obligatoire"],
          [
            ["Auth", "Google → navigateur → retour application → session"],
            ["Signalement", "GPS → photo → description → publication"],
            ["Offline", "Créer hors ligne → fermer → reconnexion → synchronisation"],
            ["Carte", "Aucune donnée privée visible publiquement"],
            ["Fiche", "Confirmation → ajout photo → partage"],
            ["Professionnel", "Organisation et périmètre correctement isolés"],
            ["Résolution", "Mise à jour → résolution → visibilité citoyenne"],
          ]
        ),

        createH2("23. Roadmap de mise en œuvre"),
        createTable(
          ["Phase", "Livrable"],
          [
            ["P0", "Sécurité, OAuth mobile, RLS, médias, confidentialité géographique"],
            ["P1", "Design system + navigation + modèle Incident/Signalement"],
            ["P2", "Signalement + fiche + Fil + Carte + corroboration"],
            ["P3", "Mon activité + notifications + profil"],
            ["P4", "Dashboards Mairie / Opérateur / Régulateur"],
            ["P5", "Transparence + Open Data"],
            ["P6", "Offline, Capacitor Android/iOS, tests E2E"],
            ["P7", "Performance, accessibilité, store readiness, migration Flutter"],
          ]
        ),

        createH2("24. Prompt de cadrage pour Antigravity"),
        createParagraph(
          "Ce document est la source de vérité produit. Ne pas réécrire tout le dépôt en une seule opération. Travailler par phases verticales, conserver les fonctionnalités déjà validées, supprimer les doublons après migration, écrire/adapter les tests à chaque tranche et ne jamais sacrifier les règles de confidentialité géographique pour simplifier l’UI. Toute nouvelle fonctionnalité doit être rattachée à un rôle, un objet de domaine et un parcours utilisateur explicite."
        ),

        createH2("25. Critères « prêt pour utilisateurs »"),
        createBullet("", "Un citoyen comprend quoi faire en moins de quelques secondes après ouverture."),
        createBullet("", "Le signalement est réalisable sans connaître le vocabulaire technique."),
        createBullet("", "Le suivi est accessible sans chercher un second écran caché."),
        createBullet("", "Le Fil et la Carte ne divulguent aucune donnée personnelle."),
        createBullet("", "Une coupure peut être corroborée sans créer inutilement un nouveau ticket."),
        createBullet("", "Une équipe professionnelle voit ses incidents et son périmètre, pas ceux des autres organisations."),
        createBullet("", "Le même design system est cohérent sur Web, Android et iOS."),
        createBullet("", "Les parcours critiques fonctionnent avec réseau instable et sont couverts par des tests."),
        createBullet("", "La sécurité est appliquée au backend et non uniquement à l’interface."),
      ],
    },
  ],
});

const outputPath = path.resolve(__dirname, "../docs/SIGNA-CI-V2-BLUEPRINT.docx");
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outputPath, buffer);
  console.log(`Document saved successfully to: ${outputPath}`);
});
