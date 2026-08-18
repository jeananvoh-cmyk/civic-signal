/**
 * Base de Données Officielle des Voies PADA (Projet d'Adressage du District d'Abidjan)
 * Ministère de la Construction, du Logement et de l'Urbanisme (MCLU) / BNETD / IGN FI / GEOFIT
 * 
 * Contient :
 * - Les 32 Boulevards structurants (avec correspondances anciens noms)
 * - Les 211 Avenues homologuées par commune et quartier
 * - Les Rues majeures par quartier
 */

export interface PadaWay {
  id: string;             // ex: "166710" ou "PADA-B-001"
  type: "BOULEVARD" | "AVENUE" | "RUE" | "IMPASSE" | "RUELLE" | "PLACE" | "ROND-POINT";
  nom: string;            // ex: "RUE DR BLÉ VICTOR DOH", "BOULEVARD GERMAIN KOFFI GADEAU"
  ancienNom?: string;     // ex: "Boulevard Mitterrand"
  commune: string;        // ex: "Cocody"
  quartier?: string;      // ex: "Riviera Bonoumin"
  longueurM?: number;     // métrage linéaire officiel
  codePada?: string;      // Identifiant officiel PADA
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. LES BOULEVARDS STRUCTURANTS (32 Dénommés Officiels PADA)
// ══════════════════════════════════════════════════════════════════════════════
export const PADA_BOULEVARDS: PadaWay[] = [
  { id: "PADA-B-001", type: "BOULEVARD", nom: "Boulevard de la Liberté", ancienNom: "Route de la Liberté", commune: "Adjamé" },
  { id: "PADA-B-002", type: "BOULEVARD", nom: "Boulevard Robert Gueï", ancienNom: "Boulevard Est Ouest", commune: "Adjamé / Attécoubé" },
  { id: "PADA-B-003", type: "BOULEVARD", nom: "Boulevard Dominique Ouattara", ancienNom: "Boulevard Mitterrand (Akouédo / Bingerville)", commune: "Cocody / Bingerville" },
  { id: "PADA-B-004", type: "BOULEVARD", nom: "Boulevard Charles Bauza Donwahi", ancienNom: "Prolongement Latrille (Petro Ivoire CHU d'Angré)", commune: "Cocody" },
  { id: "PADA-B-005", type: "BOULEVARD", nom: "Boulevard André Latrille", ancienNom: "Boulevard Latrille", commune: "Cocody" },
  { id: "PADA-B-006", type: "BOULEVARD", nom: "Boulevard Mariam Dicoh", ancienNom: "Nouvelle voie Y4 (Prolongement Latrille / Carrefour Saint Viateur)", commune: "Cocody" },
  { id: "PADA-B-007", type: "BOULEVARD", nom: "Boulevard Mamadou Coulibaly", ancienNom: "Nouvelle voie Y4 (Carrefour Saint Viateur / Riviera M'Pouto)", commune: "Cocody" },
  { id: "PADA-B-008", type: "BOULEVARD", nom: "Boulevard Marie-Thérèse Houphouët-Boigny", ancienNom: "Boulevard de France", commune: "Cocody" },
  { id: "PADA-B-009", type: "BOULEVARD", nom: "Boulevard Aimé Henri Konan Bédié", ancienNom: "Pont HKB (Agban Gendarmerie)", commune: "Cocody / Marcory" },
  { id: "PADA-B-010", type: "BOULEVARD", nom: "Boulevard Laurent Gbagbo", ancienNom: "Boulevard du 4ème Pont", commune: "Yopougon / Attécoubé / Plateau" },
  { id: "PADA-B-011", type: "BOULEVARD", nom: "Boulevard de la Paix", ancienNom: "Boulevard de la Paix", commune: "Attécoubé / Adjamé" },
  { id: "PADA-B-012", type: "BOULEVARD", nom: "Boulevard du Stade Olympique", ancienNom: "Route d'Adzopé (depuis N'Dotré)", commune: "Abobo / Anyama" },
  { id: "PADA-B-013", type: "BOULEVARD", nom: "Boulevard Ernest Boka", ancienNom: "Route d'Alépé (depuis carrefour Samaké)", commune: "Abobo" },
  { id: "PADA-B-014", type: "BOULEVARD", nom: "Boulevard Félix Houphouët-Boigny (FHB)", ancienNom: "Boulevard VGE (Valéry Giscard d'Estaing)", commune: "Marcory / Treichville / Port-Bouët" },
  { id: "PADA-B-015", type: "BOULEVARD", nom: "Boulevard Germain Koffi Gadeau", ancienNom: "Boulevard Mitterrand (François Mitterrand)", commune: "Cocody / Bingerville" },
  { id: "PADA-B-016", type: "BOULEVARD", nom: "Boulevard Alphonse Boni", ancienNom: "Voie Express d'Abobo", commune: "Abobo / Adjamé" },
  { id: "PADA-B-017", type: "BOULEVARD", nom: "Boulevard Jean-Baptiste Mockey", ancienNom: "Voie de Bassam (depuis Akwaba au rond-point d'Anani)", commune: "Port-Bouët / Grand-Bassam" },
  { id: "PADA-B-018", type: "BOULEVARD", nom: "Boulevard Mohamed VI", ancienNom: "Boulevard Mohamed VI (Axe Abobo - Anyama)", commune: "Abobo / Anyama" },
  { id: "PADA-B-019", type: "BOULEVARD", nom: "Boulevard Philippe Grégoire Yacé", ancienNom: "Boulevard de Marseille", commune: "Treichville / Marcory" },
  { id: "PADA-B-020", type: "BOULEVARD", nom: "Boulevard Koui Mamadou", ancienNom: "Route de Dabou", commune: "Yopougon / Songon" },
  { id: "PADA-B-021", type: "BOULEVARD", nom: "Boulevard Auguste Denise", ancienNom: "Descente du pont De Gaulle au Boulevard de Marseille", commune: "Treichville" },
  { id: "PADA-B-022", type: "BOULEVARD", nom: "Boulevard Alassane Ouattara", ancienNom: "Percée Reboul (depuis Nangui Abrogoua)", commune: "Adjamé / Plateau" },
  { id: "PADA-B-023", type: "BOULEVARD", nom: "Boulevard du 5è Pont", ancienNom: "Pont Alassane Ouattara / 5ème Pont Cocody-Plateau", commune: "Cocody / Plateau" },
  { id: "PADA-B-024", type: "BOULEVARD", nom: "Boulevard de la République", ancienNom: "Boulevard de la République", commune: "Plateau" },
  { id: "PADA-B-025", type: "BOULEVARD", nom: "Boulevard Lagunaire", ancienNom: "Boulevard Lagunaire", commune: "Plateau / Treichville" },
  { id: "PADA-B-026", type: "BOULEVARD", nom: "Boulevard de l'Aéroport Félix Houphouët-Boigny", ancienNom: "Route de l'aéroport (depuis Akwaba)", commune: "Port-Bouët" },
  { id: "PADA-B-027", type: "BOULEVARD", nom: "Boulevard Hortense Aka Anghui", ancienNom: "Voie principale de Port-Bouët", commune: "Port-Bouët" },
  { id: "PADA-B-028", type: "BOULEVARD", nom: "Boulevard du Port", ancienNom: "Boulevard du Port", commune: "Treichville" },
  { id: "PADA-B-029", type: "BOULEVARD", nom: "Boulevard de l'Hospitalité", ancienNom: "Voie principale de Yopougon", commune: "Yopougon" },
  { id: "PADA-B-030", type: "BOULEVARD", nom: "Boulevard de la Zone Industrielle", ancienNom: "Voie de la zone industrielle de Yopougon", commune: "Yopougon" },
  { id: "PADA-B-031", type: "BOULEVARD", nom: "Boulevard Solidarité", ancienNom: "Voie de Siporex à Gesco", commune: "Yopougon" },
  { id: "PADA-B-032", type: "BOULEVARD", nom: "Boulevard Lanzeni Coulibaly", ancienNom: "Voie du premier pont de Yopougon au sapeur-pompier", commune: "Yopougon" },
];

// ══════════════════════════════════════════════════════════════════════════════
// 2. LES AVENUES OFFICIELLES (211 Dénommées PADA)
// ══════════════════════════════════════════════════════════════════════════════
export const PADA_AVENUES: PadaWay[] = [
  // --- ABOBO ---
  { id: "167220", codePada: "167220", type: "AVENUE", nom: "Avenue Adama Tounkara", commune: "Abobo", quartier: "Abobo Sud 1ère Tranche", longueurM: 1423 },
  { id: "167218", codePada: "167218", type: "AVENUE", nom: "Avenue Marcel Laubhouet", commune: "Abobo", quartier: "Abobo Sud 1ère Tranche", longueurM: 894 },
  { id: "166030", codePada: "166030", type: "AVENUE", nom: "Avenue N'Golo Coulibaly", commune: "Abobo", quartier: "Abobo Sud 1ère Tranche", longueurM: 400 },
  { id: "166007", codePada: "166007", type: "AVENUE", nom: "Avenue Koutouan Gerard", commune: "Abobo", quartier: "Abobo Sud 2ème Tranche", longueurM: 1343 },
  { id: "166027", codePada: "166027", type: "AVENUE", nom: "Avenue Tiemoko Fanny", commune: "Abobo", quartier: "Abobo Sud 2ème Tranche", longueurM: 687 },
  { id: "166058", codePada: "166058", type: "AVENUE", nom: "Avenue Lamine Fadiga", commune: "Abobo", quartier: "Agnissankoi", longueurM: 1207 },
  { id: "166063", codePada: "166063", type: "AVENUE", nom: "Avenue Paul-Emile Adjoua", commune: "Abobo", quartier: "Agnissankoi", longueurM: 1319 },
  { id: "167293", codePada: "167293", type: "AVENUE", nom: "Avenue Simone Ehivet Gbagbo", commune: "Abobo", quartier: "Akeikoi Extension", longueurM: 3187 },
  { id: "171710", codePada: "171710", type: "AVENUE", nom: "Avenue Kone Goge", commune: "Abobo", quartier: "Anador", longueurM: 2147 },
  { id: "172066", codePada: "172066", type: "AVENUE", nom: "Avenue Hamed Bakayoko", commune: "Abobo", quartier: "Cent Douze Hectares", longueurM: 1365 },
  { id: "166013", codePada: "166013", type: "AVENUE", nom: "Avenue Kandia Camara", commune: "Abobo", quartier: "Cent Douze Hectares", longueurM: 1992 },
  { id: "166005", codePada: "166005", type: "AVENUE", nom: "Avenue Nifa Diaby", commune: "Abobo", quartier: "Clouétcha", longueurM: 2658 },
  { id: "166011", codePada: "166011", type: "AVENUE", nom: "Avenue Odette Kouamé", commune: "Abobo", quartier: "Kennedy", longueurM: 1212 },
  { id: "166056", codePada: "166056", type: "AVENUE", nom: "Avenue Dossongui Kone", commune: "Abobo", quartier: "Les 4 Etages", longueurM: 1618 },
  { id: "166021", codePada: "166021", type: "AVENUE", nom: "Avenue Memel Fotê Harris", commune: "Abobo", quartier: "Monastère", longueurM: 1308 },
  { id: "166067", codePada: "166067", type: "AVENUE", nom: "Avenue de N'Dotre", commune: "Abobo", quartier: "PK 18 (Campement)", longueurM: 2301 },
  { id: "165901", codePada: "165901", type: "AVENUE", nom: "Avenue Mathias Doué", commune: "Abobo", quartier: "Plateau Dokui", longueurM: 1683 },
  { id: "166064", codePada: "166064", type: "AVENUE", nom: "Avenue Germain Yapo Yanon", commune: "Abobo", quartier: "Quartier Agni", longueurM: 1617 },
  { id: "166055", codePada: "166055", type: "AVENUE", nom: "Avenue Eugene Niagne Lasme", commune: "Abobo", quartier: "Quartier Résidentiel", longueurM: 2011 },
  { id: "166046", codePada: "166046", type: "AVENUE", nom: "Avenue Souleymane Cissoko", commune: "Abobo", quartier: "Sagbé Antenne", longueurM: 1495 },
  { id: "171504", codePada: "171504", type: "AVENUE", nom: "Avenue Jeanne Peumond", commune: "Abobo", quartier: "Sagbé Sud", longueurM: 2699 },
  { id: "166031", codePada: "166031", type: "AVENUE", nom: "Avenue Aboudramane Sangare", commune: "Abobo", quartier: "Village Aboboté", longueurM: 1311 },
  { id: "166057", codePada: "166057", type: "AVENUE", nom: "Avenue Guy-Alain Emmanuel Gauze", commune: "Abobo", quartier: "Abobo Centre", longueurM: 2156 },

  // --- ADJAMÉ ---
  { id: "165044", codePada: "165044", type: "AVENUE", nom: "Avenue Amondji Pierre", commune: "Adjamé", quartier: "220 Logements", longueurM: 1335 },
  { id: "165000", codePada: "165000", type: "AVENUE", nom: "Avenue Jacobs Williams", commune: "Adjamé", quartier: "Mairie 2", longueurM: 798 },
  { id: "164843", codePada: "164843", type: "AVENUE", nom: "Avenue Nangui Abrogoua", commune: "Adjamé", quartier: "Adjamé-Nord", longueurM: 3321 },
  { id: "165856", codePada: "165856", type: "AVENUE", nom: "Avenue Joseph Attoumbre", commune: "Adjamé", quartier: "Mirador", longueurM: 1595 },
  { id: "165852", codePada: "165852", type: "AVENUE", nom: "Avenue Fologo Laurent Dona", commune: "Adjamé", quartier: "Pailliet", longueurM: 7254 },
  { id: "165100", codePada: "165100", type: "AVENUE", nom: "Avenue Dembele Lancina", commune: "Adjamé", quartier: "Saint Michel", longueurM: 628 },
  { id: "165777", codePada: "165777", type: "AVENUE", nom: "Avenue Djeni Kobena", commune: "Adjamé", quartier: "Williamsville 1", longueurM: 2276 },

  // --- ANYAMA ---
  { id: "166069", codePada: "166069", type: "AVENUE", nom: "Avenue Coffi Michel Benoit", commune: "Anyama", quartier: "Abohoin", longueurM: 2820 },
  { id: "166070", codePada: "166070", type: "AVENUE", nom: "Avenue Lassana Timite", commune: "Anyama", quartier: "Anyama Adjamé", longueurM: 1856 },
  { id: "166109", codePada: "166109", type: "AVENUE", nom: "Avenue M'Bahia Ble Kouadio", commune: "Anyama", quartier: "Résidentiel", longueurM: 2011 },

  // --- ATTÉCOUBÉ ---
  { id: "165790", codePada: "165790", type: "AVENUE", nom: "Avenue Philippe Mangou", commune: "Attécoubé", quartier: "Abidjan Agban", longueurM: 4176 },
  { id: "165057", codePada: "165057", type: "AVENUE", nom: "Avenue Amos Djoro", commune: "Attécoubé", quartier: "La Paix", longueurM: 1157 },
  { id: "165096", codePada: "165096", type: "AVENUE", nom: "Avenue des Bidjans", commune: "Attécoubé", quartier: "La Paix", longueurM: 652 },
  { id: "168618", codePada: "168618", type: "AVENUE", nom: "Avenue de Locodjro", commune: "Attécoubé", quartier: "Locodjoro", longueurM: 8640 },

  // --- BINGERVILLE ---
  { id: "167277", codePada: "167277", type: "AVENUE", nom: "Avenue Blanchon", commune: "Bingerville", quartier: "AKANDJE-ADJIN-AKOYATE-ACHOKOI-AKAKRO-SEBIAYAO", longueurM: 5791 },
  { id: "168160", codePada: "168160", type: "AVENUE", nom: "Avenue de M'Batto Bouaké", commune: "Bingerville", quartier: "AKANDJE-ADJIN-AKOYATE-ACHOKOI-AKAKRO-SEBIAYAO", longueurM: 8576 },
  { id: "167271", codePada: "167271", type: "AVENUE", nom: "Avenue du Jardin Botanique", commune: "Bingerville", quartier: "AKANDJE-ADJIN-AKOYATE-ACHOKOI-AKAKRO-SEBIAYAO", longueurM: 4318 },
  { id: "170650", codePada: "170650", type: "AVENUE", nom: "Avenue Konan Kouassi Lambert", commune: "Bingerville", quartier: "AKANDJE-ADJIN-AKOYATE-ACHOKOI-AKAKRO-SEBIAYAO", longueurM: 6991 },
  { id: "135023", codePada: "135023", type: "AVENUE", nom: "Avenue d'Abatta", commune: "Bingerville", quartier: "AKOUEDO - ABATTA VILLAGE", longueurM: 823 },
  { id: "168346", codePada: "168346", type: "AVENUE", nom: "Avenue de Dahlia Fleur", commune: "Bingerville", quartier: "AKOUEDO - ABATTA VILLAGE", longueurM: 5304 },
  { id: "170777", codePada: "170777", type: "AVENUE", nom: "Avenue de la BCEAO", commune: "Bingerville", quartier: "AKOUEDO - ABATTA VILLAGE", longueurM: 1388 },
  { id: "176335", codePada: "176335", type: "AVENUE", nom: "Avenue de Gbagba", commune: "Bingerville", quartier: "BAGBA 1ere EXTENSION", longueurM: 2377 },
  { id: "167280", codePada: "167280", type: "AVENUE", nom: "Avenue Didier Drogba", commune: "Bingerville", quartier: "SCI Carrière", longueurM: 1415 },

  // --- COCODY ---
  { id: "165970", codePada: "165970", type: "AVENUE", nom: "Avenue du Lycée Technique", commune: "Cocody", quartier: "Cocody centre", longueurM: 2223 },
  { id: "167238", codePada: "167238", type: "AVENUE", nom: "Avenue DJ Arafat", commune: "Cocody", quartier: "7e Tranche", longueurM: 615 },
  { id: "166765", codePada: "166765", type: "AVENUE", nom: "Avenue Robert Beugré Mambé", commune: "Cocody", quartier: "7e Tranche", longueurM: 6688 },
  { id: "168449", codePada: "168449", type: "AVENUE", nom: "Avenue William Ipote", commune: "Cocody", quartier: "8e Tranche", longueurM: 3911 },
  { id: "165957", codePada: "165957", type: "AVENUE", nom: "Avenue Saliou Touré", commune: "Cocody", quartier: "Adjamé Village", longueurM: 2113 },
  { id: "165851", codePada: "165851", type: "AVENUE", nom: "Avenue Guillaume Folquet", commune: "Cocody", quartier: "Aghien", longueurM: 1157 },
  { id: "165960", codePada: "165960", type: "AVENUE", nom: "Avenue Henriette Konan Bédié", commune: "Cocody", quartier: "Ambassade", longueurM: 1245 },
  { id: "165902", codePada: "165902", type: "AVENUE", nom: "Avenue Charles Koffi Diby", commune: "Cocody", quartier: "Angré", longueurM: 1551 },
  { id: "165940", codePada: "165940", type: "AVENUE", nom: "Avenue Georges Niangoran Bouah", commune: "Cocody", quartier: "Angré", longueurM: 1371 },
  { id: "165931", codePada: "165931", type: "AVENUE", nom: "Avenue Pr Adonis Koffy", commune: "Cocody", quartier: "Angré", longueurM: 1451 },
  { id: "165929", codePada: "165929", type: "AVENUE", nom: "Avenue Pierre Fakoury", commune: "Cocody", quartier: "Angré", longueurM: 2180 },
  { id: "165951", codePada: "165951", type: "AVENUE", nom: "Avenue Abdoulaye Koné", commune: "Cocody", quartier: "Angré Extension", longueurM: 682 },
  { id: "165935", codePada: "165935", type: "AVENUE", nom: "Avenue Jean Kacou Diagou", commune: "Cocody", quartier: "Angré Extension", longueurM: 1129 },
  { id: "167236", codePada: "167236", type: "AVENUE", nom: "Avenue Usher Assouan", commune: "Cocody", quartier: "Angré Extension", longueurM: 4987 },
  { id: "165893", codePada: "165893", type: "AVENUE", nom: "Avenue Marcel Zadi Kessy", commune: "Cocody", quartier: "Anono Village", longueurM: 1824 },
  { id: "176557", codePada: "176557", type: "AVENUE", nom: "Avenue Émile Constant Bombet", commune: "Cocody", quartier: "ATCI", longueurM: 1125 },
  { id: "165977", codePada: "165977", type: "AVENUE", nom: "Avenue Koffi Léon Konan", commune: "Cocody", quartier: "ATCI", longueurM: 783 },
  { id: "166580", codePada: "166580", type: "AVENUE", nom: "Avenue du Colonel Zinsou", commune: "Cocody", quartier: "Attoban", longueurM: 1603 },
  { id: "168435", codePada: "168435", type: "AVENUE", nom: "Avenue Kone Tiemoko Meyliet", commune: "Cocody", quartier: "Bessikoi - Djorogobité", longueurM: 7525 },
  { id: "173288", codePada: "173288", type: "AVENUE", nom: "Avenue Jean Mermoz", commune: "Cocody", quartier: "Cocody centre", longueurM: 839 },
  { id: "165888", codePada: "165888", type: "AVENUE", nom: "Avenue Aoussou Koffi", commune: "Cocody", quartier: "Cocody centre", longueurM: 1473 },
  { id: "165988", codePada: "165988", type: "AVENUE", nom: "Avenue Bernard Yago", commune: "Cocody", quartier: "Danga Nord", longueurM: 914 },
  { id: "165889", codePada: "165889", type: "AVENUE", nom: "Avenue Georges Ouegnin", commune: "Cocody", quartier: "Danga Sud", longueurM: 897 },
  { id: "165887", codePada: "165887", type: "AVENUE", nom: "Avenue Hassan II", commune: "Cocody", quartier: "Danga Sud", longueurM: 1844 },
  { id: "165963", codePada: "165963", type: "AVENUE", nom: "Avenue Henriette Dagri Diabaté", commune: "Cocody", quartier: "Danga Sud", longueurM: 774 },
  { id: "165829", codePada: "165829", type: "AVENUE", nom: "Avenue François-Joseph Amon d'Aby", commune: "Cocody", quartier: "Ecole de Police", longueurM: 425 },
  { id: "165900", codePada: "165900", type: "AVENUE", nom: "Avenue Antoine Cesario", commune: "Cocody", quartier: "Jardin de la Riviera", longueurM: 1621 },
  { id: "168331", codePada: "168331", type: "AVENUE", nom: "Avenue Kablan Duncan", commune: "Cocody", quartier: "Le Vallon", longueurM: 3371 },
  { id: "169578", codePada: "169578", type: "AVENUE", nom: "Avenue Eden", commune: "Cocody", quartier: "Mbadon - Akouédo", longueurM: 3184 },
  { id: "167266", codePada: "167266", type: "AVENUE", nom: "Avenue Jean Konan Banny", commune: "Cocody", quartier: "Mbadon - Akouédo", longueurM: 4246 },
  { id: "168245", codePada: "168245", type: "AVENUE", nom: "Avenue du Général Akissi Kouame", commune: "Cocody", quartier: "Nouveau Camp", longueurM: 1180 },
  { id: "167245", codePada: "167245", type: "AVENUE", nom: "Avenue Albert Kakou Tiapani", commune: "Cocody", quartier: "Palmeraie", longueurM: 1715 },
  { id: "165911", codePada: "165911", type: "AVENUE", nom: "Avenue Alcide Kacou", commune: "Cocody", quartier: "Palmeraie", longueurM: 2118 },
  { id: "166731", codePada: "166731", type: "AVENUE", nom: "Avenue du Sacré Cœur", commune: "Cocody", quartier: "Palmeraie", longueurM: 1857 },
  { id: "165914", codePada: "165914", type: "AVENUE", nom: "Avenue Ezan Akele", commune: "Cocody", quartier: "Palmeraie", longueurM: 1345 },
  { id: "167266", codePada: "167266", type: "AVENUE", nom: "Avenue Rose Doudou Gueï", commune: "Cocody", quartier: "Palmeraie", longueurM: 972 },
  { id: "167254", codePada: "167254", type: "AVENUE", nom: "Avenue de Monseigneur Pierre Marie Cotty", commune: "Cocody", quartier: "Riviera 2", longueurM: 2043 },
  { id: "165834", codePada: "165834", type: "AVENUE", nom: "Avenue Théodore Mel Eg", commune: "Cocody", quartier: "Riviera 4", longueurM: 1816 },
  { id: "175401", codePada: "175401", type: "AVENUE", nom: "Avenue Alphonse Djédjé Mady", commune: "Cocody", quartier: "Riviera Bonoumin", longueurM: 2137 },
  { id: "165890", codePada: "165890", type: "AVENUE", nom: "Avenue Bangali Koné", commune: "Cocody", quartier: "Riviera Bonoumin", longueurM: 2175 },
  { id: "166669", codePada: "166669", type: "AVENUE", nom: "Avenue Honoré Guié", commune: "Cocody", quartier: "Riviera Bonoumin", longueurM: 1945 },
  { id: "166008", codePada: "166008", type: "AVENUE", nom: "Avenue Edmond Zégbéhi Bouazo", commune: "Cocody", quartier: "Riviera Bonoumin", longueurM: 710 },
  { id: "175358", codePada: "175358", type: "AVENUE", nom: "Avenue Joachim Boni", commune: "Cocody", quartier: "Riviera Bonoumin", longueurM: 837 },
  { id: "165907", codePada: "165907", type: "AVENUE", nom: "Avenue Pierre Kipré", commune: "Cocody", quartier: "Riviera Bonoumin", longueurM: 2637 },
  { id: "172979", codePada: "172979", type: "AVENUE", nom: "Avenue du Golf", commune: "Cocody", quartier: "Riviera Golf", longueurM: 3187 },
  { id: "172984", codePada: "172984", type: "AVENUE", nom: "Avenue John Kennedy", commune: "Cocody", quartier: "Riviera Golf", longueurM: 1041 },
  { id: "165836", codePada: "165836", type: "AVENUE", nom: "Avenue Bernard Zadi Zaourou", commune: "Cocody", quartier: "Riviera Sideci", longueurM: 2136 },
  { id: "165962", codePada: "165962", type: "AVENUE", nom: "Avenue Tiemoko Yade Coulibaly", commune: "Cocody", quartier: "SICOGI", longueurM: 879 },
  { id: "165964", codePada: "165964", type: "AVENUE", nom: "Avenue Antoine Gauze", commune: "Cocody", quartier: "Université", longueurM: 918 },
  { id: "165831", codePada: "165831", type: "AVENUE", nom: "Avenue de l'Université", commune: "Cocody", quartier: "Université", longueurM: 2397 },
  { id: "165831", codePada: "165831", type: "AVENUE", nom: "Avenue Jean Badobre", commune: "Cocody", quartier: "Université", longueurM: 767 },
  { id: "173321", codePada: "173321", type: "AVENUE", nom: "Avenue Hyacinthe Sarassoro", commune: "Cocody", quartier: "Université", longueurM: 428 },
  { id: "165899", codePada: "165899", type: "AVENUE", nom: "Avenue Joséphine Guidy Wandja", commune: "Cocody", quartier: "Université", longueurM: 1274 },
  { id: "168635", codePada: "168635", type: "AVENUE", nom: "Avenue Jean Malan", commune: "Cocody", quartier: "Wedouwel", longueurM: 3974 },

  // --- INTERCOMMUNALES ---
  { id: "164148", codePada: "164148", type: "AVENUE", nom: "Avenue Paul Akoto Yao", commune: "Koumassi / Marcory", quartier: "MOSQUEE", longueurM: 5337 },
  { id: "164203", codePada: "164203", type: "AVENUE", nom: "Avenue Martin Luther King", commune: "Koumassi / Marcory", quartier: "REMBLAIS", longueurM: 7209 },
  { id: "164294", codePada: "164294", type: "AVENUE", nom: "Avenue Ouezzin Coulibaly", commune: "Koumassi / Marcory", quartier: "Résidentiel", longueurM: 3243 },

  // --- KOUMASSI ---
  { id: "162789", codePada: "162789", type: "AVENUE", nom: "Avenue Cissé Bacongo", commune: "Koumassi", quartier: "GRAND MARCHE", longueurM: 400 },
  { id: "162946", codePada: "162946", type: "AVENUE", nom: "Avenue Kassoum Coulibaly", commune: "Koumassi", quartier: "GRAND MARCHE", longueurM: 1755 },
  { id: "164149", codePada: "164149", type: "AVENUE", nom: "Avenue des Rois", commune: "Koumassi", quartier: "PROGRES", longueurM: 785 },
  { id: "164090", codePada: "164090", type: "AVENUE", nom: "Avenue Grah Kadji", commune: "Koumassi", quartier: "PROGRES", longueurM: 1432 },
  { id: "163733", codePada: "163733", type: "AVENUE", nom: "Avenue Adou Assale", commune: "Koumassi", quartier: "REMBLAIS", longueurM: 1093 },
  { id: "162964", codePada: "162964", type: "AVENUE", nom: "Avenue de l'Unité Nationale", commune: "Koumassi", quartier: "SICOGI 1", longueurM: 1519 },
  { id: "164103", codePada: "164103", type: "AVENUE", nom: "Avenue des Métiers", commune: "Koumassi", quartier: "SICOGI 1", longueurM: 1721 },
  { id: "164298", codePada: "164298", type: "AVENUE", nom: "Avenue Ouedraogo Boniface", commune: "Koumassi", quartier: "SICOGI 2", longueurM: 1430 },
  { id: "162954", codePada: "162954", type: "AVENUE", nom: "Avenue Adhout Cyr Saint Omer", commune: "Koumassi", quartier: "SOGEFIHA - ZONE INDUSTRIELLE", longueurM: 1435 },
  { id: "91102",  codePada: "91102",  type: "AVENUE", nom: "Avenue des Industries", commune: "Koumassi", quartier: "SOGEFIHA - ZONE INDUSTRIELLE", longueurM: 3962 },
  { id: "164270", codePada: "164270", type: "AVENUE", nom: "Avenue Zoe Bruno", commune: "Koumassi", quartier: "ZOE BRUNO", longueurM: 927 },

  // --- MARCORY ---
  { id: "162816", codePada: "162816", type: "AVENUE", nom: "Avenue Amadou Thiam", commune: "Marcory", quartier: "Adaimin", longueurM: 1481 },
  { id: "163452", codePada: "163452", type: "AVENUE", nom: "Avenue Noël Nemin", commune: "Marcory", quartier: "Adaimin", longueurM: 1238 },
  { id: "162744", codePada: "162744", type: "AVENUE", nom: "Avenue Koffi Blaise N'Dia", commune: "Marcory", quartier: "Adaimin", longueurM: 1232 },
  { id: "162813", codePada: "162813", type: "AVENUE", nom: "Avenue Léopoldine Tiézan Coffie", commune: "Marcory", quartier: "Adaimin", longueurM: 793 },
  { id: "164239", codePada: "164239", type: "AVENUE", nom: "Avenue du Colonel Ali Sako", commune: "Marcory", quartier: "Alliodan", longueurM: 732 },
  { id: "164248", codePada: "164248", type: "AVENUE", nom: "Avenue Djidji Ayökwe", commune: "Marcory", quartier: "Anoumabo", longueurM: 3865 },
  { id: "163616", codePada: "163616", type: "AVENUE", nom: "Avenue N'Guetta Timothée Ahoua", commune: "Marcory", quartier: "Biétry", longueurM: 1594 },
  { id: "162818", codePada: "162818", type: "AVENUE", nom: "Avenue Vanié Bi Tra", commune: "Marcory", quartier: "Biétry", longueurM: 2011 },
  { id: "164224", codePada: "164224", type: "AVENUE", nom: "Avenue Bernard Dadié", commune: "Marcory", quartier: "Champroux", longueurM: 1445 },
  { id: "163422", codePada: "163422", type: "AVENUE", nom: "Avenue Siméon Aké", commune: "Marcory", quartier: "Champroux", longueurM: 651 },
  { id: "164268", codePada: "164268", type: "AVENUE", nom: "Avenue Issouf Koné", commune: "Marcory", quartier: "Gnanzoua", longueurM: 1279 },
  { id: "163338", codePada: "163338", type: "AVENUE", nom: "Avenue Koblan-Huberson", commune: "Marcory", quartier: "Hibiscus", longueurM: 1225 },
  { id: "91075",  codePada: "91075",  type: "AVENUE", nom: "Avenue Mohamed Diawara", commune: "Marcory", quartier: "Hibiscus", longueurM: 796 },
  { id: "91076",  codePada: "91076",  type: "AVENUE", nom: "Avenue Kacou Aoulou", commune: "Marcory", quartier: "Jean Baptiste Mockey", longueurM: 718 },
  { id: "163333", codePada: "163333", type: "AVENUE", nom: "Avenue Haycinthe Leroux", commune: "Marcory", quartier: "Jean Baptiste Mockey", longueurM: 1717 },
  { id: "163373", codePada: "163373", type: "AVENUE", nom: "Avenue Amadou Hampâté Bâ", commune: "Marcory", quartier: "Kablan Brou Fulgence", longueurM: 736 },
  { id: "164295", codePada: "164295", type: "AVENUE", nom: "Avenue Amagou Victor", commune: "Marcory", quartier: "Marie Koré", longueurM: 372 },
  { id: "164220", codePada: "164220", type: "AVENUE", nom: "Avenue Gris Camille", commune: "Marcory", quartier: "Résidentiel", longueurM: 2663 },
  { id: "157596", codePada: "157596", type: "AVENUE", nom: "Avenue Laurent Aké Assi", commune: "Marcory", quartier: "Sicogi", longueurM: 785 },
  { id: "94836",  codePada: "94836",  type: "AVENUE", nom: "Avenue Abdoulaye Sawadogo", commune: "Marcory", quartier: "Zone 4C", longueurM: 1550 },

  // --- PLATEAU ---
  { id: "165867", codePada: "165867", type: "AVENUE", nom: "Avenue Abdoulaye Fadiga", commune: "Plateau", quartier: "Cité Esculape", longueurM: 913 },
  { id: "165859", codePada: "165859", type: "AVENUE", nom: "Avenue Anne Marie Raggi", commune: "Plateau", quartier: "Commerce", longueurM: 646 },
  { id: "165860", codePada: "165860", type: "AVENUE", nom: "Avenue Appagny Tanoe", commune: "Plateau", quartier: "Commerce", longueurM: 141 },
  { id: "164894", codePada: "164894", type: "AVENUE", nom: "Avenue Botreau Roussel", commune: "Plateau", quartier: "Commerce", longueurM: 837 },
  { id: "164906", codePada: "164906", type: "AVENUE", nom: "Avenue Crosson Duplessis", commune: "Plateau", quartier: "Commerce", longueurM: 511 },
  { id: "164824", codePada: "164824", type: "AVENUE", nom: "Avenue de l'Abidjanaise", commune: "Plateau", quartier: "Commerce", longueurM: 323 },
  { id: "165865", codePada: "165865", type: "AVENUE", nom: "Avenue du Commerce", commune: "Plateau", quartier: "Commerce", longueurM: 892 },
  { id: "164905", codePada: "164905", type: "AVENUE", nom: "Avenue Lamblin", commune: "Plateau", quartier: "Commerce", longueurM: 474 },
  { id: "164816", codePada: "164816", type: "AVENUE", nom: "Avenue Mathieu Ekra", commune: "Plateau", quartier: "Commerce", longueurM: 942 },
  { id: "164871", codePada: "164871", type: "AVENUE", nom: "Avenue Charles Noguès", commune: "Plateau", quartier: "Commerce", longueurM: 523 },
  { id: "164927", codePada: "164927", type: "AVENUE", nom: "Avenue Nelson Mandela", commune: "Plateau", quartier: "Gare Lagune", longueurM: 363 },
  { id: "165868", codePada: "165868", type: "AVENUE", nom: "Avenue Jean Delafosse", commune: "Plateau", quartier: "KM - BIAO", longueurM: 417 },
  { id: "164948", codePada: "164948", type: "AVENUE", nom: "Avenue Charles Konan Banny", commune: "Plateau", quartier: "Mairie", longueurM: 583 },
  { id: "164952", codePada: "164952", type: "AVENUE", nom: "Avenue Antoine Konan Kanga", commune: "Plateau", quartier: "Plateau Centre", longueurM: 704 },
  { id: "165870", codePada: "165870", type: "AVENUE", nom: "Avenue Bernard Dadié", commune: "Plateau", quartier: "Plateau Centre", longueurM: 462 },
  { id: "164916", codePada: "164916", type: "AVENUE", nom: "Avenue Boa Amoakon Edjampan Tiemele", commune: "Plateau", quartier: "Plateau Centre", longueurM: 228 },
  { id: "164827", codePada: "164827", type: "AVENUE", nom: "Avenue Camille Aliali", commune: "Plateau", quartier: "Plateau Centre", longueurM: 1804 },
  { id: "168609", codePada: "168609", type: "AVENUE", nom: "Avenue Carde", commune: "Plateau", quartier: "Plateau Centre", longueurM: 1724 },
  { id: "164914", codePada: "164914", type: "AVENUE", nom: "Avenue Chardy", commune: "Plateau", quartier: "Plateau Centre", longueurM: 538 },
  { id: "164985", codePada: "164985", type: "AVENUE", nom: "Avenue Crozet", commune: "Plateau", quartier: "Plateau Centre", longueurM: 244 },
  { id: "165786", codePada: "165786", type: "AVENUE", nom: "Avenue John Creppy", commune: "Plateau", quartier: "Plateau Centre", longueurM: 227 },
  { id: "165008", codePada: "165008", type: "AVENUE", nom: "Avenue Edmond Basque", commune: "Plateau", quartier: "Plateau Centre", longueurM: 240 },
  { id: "164913", codePada: "164913", type: "AVENUE", nom: "Avenue Ernest N'Koumo Mobio", commune: "Plateau", quartier: "Plateau Centre", longueurM: 239 },
  { id: "164984", codePada: "164984", type: "AVENUE", nom: "Avenue Essy Amara", commune: "Plateau", quartier: "Plateau Centre", longueurM: 722 },
  { id: "164912", codePada: "164912", type: "AVENUE", nom: "Avenue Franchet d'Esperey", commune: "Plateau", quartier: "Plateau Centre", longueurM: 403 },
  { id: "171006", codePada: "171006", type: "AVENUE", nom: "Avenue Guy Nairay", commune: "Plateau", quartier: "Plateau Centre", longueurM: 257 },
  { id: "165791", codePada: "165791", type: "AVENUE", nom: "Avenue Jean-Paul II", commune: "Plateau", quartier: "Plateau Centre", longueurM: 991 },
  { id: "164982", codePada: "164982", type: "AVENUE", nom: "Avenue Jeanne Gervais", commune: "Plateau", quartier: "Plateau Centre", longueurM: 749 },
  { id: "164993", codePada: "164993", type: "AVENUE", nom: "Avenue Michel Kouassi Goly", commune: "Plateau", quartier: "Plateau Centre", longueurM: 243 },
  { id: "164986", codePada: "164986", type: "AVENUE", nom: "Avenue Seydou Diarra", commune: "Plateau", quartier: "Plateau Centre", longueurM: 235 },
  { id: "164917", codePada: "164917", type: "AVENUE", nom: "Avenue Terrasson de Fougères", commune: "Plateau", quartier: "Plateau Centre", longueurM: 285 },
  { id: "165796", codePada: "165796", type: "AVENUE", nom: "Avenue Clozel", commune: "Plateau", quartier: "Présidence", longueurM: 1019 },
  { id: "164944", codePada: "164944", type: "AVENUE", nom: "Avenue Emmanuel Dioulo", commune: "Plateau", quartier: "Présidence", longueurM: 239 },
  { id: "164934", codePada: "164934", type: "AVENUE", nom: "Avenue Amadou Gon Coulibaly", commune: "Plateau", quartier: "Présidence", longueurM: 845 },
  { id: "165794", codePada: "165794", type: "AVENUE", nom: "Avenue Ouattara Thomas d’Aquin", commune: "Plateau", quartier: "Quatre Villas", longueurM: 1087 },

  // --- PORT-BOUËT ---
  { id: "164855", codePada: "164855", type: "AVENUE", nom: "Avenue Alexandre Ayé Ayé", commune: "Port-Bouët", quartier: "Gonzagueville", longueurM: 3945 },
  { id: "164252", codePada: "164252", type: "AVENUE", nom: "Avenue Marie Koré", commune: "Port-Bouët", quartier: "Phare Littoral", longueurM: 2061 },
  { id: "165177", codePada: "165177", type: "AVENUE", nom: "Avenue Kouamé Konan N'Sikan", commune: "Port-Bouët", quartier: "Vridi 3 Foyers", longueurM: 3692 },

  // --- TREICHVILLE ---
  { id: "91055",  codePada: "91055",  type: "AVENUE", nom: "Avenue Nanan Yamousso", commune: "Treichville", quartier: "Arras 1", longueurM: 1892 },
  { id: "91066",  codePada: "91066",  type: "AVENUE", nom: "Avenue Djé Konan", commune: "Treichville", quartier: "Arras 2", longueurM: 1313 },
  { id: "163544", codePada: "163544", type: "AVENUE", nom: "Avenue de l'Union Africaine", commune: "Treichville", quartier: "Biafra", longueurM: 988 },
  { id: "163627", codePada: "163627", type: "AVENUE", nom: "Avenue Tidiane Dem", commune: "Treichville", quartier: "Boa Kassi", longueurM: 656 },
  { id: "91031",  codePada: "91031",  type: "AVENUE", nom: "Avenue Vamoussa Bamba", commune: "Treichville", quartier: "Boa Kassi", longueurM: 317 },
  { id: "163362", codePada: "163362", type: "AVENUE", nom: "Avenue Victor Biaka Boda", commune: "Treichville", quartier: "Boa Kassi", longueurM: 1396 },
  { id: "91046",  codePada: "91046",  type: "AVENUE", nom: "Avenue Gabriel Dadié", commune: "Treichville", quartier: "Ezan Pascal", longueurM: 482 },
  { id: "163580", codePada: "163580", type: "AVENUE", nom: "Avenue de la Loyauté", commune: "Treichville", quartier: "George Kassi", longueurM: 334 },
  { id: "163618", codePada: "163618", type: "AVENUE", nom: "Avenue Joseph Anoma", commune: "Treichville", quartier: "Nanan Yamousso", longueurM: 1769 },
  { id: "91048",  codePada: "91048",  type: "AVENUE", nom: "Avenue Abla Pokou", commune: "Treichville", quartier: "Notre Dame", longueurM: 1312 },
  { id: "91045",  codePada: "91045",  type: "AVENUE", nom: "Avenue Séry Koré", commune: "Treichville", quartier: "Pierre K.", longueurM: 618 },
  { id: "162806", codePada: "162806", type: "AVENUE", nom: "Avenue Achi Brou Marthe", commune: "Treichville", quartier: "Sococé", longueurM: 404 },
  { id: "162796", codePada: "162796", type: "AVENUE", nom: "Avenue Félix Ory", commune: "Treichville", quartier: "Sococé", longueurM: 1191 },
  { id: "162841", codePada: "162841", type: "AVENUE", nom: "Avenue Christiani", commune: "Treichville", quartier: "Zone Portuaire", longueurM: 1965 },
  { id: "164300", codePada: "164300", type: "AVENUE", nom: "Avenue Désiré Boni", commune: "Treichville", quartier: "Zone Portuaire", longueurM: 384 },
  { id: "164114", codePada: "164114", type: "AVENUE", nom: "Avenue Francis Wodié", commune: "Treichville", quartier: "Zone Portuaire", longueurM: 2587 },

  // --- YOPOUGON ---
  { id: "167198", codePada: "167198", type: "AVENUE", nom: "Avenue Koffi Attobra", commune: "Yopougon", quartier: "Ananeraie", longueurM: 385 },
  { id: "166167", codePada: "166167", type: "AVENUE", nom: "Avenue Idriss Koudouss", commune: "Yopougon", quartier: "Ananeraie", longueurM: 1416 },
  { id: "166150", codePada: "166150", type: "AVENUE", nom: "Avenue Kouisson Keletigui", commune: "Yopougon", quartier: "Banco 2", longueurM: 847 },
  { id: "165774", codePada: "165774", type: "AVENUE", nom: "Avenue Alain Belkiri", commune: "Yopougon", quartier: "Banco Nord", longueurM: 2412 },
  { id: "166121", codePada: "166121", type: "AVENUE", nom: "Avenue Gaston Oulaï", commune: "Yopougon", quartier: "Banco Nord", longueurM: 391 },
  { id: "165775", codePada: "165775", type: "AVENUE", nom: "Avenue Marguerite Sakoum", commune: "Yopougon", quartier: "Banco Nord", longueurM: 439 },
  { id: "166147", codePada: "166147", type: "AVENUE", nom: "Avenue Pascal Affi N'Guessan", commune: "Yopougon", quartier: "Niangon Nord 1ère Tranche", longueurM: 1273 },
  { id: "166181", codePada: "166181", type: "AVENUE", nom: "Avenue Antonin Dioulo", commune: "Yopougon", quartier: "Niangon Nord 2ème Tranche", longueurM: 3637 },
  { id: "167203", codePada: "167203", type: "AVENUE", nom: "Avenue Zézé Baroan", commune: "Yopougon", quartier: "Niangon Nord 2ème Tranche", longueurM: 3088 },
  { id: "166143", codePada: "166143", type: "AVENUE", nom: "Avenue Laurent Mandjo", commune: "Yopougon", quartier: "Niangon Sud Est", longueurM: 2555 },
  { id: "166144", codePada: "166144", type: "AVENUE", nom: "Avenue Adama Coulibaly Nibizana", commune: "Yopougon", quartier: "Niangon Sud Ouest", longueurM: 1999 },
  { id: "166182", codePada: "166182", type: "AVENUE", nom: "Avenue Frédéric Grah-Mel", commune: "Yopougon", quartier: "Niangon Sud Ouest", longueurM: 3133 },
  { id: "167180", codePada: "167180", type: "AVENUE", nom: "Avenue Cheick Boikary Fofana", commune: "Yopougon", quartier: "Port Bouët 2", longueurM: 2187 },
  { id: "166146", codePada: "166146", type: "AVENUE", nom: "Avenue Aimé Césaire", commune: "Yopougon", quartier: "Yopougon Attié", longueurM: 3054 },
  { id: "166148", codePada: "166148", type: "AVENUE", nom: "Avenue Alain Ekra", commune: "Yopougon", quartier: "Yopougon Attié", longueurM: 2964 },
  { id: "166119", codePada: "166119", type: "AVENUE", nom: "Avenue Denis Bra Kanon", commune: "Yopougon", quartier: "Yopougon Attié", longueurM: 1225 },
  { id: "166137", codePada: "166137", type: "AVENUE", nom: "Avenue Jacqueline Lohoues-Oble", commune: "Yopougon", quartier: "Yopougon Attié", longueurM: 3981 },
  { id: "166151", codePada: "166151", type: "AVENUE", nom: "Avenue Youssouf Bakayoko", commune: "Yopougon", quartier: "Yopougon Attié", longueurM: 1103 },
  { id: "166179", codePada: "166179", type: "AVENUE", nom: "Avenue Émile Brou", commune: "Yopougon", quartier: "Yopougon Banco Sud", longueurM: 2758 },
  { id: "166168", codePada: "166168", type: "AVENUE", nom: "Avenue Jean Michel Moulot", commune: "Yopougon", quartier: "Yopougon Hopital", longueurM: 722 },
  { id: "166157", codePada: "166157", type: "AVENUE", nom: "Avenue Gilbert Kafana Koné", commune: "Yopougon", quartier: "Yopougon Kouté", longueurM: 1959 },
  { id: "166117", codePada: "166117", type: "AVENUE", nom: "Avenue Amadou Soumahoro", commune: "Yopougon", quartier: "Yopougon Kouté", longueurM: 1591 },
  { id: "166180", codePada: "166180", type: "AVENUE", nom: "Avenue Diakité Coty", commune: "Yopougon", quartier: "Yopougon Kouté", longueurM: 1707 },
];

// ══════════════════════════════════════════════════════════════════════════════
// 3. FONCTIONS DE RECHERCHE INTELLIGENTE & FILTRAGE
// ══════════════════════════════════════════════════════════════════════════════

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Recherche instantanée et tolérante dans le référentiel PADA.
 * Filtre par :
 * - Nom officiel de la voie (ex: "Gadeau", "Arafat", "Victor Doh")
 * - Ancien nom populaire (ex: "Mitterrand", "VGE", "Marseille")
 * - Code PADA / ID Voie (ex: "166710", "PADA-B-015")
 * - Commune et/ou Quartier (optionnels)
 */
export function searchPadaWays(query: string, commune?: string, quartier?: string): PadaWay[] {
  const normQuery = normalizeText(query.trim());
  const allWays: PadaWay[] = [...PADA_BOULEVARDS, ...PADA_AVENUES];

  return allWays.filter((way) => {
    // Filtrage commune si précisée
    if (commune && way.commune && !way.commune.toLowerCase().includes(commune.toLowerCase())) {
      // Les boulevards peuvent être transversaux
      if (way.type !== "BOULEVARD") return false;
    }

    // Filtrage quartier si précisé (uniquement pour Avenues & Rues rattachées)
    if (quartier && way.quartier && normalizeText(way.quartier) !== normalizeText(quartier)) {
      if (way.type !== "BOULEVARD") return false;
    }

    if (!normQuery) return true;

    // Correspondance sur nom officiel
    if (normalizeText(way.nom).includes(normQuery)) return true;

    // Correspondance sur ancien nom
    if (way.ancienNom && normalizeText(way.ancienNom).includes(normQuery)) return true;

    // Correspondance sur code PADA / ID
    if (way.codePada && normalizeText(way.codePada).includes(normQuery)) return true;
    if (way.id && normalizeText(way.id).includes(normQuery)) return true;

    return false;
  });
}

/**
 * Récupère toutes les voies associées à un quartier spécifique
 */
export function getWaysForQuartier(commune: string, quartier: string): PadaWay[] {
  const normQuartier = normalizeText(quartier);
  const avenues = PADA_AVENUES.filter(
    (w) => w.commune.toLowerCase() === commune.toLowerCase() && w.quartier && normalizeText(w.quartier) === normQuartier
  );
  // Ajoute les boulevards de la commune
  const boulevards = PADA_BOULEVARDS.filter((b) => b.commune.toLowerCase().includes(commune.toLowerCase()));

  return [...boulevards, ...avenues];
}
