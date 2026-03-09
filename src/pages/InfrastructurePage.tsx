import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import SignedImage from "@/components/SignedImage";
import ShareButton from "@/components/ShareButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  Zap, Droplets, MapPin, Clock, ThumbsUp, MessageCircle,
  Filter, TrendingUp, AlertCircle, ChevronDown, Lightbulb, TriangleAlert, Info, MoreHorizontal, Building2, Map, Trash2, Waves
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

type InfraReport = {
  id: string;
  service_type: string;
  description: string;
  location: string;
  commune: string;
  quartier: string;
  status: string;
  urgency: string;
  created_at: string;
  photo_url: string | null;
  verifications: number;
  impacted_people: number;
  reporter_type: string;
};

type FilterType = "all" | "eau" | "electricite" | "mairie";

const PAGE_SIZE = 10;

const InfrastructurePage = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<InfraReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [subFilter, setSubFilter] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [corroborated, setCorroborated] = useState<Set<string>>(new Set());

  const fetchReports = async (pageNum: number, append = false) => {
    const setter = append ? setLoadingMore : setLoading;
    setter(true);

    let query = supabase
      .from("reports")
      .select("id, service_type, description, location, commune, quartier, status, urgency, created_at, photo_url, verifications, impacted_people, reporter_type")
      .eq("report_category", "infrastructure")
      .eq("validated", true)
      .order("created_at", { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (filter !== "all") {
      query = query.eq("service_type", filter);
    }

    if (subFilter) {
      query = query.ilike("description", `%${subFilter}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error(error);
      setter(false);
      return;
    }

    const items = (data ?? []) as InfraReport[];
    setHasMore(items.length === PAGE_SIZE);
    setReports((prev) => (append ? [...prev, ...items] : items));
    setter(false);
  };

  useEffect(() => {
    setPage(0);
    fetchReports(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, subFilter]);

  const handleCategoryClick = (category: string, type: FilterType) => {
    if (subFilter === category) {
      setSubFilter(null);
    } else {
      setFilter(type);
      setSubFilter(category);
    }
  };

  const handleFilterClick = (newFilter: FilterType) => {
    setFilter(newFilter);
    if (newFilter === "all" || newFilter !== filter) {
      setSubFilter(null);
    }
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchReports(next, true);
  };

  const handleCorroborate = async (reportId: string) => {
    if (!user) {
      toast.info("Connectez-vous pour confirmer un signalement");
      return;
    }
    const { error } = await supabase.rpc("corroborate_report", { p_report_id: reportId });
    if (error) {
      toast.error("Erreur lors de la confirmation");
      return;
    }
    setCorroborated((prev) => new Set(prev).add(reportId));
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, verifications: r.verifications + 1 } : r))
    );
    toast.success("Merci pour votre confirmation !");
  };

  const timeAgo = (date: string) =>
    formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });

  const serviceIcon = (type: string) => {
    if (type === "eau") return <Droplets className="h-4 w-4 text-[hsl(var(--water))]" />;
    if (type === "electricite") return <Zap className="h-4 w-4 text-[hsl(var(--electricity))]" />;
    return <Building2 className="h-4 w-4 text-emerald-500" />;
  };

  const serviceLabel = (type: string) => {
    if (type === "eau") return "Eau";
    if (type === "electricite") return "Électricité";
    return "Mairie";
  };

  const urgencyBadge = (urgency: string) => {
    const map: Record<string, { label: string; className: string }> = {
      critical: { label: "Urgent", className: "bg-destructive/10 text-destructive border-destructive/20" },
      high: { label: "Important", className: "bg-warning/10 text-[hsl(var(--warning))] border-warning/20" },
      medium: { label: "Modéré", className: "bg-primary/10 text-primary border-primary/20" },
      low: { label: "Faible", className: "bg-muted text-muted-foreground border-border" },
    };
    const config = map[urgency] || map.medium;
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  const statusIndicator = (status: string) => {
    if (status === "active") {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-destructive font-medium">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
          </span>
          En cours
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-[hsl(var(--success))] font-medium">
        <span className="h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
        Résolu
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Page header */}
      <div className="bg-card border-b border-border pb-4">
        <div className="container max-w-2xl pt-6 px-4">
          <div className="flex flex-col gap-1 mb-6">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-primary" />
              Fil Infrastructures
            </h1>
            <p className="text-sm text-muted-foreground">
              Consultez les pannes d'éclairage, fuites d'eau, nids de poule et autres problèmes d'infrastructure dans votre commune.
            </p>
          </div>

          {/* Alert Categories */}
          <div className="space-y-4 mb-2">
            {(filter === "all" || filter === "electricite") && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Signalements électriques (CIE)
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div 
                    onClick={() => handleCategoryClick("Éclairage public", "electricite")}
                    className={`cursor-pointer bg-[hsl(var(--electricity))]/10 border ${subFilter === "Éclairage public" ? "border-[hsl(var(--electricity))] ring-2 ring-[hsl(var(--electricity))]/50" : "border-[hsl(var(--electricity))]/20"} rounded-xl p-3 flex flex-col items-center justify-center text-center gap-2 transition-all hover:bg-[hsl(var(--electricity))]/20`}
                  >
                    <div className="bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-sm">
                      <Lightbulb className="h-5 w-5 text-[hsl(var(--electricity))]" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">Éclairage public</span>
                  </div>
                  
                  <div 
                    onClick={() => handleCategoryClick("Poteaux & Pylônes", "electricite")}
                    className={`cursor-pointer bg-[hsl(var(--electricity))]/10 border ${subFilter === "Poteaux & Pylônes" ? "border-[hsl(var(--electricity))] ring-2 ring-[hsl(var(--electricity))]/50" : "border-[hsl(var(--electricity))]/20"} rounded-xl p-3 flex flex-col items-center justify-center text-center gap-2 transition-all hover:bg-[hsl(var(--electricity))]/20`}
                  >
                    <div className="bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-sm">
                      <Zap className="h-5 w-5 text-[hsl(var(--electricity))]" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">Poteaux & Pylônes</span>
                  </div>
                  
                  <div 
                    onClick={() => handleCategoryClick("Branchements dangereux", "electricite")}
                    className={`cursor-pointer bg-destructive/10 border ${subFilter === "Branchements dangereux" ? "border-destructive ring-2 ring-destructive/50" : "border-destructive/20"} rounded-xl p-3 flex flex-col items-center justify-center text-center gap-2 transition-all hover:bg-destructive/20`}
                  >
                    <div className="bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-sm">
                      <TriangleAlert className="h-5 w-5 text-destructive" />
                    </div>
                    <span className="text-xs font-semibold text-foreground leading-tight">Branchements dangereux</span>
                  </div>
                  
                  <div 
                    onClick={() => handleCategoryClick("Autres", "electricite")}
                    className={`cursor-pointer bg-muted border ${subFilter === "Autres" && filter === "electricite" ? "border-primary ring-2 ring-primary/50" : "border-border"} rounded-xl p-3 flex flex-col items-center justify-center text-center gap-2 transition-all hover:bg-muted/80`}
                  >
                    <div className="bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-sm">
                      <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">Autres</span>
                  </div>
                </div>
              </div>
            )}

            {(filter === "all" || filter === "eau") && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Signalements eau (SODECI)
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div 
                    onClick={() => handleCategoryClick("Fuite d'eau", "eau")}
                    className={`cursor-pointer bg-[hsl(var(--water))]/10 border ${subFilter === "Fuite d'eau" ? "border-[hsl(var(--water))] ring-2 ring-[hsl(var(--water))]/50" : "border-[hsl(var(--water))]/20"} rounded-xl p-3 flex flex-col items-center justify-center text-center gap-2 transition-all hover:bg-[hsl(var(--water))]/20`}
                  >
                    <div className="bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-sm">
                      <Droplets className="h-5 w-5 text-[hsl(var(--water))]" />
                    </div>
                   <span className="text-xs font-semibold text-foreground leading-tight">Fuite d'eau</span>
                  </div>
                  
                  <div 
                    onClick={() => handleCategoryClick("Canalisation publique", "eau")}
                    className={`cursor-pointer bg-[hsl(var(--water))]/10 border ${subFilter === "Canalisation publique" ? "border-[hsl(var(--water))] ring-2 ring-[hsl(var(--water))]/50" : "border-[hsl(var(--water))]/20"} rounded-xl p-3 flex flex-col items-center justify-center text-center gap-2 transition-all hover:bg-[hsl(var(--water))]/20`}
                  >
                    <div className="bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-sm">
                      <AlertCircle className="h-5 w-5 text-[hsl(var(--water))]" />
                    </div>
                    <span className="text-xs font-semibold text-foreground leading-tight">Canalisation publique</span>
                  </div>
                  
                  <div 
                    onClick={() => handleCategoryClick("Qualité de l'eau", "eau")}
                    className={`cursor-pointer bg-destructive/10 border ${subFilter === "Qualité de l'eau" ? "border-destructive ring-2 ring-destructive/50" : "border-destructive/20"} rounded-xl p-3 flex flex-col items-center justify-center text-center gap-2 transition-all hover:bg-destructive/20`}
                  >
                    <div className="bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-sm">
                      <TriangleAlert className="h-5 w-5 text-destructive" />
                    </div>
                    <span className="text-xs font-semibold text-foreground leading-tight">Qualité de l'eau</span>
                  </div>
                  
                  <div 
                    onClick={() => handleCategoryClick("Autres", "eau")}
                    className={`cursor-pointer bg-muted border ${subFilter === "Autres" && filter === "eau" ? "border-primary ring-2 ring-primary/50" : "border-border"} rounded-xl p-3 flex flex-col items-center justify-center text-center gap-2 transition-all hover:bg-muted/80`}
                  >
                    <div className="bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-sm">
                      <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">Autres</span>
                  </div>
                </div>
              </div>
            )}

            {(filter === "all" || filter === "mairie") && (
              <div>
                <div className="flex items-center gap-2 mb-3 mt-4">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Signalements voirie (Mairie)
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div 
                    onClick={() => handleCategoryClick("Nid de poule", "mairie")}
                    className={`cursor-pointer bg-emerald-500/10 border ${subFilter === "Nid de poule" ? "border-emerald-500 ring-2 ring-emerald-500/50" : "border-emerald-500/20"} rounded-xl p-3 flex flex-col items-center justify-center text-center gap-2 transition-all hover:bg-emerald-500/20`}
                  >
                    <div className="bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-sm">
                      <Map className="h-5 w-5 text-emerald-500" />
                    </div>
                    <span className="text-xs font-semibold text-foreground leading-tight">Nid de poule / Route</span>
                  </div>
                  
                  <div 
                    onClick={() => handleCategoryClick("Caniveau bouché", "mairie")}
                    className={`cursor-pointer bg-emerald-500/10 border ${subFilter === "Caniveau bouché" ? "border-emerald-500 ring-2 ring-emerald-500/50" : "border-emerald-500/20"} rounded-xl p-3 flex flex-col items-center justify-center text-center gap-2 transition-all hover:bg-emerald-500/20`}
                  >
                    <div className="bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-sm">
                      <Waves className="h-5 w-5 text-emerald-500" />
                    </div>
                    <span className="text-xs font-semibold text-foreground leading-tight">Caniveau bouché</span>
                  </div>
                  
                  <div 
                    onClick={() => handleCategoryClick("Amas d'ordures", "mairie")}
                    className={`cursor-pointer bg-emerald-500/10 border ${subFilter === "Amas d'ordures" ? "border-emerald-500 ring-2 ring-emerald-500/50" : "border-emerald-500/20"} rounded-xl p-3 flex flex-col items-center justify-center text-center gap-2 transition-all hover:bg-emerald-500/20`}
                  >
                    <div className="bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-sm">
                      <Trash2 className="h-5 w-5 text-emerald-500" />
                    </div>
                    <span className="text-xs font-semibold text-foreground leading-tight">Amas d'ordures</span>
                  </div>
                  
                  <div 
                    onClick={() => handleCategoryClick("Autres", "mairie")}
                    className={`cursor-pointer bg-muted border ${subFilter === "Autres" && filter === "mairie" ? "border-primary ring-2 ring-primary/50" : "border-border"} rounded-xl p-3 flex flex-col items-center justify-center text-center gap-2 transition-all hover:bg-muted/80`}
                  >
                    <div className="bg-background/80 backdrop-blur-sm rounded-full p-2 shadow-sm">
                      <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-semibold text-foreground">Autres</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters - horizontal scroll on mobile */}
      <div className="sticky top-14 z-40 bg-background border-b border-border">
        <div className="container max-w-2xl px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
          {[
            { key: "all" as FilterType, label: "Tous", icon: TrendingUp },
            { key: "eau" as FilterType, label: "Eau", icon: Droplets },
            { key: "electricite" as FilterType, label: "Électricité", icon: Zap },
            { key: "mairie" as FilterType, label: "Mairie", icon: Building2 },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleFilterClick(key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                filter === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-secondary border border-border"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="container max-w-2xl px-4 py-4 space-y-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-card border border-border p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-40 w-full rounded-lg" />
              </div>
            ))
          : reports.map((report, index) => (
              <motion.article
                key={report.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.3 }}
                className="rounded-xl bg-card border border-border overflow-hidden"
              >
                {/* Post header */}
                <div className="px-4 pt-4 pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          report.service_type === "eau"
                            ? "bg-[hsl(var(--water-light))]"
                            : report.service_type === "electricite"
                            ? "bg-[hsl(var(--electricity-light))]"
                            : "bg-emerald-500/10"
                        }`}
                      >
                        {serviceIcon(report.service_type)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">
                            {serviceLabel(report.service_type)}
                          </span>
                          {urgencyBadge(report.urgency)}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">
                            {report.quartier}, {report.commune}
                          </span>
                          <span>·</span>
                          <Clock className="h-3 w-3" />
                          <span>{timeAgo(report.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    {statusIndicator(report.status)}
                  </div>
                </div>

                {/* Post content */}
                <div className="px-4 pb-3">
                  <p className="text-sm text-foreground leading-relaxed">{report.description}</p>
                  {report.impacted_people > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ~{report.impacted_people} personnes concernées
                    </p>
                  )}
                </div>

                {/* Photo */}
                {report.photo_url && (
                  <div className="border-t border-b border-border bg-muted/30">
                    <SignedImage
                      storagePath={report.photo_url}
                      alt={report.description}
                      className="w-full max-h-80 object-cover"
                    />
                  </div>
                )}

                {/* Stats bar */}
                <div className="px-4 py-2 flex items-center justify-between text-xs text-muted-foreground border-b border-border">
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" />
                    {report.verifications} confirmation{report.verifications > 1 ? "s" : ""}
                  </span>
                  <span>
                    Signalé par {report.reporter_type === "individual" ? "un résident" : "un groupe"}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="px-2 py-1.5 flex items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`flex-1 text-sm gap-1.5 ${
                      corroborated.has(report.id)
                        ? "text-primary font-semibold"
                        : "text-muted-foreground"
                    }`}
                    onClick={() => handleCorroborate(report.id)}
                    disabled={corroborated.has(report.id)}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    {corroborated.has(report.id) ? "Confirmé" : "Confirmer"}
                  </Button>

                  <ShareButton
                    title={`Signalement ${serviceLabel(report.service_type)}`}
                    text={`${report.description} — ${report.quartier}, ${report.commune}`}
                    url={window.location.origin}
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-sm text-muted-foreground"
                  />
                </div>
              </motion.article>
            ))}

        {/* Empty state */}
        {!loading && reports.length === 0 && (
          <div className="text-center py-16 px-4">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Aucun signalement d'infrastructure</p>
            <p className="text-sm text-muted-foreground mt-1">
              Les signalements validés apparaîtront ici
            </p>
          </div>
        )}

        {/* Load more */}
        {hasMore && reports.length > 0 && (
          <div className="flex justify-center pt-2 pb-6">
            <Button
              variant="outline"
              onClick={loadMore}
              disabled={loadingMore}
              className="gap-2"
            >
              {loadingMore ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              Voir plus
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InfrastructurePage;
