/**
 * Catalogue Juridique Officiel des Documents Publics Communicables
 * République de Côte d'Ivoire — Application de la Loi n° 2013-867 du 23 décembre 2013 (CAIDP)
 * Enrichi des Codes Sectoriels (Construction, Urbanisme, Environnement, Santé, Mines, Forêts)
 * et des Lois Organiques des Institutions Constitutionnelles et Autorités de Régulation.
 */

export type EntityType = 'MAIRIE' | 'REGION' | 'MINISTERE' | 'INSTITUTION' | 'AUTORITE_REGULATION' | 'PROJECT';

export type CaidpPillarCategory = 
  | 'ALL'
  | 'PRIORITY'
  | 'FINANCES'
  | 'PROCUREMENT'
  | 'PLANIFICATION'
  | 'BILAN_AUDIT'
  | 'DELIBERATIONS'
  | 'URBANISME_FONCIER'
  | 'ENVIRONNEMENT_SANTE';

export interface LegalDocItem {
  id: string;
  category: 'FINANCES' | 'PROCUREMENT' | 'PLANIFICATION' | 'BILAN_AUDIT' | 'DELIBERATIONS' | 'URBANISME_FONCIER' | 'ENVIRONNEMENT_SANTE';
  categoryLabel: string;
  title: string;
  description: string;
  easyExplanation: string; // Explication en français clair (💡 ce que cela signifie pour l'usager)
  legalBasis: string; // Référence légale exacte (Loi, Ordonnance, Décret ou Code)
  isPriorityForCivic: boolean;
  applicableTypes: EntityType[];
  specificEntityKey?: string; // Filtrage direct (ex: 'HABG', 'COUR_DES_COMPTES', 'MIN_CONSTRUCTION', etc.)
  officialPortalUrl?: string; // Lien officiel de consultation directe si déjà publié en ligne
}

/**
 * Base de données des documents publics officiels communicables
 */
