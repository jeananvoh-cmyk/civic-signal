import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trash2, Search, AlertTriangle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { logAudit } from "@/lib/audit";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminPurgePage = () => {
  const queryClient = useQueryClient();
  const [searchUserId, setSearchUserId] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "user" | "commune" | "all";
    label: string;
    filter?: string;
  } | null>(null);

  // Get all reports grouped by user
  const { data: userReports = [], isLoading } = useQuery({
    queryKey: ["admin-purge-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("user_id, commune, id")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Group by user_id
      const grouped: Record<string, { count: number; communes: string[] }> = {};
      data.forEach((r: any) => {
        if (!grouped[r.user_id]) grouped[r.user_id] = { count: 0, communes: [] };
        grouped[r.user_id].count++;
        if (!grouped[r.user_id].communes.includes(r.commune)) {
          grouped[r.user_id].communes.push(r.commune);
        }
      });

      // Get profiles for these users
      const userIds = Object.keys(grouped);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, first_name, last_name")
        .in("user_id", userIds);

      return userIds.map((uid) => ({
        user_id: uid,
        ...grouped[uid],
        profile: profiles?.find((p) => p.user_id === uid),
      }));
    },
  });

  // Get commune summary
  const { data: communeStats = [] } = useQuery({
    queryKey: ["admin-purge-communes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("commune, id");
      if (error) throw error;

      const grouped: Record<string, number> = {};
      data.forEach((r: any) => {
        grouped[r.commune] = (grouped[r.commune] || 0) + 1;
      });

      return Object.entries(grouped)
        .map(([commune, count]) => ({ commune, count }))
        .sort((a, b) => b.count - a.count);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (filter: { type: "user" | "commune" | "all"; value?: string }) => {
      let query = supabase.from("reports").delete();
      if (filter.type === "user") {
        query = query.eq("user_id", filter.value!);
      } else if (filter.type === "commune") {
        query = query.eq("commune", filter.value!);
      } else {
        // Delete all — need to match something, use gte on created_at
        query = query.gte("created_at", "2000-01-01");
      }
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: (_, filter) => {
      const actionMap = { user: "report_purge_user", commune: "report_purge_commune", all: "report_purge_all" } as const;
      logAudit({
        action: actionMap[filter.type],
        target_type: filter.type === "user" ? "user" : filter.type === "commune" ? "commune" : "system",
        target_id: filter.value,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-purge"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      toast.success("Signalements supprimés avec succès");
      setConfirmDialog(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleConfirmDelete = () => {
    if (!confirmDialog) return;
    deleteMutation.mutate({
      type: confirmDialog.type,
      value: confirmDialog.filter,
    });
  };

  const filteredUsers = searchUserId
    ? userReports.filter(
        (u) =>
          u.user_id.includes(searchUserId) ||
          u.profile?.display_name?.toLowerCase().includes(searchUserId.toLowerCase()) ||
          u.profile?.first_name?.toLowerCase().includes(searchUserId.toLowerCase()) ||
          u.profile?.last_name?.toLowerCase().includes(searchUserId.toLowerCase())
      )
    : userReports;

  const totalReports = userReports.reduce((sum, u) => sum + u.count, 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Purge des données</h1>
        <p className="mt-1 text-muted-foreground">
          Supprimez les signalements par utilisateur, commune ou en totalité.
        </p>
      </motion.div>

      {/* Global actions */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-foreground">{totalReports}</p>
            <p className="text-sm text-muted-foreground">Total signalements</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-foreground">{userReports.length}</p>
            <p className="text-sm text-muted-foreground">Utilisateurs actifs</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDialog({ type: "all", label: "TOUS les signalements" })}
              disabled={totalReports === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Tout supprimer
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* By commune */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Par commune</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {communeStats.map((c) => (
            <div key={c.commune} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{c.commune || "(vide)"}</span>
                <Badge variant="secondary">{c.count}</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() =>
                  setConfirmDialog({
                    type: "commune",
                    label: `signalements de ${c.commune}`,
                    filter: c.commune,
                  })
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {communeStats.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun signalement.</p>
          )}
        </CardContent>
      </Card>

      {/* By user */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Par utilisateur</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou ID..."
              className="pl-10"
              value={searchUserId}
              onChange={(e) => setSearchUserId(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun résultat.</p>
          ) : (
            filteredUsers.map((u) => {
              const name = u.profile
                ? `${u.profile.first_name} ${u.profile.last_name}`.trim() || u.profile.display_name
                : null;
              return (
                <div
                  key={u.user_id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {name || "Utilisateur"}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {u.user_id.slice(0, 12)}...
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary">{u.count} signalement{u.count > 1 ? "s" : ""}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        setConfirmDialog({
                          type: "user",
                          label: `signalements de ${name || u.user_id.slice(0, 8)}`,
                          filter: u.user_id,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmer la suppression
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Vous êtes sur le point de supprimer <strong>{confirmDialog?.label}</strong>. Cette action est irréversible.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPurgePage;
