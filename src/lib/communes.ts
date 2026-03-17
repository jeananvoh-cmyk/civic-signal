export interface Commune {
  nom: string;
  centerLat: number;
  centerLon: number;
  rayonM: number;
  population: number;
  couleur: string;
}

export const COMMUNES: Commune[] = [
  { nom: "Abobo", centerLat: 5.4161, centerLon: -4.0159, rayonM: 5000, population: 1340083, couleur: "#3B82F6" },
  { nom: "Adjamé", centerLat: 5.3360, centerLon: -4.0170, rayonM: 3000, population: 340892, couleur: "#F59E0B" },
  { nom: "Bingerville", centerLat: 5.3500, centerLon: -3.8830, rayonM: 6300, population: 204656, couleur: "#8B5CF6" },
  { nom: "Cocody", centerLat: 5.3600, centerLon: -3.9670, rayonM: 6500, population: 692583, couleur: "#10B981" },
  { nom: "Koumassi", centerLat: 5.3000, centerLon: -3.9500, rayonM: 4000, population: 412282, couleur: "#EC4899" },
  { nom: "Port-Bouët", centerLat: 5.2350, centerLon: -3.9667, rayonM: 4500, population: 618795, couleur: "#F97316" },
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
  // First pass: find all communes whose radius covers this position
  // Pick the one where the user is deepest inside (smallest distance relative to radius)
  let bestInside: Commune | null = null;
  let bestInsideDist = Infinity;

  // Also track absolute nearest for fallback
  let nearest: Commune | null = null;
  let nearestDist = Infinity;

  for (const c of COMMUNES) {
    const d = haversineDistance(lat, lon, c.centerLat, c.centerLon);

    // Track absolute nearest
    if (d < nearestDist) {
      nearestDist = d;
      nearest = c;
    }

    // If within this commune's radius, prefer the closest center
    if (d <= c.rayonM && d < bestInsideDist) {
      bestInsideDist = d;
      bestInside = c;
    }
  }

  if (bestInside) {
    return { commune: bestInside, distance: bestInsideDist, isInPilotZone: true };
  }

  // Not inside any commune's radius
  return { commune: nearest, distance: nearestDist, isInPilotZone: false };
};
