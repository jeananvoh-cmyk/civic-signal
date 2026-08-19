import { describe, it, expect } from "vitest";
import { normalizeQuartier, getQuartiers, isValidQuartier, QUARTIERS } from "../lib/quartiers";

describe("Quartier Canonical Normalization & Deduplication", () => {
  it("should harmonize Roman numerals to Arabic numerals", () => {
    // Adjamé
    expect(normalizeQuartier("Williamsville II", "Adjamé")).toBe("Williamsville 2");
    expect(normalizeQuartier("Williamsville 2", "Adjamé")).toBe("Williamsville 2");
    expect(normalizeQuartier("Williamsville I", "Adjamé")).toBe("Williamsville 1");
    expect(normalizeQuartier("Williamsville III", "Adjamé")).toBe("Williamsville 3");
    expect(normalizeQuartier("Williamsville", "Adjamé")).toBe("Williamsville 1");
    expect(normalizeQuartier("Mairie II", "Adjamé")).toBe("Mairie 2");
    expect(normalizeQuartier("Mairie I", "Adjamé")).toBe("Mairie 1");

    // Treichville
    expect(normalizeQuartier("Arras I", "Treichville")).toBe("Arras 1");
    expect(normalizeQuartier("Arras II", "Treichville")).toBe("Arras 2");
    expect(normalizeQuartier("Arras III", "Treichville")).toBe("Arras 3");

    // Yopougon
    expect(normalizeQuartier("Port-Bouët II", "Yopougon")).toBe("Port-Bouët 2");
    expect(normalizeQuartier("Port-Bouet II", "Yopougon")).toBe("Port-Bouët 2");
    expect(normalizeQuartier("Cité Saco II", "Yopougon")).toBe("Cité Saco 2");

    // Abobo
    expect(normalizeQuartier("Plaque I", "Abobo")).toBe("Plaque 1");
    expect(normalizeQuartier("Plaque II", "Abobo")).toBe("Plaque 2");

    // Grand-Bassam
    expect(normalizeQuartier("Vitré I", "Grand-Bassam")).toBe("Vitré 1");
    expect(normalizeQuartier("Vitré II", "Grand-Bassam")).toBe("Vitré 2");
  });

  it("should harmonize spelling variants, typos and hyphens", () => {
    // Marie-Thérèse
    expect(normalizeQuartier("Marie-Thérèse", "Adjamé")).toBe("Marie Thérèse");
    expect(normalizeQuartier("Marie Thérèse", "Adjamé")).toBe("Marie Thérèse");
    expect(normalizeQuartier("marie therese", "Adjamé")).toBe("Marie Thérèse");

    // Saint-Michel
    expect(normalizeQuartier("Saint-Michel", "Adjamé")).toBe("Saint Michel");
    expect(normalizeQuartier("Saint Michel", "Adjamé")).toBe("Saint Michel");

    // Pailliet
    expect(normalizeQuartier("Pailler", "Adjamé")).toBe("Pailliet");
    expect(normalizeQuartier("Pallier", "Adjamé")).toBe("Pailliet");
    expect(normalizeQuartier("Pailliet", "Adjamé")).toBe("Pailliet");

    // Sodeci Filtisac
    expect(normalizeQuartier("SODECI-FILTISAC", "Adjamé")).toBe("Sodeci - Filtisac");
    expect(normalizeQuartier("Sodeci - Filtisac", "Adjamé")).toBe("Sodeci - Filtisac");

    // Indénié
    expect(normalizeQuartier("Indénié - Adjamé", "Adjamé")).toBe("Indénié");
    expect(normalizeQuartier("Indénié", "Adjamé")).toBe("Indénié");
  });

  it("should strip redundant prefixes and village suffixes into single canonical names", () => {
    expect(normalizeQuartier("Quartier Ébrié", "Adjamé")).toBe("Ebrié");
    expect(normalizeQuartier("Village Ébrié", "Adjamé")).toBe("Ebrié");
    expect(normalizeQuartier("Ebrié", "Adjamé")).toBe("Ebrié");
    expect(normalizeQuartier("Adjamé Williamsville", "Adjamé")).toBe("Williamsville 1");

    expect(normalizeQuartier("Blockauss (Village)", "Cocody")).toBe("Blockauss");
    expect(normalizeQuartier("Blockauss Village", "Cocody")).toBe("Blockauss");
    expect(normalizeQuartier("Anono Village", "Cocody")).toBe("Anono Village");
    expect(normalizeQuartier("Anono", "Cocody")).toBe("Anono Village");
    expect(normalizeQuartier("Bonoumin", "Cocody")).toBe("Riviera Bonoumin");
    expect(normalizeQuartier("Golf", "Cocody")).toBe("Riviera Golf");
  });

  it("should eliminate __other, other and Autre without exposing placeholder names", () => {
    const resCocody = normalizeQuartier("__other", "Cocody");
    expect(resCocody).not.toBe("__other");
    expect(resCocody).not.toBe("other");
    expect(resCocody.toLowerCase()).not.toBe("autre");

    const resAdjame = normalizeQuartier("other", "Adjamé");
    expect(resAdjame).not.toBe("other");
    expect(resAdjame).not.toBe("__other");

    const resAbobo = normalizeQuartier("Autre", "Abobo");
    expect(resAbobo).not.toBe("Autre");
  });

  it("should have clean official PADA lists without duplicate aliases across all 14 communes", () => {
    for (const [commune, list] of Object.entries(QUARTIERS)) {
      expect(list.length).toBeGreaterThan(5);

      // Aucun quartier avec chiffres romains résiduels dans la liste officielle
      const hasRomanNumerals = list.some((q) => /\b(II|III|IV|VI|VII|VIII)\b/.test(q));
      expect(hasRomanNumerals).toBe(false);

      // Aucun quartier 'autre' ou '__other'
      const hasOther = list.some((q) => q.toLowerCase().includes("__other") || q.toLowerCase() === "autre");
      expect(hasOther).toBe(false);

      // Aucun doublon de nom insensible à la casse
      const set = new Set(list.map((q) => q.toLowerCase().trim()));
      expect(set.size).toBe(list.length);
    }
  });

  it("should validate canonical names via isValidQuartier", () => {
    expect(isValidQuartier("Adjamé", "Williamsville 2")).toBe(true);
    expect(isValidQuartier("Adjamé", "Williamsville II")).toBe(true);
    expect(isValidQuartier("Cocody", "Riviera Bonoumin")).toBe(true);
    expect(isValidQuartier("Cocody", "Bonoumin")).toBe(true);
  });
});
