import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Shield, ShieldCheck, UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, { label: string; icon: typeof Shield }> = {
  admin: { label: "Administrateur", icon: ShieldCheck },
  moderator: { label: "Validateur", icon: Shield },
};

const AdminUsersPage = () => {
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "moderator">("moderator");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: rolesWithProfiles = [], isLoading } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch profiles for these users
      const userIds = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, first_name, last_name")
        .in("user_id", userIds);

      return roles.map((role) => {
        const profile = profiles?.find((p) => p.user_id === role.user_id);
        return { ...role, profile };
      });
    },
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: "admin" | "moderator" }) => {
      // Look up user by email via profiles — we need an edge function or RPC for this
      // For now, we'll use the user_id approach: admin enters user_id
      // Actually let's search by email in auth — not possible from client
      // Use a simpler approach: admin enters the user_id directly
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: email, role }); // email is actually user_id here
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast.success("Rôle attribué avec succès");
      setNewEmail("");
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de l'attribution"),
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast.success("Rôle retiré");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!isAdmin) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Seuls les administrateurs peuvent gérer les rôles.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Gestion des rôles</h1>
            <p className="mt-1 text-muted-foreground">Attribuez des rôles admin ou validateur.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Attribuer un rôle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>ID utilisateur (UUID)</Label>
                  <Input
                    placeholder="ex: 123e4567-e89b-..."
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value.trim())}
                  />
                  <p className="text-xs text-muted-foreground">
                    Copiez l'UUID depuis la section Utilisateurs de Supabase.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Rôle</Label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as "admin" | "moderator")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="moderator">Validateur (peut valider les signalements)</SelectItem>
                      <SelectItem value="admin">Administrateur (accès complet)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  onClick={() => addRoleMutation.mutate({ email: newEmail, role: newRole })}
                  disabled={!newEmail || addRoleMutation.isPending}
                >
                  Attribuer le rôle
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        <div className="space-y-3">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Chargement...</p>
          ) : rolesWithProfiles.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun rôle attribué.</p>
          ) : (
            rolesWithProfiles.map((item: any) => {
              const RoleIcon = ROLE_LABELS[item.role]?.icon || Shield;
              const displayName = item.profile
                ? `${item.profile.first_name} ${item.profile.last_name}`.trim() || item.profile.display_name || item.user_id
                : item.user_id;
              return (
                <Card key={item.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <RoleIcon className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{displayName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item.user_id.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.role === "admin" ? "default" : "secondary"}>
                        {ROLE_LABELS[item.role]?.label || item.role}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => removeRoleMutation.mutate(item.id)}
                        disabled={removeRoleMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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

export default AdminUsersPage;
