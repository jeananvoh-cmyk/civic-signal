export interface ProfileData {
  first_name: string;
  last_name: string;
  display_name: string;
  phone: string;
  commune: string;
  quartier: string;
  user_type: string;
  bio: string;
  notifications_enabled: boolean;
  language: string;
  theme: string;
  electricity_client_id: string;
  electricity_meter_ref: string;
  electricity_meter_number: string;
  water_client_id: string;
  water_meter_ref: string;
  water_meter_number: string;
}

export interface HistoryReport {
  id: string;
  service_type: string;
  report_category: string;
  description: string;
  commune: string;
  quartier: string;
  status: string;
  urgency: string;
  created_at: string;
  resolved_at: string | null;
  verifications: number;
  start_time: string;
}

export const DELETE_REASONS = [
  "Je n'utilise plus l'application",
  "Préoccupations liées à la confidentialité",
  "Je crée un autre compte",
  "L'application ne correspond pas à mes besoins",
  "Autre raison",
] as const;
