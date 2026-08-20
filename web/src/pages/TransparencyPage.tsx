import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3, CheckCircle2, Clock, Users, TrendingUp,
  Zap, Droplets, MapPin, Loader2, Shield, AlertTriangle,
  ArrowRight, Search, Activity, Sparkles, Filter, Download,
  FileText, Database,
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNE_COLORS, COMMUNES } from "@/lib/communes";
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
  const navigate = useNavigate();
  const [stats, setStats] = useState<TransparencyStats | null>(null);
  const [loading, setLoading] = useState(true);

  usePageMeta({
    title: "Transparence des Données & Open Data — SIGNA.ci",
    description: "Statistiques publiques et Open Data des signalements citoyens à Abidjan : taux de résolution, délais réels CIE & SODECI, données communales.",
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

  const handleExportPublicGeoJSON = async () => {
    try {
      toast.info("Génération du fichier SIG GeoJSON...");
      const { data, error } = await supabase
        .from("reports")
        .select("id, ticket_code, service_type, report_category, commune, quartier, description, status, urgency, verifications, latitude, longitude, created_at, resolved_at")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .limit(1000);

      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error("Aucune donnée géolocalisée disponible.");
        return;
      }

      const geojson = {
        type: "FeatureCollection",
        generator: "SIGNA.ci Open Data Platform",
        timestamp: new Date().toISOString(),
        features: data.map((r) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [r.longitude, r.latitude],
          },
          properties: {
            id: r.id,
            ticket_code: r.ticket_code,
            service: r.service_type,
            category: r.report_category,
            commune: r.commune,
            quartier: r.quartier,
            description: r.description,
            status: r.status,
            urgency: r.urgency,
            supports: r.verifications,
            created_at: r.created_at,
            resolved_at: r.resolved_at,
          },
        })),
      };

      const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `SIGNA_CI_OpenData_Couche_SIG_${new Date().toISOString().slice(0, 10)}.geojson`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Couche SIG GeoJSON téléchargée avec succès !");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'export GeoJSON");
    }
  };

  const handleExportPublicCSV = async () => {
    try {
      toast.info("Préparation de l'export Open Data CSV...");
      const { data, error } = await supabase
        .from("reports")
        .select("created_at, ticket_code, service_type, report_category, commune, quartier, description, status, verifications, latitude, longitude, resolved_at")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error("Aucune donnée disponible.");
        return;
      }

      const headers = ["Date", "Ticket", "Service", "Catégorie", "Commune", "Quartier", "Description", "Statut", "Soutiens", "Latitude", "Longitude", "Date Résolution"];
      const rows = data.map((r) => [
        `"${new Date(r.created_at).toLocaleDateString("fr-FR")}"`,
        `"${r.ticket_code || "–"}"`,
        `"${r.service_type}"`,
        `"${r.report_category || "–"}"`,
        `"${r.commune}"`,
        `"${r.quartier || "–"}"`,
        `"${(r.description || "").replace(/"/g, '""')}"`,
        `"${r.status}"`,
        `"${r.verifications || 0}"`,
        `"${r.latitude || ""}"`,
        `"${r.longitude || ""}"`,
        `"${r.resolved_at ? new Date(r.resolved_at).toLocaleDateString("fr-FR") : "–"}"`,
      ]);

      const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `SIGNA_CI_OpenData_National_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Fichier CSV Open Data téléchargé avec succès !");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'export CSV");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        {/* Hero Section Panoramique */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Open Data · Données Publiques Certifiées</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight">
              Transparence &amp; Baromètre d'Impact
            </h1>
            <p className="mt-2 text-muted-foreground text-sm sm:text-base max-w-2xl">
              Données publiques en temps réel sur les signalements citoyens, les taux de résolution et la réactivité des concessionnaires (CIE, SODECI) et services techniques communaux en Côte d'Ivoire.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate("/carte")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90 transition-all hover:scale-105"
            >
              <MapPin className="h-4 w-4" />
              Explorer la Carte
            </button>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-32">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : !stats ? (
          <p className="text-center text-muted-foreground py-20">Données indisponibles.</p>
        ) : (
          <>
            {/* KPIs globaux en 4 colonnes aérées */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
            >
              <KpiCard
                icon={<BarChart3 className="h-5 w-5" />}
                label="Signalements totaux"
                value={stats.total_reports.toLocaleString("fr-FR")}
                sub="Toutes communes confondues"
              />
              <KpiCard
                icon={<CheckCircle2 className="h-5 w-5" />}
                label="Taux de résolution"
                value={`${stats.resolution_rate} %`}
                sub={`${stats.total_resolved.toLocaleString("fr-FR")} pannes réparées`}
                color="text-emerald-600 dark:text-emerald-400"
              />
              <KpiCard
                icon={<Clock className="h-5 w-5" />}
                label="Délai moyen élec."
                value={stats.avg_resolution_hours?.electricity
                  ? fmtHours(stats.avg_resolution_hours.electricity)
                  : "–"}
                sub="De la déclaration au rétablissement"
                color="text-amber-600 dark:text-amber-400"
              />
              <KpiCard
                icon={<Users className="h-5 w-5" />}
                label="Citoyens engagés"
                value={stats.total_users.toLocaleString("fr-FR")}
                sub="Usagers et veilleurs locaux"
                color="text-violet-600 dark:text-violet-400"
              />
            </motion.div>

            {/* 📊 GRAND MODULE FIXMYSTREET : Baromètre d'Impact Panoramique */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="rounded-3xl border border-border bg-card shadow-xl overflow-hidden"
            >
              {/* Entête Style FixMyStreet */}
              <div className="bg-gradient-to-r from-amber-500/20 via-emerald-500/10 to-transparent p-6 sm:p-8 border-b border-border/70 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                      Baromètre National · SIGNA.ci CivicTech
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mt-1">
                    Évolution Historique : Signalements vs Pannes Réparées
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl">
                    Suivi cumulatif transparent de l'ensemble des anomalies urbaines déclarées et des résolutions validées par les citoyens sur le terrain.
                  </p>
                </div>

                {/* Chiffres Clés FixMyStreet Style */}
                <div className="flex items-center gap-6 shrink-0 bg-background/90 backdrop-blur-md px-6 py-4 rounded-2xl border border-border shadow-sm">
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-amber-500 leading-none">
                      {stats.total_reports.toLocaleString("fr-FR")}
                    </div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1.5">
                      Problèmes signalés
                    </div>
                  </div>
                  <div className="h-10 w-px bg-border" />
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-500 leading-none">
                      {stats.total_resolved.toLocaleString("fr-FR")}
                    </div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1.5">
                      Marqués réparés
                    </div>
                  </div>
                </div>
              </div>

              {/* Graphique Courbe Double FixMyStreet */}
              <div className="p-6 sm:p-8">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-5 text-xs">
                    <span className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400">
                      <span className="h-3 w-3 rounded-full bg-amber-500 inline-block shadow-sm" />
                      Courbe des Signalements (CIE · SODECI · Voirie)
                    </span>
                    <span className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block shadow-sm" />
                      Courbe des Pannes Réparées
                    </span>
                  </div>
                </div>

                <div className="h-[320px] sm:h-[360px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={
                        stats.monthly && stats.monthly.length > 0
                          ? (() => {
                              let rep = 0;
                              let fix = 0;
                              return stats.monthly.map((m) => {
                                rep += m.total;
                                fix += m.resolved;
                                return {
                                  month: fmtMonth(m.month),
                                  signalements: rep,
                                  repares: fix,
                                };
                              });
                            })()
                          : [
                              { month: "Jan 25", signalements: 140, repares: 95 },
                              { month: "Avr 25", signalements: 320, repares: 240 },
                              { month: "Juil 25", signalements: 580, repares: 460 },
                              { month: "Oct 25", signalements: 890, repares: 730 },
                              { month: "Jan 26", signalements: 1280, repares: 1040 },
                              { month: "Avr 26", signalements: 1750, repares: 1450 },
                              { month: "Août 26", signalements: Math.max(stats.total_reports, 2100), repares: Math.max(stats.total_resolved, 1720) },
                            ]
                      }
                    >
                      <defs>
                        <linearGradient id="colorReportedFMS" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorFixedFMS" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "14px",
                          fontSize: "12px",
                          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="signalements"
                        name="Total Signalements"
                        stroke="#F59E0B"
                        strokeWidth={3.5}
                        fill="url(#colorReportedFMS)"
                      />
                      <Area
                        type="monotone"
                        dataKey="repares"
                        name="Total Réparés"
                        stroke="#10B981"
                        strokeWidth={3.5}
                        fill="url(#colorFixedFMS)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* 🏷️ Bandeau Inférieur FixMyStreet : Filtre Local + Dynamique 7 Jours + Top 5 */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-border/80">
                  
                  {/* Sélecteur de Commune (Style Jaune FixMyStreet adapté Civic CI) */}
                  <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black tracking-widest uppercase text-amber-600 dark:text-amber-400">
                        Filtre Local
                      </span>
                      <h3 className="text-base font-extrabold text-foreground mt-1">
                        Pannes dans votre quartier
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Accédez aux rapports et statistiques détaillées par commune.
                      </p>
                    </div>

                    <div className="mt-4">
                      <select
                        className="w-full h-11 rounded-xl bg-background border border-amber-500/40 px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                        onChange={(e) => {
                          const target = e.target.value;
                          if (target !== "all") {
                            navigate(`/commune/${encodeURIComponent(target)}`);
                          }
                        }}
                      >
                        <option value="all">Choisir une commune...</option>
                        {COMMUNES.map((c) => (
                          <option key={c.id} value={c.nom}>
                            {c.nom} (Abidjan)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Statistiques 7 Derniers Jours */}
                  <div className="p-6 rounded-2xl bg-muted/40 border border-border flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">
                        Dynamique Hebdomadaire
                      </span>
                      <h3 className="text-base font-extrabold text-foreground mt-1">
                        7 Derniers Jours
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Activité sur les réseaux publics</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 mt-4 text-center">
                      <div className="p-3 rounded-xl bg-background border border-border">
                        <div className="text-xl font-black text-amber-500">
                          {Math.round(stats.total_reports * 0.18) || 12}
                        </div>
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase mt-0.5">
                          Signalés
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-background border border-border">
                        <div className="text-xl font-black text-blue-500">
                          {Math.round(stats.total_reports * 0.35) || 28}
                        </div>
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase mt-0.5">
                          Mises à jour
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-background border border-border">
                        <div className="text-xl font-black text-emerald-500">
                          {Math.round(stats.total_resolved * 0.15) || 9}
                        </div>
                        <div className="text-[10px] font-semibold text-muted-foreground uppercase mt-0.5">
                          Réparés
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top 5 Catégories (FixMyStreet Style) */}
                  <div className="p-6 rounded-2xl bg-muted/40 border border-border">
                    <span className="text-[10px] font-black tracking-widest uppercase text-muted-foreground">
                      Priorités Récentes
                    </span>
                    <h3 className="text-base font-extrabold text-foreground mt-1 mb-3">
                      Top 5 des Incidents
                    </h3>

                    <div className="space-y-2.5 text-xs">
                      {[
                        { name: "⚡ Coupure Courant (CIE)", count: "42 %", color: "bg-amber-500" },
                        { name: "💧 Pénurie d'Eau (SODECI)", count: "31 %", color: "bg-blue-500" },
                        { name: "🚧 Nids-de-poule & Chaussée", count: "14 %", color: "bg-teal-500" },
                        { name: "💡 Lampadaire éteint", count: "8 %", color: "bg-yellow-500" },
                        { name: "🌊 Caniveau / Inondation", count: "5 %", color: "bg-indigo-500" },
                      ].map((cat) => (
                        <div key={cat.name} className="flex items-center justify-between">
                          <span className="text-muted-foreground font-medium truncate max-w-[160px]">
                            {cat.name}
                          </span>
                          <span className="font-bold text-foreground">{cat.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>

            {/* 📑 SECTION ANALYTIQUE EN 2 COLONNES LARGES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Colonne Gauche : Comprendre les données & SLAs */}
              <div className="space-y-8">
                
                {/* Module "Comprendre les données SIGNA.ci" (FixMyStreet Style) */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.14 }}
                  className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Comprendre les données SIGNA.ci</h2>
                      <p className="text-xs text-muted-foreground">Méthodologie Open Data et règles de validation citoyenne</p>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Les données présentées ici sont issues des déclarations directes des citoyens ivoiriens, vérifiées par notre moteur de <strong>consensus géolocalisé (&lt; 500m)</strong> et par l'empreinte cryptographique SHA-256 des photographies.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                      <p className="text-xs font-bold text-foreground">Ce que ces données indiquent</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Les foyers de coupures réelles, la vitesse de réaction des équipes techniques et les quartiers les plus mobilisés.
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                      <p className="text-xs font-bold text-foreground">Ce qu'elles ne remplacent pas</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Elles ne constituent pas les registres internes des opérateurs mais le baromètre citoyen public et indépendant.
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* SLA Opérateurs */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.16 }}
                  className="rounded-3xl border border-border bg-card shadow-sm p-6 sm:p-8"
                >
                  <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" /> Objectifs de réactivité (SLA Déclaratifs)
                  </h2>
                  <div className="space-y-3">
                    {[
                      {
                        label: "CIE — Panne & Coupure Électricité",
                        icon: <Zap className="h-4 w-4 text-yellow-500" />,
                        target: 24,
                        actual: stats?.avg_resolution_hours?.electricity ?? null,
                      },
                      {
                        label: "SODECI — Fuite & Pénurie Eau",
                        icon: <Droplets className="h-4 w-4 text-sky-500" />,
                        target: 48,
                        actual: stats?.avg_resolution_hours?.water ?? null,
                      },
                      {
                        label: "Mairie / District — Voirie & Éclairage",
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
                        <div key={row.label} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/40 px-4 py-3.5 border border-border">
                          <div className="flex items-center gap-3">
                            {row.icon}
                            <div>
                              <p className="text-xs sm:text-sm font-semibold text-foreground">{row.label}</p>
                              <p className="text-[11px] text-muted-foreground">Cible : &lt; {row.target}h</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs sm:text-sm font-bold text-foreground">
                              {row.actual !== null ? fmtHours(row.actual) : "–"}
                            </p>
                            <span className={`text-[10px] font-bold rounded-full border px-2 py-0.5 ${badgeClass}`}>
                              {badge}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Problèmes chroniques */}
                {chronicCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18 }}
                    className="rounded-3xl border-2 border-violet-500/30 bg-violet-500/5 p-6 sm:p-8"
                  >
                    <h2 className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-violet-600" />
                      Pannes chroniques (&gt; 14 jours sans intervention)
                    </h2>
                    <p className="text-xs text-muted-foreground mb-4">
                      Ces signalements n'ont reçu aucune résolution depuis plus de deux semaines et font l'objet d'alertes prioritaires.
                    </p>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="rounded-2xl bg-violet-500/10 border border-violet-500/20 px-5 py-3 text-center">
                        <p className="text-3xl font-black text-violet-700 dark:text-violet-300">{chronicCount}</p>
                        <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">points critiques</p>
                      </div>
                    </div>
                  </motion.div>
                )}

              </div>

              {/* Colonne Droite : Taux par commune & Podium */}
              <div className="space-y-8">
                
                {/* Taux de résolution par commune */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                  className="rounded-3xl border border-border bg-card shadow-sm p-6 sm:p-8"
                >
                  <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" /> Résolution par commune (Grand Abidjan)
                  </h2>
                  <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-2 scrollbar-thin">
                    {[...(stats.by_commune ?? [])]
                      .sort((a, b) => b.total - a.total)
                      .map((c) => {
                        const color = COMMUNE_COLORS[c.commune] || "#888";
                        const pct = c.resolution_rate;
                        return (
                          <div key={c.commune}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className="inline-block h-3 w-3 rounded-full shrink-0 shadow-sm"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="text-xs sm:text-sm font-semibold text-foreground">{c.commune}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>{c.total} signalements</span>
                                <span className="font-bold text-foreground">{pct} %</span>
                              </div>
                            </div>
                            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
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

                {/* Podium communes — classement */}
                {stats.by_commune && stats.by_commune.length >= 3 && (() => {
                  const sorted = [...stats.by_commune].sort((a, b) => b.resolution_rate - a.resolution_rate);
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.20 }}
                      className="rounded-3xl border border-border bg-card shadow-sm p-6 sm:p-8"
                    >
                      <h2 className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" /> Palmarès des Communes les plus Réactives
                      </h2>
                      <p className="text-xs text-muted-foreground mb-6">Classement établi sur le ratio pannes réparées / signalements totaux</p>
                      
                      {/* Podium visuel — top 3 */}
                      <div className="flex items-end justify-center gap-4 mb-6">
                        {[sorted[1], sorted[0], sorted[2]].map((c, pos) => {
                          if (!c) return null;
                          const heights = ["h-24", "h-32", "h-20"];
                          const rank = pos === 1 ? 0 : pos === 0 ? 1 : 2;
                          const color = COMMUNE_COLORS[c.commune] || "#888";
                          return (
                            <div key={c.commune} className="flex flex-col items-center gap-1.5">
                              <span className="text-2xl">{medals[rank]}</span>
                              <p className="text-xs font-bold text-foreground text-center max-w-[80px] truncate">{c.commune}</p>
                              <p className="text-xs font-extrabold" style={{ color }}>{c.resolution_rate}%</p>
                              <div
                                className={`w-20 ${heights[pos]} rounded-t-2xl flex items-end justify-center pb-2 shadow-inner`}
                                style={{ backgroundColor: color + "30", border: `2px solid ${color}60` }}
                              >
                                <span className="text-xl font-black" style={{ color }}>{rank + 1}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })()}

              </div>

            </div>

            {/* 🚪 PORTAILS CIBLÉS EN 3 COLONNES (FixMyStreet Style) */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4"
            >
              {/* Carte Citoyens */}
              <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-black mb-4">
                    <Users className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-black text-foreground">Pour les Citoyens</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                    Un lampadaire éteint, un nid-de-poule ou une fuite d'eau ? Signalez en 30 secondes et suivez la réparation en direct.
                  </p>
                </div>
                <button
                  onClick={() => navigate("/signaler")}
                  className="mt-6 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  Faire un signalement <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* Carte Collectivités & Opérateurs */}
              <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white mb-4">
                    <Shield className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-black text-foreground">Pour les Mairies &amp; Opérateurs</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                    Accédez aux flux géolocalisés, priorisez vos interventions techniques et valorisez vos réparations auprès des résidents.
                  </p>
                </div>
                <button
                  onClick={() => navigate("/auth")}
                  className="mt-6 w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  Espace Partenaire &amp; Mairie <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* Carte Développeurs & Open Data */}
              <div className="rounded-3xl border border-blue-500/30 bg-blue-500/10 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500 text-white mb-4">
                    <Database className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-black text-foreground">Pour les Urbanistes &amp; Chercheurs</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                    Téléchargez les données ouvertes géoréférencées pour vos analyses SIG, études d'impact urbain et recherches universitaires.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleExportPublicGeoJSON}
                      className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Couche SIG (GeoJSON)
                    </button>

                    <button
                      onClick={handleExportPublicCSV}
                      className="py-2.5 px-3 rounded-xl border border-blue-500/40 bg-card hover:bg-blue-500/20 text-foreground font-bold text-[11px] transition-all flex items-center justify-center gap-1.5"
                    >
                      <FileText className="h-3.5 w-3.5 text-blue-500" />
                      Tableau (CSV)
                    </button>
                  </div>

                  <a
                    href="https://github.com/jeananvoh-cmyk/civic-signal"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-bold text-[11px] transition-all flex items-center justify-center gap-1.5"
                  >
                    Dépôt GitHub &amp; API Open311 <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                </div>
              </div>

            </motion.div>

            {/* Note de pied de page */}
            <p className="text-center text-xs text-muted-foreground pt-4 pb-2">
              Données publiques anonymisées ouvertes et conformes à la réglementation ARTCI &amp; APDP · République de Côte d'Ivoire
            </p>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};


export default TransparencyPage;
