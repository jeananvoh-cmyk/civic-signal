import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGoBack } from "@/hooks/useGoBack";
import { usePageMeta } from "@/hooks/usePageMeta";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Zap, Droplets, MapPin, Clock, TrendingUp, TrendingDown, Minus, Wrench, CheckCircle2, Landmark, AlertTriangle, ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Header from "@/components/Header";
import ShareButton from "@/components/ShareButton";
import CommuneAlertButton from "@/components/CommuneAlertButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNES } from "@/lib/communes";
import { COMMUNE_LOGOS } from "@/lib/commune-logos";
import { getQuartiers, extractQuartierFromReport } from "@/lib/quartiers";
import { cleanDescription } from "@/lib/report-display";
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

interface DurationStat {
  commune: string;
  service_type: string;
  avg_duration_minutes: number;
  longest_duration_minutes: number;
  total_resolved: number;
}

interface ImpactStats {
  res_rate: number;
  infra_reports: number;
  reports_last_7: number;
  delta: number;
}

function formatMinutes(mins: number): string {
  if (!mins || mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}min`;
  if (h < 24) return `${h}h${m > 0 ? m + "min" : ""}`;
  const d = Math.floor(h / 24);
  return `${d}j ${h % 24}h`;
}

const CommuneDetailPage = () => {
  const { communeName } = useParams<{ communeName: string }>();
  const navigate = useNavigate();
  const goBack = useGoBack("/tableau-de-bord");
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

  const [communeStat, setCommuneStat] = useState<{
    electricite_actifs: number;
    electricite_total: number;
    eau_actifs: number;
    eau_total: number;
  } | null>(null);
  const [communeReports, setCommuneReports] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const cNorm = decodedName.toLowerCase().trim();
      const [quartierRes, durationRes, impactRes, serviceRes, publicReportsRes, infraReportsRes] = await Promise.all([
        supabase.rpc("get_commune_quartier_stats", { p_commune: decodedName }),
        supabase.rpc("get_commune_duration_stats"),
        supabase.rpc("get_commune_impact_stats" as any, { p_commune: decodedName }),
        supabase.rpc("get_commune_service_stats"),
        supabase.rpc("get_public_reports" as any),
        supabase.rpc("get_public_infrastructure_reports" as any, { p_commune: decodedName }),
      ]);

      // 1. Filtrer les signalements publics appartenant à cette commune
      const matchedReports: any[] = [];
      if (publicReportsRes.data && Array.isArray(publicReportsRes.data)) {
        publicReportsRes.data.forEach((r: any) => {
          const rCommune = (r.commune || "").toLowerCase().trim();
          const rLoc = (r.location || "").toLowerCase();
          const rDesc = (r.description || "").toLowerCase();
          if (rCommune === cNorm || rLoc.includes(cNorm) || rDesc.includes(cNorm)) {
            matchedReports.push({
              ...r,
              commune: decodedName,
              resolvedQuartier: extractQuartierFromReport(r, decodedName),
            });
          }
        });
      }

      if (infraReportsRes.data && Array.isArray(infraReportsRes.data)) {
        infraReportsRes.data.forEach((r: any) => {
          matchedReports.push({
            ...r,
            commune: decodedName,
            resolvedQuartier: extractQuartierFromReport(r, decodedName),
          });
        });
      }

      // Dédupliquer et trier par date décroissante
      const uniqueReports = Array.from(new Map(matchedReports.map((r) => [r.id, r])).values());
      uniqueReports.sort((a, b) => new Date(b.start_time || b.created_at).getTime() - new Date(a.start_time || a.created_at).getTime());
      setCommuneReports(uniqueReports);

      // 2. Traitement des statistiques de quartiers
      let qStats: QuartierStat[] = [];
      if (!quartierRes.error && Array.isArray(quartierRes.data) && quartierRes.data.length > 0) {
        qStats = quartierRes.data as unknown as QuartierStat[];
      }

      // Si get_commune_quartier_stats a filtré des signalements sans micro-quartier,
      // on synthétise automatiquement les entrées manquantes depuis uniqueReports
      const activeOutages = uniqueReports.filter((r) => r.status === "active" || r.status === "open" || r.status === "in_progress");
      if (activeOutages.length > 0) {
        const qMap = new Map<string, QuartierStat>();
        qStats.forEach((qs) => qMap.set(qs.quartier, { ...qs }));

        activeOutages.forEach((r) => {
          const qName = r.resolvedQuartier || `${decodedName} (Centre / Secteur général)`;
          const existing = qMap.get(qName);
          const isElec = r.service_type === "electricity";
          const isWater = r.service_type === "water";

          if (existing) {
            if (isElec && existing.electricite_actifs === 0) existing.electricite_actifs += 1;
            if (isWater && existing.eau_actifs === 0) existing.eau_actifs += 1;
          } else {
            qMap.set(qName, {
              quartier: qName,
              electricite_actifs: isElec ? 1 : 0,
              electricite_resolus: 0,
              electricite_total: isElec ? 1 : 0,
              eau_actifs: isWater ? 1 : 0,
              eau_resolus: 0,
              eau_total: isWater ? 1 : 0,
            });
          }
        });
        qStats = Array.from(qMap.values());
      }

      setStats(qStats);

      if (!durationRes.error && durationRes.data) {
        setDurations(
          (durationRes.data as unknown as DurationStat[]).filter(
            (d) => d.commune.toLowerCase() === cNorm
          )
        );
      }
      if (!impactRes.error && impactRes.data) {
        setImpactStats(impactRes.data as unknown as ImpactStats);
      }
      if (!serviceRes.error && Array.isArray(serviceRes.data)) {
        const found = (serviceRes.data as any[]).find(
          (c) => (c.commune || "").toLowerCase().trim() === cNorm
        );
        if (found) {
          setCommuneStat({
            electricite_actifs: Number(found.electricite_actifs || 0),
            electricite_total: Number(found.electricite_total || 0),
            eau_actifs: Number(found.eau_actifs || 0),
            eau_total: Number(found.eau_total || 0),
          });
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [decodedName]);

  const totalElecActifs = communeStat ? communeStat.electricite_actifs : stats.reduce((s, q) => s + q.electricite_actifs, 0);
  const totalEauActifs = communeStat ? communeStat.eau_actifs : stats.reduce((s, q) => s + q.eau_actifs, 0);
  const totalElecTotal = communeStat ? communeStat.electricite_total : stats.reduce((s, q) => s + q.electricite_total, 0);
  const totalEauTotal = communeStat ? communeStat.eau_total : stats.reduce((s, q) => s + q.eau_total, 0);

  const elecDuration = durations.find((d) => d.service_type === "electricity");
  const waterDuration = durations.find((d) => d.service_type === "water");

  const totalActifs = totalElecActifs + totalEauActifs;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 max-w-6xl">
        {/* Back + Title */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="sm" onClick={goBack} className="-ml-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Retour
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
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <CommuneAlertButton commune={decodedName} />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate("/verification")}
                    className="h-8 gap-1.5 rounded-full text-xs font-semibold border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-sky-500" />
                    Vérifier les signalements
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/mairie/${encodeURIComponent(decodedName)}`)}
                    className="h-8 gap-1.5 rounded-full text-xs font-semibold border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                  >
                    <Landmark className="h-3.5 w-3.5 text-emerald-500" />
                    Services Techniques Mairie
                  </Button>
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
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-500/70">Électricité</p>
              <p className="font-display text-xl font-extrabold text-amber-500">
                {loading ? "..." : totalElecActifs} <span className="text-sm font-medium">en cours</span>
              </p>
              <p className="text-xs text-muted-foreground">{totalElecTotal} signalement{totalElecTotal !== 1 ? "s" : ""} au total</p>
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
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-500/70">Eau</p>
              <p className="font-display text-xl font-extrabold text-blue-500">
                {loading ? "..." : totalEauActifs} <span className="text-sm font-medium">en cours</span>
              </p>
              <p className="text-xs text-muted-foreground">{totalEauTotal} signalement{totalEauTotal !== 1 ? "s" : ""} au total</p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 text-blue-500/50 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-blue-500" />
          </button>
        </motion.div>

        {/* Stats Grid 2 colonnes sur grand écran */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
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
                className="rounded-2xl border border-border bg-card p-5 shadow-card flex flex-col justify-between"
              >
                <h2 className="font-display text-base font-bold text-foreground mb-3">Impact & Tendance</h2>
                <div className="grid grid-cols-3 gap-3">
                  {/* Taux de résolution */}
                  <div className="flex flex-col items-center text-center gap-1">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/10">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                    <p className="font-display text-2xl font-extrabold text-green-500">{resRate}%</p>
                    <p className="text-xs text-muted-foreground leading-tight">Taux de résolution</p>
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
                    <p className="text-xs text-muted-foreground leading-tight">Infra signalées</p>
                    <p className="text-xs text-muted-foreground">(caniveaux, routes…)</p>
                  </div>
                  {/* Tendance 7j */}
                  <div className="flex flex-col items-center text-center gap-1">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${delta > 0 ? "bg-red-500/10" : delta < 0 ? "bg-green-500/10" : "bg-muted"}`}>
                      <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                    </div>
                    <p className={`font-display text-2xl font-extrabold ${trendColor}`}>{impactStats.reports_last_7}</p>
                    <p className="text-xs text-muted-foreground leading-tight">Cette semaine</p>
                    <p className={`text-xs font-semibold ${trendColor}`}>{trendLabel}</p>
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
              className="rounded-2xl border border-border bg-card p-5 shadow-card flex flex-col justify-between"
            >
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4.5 w-4.5 text-muted-foreground" />
                <h2 className="font-display text-base font-bold text-foreground">Durée moyenne des coupures</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs font-semibold text-foreground">Électricité</span>
                  </div>
                  {elecDuration && elecDuration.total_resolved > 0 ? (
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1.5">
                        <p className="font-display text-xl font-extrabold text-amber-500">
                          {formatMinutes(elecDuration.avg_duration_minutes)}
                        </p>
                        <span className="text-[11px] text-muted-foreground">moyenne</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Max : {formatMinutes(elecDuration.longest_duration_minutes)} · {elecDuration.total_resolved} résolu{elecDuration.total_resolved > 1 ? "s" : ""}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Aucune donnée</p>
                  )}
                </div>
                <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-3.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Droplets className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs font-semibold text-foreground">Eau</span>
                  </div>
                  {waterDuration && waterDuration.total_resolved > 0 ? (
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1.5">
                        <p className="font-display text-xl font-extrabold text-blue-500">
                          {formatMinutes(waterDuration.avg_duration_minutes)}
                        </p>
                        <span className="text-[11px] text-muted-foreground">moyenne</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Max : {formatMinutes(waterDuration.longest_duration_minutes)} · {waterDuration.total_resolved} résolu{waterDuration.total_resolved > 1 ? "s" : ""}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Aucune donnée</p>
                  )}
                </div>
              </div>
            </motion.div>
          ) : null}
        </div>

        {/* Quartier grid */}
        <QuartierOutageGrid
          communeName={decodedName}
          stats={stats}
          loading={loading}
          couleur={couleur}
        />

        {/* Live Incident Reports Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-10 mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Signalements &amp; Pannes à {decodedName}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dossiers citoyens enregistrés et géolocalisés en temps réel
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/signaler?commune=${encodeURIComponent(decodedName)}`)}
              className="gap-1.5 rounded-xl text-xs font-bold border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
            >
              + Signaler à {decodedName}
            </Button>
          </div>

          {communeReports.length === 0 ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
              <ShieldCheck className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <h3 className="font-bold text-base text-foreground">Réseau stable à {decodedName}</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                Aucun incident actif n'a été signalé par les habitants dans cette commune au cours des dernières heures.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {communeReports.map((r) => {
                const isElec = r.service_type === "electricity";
                const isInfra = r.report_category === "infrastructure" || r.service_type === "mairie";
                const isActive = r.status === "active" || r.status === "open" || r.status === "in_progress";
                const timeAgo = formatDistanceToNow(new Date(r.start_time || r.created_at), {
                  addSuffix: true,
                  locale: fr,
                });

                return (
                  <div
                    key={r.id}
                    onClick={() => navigate(`/signalement/${r.id}`)}
                    className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-sm hover:border-primary/40 hover:bg-accent/20 transition-all cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          {isInfra ? (
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/15 text-orange-600 text-xs font-bold">
                              🏛️
                            </span>
                          ) : isElec ? (
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 text-xs font-bold">
                              ⚡
                            </span>
                          ) : (
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 text-xs font-bold">
                              💧
                            </span>
                          )}
                          <span className="text-xs font-bold text-foreground">
                            {isInfra ? "Voirie / Mairie" : isElec ? "Électricité (CIE)" : "Eau (SODECI)"}
                          </span>
                        </div>

                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[11px] font-extrabold",
                            isActive
                              ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          )}
                        >
                          {isActive ? "🔴 En cours" : "✅ Résolu"}
                        </span>
                      </div>

                      <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-primary shrink-0" />
                        <span>{r.resolvedQuartier || r.quartier || decodedName}</span>
                      </p>
                      {/* L'adresse de voirie précise n'est affichée publiquement que pour les infrastructures publiques (ex: nids de poule, lampadaires) */}
                      {isInfra && r.location && (
                        <p className="text-xs text-muted-foreground font-medium mt-1 line-clamp-1">
                          📍 {r.location}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground/90 line-clamp-2 mt-1.5 bg-muted/40 p-2 rounded-lg">
                        {cleanDescription(r.description) || (isInfra ? "Incident d'infrastructure signalé." : "Coupure de réseau signalée par les résidents.")}
                      </p>
                    </div>

                    <div className="mt-3.5 pt-2.5 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Débuté {timeAgo}</span>
                      {r.verifications > 0 ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          ✓ {r.verifications} confirmation{r.verifications > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">⏳ En attente de voisins</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default CommuneDetailPage;