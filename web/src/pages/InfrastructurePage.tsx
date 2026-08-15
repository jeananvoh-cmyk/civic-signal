import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PhotoGallery from "@/components/PhotoGallery";
import ShareButton from "@/components/ShareButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Droplets, MapPin, Clock, ThumbsUp, CheckCircle,
  Filter, TrendingUp, AlertCircle, ChevronDown, Lightbulb, TriangleAlert, Info, MoreHorizontal, Building2, Map, Trash2, Waves, ExternalLink, X as XIcon, Pencil
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { extractInfraLabel, infraEmoji, cleanDescription } from "@/lib/report-display";
import { cn } from "@/lib/utils";

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
  photo_urls: string[] | null;
  verifications: number;
  repair_verifications: number;
  support_count: number;
  user_id?: string;
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
  const [supported, setSupported] = useState<Set<string>>(new Set());
  const [repaired, setRepaired] = useState<Set<string>>(new Set());
  const [communeFilter, setCommuneFilter] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggleSection = (key: string) => setOpenSection((prev) => (prev === key ? null : key));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const fetchReports = async (pageNum: number, append = false) => {
    const setter = append ? setLoadingMore : setLoading;
    setter(true);

    let items: InfraReport[] = [];

    if (user) {
      // Utilisateur connecté → query directe (RLS autorise)
      let query = supabase
        .from("reports")
        .select("id, user_id, service_type, description, location, commune, quartier, status, urgency, created_at, photo_url, photo_urls, verifications, repair_verifications, support_count")
        .eq("report_category", "infrastructure")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (filter !== "all") {
        const dbServiceType = filter === "eau" ? "water" : filter === "electricite" ? "electricity" : filter;
        query = query.eq("service_type", dbServiceType);
      }
      if (subFilter) query = query.ilike("description", `%${subFilter}%`);
      if (communeFilter) query = query.eq("commune", communeFilter);

      const [{ data, error }, { data: myVotes }, { data: myRepairs }] = await Promise.all([
        query,
        supabase.from("corroborations").select("report_id").eq("user_id", user.id),
        supabase.from("repair_confirmations").select("report_id").eq("user_id", user.id),
      ]);
      if (error) { setter(false); return; }
      items = (data ?? []) as unknown as InfraReport[];
      if (myVotes) setSupported(new Set(myVotes.map((v: any) => v.report_id)));
      if (myRepairs) setRepaired(new Set(myRepairs.map((v: any) => v.report_id)));
    } else {
      // Visiteur anonyme → RPC SECURITY DEFINER (bypass RLS)
      const { data, error } = await (supabase as any).rpc(
        "get_public_infrastructure_reports",
        { p_limit: PAGE_SIZE, p_offset: pageNum * PAGE_SIZE },
      );
      if (error) { setter(false); return; }

      let rows = (data ?? []) as InfraReport[];
      rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Filtres côté client pour les anonymes
      if (filter !== "all") {
        const dbServiceType = filter === "eau" ? "water" : filter === "electricite" ? "electricity" : filter;
        rows = rows.filter((r) => r.service_type === dbServiceType);
      }
      if (subFilter) {
        rows = rows.filter((r) => r.description?.toLowerCase().includes(subFilter.toLowerCase()));
      }
      if (communeFilter) {
        rows = rows.filter((r) => r.commune === communeFilter);
      }
      items = rows;
    }

    setHasMore(items.length === PAGE_SIZE);
    setReports((prev) => (append ? [...prev, ...items] : items));
    setter(false);
  };

  useEffect(() => {
    setPage(0);
    fetchReports(0);
  }, [filter, subFilter, communeFilter]);

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

  const handleSupport = async (reportId: string) => {
    if (!user) {
      toast.info("Connectez-vous pour voter");
      return;
    }
    const report = reports.find((r) => r.id === reportId);
    if (report?.user_id === user.id) {
      toast.info("Vous ne pouvez pas voter pour votre propre signalement");
      return;
    }
    const { data, error } = await (supabase.rpc as any)("support_infra_report", { p_report_id: reportId });
    if (error) {
      const msg = error.message || "";
      if (msg.includes("déjà le vôtre")) {
        toast.info("Vous ne pouvez pas soutenir votre propre signalement");
      } else {
        toast.error("Impossible d'enregistrer votre soutien", {
          description: "Vérifiez votre connexion et réessayez.",
        });
      }
      return;
    }
    const voted: boolean = data?.voted;
    const newCount: number = data?.support_count;
    setSupported((prev) => {
      const next = new Set(prev);
      voted ? next.add(reportId) : next.delete(reportId);
      return next;
    });
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, support_count: newCount } : r))
    );
    if (voted) {
      toast.success("👍 Merci pour votre soutien !", {
        description: "Votre voix compte. Plus on est nombreux, plus vite ça bouge !",
      });
    } else {
      toast.info("Soutien retiré");
    }
  };

  const handleConfirmRepair = async (reportId: string) => {
    if (!user) {
      toast.info("Connectez-vous pour confirmer la réparation");
      return;
    }

    if (repaired.has(reportId)) {
      const { error } = await (supabase.rpc as any)("cancel_repair", { p_report_id: reportId });
      if (error) {
        console.error("[cancel_repair]", error);
        toast.error(error.message || "Impossible d'annuler la confirmation");
        return;
      }
      setRepaired((prev) => { const next = new Set(prev); next.delete(reportId); return next; });
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, repair_verifications: Math.max(0, (r.repair_verifications || 0) - 1) } : r))
      );
      toast.info("Confirmation annulée");
      return;
    }

    const { error } = await supabase.rpc("confirm_repair", { p_report_id: reportId });
    if (error) {
      console.error("[confirm_repair]", error);
      toast.error(error.message || "Impossible de confirmer la réparation");
      return;
    }
    setRepaired((prev) => new Set(prev).add(reportId));
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, repair_verifications: (r.repair_verifications || 0) + 1 } : r))
    );
    toast.success("Réparation confirmée !", {
      description: "Merci ! Si 3 citoyens le confirment, le signalement sera clôturé.",
    });
  };

  const handleEditSave = async (reportId: string) => {
    const trimmed = editText.trim();
    if (!trimmed || !user) return;
    const original = reports.find((r) => r.id === reportId)?.description ?? "";
    const prefix = original.match(/^(\[[^\]]+\]\s*)/)?.[1] ?? "";
    const suffix = original.match(/(\s*\[\d+[^\]]*\])\s*$/)?.[1] ?? "";
    const newDescription = `${prefix}${trimmed}${suffix}`;
    const { error } = await supabase
      .from("reports")
      .update({ description: newDescription })
      .eq("id", reportId)
      .eq("user_id", user.id);
    if (error) { toast.error("Impossible de modifier le signalement"); return; }
    setReports((prev) => prev.map((r) => r.id === reportId ? { ...r, description: newDescription } : r));
    setEditingId(null);
    toast.success("Signalement modifié");
  };

  const timeAgo = (date: string) =>
    formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });

  const serviceIcon = (type: string) => {
    if (type === "water" || type === "eau") return <Droplets className="h-4 w-4 text-[hsl(var(--water))]" />;
    if (type === "electricity" || type === "electricite") return <Zap className="h-4 w-4 text-[hsl(var(--electricity))]" />;
    return <Building2 className="h-4 w-4 text-emerald-500" />;
  };

  const serviceLabel = (type: string) => {
    if (type === "water" || type === "eau") return "Eau";
    if (type === "electricity" || type === "electricite") return "Électricité";
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
          <div className="flex flex-col gap-2 mb-6">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-primary" />
              Infrastructures publiques
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Voirie, éclairage public, fuites d'eau — signalez, soutenez, suivez l'avancement.
            </p>
          </div>

          {/* Alert Categories — Accordéon compact */}
          <div className="space-y-2 mb-2">
            {/* ── Électricité (CIE) ── */}
            {(filter === "all" || filter === "electricite") && (() => {
              const isOpen = openSection === "electricite";
              const activeHere = filter === "electricite" && subFilter;
              return (
                <div className="rounded-xl border border-[hsl(var(--electricity))]/30 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection("electricite")}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-[hsl(var(--electricity))]/8 hover:bg-[hsl(var(--electricity))]/12 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-[hsl(var(--electricity))] shrink-0" />
                      <span className="text-xs font-bold text-foreground uppercase tracking-wide">Électricité · CIE</span>
                      {activeHere && (
                        <span className="rounded-full bg-[hsl(var(--electricity))]/20 px-2 py-0.5 text-xs font-semibold text-[hsl(var(--electricity))]">{subFilter}</span>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-4 gap-2 p-2">
                          {[
                            { label: "Éclairage public", icon: <Lightbulb className="h-5 w-5 text-[hsl(var(--electricity))]" />, sub: "Éclairage public" },
                            { label: "Poteaux & Pylônes", icon: <Zap className="h-5 w-5 text-[hsl(var(--electricity))]" />, sub: "Poteaux & Pylônes" },
                            { label: "Branchements dangereux", icon: <TriangleAlert className="h-5 w-5 text-destructive" />, sub: "Branchements dangereux", danger: true },
                            { label: "Autres", icon: <MoreHorizontal className="h-5 w-5 text-muted-foreground" />, sub: "Autres" },
                          ].map((item) => (
                            <button
                              key={item.sub}
                              type="button"
                              onClick={() => { handleCategoryClick(item.sub, "electricite"); setOpenSection(null); }}
                              className={cn(
                                "flex flex-col items-center justify-center gap-1.5 rounded-lg p-2 text-center transition-colors border",
                                subFilter === item.sub && filter === "electricite"
                                  ? item.danger ? "border-destructive bg-destructive/15 ring-1 ring-destructive/40" : "border-[hsl(var(--electricity))] bg-[hsl(var(--electricity))]/15 ring-1 ring-[hsl(var(--electricity))]/40"
                                  : item.danger ? "border-destructive/20 bg-destructive/5 hover:bg-destructive/15" : "border-[hsl(var(--electricity))]/20 bg-[hsl(var(--electricity))]/5 hover:bg-[hsl(var(--electricity))]/15"
                              )}
                            >
                              {item.icon}
                              <span className="text-xs font-semibold text-foreground leading-tight">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })()}

            {/* ── Eau (SODECI) ── */}
            {(filter === "all" || filter === "eau") && (() => {
              const isOpen = openSection === "eau";
              const activeHere = filter === "eau" && subFilter;
              return (
                <div className="rounded-xl border border-[hsl(var(--water))]/30 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection("eau")}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-[hsl(var(--water))]/8 hover:bg-[hsl(var(--water))]/12 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-[hsl(var(--water))] shrink-0" />
                      <span className="text-xs font-bold text-foreground uppercase tracking-wide">Eau · SODECI</span>
                      {activeHere && (
                        <span className="rounded-full bg-[hsl(var(--water))]/20 px-2 py-0.5 text-xs font-semibold text-[hsl(var(--water))]">{subFilter}</span>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-4 gap-2 p-2">
                          {[
                            { label: "Fuite d'eau", icon: <Droplets className="h-5 w-5 text-[hsl(var(--water))]" />, sub: "Fuite d'eau" },
                            { label: "Canalisation publique", icon: <AlertCircle className="h-5 w-5 text-[hsl(var(--water))]" />, sub: "Canalisation publique" },
                            { label: "Qualité de l'eau", icon: <TriangleAlert className="h-5 w-5 text-destructive" />, sub: "Qualité de l'eau", danger: true },
                            { label: "Autres", icon: <MoreHorizontal className="h-5 w-5 text-muted-foreground" />, sub: "Autres" },
                          ].map((item) => (
                            <button
                              key={item.sub}
                              type="button"
                              onClick={() => { handleCategoryClick(item.sub, "eau"); setOpenSection(null); }}
                              className={cn(
                                "flex flex-col items-center justify-center gap-1.5 rounded-lg p-2 text-center transition-colors border",
                                subFilter === item.sub && filter === "eau"
                                  ? item.danger ? "border-destructive bg-destructive/15 ring-1 ring-destructive/40" : "border-[hsl(var(--water))] bg-[hsl(var(--water))]/15 ring-1 ring-[hsl(var(--water))]/40"
                                  : item.danger ? "border-destructive/20 bg-destructive/5 hover:bg-destructive/15" : "border-[hsl(var(--water))]/20 bg-[hsl(var(--water))]/5 hover:bg-[hsl(var(--water))]/15"
                              )}
                            >
                              {item.icon}
                              <span className="text-xs font-semibold text-foreground leading-tight">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })()}

            {/* ── Voirie (Mairie) ── */}
            {(filter === "all" || filter === "mairie") && (() => {
              const isOpen = openSection === "mairie";
              const activeHere = filter === "mairie" && subFilter;
              return (
                <div className="rounded-xl border border-emerald-500/30 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection("mairie")}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-emerald-500/8 hover:bg-emerald-500/12 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Map className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-xs font-bold text-foreground uppercase tracking-wide">Voirie · Mairie</span>
                      {activeHere && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">{subFilter}</span>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-4 gap-2 p-2">
                          {[
                            { label: "Nid de poule / Route", icon: <Map className="h-5 w-5 text-emerald-500" />, sub: "Nid de poule" },
                            { label: "Caniveau bouché", icon: <Waves className="h-5 w-5 text-emerald-500" />, sub: "Caniveau bouché" },
                            { label: "Amas d'ordures", icon: <Trash2 className="h-5 w-5 text-emerald-500" />, sub: "Amas d'ordures" },
                            { label: "Autres", icon: <MoreHorizontal className="h-5 w-5 text-muted-foreground" />, sub: "Autres" },
                          ].map((item) => (
                            <button
                              key={item.sub}
                              type="button"
                              onClick={() => { handleCategoryClick(item.sub, "mairie"); setOpenSection(null); }}
                              className={cn(
                                "flex flex-col items-center justify-center gap-1.5 rounded-lg p-2 text-center transition-colors border",
                                subFilter === item.sub && filter === "mairie"
                                  ? "border-emerald-500 bg-emerald-500/15 ring-1 ring-emerald-500/40"
                                  : "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/15"
                              )}
                            >
                              {item.icon}
                              <span className="text-xs font-semibold text-foreground leading-tight">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Filters - horizontal scroll on mobile */}
      <div className="sticky top-14 z-40 bg-background border-b border-border">
        {/* Type filters */}
        <div className="container max-w-2xl px-4 pt-2 pb-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
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
        {/* Commune filters */}
        <div className="container max-w-2xl px-4 pb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {communeFilter && (
            <button
              onClick={() => setCommuneFilter(null)}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap bg-primary text-primary-foreground"
            >
              {communeFilter}
              <XIcon className="h-3 w-3" />
            </button>
          )}
          {["Abobo","Adjamé","Bingerville","Cocody","Koumassi","Port-Bouët","Yopougon"]
            .filter((c) => c !== communeFilter)
            .map((c) => (
              <button
                key={c}
                onClick={() => setCommuneFilter(c)}
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap bg-card border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
              >
                {c}
              </button>
            ))}
        </div>
      </div>

      {/* Feed */}
      <div className="container max-w-2xl lg:max-w-3xl px-4 py-4 space-y-3">
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
                      {/* Infra type emoji avatar */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-500/10 text-xl">
                        {infraEmoji(extractInfraLabel(report.description))}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Infra type label badge */}
                          {extractInfraLabel(report.description) && (
                            <span className="inline-flex items-center rounded-full bg-teal-500/10 px-2 py-0.5 text-xs font-semibold text-teal-700 dark:text-teal-400">
                              {extractInfraLabel(report.description)}
                            </span>
                          )}
                          {urgencyBadge(report.urgency)}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="font-semibold text-foreground">{report.quartier}</span>
                            {report.commune && (
                              <><span className="opacity-40">·</span><span>{report.commune}</span></>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>{timeAgo(report.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {statusIndicator(report.status)}
                  </div>
                </div>

                {/* Post content */}
                <div className="px-4 pb-3">
                  {editingId === report.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                        rows={3}
                        maxLength={500}
                        autoFocus
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{editText.length}/500</span>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingId(null)}>
                            Annuler
                          </Button>
                          <Button size="sm" className="h-7 text-xs" onClick={() => handleEditSave(report.id)} disabled={!editText.trim()}>
                            Enregistrer
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-foreground leading-relaxed">
                      {cleanDescription(report.description)}
                    </p>
                  )}
                </div>

                {/* Photos cliquables */}
                <PhotoGallery
                  photos={
                    (report.photo_urls && report.photo_urls.length > 0)
                      ? report.photo_urls
                      : report.photo_url ? [report.photo_url] : []
                  }
                  thumbHeight="h-64"
                  reportDate={report.created_at}
                />

                {/* Stats bar */}
                <div className="px-4 py-2.5 flex items-center justify-between text-xs border-b border-border">
                  <div className="flex items-center gap-3">
                    {(report.support_count ?? 0) > 0 ? (
                      <span className="flex items-center gap-1.5 font-semibold text-primary">
                        <span className="flex -space-x-1">
                          {Array.from({ length: Math.min(report.support_count, 3) }).map((_, i) => (
                            <span key={i} className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[9px] ring-1 ring-background">🙋</span>
                          ))}
                        </span>
                        <span>{report.support_count} citoyen{report.support_count > 1 ? "s" : ""} veulent une réparation rapide</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <ThumbsUp className="h-3 w-3" />
                        Soyez le premier à soutenir
                      </span>
                    )}
                    {report.repair_verifications > 0 && report.status === "active" && (
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle className="h-3 w-3" />
                        {report.repair_verifications}/3 réparé
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="px-2 py-2 flex items-center gap-2">
                  {user && report.user_id === user.id ? (
                    <>
                      <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground">
                        <ThumbsUp className="h-4 w-4" />
                        Mon signalement
                      </span>
                      {report.status === "active" && editingId !== report.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditingId(report.id);
                            setEditText(cleanDescription(report.description));
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          Modifier
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      variant={supported.has(report.id) ? "outline" : "default"}
                      size="sm"
                      className={`flex-1 text-xs gap-1.5 font-semibold ${
                        supported.has(report.id)
                          ? "text-primary border-primary/40 bg-primary/5"
                          : ""
                      }`}
                      onClick={() => handleSupport(report.id)}
                    >
                      <ThumbsUp className={`h-4 w-4 shrink-0 ${supported.has(report.id) ? "fill-primary" : ""}`} />
                      <span className="truncate">
                        {supported.has(report.id)
                          ? "Soutenu ✓"
                          : "Je veux qu'on répare"}
                      </span>
                    </Button>
                  )}

                  {report.status === "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "flex-1 text-xs gap-1.5 min-w-0 transition-colors",
                        repaired.has(report.id)
                          ? "text-emerald-600 font-semibold hover:text-destructive hover:bg-destructive/10"
                          : "text-emerald-600/70 hover:text-emerald-600"
                      )}
                      onClick={() => handleConfirmRepair(report.id)}
                      title={repaired.has(report.id) ? "Cliquer pour annuler" : undefined}
                    >
                      <CheckCircle className={`h-4 w-4 shrink-0 ${repaired.has(report.id) ? "fill-emerald-600" : ""}`} />
                      <span className="truncate">
                        {repaired.has(report.id) ? "Réparé ✓" : "C'est réparé ?"}
                      </span>
                    </Button>
                  )}

                  <Link
                    to={`/signalement/${report.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
                    title="Voir le détail"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>

                  <ShareButton
                    title={`Signalement infra — ${report.quartier}, ${report.commune}`}
                    text={[
                      `🚧 INFRASTRUCTURE — ${report.quartier}, ${report.commune}`,
                      ``,
                      report.description?.replace(/\s*\[\d+\s*personne\(s\)\]/gi, "").trim(),
                      ``,
                      report.support_count > 0
                        ? `👥 ${report.support_count} citoyen${report.support_count > 1 ? "s" : ""} demandent une réparation.`
                        : ``,
                      `✊ Signalez les problèmes de votre quartier sur SIGNA-CI`,
                      `La plateforme citoyenne d'Abidjan pour faire bouger les choses.`,
                    ].filter(Boolean).join("\n")}
                    url={`${window.location.origin}/signalement/${report.id}`}
                    variant="ghost"
                    size="sm"
                    className="flex-none px-3 text-muted-foreground"
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

      <Footer />
    </div>
  );
};

export default InfrastructurePage;
