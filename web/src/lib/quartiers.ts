/**
 * Base de Référence Officielle des Quartiers du District d'Abidjan
 * Source : Répertoire Officiel PADA (Ministère de la Construction, du Logement et de l'Urbanisme - MCLU / BNETD)
 *
 * Règle d'or : UN SEUL nom canonique par quartier (Chiffres arabes, orthographe PADA homologuée, zéro doublon).
 */

export const QUARTIERS: Record<string, string[]> = {
  "Abobo": [
    "A et D (SOS)", "Abbé-Broukoi", "Abobo Baoulé", "Abobo Sud 1ère Tranche", "Abobo Sud 2ème Tranche",
    "Abobo Sud 3ème Tranche", "Agbékoi", "Agnissankoi", "Agriparc", "Akéikoi Extension",
    "Akéikoi-Djibi", "Akou Noé", "Allokozo", "Anador", "Angré Extension",
    "Anonkoi Kouté (Sodeci)", "Anonkoi Kouté (Sotrapim)", "Anonkoi Kouté Village", "Anyama-Adjamé PK 18", "Avocatier Sainte Foi",
    "Ayéby", "B et C", "Banco 1", "Banco 2 Mobil", "Belle Ville",
    "Biabou", "Bocabo", "Bouguinisso", "Cent Douze Hectares", "Cité Forest",
    "Clouétcha", "Cnps", "Colatier", "Desert", "Étage Noir",
    "Forêt Classée du Banco", "Haute Tension", "Houphouët-Boigny", "Japon", "Kennedy",
    "Koffi-Jean", "Les 4 Étages", "M'Ponon", "Monastère", "N'Dotré",
    "N'Guessankoi Village", "N'Guessankro", "Ocpv", "Pailliet", "PK 18 (Agouéto)",
    "PK 18 (Campement)", "PK 18 Résidentiel (Sicogi)", "Plaque 1", "Plaque 2", "Plateau Dokui",
    "Quartier Agni", "Quartier Céleste", "Quartier Résidentiel", "Sagbé Antenne", "Sagbé Nord",
    "Sagbé Sud", "Sétu", "Village Aboboté", "Zone Ouest",
  ],

  "Adjamé": [
    "220 Logements", "Adjamé Village", "Adjamé-Nord", "Bracodi", "Bromakoté",
    "Dallas", "Ebrié", "Habitat Extension", "Indénié", "Mairie 1",
    "Mairie 2", "Marie Thérèse", "Mirador", "Pailliet", "Saint Michel",
    "Sodeci - Filtisac", "Williamsville 1", "Williamsville 2", "Williamsville 3",
  ],

  "Anyama": [
    "Abbé-Broukoi", "Abbé-Broukoi 1", "Akéikoi Extension", "Akéikoi Village", "Anyama Centre",
    "Anyama-Adjamé", "Anyama-Adjamé Extension", "Anyama-Adjamé PK 18", "Belle Ville", "Blankro",
    "CEG Extension 1", "CEG Extension 2", "Christiankoi", "Gare", "Koffi-Jean",
    "Palmeraie", "RAN", "Résidentiel", "Scierie", "Schneider",
  ],

  "Attécoubé": [
    "Abidjan Agban", "Abobodoumé", "Attécoubé 3", "Attécoubé Ouest", "Banco Nord",
    "Bidjan-Té", "Cité Fairmont", "Djéné-Ecaré", "Doua-Agboville", "Écoles",
    "Espoir", "Garage Machine", "Gbébouto", "Jean Paul 2", "Jérusalem 1",
    "Jérusalem 2", "Jérusalem 3", "Jérusalem Résidentiel", "La Paix", "Lackman",
    "Locodjoro", "Marine", "Mosquée", "Némantoulaye", "Saint Joseph",
    "Santé 3", "Santé Village", "Yopougon Agbayaté",
  ],

  "Bingerville": [
    "Adjamé Bingerville", "Agriculture", "Akandjé - Adjin - Akoyaté - Achokoi - Akakro", "Akouédo - Abatta Village", "Akouédo Extension Nord",
    "Bagba", "Bagba 1ère Extension", "Bessikoi - Djorogobité", "Bingerville Centre", "Blachon",
    "Carrière Village", "Centre Ville", "Cimetière Harry", "Cité BNETD", "CME",
    "CNRA", "Crocro Boucou", "Fonctionnaires", "Gare Routière", "Gbagba",
    "GIB", "Harris", "Hôpital", "Machoux", "Mamadou Coulibaly",
    "N'Gbromin", "Ngotto", "Orphelinat", "Palmas", "Paris Village",
    "Porquet Beaux-Arts", "Résidentiel", "Savane", "SCI Carrière", "Sicogi 2",
    "Yamandan",
  ],

  "Cocody": [
    "150 Logements", "1ère Tranche", "2e Tranche", "7e Tranche", "8e Tranche",
    "9e Tranche", "Adjamé Village", "Aghien", "Akouédo - Abatta Village", "Akouédo Extension Nord",
    "Ambassade", "Angré", "Angré Extension", "Anono Village", "Atci",
    "Attoban", "Belle Ville", "Bessikoi - Djorogobité", "Blockauss", "CIAD Primo",
    "Cité des Arts", "Cité EECI", "Cocody Centre", "Cocody Village", "Colombie",
    "Commandant Sanon", "Danga Nord", "Danga Sud", "Deux Plateaux", "Djibi",
    "Dokui", "Djorogobité", "Ephrata", "Faya", "Jardin de la Riviera",
    "Le Vallon", "Les Perles", "Les Versants", "Mbadon - Akouédo", "Mpouto Village",
    "Nouveau Camp", "Palmeraie", "Palmeraie Triangle", "Riviera 2", "Riviera 3",
    "Riviera 4", "Riviera 5", "Riviera Allabra", "Riviera Bonoumin", "Riviera Golf",
    "Riviera Sideci", "RTI", "Sicogi", "Sideci", "Sodefor",
    "Synatresor", "Tf 233", "Université", "Villa Cadre", "Village Abobo Baoulé",
    "Wedouwel",
  ],

  "Grand-Bassam": [
    "Ancien Bassam", "Caféier", "Carrefour Jeunesse", "Cité Rosiers", "France (Quartier Historique)",
    "Impérial", "Moossou", "Phare", "Quartier Artisanal", "Quartier Phare",
    "Rosiers", "Sinikro", "Village Artisanal", "Vitré 1", "Vitré 2",
    "Zone Résidentielle",
  ],

  "Koumassi": [
    "Abia Koumassi", "Cité Houphouët-Boigny", "Divo", "EMCC", "Grand Marché",
    "Koumassi Nord-Est 1", "Mairie", "Mosquée", "Prodomo - Sipim Pangolin", "Progrès",
    "Remblais", "Sicogi 1", "Sicogi 2", "Sicogi 3", "Sogefiha - Zone Industrielle",
    "Zoé Bruno",
  ],

  "Marcory": [
    "Abi Koumassi", "Abia Abéti", "Adaimin", "Alliodan", "Anoumabo",
    "Biétry", "Champroux", "Gnanzoua", "Hibiscus", "Jean Baptiste Mockey",
    "Kablan Brou Fulgence", "Marie Koré", "Marcory Résidentiel", "Sicogi", "Zone 4C",
  ],

  "Plateau": [
    "Banco", "Chiens Méchants", "Cité Administrative", "Cité Esculape", "Commerce",
    "Gare Lagune", "Indénié", "Plateau Centre", "Port Douane", "Présidence",
    "Quatre Villas", "RAN Garage", "Six Bâtiments",
  ],

  "Port-Bouët": [
    "Abattoir 1", "Abattoir 2", "Abattoir 3", "Adjahui-Coubé", "Adjouffou",
    "Adjouffou 2", "Anléya", "Camp Douane", "Cie Plage", "Commissariat 1",
    "Commissariat 3", "Commissariat Sainte Anne", "Commissariat Sogefiha", "Derrière Wharf", "Gonzagueville",
    "Hôpital 1", "Hôpital 43è BIMA", "Hôpital Grand Marché", "Jean Folly", "Océan",
    "Petit Bassam", "Phare 3", "Phare Collège Moderne", "Phare Littoral", "Vridi 3 Écoles",
    "Vridi 3 Foyers", "Vridi Canal", "Vridi Chapelle", "Vridi Gendarmerie", "Zone Aéroportuaire",
  ],

  "Songon": [
    "Abadjin-Koué", "Adiopoto 1", "Adiopoto 2", "Adiopoto-Moronou", "Anguédédou",
    "Carrefour Adiopoto", "Carrefour Bimbresso", "Carrefour Dagbé", "Carrefour Jacquville", "Cité La Grâce",
    "Km 17 ou Adiopodoumé Extension", "Logements Sociaux", "Songon Centre", "Songon-Dagbé", "Songon-Gare",
    "Songon-Kassemblé",
  ],

  "Treichville": [
    "Aboubakar Sacko", "Anatole France", "Arras 1", "Arras 2", "Arras 3",
    "Auguste Denise", "Biafra", "Boa Kassi", "Camp Douanier", "Cité Douane - Pont",
    "Cité du Port", "Cité RAN", "Cyrille Polneau", "Entente", "Ezan Pascal",
    "Gendarmerie - CRO", "George Kassi", "Habitat Belleville", "Habitat Craone", "Jacques Aka",
    "Jean Yao", "Jeanne d'Arc", "Kouassi Lenoir", "Lobou Dr Djessou", "Louis de Gonzague",
    "Mory Diomandé", "N'Guessan Kouamé", "Nanan Yamousso", "Notre Dame", "Séry Koré",
    "Seyni Fofana", "Seyni Gueye", "Sococé", "Tanoh Blaise", "Voltaire",
    "Zone Industrielle", "Zone Portuaire",
  ],

  "Yopougon": [
    "Académie", "Académie Résidentiel", "Adiopo Doumé", "Ananeraie", "Andokoi",
    "Andokoi Extension", "Atchi", "Attié", "Azito Village", "Bagouda",
    "Banco 2", "Batim 2", "Béago", "Bel Air", "Boissy",
    "Bonikro", "Camp Militaire", "Cité Bracodi", "Cité Caféiers", "Cité CNPS",
    "Cité Élisée", "Cité Marine", "Cité Nawa", "Cité Ngouan 1", "Cité Saco 2",
    "Cité SGBCI", "Cité Sodefor Lauriers", "Cité Sotra", "Cité Verte", "Complexe",
    "Coprim Zenith", "Deuxième Tranche", "Diop", "Doukouré", "Fanny",
    "Figayo", "Fin Goudron", "Gabriel Gare", "Galilée", "Gbamnan Djidan 1",
    "Gesco", "GFCI", "Hôpital", "Île Boulay", "Issamboua",
    "Judée", "Keneya", "Kouté", "Koweit", "Lauriers 2",
    "Lauriers Sacos", "Le Corridor", "Les Pays-Bas", "Lezou Aman", "Lièvre Rouge",
    "Lokoa Extension", "Mamie Adjoua", "Maroc", "Mbakré", "Micao",
    "N'Zimakro", "Niaba", "Niangon", "Niangon Adjamé", "Niangon à Droite",
    "Niangon à Gauche", "Niangon Lokoa", "Niangon Nord", "Niangon Sicogi Canal", "Niangon Sud",
    "Niangon Sud Sicogi", "Nouveau Quartier", "Port-Bouët 2", "Quartier LEM", "Quartier Maroc",
    "Quartier Millionnaire", "Sable", "Saint Hubert", "Score", "Selmer",
    "Selmer Ponty", "Sicogi", "Sideci", "Sikasso", "Siporex",
    "Sogefiha Solic", "Sopim", "Toit Rouge", "Toit Vert", "Wassakara",
    "Yao Séhi", "Yesso", "Yopougon-Santé", "Zone Industrielle",
  ],
};

