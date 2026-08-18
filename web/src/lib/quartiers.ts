/**
 * Liste des quartiers par commune pilote
 * Source : OpenStreetMap / openalfa.com (rues-cote-d-ivoire)
 *
 * Règle : UN seul nom canonique par quartier.
 * Les alias (ex: "Blockauss village" → "Blockauss") sont gérés dans :
 *  - la table SQL `quartier_aliases` (normalisation DB)
 *  - la fonction `normalizeQuartier()` ci-dessous (normalisation frontend)
 */

export const QUARTIERS: Record<string, string[]> = {
  Cocody: [
    "150 Logements", "1ere Tranche", "2e Tranche", "7e Tranche", "8e Tranche", "9e Tranche",
    "Adjamé Village", "Aghien", "Akouedo - Abatta Village", "Akouédo Extension Nord",
    "Ambassade", "Angré", "Angré Extension", "Anono Village", "ATCI", "Attoban",
    "Belle Ville", "Bessikoi - Djorogobité", "Blockauss", "Bonoumin", "CIAD Primo",
    "Cité des arts", "Cité EECI", "Cocody centre", "Cocody Village", "Colombie",
    "Commandant Sanon", "Danga Nord", "Danga Sud", "Deux Plateaux", "Djibi", "Dokui",
    "Djorogobité", "Ephrata", "Faya", "Jardin de la Riviera", "Le Vallon", "Les Perles",
    "Les Versants", "Mbadon - Akouédo", "Mpouto Village", "Nouveau Camp", "Palmeraie",
    "Palmeraie Triangle", "Riviera 2", "Riviera 3", "Riviera 4", "Riviera 5",
    "Riviera Allabra", "Riviera Bonoumin", "Riviera Golf", "Riviera Sideci", "RTI",
    "SICOGI", "Sideci", "SODEFOR", "SYNATRESOR", "TF 233", "Université", "Villa cadre",
    "Village Abobo Baoulé", "Wedouwel",
  ],

  Abobo: [
    "A et D ( SOS )", "Abbé-Broukoi", "Abobo Baoulé", "Abobo Sud 1ère Tranche",
    "Abobo Sud 2ème Tranche", "Abobo Sud 3ème Tranche", "Agbékoi", "Agnissankoi",
    "Agriparc", "Akeikoi-Djibi", "Akeikoi Extension", "Akou Noé", "Allokozo",
    "Anador", "Anonkoi Kouté ( Sodeci )", "Anonkoi Kouté (Sotrapim)",
    "Anonkoi Kouté Village", "Anyama Adjamé PK 18", "Avocatier Sainte Foi",
    "Ayéby", "B et C", "Banco 1", "Banco 2 Mobil", "Belle Ville", "Biabou",
    "Bocabo", "Bouguinisso", "Cent Douze Hectares", "Cité Forest", "Clouétcha",
    "CNPS", "Colatier", "Desert", "Etage Noir", "Forêt Classée du Banco",
    "Haute Tension", "Houphouet Boigny", "Japon", "Kennedy", "Koffi Jean",
    "Les 4 Etages", "M'Ponon", "Monastère", "N'Guessankoi Village", "N'Guessankro",
    "OCPV", "Pailliet", "PK 18 ( Agouéto )", "PK 18 (Campement)",
    "PK 18 Résidentiel ( Sicogi)", "Plaque 1", "Plaque 2", "Plateau Dokui",
    "Quartier Agni", "Quartier Célestre", "Quartier Résidentiel", "Sagbé Antenne",
    "Sagbé Nord", "Sagbé Sud", "Sétu", "Village Abobo Baoulé", "Village Aboboté",
    "Zone Ouest",
  ],

  Adjamé: [
    "220 Logements", "Adjamé-Nord", "Adjamé Village", "Bracodi", "Bromakoté",
    "Dallas", "Ebrié", "Habitat extension", "Indénié - Adjamé", "Mairie 2",
    "Marie Thérèse", "Mirador", "Pailliet", "Saint Michel", "Sodeci - Filtisac",
    "Williamsville 1", "Williamsville 2", "Williamsville 3",
  ],

  Attécoubé: [
    "Abidjan Agban", "Abobodoumé", "Attécoubé III", "Banco Nord", "Bidjan-Té",
    "Cité Fairmont", "Djéné-Ecaré", "Doua-Agboville", "Ecoles", "Espoir",
    "Garage Machine", "Gbébouto", "Jean Paul 2", "Jérusalem 1", "Jérusalem 2",
    "Jérusalem 3", "Jérusalem Résidentiel", "La Paix", "Lackman", "Locodjoro",
    "Marine", "Mosquée", "Némantoulaye", "Saint Joseph", "Santé III",
    "Santé Village", "Yopougon Agbayaté",
  ],

  Bingerville: [
    "ADJAME BINGERVILLE", "AGRICULTURE",
    "AKANDJE-ADJIN-AKOYATE-ACHOKOI-AKAKRO-SEBIAYAO",
    "AKOUEDO - ABATTA VILLAGE", "Akouédo Extension Nord", "BAGBA",
    "BAGBA 1ere EXTENSION", "Bessikoi - Djorogobité", "BLACHON",
    "Carrière village", "CENTRE VILLE", "CIMETIERE HARRY", "CITE BNETD",
    "CME", "CNRA", "CROCRO BOUCOU", "FONCTIONNAIRE", "GARE ROUTIERE",
    "GBAGBA", "GIB", "HARRIS", "HOPITAL", "MACHOUX", "MAMADOU COULIBALY",
    "N'GBROMIN", "NGOTTO", "ORPHELINAT", "PALMAS", "PARIS VILLAGE",
    "PORQUET BEAUX ARTS", "RESIDENTIEL", "SAVANE", "SCI Carrière",
    "SICOGI 2", "YAMANDAN",
  ],

  Koumassi: [
    "ABIA KOUMASSI", "CITE HOUPHOEUT BOIGNY (CAMPEMENT)", "DIVO", "EMCC",
    "GRAND MARCHE", "KOUMASSI NORD-EST 1", "MAIRIE", "MOSQUEE",
    "PRODOMO SIPIM PANGOLIN", "PROGRES", "REMBLAIS", "SICOGI 1",
    "SICOGI 2", "SICOGI 3", "SOGEFIHA - ZONE INDUSTRIELLE", "ZOE BRUNO",
  ],

  Marcory: [
    "Abi Koumassi", "Abia Abéti", "Adaimin", "Alliodan", "Anoumabo", "Biétry",
    "Champroux", "Gnanzoua", "Hibiscus", "Jean Baptiste Mockey",
    "Kablan Brou Fulgence", "Marie Koré", "Résidentiel", "Sicogi", "Zone 4C",
  ],

  Plateau: [
    "Banco", "Chiens Méchants", "Cité Esculape", "Commerce", "Gare Lagune",
    "Indénié", "Plateau Centre", "Port Douane", "Quatre Villas", "RAN Garage",
    "Six Bâtiments",
  ],

  "Port-Bouët": [
    "Zone Aéroportuaire", "Abattoir 1", "Abattoir 2", "Abattoir 3",
    "Adjahui-Coubé", "Adjouffou", "Adjouffou 2", "Anléya", "Camp Douane",
    "Cie Plage", "Commissariat 1", "Commissariat 3",
    "Commissariat Sainte Anne", "Commissariat Sogefiha", "Derrière Wharf",
    "Gonzagueville", "Hopital 1", "Hopital 43è BIMA", "Hopital Grand Marché",
    "Jean Folly", "Océan", "Petit Bassam", "Phare 3", "Phare Collège Moderne",
    "Phare Littoral", "Vidri - Canal - Sir", "Vidri Chapelle",
    "Vidri 3 Ecoles", "Vidri 3 Foyers", "Vidri Gendarmerie",
  ],

  Songon: [
    "Abadjin-Koué", "Adiopoto 1", "Adiopoto 2", "Adiopoto Moronou",
    "Anguédédou", "Carrefour Adiopoto", "Carrefour Bimbresso",
    "Carrefour Dagbé", "Carrefour Jacquville", "Cité la Grâce",
    "Km 17 ou Adiopodoumé Extension", "Logements sociaux", "Songon",
    "Songon- Dagbé", "Songon-Gare", "Songon-Kassemblé",
  ],

  Treichville: [
    "Aboubakar Sacko", "Anatole France", "Arras 1", "Arras 2", "Arras 3",
    "Auguste Denise", "Biafra", "Boa Kassi", "Camp Douanier",
    "Cité Douane - Pont", "Cité du Port", "Cité RAN", "Cyrille Polneau",
    "Entente", "Ezan Pascal", "Gendarmerie - CRO", "George Kassi",
    "Habitat Belleville", "Habitat Craone", "Jacques Aka", "Jean Yao",
    "Jeanne d'Arc", "Kouassi Lenoir", "Lobou Dr Djessou",
    "Louis de Gonzague", "Mory Diomandé", "N'Guessan Kouamé A.",
    "Nanan Yamousso", "Notre Dame", "Séry Koré", "Seyni Fofana",
    "Seyni Gueye", "Sococé", "Tanoh Blaise", "Voltaire",
    "Zone Industrielle", "Zone Portuaire",
  ],

  Anyama: [
    "Abbé-Broukoi", "Abbé Broukoi 1", "Akeikoi Extension", "Akékoi Village",
    "Anyama Adjamé", "Anyama Adjamé Extension", "Anyama Adjamé PK 18",
    "Belle Ville", "Blankro", "CEG Extension 1", "CEG Extension 2",
    "Christiankoi", "Gare", "Koffi Jean", "Palmeraie", "RAN",
    "Résidentiel", "Sciérie", "Shenider",
  ],

  "Grand-Bassam": [
    "Ancien Bassam", "Caféier", "Carrefour Jeunesse", "Cité Rosiers",
    "France (Quartier Historique)", "Impérial", "Moossou", "Phare",
    "Quartier Artisanal", "Quartier Phare", "Rosiers", "Sinikro",
    "Village Artisanal", "Vitré 1", "Vitré 2", "Zone Résidentielle",
  ],

  Yopougon: [
    "Abiatrana", "Académie", "Académie résidentiel", "Ananeraie", "Andokoi",
    "Andokoi Extension", "Adiopo Doumé", "Atchi", "Attié", "Azito Village",
    "Bagouda", "Banco 2", "Batim 2", "Béago", "Bel Air", "Boissy", "Bonikro",
    "Camp militaire", "Chevaux", "Cité Bracodi", "Cité Caféiers", "Cité CNPS",
    "Cité Élisée", "Cité marine", "Cité Nawa", "Cité Ngouan 1", "Cité Saco II",
    "Cité SGBCI", "Cité Sodefor Lauriers 11 & 12", "Cité Sotra", "Cité Verte",
    "Complexe", "Coprim Zenith", "Deuxième tranche", "Diop", "Doukouré",
    "Fanny", "Figayo", "Fin goudron", "Gabriel Gare", "Galilée",
    "Gbamnan Djidan 1", "Gesco", "GFCI", "Hôpital", "Île Boulay", "Issamboua",
    "Judée", "Keneya", "Kouté", "Koweit", "Lauriers 2", "Lauriers Sacos",
    "Le corridor", "Les Pays-Bas", "Lezou Aman", "Lièvre rouge",
    "Lokoa extension", "Mamie Adjoua", "Maroc", "Mbakré", "Micao", "N'zimakro",
    "Niaba", "Niangon", "Niangon Adjamé", "Niangon à droite",
    "Niangon à gauche", "Niangon Lokoa", "Niangon nord",
    "Niangon Sicogi Canal", "Niangon sud", "Niangon Sud Sicogi",
    "Nouveau quartier", "Port-Bouët II", "Quartier LEM", "Quartier Maroc",
    "Quartier Millionnaire", "Sable", "Saint Hubert", "Score", "Selmer",
    "Selmer ponty", "Sicogi", "Sideci", "Sikasso", "Siporex",
    "Sogefiha Solic 1 & 2", "Sopim", "Toit Rouge", "Toit vert", "Wassakara",
    "Yao Séhi", "Yesso", "Yopougon-Santé", "Zone Industrielle",
  ],
};
    "Gare de Bassam", "Habitat", "Hôpital Général", "Marcory 2",
    "Palais des Sports", "Port Autonome", "Zone 3",
  ],

  Attécoubé: [
    "Abobo-Doumé", "Agban Attié", "Agban Village", "Bidjante", "Boribana",
    "Cité Fairmont", "Déconsignation", "Fromager", "Jérusalem", "Locodjro",
    "Santai", "Seba", "Zone Industrielle",
  ],

  Anyama: [
    "Anyama-Ahouabo", "Anyama-Adjamé", "Belle-Ville", "Cité Concorde",
    "Gare", "Hôpital d'Anyama", "Quartier Résidentiel", "Stade Ebimpé", "Zossonkoi",
  ],

  Songon: [
    "Abiaté", "Bimbresso", "Gare Songon", "Kassemblé", "Songon Agban",
    "Songon Dagbé", "Songon Kassemblé", "Songon M'brathé", "Songon Park",
  ],

  "Grand-Bassam": [
    "Ancien Bassam", "Azuretti", "Caféier", "Cité Impériale", "France",
    "Moossou", "Mockeyville", "Phare", "Quartier Artisanal", "Rosiers", "Zone Hôtelière",
  ],
};

