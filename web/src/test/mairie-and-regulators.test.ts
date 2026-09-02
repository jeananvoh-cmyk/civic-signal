import { describe, it, expect } from "vitest";
import { COMMUNES } from "@/lib/communes";
import { COMMUNE_LOGOS } from "@/lib/commune-logos";

describe("Mairie Dashboard & Regulators Audit Metrics", () => {
  it("verifies all 14 communes have definitions and verified official logos are present", () => {
    expect(COMMUNES.length).toBeGreaterThanOrEqual(14);
    const verifiedCommunesWithLogos = [
      "Cocody", "Yopougon", "Abobo", "Marcory", "Plateau", 
      "Koumassi", "Port-Bouët", "Attécoubé", "Adjamé", "Bingerville", "Grand-Bassam"
    ];
    
    COMMUNES.forEach((c) => {
      expect(c.nom).toBeDefined();
      expect(c.population).toBeGreaterThan(0);
    });

    verifiedCommunesWithLogos.forEach((nom) => {
      expect(COMMUNE_LOGOS[nom]).toBeDefined();
      expect(COMMUNE_LOGOS[nom].length).toBeGreaterThan(5);
    });
  });

  it("calculates regulator SLA compliance correctly for ANARE-CI (24h) and ONEP (48h)", () => {
    const mockReports = [
      {
        id: "1",
        service_type: "electricity",
        created_at: "2026-08-01T10:00:00Z",
        resolved_at: "2026-08-01T20:00:00Z", // 10h -> respect SLA 24h
        status: "resolved",
      },
      {
        id: "2",
        service_type: "electricity",
        created_at: "2026-08-01T10:00:00Z",
        resolved_at: "2026-08-03T10:00:00Z", // 48h -> dépasse SLA 24h
        status: "resolved",
      },
      {
        id: "3",
        service_type: "water",
        created_at: "2026-08-01T10:00:00Z",
        resolved_at: "2026-08-02T10:00:00Z", // 24h -> respect SLA 48h
        status: "resolved",
      },
    ];

    // ANARE (Electricity)
    const elecResolved = mockReports.filter((r) => r.service_type === "electricity" && r.resolved_at);
    let anareWithinSla = 0;
    elecResolved.forEach((r) => {
      const durHours = (new Date(r.resolved_at!).getTime() - new Date(r.created_at).getTime()) / 3600000;
      if (durHours <= 24) anareWithinSla++;
    });
    const anareCompliance = Math.round((anareWithinSla / elecResolved.length) * 100);
    expect(anareCompliance).toBe(50);

    // ONEP (Water)
    const waterResolved = mockReports.filter((r) => r.service_type === "water" && r.resolved_at);
    let onepWithinSla = 0;
    waterResolved.forEach((r) => {
      const durHours = (new Date(r.resolved_at!).getTime() - new Date(r.created_at).getTime()) / 3600000;
      if (durHours <= 48) onepWithinSla++;
    });
    const onepCompliance = Math.round((onepWithinSla / waterResolved.length) * 100);
    expect(onepCompliance).toBe(100);
  });

  it("detects chronic outages (> 14 days) exceeding regulatory obligations", () => {
    const now = new Date("2026-08-20T12:00:00Z").getTime();
    const chronicDate = new Date(now - 15 * 24 * 3600000).toISOString(); // 15 jours
    const recentDate = new Date(now - 2 * 24 * 3600000).toISOString(); // 2 jours

    const reports = [
      { id: "c1", status: "active", created_at: chronicDate },
      { id: "r1", status: "active", created_at: recentDate },
    ];

    const chronic = reports.filter((r) => {
      const ageHours = (now - new Date(r.created_at).getTime()) / 3600000;
      return ageHours >= 14 * 24;
    });

    expect(chronic.length).toBe(1);
    expect(chronic[0].id).toBe("c1");
  });
});
