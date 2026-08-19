import { useMemo } from "react";
import { motion } from "framer-motion";
import { Zap, Droplets, MapPin, UserPlus } from "lucide-react";
import { useQuartiers } from "@/hooks/useQuartiers";
import { getQuartiers, normalizeQuartier } from "@/lib/quartiers";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  const { data: dbQuartiers = [], isLoading: quartiersLoading } = useQuartiers(communeName);

  const allQuartiers = useMemo(() => {
    // 1. Liste officielle PADA
    const officialList = getQuartiers(communeName);
    
    // 2. Map d'agrégation consolidée (nom canonique -> données)
    const consolidatedMap = new Map<string, {
      quartier: string;
      elecActifs: number;
      eauActifs: number;
      elecTotal: number;
      eauTotal: number;
      source: string;
    }>();

    // Initialiser avec les quartiers officiels PADA
    for (const name of officialList) {
      consolidatedMap.set(name, {
        quartier: name,
        elecActifs: 0,
        eauActifs: 0,
        elecTotal: 0,
        eauTotal: 0,
        source: "pada",
      });
    }

    // Ajouter les quartiers validés en base (en normalisant leurs noms pour éviter tout doublon)
    for (const q of dbQuartiers) {
      const canonical = normalizeQuartier(q.nom, communeName);
      if (!canonical || canonical === "Secteur non précisé") continue;
      
      if (!consolidatedMap.has(canonical)) {
        consolidatedMap.set(canonical, {
          quartier: canonical,
          elecActifs: 0,
          eauActifs: 0,
          elecTotal: 0,
          eauTotal: 0,
          source: q.source || "user",
        });
      }
    }

    // Agréger les statistiques réelles des signalements (en mappant chaque alias vers son nom canonique)
    for (const s of stats) {
      const raw = (s.quartier || "").trim();
      if (!raw || raw === "__other" || raw === "other" || raw.toLowerCase() === "autre") continue;
      const canonical = normalizeQuartier(raw, communeName);
      if (!canonical || canonical === "Secteur non précisé") continue;

      let entry = consolidatedMap.get(canonical);
      if (!entry) {
        entry = {
          quartier: canonical,
          elecActifs: 0,
          eauActifs: 0,
          elecTotal: 0,
          eauTotal: 0,
          source: "user",
        };
        consolidatedMap.set(canonical, entry);
      }

      entry.elecActifs += s.electricite_actifs || 0;
      entry.eauActifs += s.eau_actifs || 0;
      entry.elecTotal += s.electricite_total || 0;
      entry.eauTotal += s.eau_total || 0;
    }

    const list = Array.from(consolidatedMap.values());
    list.sort((a, b) => {
      const aActive = a.elecActifs + a.eauActifs;
      const bActive = b.elecActifs + b.eauActifs;
      if (bActive !== aActive) return bActive - aActive;
      return a.quartier.localeCompare(b.quartier, "fr");
    });

    return list;
  }, [dbQuartiers, stats, communeName]);

  const totalWithOutages = allQuartiers.filter((q) => q.elecActifs + q.eauActifs > 0).length;
  const userAddedCount = allQuartiers.filter((q) => q.source === "user").length;

  if (loading || quartiersLoading) {
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
        {userAddedCount > 0 && (
          <>
            {" "}·{" "}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-0.5 text-primary cursor-help">
                  <UserPlus className="h-3 w-3" />
                  {userAddedCount} ajouté{userAddedCount > 1 ? "s" : ""}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Quartiers ajoutés par les utilisateurs et validés par l'admin</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}
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
              <div className="flex items-center gap-1">
                <span
                  className={`text-xs font-semibold leading-tight truncate ${
                    hasOutage ? "text-foreground" : "text-muted-foreground"
                  }`}
                  title={q.quartier}
                >
                  {q.quartier}
                </span>
                {q.source === "user" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <UserPlus className="h-3 w-3 shrink-0 text-primary/60" />
                    </TooltipTrigger>
                    <TooltipContent>Quartier ajouté par un utilisateur</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 ${
                  q.elecActifs > 0 ? "bg-amber-500/15" : "bg-muted/50"
                }`}>
                  <Zap className={`h-3 w-3 ${q.elecActifs > 0 ? "text-amber-500" : "text-muted-foreground/50"}`} />
                  <span className={`font-display text-sm font-extrabold ${
                    q.elecActifs > 0 ? "text-amber-500" : "text-muted-foreground/50"
                  }`}>
                    {q.elecActifs}
                  </span>
                </div>
                <div className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 ${
                  q.eauActifs > 0 ? "bg-blue-500/15" : "bg-muted/50"
                }`}>
                  <Droplets className={`h-3 w-3 ${q.eauActifs > 0 ? "text-blue-500" : "text-muted-foreground/50"}`} />
                  <span className={`font-display text-sm font-extrabold ${
                    q.eauActifs > 0 ? "text-blue-500" : "text-muted-foreground/50"
                  }`}>
                    {q.eauActifs}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
        {allQuartiers.length % 2 !== 0 && <div className="bg-card" />}
      </div>

      {/* Column labels */}
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
