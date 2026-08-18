export interface Commune {
  nom: string;
  centerLat: number;
  centerLon: number;
  rayonM: number;
  population: number;
  couleur: string;
}

/**
 * 14 Communes du Grand Abidjan en ordre alphabétique strict (A -> Z)
 */
export const COMMUNES: Commune[] = [
  { nom: "Abobo", centerLat: 5.4161, centerLon: -4.0159, rayonM: 6000, population: 1340083, couleur: "#3B82F6" },
  { nom: "Adjamé", centerLat: 5.3360, centerLon: -4.0170, rayonM: 3500, population: 340892, couleur: "#F59E0B" },
  { nom: "Anyama", centerLat: 5.4950, centerLon: -4.0500, rayonM: 7000, population: 389592, couleur: "#14B8A6" },
  { nom: "Attécoubé", centerLat: 5.3350, centerLon: -4.0400, rayonM: 4000, population: 313135, couleur: "#E11D48" },
  { nom: "Bingerville", centerLat: 5.3500, centerLon: -3.8830, rayonM: 6300, population: 204656, couleur: "#8B5CF6" },
  { nom: "Cocody", centerLat: 5.3600, centerLon: -3.9670, rayonM: 7000, population: 692583, couleur: "#10B981" },
  { nom: "Grand-Bassam", centerLat: 5.2000, centerLon: -3.7330, rayonM: 6500, population: 124567, couleur: "#0EA5E9" },
  { nom: "Koumassi", centerLat: 5.3000, centerLon: -3.9500, rayonM: 4500, population: 412282, couleur: "#EC4899" },
  { nom: "Marcory", centerLat: 5.3050, centerLon: -3.9850, rayonM: 4000, population: 214061, couleur: "#06B6D4" },
  { nom: "Plateau", centerLat: 5.3250, centerLon: -4.0200, rayonM: 2500, population: 7186, couleur: "#6366F1" },
  { nom: "Port-Bouët", centerLat: 5.2350, centerLon: -3.9667, rayonM: 6500, population: 618795, couleur: "#F97316" },
  { nom: "Songon", centerLat: 5.3180, centerLon: -4.2600, rayonM: 9000, population: 89778, couleur: "#A855F7" },
  { nom: "Treichville", centerLat: 5.3000, centerLon: -4.0100, rayonM: 3000, population: 106552, couleur: "#84CC16" },
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

    // Check if inside coverage radius
    if (d <= c.rayonM) {
      // Relative depth: distance / radius (lower = closer to center)
      const relativeDepth = d / c.rayonM;
      if (relativeDepth < bestInsideDist) {
        bestInsideDist = relativeDepth;
        bestInside = c;
      }
    }
  }

  if (bestInside) {
    return {
      commune: bestInside,
      distance: Math.round(haversineDistance(lat, lon, bestInside.centerLat, bestInside.centerLon)),
      isInPilotZone: true,
    };
  }

  // Outside all pilot zones - return nearest with isInPilotZone: false
  return {
    commune: nearest,
    distance: nearest ? Math.round(nearestDist) : Infinity,
    isInPilotZone: false,
  };
};
