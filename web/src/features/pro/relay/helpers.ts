import {
  extractInfraLabel,
  INFRA_CIE,
  INFRA_SODECI,
  isInfraLabel,
} from "@/lib/report-display";

/**
 * Rigorously distinguishes Infrastructure reports (lampadaire, fuite, caniveau, poteau) from Service Outages (coupures d'eau/électricité).
 */
export function checkIfInfra(category?: string | null, description?: string | null): boolean {
  const desc = (description || "").trim();
  const tag = desc ? extractInfraLabel(desc) : null;
  
  if (tag) {
    const lowerTag = tag.toLowerCase();
    // Explicit outage keywords override
    if (lowerTag.includes("coupure") || lowerTag.includes("outage") || lowerTag.includes("interruption") || lowerTag.includes("panne d'électricité") || lowerTag.includes("panne d'eau")) {
      return false;
    }
    if (INFRA_CIE.has(tag) || INFRA_SODECI.has(tag) || isInfraLabel(tag)) {
      return true;
    }
  }

  const cat = (category || "").toLowerCase();
  if (cat === "outage" || cat.includes("outage") || cat.includes("coupure")) return false;
  if (cat === "infrastructure" || cat.includes("infra") || cat.includes("eclairage") || cat.includes("voirie") || cat.includes("street_light") || cat.includes("water_leak")) return true;

  return false;
}
