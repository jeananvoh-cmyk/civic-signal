/// Base de Données Officielle des Voies PADA (Projet d'Adressage du District d'Abidjan)
/// Ministère de la Construction, du Logement et de l'Urbanisme (MCLU) / BNETD / IGN FI / GEOFIT
library;

enum PadaWayType { boulevard, avenue, rue, impasse, ruelle, rondPoint }

class PadaWay {
  final String id;
  final PadaWayType type;
  final String nom;
  final String? ancienNom;
  final String commune;
  final String? quartier;
  final int? longueurM;
  final String? codePada;

  const PadaWay({
    required this.id,
    required this.type,
    required this.nom,
    this.ancienNom,
    required this.commune,
    this.quartier,
    this.longueurM,
    this.codePada,
  });

  String get typeLabel {
    switch (type) {
      case PadaWayType.boulevard:
        return 'BOULEVARD';
      case PadaWayType.avenue:
        return 'AVENUE';
      case PadaWayType.rue:
        return 'RUE';
      case PadaWayType.impasse:
        return 'IMPASSE';
      case PadaWayType.ruelle:
        return 'RUELLE';
      case PadaWayType.rondPoint:
        return 'ROND-POINT';
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. LES 32 BOULEVARDS STRUCTURANTS OFFICIELS
// ══════════════════════════════════════════════════════════════════════════════
const List<PadaWay> PADA_BOULEVARDS = [
  PadaWay(id: 'PADA-B-001', type: PadaWayType.boulevard, nom: 'Boulevard de la Liberté', ancienNom: 'Route de la Liberté', commune: 'Adjamé'),
  PadaWay(id: 'PADA-B-002', type: PadaWayType.boulevard, nom: 'Boulevard Robert Gueï', ancienNom: 'Boulevard Est Ouest', commune: 'Adjamé / Attécoubé'),
  PadaWay(id: 'PADA-B-003', type: PadaWayType.boulevard, nom: 'Boulevard Dominique Ouattara', ancienNom: 'Boulevard Mitterrand (Akouédo / Bingerville)', commune: 'Cocody / Bingerville'),
  PadaWay(id: 'PADA-B-004', type: PadaWayType.boulevard, nom: 'Boulevard Charles Bauza Donwahi', ancienNom: 'Prolongement Latrille (Petro Ivoire CHU d\'Angré)', commune: 'Cocody'),
  PadaWay(id: 'PADA-B-005', type: PadaWayType.boulevard, nom: 'Boulevard André Latrille', ancienNom: 'Boulevard Latrille', commune: 'Cocody'),
  PadaWay(id: 'PADA-B-006', type: PadaWayType.boulevard, nom: 'Boulevard Mariam Dicoh', ancienNom: 'Nouvelle voie Y4 (Prolongement Latrille / Carrefour Saint Viateur)', commune: 'Cocody'),
  PadaWay(id: 'PADA-B-007', type: PadaWayType.boulevard, nom: 'Boulevard Mamadou Coulibaly', ancienNom: 'Nouvelle voie Y4 (Carrefour Saint Viateur / Riviera M\'Pouto)', commune: 'Cocody'),
  PadaWay(id: 'PADA-B-008', type: PadaWayType.boulevard, nom: 'Boulevard Marie-Thérèse Houphouët-Boigny', ancienNom: 'Boulevard de France', commune: 'Cocody'),
  PadaWay(id: 'PADA-B-009', type: PadaWayType.boulevard, nom: 'Boulevard Aimé Henri Konan Bédié', ancienNom: 'Pont HKB (Agban Gendarmerie)', commune: 'Cocody / Marcory'),
  PadaWay(id: 'PADA-B-010', type: PadaWayType.boulevard, nom: 'Boulevard Laurent Gbagbo', ancienNom: 'Boulevard du 4ème Pont', commune: 'Yopougon / Attécoubé / Plateau'),
  PadaWay(id: 'PADA-B-011', type: PadaWayType.boulevard, nom: 'Boulevard de la Paix', ancienNom: 'Boulevard de la Paix', commune: 'Attécoubé / Adjamé'),
  PadaWay(id: 'PADA-B-012', type: PadaWayType.boulevard, nom: 'Boulevard du Stade Olympique', ancienNom: 'Route d\'Adzopé (depuis N\'Dotré)', commune: 'Abobo / Anyama'),
  PadaWay(id: 'PADA-B-013', type: PadaWayType.boulevard, nom: 'Boulevard Ernest Boka', ancienNom: 'Route d\'Alépé (depuis carrefour Samaké)', commune: 'Abobo'),
  PadaWay(id: 'PADA-B-014', type: PadaWayType.boulevard, nom: 'Boulevard Félix Houphouët-Boigny (FHB)', ancienNom: 'Boulevard VGE (Valéry Giscard d\'Estaing)', commune: 'Marcory / Treichville / Port-Bouët'),
  PadaWay(id: 'PADA-B-015', type: PadaWayType.boulevard, nom: 'Boulevard Germain Koffi Gadeau', ancienNom: 'Boulevard Mitterrand (François Mitterrand)', commune: 'Cocody / Bingerville'),
  PadaWay(id: 'PADA-B-016', type: PadaWayType.boulevard, nom: 'Boulevard Alphonse Boni', ancienNom: 'Voie Express d\'Abobo', commune: 'Abobo / Adjamé'),
  PadaWay(id: 'PADA-B-017', type: PadaWayType.boulevard, nom: 'Boulevard Jean-Baptiste Mockey', ancienNom: 'Voie de Bassam (depuis Akwaba au rond-point d\'Anani)', commune: 'Port-Bouët / Grand-Bassam'),
  PadaWay(id: 'PADA-B-018', type: PadaWayType.boulevard, nom: 'Boulevard Mohamed VI', ancienNom: 'Boulevard Mohamed VI (Axe Abobo - Anyama)', commune: 'Abobo / Anyama'),
  PadaWay(id: 'PADA-B-019', type: PadaWayType.boulevard, nom: 'Boulevard Philippe Grégoire Yacé', ancienNom: 'Boulevard de Marseille', commune: 'Treichville / Marcory'),
  PadaWay(id: 'PADA-B-020', type: PadaWayType.boulevard, nom: 'Boulevard Koui Mamadou', ancienNom: 'Route de Dabou', commune: 'Yopougon / Songon'),
  PadaWay(id: 'PADA-B-021', type: PadaWayType.boulevard, nom: 'Boulevard Auguste Denise', ancienNom: 'Descente du pont De Gaulle au Boulevard de Marseille', commune: 'Treichville'),
  PadaWay(id: 'PADA-B-022', type: PadaWayType.boulevard, nom: 'Boulevard Alassane Ouattara', ancienNom: 'Percée Reboul (depuis Nangui Abrogoua)', commune: 'Adjamé / Plateau'),
  PadaWay(id: 'PADA-B-023', type: PadaWayType.boulevard, nom: 'Boulevard du 5è Pont', ancienNom: 'Pont Alassane Ouattara / 5ème Pont Cocody-Plateau', commune: 'Cocody / Plateau'),
  PadaWay(id: 'PADA-B-024', type: PadaWayType.boulevard, nom: 'Boulevard de la République', ancienNom: 'Boulevard de la République', commune: 'Plateau'),
  PadaWay(id: 'PADA-B-025', type: PadaWayType.boulevard, nom: 'Boulevard Lagunaire', ancienNom: 'Boulevard Lagunaire', commune: 'Plateau / Treichville'),
  PadaWay(id: 'PADA-B-026', type: PadaWayType.boulevard, nom: 'Boulevard de l\'Aéroport Félix Houphouët-Boigny', ancienNom: 'Route de l\'aéroport (depuis Akwaba)', commune: 'Port-Bouët'),
  PadaWay(id: 'PADA-B-027', type: PadaWayType.boulevard, nom: 'Boulevard Hortense Aka Anghui', ancienNom: 'Voie principale de Port-Bouët', commune: 'Port-Bouët'),
  PadaWay(id: 'PADA-B-028', type: PadaWayType.boulevard, nom: 'Boulevard du Port', ancienNom: 'Boulevard du Port', commune: 'Treichville'),
  PadaWay(id: 'PADA-B-029', type: PadaWayType.boulevard, nom: 'Boulevard de l\'Hospitalité', ancienNom: 'Voie principale de Yopougon', commune: 'Yopougon'),
  PadaWay(id: 'PADA-B-030', type: PadaWayType.boulevard, nom: 'Boulevard de la Zone Industrielle', ancienNom: 'Voie de la zone industrielle de Yopougon', commune: 'Yopougon'),
  PadaWay(id: 'PADA-B-031', type: PadaWayType.boulevard, nom: 'Boulevard Solidarité', ancienNom: 'Voie de Siporex à Gesco', commune: 'Yopougon'),
  PadaWay(id: 'PADA-B-032', type: PadaWayType.boulevard, nom: 'Boulevard Lanzeni Coulibaly', ancienNom: 'Voie du premier pont de Yopougon au sapeur-pompier', commune: 'Yopougon'),
];

// ══════════════════════════════════════════════════════════════════════════════
// 2. LES 211 AVENUES OFFICIELLES
// ══════════════════════════════════════════════════════════════════════════════
const List<PadaWay> PADA_AVENUES = [
  // --- ABOBO ---
  PadaWay(id: '167220', codePada: '167220', type: PadaWayType.avenue, nom: 'Avenue Adama Tounkara', commune: 'Abobo', quartier: 'Abobo Sud 1ère Tranche', longueurM: 1423),
  PadaWay(id: '167218', codePada: '167218', type: PadaWayType.avenue, nom: 'Avenue Marcel Laubhouet', commune: 'Abobo', quartier: 'Abobo Sud 1ère Tranche', longueurM: 894),
  PadaWay(id: '166030', codePada: '166030', type: PadaWayType.avenue, nom: 'Avenue N\'Golo Coulibaly', commune: 'Abobo', quartier: 'Abobo Sud 1ère Tranche', longueurM: 400),
  PadaWay(id: '166007', codePada: '166007', type: PadaWayType.avenue, nom: 'Avenue Koutouan Gerard', commune: 'Abobo', quartier: 'Abobo Sud 2ème Tranche', longueurM: 1343),
  PadaWay(id: '166027', codePada: '166027', type: PadaWayType.avenue, nom: 'Avenue Tiemoko Fanny', commune: 'Abobo', quartier: 'Abobo Sud 2ème Tranche', longueurM: 687),
  PadaWay(id: '166058', codePada: '166058', type: PadaWayType.avenue, nom: 'Avenue Lamine Fadiga', commune: 'Abobo', quartier: 'Agnissankoi', longueurM: 1207),
  PadaWay(id: '166063', codePada: '166063', type: PadaWayType.avenue, nom: 'Avenue Paul-Emile Adjoua', commune: 'Abobo', quartier: 'Agnissankoi', longueurM: 1319),
  PadaWay(id: '167293', codePada: '167293', type: PadaWayType.avenue, nom: 'Avenue Simone Ehivet Gbagbo', commune: 'Abobo', quartier: 'Akeikoi Extension', longueurM: 3187),
  PadaWay(id: '171710', codePada: '171710', type: PadaWayType.avenue, nom: 'Avenue Kone Goge', commune: 'Abobo', quartier: 'Anador', longueurM: 2147),
  PadaWay(id: '172066', codePada: '172066', type: PadaWayType.avenue, nom: 'Avenue Hamed Bakayoko', commune: 'Abobo', quartier: 'Cent Douze Hectares', longueurM: 1365),
  PadaWay(id: '166013', codePada: '166013', type: PadaWayType.avenue, nom: 'Avenue Kandia Camara', commune: 'Abobo', quartier: 'Cent Douze Hectares', longueurM: 1992),
  PadaWay(id: '166005', codePada: '166005', type: PadaWayType.avenue, nom: 'Avenue Nifa Diaby', commune: 'Abobo', quartier: 'Clouétcha', longueurM: 2658),
  PadaWay(id: '166011', codePada: '166011', type: PadaWayType.avenue, nom: 'Avenue Odette Kouamé', commune: 'Abobo', quartier: 'Kennedy', longueurM: 1212),
  PadaWay(id: '166056', codePada: '166056', type: PadaWayType.avenue, nom: 'Avenue Dossongui Kone', commune: 'Abobo', quartier: 'Les 4 Etages', longueurM: 1618),
  PadaWay(id: '166021', codePada: '166021', type: PadaWayType.avenue, nom: 'Avenue Memel Fotê Harris', commune: 'Abobo', quartier: 'Monastère', longueurM: 1308),
  PadaWay(id: '166067', codePada: '166067', type: PadaWayType.avenue, nom: 'Avenue de N\'Dotre', commune: 'Abobo', quartier: 'PK 18 (Campement)', longueurM: 2301),
  PadaWay(id: '165901', codePada: '165901', type: PadaWayType.avenue, nom: 'Avenue Mathias Doué', commune: 'Abobo', quartier: 'Plateau Dokui', longueurM: 1683),
  PadaWay(id: '166064', codePada: '166064', type: PadaWayType.avenue, nom: 'Avenue Germain Yapo Yanon', commune: 'Abobo', quartier: 'Quartier Agni', longueurM: 1617),
  PadaWay(id: '166055', codePada: '166055', type: PadaWayType.avenue, nom: 'Avenue Eugene Niagne Lasme', commune: 'Abobo', quartier: 'Quartier Résidentiel', longueurM: 2011),
  PadaWay(id: '166046', codePada: '166046', type: PadaWayType.avenue, nom: 'Avenue Souleymane Cissoko', commune: 'Abobo', quartier: 'Sagbé Antenne', longueurM: 1495),
  PadaWay(id: '171504', codePada: '171504', type: PadaWayType.avenue, nom: 'Avenue Jeanne Peumond', commune: 'Abobo', quartier: 'Sagbé Sud', longueurM: 2699),
  PadaWay(id: '166031', codePada: '166031', type: PadaWayType.avenue, nom: 'Avenue Aboudramane Sangare', commune: 'Abobo', quartier: 'Village Aboboté', longueurM: 1311),
  PadaWay(id: '166057', codePada: '166057', type: PadaWayType.avenue, nom: 'Avenue Guy-Alain Emmanuel Gauze', commune: 'Abobo', quartier: 'Abobo Centre', longueurM: 2156),

  // --- ADJAMÉ ---
  PadaWay(id: '165044', codePada: '165044', type: PadaWayType.avenue, nom: 'Avenue Amondji Pierre', commune: 'Adjamé', quartier: '220 Logements', longueurM: 1335),
  PadaWay(id: '165000', codePada: '165000', type: PadaWayType.avenue, nom: 'Avenue Jacobs Williams', commune: 'Adjamé', quartier: 'Mairie 2', longueurM: 798),
  PadaWay(id: '164843', codePada: '164843', type: PadaWayType.avenue, nom: 'Avenue Nangui Abrogoua', commune: 'Adjamé', quartier: 'Adjamé-Nord', longueurM: 3321),
  PadaWay(id: '165856', codePada: '165856', type: PadaWayType.avenue, nom: 'Avenue Joseph Attoumbre', commune: 'Adjamé', quartier: 'Mirador', longueurM: 1595),
  PadaWay(id: '165852', codePada: '165852', type: PadaWayType.avenue, nom: 'Avenue Fologo Laurent Dona', commune: 'Adjamé', quartier: 'Pailliet', longueurM: 7254),
  PadaWay(id: '165100', codePada: '165100', type: PadaWayType.avenue, nom: 'Avenue Dembele Lancina', commune: 'Adjamé', quartier: 'Saint Michel', longueurM: 628),
  PadaWay(id: '165777', codePada: '165777', type: PadaWayType.avenue, nom: 'Avenue Djeni Kobena', commune: 'Adjamé', quartier: 'Williamsville 1', longueurM: 2276),

  // --- ANYAMA ---
  PadaWay(id: '166069', codePada: '166069', type: PadaWayType.avenue, nom: 'Avenue Coffi Michel Benoit', commune: 'Anyama', quartier: 'Abohoin', longueurM: 2820),
  PadaWay(id: '166070', codePada: '166070', type: PadaWayType.avenue, nom: 'Avenue Lassana Timite', commune: 'Anyama', quartier: 'Anyama Adjamé', longueurM: 1856),
  PadaWay(id: '166109', codePada: '166109', type: PadaWayType.avenue, nom: 'Avenue M\'Bahia Ble Kouadio', commune: 'Anyama', quartier: 'Résidentiel', longueurM: 2011),

  // --- ATTÉCOUBÉ ---
  PadaWay(id: '165790', codePada: '165790', type: PadaWayType.avenue, nom: 'Avenue Philippe Mangou', commune: 'Attécoubé', quartier: 'Abidjan Agban', longueurM: 4176),
  PadaWay(id: '165057', codePada: '165057', type: PadaWayType.avenue, nom: 'Avenue Amos Djoro', commune: 'Attécoubé', quartier: 'La Paix', longueurM: 1157),
  PadaWay(id: '165096', codePada: '165096', type: PadaWayType.avenue, nom: 'Avenue des Bidjans', commune: 'Attécoubé', quartier: 'La Paix', longueurM: 652),
  PadaWay(id: '168618', codePada: '168618', type: PadaWayType.avenue, nom: 'Avenue de Locodjro', commune: 'Attécoubé', quartier: 'Locodjoro', longueurM: 8640),

  // --- BINGERVILLE ---
  PadaWay(id: '167277', codePada: '167277', type: PadaWayType.avenue, nom: 'Avenue Blanchon', commune: 'Bingerville', quartier: 'AKANDJE-ADJIN-AKOYATE-ACHOKOI-AKAKRO-SEBIAYAO', longueurM: 5791),
  PadaWay(id: '168160', codePada: '168160', type: PadaWayType.avenue, nom: 'Avenue de M\'Batto Bouaké', commune: 'Bingerville', quartier: 'AKANDJE-ADJIN-AKOYATE-ACHOKOI-AKAKRO-SEBIAYAO', longueurM: 8576),
  PadaWay(id: '167271', codePada: '167271', type: PadaWayType.avenue, nom: 'Avenue du Jardin Botanique', commune: 'Bingerville', quartier: 'AKANDJE-ADJIN-AKOYATE-ACHOKOI-AKAKRO-SEBIAYAO', longueurM: 4318),
  PadaWay(id: '170650', codePada: '170650', type: PadaWayType.avenue, nom: 'Avenue Konan Kouassi Lambert', commune: 'Bingerville', quartier: 'AKANDJE-ADJIN-AKOYATE-ACHOKOI-AKAKRO-SEBIAYAO', longueurM: 6991),
  PadaWay(id: '135023', codePada: '135023', type: PadaWayType.avenue, nom: 'Avenue d\'Abatta', commune: 'Bingerville', quartier: 'AKOUEDO - ABATTA VILLAGE', longueurM: 823),
  PadaWay(id: '168346', codePada: '168346', type: PadaWayType.avenue, nom: 'Avenue de Dahlia Fleur', commune: 'Bingerville', quartier: 'AKOUEDO - ABATTA VILLAGE', longueurM: 5304),
  PadaWay(id: '170777', codePada: '170777', type: PadaWayType.avenue, nom: 'Avenue de la BCEAO', commune: 'Bingerville', quartier: 'AKOUEDO - ABATTA VILLAGE', longueurM: 1388),
  PadaWay(id: '176335', codePada: '176335', type: PadaWayType.avenue, nom: 'Avenue de Gbagba', commune: 'Bingerville', quartier: 'BAGBA 1ere EXTENSION', longueurM: 2377),
  PadaWay(id: '167280', codePada: '167280', type: PadaWayType.avenue, nom: 'Avenue Didier Drogba', commune: 'Bingerville', quartier: 'SCI Carrière', longueurM: 1415),

  // --- COCODY ---
  PadaWay(id: '165970', codePada: '165970', type: PadaWayType.avenue, nom: 'Avenue du Lycée Technique', commune: 'Cocody', quartier: 'Cocody centre', longueurM: 2223),
  PadaWay(id: '167238', codePada: '167238', type: PadaWayType.avenue, nom: 'Avenue DJ Arafat', commune: 'Cocody', quartier: '7e Tranche', longueurM: 615),
  PadaWay(id: '166765', codePada: '166765', type: PadaWayType.avenue, nom: 'Avenue Robert Beugré Mambé', commune: 'Cocody', quartier: '7e Tranche', longueurM: 6688),
  PadaWay(id: '168449', codePada: '168449', type: PadaWayType.avenue, nom: 'Avenue William Ipote', commune: 'Cocody', quartier: '8e Tranche', longueurM: 3911),
  PadaWay(id: '165957', codePada: '165957', type: PadaWayType.avenue, nom: 'Avenue Saliou Touré', commune: 'Cocody', quartier: 'Adjamé Village', longueurM: 2113),
  PadaWay(id: '165851', codePada: '165851', type: PadaWayType.avenue, nom: 'Avenue Guillaume Folquet', commune: 'Cocody', quartier: 'Aghien', longueurM: 1157),
  PadaWay(id: '165960', codePada: '165960', type: PadaWayType.avenue, nom: 'Avenue Henriette Konan Bédié', commune: 'Cocody', quartier: 'Ambassade', longueurM: 1245),
  PadaWay(id: '165902', codePada: '165902', type: PadaWayType.avenue, nom: 'Avenue Charles Koffi Diby', commune: 'Cocody', quartier: 'Angré', longueurM: 1551),
  PadaWay(id: '165940', codePada: '165940', type: PadaWayType.avenue, nom: 'Avenue Georges Niangoran Bouah', commune: 'Cocody', quartier: 'Angré', longueurM: 1371),
  PadaWay(id: '165931', codePada: '165931', type: PadaWayType.avenue, nom: 'Avenue Pr Adonis Koffy', commune: 'Cocody', quartier: 'Angré', longueurM: 1451),
  PadaWay(id: '165929', codePada: '165929', type: PadaWayType.avenue, nom: 'Avenue Pierre Fakoury', commune: 'Cocody', quartier: 'Angré', longueurM: 2180),
  PadaWay(id: '165951', codePada: '165951', type: PadaWayType.avenue, nom: 'Avenue Abdoulaye Koné', commune: 'Cocody', quartier: 'Angré Extension', longueurM: 682),
  PadaWay(id: '165935', codePada: '165935', type: PadaWayType.avenue, nom: 'Avenue Jean Kacou Diagou', commune: 'Cocody', quartier: 'Angré Extension', longueurM: 1129),
  PadaWay(id: '167236', codePada: '167236', type: PadaWayType.avenue, nom: 'Avenue Usher Assouan', commune: 'Cocody', quartier: 'Angré Extension', longueurM: 4987),
  PadaWay(id: '165893', codePada: '165893', type: PadaWayType.avenue, nom: 'Avenue Marcel Zadi Kessy', commune: 'Cocody', quartier: 'Anono Village', longueurM: 1824),
  PadaWay(id: '176557', codePada: '176557', type: PadaWayType.avenue, nom: 'Avenue Émile Constant Bombet', commune: 'Cocody', quartier: 'ATCI', longueurM: 1125),
  PadaWay(id: '165977', codePada: '165977', type: PadaWayType.avenue, nom: 'Avenue Koffi Léon Konan', commune: 'Cocody', quartier: 'ATCI', longueurM: 783),
  PadaWay(id: '166580', codePada: '166580', type: PadaWayType.avenue, nom: 'Avenue du Colonel Zinsou', commune: 'Cocody', quartier: 'Attoban', longueurM: 1603),
  PadaWay(id: '168435', codePada: '168435', type: PadaWayType.avenue, nom: 'Avenue Kone Tiemoko Meyliet', commune: 'Cocody', quartier: 'Bessikoi - Djorogobité', longueurM: 7525),
  PadaWay(id: '173288', codePada: '173288', type: PadaWayType.avenue, nom: 'Avenue Jean Mermoz', commune: 'Cocody', quartier: 'Cocody centre', longueurM: 839),
  PadaWay(id: '165888', codePada: '165888', type: PadaWayType.avenue, nom: 'Avenue Aoussou Koffi', commune: 'Cocody', quartier: 'Cocody centre', longueurM: 1473),
  PadaWay(id: '165988', codePada: '165988', type: PadaWayType.avenue, nom: 'Avenue Bernard Yago', commune: 'Cocody', quartier: 'Danga Nord', longueurM: 914),
  PadaWay(id: '165889', codePada: '165889', type: PadaWayType.avenue, nom: 'Avenue Georges Ouegnin', commune: 'Cocody', quartier: 'Danga Sud', longueurM: 897),
  PadaWay(id: '165887', codePada: '165887', type: PadaWayType.avenue, nom: 'Avenue Hassan II', commune: 'Cocody', quartier: 'Danga Sud', longueurM: 1844),
  PadaWay(id: '165963', codePada: '165963', type: PadaWayType.avenue, nom: 'Avenue Henriette Dagri Diabaté', commune: 'Cocody', quartier: 'Danga Sud', longueurM: 774),
  PadaWay(id: '165829', codePada: '165829', type: PadaWayType.avenue, nom: 'Avenue François-Joseph Amon d\'Aby', commune: 'Cocody', quartier: 'Ecole de Police', longueurM: 425),
  PadaWay(id: '165900', codePada: '165900', type: PadaWayType.avenue, nom: 'Avenue Antoine Cesario', commune: 'Cocody', quartier: 'Jardin de la Riviera', longueurM: 1621),
  PadaWay(id: '168331', codePada: '168331', type: PadaWayType.avenue, nom: 'Avenue Kablan Duncan', commune: 'Cocody', quartier: 'Le Vallon', longueurM: 3371),
  PadaWay(id: '169578', codePada: '169578', type: PadaWayType.avenue, nom: 'Avenue Eden', commune: 'Cocody', quartier: 'Mbadon - Akouédo', longueurM: 3184),
  PadaWay(id: '167266', codePada: '167266', type: PadaWayType.avenue, nom: 'Avenue Jean Konan Banny', commune: 'Cocody', quartier: 'Mbadon - Akouédo', longueurM: 4246),
  PadaWay(id: '168245', codePada: '168245', type: PadaWayType.avenue, nom: 'Avenue du Général Akissi Kouame', commune: 'Cocody', quartier: 'Nouveau Camp', longueurM: 1180),
  PadaWay(id: '167245', codePada: '167245', type: PadaWayType.avenue, nom: 'Avenue Albert Kakou Tiapani', commune: 'Cocody', quartier: 'Palmeraie', longueurM: 1715),
  PadaWay(id: '165911', codePada: '165911', type: PadaWayType.avenue, nom: 'Avenue Alcide Kacou', commune: 'Cocody', quartier: 'Palmeraie', longueurM: 2118),
  PadaWay(id: '166731', codePada: '166731', type: PadaWayType.avenue, nom: 'Avenue du Sacré Cœur', commune: 'Cocody', quartier: 'Palmeraie', longueurM: 1857),
  PadaWay(id: '165914', codePada: '165914', type: PadaWayType.avenue, nom: 'Avenue Ezan Akele', commune: 'Cocody', quartier: 'Palmeraie', longueurM: 1345),
  PadaWay(id: '167266', codePada: '167266', type: PadaWayType.avenue, nom: 'Avenue Rose Doudou Gueï', commune: 'Cocody', quartier: 'Palmeraie', longueurM: 972),
  PadaWay(id: '167254', codePada: '167254', type: PadaWayType.avenue, nom: 'Avenue de Monseigneur Pierre Marie Cotty', commune: 'Cocody', quartier: 'Riviera 2', longueurM: 2043),
  PadaWay(id: '165834', codePada: '165834', type: PadaWayType.avenue, nom: 'Avenue Théodore Mel Eg', commune: 'Cocody', quartier: 'Riviera 4', longueurM: 1816),
  PadaWay(id: '175401', codePada: '175401', type: PadaWayType.avenue, nom: 'Avenue Alphonse Djédjé Mady', commune: 'Cocody', quartier: 'Riviera Bonoumin', longueurM: 2137),
  PadaWay(id: '165890', codePada: '165890', type: PadaWayType.avenue, nom: 'Avenue Bangali Koné', commune: 'Cocody', quartier: 'Riviera Bonoumin', longueurM: 2175),
  PadaWay(id: '166669', codePada: '166669', type: PadaWayType.avenue, nom: 'Avenue Honoré Guié', commune: 'Cocody', quartier: 'Riviera Bonoumin', longueurM: 1945),
  PadaWay(id: '166008', codePada: '166008', type: PadaWayType.avenue, nom: 'Avenue Edmond Zégbéhi Bouazo', commune: 'Cocody', quartier: 'Riviera Bonoumin', longueurM: 710),
  PadaWay(id: '175358', codePada: '175358', type: PadaWayType.avenue, nom: 'Avenue Joachim Boni', commune: 'Cocody', quartier: 'Riviera Bonoumin', longueurM: 837),
  PadaWay(id: '165907', codePada: '165907', type: PadaWayType.avenue, nom: 'Avenue Pierre Kipré', commune: 'Cocody', quartier: 'Riviera Bonoumin', longueurM: 2637),
  PadaWay(id: '172979', codePada: '172979', type: PadaWayType.avenue, nom: 'Avenue du Golf', commune: 'Cocody', quartier: 'Riviera Golf', longueurM: 3187),
  PadaWay(id: '172984', codePada: '172984', type: PadaWayType.avenue, nom: 'Avenue John Kennedy', commune: 'Cocody', quartier: 'Riviera Golf', longueurM: 1041),
  PadaWay(id: '165836', codePada: '165836', type: PadaWayType.avenue, nom: 'Avenue Bernard Zadi Zaourou', commune: 'Cocody', quartier: 'Riviera Sideci', longueurM: 2136),
  PadaWay(id: '165962', codePada: '165962', type: PadaWayType.avenue, nom: 'Avenue Tiemoko Yade Coulibaly', commune: 'Cocody', quartier: 'SICOGI', longueurM: 879),
  PadaWay(id: '165964', codePada: '165964', type: PadaWayType.avenue, nom: 'Avenue Antoine Gauze', commune: 'Cocody', quartier: 'Université', longueurM: 918),
  PadaWay(id: '165831', codePada: '165831', type: PadaWayType.avenue, nom: 'Avenue de l\'Université', commune: 'Cocody', quartier: 'Université', longueurM: 2397),
  PadaWay(id: '165831', codePada: '165831', type: PadaWayType.avenue, nom: 'Avenue Jean Badobre', commune: 'Cocody', quartier: 'Université', longueurM: 767),
  PadaWay(id: '173321', codePada: '173321', type: PadaWayType.avenue, nom: 'Avenue Hyacinthe Sarassoro', commune: 'Cocody', quartier: 'Université', longueurM: 428),
  PadaWay(id: '165899', codePada: '165899', type: PadaWayType.avenue, nom: 'Avenue Joséphine Guidy Wandja', commune: 'Cocody', quartier: 'Université', longueurM: 1274),
  PadaWay(id: '168635', codePada: '168635', type: PadaWayType.avenue, nom: 'Avenue Jean Malan', commune: 'Cocody', quartier: 'Wedouwel', longueurM: 3974),

  // --- INTERCOMMUNALES ---
  PadaWay(id: '164148', codePada: '164148', type: PadaWayType.avenue, nom: 'Avenue Paul Akoto Yao', commune: 'Koumassi / Marcory', quartier: 'MOSQUEE', longueurM: 5337),
  PadaWay(id: '164203', codePada: '164203', type: PadaWayType.avenue, nom: 'Avenue Martin Luther King', commune: 'Koumassi / Marcory', quartier: 'REMBLAIS', longueurM: 7209),
  PadaWay(id: '164294', codePada: '164294', type: PadaWayType.avenue, nom: 'Avenue Ouezzin Coulibaly', commune: 'Koumassi / Marcory', quartier: 'Résidentiel', longueurM: 3243),

  // --- KOUMASSI ---
  PadaWay(id: '162789', codePada: '162789', type: PadaWayType.avenue, nom: 'Avenue Cissé Bacongo', commune: 'Koumassi', quartier: 'GRAND MARCHE', longueurM: 400),
  PadaWay(id: '162946', codePada: '162946', type: PadaWayType.avenue, nom: 'Avenue Kassoum Coulibaly', commune: 'Koumassi', quartier: 'GRAND MARCHE', longueurM: 1755),
  PadaWay(id: '164149', codePada: '164149', type: PadaWayType.avenue, nom: 'Avenue des Rois', commune: 'Koumassi', quartier: 'PROGRES', longueurM: 785),
  PadaWay(id: '164090', codePada: '164090', type: PadaWayType.avenue, nom: 'Avenue Grah Kadji', commune: 'Koumassi', quartier: 'PROGRES', longueurM: 1432),
  PadaWay(id: '163733', codePada: '163733', type: PadaWayType.avenue, nom: 'Avenue Adou Assale', commune: 'Koumassi', quartier: 'REMBLAIS', longueurM: 1093),
  PadaWay(id: '162964', codePada: '162964', type: PadaWayType.avenue, nom: 'Avenue de l\'Unité Nationale', commune: 'Koumassi', quartier: 'SICOGI 1', longueurM: 1519),
  PadaWay(id: '164103', codePada: '164103', type: PadaWayType.avenue, nom: 'Avenue des Métiers', commune: 'Koumassi', quartier: 'SICOGI 1', longueurM: 1721),
  PadaWay(id: '164298', codePada: '164298', type: PadaWayType.avenue, nom: 'Avenue Ouedraogo Boniface', commune: 'Koumassi', quartier: 'SICOGI 2', longueurM: 1430),
  PadaWay(id: '162954', codePada: '162954', type: PadaWayType.avenue, nom: 'Avenue Adhout Cyr Saint Omer', commune: 'Koumassi', quartier: 'SOGEFIHA - ZONE INDUSTRIELLE', longueurM: 1435),
  PadaWay(id: '91102',  codePada: '91102',  type: PadaWayType.avenue, nom: 'Avenue des Industries', commune: 'Koumassi', quartier: 'SOGEFIHA - ZONE INDUSTRIELLE', longueurM: 3962),
  PadaWay(id: '164270', codePada: '164270', type: PadaWayType.avenue, nom: 'Avenue Zoe Bruno', commune: 'Koumassi', quartier: 'ZOE BRUNO', longueurM: 927),

  // --- MARCORY ---
  PadaWay(id: '162816', codePada: '162816', type: PadaWayType.avenue, nom: 'Avenue Amadou Thiam', commune: 'Marcory', quartier: 'Adaimin', longueurM: 1481),
  PadaWay(id: '163452', codePada: '163452', type: PadaWayType.avenue, nom: 'Avenue Noël Nemin', commune: 'Marcory', quartier: 'Adaimin', longueurM: 1238),
  PadaWay(id: '162744', codePada: '162744', type: PadaWayType.avenue, nom: 'Avenue Koffi Blaise N\'Dia', commune: 'Marcory', quartier: 'Adaimin', longueurM: 1232),
  PadaWay(id: '162813', codePada: '162813', type: PadaWayType.avenue, nom: 'Avenue Léopoldine Tiézan Coffie', commune: 'Marcory', quartier: 'Adaimin', longueurM: 793),
  PadaWay(id: '164239', codePada: '164239', type: PadaWayType.avenue, nom: 'Avenue du Colonel Ali Sako', commune: 'Marcory', quartier: 'Alliodan', longueurM: 732),
  PadaWay(id: '164248', codePada: '164248', type: PadaWayType.avenue, nom: 'Avenue Djidji Ayökwe', commune: 'Marcory', quartier: 'Anoumabo', longueurM: 3865),
  PadaWay(id: '163616', codePada: '163616', type: PadaWayType.avenue, nom: 'Avenue N\'Guetta Timothée Ahoua', commune: 'Marcory', quartier: 'Biétry', longueurM: 1594),
  PadaWay(id: '162818', codePada: '162818', type: PadaWayType.avenue, nom: 'Avenue Vanié Bi Tra', commune: 'Marcory', quartier: 'Biétry', longueurM: 2011),
  PadaWay(id: '164224', codePada: '164224', type: PadaWayType.avenue, nom: 'Avenue Bernard Dadié', commune: 'Marcory', quartier: 'Champroux', longueurM: 1445),
  PadaWay(id: '163422', codePada: '163422', type: PadaWayType.avenue, nom: 'Avenue Siméon Aké', commune: 'Marcory', quartier: 'Champroux', longueurM: 651),
  PadaWay(id: '164268', codePada: '164268', type: PadaWayType.avenue, nom: 'Avenue Issouf Koné', commune: 'Marcory', quartier: 'Gnanzoua', longueurM: 1279),
  PadaWay(id: '163338', codePada: '163338', type: PadaWayType.avenue, nom: 'Avenue Koblan-Huberson', commune: 'Marcory', quartier: 'Hibiscus', longueurM: 1225),
  PadaWay(id: '91075',  codePada: '91075',  type: PadaWayType.avenue, nom: 'Avenue Mohamed Diawara', commune: 'Marcory', quartier: 'Hibiscus', longueurM: 796),
  PadaWay(id: '91076',  codePada: '91076',  type: PadaWayType.avenue, nom: 'Avenue Kacou Aoulou', commune: 'Marcory', quartier: 'Jean Baptiste Mockey', longueurM: 718),
  PadaWay(id: '163333', codePada: '163333', type: PadaWayType.avenue, nom: 'Avenue Haycinthe Leroux', commune: 'Marcory', quartier: 'Jean Baptiste Mockey', longueurM: 1717),
  PadaWay(id: '163373', codePada: '163373', type: PadaWayType.avenue, nom: 'Avenue Amadou Hampâté Bâ', commune: 'Marcory', quartier: 'Kablan Brou Fulgence', longueurM: 736),
  PadaWay(id: '164295', codePada: '164295', type: PadaWayType.avenue, nom: 'Avenue Amagou Victor', commune: 'Marcory', quartier: 'Marie Koré', longueurM: 372),
  PadaWay(id: '164220', codePada: '164220', type: PadaWayType.avenue, nom: 'Avenue Gris Camille', commune: 'Marcory', quartier: 'Résidentiel', longueurM: 2663),
  PadaWay(id: '157596', codePada: '157596', type: PadaWayType.avenue, nom: 'Avenue Laurent Aké Assi', commune: 'Marcory', quartier: 'Sicogi', longueurM: 785),
  PadaWay(id: '94836',  codePada: '94836',  type: PadaWayType.avenue, nom: 'Avenue Abdoulaye Sawadogo', commune: 'Marcory', quartier: 'Zone 4C', longueurM: 1550),

  // --- PLATEAU ---
  PadaWay(id: '165867', codePada: '165867', type: PadaWayType.avenue, nom: 'Avenue Abdoulaye Fadiga', commune: 'Plateau', quartier: 'Cité Esculape', longueurM: 913),
  PadaWay(id: '165859', codePada: '165859', type: PadaWayType.avenue, nom: 'Avenue Anne Marie Raggi', commune: 'Plateau', quartier: 'Commerce', longueurM: 646),
  PadaWay(id: '165860', codePada: '165860', type: PadaWayType.avenue, nom: 'Avenue Appagny Tanoe', commune: 'Plateau', quartier: 'Commerce', longueurM: 141),
  PadaWay(id: '164894', codePada: '164894', type: PadaWayType.avenue, nom: 'Avenue Botreau Roussel', commune: 'Plateau', quartier: 'Commerce', longueurM: 837),
  PadaWay(id: '164906', codePada: '164906', type: PadaWayType.avenue, nom: 'Avenue Crosson Duplessis', commune: 'Plateau', quartier: 'Commerce', longueurM: 511),
  PadaWay(id: '164824', codePada: '164824', type: PadaWayType.avenue, nom: 'Avenue de l\'Abidjanaise', commune: 'Plateau', quartier: 'Commerce', longueurM: 323),
  PadaWay(id: '165865', codePada: '165865', type: PadaWayType.avenue, nom: 'Avenue du Commerce', commune: 'Plateau', quartier: 'Commerce', longueurM: 892),
  PadaWay(id: '164905', codePada: '164905', type: PadaWayType.avenue, nom: 'Avenue Lamblin', commune: 'Plateau', quartier: 'Commerce', longueurM: 474),
  PadaWay(id: '164816', codePada: '164816', type: PadaWayType.avenue, nom: 'Avenue Mathieu Ekra', commune: 'Plateau', quartier: 'Commerce', longueurM: 942),
  PadaWay(id: '164871', codePada: '164871', type: PadaWayType.avenue, nom: 'Avenue Charles Noguès', commune: 'Plateau', quartier: 'Commerce', longueurM: 523),
  PadaWay(id: '164927', codePada: '164927', type: PadaWayType.avenue, nom: 'Avenue Nelson Mandela', commune: 'Plateau', quartier: 'Gare Lagune', longueurM: 363),
  PadaWay(id: '165868', codePada: '165868', type: PadaWayType.avenue, nom: 'Avenue Jean Delafosse', commune: 'Plateau', quartier: 'KM - BIAO', longueurM: 417),
  PadaWay(id: '164948', codePada: '164948', type: PadaWayType.avenue, nom: 'Avenue Charles Konan Banny', commune: 'Plateau', quartier: 'Mairie', longueurM: 583),
  PadaWay(id: '164952', codePada: '164952', type: PadaWayType.avenue, nom: 'Avenue Antoine Konan Kanga', commune: 'Plateau', quartier: 'Plateau Centre', longueurM: 704),
  PadaWay(id: '165870', codePada: '165870', type: PadaWayType.avenue, nom: 'Avenue Bernard Dadié', commune: 'Plateau', quartier: 'Plateau Centre', longueurM: 462),
  PadaWay(id: '164916', codePada: '164916', type: PadaWayType.avenue, nom: 'Avenue Boa Amoakon Edjampan Tiemele', commune: 'Plateau', quartier: 'Plateau Centre', longueurM: 228),
  PadaWay(id: '164827', codePada: '164827', type: PadaWayType.avenue, nom: 'Avenue Camille Aliali', commune: 'Plateau', quartier: 'Plateau Centre', longueurM: 1804),
  PadaWay(id: '168609', codePada: '168609', type: PadaWayType.avenue, nom: 'Avenue Carde', commune: 'Plateau', quartier: 'Plateau Centre', longueurM: 1724),
  PadaWay(id: '164914', codePada: '164914', type: PadaWayType.avenue, nom: 'Avenue Chardy', commune: 'Plateau', quartier: 'Plateau Centre', longueurM: 538),
  PadaWay(id: '164985', codePada: '164985', type: PadaWayType.avenue, nom: 'Avenue Crozet', commune: 'Plateau', quartier: 'Plateau Centre', longueurM: 244),
  PadaWay(id: '165786', codePada: '165786', type: PadaWayType.avenue, nom: 'Avenue John Creppy', commune: 'Plateau', quartier: 'Plateau Centre', longueurM: 227),
  PadaWay(id: '165008', codePada: '165008', type: PadaWayType.avenue, nom: 'Avenue Edmond Basque', commune: 'Plateau', quartier: 'Plateau Centre', longueurM: 240),
  PadaWay(id: '164913', codePada: '164913', type: PadaWayType.avenue, nom: 'Avenue Ernest N\'Koumo Mobio', commune: 'Plateau', quartier: 'Plateau Centre', longueurM: 239),
  PadaWay(id: '164984', codePada: '164984', type: PadaWayType.avenue, nom: 'Avenue Essy Amara', commune: 'Plateau', quartier: 'Plateau Centre', longueurM: 722),
  PadaWay(id: '164912', codePada: '164912', type: PadaWayType.avenue, nom: 'Avenue Franchet d\'Esperey', commune: 'Plateau', quartier: 'Plateau Centre', longueurM: 403),
  PadaWay(id: '171006', codePada: '171006', type: PadaWayType.avenue, nom: 'Avenue Guy Nairay', commune: 'Plateau', quartier: 'Plateau Centre', longueurM: 257),
  PadaWay(id: '165791', codePada: '165791', type: PadaWayType.avenue, nom: 'Avenue Jean-Paul II', commune: 'Plateau', quartier: 'Plateau Centre', longueurM: 991),
  PadaWay(id: '164982', codePada: '164982', type: PadaWayType.avenue, nom: 'Avenue Jeanne Gervais', commune: 'Plateau', quartier: 'Plateau Centre', longueurM: 749),
  PadaWay(id: '164993', codePada: '164993', type: PadaWayType.avenue, nom: 'Avenue Michel Kouassi Goly', commune: 'Plateau', quartier: 'Plateau Centre', longueurM: 243),
  PadaWay(id: '164986', codePada: '164986', type: PadaWayType.avenue, nom: 'Avenue Seydou Diarra', commune: 'Plateau', quartier: 'Plateau Centre', longueurM: 235),
  PadaWay(id: '164917', codePada: '164917', type: PadaWayType.avenue, nom: 'Avenue Terrasson de Fougères', commune: 'Plateau', quartier: 'Plateau Centre', longueurM: 285),
  PadaWay(id: '165796', codePada: '165796', type: PadaWayType.avenue, nom: 'Avenue Clozel', commune: 'Plateau', quartier: 'Présidence', longueurM: 1019),
  PadaWay(id: '164944', codePada: '164944', type: PadaWayType.avenue, nom: 'Avenue Emmanuel Dioulo', commune: 'Plateau', quartier: 'Présidence', longueurM: 239),
  PadaWay(id: '164934', codePada: '164934', type: PadaWayType.avenue, nom: 'Avenue Amadou Gon Coulibaly', commune: 'Plateau', quartier: 'Présidence', longueurM: 845),
  PadaWay(id: '165794', codePada: '165794', type: PadaWayType.avenue, nom: 'Avenue Ouattara Thomas d’Aquin', commune: 'Plateau', quartier: 'Quatre Villas', longueurM: 1087),

  // --- PORT-BOUËT ---
  PadaWay(id: '164855', codePada: '164855', type: PadaWayType.avenue, nom: 'Avenue Alexandre Ayé Ayé', commune: 'Port-Bouët', quartier: 'Gonzagueville', longueurM: 3945),
  PadaWay(id: '164252', codePada: '164252', type: PadaWayType.avenue, nom: 'Avenue Marie Koré', commune: 'Port-Bouët', quartier: 'Phare Littoral', longueurM: 2061),
  PadaWay(id: '165177', codePada: '165177', type: PadaWayType.avenue, nom: 'Avenue Kouamé Konan N\'Sikan', commune: 'Port-Bouët', quartier: 'Vridi 3 Foyers', longueurM: 3692),

  // --- TREICHVILLE ---
  PadaWay(id: '91055',  codePada: '91055',  type: PadaWayType.avenue, nom: 'Avenue Nanan Yamousso', commune: 'Treichville', quartier: 'Arras 1', longueurM: 1892),
  PadaWay(id: '91066',  codePada: '91066',  type: PadaWayType.avenue, nom: 'Avenue Djé Konan', commune: 'Treichville', quartier: 'Arras 2', longueurM: 1313),
  PadaWay(id: '163544', codePada: '163544', type: PadaWayType.avenue, nom: 'Avenue de l\'Union Africaine', commune: 'Treichville', quartier: 'Biafra', longueurM: 988),
  PadaWay(id: '163627', codePada: '163627', type: PadaWayType.avenue, nom: 'Avenue Tidiane Dem', commune: 'Treichville', quartier: 'Boa Kassi', longueurM: 656),
  PadaWay(id: '91031',  codePada: '91031',  type: PadaWayType.avenue, nom: 'Avenue Vamoussa Bamba', commune: 'Treichville', quartier: 'Boa Kassi', longueurM: 317),
  PadaWay(id: '163362', codePada: '163362', type: PadaWayType.avenue, nom: 'Avenue Victor Biaka Boda', commune: 'Treichville', quartier: 'Boa Kassi', longueurM: 1396),
  PadaWay(id: '91046',  codePada: '91046',  type: PadaWayType.avenue, nom: 'Avenue Gabriel Dadié', commune: 'Treichville', quartier: 'Ezan Pascal', longueurM: 482),
  PadaWay(id: '163580', codePada: '163580', type: PadaWayType.avenue, nom: 'Avenue de la Loyauté', commune: 'Treichville', quartier: 'George Kassi', longueurM: 334),
  PadaWay(id: '163618', codePada: '163618', type: PadaWayType.avenue, nom: 'Avenue Joseph Anoma', commune: 'Treichville', quartier: 'Nanan Yamousso', longueurM: 1769),
  PadaWay(id: '91048',  codePada: '91048',  type: PadaWayType.avenue, nom: 'Avenue Abla Pokou', commune: 'Treichville', quartier: 'Notre Dame', longueurM: 1312),
  PadaWay(id: '91045',  codePada: '91045',  type: PadaWayType.avenue, nom: 'Avenue Séry Koré', commune: 'Treichville', quartier: 'Pierre K.', longueurM: 618),
  PadaWay(id: '162806', codePada: '162806', type: PadaWayType.avenue, nom: 'Avenue Achi Brou Marthe', commune: 'Treichville', quartier: 'Sococé', longueurM: 404),
  PadaWay(id: '162796', codePada: '162796', type: PadaWayType.avenue, nom: 'Avenue Félix Ory', commune: 'Treichville', quartier: 'Sococé', longueurM: 1191),
  PadaWay(id: '162841', codePada: '162841', type: PadaWayType.avenue, nom: 'Avenue Christiani', commune: 'Treichville', quartier: 'Zone Portuaire', longueurM: 1965),
  PadaWay(id: '164300', codePada: '164300', type: PadaWayType.avenue, nom: 'Avenue Désiré Boni', commune: 'Treichville', quartier: 'Zone Portuaire', longueurM: 384),
  PadaWay(id: '164114', codePada: '164114', type: PadaWayType.avenue, nom: 'Avenue Francis Wodié', commune: 'Treichville', quartier: 'Zone Portuaire', longueurM: 2587),

  // --- YOPOUGON ---
  PadaWay(id: '167198', codePada: '167198', type: PadaWayType.avenue, nom: 'Avenue Koffi Attobra', commune: 'Yopougon', quartier: 'Ananeraie', longueurM: 385),
  PadaWay(id: '166167', codePada: '166167', type: PadaWayType.avenue, nom: 'Avenue Idriss Koudouss', commune: 'Yopougon', quartier: 'Ananeraie', longueurM: 1416),
  PadaWay(id: '166150', codePada: '166150', type: PadaWayType.avenue, nom: 'Avenue Kouisson Keletigui', commune: 'Yopougon', quartier: 'Banco 2', longueurM: 847),
  PadaWay(id: '165774', codePada: '165774', type: PadaWayType.avenue, nom: 'Avenue Alain Belkiri', commune: 'Yopougon', quartier: 'Banco Nord', longueurM: 2412),
  PadaWay(id: '166121', codePada: '166121', type: PadaWayType.avenue, nom: 'Avenue Gaston Oulaï', commune: 'Yopougon', quartier: 'Banco Nord', longueurM: 391),
  PadaWay(id: '165775', codePada: '165775', type: PadaWayType.avenue, nom: 'Avenue Marguerite Sakoum', commune: 'Yopougon', quartier: 'Banco Nord', longueurM: 439),
  PadaWay(id: '166147', codePada: '166147', type: PadaWayType.avenue, nom: 'Avenue Pascal Affi N\'Guessan', commune: 'Yopougon', quartier: 'Niangon Nord 1ère Tranche', longueurM: 1273),
  PadaWay(id: '166181', codePada: '166181', type: PadaWayType.avenue, nom: 'Avenue Antonin Dioulo', commune: 'Yopougon', quartier: 'Niangon Nord 2ème Tranche', longueurM: 3637),
  PadaWay(id: '167203', codePada: '167203', type: PadaWayType.avenue, nom: 'Avenue Zézé Baroan', commune: 'Yopougon', quartier: 'Niangon Nord 2ème Tranche', longueurM: 3088),
  PadaWay(id: '166143', codePada: '166143', type: PadaWayType.avenue, nom: 'Avenue Laurent Mandjo', commune: 'Yopougon', quartier: 'Niangon Sud Est', longueurM: 2555),
  PadaWay(id: '166144', codePada: '166144', type: PadaWayType.avenue, nom: 'Avenue Adama Coulibaly Nibizana', commune: 'Yopougon', quartier: 'Niangon Sud Ouest', longueurM: 1999),
  PadaWay(id: '166182', codePada: '166182', type: PadaWayType.avenue, nom: 'Avenue Frédéric Grah-Mel', commune: 'Yopougon', quartier: 'Niangon Sud Ouest', longueurM: 3133),
  PadaWay(id: '167180', codePada: '167180', type: PadaWayType.avenue, nom: 'Avenue Cheick Boikary Fofana', commune: 'Yopougon', quartier: 'Port Bouët 2', longueurM: 2187),
  PadaWay(id: '166146', codePada: '166146', type: PadaWayType.avenue, nom: 'Avenue Aimé Césaire', commune: 'Yopougon', quartier: 'Yopougon Attié', longueurM: 3054),
  PadaWay(id: '166148', codePada: '166148', type: PadaWayType.avenue, nom: 'Avenue Alain Ekra', commune: 'Yopougon', quartier: 'Yopougon Attié', longueurM: 2964),
  PadaWay(id: '166119', codePada: '166119', type: PadaWayType.avenue, nom: 'Avenue Denis Bra Kanon', commune: 'Yopougon', quartier: 'Yopougon Attié', longueurM: 1225),
  PadaWay(id: '166137', codePada: '166137', type: PadaWayType.avenue, nom: 'Avenue Jacqueline Lohoues-Oble', commune: 'Yopougon', quartier: 'Yopougon Attié', longueurM: 3981),
  PadaWay(id: '166151', codePada: '166151', type: PadaWayType.avenue, nom: 'Avenue Youssouf Bakayoko', commune: 'Yopougon', quartier: 'Yopougon Attié', longueurM: 1103),
  PadaWay(id: '166179', codePada: '166179', type: PadaWayType.avenue, nom: 'Avenue Émile Brou', commune: 'Yopougon', quartier: 'Yopougon Banco Sud', longueurM: 2758),
  PadaWay(id: '166168', codePada: '166168', type: PadaWayType.avenue, nom: 'Avenue Jean Michel Moulot', commune: 'Yopougon', quartier: 'Yopougon Hopital', longueurM: 722),
  PadaWay(id: '166157', codePada: '166157', type: PadaWayType.avenue, nom: 'Avenue Gilbert Kafana Koné', commune: 'Yopougon', quartier: 'Yopougon Kouté', longueurM: 1959),
  PadaWay(id: '166117', codePada: '166117', type: PadaWayType.avenue, nom: 'Avenue Amadou Soumahoro', commune: 'Yopougon', quartier: 'Yopougon Kouté', longueurM: 1591),
  PadaWay(id: '166180', codePada: '166180', type: PadaWayType.avenue, nom: 'Avenue Diakité Coty', commune: 'Yopougon', quartier: 'Yopougon Kouté', longueurM: 1707),
];

// ══════════════════════════════════════════════════════════════════════════════
// 3. FONCTIONS DE RECHERCHE ET FILTRAGE
// ══════════════════════════════════════════════════════════════════════════════

String _normalize(String text) {
  return text
      .toLowerCase()
      .replaceAll(RegExp(r'[àáâãäå]'), 'a')
      .replaceAll(RegExp(r'[èéêë]'), 'e')
      .replaceAll(RegExp(r'[ìíîï]'), 'i')
      .replaceAll(RegExp(r'[òóôõö]'), 'o')
      .replaceAll(RegExp(r'[ùúûü]'), 'u')
      .replaceAll(RegExp(r'[ç]'), 'c')
      .replaceAll(RegExp(r'[^a-z0-9]'), '');
}

List<PadaWay> searchPadaWays(String query, {String? commune, String? quartier}) {
  final normQuery = _normalize(query.trim());
  final allWays = [...PADA_BOULEVARDS, ...PADA_AVENUES];

  return allWays.where((way) {
    if (commune != null && commune.isNotEmpty && !way.commune.toLowerCase().contains(commune.toLowerCase())) {
      if (way.type != PadaWayType.boulevard) return false;
    }

    if (quartier != null && quartier.isNotEmpty && way.quartier != null && _normalize(way.quartier!) != _normalize(quartier)) {
      if (way.type != PadaWayType.boulevard) return false;
    }

    if (normQuery.isEmpty) return true;

    if (_normalize(way.nom).contains(normQuery)) return true;
    if (way.ancienNom != null && _normalize(way.ancienNom!).contains(normQuery)) return true;
    if (way.codePada != null && _normalize(way.codePada!).contains(normQuery)) return true;
    if (_normalize(way.id).contains(normQuery)) return true;

    return false;
  }).toList();
}
