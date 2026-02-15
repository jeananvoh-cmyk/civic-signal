import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trash2, Zap, Droplets, Clock, Download, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNE_COLORS } from "@/lib/communes";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";

interface Deletion {
  id: string;
  report_id: string;
  user_id: string;
  reason: string;
  service_type: string;
  commune: string;
  quartier: string;
  description: string;
  created_at: string;
}

const AdminDeletionsPage = () => {
  const [search, setSearch] = useState("");

  const { data: deletions = [], isLoading } = useQuery({
    queryKey: ["admin-deletions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_deletions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      // Fetch profiles for user names
      const userIds = [...new Set(data.map((d: any) => d.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, first_name, last_name")
        .in("user_id", userIds);

      return data.map((d: any) => {
        const profile = profiles?.find((p) => p.user_id === d.user_id);
        return {
          ...d,
          user_name: profile
            ? `${profile.first_name} ${profile.last_name}`.trim() || profile.display_name || d.user_id.slice(0, 8)
            : d.user_id.slice(0, 8),
        };
      });
    },
  });

  const filtered = search
    ? deletions.filter(
        (d: any) =>
          d.commune?.toLowerCase().includes(search.toLowerCase()) ||
          d.reason?.toLowerCase().includes(search.toLowerCase()) ||
          d.user_name?.toLowerCase().includes(search.toLowerCase()) ||
          d.quartier?.toLowerCase().includes(search.toLowerCase())
      )
    : deletions;

  // Reason stats
  const reasonKeywords = ["double", "erreur", "résolu", "test", "faux"];
  const reasonStats = reasonKeywords.map((kw) => ({
    keyword: kw,
    count: deletions.filter((d: any) => d.reason?.toLowerCase().includes(kw)).length,
  })).filter((r) => r.count > 0).sort((a, b) => b.count - a.count);

  const exportCSV = () => {
    const headers = ["Date", "Commune", "Quartier", "Service", "Raison", "Description", "Utilisateur"];
    const rows = deletions.map((d: any) => [
      format(new Date(d.created_at), "yyyy-MM-dd HH:mm"),
      d.commune,
      d.quartier,
      d.service_type === "electricity" ? "Électricité" : "Eau",
      `"${d.reason.replace(/"/g, '""')}"`,
      `"${d.description.replace(/"/g, '""')}"`,
      d.user_name,
    ]);

    const csv = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suppressions_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Historique des suppressions</h1>
          <p className="mt-1 text-muted-foreground">
            {deletions.length} suppression{deletions.length !== 1 ? "s" : ""} enregistrée{deletions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={deletions.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </motion.div>

      {/* Reason insights */}
      {reasonStats.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">Motifs fréquents :</span>
          {reasonStats.map((r) => (
            <Badge key={r.keyword} variant="secondary" className="text-xs">
              {r.keyword} ({r.count})
            </Badge>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par commune, raison, utilisateur..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Deletions list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">Aucune suppression trouvée.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((d: any, i: number) => {
            const color = COMMUNE_COLORS[d.commune] || "#888";
            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {d.service_type === "electricity" ? (
                            <Zap className="h-3.5 w-3.5 text-amber-500" />
                          ) : (
                            <Droplets className="h-3.5 w-3.5 text-blue-500" />
                          )}
                          <span className="text-sm font-bold" style={{ color }}>
                            {d.commune}
                          </span>
                          {d.quartier && (
                            <span className="text-xs text-muted-foreground">· {d.quartier}</span>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(d.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                          </span>
                        </div>

                        {/* Reason */}
                        <div className="rounded-lg bg-destructive/5 border border-destructive/10 p-2.5 mb-2">
                          <p className="text-sm text-foreground font-medium">
                            💬 {d.reason}
                          </p>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-1">
                          Description originale : {d.description}
                        </p>

                        <p className="text-xs text-muted-foreground mt-1">
                          Par : {d.user_name}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminDeletionsPage;
