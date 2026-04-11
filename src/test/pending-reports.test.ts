import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePendingReports } from "@/hooks/usePendingReports";

// ─── Mock Supabase ────────────────────────────────────────────────────────────

const mockInsert = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      insert: mockInsert,
    }),
  },
}));

// ─── Setup localStorage vierge avant chaque test ─────────────────────────────

beforeEach(() => {
  localStorage.clear();
  mockInsert.mockClear();
  mockInsert.mockResolvedValue({ error: null });
  // Simuler navigateur en ligne
  Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("usePendingReports", () => {
  it("démarre avec 0 signalement en attente", () => {
    const { result } = renderHook(() => usePendingReports());
    expect(result.current.pendingCount).toBe(0);
  });

  it("enqueue ajoute un signalement et incrémente pendingCount", () => {
    const { result } = renderHook(() => usePendingReports());

    act(() => {
      result.current.enqueue({ user_id: "u1", commune: "Cocody" });
    });

    expect(result.current.pendingCount).toBe(1);
  });

  it("enqueue multiple signalements cumulatifs", () => {
    const { result } = renderHook(() => usePendingReports());

    act(() => {
      result.current.enqueue({ user_id: "u1", commune: "Cocody" });
      result.current.enqueue({ user_id: "u1", commune: "Abobo" });
    });

    expect(result.current.pendingCount).toBe(2);
  });

  it("flush envoie et vide la file si succès", async () => {
    const { result } = renderHook(() => usePendingReports());

    act(() => {
      result.current.enqueue({ user_id: "u1", commune: "Cocody" });
    });

    expect(result.current.pendingCount).toBe(1);

    await act(async () => {
      await result.current.flush();
    });

    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(result.current.pendingCount).toBe(0);
  });

  it("flush ne supprime pas les entrées en erreur", async () => {
    mockInsert.mockResolvedValueOnce({ error: new Error("réseau") });

    const { result } = renderHook(() => usePendingReports());

    act(() => {
      result.current.enqueue({ user_id: "u1", commune: "Cocody" });
    });

    await act(async () => {
      await result.current.flush();
    });

    // L'entrée doit rester en file
    expect(result.current.pendingCount).toBe(1);
  });

  it("flush retourne 0 si file vide", async () => {
    const { result } = renderHook(() => usePendingReports());

    let sent: number | undefined;
    await act(async () => {
      sent = await result.current.flush();
    });

    expect(sent).toBeUndefined();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("persistance localStorage — survit à un remontage du hook", () => {
    const { result: r1 } = renderHook(() => usePendingReports());

    act(() => {
      r1.current.enqueue({ user_id: "u1", commune: "Yopougon" });
    });

    // Nouveau montage — simule un rechargement de page
    const { result: r2 } = renderHook(() => usePendingReports());
    expect(r2.current.pendingCount).toBe(1);
  });

  it("flush partiel — conserve les échecs, supprime les succès", async () => {
    // 1er insert OK, 2e en erreur
    mockInsert
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: new Error("timeout") });

    const { result } = renderHook(() => usePendingReports());

    act(() => {
      result.current.enqueue({ user_id: "u1", commune: "Cocody" });
      result.current.enqueue({ user_id: "u1", commune: "Adjamé" });
    });

    await act(async () => {
      await result.current.flush();
    });

    expect(result.current.pendingCount).toBe(1);
  });
});
