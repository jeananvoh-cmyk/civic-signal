// Official Terminated Public Contracts from DGMP (Direction Générale des Marchés Publics)
// Source: https://www.marchespublics.ci/resiliation_marche

export interface TerminatedContract {
  id: string;
  market_number: string;
  contractor_name: string;
  authority_ministry: string;
  object_summary: string;
  region_commune: string;
  reason_summary: string;
  decision_date: string;
  official_doc_url: string;
}

export const OFFICIAL_TERMINATED_CONTRACTS: TerminatedContract[] = [
  {
    id: 'resil-gamci-2021',
    market_number: 'N° 2021-0-2-0008/02-48',
    contractor_name: 'GAMCI CI SARL',
    authority_ministry: 'Ministère de l’Équipement et de l’Entretien Routier',
    object_summary: 'Travaux de reprofilage lourd et traitement de points critiques',
    region_commune: 'Plusieurs régions de l’intérieur',
    reason_summary: 'Défaillance d’exécution constatée et dépassement excessif des délais contractuels',
    decision_date: '2022',
    official_doc_url: 'https://www.marchespublics.ci/uploads/doc/Marche_N_2021-0-2-0008_02-48_et_2021-1-2-0008_02-48_GAMCI_CI_SARL.pdf'
  },
  {
    id: 'resil-atraf-nahda-2021',
    market_number: 'N° 2021-0-2-0176/02-330',
    contractor_name: 'Groupement ATRAF SARL / AL NAHDA',
    authority_ministry: 'Ministère de la Santé, de l’Hygiène Publique et de la CMU',
    object_summary: 'Construction et réhabilitation d’infrastructures sanitaires de premier contact',
    region_commune: 'District Autonome de Sassandra-Marahoué',
    reason_summary: 'Abandon de chantier et non-respect des mises en demeure réglementaires',
    decision_date: '2022',
    official_doc_url: 'https://www.marchespublics.ci/uploads/doc/Marche_N_2021-0-2-0176_02-330_GROUPEMENT_ATRAF_SARL-AL_NAHDA_(2).pdf'
  },
  {
    id: 'resil-goodvalue-2022',
    market_number: 'N° 2022-0-2-0976/02-366',
    contractor_name: 'Groupement GOOD VALUE LDA / GECAUMINE SA',
    authority_ministry: 'Ministère de l’Éducation Nationale et de l’Alphabétisation',
    object_summary: 'Construction de salles de classe et d’équipements scolaires primaires',
    region_commune: 'Région du Gbêkê & Région du Tonkpi',
    reason_summary: 'Défaut de mobilisation des ressources et arrêt injustifié des travaux',
    decision_date: '2022',
    official_doc_url: 'https://www.marchespublics.ci/uploads/doc/Marche_N_2022-0-2-0976_02-366_GROUPEMENT_GOOD_VALUE_LDA-GECAUMINE_SA.pdf'
  },
  {
    id: 'resil-etac-2018',
    market_number: 'N° 2018-0-2-0628/07-24',
    contractor_name: 'ETAC',
    authority_ministry: 'Ministère de l’Hydraulique, de l’Assainissement et de la Salubrité',
    object_summary: 'Travaux d’adduction en eau potable et forages d’urgence',
    region_commune: 'Région de l’Indénié-Djuablin',
    reason_summary: 'Inexécution des clauses contractuelles et non-reprise après notification officielle',
    decision_date: '2021',
    official_doc_url: 'https://www.marchespublics.ci/uploads/doc/Marche_N_2018-0-2-0628_07-24_ETAC.pdf'
  },
  {
    id: 'resil-canaan-2021',
    market_number: 'N° 2021-0-2-1236/02-323',
    contractor_name: 'CANAAN PRESTATIONS',
    authority_ministry: 'Collectivités Territoriales / Mairie',
    object_summary: 'Travaux d’aménagement urbain et voirie de proximité',
    region_commune: 'Abidjan / Périphérie',
    reason_summary: 'Retard caractérisé et non-respect du planning directeur des travaux',
    decision_date: '2022',
    official_doc_url: 'https://www.marchespublics.ci/uploads/doc/Marche_N_2021-0-2-1236_02-323_CANAAN_PRESTATIONS.pdf'
  }
];
