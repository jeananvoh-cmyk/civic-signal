import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNE_COLORS, COMMUNES } from "@/lib/communes";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp, BarChart3, Zap, Droplets, Landmark, ArrowUpRight, ArrowDownRight,
  Minus, Target, ShieldCheck, Lightbulb, AlertTriangle, TrendingDown, MapPin, Activity,
  Sparkles, PlusCircle, Calendar, RefreshCw
} from "lucide-react";

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
  week: { label: "Semaine", days: 120, groupLabel: "semaine", format: (d) => `S${getWeekNumber(new Date(d))}` },
  month: { label: "Mois", days: 365, groupLabel: "mois", format: (d) => new Date(d).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }) },
  year: { label: "Année", days: 730, groupLabel: "année", format: (d) => new Date(d).getFullYear().toString() },
};

const SERVICE_CONFIG: Record<ServiceFilter, { label: string; color: string; icon: typeof Zap }> = {
  all: { label: "Tous services", color: "hsl(var(--primary))", icon: Target },
  electricity: { label: "CIE — Électricité", color: "#f59e0b", icon: Zap },
  water: { label: "SODECI — Eau", color: "#3b82f6", icon: Droplets },
  mairie: { label: "Mairie — Voirie & Infra", color: "#14b8a6", icon: Landmark },
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

// Simulated data for preview & presentation mode
const GENERATE_DEMO_DATA = (): TimeSeriesRow[] => {
  const communesList = ["Yopougon", "Abobo", "Cocody", "Koumassi", "Marcory", "Port-Bouët", "Treichville"];
  const servicesList = ["electricity", "water", "mairie"];
  const rows: TimeSeriesRow[] = [];
  const now = new Date();

  for (let i = 10; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 7 * 86400000).toISOString().split("T")[0];
    communesList.forEach((commune) => {
      servicesList.forEach((svc) => {
        const total = Math.floor(Math.random() * 8) + 2;
        const resolus = Math.floor(Math.random() * (total + 1));
        const actifs = total - resolus;
        rows.push({
          report_date: date,
          commune,
          service_type: svc,
          actifs,
          resolus,
          total,
        });
      });
    });
  }
  return rows;
};

interface TrendsChartProps {
  className?: string;
}

