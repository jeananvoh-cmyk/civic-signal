import { describe, it, expect } from "vitest";
import { getDisplayTicketCode } from "../lib/pada";
import { extractInfraLabel, cleanDescription } from "../lib/report-display";
import { getInfraIllustration } from "../lib/infra-icons";

describe("Infrastructure & Zero-Redundancy Refactor Verification", () => {

  describe("1. Infrastructure Support & Ticket Formatting", () => {
    it("should generate standardized PADA ticket references", () => {
      const ticketRef = getDisplayTicketCode({
        ticket_code: "SIG-COC-20260819-0042",
        commune: "Cocody",
        created_at: "2026-08-19T10:00:00Z",
        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      });

      expect(ticketRef).toBe("SIG-COC-20260819-0042");
    });

    it("should fallback cleanly to generated code if ticket_code is missing", () => {
      const fallbackRef = getDisplayTicketCode({
        ticket_code: null,
        commune: "Yopougon",
        created_at: "2026-08-19T12:00:00Z",
        id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      });

      expect(fallbackRef).toContain("YOP-");
      expect(fallbackRef).toContain("B2C3");
    });

    it("should extract infrastructure labels and clean text", () => {
      const rawDescription = "[Lampadaires & Éclairage public] 3 lampadaires éteints rue des Jardins [5 personnes]";
      const label = extractInfraLabel(rawDescription);
      const cleaned = cleanDescription(rawDescription);

      expect(label).toContain("Lampadaires");
      expect(cleaned).toContain("3 lampadaires éteints rue des Jardins");
      expect(cleaned).not.toContain("[5 personnes]");
    });
  });

  describe("2. Support Votes Toggle Simulation", () => {
    it("should correctly increment and decrement support counts on vote toggle", () => {
      let currentVotes = new Set<string>();
      let reportSupportCount = 3;

      const reportId = "report-infra-1";

      // Vote 1: Add vote
      if (currentVotes.has(reportId)) {
        currentVotes.delete(reportId);
        reportSupportCount = Math.max(0, reportSupportCount - 1);
      } else {
        currentVotes.add(reportId);
        reportSupportCount += 1;
      }

      expect(currentVotes.has(reportId)).toBe(true);
      expect(reportSupportCount).toBe(4);

      // Vote 2: Toggle off
      if (currentVotes.has(reportId)) {
        currentVotes.delete(reportId);
        reportSupportCount = Math.max(0, reportSupportCount - 1);
      } else {
        currentVotes.add(reportId);
        reportSupportCount += 1;
      }

      expect(currentVotes.has(reportId)).toBe(false);
      expect(reportSupportCount).toBe(3);
    });
  });

  describe("3. Operator Categorization & Multi-Operator Isolation", () => {
    const sampleReports = [
      { id: "1", service_type: "electricity", description: "Lampadaire cassé Riviera 2", commune: "Cocody", status: "active" },
      { id: "2", service_type: "water", description: "Fuite d'eau sur la chaussée", commune: "Yopougon", status: "active" },
      { id: "3", service_type: "mairie", description: "Gros nid-de-poule boulevard Latrille", commune: "Cocody", status: "resolved" },
    ];

    it("should filter by CIE operator accurately", () => {
      const cieReports = sampleReports.filter((r) => {
        const desc = r.description.toLowerCase();
        return r.service_type === "electricity" || desc.includes("lampadaire");
      });
      expect(cieReports.length).toBe(1);
      expect(cieReports[0].id).toBe("1");
    });

    it("should filter by SODECI operator accurately", () => {
      const sodeciReports = sampleReports.filter((r) => {
        const desc = r.description.toLowerCase();
        return r.service_type === "water" || desc.includes("fuite");
      });
      expect(sodeciReports.length).toBe(1);
      expect(sodeciReports[0].id).toBe("2");
    });

    it("should filter by Mairie operator accurately", () => {
      const mairieReports = sampleReports.filter((r) => {
        const desc = r.description.toLowerCase();
        return r.service_type === "mairie" || desc.includes("nid-de-poule");
      });
      expect(mairieReports.length).toBe(1);
      expect(mairieReports[0].id).toBe("3");
    });

    it("should filter by Status (active vs resolved)", () => {
      const activeReports = sampleReports.filter((r) => r.status === "active");
      const resolvedReports = sampleReports.filter((r) => r.status === "resolved");

      expect(activeReports.length).toBe(2);
      expect(resolvedReports.length).toBe(1);
    });
  });

  describe("4. Category Illustration Engine", () => {
    it("should match appropriate illustrations for all infra categories without throwing", () => {
      expect(getInfraIllustration("electricity", "Lampadaire éteint")).toContain("lampadaire");
      expect(getInfraIllustration("electricity", "Poteau électrique penché")).toContain("poteau-electrique");
      expect(getInfraIllustration("water", "Fuite d'eau au carrefour")).toContain("fuite-eau");
      expect(getInfraIllustration("water", "Canalisation publique cassée")).toContain("canalisation");
      expect(getInfraIllustration("mairie", "Voirie dégradée et nid de poule")).toContain("voirie");
      expect(getInfraIllustration("mairie", "Caniveau bouché")).toContain("caniveau");
    });
  });
});
