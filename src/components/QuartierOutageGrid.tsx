import { useMemo } from "react";
import { motion } from "framer-motion";
import { Zap, Droplets, MapPin } from "lucide-react";
import { getQuartiers } from "@/lib/quartiers";

interface QuartierStat {
  quartier: string;
  electricite_actifs: number;
  electricite_resolus: number;
  electricite_total: number;
  eau_actifs: number;
  eau_resolus: number;
  eau_total: number;
}

interface QuartierOutageGridProps {
  communeName: string;
  stats: QuartierStat[];
  loading: boolean;
  couleur: string;
}

const QuartierOutageGrid = ({ communeName, stats, loading, couleur }: QuartierOutageGridProps) => {
  // Merge all quartiers from the reference list with actual stats
  const allQuartiers = useMemo(() => {
    const quartierList = getQuartiers(communeName);
    const statsMap = new Map(stats.map((s) => [s.quartier, s]));

    // Include quartiers from stats that might not be in the reference list
    const extraQuartiers = stats
      .filter((s) => !quartierList.includes(s.quartier))
      .map((s) => s.quartier);

    const combined = [...quartierList, ...extraQuartiers];

    return combined
      .map((name) => {
        const s = statsMap.get(name);
        return {
          quartier: name,
          elecActifs: s?.electricite_actifs || 0,
          eauActifs: s?.eau_actifs || 0,
          elecTotal: s?.electricite_total || 0,
          eauTotal: s?.eau_total || 0,
        };
      })
      .sort((a, b) => {
        // Quartiers with active outages first
        const aActive = a.elecActifs + a.eauActifs;
        const bActive = b.elecActifs + b.eauActifs;
        if (bActive !== aActive) return bActive - aActive;
        return a.quartier.localeCompare(b.quartier, "fr");
      });
  }, [communeName, stats]);

  const totalWithOutages = allQuartiers.filter((q) => q.elecActifs + q.eauActifs > 0).length;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold text-foreground">
            Coupures par quartier
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-amber-500" /> Élec.
          </span>
          <span className="flex items-center gap-1">
            <Droplets className="h-3 w-3 text-blue-500" /> Eau
          </span>
        </div>
      </div>

      {/* Summary bar */}
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{allQuartiers.length}</span> quartiers ·
        <span className="font-semibold" style={{ color: totalWithOutages > 0 ? couleur : undefined }}>
          {totalWithOutages}
        </span>{" "}
        avec coupure{totalWithOutages !== 1 ? "s" : ""} active{totalWithOutages !== 1 ? "s" : ""}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-px rounded-xl border border-border overflow-hidden bg-border">
        {allQuartiers.map((q, i) => {
          const hasOutage = q.elecActifs + q.eauActifs > 0;
          return (
            <motion.div
              key={q.quartier}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * 0.015, 0.5) }}
              className={`bg-card p-3 flex flex-col gap-1.5 transition-colors ${
                hasOutage ? "bg-destructive/[0.03]" : ""
              }`}
            >
              <span
                className={`text-xs font-semibold leading-tight truncate ${
                  hasOutage ? "text-foreground" : "text-muted-foreground"
                }`}
                title={q.quartier}
              >
                {q.quartier}
              </span>
              <div className="flex items-center gap-3">
                <span
                  className={`font-display text-base font-extrabold ${
                    q.elecActifs > 0 ? "text-destructive" : "text-emerald-500"
                  }`}
                >
                  {q.elecActifs}
                </span>
                <span
                  className={`font-display text-base font-extrabold ${
                    q.eauActifs > 0 ? "text-destructive" : "text-emerald-500"
                  }`}
                >
                  {q.eauActifs}
                </span>
              </div>
            </motion.div>
          );
        })}
        {/* Fill last cell if odd number */}
        {allQuartiers.length % 2 !== 0 && <div className="bg-card" />}
      </div>

      {/* Column labels under grid */}
      <div className="mt-2 grid grid-cols-2 gap-px">
        <div className="flex items-center gap-3 px-3">
          <span className="text-[10px] text-amber-500 font-medium flex items-center gap-0.5">
            <Zap className="h-2.5 w-2.5" /> Élec.
          </span>
          <span className="text-[10px] text-blue-500 font-medium flex items-center gap-0.5">
            <Droplets className="h-2.5 w-2.5" /> Eau
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default QuartierOutageGrid;
