import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Droplets, Users, TrendingUp } from "lucide-react";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNES, COMMUNE_COLORS } from "@/lib/communes";
import { COMMUNE_LOGOS } from "@/lib/commune-logos";

interface CommuneStat {
  commune: string;
  couleur: string;
  actifs: number;
  resolus: number;
  total: number;
  population: number;
}

const DashboardPage = () => {
  const [stats, setStats] = useState<CommuneStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await supabase.rpc("get_commune_stats");
      if (!error && data) {
        setStats(data as unknown as CommuneStat[]);
      } else {
        // Fallback: use local commune data with 0 counts
        setStats(COMMUNES.map((c) => ({
          commune: c.nom,
          couleur: c.couleur,
          actifs: 0,
          resolus: 0,
          total: 0,
          population: c.population,
        })));
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  const totalActifs = stats.reduce((s, c) => s + c.actifs, 0);
  const totalResolus = stats.reduce((s, c) => s + c.resolus, 0);
  const totalSignalements = stats.reduce((s, c) => s + c.total, 0);
  // Estimation: chaque signalement actif représente ~1 ménage impacté
  const totalMenagesImpactes = totalActifs;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="font-display text-3xl font-bold text-foreground">Dashboard Opérateur</h1>
          <p className="mt-1 text-muted-foreground">5 communes pilotes — Abidjan</p>
        </motion.div>

        {/* Commune badges bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 flex flex-wrap gap-3"
        >
          {[...stats].sort((a, b) => a.commune.localeCompare(b.commune)).map((c) => (
            <div
              key={c.commune}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white"
              style={{ backgroundColor: c.couleur }}
            >
              {COMMUNE_LOGOS[c.commune] ? (
                <img src={COMMUNE_LOGOS[c.commune]} alt={c.commune} className="h-6 w-6 rounded-full object-cover bg-white" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-white/60" />
              )}
              {c.commune} {c.actifs} actif{c.actifs !== 1 ? "s" : ""}
            </div>
          ))}
        </motion.div>

        {/* Global stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8 rounded-xl gradient-hero p-6 text-primary-foreground"
        >
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 text-center">
            <div>
              <p className="font-display text-3xl font-extrabold">{loading ? "..." : totalSignalements}</p>
              <p className="text-sm opacity-80">Total coupures</p>
            </div>
            <div>
              <p className="font-display text-3xl font-extrabold">{loading ? "..." : totalActifs}</p>
              <p className="text-sm opacity-80">Actives</p>
            </div>
            <div>
              <p className="font-display text-3xl font-extrabold">{loading ? "..." : totalResolus}</p>
              <p className="text-sm opacity-80">Résolues</p>
            </div>
            <div>
              <p className="font-display text-3xl font-extrabold">
                {loading ? "..." : totalMenagesImpactes}
              </p>
              <p className="text-sm opacity-80">Ménages impactés</p>
            </div>
          </div>
        </motion.div>

        {/* Commune ranking */}
        <h2 className="font-display text-xl font-bold text-foreground mb-4">Classement communes</h2>
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            [...stats]
              .sort((a, b) => a.commune.localeCompare(b.commune))
              .map((c, i) => {
                const pct = totalSignalements > 0 ? Math.round((c.total / totalSignalements) * 100) : 0;
                return (
                  <motion.div
                    key={c.commune}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card"
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden"
                      style={{ backgroundColor: c.couleur }}
                    >
                      {COMMUNE_LOGOS[c.commune] ? (
                        <img src={COMMUNE_LOGOS[c.commune]} alt={c.commune} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-sm">#{i + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-foreground">{c.commune}</span>
                        <span className="text-xs text-muted-foreground">{pct}% des signalements</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: c.couleur }}
                        />
                      </div>
                      <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                        <span>{c.actifs} actif{c.actifs !== 1 ? "s" : ""}</span>
                        <span>{c.resolus} résolu{c.resolus !== 1 ? "s" : ""}</span>
                        <span>{(c.population / 1000).toFixed(0)}k hab.</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
