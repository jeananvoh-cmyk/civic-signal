/* eslint-disable security/detect-non-literal-fs-filename */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { toSafeBlobUrl } from "@/lib/safe-url";

const REPO_ROOT = path.resolve(__dirname, "../../..");

describe("Security Hardening Regression Tests", () => {
  it("toSafeBlobUrl only allows blob: URLs and rejects dangerous schemes", () => {
    expect(toSafeBlobUrl("blob:https://signa.ci/1234-5678")).toBe(
      "blob:https://signa.ci/1234-5678",
    );
    expect(toSafeBlobUrl("javascript:alert(1)")).toBeUndefined();
    expect(toSafeBlobUrl("data:text/html,<script>alert(1)</script>")).toBeUndefined();
    expect(toSafeBlobUrl("https://evil.example/image.png")).toBeUndefined();
    expect(toSafeBlobUrl("")).toBeUndefined();
    expect(toSafeBlobUrl(null)).toBeUndefined();
  });

  it("Issue #17: ReportPage never persists precise GPS coordinates to localStorage", () => {
    const reportPageSource = fs.readFileSync(
      path.join(REPO_ROOT, "web/src/pages/ReportPage.tsx"),
      "utf8",
    );
    expect(reportPageSource).not.toContain("signa_last_gps");
    expect(reportPageSource).toContain("signa_last_commune");
  });

  it("Issue #18: relay-to-operator rejects client-supplied Resend keys and uses Deno.env only", () => {
    const edgeSource = fs.readFileSync(
      path.join(REPO_ROOT, "supabase/functions/relay-to-operator/index.ts"),
      "utf8",
    );
    expect(edgeSource).toContain('Deno.env.get("RESEND_API_KEY")');
    expect(edgeSource).not.toContain('config["resend_api_key"]');
    expect(edgeSource).not.toContain("cleanApiKey(body.resend_api_key)");
    expect(edgeSource).toContain("status: 400");

    const adminRelaySource = fs.readFileSync(
      path.join(REPO_ROOT, "web/src/pages/AdminRelayPage.tsx"),
      "utf8",
    );
    const relayCardSource = fs.readFileSync(
      path.join(REPO_ROOT, "web/src/components/admin/relay/RelayConfigCard.tsx"),
      "utf8",
    );
    expect(adminRelaySource).not.toContain("resend_api_key:");
    expect(relayCardSource).not.toContain("resend_api_key:");
  });

  it("Service Worker validates tile hostnames via strict allowlists over HTTPS", () => {
    const swSource = fs.readFileSync(
      path.join(REPO_ROOT, "web/public/sw.js"),
      "utf8",
    );
    expect(swSource).not.toContain("url.hostname.includes(");
    expect(swSource).toContain("ALLOWED_OSM_HOSTS.has(url.hostname)");
    expect(swSource).toContain("ALLOWED_CARTO_HOSTS.has(url.hostname)");
  });
});
