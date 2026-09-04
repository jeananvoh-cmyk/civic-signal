import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, MapPin, Zap, Droplets, Clock, Eye, Landmark, Download, Square, CheckSquare, Trash2, MessageCircle, PhoneCall, AlertOctagon, Bell, ExternalLink, CheckCheck, Wrench, ShieldAlert, Send, Ticket, Building2, Copy, Search, Filter, SlidersHorizontal, RefreshCw, Activity, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { extractInfraLabel, cleanDescription, infraEmoji, infraOperator, INFRA_CIE, INFRA_SODECI } from "@/lib/report-display";
import { getDisplayTicketCode, formatPadaAddress, getCommunePadaCode } from "@/lib/pada";
import { COMMUNES } from "@/lib/communes";

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
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<string>(searchParams.get("tab") || "pending");
  const [serviceFilter, setServiceFilter] = useState<string>(searchParams.get("service") || "all");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "all");
  const [communeFilter, setCommuneFilter] = useState<string>(searchParams.get("commune") || "all");
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get("search") || "");

  // Synchroniser avec les query params entrants si l'admin navigue depuis l'aperçu
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const serviceParam = searchParams.get("service");
    const statusParam = searchParams.get("status");
    const communeParam = searchParams.get("commune");
    const searchParam = searchParams.get("search");

    if (tabParam && tabParam !== activeTab) setActiveTab(tabParam);
    if (serviceParam && serviceParam !== serviceFilter) setServiceFilter(serviceParam);
    if (statusParam && statusParam !== statusFilter) setStatusFilter(statusParam);
    if (communeParam && communeParam !== communeFilter) setCommuneFilter(communeParam);
    if (searchParam && searchParam !== searchQuery) setSearchQuery(searchParam);
  }, [searchParams]);

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
    const cols = ["id", "ticket_code", "commune", "quartier", "service_type", "report_category", "urgency", "status", "verifications", "created_at", "description"];
    const header = cols.join(";");
    const rows = reports.map((r) =>
      cols.map((c) => {
        let v = r[c] ?? "";
        if (c === "ticket_code") {
          v = getDisplayTicketCode({ ticket_code: r.ticket_code, commune: r.commune, created_at: r.created_at, id: r.id });
        }
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
      return data || [];
    },
  });

  const { data: validatedReports = [], isLoading: loadingValidated, refetch: refetchValidated } = useQuery({
    queryKey: ["admin-reports-validated"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("validated", true)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data || [];
    },
  });

  // Mutation auto-clôture
  const autoResolveStaleMutation = useMutation({
    mutationFn: async (hours: number = 48) => {
      try {
        const { data: rpcCount, error: rpcError } = await (supabase as any).rpc(
          "auto_resolve_stale_outages",
          { p_hours: hours }
        );
        if (!rpcError && typeof rpcCount === "number") {
          return rpcCount;
        }
      } catch (e) {
        console.warn("RPC auto_resolve_stale_outages note:", e);
      }

      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const { data: updated, error } = await supabase
        .from("reports")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("status", "active")
        .eq("validated", true)
        .in("service_type", ["electricity", "water"])
        .neq("report_category", "infrastructure")
        .lt("created_at", cutoff)
        .select("id");

      if (error) throw error;
      return updated?.length || 0;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports-validated"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview-totals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reports-neglected"] });
      refetchValidated();
      toast.success(
        count > 0
          ? `${count} coupure(s) d'électricité/eau (>48h) ont été automatiquement clôturées.`
          : "Aucune coupure de plus de 48h en attente de clôture."
      );
    },
    onError: (err: any) => toast.error(getUserFriendlyError(err)),
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

        const emailCie = cfgMap.email_cie?.trim() || "reclamation@cie.ci";
        const emailAnare = cfgMap.email_anare?.trim() || "reclamation@anare.ci";
        const emailSodeci = cfgMap.email_sodeci?.trim() || "reclamation@sodeci.ci";
        const emailOnep = cfgMap.email_onep?.trim() || "reclamation@onep.ci";

        if (isCieRelated) {
          relays.push({ report_id: reportId, operator: "CIE", email_to: emailCie, status: "pending" });
          if (cfgMap.anare_auto_dispatch !== "false") {
            relays.push({ report_id: reportId, operator: "ANARE", email_to: emailAnare, status: "pending" });
          }
        } else if (isSodeciRelated) {
          relays.push({ report_id: reportId, operator: "SODECI", email_to: emailSodeci, status: "pending" });
          if (cfgMap.onep_auto_dispatch !== "false") {
            relays.push({ report_id: reportId, operator: "ONEP", email_to: emailOnep, status: "pending" });
          }
        } else {
          const slug = (report.commune || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          const mairieEmail = cfgMap[`mairie_${slug}_email`]?.trim() || `mairie:${report.commune}`;
          relays.push({ report_id: reportId, operator: "MAIRIE", email_to: mairieEmail, status: "pending" });
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
      `(${serviceLabel} à ${report.commune}, ${report.quartier}). ` +
      `Le service est-il rétabli ? ` +
      `Merci de confirmer ou de marquer comme résolu en 1 clic ici : https://signa.ci/signalement/${report.id}?action=resolve`
    );
    return `https://wa.me/${phone}?text=${message}`;
  };

  const ReportRow = ({ report, showActions }: { report: any; showActions: boolean }) => {
    const urgency = URGENCY_LABELS[report.urgency] || URGENCY_LABELS.low;
    const isChecked = selectedIds.has(report.id);
    const isElec = report.service_type === "electricity";
    const isWater = report.service_type === "water";
    const isInfra = report.report_category === "infrastructure" || report.service_type === "mairie";
    const isResolved = report.status === "resolved";
    const isChronic = report.status === "chronic";
    const isActive = report.status === "active";

    // Calcul de la durée écoulée
    const refDate = report.start_time || report.created_at;
    const elapsedHours = refDate ? (Date.now() - new Date(refDate).getTime()) / 3600000 : 0;
    const elapsedDays = Math.floor(elapsedHours / 24);
    const elapsedHoursRemainder = Math.floor(elapsedHours % 24);
    const elapsedMins = Math.floor((elapsedHours * 60) % 60);
    const durationLabel = elapsedDays > 0
      ? `${elapsedDays}j${elapsedHoursRemainder > 0 ? ` ${elapsedHoursRemainder}h` : ""}`
      : elapsedHours >= 1
      ? `${Math.floor(elapsedHours)}h${elapsedMins > 0 ? ` ${elapsedMins}min` : ""}`
      : `${Math.max(1, elapsedMins)} min`;

    return (
      <Card
        className={`hover:border-primary/50 transition-all ${
          isChecked ? "border-primary bg-primary/3" : "cursor-pointer"
        } ${isResolved ? "opacity-75 bg-muted/20" : ""}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("[data-clickable]")) return;
          setSelectedReport(report);
        }}
      >
        <CardContent className="flex items-center justify-between p-3.5 sm:p-4 gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {showActions && (
              <div data-clickable onClick={(e) => { e.stopPropagation(); toggleSelect(report.id); }} className="shrink-0">
                <Checkbox checked={isChecked} onCheckedChange={() => toggleSelect(report.id)} />
              </div>
            )}
            <div className="shrink-0">
              {isInfra ? (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
                  <Wrench className="h-5 w-5" />
                </div>
              ) : isElec ? (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                  <Zap className="h-5 w-5" />
                </div>
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                  <Droplets className="h-5 w-5" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Code Ticket Officiel */}
                <span className="font-mono text-[11px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  {getDisplayTicketCode({
                    ticket_code: report.ticket_code,
                    commune: report.commune,
                    created_at: report.created_at,
                    id: report.id,
                  })}
                </span>

                <p className="text-sm font-semibold text-foreground truncate">
                  {report.commune}, {report.quartier}
                </p>

                {report.pada_commune_code && (
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                    PADA {report.pada_commune_code}
                  </span>
                )}

                {/* Badge Statut */}
                {isResolved ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] px-1.5 py-0">
                    ✅ Résolu
                  </Badge>
                ) : isChronic ? (
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px] px-1.5 py-0">
                    🔴 Chronique ({durationLabel})
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${
                      elapsedHours >= 24
                        ? "bg-destructive/10 text-destructive border-destructive/30 font-bold"
                        : elapsedHours >= 10
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/30 font-semibold"
                        : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                    }`}
                  >
                    🟠 Actif (⏱ {durationLabel})
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground truncate mt-1">
                {isInfra ? cleanDescription(report.description) : report.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isInfra && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs hidden sm:inline-flex">
                {infraEmoji(extractInfraLabel(report.description))} {extractInfraLabel(report.description) ?? "Infrastructure"}
              </Badge>
            )}

            <Badge variant={urgency.variant} className="text-xs hidden sm:inline-flex">{urgency.label}</Badge>

            {/* Actions rapides en direct */}
            <div data-clickable className="flex items-center gap-1.5">
              {/* Lien direct fiche de signalement */}
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2.5 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`/signalement/${report.id}`, "_blank");
                }}
                title="Consulter la fiche publique du signalement"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Fiche</span>
              </Button>

              {/* Action marquer résolu si actif */}
              {report.validated && report.status === "active" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 text-xs gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    resolveMutation.mutate(report.id);
                  }}
                  disabled={resolveMutation.isPending}
                  title="Marquer comme résolu"
                >
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="hidden md:inline">Résolu</span>
                </Button>
              )}

              {showActions && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 text-green-600 hover:bg-green-50"
                    onClick={(e) => { e.stopPropagation(); validateMutation.mutate({ reportId: report.id, validated: true }); }}
                    title="Valider"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                    onClick={(e) => { e.stopPropagation(); validateMutation.mutate({ reportId: report.id, validated: false }); }}
                    title="Rejeter"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Filtrage des signalements validés
  const filteredValidatedReports = validatedReports.filter((r: any) => {
    // Statut
    if (statusFilter === "active" && r.status !== "active") return false;
    if (statusFilter === "resolved" && r.status !== "resolved") return false;
    if (statusFilter === "chronic" && r.status !== "chronic") return false;
    if (statusFilter === "critical" && (r.urgency !== "critical" || r.status !== "active")) return false;

    // Service
    if (serviceFilter === "electricity" && (r.service_type !== "electricity" || r.report_category === "infrastructure")) return false;
    if (serviceFilter === "water" && (r.service_type !== "water" || r.report_category === "infrastructure")) return false;
    if (serviceFilter === "mairie" && r.service_type !== "mairie" && r.report_category !== "infrastructure") return false;

    // Commune
    if (communeFilter !== "all" && r.commune?.toLowerCase().trim() !== communeFilter.toLowerCase().trim()) return false;

    // Recherche par Ticket, Quartier, Description ou PADA
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTicket = r.ticket_code?.toLowerCase().includes(q);
      const matchCommune = r.commune?.toLowerCase().includes(q);
      const matchQuartier = r.quartier?.toLowerCase().includes(q);
      const matchDesc = r.description?.toLowerCase().includes(q);
      const matchPada = r.pada_formatted_address?.toLowerCase().includes(q) || r.pada_street_name?.toLowerCase().includes(q);
      if (!matchTicket && !matchCommune && !matchQuartier && !matchDesc && !matchPada) return false;
    }

    return true;
  });

  // Décomptes de synthèse pour les badges
  const countValidatedActiveElec = validatedReports.filter(
    (r: any) => r.service_type === "electricity" && r.status === "active" && r.report_category !== "infrastructure"
  ).length;
  const countValidatedActiveWater = validatedReports.filter(
    (r: any) => r.service_type === "water" && r.status === "active" && r.report_category !== "infrastructure"
  ).length;
  const countValidatedActiveInfra = validatedReports.filter(
    (r: any) => (r.service_type === "mairie" || r.report_category === "infrastructure") && r.status === "active"
  ).length;
  const countValidatedActiveTotal = validatedReports.filter((r: any) => r.status === "active").length;
  const countValidatedResolved = validatedReports.filter((r: any) => r.status === "resolved").length;

  // Liste courante pour navigation précédent / suivant dans le tiroir d'inspection
  const currentList = activeTab === "pending"
    ? pendingReports
    : activeTab === "validated"
    ? filteredValidatedReports
    : activeTab === "neglected"
    ? neglectedReports
    : [];

  const currentReportIndex = currentList.findIndex((r: any) => r.id === selectedReport?.id);
  const hasPrevReport = currentReportIndex > 0;
  const hasNextReport = currentReportIndex >= 0 && currentReportIndex < currentList.length - 1;

  const [batchActionLoading, setBatchActionLoading] = useState(false);

  const handleBatchResolve = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!confirm(`Marquer comme résolus les ${count} signalement(s) sélectionné(s) ?`)) return;
    setBatchActionLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from("reports")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in("id", ids);
      if (error) throw error;
      toast.success(`${count} signalement(s) marqués comme résolus !`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["admin-reports-validated"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview-totals"] });
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la résolution groupée");
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleBatchForward = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!confirm(`Marquer "Transmis à l'opérateur" pour les ${count} signalement(s) sélectionné(s) ?`)) return;
    setBatchActionLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from("reports")
        .update({
          forwarded_to_operator_at: new Date().toISOString(),
          forwarded_to_operator_by: user?.id,
          updated_at: new Date().toISOString(),
        } as any)
        .in("id", ids);
      if (error) throw error;
      toast.success(`${count} signalement(s) marqués comme transmis !`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["admin-reports-validated"] });
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la transmission groupée");
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!confirm(`Supprimer définitivement les ${count} signalement(s) sélectionné(s) ? Cette action est irréversible.`)) return;
    setBatchActionLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from("reports")
        .delete()
        .in("id", ids);
      if (error) throw error;
      toast.success(`${count} signalement(s) supprimés avec succès !`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["admin-reports-validated"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reports-pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview-totals"] });
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression groupée");
    } finally {
      setBatchActionLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Gestion des signalements</h1>
            <p className="mt-1 text-muted-foreground">
              Vérification, suivi des fiches PADA, relance opérateurs et auto-clôture des coupures.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 shadow-sm"
            onClick={() => {
              if (confirm("Voulez-vous auto-clôturer les coupures d'électricité et d'eau de plus de 48h sans confirmation ?")) {
                autoResolveStaleMutation.mutate(48);
              }
            }}
            disabled={autoResolveStaleMutation.isPending}
          >
            <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>{autoResolveStaleMutation.isPending ? "Clôture en cours..." : "Auto-clôturer coupures expirées (+48h)"}</span>
          </Button>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="pending">
            En attente ({pendingReports.length})
          </TabsTrigger>
          <TabsTrigger value="validated">
            Validés & Traitement ({validatedReports.length})
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
            <p className="text-muted-foreground text-sm">Aucun signalement en attente de validation.</p>
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

        <TabsContent value="validated" className="space-y-4 mt-4">
          {/* ── Barre d'outils, filtres & recherche ── */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3.5 shadow-sm">
            {/* Ligne 1 : Recherche textuelle + Filtres déroulants */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              {/* Barre de recherche */}
              <div className="sm:col-span-6 relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Recherche : Ticket (SIG-COC-...), quartier, PADA, mot-clé..."
                  className="pl-9 pr-8 text-xs h-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Sélecteur de Commune */}
              <div className="sm:col-span-3">
                <Select value={communeFilter} onValueChange={setCommuneFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Toutes les communes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les communes ({validatedReports.length})</SelectItem>
                    {COMMUNES.map((c) => {
                      const count = validatedReports.filter((r: any) => r.commune?.toLowerCase().trim() === c.nom.toLowerCase().trim()).length;
                      return (
                        <SelectItem key={c.nom} value={c.nom}>
                          {c.nom} {count > 0 ? `(${count})` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Sélecteur de Service */}
              <div className="sm:col-span-3">
                <Select value={serviceFilter} onValueChange={setServiceFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Tous les services" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les services</SelectItem>
                    <SelectItem value="electricity">⚡ Électricité (CIE)</SelectItem>
                    <SelectItem value="water">💧 Eau (SODECI)</SelectItem>
                    <SelectItem value="mairie">🏗️ Voirie & Mairie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Ligne 2 : Puces de filtrage rapide par statut & boutons d'export */}
            <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-border/60">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  size="sm"
                  variant={statusFilter === "all" ? "default" : "outline"}
                  className="h-7 text-xs px-2.5"
                  onClick={() => setStatusFilter("all")}
                >
                  Tous ({validatedReports.length})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === "active" ? "default" : "outline"}
                  className={`h-7 text-xs px-2.5 ${statusFilter === "active" ? "bg-amber-600 hover:bg-amber-700" : "text-amber-700 dark:text-amber-300 border-amber-500/30"}`}
                  onClick={() => setStatusFilter("active")}
                >
                  🟠 Actifs ({countValidatedActiveTotal})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === "resolved" ? "default" : "outline"}
                  className={`h-7 text-xs px-2.5 ${statusFilter === "resolved" ? "bg-emerald-600 hover:bg-emerald-700" : "text-emerald-700 dark:text-emerald-300 border-emerald-500/30"}`}
                  onClick={() => setStatusFilter("resolved")}
                >
                  ✅ Résolus ({countValidatedResolved})
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === "critical" ? "default" : "outline"}
                  className={`h-7 text-xs px-2.5 ${statusFilter === "critical" ? "bg-destructive hover:bg-destructive/90" : "text-destructive border-destructive/30"}`}
                  onClick={() => setStatusFilter("critical")}
                >
                  🔴 Critiques
                </Button>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {(statusFilter !== "all" || serviceFilter !== "all" || communeFilter !== "all" || searchQuery) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setStatusFilter("all");
                      setServiceFilter("all");
                      setCommuneFilter("all");
                      setSearchQuery("");
                    }}
                  >
                    Réinitialiser
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => exportCSV(filteredValidatedReports)}
                >
                  <Download className="h-3.5 w-3.5" /> Exporter CSV ({filteredValidatedReports.length})
                </Button>
              </div>
            </div>
          </div>

          {/* ── Liste des résultats ── */}
          {loadingValidated ? (
            <p className="text-muted-foreground text-sm">Chargement des signalements...</p>
          ) : filteredValidatedReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-border bg-card p-6">
              <CheckCircle className="h-10 w-10 text-muted-foreground mb-3 opacity-60" />
              <p className="text-sm font-medium text-foreground">Aucun signalement ne correspond aux filtres actuels</p>
              <p className="text-xs text-muted-foreground mt-1">
                Modifiez vos critères de recherche ou réinitialisez les filtres.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-4 text-xs"
                onClick={() => {
                  setStatusFilter("all");
                  setServiceFilter("all");
                  setCommuneFilter("all");
                  setSearchQuery("");
                }}
              >
                Afficher tous les signalements
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>{filteredValidatedReports.length} signalement{filteredValidatedReports.length > 1 ? "s" : ""} affiché{filteredValidatedReports.length > 1 ? "s" : ""}</span>
                <span>Cliquez sur une fiche pour ouvrir ses détails</span>
              </div>
              {filteredValidatedReports.map((r: any) => (
                <ReportRow key={r.id} report={r} showActions={false} />
              ))}
            </div>
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
                            <Button
                              size="sm"
                              className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-2xs"
                              onClick={() => resolveMutation.mutate(r.id)}
                              disabled={resolveMutation.isPending}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Clôturer (Rétabli)
                            </Button>
                            {hasPhone ? (
                              <a
                                href={waLink!}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-full gap-1.5 text-xs border-emerald-600/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 font-medium"
                                >
                                  <MessageCircle className="h-3 w-3" />
                                  WhatsApp
                                </Button>
                              </a>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1.5 text-xs text-muted-foreground opacity-60"
                                disabled
                              >
                                <PhoneCall className="h-3 w-3" />
                                Sans tél
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-muted-foreground hover:text-foreground"
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

        {/* Tiroir d'inspection latérale (Slide-over Drawer / Split-View ergonomique) */}
        <Sheet open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
          <SheetContent side="right" className="w-full sm:max-w-lg md:max-w-xl overflow-y-auto p-5 sm:p-6 space-y-4">
            <SheetHeader className="border-b border-border/60 pb-3">
              <div className="flex items-center justify-between gap-2 pr-6">
                <SheetTitle className="flex items-center gap-2 text-base font-bold">
                  {selectedReport?.service_type === "electricity" ? (
                    <Zap className="h-5 w-5 text-amber-500" />
                  ) : (
                    <Droplets className="h-5 w-5 text-blue-500" />
                  )}
                  <span>Fiche Signalement</span>
                </SheetTitle>

                {/* Contrôles Précédent / Suivant */}
                {currentReportIndex >= 0 && currentList.length > 1 && (
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-mono font-bold text-muted-foreground mr-1">
                      {currentReportIndex + 1} / {currentList.length}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!hasPrevReport}
                      onClick={() => hasPrevReport && setSelectedReport(currentList[currentReportIndex - 1])}
                      className="h-7 w-7 p-0"
                      title="Signalement précédent"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!hasNextReport}
                      onClick={() => hasNextReport && setSelectedReport(currentList[currentReportIndex + 1])}
                      className="h-7 w-7 p-0"
                      title="Signalement suivant"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </SheetHeader>
            {selectedReport && (
              <div className="space-y-4">
                {/* 🎫 Référence Ticket & Adressage PADA */}
                <div className="rounded-xl border border-border/80 bg-muted/40 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Ticket Officiel : </span>
                        <span className="font-mono font-black text-foreground text-sm">
                          {getDisplayTicketCode({
                            ticket_code: selectedReport.ticket_code,
                            commune: selectedReport.commune,
                            created_at: selectedReport.created_at,
                            id: selectedReport.id,
                          })}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 gap-1 hover:bg-emerald-500/10"
                      onClick={() => {
                        const code = getDisplayTicketCode({
                          ticket_code: selectedReport.ticket_code,
                          commune: selectedReport.commune,
                          created_at: selectedReport.created_at,
                          id: selectedReport.id,
                        });
                        navigator.clipboard.writeText(code);
                        toast.success(`Ticket ${code} copié !`);
                      }}
                    >
                      <Copy className="h-3 w-3" />
                      <span>Copier</span>
                    </Button>
                  </div>

                  {/* PADA */}
                  <div className="flex items-start gap-2 pt-0.5">
                    <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Nomenclature PADA (MCLU) : </span>
                      <span className="text-foreground font-semibold">
                        {selectedReport.pada_formatted_address || formatPadaAddress({
                          commune: selectedReport.commune,
                          quartier: selectedReport.quartier,
                          streetName: selectedReport.pada_street_name || selectedReport.quartier,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

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
                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-primary/40 text-primary hover:bg-primary/10 font-semibold text-xs h-9"
                    onClick={() => window.open(`/signalement/${selectedReport.id}`, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Consulter la fiche publique du signalement (Page usager)
                  </Button>
                </div>

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
          </SheetContent>
        </Sheet>

        {/* ── BARRE D'ACTIONS GROUPÉES FLOTTANTE ── */}
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-foreground text-background shadow-2xl border border-border/40 backdrop-blur-lg"
          >
            <div className="flex items-center gap-2 pr-3 border-r border-background/20 text-xs font-bold shrink-0">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-black text-xs">
                {selectedIds.size}
              </span>
              <span className="hidden sm:inline">sélectionné(s)</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                disabled={batchActionLoading}
                onClick={handleBatchResolve}
                className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Résolus</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={batchActionLoading}
                onClick={handleBatchForward}
                className="h-8 text-xs font-bold border-amber-500/40 text-amber-300 hover:bg-amber-500/20 bg-transparent gap-1.5"
              >
                <Building2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Transmis</span> Opérateur
              </Button>

              <Button
                size="sm"
                variant="destructive"
                disabled={batchActionLoading}
                onClick={handleBatchDelete}
                className="h-8 text-xs font-bold gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Supprimer</span>
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
                className="h-8 text-xs text-background/80 hover:text-background hover:bg-background/10 px-2"
                title="Désélectionner tout"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </div>
  );
};

export default AdminReportsPage;
