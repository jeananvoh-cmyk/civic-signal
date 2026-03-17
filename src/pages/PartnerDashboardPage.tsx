import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Zap, Droplets, Building2, Handshake, MapPin, Users,
  Clock, CheckCircle2, Loader2, AlertTriangle, RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Header from "@/components/Header";
import { Navigate } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PartnerProfile {
  organization_name: string;
  partner_type: "cie" | "sodeci" | "mairie" | "ngo" | "other";
  commune: string | null;
}

interface Report {
  id: string;
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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PARTNER_TYPE_LABELS: Record<string, string> = {
  cie: "CIE — Énergie",
  sodeci: "SODECI — Eau",
  mairie: "Mairie",
  ngo: "ONG / Association",
  other: "Autre partenaire",
};

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  electricity: <Zap className="h-4 w-4 text-amber-500" />,
  water: <Droplets className="h-4 w-4 text-blue-500" />,
  mairie: <Building2 className="h-4 w-4 text-emerald-500" />,
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:     { label: "Actif",            color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  processing: { label: "En cours",         color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  resolved:   { label: "Résolu",           color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
};

const URGENCY_COLORS: Record<string, string> = {
  critical: "border-l-red-500",
  high:     "border-l-orange-400",
  medium:   "border-l-yellow-400",
  low:      "border-l-green-400",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

// ─── Composant ────────────────────────────────────────────────────────────────

const PartnerDashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Vérifier le rôle partenaire
  const { data: isPartner, isLoading: roleLoading } = useQuery({
    queryKey: ["is-partner", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "partner" });
      return data === true;
    },
    enabled: !!user,
  });

  // Charger le profil partenaire
  const { data: partnerProfile } = useQuery<PartnerProfile | null>({
    queryKey: ["partner-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_profiles")
        .select("organization_name, partner_type, commune")
        .eq("user_id", user!.id)
        .single();
      if (error) return null;
      return data as PartnerProfile;
    },
    enabled: !!user && isPartner === true,
  });

  // Charger les signalements filtrés (RLS s'en charge)
  const { data: reports = [], isLoading: reportsLoading } = useQuery<Report[]>({
    queryKey: ["partner-reports", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, service_type, report_category, description, commune, quartier, status, urgency, verifications, impacted_people, created_at, resolved_at, photo_url")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Report[];
    },
    enabled: !!user && isPartner === true,
  });

  // Mutation : mise à jour du statut
  const updateStatusMutation = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: string }) => {
      setUpdatingId(reportId);
      const { error } = await supabase.rpc("partner_update_report_status", {
        p_report_id: reportId,
        p_status: status,
      });
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["partner-reports"] });
      const msg = status === "processing" ? "Signalement pris en charge" : status === "resolved" ? "Signalement marqué résolu" : "Statut mis à jour";
      toast.success(msg);
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de la mise à jour"),
    onSettled: () => setUpdatingId(null),
  });

  // ─── Guards ───────────────────────────────────────────────────────────────

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (isPartner === false) return <Navigate to="/" replace />;

  // ─── Données ──────────────────────────────────────────────────────────────

  const active     = reports.filter((r) => r.status === "active");
  const processing = reports.filter((r) => r.status === "processing");
  const resolved   = reports.filter((r) => r.status === "resolved");

  // ─── Sous-composant carte rapport ─────────────────────────────────────────

  const ReportCard = ({ report }: { report: Report }) => {
    const isUpdating = updatingId === report.id;
    const statusInfo = STATUS_LABELS[report.status] ?? { label: report.status, color: "bg-muted text-muted-foreground" };
    const borderColor = URGENCY_COLORS[report.urgency] ?? "border-l-muted";

    return (
      <Card className={`border-l-4 ${borderColor}`}>
        <CardContent className="p-4 space-y-3">
          {/* En-tête */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {SERVICE_ICONS[report.service_type] ?? <Building2 className="h-4 w-4 text-muted-foreground" />}
              <span className="text-sm font-medium line-clamp-1">{report.description}</span>
            </div>
            <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>

          {/* Localisation + stats */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {report.quartier}, {report.commune}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {report.verifications} confirmation{report.verifications > 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(report.created_at)}
            </span>
            {report.urgency === "critical" && (
              <span className="flex items-center gap-1 text-red-600 font-semibold">
                <AlertTriangle className="h-3 w-3" /> Critique
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {report.status === "active" && (
              <Button
                size="sm"
                variant="outline"
                className="text-amber-600 border-amber-300 hover:bg-amber-50"
                disabled={isUpdating}
                onClick={() => updateStatusMutation.mutate({ reportId: report.id, status: "processing" })}
              >
                {isUpdating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
                Prendre en charge
              </Button>
            )}
            {report.status !== "resolved" && (
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-300 hover:bg-green-50"
                disabled={isUpdating}
                onClick={() => updateStatusMutation.mutate({ reportId: report.id, status: "resolved" })}
              >
                {isUpdating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
                Marquer résolu
              </Button>
            )}
            {report.status === "resolved" && (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                disabled={isUpdating}
                onClick={() => updateStatusMutation.mutate({ reportId: report.id, status: "active" })}
              >
                <RefreshCw className="mr-1 h-3 w-3" /> Rouvrir
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // ─── Rendu ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">

        {/* En-tête partenaire */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <Handshake className="h-6 w-6 text-emerald-600" />
            <h1 className="font-display text-2xl font-bold text-foreground">
              {partnerProfile?.organization_name ?? "Dashboard Partenaire"}
            </h1>
          </div>
          {partnerProfile && (
            <p className="text-sm text-muted-foreground ml-9">
              {PARTNER_TYPE_LABELS[partnerProfile.partner_type]}
              {partnerProfile.commune ? ` · ${partnerProfile.commune}` : ""}
            </p>
          )}
        </motion.div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Actifs",    value: active.length,     color: "text-red-600",   bg: "bg-red-50 dark:bg-red-900/20" },
            { label: "En cours",  value: processing.length, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
            { label: "Résolus",   value: resolved.length,   color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
          ].map(({ label, value, color, bg }) => (
            <Card key={label} className={`${bg} border-0`}>
              <CardContent className="p-4 text-center">
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Liste des signalements */}
        <Tabs defaultValue="active">
          <TabsList className="w-full">
            <TabsTrigger value="active" className="flex-1">
              Actifs <Badge variant="secondary" className="ml-1.5">{active.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="processing" className="flex-1">
              En cours <Badge variant="secondary" className="ml-1.5">{processing.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="resolved" className="flex-1">
              Résolus <Badge variant="secondary" className="ml-1.5">{resolved.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {(["active", "processing", "resolved"] as const).map((tab) => {
            const list = tab === "active" ? active : tab === "processing" ? processing : resolved;
            return (
              <TabsContent key={tab} value={tab} className="space-y-3 mt-4">
                {reportsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : list.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground text-sm">
                      Aucun signalement dans cette catégorie.
                    </CardContent>
                  </Card>
                ) : (
                  list.map((report) => <ReportCard key={report.id} report={report} />)
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </main>
    </div>
  );
};

export default PartnerDashboardPage;