export const ALL_LEGAL_DOCUMENTS: LegalDocItem[] = [
  // =========================================================================
  // 1. COLLECTIVITÉS TERRITORIALES : MAIRIES (COMMUNES)
  // =========================================================================
  {
    id: 'mairie_compte_administratif',
    category: 'FINANCES',
    categoryLabel: 'Finances Locales',
    title: 'Compte Administratif (CA) de la Commune — Bilan annuel d\'exécution',
    description: 'Rapport officiel de clôture comparant les prévisions budgétaires aux recettes recouvrées et dépenses réellement mandatées par la Mairie au cours du dernier exercice clos.',
    easyExplanation: 'Le bilan financier de fin d\'année : il permet de vérifier concrètement si l\'argent de la commune a été dépensé conformément aux engagements pris devant les habitants.',
    legalBasis: 'Art. 4 • Loi n° 2013-867 & Loi n° 2012-1128 (Collectivités)',
    isPriorityForCivic: true,
    applicableTypes: ['MAIRIE'],
  },
  {
    id: 'mairie_budget_primitif',
    category: 'FINANCES',
    categoryLabel: 'Finances Locales',
    title: 'Budget Primitif (BP) communal voté pour l\'exercice en cours',
    description: 'Document officiel détaillant l\'ensemble des recettes fiscales/subventions attendues et les crédits alloués au fonctionnement et aux investissements communaux.',
    easyExplanation: 'Le budget prévisionnel annuel de la Mairie : ce que la commune prévoit d\'encaisser et de dépenser pour l\'année.',
    legalBasis: 'Art. 2 & 4 • Loi n° 2013-867',
    isPriorityForCivic: true,
    applicableTypes: ['MAIRIE'],
  },
  {
    id: 'mairie_programme_triennal_pti',
    category: 'PLANIFICATION',
    categoryLabel: 'Investissements Locaux',
    title: 'Programme Triennal d\'Investissement (PTI) de la Commune',
    description: 'Planification pluriannuelle sur 3 ans de l\'ensemble des chantiers et équipements communaux (écoles municipales, dispensaires, voirie urbaine, marchés, éclairage public).',
    easyExplanation: 'La liste officielle des chantiers programmés sur 3 ans dans votre commune, avec les coûts estimés et les quartiers bénéficiaires.',
    legalBasis: 'Art. 4 • Loi n° 2013-867 & Code des Collectivités',
    isPriorityForCivic: true,
    applicableTypes: ['MAIRIE'],
  },
  {
    id: 'mairie_pv_deliberations_conseil',
    category: 'DELIBERATIONS',
    categoryLabel: 'Délibérations',
    title: 'Procès-Verbaux des Séances & Délibérations du Conseil Municipal',
    description: 'Comptes-rendus intégraux des sessions ordinaires et extraordinaires, votes des conseillers municipaux et décisions exécutoires après approbation de la tutelle préfectorale.',
    easyExplanation: 'Les décisions officielles votées par vos élus municipaux concernant la gestion des quartiers, taxes et travaux.',
    legalBasis: 'Art. 2 & 4 • Loi n° 2013-867',
    isPriorityForCivic: true,
    applicableTypes: ['MAIRIE'],
  },
  {
    id: 'mairie_taxes_locales_odp',
    category: 'FINANCES',
    categoryLabel: 'Fiscalité Locale',
    title: 'Barème des Taxes Locales & Recouvrement des Droits de Place / ODP',
    description: 'Tarification municipale en vigueur et état récapitulatif des recettes recouvrées sur l\'occupation du domaine public, les marchés municipaux, gares et foires.',
    easyExplanation: 'Le montant officiel des taxes prélevées sur les commerces, étals de marchés et occupations de rue, ainsi que les sommes perçues.',
    legalBasis: 'Art. 4 • Loi n° 2013-867',
    isPriorityForCivic: false,
    applicableTypes: ['MAIRIE'],
  },
  {
    id: 'mairie_marches_publics_passes',
    category: 'PROCUREMENT',
    categoryLabel: 'Marchés Publics',
    title: 'Marchés Publics Communaux & Procès-Verbaux d\'Attribution',
    description: 'Plan de passation des marchés de la commune, registre des appels d\'offres locaux, entreprises attributaires retenues et montants adjugés.',
    easyExplanation: 'La liste des entreprises choisies par la Mairie pour réaliser les travaux de voirie, de bâtiments ou de fournitures scolaires.',
    legalBasis: 'Code des Marchés Publics • Art. 4 Loi n° 2013-867',
    isPriorityForCivic: true,
    applicableTypes: ['MAIRIE'],
  },
  {
    id: 'mairie_rapport_annuel_maire',
    category: 'BILAN_AUDIT',
    categoryLabel: 'Bilan d\'Activité',
    title: 'Rapport Annuel du Maire sur la situation de la Commune',
    description: 'Rapport moral et financier présenté au Conseil municipal dressant le bilan des réalisations, de l\'état civil, des œuvres sociales et des partenariats.',
    easyExplanation: 'Le rapport d\'activité complet présenté chaque année par le Maire sur l\'état général de la ville.',
    legalBasis: 'Loi n° 2012-1128 & Loi n° 2013-867',
    isPriorityForCivic: false,
    applicableTypes: ['MAIRIE'],
  },

  // =========================================================================
  // 2. COLLECTIVITÉS TERRITORIALES : CONSEILS RÉGIONAUX & DISTRICTS
  // =========================================================================
  {
    id: 'region_compte_administratif',
    category: 'FINANCES',
    categoryLabel: 'Finances Régionales',
    title: 'Compte Administratif Régional — Bilan annuel d\'exécution budgétaire',
    description: 'État d\'exécution certifié des recettes et des dépenses du Conseil Régional (dotations d\'État, fonds propres et investissements régionaux clos).',
    easyExplanation: 'Le bilan de fin d\'année du Conseil Régional : vérifie l\'usage des milliards alloués au développement de la région.',
    legalBasis: 'Art. 4 • Loi n° 2013-867 & Code des Collectivités',
    isPriorityForCivic: true,
    applicableTypes: ['REGION'],
  },
  {
    id: 'region_programme_triennal_ptd',
    category: 'PLANIFICATION',
    categoryLabel: 'Investissements Régionaux',
    title: 'Programme Triennal de Développement (PTD) & Schéma Régional (SRADT)',
    description: 'Cartographie et planification sur 3 ans des grandes infrastructures régionales : lycées, centres hospitaliers régionaux (CHR), pistes rurales et hydraulique.',
    easyExplanation: 'Le calendrier sur 3 ans des grands projets structurants de la région (santé, éducation, électrification et routes rurales).',
    legalBasis: 'Art. 4 • Loi n° 2013-867',
    isPriorityForCivic: true,
    applicableTypes: ['REGION'],
  },
  {
    id: 'region_pv_deliberations',
    category: 'DELIBERATIONS',
    categoryLabel: 'Délibérations',
    title: 'Procès-Verbaux des Séances & Délibérations du Conseil Régional',
    description: 'Comptes-rendus des sessions plénières et décisions exécutoires relatives aux orientations économiques, sociales et d\'aménagement territorial.',
    easyExplanation: 'Les votes et décisions officielles prises par les conseillers régionaux pour votre région.',
    legalBasis: 'Art. 2 & 4 • Loi n° 2013-867',
    isPriorityForCivic: true,
    applicableTypes: ['REGION'],
  },
  {
    id: 'region_marches_publics',
    category: 'PROCUREMENT',
    categoryLabel: 'Marchés Publics',
    title: 'Marchés Publics Régionaux & Contrats de Travaux d\'Infrastructures',
    description: 'Plan de passation, avis d\'adjudication, identité des entreprises de BTP attributaires et montants des contrats signés pour la région.',
    easyExplanation: 'La liste des contrats de travaux financés par le Conseil Régional (construction de collèges, dispensaires et centres de formation).',
    legalBasis: 'Code des Marchés Publics • Art. 4 Loi n° 2013-867',
    isPriorityForCivic: true,
    applicableTypes: ['REGION'],
  },

  // =========================================================================
  // 3. MINISTÈRES : SECTEUR CONSTRUCTION, HABITAT & FONCIER URBAIN
  // =========================================================================
  {
    id: 'mclu_strategie_besoins_logements',
    category: 'URBANISME_FONCIER',
    categoryLabel: 'Habitat & Logement',
    title: 'Stratégie Nationale de l\'Habitat & Évaluation des besoins en logements sociaux',
    description: 'Document officiel quantifiant le déficit structurel de 800 000 logements, la programmation pluriannuelle des tranches, les sites réservés et le bilan des livraisons de l\'ANAH / PPLS.',
    easyExplanation: 'Le plan stratégique de l\'État ivoirien pour résorber le manque de logements : chiffres clés, réserves foncières et programmes de maisons abordables.',
    legalBasis: 'DGLCV • Ordonnance n° 2021-903 & Code de la Construction',
    isPriorityForCivic: true,
    applicableTypes: ['MINISTERE'],
    specificEntityKey: 'MIN_CONSTRUCTION',
    officialPortalUrl: 'https://www.construction.gouv.ci',
  },
  {
    id: 'mclu_plans_urbanisme_pud',
    category: 'URBANISME_FONCIER',
    categoryLabel: 'Urbanisme & Sols',
    title: 'Plans d\'Urbanisme Directeur (PUD) & Schéma Directeur du Grand Abidjan (SDUGA 2030)',
    description: 'Documents d\'urbanisme prévisionnel opposables aux tiers fixant l\'affectation des sols (zones résidentielles, industrielles, emprises de voies et zones non constructibles).',
    easyExplanation: 'La carte d\'urbanisme officielle qui indique où il est légalement permis de bâtir, les futures autoroutes et les zones protégées.',
    legalBasis: 'Art. 18 • Loi n° 2020-624 modifiée en 2024 (Code de l\'Urbanisme)',
    isPriorityForCivic: true,
    applicableTypes: ['MINISTERE'],
    specificEntityKey: 'MIN_CONSTRUCTION',
    officialPortalUrl: 'https://www.construction.gouv.ci',
  },
  {
    id: 'mclu_registre_lotissements_approuves',
    category: 'URBANISME_FONCIER',
    categoryLabel: 'Foncier & Terrains',
    title: 'Registre officiel des Lotissements Approuvés de Côte d\'Ivoire',
    description: 'Liste intégrale des arrêtés ministériels d\'approbation de lotissements (seuls lotissements juridiquement valides ouvrant droit à la délivrance de l\'ACD).',
    easyExplanation: 'La liste officielle des lotissements autorisés par l\'État : indispensable pour sécuriser l\'achat d\'un terrain et éviter les arnaques foncières.',
    legalBasis: 'Art. 45 à 52 • Loi n° 2020-624 (Code de l\'Urbanisme)',
    isPriorityForCivic: true,
    applicableTypes: ['MINISTERE'],
    specificEntityKey: 'MIN_CONSTRUCTION',
    officialPortalUrl: 'https://www.construction.gouv.ci',
  },
  {
    id: 'mclu_criteres_logements_sociaux_conalog',
    category: 'URBANISME_FONCIER',
    categoryLabel: 'Habitat Social',
    title: 'Critères d\'attribution des logements sociaux et conditions d\'accès au FGLS',
    description: 'Barèmes de revenus, plafonds d\'éligibilité, modalités de la location-vente et règles de souscription fixées par la CONALOG et le Fonds de Garantie du Logement Social.',
    easyExplanation: 'Les conditions de salaire et formulaires officiels pour souscrire à un logement social soutenu par l\'État.',
    legalBasis: 'Loi n° 2019-576 & Ordonnance n° 2021-903',
    isPriorityForCivic: true,
    applicableTypes: ['MINISTERE'],
    specificEntityKey: 'MIN_CONSTRUCTION',
    officialPortalUrl: 'https://www.construction.gouv.ci',
  },
  {
    id: 'mclu_registre_permis_construire',
    category: 'URBANISME_FONCIER',
    categoryLabel: 'Permis de Construire',
    title: 'Registre public des Permis de Construire délivrés par le Guichet Unique (GUPC)',
    description: 'Relevé des arrêtés d\'autorisation de construire délivrés ou refusés, accessible aux riverains et tiers pour vérifier la légalité des chantiers.',
    easyExplanation: 'Permet de vérifier si l\'immeuble en construction à côté de chez vous dispose d\'une autorisation légale en règle.',
    legalBasis: 'Art. 25 • Loi n° 2019-576 (Code de la Construction et de l\'Habitat)',
    isPriorityForCivic: false,
    applicableTypes: ['MINISTERE'],
    specificEntityKey: 'MIN_CONSTRUCTION',
    officialPortalUrl: 'https://www.construction.gouv.ci',
  },

  // =========================================================================
  // 4. MINISTÈRES : ENVIRONNEMENT & TRANSITION ÉCOLOGIQUE
  // =========================================================================
  {
    id: 'min_env_etudes_impact_eies',
    category: 'ENVIRONNEMENT_SANTE',
    categoryLabel: 'Études Écologiques',
    title: 'Études d\'Impact Environnemental et Social (EIES) & Plans de Gestion de l\'ANDE',
    description: 'Rapports d\'évaluation écologique préalable, plans de gestion environnementale et sociale (PGES) et mesures d\'atténuation validés par l\'ANDE.',
    easyExplanation: 'L\'expertise technique qui mesure l\'impact d\'une usine, d\'un barrage ou d\'une route sur la santé des riverains et la nature.',
    legalBasis: 'Art. 38 à 45 • Loi n° 2023-900 (Code de l\'Environnement)',
    isPriorityForCivic: true,
    applicableTypes: ['MINISTERE'],
    specificEntityKey: 'MIN_ENVIRONNEMENT',
    officialPortalUrl: 'https://environnement.gouv.ci',
  },
  {
    id: 'min_env_rapport_national_etat_environnement',
    category: 'ENVIRONNEMENT_SANTE',
    categoryLabel: 'État Écologique',
    title: 'Rapport National sur l\'État de l\'Environnement en Côte d\'Ivoire (RNEE)',
    description: 'Bilan périodique officiel sur la qualité de l\'air, des eaux de lagune et fleuves, l\'érosion côtière du littoral et le réchauffement climatique.',
    easyExplanation: 'Le grand bilan de santé écologique de la Côte d\'Ivoire produit périodiquement par le Ministère.',
    legalBasis: 'Loi n° 2023-900 (Code de l\'Environnement)',
    isPriorityForCivic: true,
    applicableTypes: ['MINISTERE'],
    specificEntityKey: 'MIN_ENVIRONNEMENT',
    officialPortalUrl: 'https://environnement.gouv.ci',
  },
  {
    id: 'min_env_registre_icpe',
    category: 'ENVIRONNEMENT_SANTE',
    categoryLabel: 'Installations Classées',
    title: 'Répertoire des Installations Classées pour la Protection de l\'Environnement (ICPE)',
    description: 'Registre des autorisations d\'exploitation accordées aux sites industriels, carrières, décharges et unités à risques de pollution.',
    easyExplanation: 'La liste officielle des usines et dépôts autorisés à exercer des activités potentiellement polluantes.',
    legalBasis: 'Loi n° 2023-900 (Code de l\'Environnement)',
    isPriorityForCivic: false,
    applicableTypes: ['MINISTERE'],
    specificEntityKey: 'MIN_ENVIRONNEMENT',
    officialPortalUrl: 'https://environnement.gouv.ci',
  },

  // =========================================================================
  // 5. MINISTÈRES : SANTÉ PUBLIQUE & CMU
  // =========================================================================
  {
    id: 'min_sante_carte_sanitaire_nationale',
    category: 'ENVIRONNEMENT_SANTE',
    categoryLabel: 'Carte Hospitalière',
    title: 'Carte Sanitaire Nationale & Normes de couverture des infrastructures',
    description: 'Document officiel fixant la délimitation des districts sanitaires et la localisation territoriale des CHU, CHR, Hôpitaux Généraux et dispensaires (ESPC).',
    easyExplanation: 'La carte officielle qui planifie le nombre d\'hôpitaux, de lits et de médecins nécessaires par région et commune.',
    legalBasis: 'Loi n° 2024-245 (Code de la Santé Publique)',
    isPriorityForCivic: true,
    applicableTypes: ['MINISTERE'],
    specificEntityKey: 'MIN_SANTE',
    officialPortalUrl: 'https://sante.gouv.ci',
  },
  {
    id: 'min_sante_rapport_statistiques_rass',
    category: 'ENVIRONNEMENT_SANTE',
    categoryLabel: 'Statistiques Santé',
    title: 'Rapport Annuel des Statistiques Sanitaires (RASS) & Bilan d\'accès aux soins',
    description: 'Bilan épidémiologique annuel : taux de morbidité (paludisme, tuberculose), mortalité maternelle/infantile, taux d\'occupation des lits et consultations.',
    easyExplanation: 'Le baromètre officiel de santé publique : combien de patients soignés et quelles maladies touchent nos régions.',
    legalBasis: 'Loi n° 2024-245 & Ministère de la Santé',
    isPriorityForCivic: true,
    applicableTypes: ['MINISTERE'],
    specificEntityKey: 'MIN_SANTE',
    officialPortalUrl: 'https://sante.gouv.ci',
  },
  {
    id: 'min_sante_repertoire_cliniques_autorisees',
    category: 'ENVIRONNEMENT_SANTE',
    categoryLabel: 'Établissements Agréés',
    title: 'Répertoire officiel des Cliniques et Établissements Sanitaires Privés Autorisés',
    description: 'Liste officielle mise à jour des structures de soins privées détenant un arrêté ministériel d\'ouverture (outil de lutte contre les cliniques clandestines).',
    easyExplanation: 'Permet de vérifier en un coup d\'œil si la clinique privée de votre quartier est légalement agréée et contrôlée par l\'État.',
    legalBasis: 'Loi n° 2024-245 (Code de la Santé Publique)',
    isPriorityForCivic: true,
    applicableTypes: ['MINISTERE'],
    specificEntityKey: 'MIN_SANTE',
    officialPortalUrl: 'https://sante.gouv.ci',
  },
  {
    id: 'min_sante_tarification_cmu_medicaments',
    category: 'ENVIRONNEMENT_SANTE',
    categoryLabel: 'CMU & Médicaments',
    title: 'Nomenclature et Tarification officielle des 742 Médicaments CMU (NPSP)',
    description: 'Panier officiel des molécules remboursables par la Couverture Maladie Universelle, stocks disponibles à la NPSP et tarifs légaux opposables.',
    easyExplanation: 'La liste officielle des 742 médicaments pris en charge à 70% par la carte CMU dans les pharmacies et hôpitaux.',
    legalBasis: 'Loi n° 2014-120 (CMU) & Décrets d\'application',
    isPriorityForCivic: true,
    applicableTypes: ['MINISTERE'],
    specificEntityKey: 'MIN_SANTE',
    officialPortalUrl: 'https://sante.gouv.ci',
  },

  // =========================================================================
  // 6. MINISTÈRES : MINES, PÉTROLE & ÉNERGIE
  // =========================================================================
  {
    id: 'mmpe_cadastre_minier_national',
    category: 'URBANISME_FONCIER',
    categoryLabel: 'Mines & Concessions',
    title: 'Cadastre Minier National & Registre des permis de recherche et d\'exploitation',
    description: 'Cartographie officielle des titres miniers valides en Côte d\'Ivoire (or, manganèse, nickel, bauxite) et bénéficiaires des permis.',
    easyExplanation: 'Le registre officiel de toutes les concessions minières autorisées par l\'État ivoirien.',
    legalBasis: 'Loi n° 2014-138 (Code Minier)',
    isPriorityForCivic: true,
    applicableTypes: ['MINISTERE'],
    specificEntityKey: 'MIN_MINES_ENERGIE',
    officialPortalUrl: 'https://mines.gouv.ci',
  },
  {
    id: 'mmpe_rapports_itie_revenus',
    category: 'FINANCES',
    categoryLabel: 'Transparence Énergie',
    title: 'Rapport Annuel de Réconciliation ITIE des Revenus Miniers et Pétroliers',
    description: 'Rapport certifié réconciliant les paiements déclarés par les compagnies extractives (or, pétrole gisement Baleine, gaz) et les recettes perçues par le Trésor public.',
    easyExplanation: 'La transparence complète sur l\'argent généré par le pétrole, le gaz et les mines d\'or de notre pays.',
    legalBasis: 'Norme Internationale ITIE & Décret portant adhésion',
    isPriorityForCivic: true,
    applicableTypes: ['MINISTERE'],
    specificEntityKey: 'MIN_MINES_ENERGIE',
    officialPortalUrl: 'https://itie.ci',
  },
  {
    id: 'mmpe_proner_electrification_rurale',
    category: 'PLANIFICATION',
    categoryLabel: 'Électrification',
    title: 'Bilan Annuel du Programme National d\'Électrification Rurale (PRONER / PEPT)',
    description: 'Liste des villages et localités raccordés au réseau électrique national et bilan des branchements subventionnés à 1 000 FCFA (PEPT).',
    easyExplanation: 'La liste officielle des localités nouvellement éclairées et les villages programmés pour le raccordement.',
    legalBasis: 'Loi n° 2014-132 (Code de l\'Électricité)',
    isPriorityForCivic: true,
    applicableTypes: ['MINISTERE'],
    specificEntityKey: 'MIN_MINES_ENERGIE',
    officialPortalUrl: 'https://energie.gouv.ci',
  },

  // =========================================================================
  // 7. MINISTÈRES : EAUX ET FORÊTS & ROUTES
  // =========================================================================
  {
    id: 'minef_inventaire_forestier_pef',
    category: 'ENVIRONNEMENT_SANTE',
    categoryLabel: 'Forêts & Bois',
    title: 'Inventaire Forestier National (IFFN) & Périmètres d\'Exploitation Forestière (PEF)',
    description: 'Cartographie du couvert forestier restant, état des forêts classées et registre des concessions de coupe de bois attribuées aux exploitants.',
    easyExplanation: 'Le bilan chiffré sur l\'état réel de nos forêts et la liste des entreprises autorisées à exploiter le bois.',
    legalBasis: 'Loi n° 2019-675 (Code Forestier)',
    isPriorityForCivic: true,
    applicableTypes: ['MINISTERE'],
    specificEntityKey: 'MIN_EAUX_FORETS',
    officialPortalUrl: 'https://eauxetforets.gouv.ci',
  },
  {
    id: 'meer_programme_entretien_routier',
    category: 'PLANIFICATION',
    categoryLabel: 'Routes & Péages',
    title: 'Programme d\'Entretien Routier (PER) & Bilan des Recettes de Péage (FER)',
    description: 'Programmation annuelle du reprofilage des pistes en terre, réhabilitation des axes bitumés et rapport financier du Fonds d\'Entretien Routier.',
    easyExplanation: 'Le calendrier officiel des routes qui vont être réparées ou bitumées dans l\'année et l\'utilisation des recettes de péages.',
    legalBasis: 'Code de la Voirie Routière & Statuts FER / AGEROUTE',
    isPriorityForCivic: true,
    applicableTypes: ['MINISTERE'],
    specificEntityKey: 'MIN_EQUIPEMENT_ROUTES',
    officialPortalUrl: 'https://infrastructures.gouv.ci',
  },

  // =========================================================================
  // 8. DOCUMENTS COMMUNS À TOUS LES MINISTÈRES (BUDGET-PROGRAMMES & PAP 2026)
  // =========================================================================
  {
    id: 'ministere_dppd_pap_budget_programmes',
    category: 'PLANIFICATION',
    categoryLabel: 'Budget-Programmes',
    title: 'Projet Annuel de Performance (PAP / DPPD 2026-2028) du Ministère',
    description: 'Objectifs sectoriels annuels, cibles chiffrées de résultats, dotations de fonctionnement et d\'investissement votées par programme budgétaire.',
    easyExplanation: 'La feuille de route officielle du Ministère : ses objectifs annuels et les résultats chiffrés qu\'il s\'est engagé à atteindre.',
    legalBasis: 'LOLIF (Loi n° 2014-337) & DGBF / Ministère des Finances',
    isPriorityForCivic: true,
    applicableTypes: ['MINISTERE'],
    officialPortalUrl: 'https://www.dgbf.ci',
  },
  {
    id: 'ministere_rap_rapport_performance',
    category: 'BILAN_AUDIT',
    categoryLabel: 'Rapport de Performance',
    title: 'Rapport Annuel de Performance (RAP) & Bilan d\'exécution budgétaire',
    description: 'Évaluation officielle de fin d\'exercice comparant les résultats concrètement atteints aux prévisions fixées dans le Projet Annuel de Performance.',
    easyExplanation: 'Le bilan officiel de fin d\'année du Ministère : ce qui a été réussi, ce qui a pris du retard et l\'argent réellement dépensé.',
    legalBasis: 'LOLIF • Art. 4 Loi n° 2013-867',
    isPriorityForCivic: true,
    applicableTypes: ['MINISTERE'],
    officialPortalUrl: 'https://www.dgbf.ci',
  },
  {
    id: 'ministere_plan_passation_marches_ppm',
    category: 'PROCUREMENT',
    categoryLabel: 'Marchés Publics',
    title: 'Plan de Passation des Marchés (PPM 2026) du Ministère',
    description: 'Calendrier prévisionnel complet de tous les appels d\'offres, travaux, fournitures et prestations intellectuelles programmés pour l\'année budgétaire.',
    easyExplanation: 'La liste officielle de tous les contrats et marchés publics que le Ministère prévoit de passer dans l\'année.',
    legalBasis: 'Code des Marchés Publics • Art. 12',
    isPriorityForCivic: true,
    applicableTypes: ['MINISTERE'],
    officialPortalUrl: 'https://budget.gouv.ci',
  },

  // =========================================================================
  // 9. INSTITUTIONS DE LA RÉPUBLIQUE (HABG, COUR DES COMPTES, PARLEMENT...)
  // =========================================================================
  {
    id: 'habg_rapport_annuel',
    category: 'BILAN_AUDIT',
    categoryLabel: 'Anti-Corruption',
    title: 'Rapport Annuel d\'Activité sur l\'état de la corruption en Côte d\'Ivoire',
    description: 'Bilan officiel des actions de prévention, de sensibilisation, d\'enquêtes et d\'investigations administratives menées par la Haute Autorité.',
    easyExplanation: 'Le rapport public officiel dressant le bilan des actions anti-corruption de la République de Côte d\'Ivoire.',
    legalBasis: 'Art. 15 • Ordonnance n° 2013-660',
    isPriorityForCivic: true,
    applicableTypes: ['INSTITUTION'],
    specificEntityKey: 'HABG',
    officialPortalUrl: 'https://www.habg.ci',
  },
  {
    id: 'habg_declarations_patrimoine_conformite',
    category: 'BILAN_AUDIT',
    categoryLabel: 'Transparence Patrimoine',
    title: 'Liste officielle de conformité des assujettis à la déclaration de patrimoine',
    description: 'Liste nominative des agents publics et personnalités ayant accompli leur déclaration légale (publiée au JORCI). Note légale : le détail du patrimoine reste confidentiel (Art. 9).',
    easyExplanation: 'Permet de savoir quelles hautes personnalités et gestionnaires de deniers publics ont satisfait à leur obligation légale de déclaration.',
    legalBasis: 'Art. 9 • Ordonnance n° 2013-660 / JORCI',
    isPriorityForCivic: true,
    applicableTypes: ['INSTITUTION'],
    specificEntityKey: 'HABG',
    officialPortalUrl: 'https://www.habg.ci',
  },
  {
    id: 'habg_snlcc_rapport',
    category: 'PLANIFICATION',
    categoryLabel: 'Stratégie Nationale',
    title: 'Stratégie Nationale de Lutte contre la Corruption (SNLCC) & Évaluation',
    description: 'Document d\'orientation de l\'État et plan triennal de renforcement de la gouvernance et de l\'intégrité des services publics.',
    easyExplanation: 'Le plan stratégique national pour endiguer la corruption dans les administrations.',
    legalBasis: 'Ordonnance n° 2013-660 & Décret n° 2014-219',
    isPriorityForCivic: false,
    applicableTypes: ['INSTITUTION'],
    specificEntityKey: 'HABG',
    officialPortalUrl: 'https://www.habg.ci',
  },
  {
    id: 'cdc_rapport_public_annuel',
    category: 'BILAN_AUDIT',
    categoryLabel: 'Audits des Comptes',
    title: 'Rapport Public Annuel de la Cour des Comptes',
    description: 'Observations, contrôles des ministères et sociétés publiques, constatations de fautes de gestion et recommandations financières officielles.',
    easyExplanation: 'Le grand rapport annuel officiel qui audite la gestion financière de l\'État et des organismes publics.',
    legalBasis: 'Art. 83 & 84 • Loi Organique n° 2018-979',
    isPriorityForCivic: true,
    applicableTypes: ['INSTITUTION'],
    specificEntityKey: 'COUR_DES_COMPTES',
    officialPortalUrl: 'https://www.courdescomptes.ci',
  },
  {
    id: 'cdc_loi_reglement_dgc',
    category: 'FINANCES',
    categoryLabel: 'Loi de Règlement',
    title: 'Rapport sur le projet de Loi de Règlement & Déclaration Générale de Conformité',
    description: 'Audit exhaustif de l\'exécution budgétaire de l\'État pour l\'exercice écoulé certifiant la concordance des comptes publics.',
    easyExplanation: 'Le document officiel qui certifie si les dépenses exécutées correspondent bien au budget voté par les députés.',
    legalBasis: 'Art. 80 • Loi Organique n° 2018-979',
    isPriorityForCivic: true,
    applicableTypes: ['INSTITUTION'],
    specificEntityKey: 'COUR_DES_COMPTES',
    officialPortalUrl: 'https://www.courdescomptes.ci',
  },
  {
    id: 'parlement_pv_seances_plenieres',
    category: 'DELIBERATIONS',
    categoryLabel: 'Séances Plénières',
    title: 'Procès-Verbaux intégraux des Séances Plénières du Parlement',
    description: 'Comptes-rendus in extenso des débats législatifs, interventions des élus et votes des lois ordinaires et de finances.',
    easyExplanation: 'Les débats publics et votes officiels de vos députés et sénateurs.',
    legalBasis: 'Constitution de 2016 • Règlements Intérieurs',
    isPriorityForCivic: true,
    applicableTypes: ['INSTITUTION'],
    specificEntityKey: 'PARLEMENT',
    officialPortalUrl: 'https://www.assnat.ci',
  },
  {
    id: 'parlement_rapports_commissions_comef',
    category: 'FINANCES',
    categoryLabel: 'Travaux Budgétaires',
    title: 'Rapports de la Commission des Affaires Économiques et Financières (COMEF)',
    description: 'Rapports d\'audition des ministres lors de l\'examen de la Loi de Finances et questions parlementaires sur les crédits alloués.',
    easyExplanation: 'L\'analyse détaillée du Budget de l\'État réalisée par la commission des finances de l\'Assemblée Nationale.',
    legalBasis: 'Règlement Intérieur de l\'Assemblée Nationale',
    isPriorityForCivic: true,
    applicableTypes: ['INSTITUTION'],
    specificEntityKey: 'PARLEMENT',
    officialPortalUrl: 'https://www.assnat.ci',
  },
  {
    id: 'mediateur_rapport_annuel',
    category: 'BILAN_AUDIT',
    categoryLabel: 'Médiation Usagers',
    title: 'Rapport Annuel d\'Activité du Médiateur sur les réclamations des usagers',
    description: 'Synthèse des plaintes de citoyens contre l\'administration publique, dysfonctionnements constatés et recommandations de règlement amiable.',
    easyExplanation: 'Le bilan officiel des litiges entre les citoyens et les services publics.',
    legalBasis: 'Art. 32 • Loi Organique n° 2020-883',
    isPriorityForCivic: true,
    applicableTypes: ['INSTITUTION'],
    specificEntityKey: 'MEDIATEUR',
    officialPortalUrl: 'https://lemediateur.ci',
  },
  {
    id: 'cndh_rapport_etat_droits_homme',
    category: 'BILAN_AUDIT',
    categoryLabel: 'Droits de l\'Homme',
    title: 'Rapport Annuel sur l\'état des Droits de l\'Homme en Côte d\'Ivoire',
    description: 'Rapport public officiel sur les libertés publiques, les conditions de détention dans les prisons et l\'accès à la justice.',
    easyExplanation: 'Le rapport officiel sur le respect des droits humains et des libertés citoyennes en Côte d\'Ivoire.',
    legalBasis: 'Art. 4 • Loi n° 2018-900',
    isPriorityForCivic: true,
    applicableTypes: ['INSTITUTION'],
    specificEntityKey: 'CNDH',
    officialPortalUrl: 'https://cndh.ci',
  },

  // =========================================================================
  // 10. AUTORITÉS DE RÉGULATION (ARCOP, ARTCI, HACA, ANARE-CI...)
  // =========================================================================
  {
    id: 'arcop_rapport_annuel_audits',
    category: 'PROCUREMENT',
    categoryLabel: 'Régulation Marchés',
    title: 'Rapport Annuel de la Commande Publique & Audits Indépendants des Marchés',
    description: 'Statistiques nationales de tous les marchés publics de l\'État et rapports d\'audits indépendants de conformité et de passation.',
    easyExplanation: 'Le grand rapport de l\'ARCOP qui contrôle l\'ensemble des marchés publics passés en Côte d\'Ivoire.',
    legalBasis: 'Décret n° 2009-259 & Code des Marchés Publics',
    isPriorityForCivic: true,
    applicableTypes: ['AUTORITE_REGULATION'],
    specificEntityKey: 'ARCOP',
    officialPortalUrl: 'https://arcop.ci',
  },
  {
    id: 'arcop_decisions_litiges_exclusions',
    category: 'DELIBERATIONS',
    categoryLabel: 'Sanctions Marchés',
    title: 'Décisions de règlement des litiges & Liste des entreprises exclues',
    description: 'Recueil des décisions contentieuses et liste noire des entreprises sanctionnées ou interdites de soumissionner pour fraude.',
    easyExplanation: 'La liste officielle des entreprises exclues de la commande publique pour tricherie ou mauvaise exécution.',
    legalBasis: 'Ordonnance n° 2019-679',
    isPriorityForCivic: true,
    applicableTypes: ['AUTORITE_REGULATION'],
    specificEntityKey: 'ARCOP',
    officialPortalUrl: 'https://arcop.ci',
  },
  {
    id: 'artci_audit_qualite_service_qos',
    category: 'BILAN_AUDIT',
    categoryLabel: 'Contrôle Télécoms',
    title: 'Rapports d\'Audits de Qualité de Service (QoS) des réseaux mobiles',
    description: 'Mesures techniques indépendantes sur les réseaux Orange, MTN, Moov (taux de coupure des appels, couverture internet, débits 3G/4G).',
    easyExplanation: 'Les tests officiels de l\'ARTCI pour vérifier si la qualité des réseaux de téléphonie et d\'internet correspond à ce que paient les abonnés.',
    legalBasis: 'Art. 44 • Ordonnance n° 2012-293',
    isPriorityForCivic: true,
    applicableTypes: ['AUTORITE_REGULATION'],
    specificEntityKey: 'ARTCI',
    officialPortalUrl: 'https://www.artci.ci',
  },
  {
    id: 'artci_observatoire_marche_telecom_mobile_money',
    category: 'FINANCES',
    categoryLabel: 'Observatoire Numérique',
    title: 'Observatoire trimestriel des marchés Télécoms, Internet et Mobile Money',
    description: 'Données statistiques sur le nombre d\'abonnés, volumes des transactions financières mobiles et parts de marché.',
    easyExplanation: 'Les chiffres officiels sur le secteur de la téléphonie, de l\'internet et des transferts d\'argent mobile.',
    legalBasis: 'Ordonnance n° 2012-293',
    isPriorityForCivic: false,
    applicableTypes: ['AUTORITE_REGULATION'],
    specificEntityKey: 'ARTCI',
    officialPortalUrl: 'https://www.artci.ci',
  },
  {
    id: 'haca_rapport_pluralisme_medias',
    category: 'BILAN_AUDIT',
    categoryLabel: 'Médias Audiovisuels',
    title: 'Rapport Public Annuel & Relevés de pluralisme politique à la télévision (RTI)',
    description: 'Contrôle officiel de l\'équilibre du temps de parole et d\'accès des partis politiques et de la société civile aux antennes publiques.',
    easyExplanation: 'Le rapport officiel de la HACA mesurant le respect du pluralisme politique dans les médias publics.',
    legalBasis: 'Loi n° 2017-868',
    isPriorityForCivic: true,
    applicableTypes: ['AUTORITE_REGULATION'],
    specificEntityKey: 'HACA',
    officialPortalUrl: 'https://www.haca.ci',
  },
  {
    id: 'anare_rapport_qualite_electricite_litiges',
    category: 'BILAN_AUDIT',
    categoryLabel: 'Électricité & Abonnés',
    title: 'Rapport Annuel sur le secteur électrique & Conciliation des réclamations abonnés',
    description: 'Contrôle des délestages (indices de continuité SAIDI/SAIFI), audit de la convention de concession CIE et règlement des litiges abonnés.',
    easyExplanation: 'Le rapport officiel de contrôle des coupures d\'électricité et de défense des droits des consommateurs.',
    legalBasis: 'Loi n° 2014-132 & Décret n° 2016-784',
    isPriorityForCivic: true,
    applicableTypes: ['AUTORITE_REGULATION'],
    specificEntityKey: 'ANARE',
    officialPortalUrl: 'https://www.anare.ci',
  },
  {
    id: 'airp_registre_medicaments_amm',
    category: 'ENVIRONNEMENT_SANTE',
    categoryLabel: 'Médicaments Autorisés',
    title: 'Répertoire officiel des médicaments homologués (AMM) & Pharmacovigilance',
    description: 'Liste officielle des spécialités pharmaceutiques autorisées à la vente en Côte d\'Ivoire et alertes sanitaires sur les faux médicaments.',
    easyExplanation: 'Le registre officiel des médicaments légalement autorisés en pharmacie en Côte d\'Ivoire.',
    legalBasis: 'Loi n° 2017-549 & Décret n° 2021-419',
    isPriorityForCivic: true,
    applicableTypes: ['AUTORITE_REGULATION'],
    specificEntityKey: 'AIRP',
    officialPortalUrl: 'https://www.airp.ci',
  },

  // =========================================================================
  // 11. DOCUMENTS DE PROJET / CHANTIER CIBLÉ
  // =========================================================================
  {
    id: 'projet_dao_cctp',
    category: 'PROCUREMENT',
    categoryLabel: 'Chantier Ciblé',
    title: 'Dossier d\'Appel d\'Offres (DAO) & Spécifications Techniques (CCTP)',
    description: 'Cahier des clauses techniques particulières, devis quantitatif estimatif et descriptif des travaux de l\'ouvrage.',
    easyExplanation: 'Le cahier des charges technique qui détaille exactement ce qui doit être construit et avec quels matériaux.',
    legalBasis: 'Code des Marchés Publics',
    isPriorityForCivic: true,
    applicableTypes: ['PROJECT'],
  },
  {
    id: 'projet_contrat_attribution',
    category: 'PROCUREMENT',
    categoryLabel: 'Chantier Ciblé',
    title: 'Procès-Verbal d\'Attribution & Contrat du Marché Public',
    description: 'Avis officiel d\'adjudication, nom de l\'entreprise attributaire, montant contractuel adjugé en FCFA et délai contractuel de livraison.',
    easyExplanation: 'Le contrat officiel qui indique quelle entreprise a gagné le marché et combien l\'État lui a payé.',
    legalBasis: 'Code des Marchés Publics • Art. 4 Loi n° 2013-867',
    isPriorityForCivic: true,
    applicableTypes: ['PROJECT'],
  },
  {
    id: 'projet_dgd_decompte_financier',
    category: 'PROCUREMENT',
    categoryLabel: 'Chantier Ciblé',
    title: 'Décompte Général Définitif (DGD) & États Récapitulatifs des Paiements',
    description: 'Facture finale vérifiée de l\'ouvrage certifiant les quantités réellement exécutées et le solde des paiements décaissés par le Trésor public.',
    easyExplanation: 'La facture finale contrôlée pour savoir si le montant payé correspond exactement aux travaux livrés sur le terrain.',
    legalBasis: 'Code des Marchés Publics • Art. 4 Loi n° 2013-867',
    isPriorityForCivic: true,
    applicableTypes: ['PROJECT'],
  },
  {
    id: 'projet_pv_reception_travaux',
    category: 'PROCUREMENT',
    categoryLabel: 'Chantier Ciblé',
    title: 'Procès-Verbal de Réception des Travaux (Provisoire / Définitive)',
    description: 'Attestation officielle de conformité des travaux livrés signée par le maître d\'ouvrage et le bureau de contrôle technique.',
    easyExplanation: 'Le certificat officiel qui prouve que l\'école, l\'hôpital ou la route a été inspecté et livré sans malfaçon.',
    legalBasis: 'Code des Marchés Publics',
    isPriorityForCivic: true,
    applicableTypes: ['PROJECT'],
  },
  {
    id: 'projet_eies_environnement',
    category: 'ENVIRONNEMENT_SANTE',
    categoryLabel: 'Chantier Ciblé',
    title: 'Étude d\'Impact Environnemental et Social (EIES) validée par l\'ANDE',
    description: 'Rapport d\'évaluation des impacts écologiques et plan de réinstallation ou d\'indemnisation des populations riveraines du chantier.',
    easyExplanation: 'L\'évaluation écologique du chantier et les mesures pour protéger les populations riveraines.',
    legalBasis: 'Code de l\'Environnement (Loi n° 2023-900)',
    isPriorityForCivic: true,
    applicableTypes: ['PROJECT'],
  },
];

