import React, { useEffect, useState, useMemo, useRef } from "react";
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
  Filter, TrendingUp, AlertCircle, ChevronDown, Lightbulb,
  Building2, ExternalLink, X as XIcon, Pencil, Map as MapIcon,
  Camera, MessageSquare, Share2, Globe, Sparkles, CheckCircle2,
  Flame, ShieldAlert, Navigation, Plus, PhoneCall, ChevronRight, SlidersHorizontal
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { extractInfraLabel, infraEmoji, cleanDescription } from "@/lib/report-display";
import { cn } from "@/lib/utils";
import {
  electriciteIcon,
  eauIcon,
  lampadaireIcon,
  poteauElectriqueIcon,
  cieHazardIcon,
  cieAutreIcon,
  canalisationIcon,
  fuiteEauIcon,
  sodeciAutreIcon,
  voirieIcon,
  caniveauIcon,
  depotOrduresIcon,
  mairieAutreIcon,
} from "@/lib/infra-icons";

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

const PAGE_SIZE = 12;

const COMMUNES_LIST = [
  "Abobo", "Adjamé", "Attécoubé", "Bingerville", "Cocody",
  "Koumassi", "Marcory", "Plateau", "Port-Bouët", "Treichville", "Yopougon"
];

// Sub-categories data for dropdowns
const SUB_CATEGORIES = {
  electricite: [
    { label: "Éclairage public", sub: "Éclairage public", icon: lampadaireIcon, desc: "Lampadaires éteints ou cassés" },
    { label: "Poteaux & Pylônes", sub: "Poteaux & Pylônes", icon: poteauElectriqueIcon, desc: "Poteaux penchés ou brisés" },
    { label: "Branchements dangereux", sub: "Branchements dangereux", icon: cieHazardIcon, desc: "Fils dénudés ou au sol", danger: true },
    { label: "Autres pannes CIE", sub: "Autres", icon: cieAutreIcon, desc: "Transformateurs et câblage" },
  ],
  eau: [
    { label: "Fuite d'eau sur voie", sub: "Fuite d'eau", icon: fuiteEauIcon, desc: "Écoulement sur la chaussée" },
    { label: "Canalisation publique", sub: "Canalisation publique", icon: canalisationIcon, desc: "Conduite principale rompue" },
    { label: "Qualité de l'eau", sub: "Qualité de l'eau", icon: sodeciAutreIcon, desc: "Eau trouble ou impropre", danger: true },
    { label: "Autres soucis SODECI", sub: "Autres", icon: eauIcon, desc: "Compteurs généraux et vannes" },
  ],
  mairie: [
    { label: "Nids-de-poule & Chaussée", sub: "Nid de poule", icon: voirieIcon, desc: "Trous, bitume dégradé" },
    { label: "Caniveaux bouchés", sub: "Caniveau bouché", icon: caniveauIcon, desc: "Eaux stagnantes & odeurs" },
    { label: "Amas d'ordures sauvages", sub: "Amas d'ordures", icon: depotOrduresIcon, desc: "Dépôts non collectés" },
    { label: "Autres voirie municipale", sub: "Autres", icon: mairieAutreIcon, desc: "Trottoirs & signalisation" },
  ],
};

const InfrastructurePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<InfraReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [subFilter, setSubFilter] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<FilterType | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [supported, setSupported] = useState<Set<string>>(new Set());
  const [repaired, setRepaired] = useState<Set<string>>(new Set());
  const [communeFilter, setCommuneFilter] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchReports = async (pageNum: number, append = false) => {
    const setter = append ? setLoadingMore : setLoading;
    setter(true);

    let items: InfraReport[] = [];

    if (user) {
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
      const { data, error } = await (supabase as any).rpc(
        "get_public_infrastructure_reports",
        { p_limit: PAGE_SIZE, p_offset: pageNum * PAGE_SIZE },
      );
      if (error) { setter(false); return; }

      let rows = (data ?? []) as InfraReport[];
      rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
        toast.error("Impossible d'enregistrer votre soutien");
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
      toast.success("👍 Vous soutenez cette réparation !", {
        description: "Votre vote augmente la priorité auprès des services techniques.",
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
        toast.error(error.message || "Impossible d'annuler");
        return;
      }
      setRepaired((prev) => { const next = new Set(prev); next.delete(reportId); return next; });
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, repair_verifications: Math.max(0, (r.repair_verifications || 0) - 1) } : r))
      );
      toast.info("Confirmation retirée");
      return;
    }

    const { error } = await supabase.rpc("confirm_repair", { p_report_id: reportId });
    if (error) {
      toast.error(error.message || "Impossible de confirmer");
      return;
    }
    setRepaired((prev) => new Set(prev).add(reportId));
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, repair_verifications: (r.repair_verifications || 0) + 1 } : r))
    );
    toast.success("✅ Réparation confirmée !", {
      description: "Merci pour votre contribution citoyenne.",
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
    toast.success("Publication modifiée");
  };

  const timeAgo = (date: string) =>
    formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });

  // Top 3 most supported reports for Right Sidebar
  const topSupportedReports = useMemo(() => {
    return [...reports]
      .sort((a, b) => (b.support_count || 0) - (a.support_count || 0))
      .slice(0, 3);
  }, [reports]);

  const totalReportsCount = reports.length;

  // Handler for toggle dropdown menu
  const toggleDropdown = (type: FilterType) => {
    if (activeDropdown === type) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(type);
      if (filter !== type) {
        setFilter(type);
        setSubFilter(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] dark:bg-[#060e17] text-foreground">
      <Header />

      {/* ── Bandeau Titre & Fil d'Actualité ── */}
      <div className="border-b border-border/70 bg-card/95 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        <div className="container max-w-7xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xl shadow-xs">
              🚧
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-display font-extrabold text-foreground flex items-center gap-2">
                Infrastructures & Voiries Publiques
                <span className="hidden sm:inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  En direct
                </span>
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Le fil d'actualité citoyen pour documenter, soutenir et faire réparer les pannes dans votre quartier.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/carte"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background hover:bg-muted/70 px-3.5 py-2 text-xs font-bold text-foreground shadow-xs transition-colors"
            >
              <MapIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden md:inline">Vue Carte</span>
            </Link>
            <Button
              onClick={() => navigate("/signaler")}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Publier une panne</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── BARRE DE FILTRES UNIFIÉE & COMMUNE ERGONOMIQUE ── */}
      <section className="bg-card border-b border-border/80 shadow-xs relative z-20" ref={dropdownRef}>
        <div className="container max-w-7xl px-4 py-3 space-y-2.5">
          
          {/* Ligne 1 : Filtres par Types avec Dropdowns Fusionnés */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap overflow-x-auto no-scrollbar pb-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground shrink-0 hidden md:flex items-center gap-1.5 mr-1">
              <Filter className="h-3.5 w-3.5 text-emerald-500" />
              Réseaux :
            </span>

            {/* 🌐 Bouton 1 : Tout le fil */}
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setSubFilter(null);
                setActiveDropdown(null);
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all shadow-xs shrink-0",
                filter === "all" && !subFilter
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/70"
              )}
            >
              <span>🌐</span>
              <span>Tous les réseaux</span>
            </button>

            {/* ⚡ Bouton 2 : Électricité · CIE (Déroulant Fusionné) */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => toggleDropdown("electricite")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold transition-all shadow-xs border",
                  filter === "electricite"
                    ? "bg-amber-500/15 border-amber-500/50 text-amber-900 dark:text-amber-300 ring-2 ring-amber-500/20"
                    : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                )}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
                  ⚡
                </span>
                <span>Électricité (CIE)</span>
                {filter === "electricite" && subFilter && (
                  <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[11px] font-extrabold text-amber-700 dark:text-amber-300">
                    {subFilter}
                  </span>
                )}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200 opacity-70", activeDropdown === "electricite" && "rotate-180")} />
              </button>

              {/* Popover Menu Déroulant CIE */}
              <AnimatePresence>
                {activeDropdown === "electricite" && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border border-amber-500/30 bg-card p-2.5 shadow-xl z-50 backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between px-2 py-1 border-b border-border/60 mb-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      <span>Pannes Électriques CIE</span>
                      {subFilter && (
                        <button
                          onClick={() => { setSubFilter(null); setActiveDropdown(null); }}
                          className="text-muted-foreground hover:text-foreground text-[10px] lowercase"
                        >
                          effacer sous-filtre
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {SUB_CATEGORIES.electricite.map((item) => {
                        const isSubActive = subFilter === item.sub && filter === "electricite";
                        return (
                          <button
                            key={item.sub}
                            type="button"
                            onClick={() => {
                              setFilter("electricite");
                              setSubFilter(item.sub);
                              setActiveDropdown(null);
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors",
                              isSubActive
                                ? "bg-amber-500/15 text-amber-950 dark:text-amber-200 font-bold"
                                : "hover:bg-muted/70 text-foreground"
                            )}
                          >
                            <img src={item.icon} alt="" className="h-7 w-7 object-contain rounded-md shrink-0 bg-background/50 p-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold leading-tight">{item.label}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
                            </div>
                            {isSubActive && <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 💧 Bouton 3 : Eau · SODECI (Déroulant Fusionné) */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => toggleDropdown("eau")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold transition-all shadow-xs border",
                  filter === "eau"
                    ? "bg-sky-500/15 border-sky-500/50 text-sky-900 dark:text-sky-300 ring-2 ring-sky-500/20"
                    : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                )}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-400 text-xs">
                  💧
                </span>
                <span>Eau (SODECI)</span>
                {filter === "eau" && subFilter && (
                  <span className="rounded-md bg-sky-500/20 px-1.5 py-0.5 text-[11px] font-extrabold text-sky-700 dark:text-sky-300">
                    {subFilter}
                  </span>
                )}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200 opacity-70", activeDropdown === "eau" && "rotate-180")} />
              </button>

              {/* Popover Menu Déroulant SODECI */}
              <AnimatePresence>
                {activeDropdown === "eau" && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border border-sky-500/30 bg-card p-2.5 shadow-xl z-50 backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between px-2 py-1 border-b border-border/60 mb-1.5 text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                      <span>Réseau d'Eau SODECI</span>
                      {subFilter && (
                        <button
                          onClick={() => { setSubFilter(null); setActiveDropdown(null); }}
                          className="text-muted-foreground hover:text-foreground text-[10px] lowercase"
                        >
                          effacer sous-filtre
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {SUB_CATEGORIES.eau.map((item) => {
                        const isSubActive = subFilter === item.sub && filter === "eau";
                        return (
                          <button
                            key={item.sub}
                            type="button"
                            onClick={() => {
                              setFilter("eau");
                              setSubFilter(item.sub);
                              setActiveDropdown(null);
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors",
                              isSubActive
                                ? "bg-sky-500/15 text-sky-950 dark:text-sky-200 font-bold"
                                : "hover:bg-muted/70 text-foreground"
                            )}
                          >
                            <img src={item.icon} alt="" className="h-7 w-7 object-contain rounded-md shrink-0 bg-background/50 p-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold leading-tight">{item.label}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
                            </div>
                            {isSubActive && <CheckCircle2 className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 🚧 Bouton 4 : Voirie · Mairie (Déroulant Fusionné) */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => toggleDropdown("mairie")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold transition-all shadow-xs border",
                  filter === "mairie"
                    ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/20"
                    : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                )}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
                  🚧
                </span>
                <span>Voirie (Mairie)</span>
                {filter === "mairie" && subFilter && (
                  <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300">
                    {subFilter}
                  </span>
                )}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200 opacity-70", activeDropdown === "mairie" && "rotate-180")} />
              </button>

              {/* Popover Menu Déroulant Mairie */}
              <AnimatePresence>
                {activeDropdown === "mairie" && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border border-emerald-500/30 bg-card p-2.5 shadow-xl z-50 backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between px-2 py-1 border-b border-border/60 mb-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      <span>Voirie & Services Municipaux</span>
                      {subFilter && (
                        <button
                          onClick={() => { setSubFilter(null); setActiveDropdown(null); }}
                          className="text-muted-foreground hover:text-foreground text-[10px] lowercase"
                        >
                          effacer sous-filtre
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {SUB_CATEGORIES.mairie.map((item) => {
                        const isSubActive = subFilter === item.sub && filter === "mairie";
                        return (
                          <button
                            key={item.sub}
                            type="button"
                            onClick={() => {
                              setFilter("mairie");
                              setSubFilter(item.sub);
                              setActiveDropdown(null);
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors",
                              isSubActive
                                ? "bg-emerald-500/15 text-emerald-950 dark:text-emerald-200 font-bold"
                                : "hover:bg-muted/70 text-foreground"
                            )}
                          >
                            <img src={item.icon} alt="" className="h-7 w-7 object-contain rounded-md shrink-0 bg-background/50 p-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold leading-tight">{item.label}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
                            </div>
                            {isSubActive && <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Reset All Filters Button */}
            {(filter !== "all" || subFilter || communeFilter) && (
              <button
                type="button"
                onClick={() => {
                  setFilter("all");
                  setSubFilter(null);
                  setCommuneFilter(null);
                  setActiveDropdown(null);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-destructive hover:underline px-2 py-1 shrink-0 ml-auto"
              >
                <XIcon className="h-3.5 w-3.5" />
                <span>Effacer tout</span>
              </button>
            )}
          </div>

          {/* Ligne 2 : Sélecteur de Communes Design & Ergonomique */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 pb-0.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground shrink-0 flex items-center gap-1 mr-1">
              <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              Communes :
            </span>

            {/* Pilule : Toutes les communes */}
            <button
              type="button"
              onClick={() => setCommuneFilter(null)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold transition-all shrink-0 shadow-2xs",
                communeFilter === null
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60"
              )}
            >
              Toutes
            </button>

            {/* Liste des 11 Communes avec Design Pill Chic */}
            {COMMUNES_LIST.map((c) => {
              const isSelected = communeFilter === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCommuneFilter(isSelected ? null : c)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-bold transition-all shrink-0 flex items-center gap-1 shadow-2xs",
                    isSelected
                      ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/30"
                      : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-border/80 hover:border-emerald-500/40"
                  )}
                >
                  <span>{c}</span>
                  {isSelected && <XIcon className="h-3 w-3 shrink-0 opacity-80" />}
                </button>
              );
            })}
          </div>

        </div>
      </section>

      {/* ── Main Layout (Facebook 3-Column Feed) ── */}
      <main className="container max-w-7xl px-2 sm:px-4 py-5 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ════════════════════════════════════════════════════════════
              1. COLONNE GAUCHE — Raccourcis & Profil (3 cols)
          ════════════════════════════════════════════════════════════ */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-24 space-y-4">
            
            {/* Carte Profil / Rôle Citoyen */}
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold text-lg shadow-sm">
                  {user ? (user.email?.[0]?.toUpperCase() ?? "C") : "🇨🇮"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">
                    {user ? (user.user_metadata?.full_name || user.email?.split("@")[0] || "Citoyen SIGNA") : "Visiteur Citoyen"}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Globe className="h-3 w-3 text-emerald-500" />
                    <span>Côte d'Ivoire</span>
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Signalements actifs</span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {totalReportsCount}
                </span>
              </div>
            </div>

            {/* Pannes Fréquentes Raccourcis Rapides */}
            <div className="rounded-2xl border border-border/80 bg-card p-3 shadow-sm space-y-1">
              <p className="px-3 pt-2 pb-1 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Pannes Fréquentes
              </p>
              {[
                { label: "Nid-de-poule & Route", sub: "Nid de poule", type: "mairie" as FilterType, icon: voirieIcon },
                { label: "Éclairage public", sub: "Éclairage public", type: "electricite" as FilterType, icon: lampadaireIcon },
                { label: "Caniveau bouché", sub: "Caniveau bouché", type: "mairie" as FilterType, icon: caniveauIcon },
                { label: "Fuite d'eau sur voie", sub: "Fuite d'eau", type: "eau" as FilterType, icon: fuiteEauIcon },
                { label: "Amas d'ordures", sub: "Amas d'ordures", type: "mairie" as FilterType, icon: depotOrduresIcon },
              ].map((item) => {
                const isActive = subFilter === item.sub;
                return (
                  <button
                    key={item.sub}
                    type="button"
                    onClick={() => {
                      if (isActive) {
                        setSubFilter(null);
                      } else {
                        setFilter(item.type);
                        setSubFilter(item.sub);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all",
                      isActive
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <img src={item.icon} alt="" className="h-5 w-5 object-contain rounded-sm shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {isActive && <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-emerald-600 dark:text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Widget Assistance Mairies & Opérateurs */}
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-card to-card p-4 shadow-sm text-center">
              <span className="text-2xl">🤝</span>
              <h4 className="font-display text-xs font-bold text-foreground mt-1">
                La force du collectif
              </h4>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                Chaque publication et vote citoyen obligent les opérateurs et mairies à réagir avec transparence.
              </p>
            </div>

          </aside>

          {/* ════════════════════════════════════════════════════════════
              2. COLONNE CENTRALE — Le Fil d'Actualité Facebook (6 cols)
          ════════════════════════════════════════════════════════════ */}
          <div className="col-span-1 lg:col-span-6 space-y-4">

            {/* ── Boîte de Création Rapide (Style Facebook "Exprimez-vous") ── */}
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold shadow-xs">
                  {user ? (user.email?.[0]?.toUpperCase() ?? "C") : "🇨🇮"}
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/signaler")}
                  className="flex-1 text-left rounded-full bg-[#f0f2f5] dark:bg-muted/60 hover:bg-[#e4e6e9] dark:hover:bg-muted px-4 py-2.5 text-xs sm:text-sm font-medium text-muted-foreground transition-colors cursor-pointer border border-border/40"
                >
                  Signalez une panne ou un nid-de-poule dans votre rue...
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-border/60 grid grid-cols-3 gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/signaler?type=pothole")}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl py-2 px-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-muted/70 transition-colors"
                >
                  <span className="text-base">🚧</span>
                  <span className="truncate">Nid de poule</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/signaler?type=street_light")}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl py-2 px-1 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-muted/70 transition-colors"
                >
                  <span className="text-base">💡</span>
                  <span className="truncate">Éclairage CIE</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/signaler")}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl py-2 px-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-muted/70 transition-colors"
                >
                  <Camera className="h-4 w-4 text-emerald-500" />
                  <span className="truncate">Avec photo</span>
                </button>
              </div>
            </div>

            {/* ── FEED LIST (Cartes Facebook) ── */}
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-11 w-11 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-48 w-full rounded-xl" />
                </div>
              ))
            ) : reports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-xs">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mx-auto mb-3 text-2xl">
                  ✓
                </div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Aucun signalement pour ce filtre
                </h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                  Tout fonctionne normalement ou aucun problème n'a encore été signalé dans cette zone.
                </p>
                <Button
                  onClick={() => { setFilter("all"); setSubFilter(null); setCommuneFilter(null); }}
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-xl text-xs font-bold"
                >
                  Voir tous les signalements
                </Button>
              </div>
            ) : (
              reports.map((report, index) => {
                const isWater = report.service_type === "water" || report.service_type === "eau";
                const isElec = report.service_type === "electricity" || report.service_type === "electricite";
                const infraLabel = extractInfraLabel(report.description);
                const hasPhotos = (report.photo_urls && report.photo_urls.length > 0) || Boolean(report.photo_url);

                return (
                  <motion.article
                    key={report.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.04, 0.25), duration: 0.3 }}
                    className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* ── Post Header (Style Facebook) ── */}
                    <div className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar 3D de l'infrastructure */}
                          <div className="relative">
                            <div className={cn(
                              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl shadow-xs border",
                              isWater ? "bg-sky-500/10 border-sky-500/25"
                                : isElec ? "bg-amber-500/10 border-amber-500/25"
                                : "bg-emerald-500/10 border-emerald-500/25"
                            )}>
                              {infraEmoji(infraLabel)}
                            </div>
                            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-background ring-1 ring-border text-[9px]">
                              📍
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-foreground">
                                {report.quartier || report.commune || "Signalement Citoyen"}
                              </span>
                              {report.commune && (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                                  {report.commune}
                                </span>
                              )}
                              {infraLabel && (
                                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                                  {infraLabel}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <Clock className="h-3 w-3 shrink-0" />
                              <span>{timeAgo(report.created_at)}</span>
                              <span>·</span>
                              <Globe className="h-3 w-3 text-muted-foreground/70" />
                              <span>Public</span>
                            </div>
                          </div>
                        </div>

                        {/* Statut & Badge Urgence */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {report.status === "active" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-0.5 text-[11px] font-bold text-destructive">
                              <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                              En attente
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600">
                              ✓ Réparé
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ── Post Body / Description ── */}
                    <div className="px-4 py-2">
                      {editingId === report.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full rounded-xl border border-border bg-muted/40 p-3 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                              <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500" onClick={() => handleEditSave(report.id)}>
                                Enregistrer
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm sm:text-base font-normal text-foreground leading-relaxed">
                            {cleanDescription(report.description)}
                          </p>
                          {/* Hashtags civiques Facebook-Style */}
                          <div className="flex flex-wrap gap-1.5 pt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            {report.commune && <span>#{report.commune.replace(/\s+/g, "")}</span>}
                            {infraLabel && <span>#{infraLabel.replace(/[\s/]+/g, "")}</span>}
                            <span>#{isElec ? "CIE" : isWater ? "SODECI" : "Mairie"}</span>
                            <span>#CivicSignal</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── Post Media / Photos plein format Facebook ── */}
                    {hasPhotos && (
                      <div className="mt-2 border-y border-border/40 bg-black/5 dark:bg-black/20">
                        <PhotoGallery
                          photos={
                            (report.photo_urls && report.photo_urls.length > 0)
                              ? report.photo_urls
                              : report.photo_url ? [report.photo_url] : []
                          }
                          thumbHeight="h-72 sm:h-80"
                          reportDate={report.created_at}
                        />
                      </div>
                    )}

                    {/* ── Social Reactions Bar (Compteur Facebook) ── */}
                    <div className="px-4 py-2 flex items-center justify-between text-xs text-muted-foreground border-b border-border/60">
                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-1 items-center">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] shadow-xs">
                            👍
                          </span>
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-white text-[10px] shadow-xs">
                            🙋
                          </span>
                        </div>
                        <span className="font-semibold text-foreground">
                          {report.support_count > 0 ? (
                            <span>{report.support_count} citoyen{report.support_count > 1 ? "s" : ""} soutiennent</span>
                          ) : (
                            <span>Soyez le 1er à soutenir</span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {report.repair_verifications > 0 && (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {report.repair_verifications} confirmation{report.repair_verifications > 1 ? "s" : ""} de réparation
                          </span>
                        )}
                        <Link
                          to={`/signalement/${report.id}`}
                          className="hover:underline font-medium text-muted-foreground"
                        >
                          Détails →
                        </Link>
                      </div>
                    </div>

                    {/* ── Post Action Bar (Boutons Horizontaux Facebook-Style) ── */}
                    <div className="px-2 py-1.5 grid grid-cols-4 gap-1 text-xs">
                      {/* Bouton 1 : Soutenir */}
                      <button
                        type="button"
                        onClick={() => handleSupport(report.id)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-xl py-2.5 font-bold transition-all",
                          supported.has(report.id)
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        )}
                      >
                        <ThumbsUp className={cn("h-4 w-4 shrink-0", supported.has(report.id) && "fill-emerald-600 text-emerald-600")} />
                        <span className="hidden sm:inline">
                          {supported.has(report.id) ? "Soutenu" : "Soutenir"}
                        </span>
                      </button>

                      {/* Bouton 2 : Confirmer Réparation */}
                      <button
                        type="button"
                        onClick={() => handleConfirmRepair(report.id)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-xl py-2.5 font-bold transition-all",
                          repaired.has(report.id)
                            ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        )}
                      >
                        <CheckCircle className={cn("h-4 w-4 shrink-0", repaired.has(report.id) && "fill-emerald-600 text-emerald-600")} />
                        <span className="hidden sm:inline">
                          {repaired.has(report.id) ? "Réparé ✓" : "C'est réparé ?"}
                        </span>
                      </button>

                      {/* Bouton 3 : Consulter / Commenter */}
                      <Link
                        to={`/signalement/${report.id}`}
                        className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 font-bold text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all"
                      >
                        <MessageSquare className="h-4 w-4 shrink-0" />
                        <span className="hidden sm:inline">Consulter</span>
                      </Link>

                      {/* Bouton 4 : Partager */}
                      <div className="flex items-center justify-center">
                        <ShareButton
                          title={`Signalement Voirie & Infra — ${report.quartier || report.commune}`}
                          text={[
                            `🚧 SIGNALEMENT VOIRIE & INFRASTRUCTURE — ${report.quartier || ""}, ${report.commune || ""}`,
                            ``,
                            report.description?.replace(/\s*\[\d+\s*personne\(s\)\]/gi, "").trim(),
                            ``,
                            report.support_count > 0 ? `👥 ${report.support_count} citoyen(s) demandent la réparation.` : ``,
                            `✊ Soutenez ce signalement sur SIGNA.ci :`,
                          ].filter(Boolean).join("\n")}
                          url={`${window.location.origin}/signalement/${report.id}`}
                          variant="ghost"
                          size="sm"
                          className="w-full h-full rounded-xl py-2.5 font-bold text-xs text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        />
                      </div>
                    </div>
                  </motion.article>
                );
              })
            )}

            {/* Load More Button */}
            {hasMore && reports.length > 0 && (
              <div className="flex justify-center pt-3 pb-8">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-full px-6 py-2.5 text-xs font-bold gap-2 shadow-xs bg-card border-border hover:bg-muted"
                >
                  {loadingMore ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  Afficher plus de publications
                </Button>
              </div>
            )}

          </div>

          {/* ════════════════════════════════════════════════════════════
              3. COLONNE DROITE — Pannes Chaudes & Solidarité (3 cols)
          ════════════════════════════════════════════════════════════ */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-24 space-y-4">

            {/* Widget 1 : Les Plus Soutenues / Alertes Chaudes */}
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 text-sm">
                  🔥
                </div>
                <h3 className="font-display text-sm font-bold text-foreground">
                  Pannes les plus soutenues
                </h3>
              </div>

              <div className="space-y-2.5">
                {topSupportedReports.length > 0 ? (
                  topSupportedReports.map((r) => (
                    <Link
                      key={r.id}
                      to={`/signalement/${r.id}`}
                      className="block p-2.5 rounded-xl border border-border/60 hover:border-emerald-500/40 bg-muted/30 hover:bg-muted/60 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-foreground truncate">
                          {r.quartier || r.commune}
                        </span>
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                          {r.support_count} votes
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                        {cleanDescription(r.description)}
                      </p>
                    </Link>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">Aucune donnée disponible.</p>
                )}
              </div>
            </div>

            {/* Widget 2 : Numéros Utiles & Urgences Réseaux */}
            <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 text-sm">
                  📞
                </div>
                <h3 className="font-display text-sm font-bold text-foreground">
                  Numéros d'Urgence
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                  <div>
                    <p className="font-bold text-foreground">Dépannage CIE</p>
                    <p className="text-[10px] text-muted-foreground">Électricité & Poteaux</p>
                  </div>
                  <span className="font-extrabold text-amber-600 text-sm font-mono">179</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                  <div>
                    <p className="font-bold text-foreground">Centre d'Appel SODECI</p>
                    <p className="text-[10px] text-muted-foreground">Fuites & Canalisations</p>
                  </div>
                  <span className="font-extrabold text-sky-600 text-sm font-mono">175</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
                  <div>
                    <p className="font-bold text-foreground">Mairie & Voirie</p>
                    <p className="text-[10px] text-muted-foreground">Services Techniques</p>
                  </div>
                  <span className="font-bold text-emerald-600 text-[11px]">Via SIGNA.ci</span>
                </div>
              </div>
            </div>

          </aside>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default InfrastructurePage;
