import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, MapPin, Clock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const AdminQuartiersPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const { data: quartiers, isLoading } = useQuery({
    queryKey: ["admin-quartiers", filter],
    queryFn: async () => {
      let query = supabase
        .from("quartiers")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter === "pending") {
        query = query.eq("validated", false).eq("source", "user");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const validateMutation = useMutation({
    mutationFn: async ({ id, validated }: { id: string; validated: boolean }) => {
      const { error } = await supabase
        .from("quartiers")
        .update({ validated })
        .eq("id", id);
      if (error) throw error;

      const quartier = quartiers?.find((q) => q.id === id);
      await logAudit(
        validated ? "quartier_validated" : "quartier_rejected",
        "quartier",
        id,
        { commune: quartier?.commune, nom: quartier?.nom }
      );
    },
    onSuccess: (_, { validated }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-quartiers"] });
      queryClient.invalidateQueries({ queryKey: ["quartiers"] });
      toast({
        title: validated ? "Quartier validé" : "Quartier rejeté",
        description: validated
          ? "Le quartier est maintenant visible par tous."
          : "Le quartier a été rejeté.",
      });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Action impossible.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const quartier = quartiers?.find((q) => q.id === id);
      const { error } = await supabase.from("quartiers").delete().eq("id", id);
      if (error) throw error;
      await logAudit("quartier_deleted", "quartier", id, {
        commune: quartier?.commune,
        nom: quartier?.nom,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-quartiers"] });
      toast({ title: "Quartier supprimé" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Suppression impossible.", variant: "destructive" });
    },
  });

  const pendingCount = quartiers?.filter((q) => !q.validated && q.source === "user").length ?? 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            Gestion des quartiers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Validez ou rejetez les quartiers soumis par les utilisateurs
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            {pendingCount} en attente
          </Badge>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("pending")}
        >
          <Clock className="h-4 w-4 mr-1" />
          En attente
        </Button>
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          Tous
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {filter === "pending" ? "Quartiers en attente de validation" : "Tous les quartiers"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : !quartiers?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Aucun quartier {filter === "pending" ? "en attente" : ""}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quartier</TableHead>
                  <TableHead>Commune</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quartiers.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">{q.nom}</TableCell>
                    <TableCell>{q.commune}</TableCell>
                    <TableCell>
                      <Badge variant={q.source === "user" ? "secondary" : "outline"} className="text-xs">
                        {q.source === "user" ? (
                          <><User className="h-3 w-3 mr-1" />Utilisateur</>
                        ) : (
                          "Officiel"
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={q.validated ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {q.validated ? "Validé" : "En attente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {format(new Date(q.created_at), "dd MMM yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {!q.validated && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => validateMutation.mutate({ id: q.id, validated: true })}
                          disabled={validateMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      {q.validated && q.source === "user" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          onClick={() => validateMutation.mutate({ id: q.id, validated: false })}
                          disabled={validateMutation.isPending}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {q.source === "user" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm(`Supprimer le quartier "${q.nom}" ?`)) {
                              deleteMutation.mutate(q.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminQuartiersPage;
