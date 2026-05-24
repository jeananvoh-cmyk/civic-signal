import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { Zap, Droplets, Clock, Trophy, ChevronDown, Radio, Flame, AlertTriangle, MapPin, Siren, Construction, CheckCircle2, Info, Wrench } from "lucide-react";
import Header from "@/components/Header";
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
  const durationAlert = durationMins >= 1440 ? " — Agir maintenant !" : durationMins >= 720 ? " — Non résolu" : "";

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
          <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" />{r.location}
          </span>
          {people !== null && (
            <span className="flex items-center gap-0.5 text-[11px] font-semibold text-foreground">
              👤 {people} personne{people > 1 ? "s" : ""} impactée{people > 1 ? "s" : ""}
            </span>
          )}
          {r.verifications === 0 ? (
            <span className="text-[10px] italic text-muted-foreground">
              {isInfra ? "Pas encore soutenu pour réparation" : "Pas encore vérifié par les voisins"}
            </span>
          ) : (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-success">
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

const DashboardPage = () => {
  const navigate = useNavigate();
  const { isAdmin, isModerator, canValidate } = useUserRole();
  const { user } = useAuth();
  const [stats, setStats] = useState<CommuneServiceStat[]>([]);
  const [durations, setDurations] = useState<DurationStat[]>([]);
  const [topQuartiers, setTopQuartiers] = useState<QuartierRanking[]>([]);
  const [priorityReports, setPriorityReports] = useState<PriorityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeActive, setRealtimeActive] = useState(false);
  const [moderatorName, setModeratorName] = useState<string>("");
  const [selectedCommune, setSelectedCommune] = useState("all");

  const fetchAll = useCallback(async () => {
    const communeNames = COMMUNES.map((c) => c.nom);
    const [statsRes, durRes, reportsRes, ...quartierResults] = await Promise.all([
      supabase.rpc("get_commune_service_stats"),
      supabase.rpc("get_commune_duration_stats"),
      supabase.rpc("get_public_reports"),
      ...communeNames.map((nom) => supabase.rpc("get_commune_quartier_stats", { p_commune: nom })),
    ]);
    if (!statsRes.error && statsRes.data) setStats(statsRes.data as unknown as CommuneServiceStat[]);
    else setStats(COMMUNES.map((c) => ({ commune: c.nom, couleur: c.couleur, population: c.population, electricite_actifs: 0, electricite_resolus: 0, electricite_total: 0, eau_actifs: 0, eau_resolus: 0, eau_total: 0, mairie_actifs: 0, mairie_resolus: 0, mairie_total: 0, electricite_verified: 0, eau_verified: 0, mairie_verified: 0 })));
    if (!durRes.error && durRes.data) setDurations(durRes.data as unknown as DurationStat[]);
    if (!reportsRes.error && reportsRes.data) setPriorityReports(reportsRes.data as unknown as PriorityReport[]);

    // Build top quartiers ranking
    const allQuartiers: QuartierRanking[] = [];
    quartierResults.forEach((res, idx) => {
      if (!res.error && res.data) {
        const commune = communeNames[idx];
        const couleur = COMMUNES.find((c) => c.nom === commune)?.couleur || "#888";
        (res.data as any[]).forEach((q) => {
          const totalActifs = (q.electricite_actifs || 0) + (q.eau_actifs || 0) + (q.mairie_actifs || 0);
          if (totalActifs > 0 || (q.electricite_total || 0) + (q.eau_total || 0) + (q.mairie_total || 0) > 0) {
            allQuartiers.push({
              commune,
              couleur,
              quartier: q.quartier,
              totalActifs,
              elecActifs: q.electricite_actifs || 0,
              eauActifs: q.eau_actifs || 0,
              mairieActifs: q.mairie_actifs || 0,
              totalAll: (q.electricite_total || 0) + (q.eau_total || 0) + (q.mairie_total || 0),
            });
          }
        });
      }
    });
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
    ? "Dashboard Opérateur"
    : isModerator
    ? "Dashboard Modérateur"
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
            <Siren className="h-4 w-4 animate-pulse" />
            <span>
              Situation critique — {totalActifs} coupures actives en ce moment sur les 7 communes pilotes
            </span>
            <Siren className="h-4 w-4 animate-pulse" />
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
              <p className="text-muted-foreground">7 communes pilotes — Abidjan</p>
              <span className={`flex items-center gap-1 text-xs font-medium transition-colors ${realtimeActive ? "text-success" : "text-muted-foreground"}`}>
                <Radio className={`h-3 w-3 ${realtimeActive ? "animate-pulse" : ""}`} />
                Live
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ShareButton
              title="Tableau de Bord SIGNA-CI"
              text={`📊 ${totalActifs} coupures actives sur les 7 communes pilotes d'Abidjan`}
            />
          </div>
        </motion.div>

        {/* CTA citoyen */}
        {!canValidate && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mb-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate("/signaler")}
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-primary px-4 py-4 text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
            >
              <Siren className="h-5 w-5" />
              <span className="text-sm font-bold">Signaler</span>
              <span className="text-[10px] opacity-80">Eau · électricité · voirie</span>
            </button>
            <button
              onClick={() => navigate("/verification")}
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-primary/30 bg-primary/5 px-4 py-4 text-primary transition-all hover:bg-primary/10 active:scale-[0.98]"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-bold">Corroborer</span>
              <span className="text-[10px] text-muted-foreground">Confirmer dans votre quartier</span>
            </button>
          </motion.div>
        )}

        {/* Priority reports P1/P2 — remontés en priorité */}
        {!loading && highPriorityReports.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-3 shadow-card hover:bg-destructive/10 transition-colors">
                <div className="flex items-center gap-2 flex-wrap">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <h2 className="font-display text-xl font-bold text-foreground">Priorités critiques</h2>
                  <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">{highPriorityReports.length}</span>
                  <span className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
                    <Info className="h-3 w-3" />
                    Score OMS / IEEE / Sphère
                  </span>
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

        {/* Global totals — admin/moderator only */}
        {canValidate && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : isEmpty ? (
              <div className="col-span-2 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary mb-4">
                  <Zap className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="font-display text-lg font-bold text-foreground">Aucune coupure active</p>
                <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                  Tout est normal pour le moment dans les 7 communes pilotes. Les signalements apparaîtront ici en temps réel.
                </p>
              </div>
            ) : null}
            {/* Electricity + Water + Infrastructure cards */}
            {!loading && !isEmpty && (
              <>
                {/* Électricité */}
                <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card">
                  <div className="absolute -right-4 -top-4 h-24 w-24 opacity-10">
                    <img src={electricityIcon} alt="" className="h-full w-full object-contain" />
                  </div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-electricity/15">
                      <Zap className="h-5 w-5 text-electricity" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-bold text-foreground">Électricité</h2>
                      <p className="text-[10px] text-muted-foreground">Coupures réseau CIE</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center mt-4">
                    <div><p className="font-display text-2xl font-extrabold text-electricity">{totalElecActifs}</p><p className="text-xs text-muted-foreground">Actives</p></div>
                    <div><p className="font-display text-2xl font-extrabold text-success">{totalElecResolus}</p><p className="text-xs text-muted-foreground">Résolues</p></div>
                    <div><p className="font-display text-2xl font-extrabold text-foreground">{totalElecTotal}</p><p className="text-xs text-muted-foreground">Total</p></div>
                  </div>
                  {totalElecTotal > 0 && (
                    <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border pt-3">
                      <span>{totalElecVerified > 0 ? `✓ ${totalElecVerified} confirmé${totalElecVerified > 1 ? "s" : ""} par voisins` : "Aucune confirmation"}</span>
                      <span className="font-semibold text-foreground">{elecResolutionRate}% résolues</span>
                    </div>
                  )}
                  <p className="mt-2 text-[11px] text-muted-foreground/70 italic">
                    « Résolu » = confirmé par l'auteur ou 3 voisins
                  </p>
                </div>

                {/* Eau */}
                <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card">
                  <div className="absolute -right-4 -top-4 h-24 w-24 opacity-10">
                    <img src={waterIcon} alt="" className="h-full w-full object-contain" />
                  </div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-water/15">
                      <Droplets className="h-5 w-5 text-water" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-bold text-foreground">Eau</h2>
                      <p className="text-[10px] text-muted-foreground">Coupures réseau SODECI</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center mt-4">
                    <div><p className="font-display text-2xl font-extrabold text-water">{totalEauActifs}</p><p className="text-xs text-muted-foreground">Actives</p></div>
                    <div><p className="font-display text-2xl font-extrabold text-success">{totalEauResolus}</p><p className="text-xs text-muted-foreground">Résolues</p></div>
                    <div><p className="font-display text-2xl font-extrabold text-foreground">{totalEauTotal}</p><p className="text-xs text-muted-foreground">Total</p></div>
                  </div>
                  {totalEauTotal > 0 && (
                    <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border pt-3">
                      <span>{totalEauVerified > 0 ? `✓ ${totalEauVerified} confirmé${totalEauVerified > 1 ? "s" : ""} par voisins` : "Aucune confirmation"}</span>
                      <span className="font-semibold text-foreground">{eauResolutionRate}% résolues</span>
                    </div>
                  )}
                  <p className="mt-2 text-[11px] text-muted-foreground/70 italic">
                    « Résolu » = confirmé par l'auteur ou 3 voisins
                  </p>
                </div>

                {/* Voirie & Infrastructure */}
                <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card">
                  <div className="absolute -right-4 -top-4 h-24 w-24 opacity-10">
                    <Construction className="h-full w-full text-infra" />
                  </div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-infra/15">
                      <Construction className="h-5 w-5 text-infra" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-bold text-foreground">Voirie & Infra</h2>
                      <p className="text-[10px] text-muted-foreground">Lampadaires · Caniveaux · Routes · Dépôts</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center mt-4">
                    <div><p className="font-display text-2xl font-extrabold text-infra">{totalMairieActifs}</p><p className="text-xs text-muted-foreground">Actifs</p></div>
                    <div><p className="font-display text-2xl font-extrabold text-success">{totalMairieResolus}</p><p className="text-xs text-muted-foreground">Réparés</p></div>
                    <div><p className="font-display text-2xl font-extrabold text-foreground">{totalMairieTotal}</p><p className="text-xs text-muted-foreground">Total</p></div>
                  </div>
                  {totalMairieTotal > 0 && (
                    <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border pt-3">
                      <span>{totalMairieVerified > 0 ? `✓ ${totalMairieVerified} soutenu${totalMairieVerified > 1 ? "s" : ""} pour réparation` : "Aucun soutien citoyen"}</span>
                      <span className="font-semibold text-foreground">{mairieResolutionRate}% réparés</span>
                    </div>
                  )}
                  <p className="mt-2 text-[11px] text-muted-foreground/70 italic">« Résolu » = réparation confirmée par l'auteur ou 3 citoyens</p>
                </div>
              </>
            )}
          </motion.div>
        )}

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
                  <p className="text-[10px] text-muted-foreground">{sectionSubtitle}</p>
                </div>
              </div>
              <div className="space-y-2">
                {confirmedZones.slice(0, 8).map((z) => {
                  const isElecService = z.serviceType === "electricity";
                  const isInfraReport = z.reportCategory === "infrastructure";
                  const isMairieService = z.serviceType === "mairie";
                  const isInfraType = isInfraReport || isMairieService;

                  const infraLabel = isInfraType ? extractInfraLabel(z.firstDescription) : null;
                  const operator = isInfraType
                    ? infraOperator(infraLabel, z.commune)
                    : isElecService ? "CIE" : "SODECI";
                  const icon = isInfraType
                    ? infraEmoji(infraLabel)
                    : isElecService ? "⚡" : "💧";
                  const typeLabel = isInfraType
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
                        <p className="text-[10px] text-muted-foreground truncate">
                          {hasQuartier ? `${z.quartier} · ` : ""}{z.commune}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className="text-xs font-bold text-success">{countLabel}</span>
                        <span className="text-[10px] text-muted-foreground">→ {operator}</span>
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
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <h2 className="font-display text-xl font-bold text-foreground">Durée moyenne des coupures</h2>
                </div>
                <p className="text-xs text-muted-foreground ml-7">
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
                      <p className="text-[10px] text-muted-foreground">durée moy.</p>
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-foreground">{globalElecMax > 0 ? formatMinutes(globalElecMax) : "—"}</p>
                      <p className="text-[10px] text-muted-foreground">la plus longue</p>
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-muted-foreground">{totalElecResolved}</p>
                      <p className="text-[10px] text-muted-foreground">résolu{totalElecResolved > 1 ? "s" : ""}</p>
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
                      <p className="text-[10px] text-muted-foreground">durée moy.</p>
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-foreground">{globalWaterMax > 0 ? formatMinutes(globalWaterMax) : "—"}</p>
                      <p className="text-[10px] text-muted-foreground">la plus longue</p>
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-muted-foreground">{totalWaterResolved}</p>
                      <p className="text-[10px] text-muted-foreground">résolu{totalWaterResolved > 1 ? "s" : ""}</p>
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
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-destructive" />
                  <h2 className="font-display text-xl font-bold text-foreground">Top 10 quartiers les plus touchés</h2>
                </div>
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
                          <p className="text-[10px] text-muted-foreground">{q.commune}</p>
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
                          <p className="text-[10px] text-muted-foreground">active{q.totalActifs !== 1 ? "s" : ""} / {q.totalAll}</p>
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
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-electricity" />
                <h2 className="font-display text-xl font-bold text-foreground">Classement des coupures en cours par commune</h2>
              </div>
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
                            <p className="text-[10px] text-muted-foreground">active{totalActifs !== 1 ? "s" : ""} / {totalAll}</p>
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

        {/* Per-commune breakdown */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-foreground">Détail par commune</h2>
          <Select value={selectedCommune} onValueChange={setSelectedCommune}>
            <SelectTrigger className="w-[200px] h-9 text-sm">
              <SelectValue placeholder="Choisir une commune" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les communes</SelectItem>
              {stats.map((c) => (
                <SelectItem key={c.commune} value={c.commune}>
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.couleur }} />
                    {c.commune}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-4">
          {loading ? (
            <>
              {[1, 2, 3, 4, 5].map((k) => <SkeletonCommune key={k} />)}
            </>
          ) : (
            stats.filter((c) => selectedCommune === "all" || c.commune === selectedCommune).map((c, i) => {
              const totalSignalements = c.electricite_total + c.eau_total + c.mairie_total;
              const pctPop = c.population > 0 ? (totalSignalements / c.population) * 100 : 0;
              const pctPopDisplay = pctPop < 0.01 && totalSignalements > 0 ? "<0.01" : pctPop.toFixed(2);
              const capacite = Math.floor(c.population / 2);
              const tauxCapacite = capacite > 0 ? Math.min((totalSignalements / capacite) * 100, 100) : 0;

              return (
                <motion.div key={c.commune} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl overflow-hidden border border-border" style={{ backgroundColor: COMMUNE_LOGOS[c.commune] ? '#fff' : c.couleur }}>
                      {COMMUNE_LOGOS[c.commune] ? (
                        <img src={COMMUNE_LOGOS[c.commune]} alt={c.commune} className="h-full w-full object-contain p-1" />
                      ) : (
                        <span className="text-white font-bold text-sm">#{i + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <button onClick={() => navigate(`/commune/${encodeURIComponent(c.commune)}`)} className="font-bold text-foreground text-lg hover:underline underline-offset-2 transition-colors" style={{ color: c.couleur }}>
                          {c.commune}
                        </button>
                        <span className="text-xs font-semibold" style={{ color: c.couleur }}>{pctPopDisplay}% de la pop.</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{(c.population / 1000).toFixed(0)}k hab.</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-4">
                    <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(tauxCapacite, 1)}%`, backgroundColor: c.couleur }} />
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
                          <span className="text-[10px] text-muted-foreground ml-1">actif{c.electricite_actifs !== 1 ? "s" : ""}</span>
                        </div>
                        <div>
                          <span className="font-display text-sm font-bold text-success">{c.electricite_resolus}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">résolu{c.electricite_resolus !== 1 ? "s" : ""}</span>
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
                          <span className="text-[10px] text-muted-foreground ml-1">actif{c.eau_actifs !== 1 ? "s" : ""}</span>
                        </div>
                        <div>
                          <span className="font-display text-sm font-bold text-success">{c.eau_resolus}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">résolu{c.eau_resolus !== 1 ? "s" : ""}</span>
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
                          <span className="text-[10px] text-muted-foreground ml-1">actif{c.mairie_actifs !== 1 ? "s" : ""}</span>
                        </div>
                        <div>
                          <span className="font-display text-sm font-bold text-success">{c.mairie_resolus}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">résolu{c.mairie_resolus !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active reports summary for this commune */}
                  {(() => {
                    const communeReports = scoredActiveReports
                      .filter((r) => r.location.toLowerCase() === c.commune.toLowerCase());
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
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              {elecCount > 0 && <span className="flex items-center gap-0.5"><Zap className="h-3 w-3 text-electricity" />{elecCount}</span>}
                              {eauCount > 0 && <span className="flex items-center gap-0.5"><Droplets className="h-3 w-3 text-water" />{eauCount}</span>}
                              {mairieCount > 0 && <span className="flex items-center gap-0.5"><Construction className="h-3 w-3 text-infra" />{mairieCount}</span>}
                            </div>
                            {verifiedCount > 0 && (
                              <span className="text-[10px] font-semibold text-success">✓ {verifiedCount} confirmé{verifiedCount > 1 ? "s" : ""}</span>
                            )}
                          </div>
                          <span className="text-[10px] font-semibold text-primary group-hover:underline">Voir détails →</span>
                        </button>
                      </div>
                    );
                  })()}
                </motion.div>
              );
            })
          )}
        </div>

        {/* Trends chart - admin only */}
        {isAdmin && <TrendsChart className="mt-8" />}
      </main>
    </div>
  );
};

export default DashboardPage;
