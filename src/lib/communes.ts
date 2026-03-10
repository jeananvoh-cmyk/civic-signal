export interface Commune {
  nom: string;
  centerLat: number;
  centerLon: number;
  rayonM: number;
  population: number;
  couleur: string;
}

export const COMMUNES: Commune[] = [
  { nom: "Abobo", centerLat: 5.4161, centerLon: -4.0159, rayonM: 5000, population: 1400000, couleur: "#3B82F6" },
  { nom: "Adjamé", centerLat: 5.3360, centerLon: -4.0170, rayonM: 2000, population: 422000, couleur: "#F59E0B" },
  { nom: "Bingerville", centerLat: 5.3500, centerLon: -3.8830, rayonM: 6300, population: 115000, couleur: "#8B5CF6" },
  { nom: "Cocody", centerLat: 5.3600, centerLon: -3.9670, rayonM: 6500, population: 447055, couleur: "#10B981" },
  { nom: "Koumassi", centerLat: 5.3000, centerLon: -3.9500, rayonM: 2500, population: 428020, couleur: "#EC4899" },
  { nom: "Port-Bouët", centerLat: 5.2500, centerLon: -3.9667, rayonM: 7000, population: 365006, couleur: "#F97316" },
  { nom: "Yopougon", centerLat: 5.3177, centerLon: -4.0900, rayonM: 12000, population: 1571065, couleur: "#DC2626" },
];

export const COMMUNE_COLORS: Record<string, string> = Object.fromEntries(
  COMMUNES.map((c) => [c.nom, c.couleur])
);

/** Haversine distance in meters */
export const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export interface CommuneResult {
  commune: Commune | null;
  distance: number;
  isInPilotZone: boolean;
}

export const findNearestCommune = (lat: number, lon: number): CommuneResult => {
  let best: Commune | null = null;
  let bestDist = Infinity;
  for (const c of COMMUNES) {
    const d = haversineDistance(lat, lon, c.centerLat, c.centerLon);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  // User is in pilot zone only if within the commune's radius
  const isInPilotZone = best !== null && bestDist <= best.rayonM;
  return { commune: best, distance: bestDist, isInPilotZone };
};
