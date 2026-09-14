export type InterventionStatus = "unassigned" | "assigned" | "in_progress" | "completed";

export interface FieldIntervention {
  reportId: string;
  ticketCode?: string | null;
  serviceType: string;
  reportCategory: string;
  description: string;
  commune: string;
  quartier?: string | null;
  status: string;
  urgency: string;
  createdAt: string;
  resolvedAt?: string | null;
  interventionTeam?: string | null;
  interventionWorkOrder?: string | null;
  interventionStatus?: InterventionStatus | null;
  interventionStartedAt?: string | null;
  operatorReference?: string | null;
  operatorName?: string | null;
  operatorLastNote?: string | null;
  estimatedResolutionTime?: string | null;
  photoUrl?: string | null;
  photoUrls?: string[] | null;
  repairPhotos?: string[] | null;
  repairNote?: string | null;
  repairDeclaredAt?: string | null;
  repairStatus?: string | null;
  resolvedWithTransfer?: boolean | null;
  childReportsCount?: number;
  parentIncidentId?: string | null;
}

export interface WorkOrderActionPayload {
  reportId: string;
  status: string;
  interventionTeam?: string;
  interventionWorkOrder?: string;
  interventionStatus?: InterventionStatus;
  note?: string;
  etaDays?: number;
  resolvedWithTransfer?: boolean;
  decision?: "approve" | "reject";
}
