import { useEffect, useState } from "react";
import { Zap, Droplets, Trash2, CheckCircle2, Clock, Loader2, AlertTriangle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/error-utils";
import { COMMUNE_COLORS } from "@/lib/communes";
import { useUserRole } from "@/hooks/useUserRole";

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
  verifications: number;
}

interface QuartierCount {
  key: string;
  count: number;
}

const MyReports = ({ profileComplete = false }: { profileComplete?: boolean }) => {
  const { user } = useAuth();
  const { isAdmin, isModerator } = useUserRole();
  const canSeeQuartierCounts = isAdmin || isModerator;
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveTarget, setResolveTarget] = useState<Report | null>(null);
  const [resolveTime, setResolveTime] = useState("");
  const [resolving, setResolving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [quartierCounts, setQuartierCounts] = useState<Record<string, number>>({});

  const fetchReports = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("reports")
      .select("id, service_type, description, commune, quartier, status, urgency, created_at, start_time, resolved_at, verifications")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setReports(data);
      // Only fetch quartier counts for admins/moderators
      if (canSeeQuartierCounts) {
      const activeReports = data.filter((r: Report) => r.status === "active" && r.quartier);
      const uniqueKeys = [...new Set(activeReports.map((r: Report) => `${r.commune}|${r.quartier}|${r.service_type}`))];
      if (uniqueKeys.length > 0) {
        const counts: Record<string, number> = {};
        await Promise.all(
          uniqueKeys.map(async (key) => {
            const [commune, quartier, serviceType] = (key as string).split("|");
            const { count } = await supabase
              .from("reports")
              .select("id", { count: "exact", head: true })
              .eq("commune", commune)
              .eq("quartier", quartier)
              .eq("service_type", serviceType)
              .eq("status", "active");
            counts[key as string] = count || 0;
          })
        );
        setQuartierCounts(counts);
      }
      } // end canSeeQuartierCounts
    }
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

  const handleDelete = async () => {
    if (!deleteTarget || !deleteReason.trim()) return;
    setDeleting(deleteTarget.id);
    try {
      // Enregistrer la raison de suppression
      const { error: logError } = await supabase.from("report_deletions").insert({
        report_id: deleteTarget.id,
        user_id: user!.id,
        reason: deleteReason.trim(),
        service_type: deleteTarget.service_type,
        commune: deleteTarget.commune,
        quartier: deleteTarget.quartier,
        description: deleteTarget.description,
      });
      if (logError) throw logError;

      // Supprimer le signalement
      const { error } = await supabase.from("reports").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      setReports((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast.success("Signalement supprimé");
      setDeleteTarget(null);
      setDeleteReason("");
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
                  {profileComplete && isActive && (
                    <Badge variant="outline" className="text-[10px] gap-1" style={{ borderColor: "hsl(45 93% 47%)", color: "hsl(45 93% 47%)" }}>
                      ✅ Profil vérifié
                    </Badge>
                  )}
                  {r.urgency === "critical" && (
                    <Badge className="bg-destructive text-destructive-foreground animate-pulse">
                      🔥 Critique
                    </Badge>
                  )}
                  {r.verifications >= 3 && r.urgency !== "critical" && (
                    <Badge variant="outline" className="border-amber-500 text-amber-500">
                      ⚡ {r.verifications} confirmations
                    </Badge>
                  )}
                  {canSeeQuartierCounts && isActive && r.quartier && (() => {
                    const key = `${r.commune}|${r.quartier}|${r.service_type}`;
                    const count = quartierCounts[key];
                    return count && count > 0 ? (
                      <Badge variant="outline" className="border-primary text-primary">
                        <Users className="mr-1 h-3 w-3" />
                        {count} signalement{count > 1 ? "s" : ""} à {r.quartier}
                      </Badge>
                    ) : null;
                  })()}
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
                  onClick={() => { setDeleteTarget(r); setDeleteReason(""); }}
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
      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteReason(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Supprimer ce signalement ?
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Le signalement sera définitivement supprimé.
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <div className="flex items-center gap-2 text-sm">
                <span>{deleteTarget.service_type === "electricity" ? "⚡" : "💧"}</span>
                <span className="font-medium">{deleteTarget.commune}</span>
                {deleteTarget.quartier && <span className="text-muted-foreground">· {deleteTarget.quartier}</span>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{deleteTarget.description}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="delete-reason">Pourquoi supprimez-vous ce signalement ?</Label>
            <Textarea
              id="delete-reason"
              placeholder="Ex : signalement en double, erreur de saisie, problème résolu autrement…"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className="min-h-[80px] resize-none"
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground text-right">{deleteReason.length}/300</p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { setDeleteTarget(null); setDeleteReason(""); }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={!deleteReason.trim() || !!deleting}
            >
              {deleting ? "Suppression..." : "Confirmer la suppression"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyReports;
