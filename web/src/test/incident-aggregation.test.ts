import { describe, it, expect } from "vitest";
import type { ChildReportSummary } from "@/features/incidents";
import type { FieldIntervention, InterventionStatus } from "@/features/pro/interventions";

describe("Phase Incident vs. Signalement — Modèle & Agrégation", () => {
  it("fédère correctement les métriques citoyennes (personnes impactées, photos) sous un incident parent", () => {
    const parentIncident = {
      id: "parent-inc-001",
      ticket_code: "SIG-COC-ELEC-01",
      service_type: "electricity",
      report_category: "outage",
      commune: "Cocody",
      quartier: "Angré 8ème Tranche",
      description: "Transformateur HTA qui fume au carrefour bluetooth",
      impacted_people: 4,
      babies: 1,
      pregnant: 0,
      elderly: 1,
      is_incident_master: true,
      parent_incident_id: null,
      child_reports_count: 2,
    };

    const childReports: ChildReportSummary[] = [
      {
        id: "child-rep-101",
        ticket_code: "SIG-COC-ELEC-02",
        commune: "Cocody",
        quartier: "Angré 8ème Tranche",
        description: "Plus d'électricité chez nous depuis 10h suite à un grand bruit dehors",
        impacted_people: 3,
        babies: 0,
        pregnant: 1,
        elderly: 0,
        photo_url: "https://storage.signa.ci/reports/child101.jpg",
        created_at: "2026-09-05T10:15:00Z",
      },
      {
        id: "child-rep-102",
        ticket_code: "SIG-COC-ELEC-03",
        commune: "Cocody",
        quartier: "Angré 8ème Tranche",
        description: "La pharmacie n'a plus de courant, frigo vaccins en alerte",
        impacted_people: 12,
        babies: 0,
        pregnant: 0,
        elderly: 2,
        photo_url: null,
        created_at: "2026-09-05T10:22:00Z",
      },
    ];

    // Calcul de l'impact agrégé
    const totalImpacted = (parentIncident.impacted_people || 0) + childReports.reduce((sum, c) => sum + (c.impacted_people || 0), 0);
    const totalElderly = (parentIncident.elderly || 0) + childReports.reduce((sum, c) => sum + (c.elderly || 0), 0);
    const totalVulnerable = (parentIncident.babies || 0) + (parentIncident.pregnant || 0) + totalElderly + childReports.reduce((sum, c) => sum + (c.babies || 0) + (c.pregnant || 0), 0);

    expect(totalImpacted).toBe(19); // 4 + 3 + 12
    expect(totalElderly).toBe(3);   // 1 + 0 + 2
    expect(totalVulnerable).toBe(5);// 1 baby + 1 pregnant + 3 elderly = 5
    expect(parentIncident.child_reports_count).toBe(2);
    expect(parentIncident.is_incident_master).toBe(true);
    expect(parentIncident.parent_incident_id).toBeNull();
  });

  it("déduplique les incidents sur les cartes publiques en filtrant les signalements rattachés (parent_incident_id IS NULL)", () => {
    const rawReports = [
      { id: "inc-1", parent_incident_id: null, is_incident_master: true, child_reports_count: 3 },
      { id: "inc-1-c1", parent_incident_id: "inc-1", is_incident_master: false, child_reports_count: 0 },
      { id: "inc-1-c2", parent_incident_id: "inc-1", is_incident_master: false, child_reports_count: 0 },
      { id: "inc-1-c3", parent_incident_id: "inc-1", is_incident_master: false, child_reports_count: 0 },
      { id: "inc-2", parent_incident_id: null, is_incident_master: true, child_reports_count: 0 },
    ];

    // Règle d'or SIGNA.ci : seuls les incidents racines (parent_incident_id === null) sont affichés en tête de carte
    const publicMapReports = rawReports.filter((r) => r.parent_incident_id === null);

    expect(publicMapReports.length).toBe(2);
    expect(publicMapReports.map((r) => r.id)).toEqual(["inc-1", "inc-2"]);
    expect(publicMapReports[0].child_reports_count).toBe(3);
  });

  it("propage la clôture d'un incident parent à ses signalements enfants", () => {
    const parent = { id: "p1", status: "resolved", resolved_at: "2026-09-05T12:00:00Z" };
    const children = [
      { id: "c1", parent_incident_id: "p1", status: "active", resolved_at: null as string | null },
      { id: "c2", parent_incident_id: "p1", status: "processing", resolved_at: null as string | null },
    ];

    // Simulation du trigger de synchronisation
    const syncedChildren = children.map((c) => {
      if (c.parent_incident_id === parent.id && parent.status === "resolved") {
        return { ...c, status: "resolved", resolved_at: parent.resolved_at };
      }
      return c;
    });

    expect(syncedChildren.every((c) => c.status === "resolved")).toBe(true);
    expect(syncedChildren.every((c) => c.resolved_at === "2026-09-05T12:00:00Z")).toBe(true);
  });
});

