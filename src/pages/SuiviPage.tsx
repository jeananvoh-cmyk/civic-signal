import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Zap, Droplets, Clock, MapPin, TrendingUp, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import NewsTicker from "@/components/NewsTicker";

// After this many days without any verification, a report is considered "non pris en charge"
const NEGLECTED_DAYS = 7;

interface Report {
  id: string;
  status: string;
  urgency: string;
  service_type: string;
  description: string;
  commune: string | null;
  quartier: string | null;
  location: string | null;
  created_at: string;
  start_time: string | null;
  resolved_at: string | null;
  verifications: number;
  validated: boolean | null;
  impacted_people: number | null;
}

type ComputedStatus = "nouveau" | "en_cours" | "resolu" | "non_pris";

function getComputedStatus(report: Report): ComputedStatus {
  if (report.status === "resolved") return "resolu";
  const ageDays = (Date.now() - new Date(report.created_at).getTime()) / 86400000;
  if ((report.verifications ?? 0) > 0) return "en_cours";
  if (ageDays > NEGLECTED_DAYS) return "non_pris";
  return "nouveau";
}

const STATUS_META: Record<ComputedStatus, { label: string; emoji: string; pill: string }> = {
  nouveau: {
    label: "Nouveau",
    emoji: "🔴",
    pill: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800",
  },
  en_cours: {
    label: "En cours",
    emoji: "🟡",
    pill: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800",
  },
  resolu: {
    label: "Résolu",
    emoji: "🟢",
    pill: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800",
  },
  non_pris: {
    label: "Non pris en charge",
    emoji: "⚫",
    pill: "text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700",
  },
};

