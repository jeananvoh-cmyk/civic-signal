import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ReportPage from "../pages/ReportPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

describe("ReportPage reproduction test", () => {
  it("renders with ?type=pothole without crashing", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/signaler?type=pothole"]}>
          <ReportPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  });
});
