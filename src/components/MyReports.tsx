import { useEffect, useState } from "react";
import { Zap, Droplets, Trash2, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/error-utils";
import { COMMUNE_COLORS } from "@/lib/communes";

interface Report {
  id: string;
  service_type: string;
  description: string;
  commune: string;
  quartier: string;
  status: string;
  urgency: string;
  created_at: string;
  start_time: string;
  resolved_at: string | null;
}

const MyReports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveTarget, setResolveTarget] = useState<Report | null>(null);
  const [resolveTime, setResolveTime] = useState("");
  const [resolving, setResolving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchReports = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("reports")
      .select("id, service_type, description, commune, quartier, status, urgency, created_at, start_time, resolved_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setReports(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, [user]);

  const openResolve = (r: Report) => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    setResolveTime(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`);
    setResolveTarget(r);
  };

  const handleResolve = async () => {
    if (!resolveTarget || !resolveTime) return;
    setResolving(true);
    try {
      const { error } = await supabase.rpc("resolve_report", {
        p_report_id: resolveTarget.id,
        p_resolved_at: new Date(resolveTime).toISOString(),
      });
      if (error) throw error;
      toast.success("✅ Signalement résolu !");
      setResolveTarget(null);
      fetchReports();
    } catch (err: any) {
      toast.error(getUserFriendlyError(err));
    } finally {
      setResolving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase.from("reports").delete().eq("id", id);
      if (error) throw error;
      setReports((prev) => prev.filter((r) => r.id !== id));
      toast.success("Signalement supprimé");
    } catch (err: any) {
      toast.error(getUserFriendlyError(err));
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        Vous n'avez pas encore de signalements.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((r) => {
        const color = COMMUNE_COLORS[r.commune] || "#888";
        const isActive = r.status === "active";
        const emoji = r.service_type === "electricity" ? "⚡" : "💧";

        return (
          <div
            key={r.id}
            className="rounded-xl border border-border bg-card p-4 shadow-card"
            style={{ borderLeftColor: color, borderLeftWidth: 4 }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{emoji}</span>
                  <span className="font-bold text-sm text-foreground">{r.commune}</span>
                  {r.quartier && (
                    <span className="text-xs text-muted-foreground">· {r.quartier}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant={isActive ? "default" : "outline"} className={isActive ? "" : "border-success text-success"}>
                    {isActive ? "Actif" : "Résolu"}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(r.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 shrink-0">
                {isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs border-success text-success hover:bg-success hover:text-white"
                    onClick={() => openResolve(r)}
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Résolu
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-destructive hover:text-destructive"
                  onClick={() => handleDelete(r.id)}
                  disabled={deleting === r.id}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  {deleting === r.id ? "..." : "Supprimer"}
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Resolve dialog */}
      <Dialog open={!!resolveTarget} onOpenChange={(open) => !open && setResolveTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {resolveTarget?.service_type === "electricity" ? "⚡ Électricité" : "💧 Eau"} rétablie ?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-success/10 p-3 text-center">
              <p className="text-sm font-medium text-success">
                Le service est de retour à {resolveTarget?.commune} !
              </p>
            </div>
            <div className="space-y-2">
              <Label>Heure de rétablissement</Label>
              <Input
                type="datetime-local"
                value={resolveTime}
                onChange={(e) => setResolveTime(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleResolve}
              disabled={resolving || !resolveTime}
            >
              {resolving ? "Envoi..." : "✅ Confirmer le rétablissement"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyReports;
