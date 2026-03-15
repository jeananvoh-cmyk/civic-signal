import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Baby, Heart, Users, ChevronRight, AlertTriangle, Activity, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface CommuneVulnStat {
  commune: string;
  couleur: string;
  population: number;
  total_signalements: number;
  total_actifs: number;
  total_impacted: number;
  total_babies: number;
  total_pregnant: number;
  total_elderly: number;
}

interface QuartierVulnStat {
  quartier: string;
  total_actifs: number;
  total_impacted: number;
  total_babies: number;
  total_pregnant: number;
  total_elderly: number;
}

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const urgencyLevel = (vuln: number): "critical" | "elevated" | "low" | "none" => {
  if (vuln >= 8) return "critical";
  if (vuln >= 3) return "elevated";
  if (vuln >= 1) return "low";
  return "none";
};

const urgencyConfig = {
  critical: {
    label: "Critique",
    bg: "bg-red-500/10 border-red-500/20",
    text: "text-red-600 dark:text-red-400",
    dot: "bg-red-500",
    bar: "bg-red-500",
    pulse: true,
  },
  elevated: {
    label: "Élevé",
    bg: "bg-orange-500/10 border-orange-500/20",
    text: "text-orange-600 dark:text-orange-400",
    dot: "bg-orange-500",
    bar: "bg-orange-500",
    pulse: false,
  },
  low: {
    label: "Faible",
    bg: "bg-yellow-500/10 border-yellow-500/20",
    text: "text-yellow-600 dark:text-yellow-400",
    dot: "bg-yellow-500",
    bar: "bg-yellow-500",
    pulse: false,
  },
  none: {
    label: "Normal",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    pulse: false,
  },
};

/* ─── sub-components ──────────────────────────────────────────────────────── */

const KpiCard = ({
  icon: Icon,
  value,
  label,
  color,
  delay = 0,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  color: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: "easeOut" }}
    className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm"
  >
    <div className={cn("absolute inset-0 opacity-5", color)} />
    <div className={cn("mb-3 inline-flex rounded-xl p-2.5", color.replace("bg-", "bg-").replace("/10", "/15"))}>
      <Icon className={cn("h-5 w-5", color.replace("bg-", "text-").replace("/10", ""))} />
    </div>
    <p className="text-3xl font-extrabold tabular-nums tracking-tight text-foreground">{value}</p>
    <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
  </motion.div>
);

const VulnBar = ({ babies, pregnant, elderly }: { babies: number; pregnant: number; elderly: number }) => {
  const total = babies + pregnant + elderly;
  if (total === 0) return <div className="h-1.5 w-full rounded-full bg-border" />;
  const bPct = (babies / total) * 100;
  const pPct = (pregnant / total) * 100;
  const ePct = (elderly / total) * 100;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full gap-px">
      {babies > 0 && <div className="rounded-l-full bg-pink-400" style={{ width: `${bPct}%` }} />}
      {pregnant > 0 && <div className={cn("bg-rose-500", babies === 0 && "rounded-l-full", elderly === 0 && "rounded-r-full")} style={{ width: `${pPct}%` }} />}
      {elderly > 0 && <div className="rounded-r-full bg-amber-500" style={{ width: `${ePct}%` }} />}
    </div>
  );
};

const VulnChip = ({ icon: Icon, count, color }: { icon: React.ElementType; count: number; color: string }) => {
  if (count === 0) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", color)}>
      <Icon className="h-3 w-3" />
      {count}
    </span>
  );
};

