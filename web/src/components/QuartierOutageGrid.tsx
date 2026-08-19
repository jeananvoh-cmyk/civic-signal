import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Droplets, MapPin, UserPlus, Search, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { useQuartiers } from "@/hooks/useQuartiers";
import { getQuartiers, normalizeQuartier } from "@/lib/quartiers";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

type FilterTab = "all" | "outages" | "calm";

const QuartierOutageGrid = ({ communeName, stats, loading, couleur }: QuartierOutageGridProps) => {
  const { data: dbQuartiers = [], isLoading: quartiersLoading } = useQuartiers(communeName);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const allQuartiers = useMemo(() => {
    // 1. Liste officielle PADA
    const officialList = getQuartiers(communeName);

    // 2. Map d'agrégation consolidée (nom canonique -> données)
    const consolidatedMap = new Map<
      string,
      {
        quartier: string;
        elecActifs: number;
        eauActifs: number;
        elecTotal: number;
        eauTotal: number;
        source: string;
      }
    >();

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

    // Ajouter les quartiers validés en base
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

    // Agréger les statistiques réelles
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
      if (bActive !== aActive) return bActive - aActive; // Quartiers avec coupures en premier
      return a.quartier.localeCompare(b.quartier, "fr");
    });

    return list;
  }, [dbQuartiers, stats, communeName]);

  const totalWithOutages = allQuartiers.filter((q) => q.elecActifs + q.eauActifs > 0).length;
  const calmCount = allQuartiers.length - totalWithOutages;
  const userAddedCount = allQuartiers.filter((q) => q.source === "user").length;

  // Filtrage selon recherche & onglet actif
  const filteredQuartiers = useMemo(() => {
    const qNorm = searchQuery.trim().toLowerCase();
    return allQuartiers.filter((item) => {
      const matchesSearch = !qNorm || item.quartier.toLowerCase().includes(qNorm);
      const hasOutage = item.elecActifs + item.eauActifs > 0;

      if (!matchesSearch) return false;
      if (activeTab === "outages") return hasOutage;
      if (activeTab === "calm") return !hasOutage;
      return true;
    });
  }, [allQuartiers, searchQuery, activeTab]);

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
      className="space-y-4"
    >
      {/* ── Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MapPin className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">
              Quartiers de {communeName}
            </h2>
            <p className="text-xs text-muted-foreground">
              {allQuartiers.length} secteurs répertoriés · {totalWithOutages > 0 ? `${totalWithOutages} avec coupure(s)` : "Aucune coupure signalée"}
            </p>
          </div>
        </div>

        {/* Badges résumés */}
        <div className="flex items-center gap-2 text-xs">
          {totalWithOutages > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive font-semibold text-xs border border-destructive/20">
              <span className="h-2 w-2 rounded-full bg-destructive animate-ping" />
              {totalWithOutages} quartier{totalWithOutages > 1 ? "s" : ""} impacté{totalWithOutages > 1 ? "s" : ""}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-xs border border-emerald-500/20">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Réseau stable
            </span>
          )}
        </div>
      </div>

      {/* ── Barre de recherche et filtres rapides ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Rechercher un quartier de ${communeName}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs bg-card border-border/70"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-lg border border-border/50 text-xs shrink-0">
          <Button
            type="button"
            size="sm"
            variant={activeTab === "all" ? "default" : "ghost"}
            onClick={() => setActiveTab("all")}
            className={`h-7 px-2.5 text-xs font-semibold rounded-md ${
              activeTab === "all" ? "shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Tous ({allQuartiers.length})
          </Button>

          {totalWithOutages > 0 && (
            <Button
              type="button"
              size="sm"
              variant={activeTab === "outages" ? "default" : "ghost"}
              onClick={() => setActiveTab("outages")}
              className={`h-7 px-2.5 text-xs font-semibold rounded-md gap-1 ${
                activeTab === "outages" 
                  ? "bg-destructive text-white shadow-xs" 
                  : "text-destructive hover:bg-destructive/10"
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              Coupures ({totalWithOutages})
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            variant={activeTab === "calm" ? "default" : "ghost"}
            onClick={() => setActiveTab("calm")}
            className={`h-7 px-2.5 text-xs font-semibold rounded-md gap-1 ${
              activeTab === "calm"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            Normal ({calmCount})
          </Button>
        </div>
      </div>

      {/* ── Grille moderne et épurée des quartiers ── */}
      {filteredQuartiers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-8 text-center bg-card/50">
          <p className="text-sm text-muted-foreground">Aucun quartier ne correspond à votre recherche.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setSearchQuery(""); setActiveTab("all"); }}
            className="mt-3 text-xs"
          >
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <AnimatePresence>
            {filteredQuartiers.map((q, i) => {
              const hasOutage = q.elecActifs + q.eauActifs > 0;
              return (
                <motion.div
                  key={q.quartier}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: Math.min(i * 0.008, 0.25) }}
                  className={`group relative rounded-xl border p-3 flex items-center justify-between gap-2.5 transition-all duration-200 ${
                    hasOutage
                      ? "border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/20 shadow-xs hover:border-amber-500"
                      : "border-border/60 bg-card hover:border-border hover:bg-muted/20"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        hasOutage ? "bg-amber-500 animate-pulse" : "bg-emerald-500/70"
                      }`}
                    />
                    <span
                      className={`text-xs font-semibold truncate leading-tight ${
                        hasOutage ? "text-foreground font-bold" : "text-foreground/90"
                      }`}
                      title={q.quartier}
                    >
                      {q.quartier}
                    </span>

                    {q.source === "user" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <UserPlus className="h-3 w-3 shrink-0 text-primary/70" />
                        </TooltipTrigger>
                        <TooltipContent>Quartier ajouté par un citoyen (validé)</TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  {/* Badges d'état : affichage dynamique uniquement si incident */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasOutage ? (
                      <>
                        {q.elecActifs > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-extrabold text-amber-700 dark:text-amber-300">
                            <Zap className="h-3 w-3 fill-amber-500 text-amber-500" />
                            {q.elecActifs}
                          </span>
                        )}
                        {q.eauActifs > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/20 px-2 py-0.5 text-xs font-extrabold text-blue-700 dark:text-blue-300">
                            <Droplets className="h-3 w-3 fill-blue-500 text-blue-500" />
                            {q.eauActifs}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[11px] font-medium text-muted-foreground/60 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        Normal
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default QuartierOutageGrid;
