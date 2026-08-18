/**
 * Système d'Adressage National (PADA / MCLU) & Tickets SIGNA·CI
 * Ministère de la Construction, du Logement et de l'Urbanisme - République de Côte d'Ivoire
 */

export interface PadaCommuneInfo {
  codeDept: string;
  codeSp: string;
  codeComplet: string;
  commune: string;
  trigramme: string;
}

export const PADA_COMMUNES: Record<string, PadaCommuneInfo> = {
  Abobo: { codeDept: "002", codeSp: "11", codeComplet: "002-11", commune: "Abobo", trigramme: "ABO" },
  Adjamé: { codeDept: "002", codeSp: "12", codeComplet: "002-12", commune: "Adjamé", trigramme: "ADJ" },
  Anyama: { codeDept: "002", codeSp: "02", codeComplet: "002-02", commune: "Anyama", trigramme: "ANY" },
  Attécoubé: { codeDept: "002", codeSp: "13", codeComplet: "002-13", commune: "Attécoubé", trigramme: "ATT" },
  Bingerville: { codeDept: "002", codeSp: "03", codeComplet: "002-03", commune: "Bingerville", trigramme: "BIN" },
  Cocody: { codeDept: "002", codeSp: "14", codeComplet: "002-14", commune: "Cocody", trigramme: "COC" },
  Koumassi: { codeDept: "002", codeSp: "15", codeComplet: "002-15", commune: "Koumassi", trigramme: "KOU" },
  Marcory: { codeDept: "002", codeSp: "16", codeComplet: "002-16", commune: "Marcory", trigramme: "MAR" },
  Plateau: { codeDept: "002", codeSp: "17", codeComplet: "002-17", commune: "Plateau", trigramme: "PLA" },
  "Port-Bouët": { codeDept: "002", codeSp: "18", codeComplet: "002-18", commune: "Port-Bouët", trigramme: "PTB" },
  Songon: { codeDept: "002", codeSp: "05", codeComplet: "002-05", commune: "Songon", trigramme: "SON" },
  Treichville: { codeDept: "002", codeSp: "19", codeComplet: "002-19", commune: "Treichville", trigramme: "TRE" },
  Yopougon: { codeDept: "002", codeSp: "20", codeComplet: "002-20", commune: "Yopougon", trigramme: "YOP" },
  "Grand-Bassam": { codeDept: "002", codeSp: "21", codeComplet: "002-21", commune: "Grand-Bassam", trigramme: "BAS" },
};

/**
 * Récupère le trigramme officiel d'une commune
 */
export function getCommuneTrigramme(commune: string): string {
  const info = PADA_COMMUNES[commune];
  if (info) return info.trigramme;
  return commune.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "CIV";
}

/**
 * Récupère le code postal cadastral officiel PADA (ex: 002-14)
 */
export function getCommunePadaCode(commune: string): string {
  const info = PADA_COMMUNES[commune];
  return info ? info.codeComplet : "002-XX";
}

/**
 * Génère un Ticket Code au format : SIG-[COMMUNE_3L]-[AAAAMMJJ]-[NUMERO]
 * Ex: SIG-COC-20260818-0001
 */
export function formatTicketCode(commune: string, date: Date = new Date(), sequence: number = 1): string {
  const trigramme = getCommuneTrigramme(commune);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const seqStr = String(sequence).padStart(4, "0");
  return `SIG-${trigramme}-${year}${month}${day}-${seqStr}`;
}

/**
 * Formate une adresse selon la norme du Ministère de la Construction (MCLU)
 * Ex: "495, Boulevard de la RÉPUBLIQUE 002-17, Abidjan - Plateau (Commerce)"
 */
export function formatPadaAddress(params: {
  streetName?: string | null;
  streetNumber?: string | number | null;
  commune: string;
  quartier?: string | null;
}): string {
  const { streetName, streetNumber, commune, quartier } = params;
  const padaCode = getCommunePadaCode(commune);
  const numberPrefix = streetNumber ? `${streetNumber}, ` : "";
  const street = streetName?.trim() || "Voie non dénommée";
  const quartierSuffix = quartier ? ` (${quartier})` : "";

  return `${numberPrefix}${street} ${padaCode}, Abidjan - ${commune}${quartierSuffix}`;
}

/**
 * Extrait un identifiant lisible depuis un UUID si ticket_code n'est pas encore disponible
 */
export function getDisplayTicketCode(report: {
  ticket_code?: string | null;
  commune?: string | null;
  created_at?: string | null;
  id?: string;
}): string {
  if (report.ticket_code) return report.ticket_code;
  const commune = report.commune || "Abidjan";
  const date = report.created_at ? new Date(report.created_at) : new Date();
  const trigramme = getCommuneTrigramme(commune);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const shortId = (report.id || "0000").replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();
  return `SIG-${trigramme}-${year}${month}${day}-${shortId}`;
}
