import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNE_COLORS } from "@/lib/communes";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, BarChart3, Zap, Droplets, Construction, ArrowUpRight, ArrowDownRight, Minus, Target, ShieldCheck, Lightbulb, AlertTriangle, TrendingDown, MapPin, Activity } from "lucide-react";

type Period = "day" | "week" | "month" | "year";
type ChartType = "area" | "bar";
type ServiceFilter = "all" | "electricity" | "water" | "mairie";

interface TimeSeriesRow {
  report_date: string;
  commune: string;
  service_type: string;
  actifs: number;
  resolus: number;
  total: number;
}

const PERIOD_CONFIG: Record<Period, { label: string; days: number; format: (d: string) => string; groupLabel: string }> = {
  day: { label: "Jour", days: 30, groupLabel: "jour", format: (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) },
  week: { label: "Semaine", days: 90, groupLabel: "semaine", format: (d) => `S${getWeekNumber(new Date(d))}` },
  month: { label: "Mois", days: 365, groupLabel: "mois", format: (d) => new Date(d).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }) },
  year: { label: "Année", days: 365, groupLabel: "année", format: (d) => new Date(d).getFullYear().toString() },
};

const SERVICE_CONFIG: Record<ServiceFilter, { label: string; color: string; icon: typeof Zap }> = {
  all: { label: "Tous services", color: "hsl(var(--primary))", icon: Target },
  electricity: { label: "CIE — Électricité", color: "#f59e0b", icon: Zap },
  water: { label: "SODECI — Eau", color: "#3b82f6", icon: Droplets },
  mairie: { label: "Mairie — Voirie & Infra", color: "#14b8a6", icon: Construction },
};

function getWeekNumber(d: Date): number {
  const oneJan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
}

function getGroupKey(date: string, period: Period): string {
  const d = new Date(date);
  if (period === "day") return date;
  if (period === "week") {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split("T")[0];
  }
  if (period === "month") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  return `${d.getFullYear()}-01-01`;
}

interface TrendsChartProps {
  className?: string;
}

