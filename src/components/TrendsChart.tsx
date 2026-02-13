import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNE_COLORS } from "@/lib/communes";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, TrendingUp, BarChart3 } from "lucide-react";

type Period = "day" | "week" | "month" | "year";
type ChartType = "area" | "bar";

interface TimeSeriesRow {
  report_date: string;
  commune: string;
  service_type: string;
  actifs: number;
  resolus: number;
  total: number;
}

const PERIOD_CONFIG: Record<Period, { label: string; days: number; format: (d: string) => string }> = {
  day: { label: "Jour", days: 30, format: (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) },
  week: { label: "Semaine", days: 90, format: (d) => `S${getWeekNumber(new Date(d))}` },
  month: { label: "Mois", days: 365, format: (d) => new Date(d).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }) },
  year: { label: "Année", days: 1825, format: (d) => new Date(d).getFullYear().toString() },
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
  const [period, setPeriod] = useState<Period>("day");
  const [chartType, setChartType] = useState<ChartType>("area");
  const [communeFilter, setCommuneFilter] = useState<string>("all");

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
    const filtered = communeFilter === "all" ? rawData : rawData.filter((r) => r.commune === communeFilter);

    // Group by period
    const groups = new Map<string, { total: number; actifs: number; resolus: number; [key: string]: number }>();

    for (const row of filtered) {
      const key = getGroupKey(row.report_date, period);
      const existing = groups.get(key) || { total: 0, actifs: 0, resolus: 0 };
      existing.total += row.total;
      existing.actifs += row.actifs;
      existing.resolus += row.resolus;
      // Per-commune breakdown
      const cKey = `c_${row.commune}`;
      existing[cKey] = (existing[cKey] || 0) + row.total;
      groups.set(key, existing);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date,
        label: config.format(date),
        ...values,
      }));
  }, [rawData, period, communeFilter, config]);

  // Summary stats
  const totalPeriod = chartData.reduce((s, d) => s + d.total, 0);
  const totalActifs = chartData.reduce((s, d) => s + d.actifs, 0);
  const totalResolus = chartData.reduce((s, d) => s + d.resolus, 0);
  const avgPerPeriod = chartData.length > 0 ? (totalPeriod / chartData.length).toFixed(1) : "0";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border border-border bg-card p-5 shadow-card ${className}`}
    >
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg font-bold text-foreground">Tendances</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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

      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="font-display text-xl font-bold text-foreground">{totalPeriod}</p>
          <p className="text-[10px] text-muted-foreground">Total signalements</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="font-display text-xl font-bold text-primary">{totalActifs}</p>
          <p className="text-[10px] text-muted-foreground">Actifs</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="font-display text-xl font-bold text-success">{totalResolus}</p>
          <p className="text-[10px] text-muted-foreground">Résolus</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="font-display text-xl font-bold text-foreground">{avgPerPeriod}</p>
          <p className="text-[10px] text-muted-foreground">Moy/{PERIOD_CONFIG[period].label.toLowerCase()}</p>
        </div>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="flex h-[250px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
          Aucune donnée pour cette période
        </div>
      ) : chartType === "area" ? (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradResolus" x1="0" y1="0" x2="0" y2="1">
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
            <Area type="monotone" dataKey="total" name="Total" stroke="hsl(var(--primary))" fill="url(#gradTotal)" strokeWidth={2} />
            <Area type="monotone" dataKey="resolus" name="Résolus" stroke="hsl(var(--success))" fill="url(#gradResolus)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
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
            <Bar dataKey="actifs" name="Actifs" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="resolus" name="Résolus" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
};

export default TrendsChart;
