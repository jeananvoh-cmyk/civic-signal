import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Droplets } from "lucide-react";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNES } from "@/lib/communes";
import { COMMUNE_LOGOS } from "@/lib/commune-logos";
import electricityIcon from "@/assets/electricity-icon.png";
import waterIcon from "@/assets/water-icon.png";

interface CommuneServiceStat {
  commune: string;
  couleur: string;
  population: number;
  electricite_actifs: number;
  electricite_resolus: number;
  electricite_total: number;
  eau_actifs: number;
  eau_resolus: number;
  eau_total: number;
}

const DashboardPage = () => {
  const [stats, setStats] = useState<CommuneServiceStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await supabase.rpc("get_commune_service_stats");
      if (!error && data) {
        setStats(data as unknown as CommuneServiceStat[]);
      } else {
        setStats(
          COMMUNES.map((c) => ({
            commune: c.nom,
            couleur: c.couleur,
            population: c.population,
            electricite_actifs: 0,
            electricite_resolus: 0,
            electricite_total: 0,
            eau_actifs: 0,
            eau_resolus: 0,
            eau_total: 0,
          }))
        );
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  const totalElecActifs = stats.reduce((s, c) => s + c.electricite_actifs, 0);
  const totalElecResolus = stats.reduce((s, c) => s + c.electricite_resolus, 0);
  const totalElecTotal = stats.reduce((s, c) => s + c.electricite_total, 0);
  const totalEauActifs = stats.reduce((s, c) => s + c.eau_actifs, 0);
  const totalEauResolus = stats.reduce((s, c) => s + c.eau_resolus, 0);
  const totalEauTotal = stats.reduce((s, c) => s + c.eau_total, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Dashboard Opérateur</h1>
          <p className="mt-1 text-muted-foreground">5 communes pilotes — Abidjan</p>
        </motion.div>

        {/* Global totals: Electricity & Water side by side */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          {/* Electricity card */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="absolute -right-4 -top-4 h-24 w-24 opacity-10">
              <img src={electricityIcon} alt="" className="h-full w-full object-contain" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
                <Zap className="h-5 w-5 text-amber-500" />
              </div>
              <h2 className="font-display text-lg font-bold text-foreground">Électricité</h2>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="font-display text-2xl font-extrabold text-amber-500">
                  {loading ? "..." : totalElecActifs}
                </p>
                <p className="text-xs text-muted-foreground">Actives</p>
              </div>
              <div>
                <p className="font-display text-2xl font-extrabold text-emerald-500">
                  {loading ? "..." : totalElecResolus}
                </p>
                <p className="text-xs text-muted-foreground">Résolues</p>
              </div>
              <div>
                <p className="font-display text-2xl font-extrabold text-foreground">
                  {loading ? "..." : totalElecTotal}
                </p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </div>

          {/* Water card */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="absolute -right-4 -top-4 h-24 w-24 opacity-10">
              <img src={waterIcon} alt="" className="h-full w-full object-contain" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
                <Droplets className="h-5 w-5 text-blue-500" />
              </div>
              <h2 className="font-display text-lg font-bold text-foreground">Eau</h2>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="font-display text-2xl font-extrabold text-blue-500">
                  {loading ? "..." : totalEauActifs}
                </p>
                <p className="text-xs text-muted-foreground">Actives</p>
              </div>
              <div>
                <p className="font-display text-2xl font-extrabold text-emerald-500">
                  {loading ? "..." : totalEauResolus}
                </p>
                <p className="text-xs text-muted-foreground">Résolues</p>
              </div>
              <div>
                <p className="font-display text-2xl font-extrabold text-foreground">
                  {loading ? "..." : totalEauTotal}
                </p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Per-commune breakdown */}
        <h2 className="font-display text-xl font-bold text-foreground mb-4">Détail par commune</h2>
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            stats.map((c, i) => {
              const pctPop = c.population > 0 ? ((c.electricite_total + c.eau_total) / c.population) * 100 : 0;
              const pctPopDisplay = pctPop < 0.01 && (c.electricite_total + c.eau_total) > 0 ? "<0.01" : pctPop.toFixed(2);
              const capacite = Math.floor(c.population / 2);
              const tauxCapacite = capacite > 0 ? Math.min(((c.electricite_total + c.eau_total) / capacite) * 100, 100) : 0;

              return (
                <motion.div
                  key={c.commune}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-2xl border border-border bg-card p-5 shadow-card"
                >
                  {/* Commune header */}
                  <div className="flex items-center gap-3 mb-4">
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
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground text-lg">{c.commune}</span>
                        <span className="text-xs font-semibold" style={{ color: c.couleur }}>
                          {pctPopDisplay}% de la pop.
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{(c.population / 1000).toFixed(0)}k hab.</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-4">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(tauxCapacite, 1)}%`, backgroundColor: c.couleur }}
                    />
                  </div>

                  {/* Electricity & Water mini cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Electricity */}
                    <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        <span className="text-xs font-semibold text-foreground">Électricité</span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <div>
                          <span className="font-display text-xl font-extrabold text-amber-500">{c.electricite_actifs}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">actif{c.electricite_actifs !== 1 ? "s" : ""}</span>
                        </div>
                        <div>
                          <span className="font-display text-sm font-bold text-emerald-500">{c.electricite_resolus}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">résolu{c.electricite_resolus !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                    </div>

                    {/* Water */}
                    <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Droplets className="h-4 w-4 text-blue-500" />
                        <span className="text-xs font-semibold text-foreground">Eau</span>
                      </div>
                      <div className="flex items-baseline gap-3">
                        <div>
                          <span className="font-display text-xl font-extrabold text-blue-500">{c.eau_actifs}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">actif{c.eau_actifs !== 1 ? "s" : ""}</span>
                        </div>
                        <div>
                          <span className="font-display text-sm font-bold text-emerald-500">{c.eau_resolus}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">résolu{c.eau_resolus !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
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
