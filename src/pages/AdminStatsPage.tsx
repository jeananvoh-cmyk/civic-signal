import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNE_COLORS } from "@/lib/communes";

interface CommuneStat {
  commune: string;
  couleur: string;
  actifs: number;
  resolus: number;
  total: number;
  population: number;
}

const AdminStatsPage = () => {
  const { data: stats = [], isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_commune_stats");
      if (error) throw error;
      return data as unknown as CommuneStat[];
    },
  });

  const totalSignalements = stats.reduce((s, c) => s + c.total, 0);
  const totalActifs = stats.reduce((s, c) => s + c.actifs, 0);
  const totalResolus = stats.reduce((s, c) => s + c.resolus, 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Statistiques</h1>
        <p className="mt-1 text-muted-foreground">Vue d'ensemble des signalements par commune.</p>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Global stats */}
          <div className="mb-8 grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-card border border-border p-5 text-center shadow-card">
              <p className="font-display text-3xl font-extrabold text-foreground">{totalSignalements}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-5 text-center shadow-card">
              <p className="font-display text-3xl font-extrabold text-primary">{totalActifs}</p>
              <p className="text-sm text-muted-foreground">Actifs</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-5 text-center shadow-card">
              <p className="font-display text-3xl font-extrabold text-success">{totalResolus}</p>
              <p className="text-sm text-muted-foreground">Résolus</p>
            </div>
          </div>

          {/* Per commune */}
          <div className="space-y-3">
            {[...stats]
              .sort((a, b) => b.total - a.total)
              .map((c, i) => {
                const pct = totalSignalements > 0 ? Math.round((c.total / totalSignalements) * 100) : 0;
                return (
                  <motion.div
                    key={c.commune}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="rounded-xl border border-border bg-card p-4 shadow-card"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: c.couleur }}
                        />
                        <span className="font-bold text-foreground">{c.commune}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: c.couleur }}
                      />
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{c.total} total</span>
                      <span>{c.actifs} actif{c.actifs > 1 ? "s" : ""}</span>
                      <span>{c.resolus} résolu{c.resolus > 1 ? "s" : ""}</span>
                      <span>{(c.population / 1000).toFixed(0)}k hab.</span>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminStatsPage;
