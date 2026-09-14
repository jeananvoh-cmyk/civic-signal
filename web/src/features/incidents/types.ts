import type { ServiceType } from "@/lib/data";

export type ReportTypeId =
  | "electricity_outage"
  | "water_outage"
  // --- CIE (Électricité & Éclairage Public) ---
  | "street_light"
  | "cie_pole"
  | "cie_hazard"
  | "cie_other"
  // --- SODECI (Eau Potable & Assainissement) ---
  | "canalisation_sodeci"
  | "water_leak"
  | "sodeci_other"
  // --- MAIRIE (Voirie & Salubrité) ---
  | "pothole"
  | "drain_blocked"
  | "road_damage"
  | "open_sewer"
  | "market_waste"
  | "illegal_dump"
  | "other";

export interface ReportTypeConfig {
  id: ReportTypeId;
  emoji: string;
  label: string;
  description?: string;
  image?: string;
  color: string;
  serviceType: ServiceType;
  reportCategory: "outage" | "infrastructure";
  operator?: "CIE" | "SODECI" | "MAIRIE";
  defaultDesc: (commune: string) => string;
}

export interface ImpactData {
  impacted_people?: number;
  has_vulnerable_people?: boolean;
  vulnerable_elderly?: number;
  vulnerable_infants?: number;
  vulnerable_medical?: number;
}

export interface ChildReportSummary {
  id: string;
  ticket_code?: string | null;
  description: string;
  commune: string;
  quartier?: string | null;
  created_at: string;
  photo_url?: string | null;
  photo_urls?: string[] | null;
  verifications: number;
  impacted_people: number;
  status: string;
  repair_photos?: string[] | null;
  repair_status?: string | null;
}

export interface IncidentHierarchyInfo {
  parent_incident_id?: string | null;
  child_reports_count: number;
  is_incident_master: boolean;
  children?: ChildReportSummary[];
}

