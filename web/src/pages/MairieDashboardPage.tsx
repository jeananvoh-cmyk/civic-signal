import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2, Landmark, MapPin, Wrench, Lightbulb, Waves, Trash2,
  CheckCircle2, Clock, AlertTriangle, UserCheck, FileText,
  Filter, Search, ArrowRight, Printer, Share2, Shield,
  TrendingUp, Users, ChevronRight, CheckCircle, ExternalLink,
  Sparkles, Phone, Calendar, Download, Loader2, Camera, ShieldCheck,
  Zap, Droplets
} from "lucide-react";
import { exportMayorMonthlyReportPDF, type MayorReportItem } from "@/lib/export-pdf";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { COMMUNES } from "@/lib/communes";
import { COMMUNE_LOGOS } from "@/lib/commune-logos";
import { getInfraIllustration } from "@/lib/infra-icons";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { usePageMeta } from "@/hooks/usePageMeta";

// Photo avec résolution de signature Supabase ou illustration
function MairieReportPhoto({
  photoPath,
  serviceType,
  description,
}: {
  photoPath?: string | null;
  serviceType: string;
  description: string;
}) {
  const signedUrl = useSignedUrl(photoPath ?? null);
  const illustration = getInfraIllustration(serviceType, description);

  return (
    <div className="rounded-2xl overflow-hidden h-32 w-full border border-border bg-muted/30 relative group shadow-2xs">
      <img
        src={signedUrl || illustration}
        alt="Preuve terrain ou illustration"
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-2xs text-white text-[9px] font-bold px-2.5 py-0.5 flex items-center justify-between">
        <span>{signedUrl ? "Photo constat terrain" : "Illustration indicative"}</span>
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface InfraReport {
  id: string;
  ticket_code?: string | null;
  service_type: string;
  report_category: string;
  description: string;
  commune: string;
  quartier: string;
  status: string;
  urgency: string;
  verifications: number;
  impacted_people: number;
  created_at: string;
  resolved_at: string | null;
  photo_url: string | null;
  photo_urls: string[] | null;
  operator_reference?: string | null;
  estimated_resolution_time?: string | null;
  operator_last_note?: string | null;
  assigned_team?: string | null;
  repair_photos?: string[] | null;
  repair_note?: string | null;
  repair_declared_at?: string | null;
  repair_status?: string | null;
  resolved_with_transfer?: boolean | null;
}

const MUNICIPAL_TEAMS = [
  "Brigade Voirie & Enrobé (Nids-de-poule)",
  "Liaison CIE Éclairage (Lampadaires)",
  "Équipe Curage & Caniveaux (Hydraulique)",
  "Régie Salubrité & Déchets Urbains",
  "Service Urbanisme & Sécurité Publique",
];

const CIE_TEAMS = [
  "Intervention Haute/Moyenne Tension (Postes & Réseau)",
  "Équipe Dépannage Basse Tension (Quartier)",
  "Brigade Poteaux & Câbles Décrochés",
  "Maintenance Éclairage Public & Lampadaires",
  "Service Comptage & Raccordement",
];

const SODECI_TEAMS = [
  "Brigade Réparation Fuites & Canalisations",
  "Intervention Usine & Surpresseur (Basse Pression)",
  "Équipe Vannes & Distribution Quartier",
  "Remplacement Compteurs & Branchements",
  "Service Qualité Eau & Salubrité Réseau",
];

const VOIRIE_TEAMS = [
  "Brigade Terrassement & Enrobé à Chaud",
  "Équipe Curage Caniveaux & Collecteurs",
  "Signalisation Verticale & Feux Tricolores",
  "Intervention Ouvrages d'Art & Chaussée",
];

const CATEGORY_MAP: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  lampadaire: { label: "Éclairage Public (CIE)", icon: Lightbulb, color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
  poteau: { label: "Poteau Électrique (CIE)", icon: Lightbulb, color: "text-amber-600 bg-amber-600/10 border-amber-600/30" },
  caniveau: { label: "Caniveau & Drainage", icon: Waves, color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  voirie: { label: "Voirie & Chaussée", icon: Wrench, color: "text-teal-600 bg-teal-600/10 border-teal-600/30" },
  salubrite: { label: "Salubrité & Déchets", icon: Trash2, color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30" },
  infrastructure: { label: "Infrastructure", icon: Landmark, color: "text-slate-600 bg-slate-500/10 border-slate-500/30" },
};

function formatHours(h: number) {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 24) return `${Math.round(h)} h`;
  return `${(h / 24).toFixed(1)} j`;
}

const MairieDashboardPage = () => {
  const { communeName: paramCommune } = useParams<{ communeName?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedCommune, setSelectedCommune] = useState<string>(
    paramCommune ? decodeURIComponent(paramCommune) : "Cocody"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>("all");

  // Modal d'assignation / mise à jour
  const [actionDialog, setActionDialog] = useState<{ report: InfraReport; newStatus: string } | null>(null);
  const [actionTeam, setActionTeam] = useState("");
  const [actionWorkOrder, setActionWorkOrder] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [actionEtaDays, setActionEtaDays] = useState("2");
  const [actionResolvedWithTransfer, setActionResolvedWithTransfer] = useState(true);
  const [actionRepairDecision, setActionRepairDecision] = useState<"approve" | "reject">("approve");

  // Partner profile for municipal agent or operator partner (CIE, SODECI, Voirie)
  const { data: partnerProfile } = useQuery({
    queryKey: ["mairie-partner-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("partner_profiles")
        .select("organization_name, partner_type, commune")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const partnerType = partnerProfile?.partner_type || "mairie";
  const partnerOrgName = partnerProfile?.organization_name;

  // Titre et équipes adaptées
  const pageTitle = partnerOrgName
    ? `Espace Services Techniques · ${partnerOrgName}`
    : `Espace Services Techniques · Mairie de ${selectedCommune}`;

  usePageMeta({
    title: `${pageTitle} — SIGNA.ci`,
    description: `Console d'intervention et de suivi pour les partenaires techniques conventionnés (Mairies, CIE, SODECI, Voirie) sur SIGNA.ci.`,
  });

  const availableTeams = useMemo(() => {
    if (partnerType === "cie") return CIE_TEAMS;
    if (partnerType === "sodeci") return SODECI_TEAMS;
    if (partnerType === "other") return VOIRIE_TEAMS;
    return MUNICIPAL_TEAMS;
  }, [partnerType]);

  // Contrôle d'accès : Rôles autorisés (Admin ou Partenaire quel que soit le type)
  const { data: isAdmin = false, isLoading: adminLoading } = useQuery({
    queryKey: ["is-admin-role", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return data === true;
    },
    enabled: !!user,
  });

  const { data: isPartner = false, isLoading: partnerRoleLoading } = useQuery({
    queryKey: ["is-partner-role", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "partner" });
      return data === true;
    },
    enabled: !!user,
  });

  const isAuthorized = isAdmin || isPartner;

  // Lock selectedCommune if municipal partner has an assigned commune
  const activeCommune = partnerProfile?.partner_type === "mairie" && partnerProfile.commune
    ? partnerProfile.commune
    : selectedCommune;

  // Charger les signalements attribués ou de la commune
  const { data: rawReports = [], isLoading } = useQuery<InfraReport[]>({
    queryKey: ["mairie-reports", activeCommune, partnerType, user?.id],
    queryFn: async () => {
      // 1. Essayer le RPC partenaire si connecté
      if (user && partnerProfile) {
        const { data: rpcData, error: rpcError } = await supabase.rpc("get_partner_reports");
        if (!rpcError && rpcData && rpcData.length > 0) {
          return rpcData.map((r: any) => ({
            id: r.id,
            ticket_code: r.ticket_code,
            service_type: r.service_type,
            report_category: r.report_category,
            description: r.description,
            commune: r.commune,
            quartier: r.quartier,
            status: r.status,
            urgency: r.urgency,
            verifications: r.support_count ?? 0,
            impacted_people: r.impacted_people ?? 1,
            created_at: r.created_at,
            resolved_at: r.resolved_at ?? null,
            photo_url: r.photo_url || null,
            photo_urls: r.photo_urls || null,
            operator_reference: r.operator_reference,
            estimated_resolution_time: r.estimated_resolution_time,
            operator_last_note: r.operator_last_note,
            assigned_team: r.assigned_team || null,
            repair_photos: r.repair_photos || null,
            repair_note: r.repair_note || null,
            repair_declared_at: r.repair_declared_at || null,
            repair_status: r.repair_status || "none",
            resolved_with_transfer: r.resolved_with_transfer ?? null,
          })) as InfraReport[];
        }
      }

      // 2. Requête par commune ou par type d'opérateur
      let query = supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);

      if (partnerType === "cie") {
        query = query.eq("service_type", "electricity");
      } else if (partnerType === "sodeci") {
        query = query.eq("service_type", "water");
      } else if (activeCommune) {
        query = query.eq("commune", activeCommune);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as InfraReport[];
    },
  });

  // Filtrer selon le périmètre de l'opérateur technique
  const municipalReports = useMemo(() => {
    if (partnerType === "cie") {
      return rawReports.filter((r) => r.service_type === "electricity");
    }
    if (partnerType === "sodeci") {
      return rawReports.filter((r) => r.service_type === "water");
    }
    return rawReports.filter((r) => {
      const cat = r.report_category?.toLowerCase() || "";
      const sType = r.service_type?.toLowerCase() || "";
      const isInfra = sType === "infrastructure" || cat.includes("voirie") || cat.includes("lampadaire") || cat.includes("caniveau") || cat.includes("salubrite") || cat.includes("poteau");
      return isInfra || (sType !== "electricity" && sType !== "water");
    });
  }, [rawReports, partnerType]);

  // Statistiques communales
  const stats = useMemo(() => {
    const total = municipalReports.length;
    const active = municipalReports.filter((r) => r.status === "active").length;
    const processing = municipalReports.filter((r) => r.status === "processing").length;
    const resolved = municipalReports.filter((r) => r.status === "resolved").length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    // Délai moyen de résolution
    const resolvedReports = municipalReports.filter((r) => r.resolved_at);
    let avgHours = 0;
    if (resolvedReports.length > 0) {
      const sum = resolvedReports.reduce((acc, r) => {
        return acc + (new Date(r.resolved_at!).getTime() - new Date(r.created_at).getTime());
      }, 0);
      avgHours = sum / (resolvedReports.length * 3600000);
    }

    // Top Quartiers
    const quartierCounts: Record<string, number> = {};
    municipalReports.forEach((r) => {
      if (r.quartier) {
        quartierCounts[r.quartier] = (quartierCounts[r.quartier] || 0) + 1;
      }
    });
    const pendingProof = municipalReports.filter((r) => r.repair_status === "pending_review").length;
    const topQuartiers = Object.entries(quartierCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    return { total, active, processing, pendingProof, resolved, resolutionRate, avgHours, topQuartiers };
  }, [municipalReports]);

  // Filtrage combiné (recherche, onglet, catégorie)
  const filteredReports = useMemo(() => {
    return municipalReports.filter((r) => {
      if (selectedStatusTab === "pending_proof") {
        if (r.repair_status !== "pending_review") return false;
      } else if (selectedStatusTab !== "all" && r.status !== selectedStatusTab) {
        return false;
      }
      if (selectedCategoryFilter !== "all" && r.report_category !== selectedCategoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = r.description?.toLowerCase().includes(q);
        const matchQuartier = r.quartier?.toLowerCase().includes(q);
        const matchCode = r.ticket_code?.toLowerCase().includes(q);
        const matchRef = r.operator_reference?.toLowerCase().includes(q);
        if (!matchDesc && !matchQuartier && !matchCode && !matchRef) return false;
      }
      return true;
    });
  }, [municipalReports, selectedStatusTab, selectedCategoryFilter, searchQuery]);

  // Mutation : mise à jour par l'agent technique ou partenaire
  const updateMutation = useMutation({
    mutationFn: async ({
      reportId,
      status,
      team,
      workOrder,
      note,
      etaDays,
      resolvedWithTransfer,
      decision,
    }: {
      reportId: string;
      status: string;
      team?: string;
      workOrder?: string;
      note?: string;
      etaDays?: number;
      resolvedWithTransfer?: boolean;
      decision?: "approve" | "reject";
    }) => {
      const isPendingProof = actionDialog?.report.repair_status === "pending_review";

      // Si c'est une modération de preuve citoyenne
      if (isPendingProof && decision) {
        const { error: modError } = await (supabase as any).rpc("moderate_repair_declaration", {
          p_report_id: reportId,
          p_decision: decision,
          p_resolved_with_transfer: resolvedWithTransfer ?? true,
          p_moderator_note: note || null,
        });
        if (!modError) return;
      }

      const etaDate = etaDays ? new Date(Date.now() + etaDays * 24 * 3600000).toISOString() : null;
      const fullNote = [
        team ? `[Équipe: ${team}]` : "",
        workOrder ? `[OT N°: ${workOrder}]` : "",
        note || "",
      ].filter(Boolean).join(" ");

      const opName = partnerOrgName || `Mairie de ${selectedCommune} (Services Techniques)`;

      const { error } = await supabase.rpc("operator_update_ticket", {
        p_report_id: reportId,
        p_ticket_code: null,
        p_status: status,
        p_operator_name: opName,
        p_operator_reference: workOrder || null,
        p_public_note: fullNote || null,
        p_estimated_resolution: etaDate,
      });

      if (error) {
        // Fallback standard si RPC indisponible
        const updatePayload: any = {
          status,
          operator_reference: workOrder || null,
          operator_last_note: fullNote || null,
          resolved_at: status === "resolved" ? new Date().toISOString() : null,
        };
        if (status === "resolved") {
          updatePayload.resolved_with_transfer = resolvedWithTransfer ?? true;
        }
        const { error: fallbackErr } = await supabase
          .from("reports")
          .update(updatePayload)
          .eq("id", reportId);
        if (fallbackErr) throw fallbackErr;
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["mairie-reports", selectedCommune] });
      const msg = status === "processing"
        ? "Chantier pris en charge par l'équipe municipale"
        : status === "resolved"
        ? "Incident marqué Résolu et clôturé ✅"
        : "Fiche d'intervention mise à jour";
      toast.success(msg);
      setActionDialog(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors de la mise à jour");
    },
  });

  const handleOpenAction = (report: InfraReport, newStatus: string) => {
    setActionDialog({ report, newStatus });
    setActionTeam(report.assigned_team || MUNICIPAL_TEAMS[0]);
    setActionWorkOrder(report.operator_reference || `OT-${selectedCommune.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setActionNote(report.operator_last_note || "");
  };

  const handleConfirmAction = () => {
    if (!actionDialog) return;
    updateMutation.mutate({
      reportId: actionDialog.report.id,
      status: actionDialog.newStatus,
      team: actionTeam,
      workOrder: actionWorkOrder.trim(),
      note: actionNote.trim(),
      etaDays: parseInt(actionEtaDays, 10) || 2,
    });
  };

  // Exportation des données de la Mairie en CSV / Excel
  const handleExportCSV = () => {
    if (municipalReports.length === 0) {
      toast.error("Aucun dossier à exporter pour cette mairie.");
      return;
    }

    const headers = [
      "Date de Signalement",
      "N° Ticket",
      "Commune",
      "Quartier",
      "Catégorie",
      "Description",
      "Statut",
      "N° Ordre de Travail (OT)",
      "Note Technique / Rapport",
      "Délai Estimé / Clôture",
      "Nombre de Soutiens Citoyens",
    ];

    const rows = municipalReports.map((r) => [
      `"${new Date(r.created_at).toLocaleDateString("fr-FR")}"`,
      `"${r.ticket_code || "–"}"`,
      `"${r.commune}"`,
      `"${r.quartier || "–"}"`,
      `"${r.report_category || r.service_type}"`,
      `"${(r.description || "").replace(/"/g, '""')}"`,
      `"${r.status === "resolved" ? "Résolu" : r.status === "processing" ? "En cours" : "À planifier"}"`,
      `"${r.operator_reference || "–"}"`,
      `"${(r.operator_last_note || "").replace(/"/g, '""')}"`,
      `"${r.resolved_at ? new Date(r.resolved_at).toLocaleDateString("fr-FR") : (r.estimated_resolution_time ? new Date(r.estimated_resolution_time).toLocaleDateString("fr-FR") : "–")}"`,
      `"${r.verifications || 0}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Rapport_Services_Techniques_Mairie_${selectedCommune}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Export Excel/CSV de la Mairie de ${selectedCommune} téléchargé !`);
  };

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportMayorPDF = async () => {
    if (municipalReports.length === 0) {
      toast.error(`Aucun dossier enregistré pour la Mairie de ${selectedCommune}.`);
      return;
    }
    setIsExportingPdf(true);
    try {
      const items: MayorReportItem[] = municipalReports.map((r) => ({
        id: r.id,
        service_type: r.service_type || "infrastructure",
        description: r.description,
        location: r.commune,
        quartier: r.quartier,
        status: r.status,
        created_at: r.created_at,
        resolved_at: r.resolved_at,
        upvotes_count: r.verifications || r.impacted_people || 0,
      }));

      const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date());
      await exportMayorMonthlyReportPDF({
        commune: selectedCommune,
        reports: items,
        monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
      });
      toast.success(`Rapport officiel du Maire téléchargé pour ${selectedCommune} !`);
    } catch (err: any) {
      console.error("Mayor PDF export error:", err);
      toast.error("Erreur lors de la génération du rapport PDF");
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (adminLoading || partnerRoleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-between">
        <Header />
        <main className="container max-w-2xl px-4 py-16 text-center space-y-6 flex-1 flex flex-col justify-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 shadow-sm">
            <Shield className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold text-foreground">
              Espace Réservé aux Services Techniques Municipaux
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ce tableau de bord technique est strictement réservé aux agents accrédités de la Direction des Services Techniques (DST) de la Mairie de {selectedCommune} et aux administrateurs SIGNA.ci.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 text-left space-y-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Vous représentez une mairie ou une collectivité locale ?
            </p>
            <p className="text-xs text-foreground leading-relaxed">
              Contactez l'équipe SIGNA.ci pour obtenir une accréditation officielle, attribuer des comptes techniques à vos chefs de brigade de voirie et recevoir directement les signalements citoyens.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Button asChild className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10">
                <Link to="/partenaires">
                  <Landmark className="mr-1.5 h-4 w-4" /> Demander un accès Partenaire
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1 text-xs font-semibold h-10">
                <Link to={`/commune/${encodeURIComponent(selectedCommune)}`}>
                  Consulter la vue citoyenne
                </Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const activeCommuneObj = COMMUNES.find((c) => c.nom === selectedCommune);
  const logoUrl = COMMUNE_LOGOS[selectedCommune];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {/* En-tête Mairie & Sélecteur Territorial */}
        <div className="rounded-3xl border border-border bg-gradient-to-r from-emerald-500/15 via-card to-card p-6 sm:p-8 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl overflow-hidden border-2 border-border bg-white shadow-md shrink-0">
              {partnerType === "cie" ? (
                <div className="flex flex-col items-center justify-center h-full w-full bg-amber-500/10 text-amber-600 font-black text-sm">
                  <Zap className="h-8 w-8 text-amber-500 mb-0.5" />
                  CIE
                </div>
              ) : partnerType === "sodeci" ? (
                <div className="flex flex-col items-center justify-center h-full w-full bg-blue-500/10 text-blue-600 font-black text-sm">
                  <Droplets className="h-8 w-8 text-blue-500 mb-0.5" />
                  SODECI
                </div>
              ) : logoUrl ? (
                <img src={logoUrl} alt={selectedCommune} className="h-full w-full object-contain p-1.5" />
              ) : (
                <Building2 className="h-10 w-10 text-primary" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  {partnerType === "cie"
                    ? "Réseau Électrique · Espace Partenaire CIE"
                    : partnerType === "sodeci"
                    ? "Réseau Eau Potable · Espace Partenaire SODECI"
                    : "Services Techniques & Voirie"}
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight mt-1">
                {partnerOrgName || `Mairie de ${selectedCommune}`}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {partnerType === "cie"
                  ? "Prise en charge des pannes réseau, câbles et éclairage · Côte d'Ivoire"
                  : partnerType === "sodeci"
                  ? "Prise en charge des fuites, canalisations et coupures · Grand Abidjan"
                  : `Pilotage des interventions urbaines · Grand Abidjan · ${activeCommuneObj?.population ? (activeCommuneObj.population / 1000).toFixed(0) + "k habitants" : "District d'Abidjan"}`}
              </p>
            </div>
          </div>

          {/* Sélecteur de Commune / Partenaire */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="bg-background/90 backdrop-blur-md rounded-2xl border border-border p-1 shadow-sm">
              <Select
                value={selectedCommune}
                onValueChange={(val) => {
                  setSelectedCommune(val);
                  navigate(`/mairie/${encodeURIComponent(val)}`);
                }}
              >
                <SelectTrigger className="h-11 w-full sm:w-[220px] rounded-xl border-none font-bold text-xs">
                  <SelectValue placeholder="Changer de Mairie" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {COMMUNES.map((c) => (
                    <SelectItem key={c.id} value={c.nom} className="text-xs font-semibold">
                      Mairie de {c.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={handleExportMayorPDF}
              disabled={isExportingPdf}
              className="h-11 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-2 shadow-sm"
            >
              {isExportingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <FileText className="h-4 w-4 text-white" />
              )}
              {isExportingPdf ? "Génération..." : "Rapport Mensuel Maire (PDF)"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-11 px-4 rounded-xl border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold gap-2"
            >
              <Download className="h-4 w-4 text-emerald-600" />
              Exporter Excel / CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="h-11 px-4 rounded-xl border-border text-xs font-bold gap-2"
            >
              <Printer className="h-4 w-4" />
              Imprimer le Registre
            </Button>
          </div>
        </div>

        {/* Bandeau Cadre Conventionnel & Partenariat Technique Multi-Opérateurs */}
        <div className="rounded-3xl border border-emerald-500/25 bg-emerald-500/5 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">
                Console des Équipes Techniques Partenaires (Mairies, CIE, SODECI, Voirie)
              </p>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">
                Espace réservé aux services techniques conventionnés avec SIGNA.ci pour la prise en charge directe, l'attribution des Ordres de Travaux (OT), le suivi des chantiers et la clôture des incidents citoyens sans barrière informatique.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 font-bold text-xs py-1 px-3 shrink-0">
            Partenariat Actif · Guichet Direct
          </Badge>
        </div>

        {/* 4 KPIs Clés des Services Techniques */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="rounded-3xl border border-border shadow-sm p-5 bg-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Incidents Totaux</span>
              <Landmark className="h-4 w-4 text-primary" />
            </div>
            <div className="text-3xl font-black text-foreground mt-2">{stats.total}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Voirie, caniveaux, salubrité &amp; suivi CIE</p>
          </Card>

          <Card className="rounded-3xl border border-border shadow-sm p-5 bg-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>En cours d'intervention</span>
              <Wrench className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-3xl font-black text-amber-500 mt-2">{stats.active + stats.processing}</div>
            <p className="text-[11px] text-muted-foreground mt-1">{stats.processing} pris en charge par la régie</p>
          </Card>

          <Card className="rounded-3xl border border-border shadow-sm p-5 bg-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Taux de Résolution</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-black text-emerald-500 mt-2">{stats.resolutionRate} %</div>
            <p className="text-[11px] text-muted-foreground mt-1">{stats.resolved} chantiers finalisés</p>
          </Card>

          <Card className="rounded-3xl border border-border shadow-sm p-5 bg-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Délai Moyen Réparation</span>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-3xl font-black text-blue-500 mt-2">
              {stats.avgHours > 0 ? formatHours(stats.avgHours) : "–"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Objectif municipal : &lt; 72h</p>
          </Card>
        </div>

        {/* Barre de Recherche, Filtres & Onglets */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par quartier, description ou N° OT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 rounded-2xl text-xs bg-card border-border"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs text-muted-foreground font-bold shrink-0">Catégorie :</span>
              <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                <SelectTrigger className="h-10 rounded-xl text-xs font-bold w-[160px] bg-card">
                  <SelectValue placeholder="Toutes catégories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  <SelectItem value="voirie">🚧 Voirie &amp; Nids-de-poule</SelectItem>
                  <SelectItem value="lampadaire">💡 Éclairage &amp; Lampadaire</SelectItem>
                  <SelectItem value="caniveau">🌊 Caniveau &amp; Drainage</SelectItem>
                  <SelectItem value="salubrite">🗑️ Salubrité &amp; Déchets</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs value={selectedStatusTab} onValueChange={setSelectedStatusTab}>
            <TabsList className="h-11 rounded-2xl bg-muted/60 p-1 flex-wrap">
              <TabsTrigger value="all" className="rounded-xl text-xs font-bold">
                Tous les dossiers ({municipalReports.length})
              </TabsTrigger>
              <TabsTrigger value="active" className="rounded-xl text-xs font-bold text-red-600">
                À planifier ({stats.active})
              </TabsTrigger>
              <TabsTrigger value="processing" className="rounded-xl text-xs font-bold text-amber-600">
                En cours ({stats.processing})
              </TabsTrigger>
              <TabsTrigger value="pending_proof" className="rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 gap-1.5">
                <Camera className="h-3.5 w-3.5" />
                Preuves citoyennes ({stats.pendingProof})
              </TabsTrigger>
              <TabsTrigger value="resolved" className="rounded-xl text-xs font-bold text-emerald-600">
                Résolus ({stats.resolved})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Liste des Dossiers Municipaux */}
        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground text-sm">
            Chargement des dossiers techniques de la Mairie de {selectedCommune}...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-12 text-center bg-card/40 space-y-3">
            <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto" />
            <h3 className="font-bold text-foreground text-base">Aucun signalement en attente dans cette vue</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Tous les dossiers municipaux de {selectedCommune} correspondant à vos filtres sont à jour.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map((report) => {
              const catInfo = CATEGORY_MAP[report.report_category?.toLowerCase()] || CATEGORY_MAP.infrastructure;
              const CatIcon = catInfo.icon;
              const isResolved = report.status === "resolved";
              const isProcessing = report.status === "processing";

              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header Carte */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-extrabold border ${catInfo.color}`}>
                        <CatIcon className="h-3.5 w-3.5" />
                        {catInfo.label}
                      </span>

                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${
                          isResolved
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : isProcessing
                            ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                            : "bg-red-500/10 text-red-600 border border-red-500/20"
                        }`}
                      >
                        {isResolved ? "Résolu" : isProcessing ? "En intervention" : "Nouveau"}
                      </span>
                    </div>

                    {/* Titre & Localisation */}
                    <div>
                      <div className="flex items-center gap-1 text-xs font-bold text-foreground">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate">{report.quartier || "Quartier non précisé"}</span>
                        {report.ticket_code && (
                          <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                            #{report.ticket_code}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-3 leading-relaxed">
                        {report.description || "Signalement citoyen sans description complémentaire."}
                      </p>
                    </div>

                    {/* Photo ou illustration indicative */}
                    <MairieReportPhoto
                      photoPath={report.photo_urls && report.photo_urls.length > 0 ? report.photo_urls[0] : report.photo_url}
                      serviceType={report.service_type}
                      description={report.description}
                    />

                    {/* Détails Techniques & Équipe Assignée */}
                    <div className="p-3 rounded-2xl bg-muted/40 border border-border space-y-1.5 text-xs">
                      {report.operator_reference && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">N° Ordre de Travail :</span>
                          <span className="font-bold text-foreground font-mono">{report.operator_reference}</span>
                        </div>
                      )}
                      {report.operator_last_note && (
                        <div className="text-[11px] text-muted-foreground">
                          <span className="font-semibold text-foreground">Note technique : </span>
                          <span className="italic">{report.operator_last_note}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/60">
                        <span>Déclaré le {new Date(report.created_at).toLocaleDateString("fr-FR")}</span>
                        <span>{report.verifications} soutien(s)</span>
                      </div>
                    </div>
                  </div>

                  {/* Alerte Preuve Citoyenne soumise */}
                  {report.repair_status === "pending_review" && (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
                      <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                        <Camera className="h-4 w-4" />
                        Preuve de fin de travaux soumise par un citoyen
                      </div>
                      {report.repair_note && (
                        <p className="text-[11px] italic line-clamp-2">« {report.repair_note} »</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        En attente de certification par vos services.
                      </p>
                    </div>
                  )}

                  {/* Boutons d'Action Rapide de la Mairie / Partenaire */}
                  <div className="pt-2 flex flex-col gap-2">
                    {report.repair_status === "pending_review" && !isResolved && (
                      <Button
                        size="sm"
                        onClick={() => handleOpenAction(report, "resolved")}
                        className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        Examiner la Preuve Citoyenne &amp; Clôturer
                      </Button>
                    )}

                    {!isProcessing && !isResolved && report.repair_status !== "pending_review" && (
                      <Button
                        size="sm"
                        onClick={() => handleOpenAction(report, "processing")}
                        className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs gap-1.5 shadow-sm"
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        Assigner &amp; Prendre en charge
                      </Button>
                    )}

                    {isProcessing && report.repair_status !== "pending_review" && (
                      <Button
                        size="sm"
                        onClick={() => handleOpenAction(report, "resolved")}
                        className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Valider la Réparation
                      </Button>
                    )}

                    {isResolved && (
                      <div className="w-full py-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-center text-xs font-bold flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" /> 
                        {report.resolved_with_transfer === true 
                          ? "Clôturé suite au relais SIGNA.ci" 
                          : report.resolved_with_transfer === false 
                          ? "Clôturé (Intervention spontanée)" 
                          : "Dossier clôturé par l'équipe technique"}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Modal d'Assignation & Clôture */}
        <Dialog open={!!actionDialog} onOpenChange={(open) => !open && setActionDialog(null)}>
          <DialogContent className="rounded-3xl max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                {actionDialog?.newStatus === "resolved" ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    Validation &amp; Clôture · {partnerOrgName || `Mairie de ${selectedCommune}`}
                  </>
                ) : (
                  <>
                    <Wrench className="h-5 w-5 text-amber-500" />
                    Attribution d'Équipe Technique
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              {/* Section Preuve Citoyenne si présente */}
              {actionDialog?.report.repair_status === "pending_review" && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/8 p-3.5 space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                    <Camera className="h-4 w-4" />
                    <span>Preuve photo transmise par le citoyen :</span>
                  </div>
                  {actionDialog.report.repair_note && (
                    <p className="text-xs text-foreground bg-background/60 p-2.5 rounded-xl border border-border italic">
                      « {actionDialog.report.repair_note} »
                    </p>
                  )}
                  {actionDialog.report.repair_photos && actionDialog.report.repair_photos.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {actionDialog.report.repair_photos.map((ph, idx) => (
                        <div key={idx} className="h-24 w-24 rounded-xl overflow-hidden border border-border shrink-0">
                          <img src={ph} alt="Preuve citoyenne" className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="pt-1">
                    <label className="font-bold text-foreground block mb-1.5">
                      Décision sur la preuve citoyenne :
                    </label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold">
                        <input
                          type="radio"
                          name="repair_decision"
                          checked={actionRepairDecision === "approve"}
                          onChange={() => setActionRepairDecision("approve")}
                          className="text-emerald-600"
                        />
                        <span>Approuver &amp; Clôturer</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-destructive">
                        <input
                          type="radio"
                          name="repair_decision"
                          checked={actionRepairDecision === "reject"}
                          onChange={() => setActionRepairDecision("reject")}
                          className="text-destructive"
                        />
                        <span>Rejeter la preuve</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Qualification de la résolution pour le reporting partenaire */}
              {actionDialog?.newStatus === "resolved" && actionRepairDecision === "approve" && (
                <div className="rounded-2xl border border-border/80 bg-muted/30 p-3.5 space-y-2">
                  <label className="font-bold text-foreground block">
                    Qualification pour le rapport d'impact :
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="resolved_transfer"
                        checked={actionResolvedWithTransfer === true}
                        onChange={() => setActionResolvedWithTransfer(true)}
                        className="mt-0.5 text-primary"
                      />
                      <div>
                        <p className="font-semibold text-foreground">Résolu suite à la transmission SIGNA.ci</p>
                        <p className="text-[11px] text-muted-foreground">L'intervention a été déclenchée grâce au relais du ticket vers votre service.</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="resolved_transfer"
                        checked={actionResolvedWithTransfer === false}
                        onChange={() => setActionResolvedWithTransfer(false)}
                        className="mt-0.5 text-primary"
                      />
                      <div>
                        <p className="font-semibold text-foreground">Résolution spontanée / Maintenance externe</p>
                        <p className="text-[11px] text-muted-foreground">Le problème a été réglé sans transmission préalable directe par la plateforme.</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-foreground block mb-1.5">
                  Équipe Responsable
                </label>
                <Select value={actionTeam} onValueChange={setActionTeam}>
                  <SelectTrigger className="h-10 rounded-xl bg-muted/40">
                    <SelectValue placeholder="Sélectionner une équipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTeams.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1.5">
                  N° d'Ordre de Travail (OT Opérateur / Mairie)
                </label>
                <Input
                  value={actionWorkOrder}
                  onChange={(e) => setActionWorkOrder(e.target.value)}
                  placeholder="Ex: OT-2026-0842"
                  className="h-10 rounded-xl font-mono text-xs bg-muted/40"
                />
              </div>

              {actionDialog?.newStatus === "processing" && (
                <div>
                  <label className="font-bold text-foreground block mb-1.5">
                    Délai estimé des travaux (en jours)
                  </label>
                  <Select value={actionEtaDays} onValueChange={setActionEtaDays}>
                    <SelectTrigger className="h-10 rounded-xl bg-muted/40">
                      <SelectValue placeholder="Délai d'intervention" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">24 heures (Urgence voirie / panne)</SelectItem>
                      <SelectItem value="2">48 heures (Intervention rapide)</SelectItem>
                      <SelectItem value="3">72 heures (Standard technique)</SelectItem>
                      <SelectItem value="7">1 semaine (Gros œuvre / chantier lourd)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="font-bold text-foreground block mb-1.5">
                  Note technique ou rapport d'intervention
                </label>
                <Textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Ex: Réparation effectuée avec succès. Contrôle de conformité validé sur le terrain."
                  className="rounded-xl text-xs bg-muted/40 min-h-[90px]"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionDialog(null)}
                className="rounded-xl text-xs font-semibold"
              >
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (!actionDialog) return;
                  updateMutation.mutate({
                    reportId: actionDialog.report.id,
                    status: actionRepairDecision === "reject" ? actionDialog.report.status : actionDialog.newStatus,
                    team: actionTeam,
                    workOrder: actionWorkOrder.trim(),
                    note: actionNote.trim(),
                    etaDays: parseInt(actionEtaDays, 10) || 2,
                    resolvedWithTransfer: actionResolvedWithTransfer,
                    decision: actionRepairDecision,
                  });
                }}
                disabled={updateMutation.isPending}
                className={`rounded-xl text-xs font-bold ${
                  actionRepairDecision === "reject"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : actionDialog?.newStatus === "resolved"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-amber-500 hover:bg-amber-600 text-black"
                }`}
              >
                {updateMutation.isPending 
                  ? "Enregistrement..." 
                  : actionRepairDecision === "reject" 
                  ? "Rejeter la preuve" 
                  : "Confirmer & Enregistrer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
      <Footer />
    </div>
  );
};

export default MairieDashboardPage;
