/* eslint-disable security/detect-non-literal-fs-filename */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "../../..");

describe("PR #14 — Edge Function JWT enforcement & internal push auth contract", () => {
  const configToml = fs.readFileSync(
    path.join(REPO_ROOT, "supabase/config.toml"),
    "utf8",
  );
  const sendPushSrc = fs.readFileSync(
    path.join(REPO_ROOT, "supabase/functions/send-push/index.ts"),
    "utf8",
  );
  const notifyPartnerSrc = fs.readFileSync(
    path.join(REPO_ROOT, "supabase/functions/notify-partner/index.ts"),
    "utf8",
  );
  const migrationSql = fs.readFileSync(
    path.join(
      REPO_ROOT,
      "supabase/migrations/20260823023000_fix_partner_status_push_auth.sql",
    ),
    "utf8",
  );

  it("enforces verify_jwt = true for notify-partner, reset-password, and send-push", () => {
    expect(configToml).toMatch(/\[functions\.notify-partner\]\s*verify_jwt\s*=\s*true/);
    expect(configToml).toMatch(/\[functions\.reset-password\]\s*verify_jwt\s*=\s*true/);
    expect(configToml).toMatch(/\[functions\.send-push\]\s*verify_jwt\s*=\s*true/);
  });

  it("send-push accepts explicit server-to-server service-role Bearer JWT and implements send-to-user", () => {
    expect(sendPushSrc).toContain("timingSafeEqual(bearerToken, SUPABASE_SERVICE_ROLE_KEY)");
    expect(sendPushSrc).toContain('body.action === "send-to-user"');
    expect(sendPushSrc).toContain('callerProfile?.role !== "admin"');
  });

  it("notify-partner enforces server-to-server auth, reads organization_name, and links to signa.ci", () => {
    expect(notifyPartnerSrc).toContain("timingSafeEqual(bearerToken, serviceRoleKey)");
    expect(notifyPartnerSrc).toContain("organization_name");
    expect(notifyPartnerSrc).not.toContain("org_name");
    expect(notifyPartnerSrc).toContain("https://signa.ci/partner/dashboard");
  });

  it("DB triggers/RPCs route internal HTTP calls via Vault service-role JWT with valid event_type", () => {
    expect(migrationSql).toContain("civic_signal_service_role_jwt");
    expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION public.partner_update_report_status");
    expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION public.trigger_notify_partners");
    expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION public.notify_citizen_on_report_update");
    expect(migrationSql).toContain("'Authorization', 'Bearer ' || v_service_role_jwt");
    expect(migrationSql).toContain("'event_type', 'resolution'");
    expect(migrationSql).not.toContain("vqsqvlyeihiynhhiymdb");
  });
});