const QuartierCard = ({ q }: { q: QuartierVulnStat }) => {
  const vuln = q.total_babies + q.total_pregnant + q.total_elderly;
  const level = urgencyLevel(vuln);
  const cfg = urgencyConfig[level];
  return (
    <div className={cn("rounded-xl border p-3 transition-colors", cfg.bg)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{q.quartier}</p>
          <p className="text-xs text-muted-foreground">
            {q.total_actifs} actif{q.total_actifs !== 1 ? "s" : ""} · {q.total_impacted} impacté{q.total_impacted !== 1 ? "s" : ""}
          </p>
        </div>
        {vuln > 0 && (
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-bold", cfg.text, cfg.bg)}>
            {vuln}
          </span>
        )}
      </div>
      {vuln > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <VulnChip icon={Baby} count={q.total_babies} color="bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300" />
          <VulnChip icon={Heart} count={q.total_pregnant} color="bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300" />
          <VulnChip icon={Users} count={q.total_elderly} color="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" />
        </div>
      )}
    </div>
  );
};

/* ─── skeleton ────────────────────────────────────────────────────────────── */

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-lg bg-muted", className)} />
);

const LoadingSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
    </div>
    <div className="space-y-3 mt-6">
      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
    </div>
  </div>
);

/* ─── main page ───────────────────────────────────────────────────────────── */

