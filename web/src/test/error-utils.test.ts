import { describe, it, expect } from "vitest";
import { getUserFriendlyError } from "@/lib/error-utils";

describe("getUserFriendlyError", () => {
  it("should return fallback when error is null/undefined", () => {
    expect(getUserFriendlyError(null)).toBe("Une erreur est survenue. Veuillez réessayer.");
    expect(getUserFriendlyError(undefined, "Custom fallback")).toBe("Custom fallback");
  });

  it("should map invalid credentials error message", () => {
    const err = { message: "Invalid login credentials" };
    expect(getUserFriendlyError(err)).toBe("Email/mot de passe incorrect");
  });

  it("should map rate limit errors", () => {
    const err = { message: "rate limit exceeded", code: "429" };
    expect(getUserFriendlyError(err)).toBe("Trop de tentatives. Veuillez patienter quelques minutes.");
  });

  it("should map Postgres unique constraint violation code 23505", () => {
    const err = { code: "23505", message: "duplicate key value violates unique constraint phone" };
    expect(getUserFriendlyError(err)).toBe("Ce numéro de téléphone est déjà associé à un compte.");
  });

  it("should map network errors safely", () => {
    const err = { message: "Failed to fetch" };
    expect(getUserFriendlyError(err)).toBe("Erreur réseau. Vérifiez votre connexion.");
  });
});
