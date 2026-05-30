import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, CheckCircle2, Clock, Users, TrendingUp,
  Zap, Droplets, MapPin, Loader2, Shield, AlertTriangle,
} from "lucide-react";
import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNE_COLORS } from "@/lib/communes";
import { usePageMeta } from "@/hooks/usePageMeta";

interface TransparencyStats {
  total_reports: number;
  total_resolved: number;
  total_users: number;
  resolution_rate: number;
  avg_resolution_hours: Record<string, number> | null;
  by_commune: Array<{
    commune: string;
    total: number;
    resolved: number;
    resolution_rate: number;
  }>;
  monthly: Array<{
    month: string;
    total: number;
    resolved: number;
  }>;
  top_communes: Array<{
    commune: string;
    actifs: number;
    total: number;
  }>;
}

const fmtHours = (h: number) => {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 24) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} j`;
};

const fmtMonth = (m: string) => {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
};

const KpiCard = ({
  icon, label, value, sub, color = "text-primary",
}: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string;
}) => (
  <div className="rounded-2xl border border-border bg-card shadow-card p-5 flex gap-4 items-start">
    <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-extrabold text-foreground mt-0.5">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  </div>
);

const TransparencyPage = () => {
  const [stats, setStats] = useState<TransparencyStats | null>(null);
  const [loading, setLoading] = useState(true);

  usePageMeta({
    title: "Transparence",
    description: "Statistiques publiques des signalements citoyens à Abidjan : taux de résolution, délais, communes les plus touchées.",
  });

  const [chronicCount, setChronicCount] = useState<number>(0);
  const [chronicByCommune, setChronicByCommune] = useState<Array<{ commune: string; count: number }>>([]);

  useEffect(() => {
    supabase.rpc("get_transparency_stats" as any).then(({ data }) => {
      if (data) setStats(data as TransparencyStats);
      setLoading(false);
    });

    // Fetch chronic reports
    supabase
      .from("reports")
      .select("commune")
      .eq("status", "chronic")
      .then(({ data }) => {
        if (!data) return;
        setChronicCount(data.length);
        const byCommune: Record<string, number> = {};
        data.forEach((r: any) => {
          byCommune[r.commune] = (byCommune[r.commune] || 0) + 1;
        });
        setChronicByCommune(
          Object.entries(byCommune)
            .map(([commune, count]) => ({ commune, count }))
            .sort((a, b) => b.count - a.count)
        );
      });
  }, []);

  const maxMonthly = stats?.monthly
    ? Math.max(...stats.monthly.map((m) => m.total), 1)
    : 1;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-4xl py-10 space-y-10">

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Données publiques</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-foreground">
            Transparence &amp; Impact
          </h1>
          <p className="mt-2 text-muted-foreground max-w-xl">
            Chiffres mis à jour en temps réel sur les signalements citoyens, le taux de résolution
            et la réactivité des opérateurs sur les 7 communes pilotes d'Abidjan.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !stats ? (
          <p className="text-center text-muted-foreground py-16">Données indisponibles.</p>
        ) : (
          <>
            {/* KPIs globaux */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <KpiCard
                icon={<BarChart3 className="h-5 w-5" />}
                label="Signalements totaux"
                value={stats.total_reports.toLocaleString("fr-FR")}
              />
              <KpiCard
                icon={<CheckCircle2 className="h-5 w-5" />}
                label="Taux de résolution"
                value={`${stats.resolution_rate} %`}
                sub={`${stats.total_resolved.toLocaleString("fr-FR")} résolus`}
                color="text-green-600"
              />
              <KpiCard
                icon={<Clock className="h-5 w-5" />}
                label="Délai moyen élec."
                value={stats.avg_resolution_hours?.electricity
                  ? fmtHours(stats.avg_resolution_hours.electricity)
                  : "–"}
                sub="De la déclaration à la résolution"
                color="text-yellow-600"
              />
              <KpiCard
                icon={<Users className="h-5 w-5" />}
                label="Citoyens actifs"
                value={stats.total_users.toLocaleString("fr-FR")}
                color="text-violet-600"
              />
            </motion.div>

            {/* Délai de résolution par service */}
            {stats.avg_resolution_hours && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14 }}
                className="rounded-2xl border border-border bg-card shadow-card p-6"
              >
                <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> Délai moyen de résolution par service
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {Object.entries(stats.avg_resolution_hours).map(([svc, h]) => (
                    <div key={svc} className="flex items-center gap-3 rounded-xl bg-muted/50 p-4">
                      {svc === "electricity"
                        ? <Zap className="h-5 w-5 text-yellow-500 shrink-0" />
                        : <Droplets className="h-5 w-5 text-sky-500 shrink-0" />}
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {svc === "electricity" ? "Électricité" : svc === "water" ? "Eau" : "Infrastructure"}
                        </p>
                        <p className="text-xl font-bold text-foreground">{fmtHours(h)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Taux de résolution par commune */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="rounded-2xl border border-border bg-card shadow-card p-6"
            >
              <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Résolution par commune
              </h2>
              <div className="space-y-3">
                {[...(stats.by_commune ?? [])]
                  .sort((a, b) => b.total - a.total)
                  .map((c) => {
                    const color = COMMUNE_COLORS[c.commune] || "#888";
                    const pct = c.resolution_rate;
                    return (
                      <div key={c.commune}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-sm font-medium text-foreground">{c.commune}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{c.total} signalements</span>
                            <span className="font-semibold text-foreground">{pct} %</span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </motion.div>

            {/* Podium communes — classement mensuel */}
            {stats.by_commune && stats.by_commune.length >= 3 && (() => {
              const sorted = [...stats.by_commune].sort((a, b) => b.resolution_rate - a.resolution_rate);
              const medals = ["🥇", "🥈", "🥉"];
              return (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.19 }}
                  className="rounded-2xl border border-border bg-card shadow-card p-6"
                >
                  <h2 className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> Classement — meilleures communes
                  </h2>
                  <p className="text-xs text-muted-foreground mb-5">Communes avec le meilleur taux de résolution des signalements</p>
                  {/* Podium visuel — top 3 */}
                  <div className="flex items-end justify-center gap-3 mb-6">
                    {[sorted[1], sorted[0], sorted[2]].map((c, pos) => {
                      if (!c) return null;
                      const heights = ["h-20", "h-28", "h-16"];
                      const rank = pos === 1 ? 0 : pos === 0 ? 1 : 2;
                      const color = COMMUNE_COLORS[c.commune] || "#888";
                      return (
                        <div key={c.commune} className="flex flex-col items-center gap-1">
                          <span className="text-xl">{medals[rank]}</span>
                          <p className="text-xs font-bold text-foreground text-center max-w-[72px] truncate">{c.commune}</p>
                          <p className="text-xs font-semibold" style={{ color }}>{c.resolution_rate}%</p>
                          <div
                            className={`w-16 ${heights[pos]} rounded-t-xl flex items-end justify-center pb-2`}
                            style={{ backgroundColor: color + "30", border: `2px solid ${color}40` }}
                          >
                            <span className="text-lg font-extrabold" style={{ color }}>{rank + 1}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Reste du classement */}
                  <div className="space-y-2">
                    {sorted.slice(3).map((c, i) => {
                      const color = COMMUNE_COLORS[c.commune] || "#888";
                      return (
                        <div key={c.commune} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-semibold w-4">{i + 4}</span>
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="font-medium text-foreground">{c.commune}</span>
                          </div>
                          <span className="font-semibold text-foreground">{c.resolution_rate}%</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })()}

            {/* Problèmes chroniques */}
            {chronicCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.21 }}
                className="rounded-2xl border-2 border-violet-500/30 bg-violet-500/5 p-6"
              >
                <h2 className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-violet-600" />
                  Problèmes chroniques — sans résolution depuis +14 jours
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Ces signalements n'ont reçu aucune intervention depuis plus de 2 semaines.
                  Ils restent visibles pour maintenir la pression sur les opérateurs.
                </p>
                <div className="flex items-center gap-4 mb-4">
                  <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 px-4 py-3 text-center">
                    <p className="text-3xl font-extrabold text-violet-700">{chronicCount}</p>
                    <p className="text-xs text-violet-600 mt-0.5">problème{chronicCount > 1 ? "s" : ""} chronique{chronicCount > 1 ? "s" : ""}</p>
                  </div>
                </div>
                {chronicByCommune.length > 0 && (
                  <div className="space-y-2">
                    {chronicByCommune.slice(0, 5).map((c) => {
                      const color = COMMUNE_COLORS[c.commune] || "#7c3aed";
                      return (
                        <div key={c.commune} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="font-medium text-foreground">{c.commune}</span>
                          </div>
                          <span className="text-xs font-semibold text-violet-700 bg-violet-500/10 rounded-full px-2 py-0.5">
                            {c.count} chronique{c.count > 1 ? "s" : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* SLA Opérateurs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.215 }}
              className="rounded-2xl border border-border bg-card shadow-card p-6"
            >
              <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> SLA Opérateurs — objectifs de réactivité
              </h2>
              <div className="space-y-3">
                {[
                  {
                    label: "CIE — Coupure électricité",
                    icon: <Zap className="h-4 w-4 text-yellow-500" />,
                    target: 24,
                    actual: stats?.avg_resolution_hours?.electricity ?? null,
                  },
                  {
                    label: "SODECI — Coupure eau",
                    icon: <Droplets className="h-4 w-4 text-sky-500" />,
                    target: 48,
                    actual: stats?.avg_resolution_hours?.water ?? null,
                  },
                  {
                    label: "Mairie — Infrastructure",
                    icon: <MapPin className="h-4 w-4 text-emerald-500" />,
                    target: 72,
                    actual: stats?.avg_resolution_hours?.infrastructure ?? null,
                  },
                ].map((row) => {
                  const ok = row.actual !== null && row.actual <= row.target;
                  const badge = row.actual === null ? "–" : ok ? "✅ Dans les délais" : "⚠️ Hors délai";
                  const badgeClass = row.actual === null
                    ? "text-muted-foreground"
                    : ok ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                    : "text-amber-600 bg-amber-500/10 border-amber-500/20";
                  return (
                    <div key={row.label} className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-4 py-3">
                      <div className="flex items-center gap-2">
                        {row.icon}
                        <div>
                          <p className="text-sm font-medium text-foreground">{row.label}</p>
                          <p className="text-xs text-muted-foreground">Objectif : &lt; {row.target}h</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">
                          {row.actual !== null ? fmtHours(row.actual) : "–"}
                        </p>
                        <span className={`text-xs font-semibold rounded-full border px-1.5 py-0.5 ${badgeClass}`}>
                          {badge}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Activité mensuelle */}
            {stats.monthly && stats.monthly.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
                className="rounded-2xl border border-border bg-card shadow-card p-6"
              >
                <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Activité mensuelle (12 mois)
                </h2>
                <div className="flex items-end gap-1.5 h-36">
                  {[...stats.monthly].sort((a, b) => a.month.localeCompare(b.month)).map((m) => {
                    const heightPct = (m.total / maxMonthly) * 100;
                    const resolvedPct = m.total > 0 ? (m.resolved / m.total) * 100 : 0;
                    return (
                      <div
                        key={m.month}
                        className="flex-1 flex flex-col items-center gap-1 group relative"
                        title={`${fmtMonth(m.month)} — ${m.total} signalements, ${m.resolved} résolus`}
                      >
                        <div
                          className="w-full rounded-t-sm bg-primary/20 relative overflow-hidden"
                          style={{ height: `${Math.max(heightPct, 4)}%` }}
                        >
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-sm transition-all"
                            style={{ height: `${resolvedPct}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-muted-foreground rotate-45 origin-left whitespace-nowrap hidden sm:block">
                          {fmtMonth(m.month)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-primary inline-block" /> Résolus
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-primary/20 inline-block" /> Total
                  </span>
                </div>
              </motion.div>
            )}

            {/* Footer note */}
            <p className="text-center text-xs text-muted-foreground pb-4">
              Données en temps réel issues de la plateforme SIGNA-CI · Abidjan, Côte d'Ivoire
            </p>
          </>
        )}
      </main>
    </div>
  );
};

export default TransparencyPage;
