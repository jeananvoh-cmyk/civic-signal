/**
 * Multi-tier commune resolution from a GPS coordinate.
 *
 * Resolution chain — ordered by latency / cost:
 *
 *   Tier 1 ─ GeoJSON polygon      instant · offline · free
 *             Ray-cast on in-memory commune polygons.
 *             Skipped when GPS accuracy > 200 m (point is too uncertain
 *             to trust polygon edges).
 *
 *   Tier 2 ─ Nominatim (OSM)      ~300 ms · free · requires internet
 *             Reverse-geocoding via OpenStreetMap's public API.
 *             No API key required. Rate limit: 1 req/s (fine for our usage).
 *
 *   Tier 3 ─ Google Geocoding     ~200 ms · paid · requires VITE_GOOGLE_GEOCODING_KEY
 *             Activated only when the env variable is set.
 *             Best accuracy for brand-new roads not yet in OSM.
 *
 *   Tier 4 ─ Haversine radius     instant · offline · free
 *             Fallback to the existing circle-based algorithm.
 *             Always produces a result (may mark user as outside pilot zone).
 *
 * Results are cached in memory with a 5-minute TTL keyed by a ~100 m grid.
 */

import { COMMUNES, findNearestCommune, haversineDistance, type Commune } from "./communes";
import { findCommuneByPolygon } from "./communes-geojson";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DetectionSource = "geojson" | "nominatim" | "google" | "radius" | null;

export interface CommuneDetectionResult {
  commune: Commune | null;
  source: DetectionSource;
  outsidePilotZone: boolean;
}

// ── In-memory result cache ────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1_000; // 5 min

interface CacheEntry {
  result: CommuneDetectionResult;
  ts: number;
}

const _cache = new Map<string, CacheEntry>();

