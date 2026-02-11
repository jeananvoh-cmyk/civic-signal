import { Zap, Droplets, LucideIcon } from "lucide-react";

export type ServiceType = "electricity" | "water";
export type UrgencyLevel = "low" | "medium" | "high" | "critical";
export type ReportStatus = "active" | "resolved" | "verifying";

export interface Report {
  id: string;
  serviceType: ServiceType;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  urgency: UrgencyLevel;
  status: ReportStatus;
  createdAt: Date;
  resolvedAt?: Date;
  verifications: number;
  verificationsNeeded: number;
  reporterType: "household" | "business";
}

export const SERVICE_CONFIG: Record<ServiceType, { label: string; icon: LucideIcon; colorClass: string; bgClass: string; lightBgClass: string }> = {
  electricity: {
    label: "Électricité",
    icon: Zap,
    colorClass: "text-electricity",
    bgClass: "bg-electricity",
    lightBgClass: "bg-electricity-light",
  },
  water: {
    label: "Eau",
    icon: Droplets,
    colorClass: "text-water",
    bgClass: "bg-water",
    lightBgClass: "bg-water-light",
  },
};

export const URGENCY_CONFIG: Record<UrgencyLevel, { label: string; colorClass: string }> = {
  low: { label: "Faible", colorClass: "bg-success text-success-foreground" },
  medium: { label: "Moyen", colorClass: "bg-warning text-warning-foreground" },
  high: { label: "Élevé", colorClass: "bg-urgent text-urgent-foreground" },
  critical: { label: "Critique", colorClass: "bg-destructive text-destructive-foreground" },
};

export const MOCK_REPORTS: Report[] = [
  {
    id: "1",
    serviceType: "electricity",
    description: "Coupure d'électricité depuis 14h dans le quartier",
    location: "Quartier Almadies, Dakar",
    latitude: 14.7167,
    longitude: -17.4677,
    urgency: "high",
    status: "active",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    verifications: 12,
    verificationsNeeded: 15,
    reporterType: "household",
  },
  {
    id: "2",
    serviceType: "water",
    description: "Pas d'eau courante depuis ce matin",
    location: "Plateau, Abidjan",
    latitude: 5.3167,
    longitude: -4.0167,
    urgency: "critical",
    status: "verifying",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    verifications: 8,
    verificationsNeeded: 10,
    reporterType: "household",
  },
  {
    id: "3",
    serviceType: "electricity",
    description: "Micro-coupures répétées affectant les équipements",
    location: "Zone Industrielle, Douala",
    latitude: 4.0511,
    longitude: 9.7679,
    urgency: "medium",
    status: "active",
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    verifications: 5,
    verificationsNeeded: 10,
    reporterType: "business",
  },
  {
    id: "4",
    serviceType: "water",
    description: "Pression d'eau très faible depuis 3 jours",
    location: "Cocody, Abidjan",
    latitude: 5.3599,
    longitude: -3.9863,
    urgency: "low",
    status: "resolved",
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
    resolvedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    verifications: 15,
    verificationsNeeded: 15,
    reporterType: "household",
  },
  {
    id: "5",
    serviceType: "electricity",
    description: "Panne totale sur le transformateur du quartier",
    location: "Melen, Yaoundé",
    latitude: 3.8667,
    longitude: 11.5167,
    urgency: "critical",
    status: "active",
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
    verifications: 20,
    verificationsNeeded: 15,
    reporterType: "household",
  },
];
