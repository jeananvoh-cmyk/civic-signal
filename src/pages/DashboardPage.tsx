import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Droplets, Clock, Trophy, TrendingUp, ChevronDown } from "lucide-react";
import Header from "@/components/Header";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ShareButton from "@/components/ShareButton";
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

interface DurationStat {
  commune: string;
  couleur: string;
  avg_duration_minutes: number;
  total_resolved: number;
  total_active: number;
  longest_duration_minutes: number;
  service_type: string;
}

function formatMinutes(mins: number): string {
  if (mins < 1) return "—";
  if (mins < 60) return `${Math.round(mins)}min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h < 24) return `${h}h${m > 0 ? m + "min" : ""}`;
  const d = Math.floor(h / 24);
  return `${d}j ${h % 24}h`;
}

const DashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<CommuneServiceStat[]>([]);
  const [durations, setDurations] = useState<DurationStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [statsRes, durRes] = await Promise.all([
        supabase.rpc("get_commune_service_stats"),
        supabase.rpc("get_commune_duration_stats"),
      ]);
      if (!statsRes.error && statsRes.data) setStats(statsRes.data as unknown as CommuneServiceStat[]);
      else setStats(COMMUNES.map((c) => ({ commune: c.nom, couleur: c.couleur, population: c.population, electricite_actifs: 0, electricite_resolus: 0, electricite_total: 0, eau_actifs: 0, eau_resolus: 0, eau_total: 0 })));
      if (!durRes.error && durRes.data) setDurations(durRes.data as unknown as DurationStat[]);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const totalElecActifs = stats.reduce((s, c) => s + c.electricite_actifs, 0);
  const totalElecResolus = stats.reduce((s, c) => s + c.electricite_resolus, 0);
  const totalElecTotal = stats.reduce((s, c) => s + c.electricite_total, 0);
  const totalEauActifs = stats.reduce((s, c) => s + c.eau_actifs, 0);
  const totalEauResolus = stats.reduce((s, c) => s + c.eau_resolus, 0);
  const totalEauTotal = stats.reduce((s, c) => s + c.eau_total, 0);

  // Leaderboard: sorted by total active (most affected first)
  const leaderboard = [...stats].sort((a, b) => (b.electricite_actifs + b.eau_actifs) - (a.electricite_actifs + a.eau_actifs));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Dashboard Opérateur</h1>
            <p className="mt-1 text-muted-foreground">5 communes pilotes — Abidjan</p>
          </div>
          <ShareButton
            title="Dashboard SignalÉnergie"
            text={`📊 ${totalElecActifs + totalEauActifs} coupures actives sur les 5 communes pilotes d'Abidjan`}
          />
        </motion.div>

        {/* Global totals */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <div><p className="font-display text-2xl font-extrabold text-amber-500">{loading ? "..." : totalElecActifs}</p><p className="text-xs text-muted-foreground">Actives</p></div>
              <div><p className="font-display text-2xl font-extrabold text-emerald-500">{loading ? "..." : totalElecResolus}</p><p className="text-xs text-muted-foreground">Résolues</p></div>
              <div><p className="font-display text-2xl font-extrabold text-foreground">{loading ? "..." : totalElecTotal}</p><p className="text-xs text-muted-foreground">Total</p></div>
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
              <div><p className="font-display text-2xl font-extrabold text-blue-500">{loading ? "..." : totalEauActifs}</p><p className="text-xs text-muted-foreground">Actives</p></div>
              <div><p className="font-display text-2xl font-extrabold text-emerald-500">{loading ? "..." : totalEauResolus}</p><p className="text-xs text-muted-foreground">Résolues</p></div>
              <div><p className="font-display text-2xl font-extrabold text-foreground">{loading ? "..." : totalEauTotal}</p><p className="text-xs text-muted-foreground">Total</p></div>
            </div>
          </div>
        </motion.div>

        {/* Duration stats */}
        {!loading && durations.some((d) => d.total_resolved > 0) && (() => {
          const communeNames = [...new Set(durations.map((d) => d.commune))];
          return (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-display text-xl font-bold text-foreground">Durée moyenne des coupures</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {communeNames.map((commune) => {
                  const elec = durations.find((d) => d.commune === commune && d.service_type === "electricity");
                  const water = durations.find((d) => d.commune === commune && d.service_type === "water");
                  const couleur = elec?.couleur || water?.couleur || "#888";

                  return (
                    <div key={commune} className="rounded-xl border border-border bg-card p-4 shadow-card">
                      <p className="text-sm font-bold mb-2 text-center" style={{ color: couleur }}>{commune}</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Zap className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          <div className="min-w-0">
                            <p className="font-display text-lg font-extrabold text-foreground leading-tight">
                              {elec && elec.total_resolved > 0 ? formatMinutes(elec.avg_duration_minutes) : "—"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {elec && elec.total_resolved > 0 ? `${elec.total_resolved} résolu${elec.total_resolved > 1 ? "s" : ""}` : "Aucune donnée"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Droplets className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                          <div className="min-w-0">
                            <p className="font-display text-lg font-extrabold text-foreground leading-tight">
                              {water && water.total_resolved > 0 ? formatMinutes(water.avg_duration_minutes) : "—"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {water && water.total_resolved > 0 ? `${water.total_resolved} résolu${water.total_resolved > 1 ? "s" : ""}` : "Aucune donnée"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })()}

        {/* Leaderboard */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
          <Collapsible>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-5 py-3 shadow-card hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <h2 className="font-display text-xl font-bold text-foreground">Classement des communes</h2>
              </div>
              <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 rounded-2xl border border-border bg-card shadow-card overflow-hidden">
                {loading ? (
                  <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
                ) : (
                  <div className="divide-y divide-border">
                    {leaderboard.map((c, i) => {
                      const totalActifs = c.electricite_actifs + c.eau_actifs;
                      const totalAll = c.electricite_total + c.eau_total;
                      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;

                      return (
                        <div key={c.commune} className="flex items-center gap-4 px-5 py-4 hover:bg-secondary/50 transition-colors">
                          <span className="text-lg font-bold w-8 text-center">{medal}</span>
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg overflow-hidden" style={{ backgroundColor: c.couleur }}>
                            {COMMUNE_LOGOS[c.commune] ? (
                              <img src={COMMUNE_LOGOS[c.commune]} alt={c.commune} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-white font-bold text-xs">{c.commune[0]}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <button onClick={() => navigate(`/commune/${encodeURIComponent(c.commune)}`)} className="font-bold text-foreground hover:underline" style={{ color: c.couleur }}>
                              {c.commune}
                            </button>
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              <span>⚡ {c.electricite_actifs}</span>
                              <span>💧 {c.eau_actifs}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-display text-xl font-extrabold" style={{ color: totalActifs > 0 ? c.couleur : undefined }}>
                              {totalActifs}
                            </p>
                            <p className="text-[10px] text-muted-foreground">active{totalActifs !== 1 ? "s" : ""} / {totalAll}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </motion.div>

        {/* Per-commune breakdown */}
        <h2 className="font-display text-xl font-bold text-foreground mb-4">Détail par commune</h2>
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
          ) : (
            stats.map((c, i) => {
              const pctPop = c.population > 0 ? ((c.electricite_total + c.eau_total) / c.population) * 100 : 0;
              const pctPopDisplay = pctPop < 0.01 && (c.electricite_total + c.eau_total) > 0 ? "<0.01" : pctPop.toFixed(2);
              const capacite = Math.floor(c.population / 2);
              const tauxCapacite = capacite > 0 ? Math.min(((c.electricite_total + c.eau_total) / capacite) * 100, 100) : 0;

              return (
                <motion.div key={c.commune} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl overflow-hidden" style={{ backgroundColor: c.couleur }}>
                      {COMMUNE_LOGOS[c.commune] ? (
                        <img src={COMMUNE_LOGOS[c.commune]} alt={c.commune} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-sm">#{i + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <button onClick={() => navigate(`/commune/${encodeURIComponent(c.commune)}`)} className="font-bold text-foreground text-lg hover:underline underline-offset-2 transition-colors" style={{ color: c.couleur }}>
                          {c.commune}
                        </button>
                        <span className="text-xs font-semibold" style={{ color: c.couleur }}>{pctPopDisplay}% de la pop.</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{(c.population / 1000).toFixed(0)}k hab.</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-4">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(tauxCapacite, 1)}%`, backgroundColor: c.couleur }} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
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