/**
 * Alias connus côté frontend — miroir de la table SQL `quartier_aliases`.
 * Clé : "commune|alias_lowercase", Valeur : nom canonique.
 * Permet la normalisation instantanée sans appel réseau.
 */
const ALIAS_MAP: Record<string, string> = {
  // Cocody
  "cocody|blockauss (village)":     "Blockauss",
  "cocody|blockauss village":        "Blockauss",
  "cocody|anono":                    "Angré",
  "cocody|anono village":            "Angré",
  "cocody|riviéra":                  "Riviéra 2",
  "cocody|riviera":                  "Riviéra 2",
  "cocody|deux plateaux":            "Deux Plateaux",
  "cocody|2 plateaux":               "Deux Plateaux",
  "cocody|deux-plateaux":            "Deux Plateaux",
  "cocody|angré château":            "Angré",
  "cocody|angre chateau":            "Angré",
  // Yopougon
  "yopougon|kouté village":          "Kouté",
  "yopougon|koute village":          "Kouté",
  "yopougon|wassakara village":      "Wassakara",
  "yopougon|gesco village":          "Gesco",
  // Abobo
  "abobo|abobo baoulé":              "Abobo Baoulé",
  "abobo|n dotré":                   "N'dotré",
  "abobo|ndotré":                    "N'dotré",
  "abobo|ndotre":                    "N'dotré",
  // Adjamé
  "adjamé|williamsville village":    "Williamsville",
  // Bingerville
  "bingerville|abatta village":      "Abatta",
  "bingerville|eloka village":       "Eloka",
  // Koumassi
  "koumassi|koumassi village":       "Koumassi Campement",
  // Port-Bouët
  "port-bouët|gonzague":             "Gonzagueville",
  "port-bouët|gonzagueville village":"Gonzagueville",
};

/**
 * Normalise un nom de quartier vers son nom canonique.
 * Priorité : alias explicite → suppression suffixe "village" → tel quel.
 */
export function normalizeQuartier(quartier: string, commune: string): string {
  const key = `${commune.toLowerCase()}|${quartier.toLowerCase().trim()}`;
  if (ALIAS_MAP[key]) return ALIAS_MAP[key];

  // Supprime " village", " (village)", " Village" si le nom de base reste non-vide
  const stripped = quartier.replace(/\s*\(?\s*[Vv]illage\s*\)?\s*$/, "").trim();
  if (stripped && stripped !== quartier) return stripped;

  return quartier.trim();
}

/** Get quartiers for a given commune, sorted alphabetically */
export const getQuartiers = (commune: string): string[] => {
  return QUARTIERS[commune] || [];
};
