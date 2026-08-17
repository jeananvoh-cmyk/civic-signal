/// Liste des quartiers par commune pilote (Source: web/src/lib/quartiers.ts)
library;

const Map<String, List<String>> QUARTIERS = {
  'Yopougon': [
    'Abiatrana', 'Académie', 'Académie résidentiel', 'Ananeraie', 'Andokoi',
    'Atchi', 'Attié', 'Azito Village', 'Bagouda', 'Banco 2', 'Batim 2',
    'Béago', 'Bel Air', 'Boissy', 'Bonikro', 'Camp militaire', 'Chevaux',
    'Cité Bracodi', 'Cité Caféiers', 'Cité CNPS', 'Cité Élisée', 'Cité marine',
    'Cité Nawa', 'Cité Ngouan 1', 'Cité Saco II', 'Cité SGBCI',
    'Cité Sodefor Lauriers 11 & 12', 'Cité Sotra', 'Cité Verte', 'Complexe',
    'Coprim Zenith', 'Deuxième tranche', 'Diop', 'Doukouré', 'Fanny', 'Figayo',
    'Fin goudron', 'Gabriel Gare', 'Galilée', 'Gbamnan Djidan 1', 'Gesco',
    'GFCI', 'Hôpital', 'Île Boulay', 'Issamboua', 'Judée', 'Keneya', 'Kouté',
    'Koweit', 'Lauriers 2', 'Lauriers Sacos', 'Le corridor',
    'Les Pays-Bas', 'Lezou Aman', 'Lièvre rouge', 'Lokoa extension',
    'Mamie Adjoua', 'Mbakré', 'Micao', "N'zimakro", 'Niaba', 'Niangon',
    'Niangon Adjamé', 'Niangon à droite', 'Niangon à gauche', 'Niangon Lokoa',
    'Niangon nord', 'Niangon Sicogi Canal', 'Niangon sud', 'Niangon Sud Sicogi',
    'Nouveau quartier', 'Port-Bouët II', 'Quartier LEM', 'Quartier Maroc',
    'Quartier Millionnaire', 'Sable', 'Saint Hubert', 'Score', 'Selmer',
    'Selmer ponty', 'Sicogi', 'Sideci', 'Sikasso', 'Siporex',
    'Sogefiha Solic 1 & 2', 'Sopim', 'Toit vert', 'Wassakara', 'Yao Séhi',
    'Yesso', 'Yopougon-Santé', 'Zone Industrielle',
  ],

  'Cocody': [
    '8e et 9e tranche', 'Abobo Té', 'Aghien', 'Akouédo', 'Ambassade', 'Angré',
    'Blockauss', 'Bonoumin', 'Caféier', 'Camp Militaire', 'Deux Plateaux',
    'Djibi', 'Djorogobité', 'Gendarmerie Agban', 'Genie 2000',
    'Lycée Technique', "M'Badon", "M'pouto", 'Palmeraie', 'Port Royal',
    'Riviéra 1', 'Riviéra 2', 'Riviéra 3', 'Riviéra 4', 'Riviéra 6',
    'Riviéra Bonoumin', 'RTI', 'Vieux Cocody',
  ],

  'Abobo': [
    '4 Etages', 'Abobo Baoulé', 'Abobo Nord', 'Abobo RTI', 'Abobo Sud',
    'Aboua', 'Agbekoi', 'Akeikoi', 'Aman', 'Anador', 'Anonkoua',
    'Anonkoua-Kouté', 'Atsin', 'Avocatier', 'Banco', 'Belleville', 'Biabou',
    'Boussake', 'Broukoua', 'Cité Ado', 'Cité de la Grâce',
    'Cité Universitaire Abobo 1', 'Cité Universitaire Abobo 2', 'Cobakro',
    'Étoile', 'Kennedy', 'Kouadjo Kouakou', "L'habitat", 'Moni', "N'dotré",
    'Palmafrique V2', 'PK 18', 'Sagbé', 'Sagbé celeste', 'Sagbé Nord',
    'Sagbé Sud', 'Sapa', 'Sofaica', 'Sos Abobo', 'Tamini', 'Yapi',
  ],

  'Adjamé': [
    '220 logements', 'Abobo Adjamé', 'Bidonville', 'Bracodi', 'Bromakoté',
    'Habitat', 'Humici', 'Latin', 'Liberté', 'Macaci', 'Pailler',
    'Quartier Manguier', 'Saint Michel', 'Williamsville',
  ],

  'Bingerville': [
    'Abatta', 'Abatta BCEAO', 'Abatta Cité Police', 'Abatta Sicta', 'Achokoi',
    'Agban', 'Aguien', 'Akakro', 'Akandjé', 'Akoué Santé', 'Akoue Santé 2',
    'Akouédo Attié', 'Akoyaté', 'Akwè Djèmin', 'Ana', 'Angoran', 'Blanchon',
    'Bokate', 'Brégbo', 'Cité CIE', 'Cité Olympe Promogim',
    'Cité Promogim Athena', 'Domouégo', 'Ebrah', 'Eloka', 'Eloka-Té',
    'Eloka-To', 'Faya Riviéra 5', 'Feh Kessé', 'Figuier', 'Gbagba',
    'Gbagba Extension', 'Île Bassigbo', 'Kouassi Kakou', 'Lauriers 9',
    "M'batto-Bouaké", 'Mobio', 'Ogriville', 'Palmafrique Éloka',
    'Quartier Scierie GIB', 'Riviéra 6', 'Sebia Yao',
  ],

  'Koumassi': [
    'Biétry', 'Camp Commun', 'Cité Verte', 'Compagnie', 'Dépôt',
    'Koweit', 'Koumassi Campement', 'Koumassi Extension', 'Koumassi Remblai',
    'Lauriers', 'Mairie', 'Mosquée', 'Orly', 'Port Bouët II',
    'Résidentiel', 'Sagbé', 'Samaké', 'Terminus',
  ],

  'Port-Bouët': [
    'Aéroport', 'Adjouffou', 'Anani', 'Attécoubé', 'Avocatier',
    'Banco 1', 'Biétry II', 'Gonzagueville', 'Grand Bassam Route',
    'Houphouët-Boigny', 'Ile de Boulay', 'Kennedy', 'Koumassi',
    'Marcory', 'Mokotowé', "N'dotré", 'Port-Bouët Village',
    'Quartier Français', 'Vridi', 'Vridi Canal', 'Vridi plage',
  ],
};

