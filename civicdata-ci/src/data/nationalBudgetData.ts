// Official National Institutions Data sourced 100% directly from Loi de Finances 2026 (Portail Officiel du Gouvernement https://www.gouv.ci/institutions)
// et enrichi avec le répertoire officiel de la CAIDP (https://www.caidp.ci)
import { Institution, BudgetProject } from '../types';

export const NATIONAL_INSTITUTIONS_DATA: Institution[] = [
  {
    "id": "inst-presidence",
    "name": "La Présidence de la République",
    "type": "INSTITUTION",
    "region": "Abidjan",
    "district": "Autonome d'Abidjan",
    "departement": "Plateau",
    "address": "Palais Présidentiel, Boulevard Carde, Abidjan Plateau",
    "website": "https://www.presidence.ci",
    "facebook_url": "https://www.facebook.com/Presidence.ci",
    "leader_name": "S.E.M. ALASSANE OUATTARA",
    "leader_title": "Président de la République, Chef de l'État",
    "leader_photo_url": "/images/presidence_alassane_ouattara.png",
    "leader_bio": "S.E.M. Alassane Ouattara est un économiste de renommée internationale et homme d'État ivoirien. Titulaire d'un Master et d'un Doctorat d'État (Ph.D.) en Sciences Économiques de l'Université de Pennsylvanie (Philadelphie, USA), il a accompli une carrière exceptionnelle au Fonds Monétaire International (FMI) dont il a été Directeur Général Adjoint, puis Gouverneur de la Banque Centrale des États de l'Afrique de l'Ouest (BCEAO). Premier Ministre de Côte d'Ivoire de 1990 à 1993 sous la présidence de Félix Houphouët-Boigny, il a assaini l'économie et modernisé l'appareil d'État. Élu Président de la République en novembre 2010 et réélu en 2015 et 2020, il conduit la transformation structurelle de la Côte d'Ivoire : paix et stabilité retrouvées, taux de croissance parmi les plus élevés au monde, construction de milliers de kilomètres d'autoroutes, de ponts historiques, d'hôpitaux, d'écoles et d'universités dans toutes les régions du pays.",
    "leader_education": [
      "Doctorat d'État (Ph.D.) en Sciences Économiques - University of Pennsylvania (USA)",
      "Master of Science in Economics - University of Pennsylvania (USA)",
      "Bachelor of Science en Économie - Drexel Institute of Technology (USA)"
    ],
    "leader_experience": [
      "Président de la République de Côte d'Ivoire (2010 - Présent)",
      "Directeur Général Adjoint du Fonds Monétaire International - FMI (1994 - 1999)",
      "Premier Ministre, Chef du Gouvernement de Côte d'Ivoire (1990 - 1993)",
      "Gouverneur de la Banque Centrale des États de l'Afrique de l'Ouest - BCEAO (1988 - 1990)"
    ],
    "mission_summary": "La Présidence de la République est la plus haute institution de l'Exécutif ivoirien. Le Président de la République est le Chef de l'État, Chef Suprême des Armées, garant de l'indépendance nationale, de l'intégrité du territoire, du respect de la Constitution et des traités internationaux. Il définit la politique de la Nation et veille au bon fonctionnement régulier des pouvoirs publics républicains.",
    "organigramme_summary": [
      "Secrétariat Général de la Présidence de la République",
      "Cabinet du Président de la République",
      "Secrétariat Exécutif du Conseil National de Sécurité (CNS)",
      "Conseil National de Renseignement (CNR)",
      "Groupement de Sécurité du Président de la République (GSPR)",
      "État-Major Particulier du Président de la République"
    ],
    "organigramme_details": [
      {
        "title": "Secrétariat Général & Cabinet",
        "items": [
          "Ministre, Secrétaire Général de la Présidence",
          "Directeur de Cabinet et Chefs de Cabinet",
          "Conseillers Spéciaux et Conseillers Techniques Sectoriels"
        ]
      },
      {
        "title": "Sécurité & Organes Stratégiques",
        "items": [
          "Conseil National de Sécurité (CNS)",
          "État-Major Particulier du Président de la République",
          "Groupement de Sécurité du Président de la République (GSPR)"
        ]
      }
    ],
    "contact_email": "contact@presidence.ci",
    "info_officer_email": "",
    "contact_phone": "+225 27 20 31 40 00",
    "info_officer_phone": "",
    "info_officer_title": "Service d'Accès aux Documents Publics (Loi n°2013-867)",
    "budget_functioning_fcfa": 142426183115,
    "budget_investment_fcfa": 51207522500,
    "total_budget_fcfa": 193633705615,
    "budget_not_published": false
  },
  {
    "id": "inst-assnat",
    "name": "L'Assemblée Nationale de Côte d'Ivoire",
    "type": "INSTITUTION",
    "region": "Abidjan",
    "district": "Autonome d'Abidjan",
    "departement": "Plateau",
    "address": "Place de la République, Boulevard de la République, Abidjan Plateau",
    "website": "https://www.assnat.ci",
    "facebook_url": "https://www.facebook.com/AssembleeNationaleCI",
    "leader_name": "M. PATRICK JEROME ACHI",
    "leader_title": "Président de l'Assemblée Nationale",
    "leader_photo_url": "https://www.gouv.ci/uploads/institutions/177003591880.jpg",
    "leader_bio": "M. Patrick Jérôme Achi est un ingénieur et grand serviteur de l'État de très haute expérience. Diplômé de l'École Supérieure d'Électricité (Supélec Paris) et titulaire d'un Master en Gestion Économique de l'Université Paris 1 Panthéon-Sorbonne et de l'Université de San Francisco (USA), il a été Directeur de Projets au BNETD, Ministre des Infrastructures Économiques (2000-2017), Ministre d'État Secrétaire Général de la Présidence de la République (2017-2021), puis Premier Ministre, Chef du Gouvernement (2021-2023) où il a conduit la mise en œuvre de la Vision 'Côte d'Ivoire 2030'. Élu Président de l'Assemblée Nationale, il dirige la première chambre du Parlement avec une vision d'innovation législative, de contrôle rigoureux de l'action publique et de proximité avec le citoyen.",
    "leader_education": [
      "Diplôme d'Ingénieur - École Supérieure d'Électricité (Supélec) Paris",
      "Master en Gestion et Économie de l'Énergie - Université Paris 1 Panthéon-Sorbonne",
      "Master of Science in Management - University of San Francisco (USA)"
    ],
    "leader_experience": [
      "Président de l'Assemblée Nationale (2026 - Présent)",
      "Premier Ministre, Chef du Gouvernement de Côte d'Ivoire (2021 - 2023)",
      "Ministre d'État, Secrétaire Général de la Présidence de la République (2017 - 2021)",
      "Président du Conseil Régional de La Mé (2013 - Présent)",
      "Ministre des Infrastructures Économiques (2000 - 2017)"
    ],
    "mission_summary": "L'Assemblée Nationale est la chambre basse du Parlement représentant le peuple souverain de Côte d'Ivoire. Elle est investie du pouvoir législatif pour voter les lois de la République, consentir l'impôt à travers les Lois de Finances, et exercer le contrôle démocratique sur l'action du Gouvernement au moyen de questions orales, commissions d'enquête et missions d'évaluation.",
    "organigramme_summary": [
      "Bureau de l'Assemblée Nationale (Président, Vice-Présidents, Questeurs, Secrétaires)",
      "Conférence des Présidents",
      "Commissions Permanentes (Affaires Générales, Économiques et Financières, Sécurité et Défense, Éducation et Culture, etc.)",
      "Secrétariat Général de l'Assemblée Nationale",
      "Groupes Parlementaires et Réseau des Députés"
    ],
    "organigramme_details": [
      {
        "title": "Instances Politiques & Législatives",
        "items": [
          "Bureau de l'Assemblée Nationale",
          "Commission des Affaires Économiques et Financières (Examen du Budget)",
          "Commission des Affaires Générales et Institutionnelles",
          "Commission des Relations Extérieures"
        ]
      },
      {
        "title": "Administration Parlementaire",
        "items": [
          "Secrétariat Général de l'Assemblée Nationale",
          "Direction des Services Législatifs",
          "Direction de la Communication et de l'Information Citoyenne"
        ]
      }
    ],
    "info_officer_name": "M. DIOMANDE Aboubakar Sidiki",
    "info_officer_email": "",
    "info_officer_phone": "",
    "info_officer_title": "Secrétaire Général (Responsable de l'Information CAIDP)",
    "budget_functioning_fcfa": 36878972451,
    "budget_investment_fcfa": 1700000000,
    "total_budget_fcfa": 38578972451,
    "budget_not_published": false
  },
  {
    "id": "inst-senat",
    "name": "Le Sénat de Côte d'Ivoire",
    "type": "INSTITUTION",
    "region": "Yamoussoukro",
    "district": "Autonome de Yamoussoukro",
    "departement": "Yamoussoukro",
    "address": "Fondation Félix Houphouët-Boigny pour la Recherche de la Paix, Yamoussoukro",
    "website": "https://www.senat.ci",
    "facebook_url": "https://www.facebook.com/Senat.ci",
    "leader_name": "Mme KANDIA KAMISSOKO CAMARA",
    "leader_title": "Présidente du Sénat",
    "leader_photo_url": "https://www.gouv.ci/uploads/institutions/175277729223.jpg",
    "leader_bio": "Mme Kandia Kamissoko Camara est une femme d'État ivoirienne de tout premier plan. Diplômée en Lettres Modernes et Anglais de l'Université Félix Houphouët-Boigny d'Abidjan et professeure certifiée, elle a consacré sa vie à l'éducation, à l'émancipation des femmes et à la politique républicaine. Ministre de l'Éducation Nationale pendant une décennie (2011-2021), elle a étendu la scolarisation obligatoire et construit des dizaines de milliers de classes. Nommée Ministre d'État, Ministre des Affaires Étrangères (2021-2023), elle a fait rayonner la diplomatie ivoirienne à travers le monde. Élue Présidente du Sénat en octobre 2023, elle préside la chambre parlementaire représentant les collectivités territoriales et les Ivoiriens de l'extérieur.",
    "leader_education": [
      "Licence d'Anglais et Lettres Modernes - Université Félix Houphouët-Boigny Abidjan",
      "Certificat d'Aptitude Pédagogique à l'Enseignement Secondaire (CAPES)"
    ],
    "leader_experience": [
      "Présidente du Sénat de Côte d'Ivoire (2023 - Présent)",
      "Maire de la Commune d'Abobo (2021 - Présent)",
      "Ministre d'État, Ministre des Affaires Étrangères (2021 - 2023)",
      "Ministre de l'Éducation Nationale et de l'Alphabétisation (2011 - 2021)"
    ],
    "mission_summary": "Le Sénat est la chambre haute du Parlement ivoirien. Il assure la représentation des Collectivités Territoriales décentralisées (Régions, Communes) et des Ivoiriens établis hors de Côte d'Ivoire. Le Sénat examine et vote les projets de lois votés par l'Assemblée Nationale et participe à l'évaluation des politiques d'aménagement du territoire et de décentralisation.",
    "organigramme_summary": [
      "Bureau du Sénat (Présidente, Vice-Présidents, Questeurs, Secrétaires)",
      "Conférence des Présidents",
      "Commissions Permanentes (Affaires Générales, Collectivités Locales, Économie et Finances, etc.)",
      "Secrétariat Général du Sénat",
      "Groupes Parlementaires des Sénateurs"
    ],
    "organigramme_details": [
      {
        "title": "Bureau & Commissions Parlementaires",
        "items": [
          "Bureau du Sénat",
          "Commission des Collectivités Territoriales et du Développement Local",
          "Commission des Affaires Économiques et Financières"
        ]
      },
      {
        "title": "Administration du Sénat",
        "items": [
          "Secrétariat Général du Sénat",
          "Direction de la Législation et du Contrôle",
          "Direction de l'Information Documentaire et de la Communication"
        ]
      }
    ],
    "info_officer_name": "M. KATOU Kabié Patrick Roland",
    "info_officer_email": "",
    "info_officer_phone": "",
    "info_officer_title": "Directeur de l'Information Documentaire et de la Communication (RI CAIDP)",
    "budget_functioning_fcfa": 14665806742,
    "budget_investment_fcfa": 0,
    "total_budget_fcfa": 14665806742,
    "budget_not_published": false
  },
  {
    "id": "inst-conseil-const",
    "name": "Le Conseil Constitutionnel de Côte d'Ivoire",
    "type": "INSTITUTION",
    "region": "Abidjan",
    "district": "Autonome d'Abidjan",
    "departement": "Plateau",
    "address": "Boulevard Angoulvant, Immeuble du Conseil Constitutionnel, Abidjan Plateau",
    "website": "https://www.conseil-constitutionnel.ci",
    "facebook_url": "https://www.facebook.com/ConseilConstitutionnelCI",
    "leader_name": "Mme CHANTAL NANABA CAMARA",
    "leader_title": "Présidente du Conseil Constitutionnel",
    "leader_photo_url": "https://www.gouv.ci/uploads/institutions/175277745643.jpg",
    "leader_bio": "Mme Chantal Nanaba Camara est une magistrate hors hiérarchie de premier rang, symbole d'intégrité et de rigueur juridique. Première femme à diriger les plus hautes juridictions judiciaires du pays, elle a été Présidente de la Chambre Judiciaire de la Cour Suprême, Première Présidente de la Cour de Cassation et Présidente du Conseil Supérieur de la Magistrature. Nommée Présidente du Conseil Constitutionnel en mai 2023, elle veille avec autorité et indépendance à la primauté de la Constitution, à la régularité des scrutins présidentiels et législatifs et à la protection des droits et libertés fondamentaux des citoyens.",
    "leader_education": [
      "Diplôme de Magistrat (Section Judiciaire) - École Nationale d'Administration (ENA)",
      "Maîtrise en Droit Privé - Université Félix Houphouët-Boigny Abidjan"
    ],
    "leader_experience": [
      "Présidente du Conseil Constitutionnel (2023 - Présent)",
      "Présidente du Conseil Supérieur de la Magistrature (2020 - 2023)",
      "Première Présidente de la Cour de Cassation (2019 - 2023)",
      "Présidente de la Chambre Judiciaire de la Cour Suprême (2011 - 2019)"
    ],
    "mission_summary": "Le Conseil Constitutionnel est la juridiction suprême en matière constitutionnelle et électorale. Il juge de la constitutionnalité des lois, des traités internationaux et des règlements intérieurs des assemblées parlementaires. Il veille à la régularité de l'élection du Président de la République et des Députés, examine les réclamations et proclame les résultats définitifs des scrutins nationaux.",
    "organigramme_summary": [
      "Collège des Conseillers Constitutionnels",
      "Secrétariat Général du Conseil Constitutionnel",
      "Direction des Affaires Juridiques et Constitutionnelles",
      "Service du Greffe Constitutionnel et de la Documentation Juridique"
    ],
    "organigramme_details": [
      {
        "title": "Collège Juridictionnel",
        "items": [
          "Présidente du Conseil Constitutionnel",
          "Conseillers Constitutionnels nommés par le Président et les Présidents des Chambres",
          "Greffe en Chef du Conseil Constitutionnel"
        ]
      },
      {
        "title": "Services Administratifs & Études",
        "items": [
          "Secrétariat Général du Conseil Constitutionnel",
          "Service des Recherches Constitutionnelles et du Contentieux Électoral"
        ]
      }
    ],
    "info_officer_title": "Service d'Accès aux Documents Publics (Loi n°2013-867)",
    "budget_functioning_fcfa": 3860437235,
    "budget_investment_fcfa": 0,
    "total_budget_fcfa": 3860437235,
    "budget_not_published": false
  },
  {
    "id": "inst-cour-supreme",
    "name": "La Cour Suprême de Côte d'Ivoire",
    "type": "INSTITUTION",
    "region": "Abidjan",
    "district": "Autonome d'Abidjan",
    "departement": "Plateau",
    "address": "Plateau, Rue du Commerce, Abidjan",
    "website": "https://www.coursupreme.ci",
    "facebook_url": "https://www.facebook.com/CourSupremeCI",
    "leader_name": "M. RENE FRANCOIS APHING KOUASSI",
    "leader_title": "Président de la Cour Suprême",
    "leader_photo_url": "https://www.gouv.ci/uploads/institutions/Aphing-Kouassi-1.jpg",
    "leader_bio": "M. René François Aphing-Kouassi est un éminent magistrat hors hiérarchie et homme d'État ivoirien. Diplômé en Droit et de l'École Nationale de la Magistrature, il a exercé les fonctions de Garde des Sceaux, Ministre de la Justice, avant de présider la Cour Suprême de Côte d'Ivoire. Haute autorité judiciaire du pays, il a dirigé l'institution régulatrice de l'ordre juridictionnel ivoirien.",
    "leader_education": [
      "Diplôme de Magistrat - Section Magistrature",
      "Licence et Maîtrise en Droit Privé - Faculté de Droit d'Abidjan"
    ],
    "leader_experience": [
      "Président de la Cour Suprême de Côte d'Ivoire",
      "Garde des Sceaux, Ministre de la Justice",
      "Magistrat hors hiérarchie"
    ],
    "mission_summary": "La Cour Suprême est l'institution judiciaire historique suprême de l'État de Côte d'Ivoire. Conformément à la Constitution, elle a veillé à la régulation du droit et à la bonne administration de la justice, avant l'autonomisation institutionnelle de la Cour de Cassation, du Conseil d'État et de la Cour des Comptes.",
    "organigramme_summary": [
      "Chambre Judiciaire",
      "Chambre Administrative",
      "Chambre des Comptes",
      "Parquet Général près la Cour Suprême"
    ],
    "organigramme_details": [
      {
        "title": "Organisation Judiciaire Historique",
        "items": [
          "Présidence de la Cour Suprême",
          "Chambres Judiciaires et Administratives"
        ]
      }
    ],
    "info_officer_title": "Service d'Accès aux Documents Publics (Loi n°2013-867)",
    "budget_functioning_fcfa": 0,
    "budget_investment_fcfa": 0,
    "total_budget_fcfa": 0,
    "budget_not_published": true
  },
  {
    "id": "inst-cour-comptes",
    "name": "La Cour des Comptes de Côte d'Ivoire",
    "type": "INSTITUTION",
    "region": "Abidjan",
    "district": "Autonome d'Abidjan",
    "departement": "Cocody",
    "address": "Cocody Angré 7e Tranche, Boulevard Latrille, Abidjan",
    "website": "https://www.courdescomptes.ci",
    "facebook_url": "https://www.facebook.com/CourDesComptesCI",
    "leader_name": "M. KANVALY DIOMANDE",
    "leader_title": "Président de la Cour des Comptes",
    "leader_photo_url": "https://www.gouv.ci/uploads/institutions/175277717353.jpg",
    "leader_bio": "M. Kanvaly Diomandé est un magistrat financier émérite et juriste expert en finances publiques. Diplômé de l'ENA (section Magistrature financière) et titulaire d'un DESS en Gestion des Finances Publiques, il a présidé la Chambre des Comptes de la Cour Suprême avant d'être nommé Premier Président de la Cour des Comptes lors de son érection en institution constitutionnelle autonome en 2018. Il est l'artisan de la publication annuelle des Rapports Publics de la Cour des Comptes sur la conformité de l'exécution des budgets de l'État, des ministères et des entreprises publiques, garantissant aux citoyens ivoiriens la stricte transparence des deniers publics.",
    "leader_education": [
      "Diplôme de Magistrat Financier - École Nationale d'Administration (ENA)",
      "DESS en Finances Publiques et Contrôle de Gestion de l'État"
    ],
    "leader_experience": [
      "Premier Président de la Cour des Comptes (2018 - Présent)",
      "Président de la Chambre des Comptes de la Cour Suprême (2007 - 2018)",
      "Magistrat Conseiller à la Cour Suprême de Côte d'Ivoire"
    ],
    "mission_summary": "La Cour des Comptes est l'Institution Supérieure de Contrôle des Finances Publiques en Côte d'Ivoire. Elle juge les comptes des comptables publics, vérifie la régularité et l'efficacité de la gestion des ministères, des collectivités locales et des sociétés d'État, assiste le Parlement et le Gouvernement dans le contrôle de l'exécution des Lois de Finances et publie ses rapports annuels publics.",
    "organigramme_summary": [
      "Chambre des Comptes des Établissements Publics et Entreprises d'État",
      "Chambre des Comptes des Ministères et Budgets Nationaux",
      "Chambre des Collectivités Territoriales (Mairies, Régions)",
      "Parquet Général près la Cour des Comptes (Procureur Général)",
      "Secrétariat Général et Greffe Central"
    ],
    "organigramme_details": [
      {
        "title": "Chambres Juridictionnelles de Contrôle",
        "items": [
          "Chambre des Comptes de l'État et des Budgets Nationaux",
          "Chambre des Entreprises Publiques et Participations Financières",
          "Chambre des Collectivités Territoriales (Audit des Communes et Régions)"
        ]
      },
      {
        "title": "Parquet & Greffe",
        "items": [
          "Parquet Général près la Cour des Comptes",
          "Greffe Central et Service de Publication des Rapports Publics"
        ]
      }
    ],
    "info_officer_name": "Mme Abibatou DIOP Épouse BOARE",
    "info_officer_email": "",
    "info_officer_phone": "",
    "info_officer_title": "Directeur de Cabinet (Responsable de l'Information CAIDP)",
    "budget_functioning_fcfa": 6916461351,
    "budget_investment_fcfa": 1934700000,
    "total_budget_fcfa": 8851161351,
    "budget_not_published": false
  },
  {
    "id": "inst-conseil-etat",
    "name": "Le Conseil d'État de Côte d'Ivoire",
    "type": "INSTITUTION",
    "region": "Abidjan",
    "district": "Autonome d'Abidjan",
    "departement": "Plateau",
    "address": "Plateau, Boulevard Angoulvant, Abidjan",
    "website": "https://www.conseildetat.ci",
    "facebook_url": "https://www.facebook.com/ConseilDEtatCI",
    "leader_name": "M. IBRAHIME COULIBALY-KUIBIERT",
    "leader_title": "Président du Conseil d'État",
    "leader_photo_url": "https://www.gouv.ci/uploads/institutions/177818878228.jpg",
    "leader_bio": "M. Ibrahime Coulibaly-Kuibiert est un haut magistrat hors hiérarchie ivoirien. Diplômé de l'École Nationale d'Administration (ENA, section Magistrature), il a exercé les fonctions de Secrétaire Général du Conseil Constitutionnel, puis Directeur de Cabinet du Ministère de la Justice, avant de présider la Commission Électorale Indépendante (CEI). Nommé Président du Conseil d'État, il préside la plus haute juridiction de l'ordre administratif en Côte d'Ivoire, régulant le contentieux de l'action publique et veillant à la stricte légalité républicaine.",
    "leader_education": [
      "Diplôme de Magistrat (Section Judiciaire et Administrative) - ENA Abidjan",
      "Maîtrise en Droit - Université Félix Houphouët-Boigny Abidjan"
    ],
    "leader_experience": [
      "Président du Conseil d'État (Présent)",
      "Président de la Commission Électorale Indépendante - CEI (2019 - 2025)",
      "Secrétaire Général du Conseil Constitutionnel de Côte d'Ivoire",
      "Directeur de Cabinet au Ministère de la Justice et des Droits de l'Homme"
    ],
    "mission_summary": "Le Conseil d'État est la plus haute juridiction de l'ordre administratif. Il juge en dernier ressort les recours pour excès de pouvoir dirigés contre les décrets, arrêtés et décisions des autorités administratives (ministères, préfets, maires) et exerce une fonction consultative de conseil juridique auprès du Gouvernement.",
    "organigramme_summary": [
      "Chambre du Contentieux Administratif",
      "Chambre Consultative du Conseil d'État",
      "Secrétariat Général et Greffe en Chef"
    ],
    "organigramme_details": [
      {
        "title": "Chambres Spécialisées",
        "items": [
          "Chambre du Contentieux Administratif (Annulation pour excès de pouvoir)",
          "Chambre Consultative (Avis juridiques sur les projets de textes réglementaires)"
        ]
      },
      {
        "title": "Administration du Conseil d'État",
        "items": [
          "Secrétariat Général",
          "Greffe en Chef et Service des Arrêts"
        ]
      }
    ],
    "info_officer_title": "Service d'Accès aux Documents Publics (Loi n°2013-867)",
    "budget_functioning_fcfa": 5164531081,
    "budget_investment_fcfa": 0,
    "total_budget_fcfa": 5164531081,
    "budget_not_published": false
  },
  {
    "id": "inst-cour-cassation",
    "name": "La Cour de Cassation de Côte d'Ivoire",
    "type": "INSTITUTION",
    "region": "Abidjan",
    "district": "Autonome d'Abidjan",
    "departement": "Plateau",
    "address": "Plateau, Boulevard Angoulvant, Abidjan",
    "website": "https://www.courdecassation.ci",
    "facebook_url": "https://www.facebook.com/CourDeCassationCI",
    "leader_name": "M. YUA KOFFI",
    "leader_title": "Président de la Cour de Cassation",
    "leader_photo_url": "https://www.gouv.ci/uploads/institutions/17503514265.jpg",
    "leader_bio": "M. Yua Koffi est un magistrat hors hiérarchie de carrière exemplaire. Diplômé de l'ENA et de la Faculté de Droit d'Abidjan, il a gravi tous les échelons de la hiérarchie judiciaire : juge d'instruction, président de tribunal, président de chambre de Cour d'Appel, puis Président de Chambre à la Cour Suprême. Nommé Président de la Cour de Cassation, il assure la direction de la plus haute juridiction de l'ordre judiciaire (civil, commercial, pénal et social) et veille à l'application uniforme et équitable de la loi sur l'ensemble des tribunaux et cours d'appel de Côte d'Ivoire.",
    "leader_education": [
      "Diplôme de Magistrat - École Nationale d'Administration (ENA)",
      "Maîtrise en Droit Privé et Sciences Criminelles"
    ],
    "leader_experience": [
      "Président de la Cour de Cassation (2023 - Présent)",
      "Président de Chambre Judiciaire à la Cour Suprême",
      "Magistrat et Président de Juridictions d'Appel"
    ],
    "mission_summary": "La Cour de Cassation est la juridiction suprême de l'ordre judiciaire. Elle statue souverainement sur les pourvois en cassation formés contre les jugements et arrêts rendus en dernier ressort par les Tribunaux de Première Instance et les Cours d'Appel dans les matières civile, commerciale, sociale et pénale.",
    "organigramme_summary": [
      "Chambre Civile et Commerciale",
      "Chambre Pénale et Correctionnelle",
      "Chambre Sociale",
      "Parquet Général près la Cour de Cassation",
      "Greffe en Chef de la Cour de Cassation"
    ],
    "organigramme_details": [
      {
        "title": "Chambres Judiciaires Spécialisées",
        "items": [
          "Chambre Civile et Commerciale",
          "Chambre Pénale",
          "Chambre Sociale (Droit du travail et prévoyance sociale)"
        ]
      },
      {
        "title": "Parquet Général & Greffe",
        "items": [
          "Procureur Général près la Cour de Cassation",
          "Greffe Central et Service de la Jurisprudence"
        ]
      }
    ],
    "info_officer_title": "Service d'Accès aux Documents Publics (Loi n°2013-867)",
    "budget_functioning_fcfa": 7931309608,
    "budget_investment_fcfa": 0,
    "total_budget_fcfa": 7931309608,
    "budget_not_published": false
  },
  {
    "id": "inst-mediateur",
    "name": "Le Médiateur de la République de Côte d'Ivoire",
    "type": "INSTITUTION",
    "region": "Abidjan",
    "district": "Autonome d'Abidjan",
    "departement": "Cocody",
    "address": "Cocody II Plateaux, Boulevard Latrille, Abidjan",
    "website": "https://www.mediateur.ci",
    "facebook_url": "https://www.facebook.com/LeMediateurdelaRepubliqueCI",
    "leader_name": "M. ADAMA TOUNGARA",
    "leader_title": "Médiateur de la République",
    "leader_photo_url": "https://www.gouv.ci/uploads/institutions/175277704232.jpg",
    "leader_bio": "M. Adama Toungara est un ingénieur d'État, dirigeant d'entreprises publiques et homme politique de premier plan. Diplômé de l'Université de Clermont-Ferrand et de l'Institut Français du Pétrole (IFP) de Paris, il a été Directeur Général historique de PETROCI, Conseiller Spécial du Président Félix Houphouët-Boigny, Maire emblématique de la grande commune d'Abobo (2001-2018), et Ministre des Mines, du Pétrole et de l'Énergie (2011-2017). Nommé Médiateur de la République en 2018, il a déployé un réseau de Délégations Régionales dans toutes les régions de Côte d'Ivoire pour régler à l'amiable et gratuitement les litiges entre les citoyens et l'administration publique, tout en consolidant la cohésion sociale et la paix communautaire.",
    "leader_education": [
      "Diplôme d'Ingénieur Géologue et Pétrolier - Institut Français du Pétrole (IFP) Paris",
      "Diplôme d'Études Supérieures en Sciences de la Terre - Université de Clermont-Ferrand (France)"
    ],
    "leader_experience": [
      "Médiateur de la République de Côte d'Ivoire (2018 - Présent)",
      "Ministre des Mines, du Pétrole et de l'Énergie (2011 - 2017)",
      "Maire de la Commune d'Abobo (2001 - 2018)",
      "Directeur Général de PETROCI Holding (1975 - 1981)"
    ],
    "mission_summary": "Le Médiateur de la République est une autorité administrative indépendante investie d'une mission de service public. Il reçoit et instruit gratuitement les réclamations des citoyens relatives au fonctionnement des administrations de l'État, des collectivités locales et des organismes investis d'une mission de service public, et œuvre au renforcement de la cohésion sociale et du vivre-ensemble pacifique.",
    "organigramme_summary": [
      "Cabinet du Médiateur de la République",
      "Secrétariat Général de l'Institution",
      "Direction des Requêtes, de la Médiation et du Dialogue",
      "Direction de la Cohésion Sociale et du Vivre-Ensemble",
      "Délégations Régionales du Médiateur réparties dans les 31 Régions et 2 Districts"
    ],
    "organigramme_details": [
      {
        "title": "Médiation & Traitement des Litiges",
        "items": [
          "Direction des Requêtes des Citoyens (Numéro Vert 1320)",
          "Pôle de Règlement Amiable des Différends avec l'Administration Publique",
          "Réseau des 33 Délégations Régionales de Proximité"
        ]
      },
      {
        "title": "Cohésion Sociale & Paix",
        "items": [
          "Direction de la Prévention des Conflits Communautaires",
          "Comités Régionaux de Veille et de Cohésion Sociale"
        ]
      }
    ],
    "info_officer_name": "M. DIABAGATE Mory",
    "info_officer_email": "",
    "info_officer_phone": "",
    "info_officer_title": "Directeur de la Communication et de l'Informatique (RI CAIDP)",
    "green_line_number": "1320",
    "budget_functioning_fcfa": 8285468221,
    "budget_investment_fcfa": 0,
    "total_budget_fcfa": 8285468221,
    "budget_not_published": false
  },
  {
    "id": "inst-ige",
    "name": "L'Inspection Générale de l'État (IGE)",
    "type": "INSTITUTION",
    "region": "Abidjan",
    "district": "Autonome d'Abidjan",
    "departement": "Plateau",
    "address": "Immeuble IGE, Boulevard Carde, Abidjan Plateau",
    "website": "https://www.igeci.org",
    "facebook_url": "https://www.facebook.com/IGE.CotedIvoire",
    "leader_name": "M. AHOUA N'DOLI THEOPHILE",
    "leader_title": "Inspecteur Général d'État",
    "leader_photo_url": "https://www.gouv.ci/uploads/institutions/175277618531.jpg",
    "leader_bio": "M. Ahoua N'Doli Théophile est un économiste, banquier central et haut commis de l'État. Diplômé de l'Université de Paris 9 Dauphine en économie et finances, il a été Directeur de Cabinet du Premier Ministre Alassane Ouattara (1990-1993), Ministre du Plan et du Développement Industriel (1996-1999) et Vice-Gouverneur de la Banque Centrale des États de l'Afrique de l'Ouest (BCEAO). Nommé Inspecteur Général d'État en 2017, il a modernisé l'audit public en Côte d'Ivoire en conduisant les missions de contrôle administratif et financier au sein des ministères, directions générales et entreprises publiques pour ancrer durablement la rigueur et l'intégrité républicaines.",
    "leader_education": [
      "DESS en Banque et Finances - Université Paris 9 Dauphine",
      "Maîtrise en Sciences Économiques et Gestion"
    ],
    "leader_experience": [
      "Inspecteur Général d'État (2017 - Présent)",
      "Directeur de Cabinet du Premier Ministre Alassane Ouattara (1990 - 1993)",
      "Ministre du Plan et de l'Industrie (1996 - 1999)",
      "Vice-Gouverneur de la BCEAO"
    ],
    "mission_summary": "L'Inspection Générale de l'État (IGE) est l'institution supérieure d'inspection, d'audit, de contrôle et d'évaluation administrative et financière placée sous l'autorité directe du Président de la République. Elle s'assure du bon fonctionnement des services publics, de la probité des gestionnaires de deniers publics et de l'application rigoureuse des règles de bonne gouvernance.",
    "organigramme_summary": [
      "Collège des Inspecteurs d'État",
      "Direction des Audits et Enquêtes Financières",
      "Direction de l'Évaluation des Performances Administratives",
      "Secrétariat Général de l'IGE"
    ],
    "organigramme_details": [
      {
        "title": "Missions d'Audit & Enquêtes",
        "items": [
          "Corps des Inspecteurs d'État",
          "Direction des Contrôles Spéciaux et Audits Financiers",
          "Cellule d'Évaluation de la Gouvernance Publique"
        ]
      },
      {
        "title": "Administration",
        "items": [
          "Secrétariat Général de l'IGE",
          "Direction de la Documentation et des Statistiques"
        ]
      }
    ],
    "info_officer_title": "Service d'Accès aux Documents Publics (Loi n°2013-867)",
    "budget_functioning_fcfa": 8429477575,
    "budget_investment_fcfa": 1443100000,
    "total_budget_fcfa": 9872577575,
    "budget_not_published": false
  },
  {
    "id": "inst-chancellerie",
    "name": "La Grande Chancellerie de l'Ordre National",
    "type": "INSTITUTION",
    "region": "Abidjan",
    "district": "Autonome d'Abidjan",
    "departement": "Cocody",
    "address": "Cocody Ambassades, Rue de la Grande Chancellerie, Abidjan",
    "website": "https://www.chancellerie.ci",
    "facebook_url": "https://www.facebook.com/chancellerie.ci",
    "leader_name": "M. ALLY COULIBALY",
    "leader_title": "Grand Chancelier de l'Ordre National",
    "leader_photo_url": "https://www.gouv.ci/uploads/institutions/175277690167.jpg",
    "leader_bio": "M. Ally Coulibaly est un journaliste émérite, diplomate et homme d'État ivoirien. Diplômé du Centre d'Études des Sciences et Techniques de l'Information (CESTI) de Dakar et de l'Université Félix Houphouët-Boigny, il a dirigé la Radiodiffusion Télévision Ivoirienne (RTI). Ambassadeur Extraordinaire et Plénipotentiaire de Côte d'Ivoire en France (2011-2012), il a été Ministre de l'Intégration Africaine (2012-2020), puis Ministre des Affaires Étrangères. Nommé Grand Chancelier de l'Ordre National en octobre 2023, il administre les ordres honorifiques de la République récompensant le mérite exceptionnel et le dévouement civique des citoyens et amis de la Côte d'Ivoire.",
    "leader_education": [
      "Diplôme Supérieur de Journalisme et Communication - CESTI Dakar",
      "Licence en Lettres Modernes - Université d'Abidjan"
    ],
    "leader_experience": [
      "Grand Chancelier de l'Ordre National (2023 - Présent)",
      "Ministre des Affaires Étrangères (2020 - 2021)",
      "Ministre de l'Intégration Africaine et des Ivoiriens de l'Extérieur (2012 - 2020)",
      "Ambassadeur de Côte d'Ivoire en France (2011 - 2012)",
      "Directeur Général de la RTI"
    ],
    "mission_summary": "La Grande Chancellerie de l'Ordre National est l'institution républicaine chargée de l'administration et de la gestion des ordres nationaux (Ordre National, Ordre du Mérite Ivoirien) et décorations honorifiques de la République de Côte d'Ivoire. Elle distingue et honore les femmes et les hommes qui se sont illustrés par leurs mérites éminents et leurs services rendus à la Nation.",
    "organigramme_summary": [
      "Conseil de l'Ordre National",
      "Secrétariat Général de la Grande Chancellerie",
      "Direction des Décorations et des Titres Honorifiques",
      "Direction des Affaires Administratives et du Protocole"
    ],
    "organigramme_details": [
      {
        "title": "Conseil de l'Ordre & Distinctions",
        "items": [
          "Grand Chancelier et Conseil de l'Ordre National",
          "Commission d'Attribution des Décorations et Mérites Républicains"
        ]
      },
      {
        "title": "Services Administratifs",
        "items": [
          "Secrétariat Général",
          "Direction des Titres et des Archives Honorifiques"
        ]
      }
    ],
    "info_officer_title": "Service d'Accès aux Documents Publics (Loi n°2013-867)",
    "budget_functioning_fcfa": 3743870172,
    "budget_investment_fcfa": 0,
    "total_budget_fcfa": 3743870172,
    "budget_not_published": false
  },
  {
    "id": "inst-cesec",
    "name": "Le Conseil Économique, Social, Environnemental et Culturel (CESEC)",
    "type": "INSTITUTION",
    "region": "Abidjan",
    "district": "Autonome d'Abidjan",
    "departement": "Plateau",
    "address": "Avenue Jean-Paul II, Boulevard Clozel, Abidjan Plateau",
    "website": "https://www.cesec.ci",
    "facebook_url": "https://www.facebook.com/cesec.ci",
    "leader_name": "Dr AKA AOUELE",
    "leader_title": "Président du CESEC",
    "leader_photo_url": "https://www.gouv.ci/uploads/institutions/175277668733.jpg",
    "leader_bio": "Le Dr Eugène Aka Aouélé est un docteur d'État en pharmacie, économiste de la santé et homme d'État ivoirien. Diplômé de l'Université de Caen (France) et titulaire d'un diplôme d'Économie de la Santé, il a été Vice-Président de l'Assemblée Nationale, Ministre de la Santé et de l'Hygiène Publique (2018-2021) où il a géré avec succès la riposte nationale à la pandémie de Covid-19, et Ministre des Eaux et Forêts. Président du Conseil Régional du Sud-Comoé et Président de l'Assemblée des Régions et Districts de Côte d'Ivoire (ARDCI), il préside le CESEC depuis avril 2021, transformant l'institution en pôle consultatif stratégique d'orientation socio-économique et environnementale pour le développement du pays.",
    "leader_education": [
      "Doctorat d'État en Pharmacie - Université de Caen (France)",
      "Diplôme Universitaire d'Économie de la Santé - Université de Paris"
    ],
    "leader_experience": [
      "Président du CESEC (2021 - Présent)",
      "Président de l'Assemblée des Régions et Districts de Côte d'Ivoire - ARDCI",
      "Président du Conseil Régional du Sud-Comoé (2013 - Présent)",
      "Ministre de la Santé et de l'Hygiène Publique (2018 - 2021)",
      "Vice-Président de l'Assemblée Nationale"
    ],
    "mission_summary": "Le Conseil Économique, Social, Environnemental et Culturel (CESEC) est l'assemblée consultative de la République auprès du Président, du Gouvernement et du Parlement. Il est obligatoirement consulté sur les projets de plans de développement, les Lois de Finances et les projets de lois à caractère économique, social, écologique et culturel, et réalise des études prospectives et auto-saisines au service de la Nation.",
    "organigramme_summary": [
      "Bureau du CESEC (Président, Vice-Présidents, Questeurs, Secrétaires)",
      "Commissions Permanentes (Économie, Affaires Sociales, Environnement et Climat, Culture et Éducation)",
      "Secrétariat Général du CESEC",
      "Direction des Études, des Publications et de la Prospective"
    ],
    "organigramme_details": [
      {
        "title": "Commissions Thématiques de Réflexion",
        "items": [
          "Commission des Affaires Économiques et Financières",
          "Commission de l'Environnement et de la Transition Écologique",
          "Commission des Affaires Sociales et de l'Emploi",
          "Commission de l'Éducation, de la Culture et de la Francophonie"
        ]
      },
      {
        "title": "Administration & Études",
        "items": [
          "Secrétariat Général du CESEC",
          "Direction de la Prospective et de la Communication Multimédia"
        ]
      }
    ],
    "info_officer_name": "M. ASSA Kouamé Alvor",
    "info_officer_email": "",
    "info_officer_phone": "",
    "info_officer_title": "Directeur de la Communication et de l'Information Multimédia (RI CAIDP)",
    "budget_functioning_fcfa": 8069692846,
    "budget_investment_fcfa": 0,
    "total_budget_fcfa": 8069692846,
    "budget_not_published": false
  },
  {
    "id": "inst-cnrct",
    "name": "La Chambre Nationale des Rois et Chefs Traditionnels (CNRCT)",
    "type": "INSTITUTION",
    "region": "Yamoussoukro",
    "district": "Autonome de Yamoussoukro",
    "departement": "Yamoussoukro",
    "address": "Siège National de la CNRCT, Yamoussoukro",
    "website": "https://cnrct.ci",
    "facebook_url": "https://www.facebook.com/cnrct.ci",
    "leader_name": "M. DESIRE AMON PAUL TANOE",
    "leader_title": "Président du Directoire de la CNRCT",
    "leader_photo_url": "https://www.gouv.ci/uploads/institutions/17527754068.jpg",
    "leader_bio": "Sa Majesté Nanan Désiré Amon Paul Tanoé est le Roi des N'Zima Kotoko de Grand-Bassam et un diplomate de carrière de très haut rang. Titulaire d'une Maîtrise en Droit International et Sciences Politiques de l'Université de Paris, il a représenté la Côte d'Ivoire en tant qu'Ambassadeur Extraordinaire et Plénipotentiaire auprès de l'Organisation des Nations Unies (ONU à New York), en France et dans plusieurs chancelleries stratégiques. Intronisé Roi de Grand-Bassam en 2003, il préside le Directoire de la Chambre Nationale des Rois et Chefs Traditionnels depuis sa création constitutionnelle, œuvrant pour la préservation des coutumes, la conciliation des chefferies et la cohésion nationale interethnique.",
    "leader_education": [
      "Diplôme d'Études Supérieures en Droit International et Diplomatie - Université de Paris",
      "Maîtrise en Sciences Politiques"
    ],
    "leader_experience": [
      "Président du Directoire de la Chambre Nationale des Rois et Chefs Traditionnels (2015 - Présent)",
      "Roi des N'Zima Kotoko de Grand-Bassam (2003 - Présent)",
      "Ambassadeur Extraordinaire et Plénipotentiaire de Côte d'Ivoire auprès de l'ONU à New York",
      "Conseiller Diplomatique à la Présidence de la République"
    ],
    "mission_summary": "La Chambre Nationale des Rois et Chefs Traditionnels (CNRCT) est l'institution constitutionnelle regroupant l'ensemble des autorités coutumières et traditionnelles de Côte d'Ivoire. Elle a pour mission la valorisation des us et coutumes, la préservation du patrimoine culturel immatériel, la prévention et le règlement pacifique des conflits fonciers et communautaires, et la promotion des valeurs civiques républicaines.",
    "organigramme_summary": [
      "Assemblée Générale de la CNRCT",
      "Directoire de la Chambre des Rois et Chefs",
      "Comités Régionaux des Rois et Chefs Traditionnels",
      "Secrétariat Général Administratif de la CNRCT"
    ],
    "organigramme_details": [
      {
        "title": "Directoire & Chefferie Coutumière",
        "items": [
          "Président du Directoire de la CNRCT",
          "Collège des Rois et Chefs de Provinces",
          "Comités Régionaux de Médiation et de Conciliation Coutumière"
        ]
      },
      {
        "title": "Services Administratifs",
        "items": [
          "Secrétariat Général de la Chambre",
          "Direction du Patrimoine Coutumier et des Traditions"
        ]
      }
    ],
    "info_officer_title": "Service d'Accès aux Documents Publics (Loi n°2013-867)",
    "budget_functioning_fcfa": 5794171874,
    "budget_investment_fcfa": 0,
    "total_budget_fcfa": 5794171874,
    "budget_not_published": false
  },
  {
    "id": "inst-habg",
    "name": "La Haute Autorité pour la Bonne Gouvernance (HABG)",
    "type": "INSTITUTION",
    "region": "Abidjan",
    "district": "Autonome d'Abidjan",
    "departement": "Cocody",
    "address": "Cocody Riviera 3, Boulevard François Mitterrand, Abidjan",
    "website": "https://www.habg.ci",
    "facebook_url": "https://www.facebook.com/HABGCotedIvoire",
    "leader_name": "M. EPIPHANE ZORO BI BALLO",
    "leader_title": "Président de la HABG",
    "leader_photo_url": "https://www.gouv.ci/uploads/institutions/175277653110.jpg",
    "leader_bio": "M. Eponon Zoro Bi Ballo Épithace est un magistrat hors hiérarchie et expert reconnu en droits de l'homme et gouvernance publique. Diplômé de l'ENA (section Magistrature) et titulaire d'un DEA en Droit International des Droits de l'Homme, il a exercé comme magistrat et juge, avant de diriger le Centre International pour la Justice Transitionnelle. Secrétaire d'État chargé du Renforcement des Capacités (2019-2021), puis Ministre de la Promotion de la Bonne Gouvernance et de la Lutte contre la Corruption (2021-2023), il est nommé Président de la HABG en octobre 2023 pour intensifier la prévention de la corruption, le contrôle strict des déclarations de patrimoine des assujettis publics et les enquêtes sur les atteintes à la probité publique.",
    "leader_education": [
      "Diplôme de Magistrat - École Nationale d'Administration (ENA)",
      "Diplôme d'Études Approfondies (DEA) en Droit International et Droits de l'Homme",
      "Maîtrise en Droit Privé - Université Félix Houphouët-Boigny Abidjan"
    ],
    "leader_experience": [
      "Président de la Haute Autorité pour la Bonne Gouvernance - HABG (2023 - Présent)",
      "Ministre de la Promotion de la Bonne Gouvernance et de la Lutte contre la Corruption (2021 - 2023)",
      "Secrétaire d'État auprès du Premier Ministre, chargé du Renforcement des Capacités (2019 - 2021)",
      "Magistrat et Directeur d'Organisations Internationales de Justice"
    ],
    "mission_summary": "La Haute Autorité pour la Bonne Gouvernance (HABG) est l'autorité administrative indépendante chargée de la prévention et de la lutte contre la corruption et les infractions assimilées en Côte d'Ivoire. Elle assure la réception, le traitement et le contrôle des déclarations de patrimoine des personnalités politiques et gestionnaires publics, mène des enquêtes d'office ou sur dénonciation, et promeut l'intégrité dans le service public.",
    "organigramme_summary": [
      "Conseil de la Haute Autorité (Président et Membres du Conseil)",
      "Direction des Déclarations de Patrimoine",
      "Direction des Enquêtes et des Poursuites",
      "Direction de la Sensibilisation et de la Prévention",
      "Secrétariat Général de la HABG"
    ],
    "organigramme_details": [
      {
        "title": "Déclarations de Patrimoine & Enquêtes",
        "items": [
          "Direction des Déclarations de Patrimoine (Contrôle des assujettis publics)",
          "Direction des Investigations et Enquêtes Judiciaires (Numéro Vert 800 00 900)",
          "Pôle d'Analyse Financière et Détection des Conflits d'Intérêts"
        ]
      },
      {
        "title": "Prévention & Éthique Publique",
        "items": [
          "Direction de la Prévention et de l'Éducation à l'Intégrité",
          "Secrétariat Général et Relations avec les Juridictions Pénales"
        ]
      }
    ],
    "info_officer_name": "Mlle OKOIN Adjo Tatiana Marie Josée",
    "info_officer_email": "",
    "info_officer_phone": "",
    "info_officer_title": "Chef de Service Média et Événementiel (RI CAIDP)",
    "green_line_number": "800 00 900",
    "budget_functioning_fcfa": 5552174916,
    "budget_investment_fcfa": 0,
    "total_budget_fcfa": 5552174916,
    "budget_not_published": false
  }
];

export const NATIONAL_BUDGET_PROJECTS: BudgetProject[] = [];

