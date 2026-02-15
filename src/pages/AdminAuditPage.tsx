import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Clock, Shield, FileText, User, Trash2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  report_validated: { label: "Validation", color: "text-green-600" },
  report_rejected: { label: "Rejet", color: "text-destructive" },
  report_purge_user: { label: "Purge utilisateur", color: "text-destructive" },
  report_purge_commune: { label: "Purge commune", color: "text-destructive" },
  report_purge_all: { label: "Purge totale", color: "text-destructive" },
  role_added: { label: "Rôle ajouté", color: "text-primary" },
  role_removed: { label: "Rôle retiré", color: "text-orange-500" },
};

const AdminAuditPage = () => {
  const [filterAction, setFilterAction] = useState<string>("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-audit-logs", filterAction],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (filterAction !== "all") {
        query = query.eq("action", filterAction);
      }

      const { data, error } = await query as any;
      if (error) throw error;

      // Fetch admin profiles
      const adminIds = [...new Set((data as any[]).map((l: any) => l.admin_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, first_name, last_name")
        .in("user_id", adminIds);

      return (data as any[]).map((log: any) => ({
        ...log,
        admin_profile: profiles?.find((p) => p.user_id === log.admin_id),
      }));
    },
  });

  const exportCsv = () => {
    const headers = ["Date", "Admin", "Action", "Cible", "Détails"];
    const rows = logs.map((l: any) => [
      format(new Date(l.created_at), "dd/MM/yyyy HH:mm"),
      l.admin_profile ? `${l.admin_profile.first_name} ${l.admin_profile.last_name}`.trim() || l.admin_profile.display_name : l.admin_id?.slice(0, 8),
      ACTION_LABELS[l.action]?.label || l.action,
      l.target_id || "—",
      JSON.stringify(l.details || {}),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c: string) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const getActionIcon = (action: string) => {
    if (action.startsWith("report_purge")) return <Trash2 className="h-4 w-4 text-destructive" />;
    if (action.startsWith("role_")) return <Shield className="h-4 w-4 text-primary" />;
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Journal d'activité</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Historique de toutes les actions administratives.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les actions</SelectItem>
              <SelectItem value="report_validated">Validations</SelectItem>
              <SelectItem value="report_rejected">Rejets</SelectItem>
              <SelectItem value="report_purge_user">Purge utilisateur</SelectItem>
              <SelectItem value="report_purge_commune">Purge commune</SelectItem>
              <SelectItem value="report_purge_all">Purge totale</SelectItem>
              <SelectItem value="role_added">Rôle ajouté</SelectItem>
              <SelectItem value="role_removed">Rôle retiré</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={logs.length === 0}>
            <Download className="mr-1.5 h-4 w-4" />
            CSV
          </Button>
        </div>
      </motion.div>

      <div className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune activité enregistrée.</p>
        ) : (
          logs.map((log: any) => {
            const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: "text-muted-foreground" };
            const adminName = log.admin_profile
              ? `${log.admin_profile.first_name} ${log.admin_profile.last_name}`.trim() || log.admin_profile.display_name
              : log.admin_id?.slice(0, 8) + "...";
            const details = log.details as Record<string, any> || {};

            return (
              <Card key={log.id}>
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="mt-0.5 shrink-0">{getActionIcon(log.action)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={actionInfo.color}>
                        {actionInfo.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" /> {adminName}
                      </span>
                    </div>
                    {Object.keys(details).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {details.commune && `${details.commune}`}
                        {details.quartier && `, ${details.quartier}`}
                        {details.role && `Rôle: ${details.role}`}
                        {details.reason && ` — ${details.reason}`}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(log.created_at), "dd MMM HH:mm", { locale: fr })}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminAuditPage;
