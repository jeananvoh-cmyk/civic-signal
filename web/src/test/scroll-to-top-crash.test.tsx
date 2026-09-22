import { describe, it, expect } from "vitest";
import { render, act } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import ScrollToTopButton from "../components/ScrollToTopButton";

function TestApp() {
  const navigate = useNavigate();
  return (
    <div>
      <button onClick={() => navigate("/signaler?type=pothole")}>Go Pothole</button>
      <button onClick={() => navigate("/signaler?type=drain_blocked")}>Go Drain</button>
      <button onClick={() => navigate("/auth")}>Go Auth</button>
      <ScrollToTopButton />
    </div>
  );
}

describe("ScrollToTopButton crash test", () => {
  it("navigates to /signaler and /auth without any hook error", () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={["/"]}>
        <TestApp />
      </MemoryRouter>
    );

    // Navigating to /signaler?type=pothole should not throw!
    expect(() => {
      act(() => {
        getByText("Go Pothole").click();
      });
    }).not.toThrow();

    // Navigating to /signaler?type=drain_blocked should not throw!
    expect(() => {
      act(() => {
        getByText("Go Drain").click();
      });
    }).not.toThrow();

    // Navigating to /auth should not throw!
    expect(() => {
      act(() => {
        getByText("Go Auth").click();
      });
    }).not.toThrow();
  });
});
