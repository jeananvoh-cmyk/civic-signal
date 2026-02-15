import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useUserRole } from "@/hooks/useUserRole";
import { Zap, Droplets, Clock, Trophy, TrendingUp, ChevronDown, Radio, Flame, AlertTriangle, AlertCircle, MapPin } from "lucide-react";
import Header from "@/components/Header";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ShareButton from "@/components/ShareButton";
import TrendsChart from "@/components/TrendsChart";
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

interface QuartierRanking {
  commune: string;
  couleur: string;
  quartier: string;
  totalActifs: number;
  elecActifs: number;
  eauActifs: number;
  totalAll: number;
}

interface PriorityReport {
  id: string;
  service_type: string;
  description: string;
  location: string;
  urgency: string;
  status: string;
  verifications: number;
  created_at: string;
  start_time: string;
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
  const { isAdmin } = useUserRole();
  const [stats, setStats] = useState<CommuneServiceStat[]>([]);
  const [durations, setDurations] = useState<DurationStat[]>([]);
  const [topQuartiers, setTopQuartiers] = useState<QuartierRanking[]>([]);
  const [priorityReports, setPriorityReports] = useState<PriorityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeActive, setRealtimeActive] = useState(false);

  const fetchAll = useCallback(async () => {
    const communeNames = COMMUNES.map((c) => c.nom);
    const [statsRes, durRes, reportsRes, ...quartierResults] = await Promise.all([
      supabase.rpc("get_commune_service_stats"),
      supabase.rpc("get_commune_duration_stats"),
      supabase.rpc("get_public_reports"),
      ...communeNames.map((nom) => supabase.rpc("get_commune_quartier_stats", { p_commune: nom })),
    ]);
    if (!statsRes.error && statsRes.data) setStats(statsRes.data as unknown as CommuneServiceStat[]);
    else setStats(COMMUNES.map((c) => ({ commune: c.nom, couleur: c.couleur, population: c.population, electricite_actifs: 0, electricite_resolus: 0, electricite_total: 0, eau_actifs: 0, eau_resolus: 0, eau_total: 0 })));
    if (!durRes.error && durRes.data) setDurations(durRes.data as unknown as DurationStat[]);
    if (!reportsRes.error && reportsRes.data) setPriorityReports(reportsRes.data as unknown as PriorityReport[]);

    // Build top quartiers ranking
    const allQuartiers: QuartierRanking[] = [];
    quartierResults.forEach((res, idx) => {
      if (!res.error && res.data) {
        const commune = communeNames[idx];
        const couleur = COMMUNES.find((c) => c.nom === commune)?.couleur || "#888";
        (res.data as any[]).forEach((q) => {
          const totalActifs = (q.electricite_actifs || 0) + (q.eau_actifs || 0);
          if (totalActifs > 0 || (q.electricite_total || 0) + (q.eau_total || 0) > 0) {
            allQuartiers.push({
              commune,
              couleur,
              quartier: q.quartier,
              totalActifs,
              elecActifs: q.electricite_actifs || 0,
              eauActifs: q.eau_actifs || 0,
              totalAll: (q.electricite_total || 0) + (q.eau_total || 0),
            });
          }
        });
      }
    });
    allQuartiers.sort((a, b) => b.totalActifs - a.totalActifs || b.totalAll - a.totalAll);
    setTopQuartiers(allQuartiers.slice(0, 10));

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime subscription with 3s debounce to handle high-traffic periods
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => {
        setRealtimeActive(true);
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          fetchAll();
          setTimeout(() => setRealtimeActive(false), 2000);
        }, 3000);
      })
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const totalElecActifs = stats.reduce((s, c) => s + c.electricite_actifs, 0);
  const totalElecResolus = stats.reduce((s, c) => s + c.electricite_resolus, 0);
  const totalElecTotal = stats.reduce((s, c) => s + c.electricite_total, 0);
  const totalEauActifs = stats.reduce((s, c) => s + c.eau_actifs, 0);
  const totalEauResolus = stats.reduce((s, c) => s + c.eau_resolus, 0);
  const totalEauTotal = stats.reduce((s, c) => s + c.eau_total, 0);

  // Leaderboard: sorted by total active (most affected first)
  const leaderboard = [...stats].sort((a, b) => (b.electricite_actifs + b.eau_actifs) - (a.electricite_actifs + a.eau_actifs));

  // Priority reports
  const activeReports = priorityReports.filter((r) => r.status === "active");
  const highPriorityReports = activeReports.filter((r) => r.urgency === "critical" || r.urgency === "high");
  const mediumPriorityReports = activeReports.filter((r) => r.urgency === "medium");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Dashboard Opérateur</h1>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-muted-foreground">5 communes pilotes — Abidjan</p>
              <span className={`flex items-center gap-1 text-xs font-medium transition-colors ${realtimeActive ? "text-success" : "text-muted-foreground"}`}>
                <Radio className={`h-3 w-3 ${realtimeActive ? "animate-pulse" : ""}`} />
                Live
              </span>
            </div>
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
          // Global averages
          const elecDurations = durations.filter((d) => d.service_type === "electricity" && d.total_resolved > 0);
          const waterDurations = durations.filter((d) => d.service_type === "water" && d.total_resolved > 0);
          const globalElecAvg = elecDurations.length > 0 ? elecDurations.reduce((s, d) => s + d.avg_duration_minutes * d.total_resolved, 0) / elecDurations.reduce((s, d) => s + d.total_resolved, 0) : 0;
          const globalWaterAvg = waterDurations.length > 0 ? waterDurations.reduce((s, d) => s + d.avg_duration_minutes * d.total_resolved, 0) / waterDurations.reduce((s, d) => s + d.total_resolved, 0) : 0;
          const globalElecMax = elecDurations.length > 0 ? Math.max(...elecDurations.map((d) => d.longest_duration_minutes)) : 0;
          const globalWaterMax = waterDurations.length > 0 ? Math.max(...waterDurations.map((d) => d.longest_duration_minutes)) : 0;

          return (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-display text-xl font-bold text-foreground">Durée moyenne des coupures</h2>
              </div>

              {/* Global summary */}
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-semibold text-foreground">Électricité — toutes communes</span>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <div>
                      <p className="font-display text-2xl font-extrabold text-amber-500">{globalElecAvg > 0 ? formatMinutes(globalElecAvg) : "—"}</p>
                      <p className="text-[10px] text-muted-foreground">durée moyenne</p>
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-foreground">{globalElecMax > 0 ? formatMinutes(globalElecMax) : "—"}</p>
                      <p className="text-[10px] text-muted-foreground">la plus longue</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-semibold text-foreground">Eau — toutes communes</span>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <div>
                      <p className="font-display text-2xl font-extrabold text-blue-500">{globalWaterAvg > 0 ? formatMinutes(globalWaterAvg) : "—"}</p>
                      <p className="text-[10px] text-muted-foreground">durée moyenne</p>
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-foreground">{globalWaterMax > 0 ? formatMinutes(globalWaterMax) : "—"}</p>
                      <p className="text-[10px] text-muted-foreground">la plus longue</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Per commune */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {communeNames.map((commune) => {
                  const elec = durations.find((d) => d.commune === commune && d.service_type === "electricity");
                  const water = durations.find((d) => d.commune === commune && d.service_type === "water");
                  const couleur = elec?.couleur || water?.couleur || "#888";

                  return (
                    <div key={commune} className="rounded-xl border border-border bg-card p-4 shadow-card">
                      <p className="text-sm font-bold mb-3 text-center" style={{ color: couleur }}>{commune}</p>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Zap className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          <div className="min-w-0 flex-1">
                            <p className="font-display text-lg font-extrabold text-foreground leading-tight">
                              {elec && elec.total_resolved > 0 ? formatMinutes(elec.avg_duration_minutes) : "—"}
                            </p>
                            {elec && elec.total_resolved > 0 && (
                              <p className="text-[10px] text-muted-foreground">
                                max {formatMinutes(elec.longest_duration_minutes)} · {elec.total_resolved} résolu{elec.total_resolved > 1 ? "s" : ""}
                              </p>
                            )}
                            {(!elec || elec.total_resolved === 0) && (
                              <p className="text-[10px] text-muted-foreground">Aucune donnée</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Droplets className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                          <div className="min-w-0 flex-1">
                            <p className="font-display text-lg font-extrabold text-foreground leading-tight">
                              {water && water.total_resolved > 0 ? formatMinutes(water.avg_duration_minutes) : "—"}
                            </p>
                            {water && water.total_resolved > 0 && (
                              <p className="text-[10px] text-muted-foreground">
                                max {formatMinutes(water.longest_duration_minutes)} · {water.total_resolved} résolu{water.total_resolved > 1 ? "s" : ""}
                              </p>
                            )}
                            {(!water || water.total_resolved === 0) && (
                              <p className="text-[10px] text-muted-foreground">Aucune donnée</p>
                            )}
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

        {/* Top quartiers */}
        {!loading && topQuartiers.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="mb-8">
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-5 py-3 shadow-card hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-destructive" />
                  <h2 className="font-display text-xl font-bold text-foreground">Top 10 quartiers les plus touchés</h2>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 rounded-2xl border border-border bg-card shadow-card overflow-hidden divide-y divide-border">
                  {topQuartiers.map((q, i) => {
                    const medal = i === 0 ? "🔥" : i === 1 ? "🔥" : i === 2 ? "🔥" : `#${i + 1}`;
                    return (
                      <div key={`${q.commune}-${q.quartier}`} className="flex items-center gap-4 px-5 py-3 hover:bg-secondary/50 transition-colors">
                        <span className="text-lg font-bold w-8 text-center">{medal}</span>
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => navigate(`/commune/${encodeURIComponent(q.commune)}`)}
                            className="font-bold text-sm hover:underline"
                            style={{ color: q.couleur }}
                          >
                            {q.quartier}
                          </button>
                          <p className="text-[10px] text-muted-foreground">{q.commune}</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-amber-500" />{q.elecActifs}</span>
                          <span className="flex items-center gap-1"><Droplets className="h-3 w-3 text-blue-500" />{q.eauActifs}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-lg font-extrabold" style={{ color: q.totalActifs > 0 ? q.couleur : undefined }}>
                            {q.totalActifs}
                          </p>
                          <p className="text-[10px] text-muted-foreground">active{q.totalActifs !== 1 ? "s" : ""} / {q.totalAll}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </motion.div>
        )}
        {/* High priority reports */}
        {!loading && highPriorityReports.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-3 shadow-card hover:bg-destructive/10 transition-colors">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <h2 className="font-display text-xl font-bold text-foreground">Priorités hautes</h2>
                  <span className="ml-1 rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">{highPriorityReports.length}</span>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 rounded-2xl border border-destructive/20 bg-card shadow-card overflow-hidden divide-y divide-border">
                  {highPriorityReports.slice(0, 15).map((r) => {
                    const isElec = r.service_type === "electricity";
                    const urgencyLabel = r.urgency === "critical" ? "🔥 Critique" : "⚠️ Élevé";
                    const timeSinceStart = r.start_time ? formatMinutes((Date.now() - new Date(r.start_time).getTime()) / 60000) : "";
                    return (
                      <div key={r.id} className="flex items-center gap-4 px-5 py-3 hover:bg-destructive/5 transition-colors">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isElec ? "bg-amber-500/15" : "bg-blue-500/15"}`}>
                          {isElec ? <Zap className="h-4 w-4 text-amber-500" /> : <Droplets className="h-4 w-4 text-blue-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{r.description}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{r.location}</span>
                            {timeSinceStart && <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />depuis {timeSinceStart}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.urgency === "critical" ? "bg-destructive text-destructive-foreground" : "bg-urgent text-urgent-foreground"}`}>
                            {urgencyLabel}
                          </span>
                          <span className="text-xs text-muted-foreground">{r.verifications} ✓</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </motion.div>
        )}

        {/* Medium priority reports */}
        {!loading && mediumPriorityReports.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="mb-8">
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-warning/30 bg-warning/5 px-5 py-3 shadow-card hover:bg-warning/10 transition-colors">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  <h2 className="font-display text-xl font-bold text-foreground">Priorités moyennes</h2>
                  <span className="ml-1 rounded-full bg-warning px-2 py-0.5 text-xs font-bold text-warning-foreground">{mediumPriorityReports.length}</span>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 rounded-2xl border border-warning/20 bg-card shadow-card overflow-hidden divide-y divide-border">
                  {mediumPriorityReports.slice(0, 15).map((r) => {
                    const isElec = r.service_type === "electricity";
                    const timeSinceStart = r.start_time ? formatMinutes((Date.now() - new Date(r.start_time).getTime()) / 60000) : "";
                    return (
                      <div key={r.id} className="flex items-center gap-4 px-5 py-3 hover:bg-warning/5 transition-colors">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isElec ? "bg-amber-500/15" : "bg-blue-500/15"}`}>
                          {isElec ? <Zap className="h-4 w-4 text-amber-500" /> : <Droplets className="h-4 w-4 text-blue-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{r.description}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{r.location}</span>
                            {timeSinceStart && <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />depuis {timeSinceStart}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-warning text-warning-foreground">⚡ Moyen</span>
                          <span className="text-xs text-muted-foreground">{r.verifications} ✓</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </motion.div>
        )}

        {/* Leaderboard */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
          <Collapsible>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-5 py-3 shadow-card hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <h2 className="font-display text-xl font-bold text-foreground">Classement des coupures en cours par commune</h2>
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

        {/* Trends chart - admin only */}
        {isAdmin && <TrendsChart className="mt-8" />}
      </main>
    </div>
  );
};

export default DashboardPage;
