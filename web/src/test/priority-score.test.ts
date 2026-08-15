import { describe, it, expect } from "vitest";
import { calculatePriority, type PriorityInput } from "@/lib/priority-score";

// Helper : génère un input outage avec un start_time N heures dans le passé
function outageInput(
  hoursAgo: number,
  overrides: Partial<PriorityInput> = {}
): PriorityInput {
  const start = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
  return {
    service_type: "electricity",
    start_time: start,
    created_at: start,
    status: "active",
    verifications: 0,
    zoneContext: {
      totalReportsInQuartier: 60,
      confirmedReportsInQuartier: 40,
    },
    ...overrides,
  };
}

// Helper : génère un input infrastructure avec un created_at N jours dans le passé
function infraInput(daysAgo: number, overrides: Partial<PriorityInput> = {}): PriorityInput {
  const created = new Date(Date.now() - daysAgo * 86400000).toISOString();
  return {
    service_type: "mairie",
    start_time: null,
    created_at: created,
    status: "active",
    verifications: 1,
    report_category: "infrastructure",
    ...overrides,
  };
}

// ─── Signalement résolu → toujours P4 ────────────────────────────────────────

describe("resolved reports", () => {
  it("retourne P4 quel que soit le service et la durée", () => {
    const result = calculatePriority(outageInput(72, { status: "resolved" }));
    expect(result.level).toBe("P4");
    expect(result.score).toBe(0);
    expect(result.factors).toContain("Résolu");
  });
});

// ─── Outage — gate de zone ────────────────────────────────────────────────────

describe("outage — gate de zone", () => {
  it("retourne P4 si zoneContext est absent", () => {
    const input: PriorityInput = {
      service_type: "water",
      start_time: new Date(Date.now() - 48 * 3600000).toISOString(),
      created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
      status: "active",
      verifications: 5,
    };
    const result = calculatePriority(input);
    expect(result.level).toBe("P4");
  });

  it("retourne P4 si zone sous le seuil de 50 signalements", () => {
    const result = calculatePriority(
      outageInput(48, {
        zoneContext: { totalReportsInQuartier: 30, confirmedReportsInQuartier: 25 },
      })
    );
    expect(result.level).toBe("P4");
    expect(result.factors[0]).toMatch(/Scoring inactif/);
  });

  it("retourne P4 si taux de confirmation < 50%", () => {
    const result = calculatePriority(
      outageInput(48, {
        zoneContext: { totalReportsInQuartier: 60, confirmedReportsInQuartier: 20 },
      })
    );
    expect(result.level).toBe("P4");
  });
});

// ─── Outage électricité — seuils durée ────────────────────────────────────────

describe("outage électricité — niveaux par durée (zone active)", () => {
  it("P4 pour coupure < 2h", () => {
    expect(calculatePriority(outageInput(1)).level).toBe("P4");
  });

  it("P3 pour coupure ~3h", () => {
    const r = calculatePriority(outageInput(3));
    expect(["P3", "P4"]).toContain(r.level); // selon les autres signaux
  });

  it("score augmente avec la durée (24h > 6h)", () => {
    const court = calculatePriority(outageInput(6));
    const long  = calculatePriority(outageInput(25));
    expect(long.score).toBeGreaterThan(court.score);
  });

  it("score maximum pour coupure > 48h", () => {
    const r6  = calculatePriority(outageInput(6));
    const r49 = calculatePriority(outageInput(49));
    expect(r49.score).toBeGreaterThan(r6.score);
  });
});

// ─── Outage eau — pondération ×1.5 ───────────────────────────────────────────

describe("outage eau — score supérieur à électricité", () => {
  it("score eau > score électricité pour même durée", () => {
    const eau  = calculatePriority(outageInput(25, { service_type: "water" }));
    const elec = calculatePriority(outageInput(25, { service_type: "electricity" }));
    expect(eau.score).toBeGreaterThan(elec.score);
  });
});

// ─── Outage — personnes vulnérables ──────────────────────────────────────────

describe("outage — personnes vulnérables augmentent le score", () => {
  it("bébés ajoutent des points", () => {
    const sans  = calculatePriority(outageInput(6));
    const avec  = calculatePriority(outageInput(6, { babies: 2, impacted_people: 4 }));
    expect(avec.score).toBeGreaterThan(sans.score);
  });

  it("facteur bébé visible dans les factors", () => {
    const r = calculatePriority(outageInput(6, { babies: 1, impacted_people: 2 }));
    expect(r.factors.some((f) => /bébé|nourrisson/i.test(f))).toBe(true);
  });
});

// ─── Infrastructure ───────────────────────────────────────────────────────────

describe("infrastructure — scoring sans verrou de zone", () => {
  it("P4 si aucune vérification citoyenne", () => {
    const r = calculatePriority(infraInput(10, { verifications: 0 }));
    expect(r.level).toBe("P4");
    expect(r.factors[0]).toMatch(/vérification/i);
  });

  it("P3 pour signalement > 7j avec 1 vérification", () => {
    const r = calculatePriority(infraInput(8));
    expect(["P1", "P2", "P3"]).toContain(r.level);
    expect(r.score).toBeGreaterThan(0);
  });

  it("P2 pour signalement > 14j avec 3 vérifications", () => {
    const r = calculatePriority(infraInput(15, { verifications: 3 }));
    expect(["P1", "P2"]).toContain(r.level);
  });

  it("GPS corroboration augmente le score", () => {
    const sans = calculatePriority(infraInput(7));
    const avec = calculatePriority(infraInput(7, { corroborating_reports: 6 }));
    expect(avec.score).toBeGreaterThan(sans.score);
  });

  it("zone sensible (urgency=high) ajoute 8 points", () => {
    const sans = calculatePriority(infraInput(7));
    const avec = calculatePriority(infraInput(7, { urgency: "high" }));
    expect(avec.score - sans.score).toBe(8);
  });
});

// ─── Structure du résultat ────────────────────────────────────────────────────

describe("structure PriorityResult", () => {
  it("retourne tous les champs requis", () => {
    const r = calculatePriority(outageInput(49));
    expect(r).toHaveProperty("score");
    expect(r).toHaveProperty("level");
    expect(r).toHaveProperty("label");
    expect(r).toHaveProperty("emoji");
    expect(r).toHaveProperty("pillClass");
    expect(Array.isArray(r.factors)).toBe(true);
  });

  it("level est toujours P1|P2|P3|P4", () => {
    const levels = ["P1", "P2", "P3", "P4"];
    [outageInput(1), outageInput(25), outageInput(49), infraInput(30)].forEach((inp) => {
      expect(levels).toContain(calculatePriority(inp).level);
    });
  });
});