const TrendsChart = ({ className = "" }: TrendsChartProps) => {
  const [period, setPeriod] = useState<Period>("week");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [communeFilter, setCommuneFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>("all");
  const [useDemo, setUseDemo] = useState<boolean>(false);

  const config = PERIOD_CONFIG[period];

  // Primary RPC query with fallback to raw table query
  const { data: rawData = [], isLoading, refetch } = useQuery({
    queryKey: ["reports-time-series-enhanced", config.days, period],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc("get_reports_time_series", { p_days: config.days });
        if (!error && data && (data as any[]).length > 0) {
          return data as unknown as TimeSeriesRow[];
        }
      } catch (e) {
        console.warn("RPC failed, falling back to direct table fetch", e);
      }

      // Fallback: Query reports table directly
      const { data: directReports, error: tableError } = await supabase
        .from("reports")
        .select("created_at, commune, service_type, status");

      if (tableError || !directReports || directReports.length === 0) {
        return [];
      }

      const rowsMap = new Map<string, TimeSeriesRow>();
      directReports.forEach((r: any) => {
        const dateStr = r.created_at ? r.created_at.split("T")[0] : new Date().toISOString().split("T")[0];
        const key = `${dateStr}_${r.commune}_${r.service_type || "mairie"}`;
        const isResolved = r.status === "resolved" || r.status === "closed" || r.status === "auto_closed" || r.status === "presumed_resolved";

        if (!rowsMap.has(key)) {
          rowsMap.set(key, {
            report_date: dateStr,
            commune: r.commune || "Autre",
            service_type: r.service_type || "mairie",
            actifs: isResolved ? 0 : 1,
            resolus: isResolved ? 1 : 0,
            total: 1,
          });
        } else {
          const item = rowsMap.get(key)!;
          item.total += 1;
          if (isResolved) item.resolus += 1;
          else item.actifs += 1;
        }
      });

      return Array.from(rowsMap.values());
    },
  });

  const activeData = useMemo(() => {
    if (useDemo || (rawData.length === 0 && !isLoading)) {
      return GENERATE_DEMO_DATA();
    }
    return rawData;
  }, [useDemo, rawData, isLoading]);

  const isDemoActive = useDemo || (rawData.length === 0 && !isLoading);

  const communes = useMemo(() => COMMUNES.map((c) => c.nom).sort(), []);

  const chartData = useMemo(() => {
    let filtered = activeData;
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
  }, [activeData, period, communeFilter, serviceFilter, config]);

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
    let filtered = activeData;
    if (serviceFilter !== "all") filtered = filtered.filter((r) => r.service_type === serviceFilter);

    const communeTotals = new Map<string, number>();
    for (const row of filtered) {
      communeTotals.set(row.commune, (communeTotals.get(row.commune) || 0) + row.total);
    }
    return Array.from(communeTotals.entries())
      .map(([commune, total]) => ({ commune, total, color: COMMUNE_COLORS[commune] || "#888" }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);
  }, [activeData, communeFilter, serviceFilter]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-border bg-card p-6 shadow-card relative overflow-hidden ${className}`}
    >
      {/* Indicator when demo mode is active */}
      {isDemoActive && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500 animate-pulse shrink-0" />
            <span>
              <strong>Mode Simulation Prédictive (Abidjan)</strong> — Données de démonstration activées pour la prise de décision.
            </span>
          </div>
          {rawData.length > 0 && (
            <button
              onClick={() => setUseDemo(false)}
              className="font-bold underline hover:text-amber-900 text-[11px] shrink-0"
            >
              Afficher données réelles ({rawData.length})
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground">Tendances & Analyse Décisionnelle</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-10">
            Analyse comparative de l'évolution des signalements et réactivité terrain
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Service filter */}
          <Select value={serviceFilter} onValueChange={(v) => setServiceFilter(v as ServiceFilter)}>
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SERVICE_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-1.5">
                    <cfg.icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                    {cfg.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Commune filter */}
          <Select value={communeFilter} onValueChange={setCommuneFilter}>
            <SelectTrigger className="w-[170px] h-9 text-xs">
              <SelectValue placeholder="Toutes communes" />
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
          <div className="flex rounded-lg border border-border overflow-hidden bg-muted/30 p-0.5">
            <button
              onClick={() => setChartType("area")}
              className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors ${chartType === "area" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
              title="Vue Courbe"
            >
              <TrendingUp className="h-4 w-4" />
            </button>
            <button
              onClick={() => setChartType("bar")}
              className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors ${chartType === "bar" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
              title="Vue Histogramme"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Period tabs */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)} className="mb-5">
        <TabsList className="grid w-full grid-cols-4 bg-muted/40 p-1">
          {(Object.keys(PERIOD_CONFIG) as Period[]).map((p) => (
            <TabsTrigger key={p} value={p} className="text-xs font-semibold">
              {PERIOD_CONFIG[p].label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl bg-muted/40 border border-border/70 p-3.5 text-center">
          <p className="font-display text-2xl font-extrabold text-foreground">{totalPeriod}</p>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Total signalements</p>
        </div>
        <div className="rounded-xl bg-muted/40 border border-border/70 p-3.5 text-center">
          <p className="font-display text-2xl font-extrabold text-destructive">{totalActifs}</p>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">En cours</p>
        </div>
        <div className="rounded-xl bg-muted/40 border border-border/70 p-3.5 text-center">
          <p className="font-display text-2xl font-extrabold text-emerald-500">{totalResolus}</p>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Résolus</p>
        </div>
        <div className="rounded-xl bg-muted/40 border border-border/70 p-3.5 text-center">
          <div className="flex items-center justify-center gap-1">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <p className="font-display text-2xl font-extrabold text-foreground">{resolutionRate}%</p>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Taux résolution</p>
        </div>
        <div className="rounded-xl bg-muted/40 border border-border/70 p-3.5 text-center">
          <div className="flex items-center justify-center gap-1">
            {trend > 5 ? (
              <ArrowUpRight className="h-4 w-4 text-destructive shrink-0" />
            ) : trend < -5 ? (
              <ArrowDownRight className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
              <Minus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <p className="font-display text-2xl font-extrabold text-foreground">{avgPerPeriod}</p>
          </div>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
            Moy/{config.groupLabel}
            {trend !== 0 && (
              <span className={`ml-1 font-bold ${trend > 5 ? "text-destructive" : trend < -5 ? "text-emerald-500" : ""}`}>
                ({trend > 0 ? "+" : ""}{trend}%)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Chart Render */}
      {isLoading ? (
        <div className="flex h-[280px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed border-border bg-muted/20 text-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <h4 className="text-base font-bold text-foreground mb-1">Aucun signalement enregistré sur cette période</h4>
          <p className="text-xs text-muted-foreground max-w-md mb-4">
            Ajustez le filtre de période ou activez le mode démo pour visualiser la puissance d'analyse décisionnelle.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setPeriod("year")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold hover:bg-muted"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Voir tout l'historique (1 an)</span>
            </button>
            <button
              onClick={() => setUseDemo(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Activer la Simulation Abidjan</span>
            </button>
            <Link
              to="/signalement"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-primary/30 text-primary text-xs font-bold hover:bg-primary/10"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Créer un signalement</span>
            </Link>
          </div>
        </div>
      ) : chartType === "area" ? (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gradActifs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
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
            <Area type="monotone" dataKey="actifs" name="🔴 En cours (Non résolus)" stroke="hsl(var(--destructive))" fill="url(#gradActifs)" strokeWidth={2} />
            <Area type="monotone" dataKey="resolus" name="✅ Résolus" stroke="hsl(var(--success))" fill="url(#gradResolus2)" strokeWidth={2} />
          </AreaChart>
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
            <Bar dataKey="actifs" name="🔴 En cours (non résolus)" fill="hsl(var(--destructive))" stackId="status" radius={[0, 0, 0, 0]} />
            <Bar dataKey="resolus" name="✅ Résolus" fill="hsl(var(--success))" stackId="status" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Commune breakdown mini-bar */}
      {communeBarData.length > 0 && !isLoading && (
        <div className="mt-6 pt-5 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-foreground uppercase tracking-wider">Pression par Commune (Top 7 Abidjan)</p>
            <span className="text-[11px] text-muted-foreground">Volume d'incidents signalés</span>
          </div>
          <div className="space-y-2.5">
            {communeBarData.map((c) => {
              const maxVal = communeBarData[0]?.total || 1;
              const pct = Math.round((c.total / maxVal) * 100);
              return (
                <div key={c.commune} className="flex items-center gap-3">
                  <span className="text-xs font-semibold w-24 truncate text-foreground">{c.commune}</span>
                  <div className="flex-1 h-4 rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: c.color }}
                    />
                  </div>
                  <span className="text-xs font-bold text-foreground w-10 text-right">{c.total} cas</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Insights automatiques IA ── */}
      {!isLoading && totalPeriod > 0 && (() => {
        const insights: { icon: typeof Lightbulb; color: string; title: string; text: string; type: "warning" | "success" | "info" }[] = [];

        if (chartData.length >= 3) {
          const peak = chartData.reduce((max, d) => d.total > max.total ? d : max, chartData[0]);
          if (peak.total > avgPerPeriod * 1.3) {
            insights.push({
              icon: Activity,
              color: "text-destructive",
              type: "warning",
              title: `Pic de signalements décelé : ${peak.label}`,
              text: `${peak.total} incidents enregistrés (${Math.round((peak.total / avgPerPeriod - 1) * 100)}% de plus que la moyenne). Déploiement recommandé d'équipes de diagnostic terrain.`,
            });
          }
        }

        if (trend > 15) {
          insights.push({
            icon: TrendingUp,
            color: "text-destructive",
            type: "warning",
            title: `Tendance à la hausse (+${trend}%)`,
            text: `Augmentation significative des alertes sur la 2ème moitié de la période. Renforcer la coordination avec les concessionnaires (CIE / SODECI).`,
          });
        } else if (trend < -15) {
          insights.push({
            icon: TrendingDown,
            color: "text-emerald-500",
            type: "success",
            title: `Tendance à la baisse (${trend}%)`,
            text: `Diminution constante des pannes signalées. Les actions de maintenance récente portent leurs fruits.`,
          });
        }

        if (resolutionRate < 40 && totalPeriod >= 3) {
          insights.push({
            icon: AlertTriangle,
            color: "text-destructive",
            type: "warning",
            title: `Alerte SLA : Taux de résolution de ${resolutionRate}%`,
            text: `${totalActifs} signalements restent en souffrance sur ${totalPeriod}. Mobiliser en priorité les équipes sur les dossiers les plus anciens.`,
          });
        } else if (resolutionRate >= 70) {
          insights.push({
            icon: ShieldCheck,
            color: "text-emerald-500",
            type: "success",
            title: `Excellent niveau de résolution : ${resolutionRate}%`,
            text: `${totalResolus} dossiers résolus avec succès. Très bonne réactivité des services partenaires.`,
          });
        }

        if (insights.length === 0) return null;

        const typeStyles = {
          warning: "border-l-destructive/80 bg-destructive/5",
          success: "border-l-emerald-500/80 bg-emerald-500/5",
          info: "border-l-amber-500/80 bg-amber-500/5",
        };

        return (
          <div className="mt-6 pt-5 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <p className="text-xs font-bold text-foreground uppercase tracking-wider">Recommandations Décisionnelles (Module Intelligente)</p>
            </div>
            <div className="space-y-2.5">
              {insights.map((insight, i) => (
                <div key={i} className={`rounded-xl border-l-4 p-3.5 ${typeStyles[insight.type]}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <insight.icon className={`h-4 w-4 shrink-0 ${insight.color}`} />
                    <p className="text-xs font-bold text-foreground">{insight.title}</p>
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
