/**
 * Approximate polygon boundaries for Abidjan's 5 pilot communes.
 *
 * Coordinates: [longitude, latitude] — GeoJSON convention.
 *
 * These simplified convex polygons cover the core of each commune with
 * ~200–400 m margin at borders.  Edge cases at commune boundaries fall
 * through to the Nominatim API tier (see geolocation.ts).
 *
 * Geographic reference:
 *   Yopougon  : west of the lagoon inlet, large northern extension
 *   Adjamé    : small commercial district, tested first (highest priority)
 *   Abobo     : large northern commune above Adjamé
 *   Cocody    : eastern residential, east of the lagoon
 *   Koumassi  : south-central, between Marcory and Port-Bouët
 *   Port-Bouët: southernmost commune, Atlantic coast & airport peninsula
 *   Bingerville: separate eastern town, ~20 km east of Plateau
 */

type Polygon = [number, number][]; // [lon, lat]

export interface CommunePolygon {
  nom: string;
  polygon: Polygon;
}

/**
 * Communes ordered smallest → largest so that tight zones (Adjamé) are
 * matched before larger overlapping ones when running the ray-cast loop.
 */
export const COMMUNE_POLYGONS: CommunePolygon[] = [
  {
    // Smallest commune — test first to avoid false positives from larger zones
    nom: "Adjamé",
    polygon: [
      [-4.042, 5.336],
      [-3.998, 5.336],
      [-3.996, 5.375],
      [-4.005, 5.386],
      [-4.042, 5.379],
    ],
  },
  {
    // Separate eastern town; tight rectangle avoids collision with Cocody
    nom: "Bingerville",
    polygon: [
      [-3.926, 5.297],
      [-3.847, 5.297],
      [-3.839, 5.413],
      [-3.921, 5.419],
    ],
  },
  {
    // Large western commune (NW quadrant of Abidjan)
    nom: "Yopougon",
    polygon: [
      [-4.186, 5.227],
      [-4.048, 5.227],
      [-4.040, 5.382],
      [-4.052, 5.446],
      [-4.186, 5.446],
    ],
  },
  {
    // Large northern commune, starts above Adjamé's northern border
    nom: "Abobo",
    polygon: [
      [-4.071, 5.375],
      [-3.967, 5.375],
      [-3.967, 5.466],
      [-4.071, 5.466],
    ],
  },
  {
    // Eastern residential commune (east of the lagoon)
    nom: "Cocody",
    polygon: [
      [-3.999, 5.288],
      [-3.915, 5.288],
      [-3.915, 5.419],
      [-3.999, 5.419],
    ],
  },
  {
    // South-central commune between Marcory and Port-Bouët
    nom: "Koumassi",
    polygon: [
      [-4.022, 5.276],
      [-3.958, 5.276],
      [-3.958, 5.342],
      [-4.022, 5.342],
    ],
  },
  {
    // Southernmost commune: Atlantic coast + airport peninsula (FHB airport ~5.261°N 3.926°W)
    nom: "Port-Bouët",
    polygon: [
      [-4.028, 5.198],
      [-3.868, 5.198],
      [-3.868, 5.278],
      [-4.028, 5.278],
    ],
  },
];

// ── Ray-casting point-in-polygon ─────────────────────────────────────────────

/**
 * Returns true when the point (lat, lon) lies inside the given polygon.
 * Uses the standard even-odd ray-casting algorithm.
 *
 * @param lat  - WGS-84 latitude
 * @param lon  - WGS-84 longitude
 * @param polygon - vertices as [lon, lat] pairs (GeoJSON order)
 */
export function pointInPolygon(
  lat: number,
  lon: number,
  polygon: Polygon
): boolean {
  let inside = false;
  const n = polygon.length;
  let j = n - 1;

  for (let i = 0; i < n; i++) {
    const xi = polygon[i][0]; // lon of vertex i
    const yi = polygon[i][1]; // lat of vertex i
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    // Horizontal ray cast from (lon, lat) eastward
    const intersects =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
    j = i;
  }

  return inside;
}

/**
 * Returns the commune name if (lat, lon) falls inside one of the pilot
 * commune polygons, or null otherwise.
 *
 * Communes are tested in priority order (smallest first).
 */
export function findCommuneByPolygon(lat: number, lon: number): string | null {
  for (const cp of COMMUNE_POLYGONS) {
    if (pointInPolygon(lat, lon, cp.polygon)) {
      return cp.nom;
    }
  }
  return null;
}
