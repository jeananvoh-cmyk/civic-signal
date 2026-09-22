import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock leaflet for Node/JSDOM test environment
vi.mock("leaflet", () => {
  const L = {
    map: vi.fn(() => ({
      setView: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      remove: vi.fn(),
      addLayer: vi.fn().mockReturnThis(),
      fitBounds: vi.fn().mockReturnThis(),
    })),
    tileLayer: vi.fn(() => ({ addTo: vi.fn().mockReturnThis() })),
    marker: vi.fn(() => ({
      addTo: vi.fn().mockReturnThis(),
      bindPopup: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
    })),
    divIcon: vi.fn(() => ({})),
    latLngBounds: vi.fn(() => ({ extend: vi.fn(), isValid: () => true })),
    polygon: vi.fn(() => ({ addTo: vi.fn().mockReturnThis(), bindPopup: vi.fn().mockReturnThis() })),
    layerGroup: vi.fn(() => ({ addTo: vi.fn().mockReturnThis(), clearLayers: vi.fn(), addLayer: vi.fn() })),
    control: {
      zoom: vi.fn(() => ({ addTo: vi.fn().mockReturnThis() })),
    },
  };
  return { default: L, ...L };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    })),
    rpc: vi.fn(() => Promise.resolve({ data: [], error: null })),
  }
}));

import MapPage from "../pages/MapPage";

describe("MapPage render test", () => {
  it("renders /carte without throwing ShieldCheck is not defined", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/carte"]}>
          <MapPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(container.textContent).toContain("Confidentialité garantie");
    expect(container.textContent).toContain("Loi ivoirienne n° 2013-450");
  });
});
