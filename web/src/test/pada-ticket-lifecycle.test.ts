import { describe, it, expect } from "vitest";
import {
  PADA_COMMUNES,
  getCommuneTrigramme,
  getCommunePadaCode,
  formatTicketCode,
  formatPadaAddress,
  getDisplayTicketCode,
} from "@/lib/pada";

describe("PADA Ticket & Addressing System (Grand Abidjan)", () => {
  it("should contain all 14 official Grand Abidjan communes with distinct codes", () => {
    const communes = Object.keys(PADA_COMMUNES);
    expect(communes.length).toBe(14);
    expect(communes).toContain("Cocody");
    expect(communes).toContain("Plateau");
    expect(communes).toContain("Yopougon");
    expect(communes).toContain("Abobo");
    expect(communes).toContain("Marcory");
    expect(communes).toContain("Treichville");
    expect(communes).toContain("Koumassi");
    expect(communes).toContain("Port-Bouët");
    expect(communes).toContain("Attécoubé");
    expect(communes).toContain("Adjamé");
    expect(communes).toContain("Anyama");
    expect(communes).toContain("Bingerville");
    expect(communes).toContain("Songon");
    expect(communes).toContain("Grand-Bassam");
  });

  it("should generate standardized PADA ticket codes conforming to regex ^SIG-[A-Z]{3}-\\d{8}-\\d{4}$", () => {
    const fixedDate = new Date("2026-08-18T10:00:00Z");
    const ticketCode = formatTicketCode("Cocody", fixedDate, 1);
    expect(ticketCode).toBe("SIG-COC-20260818-0001");
    expect(/^SIG-[A-Z]{3}-\d{8}-\d{4}$/.test(ticketCode)).toBe(true);

    const ticketYop = formatTicketCode("Yopougon", fixedDate, 42);
    expect(ticketYop).toBe("SIG-YOP-20260818-0042");

    const ticketPla = formatTicketCode("Plateau", fixedDate, 999);
    expect(ticketPla).toBe("SIG-PLA-20260818-0999");
  });

  it("should correctly resolve cadastral postal codes (002-XX)", () => {
    expect(getCommunePadaCode("Cocody")).toBe("002-14");
    expect(getCommunePadaCode("Plateau")).toBe("002-17");
    expect(getCommunePadaCode("Yopougon")).toBe("002-20");
    expect(getCommunePadaCode("Inconnue")).toBe("002-XX");
  });

  it("should format addresses conforming to the MCLU national addressing standard", () => {
    const formatted = formatPadaAddress({
      streetName: "Boulevard de la RÉPUBLIQUE",
      streetNumber: 495,
      commune: "Plateau",
      quartier: "Commerce",
    });
    expect(formatted).toBe("495, Boulevard de la RÉPUBLIQUE 002-17, Abidjan - Plateau (Commerce)");

    const formattedWithoutNumber = formatPadaAddress({
      streetName: "Rue des Jardins",
      commune: "Cocody",
      quartier: "Deux Plateaux",
    });
    expect(formattedWithoutNumber).toBe("Rue des Jardins 002-14, Abidjan - Cocody (Deux Plateaux)");
  });

  it("should generate fallback display ticket code if ticket_code is null on report", () => {
    const displayCode = getDisplayTicketCode({
      ticket_code: null,
      commune: "Marcory",
      created_at: "2026-08-18T08:00:00Z",
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    });
    expect(displayCode).toBe("SIG-MAR-20260818-A1B2");

    const explicitCode = getDisplayTicketCode({
      ticket_code: "SIG-MAR-20260818-0005",
      commune: "Marcory",
    });
    expect(explicitCode).toBe("SIG-MAR-20260818-0005");
  });
});