const Map<String, String> ALIAS_MAP = {
  // Cocody
  'cocody|blockauss (village)': 'Blockauss',
  'cocody|blockauss village': 'Blockauss',
  'cocody|anono': 'Angré',
  'cocody|anono village': 'Angré',
  'cocody|riviéra': 'Riviéra 2',
  'cocody|riviera': 'Riviéra 2',
  'cocody|deux plateaux': 'Deux Plateaux',
  'cocody|2 plateaux': 'Deux Plateaux',
  'cocody|deux-plateaux': 'Deux Plateaux',
  'cocody|angré château': 'Angré',
  'cocody|angre chateau': 'Angré',
  // Yopougon
  'yopougon|kouté village': 'Kouté',
  'yopougon|koute village': 'Kouté',
  'yopougon|wassakara village': 'Wassakara',
  'yopougon|gesco village': 'Gesco',
  // Abobo
  'abobo|abobo baoulé': 'Abobo Baoulé',
  'abobo|n dotré': "N'dotré",
  'abobo|ndotré': "N'dotré",
  'abobo|ndotre': "N'dotré",
  // Adjamé
  'adjamé|williamsville village': 'Williamsville',
  // Bingerville
  'bingerville|abatta village': 'Abatta',
  'bingerville|eloka village': 'Eloka',
  // Koumassi
  'koumassi|koumassi village': 'Koumassi Campement',
  // Port-Bouët
  'port-bouët|gonzague': 'Gonzagueville',
  'port-bouët|gonzagueville village': 'Gonzagueville',
};

String normalizeQuartier(String quartier, String commune) {
  final key = '${commune.toLowerCase()}|${quartier.toLowerCase().trim()}';
  if (ALIAS_MAP.containsKey(key)) return ALIAS_MAP[key]!;

  final stripped = quartier.replaceAll(RegExp(r'\s*\(?\s*[Vv]illage\s*\)?\s*$'), '').trim();
  if (stripped.isNotEmpty && stripped != quartier) return stripped;

  return quartier.trim();
}

List<String> getQuartiers(String commune) {
  return QUARTIERS[commune] ?? [];
}
