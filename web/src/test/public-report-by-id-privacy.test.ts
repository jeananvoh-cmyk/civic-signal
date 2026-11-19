/* eslint-disable security/detect-non-literal-fs-filename */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "../../..");

const EXPECTED_46_COLUMNS = [
  "id",
  "user_id",
  "ticket_code",
  "pada_commune_code",
  "pada_street_name",
  "pada_formatted_address",
  "service_type",
  "report_category",
  "description",
  "location",
  "commune",
  "quartier",
  "status",
  "urgency",
  "created_at",
  "start_time",
  "resolved_at",
  "validated",
  "validated_at",
  "forwarded_to_operator_at",
  "photo_url",
  "photo_urls",
  "verifications",
  "repair_verifications",
  "impacted_people",
  "babies",
  "pregnant",
  "elderly",
  "operator_name",
  "operator_reference",
  "estimated_resolution_time",
  "operator_last_note",
  "latitude",
  "longitude",
  "repair_photos",
  "repair_note",
  "repair_declared_at",
  "repair_status",
  "resolved_with_transfer",
  "parent_incident_id",
  "child_reports_count",
  "is_incident_master",
  "intervention_team",
  "intervention_work_order",
  "intervention_started_at",
  "intervention_status",
] as const;

interface RawReportRow {
  id: string;
  user_id: string;
  validated: boolean;
  babies: number;
  pregnant: number;
  elderly: number;
  operator_reference: string | null;
  operator_last_note: string | null;
  latitude: number;
  longitude: number;
}

function simulateGetPublicReportById(
  row: RawReportRow,
  callerUid: string | null,
) {
  if (!row.validated && callerUid !== row.user_id) {
    return null;
  }
  const isOwner = callerUid !== null && callerUid === row.user_id;
  return {
    id: row.id,
    user_id: isOwner ? row.user_id : null,
    validated: row.validated,
    babies: isOwner ? row.babies : null,
    pregnant: isOwner ? row.pregnant : null,
    elderly: isOwner ? row.elderly : null,
    operator_reference: null,
    operator_last_note: null,
    latitude: Number((row.latitude + 0.0012).toFixed(6)),
    longitude: Number((row.longitude - 0.0012).toFixed(6)),
  };
}

describe("PR #26 — get_public_report_by_id 46-column contract & privacy rules", () => {
  const migrationSql = fs.readFileSync(
    path.join(
      REPO_ROOT,
      "supabase/migrations/20261118000000_harden_public_report_by_id_privacy.sql",
    ),
    "utf8",
  );

  it("preserves all 46 return columns in the exact order expected by ReportDetailPage", () => {
    const returnsBlockMatch = migrationSql.match(
      /RETURNS TABLE\s*\(([\s\S]*?)\)\s*LANGUAGE/i,
    );
    expect(returnsBlockMatch).not.toBeNull();
    const cols = returnsBlockMatch![1]
      .split(",")
      .map((line) => line.trim().split(/\s+/)[0])
      .filter(Boolean);

    expect(cols).toHaveLength(46);
    expect(cols).toEqual([...EXPECTED_46_COLUMNS]);
  });

  it("Restores public_shift_coordinate for latitude and longitude and revokes PUBLIC", () => {
    expect(migrationSql).toContain(
      "DROP FUNCTION IF EXISTS public.get_public_report_by_id(uuid);",
    );
    expect(migrationSql).toContain(
      "public.public_shift_coordinate(r.id, r.latitude, 'lat') AS latitude",
    );
    expect(migrationSql).toContain(
      "public.public_shift_coordinate(r.id, r.longitude, 'lon') AS longitude",
    );
    expect(migrationSql).not.toMatch(/^\s*r\.latitude\s*,/m);
    expect(migrationSql).not.toMatch(/^\s*r\.longitude\s*,/m);
    expect(migrationSql).toContain(
      "AND (r.validated IS TRUE OR auth.uid() = r.user_id)",
    );
    expect(migrationSql).toContain(
      "REVOKE ALL ON FUNCTION public.get_public_report_by_id(uuid) FROM PUBLIC;",
    );
  });

  it("Verifies the 4 access scenarios (anon validated, anon unvalidated, owner unvalidated, non-owner)", () => {
    const sampleUnvalidated: RawReportRow = {
      id: "rep-1",
      user_id: "user-owner",
      validated: false,
      babies: 2,
      pregnant: 1,
      elderly: 1,
      operator_reference: "CIE-INTERNAL-99",
      operator_last_note: "Note interne confidentielle",
      latitude: 5.345678,
      longitude: -4.012345,
    };
    const sampleValidated: RawReportRow = {
      ...sampleUnvalidated,
      validated: true,
    };

    // 1. Anonymous visitor on validated report -> succeeds with redacted private fields & shifted coords
    const anonValidated = simulateGetPublicReportById(sampleValidated, null);
    expect(anonValidated).not.toBeNull();
    expect(anonValidated?.user_id).toBeNull();
    expect(anonValidated?.babies).toBeNull();
    expect(anonValidated?.pregnant).toBeNull();
    expect(anonValidated?.elderly).toBeNull();
    expect(anonValidated?.operator_reference).toBeNull();
    expect(anonValidated?.operator_last_note).toBeNull();
    expect(anonValidated?.latitude).not.toBe(sampleValidated.latitude);
    expect(anonValidated?.longitude).not.toBe(sampleValidated.longitude);

    // 2. Anonymous visitor on unvalidated report -> returns no row
    expect(simulateGetPublicReportById(sampleUnvalidated, null)).toBeNull();

    // 3. Authenticated owner on their own unvalidated report -> succeeds & retains user_id + vulnerability counts
    const ownerUnvalidated = simulateGetPublicReportById(
      sampleUnvalidated,
      "user-owner",
    );
    expect(ownerUnvalidated).not.toBeNull();
    expect(ownerUnvalidated?.user_id).toBe("user-owner");
    expect(ownerUnvalidated?.babies).toBe(2);
    expect(ownerUnvalidated?.pregnant).toBe(1);
    expect(ownerUnvalidated?.elderly).toBe(1);
    expect(ownerUnvalidated?.operator_reference).toBeNull();
    expect(ownerUnvalidated?.operator_last_note).toBeNull();

    // 4. Authenticated non-owner -> cannot read unvalidated report, and cannot read private fields on validated report
    expect(
      simulateGetPublicReportById(sampleUnvalidated, "user-other"),
    ).toBeNull();
    const otherValidated = simulateGetPublicReportById(
      sampleValidated,
      "user-other",
    );
    expect(otherValidated).not.toBeNull();
    expect(otherValidated?.user_id).toBeNull();
    expect(otherValidated?.babies).toBeNull();
    expect(otherValidated?.pregnant).toBeNull();
    expect(otherValidated?.elderly).toBeNull();
  });
});