/**
 * Table de Correspondance & Alias Épuration
 * Permet de convertir automatiquement les variantes de saisie usagers (chiffres romains, tirets, préfixes, fautes)
 * vers le nom canonique officiel PADA.
 */
export const QUARTIER_ALIASES: Record<string, string> = {
  // ── Adjamé ──
  "adjame|williamsville": "Williamsville 1",
  "adjame|williamsville 1": "Williamsville 1",
  "adjame|williamsville i": "Williamsville 1",
  "adjame|williamsville 2": "Williamsville 2",
  "adjame|williamsville ii": "Williamsville 2",
  "adjame|williamsville 3": "Williamsville 3",
  "adjame|williamsville iii": "Williamsville 3",
  "adjame|adjame williamsville": "Williamsville 1",
  "adjame|williamsville village": "Williamsville 1",
  "adjame|ebrié": "Ebrié",
  "adjame|ebrie": "Ebrié",
  "adjame|quartier ebrié": "Ebrié",
  "adjame|quartier ébrié": "Ebrié",
  "adjame|village ebrié": "Ebrié",
  "adjame|village ébrié": "Ebrié",
  "adjame|indénié": "Indénié",
  "adjame|indenie": "Indénié",
  "adjame|indénié - adjamé": "Indénié",
  "adjame|indénie - adjame": "Indénié",
  "adjame|mairie 1": "Mairie 1",
  "adjame|mairie i": "Mairie 1",
  "adjame|mairie 2": "Mairie 2",
  "adjame|mairie ii": "Mairie 2",
  "adjame|marie therese": "Marie Thérèse",
  "adjame|marie-therese": "Marie Thérèse",
  "adjame|marie thérèse": "Marie Thérèse",
  "adjame|marie-thérèse": "Marie Thérèse",
  "adjame|saint michel": "Saint Michel",
  "adjame|saint-michel": "Saint Michel",
  "adjame|sodeci - filtisac": "Sodeci - Filtisac",
  "adjame|sodeci filtisac": "Sodeci - Filtisac",
  "adjame|sodeci-filtisac": "Sodeci - Filtisac",
  "adjame|pailler": "Pailliet",
  "adjame|pallier": "Pailliet",
  "adjame|pailliet": "Pailliet",
  "adjame|habitat": "Habitat Extension",
  "adjame|habitat extension": "Habitat Extension",
  "adjame|bidonville": "Adjamé-Nord",
  "adjame|humici": "Bracodi",
  "adjame|latin": "Habitat Extension",
  "adjame|quartier manguier": "Bracodi",

  // ── Treichville ──
  "treichville|arras 1": "Arras 1",
  "treichville|arras i": "Arras 1",
  "treichville|arras 2": "Arras 2",
  "treichville|arras ii": "Arras 2",
  "treichville|arras 3": "Arras 3",
  "treichville|arras iii": "Arras 3",

  // ── Cocody ──
  "cocody|blockauss (village)": "Blockauss",
  "cocody|blockauss village": "Blockauss",
  "cocody|anono": "Anono Village",
  "cocody|anono village": "Anono Village",
  "cocody|riviéra": "Riviera 2",
  "cocody|riviera": "Riviera 2",
  "cocody|riviera 1": "Riviera 2",
  "cocody|riviera i": "Riviera 2",
  "cocody|riviera ii": "Riviera 2",
  "cocody|riviera iii": "Riviera 3",
  "cocody|riviera iv": "Riviera 4",
  "cocody|riviera v": "Riviera 5",
  "cocody|riviera 2": "Riviera 2",
  "cocody|riviera 3": "Riviera 3",
  "cocody|riviera 4": "Riviera 4",
  "cocody|riviera 5": "Riviera 5",
  "cocody|riviera bonoumin": "Riviera Bonoumin",
  "cocody|bonoumin": "Riviera Bonoumin",
  "cocody|riviera golf": "Riviera Golf",
  "cocody|golf": "Riviera Golf",
  "cocody|riviera allabra": "Riviera Allabra",
  "cocody|allabra": "Riviera Allabra",
  "cocody|riviera sideci": "Riviera Sideci",
  "cocody|deux plateaux": "Deux Plateaux",
  "cocody|2 plateaux": "Deux Plateaux",
  "cocody|deux-plateaux": "Deux Plateaux",
  "cocody|angré château": "Angré",
  "cocody|angre chateau": "Angré",
  "cocody|angre": "Angré",
  "cocody|angré": "Angré",
  "cocody|angre extension": "Angré Extension",
  "cocody|angré extension": "Angré Extension",

  // ── Yopougon ──
  "yopougon|port-bouët ii": "Port-Bouët 2",
  "yopougon|port-bouet ii": "Port-Bouët 2",
  "yopougon|port bouet 2": "Port-Bouët 2",
  "yopougon|port-bouët 2": "Port-Bouët 2",
  "yopougon|cité saco ii": "Cité Saco 2",
  "yopougon|cite saco 2": "Cité Saco 2",
  "yopougon|kouté village": "Kouté",
  "yopougon|koute village": "Kouté",
  "yopougon|koute": "Kouté",
  "yopougon|wassakara village": "Wassakara",
  "yopougon|gesco village": "Gesco",
  "yopougon|niangon à droite": "Niangon à Droite",
  "yopougon|niangon a droite": "Niangon à Droite",
  "yopougon|niangon à gauche": "Niangon à Gauche",
  "yopougon|niangon a gauche": "Niangon à Gauche",

  // ── Abobo ──
  "abobo|abobo baoulé": "Abobo Baoulé",
  "abobo|abobo baoule": "Abobo Baoulé",
  "abobo|abobo centre": "Abobo Baoulé",
  "abobo|n dotré": "N'Dotré",
  "abobo|ndotré": "N'Dotré",
  "abobo|ndotre": "N'Dotré",
  "abobo|n'dotre": "N'Dotré",
  "abobo|n'dotré": "N'Dotré",
  "abobo|plaque i": "Plaque 1",
  "abobo|plaque ii": "Plaque 2",

  // ── Attécoubé ──
  "attecoube|attecoube iii": "Attécoubé 3",
  "attecoube|attecoube 3": "Attécoubé 3",
  "attecoube|santé iii": "Santé 3",
  "attecoube|sante 3": "Santé 3",
  "attecoube|jérusalem i": "Jérusalem 1",
  "attecoube|jérusalem ii": "Jérusalem 2",
  "attecoube|jérusalem iii": "Jérusalem 3",

  // ── Koumassi ──
  "koumassi|sicogi i": "Sicogi 1",
  "koumassi|sicogi ii": "Sicogi 2",
  "koumassi|sicogi iii": "Sicogi 3",
  "koumassi|koumassi village": "Cité Houphouët-Boigny",
  "koumassi|campement": "Cité Houphouët-Boigny",

  // ── Port-Bouët ──
  "port-bouet|abattoir i": "Abattoir 1",
  "port-bouet|abattoir ii": "Abattoir 2",
  "port-bouet|abattoir iii": "Abattoir 3",
  "port-bouet|adjouffou ii": "Adjouffou 2",
  "port-bouet|gonzague": "Gonzagueville",
  "port-bouet|gonzagueville village": "Gonzagueville",
  "port-bouet|vridi canal": "Vridi Canal",
  "port-bouet|vidri canal": "Vridi Canal",
  "port-bouet|vridi 3 ecoles": "Vridi 3 Écoles",
  "port-bouet|vidri 3 ecoles": "Vridi 3 Écoles",

  // ── Grand-Bassam ──
  "grand-bassam|vitre 1": "Vitré 1",
  "grand-bassam|vitré i": "Vitré 1",
  "grand-bassam|vitré ii": "Vitré 2",
  "grand-bassam|vitre 2": "Vitré 2",
};

