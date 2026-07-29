import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, MapPin, Zap, Droplets, Clock, Eye, Construction, Download, Square, CheckSquare, Trash2, MessageCircle, PhoneCall, AlertOctagon, Bell, ExternalLink, CheckCheck, Wrench, ShieldAlert, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/error-utils";
import { logAudit } from "@/lib/audit";
import { format } from "date-fns";
import PhotoGallery from "@/components/PhotoGallery";
import CorroborationStatus from "@/components/CorroborationStatus";
import { extractInfraLabel, cleanDescription, infraEmoji, infraOperator } from "@/lib/report-display";

const URGENCY_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  low: { label: "🟢 Faible", variant: "secondary" },
  medium: { label: "🟡 Moyen", variant: "outline" },
  high: { label: "🟠 Élevé", variant: "default" },
  critical: { label: "🔴 Critique", variant: "destructive" },
};

const AdminReportsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "pending";

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = (reports: any[]) => {
    setSelectedIds((prev) =>
      prev.size === reports.length ? new Set() : new Set(reports.map((r) => r.id))
    );
  };

  const exportCSV = (reports: any[]) => {
    const cols = ["id", "commune", "quartier", "service_type", "report_category", "urgency", "status", "verifications", "created_at", "description"];
    const header = cols.join(";");
    const rows = reports.map((r) =>
      cols.map((c) => {
        const v = r[c] ?? "";
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(";")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `signa-ci-signalements-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const { data: pendingReports = [], isLoading: loadingPending } = useQuery({
    queryKey: ["admin-reports-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("validated", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: validatedReports = [], isLoading: loadingValidated } = useQuery({
    queryKey: ["admin-reports-validated"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("validated", true)
        .order("validated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Signalements actifs >7j sans aucune corroboration — avec profil du rapporteur
  const { data: neglectedReports = [], isLoading: loadingNeglected } = useQuery({
    queryKey: ["admin-reports-neglected"],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("reports")
        .select(`
          id, service_type, report_category, commune, quartier,
          description, created_at, verifications, urgency, user_id,
          whatsapp_reminder_needed_at,
          profiles!reports_user_id_fkey (
            first_name, last_name, phone, display_name
          )
        `)
        .in("status", ["active", "chronic"])
        .eq("validated", true)
        .eq("verifications", 0)
        .lt("created_at", sevenDaysAgo)
        .order("created_at", { ascending: true }) // les plus anciens en premier
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  // Notifications d'escalade reçues par cet admin/modérateur
  const { data: escaladeNotifs = [], isLoading: loadingEscalades, refetch: refetchEscalades } = useQuery({
    queryKey: ["admin-escalades", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: notifs, error } = await supabase
        .from("notifications")
        .select("id, title, message, read, created_at, report_id")
        .eq("user_id", user.id)
        .or("title.ilike.%🚨%,title.ilike.%escalade%,title.ilike.%Rapport hebdo%,title.ilike.%Problème chronique%,title.ilike.%J+14%")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      if (!notifs || notifs.length === 0) return [];

      // Récupérer les rapports liés (avec report_id ou extrait du lien dans le message)
      const extractId = (n: any): string | null => {
        if (n.report_id) return n.report_id;
        const match = (n.message || "").match(/\/signalement\/([a-f0-9-]{36})/i);
        return match ? match[1] : null;
      };

      const reportIds = [...new Set(notifs.map(extractId).filter(Boolean) as string[])];
      let reportsMap: Record<string, any> = {};
      if (reportIds.length > 0) {
        const { data: reports } = await supabase
          .from("reports")
          .select("id, service_type, report_category, commune, quartier, status, urgency, verifications, created_at, description")
          .in("id", reportIds);
        if (reports) {
          for (const r of reports) reportsMap[r.id] = r;
        }
      }

      // Récupérer les statuts de transmission dans relay_logs
      let relayedMap: Record<string, boolean> = {};
      if (reportIds.length > 0) {
        const { data: relayLogs } = await (supabase as any)
          .from("relay_logs")
          .select("report_id")
          .in("report_id", reportIds);
        if (relayLogs) {
          for (const l of relayLogs) relayedMap[l.report_id] = true;
        }
      }

      // Fetch relay_config WhatsApp
      const { data: relayRows } = await supabase
        .from("relay_config")
        .select("key, value");
      const relayWA: Record<string, string> = {};
      for (const row of relayRows ?? []) relayWA[row.key] = row.value ?? "";

      return notifs.map((n) => {
        const rid = extractId(n);
        const rep = rid ? reportsMap[rid] ?? null : null;
        const isRelayed = !!(rid && (relayedMap[rid] || rep?.forwarded_to_operator_at));
        return {
          ...n,
          extracted_report_id: rid,
          report: rep,
          is_relayed: isRelayed,
          relayWA,
        };
      });
    },
    enabled: !!user?.id,
  });

  const [escaladeFilter, setEscaladeFilter] = useState<"all" | "unrelayed" | "relayed">("all");
  const unreadEscalades = escaladeNotifs.filter((n) => !n.read).length;

  const dismissEscaladeMutation = useMutation({
    mutationFn: async (notifId: string) => {
      await supabase.from("notifications").update({ read: true }).eq("id", notifId);
    },
    onSuccess: () => refetchEscalades(),
  });

  const deleteEscaladeMutation = useMutation({
    mutationFn: async (notifId: string) => {
      await supabase.from("notifications").delete().eq("id", notifId);
    },
    onSuccess: () => refetchEscalades(),
  });

  const resolveFromEscaladeMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase.rpc("admin_resolve_report", { p_report_id: reportId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Signalement marqué comme résolu.");
      refetchEscalades();
      queryClient.invalidateQueries({ queryKey: ["admin-reports-validated"] });
    },
    onError: (err: any) => toast.error(getUserFriendlyError(err)),
  });

  /** Ajout manuel d'un signalement aux relais d'intervention (CIE / SODECI / ANARE / ONEP / Mairie) */
  const addToRelayMutation = useMutation({
    mutationFn: async ({ report, notifId }: { report: any; notifId?: string }) => {
      const reportId = report.id;
      if (!reportId) throw new Error("ID du signalement introuvable");

      // 1. Essayer d'abord la RPC SQL admin_relay_report
      const { error: rpcError } = await supabase.rpc("admin_relay_report", {
        p_report_id: reportId,
      });

      if (rpcError) {
        console.warn("RPC admin_relay_report error, executing JS fallback:", rpcError);

        // Fallback JS si la RPC SQL n'a pas encore été créée
        const relays: Array<{ report_id: string; operator: "CIE" | "SODECI" | "MAIRIE" | "ONEP" | "ANARE"; email_to: string; status: string }> = [];

        const label = extractInfraLabel(report.description || "");
        const isCieRelated = report.service_type === "electricity" ||
          report.service_type === "streetlighting" ||
          report.service_type === "electricity_quality" ||
          (label && INFRA_CIE.has(label)) ||
          (report.description && (
            report.description.toLowerCase().includes("éclairage") ||
            report.description.toLowerCase().includes("eclairage") ||
            report.description.toLowerCase().includes("lampadaire") ||
            report.description.toLowerCase().includes("poteau") ||
            report.description.toLowerCase().includes("branchement") ||
            report.description.toLowerCase().includes("électricité") ||
            report.description.toLowerCase().includes("electricite")
          ));

        const isSodeciRelated = report.service_type === "water" ||
          report.service_type === "water_quality" ||
          (label && INFRA_SODECI.has(label)) ||
          (report.description && (
            report.description.toLowerCase().includes("fuite d'eau") ||
            report.description.toLowerCase().includes("canalisation") ||
            report.description.toLowerCase().includes("eau potable")
          ));

        const { data: cfgRows } = await (supabase as any).from("relay_config").select("*");
        const cfgMap: Record<string, string> = {};
        if (cfgRows) cfgRows.forEach((r: any) => { cfgMap[r.key] = r.value; });

        if (isCieRelated) {
          relays.push({ report_id: reportId, operator: "CIE", email_to: "reclamation@cie.ci", status: "pending" });
          if (cfgMap.anare_auto_dispatch !== "false") {
            relays.push({ report_id: reportId, operator: "ANARE", email_to: "reclamation@anare.ci", status: "pending" });
          }
        } else if (isSodeciRelated) {
          relays.push({ report_id: reportId, operator: "SODECI", email_to: "reclamation@sodeci.ci", status: "pending" });
          if (cfgMap.onep_auto_dispatch !== "false") {
            relays.push({ report_id: reportId, operator: "ONEP", email_to: "reclamation@onep.ci", status: "pending" });
          }
        } else {
          relays.push({ report_id: reportId, operator: "MAIRIE", email_to: `mairie:${report.commune}`, status: "pending" });
        }

        for (const item of relays) {
          const { data: existing } = await (supabase as any)
            .from("relay_logs")
            .select("id")
            .eq("report_id", item.report_id)
            .eq("operator", item.operator)
            .maybeSingle();

          if (existing) {
            const { error: upErr } = await (supabase as any)
              .from("relay_logs")
              .update({ status: "pending", email_to: item.email_to, error_message: null })
              .eq("id", existing.id);
            if (upErr) console.error("Error updating relay_log:", upErr);
          } else {
            const { error: inErr } = await (supabase as any).from("relay_logs").insert(item);
            if (inErr) {
              console.error("Error inserting relay_log:", inErr);
              if (item.operator === "ANARE" || item.operator === "ONEP") {
                const fbOp = item.operator === "ANARE" ? "CIE" : "SODECI";
                const { error: fbErr } = await (supabase as any).from("relay_logs").insert({
                  ...item,
                  operator: fbOp,
                });
                if (fbErr) console.error("Fallback insert relay_log error:", fbErr);
              }
            }
          }
        }

        await supabase
          .from("reports")
          .update({ forwarded_to_operator_at: new Date().toISOString() })
          .eq("id", reportId);
      }

      // Marquer toujours la notification spécifique comme lue pour décrémenter le compteur d'alertes
      if (notifId) {
        const { error: notifErr } = await supabase
          .from("notifications")
          .update({ read: true })
          .eq("id", notifId);
        if (notifErr) console.error("Error marking notification as read:", notifErr);
      }

      await supabase
        .from("notifications")
        .update({ read: true })
        .or(`report_id.eq.${reportId},message.ilike.%${reportId}%`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-relay-logs-all"] });
      queryClient.invalidateQueries({ queryKey: ["admin-escalades"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reports-validated"] });
      refetchEscalades();
      toast.success("Signalement transmis aux relais d'intervention !");
    },
    onError: (err: any) => {
      console.error("addToRelayMutation error:", err);
      toast.error("Erreur lors de l'ajout aux relais: " + (err.message || "Erreur"));
    },
  });

  /** Lien WhatsApp vers l'opérateur (CIE, SODECI, ANARE, ONEP, Mairie) depuis relay_config */
  const buildOperatorWhatsAppLink = (report: any, relayWA: Record<string, string>): string | null => {
    if (!report) return null;
    const isInfra = report.report_category === "infrastructure";
    const isElec = report.service_type === "electricity";
    const isWater = report.service_type === "water";
    const isStreetlight = report.service_type === "streetlighting" || report.service_type === "electricity_quality";
    const isWaterQuality = report.service_type === "water_quality";

    let key = "whatsapp_cie";
    let operatorName = "CIE";

    if (isStreetlight) {
      key = "whatsapp_anare";
      operatorName = "ANARE-CI";
    } else if (isWaterQuality) {
      key = "whatsapp_onep";
      operatorName = "ONEP";
    } else if (isWater) {
      key = "whatsapp_sodeci";
      operatorName = "SODECI";
    } else if (isElec) {
      key = "whatsapp_cie";
      operatorName = "CIE";
    } else {
      const infraOp = infraOperator(extractInfraLabel(report.description || ""), report.commune || "");
      if (infraOp === "CIE") {
        key = "whatsapp_cie";
        operatorName = "CIE";
      } else if (infraOp === "SODECI") {
        key = "whatsapp_sodeci";
        operatorName = "SODECI";
      } else {
        const slug = (report.commune || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
        key = `mairie_${slug}_whatsapp` in relayWA ? `mairie_${slug}_whatsapp` : "whatsapp_cie";
        operatorName = `Mairie de ${report.commune}`;
      }
    }

    const raw = relayWA[key] ?? "";
    const digits = raw.replace(/\D/g, "");
    if (!digits || digits.length < 8) return null;
    const phone = digits.startsWith("0") ? "225" + digits.slice(1) : digits;
    const ageDays = Math.floor((Date.now() - new Date(report.created_at).getTime()) / 86400000);
    const issueTitle = report.description || (isInfra ? "Problème d'infrastructure" : "Coupure de service");
    const landmarkText = report.landmark ? ` [Repère : ${report.landmark}]` : "";
    const addressText = report.address_text ? ` (Adresse : ${report.address_text})` : "";
    const linkUrl = `https://signa.ci/signalement/${report.id}`;

    const msg = encodeURIComponent(
      `🚨 *SIGNA-CI — Transmission d'incident ${operatorName}*\n\n` +
      `Bonjour ${operatorName},\n` +
      `Nous vous contactons concernant un incident signalé sur notre plateforme :\n\n` +
      `📍 *Commune & Quartier :* ${report.commune}, ${report.quartier}${landmarkText}${addressText}\n` +
      `⚠️ *Incident :* ${issueTitle}\n` +
      `📅 *Ancienneté :* Signalé il y a ${ageDays} jours (Toujours en cours sans intervention)\n` +
      `🔗 *Fiche complète du signalement :* ${linkUrl}\n\n` +
      `Pouvez-vous nous indiquer le délai d'intervention prévu ? Merci.`
    );
    return `https://wa.me/${phone}?text=${msg}`;
  };

  const validateMutation = useMutation({
    mutationFn: async ({ reportId, validated }: { reportId: string; validated: boolean }) => {
      const { error } = await supabase
        .from("reports")
        .update({
          validated,
          validated_by: validated ? user?.id : null,
          validated_at: validated ? new Date().toISOString() : null,
        })
        .eq("id", reportId);
      if (error) throw error;
    },
    onSuccess: (_, { reportId, validated }) => {
      logAudit({
        action: validated ? "report_validated" : "report_rejected",
        target_type: "report",
        target_id: reportId,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-reports-pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reports-validated"] });
      toast.success(validated ? "Signalement validé et visible sur la carte" : "Signalement rejeté");
      setSelectedReport(null);
    },
    onError: (err: any) => toast.error(getUserFriendlyError(err)),
  });

  const resolveMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase.rpc("admin_resolve_report", { p_report_id: reportId });
      if (error) throw error;
    },
    onSuccess: (_, reportId) => {
      logAudit({
        action: "report_resolved",
        target_type: "report",
        target_id: reportId,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-reports-validated"] });
      toast.success("Signalement marqué comme résolu.");
      setSelectedReport(null);
    },
    onError: (err: any) => toast.error(getUserFriendlyError(err)),
  });

  const bulkValidateMutation = useMutation({
    mutationFn: async ({ ids, validated }: { ids: string[]; validated: boolean }) => {
      await Promise.all(
        ids.map((id) =>
          supabase.from("reports").update({
            validated,
            validated_by: validated ? user?.id : null,
            validated_at: validated ? new Date().toISOString() : null,
          }).eq("id", id)
        )
      );
    },
    onSuccess: (_, { ids, validated }) => {
      ids.forEach((id) => logAudit({ action: validated ? "report_validated" : "report_rejected", target_type: "report", target_id: id }));
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["admin-reports-pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reports-validated"] });
      toast.success(`${ids.length} signalement${ids.length > 1 ? "s" : ""} ${validated ? "validé" : "rejeté"}${ids.length > 1 ? "s" : ""}`);
    },
    onError: (err: any) => toast.error(getUserFriendlyError(err)),
  });

  const forwardMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from("reports")
        .update({
          forwarded_to_operator_at: new Date().toISOString(),
          forwarded_to_operator_by: user?.id,
        } as any)
        .eq("id", reportId);
      if (error) throw error;
    },
    onSuccess: (_, reportId) => {
      logAudit({ action: "report_forwarded_to_operator", target_type: "report", target_id: reportId });
      queryClient.invalidateQueries({ queryKey: ["admin-reports-validated"] });
      setSelectedReport((prev: any) => prev ? { ...prev, forwarded_to_operator_at: new Date().toISOString() } : prev);
      toast.success("✅ Signalement marqué comme transmis à l'opérateur.");
    },
    onError: (err: any) => toast.error(getUserFriendlyError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase.from("reports").delete().eq("id", reportId);
      if (error) throw error;
    },
    onSuccess: (_, reportId) => {
      logAudit({ action: "report_deleted", target_type: "report", target_id: reportId });
      queryClient.invalidateQueries({ queryKey: ["admin-reports-pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reports-validated"] });
      toast.success("Signalement supprimé.");
      setSelectedReport(null);
    },
    onError: (err: any) => toast.error(getUserFriendlyError(err)),
  });

  /** Génère un lien wa.me pour contacter le rapporteur */
  const buildWhatsAppLink = (report: any): string | null => {
    const profile = report.profiles as any;
    const rawPhone = profile?.phone || "";
    // Normaliser : retirer espaces, tirets, parenthèses
    const digits = rawPhone.replace(/\D/g, "");
    if (!digits || digits.length < 8) return null;
    // Ajouter l'indicatif CI si nécessaire (commence par 0)
    const phone = digits.startsWith("0") ? "225" + digits.slice(1) : digits;
    const ageDays = Math.floor((Date.now() - new Date(report.created_at).getTime()) / 86400000);
    const serviceLabel = report.service_type === "electricity" ? "électricité" : "eau";
    const prenom = profile?.first_name || "vous";
    const message = encodeURIComponent(
      `Bonjour ${prenom}, nous vous contactons au sujet de votre signalement SIGNA-CI ` +
      `(${serviceLabel} à ${report.commune}, ${report.quartier}) qui date de ${ageDays} jours. ` +
      `La situation est-elle toujours en cours ? ` +
      `Merci de confirmer ou de marquer comme résolu ici : https://signa.ci/verification`
    );
    return `https://wa.me/${phone}?text=${message}`;
  };

  const ReportRow = ({ report, showActions }: { report: any; showActions: boolean }) => {
    const urgency = URGENCY_LABELS[report.urgency] || URGENCY_LABELS.low;
    const isChecked = selectedIds.has(report.id);
    return (
      <Card className={`hover:border-primary/50 transition-colors ${isChecked ? "border-primary bg-primary/3" : "cursor-pointer"}`}
        onClick={(e) => { if ((e.target as HTMLElement).closest("[data-checkbox]")) return; setSelectedReport(report); }}>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {showActions && (
              <div data-checkbox onClick={(e) => { e.stopPropagation(); toggleSelect(report.id); }} className="shrink-0">
                <Checkbox checked={isChecked} onCheckedChange={() => toggleSelect(report.id)} />
              </div>
            )}
            {report.report_category === "infrastructure" ? (
              <Wrench className="h-5 w-5 text-teal-500 shrink-0" />
            ) : report.service_type === "electricity" ? (
              <Zap className="h-5 w-5 text-electricity shrink-0" />
            ) : (
              <Droplets className="h-5 w-5 text-water shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {report.commune}, {report.quartier}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {report.report_category === "infrastructure" ? cleanDescription(report.description) : report.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {report.report_category === "infrastructure" && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                {infraEmoji(extractInfraLabel(report.description))} {extractInfraLabel(report.description) ?? "Infrastructure"}
              </Badge>
            )}
            <Badge variant={urgency.variant}>{urgency.label}</Badge>
            {showActions && (
              <div className="flex gap-1 ml-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 hover:bg-green-50"
                  onClick={(e) => { e.stopPropagation(); validateMutation.mutate({ reportId: report.id, validated: true }); }}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={(e) => { e.stopPropagation(); validateMutation.mutate({ reportId: report.id, validated: false }); }}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="font-display text-3xl font-bold text-foreground">Validation des signalements</h1>
          <p className="mt-1 text-muted-foreground">
            Vérifiez la cohérence entre commune/quartier et coordonnées GPS avant publication.
          </p>
        </motion.div>

        <Tabs defaultValue={defaultTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="pending">
              En attente ({pendingReports.length})
            </TabsTrigger>
            <TabsTrigger value="validated">
              Validés ({validatedReports.length})
            </TabsTrigger>
            <TabsTrigger value="neglected" className="relative">
              Négligés
              {neglectedReports.length > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-4 min-w-4 px-1 text-xs leading-none">
                  {neglectedReports.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="escalades" className="relative">
              <ShieldAlert className="h-3.5 w-3.5 mr-1" />
              Escalades
              {unreadEscalades > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-4 min-w-4 px-1 text-xs leading-none">
                  {unreadEscalades}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3 mt-4">
            {loadingPending ? (
              <p className="text-muted-foreground text-sm">Chargement...</p>
            ) : pendingReports.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucun signalement en attente.</p>
            ) : (
              <>
                {/* Barre d'actions en masse */}
                <div className="flex items-center gap-2 flex-wrap rounded-xl border border-border bg-card px-3 py-2">
                  <button
                    onClick={() => toggleSelectAll(pendingReports)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {selectedIds.size === pendingReports.length
                      ? <CheckSquare className="h-4 w-4 text-primary" />
                      : <Square className="h-4 w-4" />}
                    {selectedIds.size === pendingReports.length ? "Tout désélectionner" : "Tout sélectionner"}
                  </button>
                  {selectedIds.size > 0 && (
                    <>
                      <span className="text-xs text-muted-foreground">{selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}</span>
                      <Button
                        size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white ml-auto"
                        disabled={bulkValidateMutation.isPending}
                        onClick={() => bulkValidateMutation.mutate({ ids: Array.from(selectedIds), validated: true })}
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Valider ({selectedIds.size})
                      </Button>
                      <Button
                        size="sm" variant="destructive" className="h-7 text-xs gap-1"
                        disabled={bulkValidateMutation.isPending}
                        onClick={() => bulkValidateMutation.mutate({ ids: Array.from(selectedIds), validated: false })}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Rejeter ({selectedIds.size})
                      </Button>
                    </>
                  )}
                </div>
                {pendingReports.map((r: any) => <ReportRow key={r.id} report={r} showActions />)}
              </>
            )}
          </TabsContent>

          <TabsContent value="validated" className="space-y-3 mt-4">
            {loadingValidated ? (
              <p className="text-muted-foreground text-sm">Chargement...</p>
            ) : validatedReports.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucun signalement validé.</p>
            ) : (
              <>
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                    onClick={() => exportCSV(validatedReports)}>
                    <Download className="h-3.5 w-3.5" /> Exporter CSV ({validatedReports.length})
                  </Button>
                </div>
                {validatedReports.map((r: any) => <ReportRow key={r.id} report={r} showActions={false} />)}
              </>
            )}
          </TabsContent>

          {/* ── Onglet Négligés ── */}
          <TabsContent value="neglected" className="mt-4">
            {loadingNeglected ? (
              <p className="text-muted-foreground text-sm">Chargement...</p>
            ) : neglectedReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="h-10 w-10 text-success mb-3 opacity-60" />
                <p className="text-sm font-medium text-foreground">Aucun signalement négligé</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tous les signalements actifs ont été corroborés ou ont moins de 7 jours.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* En-tête explicatif */}
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex gap-3 items-start">
                  <AlertOctagon className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      {neglectedReports.length} signalement{neglectedReports.length > 1 ? "s" : ""} sans corroboration depuis +7 jours
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Contactez le rapporteur via WhatsApp pour confirmer si la situation est toujours en cours.
                      Le bouton génère un message pré-rempli avec un lien vers la page de vérification.
                    </p>
                  </div>
                </div>

                {neglectedReports.map((r: any) => {
                  const profile = r.profiles as any;
                  const ageDays = Math.floor(
                    (Date.now() - new Date(r.created_at).getTime()) / 86400000
                  );
                  const waLink = buildWhatsAppLink(r);
                  const hasPhone = !!waLink;
                  const reporterName =
                    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
                    profile?.display_name ||
                    "Anonyme";

                  return (
                    <Card
                      key={r.id}
                      className="border-amber-500/20 hover:border-amber-500/40 transition-colors"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Icône service */}
                          <div className="shrink-0 mt-0.5">
                            {r.service_type === "electricity" ? (
                              <Zap className="h-4 w-4 text-amber-500" />
                            ) : (
                              <Droplets className="h-4 w-4 text-blue-500" />
                            )}
                          </div>

                          {/* Info principale */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-foreground">
                                {r.commune} — {r.quartier}
                              </p>
                              <Badge
                                variant="outline"
                                className="text-xs px-1.5 py-0 border-amber-500/40 text-amber-600 bg-amber-500/5"
                              >
                                {ageDays}j sans prise en charge
                              </Badge>
                              {r.report_category === "infrastructure" && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0 border-emerald-500/40 text-emerald-600 bg-emerald-500/5">
                                  {infraEmoji(extractInfraLabel(r.description))} {extractInfraLabel(r.description) ?? "Infrastructure"}
                                </Badge>
                              )}
                            </div>

                            {r.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {r.report_category === "infrastructure" ? cleanDescription(r.description) : r.description}
                              </p>
                            )}

                            {/* Rapporteur */}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className="text-xs text-muted-foreground">
                                Rapporteur :
                              </span>
                              <span className="text-xs font-medium text-foreground">
                                {reporterName}
                              </span>
                              {hasPhone ? (
                                <span className="text-xs text-emerald-600 font-mono">
                                  {profile?.phone}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">
                                  Pas de numéro enregistré
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1.5 shrink-0">
                            {hasPhone ? (
                              <a
                                href={waLink!}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button
                                  size="sm"
                                  className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  WhatsApp
                                </Button>
                              </a>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5 text-xs text-muted-foreground"
                                disabled
                              >
                                <PhoneCall className="h-3.5 w-3.5" />
                                Pas de n°
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => setSelectedReport(r)}
                            >
                              Voir détail
                            </Button>
                          </div>
                        </div>

                        {/* Pied : date + indicateur notification J+3/J+7 */}
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                          <p className="text-xs text-muted-foreground">
                            Signalé le {format(new Date(r.created_at), "d MMM yyyy", { locale: fr })}
                            {" · "}
                            {formatDistanceToNow(new Date(r.created_at), { locale: fr, addSuffix: true })}
                          </p>
                          {r.whatsapp_reminder_needed_at && (
                            <Badge
                              variant="outline"
                              className="text-xs px-1.5 py-0 border-violet-500/40 text-violet-600 bg-violet-500/5"
                            >
                              Rappel WhatsApp envoyé à l'app
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── Onglet Escalades ── */}
          <TabsContent value="escalades" className="mt-4 space-y-3">
            {loadingEscalades ? (
              <p className="text-muted-foreground text-sm">Chargement...</p>
            ) : escaladeNotifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-border bg-card">
                <Bell className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm font-medium">Aucune escalade en attente</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Les alertes J+14 et chroniques apparaîtront ici</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Barre de filtres et d'actions globales */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      size="sm"
                      variant={escaladeFilter === "all" ? "default" : "outline"}
                      className="h-8 text-xs font-medium"
                      onClick={() => setEscaladeFilter("all")}
                    >
                      Toutes les alertes ({escaladeNotifs.length})
                    </Button>
                    <Button
                      size="sm"
                      variant={escaladeFilter === "unrelayed" ? "destructive" : "outline"}
                      className={`h-8 text-xs font-medium ${escaladeFilter !== "unrelayed" ? "border-amber-500/50 text-amber-700 dark:text-amber-400" : ""}`}
                      onClick={() => setEscaladeFilter("unrelayed")}
                    >
                      🚨 À relayer ({escaladeNotifs.filter((n: any) => !n.is_relayed).length})
                    </Button>
                    <Button
                      size="sm"
                      variant={escaladeFilter === "relayed" ? "default" : "outline"}
                      className={`h-8 text-xs font-medium ${escaladeFilter !== "relayed" ? "border-emerald-500/50 text-emerald-700 dark:text-emerald-400" : "bg-emerald-600 hover:bg-emerald-700"}`}
                      onClick={() => setEscaladeFilter("relayed")}
                    >
                      🟢 Déjà transmis ({escaladeNotifs.filter((n: any) => n.is_relayed).length})
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      {unreadEscalades > 0 ? (
                        <span className="font-semibold text-destructive">{unreadEscalades} non lue{unreadEscalades > 1 ? "s" : ""}</span>
                      ) : (
                        <span>Tout consultés</span>
                      )}
                    </p>
                    <Button
                      size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground"
                      onClick={async () => {
                        const unreadIds = escaladeNotifs.filter((n) => !n.read).map((n) => n.id);
                        if (unreadIds.length > 0) {
                          await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
                          refetchEscalades();
                        }
                      }}
                    >
                      <CheckCheck className="h-3.5 w-3.5 mr-1" /> Tout marquer lu
                    </Button>
                  </div>
                </div>

                {escaladeNotifs
                  .filter((n: any) => {
                    if (escaladeFilter === "unrelayed") return !n.is_relayed;
                    if (escaladeFilter === "relayed") return n.is_relayed;
                    return true;
                  })
                  .map((notif: any) => {
                  const report = notif.report;
                  const isElec = report?.service_type === "electricity";
                  const isInfra = report?.report_category === "infrastructure";
                  const isChronic = report?.status === "chronic";
                  const ageDays = report ? Math.floor((Date.now() - new Date(report.created_at).getTime()) / 86400000) : null;
                  const infraLbl = isInfra ? extractInfraLabel(report?.description || "") : null;
                  const operatorName = isInfra
                    ? infraOperator(infraLbl, report?.commune || "")
                    : isElec ? "CIE" : "SODECI";
                  const waLink = report ? buildOperatorWhatsAppLink(report, notif.relayWA) : null;
                  const isRead = notif.read;
                  const isRelayed = notif.is_relayed;

                  return (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-2xl border bg-card overflow-hidden transition-all ${
                        !isRelayed ? "border-amber-500/50 shadow-md ring-1 ring-amber-500/20" : isRead ? "border-border opacity-75" : "border-destructive/40 shadow-sm"
                      }`}
                    >
                      {/* Header bande colorée */}
                      <div className={`flex items-center justify-between px-4 py-2 ${
                        isChronic ? "bg-destructive/10" : !isRelayed ? "bg-amber-500/10" : "bg-orange-500/10"
                      }`}>
                        <div className="flex items-center gap-2">
                          <ShieldAlert className={`h-4 w-4 ${isChronic ? "text-destructive" : !isRelayed ? "text-amber-600" : "text-orange-600"}`} />
                          <span className={`text-xs font-bold ${isChronic ? "text-destructive" : !isRelayed ? "text-amber-700 dark:text-amber-400" : "text-orange-700 dark:text-orange-400"}`}>
                            {notif.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isRelayed ? (
                            <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 text-[10px] py-0 px-1.5 font-semibold gap-1">
                              <CheckCircle className="h-3 w-3 text-emerald-600" /> Transmis aux relais
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 text-[10px] py-0 px-1.5 font-semibold gap-1">
                              <Clock className="h-3 w-3 text-amber-600" /> À relayer
                            </Badge>
                          )}
                          {!isRead && <span className="h-2 w-2 rounded-full bg-destructive" />}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notif.created_at), { locale: fr, addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        {/* Message */}
                        <p className="text-xs text-muted-foreground leading-relaxed">{notif.message}</p>

                        {/* Contexte signalement si disponible */}
                        {report && (
                          <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm">
                                {isInfra ? infraEmoji(extractInfraLabel(report?.description || "")) : isElec ? "⚡" : "💧"}
                              </span>
                              <span className="text-sm font-semibold text-foreground">
                                {report.commune}{report.quartier ? `, ${report.quartier}` : ""}
                              </span>
                              <Badge variant="outline" className={`text-xs px-1.5 ${
                                isChronic ? "border-destructive/50 text-destructive" : "border-orange-500/50 text-orange-600"
                              }`}>
                                {isChronic ? "🔴 Chronique" : "🟠 Actif"}
                              </Badge>
                              {ageDays !== null && (
                                <Badge variant="outline" className="text-xs px-1.5 border-border text-muted-foreground">
                                  {ageDays}j sans intervention
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              <span>{isInfra ? (infraLbl ?? "Infrastructure") : "Coupure"} — {operatorName}</span>
                              <span>{report.verifications} {isInfra ? `soutien${report.verifications > 1 ? "s" : ""}` : `confirmation${report.verifications > 1 ? "s" : ""}`}</span>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {report && (
                            <Button
                              size="sm" variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => window.open(`/signalement/${report.id}`, "_blank")}
                            >
                              <ExternalLink className="h-3 w-3" /> Voir le signalement
                            </Button>
                          )}
                          {(report || notif.extracted_report_id) && (
                            <Button
                              size="sm" variant={isRelayed ? "ghost" : "default"}
                              className={`h-7 text-xs gap-1 ${
                                isRelayed
                                  ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300"
                                  : "bg-primary text-primary-foreground font-semibold shadow-sm"
                              }`}
                              disabled={addToRelayMutation.isPending}
                              onClick={async () => {
                                if (report) {
                                  addToRelayMutation.mutate({ report, notifId: notif.id });
                                } else if (notif.extracted_report_id) {
                                  const { data } = await supabase.from("reports").select("*").eq("id", notif.extracted_report_id).single();
                                  if (data) addToRelayMutation.mutate({ report: data, notifId: notif.id });
                                  else toast.error("Signalement introuvable");
                                }
                              }}
                            >
                              <Send className="h-3 w-3" /> {isRelayed ? "✓ Déjà relayé (Renvoyer)" : "📩 Relayer aux Opérateurs"}
                            </Button>
                          )}
                          {waLink && (
                            <Button
                              size="sm" variant="outline"
                              className="h-7 text-xs gap-1 border-green-500/40 text-green-700 hover:bg-green-500/10"
                              onClick={() => {
                                window.open(waLink, "_blank");
                                if (report) {
                                  addToRelayMutation.mutate({ report, notifId: notif.id });
                                }
                              }}
                            >
                              <MessageCircle className="h-3 w-3" /> Contacter {operatorName}
                            </Button>
                          )}
                          {report && report.status !== "resolved" && (
                            <Button
                              size="sm" variant="outline"
                              className="h-7 text-xs gap-1 border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10"
                              disabled={resolveFromEscaladeMutation.isPending}
                              onClick={() => resolveFromEscaladeMutation.mutate(report.id)}
                            >
                              <CheckCircle className="h-3 w-3" /> Marquer résolu
                            </Button>
                          )}
                          {!isRead && (
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 text-xs gap-1 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50"
                              onClick={() => dismissEscaladeMutation.mutate(notif.id)}
                            >
                              <CheckCheck className="h-3 w-3" /> Marquer lu
                            </Button>
                          )}
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 text-xs gap-1 text-muted-foreground ml-auto"
                            onClick={() => deleteEscaladeMutation.mutate(notif.id)}
                          >
                            <Trash2 className="h-3 w-3" /> Fermer l'alerte
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Detail dialog */}
        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedReport?.service_type === "electricity" ? (
                  <Zap className="h-5 w-5 text-electricity" />
                ) : (
                  <Droplets className="h-5 w-5 text-water" />
                )}
                Détails du signalement
              </DialogTitle>
            </DialogHeader>
            {selectedReport && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Commune</p>
                    <p className="font-medium">{selectedReport.commune || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Quartier</p>
                    <p className="font-medium">{selectedReport.quartier || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">GPS (privé)</p>
                    <p className="font-medium font-mono text-xs">
                      {selectedReport.latitude && selectedReport.longitude
                        ? `${selectedReport.latitude.toFixed(4)}, ${selectedReport.longitude.toFixed(4)}`
                        : "Non disponible"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Urgence</p>
                    <Badge variant={URGENCY_LABELS[selectedReport.urgency]?.variant || "secondary"}>
                      {URGENCY_LABELS[selectedReport.urgency]?.label || selectedReport.urgency}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Profil</p>
                    <p className="font-medium">{selectedReport.reporter_type === "business" ? "Entreprise" : "Ménage"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Début</p>
                    <p className="font-medium text-xs">
                      {format(new Date(selectedReport.start_time), "PPp", { locale: fr })}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Description</p>
                  <p className="text-sm">
                    {selectedReport.report_category === "infrastructure"
                      ? cleanDescription(selectedReport.description)
                      : selectedReport.description}
                  </p>
                </div>
                {/* Corroboration status in admin detail */}
                <CorroborationStatus verifications={selectedReport.verifications} />
                {((selectedReport.photo_urls && selectedReport.photo_urls.length > 0) || selectedReport.photo_url) && (
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Photo(s) jointe(s)</p>
                    <PhotoGallery
                      photos={
                        (selectedReport.photo_urls && selectedReport.photo_urls.length > 0)
                          ? selectedReport.photo_urls
                          : selectedReport.photo_url ? [selectedReport.photo_url] : []
                      }
                      thumbHeight="h-48"
                    />
                  </div>
                )}
                {!selectedReport.validated && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1"
                      onClick={() => validateMutation.mutate({ reportId: selectedReport.id, validated: true })}
                      disabled={validateMutation.isPending}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Valider et publier
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => validateMutation.mutate({ reportId: selectedReport.id, validated: false })}
                      disabled={validateMutation.isPending}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Rejeter
                    </Button>
                  </div>
                )}
                {selectedReport.validated && selectedReport.status === "active" && (
                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-primary/40 text-primary hover:bg-primary/10"
                      disabled={addToRelayMutation.isPending}
                      onClick={() => addToRelayMutation.mutate(selectedReport)}
                    >
                      <Send className="h-4 w-4" />
                      Ajouter aux relais d'intervention (Email)
                    </Button>
                    {/* Transmettre à l'opérateur */}
                    {!(selectedReport as any).forwarded_to_operator_at ? (
                      <Button
                        variant="outline"
                        className="w-full gap-2 border-amber-500/40 text-amber-700 hover:bg-amber-500/10"
                        onClick={() => forwardMutation.mutate(selectedReport.id)}
                        disabled={forwardMutation.isPending}
                      >
                        <Clock className="h-4 w-4" />
                        Marquer "Transmis à l'opérateur"
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg bg-amber-500/8 border border-amber-500/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        Transmis à l'opérateur le {new Date((selectedReport as any).forwarded_to_operator_at).toLocaleDateString("fr-FR")}
                      </div>
                    )}
                    <Button
                      className="w-full bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white"
                      onClick={() => resolveMutation.mutate(selectedReport.id)}
                      disabled={resolveMutation.isPending}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Marquer comme résolu
                    </Button>
                  </div>
                )}
                {/* Bouton supprimer pour les signalements infrastructure */}
                {selectedReport.report_category === "infrastructure" && (
                  <div className="pt-2 border-t border-border">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => {
                        if (confirm("Supprimer définitivement ce signalement infrastructure ?")) {
                          deleteMutation.mutate(selectedReport.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                      Supprimer ce signalement
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReportsPage;
