export interface Commune {
  nom: string;
  centerLat: number;
  centerLon: number;
  rayonM: number;
  population: number;
  couleur: string;
}

export const COMMUNES: Commune[] = [
  { nom: "Abobo", centerLat: 5.4167, centerLon: -4.0200, rayonM: 5000, population: 1400000, couleur: "#3B82F6" },
  { nom: "Adjamé", centerLat: 5.3530, centerLon: -4.0220, rayonM: 2000, population: 422000, couleur: "#F59E0B" },
  { nom: "Bingerville", centerLat: 5.3550, centerLon: -3.8900, rayonM: 6300, population: 115000, couleur: "#8B5CF6" },
  { nom: "Cocody", centerLat: 5.3480, centerLon: -3.9750, rayonM: 6500, population: 541000, couleur: "#10B981" },
  { nom: "Yopougon", centerLat: 5.3364, centerLon: -4.0833, rayonM: 7000, population: 1571065, couleur: "#DC2626" },
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
