/**
 * Répertoire officiel des codes d'adresses PADA
 * Ministère de la Construction, du Logement et de l'Urbanisme (MCLU)
 * 
 * Code Département : 002 (Abidjan)
 * Format officiel d'adresse : [N° métrique], [Nom de la Voie] [002-CodeCommune], [Abidjan - Commune]
 * Exemple officiel MCLU : "495, Boulevard de la RÉPUBLIQUE 002-17, Abidjan - Plateau"
 */

export interface PadaCommuneCode {
  commune: string;
  codeDept: string; // '002'
  codeSp: string;   // '02', '14', etc.
  codeComplet: string; // '002-14'
}

export const PADA_COMMUNE_CODES: Record<string, PadaCommuneCode> = {
  Anyama: { commune: "Anyama", codeDept: "002", codeSp: "02", codeComplet: "002-02" },
  Bingerville: { commune: "Bingerville", codeDept: "002", codeSp: "03", codeComplet: "002-03" },
  Brofodoumé: { commune: "Brofodoumé", codeDept: "002", codeSp: "04", codeComplet: "002-04" },
  Songon: { commune: "Songon", codeDept: "002", codeSp: "05", codeComplet: "002-05" },
  Abobo: { commune: "Abobo", codeDept: "002", codeSp: "11", codeComplet: "002-11" },
  Adjamé: { commune: "Adjamé", codeDept: "002", codeSp: "12", codeComplet: "002-12" },
  Attécoubé: { commune: "Attécoubé", codeDept: "002", codeSp: "13", codeComplet: "002-13" },
  Cocody: { commune: "Cocody", codeDept: "002", codeSp: "14", codeComplet: "002-14" },
  Koumassi: { commune: "Koumassi", codeDept: "002", codeSp: "15", codeComplet: "002-15" },
  Marcory: { commune: "Marcory", codeDept: "002", codeSp: "16", codeComplet: "002-16" },
  Plateau: { commune: "Plateau", codeDept: "002", codeSp: "17", codeComplet: "002-17" },
  "Port-Bouët": { commune: "Port-Bouët", codeDept: "002", codeSp: "18", codeComplet: "002-18" },
  Treichville: { commune: "Treichville", codeDept: "002", codeSp: "19", codeComplet: "002-19" },
  Yopougon: { commune: "Yopougon", codeDept: "002", codeSp: "20", codeComplet: "002-20" },
  "Grand-Bassam": { commune: "Grand-Bassam", codeDept: "003", codeSp: "01", codeComplet: "003-01" },
};

export function getPadaCode(commune: string): string {
  return PADA_COMMUNE_CODES[commune]?.codeComplet ?? "002-00";
}
