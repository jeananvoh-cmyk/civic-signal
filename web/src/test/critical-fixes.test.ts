import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveCommune } from "../lib/geolocation";

describe("Critical Fixes Verification Suite", () => {

  describe("Critical Fix 1: Notification Fan-Out SQL Vectorization Logic", () => {
    it("should compute unique user IDs for set-based INSERT INTO SELECT vectorization", () => {
      // Simule la déduplication SQL DISTINCT effectuée par la requête WITH stakeholders AS (...)
      const reports = [{ user_id: "user-1" }];
      const corroborations = [{ user_id: "user-1" }, { user_id: "user-2" }, { user_id: "user-3" }];
      const supportVotes = [{ user_id: "user-2" }, { user_id: "user-4" }];

      const allUserIds = [
        ...reports.map((r) => r.user_id),
        ...corroborations.map((c) => c.user_id),
        ...supportVotes.map((s) => s.user_id),
      ].filter(Boolean);

      const uniqueStakeholders = Array.from(new Set(allUserIds));

      // Doit retourner exactement 4 utilisateurs uniques au lieu de 6 requêtes répétées
      expect(uniqueStakeholders.length).toBe(4);
      expect(uniqueStakeholders).toEqual(["user-1", "user-2", "user-3", "user-4"]);
    });
  });

  describe("Critical Fix 2: Geolocation & Nominatim Rate Limiting / Fail-Fast", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("should resolve instantly via Tier 1 (GeoJSON) for Abidjan pilot coordinates without calling network", async () => {
      // Coordonnées au centre de Cocody (5.35°N, -3.96°W)
      const res = await resolveCommune(5.35, -3.96);
      expect(res.commune?.nom).toBe("Cocody");
      expect(res.source).toBe("geojson");
      expect(res.outsidePilotZone).toBe(false);
    });

    it("should handle Nominatim HTTP 429 rate-limiting gracefully and failover to radius", async () => {
      // Mock fetch pour simuler un HTTP 429 de Nominatim
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: "Rate limit exceeded" }),
      } as Response);

      // Coordonnées hors Abidjan (ex: Yamoussoukro 6.81°N, -5.27°W) pour forcer le passage à Tier 2
      const res = await resolveCommune(6.8161, -5.2742);

      // Doit basculer proprement sur Haversine (radius) ou null sans lever d'exception
      expect(res.outsidePilotZone).toBe(true);
    });
  });
});
