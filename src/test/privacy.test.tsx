// @vitest-environment jsdom
// @ts-nocheck
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Privacy from "@/pages/Privacy";
import Cookies from "@/pages/Cookies";
import LegalFooter from "@/components/LegalFooter";

const withRouter = (ui: React.ReactNode) => (
  <MemoryRouter>{ui}</MemoryRouter>
);

describe("Privacy page", () => {
  it("renders the main heading and key RGPD section", () => {
    render(withRouter(<Privacy />));
    expect(
      screen.getByRole("heading", { level: 1, name: /Confidentialité & Sécurité/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /Tes droits RGPD/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Droit à la portabilité/i)).toBeInTheDocument();
    expect(screen.getByText(/Droit à l'effacement/i)).toBeInTheDocument();
  });

  it("sets an accessible document title", () => {
    render(withRouter(<Privacy />));
    expect(document.title).toMatch(/Confidentialité/i);
  });
});

describe("Cookies page", () => {
  it("renders categories and consent switches", () => {
    render(withRouter(<Cookies />));
    expect(
      screen.getByRole("heading", { level: 1, name: /Cookies & consentement/i })
    ).toBeInTheDocument();
    const switches = screen.getAllByRole("switch");
    expect(switches.length).toBeGreaterThanOrEqual(3);
  });
});

describe("LegalFooter", () => {
  it("exposes Privacy and Cookies links", () => {
    render(withRouter(<LegalFooter />));
    expect(screen.getByRole("link", { name: /confidentialité/i })).toHaveAttribute(
      "href",
      "/privacy"
    );
    expect(screen.getByRole("link", { name: /cookies/i })).toHaveAttribute(
      "href",
      "/cookies"
    );
  });
});
