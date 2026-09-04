import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FileText, Users, AlertTriangle, CheckCircle2, Clock, Eye, Megaphone,
  Zap, Droplets, Shield, Trash2, BarChart3, ArrowRight, Heart, MailCheck, Building2, Landmark, Activity, AlertOctagon, SlidersHorizontal, Minus, Plus,
  Radio, MapPin, Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSetting } from "@/hooks/useSiteSetting";
import { toast } from "@/hooks/use-toast";

const LAST_ADMIN_PAGE_KEY = "admin_last_page";

const AdminOverviewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const last = localStorage.getItem(LAST_ADMIN_PAGE_KEY);
    if (last && last !== "/admin" && !(location.state as any)?.internal) {
      navigate(last, { replace: true, state: { internal: true } });
    }
  }, []);

  const queryClient = useQueryClient();
  const { data: donationsEnabled = true } = useSiteSetting("donations_enabled");
  const { data: transparencyEnabled = true } = useSiteSetting("transparency_enabled");
  const { data: partnersEnabled = true } = useSiteSetting("partners_enabled");
  const { data: suiviEnabled = true } = useSiteSetting("suivi_enabled");

  const toggleTransparency = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("site_settings")
        .update({ value: enabled as unknown as never, updated_at: new Date().toISOString(), updated_by: user?.id })
        .eq("key", "transparency_enabled");
      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["site-setting", "transparency_enabled"] });
      toast({ title: enabled ? "Page transparence activée" : "Page transparence masquée" });
    },
  });

  const togglePartners = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "partners_enabled", value: enabled as unknown as never, updated_at: new Date().toISOString(), updated_by: user?.id }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["site-setting", "partners_enabled"] });
      toast({ title: enabled ? "Page partenaires visible" : "Page partenaires masquée" });
    },
  });

  const toggleSuivi = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "suivi_enabled", value: enabled as unknown as never, updated_at: new Date().toISOString(), updated_by: user?.id }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["site-setting", "suivi_enabled"] });
      toast({ title: enabled ? "Lien Suivi visible" : "Lien Suivi masqué" });
    },
  });

  const toggleDonations = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("site_settings")
        .update({ value: enabled as unknown as never, updated_at: new Date().toISOString(), updated_by: user?.id })
        .eq("key", "donations_enabled");
      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["site-setting", "donations_enabled"] });
      toast({ title: enabled ? "Page dons activée" : "Page dons masquée" });
    },
  });

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["admin-overview-pending"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("validated", false);
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: totalStats } = useQuery({
    queryKey: ["admin-overview-totals"],
    queryFn: async () => {
      const [
        totalRes,
        activeElecRes,
        activeWaterRes,
        activeInfraRes,
        activeAllRes,
        criticalRes,
        resolvedRes,
      ] = await Promise.all([
        supabase.from("reports").select("*", { count: "exact", head: true }),
        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("service_type", "electricity")
          .eq("status", "active")
          .eq("validated", true)
          .neq("report_category", "infrastructure"),
        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("service_type", "water")
          .eq("status", "active")
          .eq("validated", true)
          .neq("report_category", "infrastructure"),
        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("status", "active")
          .eq("validated", true)
          .or("report_category.eq.infrastructure,service_type.eq.mairie"),
        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("status", "active")
          .eq("validated", true),
        supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("urgency", "critical")
          .eq("status", "active"),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "resolved"),
      ]);

      const activeElec = activeElecRes.count || 0;
      const activeWater = activeWaterRes.count || 0;
      const activeInfra = activeInfraRes.count || 0;
      const activeTotal = activeAllRes.count || (activeElec + activeWater + activeInfra);

      return {
        total: totalRes.count || 0,
        active: activeTotal,
        activeElec,
        activeWater,
        activeInfra,
        critical: criticalRes.count || 0,
        resolved: resolvedRes.count || 0,
      };
    },
  });

  // Mutation pour auto-clôturer les coupures d'électricité et d'eau obsolètes (>48h)
  const autoResolveStaleMutation = useMutation({
    mutationFn: async (hours: number = 48) => {
      // 1. Essayer la RPC SQL en premier
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

      // 2. Fallback direct sur Supabase client
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
      queryClient.invalidateQueries({ queryKey: ["admin-overview-totals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reports-validated"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview-critical"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reports-neglected"] });
      toast({
        title: "Auto-clôture réussie",
        description: count > 0
          ? `${count} coupure(s) d'électricité/eau expirée(s) (+48h) ont été automatiquement clôturées.`
          : "Aucune coupure de plus de 48h en attente de clôture.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erreur d'auto-clôture",
        description: err?.message || "Impossible d'exécuter l'auto-clôture.",
        variant: "destructive",
      });
    },
  });

  const { data: usersCount = 0 } = useQuery({
    queryKey: ["admin-overview-users"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: deletionsCount = 0 } = useQuery({
    queryKey: ["admin-overview-deletions"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("report_deletions")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: pendingRelayCount = 0 } = useQuery({
    queryKey: ["admin-overview-relay-pending"],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("relay_logs")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: neglectThreshold = 7 } = useSiteSetting("neglect_threshold_days");
  const [thresholdInput, setThresholdInput] = useState<number | null>(null);
  const currentThreshold = thresholdInput ?? (typeof neglectThreshold === "number" ? neglectThreshold : 7);

  const saveThreshold = useMutation({
    mutationFn: async (days: number) => {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "neglect_threshold_days", value: days as unknown as never, updated_at: new Date().toISOString(), updated_by: user?.id }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: (_, days) => {
      queryClient.invalidateQueries({ queryKey: ["site-setting", "neglect_threshold_days"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview-neglected"] });
      setThresholdInput(null);
      toast({ title: `Seuil mis à jour : ${days} jours` });
    },
  });

  const { data: neglectedCount = 0 } = useQuery({
    queryKey: ["admin-overview-neglected", currentThreshold],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - currentThreshold * 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .in("status", ["active", "chronic"])
        .eq("validated", true)
        .eq("verifications", 0)
        .lt("created_at", cutoff);
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: criticalReports = [] } = useQuery({
    queryKey: ["admin-overview-critical"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, service_type, commune, quartier, description, verifications, created_at")
        .eq("urgency", "critical")
        .eq("status", "active")
        .eq("validated", true)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // Pulse Réseau Abidjan (Concentrations de pannes actives sur les dernières 24h par commune)
  const { data: communePulse = [] } = useQuery({
    queryKey: ["admin-overview-commune-pulse"],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("reports")
        .select("commune, service_type, report_category, status, created_at")
        .eq("status", "active")
        .gte("created_at", since);
      if (error) throw error;
      const counts: Record<string, { total: number; elec: number; water: number; infra: number }> = {};
      (data || []).forEach((r) => {
        if (!counts[r.commune]) {
          counts[r.commune] = { total: 0, elec: 0, water: 0, infra: 0 };
        }
        counts[r.commune].total += 1;
        if (r.service_type === "electricity") counts[r.commune].elec += 1;
        else if (r.service_type === "water") counts[r.commune].water += 1;
        else counts[r.commune].infra += 1;
      });
      return Object.entries(counts)
        .map(([commune, stats]) => ({ commune, ...stats }))
        .sort((a, b) => b.total - a.total);
    },
    refetchInterval: 30000,
  });

  const stats = totalStats || {
    total: 0,
    active: 0,
    activeElec: 0,
    activeWater: 0,
    activeInfra: 0,
    critical: 0,
    resolved: 0,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* ── En-tête ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-hero">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Vue d'ensemble</h1>
              <p className="text-sm text-muted-foreground">Supervision et maintenance de la plateforme SIGNA-CI</p>
            </div>
          </div>

          {/* Bouton d'auto-clôture des coupures obsolètes */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 shadow-sm"
            onClick={() => {
              if (confirm("Voulez-vous auto-clôturer les coupures d'électricité et d'eau actives datant de plus de 48h pour assainir les compteurs ?")) {
                autoResolveStaleMutation.mutate(48);
              }
            }}
            disabled={autoResolveStaleMutation.isPending}
          >
            <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>{autoResolveStaleMutation.isPending ? "Auto-clôture en cours..." : "Auto-clôturer les coupures expirées (+48h)"}</span>
          </Button>
        </div>
      </motion.div>

      {/* ── 🚨 BARRE D'ALERTE : Pulse Réseau Abidjan (Surveillance 24h) ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${communePulse.length > 0 ? "bg-amber-400" : "bg-emerald-400"}`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${communePulse.length > 0 ? "bg-amber-500" : "bg-emerald-500"}`} />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-foreground">
              Pulse Réseau Abidjan · 24h Récentes
            </span>
            <Badge variant="outline" className="text-[10px] font-mono font-bold">
              {communePulse.reduce((acc, c) => acc + c.total, 0)} pannes actives
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/carte")}
              className="h-7 text-[11px] font-bold gap-1 text-muted-foreground hover:text-foreground"
            >
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span>Ouvrir la Carte Tactique</span>
            </Button>
          </div>
        </div>

        {/* Détails par commune en pic */}
        <div className="pt-3">
          {communePulse.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Situation stable : Aucun pic anormal de coupures détecté sur le Grand Abidjan sur les dernières 24h.</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Zones chaudes :</span>
              {communePulse.slice(0, 5).map((cp) => (
                <button
                  key={cp.commune}
                  type="button"
                  onClick={() => navigate(`/admin/signalements?commune=${encodeURIComponent(cp.commune)}&status=active`)}
                  className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-bold text-foreground transition-all hover:scale-105"
                >
                  <span>📍 {cp.commune}</span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-amber-700 dark:text-amber-300">
                    {cp.elec > 0 && <span title={`${cp.elec} coupure(s) élec`}>⚡{cp.elec}</span>}
                    {cp.water > 0 && <span title={`${cp.water} coupure(s) eau`}>💧{cp.water}</span>}
                    {cp.infra > 0 && <span title={`${cp.infra} voirie`}>🏗️{cp.infra}</span>}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── KPIs d'alertes & actions ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4">
        {!totalStats ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse">
              <div className="h-5 w-5 rounded bg-muted mb-2 mx-auto" />
              <div className="h-8 w-14 rounded bg-muted mb-1.5 mx-auto" />
              <div className="h-3 w-20 rounded bg-muted mx-auto" />
            </div>
          ))
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} onClick={() => navigate("/admin/signalements?tab=pending")} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && navigate("/admin/signalements?tab=pending")} className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
              <Card className="border-warning/20 hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <Clock className="h-5 w-5 mx-auto mb-2 text-warning" />
                  <p className="font-display text-3xl font-extrabold text-warning">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">En attente validation</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} onClick={() => navigate("/admin/signalements?tab=validated&status=critical")} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && navigate("/admin/signalements?tab=validated&status=critical")} className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
              <Card className="border-destructive/20 hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="h-5 w-5 mx-auto mb-2 text-destructive" />
                  <p className="font-display text-3xl font-extrabold text-destructive">{stats.critical}</p>
                  <p className="text-xs text-muted-foreground">Critiques actifs</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} onClick={() => navigate("/admin/signalements?tab=neglected")} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && navigate("/admin/signalements?tab=neglected")} className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
              <Card className={`hover:shadow-md transition-shadow ${neglectedCount > 0 ? "border-warning/20" : ""}`}>
                <CardContent className="p-4 text-center">
                  <AlertOctagon className={`h-5 w-5 mx-auto mb-2 ${neglectedCount > 0 ? "text-warning" : "text-muted-foreground"}`} />
                  <p className={`font-display text-3xl font-extrabold ${neglectedCount > 0 ? "text-warning" : "text-foreground"}`}>{neglectedCount}</p>
                  <p className="text-xs text-muted-foreground">Négligés +{currentThreshold}j</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} onClick={() => navigate("/admin/relay")} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && navigate("/admin/relay")} className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
              <Card className={`hover:shadow-md transition-shadow ${pendingRelayCount > 0 ? "border-warning/20" : ""}`}>
                <CardContent className="p-4 text-center">
                  <MailCheck className={`h-5 w-5 mx-auto mb-2 ${pendingRelayCount > 0 ? "text-warning" : "text-muted-foreground"}`} />
                  <p className={`font-display text-3xl font-extrabold ${pendingRelayCount > 0 ? "text-warning" : "text-foreground"}`}>{pendingRelayCount}</p>
                  <p className="text-xs text-muted-foreground">Relais en attente</p>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </div>

      {/* ── Répartition granulaire des Signalements Actifs (Électricité, Eau, Voirie) ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            État des signalements actifs ({stats.active})
          </p>
          <span className="text-[11px] text-muted-foreground">Cliquez sur une carte pour voir les fiches</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Électricité */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            onClick={() => navigate("/admin/signalements?tab=validated&service=electricity&status=active")}
            className="cursor-pointer group"
          >
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 group-hover:bg-amber-500/10 p-3.5 flex items-center justify-between transition-all">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-display text-2xl font-black text-amber-700 dark:text-amber-300">{stats.activeElec}</p>
                    <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 text-[10px] px-1.5 py-0 bg-amber-500/10">
                      CIE
                    </Badge>
                  </div>
                  <p className="text-xs font-medium text-amber-900/80 dark:text-amber-200">Coupures Électricité</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-600/60 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
            </div>
          </motion.div>

          {/* Eau */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            onClick={() => navigate("/admin/signalements?tab=validated&service=water&status=active")}
            className="cursor-pointer group"
          >
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 group-hover:bg-blue-500/10 p-3.5 flex items-center justify-between transition-all">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400">
                  <Droplets className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-display text-2xl font-black text-blue-700 dark:text-blue-300">{stats.activeWater}</p>
                    <Badge variant="outline" className="border-blue-500/40 text-blue-700 dark:text-blue-400 text-[10px] px-1.5 py-0 bg-blue-500/10">
                      SODECI
                    </Badge>
                  </div>
                  <p className="text-xs font-medium text-blue-900/80 dark:text-blue-200">Coupures Eau</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-blue-600/60 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
          </motion.div>

          {/* Voirie & Infrastructure */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 }}
            onClick={() => navigate("/admin/signalements?tab=validated&service=mairie&status=active")}
            className="cursor-pointer group"
          >
            <div className="rounded-xl border border-teal-500/30 bg-teal-500/5 group-hover:bg-teal-500/10 p-3.5 flex items-center justify-between transition-all">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/20 text-teal-600 dark:text-teal-400">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-display text-2xl font-black text-teal-700 dark:text-teal-300">{stats.activeInfra}</p>
                    <Badge variant="outline" className="border-teal-500/40 text-teal-700 dark:text-teal-400 text-[10px] px-1.5 py-0 bg-teal-500/10">
                      Mairies
                    </Badge>
                  </div>
                  <p className="text-xs font-medium text-teal-900/80 dark:text-teal-200">Voirie & Infrastructures</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-teal-600/60 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Aperçu général — interactif avec redirections ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-8">
        {[
          { label: "Total signalements", value: stats.total, icon: FileText, path: "/admin/signalements?tab=validated" },
          { label: "Signalements actifs", value: stats.active, icon: Activity, path: "/admin/signalements?tab=validated&status=active" },
          { label: "Résolus / Rétablis", value: stats.resolved, icon: CheckCircle2, path: "/admin/signalements?tab=validated&status=resolved" },
          { label: "Utilisateurs inscrits", value: usersCount, icon: Users, path: "/admin/utilisateurs" },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 + i * 0.04 }}
            onClick={() => navigate(item.path)}
            className="cursor-pointer group"
          >
            <div className="rounded-xl border border-border bg-card hover:border-primary/50 group-hover:shadow-sm p-3 flex items-center justify-between transition-all">
              <div className="flex items-center gap-3">
                <item.icon className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                <div>
                  <p className="font-display text-xl font-bold text-foreground">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Signalements critiques — PRIORITAIRE ── */}
      {criticalReports.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="mb-8">
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <h3 className="font-display text-lg font-bold text-destructive">
                    Signalements critiques ({criticalReports.length})
                  </h3>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive gap-1" onClick={() => navigate("/admin/signalements")}>
                  Voir tout <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-2">
                {criticalReports.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-lg bg-background p-3 border border-border">
                    {r.service_type === "electricity" ? (
                      <Zap className="h-4 w-4 text-electricity shrink-0" />
                    ) : (
                      <Droplets className="h-4 w-4 text-water shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{r.commune} — {r.quartier}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.description}</p>
                    </div>
                    <Badge variant="destructive" className="shrink-0">
                      {r.verifications} confirm.
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Raccourcis ── */}
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Raccourcis</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-8">
        {[
          { label: "Utilisateurs", path: "/admin/utilisateurs", icon: Users, color: "text-primary" },
          { label: "Suppressions", path: "/admin/suppressions", icon: Trash2, count: deletionsCount, color: "text-destructive" },
          { label: "Statistiques", path: "/admin/stats", icon: BarChart3, color: "text-primary" },
          { label: "Messagerie", path: "/admin/messagerie", icon: Megaphone, color: "text-primary" },
        ].map((action, i) => (
          <motion.div key={action.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
            <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 relative" onClick={() => navigate(action.path)}>
              <action.icon className={`h-5 w-5 ${action.color}`} />
              <span className="text-xs font-medium">{action.label}</span>
              {action.count !== undefined && action.count > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 min-w-5 px-1.5 text-xs" variant="destructive">
                  {action.count}
                </Badge>
              )}
            </Button>
          </motion.div>
        ))}
      </div>

      {/* ── Configuration ── */}
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Configuration</p>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-4 w-4 text-primary" />
              <h2 className="font-display text-sm font-bold text-foreground">Visibilité des pages</h2>
            </div>
            <div className="divide-y divide-border">

              <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Page Partenaires</p>
                    <p className="text-xs text-muted-foreground">
                      {partnersEnabled ? "Visible — lien affiché dans la navigation" : "Masquée — non accessible depuis la navigation"}
                    </p>
                  </div>
                </div>
                <Switch checked={!!partnersEnabled} onCheckedChange={(checked) => togglePartners.mutate(checked)} disabled={togglePartners.isPending} aria-label={partnersEnabled ? "Masquer la page Partenaires" : "Afficher la page Partenaires"} />
              </div>

              <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/10">
                    <Activity className="h-4.5 w-4.5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Lien Suivi</p>
                    <p className="text-xs text-muted-foreground">
                      {suiviEnabled ? "Visible — lien affiché dans la navigation" : "Masqué — page /suivi accessible uniquement via URL directe"}
                    </p>
                  </div>
                </div>
                <Switch checked={!!suiviEnabled} onCheckedChange={(checked) => toggleSuivi.mutate(checked)} disabled={toggleSuivi.isPending} />
              </div>

              <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                    <BarChart3 className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Page Transparence & Open Data</p>
                    <p className="text-xs text-muted-foreground">
                      {transparencyEnabled ? "Visible — affichée au premier plan dans la navigation" : "Masquée — accessible uniquement sur /transparence directement"}
                    </p>
                  </div>
                </div>
                <Switch checked={!!transparencyEnabled} onCheckedChange={(checked) => toggleTransparency.mutate(checked)} disabled={toggleTransparency.isPending} />
              </div>

              <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                    <Heart className="h-4.5 w-4.5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Page de dons</p>
                    <p className="text-xs text-muted-foreground">
                      {donationsEnabled ? "Visible par tous les utilisateurs" : "Masquée — les utilisateurs ne peuvent pas y accéder"}
                    </p>
                  </div>
                </div>
                <Switch checked={!!donationsEnabled} onCheckedChange={(checked) => toggleDonations.mutate(checked)} disabled={toggleDonations.isPending} />
              </div>

            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Paramètres de comportement ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <h2 className="font-display text-sm font-bold text-foreground">Paramètres de comportement</h2>
            </div>
            <div className="divide-y divide-border">
              <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/10">
                    <AlertOctagon className="h-4 w-4 text-warning" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Seuil "Négligé"</p>
                    <p className="text-xs text-muted-foreground">
                      Nombre de jours sans corroboration avant qu'un signalement soit marqué "Négligé"
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setThresholdInput(Math.max(1, currentThreshold - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-bold text-foreground">{currentThreshold}j</span>
                  <button
                    onClick={() => setThresholdInput(Math.min(30, currentThreshold + 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  {thresholdInput !== null && thresholdInput !== (typeof neglectThreshold === "number" ? neglectThreshold : 7) && (
                    <button
                      onClick={() => saveThreshold.mutate(thresholdInput)}
                      disabled={saveThreshold.isPending}
                      className="ml-1 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {saveThreshold.isPending ? "…" : "Sauver"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

    </div>
  );
};

export default AdminOverviewPage;
