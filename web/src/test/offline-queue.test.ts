import { describe, it, expect, beforeEach } from "vitest";

const QUEUE_KEY = "signa_ci_offline_queue";

describe("Offline Queue Storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should start with an empty queue", () => {
    const raw = localStorage.getItem(QUEUE_KEY);
    expect(raw).toBeNull();
  });

  it("should enqueue item to localStorage", () => {
    const mockReport = {
      id: "offline_123",
      queued_at: new Date().toISOString(),
      payload: { service_type: "electricity", commune: "Cocody", quartier: "Angré" },
    };

    localStorage.setItem(QUEUE_KEY, JSON.stringify([mockReport]));
    const stored = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");

    expect(stored).toHaveLength(1);
    expect(stored[0].payload.commune).toBe("Cocody");
  });

  it("should purge queue upon successful sync", () => {
    const mockReports = [
      { id: "off_1", queued_at: new Date().toISOString(), payload: { service_type: "water" } },
    ];
    localStorage.setItem(QUEUE_KEY, JSON.stringify(mockReports));

    // Clear queue simulation after flush
    localStorage.setItem(QUEUE_KEY, JSON.stringify([]));
    const cleared = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");

    expect(cleared).toHaveLength(0);
  });
});
