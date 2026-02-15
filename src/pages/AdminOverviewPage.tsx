import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FileText, Users, AlertTriangle, CheckCircle2, Clock, TrendingUp,
  Zap, Droplets, Shield, Trash2, BarChart3, ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const AdminOverviewPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

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
              Vue d'ensemble de l'application SignalÉnergie
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
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-foreground">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">En attente de validation</p>
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

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-foreground">{deletionsCount}</p>
              <p className="text-xs text-muted-foreground">Suppressions utilisateurs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Valider signalements", path: "/admin/signalements", icon: FileText, count: pendingCount, color: "text-primary" },
          { label: "Gérer les rôles", path: "/admin/utilisateurs", icon: Users, color: "text-primary" },
          { label: "Historique suppressions", path: "/admin/suppressions", icon: Trash2, count: deletionsCount, color: "text-destructive" },
          { label: "Statistiques", path: "/admin/stats", icon: BarChart3, color: "text-primary" },
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