const AdminVulnerablePage = () => {
  const [expandedCommune, setExpandedCommune] = useState<string | null>(null);

  const { data: stats = [], isLoading } = useQuery({
    queryKey: ["admin-vulnerable-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_commune_vulnerable_stats");
      if (error) throw error;
      return data as unknown as CommuneVulnStat[];
    },
  });

  const { data: quartierStats = [], isLoading: isLoadingQuartiers } = useQuery({
    queryKey: ["admin-quartier-vulnerable", expandedCommune],
    queryFn: async () => {
      if (!expandedCommune) return [];
      const { data, error } = await supabase.rpc("get_quartier_vulnerable_stats", { p_commune: expandedCommune });
      if (error) throw error;
      return data as unknown as QuartierVulnStat[];
    },
    enabled: !!expandedCommune,
  });

  const totalVulnerable = stats.reduce((s, c) => s + c.total_babies + c.total_pregnant + c.total_elderly, 0);
  const totalBabies = stats.reduce((s, c) => s + c.total_babies, 0);
  const totalPregnant = stats.reduce((s, c) => s + c.total_pregnant, 0);
  const totalElderly = stats.reduce((s, c) => s + c.total_elderly, 0);
  const totalImpacted = stats.reduce((s, c) => s + c.total_impacted, 0);
  const criticalCommunes = stats.filter((c) => urgencyLevel(c.total_babies + c.total_pregnant + c.total_elderly) === "critical").length;

  /* sort: most vulnerable first */
  const sortedStats = [...stats].sort((a, b) => {
    const av = a.total_babies + a.total_pregnant + a.total_elderly;
    const bv = b.total_babies + b.total_pregnant + b.total_elderly;
    return bv - av;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <div className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-500/10 p-2.5">
              <ShieldAlert className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-foreground leading-tight">Personnes vulnérables</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Suivi en temps réel des populations à risque dans les signalements actifs
              </p>
            </div>
          </div>
          {criticalCommunes > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1.5"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                {criticalCommunes} commune{criticalCommunes > 1 ? "s" : ""} critique{criticalCommunes > 1 ? "s" : ""}
              </span>
            </motion.div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* ── KPI summary ── */}
            <section>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard
                  icon={Activity}
                  value={totalImpacted}
                  label="Personnes impactées"
                  color="bg-violet-500/10"
                  delay={0}
                />
                <KpiCard
                  icon={Baby}
                  value={totalBabies}
                  label="Bébés / Nourrissons"
                  color="bg-pink-500/10"
                  delay={0.06}
                />
                <KpiCard
                  icon={Heart}
                  value={totalPregnant}
                  label="Femmes enceintes"
                  color="bg-rose-500/10"
                  delay={0.12}
                />
                <KpiCard
                  icon={Users}
                  value={totalElderly}
                  label="Personnes âgées"
                  color="bg-amber-500/10"
                  delay={0.18}
                />
              </div>

              {/* Legend */}
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1">
                <span className="text-xs text-muted-foreground font-medium">Répartition :</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-pink-400" /> Bébés
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-rose-500" /> Enceintes
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Âgées
                </span>
              </div>
            </section>

            {/* ── Alert banner if total vuln = 0 ── */}
            {totalVulnerable === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex items-center gap-3"
              >
                <div className="rounded-xl bg-emerald-500/10 p-2">
                  <ShieldAlert className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-emerald-700 dark:text-emerald-400">Aucune vulnérabilité détectée</p>
                  <p className="text-xs text-muted-foreground">Aucun signalement actif ne concerne des personnes vulnérables.</p>
                </div>
              </motion.div>
            )}

            {/* ── Per-commune list ── */}
            {sortedStats.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-base font-bold text-foreground">Par commune</h2>
                  <span className="text-xs text-muted-foreground">{sortedStats.length} commune{sortedStats.length > 1 ? "s" : ""}</span>
                </div>

                <div className="space-y-2">
                  {sortedStats.map((c, i) => {
                    const communeVuln = c.total_babies + c.total_pregnant + c.total_elderly;
                    const level = urgencyLevel(communeVuln);
                    const cfg = urgencyConfig[level];
                    const isExpanded = expandedCommune === c.commune;

                    return (
                      <motion.div
                        key={c.commune}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, duration: 0.35 }}
                        className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm"
                      >
                        {/* Commune header button */}
                        <button
                          onClick={() => setExpandedCommune(isExpanded ? null : c.commune)}
                          className="w-full text-left p-4 hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                        >
                          <div className="flex items-center gap-3">
                            {/* Commune color dot */}
                            <div
                              className="h-9 w-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: c.couleur }}
                            />

                            <div className="flex-1 min-w-0">
                              {/* Row 1: name + badge + chevron */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-bold text-foreground truncate">{c.commune}</span>
                                  {communeVuln > 0 && (
                                    <span className={cn("shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold border", cfg.text, cfg.bg)}>
                                      {cfg.pulse && (
                                        <span className="relative flex h-1.5 w-1.5 mr-0.5">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-60" />
                                          <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", cfg.dot)} />
                                        </span>
                                      )}
                                      {cfg.label} · {communeVuln}
                                    </span>
                                  )}
                                </div>
                                <motion.div
                                  animate={{ rotate: isExpanded ? 90 : 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="shrink-0"
                                >
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </motion.div>
                              </div>

                              {/* Row 2: stats + vuln bar */}
                              <div className="mt-2 space-y-1.5">
                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                  <span>{c.total_actifs} signalement{c.total_actifs !== 1 ? "s" : ""} actif{c.total_actifs !== 1 ? "s" : ""}</span>
                                  <span>{c.total_impacted} impacté{c.total_impacted !== 1 ? "s" : ""}</span>
                                  {c.total_babies > 0 && (
                                    <span className="font-medium text-pink-500">{c.total_babies} bébé{c.total_babies > 1 ? "s" : ""}</span>
                                  )}
                                  {c.total_pregnant > 0 && (
                                    <span className="font-medium text-rose-500">{c.total_pregnant} enceinte{c.total_pregnant > 1 ? "s" : ""}</span>
                                  )}
                                  {c.total_elderly > 0 && (
                                    <span className="font-medium text-amber-600">{c.total_elderly} âgée{c.total_elderly > 1 ? "s" : ""}</span>
                                  )}
                                </div>
                                <VulnBar babies={c.total_babies} pregnant={c.total_pregnant} elderly={c.total_elderly} />
                              </div>
                            </div>
                          </div>
                        </button>

                        {/* Expanded quartier details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              key="quartiers"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.28, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 border-t border-border pt-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                  Détail par quartier
                                </p>

                                {isLoadingQuartiers ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}
                                  </div>
                                ) : quartierStats.length === 0 ? (
                                  <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                    Aucun quartier avec des signalements actifs.
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {quartierStats.map((q) => (
                                      <QuartierCard key={q.quartier} q={q} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminVulnerablePage;
