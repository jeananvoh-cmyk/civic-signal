import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import {
  Zap, Droplets, Clock, Trophy, ChevronDown, Radio, Flame, AlertTriangle,
  MapPin, Siren, Construction, CheckCircle2, Info, Wrench, HelpCircle,
  ShieldCheck, Send, Building2, Users, BarChart2, Filter, Sparkles,
  Search, LayoutGrid, List, SlidersHorizontal, ArrowUpDown, X, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ShareButton from "@/components/ShareButton";
import TrendsChart from "@/components/TrendsChart";
import PriorityBadge from "@/components/PriorityBadge";
import { calculatePriority, type PriorityResult } from "@/lib/priority-score";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNES, COMMUNE_COLORS } from "@/lib/communes";
import { COMMUNE_LOGOS } from "@/lib/commune-logos";
import { extractInfraLabel, infraEmoji, infraOperator, cleanDescription } from "@/lib/report-display";
import { normalizeQuartier } from "@/lib/quartiers";
import electricityIcon from "@/assets/electricity-icon.png";
import waterIcon from "@/assets/water-icon.png";

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

interface DurationStat {
  commune: string;
  couleur: string;
  avg_duration_minutes: number;
  total_resolved: number;
  total_active: number;
  longest_duration_minutes: number;
  service_type: string;
}

interface QuartierRanking {
  commune: string;
  couleur: string;
  quartier: string;
  totalActifs: number;
  elecActifs: number;
  eauActifs: number;
  mairieActifs: number;
  totalAll: number;
}

interface PriorityReport {
  id: string;
  service_type: string;
  report_category: string;
  description: string;
  location: string;
  urgency: string;
  status: string;
  verifications: number;
  created_at: string;
  start_time: string;
}