const TrendsChart = ({ className = "" }: TrendsChartProps) => {
  const [period, setPeriod] = useState<Period>("week");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [communeFilter, setCommuneFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>("all");

  const config = PERIOD_CONFIG[period];

  const { data: rawData = [], isLoading } = useQuery({
    queryKey: ["reports-time-series", config.days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_reports_time_series", { p_days: config.days });
      if (error) throw error;
      return data as unknown as TimeSeriesRow[];
    },
  });

  const communes = useMemo(() => {
    const set = new Set(rawData.map((r) => r.commune));
    return Array.from(set).sort();
  }, [rawData]);

  const chartData = useMemo(() => {
    let filtered = rawData;
    if (communeFilter !== "all") filtered = filtered.filter((r) => r.commune === communeFilter);
    if (serviceFilter !== "all") filtered = filtered.filter((r) => r.service_type === serviceFilter);

    const groups = new Map<string, { total: number; actifs: number; resolus: number; elec: number; eau: number; mairie: number }>();

    for (const row of filtered) {
      const key = getGroupKey(row.report_date, period);
      const existing = groups.get(key) || { total: 0, actifs: 0, resolus: 0, elec: 0, eau: 0, mairie: 0 };
      existing.total += row.total;
      existing.actifs += row.actifs;
      existing.resolus += row.resolus;
      if (row.service_type === "electricity") existing.elec += row.total;
      else if (row.service_type === "water") existing.eau += row.total;
      else if (row.service_type === "mairie") existing.mairie += row.total;
      groups.set(key, existing);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date,
        label: config.format(date),
        ...values,
        tauxResolution: values.total > 0 ? Math.round((values.resolus / values.total) * 100) : 0,
      }));
  }, [rawData, period, communeFilter, serviceFilter, config]);

  // Summary stats
  const totalPeriod = chartData.reduce((s, d) => s + d.total, 0);
  const totalActifs = chartData.reduce((s, d) => s + d.actifs, 0);
  const totalResolus = chartData.reduce((s, d) => s + d.resolus, 0);
  const resolutionRate = totalPeriod > 0 ? Math.round((totalResolus / totalPeriod) * 100) : 0;
  const avgPerPeriod = chartData.length > 0 ? Math.round(totalPeriod / chartData.length) : 0;

  // Trend: compare last half vs first half
  const midIdx = Math.floor(chartData.length / 2);
  const firstHalf = chartData.slice(0, midIdx);
  const secondHalf = chartData.slice(midIdx);
  const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((s, d) => s + d.total, 0) / firstHalf.length : 0;
  const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((s, d) => s + d.total, 0) / secondHalf.length : 0;
  const trend = firstHalfAvg > 0 ? Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100) : 0;

  // Per-commune bar data for stacked view
  const communeBarData = useMemo(() => {
    if (communeFilter !== "all") return [];
    let filtered = rawData;
    if (serviceFilter !== "all") filtered = filtered.filter((r) => r.service_type === serviceFilter);

    const communeTotals = new Map<string, number>();
    for (const row of filtered) {
      communeTotals.set(row.commune, (communeTotals.get(row.commune) || 0) + row.total);
    }
    return Array.from(communeTotals.entries())
      .map(([commune, total]) => ({ commune, total, color: COMMUNE_COLORS[commune] || "#888" }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);
  }, [rawData, communeFilter, serviceFilter]);

  const svcColor = SERVICE_CONFIG[serviceFilter].color;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border border-border bg-card p-5 shadow-card ${className}`}
    >
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-bold text-foreground">Tendances & Analyse</h3>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 ml-7">
            Évolution des signalements pour orienter les interventions terrain
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Service filter */}
          <Select value={serviceFilter} onValueChange={(v) => setServiceFilter(v as ServiceFilter)}>
            <SelectTrigger className="w-[170px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SERVICE_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-1.5">
                    <cfg.icon className="h-3 w-3" style={{ color: cfg.color }} />
                    {cfg.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Commune filter */}
          <Select value={communeFilter} onValueChange={setCommuneFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes communes</SelectItem>
              {communes.map((c) => (
                <SelectItem key={c} value={c}>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COMMUNE_COLORS[c] }} />
                    {c}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Chart type toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setChartType("area")}
              className={`px-2 py-1 text-xs ${chartType === "area" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setChartType("bar")}
              className={`px-2 py-1 text-xs ${chartType === "bar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Period tabs */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)} className="mb-4">
        <TabsList className="grid w-full grid-cols-4">
          {(Object.keys(PERIOD_CONFIG) as Period[]).map((p) => (
            <TabsTrigger key={p} value={p} className="text-xs">
              {PERIOD_CONFIG[p].label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* KPI cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-lg bg-muted/50 border border-border p-3 text-center">
          <p className="font-display text-2xl font-extrabold text-foreground">{totalPeriod}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Total signalements</p>
        </div>
        <div className="rounded-lg bg-muted/50 border border-border p-3 text-center">
          <p className="font-display text-2xl font-extrabold text-destructive">{totalActifs}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Non résolus</p>
        </div>
        <div className="rounded-lg bg-muted/50 border border-border p-3 text-center">
          <p className="font-display text-2xl font-extrabold text-emerald-500">{totalResolus}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Résolus</p>
        </div>
        <div className="rounded-lg bg-muted/50 border border-border p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <p className="font-display text-2xl font-extrabold text-foreground">{resolutionRate}%</p>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium">Taux résolution</p>
        </div>
        <div className="rounded-lg bg-muted/50 border border-border p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            {trend > 5 ? (
              <ArrowUpRight className="h-4 w-4 text-destructive" />
            ) : trend < -5 ? (
              <ArrowDownRight className="h-4 w-4 text-emerald-500" />
            ) : (
              <Minus className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <p className="font-display text-2xl font-extrabold text-foreground">{avgPerPeriod}</p>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium">
            Moy/{config.groupLabel}
            {trend !== 0 && (
              <span className={`ml-1 ${trend > 5 ? "text-destructive" : trend < -5 ? "text-emerald-500" : ""}`}>
                ({trend > 0 ? "+" : ""}{trend}%)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="flex h-[280px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
          Aucune donnée pour cette période
        </div>
      ) : chartType === "area" ? (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gradTotal2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={svcColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={svcColor} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradResolus2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            <Area type="monotone" dataKey="total" name="Total" stroke={svcColor} fill="url(#gradTotal2)" strokeWidth={2} />
            <Area type="monotone" dataKey="resolus" name="Résolus" stroke="hsl(var(--success))" fill="url(#gradResolus2)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      ) : serviceFilter === "all" && communeFilter === "all" ? (
        /* Stacked bar by service type */
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            <Bar dataKey="elec" name="⚡ CIE" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
            <Bar dataKey="eau" name="💧 SODECI" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="mairie" name="🏗️ Mairie" stackId="a" fill="#14b8a6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            <Bar dataKey="actifs" name="Non résolus" fill={svcColor} radius={[4, 4, 0, 0]} />
            <Bar dataKey="resolus" name="Résolus" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Commune breakdown mini-bar (when viewing all communes) */}
      {communeBarData.length > 0 && !isLoading && (
        <div className="mt-5 pt-4 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-3">Répartition par commune</p>
          <div className="space-y-2">
            {communeBarData.map((c) => {
              const maxVal = communeBarData[0]?.total || 1;
              const pct = Math.round((c.total / maxVal) * 100);
              return (
                <div key={c.commune} className="flex items-center gap-3">
                  <span className="text-xs font-semibold w-24 truncate" style={{ color: c.color }}>{c.commune}</span>
                  <div className="flex-1 h-5 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: c.color }}
                    />
                  </div>
                  <span className="text-xs font-bold text-foreground w-8 text-right">{c.total}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Insights automatiques ── */}
      {!isLoading && totalPeriod > 0 && (() => {
        const insights: { icon: typeof Lightbulb; color: string; title: string; text: string; type: "warning" | "success" | "info" }[] = [];

        // 1. Peak detection — find the period with highest total
        if (chartData.length >= 3) {
          const peak = chartData.reduce((max, d) => d.total > max.total ? d : max, chartData[0]);
          if (peak.total > avgPerPeriod * 1.5) {
            insights.push({
              icon: Activity,
              color: "text-destructive",
              type: "warning",
              title: `Pic détecté : ${peak.label}`,
              text: `${peak.total} signalements enregistrés (${Math.round((peak.total / avgPerPeriod - 1) * 100)}% au-dessus de la moyenne). Investiguer les causes possibles sur cette période.`,
            });
          }
        }

        // 2. Trend direction
        if (trend > 15) {
          insights.push({
            icon: TrendingUp,
            color: "text-destructive",
            type: "warning",
            title: `Tendance à la hausse (+${trend}%)`,
            text: `Les signalements augmentent significativement. La 2ème moitié de la période montre une moyenne de ${Math.round(secondHalfAvg)} signalements/${config.groupLabel} contre ${Math.round(firstHalfAvg)} précédemment. Renforcer les équipes d'intervention.`,
          });
        } else if (trend < -15) {
          insights.push({
            icon: TrendingDown,
            color: "text-emerald-500",
            type: "success",
            title: `Tendance à la baisse (${trend}%)`,
            text: `Bonne nouvelle : les signalements diminuent. Les interventions récentes semblent porter leurs fruits. Maintenir les efforts actuels.`,
          });
        }

        // 3. Resolution rate analysis
        if (resolutionRate < 30 && totalPeriod >= 5) {
          insights.push({
            icon: AlertTriangle,
            color: "text-destructive",
            type: "warning",
            title: `Taux de résolution critique : ${resolutionRate}%`,
            text: `Seulement ${totalResolus} signalements résolus sur ${totalPeriod}. ${totalActifs} restent actifs. Prioriser les dossiers les plus anciens et mobiliser des ressources supplémentaires.`,
          });
        } else if (resolutionRate >= 70) {
          insights.push({
            icon: ShieldCheck,
            color: "text-emerald-500",
            type: "success",
            title: `Excellent taux de résolution : ${resolutionRate}%`,
            text: `${totalResolus} signalements résolus sur ${totalPeriod}. Les équipes de terrain sont efficaces. Capitaliser sur ces bonnes pratiques.`,
          });
        } else if (resolutionRate >= 30 && resolutionRate < 70 && totalPeriod >= 5) {
          insights.push({
            icon: Target,
            color: "text-amber-500",
            type: "info",
            title: `Taux de résolution moyen : ${resolutionRate}%`,
            text: `${totalActifs} signalements restent non résolus. Objectif : atteindre 70% de résolution pour assurer la satisfaction des usagers.`,
          });
        }

        // 4. Top commune critique
        if (communeBarData.length > 0 && communeFilter === "all") {
          const top = communeBarData[0];
          const topPct = totalPeriod > 0 ? Math.round((top.total / totalPeriod) * 100) : 0;
          if (topPct >= 30) {
            insights.push({
              icon: MapPin,
              color: "text-amber-500",
              type: "warning",
              title: `${top.commune} concentre ${topPct}% des signalements`,
              text: `Avec ${top.total} signalements, cette commune nécessite une attention prioritaire. Envisager un déploiement ciblé d'équipes d'intervention et une coordination renforcée avec les autorités locales.`,
            });
          }
        }

        // 5. No unresolved = great
        if (totalActifs === 0 && totalResolus > 0) {
          insights.push({
            icon: ShieldCheck,
            color: "text-emerald-500",
            type: "success",
            title: "Tous les signalements sont résolus",
            text: `${totalResolus} signalements traités avec succès sur cette période. Aucun dossier en attente.`,
          });
        }

        if (insights.length === 0) return null;

        const typeStyles = {
          warning: "border-l-destructive/60 bg-destructive/5",
          success: "border-l-emerald-500/60 bg-emerald-500/5",
          info: "border-l-amber-500/60 bg-amber-500/5",
        };

        return (
          <div className="mt-5 pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-bold text-foreground">Insights & Recommandations</p>
              <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">Auto-détecté</span>
            </div>
            <div className="space-y-2.5">
              {insights.map((insight, i) => (
                <div key={i} className={`rounded-lg border-l-4 p-3 ${typeStyles[insight.type]}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <insight.icon className={`h-4 w-4 shrink-0 ${insight.color}`} />
                    <p className="text-sm font-bold text-foreground">{insight.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed ml-6">{insight.text}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </motion.div>
  );
};

export default TrendsChart;
