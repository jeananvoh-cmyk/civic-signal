import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FileText, Users, AlertTriangle, CheckCircle2, Clock, TrendingUp,
  Zap, Droplets, Shield, Trash2, BarChart3, ArrowRight, Heart, MailCheck, Building2, Eye, Activity, AlertOctagon, SlidersHorizontal, Minus, Plus,
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

  // Si l'utilisateur arrive sur /admin directement (pas via navigation interne),
  // on le redirige vers la dernière page admin qu'il avait visitée.
  useEffect(() => {
    // location.state?.internal est mis à true par les liens internes (AdminLayout goTo)
    const last = localStorage.getItem(LAST_ADMIN_PAGE_KEY);
    if (last && last !== "/admin" && !(location.state as any)?.internal) {
      navigate(last, { replace: true, state: { internal: true } });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
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

  // Pending reports count
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

  // Total reports
  const { data: totalStats } = useQuery({
    queryKey: ["admin-overview-totals"],
    queryFn: async () => {
      const [totalRes, activeRes, criticalRes, resolvedRes] = await Promise.all([
        supabase.from("reports").select("*", { count: "exact", head: true }),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "active").eq("validated", true),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("urgency", "critical").eq("status", "active"),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "resolved"),
      ]);
      return {
        total: totalRes.count || 0,
        active: activeRes.count || 0,
        critical: criticalRes.count || 0,
        resolved: resolvedRes.count || 0,
      };
    },
  });

  // Users count
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

  // Recent deletions count
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

  // Pending relay count
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

  // Seuil neglect configurable
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

  // Neglected reports count (actifs >seuil jours, validés, aucune corroboration)
  const { data: neglectedCount = 0 } = useQuery({
    queryKey: ["admin-overview-neglected", currentThreshold],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - currentThreshold * 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .in("status", ["active", "chronic"])
        .eq("validated", true)
        .eq("verifications", 0)
        .lt("created_at", sevenDaysAgo);
      if (error) throw error;
      return count || 0;
    },
  });

  // Recent critical reports
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

  const stats = totalStats || { total: 0, active: 0, critical: 0, resolved: 0 };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-hero">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Tableau de bord Admin</h1>
            <p className="text-sm text-muted-foreground">
              Vue d'ensemble de l'application SIGNA-CI
            </p>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-primary/20">
            <CardContent className="p-4 text-center">
              <FileText className="h-5 w-5 mx-auto mb-2 text-primary" />
              <p className="font-display text-3xl font-extrabold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total signalements</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-amber-500/20">
            <CardContent className="p-4 text-center">
              <Zap className="h-5 w-5 mx-auto mb-2 text-amber-500" />
              <p className="font-display text-3xl font-extrabold text-amber-500">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Coupures actives</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-destructive/20">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-5 w-5 mx-auto mb-2 text-destructive" />
              <p className="font-display text-3xl font-extrabold text-destructive">{stats.critical}</p>
              <p className="text-xs text-muted-foreground">Critiques 🔥</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-success/20">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-5 w-5 mx-auto mb-2 text-success" />
              <p className="font-display text-3xl font-extrabold text-success">{stats.resolved}</p>
              <p className="text-xs text-muted-foreground">Résolus</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-foreground">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">En attente validation</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-foreground">{usersCount}</p>
              <p className="text-xs text-muted-foreground">Utilisateurs inscrits</p>
            </div>
          </CardContent>
        </Card>

        <Card className={neglectedCount > 0 ? "border-amber-500/30" : ""}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${neglectedCount > 0 ? "bg-amber-500/10" : "bg-secondary"}`}>
              <AlertOctagon className={`h-5 w-5 ${neglectedCount > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className={`font-display text-2xl font-bold ${neglectedCount > 0 ? "text-amber-500" : "text-foreground"}`}>{neglectedCount}</p>
              <p className="text-xs text-muted-foreground">Négligés +7j</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-foreground">{deletionsCount}</p>
              <p className="text-xs text-muted-foreground">Suppressions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Valider signalements", path: "/admin/signalements", icon: FileText, count: pendingCount, color: "text-primary" },
          { label: "Négligés +7j", path: "/admin/signalements", icon: AlertOctagon, count: neglectedCount, color: neglectedCount > 0 ? "text-amber-500" : "text-muted-foreground" },
          { label: "Gérer les rôles", path: "/admin/utilisateurs", icon: Users, color: "text-primary" },
          { label: "Historique suppressions", path: "/admin/suppressions", icon: Trash2, count: deletionsCount, color: "text-destructive" },
          { label: "Statistiques", path: "/admin/stats", icon: BarChart3, color: "text-primary" },
          { label: "Relais opérateurs", path: "/admin/relay", icon: MailCheck, count: pendingRelayCount, color: "text-amber-500" },
        ].map((action, i) => (
          <motion.div key={action.path} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.05 }}>
            <Button
              variant="outline"
              className="w-full h-auto py-4 flex-col gap-2 relative"
              onClick={() => navigate(action.path)}
            >
              <action.icon className={`h-5 w-5 ${action.color}`} />
              <span className="text-xs font-medium">{action.label}</span>
              {action.count !== undefined && action.count > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 min-w-5 px-1.5 text-[10px]" variant="destructive">
                  {action.count}
                </Badge>
              )}
            </Button>
          </motion.div>
        ))}
      </div>

      {/* ── Visibilité des pages ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="font-display text-sm font-bold text-foreground">Visibilité des pages</h2>
            </div>
            <div className="divide-y divide-border">

              {/* Partenaires */}
              <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                    <Building2 className="h-4.5 w-4.5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Page Partenaires</p>
                    <p className="text-xs text-muted-foreground">
                      {partnersEnabled
                        ? "Visible — lien affiché dans la navigation"
                        : "Masquée — non accessible depuis la navigation"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={!!partnersEnabled}
                  onCheckedChange={(checked) => togglePartners.mutate(checked)}
                  disabled={togglePartners.isPending}
                />
              </div>

              {/* Suivi */}
              <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Activity className="h-4.5 w-4.5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Lien Suivi</p>
                    <p className="text-xs text-muted-foreground">
                      {suiviEnabled
                        ? "Visible — lien affiché dans la navigation"
                        : "Masqué — page /suivi accessible uniquement via URL directe"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={!!suiviEnabled}
                  onCheckedChange={(checked) => toggleSuivi.mutate(checked)}
                  disabled={toggleSuivi.isPending}
                />
              </div>

              {/* Transparence */}
              <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <BarChart3 className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Page Résultats</p>
                    <p className="text-xs text-muted-foreground">
                      {transparencyEnabled
                        ? "Visible — lien affiché dans la navigation"
                        : "Masquée — accessible uniquement sur /transparence directement"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={!!transparencyEnabled}
                  onCheckedChange={(checked) => toggleTransparency.mutate(checked)}
                  disabled={toggleTransparency.isPending}
                />
              </div>

              {/* Dons */}
              <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                    <Heart className="h-4.5 w-4.5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Page de dons</p>
                    <p className="text-xs text-muted-foreground">
                      {donationsEnabled
                        ? "Visible par tous les utilisateurs"
                        : "Masquée — les utilisateurs ne peuvent pas y accéder"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={!!donationsEnabled}
                  onCheckedChange={(checked) => toggleDonations.mutate(checked)}
                  disabled={toggleDonations.isPending}
                />
              </div>

            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Paramètres comportement ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <h2 className="font-display text-sm font-bold text-foreground">Paramètres de comportement</h2>
            </div>
            <div className="divide-y divide-border">

              {/* Seuil négligé */}
              <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                    <AlertOctagon className="h-4 w-4 text-amber-500" />
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
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-10 text-center text-sm font-bold text-foreground">
                    {currentThreshold}j
                  </span>
                  <button
                    onClick={() => setThresholdInput(Math.min(30, currentThreshold + 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  {thresholdInput !== null && thresholdInput !== (typeof neglectThreshold === "number" ? neglectThreshold : 7) && (
                    <button
                      onClick={() => saveThreshold.mutate(thresholdInput)}
                      disabled={saveThreshold.isPending}
                      className="ml-1 h-7 px-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
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

      {/* Critical reports alert */}
      {criticalReports.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <h3 className="font-display text-lg font-bold text-destructive">
                    Signalements critiques ({criticalReports.length})
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive gap-1"
                  onClick={() => navigate("/admin/signalements")}
                >
                  Voir tout <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-2">
                {criticalReports.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-lg bg-background p-3 border border-border">
                    {r.service_type === "electricity" ? (
                      <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                    ) : (
                      <Droplets className="h-4 w-4 text-blue-500 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {r.commune} — {r.quartier}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{r.description}</p>
                    </div>
                    <Badge variant="destructive" className="shrink-0">
                      🔥 {r.verifications} confirm.
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default AdminOverviewPage;