function formatMinutes(mins: number): string {
  if (mins < 1) return "—";
  if (mins < 60) return `${Math.round(mins)}min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h < 24) return `${h}h${m > 0 ? m + "min" : ""}`;
  const d = Math.floor(h / 24);
  return `${d}j ${h % 24}h`;
}

// Skeleton card for loading state
const SkeletonCard = () => (
  <div className="rounded-2xl border border-border bg-card p-6 shadow-card animate-pulse">
    <div className="flex items-center gap-3 mb-4">
      <div className="h-10 w-10 rounded-xl bg-muted" />
      <div className="h-5 w-28 rounded bg-muted" />
    </div>
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map((k) => (
        <div key={k} className="text-center space-y-2">
          <div className="h-8 w-12 rounded bg-muted mx-auto" />
          <div className="h-3 w-10 rounded bg-muted mx-auto" />
        </div>
      ))}
    </div>
  </div>
);

const SkeletonCommune = () => (
  <div className="rounded-2xl border border-border bg-card p-5 shadow-card animate-pulse">
    <div className="flex items-center gap-3 mb-4">
      <div className="h-14 w-14 rounded-xl bg-muted shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-5 w-24 rounded bg-muted" />
        <div className="h-3 w-16 rounded bg-muted" />
      </div>
    </div>
    <div className="h-2 w-full rounded-full bg-muted mb-4" />
    <div className="grid grid-cols-2 gap-3">
      <div className="h-20 rounded-xl bg-muted" />
      <div className="h-20 rounded-xl bg-muted" />
    </div>
  </div>
);

const ReportRow = ({ r, variant }: { r: PriorityReport; variant: "critical" | "high" | "medium" }) => {
  const isElec = r.service_type === "electricity";
  const isInfra = r.report_category === "infrastructure";
  const durationMins = r.start_time ? (Date.now() - new Date(r.start_time).getTime()) / 60000 : 0;
  const timeSince = durationMins > 0 ? formatMinutes(durationMins) : "";

  // Duration color: green < 1h, orange 1–6h, red 6–24h, bold red > 24h
  const durTextClass = durationMins >= 1440
    ? "text-destructive font-extrabold"
    : durationMins >= 360 ? "text-destructive font-bold"
    : durationMins >= 60 ? "text-warning font-semibold"
    : "text-success font-medium";
  const durBgClass = durationMins >= 1440
    ? "bg-destructive/10 border border-destructive/30"
    : durationMins >= 360 ? "bg-destructive/5 border border-destructive/20"
    : durationMins >= 60 ? "bg-warning/10 border border-warning/20"
    : "bg-success/10 border border-success/20";
  const durationAlert = durationMins >= 1440 ? " — Agir maintenant" : durationMins >= 720 ? " — Non résolu" : "";

  // Extract people count embedded in description "[X personne(s)]"
  const peopleMatch = r.description.match(/\[(\d+)\s*personne/);
  const people = peopleMatch ? parseInt(peopleMatch[1]) : null;
  const cleanDesc = isInfra ? cleanDescription(r.description) : r.description.replace(/\s*\[\d+\s*personne\(s\)\]/g, "").trim();

  const leftBorder = variant === "critical"
    ? "border-l-4 border-l-destructive"
    : variant === "high" ? "border-l-4 border-l-warning"
    : "border-l-4 border-l-warning";

  // Compute priority for this report
  const priority = calculatePriority({
    service_type: r.service_type,
    start_time: r.start_time,
    created_at: r.created_at,
    status: r.status,
    verifications: r.verifications,
    urgency: r.urgency,
  });

  return (
    <div className={`flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/30 ${leftBorder}`}>
      {/* Service icon */}
      <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isInfra ? "bg-infra/20" : isElec ? "bg-electricity/20" : "bg-water/20"}`}>
        {isInfra ? <Wrench className="h-5 w-5 text-infra" /> : isElec ? <Zap className="h-5 w-5 text-electricity" /> : <Droplets className="h-5 w-5 text-water" />}
      </div>

      {/* Description + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <PriorityBadge priority={priority} showScore showFactors />
        </div>
        <p className="text-sm font-semibold text-foreground leading-snug">{cleanDesc}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />{r.location}
          </span>
          {people !== null && (
            <span className="flex items-center gap-0.5 text-xs font-semibold text-foreground">
              👤 {people} personne{people > 1 ? "s" : ""} impactée{people > 1 ? "s" : ""}
            </span>
          )}
          {r.verifications === 0 ? (
            <span className="text-xs italic text-muted-foreground">
              {isInfra ? "Pas encore soutenu pour réparation" : "Pas encore vérifié par les voisins"}
            </span>
          ) : (
            <span className="flex items-center gap-0.5 text-xs font-semibold text-success">
              {isInfra
                ? `✓ ${r.verifications} soutien${r.verifications > 1 ? "s" : ""} pour réparation`
                : `✓ ${r.verifications} voisin${r.verifications > 1 ? "s" : ""} confirm${r.verifications > 1 ? "ent" : "e"}`}
            </span>
          )}
        </div>
      </div>

      {/* Duration */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {timeSince && (
          <span className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs ${durTextClass} ${durBgClass}`}>
            <Clock className="h-3 w-3 shrink-0" />
            {timeSince}{durationAlert}
          </span>
        )}
      </div>
    </div>
  );
};

const INITIAL_COMMUNE_STATS: CommuneServiceStat[] = COMMUNES.map((c) => ({
  commune: c.nom,
  couleur: c.couleur,
  population: c.population,
  electricite_actifs: 0,
  electricite_resolus: 0,
  electricite_total: 0,
  eau_actifs: 0,
  eau_resolus: 0,
  eau_total: 0,
  mairie_actifs: 0,
  mairie_resolus: 0,
  mairie_total: 0,
  electricite_verified: 0,
  eau_verified: 0,
  mairie_verified: 0,
}));

const DashboardPage = () => {
  const navigate = useNavigate();
  const { isAdmin, isModerator, canValidate } = useUserRole();
  const { user } = useAuth();
  const [stats, setStats] = useState<CommuneServiceStat[]>(INITIAL_COMMUNE_STATS);
  const [durations, setDurations] = useState<DurationStat[]>([]);
  const [topQuartiers, setTopQuartiers] = useState<QuartierRanking[]>([]);
  const [priorityReports, setPriorityReports] = useState<PriorityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeActive, setRealtimeActive] = useState(false);
  const [moderatorName, setModeratorName] = useState<string>("");
  const [selectedCommune, setSelectedCommune] = useState("all");

  // Nouveaux contrôles ergonomiques pour 14+ communes
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "active_only" | "electricity" | "water" | "mairie">("all");
  const [sortBy, setSortBy] = useState<"activity" | "alphabetical" | "population">("activity");
  const [viewMode, setViewMode] = useState<"grid" | "detailed">("grid");

  const fetchAll = useCallback(async () => {
    const communeNames = COMMUNES.map((c) => c.nom);
    const [statsRes, durRes, reportsRes, ...quartierResults] = await Promise.all([
      supabase.rpc("get_commune_service_stats"),
      supabase.rpc("get_commune_duration_stats"),
      supabase.rpc("get_public_reports"),
      ...communeNames.map((nom) => supabase.rpc("get_commune_quartier_stats", { p_commune: nom })),
    ]);
    const rawStats = (!statsRes.error && Array.isArray(statsRes.data)) ? (statsRes.data as unknown as CommuneServiceStat[]) : [];
    const statsMap = new Map(rawStats.map((s) => [s.commune.toLowerCase().trim(), s]));

    const mergedStats: CommuneServiceStat[] = COMMUNES.map((c) => {
      const existing = statsMap.get(c.nom.toLowerCase().trim());
      if (existing) {
        return {
          ...existing,
          commune: c.nom,
          couleur: c.couleur || existing.couleur,
          population: c.population || existing.population,
        };
      }
      return {
        commune: c.nom,
        couleur: c.couleur,
        population: c.population,
        electricite_actifs: 0,
        electricite_resolus: 0,
        electricite_total: 0,
        eau_actifs: 0,
        eau_resolus: 0,
        eau_total: 0,
        mairie_actifs: 0,
        mairie_resolus: 0,
        mairie_total: 0,
        electricite_verified: 0,
        eau_verified: 0,
        mairie_verified: 0,
      };
    });

    setStats(mergedStats);
    if (!durRes.error && durRes.data) setDurations(durRes.data as unknown as DurationStat[]);
    if (!reportsRes.error && reportsRes.data) setPriorityReports(reportsRes.data as unknown as PriorityReport[]);

    // Build top quartiers ranking avec consolidation canonique des doublons (ex: Williamsville 2 & Williamsville II)
    const quartierAggMap = new Map<string, QuartierRanking>();

    quartierResults.forEach((res, idx) => {
      if (!res.error && res.data) {
        const commune = communeNames[idx];
        const couleur = COMMUNES.find((c) => c.nom === commune)?.couleur || "#888";
        (res.data as any[]).forEach((q) => {
          const rawName = (q.quartier || "").trim();
          if (!rawName || rawName === "__other" || rawName === "other" || rawName.toLowerCase() === "autre") return;
          const canonical = normalizeQuartier(rawName, commune);
          if (!canonical || canonical === "Secteur non précisé") return;

          const key = `${commune}|${canonical}`;
          const existing = quartierAggMap.get(key);

          const elecActifs = q.electricite_actifs || 0;
          const eauActifs = q.eau_actifs || 0;
          const mairieActifs = q.mairie_actifs || 0;
          const totalActifs = elecActifs + eauActifs + mairieActifs;
          const totalAll = (q.electricite_total || 0) + (q.eau_total || 0) + (q.mairie_total || 0);

          if (existing) {
            existing.elecActifs += elecActifs;
            existing.eauActifs += eauActifs;
            existing.mairieActifs += mairieActifs;
            existing.totalActifs += totalActifs;
            existing.totalAll += totalAll;
          } else if (totalActifs > 0 || totalAll > 0) {
            quartierAggMap.set(key, {
              commune,
              couleur,
              quartier: canonical,
              totalActifs,
              elecActifs,
              eauActifs,
              mairieActifs,
              totalAll,
            });
          }
        });
      }
    });

    const allQuartiers = Array.from(quartierAggMap.values());
    allQuartiers.sort((a, b) => b.totalActifs - a.totalActifs || b.totalAll - a.totalAll);
    setTopQuartiers(allQuartiers.slice(0, 10));

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime subscription with 3s debounce to handle high-traffic periods
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => {
        setRealtimeActive(true);
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          fetchAll();
          setTimeout(() => setRealtimeActive(false), 2000);
        }, 3000);
      })
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  // Fetch partner role
  const [isPartner, setIsPartner] = useState(false);
  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "partner" } as any).then(({ data }) => {
      if (data === true) setIsPartner(true);
    });
  }, [user]);

  // Fetch moderator display name from profiles
  useEffect(() => {
    if (!isModerator || !user) return;
    supabase
      .from("profiles")
      .select("display_name, first_name, last_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const name = `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() || data.display_name || user.email?.split("@")[0] || "";
          setModeratorName(name);
        }
      });
  }, [isModerator, user]);

  const totalElecActifs = stats.reduce((s, c) => s + c.electricite_actifs, 0);
  const totalElecResolus = stats.reduce((s, c) => s + c.electricite_resolus, 0);
  const totalElecTotal = stats.reduce((s, c) => s + c.electricite_total, 0);
  const totalElecVerified = stats.reduce((s, c) => s + c.electricite_verified, 0);
  const totalEauActifs = stats.reduce((s, c) => s + c.eau_actifs, 0);
  const totalEauResolus = stats.reduce((s, c) => s + c.eau_resolus, 0);
  const totalEauTotal = stats.reduce((s, c) => s + c.eau_total, 0);
  const totalEauVerified = stats.reduce((s, c) => s + c.eau_verified, 0);
  const totalMairieActifs = stats.reduce((s, c) => s + c.mairie_actifs, 0);
  const totalMairieResolus = stats.reduce((s, c) => s + c.mairie_resolus, 0);
  const totalMairieTotal = stats.reduce((s, c) => s + c.mairie_total, 0);
  const totalMairieVerified = stats.reduce((s, c) => s + c.mairie_verified, 0);
  const elecResolutionRate = totalElecTotal > 0 ? Math.round((totalElecResolus / totalElecTotal) * 100) : 0;
  const eauResolutionRate = totalEauTotal > 0 ? Math.round((totalEauResolus / totalEauTotal) * 100) : 0;
  const mairieResolutionRate = totalMairieTotal > 0 ? Math.round((totalMairieResolus / totalMairieTotal) * 100) : 0;

  // Leaderboard: sorted by total active (most affected first)
  const leaderboard = [...stats].sort((a, b) => (b.electricite_actifs + b.eau_actifs + b.mairie_actifs) - (a.electricite_actifs + a.eau_actifs + a.mairie_actifs));

  // Communes avec coupures actives
  const communesWithActivesCount = stats.filter((c) => (c.electricite_actifs + c.eau_actifs + c.mairie_actifs) > 0).length;

  // Filtrage et Tri des communes pour la section ergonomique
  const filteredStats = stats
    .filter((c) => {
      // Filtre sélection dropdown
      if (selectedCommune !== "all" && c.commune !== selectedCommune) return false;

      // Filtre recherche textuelle
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (!c.commune.toLowerCase().includes(q)) return false;
      }

      // Filtre statut
      const totalActifs = c.electricite_actifs + c.eau_actifs + c.mairie_actifs;
      if (filterMode === "active_only" && totalActifs === 0) return false;
      if (filterMode === "electricity" && c.electricite_actifs === 0) return false;
      if (filterMode === "water" && c.eau_actifs === 0) return false;
      if (filterMode === "mairie" && c.mairie_actifs === 0) return false;

      return true;
    })
    .sort((a, b) => {
      const aActifs = a.electricite_actifs + a.eau_actifs + a.mairie_actifs;
      const bActifs = b.electricite_actifs + b.eau_actifs + b.mairie_actifs;

      if (sortBy === "activity") {
        if (bActifs !== aActifs) return bActifs - aActifs;
        return (b.population || 0) - (a.population || 0);
      }
      if (sortBy === "alphabetical") {
        return a.commune.localeCompare(b.commune, "fr");
      }
      if (sortBy === "population") {
        return (b.population || 0) - (a.population || 0);
      }
      return 0;
    });

  const activeReports = priorityReports.filter((r) => r.status === "active");

  // Compute zone stats for priority scoring
  const dashZoneStats = (() => {
    const stats = new Map<string, { total: number; confirmed: number }>();
    for (const r of activeReports) {
      const loc = r.location.toLowerCase();
      const existing = stats.get(loc) || { total: 0, confirmed: 0 };
      existing.total++;
      if (r.verifications > 0) existing.confirmed++;
      stats.set(loc, existing);
    }
    return stats;
  })();

  // Priority reports — scored using international norms + zone context
  const scoredActiveReports = activeReports.map((r) => {
    const zone = dashZoneStats.get(r.location.toLowerCase());
    return {
      ...r,
      priority: calculatePriority({
        service_type: r.service_type,
        start_time: r.start_time,
        created_at: r.created_at,
        status: r.status,
        verifications: r.verifications,
        urgency: r.urgency,
        zoneContext: zone ? {
          totalReportsInQuartier: zone.total,
          confirmedReportsInQuartier: zone.confirmed,
        } : undefined,
      }),
    };
  }).sort((a, b) => b.priority.score - a.priority.score);
  const highPriorityReports = scoredActiveReports.filter((r) => r.priority.level === "P1" || r.priority.level === "P2");
  const mediumPriorityReports = scoredActiveReports.filter((r) => r.priority.level === "P3");

  // Confirmed zone alerts: reports with 3+ verifications grouped by location
  const confirmedReports = activeReports.filter((r) => r.verifications >= 3);
  const confirmedZones = (() => {
    const zones = new Map<string, { commune: string; quartier: string; serviceType: string; reportCategory: string; count: number; totalVerifications: number; firstDescription: string }>();
    for (const r of confirmedReports) {
      const parts = r.location.split(", ");
      const commune = parts[0] || r.location;
      const quartier = parts[1] || "";
      const key = `${commune}|${quartier}|${r.service_type}|${r.report_category}`;
      const existing = zones.get(key);
      if (existing) {
        existing.count++;
        existing.totalVerifications += r.verifications;
      } else {
        zones.set(key, { commune, quartier, serviceType: r.service_type, reportCategory: r.report_category ?? "outage", count: 1, totalVerifications: r.verifications, firstDescription: r.description });
      }
    }
    return Array.from(zones.values()).sort((a, b) => b.totalVerifications - a.totalVerifications);
  })();

  const totalActifs = totalElecActifs + totalEauActifs + totalMairieActifs;
  const isCrisis = totalActifs >= 10;
  const isEmpty = !loading && totalActifs === 0 && totalElecTotal + totalEauTotal + totalMairieTotal === 0;

  const maxHighDuration = highPriorityReports.length > 0
    ? Math.max(...highPriorityReports.map((r) => r.start_time ? (Date.now() - new Date(r.start_time).getTime()) / 60000 : 0))
    : 0;

  const dashboardTitle = isAdmin
    ? "Tableau opérateur"
    : isModerator
    ? "Tableau modérateur"
    : "Situation en direct";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Bannière de crise */}
      {isCrisis && !loading && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-destructive/10 border-b border-destructive/30 py-2.5"
        >
          <div className="container flex items-center justify-center gap-2 text-sm font-semibold text-destructive">
            <Siren className="h-4 w-4 animate-pulse motion-reduce:animate-none" />
            <span>
              Situation critique — {totalActifs} coupures actives en ce moment sur le Grand Abidjan
            </span>
            <Siren className="h-4 w-4 animate-pulse motion-reduce:animate-none" />
          </div>
        </motion.div>
      )}

      <main className="container py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-3xl font-bold text-foreground">{dashboardTitle}</h1>
            {isModerator && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {moderatorName || "Modérateur"}
              </span>
            )}
          </div>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-muted-foreground">14 communes — Grand Abidjan</p>
              <span className={`flex items-center gap-1 text-xs font-medium transition-colors ${realtimeActive ? "text-success" : "text-muted-foreground"}`}>
                <Radio className={`h-3 w-3 ${realtimeActive ? "animate-pulse motion-reduce:animate-none" : ""}`} />
                Live
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ShareButton
              title="Tableau de bord SIGNA·CI"
              text={`${totalActifs} coupures actives sur les 14 communes du Grand Abidjan`}
            />
          </div>
        </motion.div>

        {/* 🚀 Boutons d'Action Principaux Uniformisés (Signaler & Confirmer) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 flex flex-wrap gap-4"
        >
          <Link
            to="/signaler"
            className="group flex items-center gap-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white px-7 py-4 font-extrabold text-base sm:text-lg shadow-[0_8px_32px_rgba(5,150,105,0.35)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-xl backdrop-blur-sm">
              📢
            </div>
            <div className="flex flex-col text-left leading-tight">
              <span className="text-base font-extrabold tracking-wide">Documenter une coupure</span>
              <span className="text-[11px] font-medium text-white/80">CIE · SODECI · Mairies</span>
            </div>
            <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            to="/verification"
            className="group flex items-center gap-3.5 rounded-2xl border-2 border-sky-300 bg-sky-50/90 hover:bg-sky-100 text-sky-950 dark:border-sky-800 dark:bg-sky-950/40 dark:hover:bg-sky-900/60 dark:text-sky-200 px-7 py-4 font-bold text-base sm:text-lg shadow-sm backdrop-blur-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 font-extrabold text-xl">
              ✓
            </div>
            <div className="flex flex-col text-left leading-tight">
              <span className="text-base font-extrabold tracking-wide">Confirmer une coupure</span>
              <span className="text-[11px] font-medium text-sky-700 dark:text-sky-300">Vérifier & suivre en direct</span>
            </div>
            <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>

        {/* 👑 Centre de Commandement & Actions Rapides — Admin & Modérateurs */}
        {canValidate && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-card to-card p-5 shadow-card backdrop-blur-md"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shrink-0">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                    Centre de Commandement Admin
                    <span className="rounded-full bg-primary/20 text-primary text-xs px-2.5 py-0.5 font-extrabold border border-primary/30">
                      {isAdmin ? "Super-Admin" : "Modérateur"}
                    </span>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Pilotez la transmission aux opérateurs (CIE, SODECI, Mairies) et la modération en temps réel
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => navigate("/admin/relay")}
                  className="gap-1.5 font-bold text-xs bg-gradient-to-r from-primary to-teal-600 hover:from-primary/90 hover:to-teal-700 text-primary-foreground shadow-xs h-9"
                >
                  <Send className="h-4 w-4" />
                  Relais Opérateurs & Mairies
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/verification")}
                  className="gap-1.5 font-semibold text-xs border-primary/30 text-primary hover:bg-primary/10 h-9"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  File de Modération
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/admin/relay?tab=settings")}
                  className="gap-1.5 font-semibold text-xs border-border text-foreground hover:bg-muted h-9"
                >
                  <Building2 className="h-4 w-4 text-amber-500" />
                  Points Focaux Mairies
                </Button>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate("/admin/users")}
                    className="gap-1.5 font-semibold text-xs border-border text-muted-foreground hover:text-foreground h-9"
                  >
                    <Users className="h-4 w-4 text-blue-500" />
                    Utilisateurs
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* 🏢 Espace Opérateur / Partenaire — CIE, SODECI, Mairie */}
        {isPartner && !canValidate && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-card to-card p-5 shadow-card backdrop-blur-md"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shrink-0">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                    Espace Opérateur & Régie
                    <span className="rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs px-2.5 py-0.5 font-extrabold border border-amber-500/30">
                      Partenaire
                    </span>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Prenez en charge les signalements PADA, renseignez les N° d'intervention et informez les usagers
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => navigate("/partenaire")}
                className="gap-1.5 font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs h-9"
              >
                <Building2 className="h-4 w-4" />
                Ouvrir mon Dashboard Partenaire
              </Button>
            </div>
          </motion.div>
        )}

        {/* 🚨 Ticker d'urgence en direct */}
        {!loading && highPriorityReports.length > 0 && (
          <div className="mb-6 overflow-hidden rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
            </span>
            <span className="text-xs font-extrabold text-destructive uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Siren className="h-3.5 w-3.5" /> Urgences Live :
            </span>
            <div className="overflow-x-auto whitespace-nowrap text-xs text-foreground font-semibold scrollbar-none flex-1">
              {highPriorityReports.slice(0, 5).map((r, i) => (
                <span key={r.id} className="mr-6 inline-flex items-center gap-1 bg-background/60 border border-destructive/20 rounded-md px-2 py-0.5">
                  <span className="text-destructive font-bold">[{r.location}]</span> {r.description.slice(0, 65)} ({r.verifications} soutiens) {i < 4 ? "" : ""}
                </span>
              ))}
            </div>
          </div>
        )}
        {!loading && highPriorityReports.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-3 shadow-card hover:bg-destructive/10 transition-colors">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-xl font-bold text-foreground">Priorités critiques</h2>
                  <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">{highPriorityReports.length}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground bg-secondary rounded-full px-2 py-0.5 cursor-default">
                        <HelpCircle className="h-3 w-3" aria-hidden="true" />
                        Score P1/P2
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
                      <p className="font-semibold mb-1">Comment le score de priorité est calculé</p>
                      <ul className="space-y-0.5">
                        <li><strong>Type de service</strong> — eau &gt; électricité (norme OMS : accès à l'eau = urgence vitale)</li>
                        <li><strong>Durée</strong> — chaque heure sans résolution augmente le score (IEEE 1366)</li>
                        <li><strong>Corroborations</strong> — confirmations des voisins = fiabilité accrue</li>
                        <li><strong>Heure</strong> — nuit + week-end pèsent plus lourd (norme Sphère)</li>
                      </ul>
                      <p className="mt-1.5 text-muted-foreground">P1 = action immédiate · P2 = traitement urgent</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 rounded-2xl border border-destructive/20 bg-card shadow-card overflow-hidden divide-y divide-border">
                  {highPriorityReports.slice(0, 15).map((r) => (
                    <ReportRow key={r.id} r={r} variant={r.priority.level === "P1" ? "critical" : "high"} />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </motion.div>
        )}

        {/* État calme — aucune alerte critique */}
        {!loading && !canValidate && highPriorityReports.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mb-6 flex items-center gap-3 rounded-2xl border border-success/25 bg-success/8 px-5 py-3.5"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
            <p className="text-sm font-medium text-foreground">
              Tout va bien dans votre commune pour l'instant.
              <span className="ml-1 text-muted-foreground font-normal">Aucune coupure critique signalée.</span>
            </p>
          </motion.div>
        )}

        {/* CTA citoyen — 100% cohérent avec l'accueil et la version mobile */}
        {!canValidate && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => navigate("/signaler")}
              className="flex items-center justify-center gap-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-6 py-4 text-white shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-lg backdrop-blur-sm">
                📢
              </div>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-sm font-extrabold tracking-wide">Documenter une coupure</span>
                <span className="text-xs text-white/80">CIE · SODECI · Mairies</span>
              </div>
            </button>
            <button
              onClick={() => navigate("/verification")}
              className="flex items-center justify-center gap-3 rounded-2xl border-2 border-sky-300 bg-sky-50/90 hover:bg-sky-100 text-sky-950 dark:border-sky-800 dark:bg-sky-950/40 dark:hover:bg-sky-900/60 dark:text-sky-200 px-6 py-4 shadow-sm transition-all active:scale-[0.98]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 font-extrabold text-base">
                ✓
              </div>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-sm font-extrabold tracking-wide">Confirmer une coupure</span>
                <span className="text-xs text-sky-700 dark:text-sky-300">Vérifier & suivre en direct</span>
              </div>
            </button>
          </motion.div>
        )}

        {/* Global totals & KPIs — Électricité, Eau & Voirie */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : isEmpty ? (
            <div className="col-span-3 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-12 text-center shadow-xs">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mb-3">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <p className="font-display text-lg font-bold text-foreground">Situation stable — Aucune coupure active</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                Toutes les fournitures d'électricité, d'eau et les infrastructures de voirie fonctionnent normalement.
              </p>
            </div>
          ) : null}

          {/* Electricity + Water + Infrastructure cards */}
          {!loading && !isEmpty && (
            <>
              {/* Électricité */}
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card hover:shadow-md transition-shadow">
                <div className="absolute -right-4 -top-4 h-24 w-24 opacity-10">
                  <img src={electricityIcon} alt="" className="h-full w-full object-contain" />
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-electricity/15 shadow-xs">
                    <Zap className="h-5 w-5 text-electricity" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-foreground">Électricité (CIE / ANARE)</h2>
                    <p className="text-xs text-muted-foreground">Réseau basse & haute tension</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mt-4 bg-muted/30 p-2.5 rounded-xl border border-border/50">
                  <div><p className="font-display text-xl font-extrabold text-electricity">{totalElecActifs}</p><p className="text-[11px] text-muted-foreground font-semibold">Actives</p></div>
                  <div><p className="font-display text-xl font-extrabold text-success">{totalElecResolus}</p><p className="text-[11px] text-muted-foreground font-semibold">Résolues</p></div>
                  <div><p className="font-display text-xl font-extrabold text-foreground">{totalElecTotal}</p><p className="text-[11px] text-muted-foreground font-semibold">Total</p></div>
                </div>
                {totalElecTotal > 0 && (
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2.5">
                    <span>{totalElecVerified > 0 ? `✓ ${totalElecVerified} confirmé${totalElecVerified > 1 ? "s" : ""}` : "Non vérifié"}</span>
                    <span className="font-bold text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-md">{elecResolutionRate}% résolues</span>
                  </div>
                )}
              </div>

              {/* Eau */}
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card hover:shadow-md transition-shadow">
                <div className="absolute -right-4 -top-4 h-24 w-24 opacity-10">
                  <img src={waterIcon} alt="" className="h-full w-full object-contain" />
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-water/15 shadow-xs">
                    <Droplets className="h-5 w-5 text-water" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-foreground">Eau Potable (SODECI / ONEP)</h2>
                    <p className="text-xs text-muted-foreground">Distribution & fuites</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mt-4 bg-muted/30 p-2.5 rounded-xl border border-border/50">
                  <div><p className="font-display text-xl font-extrabold text-water">{totalEauActifs}</p><p className="text-[11px] text-muted-foreground font-semibold">Actives</p></div>
                  <div><p className="font-display text-xl font-extrabold text-success">{totalEauResolus}</p><p className="text-[11px] text-muted-foreground font-semibold">Résolues</p></div>
                  <div><p className="font-display text-xl font-extrabold text-foreground">{totalEauTotal}</p><p className="text-[11px] text-muted-foreground font-semibold">Total</p></div>
                </div>
                {totalEauTotal > 0 && (
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2.5">
                    <span>{totalEauVerified > 0 ? `✓ ${totalEauVerified} confirmé${totalEauVerified > 1 ? "s" : ""}` : "Non vérifié"}</span>
                    <span className="font-bold text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-md">{eauResolutionRate}% résolues</span>
                  </div>
                )}
              </div>

              {/* Voirie & Infrastructure */}
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card hover:shadow-md transition-shadow">
                <div className="absolute -right-4 -top-4 h-24 w-24 opacity-10">
                  <Construction className="h-full w-full text-infra" />
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-infra/15 shadow-xs">
                    <Construction className="h-5 w-5 text-infra" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-foreground">Mairies & Voirie</h2>
                    <p className="text-xs text-muted-foreground">Lampadaires · Caniveaux · Salubrité</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mt-4 bg-muted/30 p-2.5 rounded-xl border border-border/50">
                  <div><p className="font-display text-xl font-extrabold text-infra">{totalMairieActifs}</p><p className="text-[11px] text-muted-foreground font-semibold">Actifs</p></div>
                  <div><p className="font-display text-xl font-extrabold text-success">{totalMairieResolus}</p><p className="text-[11px] text-muted-foreground font-semibold">Réparés</p></div>
                  <div><p className="font-display text-xl font-extrabold text-foreground">{totalMairieTotal}</p><p className="text-[11px] text-muted-foreground font-semibold">Total</p></div>
                </div>
                {totalMairieTotal > 0 && (
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2.5">
                    <span>{totalMairieVerified > 0 ? `✓ ${totalMairieVerified} soutenu${totalMairieVerified > 1 ? "s" : ""}` : "Aucun soutien"}</span>
                    <span className="font-bold text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded-md">{mairieResolutionRate}% réparés</span>
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>

        {/* ═══ Zones de coupure confirmées ═══ */}
        {!loading && confirmedZones.length > 0 && (() => {
          const hasOutage = confirmedZones.some((z) => z.reportCategory === "outage");
          const hasInfra = confirmedZones.some((z) => z.reportCategory === "infrastructure" || z.serviceType === "mairie");

          // Compute only the operators actually present in infra zones
          const infraOperatorTypes = hasInfra ? [...new Set(
            confirmedZones
              .filter((z) => z.reportCategory === "infrastructure" || z.serviceType === "mairie")
              .map((z) => {
                const op = infraOperator(extractInfraLabel(z.firstDescription), z.commune);
                return op.startsWith("Mairie") ? "Mairie" : op;
              })
          )] : [];

          const sectionTitle = hasOutage && hasInfra
            ? "Signalements confirmés"
            : hasInfra
            ? "Infrastructures soutenues"
            : "Zones de coupure confirmées";
          const sectionSubtitle = hasOutage && hasInfra
            ? "Coupures vérifiées · infrastructures soutenues par 3+ citoyens"
            : hasInfra
            ? `Demandes de réparation soutenues par 3+ citoyens (${infraOperatorTypes.join(" / ")})`
            : "Signalements vérifiés par 3+ voisins — haute fiabilité";
          return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mb-8">
            <div className="rounded-2xl border-2 border-success/30 bg-success/5 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/20">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-foreground">{sectionTitle}</h3>
                  <p className="text-xs text-muted-foreground">{sectionSubtitle}</p>
                </div>
              </div>
              <div className="space-y-2">
                {confirmedZones.slice(0, 8).map((z) => {
                  const isElecService = z.serviceType === "electricity";
                  const isInfraReport = z.reportCategory === "infrastructure" || Boolean(extractInfraLabel(z.firstDescription));
                  const isMairieService = z.serviceType === "mairie" || z.serviceType === "voirie";
                  const isInfraType = isInfraReport || isMairieService;

                  const infraLabel = extractInfraLabel(z.firstDescription);
                  const isLampadaire = infraLabel?.toLowerCase().includes("lampadaire") || infraLabel?.toLowerCase().includes("éclairage") || z.firstDescription?.toLowerCase().includes("lampadaire");
                  const operator = isInfraType
                    ? infraOperator(infraLabel, z.commune)
                    : isElecService ? "CIE" : "SODECI";
                  const icon = isLampadaire
                    ? "💡"
                    : isInfraType
                    ? infraEmoji(infraLabel)
                    : isElecService ? "⚡" : "💧";
                  const typeLabel = isLampadaire
                    ? "Lampadaire / Éclairage public"
                    : isInfraType
                    ? (infraLabel ?? "Infrastructure")
                    : isElecService ? "Coupure électricité" : "Coupure d'eau";

                  const communeColor = COMMUNE_COLORS[z.commune] || "#888";
                  const hasQuartier = z.quartier && z.quartier !== z.commune;
                  const countLabel = isInfraType
                    ? `${z.totalVerifications} soutien${z.totalVerifications > 1 ? "s" : ""}`
                    : `${z.totalVerifications} confirmation${z.totalVerifications > 1 ? "s" : ""}`;

                  return (
                    <div
                      key={`${z.commune}|${z.quartier}|${z.serviceType}|${z.reportCategory}`}
                      className="flex items-center gap-3 rounded-xl bg-card border border-border px-4 py-3"
                      style={{ borderLeftColor: communeColor, borderLeftWidth: 4 }}
                    >
                      <span className="text-xl shrink-0">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{typeLabel}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {hasQuartier ? `${z.quartier} · ` : ""}{z.commune}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className="text-xs font-bold text-success">{countLabel}</span>
                        <span className="text-xs text-muted-foreground">→ {operator}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
          );
        })()}

        {/* Duration stats */}
        {!loading && durations.some((d) => d.total_resolved > 0) && (() => {
          const communeNames = [...new Set(durations.map((d) => d.commune))];
          const elecDurations = durations.filter((d) => d.service_type === "electricity" && d.total_resolved > 0);
          const waterDurations = durations.filter((d) => d.service_type === "water" && d.total_resolved > 0);
          const globalElecAvg = elecDurations.length > 0 ? elecDurations.reduce((s, d) => s + d.avg_duration_minutes * d.total_resolved, 0) / elecDurations.reduce((s, d) => s + d.total_resolved, 0) : 0;
          const globalWaterAvg = waterDurations.length > 0 ? waterDurations.reduce((s, d) => s + d.avg_duration_minutes * d.total_resolved, 0) / waterDurations.reduce((s, d) => s + d.total_resolved, 0) : 0;
          const globalElecMax = elecDurations.length > 0 ? Math.max(...elecDurations.map((d) => d.longest_duration_minutes)) : 0;
          const globalWaterMax = waterDurations.length > 0 ? Math.max(...waterDurations.map((d) => d.longest_duration_minutes)) : 0;
          const totalElecResolved = elecDurations.reduce((s, d) => s + d.total_resolved, 0);
          const totalWaterResolved = waterDurations.reduce((s, d) => s + d.total_resolved, 0);

          return (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
              <div className="mb-3">
                <h2 className="font-display text-xl font-bold text-foreground mb-1">Durée moyenne des coupures</h2>
                <p className="text-xs text-muted-foreground">
                  Temps écoulé entre le <strong>début de coupure</strong> (déclaré) et la <strong>résolution</strong>. Basé uniquement sur les signalements résolus.
                </p>
              </div>

              {/* Global summary */}
              <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-electricity/20 bg-electricity/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-electricity" />
                    <span className="text-xs font-semibold text-foreground">Électricité (CIE)</span>
                  </div>
                  <div className="flex items-baseline gap-4 flex-wrap">
                    <div>
                      <p className="font-display text-2xl font-extrabold text-electricity">{globalElecAvg > 0 ? formatMinutes(globalElecAvg) : "—"}</p>
                      <p className="text-xs text-muted-foreground">durée moy.</p>
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-foreground">{globalElecMax > 0 ? formatMinutes(globalElecMax) : "—"}</p>
                      <p className="text-xs text-muted-foreground">la plus longue</p>
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-muted-foreground">{totalElecResolved}</p>
                      <p className="text-xs text-muted-foreground">résolu{totalElecResolved > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-water/20 bg-water/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="h-4 w-4 text-water" />
                    <span className="text-xs font-semibold text-foreground">Eau (SODECI)</span>
                  </div>
                  <div className="flex items-baseline gap-4 flex-wrap">
                    <div>
                      <p className="font-display text-2xl font-extrabold text-water">{globalWaterAvg > 0 ? formatMinutes(globalWaterAvg) : "—"}</p>
                      <p className="text-xs text-muted-foreground">durée moy.</p>
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-foreground">{globalWaterMax > 0 ? formatMinutes(globalWaterMax) : "—"}</p>
                      <p className="text-xs text-muted-foreground">la plus longue</p>
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-muted-foreground">{totalWaterResolved}</p>
                      <p className="text-xs text-muted-foreground">résolu{totalWaterResolved > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Per commune - table format — canValidate only */}
              {canValidate && <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Commune</th>
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">
                          <span className="flex items-center justify-center gap-1"><Zap className="h-3 w-3 text-electricity" />Moy.</span>
                        </th>
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">
                          <span className="flex items-center justify-center gap-1"><Zap className="h-3 w-3 text-electricity" />Max</span>
                        </th>
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">
                          <span className="flex items-center justify-center gap-1"><Droplets className="h-3 w-3 text-water" />Moy.</span>
                        </th>
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground">
                          <span className="flex items-center justify-center gap-1"><Droplets className="h-3 w-3 text-water" />Max</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {communeNames.map((commune) => {
                        const elec = durations.find((d) => d.commune === commune && d.service_type === "electricity");
                        const water = durations.find((d) => d.commune === commune && d.service_type === "water");
                        const couleur = elec?.couleur || water?.couleur || "#888";
                        return (
                          <tr key={commune} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5 font-semibold text-sm" style={{ color: couleur }}>{commune}</td>
                            <td className="text-center px-3 py-2.5 font-bold text-sm">{elec && elec.total_resolved > 0 ? formatMinutes(elec.avg_duration_minutes) : "—"}</td>
                            <td className="text-center px-3 py-2.5 text-xs text-muted-foreground">{elec && elec.total_resolved > 0 ? formatMinutes(elec.longest_duration_minutes) : "—"}</td>
                            <td className="text-center px-3 py-2.5 font-bold text-sm">{water && water.total_resolved > 0 ? formatMinutes(water.avg_duration_minutes) : "—"}</td>
                            <td className="text-center px-3 py-2.5 text-xs text-muted-foreground">{water && water.total_resolved > 0 ? formatMinutes(water.longest_duration_minutes) : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>}
            </motion.div>
          );
        })()}

        {/* Top quartiers */}
        {!loading && topQuartiers.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="mb-8">
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-5 py-3 shadow-card hover:bg-secondary/50 transition-colors">
                <h2 className="font-display text-xl font-bold text-foreground">Top 10 quartiers les plus touchés</h2>
                <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 rounded-2xl border border-border bg-card shadow-card overflow-hidden divide-y divide-border">
                  {topQuartiers.map((q, i) => {
                    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
                    return (
                      <div key={`${q.commune}-${q.quartier}`} className="flex items-center gap-4 px-5 py-3 hover:bg-secondary/50 transition-colors">
                        <span className="text-lg font-bold w-8 text-center">{medal}</span>
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => navigate(`/commune/${encodeURIComponent(q.commune)}`)}
                            className="font-bold text-sm hover:underline"
                            style={{ color: q.couleur }}
                          >
                            {q.quartier}
                          </button>
                          <p className="text-xs text-muted-foreground">{q.commune}</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-electricity" />{q.elecActifs}</span>
                          <span className="flex items-center gap-1"><Droplets className="h-3 w-3 text-water" />{q.eauActifs}</span>
                          <span className="flex items-center gap-1"><Construction className="h-3 w-3 text-infra" />{q.mairieActifs}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-lg font-extrabold" style={{ color: q.totalActifs > 0 ? q.couleur : undefined }}>
                            {q.totalActifs}
                          </p>
                          <p className="text-xs text-muted-foreground">active{q.totalActifs !== 1 ? "s" : ""} / {q.totalAll}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </motion.div>
        )}
        {/* Leaderboard */}
        {canValidate && (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
          <Collapsible>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-5 py-3 shadow-card hover:bg-secondary/50 transition-colors">
              <h2 className="font-display text-xl font-bold text-foreground">Classement des coupures en cours par commune</h2>
              <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 rounded-2xl border border-border bg-card shadow-card overflow-hidden">
                {loading ? (
                  <div className="divide-y divide-border animate-pulse">
                    {[1,2,3,4,5].map((k) => (
                      <div key={k} className="flex items-center gap-4 px-5 py-4">
                        <div className="h-6 w-8 rounded bg-muted" />
                        <div className="h-10 w-10 rounded-lg bg-muted shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-24 rounded bg-muted" />
                          <div className="h-3 w-16 rounded bg-muted" />
                        </div>
                        <div className="h-7 w-8 rounded bg-muted" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {leaderboard.map((c, i) => {
                      const totalActifs = c.electricite_actifs + c.eau_actifs + c.mairie_actifs;
                      const totalAll = c.electricite_total + c.eau_total + c.mairie_total;
                      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;

                      return (
                        <div key={c.commune} className="flex items-center gap-4 px-5 py-4 hover:bg-secondary/50 transition-colors">
                          <span className="text-lg font-bold w-8 text-center">{medal}</span>
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg overflow-hidden border border-border" style={{ backgroundColor: COMMUNE_LOGOS[c.commune] ? '#fff' : c.couleur }}>
                            {COMMUNE_LOGOS[c.commune] ? (
                              <img src={COMMUNE_LOGOS[c.commune]} alt={c.commune} className="h-full w-full object-contain p-0.5" />
                            ) : (
                              <span className="text-white font-bold text-xs">{c.commune[0]}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <button onClick={() => navigate(`/commune/${encodeURIComponent(c.commune)}`)} className="font-bold text-foreground hover:underline" style={{ color: c.couleur }}>
                              {c.commune}
                            </button>
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-0.5"><Zap className="h-3 w-3 text-electricity" />{c.electricite_actifs}</span>
                              <span className="flex items-center gap-0.5"><Droplets className="h-3 w-3 text-water" />{c.eau_actifs}</span>
                              <span className="flex items-center gap-0.5"><Construction className="h-3 w-3 text-infra" />{c.mairie_actifs}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-display text-xl font-extrabold" style={{ color: totalActifs > 0 ? c.couleur : undefined }}>
                              {totalActifs}
                            </p>
                            <p className="text-xs text-muted-foreground">active{totalActifs !== 1 ? "s" : ""} / {totalAll}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </motion.div>)}

        {/* 🏙️ Détail par commune — Ergonomie 14+ Communes avec Grille Compacte & Filtres Intelligents */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-bold text-foreground">Détail par commune</h2>
              <Badge variant="outline" className="font-bold text-xs bg-muted/50">
                {filteredStats.length} sur {stats.length} communes
              </Badge>
            </div>

            {/* Sélecteur de vue (Grille compacte vs Liste détaillée) */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border">
                <Button
                  size="sm"
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  onClick={() => setViewMode("grid")}
                  className={`h-7 px-2.5 text-xs font-semibold rounded-lg ${viewMode === "grid" ? "shadow-xs" : "text-muted-foreground"}`}
                  title="Vue Grille Compacte"
                >
                  <LayoutGrid className="h-3.5 w-3.5 mr-1" />
                  Grille compacte
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "detailed" ? "default" : "ghost"}
                  onClick={() => setViewMode("detailed")}
                  className={`h-7 px-2.5 text-xs font-semibold rounded-lg ${viewMode === "detailed" ? "shadow-xs" : "text-muted-foreground"}`}
                  title="Vue Détaillée"
                >
                  <List className="h-3.5 w-3.5 mr-1" />
                  Détaillée
                </Button>
              </div>

              {/* Tri */}
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-[170px] h-8 text-xs font-medium">
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Trier par..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activity">🔴 Plus d'incidents</SelectItem>
                  <SelectItem value="alphabetical">🔤 Alphabétique (A-Z)</SelectItem>
                  <SelectItem value="population">👥 Plus peuplées</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Barre de recherche et Filtres rapides en chips */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Champ de recherche instantanée */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une commune (ex: Cocody, Yopougon, Abobo...)"
                className="pl-9 pr-9 h-9 text-sm rounded-xl bg-card border-border"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Chips de filtres rapides */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <Button
                size="sm"
                variant={filterMode === "all" ? "default" : "outline"}
                onClick={() => setFilterMode("all")}
                className="h-8 px-3 text-xs rounded-lg whitespace-nowrap"
              >
                Toutes ({stats.length})
              </Button>
              <Button
                size="sm"
                variant={filterMode === "active_only" ? "default" : "outline"}
                onClick={() => setFilterMode("active_only")}
                className={`h-8 px-3 text-xs rounded-lg whitespace-nowrap ${
                  communesWithActivesCount > 0 && filterMode !== "active_only"
                    ? "border-destructive/40 text-destructive hover:bg-destructive/10"
                    : ""
                }`}
              >
                <span className="flex h-2 w-2 rounded-full bg-destructive mr-1.5" />
                Actives ({communesWithActivesCount})
              </Button>
              <Button
                size="sm"
                variant={filterMode === "electricity" ? "default" : "outline"}
                onClick={() => setFilterMode("electricity")}
                className="h-8 px-2.5 text-xs rounded-lg whitespace-nowrap"
              >
                <Zap className="h-3 w-3 mr-1 text-electricity" />
                CIE ({stats.filter((c) => c.electricite_actifs > 0).length})
              </Button>
              <Button
                size="sm"
                variant={filterMode === "water" ? "default" : "outline"}
                onClick={() => setFilterMode("water")}
                className="h-8 px-2.5 text-xs rounded-lg whitespace-nowrap"
              >
                <Droplets className="h-3 w-3 mr-1 text-water" />
                SODECI ({stats.filter((c) => c.eau_actifs > 0).length})
              </Button>
              <Button
                size="sm"
                variant={filterMode === "mairie" ? "default" : "outline"}
                onClick={() => setFilterMode("mairie")}
                className="h-8 px-2.5 text-xs rounded-lg whitespace-nowrap"
              >
                <Construction className="h-3 w-3 mr-1 text-infra" />
                Mairie ({stats.filter((c) => c.mairie_actifs > 0).length})
              </Button>
            </div>
          </div>
        </div>

        {/* Rendu des Communes (Grille compacte ou Liste détaillée) */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((k) => <SkeletonCommune key={k} />)}
          </div>
        ) : filteredStats.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Filter className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
            <h3 className="font-display font-bold text-base text-foreground mb-1">Aucune commune trouvée</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Aucune commune ne correspond aux filtres ou à la recherche "{searchQuery}".
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setFilterMode("all");
                setSelectedCommune("all");
              }}
              className="text-xs font-semibold"
            >
              Réinitialiser les filtres
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          /* ───────── VUE GRILLE COMPACTE (2 colonnes élégantes et ultra-lisibles) ───────── */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredStats.map((c, i) => {
              const totalActifs = c.electricite_actifs + c.eau_actifs + c.mairie_actifs;
              const totalResolus = c.electricite_resolus + c.eau_resolus + c.mairie_resolus;
              const totalSignalements = c.electricite_total + c.eau_total + c.mairie_total;
              const resolutionRate = totalSignalements > 0 ? Math.round((totalResolus / totalSignalements) * 100) : 100;
              const pctPop = c.population > 0 ? (totalSignalements / c.population) * 100 : 0;
              const pctPopDisplay = pctPop < 0.01 && totalSignalements > 0 ? "<0.01" : pctPop.toFixed(2);

              return (
                <motion.div
                  key={c.commune}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="rounded-2xl border border-border bg-card p-4 shadow-card hover:border-primary/40 hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div>
                    {/* En-tête de la carte */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl overflow-hidden border border-border/80 shadow-xs"
                          style={{ backgroundColor: COMMUNE_LOGOS[c.commune] ? "#fff" : c.couleur }}
                        >
                          {COMMUNE_LOGOS[c.commune] ? (
                            <img src={COMMUNE_LOGOS[c.commune]} alt={c.commune} className="h-full w-full object-contain p-1" />
                          ) : (
                            <span className="text-white font-bold text-xs">#{i + 1}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <button
                            onClick={() => navigate(`/commune/${encodeURIComponent(c.commune)}`)}
                            className="font-bold text-foreground text-base hover:underline underline-offset-2 transition-colors block truncate text-left"
                            style={{ color: c.couleur }}
                          >
                            {c.commune}
                          </button>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{(c.population / 1000).toFixed(0)}k hab.</span>
                            <span>•</span>
                            <span className="font-medium">{pctPopDisplay}% pop.</span>
                          </div>
                        </div>
                      </div>

                      {/* Statut Badge */}
                      {totalActifs === 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                          <CheckCircle2 className="h-3 w-3" />
                          Calme
                        </span>
                      ) : totalActifs < 5 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full shrink-0">
                          <AlertTriangle className="h-3 w-3" />
                          {totalActifs} active{totalActifs > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-destructive bg-destructive/10 border border-destructive/30 px-2 py-0.5 rounded-full shrink-0 animate-pulse">
                          <Siren className="h-3 w-3" />
                          {totalActifs} critiques
                        </span>
                      )}
                    </div>

                    {/* 3 Mini-Pills des Opérateurs */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="rounded-xl bg-electricity/5 border border-electricity/20 p-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <Zap className="h-3 w-3 text-electricity" />
                          <span className="text-[11px] font-semibold text-foreground">CIE</span>
                        </div>
                        <p className="font-display text-sm font-bold text-electricity">
                          {c.electricite_actifs}{" "}
                          <span className="text-[10px] font-normal text-muted-foreground">/ {c.electricite_total}</span>
                        </p>
                      </div>

                      <div className="rounded-xl bg-water/5 border border-water/20 p-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <Droplets className="h-3 w-3 text-water" />
                          <span className="text-[11px] font-semibold text-foreground">SODECI</span>
                        </div>
                        <p className="font-display text-sm font-bold text-water">
                          {c.eau_actifs}{" "}
                          <span className="text-[10px] font-normal text-muted-foreground">/ {c.eau_total}</span>
                        </p>
                      </div>

                      <div className="rounded-xl bg-infra/5 border border-infra/20 p-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <Construction className="h-3 w-3 text-infra" />
                          <span className="text-[11px] font-semibold text-foreground">Mairie</span>
                        </div>
                        <p className="font-display text-sm font-bold text-infra">
                          {c.mairie_actifs}{" "}
                          <span className="text-[10px] font-normal text-muted-foreground">/ {c.mairie_total}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pied de carte avec barre de résolution et CTA */}
                  <div className="pt-2 border-t border-border flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-success transition-all" style={{ width: `${resolutionRate}%` }} />
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium shrink-0">
                        {resolutionRate}% résolus
                      </span>
                    </div>

                    <button
                      onClick={() => navigate(`/commune/${encodeURIComponent(c.commune)}`)}
                      className="font-semibold text-primary group-hover:underline flex items-center gap-1 shrink-0 text-[11px]"
                    >
                      Détails →
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* ───────── VUE DÉTAILLÉE (Cartes complètes avec statistiques approfondies) ───────── */
          <div className="space-y-4">
            {filteredStats.map((c, i) => {
              const totalSignalements = c.electricite_total + c.eau_total + c.mairie_total;
              const pctPop = c.population > 0 ? (totalSignalements / c.population) * 100 : 0;
              const pctPopDisplay = pctPop < 0.01 && totalSignalements > 0 ? "<0.01" : pctPop.toFixed(2);
              const capacite = Math.floor(c.population / 2);
              const tauxCapacite = capacite > 0 ? Math.min((totalSignalements / capacite) * 100, 100) : 0;

              return (
                <motion.div
                  key={c.commune}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  className="rounded-2xl border border-border bg-card p-5 shadow-card hover:border-border/80 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl overflow-hidden border border-border shadow-xs"
                      style={{ backgroundColor: COMMUNE_LOGOS[c.commune] ? "#fff" : c.couleur }}
                    >
                      {COMMUNE_LOGOS[c.commune] ? (
                        <img src={COMMUNE_LOGOS[c.commune]} alt={c.commune} className="h-full w-full object-contain p-1" />
                      ) : (
                        <span className="text-white font-bold text-sm">#{i + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => navigate(`/commune/${encodeURIComponent(c.commune)}`)}
                          className="font-bold text-foreground text-lg hover:underline underline-offset-2 transition-colors"
                          style={{ color: c.couleur }}
                        >
                          {c.commune}
                        </button>
                        <span className="text-xs font-semibold" style={{ color: c.couleur }}>
                          {pctPopDisplay}% de la pop.
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{(c.population / 1000).toFixed(0)}k hab.</span>
                        <span>•</span>
                        <span>{totalSignalements} signalements au total</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-4">
                    <div
                      className="h-full rounded-full transition-[width] duration-700"
                      style={{ width: `${Math.max(tauxCapacite, 1)}%`, backgroundColor: c.couleur }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-electricity/5 border border-electricity/20 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-electricity" />
                        <span className="text-xs font-semibold text-foreground">CIE</span>
                      </div>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <div>
                          <span className="font-display text-xl font-extrabold text-electricity">{c.electricite_actifs}</span>
                          <span className="text-xs text-muted-foreground ml-1">actif{c.electricite_actifs !== 1 ? "s" : ""}</span>
                        </div>
                        <div>
                          <span className="font-display text-sm font-bold text-success">{c.electricite_resolus}</span>
                          <span className="text-xs text-muted-foreground ml-1">résolu{c.electricite_resolus !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-water/5 border border-water/20 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Droplets className="h-4 w-4 text-water" />
                        <span className="text-xs font-semibold text-foreground">SODECI</span>
                      </div>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <div>
                          <span className="font-display text-xl font-extrabold text-water">{c.eau_actifs}</span>
                          <span className="text-xs text-muted-foreground ml-1">actif{c.eau_actifs !== 1 ? "s" : ""}</span>
                        </div>
                        <div>
                          <span className="font-display text-sm font-bold text-success">{c.eau_resolus}</span>
                          <span className="text-xs text-muted-foreground ml-1">résolu{c.eau_resolus !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-infra/5 border border-infra/20 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Construction className="h-4 w-4 text-infra" />
                        <span className="text-xs font-semibold text-foreground">Mairie</span>
                      </div>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <div>
                          <span className="font-display text-xl font-extrabold text-infra">{c.mairie_actifs}</span>
                          <span className="text-xs text-muted-foreground ml-1">actif{c.mairie_actifs !== 1 ? "s" : ""}</span>
                        </div>
                        <div>
                          <span className="font-display text-sm font-bold text-success">{c.mairie_resolus}</span>
                          <span className="text-xs text-muted-foreground ml-1">résolu{c.mairie_resolus !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active reports summary for this commune */}
                  {(() => {
                    const communeReports = scoredActiveReports.filter(
                      (r) => r.location.toLowerCase() === c.commune.toLowerCase()
                    );
                    if (communeReports.length === 0) return null;
                    const elecCount = communeReports.filter((r) => r.service_type === "electricity").length;
                    const eauCount = communeReports.filter((r) => r.service_type === "water").length;
                    const mairieCount = communeReports.filter((r) => r.service_type === "mairie").length;
                    const verifiedCount = communeReports.filter((r) => r.verifications > 0).length;
                    return (
                      <div className="mt-4 border-t border-border pt-3">
                        <button
                          onClick={() => navigate(`/commune/${encodeURIComponent(c.commune)}`)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors group"
                        >
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs font-bold text-foreground">
                              {communeReports.length} signalement{communeReports.length > 1 ? "s" : ""} actif{communeReports.length > 1 ? "s" : ""}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {elecCount > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <Zap className="h-3 w-3 text-electricity" />
                                  {elecCount}
                                </span>
                              )}
                              {eauCount > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <Droplets className="h-3 w-3 text-water" />
                                  {eauCount}
                                </span>
                              )}
                              {mairieCount > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <Construction className="h-3 w-3 text-infra" />
                                  {mairieCount}
                                </span>
                              )}
                            </div>
                            {verifiedCount > 0 && (
                              <span className="text-xs font-semibold text-success">
                                ✓ {verifiedCount} confirmé{verifiedCount > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-primary group-hover:underline">Voir détails →</span>
                        </button>
                      </div>
                    );
                  })()}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Trends chart - admin only */}
        {isAdmin && <TrendsChart className="mt-8" />}
      </main>
      <Footer />
    </div>
  );
};

export default DashboardPage;
