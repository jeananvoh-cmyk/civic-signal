import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Download, FileSpreadsheet, FileText, FileDown, ChevronDown, Users, Baby, Heart, Clock, Shield, Zap, Droplets, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import TrendsChart from "@/components/TrendsChart";
import { format } from "date-fns";
import { exportPDF } from "@/lib/export-pdf";

/* ───── types ───── */
interface CommuneStat {
  commune: string;
  couleur: string;
  actifs: number;
  resolus: number;
  total: number;
  population: number;
}

interface CommuneServiceStat {
  commune: string;
  couleur: string;
  population: number;
  electricite_actifs: number;
  electricite_resolus: number;
  electricite_total: number;
  eau_actifs: number;
  eau_resolus: number;
  eau_total: number;
  mairie_actifs: number;
  mairie_resolus: number;
  mairie_total: number;
  electricite_verified: number;
  eau_verified: number;
  mairie_verified: number;
}

interface VulnerableStat {
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

interface DurationStat {
  commune: string;
  couleur: string;
  avg_duration_minutes: number;
  total_resolved: number;
  total_active: number;
  longest_duration_minutes: number;
  service_type: string;
}

/* ───── helpers ───── */
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);
const fmtDuration = (mins: number) => {
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
};

const BOM = "\uFEFF";
const SEP_CSV = ",";
const SEP_XLS = "\t";

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([BOM + content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildExport(
  stats: CommuneStat[],
  serviceStats: CommuneServiceStat[],
  vulnStats: VulnerableStat[],
  durationStats: DurationStat[],
  sep: string,
) {
  const date = format(new Date(), "dd/MM/yyyy HH:mm");
  const lines: string[] = [];
  const row = (...cols: (string | number)[]) => lines.push(cols.map(c => typeof c === "string" && c.includes(sep) ? `"${c}"` : String(c)).join(sep));

  // Header
  row("YALO YA COURANT — Rapport Statistiques");
  row(`Généré le ${date}`);
  lines.push("");

  // ── 1. Résumé global
  const totalSig = stats.reduce((s, c) => s + c.total, 0);
  const totalAct = stats.reduce((s, c) => s + c.actifs, 0);
  const totalRes = stats.reduce((s, c) => s + c.resolus, 0);
  const totalPop = stats.reduce((s, c) => s + c.population, 0);
  row("=== RÉSUMÉ GLOBAL ===");
  row("Total signalements", totalSig);
  row("Signalements actifs", totalAct);
  row("Signalements résolus", totalRes);
  row("Taux de résolution (%)", pct(totalRes, totalSig));
  row("Population couverte", totalPop);
  row("Communes pilotes", stats.length);
  lines.push("");

  // ── 2. Statistiques par commune
  row("=== STATISTIQUES PAR COMMUNE ===");
  row("Commune", "Population", "Total", "Actifs", "Résolus", "Taux résolution (%)", "Part du total (%)");
  for (const c of [...stats].sort((a, b) => b.total - a.total)) {
    row(c.commune, c.population, c.total, c.actifs, c.resolus, pct(c.resolus, c.total), pct(c.total, totalSig));
  }
  row("TOTAL", totalPop, totalSig, totalAct, totalRes, pct(totalRes, totalSig), 100);
  lines.push("");

  // ── 3. Ventilation par service
  row("=== VENTILATION PAR SERVICE ===");
  row("Commune", "Élec. Total", "Élec. Actifs", "Élec. Résolus", "Élec. Vérifiés", "Eau Total", "Eau Actifs", "Eau Résolus", "Eau Vérifiés", "Voirie Total", "Voirie Actifs", "Voirie Résolus", "Voirie Vérifiés");
  for (const c of [...serviceStats].sort((a, b) => (b.electricite_total + b.eau_total + b.mairie_total) - (a.electricite_total + a.eau_total + a.mairie_total))) {
    row(
      c.commune,
      c.electricite_total, c.electricite_actifs, c.electricite_resolus, c.electricite_verified,
      c.eau_total, c.eau_actifs, c.eau_resolus, c.eau_verified,
      c.mairie_total, c.mairie_actifs, c.mairie_resolus, c.mairie_verified,
    );
  }
  lines.push("");

  // ── 4. Impact sur les populations vulnérables
  row("=== IMPACT SUR LES POPULATIONS VULNÉRABLES ===");
  row("Commune", "Signalements actifs", "Personnes impactées", "Nourrissons", "Femmes enceintes", "Personnes âgées", "Total vulnérables");
  for (const v of vulnStats) {
    row(v.commune, v.total_actifs, v.total_impacted, v.total_babies, v.total_pregnant, v.total_elderly, v.total_babies + v.total_pregnant + v.total_elderly);
  }
  const totVuln = vulnStats.reduce((s, v) => s + v.total_babies + v.total_pregnant + v.total_elderly, 0);
  const totImpact = vulnStats.reduce((s, v) => s + v.total_impacted, 0);
  row("TOTAL",
    vulnStats.reduce((s, v) => s + v.total_actifs, 0),
    totImpact,
    vulnStats.reduce((s, v) => s + v.total_babies, 0),
    vulnStats.reduce((s, v) => s + v.total_pregnant, 0),
    vulnStats.reduce((s, v) => s + v.total_elderly, 0),
    totVuln,
  );
  lines.push("");

  // ── 5. Durée des coupures
  row("=== DURÉE MOYENNE DES COUPURES ===");
  row("Commune", "Service", "Durée moyenne (min)", "Durée max (min)", "Résolus", "Actifs");
  for (const d of durationStats.filter(d => d.total_resolved > 0 || d.total_active > 0)) {
    row(d.commune, d.service_type === "electricity" ? "Électricité" : "Eau", Math.round(d.avg_duration_minutes), Math.round(d.longest_duration_minutes), d.total_resolved, d.total_active);
  }
  lines.push("");

  // ── 6. Indicateurs clés
  const avgElec = durationStats.filter(d => d.service_type === "electricity" && d.avg_duration_minutes > 0);
  const avgWater = durationStats.filter(d => d.service_type === "water" && d.avg_duration_minutes > 0);
  const globalAvgElec = avgElec.length > 0 ? avgElec.reduce((s, d) => s + d.avg_duration_minutes, 0) / avgElec.length : 0;
  const globalAvgWater = avgWater.length > 0 ? avgWater.reduce((s, d) => s + d.avg_duration_minutes, 0) / avgWater.length : 0;

  row("=== INDICATEURS CLÉS POUR PARTENAIRES ===");
  row("Durée moyenne coupure électricité (min)", Math.round(globalAvgElec));
  row("Durée moyenne coupure eau (min)", Math.round(globalAvgWater));
  row("Nombre de ménages impactés (actifs)", totalAct);
  row("Personnes vulnérables en zone de coupure active", totVuln);
  row("Taux de vérification communautaire (%)", pct(
    serviceStats.reduce((s, c) => s + c.electricite_verified + c.eau_verified + c.mairie_verified, 0),
    totalAct,
  ));

  return lines.join("\n");
}

/* ───── component ───── */
const AdminStatsPage = () => {
  const [exportOpen, setExportOpen] = useState(false);

  const { data: stats = [], isLoading: loadingStats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_commune_stats");
      if (error) throw error;
      return data as unknown as CommuneStat[];
    },
  });

  const { data: serviceStats = [] } = useQuery({
    queryKey: ["admin-service-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_commune_service_stats");
      if (error) throw error;
      return data as unknown as CommuneServiceStat[];
    },
  });

  const { data: vulnStats = [] } = useQuery({
    queryKey: ["admin-vuln-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_commune_vulnerable_stats");
      if (error) throw error;
      return data as unknown as VulnerableStat[];
    },
  });

  const { data: durationStats = [] } = useQuery({
    queryKey: ["admin-duration-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_commune_duration_stats");
      if (error) throw error;
      return data as unknown as DurationStat[];
    },
  });

  const isLoading = loadingStats;
  const totalSignalements = stats.reduce((s, c) => s + c.total, 0);
  const totalActifs = stats.reduce((s, c) => s + c.actifs, 0);
  const totalResolus = stats.reduce((s, c) => s + c.resolus, 0);
  const totalVulnerables = vulnStats.reduce((s, v) => s + v.total_babies + v.total_pregnant + v.total_elderly, 0);

  const handleExport = (fmt: "csv" | "xls" | "pdf") => {
    if (fmt === "pdf") {
      exportPDF(stats, serviceStats, vulnStats, durationStats);
      setExportOpen(false);
      return;
    }
    const sep = fmt === "csv" ? SEP_CSV : SEP_XLS;
    const content = buildExport(stats, serviceStats, vulnStats, durationStats, sep);
    const dateStr = format(new Date(), "yyyy-MM-dd");
    if (fmt === "csv") {
      downloadFile(content, `rapport_stats_${dateStr}.csv`, "text/csv");
    } else {
      downloadFile(content, `rapport_stats_${dateStr}.xls`, "application/vnd.ms-excel");
    }
    setExportOpen(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Statistiques</h1>
          <p className="mt-1 text-muted-foreground">Rapport complet pour les partenaires et décideurs.</p>
        </div>

        {/* Export dropdown */}
        <Popover open={exportOpen} onOpenChange={setExportOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" disabled={stats.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Exporter
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="end">
            <button
              onClick={() => handleExport("csv")}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
              Export CSV
            </button>
            <button
              onClick={() => handleExport("xls")}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4 text-success" />
              Export XLS (Excel)
            </button>
            <div className="my-1 h-px bg-border" />
            <button
              onClick={() => handleExport("pdf")}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
            >
              <FileDown className="h-4 w-4 text-destructive" />
              Export PDF (partenaires)
            </button>
          </PopoverContent>
        </Popover>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl bg-card border border-border p-5 text-center shadow-card">
              <p className="font-display text-3xl font-extrabold text-foreground">{totalSignalements}</p>
              <p className="text-sm text-muted-foreground">Total signalements</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-5 text-center shadow-card">
              <p className="font-display text-3xl font-extrabold text-primary">{totalActifs}</p>
              <p className="text-sm text-muted-foreground">Actifs</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-5 text-center shadow-card">
              <p className="font-display text-3xl font-extrabold text-success">{totalResolus}</p>
              <p className="text-xs text-muted-foreground">Résolus ({pct(totalResolus, totalSignalements)}%)</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-5 text-center shadow-card">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Heart className="h-4 w-4 text-destructive" />
              </div>
              <p className="font-display text-3xl font-extrabold text-destructive">{totalVulnerables}</p>
              <p className="text-xs text-muted-foreground">Vulnérables impactés</p>
            </div>
          </div>

          {/* Service breakdown summary */}
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(() => {
              const totElec = serviceStats.reduce((s, c) => s + c.electricite_actifs, 0);
              const totEau = serviceStats.reduce((s, c) => s + c.eau_actifs, 0);
              const totMairie = serviceStats.reduce((s, c) => s + c.mairie_actifs, 0);
              return (
                <>
                  <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-5 w-5 text-electricity" />
                      <span className="font-bold text-foreground">Électricité</span>
                    </div>
                    <p className="text-2xl font-extrabold text-electricity">{totElec}</p>
                    <p className="text-xs text-muted-foreground">coupures actives</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {serviceStats.reduce((s, c) => s + c.electricite_verified, 0)} vérifiées par les voisins
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                    <div className="flex items-center gap-2 mb-2">
                      <Droplets className="h-5 w-5 text-water" />
                      <span className="font-bold text-foreground">Eau</span>
                    </div>
                    <p className="text-2xl font-extrabold text-water">{totEau}</p>
                    <p className="text-xs text-muted-foreground">coupures actives</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {serviceStats.reduce((s, c) => s + c.eau_verified, 0)} vérifiées par les voisins
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 shadow-card">
                    <div className="flex items-center gap-2 mb-2">
                      <Construction className="h-5 w-5 text-teal-500" />
                      <span className="font-bold text-foreground">Voirie & Infra</span>
                    </div>
                    <p className="text-2xl font-extrabold text-teal-500">{totMairie}</p>
                    <p className="text-xs text-muted-foreground">signalements actifs</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {serviceStats.reduce((s, c) => s + c.mairie_verified, 0)} vérifiés par les voisins
                    </p>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Vulnerable population summary */}
          {totalVulnerables > 0 && (
            <div className="mb-8 rounded-xl border border-destructive/30 bg-destructive/5 p-5 shadow-card">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-destructive" />
                <h2 className="font-bold text-foreground">Populations vulnérables en zone de coupure active</h2>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <Baby className="h-5 w-5 mx-auto mb-1 text-destructive" />
                  <p className="text-xl font-bold text-foreground">{vulnStats.reduce((s, v) => s + v.total_babies, 0)}</p>
                  <p className="text-xs text-muted-foreground">Nourrissons</p>
                </div>
                <div>
                  <Heart className="h-5 w-5 mx-auto mb-1 text-destructive" />
                  <p className="text-xl font-bold text-foreground">{vulnStats.reduce((s, v) => s + v.total_pregnant, 0)}</p>
                  <p className="text-xs text-muted-foreground">Femmes enceintes</p>
                </div>
                <div>
                  <Users className="h-5 w-5 mx-auto mb-1 text-destructive" />
                  <p className="text-xl font-bold text-foreground">{vulnStats.reduce((s, v) => s + v.total_elderly, 0)}</p>
                  <p className="text-xs text-muted-foreground">Personnes âgées</p>
                </div>
                <div className="hidden sm:block">
                  <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xl font-bold text-foreground">{vulnStats.reduce((s, v) => s + v.total_impacted, 0)}</p>
                  <p className="text-xs text-muted-foreground">Personnes impactées</p>
                </div>
              </div>
            </div>
          )}

          {/* Trends chart */}
          <TrendsChart className="mb-8" />

          {/* Per commune bars */}
          <h2 className="font-display text-lg font-bold text-foreground mb-3">Répartition par commune</h2>
          <div className="space-y-3">
            {[...stats]
              .sort((a, b) => b.total - a.total)
              .map((c, i) => {
                const pctVal = pct(c.total, totalSignalements);
                const vuln = vulnStats.find(v => v.commune === c.commune);
                const vulnCount = vuln ? vuln.total_babies + vuln.total_pregnant + vuln.total_elderly : 0;
                return (
                  <motion.div
                    key={c.commune}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="rounded-xl border border-border bg-card p-4 shadow-card"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: c.couleur }} />
                        <span className="font-bold text-foreground">{c.commune}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{pctVal}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.max(pctVal, 2)}%`, backgroundColor: c.couleur }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{c.total} total</span>
                      <span>{c.actifs} actif{c.actifs > 1 ? "s" : ""}</span>
                      <span>{c.resolus} résolu{c.resolus > 1 ? "s" : ""}</span>
                      <span>{(c.population / 1000).toFixed(0)}k hab.</span>
                      {vulnCount > 0 && (
                        <span className="text-destructive font-medium">❤ {vulnCount} vulnérable{vulnCount > 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminStatsPage;
