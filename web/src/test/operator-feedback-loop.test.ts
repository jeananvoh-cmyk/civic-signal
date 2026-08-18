import { describe, it, expect, vi, beforeEach } from "vitest";

// Simulation de la logique de traitement du Webhook Opérateur
interface WebhookPayload {
  ticket_code?: string;
  report_id?: string;
  status: "active" | "processing" | "resolved" | "rejected";
  operator_name?: string;
  operator_reference?: string;
  public_note?: string;
  internal_note?: string;
  estimated_resolution_time?: string;
}

interface Stakeholder {
  user_id: string;
  role: "author" | "corroborator" | "supporter";
}

function validateWebhookPayload(payload: Partial<WebhookPayload>, secretHeader?: string, expectedSecret: string = "secret-pada-key") {
  if (!secretHeader || secretHeader !== expectedSecret) {
    return { valid: false, error: "Unauthorized: Invalid or missing x-operator-key", status: 401 };
  }

  if (!payload.ticket_code && !payload.report_id) {
    return { valid: false, error: "Missing identifier: provide ticket_code or report_id", status: 400 };
  }

  const validStatuses = ["active", "processing", "resolved", "rejected"];
  if (!payload.status || !validStatuses.includes(payload.status)) {
    return { valid: false, error: `Invalid status: must be one of ${validStatuses.join(", ")}`, status: 400 };
  }

  if (payload.ticket_code && !/^SIG-[A-Z]{3}-\d{8}-\d{4}$/.test(payload.ticket_code)) {
    return { valid: false, error: "Malformed ticket_code format", status: 400 };
  }

  return { valid: true, error: null, status: 200 };
}

function computeStakeholderFanoutNotifications(
  stakeholders: Stakeholder[],
  update: { ticket_code: string; status: string; operator_name?: string; operator_reference?: string; public_note?: string }
) {
  const uniqueUsers = Array.from(new Set(stakeholders.map((s) => s.user_id)));
  const title =
    update.status === "processing"
      ? `🛠️ Prise en charge (${update.operator_name || "Opérateur"})`
      : update.status === "resolved"
      ? "✅ Incident résolu"
      : "Mise à jour de votre signalement";

  const message = update.public_note
    ? `${update.public_note} (Réf: ${update.operator_reference || update.ticket_code})`
    : `Votre signalement ${update.ticket_code} est désormais marqué : ${update.status}`;

  return uniqueUsers.map((userId) => ({
    user_id: userId,
    title,
    message,
    ticket_code: update.ticket_code,
    type: "report_status_update",
    created_at: new Date().toISOString(),
  }));
}

describe("Operator Feedback Loop & Webhook Validation", () => {
  it("should reject requests with missing or invalid x-operator-key secret", () => {
    const resNoKey = validateWebhookPayload({ ticket_code: "SIG-COC-20260818-0001", status: "processing" });
    expect(resNoKey.valid).toBe(false);
    expect(resNoKey.status).toBe(401);

    const resWrongKey = validateWebhookPayload(
      { ticket_code: "SIG-COC-20260818-0001", status: "processing" },
      "wrong-key"
    );
    expect(resWrongKey.valid).toBe(false);
    expect(resWrongKey.status).toBe(401);
  });

  it("should reject payloads with invalid status", () => {
    const res = validateWebhookPayload(
      { ticket_code: "SIG-COC-20260818-0001", status: "unknown_status" as any },
      "secret-pada-key"
    );
    expect(res.valid).toBe(false);
    expect(res.status).toBe(400);
    expect(res.error).toContain("Invalid status");
  });

  it("should validate well-formed operator payloads for CIE and SODECI", () => {
    const ciePayload: WebhookPayload = {
      ticket_code: "SIG-COC-20260818-0001",
      status: "processing",
      operator_name: "CIE",
      operator_reference: "CIE-OT-9842",
      public_note: "Équipe dépêchée sur place au transformateur Riviera 2.",
      estimated_resolution_time: "2026-08-18T14:00:00Z",
    };

    const res = validateWebhookPayload(ciePayload, "secret-pada-key");
    expect(res.valid).toBe(true);
    expect(res.status).toBe(200);
  });

  it("should dispatch push/in-app notifications to all unique stakeholders (author + corroborators + supporters)", () => {
    const stakeholders: Stakeholder[] = [
      { user_id: "user-author-1", role: "author" },
      { user_id: "user-corrob-2", role: "corroborator" },
      { user_id: "user-corrob-3", role: "corroborator" },
      { user_id: "user-author-1", role: "supporter" }, // Doublon (auteur ayant aussi voté)
      { user_id: "user-support-4", role: "supporter" },
    ];

    const notifications = computeStakeholderFanoutNotifications(stakeholders, {
      ticket_code: "SIG-COC-20260818-0001",
      status: "processing",
      operator_name: "CIE",
      operator_reference: "CIE-OT-9842",
      public_note: "Équipe dépêchée sur place au transformateur Riviera 2.",
    });

    // 4 utilisateurs uniques au total
    expect(notifications.length).toBe(4);
    expect(notifications.map((n) => n.user_id)).toEqual([
      "user-author-1",
      "user-corrob-2",
      "user-corrob-3",
      "user-support-4",
    ]);

    expect(notifications[0].title).toBe("🛠️ Prise en charge (CIE)");
    expect(notifications[0].message).toContain("Riviera 2");
    expect(notifications[0].message).toContain("CIE-OT-9842");
  });

  it("should correctly handle resolved status transition with resolution confirmation", () => {
    const stakeholders: Stakeholder[] = [
      { user_id: "user-author-1", role: "author" },
      { user_id: "user-corrob-2", role: "corroborator" },
    ];

    const notifications = computeStakeholderFanoutNotifications(stakeholders, {
      ticket_code: "SIG-YOP-20260818-0042",
      status: "resolved",
      operator_name: "SODECI",
      operator_reference: "SOD-REP-102",
      public_note: "Canalisation principale réparée et pression rétablie.",
    });

    expect(notifications.length).toBe(2);
    expect(notifications[0].title).toBe("✅ Incident résolu");
    expect(notifications[0].message).toContain("Canalisation principale réparée");
  });
});