/**
 * Détermine la clé spécifique d'entité pour filtrer les documents ad hoc
 */
export function resolveSpecificEntityKey(
  institution?: { id?: string; name?: string; type?: string } | null,
  isProject?: boolean,
  resolvedEntityType?: EntityType
): string {
  if (isProject) return 'PROJECT';
  if (!institution) return resolvedEntityType || 'MAIRIE';

  const id = (institution.id || '').toLowerCase();
  const nameLower = (institution.name || '').toLowerCase();

  // Institutions constitutionnelles
  if (id === 'inst-habg' || nameLower.includes('bonne gouvernance') || nameLower.includes('habg')) return 'HABG';
  if (id === 'inst-cour-des-comptes' || nameLower.includes('cour des comptes')) return 'COUR_DES_COMPTES';
  if (id === 'inst-assemblee-nationale' || id === 'inst-senat' || nameLower.includes('assemblée nationale') || nameLower.includes('senat') || nameLower.includes('sénat')) return 'PARLEMENT';
  if (id === 'inst-conseil-constitutionnel' || nameLower.includes('constitutionnel')) return 'CONSEIL_CONSTITUTIONNEL';
  if (id === 'inst-cesec' || nameLower.includes('économique, social') || nameLower.includes('cesec')) return 'CESEC';
  if (id === 'inst-mediateur' || nameLower.includes('médiateur') || nameLower.includes('mediateur')) return 'MEDIATEUR';
  if (id === 'inst-cndh' || nameLower.includes('droits de l\'homme') || nameLower.includes('cndh')) return 'CNDH';
  if (id === 'inst-cei' || nameLower.includes('électorale') || nameLower.includes('electorale') || nameLower.includes('cei')) return 'CEI';

  // Autorités de régulation
  if (nameLower.includes('arcop') || nameLower.includes('anrmp') || nameLower.includes('commande publique')) return 'ARCOP';
  if (nameLower.includes('artci') || nameLower.includes('telecommunication') || nameLower.includes('télécommunication')) return 'ARTCI';
  if (nameLower.includes('haca') || nameLower.includes('audiovisuel')) return 'HACA';
  if (nameLower.includes('anare') || nameLower.includes('electricite') || nameLower.includes('électricité')) return 'ANARE';
  if (nameLower.includes('airp') || nameLower.includes('pharmaceutique')) return 'AIRP';
  if (nameLower.includes('café') || nameLower.includes('cacao') || nameLower.includes('cafe-cacao')) return 'CONSEIL_CAFE_CACAO';

  // Ministères sectoriels avec Codes
  if (nameLower.includes('construction') || nameLower.includes('logement') || nameLower.includes('urbanisme')) return 'MIN_CONSTRUCTION';
  if (nameLower.includes('environnement') || nameLower.includes('écologique') || nameLower.includes('ecologique') || nameLower.includes('développement durable')) return 'MIN_ENVIRONNEMENT';
  if (nameLower.includes('santé') || nameLower.includes('sante') || nameLower.includes('hygiène') || nameLower.includes('cmu')) return 'MIN_SANTE';
  if (nameLower.includes('mine') || nameLower.includes('pétrole') || nameLower.includes('petrole') || nameLower.includes('énergie') || nameLower.includes('energie')) return 'MIN_MINES_ENERGIE';
  if (nameLower.includes('eaux et forêts') || nameLower.includes('eaux et forets')) return 'MIN_EAUX_FORETS';
  if (nameLower.includes('équipement') || nameLower.includes('entretien routier') || nameLower.includes('route')) return 'MIN_EQUIPEMENT_ROUTES';

  return resolvedEntityType || 'MAIRIE';
}

/**
 * Retourne la liste des documents applicables pour une entité donnée
 */
export function getDocumentsForEntity(
  resolvedEntityType: EntityType,
  specificKey: string
): LegalDocItem[] {
  return ALL_LEGAL_DOCUMENTS.filter(doc => {
    // Si le document est spécifique à une entité donnée (ex: HABG, MIN_CONSTRUCTION)
    if (doc.specificEntityKey) {
      return doc.specificEntityKey === specificKey;
    }
    // Si c'est un document général applicable au type d'entité
    return doc.applicableTypes.includes(resolvedEntityType);
  });
}
