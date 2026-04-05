import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Shield, ShieldCheck, UserPlus, Trash2, Plus, Pencil, KeyRound, FlaskConical, Handshake } from "lucide-react";
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
import { getUserFriendlyError } from "@/lib/error-utils";
import { logAudit } from "@/lib/audit";

const ROLE_LABELS: Record<string, { label: string; icon: typeof Shield }> = {
  admin: { label: "Administrateur", icon: ShieldCheck },
  moderator: { label: "Validateur", icon: Shield },
  test: { label: "Compte test", icon: FlaskConical },
  partner: { label: "Partenaire", icon: Handshake },
};

const PARTNER_TYPE_LABELS: Record<string, string> = {
  cie: "CIE — Énergie",
  sodeci: "SODECI — Eau",
  mairie: "Mairie",
  ngo: "ONG / Association",
  other: "Autre partenaire",
};

const COMMUNES_PILOTES = [
  "Abobo", "Adjamé", "Bingerville", "Cocody", "Koumassi",
  "Marcory", "Plateau", "Port-Bouët", "Treichville", "Yopougon",
];

const AdminUsersPage = () => {
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "moderator" | "test" | "partner">("moderator");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Create user dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createRole, setCreateRole] = useState<"" | "admin" | "moderator" | "test" | "partner">("");
  const [createPartnerOrgName, setCreatePartnerOrgName] = useState("");
  const [createPartnerType, setCreatePartnerType] = useState<"cie" | "sodeci" | "mairie" | "ngo" | "other">("cie");
  const [createPartnerCommune, setCreatePartnerCommune] = useState("");

  // Edit name dialog state
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editUserId, setEditUserId] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");

  // Reset password dialog state
  const [resetPwOpen, setResetPwOpen] = useState(false);
  const [resetPwUserId, setResetPwUserId] = useState("");
  const [resetPwDisplayName, setResetPwDisplayName] = useState("");
  const [resetPwNew, setResetPwNew] = useState("");
  const [resetPwMode, setResetPwMode] = useState<"set" | "email">("set");

  // User search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setHasSearched(true);
    try {
      const isUuid  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q) || (!isUuid && q.includes("@"));

      let results: any[] = [];

      if (isEmail) {
        // Recherche par email via Edge Function (accès auth.users)
        const res = await supabase.functions.invoke("reset-password", {
          body: { action: "search_by_email", email: q },
        });
        if (res.error) throw new Error(res.error.message);
        const emailUsers: { user_id: string; email: string }[] = res.data?.users ?? [];

        // Enrichir avec les profils
        if (emailUsers.length > 0) {
          const ids = emailUsers.map((u) => u.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, first_name, last_name, display_name, commune")
            .in("user_id", ids);
          const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
          results = emailUsers.map((u) => ({ ...profileMap.get(u.user_id), user_id: u.user_id, email: u.email }));
        }
      } else if (isUuid) {
        const { data } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, display_name, phone, commune")
          .eq("user_id", q);
        results = data || [];
      } else {
        const { data } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, display_name, phone, commune")
          .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,display_name.ilike.%${q}%`)
          .limit(20);
        results = data || [];
      }
      setSearchResults(results);
    } catch {
      toast.error("Erreur lors de la recherche");
    } finally {
      setSearching(false);
    }
  };

  const { data: rolesWithProfiles = [], isLoading } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = roles.map((r) => r.user_id);
      const [{ data: profiles }, { data: partnerProfiles }] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, first_name, last_name").in("user_id", userIds),
        supabase.from("partner_profiles").select("user_id, organization_name, partner_type, commune").in("user_id", userIds),
      ]);

      return roles.map((role) => {
        const profile = profiles?.find((p) => p.user_id === role.user_id);
        const partnerProfile = partnerProfiles?.find((p) => p.user_id === role.user_id);
        return { ...role, profile, partnerProfile };
      });
    },
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: "admin" | "moderator" | "test" | "partner" }) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: email, role });
      if (error) throw error;
    },
    onSuccess: (_, { email, role }) => {
      logAudit({ action: "role_added", target_type: "user", target_id: email, details: { role } });
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast.success("Rôle attribué avec succès");
      setNewEmail("");
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(getUserFriendlyError(err, "Erreur lors de l'attribution")),
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: (_, roleId) => {
      logAudit({ action: "role_removed", target_type: "user", target_id: roleId });
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast.success("Rôle retiré");
    },
    onError: (err: any) => toast.error(getUserFriendlyError(err)),
  });

  const updateNameMutation = useMutation({
    mutationFn: async ({ userId, firstName, lastName }: { userId: string; firstName: string; lastName: string }) => {
      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { error } = await supabase
        .from("profiles")
        .update({ first_name: firstName.trim(), last_name: lastName.trim(), display_name: displayName })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_, { userId }) => {
      logAudit({ action: "profile_updated", target_type: "user", target_id: userId, details: { field: "display_name" } });
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast.success("Nom mis à jour avec succès");
      setEditNameOpen(false);
    },
    onError: (err: any) => toast.error(getUserFriendlyError(err, "Erreur lors de la mise à jour")),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword, mode }: { userId: string; newPassword: string; mode: "set" | "email" }) => {
      const body = mode === "email"
        ? { action: "send_reset_email", user_id: userId }
        : { action: "reset_password",  user_id: userId, new_password: newPassword };

      const res = await supabase.functions.invoke("reset-password", { body });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      return { ...res.data, mode };
    },
    onSuccess: (data, { userId }) => {
      logAudit({ action: "password_reset", target_type: "user", target_id: userId, details: { mode: data.mode } });
      if (data.mode === "email") {
        toast.success(`Email de réinitialisation envoyé à ${data.email}`);
      } else {
        toast.success("Mot de passe réinitialisé avec succès");
      }
      setResetPwOpen(false);
      setResetPwNew("");
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de la réinitialisation"),
  });

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const res = await supabase.functions.invoke("create-user", {
        body: {
          email: createEmail,
          password: createPassword,
          first_name: createFirstName,
          last_name: createLastName,
          role: createRole || undefined,
        },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      if (createRole === "partner") {
        const { error: partnerError } = await supabase.from("partner_profiles").insert({
          user_id: res.data.user_id,
          organization_name: createPartnerOrgName.trim(),
          partner_type: createPartnerType,
          commune: createPartnerType === "mairie" ? createPartnerCommune : null,
        });
        if (partnerError) throw new Error("Compte créé mais profil partenaire non enregistré : " + partnerError.message);
      }

      return res.data;
    },
    onSuccess: (data) => {
      logAudit({ action: "role_added", target_type: "user", target_id: data.user_id, details: { created: true, role: createRole || "user" } });
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast.success("Utilisateur créé avec succès");
      setCreateOpen(false);
      setCreateEmail("");
      setCreatePassword("");
      setCreateFirstName("");
      setCreateLastName("");
      setCreateRole("");
      setCreatePartnerOrgName("");
      setCreatePartnerType("cie");
      setCreatePartnerCommune("");
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de la création"),
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Gestion des rôles</h1>
          <p className="mt-1 text-muted-foreground">Attribuez des rôles admin ou validateur.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Create user dialog */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Créer un utilisateur
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un utilisateur</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Prénom</Label>
                    <Input value={createFirstName} onChange={(e) => setCreateFirstName(e.target.value)} placeholder="Jean" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input value={createLastName} onChange={(e) => setCreateLastName(e.target.value)} placeholder="Dupont" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} placeholder="email@exemple.com" />
                </div>
                <div className="space-y-2">
                  <Label>Mot de passe *</Label>
                  <Input type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} placeholder="Min. 6 caractères" />
                </div>
                <div className="space-y-2">
                  <Label>Rôle (optionnel)</Label>
                  <Select value={createRole} onValueChange={(v) => setCreateRole(v as "" | "admin" | "moderator" | "test" | "partner")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Utilisateur standard" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Utilisateur standard</SelectItem>
                      <SelectItem value="moderator">Validateur</SelectItem>
                      <SelectItem value="admin">Administrateur</SelectItem>
                      <SelectItem value="test">Compte test (bypass profil)</SelectItem>
                      <SelectItem value="partner">Partenaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {createRole === "partner" && (
                  <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Profil partenaire</p>
                    <div className="space-y-2">
                      <Label>Nom de l'organisation *</Label>
                      <Input
                        value={createPartnerOrgName}
                        onChange={(e) => setCreatePartnerOrgName(e.target.value)}
                        placeholder="ex: CIE — Direction Abobo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type de partenaire *</Label>
                      <Select value={createPartnerType} onValueChange={(v) => setCreatePartnerType(v as typeof createPartnerType)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(PARTNER_TYPE_LABELS).map(([val, lbl]) => (
                            <SelectItem key={val} value={val}>{lbl}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {createPartnerType === "mairie" && (
                      <div className="space-y-2">
                        <Label>Commune *</Label>
                        <Select value={createPartnerCommune} onValueChange={setCreatePartnerCommune}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner une commune" /></SelectTrigger>
                          <SelectContent>
                            {COMMUNES_PILOTES.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={() => createUserMutation.mutate()}
                  disabled={
                    !createEmail || !createPassword || createPassword.length < 6 || createUserMutation.isPending ||
                    (createRole === "partner" && (!createPartnerOrgName.trim() || (createPartnerType === "mairie" && !createPartnerCommune)))
                  }
                >
                  {createUserMutation.isPending ? "Création..." : "Créer l'utilisateur"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit name dialog */}
          <Dialog open={editNameOpen} onOpenChange={setEditNameOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modifier le nom d'affichage</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Prénom</Label>
                    <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} placeholder="Prénom" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} placeholder="Nom" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ce nom apparaîtra dans le titre du Tableau de Bord des Signalements des modérateurs :
                  <br /><strong>« Tableau de Bord des Signalements — vue {editFirstName || "Prénom"} {editLastName || "Nom"} »</strong>
                </p>
                <Button
                  className="w-full"
                  onClick={() => updateNameMutation.mutate({ userId: editUserId, firstName: editFirstName, lastName: editLastName })}
                  disabled={(!editFirstName && !editLastName) || updateNameMutation.isPending}
                >
                  {updateNameMutation.isPending ? "Enregistrement..." : "Enregistrer le nom"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Reset password dialog */}
          <Dialog open={resetPwOpen} onOpenChange={(o) => { setResetPwOpen(o); if (!o) setResetPwNew(""); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Utilisateur : <strong>{resetPwDisplayName}</strong>{" "}
                  <span className="font-mono text-xs text-muted-foreground/70">({resetPwUserId.slice(0, 8)}…)</span>
                </p>

                {/* Choix du mode */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResetPwMode("email")}
                    className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                      resetPwMode === "email"
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <div className="font-semibold mb-0.5">📧 Envoyer un email</div>
                    <div className="text-xs opacity-70">L'utilisateur reçoit un lien de réinitialisation</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetPwMode("set")}
                    className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                      resetPwMode === "set"
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <div className="font-semibold mb-0.5">🔑 Définir directement</div>
                    <div className="text-xs opacity-70">Choisir le nouveau mot de passe maintenant</div>
                  </button>
                </div>

                {/* Champ mot de passe — uniquement en mode "set" */}
                {resetPwMode === "set" && (
                  <div className="space-y-2">
                    <Label>Nouveau mot de passe</Label>
                    <Input
                      type="password"
                      value={resetPwNew}
                      onChange={(e) => setResetPwNew(e.target.value)}
                      placeholder="Min. 6 caractères"
                      autoFocus
                    />
                  </div>
                )}

                {resetPwMode === "email" && (
                  <p className="text-xs text-muted-foreground rounded-lg border border-border bg-muted/40 px-3 py-2">
                    Un email avec un lien de réinitialisation sera envoyé à l'adresse associée à ce compte.
                  </p>
                )}

                <Button
                  className="w-full"
                  onClick={() =>
                    resetPasswordMutation.mutate({
                      userId: resetPwUserId,
                      newPassword: resetPwNew,
                      mode: resetPwMode,
                    })
                  }
                  disabled={
                    resetPasswordMutation.isPending ||
                    (resetPwMode === "set" && (!resetPwNew || resetPwNew.length < 6))
                  }
                >
                  {resetPasswordMutation.isPending
                    ? "En cours…"
                    : resetPwMode === "email"
                    ? "Envoyer l'email de réinitialisation"
                    : "Définir le nouveau mot de passe"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add role dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Ajouter un rôle
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
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as "admin" | "moderator" | "test" | "partner")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="moderator">Validateur (peut valider les signalements)</SelectItem>
                      <SelectItem value="admin">Administrateur (accès complet)</SelectItem>
                      <SelectItem value="test">Compte test (bypass contrainte profil)</SelectItem>
                      <SelectItem value="partner">Partenaire (accès données filtrées)</SelectItem>
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
        </div>
      </motion.div>

      {/* User search for password reset */}
      <Card className="mb-6">
        <CardContent className="p-4 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Rechercher un utilisateur</h2>
          <p className="text-sm text-muted-foreground">Recherchez par email, nom ou UUID.</p>
          <div className="flex gap-2">
            <Input
              placeholder="email@exemple.com, nom ou UUID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
              {searching ? "Recherche..." : "Rechercher"}
            </Button>
          </div>
          {hasSearched && (
            <div className="space-y-2">
              {searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">Aucun utilisateur trouvé.</p>
              ) : (
                searchResults.map((u) => {
                  const name = `${u.first_name} ${u.last_name}`.trim() || u.display_name || "Sans nom";
                  return (
                    <div key={u.user_id} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <p className="text-sm font-medium">{name}</p>
                        {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                        <p className="text-xs text-muted-foreground font-mono">{u.user_id}</p>
                        {u.commune && <p className="text-xs text-muted-foreground">{u.commune}</p>}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setResetPwUserId(u.user_id);
                          setResetPwDisplayName(name);
                          setResetPwNew("");
                          setResetPwOpen(true);
                        }}
                      >
                        <KeyRound className="mr-2 h-4 w-4" />
                        Réinitialiser
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
                      {item.partnerProfile && (
                        <p className="text-xs text-muted-foreground">
                          {item.partnerProfile.organization_name} · {PARTNER_TYPE_LABELS[item.partnerProfile.partner_type] || item.partnerProfile.partner_type}
                          {item.partnerProfile.commune ? ` · ${item.partnerProfile.commune}` : ""}
                        </p>
                      )}
                      {!item.partnerProfile && (
                        <p className="text-xs text-muted-foreground font-mono">{item.user_id.slice(0, 8)}...</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.role === "admin" ? "default" : item.role === "partner" ? "secondary" : item.role === "test" ? "outline" : "secondary"}
                      className={item.role === "partner" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" : undefined}>
                      {ROLE_LABELS[item.role]?.label || item.role}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Modifier le nom d'affichage"
                      onClick={() => {
                        setEditUserId(item.user_id);
                        setEditFirstName(item.profile?.first_name || "");
                        setEditLastName(item.profile?.last_name || "");
                        setEditNameOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Réinitialiser le mot de passe"
                      onClick={() => {
                        setResetPwUserId(item.user_id);
                        setResetPwDisplayName(displayName);
                        setResetPwNew("");
                        setResetPwOpen(true);
                      }}
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
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
