import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Zap, Droplets, MapPin, Clock, TrendingUp, TrendingDown, Minus, Wrench, CheckCircle2 } from "lucide-react";
import Header from "@/components/Header";
import ShareButton from "@/components/ShareButton";
import CommuneAlertButton from "@/components/CommuneAlertButton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNES } from "@/lib/communes";
import { COMMUNE_LOGOS } from "@/lib/commune-logos";
import { getQuartiers } from "@/lib/quartiers";
import QuartierOutageGrid from "@/components/QuartierOutageGrid";

interface QuartierStat {
  quartier: string;
  electricite_actifs: number;
  electricite_resolus: number;
  electricite_total: number;
  eau_actifs: number;
  eau_resolus: number;
  eau_total: number;
}

interface ImpactStats {
  total_reports: number;
  resolved_reports: number;
  infra_reports: number;
  reports_last_7: number;
  reports_prev_7: number;
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

const CommuneDetailPage = () => {
  const { communeName } = useParams<{ communeName: string }>();
  const navigate = useNavigate();
  const [stats, setStats] = useState<QuartierStat[]>([]);
  const [durations, setDurations] = useState<DurationStat[]>([]);
  const [impactStats, setImpactStats] = useState<ImpactStats | null>(null);
  const [loading, setLoading] = useState(true);

  const decodedName = decodeURIComponent(communeName || "");
  const communeInfo = COMMUNES.find((c) => c.nom.toLowerCase() === decodedName.toLowerCase());
  const couleur = communeInfo?.couleur || "#888";

  usePageMeta({
    title: `${decodedName} — Signalements`,
    description: `Coupures d'eau, d'électricité et infrastructures défaillantes signalées à ${decodedName}, Abidjan. Données citoyennes en temps réel.`,
  });
  const logo = COMMUNE_LOGOS[decodedName] || COMMUNE_LOGOS[communeInfo?.nom || ""];

  useEffect(() => {
    const fetchData = async () => {
      const [quartierRes, durationRes, impactRes] = await Promise.all([
        supabase.rpc("get_commune_quartier_stats", { p_commune: decodedName }),
        supabase.rpc("get_commune_duration_stats"),
        supabase.rpc("get_commune_impact_stats" as any, { p_commune: decodedName }),
      ]);
      if (!quartierRes.error && quartierRes.data) {
        setStats(quartierRes.data as unknown as QuartierStat[]);
      }
      if (!durationRes.error && durationRes.data) {
        setDurations(
          (durationRes.data as unknown as DurationStat[]).filter(
            (d) => d.commune.toLowerCase() === decodedName.toLowerCase()
          )
        );
      }
      if (!impactRes.error && impactRes.data) {
        setImpactStats(impactRes.data as unknown as ImpactStats);
      }
      setLoading(false);
    };
    fetchData();
  }, [decodedName]);

  const totalElecActifs = stats.reduce((s, q) => s + q.electricite_actifs, 0);
  const totalEauActifs = stats.reduce((s, q) => s + q.eau_actifs, 0);
  const totalElecTotal = stats.reduce((s, q) => s + q.electricite_total, 0);
  const totalEauTotal = stats.reduce((s, q) => s + q.eau_total, 0);

  const elecDuration = durations.find((d) => d.service_type === "electricity");
  const waterDuration = durations.find((d) => d.service_type === "water");

  const totalActifs = totalElecActifs + totalEauActifs;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 max-w-3xl">
        {/* Back + Title */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/tableau-de-bord")} className="-ml-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Retour au dashboard
            </Button>
            <ShareButton
              title={`SIGNA-CI — ${decodedName}`}
              text={`📊 ${decodedName} : ${totalActifs} coupure${totalActifs !== 1 ? "s" : ""} active${totalActifs !== 1 ? "s" : ""} (⚡${totalElecActifs} 💧${totalEauActifs})`}
            />
          </div>

          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl overflow-hidden shadow-md border border-border"
              style={{ backgroundColor: logo ? '#fff' : couleur }}
            >
              {logo ? (
                <img src={logo} alt={decodedName} className="h-full w-full object-contain p-1" />
              ) : (
                <MapPin className="h-6 w-6 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl font-bold text-foreground">{decodedName}</h1>
              {communeInfo && (
                <p className="text-sm text-muted-foreground">
                  {(communeInfo.population / 1000).toFixed(0)}k habitants
                </p>
              )}
              <div className="mt-2">
                <CommuneAlertButton commune={decodedName} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Summary pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 grid grid-cols-2 gap-3"
        >
          <button
            onClick={() => navigate("/carte?service=electricity")}
            className="group flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-left transition-all duration-300 hover:border-amber-500/50 hover:bg-amber-500/15 hover:shadow-lg hover:shadow-amber-500/10 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 transition-colors duration-300 group-hover:bg-amber-500/25">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-500/70">Électricité</p>
              <p className="font-display text-xl font-extrabold text-amber-500">
                {loading ? "..." : totalElecActifs} <span className="text-sm font-medium">en cours</span>
              </p>
              <p className="text-[11px] text-muted-foreground">{totalElecTotal} signalement{totalElecTotal !== 1 ? "s" : ""} au total</p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 text-amber-500/50 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-amber-500" />
          </button>
          <button
            onClick={() => navigate("/carte?service=water")}
            className="group flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-left transition-all duration-300 hover:border-blue-500/50 hover:bg-blue-500/15 hover:shadow-lg hover:shadow-blue-500/10 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 transition-colors duration-300 group-hover:bg-blue-500/25">
              <Droplets className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-500/70">Eau</p>
              <p className="font-display text-xl font-extrabold text-blue-500">
                {loading ? "..." : totalEauActifs} <span className="text-sm font-medium">en cours</span>
              </p>
              <p className="text-[11px] text-muted-foreground">{totalEauTotal} signalement{totalEauTotal !== 1 ? "s" : ""} au total</p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 text-blue-500/50 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-blue-500" />
          </button>
        </motion.div>

        {/* Impact & Tendance */}
        {!loading && impactStats && impactStats.total_reports > 0 && (() => {
          const resRate = Math.round((impactStats.resolved_reports / impactStats.total_reports) * 100);
          const delta = impactStats.reports_last_7 - impactStats.reports_prev_7;
          const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
          const trendColor = delta > 0 ? "text-red-500" : delta < 0 ? "text-green-500" : "text-muted-foreground";
          const trendLabel = delta > 0 ? `+${delta} vs sem. préc.` : delta < 0 ? `${delta} vs sem. préc.` : "Stable";
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-card"
            >
              <h2 className="font-display text-base font-bold text-foreground mb-4">Impact & Tendance</h2>
              <div className="grid grid-cols-3 gap-4">
                {/* Taux de résolution */}
                <div className="flex flex-col items-center text-center gap-1">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/10">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <p className="font-display text-2xl font-extrabold text-green-500">{resRate}%</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">Taux de résolution</p>
                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                    <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${resRate}%` }} />
                  </div>
                </div>
                {/* Infra signalées */}
                <div className="flex flex-col items-center text-center gap-1">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10">
                    <Wrench className="h-4 w-4 text-orange-500" />
                  </div>
                  <p className="font-display text-2xl font-extrabold text-orange-500">{impactStats.infra_reports}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">Infra signalées</p>
                  <p className="text-[10px] text-muted-foreground">(caniveaux, routes…)</p>
                </div>
                {/* Tendance 7j */}
                <div className="flex flex-col items-center text-center gap-1">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${delta > 0 ? "bg-red-500/10" : delta < 0 ? "bg-green-500/10" : "bg-muted"}`}>
                    <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                  </div>
                  <p className={`font-display text-2xl font-extrabold ${trendColor}`}>{impactStats.reports_last_7}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">Cette semaine</p>
                  <p className={`text-[10px] font-semibold ${trendColor}`}>{trendLabel}</p>
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* Duration stats */}
        {!loading && (elecDuration?.total_resolved || waterDuration?.total_resolved) ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-card"
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-display text-lg font-bold text-foreground">Durée des coupures</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-semibold text-foreground">Électricité</span>
                </div>
                {elecDuration && elecDuration.total_resolved > 0 ? (
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <p className="font-display text-2xl font-extrabold text-amber-500">
                        {formatMinutes(elecDuration.avg_duration_minutes)}
                      </p>
                      <span className="text-[10px] text-muted-foreground">en moyenne</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <p className="font-display text-sm font-bold text-foreground">
                        {formatMinutes(elecDuration.longest_duration_minutes)}
                      </p>
                      <span className="text-[10px] text-muted-foreground">la plus longue</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {elecDuration.total_resolved} résolu{elecDuration.total_resolved > 1 ? "s" : ""} · {elecDuration.total_active} actif{elecDuration.total_active > 1 ? "s" : ""}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune donnée</p>
                )}
              </div>
              <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-semibold text-foreground">Eau</span>
                </div>
                {waterDuration && waterDuration.total_resolved > 0 ? (
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <p className="font-display text-2xl font-extrabold text-blue-500">
                        {formatMinutes(waterDuration.avg_duration_minutes)}
                      </p>
                      <span className="text-[10px] text-muted-foreground">en moyenne</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <p className="font-display text-sm font-bold text-foreground">
                        {formatMinutes(waterDuration.longest_duration_minutes)}
                      </p>
                      <span className="text-[10px] text-muted-foreground">la plus longue</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {waterDuration.total_resolved} résolu{waterDuration.total_resolved > 1 ? "s" : ""} · {waterDuration.total_active} actif{waterDuration.total_active > 1 ? "s" : ""}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune donnée</p>
                )}
              </div>
            </div>
          </motion.div>
        ) : null}

        {/* Quartier grid */}
        <QuartierOutageGrid
          communeName={decodedName}
          stats={stats}
          loading={loading}
          couleur={couleur}
        />
      </main>
    </div>
  );
};

export default CommuneDetailPage;