/**
 * Retourne la liste des quartiers officiels d'une commune
 */
export function getQuartiers(commune: string): string[] {
  if (!commune) return [];
  const normalizedCommune = commune.trim();
  const matchKey = Object.keys(QUARTIERS).find(
    (k) => k.toLowerCase() === normalizedCommune.toLowerCase()
  );
  return matchKey ? QUARTIERS[matchKey] : [];
}

/**
 * Vérifie si un quartier appartient bien à une commune (avec support des alias)
 */
export function isValidQuartier(commune: string, quartier: string): boolean {
  if (!commune || !quartier) return false;
  const canonical = normalizeQuartier(quartier, commune);
  const list = getQuartiers(commune);
  return list.some((q) => q.toLowerCase() === canonical.toLowerCase());
}

/**
 * Nettoie une chaîne de caractères pour comparaison (minuscules, sans accents, sans tirets ni ponctuation)
 */
function cleanKey(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Convertit les suffixes ou occurrences de chiffres romains en chiffres arabes
 * ex: "Williamsville II" -> "Williamsville 2", "Arras III" -> "Arras 3"
 */
function convertRomanNumerals(text: string): string {
  return text
    .replace(/\b(viii)\b/gi, "8")
    .replace(/\b(vii)\b/gi, "7")
    .replace(/\b(vi)\b/gi, "6")
    .replace(/\b(iv)\b/gi, "4")
    .replace(/\b(v)\b/gi, "5")
    .replace(/\b(iii)\b/gi, "3")
    .replace(/\b(ii)\b/gi, "2")
    .replace(/\b(i)\b/gi, "1");
}

/**
 * Normalise le nom d'un quartier saisi par l'utilisateur ou stocké en base.
 * Rapproche systématiquement les variantes (Williamsville 2 / Williamsville II, Marie-Thérèse / Marie Thérèse, etc.)
 * et élimine les libellés génériques parasites (__other, other, autre).
 */
export function normalizeQuartier(raw: string, commune?: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";

  // Assainissement des libellés parasites (__other, other, Autre, N/A)
  const lowerTrimmed = trimmed.toLowerCase();
  if (
    lowerTrimmed === "__other" ||
    lowerTrimmed === "other" ||
    lowerTrimmed === "autre" ||
    lowerTrimmed === "autre quartier" ||
    lowerTrimmed === "non spécifié" ||
    lowerTrimmed === "non specifie" ||
    lowerTrimmed === "n/a"
  ) {
    if (commune) {
      const canonicalCommune = commune.trim();
      const list = getQuartiers(canonicalCommune);
      // Fallback vers le secteur central ou le premier quartier officiel de la commune
      const center = list.find((q) => q.toLowerCase().includes("centre") || q.toLowerCase().includes("résidentiel"));
      return center || list[0] || `${canonicalCommune} Centre`;
    }
    return "Secteur non précisé";
  }

  // 1. Recherche par clé alias exacte (commune|nom_brut)
  if (commune) {
    const key = `${cleanKey(commune)}|${cleanKey(trimmed)}`;
    if (QUARTIER_ALIASES[key]) {
      return QUARTIER_ALIASES[key];
    }
  }

  // 2. Recherche avec conversion des chiffres romains (ex: Williamsville II -> Williamsville 2)
  const convertedRoman = convertRomanNumerals(trimmed);
  if (convertedRoman !== trimmed && commune) {
    const romanKey = `${cleanKey(commune)}|${cleanKey(convertedRoman)}`;
    if (QUARTIER_ALIASES[romanKey]) {
      return QUARTIER_ALIASES[romanKey];
    }
  }

  // 3. Recherche de correspondance exacte dans la commune spécifiée
  if (commune) {
    const list = getQuartiers(commune);
    const exact = list.find((q) => q.toLowerCase() === trimmed.toLowerCase());
    if (exact) return exact;

    // Correspondance insouciante des accents, tirets et chiffres romains
    const cleanRaw = cleanKey(convertedRoman);
    const loose = list.find((q) => cleanKey(q) === cleanRaw);
    if (loose) return loose;

    // Correspondance partielle (ex: "Bonoumin" -> "Riviera Bonoumin", "Golf" -> "Riviera Golf")
    const partial = list.find((q) => cleanKey(q).includes(cleanRaw) || cleanRaw.includes(cleanKey(q)));
    if (partial && cleanRaw.length >= 4) return partial;
  }

  // 4. Recherche globale parmi toutes les communes
  for (const list of Object.values(QUARTIERS)) {
    const found = list.find((q) => q.toLowerCase() === trimmed.toLowerCase());
    if (found) return found;

    const cleanRaw = cleanKey(convertedRoman);
    const loose = list.find((q) => cleanKey(q) === cleanRaw);
    if (loose) return loose;
  }

  // S'il s'agit d'un quartier contenant un suffixe 'Village' ou 'Quartier' superflu
  const stripped = trimmed
    .replace(/^(\s*Quartier\s+|\s*Village\s+)/i, "")
    .replace(/\s*\(?\s*[Vv]illage\s*\)?\s*$/i, "")
    .trim();

  if (stripped && stripped !== trimmed && commune) {
    return normalizeQuartier(stripped, commune);
  }

  return trimmed;
}

/**
 * Extrait le quartier le plus précis pour un signalement donné
 * en analysant le champ quartier, la localisation PADA et la description.
 */
export function extractQuartierFromReport(
  r: { quartier?: string | null; location?: string | null; description?: string | null; commune?: string | null },
  fallbackCommune?: string
): string {
  const targetCommune = r.commune || fallbackCommune || "";

  // 1. Si un quartier valide est déjà renseigné
  if (r.quartier && r.quartier.trim()) {
    const raw = r.quartier.trim();
    if (raw !== "__other" && raw.toLowerCase() !== "autre" && raw.toLowerCase() !== "non spécifié") {
      const norm = normalizeQuartier(raw, targetCommune);
      if (norm && norm !== "Secteur non précisé") return norm;
    }
  }

  // 2. Recherche textuelle dans location et description
  const textToScan = `${r.location || ""} ${r.description || ""}`.toLowerCase();
  if (targetCommune) {
    const list = getQuartiers(targetCommune);
    for (const q of list) {
      const qLower = q.toLowerCase();
      if (qLower.length >= 4 && textToScan.includes(qLower)) {
        return q;
      }
    }
  }

  // 3. Extraction de parenthèses (ex: "Abobo (Plateau Dokui)" -> "Plateau Dokui")
  const parenMatch = (r.location || "").match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1]) {
    const inside = parenMatch[1].trim();
    const norm = normalizeQuartier(inside, targetCommune);
    if (norm && norm !== "Secteur non précisé") return norm;
    return inside;
  }

  return targetCommune ? `${targetCommune} (Centre / Secteur général)` : "Secteur non précisé";
}

