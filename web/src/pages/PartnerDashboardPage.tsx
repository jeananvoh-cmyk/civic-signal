import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Zap, Droplets, Building2, Handshake, MapPin, Users,
  Clock, CheckCircle2, Loader2, AlertTriangle, RefreshCw,
  TrendingUp, MessageSquare, Send, BarChart3, Ticket,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  user_id: string;
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
  const [actionDialog, setActionDialog] = useState<{ report: Report; newStatus: string } | null>(null);
  const [actionComment, setActionComment] = useState("");
  const [actionOperatorRef, setActionOperatorRef] = useState("");
  const [actionEtaHours, setActionEtaHours] = useState("");

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
        .select("id, user_id, ticket_code, service_type, report_category, description, commune, quartier, status, urgency, verifications, impacted_people, created_at, resolved_at, photo_url, photo_urls, operator_reference, estimated_resolution_time, operator_last_note")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Report[];
    },
    enabled: !!user && isPartner === true,
  });

  // Mutation : mise à jour du statut
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      reportId,
      ticketCode,
      status,
      operatorRef,
      publicNote,
      etaHours,
    }: {
      reportId: string;
      ticketCode?: string | null;
      status: string;
      operatorRef?: string;
      publicNote?: string;
      etaHours?: number;
    }) => {
      setUpdatingId(reportId);
      const etaDate = etaHours ? new Date(Date.now() + etaHours * 3600000).toISOString() : null;
      const { error } = await supabase.rpc("operator_update_ticket", {
        p_report_id: reportId,
        p_ticket_code: ticketCode || null,
        p_status: status,
        p_operator_name: partnerProfile?.organization_name || null,
        p_operator_reference: operatorRef || null,
        p_public_note: publicNote || null,
        p_estimated_resolution: etaDate,
      });
      if (error) {
        const { error: fallbackErr } = await supabase.rpc("partner_update_report_status", {
          p_report_id: reportId,
          p_status: status,
        });
        if (fallbackErr) throw fallbackErr;
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["partner-reports"] });
      const msg = status === "processing" ? "Signalement pris en charge" : status === "resolved" ? "Signalement marqué résolu ✅" : "Statut mis à jour";
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

  const resolutionRate = reports.length > 0
    ? Math.round((resolved.length / reports.length) * 100)
    : 0;

  const avgResolutionHours = (() => {
    const withTime = resolved.filter((r) => r.resolved_at);
    if (!withTime.length) return null;
    const avg = withTime.reduce((sum, r) => {
      return sum + (new Date(r.resolved_at!).getTime() - new Date(r.created_at).getTime());
    }, 0) / withTime.length;
    const h = avg / 3_600_000;
    return h < 24 ? `${Math.round(h)} h` : `${Math.round(h / 24)} j`;
  })();

  const handleActionConfirm = async () => {
    if (!actionDialog) return;
    const { report, newStatus } = actionDialog;
    const etaNum = actionEtaHours ? parseInt(actionEtaHours, 10) : undefined;
    await updateStatusMutation.mutateAsync({
      reportId: report.id,
      ticketCode: report.ticket_code,
      status: newStatus,
      operatorRef: actionOperatorRef.trim() || undefined,
      publicNote: actionComment.trim() || undefined,
      etaHours: etaNum && !isNaN(etaNum) ? etaNum : undefined,
    });
    if (actionComment.trim()) {
      await supabase.from("report_comments").insert({
        report_id: report.id,
        user_id: user!.id,
        content: actionComment.trim(),
      });
    }
    setActionDialog(null);
    setActionComment("");
    setActionOperatorRef("");
    setActionEtaHours("");
  };

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
          {/* Ticket PADA & Référence */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md">
              <Ticket className="h-3 w-3" /> {report.ticket_code || `SIG-${report.commune.slice(0,3).toUpperCase()}-${report.id.slice(0,4).toUpperCase()}`}
            </span>
            {report.operator_reference && (
              <span className="inline-flex items-center text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                Réf: {report.operator_reference}
              </span>
            )}
            {report.operator_last_note && (
              <p className="w-full text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-2 mt-1">
                "{report.operator_last_note}"
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1 flex-wrap">
            {report.status === "active" && (
              <Button size="sm" variant="outline" className="text-amber-600 border-amber-300 hover:bg-amber-50"
                disabled={isUpdating}
                onClick={() => { setActionDialog({ report, newStatus: "processing" }); setActionComment(""); }}>
                {isUpdating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
                Prendre en charge
              </Button>
            )}
            {report.status !== "resolved" && (
              <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50"
                disabled={isUpdating}
                onClick={() => { setActionDialog({ report, newStatus: "resolved" }); setActionComment(""); }}>
                {isUpdating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
                Marquer résolu
              </Button>
            )}
            {report.status === "resolved" && (
              <Button size="sm" variant="ghost" className="text-muted-foreground" disabled={isUpdating}
                onClick={() => updateStatusMutation.mutate({ reportId: report.id, status: "active" })}>
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

        {/* KPIs statut */}
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

        {/* KPIs performance */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary shrink-0" />
              <div>
                <p className="text-2xl font-bold text-foreground">{resolutionRate} %</p>
                <p className="text-xs text-muted-foreground">Taux de résolution</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary shrink-0" />
              <div>
                <p className="text-2xl font-bold text-foreground">{avgResolutionHours ?? "–"}</p>
                <p className="text-xs text-muted-foreground">Délai moyen résolution</p>
              </div>
            </CardContent>
          </Card>
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

      {/* Dialog action combinée statut + commentaire */}
      <Dialog open={!!actionDialog} onOpenChange={(v) => { if (!v) setActionDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog?.newStatus === "resolved"
                ? <><CheckCircle2 className="h-5 w-5 text-green-600" /> Marquer comme résolu</>
                : <><RefreshCw className="h-5 w-5 text-amber-600" /> Prendre en charge</>}
            </DialogTitle>
          </DialogHeader>
          {actionDialog && (
            <div className="space-y-4 pt-1">
              <div className="rounded-xl bg-muted/50 px-3 py-2 text-sm">
                <p className="font-medium text-foreground">{actionDialog.report.commune} · {actionDialog.report.quartier}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{actionDialog.report.description}</p>
              </div>
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">
                      N° Ordre de travail / Réf. <span className="text-muted-foreground font-normal">(optionnel)</span>
                    </label>
                    <Input
                      value={actionOperatorRef}
                      onChange={(e) => setActionOperatorRef(e.target.value)}
                      placeholder="Ex: CIE-OT-8942"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">
                      Délai prévisionnel <span className="text-muted-foreground font-normal">(optionnel)</span>
                    </label>
                    <Select value={actionEtaHours} onValueChange={setActionEtaHours}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Estimation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">~ 2 heures</SelectItem>
                        <SelectItem value="4">~ 4 heures</SelectItem>
                        <SelectItem value="12">~ 12 heures</SelectItem>
                        <SelectItem value="24">~ 24 heures</SelectItem>
                        <SelectItem value="48">~ 48 heures</SelectItem>
                        <SelectItem value="72">~ 72 heures</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  Message pour le citoyen <span className="text-muted-foreground font-normal">(optionnel)</span>
                </label>
                <Textarea
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  placeholder={actionDialog.newStatus === "resolved"
                    ? "Ex: Le service a été rétabli suite à l'intervention de nos équipes ce matin."
                    : "Ex: Votre signalement a été transmis à notre équipe terrain."}
                  rows={3}
                  maxLength={200}
                  className="resize-none text-sm"
                />
                {actionComment.length > 150 && (
                  <p className="text-xs text-muted-foreground text-right">{actionComment.length}/200</p>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setActionDialog(null)}>
                  Annuler
                </Button>
                <Button
                  className={`flex-1 gap-2 ${actionDialog.newStatus === "resolved" ? "bg-green-600 hover:bg-green-700 text-white" : "bg-amber-600 hover:bg-amber-700 text-white"}`}
                  disabled={updateStatusMutation.isPending}
                  onClick={handleActionConfirm}
                >
                  {updateStatusMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />}
                  Confirmer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartnerDashboardPage;