describe("Tableaux de Bord Partenaires — Interventions & Preuves de Résolution", () => {
  it("gère les transitions d'état d'une intervention terrain (unassigned -> in_progress -> completed)", () => {
    const intervention: FieldIntervention = {
      id: "interv-01",
      ticket_code: "SIG-YOP-ELEC-42",
      service_type: "electricity",
      report_category: "outage",
      commune: "Yopougon",
      quartier: "Niangon Sud",
      description: "Câble torsadé arraché par un camion benne",
      status: "active",
      urgency: "critical",
      created_at: "2026-09-05T08:00:00Z",
      resolved_at: null,
      intervention_team: null,
      intervention_work_order: null,
      intervention_started_at: null,
      intervention_status: "unassigned",
      photo_url: "https://storage.signa.ci/reports/before-damage.jpg",
    };

    expect(intervention.intervention_status).toBe("unassigned");

    // Étape 1 : Assignation de brigade et émission d'un Ordre de Travail (OT)
    const assigned: FieldIntervention = {
      ...intervention,
      intervention_team: "Brigade Yopougon Nord #3",
      intervention_work_order: "OT-CIE-8492",
      intervention_status: "assigned",
    };
    expect(assigned.intervention_status).toBe("assigned");
    expect(assigned.intervention_team).toBe("Brigade Yopougon Nord #3");
    expect(assigned.intervention_work_order).toMatch(/^OT-[A-Z]+-\d+$/);

    // Étape 2 : Début des travaux sur le terrain
    const inProgress: FieldIntervention = {
      ...assigned,
      status: "processing",
      intervention_status: "in_progress",
      intervention_started_at: "2026-09-05T08:45:00Z",
    };
    expect(inProgress.intervention_status).toBe("in_progress");
    expect(inProgress.intervention_started_at).not.toBeNull();

    // Étape 3 : Dépôt de la photo de preuve de fin de travaux
    const completedWithProof: FieldIntervention = {
      ...inProgress,
      status: "resolved",
      resolved_at: "2026-09-05T10:15:00Z",
      intervention_status: "completed",
      proof_photo_url: "https://storage.signa.ci/proofs/after-repair.jpg",
      proof_notes: "Câble réancré et isolé. Tension rétablie à 230V contrôlée au multimètre.",
      proof_submitted_at: "2026-09-05T10:15:00Z",
      proof_verified: null, // En attente de certification DST / Mairie / Superviseur
    };

    expect(completedWithProof.intervention_status).toBe("completed");
    expect(completedWithProof.proof_photo_url).toBeDefined();
    expect(completedWithProof.proof_verified).toBeNull();
  });

  it("valide les critères d'audit et de certification avant/après pour une intervention municipale ou opérateur", () => {
    interface AuditVerificationInput {
      hasBeforePhoto: boolean;
      hasAfterPhoto: boolean;
      workOrder: string | null;
      proofNotes: string | null;
    }

    function auditIntervention(input: AuditVerificationInput): { isCertifiable: boolean; reasons: string[] } {
      const reasons: string[] = [];
      if (!input.hasBeforePhoto) reasons.push("Photo initiale du constat manquante");
      if (!input.hasAfterPhoto) reasons.push("Photo de preuve après réparation manquante");
      if (!input.workOrder || !input.workOrder.startsWith("OT-")) reasons.push("Ordre de travail officiel requis");
      if (!input.proofNotes || input.proofNotes.length < 10) reasons.push("Compte-rendu technique insuffisant");

      return {
        isCertifiable: reasons.length === 0,
        reasons,
      };
    }

    const invalidAudit = auditIntervention({
      hasBeforePhoto: true,
      hasAfterPhoto: false, // pas de photo après travaux
      workOrder: "OT-DST-1234",
      proofNotes: "Fait",
    });
    expect(invalidAudit.isCertifiable).toBe(false);
    expect(invalidAudit.reasons).toContain("Photo de preuve après réparation manquante");
    expect(invalidAudit.reasons).toContain("Compte-rendu technique insuffisant");

    const validAudit = auditIntervention({
      hasBeforePhoto: true,
      hasAfterPhoto: true,
      workOrder: "OT-SODECI-9012",
      proofNotes: "Remplacement du manchon fonte DN150 fissuré, purge et remise en eau effectuée.",
    });
    expect(validAudit.isCertifiable).toBe(true);
    expect(validAudit.reasons.length).toBe(0);
  });
});