function formatAge(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}j`;
}

function getUrgencyBorderClass(urgency: string) {
  if (urgency === "critical") return "border-l-destructive";
  if (urgency === "high") return "border-l-orange-500";
  return "border-l-amber-400";
}

const SuiviPage = () => {
  const [filterCommune, setFilterCommune] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: reports = [], isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["suivi-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, status, urgency, service_type, description, commune, quartier, location, created_at, start_time, resolved_at, verifications, validated, impacted_people")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as Report[];
    },
    refetchInterval: 30000,
  });

  const reportsWithStatus = reports.map((r) => ({
    ...r,
    computedStatus: getComputedStatus(r),
    communeLabel: r.commune || r.location || "Inconnu",
  }));

  // Stats by status
  const countByStatus: Record<ComputedStatus, number> = {
    nouveau: 0,
    en_cours: 0,
    resolu: 0,
    non_pris: 0,
  };
  reportsWithStatus.forEach((r) => { countByStatus[r.computedStatus]++; });

  // Stats by category
  const elecActive = reportsWithStatus.filter((r) => r.service_type === "electricity" && r.status === "active").length;
  const elecTotal = reportsWithStatus.filter((r) => r.service_type === "electricity").length;
  const eauActive = reportsWithStatus.filter((r) => r.service_type === "water" && r.status === "active").length;
  const eauTotal = reportsWithStatus.filter((r) => r.service_type === "water").length;

  // Top affected communes (active only)
  const communeActiveCount: Record<string, number> = {};
  reportsWithStatus
    .filter((r) => r.status === "active")
    .forEach((r) => {
      communeActiveCount[r.communeLabel] = (communeActiveCount[r.communeLabel] || 0) + 1;
    });
  const topCommunes = Object.entries(communeActiveCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxCount = topCommunes[0]?.[1] || 1;

  // Oldest unresolved
  const oldestUnresolved = reportsWithStatus
    .filter((r) => r.status === "active")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(0, 5);

  // Unique communes for filter
  const communes = Array.from(
    new Set(reportsWithStatus.map((r) => r.communeLabel).filter((c) => c !== "Inconnu"))
  ).sort();

  // Filtered reports list
  const filteredReports = reportsWithStatus.filter((r) => {
    if (filterCommune !== "all" && r.communeLabel !== filterCommune) return false;
    if (filterCategory !== "all" && r.service_type !== filterCategory) return false;
    if (filterStatus !== "all" && r.computedStatus !== filterStatus) return false;
    return true;
  });

  const lastUpdate = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : "--:--";

  // Build ticker items from the most recent active reports
  const tickerItems = reportsWithStatus
    .filter((r) => r.status === "active")
    .slice(0, 20)
    .map((r) => ({
      icon: r.service_type === "electricity" ? "⚡" : "💧",
      text: `${r.computedStatus === "en_cours" ? "En cours" : "Nouveau"} · ${r.communeLabel}${r.quartier ? `, ${r.quartier}` : ""} · ${formatAge(r.created_at)}`,
      category: r.service_type === "electricity" ? "ÉLEC" : "EAU",
    }));

  // Fallback when no active reports
  const tickerFallback = [
    { icon: "✅", text: "Aucune coupure active pour l'instant — Abidjan tourne !", category: "STATUT" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <NewsTicker
        items={isLoading ? [] : tickerItems.length > 0 ? tickerItems : tickerFallback}
        label="SIGNALEMENTS"
        variant={tickerItems.length > 0 ? "alert" : "success"}
        speed={20}
      />
      <main className="container mx-auto max-w-5xl px-4 py-8">
        {/* Page header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">Suivi en Temps Réel</h1>
              <p className="mt-1 text-muted-foreground">
                État de tous les signalements par commune, catégorie et statut.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary rounded-full px-3 py-1.5">
              <RefreshCw className="h-3 w-3" />
              Mis à jour à {lastUpdate}
            </div>
          </div>
        </motion.div>

        {/* Status overview — clickable to filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
        >
          {(["nouveau", "en_cours", "resolu", "non_pris"] as ComputedStatus[]).map((s) => {
            const meta = STATUS_META[s];
            const count = countByStatus[s];
            const isActive = filterStatus === s;
            return (
              <Card
                key={s}
                className={`cursor-pointer border-2 transition-all hover:shadow-md ${
                  isActive ? "border-primary ring-2 ring-primary/30" : "border-transparent"
                }`}
                onClick={() => setFilterStatus(isActive ? "all" : s)}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-1">{meta.emoji}</div>
                  <div className="text-2xl font-bold text-foreground">{count}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-tight">{meta.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>

        {/* Category stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-2 gap-3 mb-8"
        >
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 shrink-0">
                <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="text-lg font-bold leading-tight">
                  {elecActive}{" "}
                  <span className="text-sm font-normal text-muted-foreground">actifs</span>{" "}
                  <span className="text-sm text-muted-foreground">/ {elecTotal} total</span>
                </div>
                <div className="text-sm text-muted-foreground">⚡ Électricité</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 shrink-0">
                <Droplets className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-lg font-bold leading-tight">
                  {eauActive}{" "}
                  <span className="text-sm font-normal text-muted-foreground">actifs</span>{" "}
                  <span className="text-sm text-muted-foreground">/ {eauTotal} total</span>
                </div>
                <div className="text-sm text-muted-foreground">💧 Eau</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Two columns: top communes + oldest unresolved */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Top affected zones */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-destructive" />
                  Zones les plus touchées
                  <span className="text-xs font-normal text-muted-foreground">(actifs)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {topCommunes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune zone active 🎉</p>
                ) : (
                  topCommunes.map(([commune, count], i) => (
                    <div key={commune} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                      <span className="text-sm font-medium w-28 shrink-0 truncate">{commune}</span>
                      <div className="flex-1 bg-secondary rounded-full h-2">
                        <div
                          className="bg-destructive rounded-full h-2 transition-all"
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-destructive w-6 text-right">{count}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Oldest unresolved */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Problèmes les plus anciens
                  <span className="text-xs font-normal text-muted-foreground">(non résolus)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {oldestUnresolved.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun problème actif 🎉</p>
                ) : (
                  oldestUnresolved.map((r) => {
                    const isElec = r.service_type === "electricity";
                    const age = formatAge(r.created_at);
                    const ageDays = (Date.now() - new Date(r.created_at).getTime()) / 86400000;
                    const ageClass =
                      ageDays > 7
                        ? "text-destructive font-bold"
                        : ageDays > 3
                        ? "text-amber-600 font-semibold"
                        : "text-muted-foreground";
                    return (
                      <div key={r.id} className="flex items-start gap-2 text-sm">
                        <span className="text-base shrink-0">{isElec ? "⚡" : "💧"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {r.description.slice(0, 55)}{r.description.length > 55 ? "…" : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">{r.communeLabel}</p>
                        </div>
                        <span className={`text-xs shrink-0 ${ageClass}`}>{age}</span>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters + report list */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex flex-wrap gap-2 mb-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="nouveau">🔴 Nouveau</SelectItem>
                <SelectItem value="en_cours">🟡 En cours</SelectItem>
                <SelectItem value="resolu">🟢 Résolu</SelectItem>
                <SelectItem value="non_pris">⚫ Non pris en charge</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                <SelectItem value="electricity">⚡ Électricité</SelectItem>
                <SelectItem value="water">💧 Eau</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCommune} onValueChange={setFilterCommune}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Commune" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes communes</SelectItem>
                {communes.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Chargement des signalements…
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-4xl mb-3">🎉</p>
              <p className="font-medium">Aucun signalement pour ces critères</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-3">
                {filteredReports.length} signalement{filteredReports.length > 1 ? "s" : ""}
              </p>
              {filteredReports.map((r) => {
                const meta = STATUS_META[r.computedStatus];
                const isElec = r.service_type === "electricity";
                const age = formatAge(r.created_at);
                return (
                  <Card key={r.id} className={`border-l-4 ${getUrgencyBorderClass(r.urgency)}`}>
                    <CardContent className="p-3 flex items-start gap-3">
                      <span className="text-xl shrink-0 mt-0.5">{isElec ? "⚡" : "💧"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-1">{r.description}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {r.communeLabel}{r.quartier ? `, ${r.quartier}` : ""}
                          </span>
                          {(r.verifications ?? 0) > 0 && (
                            <span className="text-xs text-muted-foreground">
                              · {r.verifications} vérif.
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 ${meta.pill}`}>
                          {meta.emoji} {meta.label}
                        </span>
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {age}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default SuiviPage;