/** Cache key: ~100 m grid (3 decimal places ≈ 111 m) */
function _key(lat: number, lon: number) {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

function _getCached(lat: number, lon: number): CommuneDetectionResult | null {
  const e = _cache.get(_key(lat, lon));
  return e && Date.now() - e.ts < CACHE_TTL_MS ? e.result : null;
}

function _setCached(lat: number, lon: number, result: CommuneDetectionResult) {
  _cache.set(_key(lat, lon), { result, ts: Date.now() });
}

// ── Name normalisation ────────────────────────────────────────────────────────

function _normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function _matchCommune(raw: string): Commune | null {
  const n = _normalise(raw);
  return (
    // Exact match first
    COMMUNES.find((c) => _normalise(c.nom) === n) ??
    // Substring match (handles "Commune d'Adjamé" etc.)
    COMMUNES.find(
      (c) => n.includes(_normalise(c.nom)) || _normalise(c.nom).includes(n)
    ) ??
    null
  );
}

/**
 * Sanity-check: verify that the point (lat, lon) is within a reasonable
 * distance of the matched commune's center (1.5× its radius).
 * Prevents Nominatim/Google from assigning a neighbouring pilot commune
 * when the user is actually in a non-pilot commune like Marcory.
 */
function _isPlausible(commune: Commune, lat: number, lon: number): boolean {
  const dist = haversineDistance(lat, lon, commune.centerLat, commune.centerLon);
  return dist <= commune.rayonM * 1.5;
}

// ── Tier 1: GeoJSON polygon ───────────────────────────────────────────────────

function _byGeoJSON(lat: number, lon: number): Commune | null {
  const nom = findCommuneByPolygon(lat, lon);
  return nom ? (COMMUNES.find((c) => c.nom === nom) ?? null) : null;
}

// ── Tier 2: Nominatim (OpenStreetMap) ────────────────────────────────────────

async function _byNominatim(lat: number, lon: number): Promise<Commune | null> {
  try {
    // zoom=14 → city-district / suburb level; email identifies the app to OSM
    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?lat=${lat}&lon=${lon}&format=json&addressdetails=1&zoom=14` +
      `&email=contact@signa-ci.com`;

    const res = await fetch(url, {
      // User-Agent cannot be overridden in browsers; Referer is sent automatically.
      // Accept-Language ensures French commune names where available.
      headers: { "Accept-Language": "fr,en;q=0.5" },
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const addr = data.address ?? {};

    // OSM address fields ordered from finest to coarsest granularity
    const candidates: (string | undefined)[] = [
      addr.city_district,
      addr.suburb,
      addr.quarter,
      addr.neighbourhood,
      addr.town,
      addr.municipality,
      addr.county,
    ];

    for (const c of candidates) {
      if (c) {
        const match = _matchCommune(c);
        if (match) return match;
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ── Tier 3: Google Geocoding ──────────────────────────────────────────────────

async function _byGoogle(
  lat: number,
  lon: number,
  apiKey: string
): Promise<Commune | null> {
  try {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?latlng=${lat},${lon}&key=${apiKey}&language=fr` +
      `&result_type=sublocality%7Cpolitical`;

    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== "OK") return null;

    for (const result of data.results ?? []) {
      for (const component of result.address_components ?? []) {
        const match = _matchCommune(component.long_name as string);
        if (match) return match;
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ── Tier 4: Haversine radius (existing algorithm) ────────────────────────────

function _byRadius(
  lat: number,
  lon: number
): { commune: Commune | null; outsidePilotZone: boolean } {
  const r = findNearestCommune(lat, lon);
  return {
    commune: r.isInPilotZone ? r.commune : null,
    outsidePilotZone: !r.isInPilotZone,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Resolve a GPS coordinate to a pilot commune using a 4-tier fallback chain.
 *
 * @param lat          WGS-84 latitude
 * @param lon          WGS-84 longitude
 * @param accuracy     GPS accuracy in metres (optional — skips GeoJSON tier if > 200 m)
 * @param googleApiKey Google Geocoding API key (optional — activates tier 3)
 */
export async function resolveCommune(
  lat: number,
  lon: number,
  accuracy?: number,
  googleApiKey?: string
): Promise<CommuneDetectionResult> {
  // ── Cache hit ──────────────────────────────────────────────────────────────
  const cached = _getCached(lat, lon);
  if (cached) return cached;

  // ── Tier 1: GeoJSON polygon ────────────────────────────────────────────────
  // Skip when GPS accuracy is too low (> 200 m) — the point may be off by
  // more than a commune boundary thickness.
  if (!accuracy || accuracy <= 200) {
    const commune = _byGeoJSON(lat, lon);
    if (commune) {
      const result: CommuneDetectionResult = {
        commune,
        source: "geojson",
        outsidePilotZone: false,
      };
      _setCached(lat, lon, result);
      return result;
    }
  }

  // ── Tier 2: Nominatim ──────────────────────────────────────────────────────
  const fromNominatim = await _byNominatim(lat, lon);
  if (fromNominatim) {
    const result: CommuneDetectionResult = {
      commune: fromNominatim,
      source: "nominatim",
      outsidePilotZone: false,
    };
    _setCached(lat, lon, result);
    return result;
  }

  // ── Tier 3: Google Geocoding ───────────────────────────────────────────────
  if (googleApiKey) {
    const fromGoogle = await _byGoogle(lat, lon, googleApiKey);
    if (fromGoogle) {
      const result: CommuneDetectionResult = {
        commune: fromGoogle,
        source: "google",
        outsidePilotZone: false,
      };
      _setCached(lat, lon, result);
      return result;
    }
  }

  // ── Tier 4: Haversine radius (always produces a result) ───────────────────
  const fromRadius = _byRadius(lat, lon);
  const result: CommuneDetectionResult = {
    commune: fromRadius.commune,
    source: fromRadius.commune ? "radius" : null,
    outsidePilotZone: fromRadius.outsidePilotZone,
  };
  _setCached(lat, lon, result);
  return result;
}
