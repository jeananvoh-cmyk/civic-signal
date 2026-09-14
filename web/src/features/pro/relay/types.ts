export type RelayOperator = "CIE" | "SODECI" | "MAIRIE" | "ONEP" | "ANARE";
export type RelayStatus = "pending" | "sent" | "error";

export interface RelayLog {
  id: string;
  report_id: string;
  operator: RelayOperator;
  email_to: string;
  status: RelayStatus;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  wa_sent_at: string | null;
  cie_ticket_number: string | null;
  cie_ticket_at: string | null;
  report?: {
    id: string;
    created_at?: string | null;
    commune: string;
    location?: string | null;
    quartier: string;
    custom_quartier?: string | null;
    address_text?: string | null;
    landmark?: string | null;
    description?: string | null;
    category?: string | null;
    service_type: string;
    verifications: number;
    urgency: string;
    meter_number?: string | null;
    contract_type?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    user_id?: string;
    reporter_phone?: string | null;
    profile_commune?: string | null;
    profile_quartier?: string | null;
  };
}

export interface RelayGroup {
  key: string;
  operator: RelayOperator;
  commune: string;
  email_to: string;
  relayIds: string[];
  quartiers: Array<{
    name: string;
    verifications: number;
    urgency: string;
    count?: number;
    addressText?: string | null;
    landmark?: string | null;
    description?: string | null;
    category?: string | null;
    serviceType?: string | null;
    createdAt?: string | null;
    lat?: number | null;
    lng?: number | null;
    reportId?: string | null;
  }>;
  totalConfirmations: number;
  hasCritical: boolean;
  meterNumbers: string[];
  reporters: Array<{ phone: string | null; meterNumber: string | null; contractType: string | null; quartier: string }>;
  waSentAt: string | null;
  cieTicketNumber: string | null;
  cieTicketAt?: string | null;
  sentAt?: string | null;
  isAllSent?: boolean;
  category?: "outage" | "infrastructure";
}
