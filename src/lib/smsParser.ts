// ═══════════════════════════════════════════════════════════════════
// PARSER SMS CIE PRÉPAYÉ — SIGNA-CI
// Gère les différents formats de SMS envoyés par la CIE en CI
// ═══════════════════════════════════════════════════════════════════

export interface ParsedRecharge {
  kwh_purchased: number | null;
  amount_fcfa: number | null;
  energy_fcfa: number | null;
  taxes_fcfa: number | null;
  token_code: string | null;
  meter_number: string | null;
  reference: string | null;
  recharged_at: Date | null;
  confidence: "high" | "medium" | "low"; // fiabilité du parsing
}

/** Normalise un texte : retire accents, minuscules, espaces multiples */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Extrait un nombre depuis une chaîne (ex: "50.0kWh" → 50) */
function extractNumber(s: string): number | null {
  const m = s.replace(/\s/g, "").match(/[\d]+([.,][\d]+)?/);
  if (!m) return null;
  return parseFloat(m[0].replace(",", "."));
}

/** Essaie de parser une date depuis différents formats */
function parseDate(s: string): Date | null {
  // "15/04/2026 14:32" ou "15-04-2026 14h32" ou "15/04/2026"
  const m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[T\s](\d{1,2})[:h](\d{2}))?/);
  if (!m) return null;
  const [, d, mo, y, h = "0", min = "0"] = m;
  const dt = new Date(+y, +mo - 1, +d, +h, +min);
  return isNaN(dt.getTime()) ? null : dt;
}

/**
 * Parse un SMS / texte de recharge CIE prépayé.
 *
 * Format observé en CI (exemple réel) :
 *   Code rechargement: 0418 4740 7072 0959 8153
 *   Ctr: 42057649321
 *   Ref: 0210550706210
 *   Mt Energie: 6390.22
 *   Prime fixe: 696.90
 *   R-RTI: 226.86
 *   RER: 98.31
 *   TEOM: 189.05
 *   kWh: 75.62
 *   Redevance brch: 2398.67
 *   Total général: 10000 dont TVA 1081.086
 *   Recu: aaec5a7f45
 *   2025-08-29 20:21:24
 */
