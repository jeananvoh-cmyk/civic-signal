import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Baby, Heart, Users, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CommuneVulnStat {
  commune: string;
  couleur: string;
  population: number;
  total_signalements: number;
  total_actifs: number;
  total_impacted: number;
  total_babies: number;
  total_pregnant: number;
  total_elderly: number;
}

interface QuartierVulnStat {
  quartier: string;
  total_actifs: number;
  total_impacted: number;
  total_babies: number;
  total_pregnant: number;
  total_elderly: number;
}

const AdminVulnerablePage = () => {
  const [expandedCommune, setExpandedCommune] = useState<string | null>(null);

  const { data: stats = [], isLoading } = useQuery({
    queryKey: ["admin-vulnerable-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_commune_vulnerable_stats");
      if (error) throw error;
      return data as unknown as CommuneVulnStat[];
    },
  });

  const { data: quartierStats = [] } = useQuery({
    queryKey: ["admin-quartier-vulnerable", expandedCommune],
    queryFn: async () => {
      if (!expandedCommune) return [];
      const { data, error } = await supabase.rpc("get_quartier_vulnerable_stats", { p_commune: expandedCommune });
      if (error) throw error;
      return data as unknown as QuartierVulnStat[];
    },
    enabled: !!expandedCommune,
  });

  const totalVulnerable = stats.reduce((s, c) => s + c.total_babies + c.total_pregnant + c.total_elderly, 0);
  const totalBabies = stats.reduce((s, c) => s + c.total_babies, 0);
  const totalPregnant = stats.reduce((s, c) => s + c.total_pregnant, 0);
  const totalElderly = stats.reduce((s, c) => s + c.total_elderly, 0);
  const totalImpacted = stats.reduce((s, c) => s + c.total_impacted, 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Personnes vulnérables</h1>
        <p className="mt-1 text-muted-foreground">Vue d'ensemble des populations vulnérables dans les signalements actifs.</p>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Global summary */}
          <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-card border border-border p-5 text-center shadow-card">
              <Users className="mx-auto h-5 w-5 text-primary mb-1" />
              <p className="font-display text-3xl font-extrabold text-foreground">{totalImpacted}</p>
              <p className="text-xs text-muted-foreground">Personnes impactées</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-5 text-center shadow-card">
              <Baby className="mx-auto h-5 w-5 text-pink-500 mb-1" />
              <p className="font-display text-3xl font-extrabold text-pink-500">{totalBabies}</p>
              <p className="text-xs text-muted-foreground">Bébés / Nourrissons</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-5 text-center shadow-card">
              <Heart className="mx-auto h-5 w-5 text-rose-500 mb-1" />
              <p className="font-display text-3xl font-extrabold text-rose-500">{totalPregnant}</p>
              <p className="text-xs text-muted-foreground">Femmes enceintes</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-5 text-center shadow-card">
              <Users className="mx-auto h-5 w-5 text-amber-600 mb-1" />
              <p className="font-display text-3xl font-extrabold text-amber-600">{totalElderly}</p>
              <p className="text-xs text-muted-foreground">Personnes âgées</p>
            </div>
          </div>

          {/* Per commune */}
          <h2 className="font-display text-lg font-bold text-foreground mb-3">Par commune</h2>
          <div className="space-y-3">
            {stats.map((c, i) => {
              const communeVuln = c.total_babies + c.total_pregnant + c.total_elderly;
              const isExpanded = expandedCommune === c.commune;
              return (
                <motion.div
                  key={c.commune}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <button
                    onClick={() => setExpandedCommune(isExpanded ? null : c.commune)}
                    className="w-full rounded-xl border border-border bg-card p-4 shadow-card text-left hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: c.couleur }} />
                        <span className="font-bold text-foreground">{c.commune}</span>
                        {communeVuln > 0 && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                            {communeVuln} vulnérable{communeVuln > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{c.total_actifs} actif{c.total_actifs !== 1 ? "s" : ""}</span>
                      <span>{c.total_impacted} impacté{c.total_impacted !== 1 ? "s" : ""}</span>
                      <span className="text-pink-500">🍼 {c.total_babies}</span>
                      <span className="text-rose-500">🤰 {c.total_pregnant}</span>
                      <span className="text-amber-600">👴 {c.total_elderly}</span>
                    </div>
                  </button>

                  {/* Quartier details */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-1 ml-4 space-y-2"
                    >
                      {quartierStats.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-3 pl-2">Aucun quartier avec des signalements.</p>
                      ) : (
                        quartierStats.map((q) => {
                          const qVuln = q.total_babies + q.total_pregnant + q.total_elderly;
                          return (
                            <div
                              key={q.quartier}
                              className="rounded-lg border border-border bg-muted/30 p-3 flex items-center justify-between"
                            >
                              <div>
                                <span className="font-semibold text-sm text-foreground">{q.quartier}</span>
                                <p className="text-xs text-muted-foreground">
                                  {q.total_actifs} actif{q.total_actifs !== 1 ? "s" : ""} · {q.total_impacted} impacté{q.total_impacted !== 1 ? "s" : ""}
                                </p>
                              </div>
                              <div className="flex gap-3 text-xs">
                                {q.total_babies > 0 && <span className="text-pink-500">🍼 {q.total_babies}</span>}
                                {q.total_pregnant > 0 && <span className="text-rose-500">🤰 {q.total_pregnant}</span>}
                                {q.total_elderly > 0 && <span className="text-amber-600">👴 {q.total_elderly}</span>}
                                {qVuln === 0 && <span className="text-muted-foreground">—</span>}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminVulnerablePage;