export function parseCieSms(raw: string): ParsedRecharge {
  const n = normalize(raw);
  const result: ParsedRecharge = {
    kwh_purchased: null,
    amount_fcfa: null,
    energy_fcfa: null,
    taxes_fcfa: null,
    token_code: null,
    meter_number: null,
    reference: null,
    recharged_at: null,
    confidence: "low",
  };

  let fieldsFound = 0;

  // ── kWh ──────────────────────────────────────────────────────────
  // Formats : "kWh: 75.62" | "kwh: 50.0kwh" | "50 kwh"
  const kwhPatterns = [
    /\bkwh\s*[:\-]?\s*([\d,\.]+)/,           // "kWh: 75.62"  (format CIE réel)
    /([\d,\.]+)\s*kwh\b/,                     // "75.62kWh"
    /(?:energie|energy|énergie)\s*[:\-]?\s*([\d,\.]+)/,
  ];
  for (const p of kwhPatterns) {
    const m = n.match(p);
    if (m) {
      result.kwh_purchased = parseFloat(m[1].replace(",", "."));
      fieldsFound++;
      break;
    }
  }

  // ── Montant total ─────────────────────────────────────────────────
  // "Total général: 10000" | "montant: 5000 fcfa"
  const amountPatterns = [
    /(?:total\s*g[eé]n[eé]ral|total)\s*[:\-]?\s*([\d\s,\.]+)/,
    /(?:montant|somme)\s*[:\-]?\s*([\d\s,\.]+)\s*(?:f|fcfa|xof|cfa)?/,
    /([\d\s]{4,})\s*(?:fcfa|xof|cfa)\b/,
  ];
  for (const p of amountPatterns) {
    const m = n.match(p);
    if (m) {
      const v = extractNumber(m[1]);
      if (v && v > 100) {
        result.amount_fcfa = v;
        fieldsFound++;
        break;
      }
    }
  }

  // ── Montant énergie (hors taxes) ──────────────────────────────────
  // "Mt Energie: 6390.22"
  const energyAmtPatterns = [
    /(?:mt\s*energie|montant\s*[eé]nergie|cout\s*[eé]nergie)\s*[:\-]?\s*([\d\s,\.]+)/,
    /(?:ht|hors\s*taxe)\s*[:\-]?\s*([\d\s,\.]+)/,
  ];
  for (const p of energyAmtPatterns) {
    const m = n.match(p);
    if (m) {
      const v = extractNumber(m[1]);
      if (v && v > 0) { result.energy_fcfa = v; break; }
    }
  }

  // ── Taxes (TVA extraite du "dont TVA") ───────────────────────────
  // "Total général: 10000 dont TVA 1081.086"
  const taxPatterns = [
    /dont\s*tva\s*([\d,\.]+)/,
    /(?:tva|taxes?)\s*[:\-]?\s*([\d\s,\.]+)/,
  ];
  for (const p of taxPatterns) {
    const m = n.match(p);
    if (m) {
      const v = extractNumber(m[1]);
      if (v) { result.taxes_fcfa = v; break; }
    }
  }

  // ── Code token ────────────────────────────────────────────────────
  // "Code rechargement: 0418 4740 7072 0959 8153"
  const tokenPatterns = [
    /(?:code\s*rechargement?|token|jeton|code)\s*[:\-]?\s*([\d][\d\s]{14,23}[\d])/i,
    /\b(\d{4}[\s]\d{4}[\s]\d{4}[\s]\d{4}[\s]\d{4})\b/,
    /\b(\d{20})\b/,
  ];
  for (const p of tokenPatterns) {
    const m = raw.match(p);
    if (m) {
      result.token_code = m[1].replace(/\s+/g, " ").trim();
      fieldsFound++;
      break;
    }
  }

  // ── N° compteur ───────────────────────────────────────────────────
  // "Ctr: 42057649321"
  const meterPatterns = [
    /\bctr\s*[:\-]?\s*([\d]{6,})/i,                           // "Ctr: 42057649321"
    /(?:compteur|n°\s*compteur|num\.?\s*compteur)\s*[:\-]?\s*([\d\-A-Za-z]{4,20})/i,
  ];
  for (const p of meterPatterns) {
    const m = raw.match(p);
    if (m) {
      result.meter_number = m[1].trim();
      fieldsFound++;
      break;
    }
  }

  // ── Référence transaction ─────────────────────────────────────────
  // "Ref: 0210550706210" | "Recu: aaec5a7f45"
  const refPatterns = [
    /\bref\s*[:\-]?\s*([A-Za-z0-9]{8,20})/i,
    /\brecu\s*[:\-]?\s*([A-Za-z0-9]{6,20})/i,
    /(?:reference|transaction|id)\s*[:\-]?\s*([A-Za-z0-9]{6,20})/i,
  ];
  for (const p of refPatterns) {
    const m = raw.match(p);
    if (m) {
      result.reference = m[1].trim();
      break;
    }
  }

  // ── Date ──────────────────────────────────────────────────────────
  // "2025-08-29 20:21:24" | "15/04/2026 14:32"
  const datePatterns = [
    /(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2})?)/,        // ISO
    /(?:date|le|du)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}(?:\s+\d{1,2}[h:]\d{2})?)/i,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/,
  ];
  for (const p of datePatterns) {
    const m = raw.match(p);
    if (m) {
      const d = new Date(m[1]);
      if (!isNaN(d.getTime())) { result.recharged_at = d; fieldsFound++; break; }
      result.recharged_at = parseDate(m[1]);
      if (result.recharged_at) { fieldsFound++; break; }
    }
  }

  // ── Niveau de confiance ───────────────────────────────────────────
  if (result.kwh_purchased && fieldsFound >= 3) result.confidence = "high";
  else if (result.kwh_purchased && fieldsFound >= 2) result.confidence = "medium";
  else result.confidence = "low";

  return result;
}
